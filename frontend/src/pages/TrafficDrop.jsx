import { useState, useEffect } from 'react';
import AlShell from '../components/layout/AlShell';

const CSS = `
.td{max-width:960px}
.td-h1{font-size:clamp(24px,4vw,32px);font-weight:900;letter-spacing:-.03em;color:#0a1f52;margin:2px 0 3px}
.td-sub{font-size:14px;color:#5a6584;font-weight:600;margin:0 0 20px}
.td-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.td-stat{background:#fff;border:1px solid #e6ecf5;border-radius:14px;padding:15px 16px}
.td-stat .n{font-size:28px;font-weight:900;color:#0a1f52;letter-spacing:-1px;line-height:1;font-variant-numeric:tabular-nums}
.td-stat .n em{font-style:normal;color:#17a34a}
.td-stat .l{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5a6584;margin-top:6px}
.td-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:16px}
@media(max-width:820px){.td-grid{grid-template-columns:1fr}.td-stats{grid-template-columns:1fr}}
.td-card{background:#fff;border:1px solid #e6ecf5;border-radius:16px;padding:18px;margin-bottom:16px}
.td-card h2{margin:0 0 3px;font-size:15px;font-weight:900;color:#0d1230}
.td-card .cs{font-size:12px;color:#5a6584;font-weight:600;margin:0 0 14px}
.td-surf{background:linear-gradient(165deg,#0a1f52,#12388f);color:#fff;border:none;text-align:center;padding:26px 20px}
.td-surf h2{color:#fff;font-size:18px;margin:12px 0 0}
.td-surf p{color:#bcd0ff;font-size:13px;font-weight:600;margin:6px auto 0;max-width:360px;line-height:1.5}
.td-soon{display:inline-block;background:rgba(255,210,63,.16);border:1px solid rgba(255,210,63,.5);color:#ffe08a;border-radius:30px;padding:6px 14px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.td-addrow{display:flex;gap:8px;margin-bottom:12px}
.td-addrow input{flex:1;border:1.5px solid #e6ecf5;border-radius:10px;padding:11px 12px;font-size:13px;font-family:inherit;font-weight:600}
.td-addrow button{background:linear-gradient(120deg,#0a1f52,#12388f);color:#fff;border:none;border-radius:10px;padding:0 16px;font-size:13px;font-weight:900;cursor:pointer}
.td-link{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #e6ecf5}
.td-link .dot{width:8px;height:8px;border-radius:50%;background:#2ecc71;flex:none}
.td-link .lu{flex:1;min-width:0;font-size:12.5px;font-weight:700;color:#0d1230;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-link .v{font-size:12px;font-weight:900;color:#0a1f52}.td-link .v span{color:#5a6584;font-weight:700;font-size:10.5px}
.td-link .x{background:none;border:none;color:#c0c8d8;font-size:18px;cursor:pointer;padding:0 2px;flex:none;line-height:1}
.td-up{background:linear-gradient(120deg,#0a1f52,#12388f);color:#fff;border:none}
.td-up h2{color:#fff}.td-up p{font-size:12.5px;color:#cfe0ff;font-weight:600;line-height:1.5;margin:0 0 14px}.td-up p b{color:#fff}
.td-up .cta{display:inline-block;background:linear-gradient(120deg,#c8102e,#ff2743);border-radius:11px;padding:12px 20px;font-size:14px;font-weight:900;text-decoration:none}
.al a.td-up-cta,.al a.td-up-cta:hover{color:#fff}
.td-refer{background:#fffdf5;border:1px solid #f0d98a}
.td-refer h2{color:#0a1f52}.td-refer p{font-size:12px;color:#8a7320;font-weight:700;margin:0 0 12px;line-height:1.5}
.td-share{display:flex;gap:8px}
.td-share input{flex:1;border:1.5px solid #f0d98a;background:#fff;border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;color:#0a1f52}
.td-share button{background:#ffd23f;color:#4a3500;border:none;border-radius:10px;padding:0 16px;font-size:12.5px;font-weight:900;cursor:pointer}
.td-err{color:#c8102e;font-size:12.5px;font-weight:700;margin:0 0 10px}
.td-surfbtn{display:inline-block;background:linear-gradient(120deg,#c8102e,#ff2743);color:#fff;border:none;border-radius:12px;padding:13px 22px;font-size:15px;font-weight:900;cursor:pointer;margin:14px 0 6px;box-shadow:0 14px 30px -14px rgba(255,39,67,.6)}
.td-surfurl{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:11px 14px;font-size:13px;font-weight:700;color:#fff;word-break:break-all;margin:0 auto 4px;max-width:340px}
.td-ring{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:6px auto 12px}
.td-ringin{width:70px;height:70px;border-radius:50%;background:#0a1f52;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff}
.td-stop{display:block;margin:10px auto 0;background:none;border:none;color:#9fb8ff;font-size:12px;font-weight:800;cursor:pointer;text-decoration:underline}
.td-sess{margin-top:14px;font-size:12px;color:#bcd0ff;font-weight:700;border-top:1px solid rgba(255,255,255,.12);padding-top:12px}
.td-verify{display:flex;gap:10px;justify-content:center;margin:14px 0 4px}
.td-vbtn{width:56px;height:56px;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:24px;font-weight:900;cursor:pointer}
.td-vbtn:hover{background:rgba(255,255,255,.18)}
.td-verr{color:#ff9db0;font-size:12.5px;font-weight:700;margin:8px 0 0}
`;

export default function TrafficDrop() {
  const [data, setData] = useState(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState('idle');       // idle|loading|ready|viewing|verify|done
  const [surf, setSurf] = useState(null);           // {surf_id, url}
  const [timeLeft, setTimeLeft] = useState(10);
  const [sSurfed, setSSurfed] = useState(0);
  const [sEarned, setSEarned] = useState(0);
  const [verifyErr, setVerifyErr] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  function load() {
    fetch('/api/trafficdrop/me').then(function (r) { return r.json(); }).then(setData).catch(function () {});
  }
  useEffect(load, []);

  function addLink() {
    setErr('');
    var u = url.trim(); if (!u) return;
    setBusy(true);
    fetch('/api/trafficdrop/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.error) { setErr(d.error); } else { setUrl(''); load(); } })
      .catch(function () { setErr('Something went wrong — try again.'); })
      .then(function () { setBusy(false); });
  }
  function removeLink(id) {
    fetch('/api/trafficdrop/link/' + id + '/remove', { method: 'POST' }).then(load).catch(function () {});
  }

  function nextSurf() {
    setPhase('loading'); setSurf(null); setVerifyErr(false);
    fetch('/api/trafficdrop/surf/next').then(function (r) { return r.json(); }).then(function (d) {
      if (d.done || !d.url) { setDoneMsg(d.message || ''); setPhase('done'); return; }
      setSurf({ surf_id: d.surf_id, url: d.url, verify: d.verify }); setTimeLeft(d.timer || 10); setPhase('ready');
    }).catch(function () { setPhase('done'); });
  }
  function visitSite() {
    if (!surf) return;
    window.open(surf.url, '_blank', 'noopener');
    setPhase('viewing');
  }
  useEffect(function () {
    if (phase !== 'viewing') return undefined;
    if (timeLeft <= 0) { setPhase('verify'); return undefined; }
    var t = setTimeout(function () { setTimeLeft(function (x) { return x - 1; }); }, 1000);
    return function () { clearTimeout(t); };
  }, [phase, timeLeft]);
  function verifyDone(answer) {
    if (!surf) return;
    var sid = surf.surf_id;
    fetch('/api/trafficdrop/surf/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ surf_id: sid, answer: answer }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.ok) { setVerifyErr(false); setSSurfed(function (x) { return x + 1; }); if (d.earned_credit) setSEarned(function (x) { return x + 1; }); load(); nextSurf(); }
        else if (d && d.error === 'verify failed') { setVerifyErr(true); }
        else { nextSurf(); }
      }).catch(function () { nextSurf(); });
  }
  function stopSurf() { setPhase('idle'); setSurf(null); }

  var credits = data ? data.credits : 0;
  var links = data ? data.links : [];
  var views = data ? (data.views_delivered_total || 0) : 0;
  var maxLinks = data ? data.max_links : 5;
  var refLink = data && data.username ? ('www.advantagelife.club/trafficdrop/' + data.username) : 'advantagelife.club/trafficdrop/…';

  return (
    <AlShell active="trafficdrop">
      <style>{CSS}</style>
      <div className="td">
        <h1 className="td-h1">Traffic Drop</h1>
        <p className="td-sub">Free traffic for your links — surf to earn, spend to get seen.</p>

        <div className="td-stats">
          <div className="td-stat"><div className="n"><em>{credits}</em></div><div className="l">Your credits</div></div>
          <div className="td-stat"><div className="n">{views.toLocaleString()}</div><div className="l">Views delivered</div></div>
          <div className="td-stat"><div className="n">{links.length}</div><div className="l">Active links</div></div>
        </div>

        <div className="td-grid">
          <div>
            <div className="td-card td-surf">
              {phase === 'idle' ? (
                <div>
                  <h2>Surf to earn credits</h2>
                  <p>Visit other members' sites for 10 seconds each. Every 2 sites you surf earns 1 view for your own links.</p>
                  <button className="td-surfbtn" onClick={nextSurf}>Start surfing →</button>
                </div>
              ) : null}
              {phase === 'loading' ? (<div><h2>Finding a site…</h2><p>One moment.</p></div>) : null}
              {phase === 'ready' && surf ? (
                <div>
                  <div className="td-surfurl">{surf.url}</div>
                  <button className="td-surfbtn" onClick={visitSite}>Visit site ↗</button>
                  <p>Opens in a new tab — the 10-second timer starts when you visit.</p>
                  <button className="td-stop" onClick={stopSurf}>Stop</button>
                </div>
              ) : null}
              {phase === 'viewing' && surf ? (
                <div>
                  <div className="td-ring" style={{ background: 'conic-gradient(#2ecc71 ' + ((10 - timeLeft) / 10 * 100) + '%, rgba(255,255,255,.15) 0)' }}>
                    <div className="td-ringin">{timeLeft}</div>
                  </div>
                  <div className="td-surfurl">{surf.url}</div>
                  <p>Keep the site open — come back when the timer's done.</p>
                  <button className="td-stop" onClick={stopSurf}>Stop</button>
                </div>
              ) : null}
              {phase === 'verify' && surf && surf.verify ? (
                <div>
                  <h2>Almost there</h2>
                  <p>Tap the number <b>{surf.verify.answer_prompt}</b> to collect your credit.</p>
                  <div className="td-verify">
                    {surf.verify.options.map(function (o) { return <button key={o} className="td-vbtn" onClick={function () { verifyDone(o); }}>{o}</button>; })}
                  </div>
                  {verifyErr ? <p className="td-verr">Not quite — tap the {surf.verify.answer_prompt}.</p> : null}
                  <button className="td-stop" onClick={stopSurf}>Stop</button>
                </div>
              ) : null}
              {phase === 'done' ? (
                <div>
                  <h2>Nothing to surf right now</h2>
                  <p>{doneMsg || "The pool's empty — check back soon, or add credits to your own links."}</p>
                  <button className="td-surfbtn" onClick={stopSurf}>Done</button>
                </div>
              ) : null}
              {phase !== 'idle' ? (<div className="td-sess">This session: {sSurfed} surfed · {sEarned} credits earned</div>) : null}
            </div>

            <div className="td-card">
              <h2>Your links</h2>
              <div className="cs">Drop a link — up to {maxLinks}. Spend credits to put it in the rotation.</div>
              <div className="td-addrow">
                <input placeholder="https://your-offer.com" value={url}
                  onChange={function (e) { setUrl(e.target.value); }}
                  onKeyDown={function (e) { if (e.key === 'Enter') addLink(); }} />
                <button onClick={addLink} disabled={busy}>{busy ? '…' : 'Add'}</button>
              </div>
              {err ? <div className="td-err">{err}</div> : null}
              {links.length === 0 ? <div className="cs" style={{ margin: 0 }}>No links yet — drop your first one above.</div> : null}
              {links.map(function (l) {
                return (
                  <div className="td-link" key={l.id}>
                    <span className="dot"></span>
                    <span className="lu">{l.url}</span>
                    <span className="v">{(l.views_delivered || 0).toLocaleString()} <span>views</span></span>
                    <button className="x" title="Remove" onClick={function () { removeLink(l.id); }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="td-card td-up">
              <h2>Skip the surfing?</h2>
              <p><b>Campaign packs</b> deliver a guaranteed number of <b>watch-verified views</b> — real members actually watching your ad. From <b>$5</b> to test.</p>
              <a className="cta td-up-cta" href="/packs">See campaign packs →</a>
            </div>
            <div className="td-card td-refer">
              <h2>Every marketer you bring = your team</h2>
              <p>Share Traffic Drop. Anyone who joins comes in under you — you build your AdvantageLife team while they get free traffic.</p>
              <div className="td-share">
                <input value={refLink} readOnly />
                <button onClick={function () {
                  if (navigator.clipboard) navigator.clipboard.writeText('https://' + refLink);
                  setCopied(true); setTimeout(function () { setCopied(false); }, 1500);
                }}>{copied ? 'Copied' : 'Copy'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AlShell>
  );
}
