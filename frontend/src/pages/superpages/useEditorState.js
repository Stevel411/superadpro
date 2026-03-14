import { useState, useRef, useCallback } from 'react';
import { ELEMENT_TYPES, CENTRE_TYPES, CANVAS_WIDTH, MAX_HISTORY } from './elementDefaults';

const uid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export default function useEditorState(initialEls = [], initialBg = '#ffffff', initialBgImage = '') {
  const [els, setEls] = useState(initialEls);
  const [selId, setSelId] = useState(null);
  const [canvasBg, setCanvasBg] = useState(initialBg);
  const [canvasBgImage, setCanvasBgImage] = useState(initialBgImage);
  const [dirty, setDirty] = useState(false);

  // Undo/redo
  const history = useRef([]);
  const historyIdx = useRef(-1);

  const saveHistory = useCallback(() => {
    const state = JSON.stringify({ els, canvasBg, canvasBgImage, selId });
    if (historyIdx.current < history.current.length - 1) {
      history.current.splice(historyIdx.current + 1);
    }
    history.current.push(state);
    if (history.current.length > MAX_HISTORY) history.current.shift();
    historyIdx.current = history.current.length - 1;
  }, [els, canvasBg, canvasBgImage, selId]);

  const markDirty = useCallback(() => {
    saveHistory();
    setDirty(true);
  }, [saveHistory]);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    try {
      const state = JSON.parse(history.current[historyIdx.current]);
      setEls(state.els);
      setCanvasBg(state.canvasBg);
      setCanvasBgImage(state.canvasBgImage || '');
      setSelId(state.selId);
      setDirty(true);
    } catch (e) { console.error('Undo error:', e); }
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    try {
      const state = JSON.parse(history.current[historyIdx.current]);
      setEls(state.els);
      setCanvasBg(state.canvasBg);
      setCanvasBgImage(state.canvasBgImage || '');
      setSelId(state.selId);
      setDirty(true);
    } catch (e) { console.error('Redo error:', e); }
  }, []);

  // ── Element CRUD ──
  const addElement = useCallback((type, dropX, dropY) => {
    const defaults = ELEMENT_TYPES[type] || ELEMENT_TYPES.text;
    const w = defaults.w;
    const centreX = CENTRE_TYPES.includes(type) ? (CANVAS_WIDTH - w) / 2 : dropX;
    const x = Math.max(0, Math.min(centreX, CANVAS_WIDTH - w));

    // Find the lowest y position for stacking
    const maxY = els.length > 0 ? Math.max(...els.map(e => e.y + e.h)) : 0;
    const y = dropY !== undefined ? dropY : maxY + 20;

    const newEl = {
      id: uid(), type,
      x, y, w: defaults.w, h: defaults.h,
      txt: defaults.txt, s: { ...defaults.s },
      // Copy special properties
      ...(defaults._targetDate !== undefined ? { _targetDate: defaults._targetDate } : {}),
      ...(defaults._percent !== undefined ? { _percent: defaults._percent, _label: defaults._label, _color: defaults._color } : {}),
      ...(defaults._links ? { _links: { ...defaults._links } } : {}),
      ...(defaults._audioUrl !== undefined ? { _audioUrl: defaults._audioUrl } : {}),
      ...(defaults._embedCode !== undefined ? { _embedCode: defaults._embedCode } : {}),
    };
    setEls(prev => [...prev, newEl]);
    setSelId(newEl.id);
    setDirty(true);
    saveHistory();
    return newEl;
  }, [els, saveHistory]);

  const deleteElement = useCallback((id) => {
    setEls(prev => prev.filter(e => e.id !== id));
    if (selId === id) setSelId(null);
    setDirty(true);
  }, [selId]);

  const duplicateElement = useCallback((id) => {
    setEls(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      const copy = JSON.parse(JSON.stringify(el));
      copy.id = uid();
      copy.x += 20;
      copy.y += 20;
      setSelId(copy.id);
      return [...prev, copy];
    });
    setDirty(true);
  }, []);

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
      return copy;
    });
    setDirty(true);
  }, []);

  const clearCanvas = useCallback(() => {
    saveHistory();
    setEls([]);
    setSelId(null);
    setDirty(true);
  }, [saveHistory]);

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
    addElement, deleteElement, duplicateElement,
    updateElement, updateElementStyle,
    moveElementZ, clearCanvas,
  };
}
