import { useTranslation } from 'react-i18next';
import { useRef, useCallback, useEffect, useState } from 'react';
import { CANVAS_WIDTH, SNAP_THRESHOLD, SOCIAL_SVGS, DEVICE_WIDTHS, effectiveBox, hasOverride, applyDeviceUpdate } from './elementDefaults';
import InlineToolbar from './InlineToolbar';
import QuickProps from './QuickProps';
import TiptapText from './TiptapText';
import sanitizeEmbed from './sanitizeEmbed';
import { apiPost } from '../../utils/api';

// Element types that use the Tiptap-powered inline editor. Starting with
// the three simplest types — they store plain or lightly-formatted text as
// el.txt, and have no complex nested structure. Complex types (review,
// testimonial, faq, icontext, separator, logostrip) stay on the old flow
// for now; we'll migrate them once these three are solid on production.
const TIPTAP_TYPES = ['heading', 'text', 'label', 'badge'];

// Element types that have been ported to the new left-rail Inspector panel
// (ElementInspectorPanel.jsx). For these, the floating canvas toolbar's
// ✎ EDIT / ✎ LINK chip is hidden — the Inspector covers everything the
// chip used to do, and showing both made the canvas feel double-edited.
//
// Phase 1: Button
// Phase 2A: Heading, Text, Label — Tiptap text types styled via Inspector
//           (content still edited inline via double-click)
// Phase 2B: Announcement (banner) — dismissible + sticky toggles
// Phase 2B (continued): Form (opt-in) — field config + GDPR + success
//
// Phase 2C+ will continue porting types. Once this list contains every
// type, we can delete the old modal system entirely.
const INSPECTOR_TYPES = ['button', 'heading', 'text', 'label', 'announcement', 'form', 'image', 'video', 'audio', 'review', 'testimonial', 'faq', 'stat', 'badge', 'progress', 'icontext', 'separator', 'logostrip', 'box', 'divider', 'spacer', 'countdown', 'socialicons', 'embed'];

export default function Canvas({ els, selId, canvasBg, canvasBgImage, selectElement, deselectAll, updateElement, updateElementStyle, markDirty, onEditElement, deviceView, pageId, onShowTemplates, selIds, toggleSelectAdditive, selectMany, expandToGroup, duplicateElement, deleteElement, moveElementZ, copySelected, paste, showGrid, onScaleChange }) {
  var { t } = useTranslation();
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const guideRefs = useRef({});
  const [editingId, setEditingId] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [aiBusy, setAiBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, elId } or null
  const editableRef = useRef(null);

  const EDITABLE_TYPES = ['heading', 'text', 'label', 'badge', 'review', 'testimonial', 'faq', 'stat', 'icontext', 'separator', 'logostrip'];

  // Dismiss the context menu on outside click / Escape. Capture phase
  // so we catch the click before it hits other handlers.
  useEffect(() => {
    if (!contextMenu) return;
    const onDown = (e) => {
      if (e.target.closest('.sp-context-menu')) return;
      setContextMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setContextMenu(null); };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  // ── Canvas dimensions and responsive-render mode ──
  //
  // 25 May 2026: WYSIWYG editor preview — the canvas now renders
  // tablet/mobile views identically to the published page. Three modes:
  //
  //   absolute (desktop, OR tablet/mobile with per-device overrides):
  //       elements positioned via absolute x/y as before. Drag works
  //       normally and writes to the appropriate device's overrides.
  //
  //   scaled (tablet, no per-element overrides):
  //       elements stay at their desktop absolute positions, but the
  //       whole canvas inner is wrapped in a CSS scale transform of
  //       (canvasW / CANVAS_WIDTH) so the desktop layout shrinks
  //       proportionally — mirrors the export rule
  //       `scale: calc(100vw / 1100)` at 769-1023px.
  //
  //   stack (mobile, no per-element overrides):
  //       elements rendered as position:relative in vertical flow,
  //       full-width with per-type max-widths and centring — mirrors
  //       the export's @media(max-width:768px) fallback exactly.
  //
  // Detection matches the export logic in exportHTML.js so the editor
  // canvas and the live page are in lockstep.
  const hasMobileOverrides = els.some(el => el.mobile && !el.hidden);
  const hasTabletOverrides = els.some(el => el.tablet && !el.hidden);
  let renderMode = 'absolute';
  if (deviceView === 'mobile' && !hasMobileOverrides) renderMode = 'stack';
  else if (deviceView === 'tablet' && !hasTabletOverrides) renderMode = 'scaled';

  const canvasW = DEVICE_WIDTHS[deviceView] || CANVAS_WIDTH;
  const elBoxes = els.map(el => ({ el, box: effectiveBox(el, deviceView) }));
  const maxElY = elBoxes.length > 0 ? Math.max(...elBoxes.map(({ box }) => box.y + box.h)) : 0;

  // Canvas height depends on the render mode:
  //   absolute: tall enough to fit the highest absolute-positioned element
  //   scaled:   the desktop height proportionally shrunk
  //   stack:    intrinsic — let flow-layout decide. Set a minimum so the
  //             empty state still has room to render and the surface looks
  //             page-shaped, not letterbox.
  let canvasHeight;
  if (renderMode === 'scaled') {
    const desktopMaxY = els.length > 0 ? Math.max(...els.map(e => (e.y || 0) + (e.h || 0))) : 0;
    const desktopH = Math.max(1200, desktopMaxY + 200);
    canvasHeight = Math.ceil(desktopH * (canvasW / CANVAS_WIDTH));
  } else if (renderMode === 'stack') {
    // Rough estimate based on element count — actual height resolves
    // via natural flow. Just need a sensible canvas-area scroll boundary.
    canvasHeight = Math.max(700, els.length * 120 + 200);
  } else {
    canvasHeight = Math.max(deviceView === 'mobile' ? 700 : 1200, maxElY + 500);
  }

  // ── Scale-to-fit ──
  // 20 May 2026: Steve flag — wants canvas to react when he resizes
  // the editor window. The canvas itself stays at canvasW pixels
  // internally (the published page renders at that width on visitor
  // screens — never breaks). What changes is the EDITOR-time display:
  // when the canvas-area becomes too narrow to fit canvasW + 2*padding,
  // we apply transform: scale(N) on the canvas wrapper so the whole
  // canvas remains visible at a smaller display size.
  //
  // N = 1 when there's room. Drops to whatever ratio fits (clamped at
  // 0.4 minimum so we don't shrink to a postage stamp on tiny windows).
  // ResizeObserver watches the canvas-area for any width change —
  // covers browser resize, panel toggles, sidebar opens/closes, etc.
  const canvasAreaRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);
  // Ref mirror so non-React handlers (drag/resize/marquee, which
  // bind their own move listeners directly) can read the current
  // scale without closing over a stale value. Updated in the same
  // useEffect that sets the state.
  const canvasScaleRef = useRef(1);
  const CANVAS_PADDING = 40; // matches canvas-area padding below
  const SCALE_MIN = 0.4;

  useEffect(() => {
    const node = canvasAreaRef.current;
    if (!node) return;
    const recompute = () => {
      const areaW = node.clientWidth;
      const available = areaW - (CANVAS_PADDING * 2);
      let next;
      if (available >= canvasW) {
        next = 1;
      } else {
        next = Math.max(SCALE_MIN, available / canvasW);
      }
      setCanvasScale(next);
      canvasScaleRef.current = next;
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(node);
    return () => ro.disconnect();
  }, [canvasW]);

  // Bubble scale changes up to the editor so the topbar can show
  // the current zoom percentage. Throttled implicitly by React's
  // state batching — typically fires only on actual scale changes.
  useEffect(() => {
    if (typeof onScaleChange === 'function') onScaleChange(canvasScale);
  }, [canvasScale, onScaleChange]);

  // ── Inline editing ──
  const startInlineEdit = useCallback((id) => {
    const el = els.find(x => x.id === id);
    if (!el || !EDITABLE_TYPES.includes(el.type)) return;
    setEditingId(id);
    // Position toolbar above element
    const dom = document.getElementById(id);
    if (dom) {
      const rect = dom.getBoundingClientRect();
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 50 });
    }
    // Make content editable after state update
    setTimeout(() => {
      const ce = document.querySelector(`#${id} .cel-editable`);
      if (ce) {
        ce.contentEditable = 'true';
        ce.style.pointerEvents = 'auto';
        ce.style.cursor = 'text';
        ce.style.outline = 'none';
        ce.focus();
        editableRef.current = ce;
        // Select all text
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(ce);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 50);
  }, [els]);

  const exitInlineEdit = useCallback(() => {
    if (!editingId) return;
    const ce = editableRef.current;
    if (ce) {
      const html = ce.innerHTML;
      updateElement(editingId, { txt: html });
      markDirty();
      ce.contentEditable = 'false';
      ce.style.pointerEvents = 'none';
      ce.style.cursor = 'grab';
      // Explicitly blur so future Delete/Backspace keypresses route to the
      // element-delete handler in SuperPagesEditor rather than being swallowed
      // by the now-read-only contentEditable still holding focus.
      if (typeof ce.blur === 'function') ce.blur();
    }
    setEditingId(null);
    editableRef.current = null;
  }, [editingId, updateElement, markDirty]);

  // Update toolbar position on scroll/resize. Listens on both `.sp-canvas-area`
  // (the inner scroll container) AND the window, so the toolbar follows
  // regardless of which ancestor is scrolling — this matters now that the
  // editor lives inside AppLayout and there are two possible scroll owners.
  // Uses requestAnimationFrame so we never run the layout twice in one frame.
  useEffect(() => {
    if (!editingId) return;
    let rafId = null;
    const update = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const dom = document.getElementById(editingId);
        if (dom) {
          const rect = dom.getBoundingClientRect();
          setToolbarPos({ x: rect.left + rect.width / 2, y: Math.max(10, rect.top - 50) });
        }
      });
    };
    const area = document.querySelector('.sp-canvas-area');
    if (area) area.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (area) area.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [editingId]);

  // Auto-edit on drop — when SuperPagesEditor adds a tiptap-able element from
  // the palette, it fires `sp-auto-edit`. We immediately set editingId to
  // that element's id so TiptapText mounts with autoFocus=true and the user
  // can start typing without a second click.
  useEffect(() => {
    function onAutoEdit(e) {
      const id = e && e.detail && e.detail.id;
      if (!id) return;
      setEditingId(id);
    }
    window.addEventListener('sp-auto-edit', onAutoEdit);
    return () => window.removeEventListener('sp-auto-edit', onAutoEdit);
  }, []);

  // ── AI rewrite handler (passed down to TiptapText) ──
  // Called when the user picks a command from the bubble menu's AI menu.
  // POSTs the selection + command to the backend, then calls the component's
  // replaceSelection() callback with the rewritten text — which inserts it
  // in place of the selection and triggers the editor's normal onUpdate
  // path, which saves via updateElement.
  const handleAiRewrite = useCallback(async ({ command, prompt, selection, replaceSelection }) => {
    if (!pageId) {
      alert('Save the page first before using AI rewrite.');
      return;
    }
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const data = await apiPost(`/api/pro/funnel/${pageId}/ai-rewrite`, {
        selection,
        command,
        prompt: prompt || '',
      });
      if (data && data.success && data.result) {
        replaceSelection(data.result);
        markDirty();
      } else {
        alert((data && data.error) || 'AI rewrite failed. Try again.');
      }
    } catch (err) {
      alert('AI rewrite failed: ' + (err && err.message ? err.message : 'network error'));
    } finally {
      setAiBusy(false);
    }
  }, [pageId, aiBusy, markDirty]);

  // ── Device-aware update helper ──
  //
  // All position/size mutations from drag/resize/nudge go through this.
  // When deviceView is 'desktop', writes to base x/y/w/h. When tablet
  // or mobile, writes into el.tablet or el.mobile so the cascade keeps
  // working for other devices.
  const updateDeviceBox = useCallback((id, box) => {
    if (deviceView === 'desktop') {
      updateElement(id, box);
      return;
    }
    // For tablet/mobile, splice into the right override sub-object via
    // setEls callback — we don't have direct setEls access here, so we
    // route through updateElement with a nested-object update. The
    // helper applyDeviceUpdate handles the merging.
    const el = els.find(e => e.id === id);
    if (!el) return;
    const next = applyDeviceUpdate(el, deviceView, box);
    // applyDeviceUpdate returns a full element; only pass back the
    // device-specific sub-key + nothing else to avoid clobbering.
    updateElement(id, { [deviceView]: next[deviceView] });
  }, [deviceView, els, updateElement]);

  // ── Background style ──
  // Default to white when no canvasBg is set — matches the light theme.
  const bgStyle = {
    background: canvasBg || '#ffffff',
    ...(canvasBgImage ? {
      backgroundImage: `url(${canvasBgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    } : {}),
  };

  // ── Alignment guides + snap ──
  // Strengthened 14 May 2026 — previously snap only fired against
  // other elements. First element on an empty canvas had nothing to
  // snap against; members couldn't tell why "snap doesn't work."
  //
  // Now: snaps to canvas centre vertical, canvas left/right edges,
  // every other element's edges + centres, AND optionally to an
  // 8px grid (toggled via showGrid prop). Threshold 8px so the snap
  // engages easily. One guide per axis maximum.
  const showGuides = useCallback((el) => {
    const guides = guideRefs.current;
    Object.values(guides).forEach(g => { if (g) g.style.display = 'none'; });

    const T = 8; // snap threshold in px
    let snapX = null, snapY = null;
    let xGuideShown = false, yGuideShown = false;

    const elCX = el.x + el.w / 2;
    const elL = el.x, elR = el.x + el.w;
    const elT = el.y, elB = el.y + el.h, elCY = el.y + el.h / 2;

    // ── Grid snap ──
    // When the grid is enabled, snap to the nearest grid line (top-left
    // corner of the element). Applied first so element-to-element snaps
    // can still override for visually-meaningful alignments.
    if (showGrid) {
      const GRID = 8;
      const nearestX = Math.round(elL / GRID) * GRID;
      const nearestY = Math.round(elT / GRID) * GRID;
      if (Math.abs(elL - nearestX) < 4) { snapX = nearestX; }
      if (Math.abs(elT - nearestY) < 4) { snapY = nearestY; }
    }

    // ── Canvas guides ──
    // Vertical centre line
    if (Math.abs(elCX - canvasW / 2) < T) {
      if (guides.vCentre) { guides.vCentre.style.left = (canvasW / 2) + 'px'; guides.vCentre.style.display = 'block'; }
      snapX = canvasW / 2 - el.w / 2;
      xGuideShown = true;
    }
    // Canvas left edge
    if (!xGuideShown && Math.abs(elL) < T) {
      if (guides.vLeft) { guides.vLeft.style.left = '0px'; guides.vLeft.style.display = 'block'; }
      snapX = 0;
      xGuideShown = true;
    }
    // Canvas right edge
    if (!xGuideShown && Math.abs(elR - canvasW) < T) {
      if (guides.vRight) { guides.vRight.style.left = canvasW + 'px'; guides.vRight.style.display = 'block'; }
      snapX = canvasW - el.w;
      xGuideShown = true;
    }

    // ── Other-element guides ──
    for (let i = 0; i < els.length; i++) {
      const other = els[i];
      if (other.id === el.id) continue;
      // Use effective boxes so snap aligns to what's visually on-screen
      // for the current device, not the raw desktop values.
      const ob = effectiveBox(other, deviceView);
      const oT = ob.y, oB = ob.y + ob.h, oCY = ob.y + ob.h / 2;
      const oL = ob.x, oR = ob.x + ob.w, oCX = ob.x + ob.w / 2;

      // Horizontal (y-axis) snaps — top edges, mid, bottom, top-to-bottom, bottom-to-top
      if (!yGuideShown) {
        if (Math.abs(elT - oT) < T)      { showGuide('hTop', 'top', oT); snapY = oT;          yGuideShown = true; }
        else if (Math.abs(elCY - oCY) < T) { showGuide('hMid', 'top', oCY); snapY = oCY - el.h / 2; yGuideShown = true; }
        else if (Math.abs(elB - oB) < T)   { showGuide('hBot', 'top', oB); snapY = oB - el.h;    yGuideShown = true; }
        else if (Math.abs(elT - oB) < T)   { showGuide('hTop', 'top', oB); snapY = oB;          yGuideShown = true; }
        else if (Math.abs(elB - oT) < T)   { showGuide('hBot', 'top', oT); snapY = oT - el.h;    yGuideShown = true; }
      }

      // Vertical (x-axis) snaps
      if (!xGuideShown) {
        if (Math.abs(elL - oL) < T)        { showGuide('vLeft', 'left', oL); snapX = oL;          xGuideShown = true; }
        else if (Math.abs(elCX - oCX) < T) { showGuide('vCentre', 'left', oCX); snapX = oCX - el.w / 2; xGuideShown = true; }
        else if (Math.abs(elR - oR) < T)   { showGuide('vRight', 'left', oR); snapX = oR - el.w;    xGuideShown = true; }
        else if (Math.abs(elL - oR) < T)   { showGuide('vLeft', 'left', oR); snapX = oR;          xGuideShown = true; }
        else if (Math.abs(elR - oL) < T)   { showGuide('vRight', 'left', oL); snapX = oL - el.w;    xGuideShown = true; }
      }

      if (xGuideShown && yGuideShown) break;
    }

    // Apply the snaps
    if (snapX !== null) el.x = snapX;
    if (snapY !== null) el.y = snapY;
  }, [els, showGrid, canvasW, deviceView]);

  const showGuide = (name, prop, val) => {
    const g = guideRefs.current[name];
    if (g) { g.style[prop] = val + 'px'; g.style.display = 'block'; }
  };

  const hideGuides = () => {
    Object.values(guideRefs.current).forEach(g => { if (g) g.style.display = 'none'; });
  };

  // ── Drag Move ──
  // Supports lock (locked elements ignore drag), shift-click toggle for
  // additive selection, and group-drag when multiple elements are
  // selected — all selected elements move together with the same delta.
  const startDrag = useCallback((e, id) => {
    if (e.target.closest('.cel-bar') || e.target.closest('.cel-resize')) return;
    e.preventDefault();

    // Shift-click: toggle additive selection. Don't enter drag mode —
    // the user is curating the selection set, not moving anything yet.
    if (e.shiftKey && toggleSelectAdditive) {
      toggleSelectAdditive(id);
      return;
    }

    // Locked elements: select but don't drag. Surfaces selection so the
    // member can unlock via the toolbar.
    const el = els.find(x => x.id === id);
    if (!el) return;
    if (el.locked) {
      selectElement(id);
      return;
    }

    if (id !== selId) {
      // Click on an unselected element — select and don't drag yet.
      // If it belongs to a group, expand selection to the whole group
      // so the next drag moves the group together.
      if (el.groupId && expandToGroup) {
        expandToGroup(id);
      } else {
        selectElement(id);
      }
      return;
    }

    // Determine the set to move: if there's a multi-selection that
    // includes this element, move them all together. Also auto-include
    // group members of the clicked element. Locked elements skipped.
    let dragIds;
    if (selIds && selIds.size > 1 && selIds.has(id)) {
      dragIds = Array.from(selIds);
    } else if (el.groupId) {
      // Single-select drag of a group member — drag the whole group
      dragIds = els.filter(e => e.groupId === el.groupId).map(e => e.id);
    } else {
      dragIds = [id];
    }
    const groupIds = dragIds.filter(gid => {
      const ge = els.find(x => x.id === gid);
      return ge && !ge.locked;
    });

    const origs = {};
    groupIds.forEach(gid => {
      const ge = els.find(x => x.id === gid);
      if (ge) {
        // Read origs from the effective box for the current device,
        // not raw el.x/el.y — so dragging on tablet/mobile preserves
        // the override or falls back to base correctly.
        const b = effectiveBox(ge, deviceView);
        origs[gid] = { x: b.x, y: b.y, w: b.w, h: b.h };
      }
    });

    dragRef.current = { primary: id, groupIds, origs, startX: e.clientX, startY: e.clientY, finals: {} };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      // Convert screen-pixel deltas to canvas-pixel deltas. At scale
      // 0.7 the user's hand moves a screen pixel but the element
      // should move 1/0.7 canvas pixels to stay under the cursor.
      const s = canvasScaleRef.current || 1;
      const dx = (ev.clientX - d.startX) / s;
      const dy = (ev.clientY - d.startY) / s;

      // For the primary, snap to guides; the group follows the primary's
      // snapped delta so alignments stay coherent.
      const primaryOrig = d.origs[d.primary];
      // Build a temporary box for the snap calculation using effective dims
      const newBox = {
        ...el,
        x: Math.max(0, primaryOrig.x + dx),
        y: Math.max(0, primaryOrig.y + dy),
        w: primaryOrig.w,
        h: primaryOrig.h,
      };
      showGuides(newBox);
      const snappedDx = newBox.x - primaryOrig.x;
      const snappedDy = newBox.y - primaryOrig.y;

      // Apply snapped delta to every group member (including primary).
      d.groupIds.forEach(gid => {
        const o = d.origs[gid];
        const nx = Math.max(0, o.x + snappedDx);
        const ny = Math.max(0, o.y + snappedDy);
        const dom = document.getElementById(gid);
        if (dom) { dom.style.left = nx + 'px'; dom.style.top = ny + 'px'; }
        d.finals[gid] = { x: nx, y: ny };
      });
    };

    const onUp = () => {
      const d = dragRef.current;
      if (d && Object.keys(d.finals).length > 0) {
        // Commit all group members through updateDeviceBox so the writes
        // land in the right device override (base for desktop, .tablet
        // or .mobile for the other devices).
        Object.entries(d.finals).forEach(([gid, pos]) => {
          updateDeviceBox(gid, pos);
        });
        markDirty();
      }
      dragRef.current = null;
      hideGuides();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [els, selId, selIds, selectElement, updateElement, markDirty, showGuides, toggleSelectAdditive, expandToGroup, deviceView, updateDeviceBox]);

  // ── Resize ──
  const startResize = useCallback((e, id, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const el = els.find(x => x.id === id);
    if (!el) return;
    if (el.locked) return; // locked elements ignore resize
    // Read origs from the effective box for the current device.
    const b = effectiveBox(el, deviceView);
    resizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, origX: b.x, origY: b.y, origW: b.w, origH: b.h };
    // Divider exception (22 May 2026): match the wrapper minHeight
    // override so the resize handle can actually deliver a 1px line.
    const minH = el.type === 'divider' ? 1 : 20;

    const onMove = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      // Screen-pixel → canvas-pixel conversion. Without this, a 100px
      // mouse drag at scale 0.7 would resize the element 100px when
      // the user expected 100/0.7 ≈ 143px (so the edge stays under
      // the cursor on screen).
      const s = canvasScaleRef.current || 1;
      const dx = (ev.clientX - r.startX) / s;
      const dy = (ev.clientY - r.startY) / s;
      let newX = r.origX, newY = r.origY, newW = r.origW, newH = r.origH;

      // Right edge
      if (handle.includes('r')) newW = Math.max(40, r.origW + dx);
      // Left edge — moves x and shrinks width
      if (handle.includes('l')) { newW = Math.max(40, r.origW - dx); newX = r.origX + (r.origW - newW); }
      // Bottom edge
      if (handle.includes('b')) newH = Math.max(minH, r.origH + dy);
      // Top edge — moves y and shrinks height
      if (handle.includes('t')) { newH = Math.max(minH, r.origH - dy); newY = r.origY + (r.origH - newH); }

      // Direct DOM update for smooth resize
      const dom = document.getElementById(r.id);
      if (dom) { dom.style.width = newW + 'px'; dom.style.height = newH + 'px'; dom.style.left = newX + 'px'; dom.style.top = newY + 'px'; }
      resizeRef.current.finalX = newX;
      resizeRef.current.finalY = newY;
      resizeRef.current.finalW = newW;
      resizeRef.current.finalH = newH;
    };

    const onUp = () => {
      const r = resizeRef.current;
      if (r && r.finalW !== undefined) {
        // Write through device-aware helper so tablet/mobile edits land
        // in the right override and don't clobber desktop values.
        updateDeviceBox(r.id, { x: r.finalX, y: r.finalY, w: r.finalW, h: r.finalH });
        markDirty();
      }
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [els, deviceView, updateDeviceBox, markDirty]);

  // ── Drop from palette ──
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // getBoundingClientRect returns the VISUAL (scaled) rect when the
    // canvas is inside a transform: scale wrapper. Divide by the
    // current scale to convert screen-pixel offset into the canvas's
    // internal coordinate space.
    const s = canvasScaleRef.current || 1;
    const x = (e.clientX - rect.left) / s;
    const y = (e.clientY - rect.top) / s;
    // addElement is called from parent via the drop handler
    if (window._spAddElement) window._spAddElement(type, x, y);
  }, []);

  // ── Canvas mousedown — deselect on empty click, or start marquee drag ──
  // Click on the canvas bg deselects current. Click-and-drag draws a
  // rectangular marquee; on mouseup, any element whose bounding box
  // intersects the marquee enters the selection set.
  const [marquee, setMarquee] = useState(null); // {x1,y1,x2,y2} or null
  const marqueeRef = useRef(null);

  const handleCanvasClick = (e) => {
    // Only fire on direct canvas background, not on child elements.
    if (e.target !== canvasRef.current && !e.target.classList.contains('canvas-empty-state')) {
      return;
    }
    exitInlineEdit();
    // Don't deselect yet — wait to see if this is a click (deselect) or
    // a drag (marquee select). The mousemove handler decides.
    const rect = canvasRef.current.getBoundingClientRect();
    const s = canvasScaleRef.current || 1;
    const startX = (e.clientX - rect.left) / s;
    const startY = (e.clientY - rect.top) / s;
    let didDrag = false;
    marqueeRef.current = { startX, startY, x1: startX, y1: startY, x2: startX, y2: startY };

    const onMove = (ev) => {
      const m = marqueeRef.current;
      if (!m) return;
      const s = canvasScaleRef.current || 1;
      const cx = (ev.clientX - rect.left) / s;
      const cy = (ev.clientY - rect.top) / s;
      // Threshold: at least 4px drag distance to enter marquee mode,
      // so a plain click still feels like a click. Threshold is in
      // canvas-coordinate space (so a small flick feels consistent
      // regardless of current zoom).
      if (!didDrag && Math.abs(cx - m.startX) < 4 && Math.abs(cy - m.startY) < 4) return;
      didDrag = true;
      m.x1 = Math.min(m.startX, cx);
      m.y1 = Math.min(m.startY, cy);
      m.x2 = Math.max(m.startX, cx);
      m.y2 = Math.max(m.startY, cy);
      setMarquee({ x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
    };

    const onUp = () => {
      const m = marqueeRef.current;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      marqueeRef.current = null;
      setMarquee(null);
      if (!didDrag || !m) {
        // Plain click on empty canvas — deselect everything.
        deselectAll();
        return;
      }
      // Marquee drag — find every element whose box intersects.
      const hits = els.filter(el => {
        const elL = el.x, elR = el.x + el.w;
        const elT = el.y, elB = el.y + el.h;
        return !(elR < m.x1 || elL > m.x2 || elB < m.y1 || elT > m.y2);
      }).map(el => el.id);
      if (hits.length === 0) deselectAll();
      else if (typeof selectMany === 'function') selectMany(hits);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Render element inner content ──
  const renderInner = (el) => {
    const textStyles = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'textAlign', 'lineHeight', 'letterSpacing', 'textTransform', 'fontStyle'];
    let innerStyle = 'width:100%;height:100%;overflow:hidden;outline:none;word-wrap:break-word;';
    // 25 May 2026: strip non-explicit fontFamily and fontSize so page-level
    // typography settings can apply via CSS variables. Per Steve's directive,
    // page-level ALWAYS wins unless the member explicitly chose via Inspector
    // FontPicker (_fontExplicit) or size slider (_sizeExplicit, text only).
    textStyles.forEach(k => {
      if (!el.s?.[k]) return;
      if (k === 'fontFamily' && !el.s._fontExplicit) return;
      if (k === 'fontSize' && el.type === 'text' && !el.s._sizeExplicit) return;
      innerStyle += k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + el.s[k] + ';';
    });

    // ── Page-level Heading Font (22-25 May 2026) ──
    // For headings without _fontExplicit, set font-family to the page var.
    // The textStyles loop above already SKIPPED fontFamily for non-explicit
    // elements, so we add it here for headings only (text/button/banner
    // inherit body font from .sp-canvas via CSS — no per-element rule needed).
    if (el.type === 'heading' && !el.s?._fontExplicit) {
      innerStyle += 'font-family:var(--page-font-heading, "Sora", sans-serif);';
    }
    // Heading scale (compact/normal/large) multiplies the fontSize
    // for headings only — applied via calc() so the slider value is
    // preserved as the base.
    if (el.type === 'heading') {
      const fs = el.s?.fontSize || '36px';
      const fsNum = parseFloat(fs);
      if (!isNaN(fsNum)) {
        innerStyle += `font-size:calc(${fsNum}px * var(--page-heading-scale, 1));`;
      }
    }
    // Text elements without explicit fontSize inherit page-level body size.
    // .sp-canvas sets font-size: var(--page-font-base-size) which cascades
    // to text elements that don't set their own. The textStyles loop above
    // already skips fontSize when el.s.fontSize is absent, so inheritance
    // works automatically for migrated elements.

    // Badge/label blocks need flex centering
    if ((el.type === 'badge' || el.type === 'label') || (el.s?.display === 'flex')) {
      innerStyle += 'display:flex;align-items:center;justify-content:center;';
    }

    // ── Tiptap-powered inline editing for the 3 simplest types ──
    // When this element is being edited, mount the TiptapText component
    // with the element's current HTML; it handles focus, formatting toolbar,
    // and AI. When not editing, fall through to a plain div so the element
    // is draggable and selectable exactly like before.
    if (TIPTAP_TYPES.includes(el.type) && editingId === el.id) {
      // For Tiptap-edited elements we strip overflow:hidden from the inner
      // style. The editor needs to show its full content height so the
      // ResizeObserver inside TiptapText can report up the real height and
      // grow the element. With overflow:hidden the text at tall font sizes
      // just gets clipped inside a fixed-height element.
      const innerStyleNoClip = innerStyle.replace('overflow:hidden;', '');
      const styleObj = Object.fromEntries(
        innerStyleNoClip.split(';').filter(Boolean).map(s => {
          const [k, ...v] = s.split(':');
          return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(':').trim()];
        })
      );
      const placeholderByType = {
        heading: 'Your heading here…',
        text: 'Your text content goes here. Click to edit.',
        label: '⭐ LABEL',
      };
      return (
        <TiptapText
          html={el.txt || ''}
          onChange={(html) => updateElement(el.id, { txt: html })}
          onExit={() => { setEditingId(null); markDirty(); }}
          placeholder={placeholderByType[el.type] || ''}
          autoFocus={true}
          styleOverrides={styleObj}
          showAi={!!pageId}
          onAiRequest={handleAiRewrite}
          aiBusy={aiBusy}
          onHeightChange={(measuredH) => {
            // Grow the element box if the rendered text is taller than the
            // current element height. We add a small 12px buffer so the
            // bottom of descenders isn't flush against the edge. Never
            // shrink automatically — the user still has manual resize
            // handles for that.
            const needed = Math.ceil(measuredH) + 12;
            if (needed > el.h) updateElement(el.id, { h: needed });
          }}
        />
      );
    }

    if (el.type === 'video' && el.txt) {
      // Auto-convert YouTube/Vimeo watch URLs to embed URLs at render time
      let videoSrc = el.txt;
      const ytMatch = videoSrc.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const ytId = ytMatch ? ytMatch[1] : null;
      if (ytMatch) videoSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vmMatch = videoSrc.match(/(?:vimeo\.com\/)(\d+)/);
      if (vmMatch && !videoSrc.includes('player.vimeo.com')) videoSrc = `https://player.vimeo.com/video/${vmMatch[1]}`;

      // 20 May 2026 — apply YouTube branding-reduction flags. Built
      // as query params on the embed URL. modestbranding=1 suppresses
      // the corner watermark; rel=0 stops related-videos at end;
      // controls=0 hides the entire player UI (aggressive).
      if (ytId) {
        const ytParams = [];
        if (el._ytModestBranding !== false) ytParams.push('modestbranding=1');
        if (el._ytHideRelated !== false) ytParams.push('rel=0');
        if (el._ytHideControls) ytParams.push('controls=0');
        // Add showinfo=0 too — deprecated but still honoured on
        // some clients and harmless on others.
        ytParams.push('showinfo=0');
        if (ytParams.length) videoSrc = `${videoSrc}?${ytParams.join('&')}`;
      }

      // 20 May 2026 — YouTube facade. When _ytFacade is on, instead
      // of rendering YouTube's heavy embed we render the bare
      // thumbnail (served from img.youtube.com, no branding baked
      // into the image itself) with a custom play button overlay.
      // No YouTube logo visible until the visitor clicks play. The
      // iframe load is deferred to that click — saves ~600KB of
      // initial-page weight too.
      //
      // In the editor we show the facade as a static preview (no
      // click-through) so the editor click handlers still drive
      // selection. The actual click-to-play swap happens in the
      // exported HTML via a small JS handler.
      if (ytId && el._ytFacade) {
        const thumb = `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`;
        return <div style={{
          position: 'relative', width: '100%', height: '100%',
          backgroundImage: `url(${thumb})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          borderRadius: 12,
        }}>
          {/* Custom play button overlay — no YouTube branding. */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.18), rgba(0,0,0,0.32))',
            borderRadius: 12, pointerEvents: 'none',
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)',
            }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: '24px solid #0a1438',
                borderTop: '15px solid transparent',
                borderBottom: '15px solid transparent',
                marginLeft: 6,
              }}/>
            </div>
          </div>
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
        </div>;
      }

      const isMP4 = el._isMP4 || /\.(mp4|webm|ogg)/.test(videoSrc) || videoSrc.includes('funnel-videos');
      if (isMP4) {
        // Honour the four playback flags (added Phase 2C, 20 May 2026).
        // Defaults match historical behaviour: autoplay+muted+loop on,
        // controls off. We pass each as an actual prop / attribute so
        // React renders the correct element shape — `controls` is the
        // only one that's a boolean attribute the user toggles freely;
        // the others are auto-tied (autoplay requires muted in most
        // browsers, so we keep that pairing in the export comment).
        const vAutoplay = el._videoAutoplay !== false;
        const vLoop = el._videoLoop !== false;
        const vMuted = el._videoMuted !== false;
        const vControls = !!el._videoControls;
        return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <video
            src={videoSrc}
            style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover', pointerEvents: 'none' }}
            autoPlay={vAutoplay}
            loop={vLoop}
            muted={vMuted}
            controls={vControls}
            playsInline
          />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
        </div>;
      }
      return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe src={videoSrc} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, pointerEvents: 'none' }} allowFullScreen />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
      </div>;
    }
    if (el.type === 'video' && !el.txt) {
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#475569', fontSize: 13 }}>{t('superPagesEditor.clickVideoToAdd')}</div>;
    }
    if (el.type === 'image' && el.txt) {
      // _imageFit (added Phase 2C) + _imageAlt for a11y. Both fall
      // back to the historical defaults so pre-2C images render
      // identically.
      return <img
        src={el.txt}
        alt={el._imageAlt || ''}
        style={{
          width: '100%', height: '100%',
          objectFit: el._imageFit || 'cover',
          borderRadius: el.s?.borderRadius || '8px',
        }}
      />;
    }
    if (el.type === 'image' && !el.txt) {
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#475569', fontSize: 13 }}>{t('superPagesEditor.clickImageToUpload')}</div>;
    }
    if (el.type === 'divider') {
      // Divider style (audit C-L-5, 21 May 2026): solid uses the wrapper
      // background colour as a filled bar (legacy behaviour, preserved
      // for back-compat). Dashed/dotted use a border-top line to get
      // the dashed effect since a "dashed background" doesn't exist
      // in CSS. The line uses the same colour as el.s.background.
      const lineStyle = el._dividerStyle || 'solid';
      const lineColor = el.s?.background || '#334155';
      if (lineStyle === 'dashed' || lineStyle === 'dotted') {
        // Use el.h directly — was Math.max(2, el.h), which prevented
        // 1px dashed/dotted lines just like the solid bar bug. Slider
        // min=1 in the inspector so we're not at risk of 0px.
        return <div style={{
          width: '100%', height: '100%',
          borderTop: `${el.h || 1}px ${lineStyle} ${lineColor}`,
        }} />;
      }
      // solid — render as a filled bar via the wrapper (returns null
      // here so the outer .sp-el div's background-color takes over).
      return null;
    }
    if (['spacer', 'box'].includes(el.type) && !el.txt) return null;
    if (el.type === 'button' || el.type === 'announcement') {
      // Filter textStyles per the explicit-flag rules: skip non-_fontExplicit
      // fontFamily so page-level Body Font wins. No size filter here —
      // buttons/banners have their own intentional visual sizes which
      // aren't affected by page-level Body Size (that's text-only).
      return <div className="cel-editable" style={{
        ...Object.fromEntries(
          textStyles
            .filter(k => el.s?.[k])
            .filter(k => !(k === 'fontFamily' && !el.s._fontExplicit))
            .map(k => [k, el.s[k]])
        ),
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }} dangerouslySetInnerHTML={{__html: el.txt || 'Button'}} />;
    }
    if (el.type === 'countdown') {
      // 22 May 2026 — countdown gets a full set of styling controls.
      // Old hardcoded values assumed dark page: digits #fff on a light
      // translucent card, labels #64748b — on white pages both were
      // effectively invisible. Defaults preserved for pre-change pages.
      const digCol = el._cdDigitColor || '#fff';
      const digSize = el._cdDigitSize || 28;
      const lblCol = el._cdLabelColor || '#64748b';
      const lblSize = el._cdLabelSize || 13;
      const cdStyle = el._cdCardStyle || 'card'; // 'card' | 'minimal'
      const fontFam = el._cdFontFamily || 'Sora,sans-serif';
      const cardCss = cdStyle === 'minimal'
        ? { background: 'transparent', border: 'none', padding: '0 4px' }
        : { background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 14px', border: '1px solid rgba(255,255,255,0.08)' };
      return <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        {['Days', 'Hrs', 'Min', 'Sec'].map(l => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: fontFam, fontSize: digSize, fontWeight: 900, color: digCol, minWidth: 50, ...cardCss }}>00</div>
            <div style={{ fontSize: lblSize, color: lblCol, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
          </div>
        ))}
      </div>;
    }
    if (el.type === 'progress') {
      const pct = el._percent || 75, lbl = el._label || 'Progress', clr = el._color || 'var(--sap-accent)';
      // _trackColor added Phase 2D — was hardcoded; now customisable
      // for light-theme pages. Pre-2D default preserved.
      const trackClr = el._trackColor || 'rgba(255,255,255,0.08)';
      // _labelColor (22 May 2026) — old hardcoded var(--sap-border) was
      // a light-on-dark default. Members on white pages couldn't read it.
      const lblCol = el._labelColor || 'var(--sap-border)';
      return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: lblCol }}>{lbl}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: clr }}>{pct}%</span>
        </div>
        <div style={{ width: '100%', height: 10, background: trackClr, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: clr, borderRadius: 5 }} />
        </div>
      </div>;
    }
    if (el.type === 'socialicons') {
      // _iconColor (Phase 2E, 20 May 2026) — was hardcoded so members
      // couldn't change it. Default preserves old look for pre-2E pages.
      const iconFill = el._iconColor || 'var(--sap-text-faint)';
      // _iconOpacity (22 May 2026) — was hardcoded 0.7 inline which made
      // every social row look washed-out, particularly against white
      // member pages. Now defaults to 1.0 to MATCH the published-page
      // behaviour (export never applied opacity), so editor and live
      // page finally agree. Members who want the old faded look can
      // dial opacity down via the inspector.
      const iconOpacity = el._iconOpacity !== undefined ? el._iconOpacity : 1.0;
      // _iconSize (22 May 2026 follow-up) — was hardcoded 22px. SVGs
      // didn't scale with the element wrapper, so members resizing
      // the box still got tiny icons. Now slider-controlled.
      const iconSize = el._iconSize || 22;
      return <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        {Object.keys(SOCIAL_SVGS).map(k => (
          <svg key={k} viewBox="0 0 24 24" width={iconSize} height={iconSize} fill={iconFill} style={{ opacity: iconOpacity }}><path d={SOCIAL_SVGS[k]} /></svg>
        ))}
      </div>;
    }
    if (el.type === 'stat' && (el._statValue !== undefined || el._statLabel !== undefined)) {
      // Structured stat (Phase 3 inspector refactor, audit C-X-4
      // 21 May 2026). Value/label/colour live on the element; we
      // render directly without HTML strings. Legacy stats with el.txt
      // content fall through to the default Tiptap/HTML render below.
      // 22 May 2026 — added _statSize, _statLabelColor, _statLabelSize
      // to give members control over the previously-hardcoded styles.
      // Defaults match the original hardcoded values for back-compat.
      const sv = el._statValue ?? '';
      const sl = el._statLabel ?? '';
      const sc = el._statColor || '#0ea5e9';
      const ss = el._statSize || 36;
      const slc = el._statLabelColor || '#64748b';
      const sls = el._statLabelSize || 12;
      return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--page-font-heading, "Sora", sans-serif)', fontSize: ss, fontWeight: 900, color: sc, lineHeight: 1.1 }}>{sv}</div>
        <div style={{ fontSize: sls, color: slc, marginTop: 4 }}>{sl}</div>
      </div>;
    }
    if (el.type === 'separator' && (el._separatorSymbol !== undefined)) {
      // Structured separator (Phase 3 inspector refactor, audit C-X-4).
      // 22 May 2026 — _separatorSize and _separatorSymbolColor added.
      // The 12px hardcoded symbol couldn't be enlarged; star-decorator
      // use cases like ★ ★ ★ need to render at 24-32px to look like
      // real decoration vs accidental punctuation.
      const sym = el._separatorSymbol ?? '';
      const lineCol = el._separatorColor || 'rgba(255,255,255,0.1)';
      const symSize = el._separatorSize || 12;
      const symCol = el._separatorSymbolColor || '#64748b';
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, height: 1, background: lineCol }} />
        <span style={{ fontSize: symSize, color: symCol, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1 }}>{sym}</span>
        <div style={{ flex: 1, height: 1, background: lineCol }} />
      </div>;
    }
    if (el.type === 'icontext' && (el._icon !== undefined || el._iconHeading !== undefined)) {
      // Structured icontext (Phase 3 inspector refactor, audit C-X-4).
      // 22 May 2026 — added _iconSize, _iconHeadingColor, _iconDescColor.
      // Old defaults assumed dark page bg (#fff heading, #94a3b8 desc)
      // which made the entire element invisible on white member pages.
      // Members can now pick colours that work for their page bg.
      const ic = el._icon ?? '';
      const ih = el._iconHeading ?? '';
      const idd = el._iconDescription ?? '';
      const iconSize = el._iconSize || 28;
      const hCol = el._iconHeadingColor || '#fff';
      const dCol = el._iconDescColor || '#94a3b8';
      return <div style={{ width: '100%', height: '100%', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ fontSize: iconSize, flexShrink: 0, width: Math.max(40, iconSize + 12), textAlign: 'center', lineHeight: 1 }}>{ic}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--page-font-heading, "Sora", sans-serif)', fontWeight: 700, fontSize: 15, color: hCol, marginBottom: 4 }}>{ih}</div>
          <div style={{ fontSize: 13, color: dCol, lineHeight: 1.6 }}>{idd}</div>
        </div>
      </div>;
    }
    if (el.type === 'logostrip' && Array.isArray(el._logos)) {
      // Structured logostrip (Phase 3 inspector refactor, audit C-X-4).
      // 22 May 2026 — _logoStyle ('mono' | 'colour') and _logoTextColor
      // added. The default 'mono' (greyscale, 0.6 opacity) matches the
      // pre-change look; 'colour' renders full-saturation images, which
      // is what members want when showing partner logos prominently.
      const header = el._logoHeader || '';
      const headerCol = el._logoHeaderColor || '#475569';
      const textCol = el._logoTextColor || '#64748b';
      const style = el._logoStyle || 'mono';
      const imgFilter = style === 'colour'
        ? { opacity: 1, filter: 'none' }
        : { opacity: 0.6, filter: 'grayscale(1)' };
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
        {header && <span style={{ fontSize: 11, color: headerCol, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{header}</span>}
        {el._logos.map((l, idx) => {
          if (l && l.img && /^(https?:\/\/|\/)/i.test(String(l.img))) {
            return <img key={idx} src={l.img} alt={l.text || 'Logo'} style={{ height: 24, maxWidth: 120, width: 'auto', objectFit: 'contain', ...imgFilter, pointerEvents: 'none' }} />;
          }
          const t = (l && l.text) || '';
          return t ? <span key={idx} style={{ fontSize: 14, color: textCol, fontWeight: 600, opacity: style === 'colour' ? 1 : 0.6 }}>{t}</span> : null;
        })}
      </div>;
    }
    if (el.type === 'faq' && (el._faqQuestion !== undefined || el._faqAnswer !== undefined)) {
      // Structured FAQ (Phase 3 inspector refactor, audit C-X-4).
      // Editor preview always shows both Q and A expanded — the
      // collapse-by-default behaviour from audit C-C-3 only applies
      // to the PUBLISHED page (CSS in exported <style> block). In
      // the editor, members need to see the answer to edit it.
      // 22 May 2026 — _faqQColor, _faqAColor, _faqCardStyle added.
      // Pre-change defaults assumed dark page; on white pages BOTH
      // question and answer rendered in white-ish tones (invisible).
      const q = el._faqQuestion ?? '';
      const a = el._faqAnswer ?? '';
      const qCol = el._faqQColor || '#fff';
      const aCol = el._faqAColor || '#94a3b8';
      const cardStyle = el._faqCardStyle || 'dark'; // 'dark' | 'light' | 'minimal'
      const cardBg = cardStyle === 'light'
        ? { background: '#f8fafc', border: '1px solid #e2e8f0' }
        : cardStyle === 'minimal'
          ? { background: 'transparent', border: 'none' }
          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
      // 22 May 2026 follow-up — wrapper background neutralised to
      // 'transparent' so the FAQ's natural content sits at the top
      // and any excess wrapper height shows the page bg, not an
      // unintended white fill. (The Light card style was previously
      // painting white across the whole wrapper because the q-row
      // background was inheriting up.) Content uses 'flex-start' to
      // ensure no centering with leftover whitespace below.
      return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: 12, flexShrink: 0, ...cardBg }}>
          <span style={{ fontFamily: 'var(--page-font-heading, "Sora", sans-serif)', fontWeight: 700, fontSize: 15, color: qCol }}>{q}</span>
          <span style={{ color: '#64748b', fontSize: 22, lineHeight: 1 }}>+</span>
        </div>
        <div style={{ padding: '12px 18px', fontSize: 14, color: aCol, lineHeight: 1.7, marginTop: 4, flexShrink: 0 }}>{a}</div>
      </div>;
    }
    if ((el.type === 'review' || el.type === 'testimonial') && (el._rating !== undefined || el._quote !== undefined || el._author !== undefined)) {
      // Structured review/testimonial (Phase 3 inspector refactor,
      // audit C-X-4 + C-C-1). Stars generated from numeric rating.
      // 22 May 2026 — _starColor, _starSize, _quoteColor, _authorColor.
      // Default star colour stays amber #fbbf24 (universal review-star
      // convention — Steve approved 22 May 2026), but members can pick
      // any colour. Quote/author defaults assumed dark page; on white
      // bg the quote was light grey #e2e8f0 (invisible).
      const r = Math.max(1, Math.min(5, parseInt(el._rating, 10) || 5));
      const stars = '★'.repeat(r) + '☆'.repeat(5 - r);
      const q = el._quote ?? '';
      const a = el._author ?? '';
      const starCol = el._starColor || '#fbbf24';
      const starSize = el._starSize || 16;
      const qCol = el._quoteColor || '#e2e8f0';
      const aCol = el._authorColor || '#64748b';
      return <div style={{ width: '100%', height: '100%' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: starCol, letterSpacing: 2, fontSize: starSize, lineHeight: 1 }}>{stars}</span>
        </div>
        {q && <div style={{ fontSize: 15, color: qCol, lineHeight: 1.7, fontStyle: 'italic' }}>{'\u201c' + q + '\u201d'}</div>}
        {a && <div style={{ fontSize: 13, color: aCol, fontWeight: 600, marginTop: 8 }}>{'\u2014 ' + a}</div>}
      </div>;
    }
    if (el.type === 'audio') {
      // Canonical key is `txt`; legacy data may use `_audioUrl`. Audit C-M-5.
      const audioSrc = el.txt || el._audioUrl;
      if (audioSrc) {
        return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <audio src={audioSrc} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} controls />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
        </div>;
      }
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#475569', fontSize: 13, gap: 8 }}>{t('superPagesEditor.clickAudioToAdd')}</div>;
    }
    if (el.type === 'embed') {
      if (el._embedCode) {
        // Sanitise before render — strips scripts, event handlers, dangerous
        // URL schemes, and non-allowlisted iframe sources. Audit C-L-6.
        return <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 8, pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: sanitizeEmbed(el._embedCode) }} />;
      }
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#475569', fontSize: 13, gap: 8 }}>{t('superPagesEditor.clickCodeFull')}</div>;
    }
    // Badge/label: render as centred pill
    if (el.type === 'badge' || el.type === 'label') {
      return <div className="cel-editable" style={{ ...Object.fromEntries(
        ['fontFamily','fontSize','fontWeight','color','textAlign','lineHeight','letterSpacing','textTransform','fontStyle']
          .filter(k => el.s?.[k])
          .filter(k => !(k === 'fontFamily' && !el.s._fontExplicit))
          .map(k => [k, el.s[k]])
      ), width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'text', outline: 'none', wordWrap: 'break-word' }} dangerouslySetInnerHTML={{__html: el.txt || '★ BADGE'}} />;
    }
    // Default: contenteditable text
    // 25 May 2026: data-type attribute lets the scoped CSS (.sp-canvas
    // .cel-editable[data-type="heading"] * { font-family: inherit })
    // force all descendants of a heading to inherit the wrapper's font.
    // Defeats Tiptap-baked inline fonts inside el.txt that would
    // otherwise block page-level Heading Font from propagating.
    //
    // 25 May 2026 v2: parsed inline style object PLUS direct React-merged
    // style for the page-level heading font/scale. The innerStyle string
    // parse round-trip was suspected of mangling the var() value with
    // nested commas/quotes — by passing the var via a separate style
    // object merged after, we guarantee React serialises it intact.
    const parsedInnerStyle = Object.fromEntries(
      innerStyle.split(';').filter(Boolean).map(s => { const [k, ...v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(':').trim()]; })
    );
    // Heading-only: merge page-level font/scale directly (not via the
    // parsed string) so React passes the var literal through unchanged.
    const headingFontMerge = (el.type === 'heading' && !el.s?._fontExplicit) ? {
      fontFamily: 'var(--page-font-heading, "Sora", sans-serif)',
    } : {};
    return <div className="cel-editable" data-type={el.type}
      dangerouslySetInnerHTML={{ __html: el.txt || '' }}
      style={{ ...parsedInnerStyle, ...headingFontMerge }} />;
  };

  // ── Element outer styles ──
  const getOuterStyle = (el) => {
    // 26 May 2026: added `transform` and `backdropFilter` to support
    // the Button/Banner style presets (3D Press uses translateY for
    // the lifted look; Glass uses backdrop-filter for frosted feel).
    // Without these, the canvas would show flat presets while export
    // shipped the full effect — preview mismatch.
    const layoutStyles = ['background', 'borderRadius', 'border', 'padding', 'boxShadow', 'borderLeft', 'borderTop', 'borderRight', 'borderBottom', 'opacity', 'transform', 'backdropFilter'];
    const isEditing = editingId === el.id;
    const cursor = isEditing ? 'text' : el.locked ? 'not-allowed' : 'grab';
    // Resolve per-device position via effectiveBox cascade
    const box = effectiveBox(el, deviceView);
    // Divider exception (22 May 2026): the universal 20px minHeight
    // floor was preventing 1px hairline dividers — slider could be
    // set to 1 but the wrapper enforced 20px, so the solid-bar render
    // (which fills the wrapper background) always showed as a 20px
    // fat slab. Dividers now allow a 1px floor to actually deliver
    // the thickness slider's promise. Every other element keeps 20px
    // so resize handles remain practical to grab.
    const wrapperMinH = el.type === 'divider' ? 1 : 20;
    const style = {
      position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h,
      cursor, userSelect: isEditing ? 'auto' : 'none', minWidth: 40, minHeight: wrapperMinH,
    };
    layoutStyles.forEach(k => { if (el.s?.[k]) style[k] = el.s[k]; });
    if (box.hidden) style.opacity = 0.25;
    return style;
  };

  // Edit label per type
  const editLabel = (type) => {
    const labels = { form: '✎ FORM', video: '✎ VIDEO', image: '✎ IMAGE', button: '✎ LINK', announcement: '✎ BANNER', countdown: '✎ SET', progress: '✎ SET', socialicons: '✎ LINKS', audio: '✎ AUDIO', embed: '✎ CODE' };
    return labels[type] || '✎ EDIT';
  };

  return (
    <div ref={canvasAreaRef} className="sp-canvas-area" style={{
      flex: 1,
      minWidth: 0, // critical — allow flex parent to shrink below children's intrinsic size so overflow:auto can take effect
      // 20 May 2026 v2: Steve flag — more breathing room around canvas.
      // Padding bumped 28 → 40. Background stays light grey so the
      // canvas area reads as the document workspace against the cobalt
      // brand chrome on either side. Subtle radial gradient retained.
      background: '#f1f5f9',
      backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(14,165,233,0.04), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(236,72,153,0.03), transparent 50%)',
      overflow: 'auto',
      padding: 40,
      // No justify-content / align-items here: those collapse overflow scroll
      // when the centred child is wider than the container. We use the inner
      // "scroll content" wrapper below to centre via auto-margin instead, so
      // the canvas is centred when there's room but accessible via horizontal
      // scroll when the viewport is too narrow to fit the full 1100px width.
    }}>
      <div style={{
        // ── Scale-to-fit wrapper ──
        // We apply transform: scale on this wrapper so the canvas
        // visually shrinks when the area is too narrow. transform-origin
        // 'top center' keeps the canvas centred + anchored at the top
        // as it scales. We also explicitly set width/height to the
        // SCALED dimensions so the parent's layout computation gets
        // the visual footprint right — without this the scaled canvas
        // would still reserve its full unscaled footprint and create
        // ghost scroll space.
        width: canvasW * canvasScale,
        height: canvasHeight * canvasScale,
        margin: '0 auto',
        position: 'relative',
      }}>
      <div style={{
        // Inner box that actually gets the scale transform. Set to the
        // unscaled dimensions; the transform handles the visual shrink.
        // transform-origin 'top left' so x/y of nested elements still
        // align with the parent's coordinate space at any scale.
        //
        // In scaled mode (tablet preview, no per-element overrides),
        // we compose an EXTRA scale of canvasW/CANVAS_WIDTH into the
        // transform. The .sp-canvas surface is sized at CANVAS_WIDTH
        // (so elements lay out at their desktop x/y/w/h), but visually
        // it shrinks to canvasW. Mirrors the export's
        // `scale: calc(100vw / 1100)` rule at the 769-1023px @media.
        width: renderMode === 'scaled' ? CANVAS_WIDTH : canvasW,
        height: renderMode === 'scaled' ? canvasHeight / (canvasW / CANVAS_WIDTH) : canvasHeight,
        transform: renderMode === 'scaled'
          ? `scale(${canvasScale * (canvasW / CANVAS_WIDTH)})`
          : `scale(${canvasScale})`,
        transformOrigin: 'top left',
      }}>
      {/* WYSIWYG responsive preview CSS (25 May 2026).
          Injected scoped to .sp-canvas so it doesn't leak elsewhere.
          Rules MIRROR the export's responsive @media block from
          exportHTML.js — keeping editor canvas and live page in
          lockstep. Two modes:

          .sp-canvas[data-render-mode="stack"]:
              Mobile fallback (no per-element overrides). Stack vertically,
              full-width with per-type max-widths, font-clamp scaling.
              Each rule below maps 1:1 to the corresponding rule in
              exportHTML's @media(max-width:768px) block.

          .sp-canvas[data-render-mode="scaled"]:
              Tablet fallback (no per-element overrides). Wraps all the
              absolute-positioned elements in a CSS scale transform via
              the .sp-canvas-scaled-inner child div. Mirrors the export's
              `scale: calc(100vw / 1100)` rule at 769-1023px. */}
      <style>{`
        .sp-canvas[data-render-mode="stack"] {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          padding: 20px 16px !important;
          gap: 12px;
        }
        .sp-canvas[data-render-mode="stack"] .cel {
          position: relative !important;
          left: auto !important;
          top: auto !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 40px !important;
          margin: 0 !important;
        }
        /* Type-specific max-widths mirror the export's fallback rules. */
        .sp-canvas[data-render-mode="stack"] .cel[id] .sp-heading,
        .sp-canvas[data-render-mode="stack"] .cel .sp-heading * {
          font-size: clamp(22px, 5vw, 36px) !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel .sp-text,
        .sp-canvas[data-render-mode="stack"] .cel .sp-text * {
          font-size: 14px !important;
        }
        /* Button + Banner: full width capped at 400px, fixed 50px tall */
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-button),
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-announcement) {
          max-width: 400px !important;
          height: 50px !important;
          min-height: 50px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-form) {
          max-width: 450px !important;
          min-height: 200px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-video),
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-video iframe),
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-video video) {
          min-height: 200px !important;
          aspect-ratio: 16/9 !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-image) {
          width: auto !important;
          max-width: 100% !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-image) img {
          width: 100% !important;
          height: auto !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-stat) {
          max-width: 45% !important;
          display: inline-flex !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-countdown) {
          max-width: 400px !important;
          min-height: 70px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-review),
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-testimonial) {
          min-height: 80px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-icontext) {
          min-height: 60px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-divider) {
          max-width: 90% !important;
          height: 2px !important;
          min-height: 2px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-spacer) {
          height: 20px !important;
          min-height: 20px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-box) {
          min-height: 100px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-label),
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-badge) {
          max-width: 280px !important;
          min-height: 28px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-socialicons) {
          min-height: 30px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-progress) {
          max-width: 400px !important;
          min-height: 40px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-embed) {
          min-height: 150px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-audio) {
          min-height: 50px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-logostrip) {
          min-height: 30px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-separator) {
          max-width: 90% !important;
          min-height: 20px !important;
        }
        .sp-canvas[data-render-mode="stack"] .cel:has(.sp-faq) {
          min-height: 80px !important;
        }
        /* In stack mode: hide alignment guides, grid overlay, marquee,
           cursor-grab on elements. These are absolute-positioning aids
           that don't apply in flow layout. */
        .sp-canvas[data-render-mode="stack"] .cel {
          cursor: default !important;
        }
        /* Scaled mode: tablet preview with no per-element overrides.
           Elements rendered inside .sp-canvas-scaled-inner with a CSS
           scale transform of canvasW/CANVAS_WIDTH. transform-origin
           top-left so x=0,y=0 maps to the canvas's top-left corner.
           Mirrors the export scale rule at the 769-1023px @media query. */
        .sp-canvas-scaled-inner {
          transform-origin: top left;
          position: relative;
        }

        /* 25 May 2026: Heading typography inheritance fix.
           Tiptap's FontFamily extension may bake <span style='font-family: X'>
           into the heading's saved HTML (el.txt) during inline editing. When
           that inline span exists, it overrides the wrapper's
           font-family: var(--page-font-heading) declaration, blocking
           page-level Heading Font changes from propagating.

           Fix: force all descendants of a heading element's .cel-editable
           wrapper to inherit font-family from their parent. The wrapper
           uses var(--page-font-heading) so the inherited value tracks the
           page-level setting live. Members who explicitly chose a per-element
           font via the Inspector still win because that pick sets the WRAPPER's
           font-family directly (the textStyles loop in renderInner serialises
           el.s.fontFamily), and the descendants then inherit THAT value.

           Scoped via the renderInner-set wrapper having type 'heading' is
           tricky in pure CSS. Workaround: use the .cel parent's id selector
           through a data-attribute is unwieldy. Simplest and correct: any
           .cel-editable whose .cel parent has [data-el-type='heading'] (set
           by renderInner) — but renderInner sets it on the inner div, not on
           the .cel outer. The cleanest scope is by type via React: we add a
           data attribute on the wrapper itself when rendering headings, then
           target that. The CSS is targeted enough not to leak. */
        .sp-canvas .cel-editable[data-type="heading"] * {
          font-family: inherit !important;
        }
      `}</style>
      <div
        ref={canvasRef}
        className="sp-canvas"
        data-render-mode={renderMode}
        onMouseDown={handleCanvasClick}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          // In scaled mode, the canvas surface uses the full desktop width
          // CANVAS_WIDTH (1100px). The outer scale wrapper above shrinks
          // it visually to canvasW (768 for tablet) via an extra CSS scale.
          // Elements stay at their desktop x/y/w/h positions and render
          // proportionally — mirrors the export's scale-down rule.
          width: renderMode === 'scaled' ? CANVAS_WIDTH : canvasW,
          minHeight: renderMode === 'scaled' ? canvasHeight / (canvasW / CANVAS_WIDTH) : canvasHeight,
          position: 'relative',
          flexShrink: 0,
          transition: 'width 0.3s ease',
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 8px 32px rgba(15,23,42,0.06), 0 20px 60px rgba(15,23,42,0.04)',
          border: '1px solid #e2e8f0',
          // 22 May 2026: typography default. Picks up the CSS variables
          // set on .labs-chrome (see SuperPagesEditor.jsx typography
          // useEffect). Any element with explicit el.s.fontFamily wins;
          // only elements that inherit (Heading and Text without explicit
          // fontFamily) get the page-level font.
          fontFamily: 'var(--page-font-body, "DM Sans", sans-serif)',
          fontSize: 'var(--page-font-base-size, 16px)',
          ...bgStyle,
        }}
      >
        {/* Grid overlay — visible when showGrid is on. 8px grid via
            crisp background gradient pattern. pointerEvents:none so
            it doesn't intercept clicks. */}
        {showGrid && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage:
              'linear-gradient(to right, rgba(14,165,233,0.08) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(14,165,233,0.08) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
            pointerEvents: 'none',
            zIndex: 0,
            borderRadius: 10,
          }}/>
        )}

        {/* Alignment guides */}
        {['vCentre', 'vLeft', 'vRight'].map(name => (
          <div key={name} ref={el => guideRefs.current[name] = el}
            style={{ display: 'none', position: 'absolute', top: 0, width: 1, height: '100%', background: 'rgba(14,165,233,0.4)', zIndex: 100, pointerEvents: 'none' }} />
        ))}
        {['hTop', 'hMid', 'hBot'].map(name => (
          <div key={name} ref={el => guideRefs.current[name] = el}
            style={{ display: 'none', position: 'absolute', left: 0, height: 1, width: '100%', background: 'rgba(14,165,233,0.4)', zIndex: 100, pointerEvents: 'none' }} />
        ))}

        {/* Marquee selection rectangle */}
        {marquee && (
          <div style={{
            position: 'absolute',
            left: marquee.x1,
            top: marquee.y1,
            width: marquee.x2 - marquee.x1,
            height: marquee.y2 - marquee.y1,
            background: 'rgba(14,165,233,0.08)',
            border: '1px dashed rgba(14,165,233,0.6)',
            borderRadius: 2,
            zIndex: 50,
            pointerEvents: 'none',
          }}/>
        )}

        {/* Empty state */}
        {els.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 600 }}>
            <div style={{ fontSize: 40, marginBottom: 12, color: '#7a8899' }}>✦</div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>{t('superPagesEditor.startBuilding')}</h3>
            <p style={{ fontSize: 14, color: '#475569', maxWidth: 360, textAlign: 'center', lineHeight: 1.55, fontWeight: 500, marginBottom: 20 }}>{t('superPagesEditor.startBuildingDesc')}</p>
            {onShowTemplates && (
              <button onClick={onShowTemplates} style={{
                padding: '12px 22px',
                borderRadius: 10,
                background: '#0a1438',
                color: '#fff',
                border: 'none',
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(10,20,56,0.18)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                letterSpacing: '0.005em',
              }}>
                ✦ Browse templates
              </button>
            )}
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, fontWeight: 600 }}>
              or click any block from the right panel to build from scratch
            </p>
          </div>
        )}

        {/* Elements */}
        {els.map(el => {
          const isPrimary = el.id === selId;
          const isMulti = selIds && selIds.has(el.id) && !isPrimary;
          return (
          <div
            key={el.id}
            id={el.id}
            className={`cel${isPrimary ? ' selected' : ''}${isMulti ? ' multi-selected' : ''}${el.id === editingId ? ' editing' : ''}`}
            style={getOuterStyle(el)}
            onMouseDown={e => { if (editingId === el.id) return; startDrag(e, el.id); }}
            onContextMenu={(e) => {
              // Right-click: select the element and open context menu at cursor.
              // Native menu suppressed only when we actually open ours.
              e.preventDefault();
              e.stopPropagation();
              selectElement(el.id);
              setContextMenu({ x: e.clientX, y: e.clientY, elId: el.id });
            }}
            onClick={e => {
              // Single-click-to-edit for Tiptap-managed types. A click only
              // fires after a complete mousedown+mouseup without an intervening
              // drag, so repositioning still works via mousedown-drag-release.
              if (TIPTAP_TYPES.includes(el.type) && editingId !== el.id) {
                e.stopPropagation();
                selectElement(el.id);
                setEditingId(el.id);
              }
            }}
            onDoubleClick={() => { if (EDITABLE_TYPES.includes(el.type) && !TIPTAP_TYPES.includes(el.type)) { selectElement(el.id); startInlineEdit(el.id); } }}
          >
            {/* Inner content */}
            <div style={{ pointerEvents: editingId === el.id ? 'auto' : 'none', width: '100%', height: '100%' }}>{renderInner(el)}</div>

            {/* Toolbar */}
            <div className="cel-bar"
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)',
                display: el.id === selId ? 'flex' : 'none',
                alignItems: 'center', gap: 2, padding: '3px 4px',
                background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                zIndex: 20, whiteSpace: 'nowrap',
              }}>
              {/* Device-override badge: visible only when this element has
                  a tablet/mobile override at the current device view. Click
                  to reset (strips just the current device's override). */}
              {deviceView !== 'desktop' && hasOverride(el, deviceView) && (
                <>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      // Strip this device's override: pass undefined to clear
                      updateElement(el.id, { [deviceView]: undefined });
                      markDirty();
                    }}
                    style={{
                      padding: '2px 8px',
                      background: deviceView === 'tablet' ? 'rgba(168,85,247,0.12)' : 'rgba(236,72,153,0.12)',
                      border: 'none', borderRadius: 5, cursor: 'pointer',
                      fontSize: 10, fontWeight: 900,
                      color: deviceView === 'tablet' ? '#0ea5e9' : '#0a1438',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}
                    title={`This element has a ${deviceView} override. Click to reset to ${deviceView === 'mobile' ? 'tablet/desktop' : 'desktop'}.`}>
                    {deviceView === 'tablet' ? '⟲ Tablet' : '⟲ Mobile'}
                  </button>
                  <div style={{ width: 1, height: 14, background: 'var(--sap-border-strong)' }} />
                </>
              )}
              {!['spacer', 'divider', 'box'].includes(el.type) && !TIPTAP_TYPES.includes(el.type) && !INSPECTOR_TYPES.includes(el.type) && (
                <>
                  <button onClick={e => { e.stopPropagation(); if (EDITABLE_TYPES.includes(el.type)) { startInlineEdit(el.id); } else { onEditElement(el.id); } }}
                    style={{ padding: '2px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: EDITABLE_TYPES.includes(el.type) ? 'var(--sap-indigo)' : 'var(--sap-accent)' }}>
                    {EDITABLE_TYPES.includes(el.type) ? '✎ EDIT' : editLabel(el.type)}
                  </button>
                  <div style={{ width: 1, height: 14, background: 'var(--sap-border-strong)' }} />
                </>
              )}
              <button onClick={e => { e.stopPropagation(); if (window._spDuplicateElement) window._spDuplicateElement(el.id); }}
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }} title={t('superPagesEditor.duplicate')}>⧉</button>
              <div style={{ width: 1, height: 14, background: 'var(--sap-border-strong)' }} />
              <button onClick={e => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); markDirty(); }}
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: el.locked ? '#0ea5e9' : '#64748b' }}
                title={el.locked ? 'Unlock element' : 'Lock element'}>{el.locked ? '🔒' : '🔓'}</button>
              <div style={{ width: 1, height: 14, background: 'var(--sap-border-strong)' }} />
              <button onClick={e => { e.stopPropagation(); if (window._spDeleteElement) window._spDeleteElement(el.id); }}
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--sap-red)' }} title={t('superPagesEditor.deleteElement')}>✕</button>
            </div>

            {/* Resize handles — all 8 directions. Hidden when locked. */}
            {el.id === selId && !el.locked && [
              { pos: 'tl', style: { top: -4, left: -4, width: 10, height: 10, cursor: 'nwse-resize', borderRadius: 3 } },
              { pos: 't',  style: { top: -3, left: '50%', width: 24, height: 6, transform: 'translateX(-50%)', cursor: 'ns-resize', borderRadius: 3 } },
              { pos: 'tr', style: { top: -4, right: -4, width: 10, height: 10, cursor: 'nesw-resize', borderRadius: 3 } },
              { pos: 'l',  style: { top: '50%', left: -3, width: 6, height: 24, transform: 'translateY(-50%)', cursor: 'ew-resize', borderRadius: 3 } },
              { pos: 'r',  style: { top: '50%', right: -3, width: 6, height: 24, transform: 'translateY(-50%)', cursor: 'ew-resize', borderRadius: 3 } },
              { pos: 'bl', style: { bottom: -4, left: -4, width: 10, height: 10, cursor: 'nesw-resize', borderRadius: 3 } },
              { pos: 'b',  style: { bottom: -3, left: '50%', width: 24, height: 6, transform: 'translateX(-50%)', cursor: 'ns-resize', borderRadius: 3 } },
              { pos: 'br', style: { bottom: -4, right: -4, width: 10, height: 10, cursor: 'nwse-resize', borderRadius: 3 } },
            ].map(({ pos, style }) => (
              <div key={pos} className="cel-resize"
                onMouseDown={e => startResize(e, el.id, pos)}
                style={{ position: 'absolute', background: 'var(--sap-accent)', zIndex: 15, ...style }} />
            ))}
          </div>
        );})}

        {/* Quick properties panel — appears below the selected element,
            inside the canvas content div so it's positioned in canvas
            coordinates (matches element x/y). Only single-selection;
            multi-select uses the floating align toolbar above the canvas
            for batch ops. */}
        {selId && !editingId && (() => {
          const el = els.find(x => x.id === selId);
          if (!el || el.locked) return null;
          // Don't show when multi-selecting; that gets the align toolbar.
          if (selIds && selIds.size > 1) return null;
          return (
            <QuickProps
              el={el}
              updateElement={updateElement}
              updateElementStyle={updateElementStyle}
              markDirty={markDirty}
              canvasHeight={canvasHeight}
            />
          );
        })()}
      </div>
      </div>
      </div>

      {/* Context menu — right-click on any element */}
      {contextMenu && (() => {
        const el = els.find(x => x.id === contextMenu.elId);
        if (!el) return null;
        const items = [
          { label: '✎ Edit', action: () => { if (EDITABLE_TYPES.includes(el.type)) startInlineEdit(el.id); else onEditElement(el.id); }, hidden: ['spacer','divider','box'].includes(el.type) || INSPECTOR_TYPES.includes(el.type) },
          { divider: true },
          { label: '⧉ Duplicate', shortcut: '⌘D', action: () => { if (duplicateElement) duplicateElement(el.id); } },
          { label: '📋 Copy', shortcut: '⌘C', action: () => { if (copySelected) copySelected(); } },
          { label: '📥 Paste', shortcut: '⌘V', action: () => { if (paste) paste(); } },
          { divider: true },
          { label: el.locked ? '🔓 Unlock' : '🔒 Lock', action: () => { updateElement(el.id, { locked: !el.locked }); markDirty(); } },
          { label: el.hidden ? '👁 Show' : '🙈 Hide', action: () => { updateElement(el.id, { hidden: !el.hidden }); markDirty(); } },
          { divider: true },
          { label: '⬆ Bring forward', action: () => { if (moveElementZ) moveElementZ(el.id, 1); } },
          { label: '⬇ Send back', action: () => { if (moveElementZ) moveElementZ(el.id, -1); } },
          { divider: true },
          { label: '🗑 Delete', shortcut: 'Del', danger: true, action: () => { if (deleteElement) deleteElement(el.id); } },
        ].filter(it => !it.hidden);

        // Position menu, clamping to viewport so it never overflows
        const MENU_W = 220;
        const MENU_H = Math.min(items.length * 32 + 24, 420);
        const vw = window.innerWidth, vh = window.innerHeight;
        const x = Math.min(contextMenu.x, vw - MENU_W - 8);
        const y = Math.min(contextMenu.y, vh - MENU_H - 8);

        return (
          <div className="sp-context-menu" style={{
            position: 'fixed', top: y, left: x, width: MENU_W,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            border: '1px solid rgba(14,165,233,0.2)',
            borderRadius: 10,
            boxShadow: '0 14px 40px rgba(15,23,42,0.2), 0 4px 12px rgba(14,165,233,0.1)',
            padding: '6px 0',
            zIndex: 1000,
            fontFamily: 'Manrope, sans-serif',
          }}>
            {items.map((it, i) => {
              if (it.divider) {
                return <div key={i} style={{ height: 1, background: 'rgba(15,23,42,0.08)', margin: '4px 0' }}/>;
              }
              return (
                <div key={i}
                  onMouseDown={(e) => { e.preventDefault(); }}
                  onClick={() => { it.action(); setContextMenu(null); }}
                  style={{
                    padding: '7px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    color: it.danger ? '#dc2626' : '#0f172a',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = it.danger ? 'rgba(220,38,38,0.08)' : 'rgba(14,165,233,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{it.label}</span>
                  {it.shortcut && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }}>{it.shortcut}</span>}
                </div>
              );
            })}
          </div>
        );
      })()}

      <style>{`
        .cel:hover { outline: 1px dashed rgba(14,165,233,0.35); outline-offset: 3px; }
        .cel.selected { outline: 2px solid #0ea5e9; outline-offset: 4px; }
        .cel.multi-selected { outline: 2px dashed #0ea5e9; outline-offset: 4px; }
        .cel.editing { outline: 2px solid #6366f1; outline-offset: 4px; cursor: text !important; }
        .cel.editing * { cursor: text !important; user-select: auto !important; }
        .cel > *:not(.cel-bar):not(.cel-resize) { pointer-events: none; }
        .cel.editing > * { pointer-events: auto !important; }
        .cel .cel-bar, .cel .cel-bar * { pointer-events: auto !important; cursor: pointer !important; }
        .cel .cel-resize { pointer-events: auto !important; }
        .cel-editable:focus { outline: none; }
        .cel-editable::selection { background: rgba(14,165,233,0.2); }

        /* Override the global 'button hover lifts 1 px' rule for the element
           toolbar and resize handles. On these small, absolutely-positioned
           buttons the 1 px lift moves the button off the cursor, which cancels
           :hover, which drops it back, which re-triggers :hover — an infinite
           flicker. Inline background/color hover effects are added via
           onMouseEnter instead where we still want feedback. */
        .cel-bar,
        .cel-bar *,
        .cel-bar button,
        .cel-bar button:hover,
        .cel-bar button:active,
        .cel-bar button:focus,
        .cel-resize,
        .cel-resize:hover,
        .cel-resize:active {
          transform: none !important;
          filter: none !important;
          transition: background-color 0.08s !important;
        }
        /* Subtle hover tint on toolbar buttons so there's still visible feedback */
        .cel-bar button:hover { background: rgba(14,165,233,0.08) !important; border-radius: 4px !important; }

        /* Neutralise globals.css 'main div[style*=background:#fff]:hover' card
           lift — it targets the canvas surface itself, making the canvas try
           to lift and shadow-grow whenever the mouse enters it, which both
           looks wrong and fights with element drag/select. */
        .sp-canvas-area .sp-canvas:hover,
        .sp-canvas-area .cel:hover,
        .sp-canvas-area .cel > *:hover {
          transform: none !important;
          box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 8px 32px rgba(15,23,42,0.06), 0 20px 60px rgba(15,23,42,0.04) !important;
        }

        /* Protect the glassy palette tiles from the global cursor:pointer
           brightness filter. The glass effect already lifts + colour-shadows
           on hover; a brightness filter on top washes the icon colours out. */
        .pal-item,
        .pal-item:hover { filter: none !important; }
      `}</style>

      {/* Inline Formatting Toolbar — for non-Tiptap types only. Tiptap
          elements (heading, text, label) get their own bubble menu from
          the TiptapText component. Showing both caused the old toolbar
          to appear stranded at the top-left because toolbarPos isn't
          updated for Tiptap-managed edits.

          Also guards against stale editingId referencing a deleted
          element: if editingId is set but the element no longer exists
          in els (e.g. user deleted it), the toolbar would otherwise
          render at toolbarPos {0,0} with no way to dismiss. We require
          the element to actually exist before showing. */}
      <InlineToolbar
        visible={(() => {
          if (!editingId) return false;
          const editingEl = els.find(e => e.id === editingId);
          if (!editingEl) return false;  // stale id, element was deleted
          return !TIPTAP_TYPES.includes(editingEl.type);
        })()}
        position={toolbarPos}
        onCommand={() => {
          // Sync content back to state on every formatting change
          if (editableRef.current && editingId) {
            updateElement(editingId, { txt: editableRef.current.innerHTML });
            markDirty();
          }
        }}
      />
    </div>
  );
}
