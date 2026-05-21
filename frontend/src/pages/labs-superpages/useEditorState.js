import { useState, useRef, useCallback, useEffect } from 'react';
import { ELEMENT_TYPES, CENTRE_TYPES, CANVAS_WIDTH, MAX_HISTORY } from './elementDefaults';

const uid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// Helper: serialise the editor state into a single string for the history stack.
// Kept inline-small so the JSON parse on undo/redo is fast even at MAX_HISTORY.
const serialize = (els, canvasBg, canvasBgImage, selId) =>
  JSON.stringify({ els, canvasBg, canvasBgImage, selId });

export default function useEditorState(initialEls = [], initialBg = '#ffffff', initialBgImage = '') {
  const [els, setEls] = useState(initialEls);
  const [selId, setSelId] = useState(null);
  const [selIds, setSelIds] = useState(new Set());
  const [canvasBg, setCanvasBg] = useState(initialBg);
  const [canvasBgImage, setCanvasBgImage] = useState(initialBgImage);
  const [dirty, setDirty] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // History — undo/redo
  // ─────────────────────────────────────────────────────────────
  //
  // Lessons from the previous version (rewritten 14 May 2026):
  //
  //   1. The old saveHistory used useCallback with [els, ...] as deps and
  //      read those via closure. Inside addElement we did setEls(...)
  //      then saveHistory() — but saveHistory had captured the PRE-update
  //      els, so the snapshot was wrong. Undo then went back to the wrong
  //      moment.
  //
  //   2. markDirty saved history on every change, including every keystroke
  //      during inline text editing. History filled with junk intermediate
  //      states; reaching real prior versions required many undos.
  //
  //   3. No initial snapshot, so the first undo did nothing.
  //
  //   4. undo/redo always called setDirty(true) even when returning to the
  //      saved version, so the "Saved 2s ago" badge stayed dirty incorrectly.
  //
  // This rewrite:
  //
  //   - Refs mirror current state so saveHistory always reads the latest.
  //   - History is captured INSIDE functional setEls callbacks, so the
  //     snapshot uses the post-mutation state (no stale closure).
  //   - debouncedHistory groups rapid changes (text typing, drag) into a
  //     single history entry every 600ms instead of one per keystroke.
  //   - Initial state is pushed as index 0 on first mount.
  //   - On any new action, redo stack is cleared (standard editor pattern).
  //   - Dirty bit cleared when undo/redo lands back on the saved snapshot.

  const history = useRef([]);          // stack of serialized states
  const historyIdx = useRef(-1);       // -1 = empty; 0 = first snapshot
  const savedIdx = useRef(-1);         // index of last persisted-to-server state
  const debounceTimer = useRef(null);  // for debouncedHistory

  // Initial snapshot — runs once on mount so the loaded page is undo-able.
  useEffect(() => {
    if (history.current.length === 0) {
      history.current.push(serialize(initialEls, initialBg, initialBgImage, null));
      historyIdx.current = 0;
      savedIdx.current = 0;
    }
    // initialEls/initialBg are deliberately not in deps — we only snapshot
    // the very first load, not every prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push the given state onto history immediately. Truncates any "future"
  // states first (redo stack invalidated by new action).
  const pushHistory = useCallback((nextEls, nextBg, nextBgImg, nextSelId) => {
    const snap = serialize(nextEls, nextBg, nextBgImg, nextSelId);
    // Don't push duplicate consecutive states.
    if (history.current[historyIdx.current] === snap) return;
    // Truncate the redo stack on new action.
    if (historyIdx.current < history.current.length - 1) {
      history.current.splice(historyIdx.current + 1);
      // If savedIdx pointed into the truncated tail, the saved snapshot
      // is no longer reachable — treat the page as dirty.
      if (savedIdx.current > historyIdx.current) savedIdx.current = -1;
    }
    history.current.push(snap);
    if (history.current.length > MAX_HISTORY) {
      history.current.shift();
      if (savedIdx.current > -1) savedIdx.current--;
    }
    historyIdx.current = history.current.length - 1;
  }, []);

  // Public API: snapshot the CURRENT state. Uses functional setter chains
  // to read live state without relying on stale closures.
  const saveHistory = useCallback(() => {
    setEls(currentEls => {
      setCanvasBg(currentBg => {
        setCanvasBgImage(currentBgImg => {
          setSelId(currentSelId => {
            pushHistory(currentEls, currentBg, currentBgImg, currentSelId);
            return currentSelId;
          });
          return currentBgImg;
        });
        return currentBg;
      });
      return currentEls;
    });
  }, [pushHistory]);

  // Debounced version — groups bursts of changes (typing, dragging) into one
  // history entry. Use this for keystroke-frequency updates.
  const debouncedHistory = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveHistory();
      debounceTimer.current = null;
    }, 600);
  }, [saveHistory]);

  // markDirty is the public hook everywhere else in the editor calls when
  // something user-meaningful changed. It uses debounced history to avoid
  // filling the stack with keystroke-grain noise.
  const markDirty = useCallback(() => {
    setDirty(true);
    debouncedHistory();
  }, [debouncedHistory]);

  // Cleanup the debounce timer on unmount.
  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Undo / Redo
  // ─────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    // If a debounce is pending, flush it first so the current edit is
    // captured as a history entry before stepping back.
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      saveHistory();
    }
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    try {
      const state = JSON.parse(history.current[historyIdx.current]);
      setEls(state.els);
      setCanvasBg(state.canvasBg);
      setCanvasBgImage(state.canvasBgImage || '');
      setSelId(state.selId);
      // Dirty bit reflects "are we at the saved snapshot or not?"
      setDirty(historyIdx.current !== savedIdx.current);
    } catch (e) { console.error('Undo error:', e); }
  }, [saveHistory]);

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    try {
      const state = JSON.parse(history.current[historyIdx.current]);
      setEls(state.els);
      setCanvasBg(state.canvasBg);
      setCanvasBgImage(state.canvasBgImage || '');
      setSelId(state.selId);
      setDirty(historyIdx.current !== savedIdx.current);
    } catch (e) { console.error('Redo error:', e); }
  }, []);

  // Called by SuperPagesEditor.save() once the server has confirmed.
  // After save, the current index is the "clean" version — undo back to
  // it should mark the page clean again.
  const markSaved = useCallback(() => {
    savedIdx.current = historyIdx.current;
    setDirty(false);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Element CRUD
  // ─────────────────────────────────────────────────────────────
  // All mutations use functional setters so they capture the latest state,
  // never a stale closure value. History is pushed inside the setter to
  // guarantee it sees the post-mutation state.

  const addElement = useCallback((type, dropX, dropY) => {
    const defaults = ELEMENT_TYPES[type] || ELEMENT_TYPES.text;
    const w = defaults.w;

    let newEl = null;
    setEls(prev => {
      // X positioning rules:
      //   - CENTRE_TYPES always centre regardless of drop point (heading,
      //     form, etc. — content the member expects to be horizontally
      //     centred on the page).
      //   - For other types: if the user explicitly dropped at a coordinate
      //     (drag-drop), honour that. If they just clicked the palette
      //     (dropX undefined), also centre — landing flush-left at x=20
      //     looks broken to most users.
      const centreX = (CANVAS_WIDTH - w) / 2;
      const wantsCentred = CENTRE_TYPES.includes(type) || dropX === undefined;
      const targetX = wantsCentred ? centreX : dropX;
      const x = Math.max(0, Math.min(targetX, CANVAS_WIDTH - w));
      const maxY = prev.length > 0 ? Math.max(...prev.map(e => e.y + e.h)) : 0;
      const y = dropY !== undefined ? dropY : maxY + 20;

      newEl = {
        id: uid(), type,
        x, y, w: defaults.w, h: defaults.h,
        txt: defaults.txt, s: { ...defaults.s },
        // Countdown: default _targetDate to 7 days from element creation
        // (audit C-C-7, 21 May 2026). Dropping a countdown with a blank
        // target shows broken-looking 00:00:00 placeholders and the
        // member has to guess what to put in. 7 days makes the element
        // look alive immediately; members can then pick the real target
        // via the Inspector. Computed at create-time, not module-load
        // time, so the value reflects "now" when the element is dropped.
        ...(type === 'countdown'
            ? { _targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
            : (defaults._targetDate !== undefined ? { _targetDate: defaults._targetDate } : {})),
        ...(defaults._percent !== undefined ? { _percent: defaults._percent, _label: defaults._label, _color: defaults._color } : {}),
        ...(defaults._statValue !== undefined ? { _statValue: defaults._statValue, _statLabel: defaults._statLabel, _statColor: defaults._statColor } : {}),
        ...(defaults._separatorSymbol !== undefined ? { _separatorSymbol: defaults._separatorSymbol, _separatorColor: defaults._separatorColor } : {}),
        ...(defaults._links ? { _links: { ...defaults._links } } : {}),
        ...(defaults._embedCode !== undefined ? { _embedCode: defaults._embedCode } : {}),
      };
      const next = [...prev, newEl];
      // Capture history synchronously with the post-mutation state.
      pushHistory(next, canvasBg, canvasBgImage, newEl.id);
      return next;
    });
    if (newEl) setSelId(newEl.id);
    setDirty(true);
    return newEl;
  }, [canvasBg, canvasBgImage, pushHistory]);

  const deleteElement = useCallback((id) => {
    setEls(prev => {
      const next = prev.filter(e => e.id !== id);
      pushHistory(next, canvasBg, canvasBgImage, null);
      return next;
    });
    setSelId(prev => prev === id ? null : prev);
    setDirty(true);
  }, [canvasBg, canvasBgImage, pushHistory]);

  const duplicateElement = useCallback((id) => {
    let copyId = null;
    setEls(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      const copy = JSON.parse(JSON.stringify(el));
      copy.id = uid();
      copy.x += 20;
      copy.y += 20;
      copyId = copy.id;
      const next = [...prev, copy];
      pushHistory(next, canvasBg, canvasBgImage, copyId);
      return next;
    });
    if (copyId) setSelId(copyId);
    setDirty(true);
  }, [canvasBg, canvasBgImage, pushHistory]);

  // updateElement is called constantly during drag/resize/inline edit.
  // History is NOT pushed here — callers use markDirty (debounced) for
  // user-visible groupings, or saveHistory() for a hard break.
  const updateElement = useCallback((id, updates) => {
    setEls(prev => prev.map(e => {
      if (e.id !== id) return e;
      return { ...e, ...updates };
    }));
    setDirty(true);
  }, []);

  const updateElementStyle = useCallback((id, styleUpdates) => {
    setEls(prev => prev.map(e => {
      if (e.id !== id) return e;
      return { ...e, s: { ...e.s, ...styleUpdates } };
    }));
    setDirty(true);
  }, []);

  const moveElementZ = useCallback((id, dir) => {
    setEls(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      pushHistory(copy, canvasBg, canvasBgImage, id);
      return copy;
    });
    setDirty(true);
  }, [canvasBg, canvasBgImage, pushHistory]);

  const clearCanvas = useCallback(() => {
    setEls(prev => {
      pushHistory([], canvasBg, canvasBgImage, null);
      return [];
    });
    setSelId(null);
    setDirty(true);
  }, [canvasBg, canvasBgImage, pushHistory]);

  const selectElement = useCallback((id) => {
    setSelId(id);
    setSelIds(id ? new Set([id]) : new Set());
  }, []);

  const deselectAll = useCallback(() => {
    setSelId(null);
    setSelIds(new Set());
  }, []);

  // Set the entire selection set at once. Used by marquee drag-select
  // in Canvas. The last id in the array becomes the primary (the one
  // whose properties show in the right panel).
  const selectMany = useCallback((ids) => {
    if (!ids || ids.length === 0) {
      setSelId(null);
      setSelIds(new Set());
      return;
    }
    setSelIds(new Set(ids));
    setSelId(ids[ids.length - 1]);
  }, []);

  // ── Multi-select ──
  //
  // selIds is the authoritative set of selected element IDs.
  // selId remains as the "primary" — the one whose properties show
  // in the right panel and the one a single-click sets. When a single
  // element is selected, selIds = {selId}.
  //
  // shift-click toggles inclusion. Click-without-shift collapses to
  // single-selection of that one element. Group ops (deleteSelected,
  // duplicateSelected) operate on the whole set.

  const toggleSelectAdditive = useCallback((id) => {
    // Shift-click handler: adds the id to the set if not present, or
    // removes it if it was already selected. Updates selId to track
    // the most-recently-touched element so the right panel shows
    // something coherent.
    setSelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Promote any remaining selected element as new primary
        const remaining = next.values().next().value;
        setSelId(remaining || null);
      } else {
        next.add(id);
        setSelId(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    // For Cmd/Ctrl+A within the editor — select every element.
    setEls(prev => {
      const allIds = new Set(prev.map(e => e.id));
      setSelIds(allIds);
      setSelId(prev.length > 0 ? prev[prev.length - 1].id : null);
      return prev;
    });
  }, []);

  // ── Group / ungroup ──
  //
  // Group: assigns a shared groupId to all currently-selected elements.
  // Clicking any group member then auto-selects the whole group (handled
  // in Canvas.startDrag). Multiple groups can coexist; an element can
  // belong to only one group at a time.
  //
  // Ungroup: clears the groupId from all selected elements.
  const groupSelected = useCallback(() => {
    const toGroup = selIds.size > 1 ? Array.from(selIds) : [];
    if (toGroup.length < 2) return;
    const gid = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setEls(prev => {
      const next = prev.map(e => toGroup.includes(e.id) ? { ...e, groupId: gid } : e);
      pushHistory(next, canvasBg, canvasBgImage, selId);
      return next;
    });
    setDirty(true);
  }, [selIds, selId, canvasBg, canvasBgImage, pushHistory]);

  const ungroupSelected = useCallback(() => {
    const toUngroup = selIds.size > 0 ? Array.from(selIds) : (selId ? [selId] : []);
    if (toUngroup.length === 0) return;
    setEls(prev => {
      // Strip groupId off every selected element AND any element that
      // shares a groupId with one of the selected (i.e. ungroup the
      // entire group, not just the picked members).
      const groupIdsToStrip = new Set();
      prev.forEach(e => { if (toUngroup.includes(e.id) && e.groupId) groupIdsToStrip.add(e.groupId); });
      if (groupIdsToStrip.size === 0) return prev;
      const next = prev.map(e => {
        if (groupIdsToStrip.has(e.groupId)) {
          const { groupId, ...rest } = e;
          return rest;
        }
        return e;
      });
      pushHistory(next, canvasBg, canvasBgImage, selId);
      return next;
    });
    setDirty(true);
  }, [selIds, selId, canvasBg, canvasBgImage, pushHistory]);

  // Expand a selection to include every element in the same group as
  // any currently-selected element. Used by Canvas.startDrag so clicking
  // any group member selects the whole group atomically.
  const expandToGroup = useCallback((id) => {
    setEls(prev => {
      const clicked = prev.find(e => e.id === id);
      if (!clicked || !clicked.groupId) return prev;
      const members = prev.filter(e => e.groupId === clicked.groupId).map(e => e.id);
      if (members.length > 0) {
        setSelIds(new Set(members));
        setSelId(id);
      }
      return prev;
    });
  }, []);

  // ── Distribute (smart spacing) ──
  //
  // When 3+ elements are selected, redistribute them so the gaps between
  // consecutive elements (along the chosen axis) are equal. The outermost
  // elements stay in place; the middle ones move to fill evenly.
  //
  // distributeHorizontal: spreads by x. Sort by x, fix leftmost and
  //   rightmost, distribute middles so gap between adjacent edges is uniform.
  // distributeVertical: same for y.

  const distributeHorizontal = useCallback(() => {
    const ids = selIds.size > 2 ? Array.from(selIds) : [];
    if (ids.length < 3) return;
    setEls(prev => {
      const picked = prev.filter(e => ids.includes(e.id));
      // Sort by current x so the outermost stay put visually
      picked.sort((a, b) => a.x - b.x);
      const first = picked[0], last = picked[picked.length - 1];
      const totalWidth = picked.reduce((s, e) => s + e.w, 0);
      const span = (last.x + last.w) - first.x;
      const totalGap = span - totalWidth;
      const gap = totalGap / (picked.length - 1);
      // Place each middle element after the previous one + gap
      let cursorX = first.x + first.w + gap;
      const updates = {};
      for (let i = 1; i < picked.length - 1; i++) {
        updates[picked[i].id] = Math.round(cursorX);
        cursorX += picked[i].w + gap;
      }
      const next = prev.map(e => updates[e.id] !== undefined ? { ...e, x: updates[e.id] } : e);
      pushHistory(next, canvasBg, canvasBgImage, selId);
      return next;
    });
    setDirty(true);
  }, [selIds, selId, canvasBg, canvasBgImage, pushHistory]);

  const distributeVertical = useCallback(() => {
    const ids = selIds.size > 2 ? Array.from(selIds) : [];
    if (ids.length < 3) return;
    setEls(prev => {
      const picked = prev.filter(e => ids.includes(e.id));
      picked.sort((a, b) => a.y - b.y);
      const first = picked[0], last = picked[picked.length - 1];
      const totalHeight = picked.reduce((s, e) => s + e.h, 0);
      const span = (last.y + last.h) - first.y;
      const totalGap = span - totalHeight;
      const gap = totalGap / (picked.length - 1);
      let cursorY = first.y + first.h + gap;
      const updates = {};
      for (let i = 1; i < picked.length - 1; i++) {
        updates[picked[i].id] = Math.round(cursorY);
        cursorY += picked[i].h + gap;
      }
      const next = prev.map(e => updates[e.id] !== undefined ? { ...e, y: updates[e.id] } : e);
      pushHistory(next, canvasBg, canvasBgImage, selId);
      return next;
    });
    setDirty(true);
  }, [selIds, selId, canvasBg, canvasBgImage, pushHistory]);

  // ── Align ──
  //
  // Aligns all selected elements along a given edge. The first selected
  // (lowest in selIds ordering) defines the anchor coordinate; others
  // move to match.
  const alignSelected = useCallback((edge) => {
    // edge: 'left' | 'right' | 'top' | 'bottom' | 'centreH' | 'centreV'
    const ids = selIds.size > 1 ? Array.from(selIds) : [];
    if (ids.length < 2) return;
    setEls(prev => {
      const picked = prev.filter(e => ids.includes(e.id));
      // Anchor: outermost edge depending on direction.
      let anchor;
      if (edge === 'left')    anchor = Math.min(...picked.map(e => e.x));
      if (edge === 'right')   anchor = Math.max(...picked.map(e => e.x + e.w));
      if (edge === 'top')     anchor = Math.min(...picked.map(e => e.y));
      if (edge === 'bottom')  anchor = Math.max(...picked.map(e => e.y + e.h));
      if (edge === 'centreH') {
        // Vertical centreline across selection — average of cx values
        const avg = picked.reduce((s, e) => s + (e.x + e.w / 2), 0) / picked.length;
        anchor = avg;
      }
      if (edge === 'centreV') {
        const avg = picked.reduce((s, e) => s + (e.y + e.h / 2), 0) / picked.length;
        anchor = avg;
      }
      const next = prev.map(e => {
        if (!ids.includes(e.id)) return e;
        if (edge === 'left')    return { ...e, x: Math.round(anchor) };
        if (edge === 'right')   return { ...e, x: Math.round(anchor - e.w) };
        if (edge === 'top')     return { ...e, y: Math.round(anchor) };
        if (edge === 'bottom')  return { ...e, y: Math.round(anchor - e.h) };
        if (edge === 'centreH') return { ...e, x: Math.round(anchor - e.w / 2) };
        if (edge === 'centreV') return { ...e, y: Math.round(anchor - e.h / 2) };
        return e;
      });
      pushHistory(next, canvasBg, canvasBgImage, selId);
      return next;
    });
    setDirty(true);
  }, [selIds, selId, canvasBg, canvasBgImage, pushHistory]);

  const deleteSelected = useCallback(() => {
    setSelIds(currentSelIds => {
      const toDelete = currentSelIds.size > 0 ? currentSelIds : (selId ? new Set([selId]) : new Set());
      if (toDelete.size === 0) return currentSelIds;
      setEls(prev => {
        const next = prev.filter(e => !toDelete.has(e.id));
        pushHistory(next, canvasBg, canvasBgImage, null);
        return next;
      });
      setSelId(null);
      setDirty(true);
      return new Set();
    });
  }, [selId, canvasBg, canvasBgImage, pushHistory]);

  const duplicateSelected = useCallback(() => {
    setSelIds(currentSelIds => {
      const toDup = currentSelIds.size > 0 ? currentSelIds : (selId ? new Set([selId]) : new Set());
      if (toDup.size === 0) return currentSelIds;
      const newIds = new Set();
      setEls(prev => {
        const copies = [];
        prev.forEach(el => {
          if (!toDup.has(el.id)) return;
          const c = JSON.parse(JSON.stringify(el));
          c.id = uid();
          c.x += 20;
          c.y += 20;
          copies.push(c);
          newIds.add(c.id);
        });
        const next = [...prev, ...copies];
        const newPrimary = copies.length > 0 ? copies[copies.length - 1].id : null;
        pushHistory(next, canvasBg, canvasBgImage, newPrimary);
        setSelId(newPrimary);
        return next;
      });
      setDirty(true);
      return newIds;
    });
  }, [selId, canvasBg, canvasBgImage, pushHistory]);

  // ── Clipboard (in-memory) ──
  //
  // Cmd+C / Cmd+V move element data through this ref. Storage is JSON-
  // serialized so the clipboard survives even if the original elements
  // are deleted before paste. Paste applies the standard +20/+20 offset
  // and fresh IDs.
  const clipboardRef = useRef([]);

  const copySelected = useCallback(() => {
    const toCopy = selIds.size > 0 ? selIds : (selId ? new Set([selId]) : new Set());
    if (toCopy.size === 0) return false;
    setEls(prev => {
      clipboardRef.current = prev
        .filter(e => toCopy.has(e.id))
        .map(e => JSON.parse(JSON.stringify(e)));
      return prev;
    });
    return true;
  }, [selIds, selId]);

  const paste = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.length === 0) return false;
    const newIds = new Set();
    const copies = clipboardRef.current.map(c => {
      const fresh = JSON.parse(JSON.stringify(c));
      fresh.id = uid();
      fresh.x += 20;
      fresh.y += 20;
      newIds.add(fresh.id);
      return fresh;
    });
    setEls(prev => {
      const next = [...prev, ...copies];
      const newPrimary = copies[copies.length - 1].id;
      pushHistory(next, canvasBg, canvasBgImage, newPrimary);
      setSelId(newPrimary);
      setSelIds(newIds);
      return next;
    });
    setDirty(true);
    return true;
  }, [canvasBg, canvasBgImage, pushHistory]);

  // ── Nudge (arrow-key fine positioning) ──
  //
  // Moves all selected elements by (dx, dy). Used by the keyboard
  // handler in SuperPagesEditor for arrow keys (1px) and shift+arrow
  // (10px). History is debounced via markDirty so a burst of nudges
  // collapses to one undo step.
  const nudgeSelected = useCallback((dx, dy) => {
    const toNudge = selIds.size > 0 ? selIds : (selId ? new Set([selId]) : new Set());
    if (toNudge.size === 0) return;
    setEls(prev => prev.map(e => {
      if (!toNudge.has(e.id)) return e;
      return { ...e, x: Math.max(0, e.x + dx), y: Math.max(0, e.y + dy) };
    }));
    setDirty(true);
  }, [selIds, selId]);

  return {
    els, setEls,
    selId, setSelId, selectElement, deselectAll,
    selIds, toggleSelectAdditive, selectAll, selectMany,
    groupSelected, ungroupSelected, expandToGroup,
    distributeHorizontal, distributeVertical, alignSelected,
    deleteSelected, duplicateSelected,
    copySelected, paste, nudgeSelected,
    canvasBg, setCanvasBg,
    canvasBgImage, setCanvasBgImage,
    dirty, setDirty,
    markDirty,
    undo, redo,
    markSaved,
    addElement, deleteElement, duplicateElement,
    updateElement, updateElementStyle,
    moveElementZ, clearCanvas,
  };
}
