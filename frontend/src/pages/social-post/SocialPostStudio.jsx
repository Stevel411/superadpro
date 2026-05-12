// SocialPostStudio.jsx
// ============================================================================
// Main page for the Social Post Studio editor.
// Routes:
//   /creative-studio/social-post           -> gallery (handled by SocialPostGallery)
//   /creative-studio/social-post/new       -> blank canvas
//   /creative-studio/social-post/:designId -> load specific design
// ============================================================================
import { useReducer, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CanvasEngine from './CanvasEngine';
import AIGeneratePanel from './AIGeneratePanel';
import {
  canvasReducer, makeInitialState, serialiseCanvas, ASPECTS, newLayerId,
  TEXT_STYLES,
} from './canvasReducer';
import './social-post.css';

export default function SocialPostStudio() {
  var { designId } = useParams();
  var navigate = useNavigate();
  var [state, dispatch] = useReducer(canvasReducer, '4:5', makeInitialState);
  var [loading, setLoading] = useState(false);
  var [saving, setSaving] = useState(false);
  var [showTextPicker, setShowTextPicker] = useState(false);
  var [showAIPanel, setShowAIPanel] = useState(false);
  var fileInputRef = useRef(null);

  // Load existing design if URL has an id ────────────────────────────────
  useEffect(function() {
    if (!designId || designId === 'new') return;
    var numericId = parseInt(designId, 10);
    if (isNaN(numericId)) return;

    setLoading(true);
    fetch('/api/social-post/design/' + numericId)
      .then(function(r) {
        if (!r.ok) throw new Error('Design not found');
        return r.json();
      })
      .then(function(data) {
        dispatch({ type: 'LOAD_DESIGN', payload: data });
      })
      .catch(function(err) {
        console.error('Load failed:', err);
        navigate('/creative-studio/social-post', { replace: true });
      })
      .finally(function() { setLoading(false); });
  }, [designId, navigate]);

  // Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    if (saving) return;
    setSaving(true);
    var body = {
      id: state.designId || undefined,
      name: state.name,
      aspect_ratio: state.aspect,
      canvas_json: serialiseCanvas(state),
    };
    fetch('/api/social-post/save-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Save failed'); });
        return r.json();
      })
      .then(function(data) {
        dispatch({ type: 'MARK_SAVED', designId: data.id });
        // If this was a new design, update the URL to the saved id
        if (!designId || designId === 'new') {
          navigate('/creative-studio/social-post/' + data.id, { replace: true });
        }
      })
      .catch(function(err) {
        alert('Save failed: ' + err.message);
      })
      .finally(function() { setSaving(false); });
  }

  // Image upload (Phase 1 — local file becomes a layer) ───────────────────
  function handleAddImage() {
    if (fileInputRef.current) fileInputRef.current.click();
  }

  function handleFileSelected(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    // Phase 1: use FileReader -> data URL so it works without R2 upload.
    // Phase 3 will upload to R2 and store the R2 url instead.
    var reader = new FileReader();
    reader.onload = function(evt) {
      var img = new Image();
      img.onload = function() {
        var canvas = ASPECTS[state.aspect];
        // Scale image to fit nicely inside canvas (max 80% of either dim)
        var maxW = canvas.w * 0.8;
        var maxH = canvas.h * 0.8;
        var w = img.width, h = img.height;
        if (w > maxW) { h = h * (maxW / w); w = maxW; }
        if (h > maxH) { w = w * (maxH / h); h = maxH; }
        dispatch({
          type: 'ADD_LAYER',
          layer: {
            type: 'image',
            src: evt.target.result,
            x: (canvas.w - w) / 2,
            y: (canvas.h - h) / 2,
            w: w, h: h,
          },
        });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';  // clear so same file can be re-selected
  }

  // Add text layer (Phase 2) ──────────────────────────────────────────────
  function handleAddText(textStyle) {
    var canvas = ASPECTS[state.aspect];
    // Size the text-layer bounding box generously. The SVG inside the
    // box auto-scales to fit. Width = 80% of canvas, height = 1.4x fontSize.
    var layerW = canvas.w * 0.85;
    var layerH = Math.max(120, textStyle.defaultSize * 1.5);
    dispatch({
      type: 'ADD_LAYER',
      layer: {
        type: 'text',
        styleKey: textStyle.key,
        content: textStyle.defaultText,
        fontSize: textStyle.defaultSize,
        x: (canvas.w - layerW) / 2,
        y: (canvas.h - layerH) / 2,
        w: layerW,
        h: layerH,
      },
    });
    setShowTextPicker(false);
  }

  // Phase 3: AI-generated image picked → add as canvas layer
  function handleAIPicked(imageUrl) {
    var canvas = ASPECTS[state.aspect];
    // Preload to get natural dimensions; scale to fit a generous canvas footprint
    var img = new Image();
    img.crossOrigin = 'anonymous';   // Grok Imagine URLs are public
    img.onload = function() {
      var aspect = img.naturalWidth / img.naturalHeight;
      // Default placement: 80% of canvas width, centered
      var layerW = canvas.w * 0.8;
      var layerH = layerW / aspect;
      if (layerH > canvas.h * 0.8) {
        layerH = canvas.h * 0.8;
        layerW = layerH * aspect;
      }
      dispatch({
        type: 'ADD_LAYER',
        layer: {
          type: 'image',
          src: imageUrl,
          x: (canvas.w - layerW) / 2,
          y: (canvas.h - layerH) / 2,
          w: layerW,
          h: layerH,
        },
      });
    };
    img.onerror = function() {
      // Fallback: add layer at a default size even if preload failed
      var layerW = canvas.w * 0.8;
      var layerH = canvas.h * 0.6;
      dispatch({
        type: 'ADD_LAYER',
        layer: {
          type: 'image',
          src: imageUrl,
          x: (canvas.w - layerW) / 2,
          y: (canvas.h - layerH) / 2,
          w: layerW,
          h: layerH,
        },
      });
    };
    img.src = imageUrl;
  }

  // Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className="sps-root">
          <div className="sps-loading">Loading design…</div>
        </div>
      </AppLayout>
    );
  }

  var selectedLayer = state.selectedId
    ? state.layers.find(function(l) { return l.id === state.selectedId; })
    : null;

  return (
    <AppLayout>
      <div className="sps-root">
        {/* Hidden file input for image upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />

        {/* Top bar */}
        <div className="sps-topbar">
          <button
            className="sps-topbar-back"
            onClick={function() { navigate('/creative-studio/social-post'); }}
            title="Back to gallery"
          >
            ← Designs
          </button>

          {state.dirty && <span className="sps-dirty-dot" title="Unsaved changes" />}
          <input
            type="text"
            className="sps-topbar-title"
            value={state.name}
            onChange={function(e) { dispatch({ type: 'SET_NAME', name: e.target.value }); }}
            placeholder="Untitled Design"
          />

          <button
            className="sps-topbar-btn"
            onClick={function() { dispatch({ type: 'UNDO' }); }}
            disabled={state.history.length === 0}
            title="Undo (Cmd-Z)"
          >
            ↶ Undo
          </button>
          <button
            className="sps-topbar-btn"
            onClick={function() { dispatch({ type: 'REDO' }); }}
            disabled={state.future.length === 0}
            title="Redo (Cmd-Shift-Z)"
          >
            ↷ Redo
          </button>

          <button
            className="sps-topbar-btn is-primary"
            onClick={handleSave}
            disabled={saving || !state.dirty}
          >
            {saving ? 'Saving…' : (state.dirty ? 'Save' : 'Saved')}
          </button>
        </div>

        {/* Main 3-column workspace */}
        <div className="sps-workspace">

          {/* LEFT RAIL — tools */}
          <div className="sps-rail-left">
            <div className="sps-rail-section">
              <div className="sps-rail-label">Aspect ratio</div>
              <div className="sps-aspect-grid">
                {Object.keys(ASPECTS).map(function(key) {
                  var a = ASPECTS[key];
                  var ratio = a.w / a.h;
                  // Visual shape preview
                  var maxDim = 22;
                  var shapeW, shapeH;
                  if (ratio >= 1) { shapeW = maxDim; shapeH = maxDim / ratio; }
                  else { shapeH = maxDim; shapeW = maxDim * ratio; }
                  return (
                    <button
                      key={key}
                      className={'sps-aspect-btn' + (key === state.aspect ? ' is-active' : '')}
                      onClick={function() { dispatch({ type: 'SET_ASPECT', aspect: key }); }}
                    >
                      <div
                        className="sps-aspect-shape"
                        style={{ width: shapeW + 'px', height: shapeH + 'px' }}
                      />
                      <span>{key}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sps-rail-section">
              <div className="sps-rail-label">Add to canvas</div>
              <div className="sps-add-btn-stack">
                <button
                  className="sps-add-btn"
                  onClick={function() { setShowAIPanel(true); }}
                  style={{
                    background: 'linear-gradient(135deg, var(--sps-gold-1), var(--sps-gold-2))',
                    color: '#000', fontWeight: 700,
                  }}
                >
                  <span className="sps-add-btn-icon">✨</span>
                  <span>AI Generate photo</span>
                </button>
                <button className="sps-add-btn" onClick={handleAddImage}>
                  <span className="sps-add-btn-icon">⬆</span>
                  <span>Upload image</span>
                </button>
                <button
                  className="sps-add-btn"
                  onClick={function() { setShowTextPicker(!showTextPicker); }}
                >
                  <span className="sps-add-btn-icon">T</span>
                  <span>Add text</span>
                </button>
                <div className="sps-coming-soon">
                  <strong>Coming in Phase 4</strong>
                  80-piece object library (badges, CTAs, ribbons, dividers)
                </div>
              </div>
            </div>

            {showTextPicker && (
              <div className="sps-rail-section">
                <div className="sps-rail-label">Pick a text style</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  {TEXT_STYLES.map(function(s) {
                    return (
                      <button
                        key={s.key}
                        onClick={function() { handleAddText(s); }}
                        style={textStyleBtnStyle()}
                        title={'Add ' + s.label}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sps-gold-2)', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--sps-text-dim)' }}>{s.defaultText}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CENTRE — canvas */}
          <div className="sps-canvas-area">
            <CanvasEngine state={state} dispatch={dispatch} />
          </div>

          {/* RIGHT RAIL — layers */}
          <div className="sps-rail-right">
            <div className="sps-rail-section">
              <div className="sps-rail-label">Layers</div>
              {state.layers.length === 0 ? (
                <div className="sps-empty-state">
                  No layers yet.<br />
                  Add an image from the left rail to get started.
                </div>
              ) : (
                state.layers
                  .slice()
                  .sort(function(a, b) { return (b.zIndex || 0) - (a.zIndex || 0); })
                  .map(function(l) {
                    var isSelected = l.id === state.selectedId;
                    return (
                      <div
                        key={l.id}
                        className={'sps-layer-row' + (isSelected ? ' is-selected' : '')}
                        onClick={function() { dispatch({ type: 'SELECT_LAYER', id: l.id }); }}
                      >
                        <div className="sps-layer-thumb">
                          {l.type === 'image' && l.src && <img src={l.src} alt="" />}
                        </div>
                        <span className="sps-layer-name">
                          {l.type === 'image' ? 'Image' : (l.type === 'text' ? ('Text: ' + (l.content || '').slice(0, 18)) : l.type)} · {Math.round(l.w)}×{Math.round(l.h)}
                        </span>
                        <button
                          className="sps-layer-action"
                          title={l.locked ? 'Unlock' : 'Lock'}
                          onClick={function(e) {
                            e.stopPropagation();
                            dispatch({ type: 'TOGGLE_LOCK', id: l.id });
                          }}
                        >
                          {l.locked ? '🔒' : '🔓'}
                        </button>
                        <button
                          className="sps-layer-action is-danger"
                          title="Delete"
                          onClick={function(e) {
                            e.stopPropagation();
                            dispatch({ type: 'DELETE_LAYER', id: l.id });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            {selectedLayer && selectedLayer.type === 'text' && (
              <div className="sps-rail-section">
                <div className="sps-rail-label">Text</div>
                {/* Content editor — textarea so multi-line text works for
                    Editorial Serif style. Live updates on every keystroke. */}
                <textarea
                  value={selectedLayer.content || ''}
                  onChange={function(e) {
                    dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { content: e.target.value } });
                  }}
                  rows={2}
                  placeholder="Type your text…"
                  style={Object.assign({}, inlineInput(), {
                    resize: 'vertical', minHeight: 50, fontFamily: 'inherit',
                  })}
                />

                {/* Style swap — switch to a different one of the 8 styles
                    without recreating the layer. Default text + font size
                    don't change so member doesn't lose their work. */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4, fontSize: 12 }}>Style</div>
                  <select
                    value={selectedLayer.styleKey || 'solid-punch'}
                    onChange={function(e) {
                      dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { styleKey: e.target.value } });
                    }}
                    style={Object.assign({}, inlineInput(), { cursor: 'pointer' })}
                  >
                    {TEXT_STYLES.map(function(s) {
                      return <option key={s.key} value={s.key}>{s.label}</option>;
                    })}
                  </select>
                </div>

                {/* Font size — number input with sensible bounds. The SVG
                    auto-scales inside the layer box so this also affects
                    visual size, but the bounding box stays the same. */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Font size</span>
                    <span style={{ color: 'var(--sps-gold-2)', fontWeight: 600 }}>{selectedLayer.fontSize || 140}px</span>
                  </div>
                  <input
                    type="range"
                    min={32}
                    max={400}
                    step={2}
                    value={selectedLayer.fontSize || 140}
                    onChange={function(e) {
                      dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { fontSize: parseInt(e.target.value, 10) } });
                    }}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--sps-gold-2)' }}
                  />
                </div>

                {/* Colour control — only some styles respect this. The ones
                    with locked colour schemes (gold-extrude, blue-chrome,
                    solid-punch white, gradient-slice, inset-carved) keep
                    their look. For the colour-respecting styles, show the
                    picker; for the rest, show a friendly note. */}
                {textStyleSupportsColor(selectedLayer.styleKey) ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4, fontSize: 12 }}>{colorLabelFor(selectedLayer.styleKey)}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={selectedLayer.color || defaultColorFor(selectedLayer.styleKey)}
                        onChange={function(e) {
                          dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { color: e.target.value } });
                        }}
                        style={{ width: 44, height: 32, border: '1px solid var(--sps-border)', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={selectedLayer.color || defaultColorFor(selectedLayer.styleKey)}
                        onChange={function(e) {
                          dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { color: e.target.value } });
                        }}
                        style={Object.assign({}, inlineInput(), { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11 })}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, padding: '8px 10px', fontSize: 11, color: 'var(--sps-text-mute)', background: 'var(--sps-bg-3)', borderRadius: 6, lineHeight: 1.5 }}>
                    This style uses a fixed gradient. To change colour, switch to a colour-friendly style (Neon Glow, Editorial Serif, or Stamped Outline).
                  </div>
                )}
              </div>
            )}

            {selectedLayer && (
              <div className="sps-rail-section">
                <div className="sps-rail-label">Properties</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4 }}>X</div>
                    <input type="number" value={Math.round(selectedLayer.x)}
                      style={inlineInput()}
                      onChange={function(e) {
                        dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { x: parseFloat(e.target.value) || 0 } });
                      }}/>
                  </div>
                  <div>
                    <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4 }}>Y</div>
                    <input type="number" value={Math.round(selectedLayer.y)}
                      style={inlineInput()}
                      onChange={function(e) {
                        dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { y: parseFloat(e.target.value) || 0 } });
                      }}/>
                  </div>
                  <div>
                    <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4 }}>Width</div>
                    <input type="number" value={Math.round(selectedLayer.w)} min={40}
                      style={inlineInput()}
                      onChange={function(e) {
                        dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { w: Math.max(40, parseFloat(e.target.value) || 40) } });
                      }}/>
                  </div>
                  <div>
                    <div style={{ color: 'var(--sps-text-mute)', marginBottom: 4 }}>Height</div>
                    <input type="number" value={Math.round(selectedLayer.h)} min={40}
                      style={inlineInput()}
                      onChange={function(e) {
                        dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, patch: { h: Math.max(40, parseFloat(e.target.value) || 40) } });
                      }}/>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="sps-topbar-btn" style={{ fontSize: 11, padding: '6px 10px' }}
                    onClick={function() { dispatch({ type: 'REORDER_LAYER', id: selectedLayer.id, direction: 'forward' }); }}>
                    Forward
                  </button>
                  <button className="sps-topbar-btn" style={{ fontSize: 11, padding: '6px 10px' }}
                    onClick={function() { dispatch({ type: 'REORDER_LAYER', id: selectedLayer.id, direction: 'backward' }); }}>
                    Backward
                  </button>
                  <button className="sps-topbar-btn" style={{ fontSize: 11, padding: '6px 10px' }}
                    onClick={function() { dispatch({ type: 'DUPLICATE_LAYER', id: selectedLayer.id }); }}>
                    Duplicate
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <AIGeneratePanel
        isOpen={showAIPanel}
        onClose={function() { setShowAIPanel(false); }}
        onPicked={handleAIPicked}
        defaultAspect={state.aspect}
      />
    </AppLayout>
  );
}

function inlineInput() {
  return {
    width: '100%',
    background: 'var(--sps-bg-3)',
    border: '1px solid var(--sps-border)',
    color: 'var(--sps-text)',
    padding: '6px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
  };
}

function textStyleBtnStyle() {
  return {
    width: '100%',
    background: 'var(--sps-bg-3)',
    border: '1px solid var(--sps-border)',
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  };
}

// ─── Text-style colour metadata ─────────────────────────────────────────────
// Which of the 8 styles let the member pick a colour, what to label the
// picker, and what default colour to show if none is set yet.

function textStyleSupportsColor(styleKey) {
  // Locked-palette styles use gradients or specific schemes that lose their
  // identity if recoloured (gold extrude wouldn't be gold any more, etc).
  // Open styles let the member tune the dominant colour to taste.
  return styleKey === 'neon-glow'
      || styleKey === 'editorial-serif'
      || styleKey === 'stamped-outline';
}

function colorLabelFor(styleKey) {
  if (styleKey === 'neon-glow') return 'Glow colour';
  if (styleKey === 'editorial-serif') return 'Ink colour';
  if (styleKey === 'stamped-outline') return 'Stroke colour';
  return 'Colour';
}

function defaultColorFor(styleKey) {
  // Matches the per-style defaults in TextStyleRenderer.jsx so the picker
  // starts from where the visible text already is.
  if (styleKey === 'neon-glow') return '#aef4ff';
  if (styleKey === 'editorial-serif') return '#3a2410';
  if (styleKey === 'stamped-outline') return '#ffc125';
  return '#ffffff';
}
