import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../utils/api';

// One-time injected styles (keyframe + feed rows). Prefixed `laf-` to avoid
// collisions with the dashboard's own CSS.
var LAF_CSS = `
@keyframes lafpulse{0%{box-shadow:0 0 0 0 rgba(46,204,113,.5)}70%{box-shadow:0 0 0 8px rgba(46,204,113,0)}100%{box-shadow:0 0 0 0 rgba(46,204,113,0)}}
.laf-card{background:#fff;border-radius:18px;box-shadow:0 10px 34px -18px rgba(10,31,82,.28);overflow:hidden;border:1px solid #eef1f8}
.laf-hd{padding:20px 22px 16px;border-bottom:1px solid #f0f3f9}
.laf-top{display:flex;align-items:center;justify-content:space-between}
.laf-lbl{font-size:11px;font-weight:800;letter-spacing:2px;color:#c8102e}
.laf-live{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:1.5px;color:#2ecc71}
.laf-dot{width:8px;height:8px;border-radius:50%;background:#2ecc71;animation:lafpulse 1.6s infinite}
.laf-hd h3{font-size:23px;font-weight:800;color:#0a1f52;letter-spacing:-.4px;margin:9px 0 0}
.laf-stats{display:flex;gap:10px;margin-top:15px}
.laf-st{flex:1;background:#f6f8fd;border-radius:12px;padding:11px 8px;text-align:center}
.laf-st b{display:block;font-size:19px;font-weight:900;color:#0a1f52;line-height:1}
.laf-st span{font-size:10px;color:#8a97b5;font-weight:700;letter-spacing:.3px;text-transform:uppercase}
.laf-feed{padding:4px 0;max-height:420px;overflow-y:auto}
.laf-row{display:flex;align-items:center;gap:12px;padding:11px 22px}
.laf-row.me{background:linear-gradient(90deg,rgba(255,197,49,.14),rgba(255,197,49,0))}
.laf-ic{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.laf-join{background:rgba(46,204,113,.14)}.laf-trial{background:rgba(46,204,113,.14)}
.laf-sale{background:rgba(255,197,49,.2)}.laf-qualify{background:rgba(18,56,143,.12)}
.laf-share{background:rgba(120,80,220,.12)}.laf-milestone{background:rgba(200,16,46,.12)}.laf-misc{background:#eef1f8}
.laf-tx{flex:1;min-width:0}
.laf-tx .m{font-size:13.5px;color:#0a1f52;font-weight:600;line-height:1.3}
.laf-tx .m b{font-weight:800}
.laf-tx .s{font-size:11px;color:#93a0bd;font-weight:500;margin-top:1px}
.laf-amt{font-size:13px;font-weight:900;color:#2ecc71;flex-shrink:0}
.laf-tag{font-size:9px;font-weight:800;color:#1f7a44;background:rgba(46,204,113,.16);padding:3px 7px;border-radius:20px;letter-spacing:.4px}
.laf-empty{padding:26px 22px;text-align:center;color:#8a97b5;font-size:13px;font-weight:500;line-height:1.5}
.laf-ft{padding:14px 22px 18px}
.laf-ft a{display:block;text-align:center;background:#0a1f52;color:#fff !important;font-weight:800;font-size:14px;padding:13px;border-radius:12px;text-decoration:none}
`;

var EMOJI = { join: '🎉', trial: '🚀', sale: '💰', qualify: '✅', share: '📢', milestone: '📈', misc: '•' };

export default function LiveActivityFeed() {
  var s = useState(null); var data = s[0]; var setData = s[1];

  useEffect(function () {
    if (!document.getElementById('laf-style')) {
      var el = document.createElement('style');
      el.id = 'laf-style'; el.textContent = LAF_CSS; document.head.appendChild(el);
    }
    var alive = true;
    function load() {
      apiGet('/api/al/activity-feed').then(function (d) {
        if (alive && d && d.ok) setData(d);
      }).catch(function () {});
    }
    load();
    var t = setInterval(load, 25000); // gentle refresh for a live feel
    return function () { alive = false; clearInterval(t); };
  }, []);

  var stats = (data && data.stats) || { joins_today: 0, sold_today: 0, active_today: 0 };
  var events = (data && data.events) || [];

  return (
    <div className="laf-card">
      <div className="laf-hd">
        <div className="laf-top">
          <span className="laf-lbl">TEAM · LIVE</span>
          <span className="laf-live"><span className="laf-dot"></span>LIVE</span>
        </div>
        <h3>Live Activity</h3>
        <div className="laf-stats">
          <div className="laf-st"><b>{stats.joins_today}</b><span>Joins today</span></div>
          <div className="laf-st"><b>${stats.sold_today}</b><span>Sold today</span></div>
          <div className="laf-st"><b>{stats.active_today}</b><span>Active today</span></div>
        </div>
      </div>
      <div className="laf-feed">
        {events.length === 0 ? (
          <div className="laf-empty">The feed comes alive as members join, share, and sell — every event here is real. Be the one who gets it moving.</div>
        ) : events.map(function (e) {
          return (
            <div key={e.id} className={'laf-row' + (e.is_you ? ' me' : '')}>
              <div className={'laf-ic laf-' + e.kind}>{e.is_you && e.kind === 'sale' ? '👑' : (EMOJI[e.kind] || '•')}</div>
              <div className="laf-tx">
                <div className="m"><b>{e.name}</b> {e.text}</div>
                <div className="s">{[e.location, e.ago].filter(Boolean).join(' · ')}</div>
              </div>
              {e.amount ? <div className="laf-amt">+${e.amount}</div>
                : e.is_new ? <span className="laf-tag">NEW</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
