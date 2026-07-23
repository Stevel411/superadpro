import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './studio.css';

/* studio shell — stage 2 (live Video Clips generation via Grok Imagine) */
const THEME_KEY = 'sap-studio-theme';

const I = {
  chev:   <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>,
  grid:   <svg className="home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  bolt:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  play:   <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  plus:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  video:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  image:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  gallery:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  moon:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>,
  sun:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>,
  gear:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  t2v:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>,
  up:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>,
  close:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  dl:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>,
  warn:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>,
};

const TOOLS = [
  { key: 'video',  label: 'Video Clips',   icon: I.video },
  { key: 'images', label: 'Poster Images', icon: I.image },
  { key: 'gallery',label: 'Gallery',       icon: I.gallery },
];

const MOTIONS = ['Tracking','Zoom in','Pan left','Orbit','Crane up','Static','Handheld'];
const MOTION_PHRASE = {
  'Tracking':'tracking shot', 'Zoom in':'slow push-in zoom', 'Pan left':'smooth pan left',
  'Orbit':'orbiting camera move', 'Crane up':'crane-up reveal', 'Static':'static locked-off shot',
  'Handheld':'subtle handheld movement',
};

const COST_PER_SEG = 4;
const segCount = (len) => Math.max(1, Math.ceil(parseInt(len, 10) / 5));

// Aspect ratios labelled by the social formats they suit (all Grok-supported).
const FORMATS = [
  { ratio: '9:16', title: 'Reels & Stories', platforms: 'TikTok · Reels · Stories · Shorts', ar: '9 / 16', num: 0.5625, shape: 'sp-v' },
  { ratio: '1:1',  title: 'Square post',     platforms: 'Instagram · Facebook feed',         ar: '1 / 1',  num: 1,      shape: 'sp-s' },
  { ratio: '16:9', title: 'Landscape',       platforms: 'YouTube · X · LinkedIn',            ar: '16 / 9', num: 1.7778, shape: 'sp-h' },
];

export default function StudioShell() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
  });
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} }, [theme]);

  const [tool, setTool] = useState('video');
  const [credits, setCredits] = useState(null);

  // Video Clips controls
  const [mode, setMode]     = useState('text');     // 'text' | 'image'
  const [prompt, setPrompt] = useState('');
  const [motion, setMotion] = useState('Tracking');
  const [aspect, setAspect] = useState('9:16');
  const [clipAspect, setClipAspect] = useState('9:16');
  const [length, setLength] = useState('10s');
  const [res, setRes]       = useState('720p');
  const [audio, setAudio]   = useState(true);

  // Image → Video
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl]         = useState(null);
  const [uploading, setUploading]       = useState(false);
  const fileRef = useRef(null);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus]   = useState('idle'); // idle|pending|done|failed
  const [genProgress, setGenProgress] = useState(0);
  const [videoUrl, setVideoUrl]     = useState(null);
  const [errMsg, setErrMsg]         = useState(null);
  const pollRef = useRef(null);
  const fakeProgRef = useRef(null);
  const genTokenRef = useRef(null);

  const refreshCredits = useCallback(() => {
    fetch('/api/superscene/credits').then(r => r.json())
      .then(d => { if (typeof d.balance === 'number') setCredits(d.balance); }).catch(() => {});
  }, []);

  useEffect(() => { refreshCredits(); }, [refreshCredits]);
  useEffect(() => () => { [pollRef, fakeProgRef].forEach(r => r.current && clearInterval(r.current)); }, []);

  const goDashboard = useCallback(() => navigate('/dashboard'), [navigate]);
  const goBuy = useCallback(() => navigate('/tools'), [navigate]);

  const fmt = (n) => (n == null ? '—' : n.toLocaleString());
  const cost = segCount(length) * COST_PER_SEG;
  const activeAspect = videoUrl ? clipAspect : aspect;
  const stageFmt = FORMATS.find(f => f.ratio === activeAspect) || FORMATS[2];

  const finishError = useCallback((msg) => {
    if (fakeProgRef.current) clearInterval(fakeProgRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    setGenerating(false); setGenStatus('failed'); setErrMsg(msg);
  }, []);

  const startPolling = useCallback((tid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetch('/api/superscene/status/' + tid).then(r => r.json()).then(d => {
        if (d.status === 'completed' && d.video_url) {
          clearInterval(pollRef.current);
          if (fakeProgRef.current) clearInterval(fakeProgRef.current);
          setVideoUrl(d.video_url); setGenStatus('done'); setGenProgress(100); setGenerating(false);
          refreshCredits();
        } else if (d.status === 'failed') {
          clearInterval(pollRef.current);
          if (fakeProgRef.current) clearInterval(fakeProgRef.current);
          setGenerating(false); setGenStatus('failed');
          setErrMsg(d.error || 'Generation failed — your credits were refunded.');
          refreshCredits();
        }
      }).catch(() => { /* transient poll hiccup — keep polling */ });
    }, 3000);
  }, [refreshCredits]);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null); setUploading(true); setErrMsg(null);
    const fd = new FormData(); fd.append('file', file);
    fetch('/api/superscene/upload-image', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.file_url) setImageUrl(d.file_url);
        else { setErrMsg(d.detail || 'Image upload failed — try a different image.'); setImagePreview(null); }
        setUploading(false);
      })
      .catch(() => { setUploading(false); setImagePreview(null); setErrMsg('Image upload failed — check your connection and try again.'); });
  }, []);

  const clearImage = useCallback(() => {
    setImagePreview(null); setImageUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const canGen = !generating && !uploading && (mode === 'text' ? prompt.trim().length > 0 : !!imageUrl);

  const generate = useCallback(() => {
    const p = prompt.trim();
    if (generating || uploading) return;
    if (mode === 'text' && !p) return;
    if (mode === 'image' && !imageUrl) return;
    if (credits != null && credits < cost) {
      finishError('You need ' + cost + ' credits for this clip. Tap Buy to top up.');
      return;
    }

    setGenerating(true); setVideoUrl(null); setErrMsg(null); setGenStatus('pending'); setGenProgress(0);
    setClipAspect(aspect);
    if (fakeProgRef.current) clearInterval(fakeProgRef.current);
    fakeProgRef.current = setInterval(() => {
      setGenProgress(pr => (pr >= 90 ? pr : pr + Math.random() * 2 + 0.6));
    }, 450);

    const phrase = MOTION_PHRASE[motion] || '';
    const finalPrompt = phrase ? (phrase + '. ' + p) : p;

    if (!genTokenRef.current) {
      genTokenRef.current = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ('t-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    }

    const payload = {
      model_key: 'grok-video',
      prompt: finalPrompt,
      duration: parseInt(length, 10),
      ratio: aspect,
      resolution: res,
      generate_audio: audio,
      client_token: genTokenRef.current,
    };
    if (mode === 'image' && imageUrl) payload.image_urls = [imageUrl];

    fetch('/api/superscene/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
      .then(r => r.text().then(body => ({ status: r.status, ctype: r.headers.get('content-type') || '', body })))
      .then(res2 => {
        let data = null; try { data = JSON.parse(res2.body); } catch (e) { data = null; }
        if (data === null) {
          // HTTP response, but not JSON — an edge/gateway error page, not a backend reply.
          genTokenRef.current = null;
          finishError('Service error (HTTP ' + res2.status + '). Please try again in a moment.');
          return;
        }
        if (data.task_id) {
          genTokenRef.current = null;
          if (typeof data.credits_remaining === 'number') setCredits(data.credits_remaining);
          startPolling(data.task_id);
        } else {
          genTokenRef.current = null;
          if (typeof data.credits_remaining === 'number') setCredits(data.credits_remaining);
          finishError(data.detail || data.error || ('Generation failed (HTTP ' + res2.status + ').'));
        }
      })
      .catch(() => {
        // fetch() itself rejected — keep the token so a retry stays idempotent (never double-charged).
        finishError('Connection dropped before the server responded — tap Generate to retry safely.');
      });
  }, [prompt, generating, uploading, mode, imageUrl, credits, cost, motion, length, aspect, res, audio, startPolling, finishError]);

  const newClip = useCallback(() => { setVideoUrl(null); setGenStatus('idle'); setGenProgress(0); setErrMsg(null); }, []);

  return (
    <div className="studio-shell" data-theme={theme} data-build="s2">

      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="leftnav">
          <button className="dashbtn" onClick={goDashboard} title="Back to your dashboard">
            {I.chev}{I.grid}Dashboard
          </button>
          <div className="vdiv" />
          <div className="brand" onClick={goDashboard} title="AdvantageLife Studio">
            <div className="mark">{I.play}</div>
            <div className="wm">SuperAd<b>Pro</b><span>Studio</span></div>
          </div>
        </div>

        <nav className="tools">
          {TOOLS.map(t => (
            <button key={t.key} className={'tool' + (tool === t.key ? ' on' : '')} onClick={() => setTool(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        <div className="rightbar">
          <button className="credits" onClick={goBuy} title="Buy credits">
            <span className="dot" /><b>{fmt(credits)}</b><span>credits</span>
            <span className="buy">{I.plus}Buy</span>
          </button>
          <div className="ttoggle" role="group" aria-label="Theme">
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} title="Dark">{I.moon}</button>
            <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')} title="Light">{I.sun}</button>
          </div>
          <div className="avatar">S</div>
          <button className="iconbtn" title="Brand kit & settings">{I.gear}</button>
        </div>
      </header>

      {/* ── WORKSPACE ── */}
      {tool === 'video' ? (
        <main className="work">
          {/* control panel */}
          <section className="panel">
            <div className="toolhead">
              <h1>Video Clips</h1>
              <p>Generate a short ad clip from a prompt or an image.</p>
            </div>
            <div className="engine"><span className="pulse" />GROK IMAGINE · NATIVE AUDIO</div>

            <div className="seg">
              <button className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>{I.t2v}Text → Video</button>
              <button className={mode === 'image' ? 'on' : ''} onClick={() => setMode('image')}>{I.image}Image → Video</button>
            </div>

            {mode === 'image' && (
              <div className="field">
                <label>Source image</label>
                {imagePreview ? (
                  <div className="thumb">
                    <img src={imagePreview} alt="source" />
                    <button className="rm" onClick={clearImage} title="Remove">{I.close}</button>
                    <span className="st">{uploading ? 'Uploading…' : (imageUrl ? 'Ready' : 'Failed')}</span>
                  </div>
                ) : (
                  <div className="drop" onClick={() => fileRef.current && fileRef.current.click()}>
                    <div className="di">{I.up}</div>
                    <div><div className="dt">Upload an image</div><div className="ds">PNG or JPG · it becomes the first frame</div></div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
              </div>
            )}

            <div className="field">
              <label>Prompt</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder={mode === 'image' ? 'Describe the motion and action you want…' : 'Describe the clip — subject, setting, lighting, motion…'} />
            </div>

            <div className="field">
              <label>Motion</label>
              <div className="chips">
                {MOTIONS.map(m => (
                  <div key={m} className={'chip' + (motion === m ? ' on' : '')} onClick={() => setMotion(m)}>{m}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Format</label>
              <div className="formatlist">
                {FORMATS.map(f => (
                  <button key={f.ratio} className={'fmt' + (aspect === f.ratio ? ' on' : '')} onClick={() => setAspect(f.ratio)}>
                    <span className={'fmt-shape ' + f.shape} />
                    <span className="fmt-txt"><b>{f.title}</b><i>{f.platforms}</i></span>
                    <span className="fmt-ar">{f.ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="row2">
              <div className="mini">
                <label>Length</label>
                <div className="pillset">
                  {['5s','10s','15s'].map(l => <button key={l} className={length === l ? 'on' : ''} onClick={() => setLength(l)}>{l}</button>)}
                </div>
              </div>
              <div className="mini">
                <label>Resolution</label>
                <div className="pillset">
                  {['480p','720p'].map(r => <button key={r} className={res === r ? 'on' : ''} onClick={() => setRes(r)}>{r}</button>)}
                </div>
              </div>
            </div>

            <div className="toggle">
              <div><div className="tl">Native audio</div><div className="ts">Sound + voice generated in one pass</div></div>
              <div className={'sw' + (audio ? '' : ' off')} onClick={() => setAudio(a => !a)} role="switch" aria-checked={audio} />
            </div>

            <button className="gen" onClick={generate} disabled={!canGen}>
              {I.bolt}{generating ? 'Generating…' : (uploading ? 'Preparing image…' : 'Generate clip')}
              <span className="cost">{cost} cr</span>
            </button>
          </section>

          {/* canvas */}
          <section className="canvas">
            <div className="stagewrap">
              <div className="eyebrow"><span className="lbl">Latest generation</span><span className="line" /></div>
              <div className="stage" style={{ aspectRatio: stageFmt.ar, maxWidth: 'calc((100vh - 240px) * ' + stageFmt.num + ')', maxHeight: 'calc(100vh - 240px)' }}>
                {videoUrl ? (
                  <video className="vid" src={videoUrl} controls autoPlay loop playsInline />
                ) : generating ? (
                  <div className="gen-live">
                    <div className="spinner" />
                    <h4>Generating your clip…</h4>
                    <p>{genStatus === 'pending' && genProgress < 8 ? 'Sending to Grok Imagine' : 'Rendering frames'} · {Math.round(genProgress)}%</p>
                    <div className="genbar"><span style={{ width: genProgress + '%' }} /></div>
                    <p className="hint">Usually 30–90 seconds. Keep this tab open.</p>
                  </div>
                ) : genStatus === 'failed' ? (
                  <div className="empty err">
                    <div className="ei err">{I.warn}</div>
                    <h4>Couldn’t generate that clip</h4>
                    <p>{errMsg}</p>
                  </div>
                ) : (
                  <div className="empty">
                    <div className="ei">{I.video}</div>
                    <h4>Your clips will appear here</h4>
                    <p>Generate a clip and it plays right here, with audio.</p>
                  </div>
                )}
              </div>
              {videoUrl && (
                <div className="vidactions">
                  <a className="va-btn primary" href={videoUrl} target="_blank" rel="noreferrer">{I.dl}Download</a>
                  <button className="va-btn" onClick={newClip}>New clip</button>
                </div>
              )}
            </div>
          </section>
        </main>
      ) : (
        <main className="work" style={{ gridTemplateColumns: '1fr' }}>
          <section className="canvas">
            <div className="placeholder">
              <div>
                <div className="pi">{tool === 'images' ? I.image : I.gallery}</div>
                <h3>{tool === 'images' ? 'Poster Images' : 'Gallery'}</h3>
                <p>{tool === 'images'
                  ? 'AI ad poster images — moving into this shell in the next build stage.'
                  : 'Every clip and poster you generate, in one place — coming next.'}</p>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
