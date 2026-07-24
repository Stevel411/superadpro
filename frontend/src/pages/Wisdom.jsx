import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

// AdvantageLife — the Daily Wisdom library.
// Everything that has ALREADY run as a daily quote, newest first. A quote
// waiting its turn is not here, so the library never spoils tomorrow.
// Favourites are private: public ones become a popularity contest and
// quietly tell members which quotes are the "right" ones to like.

const CSS = `
.wlib{background:#f1f5f9;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
.wlib .top{background:#0a1f52;color:#fff;padding:34px 0 30px}
.wlib .wrap{max-width:1100px;margin:0 auto;padding:0 18px}
.wlib .bk{display:inline-block;font-size:12.5px;font-weight:800;color:#8fa8d8;text-decoration:none;margin-bottom:14px}
.wlib .bk:hover{color:#fff}
.wlib h1{font-size:clamp(24px,3.6vw,34px);font-weight:900;letter-spacing:-.025em}
.wlib .sub{color:#b8c7e8;font-size:14.5px;margin-top:8px;max-width:620px;line-height:1.55}
.wlib .body{padding:26px 0 70px}
.wlib .bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.wlib .chip{background:#fff;border:1.5px solid #e2e8f0;border-radius:99px;padding:8px 15px;font-size:12.5px;font-weight:700;color:#64748b;cursor:pointer;font-family:inherit}
.wlib .chip.on{background:#0a1f52;border-color:#0a1f52;color:#fff}
.wlib .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:15px;align-items:stretch;max-width:100%}
.wlib .q{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px 22px 18px;position:relative;overflow:hidden;display:flex;flex-direction:column}
.wlib .q::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:#c8102e}
.wlib .q .dt{font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#64748b;margin-bottom:13px;padding-right:38px}
.wlib .q .tx{font-size:17.5px;line-height:1.45;font-weight:700;letter-spacing:-.012em;color:#0a1f52;flex:1}
.wlib .q .pv{margin-top:18px;padding-top:13px;border-top:2px solid #c8102e;display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap}
.wlib .q .pv .who{font-size:13.5px;font-weight:900;text-transform:uppercase;color:#0f172a}
.wlib .q .pv .src{font-size:11.5px;color:#64748b;margin-top:3px;line-height:1.45;font-weight:500}
.wlib .q .pv .yr{font-size:20px;font-weight:900;color:#e2e8f0;letter-spacing:-.03em;line-height:1}
.wlib .fav{position:absolute;top:15px;right:15px;width:30px;height:30px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#cbd5e1;font-size:14px;font-family:inherit;padding:0}
.wlib .fav.on{border-color:#c8102e;color:#c8102e}
.wlib .empty{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:44px 26px;text-align:center}
.wlib .empty b{display:block;font-size:17px;font-weight:900;color:#0a1f52;margin-bottom:7px}
.wlib .empty p{font-size:14px;color:#64748b;line-height:1.6;max-width:420px;margin:0 auto}
.wlib .load{padding:50px 0;text-align:center;color:#64748b;font-weight:700;font-size:14px}
@media(max-width:600px){.wlib .q .tx{font-size:16px}}
`;

function fmt(iso) {
  if (!iso) return '';
  var d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export default function Wisdom() {
  const [quotes, setQuotes] = useState([]);
  const [themes, setThemes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  function load(f) {
    setLoading(true);
    var qs = '';
    if (f === 'fav') qs = '?favourites=1';
    else if (f && f !== 'all') qs = '?theme=' + encodeURIComponent(f);
    apiGet('/api/al/wisdom/library' + qs)
      .then(function (j) {
        setQuotes((j && j.quotes) || []);
        if (j && j.themes) setThemes(j.themes);
        setLoading(false);
      })
      .catch(function () { setQuotes([]); setLoading(false); });
  }

  useEffect(function () { load('all'); }, []);

  function pick(f) { setFilter(f); load(f); }

  function toggleFav(q) {
    var next = !q.favourited;
    setQuotes(function (list) {
      return list.map(function (x) { return x.id === q.id ? Object.assign({}, x, { favourited: next }) : x; });
    });
    fetch('/api/al/wisdom/favourite/' + q.id, { method: 'POST', credentials: 'include' })
      .then(function (r) { if (!r.ok) throw new Error('failed'); return r.json(); })
      .then(function (j) {
        setQuotes(function (list) {
          var upd = list.map(function (x) { return x.id === q.id ? Object.assign({}, x, { favourited: j.favourited }) : x; });
          return filter === 'fav' ? upd.filter(function (x) { return x.favourited; }) : upd;
        });
      })
      .catch(function () {
        setQuotes(function (list) {
          return list.map(function (x) { return x.id === q.id ? Object.assign({}, x, { favourited: !next }) : x; });
        });
      });
  }

  return (
    <div className="wlib">
      <style>{CSS}</style>

      <div className="top">
        <div className="wrap">
          <a className="bk" href="/dashboard">&larr; Dashboard</a>
          <h1>Daily Wisdom</h1>
          <p className="sub">
            Every quote that has run so far. One a day, the same one for every member &mdash;
            so we are all reading the same words on the same morning.
          </p>
        </div>
      </div>

      <div className="body">
        <div className="wrap">
          <div className="bar">
            <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={function () { pick('all'); }}>All</button>
            <button className={'chip' + (filter === 'fav' ? ' on' : '')} onClick={function () { pick('fav'); }}>Favourites</button>
            {themes.map(function (t) {
              return (
                <button key={t.key}
                  className={'chip' + (filter === t.key ? ' on' : '')}
                  onClick={function () { pick(t.key); }}>{t.label}</button>
              );
            })}
          </div>

          {loading ? (
            <div className="load">Loading&hellip;</div>
          ) : quotes.length === 0 ? (
            <div className="empty">
              <b>{filter === 'fav' ? 'Nothing saved yet' : 'Nothing here yet'}</b>
              <p>{filter === 'fav'
                ? 'Tap the heart on any quote to keep it. Your favourites are private \u2014 nobody else sees what you save.'
                : 'Today\u2019s quote appears on your dashboard. Once a few days have passed they collect here.'}</p>
            </div>
          ) : (
            <div className="grid">
              {quotes.map(function (q) {
                return (
                  <div className="q" key={q.id + '-' + q.shown_on}>
                    <button
                      className={'fav' + (q.favourited ? ' on' : '')}
                      title={q.favourited ? 'Remove from favourites' : 'Save to favourites'}
                      onClick={function () { toggleFav(q); }}>
                      {q.favourited ? '\u2665' : '\u2661'}
                    </button>
                    <div className="dt">{fmt(q.shown_on)}</div>
                    <div className="tx">{q.text}</div>
                    <div className="pv">
                      <div>
                        <div className="who">{q.author}</div>
                        <div className="src">{q.source}</div>
                      </div>
                      {q.year && <div className="yr">{q.year}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
