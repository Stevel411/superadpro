// AIGeneratePanel.jsx
// ============================================================================
// AI Generate panel for Social Post Studio Phase 3.
//
// Three-step flow:
//   1. Pick reference photo (optional, from member's library) + upload new
//   2. Pick a vibe preset (or write custom prompt)
//   3. Generate → see 4 candidates → pick one → it becomes a canvas image layer
//
// Renders as a modal-style overlay inside the studio. Closed by clicking
// outside or the X button. Resets state on close.
// ============================================================================
import { useState, useEffect } from 'react';

export default function AIGeneratePanel({ isOpen, onClose, onPicked, defaultAspect }) {
  // Step state: 'setup' (pick preset/photo) → 'generating' → 'choosing' (pick from 4) → done
  var [step, setStep] = useState('setup');
  var [error, setError] = useState(null);

  // Setup state
  var [presets, setPresets] = useState([]);
  var [selectedPreset, setSelectedPreset] = useState(null);
  var [customPrompt, setCustomPrompt] = useState('');
  var [customAddons, setCustomAddons] = useState('');
  var [mode, setMode] = useState('preset');  // 'preset' or 'custom'

  // Reference photos
  var [photos, setPhotos] = useState([]);
  var [selectedPhotoId, setSelectedPhotoId] = useState(null);
  var [photoUploading, setPhotoUploading] = useState(false);

  // Credits
  var [credits, setCredits] = useState({ balance: 0, costs: { generate: 5, regenerate: 3 } });

  // Generation result
  var [candidates, setCandidates] = useState([]);
  var [generationId, setGenerationId] = useState(null);

  // Load initial data when opened
  useEffect(function() {
    if (!isOpen) return;
    // Reset on open
    setStep('setup');
    setError(null);
    setSelectedPreset(null);
    setCustomPrompt('');
    setCustomAddons('');
    setCandidates([]);
    setGenerationId(null);

    // Fetch presets, photos, balance in parallel
    Promise.all([
      fetch('/api/social-post/presets', { credentials: 'include' }).then(function(r) { return r.json(); }),
      fetch('/api/social-post/reference-photos', { credentials: 'include' }).then(function(r) { return r.json(); }),
      fetch('/api/social-post/credits-balance', { credentials: 'include' }).then(function(r) { return r.json(); }),
    ]).then(function(results) {
      var presetsData = results[0];
      var photosData = results[1];
      var creditsData = results[2];
      setPresets((presetsData && presetsData.presets) || []);
      var p = (photosData && photosData.photos) || [];
      setPhotos(p);
      // Pre-select the default photo if member has one
      var defaultPhoto = p.find(function(x) { return x.is_default; });
      if (defaultPhoto) setSelectedPhotoId(defaultPhoto.id);
      setCredits(creditsData || { balance: 0, costs: { generate: 5, regenerate: 3 } });
    }).catch(function() {
      setError('Could not load AI generation setup.');
    });
  }, [isOpen]);

  function handleUploadPhoto(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Photo too large (max 8MB)');
      return;
    }
    setPhotoUploading(true);
    setError(null);
    var fd = new FormData();
    fd.append('file', file);
    fetch('/api/social-post/upload-reference', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    }).then(function(r) {
      return r.json().then(function(data) { return { ok: r.ok, data: data }; });
    }).then(function(result) {
      if (!result.ok) {
        setError((result.data && result.data.error) || 'Upload failed');
        return;
      }
      // Add to photo list and select it
      setPhotos(function(prev) { return [result.data].concat(prev); });
      setSelectedPhotoId(result.data.id);
    }).catch(function() {
      setError('Upload failed — network error');
    }).finally(function() {
      setPhotoUploading(false);
      e.target.value = '';
    });
  }

  function canGenerate() {
    if (credits.balance < credits.costs.generate) return false;
    if (mode === 'preset' && !selectedPreset) return false;
    if (mode === 'custom' && !customPrompt.trim()) return false;
    return true;
  }

  function handleGenerate() {
    if (!canGenerate()) return;
    setStep('generating');
    setError(null);

    var body = {
      reference_photo_id: selectedPhotoId,
      aspect: defaultAspect || '1:1',
    };
    if (mode === 'preset') {
      body.preset_key = selectedPreset.key;
      body.custom_addons = customAddons;
    } else {
      body.custom_prompt = customPrompt;
    }

    fetch('/api/social-post/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    }).then(function(r) {
      return r.json().then(function(data) { return { ok: r.ok, status: r.status, data: data }; });
    }).then(function(result) {
      if (!result.ok) {
        setError((result.data && result.data.error) || 'Generation failed');
        setStep('setup');
        // Refresh credits in case of refund
        if (result.data && typeof result.data.balance === 'number') {
          setCredits(function(prev) { return Object.assign({}, prev, { balance: result.data.balance }); });
        }
        return;
      }
      setCandidates(result.data.candidates || []);
      setGenerationId(result.data.generation_id);
      setCredits(function(prev) { return Object.assign({}, prev, { balance: result.data.balance }); });
      setStep('choosing');
    }).catch(function() {
      setError('Generation failed — network error');
      setStep('setup');
    });
  }

  function handlePickCandidate(url) {
    // Record the choice (audit) then hand off to parent to add as canvas layer
    if (generationId) {
      fetch('/api/social-post/generation/' + generationId + '/choose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chosen_url: url }),
        credentials: 'include',
      }).catch(function() {});  // fire-and-forget; not blocking the canvas action
    }
    onPicked(url);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div style={overlayStyle()} onClick={onClose}>
      <div style={panelStyle()} onClick={function(e) { e.stopPropagation(); }}>
        <div style={headerStyle()}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--sps-text)' }}>AI Generate</div>
            <div style={{ fontSize: 12, color: 'var(--sps-text-mute)', marginTop: 2 }}>
              {step === 'setup' && 'Pick a vibe and generate 4 marketing-grade photos of yourself'}
              {step === 'generating' && 'Generating 4 candidates with Grok Imagine — this takes 20-40 seconds…'}
              {step === 'choosing' && 'Pick your favourite — it goes on your canvas'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--sps-gold-2)', fontWeight: 600 }}>
              {credits.balance} credits
            </div>
            <button onClick={onClose} style={closeBtnStyle()}>×</button>
          </div>
        </div>

        {error && (
          <div style={errorBoxStyle()}>{error}</div>
        )}

        {step === 'setup' && (
          <SetupView
            presets={presets}
            selectedPreset={selectedPreset}
            setSelectedPreset={setSelectedPreset}
            mode={mode}
            setMode={setMode}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            customAddons={customAddons}
            setCustomAddons={setCustomAddons}
            photos={photos}
            selectedPhotoId={selectedPhotoId}
            setSelectedPhotoId={setSelectedPhotoId}
            handleUploadPhoto={handleUploadPhoto}
            photoUploading={photoUploading}
            credits={credits}
            canGenerate={canGenerate()}
            onGenerate={handleGenerate}
          />
        )}

        {step === 'generating' && <GeneratingView />}

        {step === 'choosing' && (
          <ChoosingView
            candidates={candidates}
            onPick={handlePickCandidate}
            onRegenerate={function() { setStep('setup'); }}
          />
        )}
      </div>
    </div>
  );
}


// ─── SETUP VIEW ─────────────────────────────────────────────────────────────
function SetupView({ presets, selectedPreset, setSelectedPreset, mode, setMode,
                     customPrompt, setCustomPrompt, customAddons, setCustomAddons,
                     photos, selectedPhotoId, setSelectedPhotoId,
                     handleUploadPhoto, photoUploading,
                     credits, canGenerate, onGenerate }) {
  return (
    <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(85vh - 200px)' }}>

      {/* Reference photo section */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionHeaderStyle()}>Reference Photo</div>
        <div style={{ fontSize: 11, color: 'var(--sps-text-mute)', marginBottom: 10 }}>
          For best results, upload a clear front-facing photo of yourself.
          Generation also works without one but loses the personal touch.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Upload tile */}
          <label style={uploadTileStyle()}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUploadPhoto}
              style={{ display: 'none' }}
              disabled={photoUploading}
            />
            <div style={{ fontSize: 24, color: 'var(--sps-gold-2)' }}>+</div>
            <div style={{ fontSize: 10, color: 'var(--sps-text-mute)', marginTop: 4, textAlign: 'center' }}>
              {photoUploading ? 'Uploading…' : 'Upload photo'}
            </div>
          </label>
          {/* Existing photos */}
          {photos.map(function(p) {
            var selected = p.id === selectedPhotoId;
            return (
              <div
                key={p.id}
                onClick={function() { setSelectedPhotoId(selected ? null : p.id); }}
                style={photoTileStyle(selected)}
                title={p.label || 'Reference photo'}
              >
                <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                {selected && <div style={photoCheckStyle()}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionHeaderStyle()}>Pick a vibe</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            onClick={function() { setMode('preset'); }}
            style={modeTabStyle(mode === 'preset')}
          >
            Preset vibes
          </button>
          <button
            onClick={function() { setMode('custom'); }}
            style={modeTabStyle(mode === 'custom')}
          >
            Custom prompt
          </button>
        </div>

        {mode === 'preset' && (
          <>
            <div style={presetGridStyle()}>
              {presets.map(function(p) {
                var selected = selectedPreset && selectedPreset.key === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={function() { if (p.available) setSelectedPreset(p); }}
                    disabled={!p.available}
                    style={presetTileStyle(selected, !p.available)}
                    title={p.description}
                  >
                    <div style={{ fontSize: 24 }}>{p.thumbnail_emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--sps-text)' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--sps-text-mute)', marginTop: 2 }}>
                      {p.available ? p.description : 'Coming soon'}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPreset && (
              <div style={{ marginTop: 12 }}>
                <div style={subLabelStyle()}>Extra direction (optional)</div>
                <input
                  type="text"
                  value={customAddons}
                  onChange={function(e) { setCustomAddons(e.target.value); }}
                  placeholder="e.g. holding a coffee, golden hour"
                  maxLength={500}
                  style={inputStyle()}
                />
              </div>
            )}
          </>
        )}

        {mode === 'custom' && (
          <div>
            <textarea
              value={customPrompt}
              onChange={function(e) { setCustomPrompt(e.target.value); }}
              placeholder="Describe the image you want. e.g. 'Cinematic photo of subject standing on a mountain summit at sunrise, snow-capped peaks behind, wearing a hiking jacket, triumphant expression, golden hour lighting, shot on Sony A1 with 35mm f/1.4'"
              rows={5}
              maxLength={800}
              style={Object.assign({}, inputStyle(), { resize: 'vertical' })}
            />
            <div style={{ fontSize: 10, color: 'var(--sps-text-mute)', marginTop: 6 }}>
              {customPrompt.length} / 800 chars
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--sps-border)' }}>
        <div style={{ fontSize: 12, color: 'var(--sps-text-mute)' }}>
          Costs <strong style={{ color: 'var(--sps-gold-2)' }}>{credits.costs.generate} credits</strong>.
          You'll get 4 candidates to pick from.
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          style={generateBtnStyle(canGenerate)}
        >
          Generate 4 photos
        </button>
      </div>
    </div>
  );
}


// ─── GENERATING VIEW ────────────────────────────────────────────────────────
function GeneratingView() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sps-text)', marginBottom: 8 }}>
        Generating 4 candidates with Grok Imagine
      </div>
      <div style={{ fontSize: 12, color: 'var(--sps-text-mute)', marginBottom: 20 }}>
        Usually takes 20-40 seconds. Don't close this panel.
      </div>
      <div style={spinnerStyle()} />
      <style>{`
        @keyframes sps-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


// ─── CHOOSING VIEW ──────────────────────────────────────────────────────────
function ChoosingView({ candidates, onPick, onRegenerate }) {
  return (
    <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(85vh - 200px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {candidates.map(function(url, i) {
          return (
            <button
              key={i}
              onClick={function() { onPick(url); }}
              style={candidateBtnStyle()}
              title="Click to add to canvas"
            >
              <img
                src={url}
                alt={'Candidate ' + (i + 1)}
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
              />
              <div style={candidateLabelStyle()}>Pick this →</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <button onClick={onRegenerate} style={regenerateBtnStyle()}>
          ↻ Regenerate (3 credits)
        </button>
      </div>
    </div>
  );
}


// ─── STYLES ────────────────────────────────────────────────────────────────
function overlayStyle() {
  return {
    position: 'fixed', inset: 0,
    background: 'rgba(8, 12, 24, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: 16,
  };
}
function panelStyle() {
  return {
    background: 'var(--sps-bg-2)',
    border: '1px solid var(--sps-border)',
    borderRadius: 14,
    maxWidth: 720, width: '100%',
    maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  };
}
function headerStyle() {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--sps-border)',
  };
}
function closeBtnStyle() {
  return {
    width: 32, height: 32, borderRadius: 6,
    background: 'var(--sps-bg-3)', color: 'var(--sps-text)',
    border: '1px solid var(--sps-border)',
    fontSize: 18, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit',
  };
}
function errorBoxStyle() {
  return {
    margin: '14px 20px 0', padding: '10px 12px',
    background: 'rgba(220, 38, 38, 0.12)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    color: '#fca5a5', borderRadius: 8, fontSize: 13,
  };
}
function sectionHeaderStyle() {
  return {
    fontSize: 11, color: 'var(--sps-text-mute)', fontWeight: 600,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
  };
}
function subLabelStyle() {
  return {
    fontSize: 11, color: 'var(--sps-text-mute)', marginBottom: 4,
  };
}
function inputStyle() {
  return {
    width: '100%', padding: '8px 10px',
    background: 'var(--sps-bg-3)',
    border: '1px solid var(--sps-border)',
    color: 'var(--sps-text)',
    borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };
}
function uploadTileStyle() {
  return {
    width: 72, height: 72,
    border: '2px dashed var(--sps-border)',
    borderRadius: 8, cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--sps-bg-3)',
  };
}
function photoTileStyle(selected) {
  return {
    width: 72, height: 72,
    borderRadius: 8, cursor: 'pointer',
    border: selected ? '2px solid var(--sps-gold-2)' : '2px solid transparent',
    position: 'relative', overflow: 'hidden',
    boxShadow: selected ? '0 0 0 2px var(--sps-bg-2), 0 0 0 3px var(--sps-gold-2)' : 'none',
  };
}
function photoCheckStyle() {
  return {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: '50%',
    background: 'var(--sps-gold-2)', color: '#000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
  };
}
function modeTabStyle(active) {
  return {
    padding: '8px 14px',
    background: active ? 'var(--sps-gold-2)' : 'var(--sps-bg-3)',
    color: active ? '#000' : 'var(--sps-text)',
    border: '1px solid ' + (active ? 'var(--sps-gold-2)' : 'var(--sps-border)'),
    borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  };
}
function presetGridStyle() {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  };
}
function presetTileStyle(selected, disabled) {
  return {
    padding: '12px 8px',
    background: selected ? 'rgba(255, 193, 37, 0.15)' : 'var(--sps-bg-3)',
    border: '1px solid ' + (selected ? 'var(--sps-gold-2)' : 'var(--sps-border)'),
    borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontFamily: 'inherit', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  };
}
function generateBtnStyle(enabled) {
  return {
    padding: '10px 22px',
    background: enabled ? 'linear-gradient(135deg, var(--sps-gold-1), var(--sps-gold-2))' : 'var(--sps-bg-3)',
    color: enabled ? '#000' : 'var(--sps-text-mute)',
    border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit',
  };
}
function spinnerStyle() {
  return {
    width: 40, height: 40,
    border: '3px solid var(--sps-border)',
    borderTopColor: 'var(--sps-gold-2)',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'sps-spin 0.8s linear infinite',
  };
}
function candidateBtnStyle() {
  return {
    background: 'transparent', border: 'none', padding: 0,
    cursor: 'pointer', position: 'relative',
    borderRadius: 8, overflow: 'hidden',
  };
}
function candidateLabelStyle() {
  return {
    position: 'absolute', bottom: 8, right: 8,
    padding: '6px 12px',
    background: 'rgba(255, 193, 37, 0.95)',
    color: '#000', borderRadius: 6,
    fontSize: 11, fontWeight: 700,
  };
}
function regenerateBtnStyle() {
  return {
    padding: '8px 16px',
    background: 'var(--sps-bg-3)',
    color: 'var(--sps-text)',
    border: '1px solid var(--sps-border)',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  };
}
