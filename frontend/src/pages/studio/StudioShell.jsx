import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './studio.css';

/* studio shell — build bump 2 (fresh content hash to sidestep a CF-cached 404) */
const THEME_KEY = 'sap-studio-theme';

/* Small inline icon set (stroke-based, inherit currentColor) */
const I = {
  chev:   <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>,
  grid:   <svg className="home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  bolt:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  video:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  image:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  gallery:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  moon:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>,
  sun:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>,
  gear:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  t2v:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>,
};

const TOOLS = [
  { key: 'video',  label: 'Video Clips',   icon: I.video },
  { key: 'images', label: 'Poster Images', icon: I.image },
  { key: 'gallery',label: 'Gallery',       icon: I.gallery },
];

const MOTIONS = ['Tracking','Zoom in','Pan left','Orbit','Crane up','Static','Handheld'];

export default function StudioShell() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
  });
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} }, [theme]);

  const [tool, setTool] = useState('video');
  const [credits, setCredits] = useState(null);

  // Local Video Clips control state (visual in stage 1; wired in stage 2)
  const [mode, setMode]     = useState('text');     // 'text' | 'image'
  const [motion, setMotion] = useState('Tracking');
  const [aspect, setAspect] = useState('9:16');
  const [length, setLength] = useState('10s');
  const [res, setRes]       = useState('720p');
  const [audio, setAudio]   = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/superscene/credits')
      .then(r => r.json())
      .then(d => { if (alive) setCredits(typeof d.balance === 'number' ? d.balance : 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const goDashboard = useCallback(() => navigate('/dashboard'), [navigate]);

  const fmt = (n) => (n == null ? '—' : n.toLocaleString());

  return (
    <div className="studio-shell" data-theme={theme} data-build="s1b">

      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="leftnav">
          <button className="dashbtn" onClick={goDashboard} title="Back to your dashboard">
            {I.chev}{I.grid}Dashboard
          </button>
          <div className="vdiv" />
          <div className="brand" onClick={goDashboard} title="SuperAdPro Studio">
            <div className="mark">{I.bolt}</div>
            <div className="wm"><b>SUPERADPRO</b> <span>STUDIO</span></div>
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
          <div className="credits" title="Credit balance — top-up page coming next">
            <span className="dot" /><b>{fmt(credits)}</b><span>credits</span><span className="plus">+</span>
          </div>
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

            <div className="field">
              <label>Prompt</label>
              <textarea placeholder="Describe the clip — subject, setting, lighting, motion…" />
            </div>

            <div className="field">
              <label>Motion</label>
              <div className="chips">
                {MOTIONS.map(m => (
                  <div key={m} className={'chip' + (motion === m ? ' on' : '')} onClick={() => setMotion(m)}>{m}</div>
                ))}
              </div>
            </div>

            <div className="row2">
              <div className="mini">
                <label>Aspect</label>
                <div className="pillset">
                  {['9:16','1:1','16:9'].map(a => <button key={a} className={aspect === a ? 'on' : ''} onClick={() => setAspect(a)}>{a}</button>)}
                </div>
              </div>
              <div className="mini">
                <label>Length</label>
                <div className="pillset">
                  {['5s','10s','15s'].map(l => <button key={l} className={length === l ? 'on' : ''} onClick={() => setLength(l)}>{l}</button>)}
                </div>
              </div>
            </div>

            <div className="mini">
              <label>Resolution</label>
              <div className="pillset" style={{ maxWidth: 170 }}>
                {['480p','720p'].map(r => <button key={r} className={res === r ? 'on' : ''} onClick={() => setRes(r)}>{r}</button>)}
              </div>
            </div>

            <div className="toggle">
              <div><div className="tl">Native audio</div><div className="ts">Sound + voice generated in one pass</div></div>
              <div className={'sw' + (audio ? '' : ' off')} onClick={() => setAudio(a => !a)} role="switch" aria-checked={audio} />
            </div>

            <button className="gen" disabled>{I.bolt}Generate clip<span className="cost">8 cr</span></button>
            <div className="stagenote">Live generation comes online in the next update.</div>
          </section>

          {/* canvas */}
          <section className="canvas">
            <div className="stagewrap">
              <div className="eyebrow"><span className="lbl">Latest generation</span><span className="line" /></div>
              <div className="stage">
                <div className="empty">
                  <div className="ei">{I.video}</div>
                  <h4>Your clips will appear here</h4>
                  <p>Generate a clip and it plays right here, with audio.</p>
                </div>
              </div>
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
