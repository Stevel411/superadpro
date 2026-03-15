import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useEditorState from './useEditorState';
import Canvas from './Canvas';
import BlockPalette from './BlockPalette';
import EditorTopbar from './EditorTopbar';
import HelpPanel from './HelpPanel';
import exportHTML from './exportHTML';
import { apiGet, apiPost } from '../../utils/api';

export default function SuperPagesEditor() {
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
  const [mobileView, setMobileView] = useState(false);
  const [pageStatus, setPageStatus] = useState('draft');
  const updatedAtRef = useRef(null);

  const editor = useEditorState();
  const { els, selId, canvasBg, canvasBgImage, dirty, setDirty,
    addElement, deleteElement, duplicateElement, updateElement,
    setEls, setCanvasBg, setCanvasBgImage, markDirty, undo, redo, deselectAll, clearCanvas, selectElement } = editor;

  // ── Expose functions for Canvas to call via window (cross-component communication) ──
  useEffect(() => {
    window._spAddElement = (type, x, y) => addElement(type, x, y);
    window._spDeleteElement = (id) => { if (confirm('Delete this element?')) deleteElement(id); };
    window._spDuplicateElement = (id) => duplicateElement(id);
    return () => { delete window._spAddElement; delete window._spDeleteElement; delete window._spDuplicateElement; };
  }, [addElement, deleteElement, duplicateElement]);

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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
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
  const handleClear = () => {
    if (!confirm('Remove all elements from this page?')) return;
    clearCanvas();
    showToast('All elements removed');
  };

  const togglePublish = async () => {
    const newStatus = pageStatus === 'published' ? 'draft' : 'published';
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
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0f1a', color: '#5a6080' }}>
        Loading editor...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0c0f1a', fontFamily: 'DM Sans,sans-serif' }}>
      <EditorTopbar
        title={pageSettings.title}
        slug={pageSettings.slug}
        saving={saving}
        dirty={dirty}
        status={pageStatus}
        onSave={save}
        onClear={handleClear}
        onShowSettings={() => setShowSettings(true)}
        onShowHelp={() => setShowHelp(true)}
        onUndo={undo}
        onRedo={redo}
        onBack={() => navigate('/funnels')}
        onTogglePublish={togglePublish}
        onTogglePreview={() => setPreviewMode(!previewMode)}
        previewMode={previewMode}
        onToggleMobile={() => setMobileView(!mobileView)}
        mobileView={mobileView}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {previewMode ? (
          /* Preview mode — shows rendered HTML */
          <div style={{flex:1,background:'#1a1a2e',overflow:'auto',display:'flex',justifyContent:'center',padding:20}}>
            <div style={{width:mobileView?375:1100,transition:'width .3s',background:'#fff',borderRadius:8,overflow:'hidden',boxShadow:'0 0 60px rgba(0,0,0,.3)',minHeight:600}}>
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&family=Montserrat:wght@400;600;700;800&family=Raleway:wght@400;600;700;800&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Outfit,sans-serif}img{max-width:100%;height:auto}${mobileView?`div[style*="width:1100px"]{transform:scale(${375/1100});transform-origin:top left;width:1100px!important}`:''}</style></head><body>${exportHTML(els, canvasBg, canvasBgImage)}</body></html>`}
                style={{width:'100%',height:'100%',border:'none',minHeight:800}}
                title="Preview"
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
            mobileView={mobileView}
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
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>Page Settings</h3>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Page Title</label>
            <input value={pageSettings.title} onChange={e => setPageSettings(p => ({ ...p, title: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Meta Description</label>
            <textarea value={pageSettings.metaDescription} onChange={e => setPageSettings(p => ({ ...p, metaDescription: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Social Share Image (OG Image URL)</label>
            <input value={pageSettings.ogImage} onChange={e => setPageSettings(p => ({ ...p, ogImage: e.target.value }))}
              placeholder="https://..."
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
            {pageSettings.slug && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid rgba(22,163,74,.2)', borderRadius: 8, fontSize: 12, color: '#16a34a', marginBottom: 14, wordBreak: 'break-all' }}>
                Live URL: {window.location.origin}/p/{pageSettings.slug}
              </div>
            )}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Page Status</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setPageStatus('draft')} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: pageStatus === 'draft' ? '2px solid #0ea5e9' : '2px solid #e2e8f0', background: pageStatus === 'draft' ? 'rgba(14,165,233,.06)' : '#fff', color: pageStatus === 'draft' ? '#0ea5e9' : '#94a3b8' }}>○ Draft</button>
              <button onClick={() => setPageStatus('published')} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: pageStatus === 'published' ? '2px solid #16a34a' : '2px solid #e2e8f0', background: pageStatus === 'published' ? 'rgba(22,163,74,.06)' : '#fff', color: pageStatus === 'published' ? '#16a34a' : '#94a3b8' }}>● Published</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { markDirty(); setShowSettings(false); save(); }}
                style={{ padding: '10px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Save Settings
              </button>
              <button onClick={() => setShowSettings(false)}
                style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
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
          background: toast.includes('✓') ? '#10b981' : toast.includes('error') || toast.includes('failed') ? '#ef4444' : '#1e293b',
          color: '#fff', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 300, transition: 'opacity 0.3s',
        }}>{toast}</div>
      )}

      {/* Knowledge Base Help Panel */}
      <HelpPanel visible={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

// ═══ Element Editor Modal ═══
function ElementEditorModal({ el, elId, els, updateElement, markDirty, onClose }) {
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
            ✎ Edit — <span style={{ color: '#0ea5e9' }}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>

          {/* Button/CTA */}
          {(type === 'button' || type === 'cta') && (
            <>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Button Text</label>
              <input value={localTxt} onChange={e => setLocalTxt(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Link URL</label>
              <input value={localUrl} onChange={e => setLocalUrl(e.target.value)} placeholder="https://..."
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
            </>
          )}

          {/* Image — URL or upload */}
          {type === 'image' && (
            <>
              <label style={lS}>Image URL</label>
              <input value={localTxt} onChange={e => setLocalTxt(e.target.value)} placeholder="https://..."
                style={{...iS, marginBottom: 8}} />
              <label style={{...lS, marginTop:4}}>Or upload an image</label>
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
              <label style={lS}>YouTube or Vimeo URL</label>
              <input value={localTxt} onChange={e => {
                let v = e.target.value;
                // Auto-convert YouTube watch URLs to embed
                const ytMatch = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) v = `https://www.youtube.com/embed/${ytMatch[1]}`;
                // Auto-convert Vimeo URLs to embed
                const vmMatch = v.match(/vimeo\.com\/(\d+)/);
                if (vmMatch) v = `https://player.vimeo.com/video/${vmMatch[1]}`;
                setLocalTxt(v);
              }} placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                style={{...iS, marginBottom: 8}} />
              <label style={{...lS, marginTop:4}}>Or upload MP4/WebM</label>
              <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                try {
                  const r = await fetch('/api/funnels/upload-video', {method:'POST', body:fd, credentials:'include'});
                  const d = await r.json();
                  if (d.url) setLocalTxt(d.url);
                } catch(err) { alert('Upload failed'); }
              }} style={{marginBottom:12, fontSize:12}} />
              {localTxt && <div style={{fontSize:11,color:'#16a34a',padding:'6px 10px',background:'#f0fdf4',border:'1px solid rgba(22,163,74,.2)',borderRadius:6,marginBottom:12,wordBreak:'break-all'}}>Embed: {localTxt}</div>}
            </>
          )}

          {/* Form — HTML editor */}
          {type === 'form' && (
            <>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Form HTML</label>
              <textarea value={localTxt} onChange={e => setLocalTxt(e.target.value)}
                rows={10}
                style={{ width: '100%', padding: 12, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
            </>
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
          {!['countdown', 'progress', 'audio', 'embed', 'socialicons'].includes(type) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={apply}
                style={{ padding: '10px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Apply
              </button>
              <button onClick={onClose}
                style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
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
  const [date, setDate] = useState(el._targetDate || '');
  return <>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Target Date & Time</label>
    <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
      style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
    <BtnRow onApply={() => { updateElement(elId, { _targetDate: date }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function ProgressEditor({ elId, el, updateElement, markDirty, onClose }) {
  const [lbl, setLbl] = useState(el._label || 'Progress');
  const [pct, setPct] = useState(el._percent || 75);
  const [clr, setClr] = useState(el._color || '#0ea5e9');
  return <>
    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <label style={lblStyle}>Label</label>
        <input value={lbl} onChange={e => setLbl(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ width: 80 }}>
        <label style={lblStyle}>%</label>
        <input type="number" min={0} max={100} value={pct} onChange={e => setPct(parseInt(e.target.value) || 0)} style={inputStyle} />
      </div>
      <div style={{ width: 50 }}>
        <label style={lblStyle}>Colour</label>
        <input type="color" value={clr} onChange={e => setClr(e.target.value)} style={{ width: 44, height: 36, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
      </div>
    </div>
    <BtnRow onApply={() => { updateElement(elId, { _label: lbl, _percent: pct, _color: clr }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function AudioEditor({ elId, el, updateElement, markDirty, onClose }) {
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
    <label style={lblStyle}>Audio URL (MP3, WAV, OGG)</label>
    <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, marginBottom: 8 }} />
    <label style={{...lblStyle, marginTop:4}}>Or upload audio file</label>
    <input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3" onChange={upload} disabled={uploading} style={{marginBottom:12, fontSize:12}} />
    {uploading && <div style={{fontSize:11,color:'#0ea5e9',marginBottom:8}}>Uploading...</div>}
    {url && <div style={{fontSize:11,color:'#16a34a',padding:'6px 10px',background:'#f0fdf4',border:'1px solid rgba(22,163,74,.2)',borderRadius:6,marginBottom:12,wordBreak:'break-all'}}>Audio: {url}</div>}
    <BtnRow onApply={() => { updateElement(elId, { _audioUrl: url }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function EmbedEditor({ elId, el, updateElement, markDirty, onClose }) {
  const [code, setCode] = useState(el._embedCode || '');
  return <>
    <label style={lblStyle}>HTML / Embed Code</label>
    <textarea value={code} onChange={e => setCode(e.target.value)} rows={6} placeholder='<iframe src="..."></iframe>'
      style={{ width: '100%', padding: 12, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
    <BtnRow onApply={() => { updateElement(elId, { _embedCode: code }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function SocialEditor({ elId, el, updateElement, markDirty, onClose }) {
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
        <input value={links[key] || ''} onChange={e => setLinks(p => ({ ...p, [key]: e.target.value }))} placeholder="Add your URL"
          style={inputStyle} />
      </div>
    ))}
    <BtnRow onApply={() => { updateElement(elId, { _links: links }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function BtnRow({ onApply, onClose }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onApply}
        style={{ padding: '10px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Apply</button>
      <button onClick={onClose}
        style={{ padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
    </div>
  );
}

const lblStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 };
const lS = lblStyle;
const inputStyle = { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const iS = inputStyle;
