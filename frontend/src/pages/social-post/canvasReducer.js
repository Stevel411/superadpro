// canvasReducer.js
// ============================================================================
// Pure state reducer for the Social Post canvas.
// Holds: layer list + history stack for undo/redo + selection state.
// Every mutation goes through dispatch — that's how undo/redo stays trivial.
//
// Phase 1: image layers only. Text layers come Phase 2, AI in Phase 3.
// ============================================================================

export const MAX_HISTORY = 30;

// Canvas aspect ratio dimensions in design-space pixels.
// Real export size is computed from these; the on-screen canvas scales.
export const ASPECTS = {
  '1:1':  { w: 1080, h: 1080, label: 'Square',   useCase: 'Instagram feed' },
  '4:5':  { w: 1080, h: 1350, label: 'Portrait', useCase: 'Instagram post (recommended)' },
  '9:16': { w: 1080, h: 1920, label: 'Story',    useCase: 'IG / TikTok story' },
  '16:9': { w: 1920, h: 1080, label: 'Wide',     useCase: 'LinkedIn banner, hero' },
};

// Phase 1 supports only 'image' type. Phase 2 adds 'text', Phase 4 adds 'object'.
export const LAYER_TYPES = ['image'];

let _idCounter = 0;
export function newLayerId() {
  // Combine timestamp + monotonic counter — unique even at rapid click-rate.
  _idCounter += 1;
  return 'L' + Date.now().toString(36) + _idCounter.toString(36);
}

// ── Initial state ──────────────────────────────────────────────────────────
export function makeInitialState(aspect) {
  var safeAspect = ASPECTS[aspect] ? aspect : '4:5';
  return {
    aspect: safeAspect,
    layers: [],
    selectedId: null,
    history: [],         // array of past `{aspect, layers}` snapshots
    future: [],          // array of redo-able snapshots
    dirty: false,        // unsaved changes flag
    designId: null,      // backend id once saved
    name: 'Untitled Design',
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function snapshot(state) {
  // Capture only the things that undo/redo should restore.
  return {
    aspect: state.aspect,
    layers: state.layers.map(function(l) { return Object.assign({}, l); }),
  };
}

function pushHistory(state) {
  var snap = snapshot(state);
  var nextHistory = state.history.concat([snap]);
  if (nextHistory.length > MAX_HISTORY) {
    nextHistory = nextHistory.slice(nextHistory.length - MAX_HISTORY);
  }
  return { history: nextHistory, future: [] };  // any new action clears redo stack
}

function clampLayerToCanvas(layer, aspect) {
  // Keep layers from being dragged completely off-canvas (lose them forever).
  // Allow partial overhang for creative crops; require >=20% on-canvas.
  var canvas = ASPECTS[aspect];
  var minX = -layer.w * 0.8;
  var maxX = canvas.w - layer.w * 0.2;
  var minY = -layer.h * 0.8;
  var maxY = canvas.h - layer.h * 0.2;
  return Object.assign({}, layer, {
    x: Math.max(minX, Math.min(maxX, layer.x)),
    y: Math.max(minY, Math.min(maxY, layer.y)),
  });
}

// ── Reducer ─────────────────────────────────────────────────────────────────
export function canvasReducer(state, action) {
  switch (action.type) {

    case 'LOAD_DESIGN': {
      // Replace entire state with what came back from the backend.
      var payload = action.payload;
      var loaded;
      try {
        loaded = typeof payload.canvas_json === 'string'
          ? JSON.parse(payload.canvas_json)
          : payload.canvas_json;
      } catch (e) {
        return state;
      }
      var safeAspect = ASPECTS[payload.aspect_ratio] ? payload.aspect_ratio : '4:5';
      var layers = (loaded && Array.isArray(loaded.layers)) ? loaded.layers : [];
      return {
        aspect: safeAspect,
        layers: layers,
        selectedId: null,
        history: [],
        future: [],
        dirty: false,
        designId: payload.id || null,
        name: payload.name || 'Untitled Design',
      };
    }

    case 'SET_ASPECT': {
      if (!ASPECTS[action.aspect]) return state;
      if (action.aspect === state.aspect) return state;
      var hist = pushHistory(state);
      return Object.assign({}, state, hist, {
        aspect: action.aspect,
        dirty: true,
      });
    }

    case 'ADD_LAYER': {
      // action.layer needs at minimum: type, x, y, w, h, plus type-specific props
      if (!LAYER_TYPES.includes(action.layer.type)) return state;
      var hist2 = pushHistory(state);
      var newLayer = Object.assign({
        id: newLayerId(),
        x: 0, y: 0, w: 400, h: 400,
        rotation: 0,
        zIndex: state.layers.length,
        locked: false,
      }, action.layer);
      return Object.assign({}, state, hist2, {
        layers: state.layers.concat([clampLayerToCanvas(newLayer, state.aspect)]),
        selectedId: newLayer.id,
        dirty: true,
      });
    }

    case 'UPDATE_LAYER': {
      // action.id, action.patch — partial update of layer props
      var hist3 = pushHistory(state);
      return Object.assign({}, state, hist3, {
        layers: state.layers.map(function(l) {
          if (l.id !== action.id) return l;
          if (l.locked && !action.force) return l;  // locked layers ignore mutations
          var merged = Object.assign({}, l, action.patch);
          return clampLayerToCanvas(merged, state.aspect);
        }),
        dirty: true,
      });
    }

    case 'DELETE_LAYER': {
      if (!state.layers.find(function(l) { return l.id === action.id; })) return state;
      var hist4 = pushHistory(state);
      return Object.assign({}, state, hist4, {
        layers: state.layers.filter(function(l) { return l.id !== action.id; }),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        dirty: true,
      });
    }

    case 'DUPLICATE_LAYER': {
      var src = state.layers.find(function(l) { return l.id === action.id; });
      if (!src) return state;
      var hist5 = pushHistory(state);
      var copy = Object.assign({}, src, {
        id: newLayerId(),
        x: src.x + 24,
        y: src.y + 24,
        zIndex: state.layers.length,
      });
      return Object.assign({}, state, hist5, {
        layers: state.layers.concat([clampLayerToCanvas(copy, state.aspect)]),
        selectedId: copy.id,
        dirty: true,
      });
    }

    case 'REORDER_LAYER': {
      // action.id, action.direction: 'forward' | 'backward' | 'front' | 'back'
      var idx = state.layers.findIndex(function(l) { return l.id === action.id; });
      if (idx === -1) return state;
      var hist6 = pushHistory(state);
      var next = state.layers.slice();
      var item = next.splice(idx, 1)[0];
      if (action.direction === 'front')    next.push(item);
      else if (action.direction === 'back') next.unshift(item);
      else if (action.direction === 'forward'  && idx < next.length) next.splice(idx + 1, 0, item);
      else if (action.direction === 'backward' && idx > 0)           next.splice(idx - 1, 0, item);
      else                                                            next.splice(idx, 0, item);
      // Re-stamp zIndex from order
      next = next.map(function(l, i) { return Object.assign({}, l, { zIndex: i }); });
      return Object.assign({}, state, hist6, { layers: next, dirty: true });
    }

    case 'TOGGLE_LOCK': {
      var hist7 = pushHistory(state);
      return Object.assign({}, state, hist7, {
        layers: state.layers.map(function(l) {
          return l.id === action.id ? Object.assign({}, l, { locked: !l.locked }) : l;
        }),
        dirty: true,
      });
    }

    case 'SELECT_LAYER': {
      // No history push — selection isn't undoable.
      return Object.assign({}, state, { selectedId: action.id || null });
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      var prevSnap = state.history[state.history.length - 1];
      var newHistory = state.history.slice(0, -1);
      var currentSnap = snapshot(state);
      return Object.assign({}, state, {
        aspect: prevSnap.aspect,
        layers: prevSnap.layers,
        history: newHistory,
        future: state.future.concat([currentSnap]),
        dirty: true,
        selectedId: prevSnap.layers.find(function(l) { return l.id === state.selectedId; })
          ? state.selectedId : null,
      });
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      var nextSnap = state.future[state.future.length - 1];
      var newFuture = state.future.slice(0, -1);
      var currentSnapR = snapshot(state);
      return Object.assign({}, state, {
        aspect: nextSnap.aspect,
        layers: nextSnap.layers,
        history: state.history.concat([currentSnapR]),
        future: newFuture,
        dirty: true,
        selectedId: nextSnap.layers.find(function(l) { return l.id === state.selectedId; })
          ? state.selectedId : null,
      });
    }

    case 'SET_NAME': {
      var nm = (action.name || '').trim().slice(0, 200) || 'Untitled Design';
      if (nm === state.name) return state;
      return Object.assign({}, state, { name: nm, dirty: true });
    }

    case 'MARK_SAVED': {
      return Object.assign({}, state, {
        dirty: false,
        designId: action.designId || state.designId,
      });
    }

    default:
      return state;
  }
}

// ── Serialisation for save ──────────────────────────────────────────────────
// Strip transient props (selectedId, history, future, dirty) — only persist
// what's needed to reconstruct the canvas later.
export function serialiseCanvas(state) {
  return JSON.stringify({
    version: 1,
    layers: state.layers,
  });
}
