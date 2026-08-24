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
`;

export default function TrafficDrop() {
  const [data, setData] = useState(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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

  var credits = data ? data.credits : 0;
  var links = data ? data.links : [];
  var views = data ? (data.views_delivered_total || 0) : 0;
  var maxLinks = data ? data.max_links : 5;
  var refLink = data && data.username ? ('advantagelife.club/trafficdrop/' + data.username) : 'advantagelife.club/trafficdrop/\u2026';

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
              <span className="td-soon">\u26a1 Surfing launches soon</span>
              <h2>Surf to earn credits</h2>
              <p>Visit other members' sites, earn credits, and spend them to put your own links in front of real people. The surf engine arrives in the next update.</p>
            </div>

            <div className="td-card">
              <h2>Your links</h2>
              <div className="cs">Drop a link \u2014 up to {maxLinks}. Spend credits to put it in the rotation.</div>
              <div className="td-addrow">
                <input placeholder="https://your-offer.com" value={url}
                  onChange={function (e) { setUrl(e.target.value); }}
                  onKeyDown={function (e) { if (e.key === 'Enter') addLink(); }} />
                <button onClick={addLink} disabled={busy}>{busy ? '\u2026' : 'Add'}</button>
              </div>
              {err ? <div className="td-err">{err}</div> : null}
              {links.length === 0 ? <div className="cs" style={{ margin: 0 }}>No links yet \u2014 drop your first one above.</div> : null}
              {links.map(function (l) {
                return (
                  <div className="td-link" key={l.id}>
                    <span className="dot"></span>
                    <span className="lu">{l.url}</span>
                    <span className="v">{(l.views_delivered || 0).toLocaleString()} <span>views</span></span>
                    <button className="x" title="Remove" onClick={function () { removeLink(l.id); }}>\u00d7</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="td-card td-up">
              <h2>Skip the surfing?</h2>
              <p><b>Campaign packs</b> deliver a guaranteed number of <b>watch-verified views</b> \u2014 real members actually watching your ad. From <b>$5</b> to test.</p>
              <a className="cta td-up-cta" href="/packs">See campaign packs \u2192</a>
            </div>
            <div className="td-card td-refer">
              <h2>Every marketer you bring = your team</h2>
              <p>Share Traffic Drop. Anyone who joins comes in under you \u2014 you build your AdvantageLife team while they get free traffic.</p>
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
