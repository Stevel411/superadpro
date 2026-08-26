import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import { useAuth } from '../hooks/useAuth';

// ── Sales Pages hub ─────────────────────────────────────────────────
// Built 4 Aug 2026. One place where a member picks a page, picks a look,
// and copies the link. Every link carries their username so referrals
// auto-credit. The sales page ships in three themes (light default, dark,
// bold) via the ?t= param on /ref/<username> — light stays the default so
// links already shared keep working.

const CSS = `
.al .sphero{background:linear-gradient(135deg,#0a1f52 0%,#12388f 100%);border-radius:22px;padding:clamp(26px,3.4vw,38px);color:#fff;position:relative;overflow:hidden;margin-bottom:8px}
.al .sphero::after{content:'';position:absolute;top:0;right:0;width:240px;height:100%;background:radial-gradient(circle at 80% 20%,rgba(255,39,67,.35),transparent 60%)}
.al .sphero .k{font-size:11.5px;font-weight:800;letter-spacing:.2em;color:#8fa6da}
.al .sphero h1{font-size:clamp(28px,4vw,40px);font-weight:900;letter-spacing:-1.2px;margin:8px 0 0}
.al .sphero p{font-size:15.5px;font-weight:500;color:#c3cfe9;margin-top:10px;max-width:62ch;line-height:1.55;position:relative}
.al .spseclabel{font-size:12px;font-weight:900;letter-spacing:.16em;color:#5a6584;margin:28px 4px 14px}
.al .spgrid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:780px){.al .spgrid{grid-template-columns:1fr 1fr}.al .spgrid .feat{grid-column:1/-1}}
.al .spcard{background:#fff;border:1.5px solid #e7ebf6;border-radius:16px;padding:22px 22px 20px;box-shadow:0 18px 40px -30px rgba(10,31,82,.5);display:flex;flex-direction:column}
.al .spcard .top{display:flex;align-items:flex-start;gap:14px}
.al .spic{width:44px;height:44px;flex:none;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#eef3fd}
.al .spic svg{width:22px;height:22px;stroke:#12388f;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.al .spcard h3{font-size:19px;font-weight:900;letter-spacing:-.4px;color:#0a1f52}
.al .spcard .badge{display:inline-block;margin-left:8px;font-size:10px;font-weight:900;letter-spacing:.08em;color:#fff;background:#c8102e;border-radius:6px;padding:3px 7px;vertical-align:middle}
.al .spcard p{font-size:14px;font-weight:500;color:#5a6584;line-height:1.5;margin-top:4px}
.al .spthemes{display:flex;gap:10px;margin-top:18px}
.al .sptheme{flex:1;border:2px solid #e7ebf6;border-radius:12px;padding:8px;cursor:pointer;text-align:center;transition:.15s;background:none}
.al .sptheme.on{border-color:#c8102e;box-shadow:0 0 0 3px rgba(200,16,46,.12)}
.al .spthumb{border-radius:9px;overflow:hidden;border:1px solid #e7ebf6;line-height:0;background:#f3f5fb}
.al .spthumb img{width:100%;display:block;aspect-ratio:640/377;object-fit:cover;object-position:top}
.al .sptheme.on .spthumb{border-color:rgba(200,16,46,.35)}
.al .sptheme .nm{font-size:12px;font-weight:800;color:#0a1f52;margin-top:7px}
.al .sptheme.on .nm{color:#c8102e}
.al .splinkrow{display:flex;align-items:stretch;gap:8px;margin-top:16px;flex-wrap:wrap}
.al .splinkbox{flex:1;min-width:180px;display:flex;align-items:center;background:#f4f7fe;border:1.5px solid #e7ebf6;border-radius:11px;padding:0 14px;height:44px;font-size:13.5px;font-weight:700;color:#0a1f52;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.al .spbtn{border:0;font-family:inherit;font-weight:800;font-size:13.5px;border-radius:11px;padding:0 16px;height:44px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:7px;transition:.15s}
.al .spbtn.copy{background:#c8102e;color:#fff}
.al .spbtn.copy:hover{background:#a50d26}
.al .spbtn.copy.done{background:#1f9d55}
.al .spbtn.prev{background:#fff;color:#0a1f52;border:1.5px solid #e7ebf6}
.al .spbtn.prev:hover{border-color:#c3cff0}
.al .spbtn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.al .spnote{font-size:12.5px;font-weight:600;color:#5a6584;margin-top:12px;display:flex;align-items:center;gap:7px}
.al .spnote .dot{width:7px;height:7px;border-radius:50%;background:#2ecc71;flex:none}
.al .spnote b{color:#0a1f52}
`;

const IconCopy = (
  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const IconOpen = (
  <svg viewBox="0 0 24 24"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
);

const THEMES = [
  { id: 'light', name: 'Light', param: '' },
  { id: 'dark', name: 'Dark', param: '?t=dark' },
  { id: 'bold', name: 'Bold', param: '?t=bold' },
];

export default function SalesPages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const [copied, setCopied] = useState('');

  const origin = (typeof window !== 'undefined' ? window.location.origin : 'https://www.advantagelife.club');
  const uname = (user && user.username) ? user.username : '';
  const refBase = origin + '/ref/' + uname;
  const joinBase = origin + '/join/' + uname;

  const activeTheme = THEMES.find(function (t) { return t.id === theme; }) || THEMES[0];
  const salesLink = refBase + activeTheme.param;
  const videoLink = refBase + '/video';

  function pretty(url) { return url.replace(/^https?:\/\//, ''); }

  function copy(url, key) {
    try {
      navigator.clipboard.writeText(url).then(function () {
        setCopied(key);
        setTimeout(function () { setCopied(''); }, 1600);
      });
    } catch (e) {
      // clipboard unavailable — still give feedback
      setCopied(key);
      setTimeout(function () { setCopied(''); }, 1600);
    }
  }
  function preview(url) { window.open(url, '_blank', 'noopener'); }

  return (
    <AlShell active="marketing">
      <style>{CSS}</style>

      <div className="sphero">
        <div className="k">ADVANTAGELIFE &middot; YOUR SHAREABLE PAGES</div>
        <h1>Sales Pages</h1>
        <p>Pick a page, pick a look, copy the link. Every link is stamped with your username — anyone who joins through it is credited to you, automatically.</p>
      </div>

      <div className="spseclabel">YOUR SALES PAGE — CHOOSE A DESIGN</div>
      <div className="spgrid">
        <div className="spcard feat">
          <div className="top">
            <div className="spic"><svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></svg></div>
            <div>
              <h3>Your Sales Page<span className="badge">3 THEMES</span></h3>
              <p>Your full pitch with the videos built in. Same page, three looks — choose the one that fits where you&rsquo;re sharing it.</p>
            </div>
          </div>

          <div className="spthemes">
            {THEMES.map(function (t) {
              return (
                <button key={t.id} type="button"
                        className={'sptheme' + (theme === t.id ? ' on' : '')}
                        onClick={function () { setTheme(t.id); }}
                        aria-pressed={theme === t.id}>
                  <div className="spthumb"><img src={'/static/sp-thumbs/' + t.id + '.png'} alt={t.name + ' theme preview'} loading="lazy" /></div>
                  <div className="nm">{t.name}</div>
                </button>
              );
            })}
          </div>

          <div className="splinkrow">
            <div className="splinkbox" title={salesLink}>{pretty(salesLink)}</div>
            <button className={'spbtn copy' + (copied === 'sales' ? ' done' : '')} onClick={function () { copy(salesLink, 'sales'); }}>
              {IconCopy}{copied === 'sales' ? 'Copied!' : 'Copy link'}
            </button>
            <button className="spbtn prev" onClick={function () { preview(salesLink); }}>{IconOpen}Preview</button>
          </div>
          <div className="spnote"><span className="dot" />Light is the default. Dark &amp; Bold add <b>&nbsp;?t=dark&nbsp;</b>/<b>&nbsp;?t=bold&nbsp;</b> — links you&rsquo;ve already shared keep working.</div>
        </div>
      </div>

      <div className="spseclabel">YOUR OTHER PAGES</div>
      <div className="spgrid">
        <div className="spcard">
          <div className="top">
            <div className="spic"><svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg></div>
            <div><h3>Video Sales Page</h3><p>A focused, video-first pitch to send one prospect.</p></div>
          </div>
          <div className="splinkrow">
            <div className="splinkbox" title={videoLink}>{pretty(videoLink)}</div>
            <button className={'spbtn copy' + (copied === 'video' ? ' done' : '')} onClick={function () { copy(videoLink, 'video'); }}>
              {IconCopy}{copied === 'video' ? 'Copied!' : 'Copy'}
            </button>
            <button className="spbtn prev" onClick={function () { preview(videoLink); }}>{IconOpen}</button>
          </div>
        </div>

        <div className="spcard">
          <div className="top">
            <div className="spic"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
            <div><h3>Join Page</h3><p>Straight to the join flow — for people ready to sign up.</p></div>
          </div>
          <div className="splinkrow">
            <div className="splinkbox" title={joinBase}>{pretty(joinBase)}</div>
            <button className={'spbtn copy' + (copied === 'join' ? ' done' : '')} onClick={function () { copy(joinBase, 'join'); }}>
              {IconCopy}{copied === 'join' ? 'Copied!' : 'Copy'}
            </button>
            <button className="spbtn prev" onClick={function () { preview(joinBase); }}>{IconOpen}</button>
          </div>
        </div>
      </div>
    </AlShell>
  );
}
