import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { CreditMatrixContent } from '../CreditMatrix';
import './creative-studio.css';

// ── Video Models ──────────────────────────────────────
const MODELS = [
  { key: "wan26",      name: "WAN 2.6",          desc: "Budget-friendly, good quality",    badge: "CHEAPEST", cost: 1,  color: "#10b981", i2v: true,  audio: false, negPrompt: false, durations: [3,5,8],       resolutions: ["480p","720p"],        durationLabel: "3-8s",   pricePer10s: "$0.50",  tier: "budget" },
  { key: "seedance",   name: "Seedance 1.5 Pro", desc: "Great quality + native audio",     badge: "VALUE",    cost: 2,  color: "#fb923c", i2v: true,  audio: true,  negPrompt: false, durations: [4,5,8,10,12], resolutions: ["480p","720p","1080p"],durationLabel: "4-12s",  pricePer10s: "$1.00",  tier: "standard" },
  { key: "kling3",     name: "Kling 3.0",        desc: "Cinematic realism, smooth motion",  badge: "POPULAR",  cost: 3,  color: "#22d3ee", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15], resolutions: ["720p","1080p"],      durationLabel: "3-15s",  pricePer10s: "$1.20",  tier: "standard" },
  { key: "grok-video", name: "Grok Imagine",     desc: "Creative with built-in audio",      badge: "AUDIO",    cost: 4,  color: "#ef4444", i2v: true,  audio: false, negPrompt: false, durations: [6,10],        resolutions: ["480p","720p"],        durationLabel: "6/10s",  pricePer10s: "$1.40",  tier: "standard" },
  { key: "veo31",      name: "VEO 3.1 Fast",     desc: "Google, fast + fine detail",        badge: "NEW",      cost: 4,  color: "#38bdf8", i2v: true,  audio: false, negPrompt: false, durations: [4,6,8],       resolutions: ["720p","1080p","4K"],  durationLabel: "4/6/8s", pricePer10s: "$1.60",  tier: "standard" },
  { key: "kling-o3",   name: "Kling O3",         desc: "Next-gen, exceptional detail",      badge: "BEST",     cost: 5,  color: "#8b5cf6", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15], resolutions: ["720p","1080p"],      durationLabel: "3-15s",  pricePer10s: "$2.00",  tier: "premium" },
  { key: "sora2",      name: "Sora 2 Pro",       desc: "OpenAI flagship, photorealistic",   badge: "PREMIUM",  cost: 8,  color: "#a78bfa", i2v: true,  audio: false, negPrompt: false, durations: [4,8,12],      resolutions: ["720p","1080p"],      durationLabel: "4/8/12s",pricePer10s: "$3.00",  tier: "premium" },
  { key: "sora2-max",  name: "Sora 2 Max",       desc: "No watermark, premium OpenAI",      badge: "PRO",      cost: 10, color: "#c084fc", i2v: false, audio: false, negPrompt: false, durations: [10,15],       resolutions: ["720p","1080p"],      durationLabel: "10/15s", pricePer10s: "$4.00",  tier: "ultra" },
  { key: "veo31-pro",  name: "VEO 3.1 Pro 4K",   desc: "Maximum quality, 4K + audio",       badge: "4K",       cost: 16, color: "#f59e0b", i2v: true,  audio: true,  negPrompt: false, durations: [4,6,8],       resolutions: ["720p","1080p","4K"],  durationLabel: "4/6/8s", pricePer10s: "$8.50",  tier: "ultra" },
];

const RATIOS = [
  { key: "16:9", label: "Landscape" },
  { key: "9:16", label: "Portrait" },
  { key: "1:1",  label: "Square" },
  { key: "4:3",  label: "Classic" },
];

const CAMERA_MOTIONS = [
  { key: "zoom-in",   label: "Zoom In",   icon: "⊕", prompt: "slow cinematic zoom in" },
  { key: "zoom-out",  label: "Zoom Out",  icon: "⊖", prompt: "slow zoom out revealing the full scene" },
  { key: "pan-left",  label: "Pan Left",  icon: "←", prompt: "smooth camera pan to the left" },
  { key: "pan-right", label: "Pan Right", icon: "→", prompt: "smooth camera pan to the right" },
  { key: "tilt-up",   label: "Tilt Up",   icon: "↑", prompt: "gentle camera tilt upward" },
  { key: "tilt-down", label: "Tilt Down", icon: "↓", prompt: "gentle camera tilt downward" },
  { key: "orbit",     label: "Orbit",     icon: "◎", prompt: "slow orbital camera movement around subject" },
  { key: "dolly-in",  label: "Dolly In",  icon: "⟼", prompt: "steady dolly push toward subject" },
  { key: "tracking",  label: "Tracking",  icon: "⟿", prompt: "smooth tracking shot following motion" },
  { key: "crane-up",  label: "Crane Up",  icon: "⤴", prompt: "dramatic crane shot rising upward" },
  { key: "static",    label: "Static",    icon: "▪", prompt: "static camera, subtle ambient motion only" },
  { key: "handheld",  label: "Handheld",  icon: "≋", prompt: "slight handheld camera shake, natural feel" },
];

const AUDIO_EXTRA_PER_5S = 1;

function calcCost(modelKey, dur, withAudio) {
  var m = MODELS.find(function(x) { return x.key === modelKey; });
  if (!m) return 0;
  var segs = dur / 5;
  var c = m.cost * segs;
  if (withAudio && m.audio) c += AUDIO_EXTRA_PER_5S * segs;
  return c;
}

// ── Tab definitions ──
var TABS = [
  { key: 'video-clips', label: 'Video Clips', icon: 'video' },
  { key: 'full-video',  label: 'Full Video',  icon: 'film' },
  { key: 'images',      label: 'Images',      icon: 'image' },
  { key: 'music',       label: 'Music',       icon: 'music' },
  { key: 'voiceover',   label: 'Voiceover',   icon: 'mic' },
  { key: 'lip-sync',    label: 'Lip Sync',    icon: 'edit' },
  { key: 'gallery',     label: 'Gallery',     icon: 'grid' },
  { key: 'credits',     label: 'Credits',     icon: 'clock' },
];

function TabIcon({ type }) {
  var s = { width: 15, height: 15 };
  if (type === 'video') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
  if (type === 'film') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20"/></svg>;
  if (type === 'image') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
  if (type === 'music') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  if (type === 'mic') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>;
  if (type === 'edit') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
  if (type === 'grid') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  if (type === 'clock') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
  return null;
}

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function CreativeStudio() {
  var [searchParams, setSearchParams] = useSearchParams();
  var initialTab = searchParams.get('tab') || 'video-clips';
  var [tab, setTab] = useState(initialTab);


  function switchTab(t) {
    setTab(t);
    setSearchParams(t === 'video-clips' ? {} : { tab: t }, { replace: true });
  }

  // ── Video Clips state ──
  var [mode, setMode] = useState('text');
  var [prompt, setPrompt] = useState('');
  var [model, setModel] = useState('kling3');
  var [duration, setDuration] = useState(10);
  var [ratio, setRatio] = useState('16:9');
  var [resolution, setResolution] = useState('1080p');
  var [negPrompt, setNegPrompt] = useState('');
  var [genAudio, setGenAudio] = useState(false);
  var [motionPresets, setMotionPresets] = useState([]);
  var [seedLocked, setSeedLocked] = useState(false);
  var [seedValue, setSeedValue] = useState(null);

  // Image upload
  var [imageFile, setImageFile] = useState(null);
  var [imagePreview, setImagePreview] = useState(null);
  var [uploading, setUploading] = useState(false);
  var [imageUrl, setImageUrl] = useState(null);
  var fileRef = useRef(null);

  // Generation
  var [generating, setGenerating] = useState(false);
  var [taskId, setTaskId] = useState(null);
  var [videoUrl, setVideoUrl] = useState(null);
  var [genStatus, setGenStatus] = useState(null);
  var [genProgress, setGenProgress] = useState(0);
  var pollRef = useRef(null);
  var fakeProgRef = useRef(null);

  // Credits & gallery
  var [credits, setCredits] = useState(0);
  var [videos, setVideos] = useState([]);

  var selectedModel = MODELS.find(function(m) { return m.key === model; }) || MODELS[2];
  var cost = calcCost(model, duration, genAudio);

  // ── Load credits + videos on mount ──
  useEffect(function() {
    fetch('/api/superscene/credits').then(function(r) { return r.json(); }).then(function(d) { setCredits(d.balance || 0); });
    fetch('/api/superscene/videos').then(function(r) { return r.json(); }).then(function(d) { setVideos(d.videos || []); });
    // Prefetch Credit Matrix data so Credits tab loads instantly
    fetch('/api/credit-matrix/packs').catch(function() {});
    fetch('/api/credit-matrix/my-matrix').catch(function() {});
    fetch('/api/credit-matrix/stats').catch(function() {});
    fetch('/api/credit-matrix/commissions').catch(function() {});
    fetch('/api/credit-matrix/team-activity').catch(function() {});
  }, []);

  // ── Polling ──
  var startPolling = useCallback(function(tid) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      fetch('/api/superscene/status/' + tid).then(function(r) { return r.json(); }).then(function(data) {
        if (data.status === 'completed' && data.video_url) {
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
          setVideoUrl(data.video_url);
          setGenStatus('done');
          setGenProgress(100);
          setGenerating(false);
          fetch('/api/superscene/credits').then(function(r) { return r.json(); }).then(function(d) { setCredits(d.balance || 0); });
          fetch('/api/superscene/videos').then(function(r) { return r.json(); }).then(function(d) { setVideos(d.videos || []); });
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
          setGenStatus('failed');
          setGenerating(false);
          alert('Generation failed: ' + (data.error || 'Unknown error'));
        }
      });
    }, 3000);
  }, []);

  useEffect(function() { return function() { if (pollRef.current) clearInterval(pollRef.current); if (fakeProgRef.current) clearInterval(fakeProgRef.current); }; }, []);

  // ── Image upload ──
  function handleImageSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    var fd = new FormData();
    fd.append('file', file);
    fetch('/api/superscene/upload-image', { method: 'POST', body: fd })
      .then(function(r) { return r.json(); })
      .then(function(d) { setImageUrl(d.url || d.image_url); setUploading(false); })
      .catch(function() { setUploading(false); alert('Upload failed'); });
  }

  function clearImage() {
    setImageFile(null); setImagePreview(null); setImageUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function toggleMotion(key) {
    setMotionPresets(function(prev) {
      return prev.includes(key) ? prev.filter(function(k) { return k !== key; }) : prev.concat([key]);
    });
  }

  function toggleSeedLock() {
    if (seedLocked) { setSeedLocked(false); setSeedValue(null); }
    else { setSeedLocked(true); setSeedValue(Math.floor(Math.random() * 999999)); }
  }

  // ── Generate ──
  function generate() {
    if (!prompt.trim() || generating || credits < cost) return;
    if (mode === 'image' && !imageUrl) return;
    setGenerating(true);
    setVideoUrl(null);
    setGenStatus('pending');
    setGenProgress(0);

    fakeProgRef.current = setInterval(function() {
      setGenProgress(function(p) {
        if (p >= 85) { clearInterval(fakeProgRef.current); return p; }
        return p + Math.random() * 2 + 0.5;
      });
    }, 400);

    var finalPrompt = prompt;
    if (mode === 'image' && motionPresets.length > 0) {
      var motionText = motionPresets.map(function(k) { var m = CAMERA_MOTIONS.find(function(cm) { return cm.key === k; }); return m ? m.prompt : ''; }).filter(Boolean).join(', ');
      finalPrompt = motionText + ', ' + prompt;
    }

    var payload = { model_key: model, prompt: finalPrompt, duration: duration, ratio: ratio, resolution: resolution, generate_audio: genAudio };
    if (negPrompt.trim()) payload.negative_prompt = negPrompt.trim();
    if (mode === 'image' && imageUrl) payload.image_urls = [imageUrl];
    if (seedLocked && seedValue !== null) payload.seed = seedValue;

    fetch('/api/superscene/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.task_id) {
        setTaskId(data.task_id);
        setCredits(data.credits_remaining);
        startPolling(data.task_id);
      } else {
        alert(data.detail || data.error || 'Generation failed');
        setGenerating(false);
        clearInterval(fakeProgRef.current);
      }
    }).catch(function() {
      alert('Network error — please try again');
      setGenerating(false);
      clearInterval(fakeProgRef.current);
    });
  }

  // ── Download helper ──
  function downloadVideo(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'creative-studio-' + Date.now() + '.mp4';
    a.click();
  }

  // ── Model change handler ──
  function changeModel(key) {
    setModel(key);
    var m = MODELS.find(function(x) { return x.key === key; });
    if (m) {
      if (!m.audio) setGenAudio(false);
      if (!m.durations.includes(duration)) setDuration(m.durations[Math.floor(m.durations.length / 2)]);
      if (!m.resolutions.includes(resolution)) setResolution(m.resolutions[m.resolutions.length - 1]);
    }
  }

  // ── Stage: fixed height container, inner canvas adapts to selected ratio ──

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════
  return (
    <AppLayout title="Creative Studio" subtitle="Create videos, images, music and voiceovers with AI">

      <div className="cs-page">

        {/* ── Tab Bar + Credits (Platform Tour style — directly under AppLayout) ── */}
        <div className="cs-tab-bar">
          <div className="cs-tabs">
            {TABS.map(function(t) {
              return <button key={t.key} className={'cs-tab' + (tab === t.key ? ' active' : '')} onClick={function() { switchTab(t.key); }}>
                <TabIcon type={t.icon}/> {t.label}
              </button>;
            })}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingLeft: 16 }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: '#4ade80' }}>{credits}</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>credits</span>
            <button className="cs-credits-buy" onClick={function() { switchTab('credits'); }}>+ Buy</button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="cs-main">

          {/* ═══ VIDEO CLIPS TAB ═══ */}
          {tab === 'video-clips' && <>

            {/* Video Stage — fixed height, inner canvas adapts to ratio */}
            <div className="cs-stage">
              <div className={'cs-stage-inner r-' + ratio.replace(':', 'x')}>
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop/>
              ) : generating ? (
                <div className="cs-stage-empty">
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
                  <p style={{ color: 'rgba(255,255,255,.5)' }}>Generating your video...</p>
                  <small style={{ color: 'rgba(255,255,255,.25)' }}>{Math.round(genProgress)}% — please wait</small>
                </div>
              ) : mode === 'image' && imagePreview ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img src={imagePreview} alt="Preview"/>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '48px 24px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,.85))' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Your image</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                      {motionPresets.length > 0 ? 'Motion: ' + motionPresets.map(function(k) { var m = CAMERA_MOTIONS.find(function(cm) { return cm.key === k; }); return m ? m.label : ''; }).join(', ') : 'Write a prompt and hit Create'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cs-stage-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><rect x="2" y="4" width="20" height="14" rx="3"/><polygon points="10,8 10,15 16,11.5"/></svg>
                  <p>Your video will appear here</p>
                  <small>Write a prompt, choose a model, and hit Create</small>
                </div>
              )}
              </div>
            </div>

            {/* Progress bar (when generating) */}
            {generating && <div className="cs-progress-wrap">
              <div className="cs-progress"><div className="cs-progress-bar" style={{ width: genProgress + '%' }}/></div>
              <div className="cs-progress-status">Generating... {Math.round(genProgress)}%</div>
            </div>}

            {/* Stage actions (when video ready) */}
            {videoUrl && <div className="cs-stage-actions">
              <button className="cs-sa-btn" onClick={function() { downloadVideo(videoUrl); }}>⬇ Download</button>
              <button className="cs-sa-btn" onClick={function() { setVideoUrl(null); setGenStatus(null); setGenProgress(0); }}>✕ Clear</button>
            </div>}

            {/* ── Controls ── */}
            <div className="cs-controls">

              {/* Mode toggle */}
              <div className="cs-mode">
                <button className={mode === 'text' ? 'on' : ''} onClick={function() { setMode('text'); }}>Text to Video</button>
                <button className={mode === 'image' ? 'on' : ''} onClick={function() { setMode('image'); }}>Image to Video</button>
              </div>

              {/* Row 1: Prompt + Model */}
              <div className="cs-row">
                <div className="cs-card">
                  <div className="cs-lbl">Prompt</div>
                  <textarea className="cs-ta" rows={3} value={prompt} onChange={function(e) { setPrompt(e.target.value.slice(0, 2000)); }}
                    placeholder={mode === 'image' ? 'Describe how this image should move — e.g. slow zoom in, camera orbits...' : 'A cinematic drone shot over a misty mountain valley at golden hour...'}/>
                  <div className="cs-ta-foot">
                    <span className="cs-ta-ai">✦ AI Builder</span>
                    <span className="cs-ta-ct">{prompt.length}/2000</span>
                  </div>
                </div>

                <div className="cs-card">
                  <div className="cs-lbl">AI Model</div>
                  <div className="cs-model-list">
                    {MODELS.map(function(m) {
                      var isSel = model === m.key;
                      return <div key={m.key} className={'cs-model' + (isSel ? ' sel' : '')} onClick={function() { changeModel(m.key); }}>
                        <div className="cs-model-dot" style={{ background: 'linear-gradient(135deg,' + m.color + ',' + m.color + '88)' }}>✦</div>
                        <div style={{ flex: 1 }}>
                          <div className="cs-model-name">{m.name}</div>
                          <div className="cs-model-desc">{m.desc}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="cs-model-badge" style={{ background: m.color + '22', color: m.color }}>{m.badge}</span>
                          <div className="cs-model-price">{m.cost} cr/5s</div>
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              </div>

              {/* Camera Motion (Image mode only) */}
              {mode === 'image' && <div className="cs-card" style={{ marginBottom: 16 }}>
                <div className="cs-lbl">Camera Motion</div>
                <div className="cs-motion-grid">
                  {CAMERA_MOTIONS.map(function(m) {
                    var isOn = motionPresets.includes(m.key);
                    return <button key={m.key} className={'cs-motion-card' + (isOn ? ' on' : '')} onClick={function() { toggleMotion(m.key); }}>
                      <span className="cs-motion-icon">{m.icon}</span>
                      <span className="cs-motion-label">{m.label}</span>
                    </button>;
                  })}
                </div>
              </div>}

              {/* Row 2: Ratio + Duration/Resolution + Image Upload */}
              <div className="cs-row-3">
                <div className="cs-card">
                  <div className="cs-lbl">Aspect Ratio</div>
                  <div className="cs-pills">
                    {RATIOS.map(function(r) {
                      return <button key={r.key} className={'cs-pill' + (ratio === r.key ? ' on' : '')} onClick={function() { setRatio(r.key); }}>{r.key}</button>;
                    })}
                  </div>
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">Duration & Resolution</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="cs-sel" style={{ flex: 1 }} value={duration} onChange={function(e) { setDuration(Number(e.target.value)); }}>
                      {selectedModel.durations.map(function(d) { return <option key={d} value={d}>{d} seconds</option>; })}
                    </select>
                    <select className="cs-sel" style={{ flex: 1 }} value={resolution} onChange={function(e) { setResolution(e.target.value); }}>
                      {selectedModel.resolutions.map(function(r) { return <option key={r} value={r}>{r}</option>; })}
                    </select>
                  </div>
                  {/* Audio toggle */}
                  {selectedModel.audio && <div className="cs-audio-toggle" style={{ marginTop: 10 }} onClick={function() { setGenAudio(!genAudio); }}>
                    <div className={'cs-toggle-track' + (genAudio ? ' on' : '')}><div className="cs-toggle-thumb"/></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>AI Audio (+{AUDIO_EXTRA_PER_5S} cr/5s)</div>
                  </div>}
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">Reference Image <span className="cs-lbl-badge">Optional</span></div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect}/>
                  {imagePreview ? (
                    <div className="cs-img-preview">
                      <img src={imagePreview} alt="Preview" className="cs-img-thumb"/>
                      <div className="cs-img-overlay">
                        {uploading ? <span className="cs-img-status">Uploading…</span> : <span className="cs-img-status cs-img-ok">✓ Ready</span>}
                        <button className="cs-img-remove" onClick={clearImage}>✕ Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="cs-upload" onClick={function() { if (fileRef.current) fileRef.current.click(); }}>
                      <div className="cs-upload-plus">+</div>
                      <div className="cs-upload-text">Drop image or click to upload</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Negative prompt + Seed */}
              <div className="cs-row">
                {selectedModel.negPrompt && <div className="cs-card">
                  <div className="cs-lbl">Negative Prompt <span className="cs-lbl-badge">Optional</span></div>
                  <textarea className="cs-neg-ta" rows={2} value={negPrompt} onChange={function(e) { setNegPrompt(e.target.value.slice(0, 500)); }}
                    placeholder="blurry, low quality, text, watermark, distorted…"/>
                </div>}
                <div className="cs-card">
                  <div className="cs-lbl">Seed</div>
                  <div className="cs-seed">
                    <div className={'cs-seed-lock' + (seedLocked ? ' on' : '')} onClick={toggleSeedLock}>{seedLocked ? '🔒' : '🔓'}</div>
                    <div>
                      <div className="cs-seed-lbl">Seed</div>
                      <div className="cs-seed-val">{seedLocked ? seedValue : 'Random'}</div>
                    </div>
                    {seedLocked && <button className="cs-seed-refresh" onClick={function() { setSeedValue(Math.floor(Math.random() * 999999)); }}>↻</button>}
                  </div>
                </div>
              </div>

            </div>

            {/* Generate Button */}
            <div className="cs-gen-row">
              <button className="cs-gen-btn" onClick={generate}
                disabled={!prompt.trim() || generating || credits < cost || (mode === 'image' && !imageUrl)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                {generating ? 'Generating...' : !prompt.trim() ? 'Enter a prompt' : mode === 'image' && !imageUrl ? 'Upload an image' : credits < cost ? 'Not enough credits' : 'Create Video'}
              </button>
              <div className="cs-gen-info">
                <b>{cost} credits</b>
                {credits} remaining
              </div>
            </div>

            {/* Recent Gallery */}
            {videos.filter(function(v) { return v.status === 'completed' && v.video_url; }).length > 0 && <div className="cs-recent">
              <div className="cs-recent-label">Recent</div>
              <div className="cs-recent-grid">
                {videos.filter(function(v) { return v.status === 'completed' && v.video_url; }).slice(0, 10).map(function(v) {
                  return <div key={v.id} className="cs-recent-thumb" onClick={function() { setVideoUrl(v.video_url); setGenStatus('done'); }}>
                    <video src={v.video_url} muted preload="metadata"/>
                  </div>;
                })}
              </div>
            </div>}

            {/* Credit Matrix Earnings Banner */}
            <div className="cs-matrix-banner">
              <div className="cs-matrix-banner-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#8b5cf6"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#a78bfa"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#a78bfa"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#8b5cf6"/>
                </svg>
              </div>
              <div className="cs-matrix-banner-text">
                <div className="cs-matrix-banner-title">Earn commissions from every credit pack sale</div>
                <div className="cs-matrix-banner-desc">When your referrals buy credits, they enter your 3×3 Credit Matrix — earning you level commissions and completion bonuses automatically.</div>
              </div>
              <a href="/credit-matrix" className="cs-matrix-banner-link">View Credit Matrix →</a>
            </div>

          </>}

          {/* ═══ PLACEHOLDER TABS ═══ */}
          {tab === 'full-video' && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>🎬</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Full Video Creator</div>
            <div style={{ fontSize: 14 }}>End-to-end AI video production — coming next</div>
          </div>}

          {tab === 'images' && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>🖼️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI Image Generator</div>
            <div style={{ fontSize: 14 }}>Generate stunning images with AI — coming next</div>
          </div>}

          {tab === 'music' && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>🎵</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI Music Generator</div>
            <div style={{ fontSize: 14 }}>Create original music tracks with Suno — coming next</div>
          </div>}

          {tab === 'voiceover' && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>🎙️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI Voiceover</div>
            <div style={{ fontSize: 14 }}>Professional voiceovers in 30+ voices — coming next</div>
          </div>}

          {tab === 'lip-sync' && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>👄</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI Lip Sync</div>
            <div style={{ fontSize: 14 }}>Sync any voice to any video — coming next</div>
          </div>}

          {tab === 'gallery' && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>📁</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Your Gallery</div>
            <div style={{ fontSize: 14 }}>All your generated content in one place — coming next</div>
          </div>}

          {/* ═══ CREDITS TAB — embedded Credit Matrix ═══ */}
          {tab === 'credits' && <CreditMatrixContent />}

        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  );
}
