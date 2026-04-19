import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useEditorState from './useEditorState';
import Canvas from './Canvas';
import BlockPalette from './BlockPalette';
import EditorTopbar from './EditorTopbar';
import HelpPanel from './HelpPanel';
import exportHTML from './exportHTML';
import { apiGet, apiPost } from '../../utils/api';
import AppLayout from '../../components/layout/AppLayout';

export default function SuperPagesEditor() {
  var { t } = useTranslation();
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [pageSettings, setPageSettings] = useState({ title: '', metaDescription: '', ogImage: '', slug: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [deviceView, setDeviceView] = useState('desktop');
  const [pageStatus, setPageStatus] = useState('draft');
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 900);
  const updatedAtRef = useRef(null);

  // Track viewport width — editor needs desktop space for drag/resize to work
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const editor = useEditorState();
  const { els, selId, canvasBg, canvasBgImage, dirty, setDirty,
    addElement, deleteElement, duplicateElement, updateElement,
    setEls, setCanvasBg, setCanvasBgImage, markDirty, undo, redo, deselectAll, clearCanvas, selectElement } = editor;

  // Which element types route through the Tiptap editor. These auto-enter
  // edit mode when first dropped on the canvas, so the user can type
  // immediately without a second click.
  const TIPTAP_AUTO_EDIT_TYPES = ['heading', 'text', 'label'];

  // Wrapped add — fires an auto-edit signal for tiptap-able types.
  const addElementWithAutoEdit = useCallback((type, x, y) => {
    const newEl = addElement(type, x, y);
    if (newEl && TIPTAP_AUTO_EDIT_TYPES.includes(type)) {
      // Defer so Canvas has a chance to render the new element first.
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sp-auto-edit', { detail: { id: newEl.id } }));
      }, 30);
    }
    return newEl;
  }, [addElement]);

  // ── Expose functions for Canvas to call via window (cross-component communication) ──
  useEffect(() => {
    window._spAddElement = (type, x, y) => addElementWithAutoEdit(type, x, y);
    window._spDeleteElement = (id) => { if (confirm('Delete this element?')) deleteElement(id); };
    window._spDuplicateElement = (id) => duplicateElement(id);
    return () => { delete window._spAddElement; delete window._spDeleteElement; delete window._spDuplicateElement; };
  }, [addElementWithAutoEdit, deleteElement, duplicateElement]);

  // ── Load page data ──
  useEffect(() => {
    if (!pageId) { setLoading(false); return; }
    apiGet(`/api/funnels/load/${pageId}`).then(data => {
      setPageSettings({ title: data.title || '', metaDescription: data.meta_description || '', ogImage: data.image_url || '', slug: data.slug || '' });
      setPageStatus(data.status || 'draft');
      updatedAtRef.current = data.updated_at;
      // Parse canvas data from gjs_css (our JSON state) or gjs_components
      try {
        const raw = data.gjs_css || '';
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) { setEls(parsed); }
          else if (parsed.els) {
            setEls(parsed.els);
            if (parsed.canvasBg) setCanvasBg(parsed.canvasBg);
            if (parsed.canvasBgImage) setCanvasBgImage(parsed.canvasBgImage);
          }
        }
      } catch (e) { console.error('Failed to parse canvas data:', e); }
      setLoading(false);
    }).catch(e => {
      showToast('Failed to load page: ' + e.message);
      setLoading(false);
    });
  }, [pageId, setEls, setCanvasBg, setCanvasBgImage]);

  // ── Auto-collapse the sidebar on editor entry ──
  // The SuperPages editor benefits from maximum canvas width. Most users
  // will want the sidebar out of the way while building a page, so we
  // collapse it on mount. If they want it back, the toggle button is right
  // there on the sidebar's edge.
  useEffect(function() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
  }, []);

  // ── Save ──
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const html = exportHTML(els, canvasBg, canvasBgImage);
      const payload = {
        id: parseInt(pageId),
        title: pageSettings.title || 'Untitled',
        headline: pageSettings.title || 'Untitled',
        meta_description: pageSettings.metaDescription || '',
        image_url: pageSettings.ogImage || '',
        custom_slug: pageSettings.customSlug || '',
        gjs_html: html,
        gjs_css: JSON.stringify({ els, canvasBg, canvasBgImage }),
        status: pageStatus,
        updated_at: updatedAtRef.current,
      };
      const res = await apiPost('/api/funnels/save', payload);
      if (res.success || res.id) {
        showToast('✓ Saved!');
        setDirty(false);
        if (res.slug) setPageSettings(prev => ({ ...prev, slug: res.slug }));
        if (res.updated_at) updatedAtRef.current = res.updated_at;
      } else {
        showToast('Save failed: ' + (res.error || ''));
      }
    } catch (e) {
      showToast('Save error: ' + e.message);
    }
    setSaving(false);
  }, [els, canvasBg, canvasBgImage, pageId, pageSettings, setDirty]);

  // ── Auto-save every 30s ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirty && !editingElement) save();
    }, 30000);
    return () => clearInterval(interval);
  }, [dirty, editingElement, save]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      // Skip the element-delete handler only if the user is genuinely typing
      // into an editable field. `isContentEditable` stays true on elements
      // that were once editable but are now locked, so we check the attribute
      // explicitly — 'true' means actively editable, 'false' or unset means
      // the element is read-only and Delete should remove the canvas element.
      const tgt = e.target;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (tgt && tgt.getAttribute && tgt.getAttribute('contenteditable') === 'true') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); save(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selId) { deleteElement(selId); }
      }
      if (e.key === 'Escape') { deselectAll(); setEditingElement(null); }
      // Arrow nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const el = els.find(x => x.id === selId);
        if (!el) return;
        const updates = {};
        if (e.key === 'ArrowUp') updates.y = Math.max(0, el.y - step);
        if (e.key === 'ArrowDown') updates.y = el.y + step;
        if (e.key === 'ArrowLeft') updates.x = Math.max(0, el.x - step);
        if (e.key === 'ArrowRight') updates.x = el.x + step;
        updateElement(selId, updates);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selId, els, undo, redo, save, deleteElement, deselectAll, updateElement]);

  // ── Toast ──
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Edit element handler ──
  const handleEditElement = (id) => {
    const el = els.find(x => x.id === id);
    if (!el) return;
    setEditingElement({ id, el });
  };

  // ── Clear canvas ──
  // Reset elements AND canvas background, then save to the server so the
  // refresh behaviour matches the user's expectation: cleared means cleared.
  // Without the explicit save, the page reloads from the last saved version
  // which still has the old elements and dark background.
  const handleClear = async () => {
    if (!confirm('Remove all elements and reset the background? This will save the page.')) return;
    clearCanvas();
    setCanvasBg('#ffffff');
    setCanvasBgImage('');
    // Persist to the server with the cleared state. We construct the payload
    // here directly rather than calling save() because React state updates
    // from clearCanvas/setCanvasBg haven't flushed yet.
    setSaving(true);
    try {
      const clearedEls = [];
      const html = exportHTML(clearedEls, '#ffffff', '');
      const payload = {
        id: parseInt(pageId),
        title: pageSettings.title || 'Untitled',
        headline: pageSettings.title || 'Untitled',
        meta_description: pageSettings.metaDescription || '',
        image_url: pageSettings.ogImage || '',
        custom_slug: pageSettings.customSlug || '',
        gjs_html: html,
        gjs_css: JSON.stringify({ els: clearedEls, canvasBg: '#ffffff', canvasBgImage: '' }),
        status: pageStatus,
        updated_at: updatedAtRef.current,
      };
      const res = await apiPost('/api/funnels/save', payload);
      if (res.success || res.id) {
        if (res.updated_at) updatedAtRef.current = res.updated_at;
        setDirty(false);
        showToast('✓ Page cleared and saved');
      } else {
        showToast('Cleared locally — save failed: ' + (res.error || 'unknown'));
      }
    } catch (e) {
      showToast('Cleared locally — save error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    const newStatus = pageStatus === 'published' ? 'draft' : 'published';
    // Guard: don't let users publish an empty page — it renders as a blank screen
    if (newStatus === 'published' && (!els || els.length === 0)) {
      showToast('Add at least one element before publishing');
      return;
    }
    setSaving(true);
    try {
      const html = exportHTML(els, canvasBg, canvasBgImage);
      const payload = {
        id: parseInt(pageId),
        title: pageSettings.title || 'Untitled',
        headline: pageSettings.title || 'Untitled',
        gjs_html: html,
        gjs_css: JSON.stringify({ els, canvasBg, canvasBgImage }),
        status: newStatus,
        updated_at: updatedAtRef.current,
      };
      const res = await apiPost('/api/funnels/save', payload);
      if (res.success || res.id) {
        setPageStatus(newStatus);
        setDirty(false);
        if (res.slug) setPageSettings(prev => ({ ...prev, slug: res.slug }));
        if (res.updated_at) updatedAtRef.current = res.updated_at;
        showToast(newStatus === 'published' ? '✓ Published! Your page is live.' : '✓ Unpublished — page is now a draft.');
      } else {
        showToast('Error: ' + (res.error || ''));
      }
    } catch (e) { showToast('Error: ' + e.message); }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppLayout title="SuperPages" subtitle={t('superPagesEditor.loading', { defaultValue: 'Loading editor…' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
          {t('superPagesEditor.loading', { defaultValue: 'Loading editor…' })}
        </div>
      </AppLayout>
    );
  }

  // The SuperPages editor relies on mouse-based drag and resize which don't
  // translate cleanly to touch. Rather than ship a broken mobile experience,
  // we show a clear message and let people return on a desktop.
  if (isNarrow) {
    return (
      <AppLayout title="SuperPages">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 420, textAlign: 'center', color: '#475569', fontFamily: 'DM Sans,sans-serif' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖥️</div>
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: '#0f172a' }}>
              {t('superPagesEditor.desktopRequiredTitle', { defaultValue: 'Desktop required' })}
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#475569', margin: '0 0 24px' }}>
              {t('superPagesEditor.desktopRequiredBody', { defaultValue: 'The SuperPages editor uses precise drag and drop that needs a desktop or laptop to work properly. Please open this page on a larger screen to build your page.' })}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b', margin: '0 0 28px' }}>
              {t('superPagesEditor.desktopRequiredNote', { defaultValue: 'Your pages are fully responsive and will look great on all devices once published — this restriction only applies to the editor itself.' })}
            </p>
            <button onClick={() => navigate('/pro/funnels')} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--sap-accent)', color: '#fff', fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700 }}>
              {t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={pageSettings.title || t('superPagesEditor.untitledPage', { defaultValue: 'Untitled page' })}
      subtitle={pageSettings.slug ? '/' + pageSettings.slug : undefined}
      fullHeight
      bgStyle={{ padding: 0, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowY: 'hidden' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: 'DM Sans,sans-serif' }}>
      <EditorTopbar
        title={pageSettings.title}
        slug={pageSettings.slug}
        pageId={pageId}
        saving={saving}
        dirty={dirty}
        status={pageStatus}
        onSave={save}
        onClear={handleClear}
        onShowSettings={() => setShowSettings(true)}
        onShowHelp={() => setShowHelp(true)}
        onUndo={undo}
        onRedo={redo}
        onBack={() => navigate('/pro/funnels')}
        onTogglePublish={togglePublish}
        onTogglePreview={() => setPreviewMode(!previewMode)}
        previewMode={previewMode}
        deviceView={deviceView}
        onSetDevice={setDeviceView}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {(previewMode || deviceView !== 'desktop') ? (
          /* Preview mode — shows rendered HTML with responsive CSS */
          <div style={{
            flex:1,
            background: '#f1f5f9',
            backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(14,165,233,0.04), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(236,72,153,0.03), transparent 50%)',
            overflow:'auto',
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            padding:20
          }}>
            {previewMode && (
              <div style={{marginBottom:12,padding:'10px 24px',background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',borderRadius:10,fontSize:13,color:'#4338ca',fontWeight:700,display:'flex',alignItems:'center',gap:12}}>
                <span>{t('superPagesEditor.previewMode')}</span>
                <button onClick={() => setPreviewMode(false)} style={{padding:'6px 16px',borderRadius:8,border:'none',background:'var(--sap-indigo)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>{t('superPagesEditor.backToEditor')}</button>
              </div>
            )}
            {deviceView !== 'desktop' && !previewMode && (
              <div style={{marginBottom:12,padding:'8px 16px',background:'rgba(14,165,233,.1)',border:'1px solid rgba(14,165,233,.25)',borderRadius:8,fontSize:11,color:'#0284c7',fontWeight:600}}>
                📱 {t('superPagesEditor.responsivePreview', { defaultValue: 'Responsive Preview — switch to Desktop to edit elements' })}
              </div>
            )}
            <div style={{width:deviceView==='mobile'?390:deviceView==='tablet'?768:1100,transition:'width .3s',background:canvasBg||'#ffffff',borderRadius:10,overflow:'hidden',boxShadow:'0 4px 24px rgba(15,23,42,0.08), 0 12px 40px rgba(15,23,42,0.06)',minHeight:600,border:'1px solid #e2e8f0'}}>
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&family=Montserrat:wght@400;600;700;800&family=Raleway:wght@400;600;700;800&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Outfit,sans-serif}img{max-width:100%;height:auto}</style></head><body>${exportHTML(els, canvasBg, canvasBgImage)}</body></html>`}
                style={{width:'100%',height:'100%',border:'none',minHeight:800}}
                title={t('superPagesEditor.preview')}
              />
            </div>
          </div>
        ) : (
          <Canvas
            els={els}
            selId={selId}
            canvasBg={canvasBg}
            canvasBgImage={canvasBgImage}
            selectElement={selectElement}
            deselectAll={deselectAll}
            updateElement={updateElement}
            markDirty={markDirty}
            onEditElement={handleEditElement}
            deviceView={deviceView}
            pageId={pageId}
          />
        )}
        {!previewMode && (
          <BlockPalette
            canvasBg={canvasBg}
            canvasBgImage={canvasBgImage}
            setCanvasBg={setCanvasBg}
            setCanvasBgImage={setCanvasBgImage}
            markDirty={markDirty}
            onAddElement={(type) => addElement(type)}
            pageId={pageId}
          />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#132044' }}>{t('superPagesEditor.pageSettings')}</h3>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 }}>{t('superPagesEditor.pageTitle')}</label>
            <input value={pageSettings.title} onChange={e => setPageSettings(p => ({ ...p, title: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 }}>{t('superPagesEditor.metaDescription')}</label>
            <textarea value={pageSettings.metaDescription} onChange={e => setPageSettings(p => ({ ...p, metaDescription: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 }}>{t('superPagesEditor.ogImage')}</label>
            <input value={pageSettings.ogImage} onChange={e => setPageSettings(p => ({ ...p, ogImage: e.target.value }))}
              placeholder={t('superPagesEditor.urlPlaceholder')}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 }}>{t('superPagesEditor.pageUrlSlug')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
              <span style={{ padding: '10px 12px', background: 'var(--sap-bg-page)', border: '2px solid #e2e8f0', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 12, color: 'var(--sap-text-faint)', whiteSpace: 'nowrap' }}>/p/{pageSettings.slug ? pageSettings.slug.split('/')[0] : 'username'}/</span>
              <input value={pageSettings.customSlug || (pageSettings.slug ? pageSettings.slug.split('/').pop() : '')}
                onChange={e => setPageSettings(p => ({ ...p, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-') }))}
                placeholder={t("superPagesEditor.slugPlaceholder")}
                style={{ flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '0 10px 10px 0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 14 }}>{t("superPagesEditor.slugNote")}</div>
            {pageSettings.slug && (
              <div style={{ padding: '10px 14px', background: 'var(--sap-green-bg)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 8, fontSize: 12, color: 'var(--sap-green)', marginBottom: 14, wordBreak: 'break-all' }}>
                Live URL: {window.location.origin}/p/{pageSettings.slug}
              </div>
            )}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 }}>{t('superPagesEditor.pageStatus')}</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setPageStatus('draft')} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: pageStatus === 'draft' ? '2px solid #0ea5e9' : '2px solid #e2e8f0', background: pageStatus === 'draft' ? 'rgba(14,165,233,.06)' : '#fff', color: pageStatus === 'draft' ? 'var(--sap-accent)' : 'var(--sap-text-faint)' }}>{t('superPagesEditor.draft')}</button>
              <button onClick={() => setPageStatus('published')} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: pageStatus === 'published' ? '2px solid #16a34a' : '2px solid #e2e8f0', background: pageStatus === 'published' ? 'rgba(22,163,74,.06)' : '#fff', color: pageStatus === 'published' ? 'var(--sap-green)' : 'var(--sap-text-faint)' }}>{t('superPagesEditor.published')}</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { markDirty(); setShowSettings(false); save(); }}
                style={{ padding: '10px 24px', background: 'var(--sap-accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Save Settings
              </button>
              <button onClick={() => setShowSettings(false)}
                style={{ padding: '10px 24px', background: 'var(--sap-bg-page)', color: 'var(--sap-text-secondary)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Element Editor Modal */}
      {editingElement && (
        <ElementEditorModal
          el={editingElement.el}
          elId={editingElement.id}
          els={els}
          updateElement={updateElement}
          markDirty={markDirty}
          onClose={() => setEditingElement(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.includes('✓') ? 'var(--sap-green-mid)' : toast.includes('error') || toast.includes('failed') ? 'var(--sap-red-bright)' : 'var(--sap-text-primary)',
          color: '#fff', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 300, transition: 'opacity 0.3s',
        }}>{toast}</div>
      )}

      {/* Knowledge Base Help Panel */}
      <HelpPanel visible={showHelp} onClose={() => setShowHelp(false)} />
    </div>
    </AppLayout>
  );
}

// ═══ Element Editor Modal ═══
function ElementEditorModal({ el, elId, els, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const actualEl = els.find(x => x.id === elId) || el;
  const [localTxt, setLocalTxt] = useState(actualEl.txt || '');
  const [localUrl, setLocalUrl] = useState(actualEl.url || '');

  const apply = () => {
    updateElement(elId, { txt: localTxt, url: localUrl });
    markDirty();
    onClose();
  };

  const type = actualEl.type;

  // Text types are edited inline on canvas — skip modal
  const isTextType = ['heading', 'text', 'label', 'review', 'testimonial', 'faq', 'stat', 'icontext', 'separator', 'logostrip'].includes(type);
  if (isTextType) { onClose(); return null; }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: 600, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.6px' }}>
            ✎ Edit — <span style={{ color: 'var(--sap-accent)' }}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>

          {/* Button / Announcement Bar */}
          {(type === 'button' || type === 'announcement') && (
            <ButtonEditor elId={elId} el={actualEl} type={type} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Image — URL or upload */}
          {type === 'image' && (
            <>
              <label style={lS}>{t('superPagesEditor.imageUrl')}</label>
              <input value={localTxt} onChange={e => setLocalTxt(e.target.value)} placeholder={t('superPagesEditor.urlPlaceholder')}
                style={{...iS, marginBottom: 8}} />
              <label style={{...lS, marginTop:4}}>{t('superPagesEditor.orUploadImage')}</label>
              <input type="file" accept="image/*" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                try {
                  const r = await fetch('/api/funnels/upload-image', {method:'POST', body:fd, credentials:'include'});
                  const d = await r.json();
                  if (d.url) setLocalTxt(d.url);
                } catch(err) { alert('Upload failed'); }
              }} style={{marginBottom:12, fontSize:12}} />
              {localTxt && <img src={localTxt} style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, marginBottom: 12 }} alt="" />}
            </>
          )}

          {/* Video — YouTube/Vimeo URL with auto-convert, or upload MP4 */}
          {type === 'video' && (
            <>
              <label style={lS}>{t('superPagesEditor.youtubeVimeoUrl')}</label>
              <input value={localTxt} onChange={e => {
                let v = e.target.value;
                // Auto-convert YouTube watch URLs to embed
                const ytMatch = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) v = `https://www.youtube.com/embed/${ytMatch[1]}`;
                // Auto-convert Vimeo URLs to embed
                const vmMatch = v.match(/vimeo\.com\/(\d+)/);
                if (vmMatch) v = `https://player.vimeo.com/video/${vmMatch[1]}`;
                setLocalTxt(v);
              }} placeholder={t('superPagesEditor.youtubeVimeoPlaceholderFull')}
                style={{...iS, marginBottom: 8}} />
              <label style={{...lS, marginTop:4}}>{t('superPagesEditor.uploadMp4')}</label>
              <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                try {
                  const r = await fetch('/api/funnels/upload-video', {method:'POST', body:fd, credentials:'include'});
                  const d = await r.json();
                  if (d.url) setLocalTxt(d.url);
                } catch(err) { alert('Upload failed'); }
              }} style={{marginBottom:12, fontSize:12}} />
              {localTxt && <div style={{fontSize:11,color:'var(--sap-green)',padding:'6px 10px',background:'var(--sap-green-bg)',border:'1px solid rgba(22,163,74,.2)',borderRadius:6,marginBottom:12,wordBreak:'break-all'}}>Embed: {localTxt}</div>}
            </>
          )}

          {/* Form — Visual editor */}
          {type === 'form' && (
            <FormEditor elId={elId} el={actualEl} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Countdown */}
          {type === 'countdown' && (
            <CountdownEditor elId={elId} el={actualEl} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Progress */}
          {type === 'progress' && (
            <ProgressEditor elId={elId} el={actualEl} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Audio */}
          {type === 'audio' && (
            <AudioEditor elId={elId} el={actualEl} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Embed */}
          {type === 'embed' && (
            <EmbedEditor elId={elId} el={actualEl} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Social Icons */}
          {type === 'socialicons' && (
            <SocialEditor elId={elId} el={actualEl} updateElement={updateElement} markDirty={markDirty} onClose={onClose} />
          )}

          {/* Apply button for text-based types */}
          {!['countdown', 'progress', 'audio', 'embed', 'socialicons', 'form', 'button', 'announcement'].includes(type) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={apply}
                style={{ padding: '10px 24px', background: 'var(--sap-accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Apply
              </button>
              <button onClick={onClose}
                style={{ padding: '10px 24px', background: 'var(--sap-bg-page)', color: 'var(--sap-text-secondary)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Specialised sub-editors ──
function CountdownEditor({ elId, el, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const [date, setDate] = useState(el._targetDate || '');
  return <>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 }}>{t('superPagesEditor.targetDateTime')}</label>
    <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
      style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
    <BtnRow onApply={() => { updateElement(elId, { _targetDate: date }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function ProgressEditor({ elId, el, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const [lbl, setLbl] = useState(el._label || 'Progress');
  const [pct, setPct] = useState(el._percent || 75);
  const [clr, setClr] = useState(el._color || 'var(--sap-accent)');
  return <>
    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <label style={lblStyle}>{t('superPagesEditor.label')}</label>
        <input value={lbl} onChange={e => setLbl(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ width: 80 }}>
        <label style={lblStyle}>%</label>
        <input type="number" min={0} max={100} value={pct} onChange={e => setPct(parseInt(e.target.value) || 0)} style={inputStyle} />
      </div>
      <div style={{ width: 50 }}>
        <label style={lblStyle}>{t('superPagesEditor.colour')}</label>
        <input type="color" value={clr} onChange={e => setClr(e.target.value)} style={{ width: 44, height: 36, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
      </div>
    </div>
    <BtnRow onApply={() => { updateElement(elId, { _label: lbl, _percent: pct, _color: clr }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function AudioEditor({ elId, el, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const [url, setUrl] = useState(el._audioUrl || '');
  const [uploading, setUploading] = useState(false);
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await fetch('/api/funnels/upload-audio', {method:'POST', body:fd, credentials:'include'});
      const d = await r.json();
      if (d.url) setUrl(d.url);
      else alert(d.error || 'Upload failed');
    } catch(err) { alert('Upload failed'); }
    setUploading(false);
  };
  return <>
    <label style={lblStyle}>{t('superPagesEditor.audioUrl')}</label>
    <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t('superPagesEditor.urlPlaceholder')} style={{ ...inputStyle, marginBottom: 8 }} />
    <label style={{...lblStyle, marginTop:4}}>{t('superPagesEditor.uploadAudio')}</label>
    <input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3" onChange={upload} disabled={uploading} style={{marginBottom:12, fontSize:12}} />
    {uploading && <div style={{fontSize:11,color:'var(--sap-accent)',marginBottom:8}}>{t('superPagesEditor.uploading')}</div>}
    {url && <div style={{fontSize:11,color:'var(--sap-green)',padding:'6px 10px',background:'var(--sap-green-bg)',border:'1px solid rgba(22,163,74,.2)',borderRadius:6,marginBottom:12,wordBreak:'break-all'}}>Audio: {url}</div>}
    <BtnRow onApply={() => { updateElement(elId, { _audioUrl: url }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function EmbedEditor({ elId, el, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const [code, setCode] = useState(el._embedCode || '');
  return <>
    <label style={lblStyle}>{t('superPagesEditor.htmlEmbedCode')}</label>
    <textarea value={code} onChange={e => setCode(e.target.value)} rows={6} placeholder='<iframe src="..."></iframe>'
      style={{ width: '100%', padding: 12, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
    <BtnRow onApply={() => { updateElement(elId, { _embedCode: code }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function SocialEditor({ elId, el, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  // Clean up legacy '#' values — treat them as empty
  const cleanLinks = (raw) => {
    const clean = {};
    const defaults = { youtube: '', instagram: '', tiktok: '', facebook: '', x: '', linkedin: '' };
    Object.keys(defaults).forEach(k => {
      const val = raw?.[k];
      clean[k] = (val && val !== '#') ? val : '';
    });
    return clean;
  };
  const [links, setLinks] = useState(cleanLinks(el._links));
  const platforms = [['youtube', 'YouTube', '#ff0000'], ['instagram', 'Instagram', '#e4405f'], ['tiktok', 'TikTok', '#000'], ['facebook', 'Facebook', '#1877f2'], ['x', 'X / Twitter', '#000'], ['linkedin', 'LinkedIn', '#0a66c2']];
  return <>
    {platforms.map(([key, label, color]) => (
      <div key={key} style={{ marginBottom: 8 }}>
        <label style={{ ...lblStyle, color }}>{label}</label>
        <input value={links[key] || ''} onChange={e => setLinks(p => ({ ...p, [key]: e.target.value }))} placeholder={t('superPagesEditor.addYourUrlPlaceholder')}
          style={inputStyle} />
      </div>
    ))}
    <BtnRow onApply={() => { updateElement(elId, { _links: links }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function ButtonEditor({ elId, el, type, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const [txt, setTxt] = useState(el.txt || (type === 'announcement' ? '🔥 LIMITED TIME OFFER — Join Now and Save 50%!' : 'Join Now'));
  const [url, setUrl] = useState(el.url || '');
  const [bgColor, setBgColor] = useState(el.s?.background || 'var(--sap-accent)');
  const [txtColor, setTxtColor] = useState(el.s?.color || '#fff');

  const apply = () => {
    updateElement(elId, {
      txt, url,
      s: { ...el.s, background: bgColor, color: txtColor }
    });
    markDirty(); onClose();
  };

  const PRESETS = [
    { bg: 'var(--sap-accent)', label: 'Cyan' },
    { bg: 'var(--sap-green-mid)', label: 'Green' },
    { bg: 'var(--sap-indigo)', label: 'Indigo' },
    { bg: 'var(--sap-red-bright)', label: 'Red' },
    { bg: 'var(--sap-amber)', label: 'Amber' },
    { bg: 'var(--sap-pink)', label: 'Pink' },
    { bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', label: 'Cyan→Indigo' },
    { bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)', label: 'Purple→Pink' },
    { bg: 'linear-gradient(135deg,#ef4444,#f59e0b)', label: 'Red→Amber' },
    { bg: 'linear-gradient(135deg,#10b981,#0ea5e9)', label: 'Green→Cyan' },
  ];

  return <>
    <label style={lblStyle}>{type === 'announcement' ? 'Banner Text' : 'Button Text'}</label>
    <input value={txt} onChange={e => setTxt(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />

    {type === 'button' && <>
      <label style={lblStyle}>{t('superPagesEditor.linkUrl')}</label>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t('superPagesEditor.urlPlaceholder')} style={{ ...inputStyle, marginBottom: 10 }} />
    </>}

    <label style={lblStyle}>{t('superPagesEditor.backgroundColour')}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, border: '2px solid #e2e8f0', overflow: 'hidden', background: bgColor }}>
        <input type="color" value={bgColor.startsWith('#') ? bgColor : 'var(--sap-accent)'} onChange={e => setBgColor(e.target.value)}
          style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', padding: 0 }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--sap-text-faint)' }}>{bgColor.startsWith('#') ? bgColor : 'Gradient'}</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
      {PRESETS.map((p, i) => (
        <div key={i} onClick={() => setBgColor(p.bg)} title={p.label} style={{
          width: 26, height: 26, borderRadius: 6, background: p.bg, cursor: 'pointer',
          border: bgColor === p.bg ? '2px solid #0f172a' : '1px solid #e2e8f0',
        }} />
      ))}
    </div>

    <label style={lblStyle}>{t('superPagesEditor.textColour')}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      {['#ffffff', '#000000', 'var(--sap-text-primary)', 'var(--sap-amber-bright)', 'var(--sap-accent)'].map(c => (
        <div key={c} onClick={() => setTxtColor(c)} style={{
          width: 24, height: 24, borderRadius: 5, background: c, cursor: 'pointer',
          border: txtColor === c ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
        }} />
      ))}
      <div style={{ position: 'relative', width: 24, height: 24, borderRadius: 5, border: '1px solid #e2e8f0', overflow: 'hidden', background: txtColor }}>
        <input type="color" value={txtColor} onChange={e => setTxtColor(e.target.value)}
          style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', padding: 0 }} />
      </div>
    </div>

    {/* Preview */}
    <div style={{ padding: 16, background: 'var(--sap-text-primary)', borderRadius: 12, marginBottom: 14, textAlign: 'center' }}>
      <div style={{ display: 'inline-block', padding: type === 'announcement' ? '10px 24px' : '12px 32px', borderRadius: type === 'announcement' ? 8 : 12, background: bgColor, color: txtColor, fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: type === 'announcement' ? 13 : 16 }}>{txt}</div>
    </div>

    <BtnRow onApply={apply} onClose={onClose} />
  </>;
}

function FormEditor({ elId, el, updateElement, markDirty, onClose }) {

  var { t } = useTranslation();
  const [heading, setHeading] = useState(el._formHeading || 'Get Free Access');
  const [subtitle, setSubtitle] = useState(el._formSubtitle || 'Enter your details below');
  const [showName, setShowName] = useState(el._formShowName !== false);
  const [showPhone, setShowPhone] = useState(el._formShowPhone || false);
  const [btnText, setBtnText] = useState(el._formBtnText || 'Get Access →');
  const [btnColor, setBtnColor] = useState(el._formBtnColor || 'var(--sap-accent)');
  const [redirectUrl, setRedirectUrl] = useState(el._formRedirect || '');

  const buildHTML = () => {
    let fields = '';
    if (showName) fields += `<input placeholder={t('superPagesEditor.firstNamePlaceholder')} style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:13px;margin-bottom:8px;box-sizing:border-box">`;
    fields += `<input placeholder={t('superPagesEditor.emailPlaceholder')} type="email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:13px;margin-bottom:8px;box-sizing:border-box">`;
    if (showPhone) fields += `<input placeholder={t('superPagesEditor.phonePlaceholder')} type="tel" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:13px;margin-bottom:8px;box-sizing:border-box">`;
    return `<div style="text-align:center;padding:4px"><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">${heading}</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">${subtitle}</div>${fields}<div style="width:100%;padding:12px;border-radius:10px;background:${btnColor};color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;cursor:pointer">${btnText}</div></div>`;
  };

  const apply = () => {
    updateElement(elId, {
      txt: buildHTML(),
      _formHeading: heading, _formSubtitle: subtitle, _formShowName: showName,
      _formShowPhone: showPhone, _formBtnText: btnText, _formBtnColor: btnColor, _formRedirect: redirectUrl,
    });
    markDirty(); onClose();
  };

  const L = lblStyle;
  const I = inputStyle;

  return <>
    <label style={L}>{t('superPagesEditor.formHeading')}</label>
    <input value={heading} onChange={e => setHeading(e.target.value)} style={{ ...I, marginBottom: 10 }} />

    <label style={L}>{t('superPagesEditor.subtitle')}</label>
    <input value={subtitle} onChange={e => setSubtitle(e.target.value)} style={{ ...I, marginBottom: 10 }} />

    <label style={{ ...L, marginBottom: 8 }}>{t('superPagesEditor.formFields')}</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sap-text-secondary)', cursor: 'pointer' }}>
        <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--sap-accent)' }} />
        First Name field
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sap-text-faint)' }}>
        <input type="checkbox" checked disabled style={{ width: 16, height: 16 }} />
        Email field (always on)
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sap-text-secondary)', cursor: 'pointer' }}>
        <input type="checkbox" checked={showPhone} onChange={e => setShowPhone(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--sap-accent)' }} />
        Phone number field
      </label>
    </div>

    <label style={L}>{t('superPagesEditor.buttonText')}</label>
    <input value={btnText} onChange={e => setBtnText(e.target.value)} style={{ ...I, marginBottom: 10 }} />

    <label style={L}>{t('superPagesEditor.buttonColour')}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, border: '2px solid #e2e8f0', overflow: 'hidden', background: btnColor }}>
        <input type="color" value={btnColor} onChange={e => setBtnColor(e.target.value)}
          style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', padding: 0 }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--sap-text-faint)' }}>{btnColor}</span>
      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {['var(--sap-accent)','var(--sap-green-mid)','var(--sap-indigo)','var(--sap-red-bright)','var(--sap-amber)','var(--sap-pink)'].map(c => (
          <div key={c} onClick={() => setBtnColor(c)} style={{ width: 20, height: 20, borderRadius: 5, background: c, cursor: 'pointer', border: btnColor === c ? '2px solid #0f172a' : '1px solid #e2e8f0' }} />
        ))}
      </div>
    </div>

    <label style={L}>{t('superPagesEditor.redirectUrl')}</label>
    <input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder={t('superPagesEditor.redirectPlaceholder')} style={{ ...I, marginBottom: 12 }} />

    {/* Preview */}
    <div style={{ padding: 16, background: 'var(--sap-text-primary)', borderRadius: 12, marginBottom: 14 }}>
      <div style={{ textAlign: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>{heading}</div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 12 }}>{subtitle}</div>
      {showName && <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 6 }}>{t('superPagesEditor.firstNamePlaceholder')}</div>}
      <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 6 }}>{t('superPagesEditor.emailPlaceholder')}</div>
      {showPhone && <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 6 }}>{t('superPagesEditor.phonePlaceholder')}</div>}
      <div style={{ background: btnColor, borderRadius: 8, padding: '10px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>{btnText}</div>
    </div>

    <BtnRow onApply={apply} onClose={onClose} />
  </>;
}

function BtnRow({ onApply, onClose }) {

  var { t } = useTranslation();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onApply}
        style={{ padding: '10px 24px', background: 'var(--sap-accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('superPagesEditor.apply')}</button>
      <button onClick={onClose}
        style={{ padding: '10px 24px', background: 'var(--sap-bg-page)', color: 'var(--sap-text-secondary)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
    </div>
  );
}

const lblStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 };
const lS = lblStyle;
const inputStyle = { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const iS = inputStyle;
