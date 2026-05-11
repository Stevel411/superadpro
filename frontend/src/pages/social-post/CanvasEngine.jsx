// CanvasEngine.jsx
// ============================================================================
// The actual canvas: renders layers, handles drag + resize.
// Pure presentational — all state lives in the parent's reducer.
// ============================================================================
import { useRef, useEffect, useState } from 'react';
import { ASPECTS } from './canvasReducer';

// How big the on-screen canvas can be at most (px). Scales down from
// the aspect's design-space size to fit the viewport.
const MAX_CANVAS_PX = 700;

export default function CanvasEngine({ state, dispatch }) {
  var canvasRef = useRef(null);
  var [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  var [drag, setDrag] = useState(null);   // { layerId, mode, startX, startY, origX, origY, origW, origH }

  // Compute on-screen scale from design-space → screen-space
  var aspectDef = ASPECTS[state.aspect] || ASPECTS['4:5'];
  var aspectRatio = aspectDef.w / aspectDef.h;
  var displayW, displayH;
  if (aspectRatio >= 1) {
    displayW = Math.min(MAX_CANVAS_PX, aspectDef.w);
    displayH = displayW / aspectRatio;
  } else {
    displayH = Math.min(MAX_CANVAS_PX, aspectDef.h);
    displayW = displayH * aspectRatio;
  }
  var scale = displayW / aspectDef.w;   // px-per-design-unit

  // Pointer event handlers ──────────────────────────────────────────────
  function startDrag(e, layer, mode) {
    if (layer.locked && mode === 'move') return;
    e.stopPropagation();
    e.preventDefault();
    setDrag({
      layerId: layer.id,
      mode: mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
      origW: layer.w,
      origH: layer.h,
    });
    dispatch({ type: 'SELECT_LAYER', id: layer.id });
  }

  useEffect(function() {
    if (!drag) return;
    function onMove(e) {
      var dx = (e.clientX - drag.startX) / scale;
      var dy = (e.clientY - drag.startY) / scale;
      var patch;
      if (drag.mode === 'move') {
        patch = { x: drag.origX + dx, y: drag.origY + dy };
      } else if (drag.mode === 'se') {
        patch = { w: Math.max(40, drag.origW + dx), h: Math.max(40, drag.origH + dy) };
      } else if (drag.mode === 'sw') {
        patch = {
          x: drag.origX + dx, w: Math.max(40, drag.origW - dx),
          h: Math.max(40, drag.origH + dy),
        };
      } else if (drag.mode === 'ne') {
        patch = {
          y: drag.origY + dy, h: Math.max(40, drag.origH - dy),
          w: Math.max(40, drag.origW + dx),
        };
      } else if (drag.mode === 'nw') {
        patch = {
          x: drag.origX + dx, w: Math.max(40, drag.origW - dx),
          y: drag.origY + dy, h: Math.max(40, drag.origH - dy),
        };
      }
      if (patch) {
        dispatch({ type: 'UPDATE_LAYER', id: drag.layerId, patch: patch });
      }
    }
    function onUp() { setDrag(null); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return function() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, scale, dispatch]);

  // Keyboard nudge / delete ─────────────────────────────────────────────
  useEffect(function() {
    function onKey(e) {
      // Ignore if typing in an input
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (!state.selectedId) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'UNDO' });
        } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
          e.preventDefault();
          dispatch({ type: 'REDO' });
        }
        return;
      }

      var layer = state.layers.find(function(l) { return l.id === state.selectedId; });
      if (!layer) return;

      var step = e.shiftKey ? 20 : 2;
      var patch = null;
      if (e.key === 'ArrowLeft')  patch = { x: layer.x - step };
      if (e.key === 'ArrowRight') patch = { x: layer.x + step };
      if (e.key === 'ArrowUp')    patch = { y: layer.y - step };
      if (e.key === 'ArrowDown')  patch = { y: layer.y + step };
      if (patch) {
        e.preventDefault();
        dispatch({ type: 'UPDATE_LAYER', id: state.selectedId, patch: patch });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'DELETE_LAYER', id: state.selectedId });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        dispatch({ type: 'DUPLICATE_LAYER', id: state.selectedId });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [state.selectedId, state.layers, dispatch]);

  // Render ──────────────────────────────────────────────────────────────
  // Sort layers by zIndex so they paint back-to-front
  var sortedLayers = state.layers.slice().sort(function(a, b) {
    return (a.zIndex || 0) - (b.zIndex || 0);
  });

  function handleCanvasClick(e) {
    // Click on empty canvas (not on a layer) deselects
    if (e.target === canvasRef.current) {
      dispatch({ type: 'SELECT_LAYER', id: null });
    }
  }

  return (
    <div
      className="sps-canvas-frame"
      ref={canvasRef}
      onMouseDown={handleCanvasClick}
      style={{ width: displayW + 'px', height: displayH + 'px' }}
    >
      {sortedLayers.length === 0 && (
        <div className="sps-canvas-empty">
          <div className="sps-canvas-empty-icon">+</div>
          <div>Add an image from the left to get started</div>
        </div>
      )}

      {sortedLayers.map(function(layer) {
        var isSelected = layer.id === state.selectedId;
        var style = {
          left:  (layer.x * scale) + 'px',
          top:   (layer.y * scale) + 'px',
          width: (layer.w * scale) + 'px',
          height:(layer.h * scale) + 'px',
          transform: 'rotate(' + (layer.rotation || 0) + 'deg)',
          zIndex: layer.zIndex,
        };
        return (
          <div
            key={layer.id}
            className={'sps-layer' + (layer.locked ? ' is-locked' : '')}
            style={style}
            onMouseDown={function(e) { startDrag(e, layer, 'move'); }}
          >
            {layer.type === 'image' && layer.src && (
              <img
                src={layer.src}
                alt=""
                className="sps-layer-img"
                draggable={false}
              />
            )}

            {isSelected && (
              <>
                <div className="sps-layer-selection" />
                {!layer.locked && (
                  <>
                    <div className="sps-resize-handle sps-resize-nw"
                         onMouseDown={function(e) { startDrag(e, layer, 'nw'); }} />
                    <div className="sps-resize-handle sps-resize-ne"
                         onMouseDown={function(e) { startDrag(e, layer, 'ne'); }} />
                    <div className="sps-resize-handle sps-resize-sw"
                         onMouseDown={function(e) { startDrag(e, layer, 'sw'); }} />
                    <div className="sps-resize-handle sps-resize-se"
                         onMouseDown={function(e) { startDrag(e, layer, 'se'); }} />
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
