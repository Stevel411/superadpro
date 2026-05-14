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
      const centreX = CENTRE_TYPES.includes(type) ? (CANVAS_WIDTH - w) / 2 : (dropX !== undefined ? dropX : 20);
      const x = Math.max(0, Math.min(centreX, CANVAS_WIDTH - w));
      const maxY = prev.length > 0 ? Math.max(...prev.map(e => e.y + e.h)) : 0;
      const y = dropY !== undefined ? dropY : maxY + 20;

      newEl = {
        id: uid(), type,
        x, y, w: defaults.w, h: defaults.h,
        txt: defaults.txt, s: { ...defaults.s },
        ...(defaults._targetDate !== undefined ? { _targetDate: defaults._targetDate } : {}),
        ...(defaults._percent !== undefined ? { _percent: defaults._percent, _label: defaults._label, _color: defaults._color } : {}),
        ...(defaults._links ? { _links: { ...defaults._links } } : {}),
        ...(defaults._audioUrl !== undefined ? { _audioUrl: defaults._audioUrl } : {}),
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
  }, []);

  const deselectAll = useCallback(() => {
    setSelId(null);
  }, []);

  return {
    els, setEls,
    selId, setSelId, selectElement, deselectAll,
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
