import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

// AdvantageLife — "My Vetted Extras".
// Outside opportunities Steve rates, each carrying his referral link, shown
// openly. All members see the published ones. Every protective element —
// the standing disclosure ribbon, the "before you click" warning, the
// per-card "my link" marker — is built in, not bolted on. No earnings or
// income claim appears anywhere: the moment a listing quotes a number the
// platform adopts a third party's promise as its own.

const CSS = `
.col{background:#f1f5f9;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
.col .top{background:#0a1f52;color:#fff;padding:34px 0 30px}
.col .wrap{max-width:1080px;margin:0 auto;padding:0 18px}
.col .bk{display:inline-block;font-size:12.5px;font-weight:800;color:#8fa8d8;text-decoration:none;margin-bottom:14px}
.col .bk:hover{color:#fff}
.col .kick{font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#f0a8b4}
.col h1{font-size:clamp(25px,3.6vw,34px);font-weight:900;letter-spacing:-.025em;margin-top:7px}
.col .sub{color:#b8c7e8;font-size:14.5px;margin-top:9px;max-width:600px;line-height:1.55}
.col .body{padding:22px 0 70px}
.col .ribbon{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700;color:#0a1f52;background:#eaf0fb;border:1px solid #d3e0f7;border-radius:10px;padding:11px 15px}
.col .ribbon b{color:#12388f}
.col .discl{background:#fffbeb;border:1px solid #fcd9a8;border-left:4px solid #f59e0b;border-radius:10px;padding:13px 16px;margin-top:12px}
.col .discl b{display:block;font-size:11.5px;font-weight:900;color:#b45309;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.col .discl p{font-size:12.5px;color:#8a5a1a;line-height:1.55}
.col .bar{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 4px}
.col .chip{background:#fff;border:1.5px solid #e2e8f0;border-radius:99px;padding:8px 15px;font-size:12.5px;font-weight:700;color:#64748b;cursor:pointer;font-family:inherit}
.col .chip.on{background:#0a1f52;border-color:#0a1f52;color:#fff}
.col .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:15px;align-items:stretch;margin-top:16px;max-width:100%}
.col .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.col .card .cap{height:8px}
.col .card .in{padding:18px;display:flex;flex-direction:column;flex:1}
.col .card .logo{width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#fff;margin-bottom:13px}
.col .card .cat{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b}
.col .card h4{font-size:18px;font-weight:900;letter-spacing:-.01em;color:#0a1f52;margin-top:5px}
.col .card .bl{font-size:13.5px;color:#475569;line-height:1.55;margin-top:9px}
.col .card .take{background:#f6f8fc;border-left:3px solid #c8102e;border-radius:0 8px 8px 0;padding:10px 12px;margin-top:13px;font-size:13px;color:#334155;line-height:1.5;font-style:italic;flex:1}
.col .card .foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:15px}
.col .card .go{background:#c8102e;color:#fff;border:0;border-radius:9px;padding:11px 18px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none}
.col .card .mine{font-size:11px;font-weight:700;color:#64748b;display:inline-flex;align-items:center;gap:5px}
.col .card .mine .d{width:7px;height:7px;border-radius:50%;background:#16a34a}
.col .empty{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:44px 26px;text-align:center;margin-top:16px}
.col .empty b{display:block;font-size:17px;font-weight:900;color:#0a1f52;margin-bottom:7px}
.col .empty p{font-size:14px;color:#64748b;line-height:1.6;max-width:400px;margin:0 auto}
.col .load{padding:50px 0;text-align:center;color:#64748b;font-weight:700}
`;

export default function Collaborations() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    apiGet('/api/al/collaborations')
      .then(function (j) {
        setItems((j && j.items) || []);
        setCats((j && j.categories) || []);
        setLoading(false);
      })
      .catch(function () { setItems([]); setLoading(false); });
  }, []);

  var shown = cat === 'all' ? items : items.filter(function (x) { return x.category === cat; });

  return (
    <div className="col">
      <style>{CSS}</style>

      <div className="top">
        <div className="wrap">
          <a className="bk" href="/dashboard">&larr; Dashboard</a>
          <div className="kick">Things I actually use</div>
          <h1>My Vetted Extras</h1>
          <p className="sub">
            A short list of outside opportunities I&rsquo;m personally in and rate. AdvantageLife
            is the main event &mdash; these are extras, not replacements.
          </p>
        </div>
      </div>

      <div className="body">
        <div className="wrap">
          <div className="ribbon">
            <span>&#10003;</span>
            <span>Every link here carries <b>my referral</b> &mdash; I only add things I&rsquo;m actually in.</span>
          </div>
          <div className="discl">
            <b>Before you click</b>
            <p>These are independent platforms. They are not AdvantageLife, I don&rsquo;t run them, and
              I can&rsquo;t control what they do. Never risk money you can&rsquo;t afford to lose, and do
              your own checks first.</p>
          </div>

          {cats.length > 1 && (
            <div className="bar">
              <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={function () { setCat('all'); }}>All</button>
              {cats.map(function (c) {
                return <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={function () { setCat(c); }}>{c}</button>;
              })}
            </div>
          )}

          {loading ? (
            <div className="load">Loading&hellip;</div>
          ) : shown.length === 0 ? (
            <div className="empty">
              <b>Nothing here just yet</b>
              <p>I add opportunities here as I find ones worth your time. Check back soon.</p>
            </div>
          ) : (
            <div className="cards">
              {shown.map(function (it) {
                return (
                  <div className="card" key={it.id}>
                    <div className="cap" style={{ background: 'linear-gradient(90deg,' + it.logo_from + ',' + it.logo_to + ')' }} />
                    <div className="in">
                      <div className="logo" style={{ background: 'linear-gradient(135deg,' + it.logo_from + ',' + it.logo_to + ')' }}>{it.logo_text}</div>
                      <div className="cat">{it.category}</div>
                      <h4>{it.name}</h4>
                      <div className="bl">{it.blurb}</div>
                      {it.take && <div className="take">{it.take}</div>}
                      <div className="foot">
                        <a className="go" href={'/api/al/collaborations/go/' + it.id} target="_blank" rel="noopener noreferrer nofollow">Check it out &rarr;</a>
                        <span className="mine"><span className="d" /> My link</span>
                      </div>
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
