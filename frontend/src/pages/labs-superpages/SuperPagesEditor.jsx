import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useEditorState from './useEditorState';
import Canvas from './Canvas';
import BlockPalette from './BlockPalette';
import EditorTopbar from './EditorTopbar';
import HelpPanel from './HelpPanel';
import LabsTemplatesGallery from './LabsTemplatesGallery';
import LayerPanel from './LayerPanel';
import exportHTML from './exportHTML';
import { apiGet, apiPost } from '../../utils/api';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import './LabsChrome.css';
import { loadSandboxPage, saveSandboxPage, exportToProductionPayload } from './sandboxStore';
import { FONTS, FONT_SIZES } from './elementDefaults';

export default function LabsSuperPagesEditor() {
  var { t } = useTranslation();
  // Two URL shapes:
  //   /labs/pagebuilder/edit/{pageId}              → DB-backed (legacy)
  //   /labs/pagebuilder/sandbox/edit/{sandboxId}   → localStorage-backed
  // useParams gives us whichever param was matched; sandboxId presence
  // is the signal to use sandbox mode.
  const { pageId, sandboxId } = useParams();
  const isSandbox = !!sandboxId;
  const effectiveId = sandboxId || pageId;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Admin gate — anyone else bounces to dashboard. Same belt-and-braces
  // pattern as the Labs landing page; we never reveal /labs/* to non-admins.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) navigate('/dashboard');
  }, [user, authLoading, navigate]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [pageSettings, setPageSettings] = useState({ title: '', metaDescription: '', ogImage: '', slug: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [deviceView, setDeviceView] = useState('desktop');
  const [pageStatus, setPageStatus] = useState('draft');
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 900);
  const updatedAtRef = useRef(null);
  // Last user activity timestamp — auto-save skips firing when the user has
  // touched the canvas within the last 5 seconds, so a save can't interrupt
  // an in-progress drag/resize/inline-text edit. Bumped by any pointer, key,
  // or input event inside the editor. Bug 6 fix, 14 May 2026.
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    document.addEventListener('pointerdown', bump);
    document.addEventListener('keydown', bump);
    document.addEventListener('input', bump);
    return () => {
      document.removeEventListener('pointerdown', bump);
      document.removeEventListener('keydown', bump);
      document.removeEventListener('input', bump);
    };
  }, []);

  // Track viewport width — editor needs desktop space for drag/resize to work
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const editor = useEditorState();
  const { els, selId, canvasBg, canvasBgImage, dirty, setDirty,
    addElement, deleteElement, duplicateElement, updateElement, updateElementStyle,
    setEls, setCanvasBg, setCanvasBgImage, markDirty, undo, redo, deselectAll, clearCanvas, selectElement, markSaved,
    selIds, toggleSelectAdditive, selectAll,
    deleteSelected, duplicateSelected,
    copySelected, paste, nudgeSelected, moveElementZ, selectMany,
    groupSelected, ungroupSelected, expandToGroup,
    distributeHorizontal, distributeVertical, alignSelected } = editor;

  // Which element types route through the Tiptap editor. These auto-enter
  // edit mode when first dropped on the canvas, so the user can type
  // immediately without a second click.
  const TIPTAP_AUTO_EDIT_TYPES = ['heading', 'text', 'label'];

  // Shared form styles for the Settings modal (and elsewhere). Centralised
  // so the visual treatment stays consistent across the editor's modals.
  const lblStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: '#475569',
    marginBottom: 6,
    fontFamily: 'Manrope, sans-serif',
    letterSpacing: '-0.005em',
  };
  const inpStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 9,
    fontSize: 13,
    outline: 'none',
    marginBottom: 14,
    boxSizing: 'border-box',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 500,
    color: '#0f172a',
    background: '#fff',
  };

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
    window._spDeleteElement = (id) => { deleteElement(id); };
    window._spDuplicateElement = (id) => duplicateElement(id);
    return () => { delete window._spAddElement; delete window._spDeleteElement; delete window._spDuplicateElement; };
  }, [addElementWithAutoEdit, deleteElement, duplicateElement]);

  // ── Load page data ──
  useEffect(() => {
    if (!effectiveId) { setLoading(false); return; }

    if (isSandbox) {
      // Sandbox load: pull from localStorage. No network, no auth check
      // beyond the admin gate above. If the sandbox id is bad, bounce
      // back to the list.
      const sb = loadSandboxPage(sandboxId);
      if (!sb) {
        showToast('Sandbox page not found');
        navigate('/labs/pagebuilder/sandbox');
        return;
      }
      setPageSettings({
        title: sb.name || '',
        metaDescription: sb.metaDescription || '',
        ogImage: sb.ogImage || '',
        slug: '',
      });
      setPageStatus('draft'); // sandboxes are always draft
      setEls(sb.els || []);
      setCanvasBg(sb.canvasBg || '#ffffff');
      setCanvasBgImage(sb.canvasBgImage || '');
      setLoading(false);
      return;
    }

    // DB-backed load (legacy /edit/{pageId} route)
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
  }, [pageId, sandboxId, isSandbox, effectiveId, setEls, setCanvasBg, setCanvasBgImage, navigate]);

  // ── Auto-collapse the sidebar on editor entry ──
  // The SuperPages editor benefits from maximum canvas width. Most users
  // will want the sidebar out of the way while building a page, so we
  // collapse it on mount and restore on unmount. If they want it back
  // mid-edit, the toggle button is on the sidebar's edge.
  //
  // We write to localStorage directly (in addition to dispatching the
  // event) because of a React mount-order race: SuperPagesEditor's
  // useEffect fires BEFORE AppLayout's useEffect on cold mount, so the
  // event listener isn't registered yet when we dispatch — the signal
  // is lost. Writing to localStorage gives AppLayout a value it reads
  // synchronously on its initial render, sidestepping the race.
  useEffect(function() {
    if (typeof window === 'undefined') return;
    var priorCollapsed = false;
    try {
      priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1';
      window.localStorage.setItem('sap-sidebar-collapsed', '1');
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
    return function() {
      try { window.localStorage.setItem('sap-sidebar-collapsed', priorCollapsed ? '1' : '0'); } catch (e) {}
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // ── Save ──
  // Reliability notes (14 May 2026):
  //   - savingRef gates concurrent saves. Without it, autosave + Cmd+S
  //     could both fire; their server responses could land out of order,
  //     and the loser's updated_at clash would force a stale-write error
  //     on the next save attempt.
  //   - mountedRef avoids setting state on an unmounted component if the
  //     user navigates away mid-save.
  //   - On 409 stale-write, we reload updated_at from the server response
  //     (when available) and surface a clear error so the member can re-save.
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const save = useCallback(async () => {
    // Concurrent-save guard. If a save is already in flight, queue nothing
    // — autosave will pick up any remaining dirty state on its next tick.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (isSandbox) {
        // Sandbox save: localStorage only. Synchronous, no network. We
        // wrap in the same try/catch shape so the autosave timing still
        // works the same way.
        const result = saveSandboxPage(sandboxId, {
          name: pageSettings.title || 'Untitled sandbox',
          metaDescription: pageSettings.metaDescription || '',
          ogImage: pageSettings.ogImage || '',
          els,
          canvasBg,
          canvasBgImage,
        });
        if (result) {
          showToast('✓ Saved to sandbox');
          markSaved();
        } else {
          showToast('Save failed — localStorage may be full');
        }
        return;
      }

      // DB-backed save (legacy /edit/{pageId} route)
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
      if (!mountedRef.current) return;
      if (res.success || res.id) {
        showToast('✓ Saved!');
        markSaved();
        if (res.slug) setPageSettings(prev => ({ ...prev, slug: res.slug }));
        if (res.updated_at) updatedAtRef.current = res.updated_at;
      } else {
        if (res.updated_at) updatedAtRef.current = res.updated_at;
        showToast('Save failed: ' + (res.error || 'unknown — your edits are still local'));
      }
    } catch (e) {
      if (mountedRef.current) showToast('Save error: ' + e.message);
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }, [els, canvasBg, canvasBgImage, pageId, sandboxId, isSandbox, pageSettings, pageStatus, markSaved]);

  // ── Export sandbox → production ──
  //
  // Available only in sandbox mode. Copies the current sandbox page
  // into a new funnel record via /api/funnels/save. Starts as 'draft'
  // — never auto-published. The original sandbox stays put in case
  // the member wants to keep iterating.
  // Sandbox publish flow — exports the localStorage sandbox into a real
  // funnel page in /pro/funnels AND publishes it live so the member can
  // immediately preview the working URL. Audit B-3 (20 May 2026): the
  // old flow exported as DRAFT with no live URL, which left members
  // stranded with no way to test their page. Now we publish directly
  // and open the live URL in a new tab so they can verify CTAs etc.
  const exportToProduction = useCallback(async () => {
    if (!isSandbox) return;
    if (!els || els.length === 0) {
      showToast('Add at least one element before publishing');
      return;
    }
    if (!confirm('Publish this sandbox page to a live URL?\n\nThis creates a real funnel page in your /pro/funnels list AND publishes it live so you can test the working URL. The sandbox version stays in Labs so you can keep iterating.')) {
      return;
    }
    setSaving(true);
    try {
      const sb = loadSandboxPage(sandboxId);
      if (!sb) throw new Error('Could not load sandbox');
      const payload = exportToProductionPayload({
        ...sb,
        name: pageSettings.title || sb.name,
        metaDescription: pageSettings.metaDescription || sb.metaDescription,
        ogImage: pageSettings.ogImage || sb.ogImage,
        els,
        canvasBg,
        canvasBgImage,
      });
      payload.gjs_html = exportHTML(els, canvasBg, canvasBgImage);
      // Force-publish on first export so the live URL works immediately.
      payload.status = 'published';
      const res = await apiPost('/api/funnels/save', payload);
      if (res.success || res.id) {
        const liveUrl = res.preview_url || (res.slug ? `/p/${res.slug}` : null);
        if (liveUrl) {
          // Open live URL in new tab so member can verify CTAs work
          window.open(liveUrl, '_blank', 'noopener,noreferrer');
          showToast('✓ Published — live page opening in new tab');
        } else {
          showToast('✓ Published — opening in /pro/funnels');
        }
        // Also navigate the current tab to /pro/funnels after a delay
        // so the member has the page in their funnel manager too
        setTimeout(() => {
          navigate('/pro/funnels');
        }, 1800);
      } else {
        showToast('Publish failed: ' + (res.error || 'unknown'));
      }
    } catch (e) {
      showToast('Publish error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [isSandbox, sandboxId, els, canvasBg, canvasBgImage, pageSettings, navigate]);

  // ── Apply template ──
  // Loads a template's els[] and canvasBg into the editor, replacing the
  // current canvas. Each element gets a fresh runtime ID so re-applying
  // the same template (or applying a template that shares an id with
  // existing elements) doesn't collide.
  //
  // markDirty fires after the state updates, which feeds the new state
  // into history via the debounced snapshot — so Ctrl+Z reverts the
  // entire template application as one entry, not 17 individual blocks.
  const applyTemplate = useCallback((tpl) => {
    if (!tpl || !Array.isArray(tpl.els)) {
      showToast('Could not load that template — please try another.');
      return;
    }
    const stamp = Date.now().toString(36);
    const freshEls = tpl.els.map((el, i) => ({
      ...el,
      id: 'tpl_' + stamp + '_' + i,
    }));
    setEls(freshEls);
    setCanvasBg(tpl.canvasBg || '#ffffff');
    setCanvasBgImage(tpl.canvasBgImage || '');
    setShowTemplates(false);
    setDirty(true);
    markDirty();
    showToast('✓ Template applied — customise away!');
  }, [setEls, setCanvasBg, setCanvasBgImage, setDirty, markDirty]);

  // ── Auto-save every 30s ──
  // Skip if: not dirty, save in flight, modal-style editor open, OR the user
  // has interacted in the last 5 seconds (a drag/resize/inline edit in progress).
  useEffect(() => {
    const interval = setInterval(() => {
      if (!dirty || editingElement || savingRef.current) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs < 5000) return;
      save();
    }, 30000);
    return () => clearInterval(interval);
  }, [dirty, editingElement, save]);

  // ── Keyboard shortcuts ──
  //
  // Standard editor bindings. Always check if the user is typing in
  // an input/textarea/contenteditable first — never steal those keys.
  //
  // Cmd/Ctrl modifier (Mac/Windows):
  //   Z = undo, Y or Shift+Z = redo, S = save
  //   D = duplicate selected, A = select all, C = copy, V = paste
  //
  // Plain keys:
  //   Delete / Backspace = remove selected
  //   Escape = deselect all
  //   Arrow keys = nudge 1px (selected), Shift+Arrow = nudge 10px
  useEffect(() => {
    const handler = (e) => {
      // Skip handler when the user is genuinely typing into a field.
      const tgt = e.target;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (tgt && tgt.getAttribute && tgt.getAttribute('contenteditable') === 'true') return;

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (k === 'z' && e.shiftKey)  { e.preventDefault(); redo(); return; }
        if (k === 'y')                { e.preventDefault(); redo(); return; }
        if (k === 's') { e.preventDefault(); save(); return; }
        if (k === 'd') { e.preventDefault(); duplicateSelected(); return; }
        if (k === 'a') { e.preventDefault(); selectAll(); return; }
        if (k === 'c') { e.preventDefault(); copySelected(); showToast('Copied'); return; }
        if (k === 'v') { e.preventDefault(); if (paste()) showToast('Pasted'); return; }
        if (k === 'g' && !e.shiftKey) { e.preventDefault(); groupSelected(); showToast('Grouped'); return; }
        if (k === 'g' && e.shiftKey)  { e.preventDefault(); ungroupSelected(); showToast('Ungrouped'); return; }
        if (k === "'" || k === ';')  { e.preventDefault(); setShowGrid(g => !g); return; }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selIds.size > 0 || selId) { e.preventDefault(); deleteSelected(); }
        return;
      }
      if (e.key === 'Escape') { deselectAll(); setEditingElement(null); return; }
      // Arrow nudge — uses nudgeSelected so multi-select moves together
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && (selIds.size > 0 || selId)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        nudgeSelected(dx, dy);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selId, selIds, undo, redo, save, deselectAll, deleteSelected, duplicateSelected, selectAll, copySelected, paste, nudgeSelected, groupSelected, ungroupSelected]);

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

    if (isSandbox) {
      // Sandbox: just write the cleared state to localStorage.
      const result = saveSandboxPage(sandboxId, {
        els: [],
        canvasBg: '#ffffff',
        canvasBgImage: '',
      });
      if (result) {
        setDirty(false);
        showToast('✓ Sandbox cleared');
      } else {
        showToast('Cleared locally — save failed');
      }
      return;
    }

    // DB-backed clear (legacy)
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
    if (isSandbox) {
      // Sandbox pages can't be published directly. They have to be
      // exported to production first, which creates a real funnel
      // record that THEN can be published.
      exportToProduction();
      return;
    }
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
      <AppLayout title="🧪 LABS · SuperPages" subtitle={t('superPagesEditor.loading', { defaultValue: 'Loading editor…' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#475569' }}>
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
      <AppLayout title="🧪 LABS · SuperPages">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 420, textAlign: 'center', color: '#475569', fontFamily: 'DM Sans,sans-serif' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖥️</div>
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: '#0f172a' }}>
              {t('superPagesEditor.desktopRequiredTitle', { defaultValue: 'Desktop required' })}
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#475569', margin: '0 0 24px' }}>
              {t('superPagesEditor.desktopRequiredBody', { defaultValue: 'The SuperPages editor uses precise drag and drop that needs a desktop or laptop to work properly. Please open this page on a larger screen to build your page.' })}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569', margin: '0 0 28px' }}>
              {t('superPagesEditor.desktopRequiredNote', { defaultValue: 'Your pages are fully responsive and will look great on all devices once published — this restriction only applies to the editor itself.' })}
            </p>
            <button onClick={() => navigate('/labs/pagebuilder')} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--sap-accent)', color: '#fff', fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700 }}>
              Back to Labs
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={(isSandbox ? '🧪 SANDBOX · ' : '🧪 LABS · ') + (pageSettings.title || t('superPagesEditor.untitledPage', { defaultValue: 'Untitled page' }))}
      subtitle={isSandbox ? 'Sandbox · localStorage only · Doesn\'t touch live site' : (pageSettings.slug ? '/' + pageSettings.slug + ' · Editing in Labs sandbox' : 'Editing in Labs sandbox')}
      fullHeight
      bgStyle={{ padding: 0, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowY: 'hidden' }}
    >
      <div className="labs-chrome" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: "'Manrope', 'Inter', sans-serif" }}>
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
        onShowTemplates={() => setShowTemplates(true)}
        onToggleLayers={() => setShowLayers(s => !s)}
        layersOpen={showLayers}
        onToggleGrid={() => setShowGrid(g => !g)}
        gridOn={showGrid}
        onUndo={undo}
        onRedo={redo}
        onBack={() => navigate(isSandbox ? '/labs/pagebuilder/sandbox' : '/pro/funnels')}
        onTogglePublish={togglePublish}
        onTogglePreview={() => setPreviewMode(!previewMode)}
        previewMode={previewMode}
        deviceView={deviceView}
        onSetDevice={setDeviceView}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {/* Floating layer panel — opens from the topbar button.
            Positioned over the canvas without taking layout space, so
            members can toggle it as a tool without losing canvas width. */}
        <LayerPanel
          open={showLayers && !previewMode}
          onClose={() => setShowLayers(false)}
          els={els}
          selId={selId}
          selIds={selIds}
          selectElement={selectElement}
          toggleSelectAdditive={toggleSelectAdditive}
          updateElement={updateElement}
          moveElementZ={moveElementZ}
          markDirty={markDirty}
        />

        {/* Floating alignment toolbar — appears at top of canvas
            when 2+ elements are selected. Lets members align edges
            or distribute spacing without hunting for menus. */}
        {!previewMode && selIds && selIds.size > 1 && (
          <div style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            border: '1px solid rgba(14,165,233,0.2)',
            borderRadius: 12,
            boxShadow: '0 4px 14px rgba(14,165,233,0.12), 0 12px 32px rgba(168,85,247,0.14)',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'Manrope, sans-serif',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', marginRight: 8, letterSpacing: '0.02em' }}>
              {selIds.size} selected
            </span>
            <div style={{ width: 1, height: 18, background: 'rgba(15,23,42,0.1)', marginRight: 4 }}/>
            {/* Align row */}
            {[
              { edge: 'left',    label: '◧', title: 'Align left' },
              { edge: 'centreH', label: '◫', title: 'Align centre horizontally' },
              { edge: 'right',   label: '◨', title: 'Align right' },
              { edge: 'top',     label: '⬒', title: 'Align top' },
              { edge: 'centreV', label: '⬓', title: 'Align centre vertically' },
              { edge: 'bottom',  label: '⬓', title: 'Align bottom' },
            ].map(b => (
              <button key={b.edge} onClick={() => alignSelected(b.edge)} title={b.title}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: '1px solid transparent',
                  background: 'transparent', color: '#475569', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,165,233,0.1)'; e.currentTarget.style.color = '#0284c7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
              >{b.label}</button>
            ))}
            {selIds.size > 2 && (
              <>
                <div style={{ width: 1, height: 18, background: 'rgba(15,23,42,0.1)', margin: '0 4px' }}/>
                <button onClick={distributeHorizontal} title="Distribute horizontally"
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                    color: '#7c3aed', cursor: 'pointer',
                    fontSize: 11, fontWeight: 800,
                  }}>↔ Distribute</button>
                <button onClick={distributeVertical} title="Distribute vertically"
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                    color: '#7c3aed', cursor: 'pointer',
                    fontSize: 11, fontWeight: 800,
                  }}>↕ Distribute</button>
              </>
            )}
            <div style={{ width: 1, height: 18, background: 'rgba(15,23,42,0.1)', margin: '0 4px' }}/>
            <button onClick={groupSelected} title="Group (⌘G)"
              style={{
                padding: '4px 10px', borderRadius: 6,
                background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(168,85,247,0.1))',
                border: '1px solid rgba(14,165,233,0.3)',
                color: '#0284c7', cursor: 'pointer',
                fontSize: 11, fontWeight: 800,
              }}>🔗 Group</button>
            <button onClick={ungroupSelected} title="Ungroup (⌘⇧G)"
              style={{
                padding: '4px 10px', borderRadius: 6,
                background: '#f8fafc', border: '1px solid #e2e8f0',
                color: '#475569', cursor: 'pointer',
                fontSize: 11, fontWeight: 800,
              }}>Ungroup</button>
          </div>
        )}

        {previewMode ? (
          /* Preview-only mode (member clicked Preview button) — shows
             rendered HTML with full responsive CSS. */
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
            <div style={{marginBottom:12,padding:'10px 24px',background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',borderRadius:10,fontSize:13,color:'#4338ca',fontWeight:700,display:'flex',alignItems:'center',gap:12}}>
              <span>{t('superPagesEditor.previewMode')}</span>
              <button onClick={() => setPreviewMode(false)} style={{padding:'6px 16px',borderRadius:8,border:'none',background:'var(--sap-indigo)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>{t('superPagesEditor.backToEditor')}</button>
            </div>
            <div style={{width:deviceView==='mobile'?390:deviceView==='tablet'?768:1100,transition:'width .3s',background:canvasBg||'#ffffff',borderRadius:10,overflow:'hidden',boxShadow:'0 4px 24px rgba(15,23,42,0.08), 0 12px 40px rgba(15,23,42,0.06)',minHeight:600,border:'1px solid #e2e8f0',display:'flex',flexDirection:'column'}}>
              {(() => {
                const maxY = els.length > 0
                  ? Math.max(...els.map(e => (e.y || 0) + (e.h || 0))) + 80
                  : 900;
                const stackHeight = els.length * 120 + 200;
                const previewH = deviceView !== 'desktop' ? stackHeight : Math.max(900, maxY);
                return (
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;600;700;800&family=Space+Grotesk:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&family=Montserrat:wght@400;600;700;800&family=Raleway:wght@400;600;700;800&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Manrope','DM Sans',sans-serif;background:${canvasBg || '#ffffff'};${canvasBgImage ? `background-image:url(${canvasBgImage});background-size:cover;background-position:center;background-repeat:no-repeat;` : ''}min-height:100vh}img{max-width:100%;height:auto}</style></head><body>${exportHTML(els, canvasBg, canvasBgImage)}</body></html>`}
                    style={{width:'100%',height:previewH+'px',border:'none',background:canvasBg||'#ffffff',display:'block'}}
                    title={t('superPagesEditor.preview')}
                  />
                );
              })()}
            </div>
          </div>
        ) : (
          /* Edit mode — works for all three devices. Canvas resizes
             to match the device breakpoint; element positions resolved
             via effectiveBox() in Canvas.jsx. Tablet/mobile edits write
             into el.tablet / el.mobile sparse override objects. */
          <Canvas
            els={els}
            selId={selId}
            canvasBg={canvasBg}
            canvasBgImage={canvasBgImage}
            selectElement={selectElement}
            deselectAll={deselectAll}
            updateElement={updateElement}
            updateElementStyle={updateElementStyle}
            markDirty={markDirty}
            onEditElement={handleEditElement}
            deviceView={deviceView}
            pageId={pageId}
            onShowTemplates={() => setShowTemplates(true)}
            selIds={selIds}
            toggleSelectAdditive={toggleSelectAdditive}
            selectMany={selectMany}
            expandToGroup={expandToGroup}
            showGrid={showGrid}
            duplicateElement={duplicateElement}
            deleteElement={deleteElement}
            moveElementZ={moveElementZ}
            copySelected={copySelected}
            paste={paste}
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
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10, 18, 40, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '60px 24px 24px',
          overflowY: 'auto',
        }}
          onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: 18,
              width: '100%',
              maxWidth: 560,
              padding: '28px 32px 30px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 8px 24px rgba(14,165,233,0.12)',
              fontFamily: 'Manrope, sans-serif',
            }}>
            {/* Eyebrow + heading */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 99,
                background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(168,85,247,0.1))',
                border: '1px solid rgba(14,165,233,0.25)',
                fontFamily: 'Sora, sans-serif',
                fontSize: 10, fontWeight: 900,
                color: '#0284c7',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>⚙ Page settings</div>
              <h3 style={{
                margin: 0,
                fontFamily: 'Sora, sans-serif',
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: '#0f172a',
              }}>{pageSettings.title || 'Untitled Page'}</h3>
              <p style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: '#64748b',
                fontWeight: 500,
              }}>Configure title, slug, and SEO metadata</p>
            </div>

            {/* Section: Content */}
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 10, fontWeight: 900,
              color: '#94a3b8',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>Content</div>

            <label style={lblStyle}>{t('superPagesEditor.pageTitle')}</label>
            <input value={pageSettings.title} onChange={e => setPageSettings(p => ({ ...p, title: e.target.value }))}
              style={inpStyle} />

            <label style={lblStyle}>{t('superPagesEditor.metaDescription')}</label>
            <textarea value={pageSettings.metaDescription} onChange={e => setPageSettings(p => ({ ...p, metaDescription: e.target.value }))}
              rows={3}
              style={{ ...inpStyle, resize: 'vertical' }} />

            <label style={lblStyle}>{t('superPagesEditor.ogImage')}</label>
            <input value={pageSettings.ogImage} onChange={e => setPageSettings(p => ({ ...p, ogImage: e.target.value }))}
              placeholder="https://..."
              style={inpStyle} />

            {/* Section: URL */}
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 10, fontWeight: 900,
              color: '#94a3b8',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 8, marginBottom: 10,
            }}>URL</div>

            <label style={lblStyle}>{t('superPagesEditor.pageUrlSlug')}</label>
            <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 6 }}>
              <span style={{
                padding: '11px 12px',
                background: 'rgba(14,165,233,0.06)',
                border: '1px solid rgba(15,23,42,0.08)',
                borderRight: 'none',
                borderRadius: '9px 0 0 9px',
                fontSize: 12,
                color: '#64748b',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>/p/{pageSettings.slug ? pageSettings.slug.split('/')[0] : 'username'}/</span>
              <input value={pageSettings.customSlug || (pageSettings.slug ? pageSettings.slug.split('/').pop() : '')}
                onChange={e => setPageSettings(p => ({ ...p, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-') }))}
                placeholder={t("superPagesEditor.slugPlaceholder")}
                style={{
                  flex: 1, padding: '10px 14px',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: '0 9px 9px 0',
                  fontSize: 13, outline: 'none',
                  fontFamily: 'monospace', fontWeight: 600,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }} />
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14, fontWeight: 500 }}>{t("superPagesEditor.slugNote")}</div>

            {pageSettings.slug && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 9,
                fontSize: 12,
                color: '#047857',
                marginBottom: 18,
                wordBreak: 'break-all',
                fontWeight: 600,
              }}>
                <span style={{ fontWeight: 900, marginRight: 6 }}>✓ Live:</span>
                {window.location.origin}/p/{pageSettings.slug}
              </div>
            )}

            {/* Section: Status */}
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 10, fontWeight: 900,
              color: '#94a3b8',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>Status</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
              <button onClick={() => setPageStatus('draft')} style={{
                flex: 1, padding: '11px',
                borderRadius: 9,
                fontSize: 12, fontWeight: 800,
                cursor: 'pointer',
                border: pageStatus === 'draft' ? '1px solid #0ea5e9' : '1px solid rgba(15,23,42,0.1)',
                background: pageStatus === 'draft' ? 'rgba(14,165,233,0.08)' : '#fff',
                color: pageStatus === 'draft' ? '#0284c7' : '#94a3b8',
                fontFamily: 'Manrope, sans-serif',
              }}>📝 {t('superPagesEditor.draft')}</button>
              <button onClick={() => setPageStatus('published')} style={{
                flex: 1, padding: '11px',
                borderRadius: 9,
                fontSize: 12, fontWeight: 800,
                cursor: 'pointer',
                border: pageStatus === 'published' ? '1px solid #10b981' : '1px solid rgba(15,23,42,0.1)',
                background: pageStatus === 'published' ? 'rgba(16,185,129,0.08)' : '#fff',
                color: pageStatus === 'published' ? '#047857' : '#94a3b8',
                fontFamily: 'Manrope, sans-serif',
              }}>🌐 {t('superPagesEditor.published')}</button>
            </div>

            {/* Footer actions */}
            <div style={{
              display: 'flex', gap: 10, justifyContent: 'flex-end',
              paddingTop: 16,
              borderTop: '1px solid rgba(15,23,42,0.06)',
            }}>
              <button onClick={() => setShowSettings(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 9,
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}>Cancel</button>
              <button onClick={() => { markDirty(); setShowSettings(false); save(); }}
                style={{
                  padding: '10px 22px',
                  background: 'linear-gradient(135deg, #0ea5e9, #a855f7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9,
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
                }}>Save settings</button>
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

      {/* Templates gallery — modal picker */}
      <LabsTemplatesGallery
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={applyTemplate}
        hasContent={els.length > 0}
        currentEls={els}
        currentBg={canvasBg}
        currentBgImage={canvasBgImage}
      />
    </div>
    </AppLayout>
  );
}

// ═══ Element Editor Modal ═══
function ElementEditorModal({ el, elId, els, updateElement, markDirty, onClose }) {
  var { t } = useTranslation();

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
                if (!f.type.startsWith('image/')) {
                  alert('That is not an image file. Please choose JPG, PNG, GIF, or WebP.');
                  e.target.value = ''; return;
                }
                if (f.size > 10 * 1024 * 1024) {
                  alert(`Image is too large (${(f.size/1024/1024).toFixed(1)}MB). Max 10MB. Try compressing first.`);
                  e.target.value = ''; return;
                }
                const fd = new FormData(); fd.append('file', f);
                try {
                  const r = await fetch('/api/funnels/upload-image', {method:'POST', body:fd, credentials:'include'});
                  if (!r.ok) {
                    alert(`Upload failed (${r.status}). ` + (r.status === 413 ? 'File too large for the server.' : r.status === 401 ? 'Please sign in again.' : 'Please try again.'));
                    return;
                  }
                  const d = await r.json();
                  if (d.url) setLocalTxt(d.url);
                  else alert('Upload failed: ' + (d.error || 'server returned no URL'));
                } catch(err) {
                  console.error('Image upload error:', err);
                  alert('Upload error: ' + (err.message || 'network failure'));
                } finally { e.target.value = ''; }
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
                if (!f.type.startsWith('video/')) {
                  alert('Please choose an MP4, WebM, or OGG video file.');
                  e.target.value = ''; return;
                }
                if (f.size > 100 * 1024 * 1024) {
                  alert(`Video is too large (${(f.size/1024/1024).toFixed(1)}MB). Max 100MB. For longer videos, upload to YouTube/Vimeo and paste the URL above.`);
                  e.target.value = ''; return;
                }
                const fd = new FormData(); fd.append('file', f);
                try {
                  const r = await fetch('/api/funnels/upload-video', {method:'POST', body:fd, credentials:'include'});
                  if (!r.ok) {
                    alert(`Upload failed (${r.status}). ` + (r.status === 413 ? 'File too large for the server.' : 'Please try again.'));
                    return;
                  }
                  const d = await r.json();
                  if (d.url) setLocalTxt(d.url);
                  else alert('Upload failed: ' + (d.error || 'server returned no URL'));
                } catch(err) {
                  console.error('Video upload error:', err);
                  alert('Upload error: ' + (err.message || 'network failure'));
                } finally { e.target.value = ''; }
              }} style={{marginBottom:12, fontSize:12}} />
              {localTxt && <div style={{fontSize:13,color:'var(--sap-green)',padding:'6px 10px',background:'var(--sap-green-bg)',border:'1px solid rgba(22,163,74,.2)',borderRadius:6,marginBottom:12,wordBreak:'break-all'}}>Embed: {localTxt}</div>}
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

  var { t } = useTranslation();
  const [url, setUrl] = useState(el._audioUrl || '');
  const [uploading, setUploading] = useState(false);
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('audio/')) {
      alert('Please choose an audio file (MP3, WAV, OGG).');
      e.target.value = ''; return;
    }
    if (f.size > 25 * 1024 * 1024) {
      alert(`Audio is too large (${(f.size/1024/1024).toFixed(1)}MB). Max 25MB.`);
      e.target.value = ''; return;
    }
    setUploading(true);
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await fetch('/api/funnels/upload-audio', {method:'POST', body:fd, credentials:'include'});
      if (!r.ok) {
        alert(`Upload failed (${r.status}). ` + (r.status === 413 ? 'File too large for the server.' : 'Please try again.'));
        return;
      }
      const d = await r.json();
      if (d.url) setUrl(d.url);
      else alert('Upload failed: ' + (d.error || 'server returned no URL'));
    } catch(err) {
      console.error('Audio upload error:', err);
      alert('Upload error: ' + (err.message || 'network failure'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  return <>
    <label style={lblStyle}>{t('superPagesEditor.audioUrl')}</label>
    <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t('superPagesEditor.urlPlaceholder')} style={{ ...inputStyle, marginBottom: 8 }} />
    <label style={{...lblStyle, marginTop:4}}>{t('superPagesEditor.uploadAudio')}</label>
    <input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3" onChange={upload} disabled={uploading} style={{marginBottom:12, fontSize:12}} />
    {uploading && <div style={{fontSize:13,color:'var(--sap-accent)',marginBottom:8}}>{t('superPagesEditor.uploading')}</div>}
    {url && <div style={{fontSize:13,color:'var(--sap-green)',padding:'6px 10px',background:'var(--sap-green-bg)',border:'1px solid rgba(22,163,74,.2)',borderRadius:6,marginBottom:12,wordBreak:'break-all'}}>Audio: {url}</div>}
    <BtnRow onApply={() => { updateElement(elId, { _audioUrl: url }); markDirty(); onClose(); }} onClose={onClose} />
  </>;
}

function EmbedEditor({ elId, el, updateElement, markDirty, onClose }) {
  var { t } = useTranslation();

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
  // Typography controls — added 20 May 2026 (audit B-1). Without these
  // the button can't match the visual hierarchy of the page above it.
  // Pull from the style sub-object with reasonable defaults that match
  // the elementDefaults seed values.
  const [fontFamily, setFontFamily] = useState(el.s?.fontFamily || 'Sora,sans-serif');
  const [fontSize, setFontSize] = useState(el.s?.fontSize || (type === 'announcement' ? '14px' : '18px'));
  const [fontWeight, setFontWeight] = useState(el.s?.fontWeight || '700');

  const apply = () => {
    updateElement(elId, {
      txt, url,
      s: {
        ...el.s,
        background: bgColor, color: txtColor,
        fontFamily, fontSize, fontWeight,
      }
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

    {/* Link URL — shown for both button AND announcement banner.
        Previously gated to type==='button' only, which meant banners
        could never have a clickable destination (audit A-1, 20 May 2026). */}
    <label style={lblStyle}>{t('superPagesEditor.linkUrl', { defaultValue: 'Link URL' })}</label>
    <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t('superPagesEditor.urlPlaceholder', { defaultValue: 'https://…' })} style={{ ...inputStyle, marginBottom: 10 }} />

    {/* Typography — font family, size, weight. Added 20 May 2026 (audit
        B-1, A-2) to give the button proper visual control. Default values
        match the seed in elementDefaults.js so existing buttons render
        identically until a member changes them. */}
    <label style={lblStyle}>{t('superPagesEditor.typography', { defaultValue: 'Typography' })}</label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, marginBottom: 12 }}>
      <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
        style={{ ...inputStyle, fontFamily }}>
        {FONTS.map(f => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
        ))}
      </select>
      <select value={fontSize} onChange={e => setFontSize(e.target.value)} style={inputStyle}>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} style={inputStyle}>
        <option value="400">Regular</option>
        <option value="500">Medium</option>
        <option value="600">Semibold</option>
        <option value="700">Bold</option>
        <option value="800">Extra Bold</option>
        <option value="900">Black</option>
      </select>
    </div>

    <label style={lblStyle}>{t('superPagesEditor.backgroundColour')}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, border: '2px solid #e2e8f0', overflow: 'hidden', background: bgColor }}>
        <input type="color" value={bgColor.startsWith('#') ? bgColor : 'var(--sap-accent)'} onChange={e => setBgColor(e.target.value)}
          style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', cursor: 'pointer', padding: 0 }} />
      </div>
      <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--sap-text-faint)' }}>{bgColor.startsWith('#') ? bgColor : 'Gradient'}</span>
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

    {/* Preview — reflects the live state values so the member can see
        their typography/colour choices before hitting Apply. Previously
        this preview hardcoded Sora 700 16px, ignoring the form state
        entirely (audit follow-up to B-1, 20 May 2026). */}
    <div style={{ padding: 16, background: 'var(--sap-text-primary)', borderRadius: 12, marginBottom: 14, textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        padding: type === 'announcement' ? '10px 24px' : '12px 32px',
        borderRadius: type === 'announcement' ? 8 : 14,
        background: bgColor,
        color: txtColor,
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight: 1.2,
        maxWidth: '100%',
        overflowWrap: 'break-word',
      }}>{txt}</div>
    </div>

    <BtnRow onApply={apply} onClose={onClose} />
  </>;
}

function FormEditor({ elId, el, updateElement, markDirty, onClose }) {
  var { t } = useTranslation();

  var { t } = useTranslation();
  const [heading, setHeading] = useState(el._formHeading || 'Get Free Access');
  const [subtitle, setSubtitle] = useState(el._formSubtitle || 'Enter your details below');
  const [showName, setShowName] = useState(el._formShowName !== false);
  const [showPhone, setShowPhone] = useState(el._formShowPhone || false);
  const [btnText, setBtnText] = useState(el._formBtnText || 'Get Access →');
  const [btnColor, setBtnColor] = useState(el._formBtnColor || 'var(--sap-accent)');
  const [redirectUrl, setRedirectUrl] = useState(el._formRedirect || '');

  const buildHTML = () => {
    // Resolve i18n strings BEFORE the template literal — previously
    // these were embedded as `{t('...')}` inside the template string,
    // which doesn't evaluate t() and so the literal Handlebars-style
    // text was saved into the page's HTML as the placeholder. Fixed
    // 18 May 2026 — same fix applied to production superpages editor.
    const namePlaceholder  = t('superPagesEditor.firstNamePlaceholder');
    const emailPlaceholder = t('superPagesEditor.emailPlaceholder');
    const phonePlaceholder = t('superPagesEditor.phonePlaceholder');
    let fields = '';
    if (showName) fields += `<input placeholder="${namePlaceholder}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:13px;margin-bottom:8px;box-sizing:border-box">`;
    fields += `<input placeholder="${emailPlaceholder}" type="email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:13px;margin-bottom:8px;box-sizing:border-box">`;
    if (showPhone) fields += `<input placeholder="${phonePlaceholder}" type="tel" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:13px;margin-bottom:8px;box-sizing:border-box">`;
    // Emit a real <button> tag (not a styled <div>) with the
    // data-sp-submit hook attribute. exportHTML.js finds it via this
    // attribute rather than regex-matching the visible text, so the
    // user can customise btnText to anything ('Start Free Trial',
    // 'Yes! Count me in →') and the form still has a real submit
    // button. Same fix as production superpages editor. 18 May 2026.
    return `<div style="text-align:center;padding:4px"><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">${heading}</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">${subtitle}</div>${fields}<button data-sp-submit="1" style="width:100%;padding:12px;border-radius:10px;background:${btnColor};color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;cursor:pointer;border:none;font-family:inherit">${btnText}</button></div>`;
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
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--sap-text-faint)', marginBottom: 12 }}>{subtitle}</div>
      {showName && <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--sap-text-faint)', marginBottom: 6 }}>{t('superPagesEditor.firstNamePlaceholder')}</div>}
      <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--sap-text-faint)', marginBottom: 6 }}>{t('superPagesEditor.emailPlaceholder')}</div>
      {showPhone && <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--sap-text-faint)', marginBottom: 6 }}>{t('superPagesEditor.phonePlaceholder')}</div>}
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
