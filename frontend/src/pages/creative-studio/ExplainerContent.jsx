import { useState, useEffect, useRef, useCallback } from 'react';

// ── Explainer Video — guided 5-step wizard (Creative Studio tab) ──
// Wired to the live pipeline + catalog endpoints:
//   GET  /api/superscene/explainer/catalog        (voices, styles, defaults)
//   GET  /api/superscene/credits                  ({balance})
//   POST /api/superscene/pipeline/analyse         (brief|script -> scenes + estimates)
//   POST /api/superscene/pipeline/{id}/update-scene
//   POST /api/superscene/pipeline/{id}/generate   (final voice/style/quality/aspect)
//   GET  /api/superscene/pipeline/{id}/status     (poll progress + final video)
// Voice audition uses GET /api/superscene/voiceover/preview/{id} (free edge-tts).

const STEPS = ['Brief', 'Storyboard', 'Look & sound', 'Generate', 'Result'];
const STYLE_SWATCH = {
  cinematic:  'linear-gradient(135deg,#0a1438,#1e3a8a 60%,#0e7490)',
  corporate:  'linear-gradient(135deg,#e6edf8,#c7d6f0)',
  bold:       'linear-gradient(135deg,#0ea5e9,#22d3ee)',
  animated3d: 'linear-gradient(135deg,#1e3a8a,#06b6d4)',
  ugc:        'linear-gradient(135deg,#cdd6ea,#94a0c0)',
  whiteboard: 'linear-gradient(135deg,#ffffff,#e4e9f4)',
  futuristic: 'linear-gradient(135deg,#070f2b,#0e7490)',
  lifestyle:  'linear-gradient(135deg,#1e3a8a,#0ea5e9 70%,#fcd9b8)',
};

function Icon({ d, fill }) {
  return (
    <svg viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
}
const IC = {
  play:   <polygon points="6 4 20 12 6 20 6 4" />,
  check:  <polyline points="20 6 9 17 4 12" />,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  plus:   <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><polyline points="9 12 11 14 15 10" /></>,
  back:   <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
  next:   <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  dl:     <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  redo:   <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>,
  stop:   <rect x="6" y="6" width="12" height="12" rx="1" />,
};

export function ExplainerContent() {
  const [catalog, setCatalog] = useState(null);
  const [credits, setCredits] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // step 1
  const [mode, setMode] = useState('brief');
  const [brief, setBrief] = useState('');
  const [script, setScript] = useState('');
  const [length, setLength] = useState('~60 seconds');

  // pipeline state
  const [pid, setPid] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [estimates, setEstimates] = useState({ standard: 0, premium: 0 });

  // look & sound
  const [style, setStyle] = useState('cinematic');
  const [voice, setVoice] = useState('en-GB-SoniaNeural');
  const [quality, setQuality] = useState('premium');
  const [aspect, setAspect] = useState('16:9');

  // generation
  const [genScenes, setGenScenes] = useState([]);
  const [finalUrl, setFinalUrl] = useState(null);
  const [creditsUsed, setCreditsUsed] = useState(0);

  // audition
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetch('/api/superscene/explainer/catalog').then(r => r.json()).then(d => {
      setCatalog(d);
      if (d.defaults) {
        setStyle(d.defaults.style || 'cinematic');
        setVoice(d.defaults.voice || 'en-GB-SoniaNeural');
        setQuality(d.defaults.quality || 'premium');
        setAspect(d.defaults.aspect || '16:9');
      }
    }).catch(() => setError('Could not load voices & styles.'));
    refreshCredits();
    return () => { if (pollRef.current) clearInterval(pollRef.current); stopAudio(); };
  }, []);

  function refreshCredits() {
    fetch('/api/superscene/credits').then(r => r.json()).then(d => setCredits(d.balance || 0)).catch(() => {});
  }
  function stopAudio() {
    if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} audioRef.current = null; }
    setPlaying(null);
  }
  function audition(voiceId) {
    if (playing === voiceId) { stopAudio(); return; }
    stopAudio();
    const a = new Audio('/api/superscene/voiceover/preview/' + voiceId);
    a.onended = () => setPlaying(null);
    a.onerror = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audioRef.current = a;
    setPlaying(voiceId);
  }

  async function api(url, body) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.error || ('Request failed (' + res.status + ')'));
    return data;
  }

  // ── Step 1 → analyse ──
  async function runAnalyse() {
    setError('');
    const usingBrief = mode === 'brief';
    if (usingBrief && !brief.trim()) { setError('Add a brief first.'); return; }
    if (!usingBrief && !script.trim()) { setError('Paste a script first.'); return; }
    if (credits < 1) { setError('You need at least 1 credit to start.'); return; }
    setBusy(true);
    try {
      const payload = usingBrief
        ? { brief: brief.trim() + '\n\nTarget length: ' + length + '.', style, voice, quality, aspect }
        : { script: script.trim(), style, voice, quality, aspect };
      const d = await api('/api/superscene/pipeline/analyse', payload);
      setPid(d.pipeline_id);
      setScenes((d.scenes || []).map(s => ({
        scene_number: s.scene_number,
        narration_text: s.narration_text || '',
        visual_prompt: s.visual_prompt || '',
      })));
      if (d.estimates) setEstimates(d.estimates);
      if (d.credits_remaining !== undefined) setCredits(d.credits_remaining);
      setStep(1);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  // ── Step 2 → persist scene edits (no charge) ──
  async function saveScene(i) {
    if (!pid) return;
    const s = scenes[i];
    try {
      await api('/api/superscene/pipeline/' + pid + '/update-scene', {
        scene_number: s.scene_number,
        narration_text: s.narration_text,
        visual_prompt: s.visual_prompt,
      });
    } catch (e) { setError(e.message); }
  }
  function editScene(i, field, val) {
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  // ── Step 3 → confirm & generate ──
  async function runGenerate() {
    if (!pid) return;
    const cost = estimates[quality] || 0;
    if (credits < cost) { setError('Need ' + cost + ' credits, you have ' + credits + '.'); return; }
    setError(''); setBusy(true);
    try {
      const d = await api('/api/superscene/pipeline/' + pid + '/generate', { voice, style, quality, aspect });
      if (d.credits_used !== undefined) setCreditsUsed(d.credits_used);
      if (d.credits_remaining !== undefined) setCredits(d.credits_remaining);
      setStep(3);
      startPolling();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/superscene/pipeline/' + pid + '/status');
        const d = await res.json();
        setGenScenes(d.scenes || []);
        if (d.status === 'completed' && d.final_video_url) {
          clearInterval(pollRef.current);
          setFinalUrl(d.final_video_url);
          if (d.credits_used !== undefined) setCreditsUsed(d.credits_used);
          refreshCredits();
          setStep(4);
        } else if (d.status === 'failed') {
          clearInterval(pollRef.current);
          setError(d.error_message || 'Generation failed. Any failed scenes were refunded.');
          refreshCredits();
          setStep(2);
        }
      } catch (e) {}
    }, 4000);
  }, [pid]);

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep(0); setPid(null); setScenes([]); setGenScenes([]);
    setFinalUrl(null); setBrief(''); setScript(''); setError(''); setCreditsUsed(0);
  }

  if (!catalog) return <div className="expl"><div className="expl-loading">Loading the Explainer studio…</div></div>;

  const voices = catalog.voices || [];
  const styles = catalog.styles || [];
  const voicesByAccent = voices.reduce((m, v) => { (m[v.accent] = m[v.accent] || []).push(v); return m; }, {});
  const curVoice = voices.find(v => v.id === voice);
  const curStyle = styles.find(s => s.key === style);
  const cost = estimates[quality] || 0;
  const doneCount = genScenes.filter(s => s.status === 'completed').length;

  const next = () => {
    if (step === 0) return runAnalyse();
    if (step === 1) return setStep(2);
    if (step === 2) return runGenerate();
    if (step === 4) return reset();
  };
  const nextLabel = ['Continue', 'Set look & sound', 'Confirm & generate', 'Generating…', 'Start a new video'][step];

  return (
    <div className="expl">
      <style>{CSS}</style>

      <div className="expl-head">
        <h2>Explainer Video</h2>
        <p>Turn a brief into a finished, narrated explainer — scripted, storyboarded, and assembled for you.</p>
      </div>

      {/* Step rail */}
      <div className="expl-rail">
        {STEPS.map((label, i) => (
          <div key={i} className={'expl-step' + (i === step ? ' current' : i < step ? ' done' : '')}
               onClick={() => { if (i < step && step !== 3) setStep(i); }}>
            <div className="bub">{i < step ? <Icon d={IC.check} /> : (i + 1)}</div>
            <div className="lab">{label}</div>
            {i < STEPS.length - 1 && <div className="bar" />}
          </div>
        ))}
      </div>

      <div className="expl-work">
        <div className="expl-card">

          {/* STEP 1 — Brief / script */}
          {step === 0 && <div className="panel">
            <h3>Start with a brief or a script</h3>
            <p className="pd">Describe what you want and let Grok write the script — or paste your own.</p>
            <div className="seg">
              <button className={mode === 'brief' ? 'on' : ''} onClick={() => setMode('brief')}><Icon d={IC.pencil} /> Write a brief</button>
              <button className={mode === 'script' ? 'on' : ''} onClick={() => setMode('script')}>Paste a script</button>
            </div>
            {mode === 'brief' ? (
              <div className="field"><label>Your brief</label>
                <textarea value={brief} onChange={e => setBrief(e.target.value)}
                  placeholder="A 60-second explainer introducing my business to new customers — what it does, who it's for, and why they should care. Confident and upbeat, ending on a clear call to action." />
              </div>
            ) : (
              <div className="field"><label>Your script</label>
                <textarea value={script} onChange={e => setScript(e.target.value)}
                  placeholder="Paste the narration script you'd like turned into a video." />
              </div>
            )}
            <div className="field"><label>Length</label>
              <select value={length} onChange={e => setLength(e.target.value)}>
                <option>~30 seconds</option><option>~60 seconds</option><option>~90 seconds</option>
              </select>
            </div>
          </div>}

          {/* STEP 2 — Storyboard */}
          {step === 1 && <div className="panel">
            <h3>Review the storyboard</h3>
            <p className="pd">Grok broke your script into scenes. Edit any narration or visual before generating — no credits spent yet.</p>
            {scenes.map((s, i) => (
              <div className="scene" key={i}>
                <span className="tag">SCENE {s.scene_number}</span>
                <div className="sbody">
                  <textarea className="narr" rows={2} value={s.narration_text}
                    onChange={e => editScene(i, 'narration_text', e.target.value)} onBlur={() => saveScene(i)} />
                  <textarea className="vis" rows={2} value={s.visual_prompt} placeholder="Visual direction for this scene…"
                    onChange={e => editScene(i, 'visual_prompt', e.target.value)} onBlur={() => saveScene(i)} />
                </div>
              </div>
            ))}
          </div>}

          {/* STEP 3 — Look & sound */}
          {step === 2 && <div className="panel">
            <h3>Look &amp; sound</h3>
            <p className="pd">Pick the visual style and the voice. The estimate on the right updates live — nothing is charged until you confirm.</p>

            <label className="grp">Style</label>
            <div className="styles">
              {styles.map(s => (
                <div key={s.key} className={'style-tile' + (style === s.key ? ' on' : '')} onClick={() => setStyle(s.key)}>
                  <div className="sw" style={{ background: STYLE_SWATCH[s.key] || STYLE_SWATCH.cinematic }} />
                  <div className="st-lab">{s.label}</div>
                  <div className="st-desc">{s.desc}</div>
                </div>
              ))}
            </div>

            <label className="grp">Voice <span className="free">tap ▶ to hear — auditioning is free</span></label>
            <div className="voices">
              {Object.keys(voicesByAccent).map(acc => (
                <div key={acc} className="vgroup">
                  <div className="vacc">{acc}</div>
                  {voicesByAccent[acc].map(v => (
                    <div key={v.id} className={'voice' + (voice === v.id ? ' on' : '')} onClick={() => setVoice(v.id)}>
                      <button className="vplay" onClick={e => { e.stopPropagation(); audition(v.id); }}>
                        <Icon d={playing === v.id ? IC.stop : IC.play} fill />
                      </button>
                      <span className="vname">{v.name}</span>
                      <span className="vtone">{v.gender} · {v.tone}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="setrow"><span className="k">Quality</span>
              <div className="opts">
                <span className={'opt' + (quality === 'standard' ? ' on' : '')} onClick={() => setQuality('standard')}>Standard</span>
                <span className={'opt' + (quality === 'premium' ? ' on' : '')} onClick={() => setQuality('premium')}>Premium</span>
              </div>
            </div>
            <div className="setrow"><span className="k">Aspect ratio</span>
              <div className="opts">
                {['16:9', '9:16', '1:1'].map(a => (
                  <span key={a} className={'opt' + (aspect === a ? ' on' : '')} onClick={() => setAspect(a)}>{a}</span>
                ))}
              </div>
            </div>
          </div>}

          {/* STEP 4 — Generating */}
          {step === 3 && <div className="panel">
            <h3>Generating your explainer</h3>
            <p className="pd">Each scene is generated, narrated, and stitched together automatically. {doneCount}/{genScenes.length || scenes.length} scenes done.</p>
            {(genScenes.length ? genScenes : scenes).map((s, i) => {
              const st = s.status || 'queued';
              return (
                <div className="prog" key={i}>
                  <div className="ptop">
                    <span>Scene {s.scene_number}</span>
                    <span className={'pst' + (st === 'completed' ? ' ok' : st === 'failed' ? ' bad' : '')}>
                      {st === 'completed' ? '✓ done' : st === 'failed' ? '↺ refunded' : st === 'generating' ? 'generating…' : st === 'voiceover' ? 'narrating…' : 'queued'}
                    </span>
                  </div>
                  <div className="track"><div className="fill" style={{ width: st === 'completed' ? '100%' : st === 'generating' ? '62%' : st === 'voiceover' ? '30%' : '0%' }} /></div>
                </div>
              );
            })}
            <div className="guard"><Icon d={IC.shield} /><div>Each scene is charged only as it generates. <b>A scene that fails is automatically refunded</b> — you never pay for output you didn't get.</div></div>
          </div>}

          {/* STEP 5 — Result */}
          {step === 4 && <div className="panel">
            <h3>Your explainer is ready</h3>
            <p className="pd">Preview it, download it, or start another.</p>
            <div className="result">
              {finalUrl ? <video src={finalUrl} controls style={{ width: '100%', borderRadius: 12, background: '#000' }} /> : <div className="rprev" />}
            </div>
            <div className="ractions">
              {finalUrl && <a className="btn cyan" href={finalUrl} download><Icon d={IC.dl} /> Download</a>}
              <button className="btn" onClick={reset}><Icon d={IC.redo} /> Make another</button>
            </div>
            <div className="cnote">{creditsUsed} credits used · saved to your Creative Studio library · {credits} credits remaining.</div>
          </div>}

          {error && <div className="expl-err">{error}</div>}

          <div className="foot">
            {step > 0 && step !== 3 && step !== 4
              ? <button className="btn ghost" onClick={() => setStep(step - 1)}><Icon d={IC.back} /> Back</button>
              : <span />}
            {step !== 3 && <button className="btn primary" disabled={busy} onClick={next}>
              {busy ? 'Working…' : nextLabel}{step !== 4 && !busy && <Icon d={IC.next} />}
            </button>}
          </div>
        </div>

        {/* Right rail — Your video */}
        <aside className="expl-side">
          <h4>Your video</h4>
          <div className="rprev"><span className="fmt">{aspect}</span>
            <span className="rttl">{curStyle ? curStyle.label : 'Cinematic'} explainer</span></div>
          <div className="rsum">
            <div className="r"><span>Length</span><b>{length}</b></div>
            <div className="r"><span>Style</span><b>{curStyle ? curStyle.label : '—'}</b></div>
            <div className="r"><span>Voice</span><b>{curVoice ? curVoice.name : '—'}</b></div>
            <div className="r"><span>Quality</span><b style={{ textTransform: 'capitalize' }}>{quality}</b></div>
            <div className="r"><span>Format</span><b>{aspect}</b></div>
          </div>
          <div className="rcost">
            <div className="row"><span>{step >= 4 ? 'Credits used' : 'Estimated cost'}</span>
              <span className="big">{step >= 4 ? creditsUsed : cost} cr</span></div>
            <div className="row"><span>{step >= 3 ? 'Balance' : 'Balance after'}</span>
              <span className="bal">{step >= 3 ? credits : Math.max(0, credits - cost)}</span></div>
            {step < 3 && <div className="rnote"><Icon d={IC.shield} /> Charged only when you confirm</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.expl{ --co:#0a1438; --co2:#1e3a8a; --cy:#06b6d4; --cy2:#0ea5e9; --cyb:#22d3ee; --cyd:#0e7490;
  --ink:#0a1438; --inks:#26345c; --mut:#64739a; --faint:#94a0c0; --line:#e4e9f4; --soft:#eef1f8;
  font-family:'DM Sans',sans-serif; color:var(--ink); max-width:1080px; margin:0 auto; }
.expl svg{ width:1em; height:1em; }
.expl h2,.expl h3,.expl h4{ font-family:'Sora',sans-serif; }
.expl-loading{ padding:60px; text-align:center; color:var(--mut); font-weight:600; }
.expl-head h2{ margin:0 0 2px; font-size:24px; font-weight:700; letter-spacing:-.5px; }
.expl-head p{ margin:0 0 22px; color:var(--mut); font-size:14px; }

.expl-rail{ display:flex; margin:0 0 22px; }
.expl-step{ flex:1; display:flex; flex-direction:column; align-items:center; gap:7px; position:relative; text-align:center; cursor:default; }
.expl-step .bub{ width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background:#fff; border:2px solid var(--line); color:var(--faint); font-weight:700; font-family:'Sora'; font-size:13px; z-index:2; }
.expl-step .bub svg{ width:15px; height:15px; }
.expl-step .lab{ font-size:12px; color:var(--faint); font-weight:600; }
.expl-step .bar{ position:absolute; top:16px; left:50%; width:100%; height:2px; background:var(--line); z-index:1; }
.expl-step.done .bub{ background:var(--co2); border-color:var(--co2); color:#fff; }
.expl-step.done .bar{ background:var(--co2); } .expl-step.done .lab{ color:var(--inks); } .expl-step.done{ cursor:pointer; }
.expl-step.current .bub{ background:linear-gradient(135deg,var(--cy2),var(--cyb)); border-color:transparent; color:var(--co); box-shadow:0 0 0 5px rgba(34,211,238,.16); }
.expl-step.current .lab{ color:var(--co2); font-weight:700; }

.expl-work{ display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:22px; align-items:start; }
.expl-card{ background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 8px 24px rgba(10,20,56,.06); padding:22px 24px; }
.panel h3{ font-size:18px; font-weight:600; margin:0 0 3px; }
.panel .pd{ color:var(--mut); font-size:13.5px; margin:0 0 18px; }

.seg{ display:inline-flex; background:var(--soft); border-radius:11px; padding:4px; gap:4px; margin-bottom:16px; }
.seg button{ border:0; background:transparent; font-family:'DM Sans'; font-size:13px; font-weight:600; color:var(--mut); padding:8px 15px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px; }
.seg button svg{ width:14px; height:14px; } .seg button.on{ background:#fff; color:var(--co2); box-shadow:0 1px 3px rgba(10,20,56,.1); }
.expl textarea,.expl select,.expl input{ font-family:'DM Sans'; font-size:14px; color:var(--ink); border:1px solid var(--line); border-radius:11px; background:#fff; padding:11px 13px; width:100%; }
.expl textarea{ resize:vertical; min-height:90px; line-height:1.55; }
.expl textarea:focus,.expl select:focus,.expl input:focus{ outline:none; border-color:var(--cy); box-shadow:0 0 0 3px rgba(6,182,212,.14); }
.field{ margin-bottom:14px; } .field>label{ display:block; font-size:12px; font-weight:600; color:var(--inks); margin-bottom:6px; }
.grp{ display:block; font-size:12px; font-weight:700; color:var(--inks); margin:18px 0 10px; text-transform:uppercase; letter-spacing:.6px; }
.grp .free{ text-transform:none; letter-spacing:0; color:var(--faint); font-weight:500; margin-left:8px; }

.scene{ display:flex; gap:12px; padding:13px 0; border-top:1px solid var(--soft); }
.scene:first-of-type{ border-top:0; }
.scene .tag{ flex:0 0 auto; font-family:'JetBrains Mono'; font-size:10px; font-weight:600; color:var(--cyd); background:rgba(6,182,212,.09); border:1px solid rgba(6,182,212,.18); padding:5px 8px; border-radius:7px; height:fit-content; }
.scene .sbody{ flex:1; min-width:0; display:flex; flex-direction:column; gap:7px; }
.scene .narr{ font-weight:500; min-height:auto; }
.scene .vis{ font-size:12.5px; color:var(--mut); min-height:auto; line-height:1.5; }

.styles{ display:grid; grid-template-columns:repeat(4,1fr); gap:9px; }
.style-tile{ border:1.5px solid var(--line); border-radius:11px; padding:7px; cursor:pointer; transition:.12s; background:#fff; }
.style-tile.on{ border-color:var(--cy); box-shadow:0 0 0 3px rgba(6,182,212,.12); }
.style-tile .sw{ height:46px; border-radius:7px; margin-bottom:7px; }
.style-tile .st-lab{ font-size:12.5px; font-weight:700; color:var(--ink); }
.style-tile .st-desc{ font-size:10.5px; color:var(--mut); line-height:1.3; margin-top:1px; }

.voices{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px 18px; }
.vgroup .vacc{ font-size:10.5px; font-weight:700; color:var(--faint); text-transform:uppercase; letter-spacing:.6px; margin-bottom:5px; }
.voice{ display:flex; align-items:center; gap:9px; padding:7px 9px; border:1px solid var(--line); border-radius:9px; cursor:pointer; margin-bottom:5px; transition:.12s; }
.voice.on{ border-color:var(--cy); background:rgba(6,182,212,.05); }
.vplay{ flex:0 0 auto; width:26px; height:26px; border-radius:50%; border:0; background:linear-gradient(135deg,var(--cy2),var(--cy)); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.vplay svg{ width:12px; height:12px; }
.vname{ font-size:13px; font-weight:600; color:var(--ink); } .vtone{ font-size:11px; color:var(--mut); margin-left:auto; }

.setrow{ display:flex; align-items:center; justify-content:space-between; padding:13px 0; border-top:1px solid var(--soft); margin-top:8px; }
.setrow .k{ font-size:14px; font-weight:600; color:var(--inks); }
.opts{ display:flex; gap:7px; } .opt{ font-size:13px; font-weight:600; color:var(--mut); background:#fff; border:1px solid var(--line); border-radius:9px; padding:7px 14px; cursor:pointer; }
.opt.on{ background:var(--co2); border-color:var(--co2); color:#fff; }

.prog{ padding:11px 0; border-top:1px solid var(--soft); } .prog:first-child{ border-top:0; }
.prog .ptop{ display:flex; justify-content:space-between; font-size:13.5px; }
.prog .pst{ font-size:12px; color:var(--mut); font-weight:600; } .prog .pst.ok{ color:#0e9f6e; } .prog .pst.bad{ color:var(--cyd); }
.track{ height:6px; background:var(--soft); border-radius:5px; margin-top:8px; overflow:hidden; }
.fill{ height:100%; border-radius:5px; background:linear-gradient(90deg,var(--cy2),var(--cyb)); transition:width .4s; }
.guard{ display:flex; gap:9px; margin-top:16px; padding:12px 14px; background:rgba(6,182,212,.06); border:1px solid rgba(6,182,212,.16); border-radius:11px; font-size:12.5px; color:var(--cyd); }
.guard svg{ width:17px; height:17px; flex:0 0 auto; margin-top:1px; } .guard b{ color:var(--co2); }

.result video{ display:block; } .ractions{ display:flex; gap:9px; margin-top:14px; }
.cnote{ font-size:12.5px; color:var(--mut); margin-top:12px; }

.expl-err{ margin-top:16px; padding:11px 14px; border-radius:10px; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; font-size:13px; font-weight:500; }

.foot{ display:flex; align-items:center; justify-content:space-between; margin-top:20px; }
.btn{ font-family:'DM Sans'; font-weight:600; font-size:14px; border-radius:11px; padding:11px 20px; cursor:pointer; border:1px solid var(--line); background:#fff; color:var(--inks); display:inline-flex; align-items:center; gap:8px; text-decoration:none; }
.btn svg{ width:15px; height:15px; } .btn.ghost{ background:transparent; } .btn:disabled{ opacity:.55; cursor:default; }
.btn.primary{ border:0; color:#fff; background:linear-gradient(135deg,var(--co2),var(--cyd)); box-shadow:0 6px 18px rgba(14,116,144,.26); }
.btn.cyan{ border:0; color:#fff; background:linear-gradient(135deg,var(--cy2),var(--cy)); }

.expl-side{ position:sticky; top:20px; background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 8px 24px rgba(10,20,56,.06); padding:18px; }
.expl-side h4{ margin:0 0 14px; font-size:11.5px; text-transform:uppercase; letter-spacing:1.2px; color:var(--faint); font-weight:600; }
.rprev{ position:relative; border-radius:12px; overflow:hidden; aspect-ratio:16/9; background:linear-gradient(135deg,#0a1438,#1e3a8a 60%,#0e7490); display:flex; align-items:flex-end; padding:10px; margin-bottom:14px; }
.rprev .fmt{ position:absolute; top:9px; right:9px; font-family:'JetBrains Mono'; font-size:10px; font-weight:600; color:#0a1438; background:var(--cyb); padding:3px 7px; border-radius:6px; }
.rprev .rttl{ color:#fff; font-family:'Sora'; font-weight:600; font-size:12px; text-shadow:0 1px 6px rgba(0,0,0,.4); }
.rsum .r{ display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid var(--soft); font-size:13px; }
.rsum .r:first-child{ border-top:0; } .rsum .r span{ color:var(--mut); } .rsum .r b{ color:var(--inks); font-weight:600; }
.rcost{ border-top:1px solid var(--line); padding-top:13px; margin-top:6px; display:flex; flex-direction:column; gap:8px; }
.rcost .row{ display:flex; justify-content:space-between; align-items:baseline; font-size:13px; } .rcost .row span:first-child{ color:var(--mut); }
.rcost .big{ font-family:'JetBrains Mono'; font-size:21px; font-weight:600; color:var(--cyd); }
.rcost .bal{ font-family:'JetBrains Mono'; font-weight:600; color:var(--inks); }
.rcost .rnote{ font-size:11.5px; color:var(--faint); display:flex; align-items:center; gap:6px; } .rcost .rnote svg{ width:13px; height:13px; color:var(--cy); }

@media(max-width:880px){ .expl-work{ grid-template-columns:1fr; } .expl-side{ position:static; } .styles{ grid-template-columns:repeat(2,1fr); } .voices{ grid-template-columns:1fr; } }
`;

export default ExplainerContent;
