import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const CSS = `
.acD{max-width:1080px;margin:0 auto;padding:6px 4px 50px;font-family:Inter,system-ui,sans-serif;color:#0d1230}
.acD .back{font-size:13px;font-weight:800;color:#5a6584;cursor:pointer;display:inline-block;margin-bottom:12px}
.acD .player{background:#000;border-radius:18px 18px 0 0;overflow:hidden;aspect-ratio:16/9;width:100%}
.acD .player iframe{width:100%;height:100%;border:0;display:block}
.acD .now{background:#0a1f52;color:#fff;padding:16px 22px;border-radius:0 0 18px 18px;margin-bottom:22px}
.acD .now h2{font-size:18px;font-weight:800;margin:0}
.acD .now span{font-size:12px;color:#a9bce0;font-weight:600}
.acD .head{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:8px}
.acD .head .lbl{font-size:11px;font-weight:800;color:#c8102e;letter-spacing:.08em;text-transform:uppercase}
.acD .head h1{font-size:26px;font-weight:900;letter-spacing:-.6px;max-width:560px;line-height:1.1;margin:4px 0 0;color:#0a1f52}
.acD .head p{font-size:13.5px;color:#5a6584;margin:8px 0 0;max-width:560px;font-weight:500;line-height:1.5}
.acD .prog{min-width:180px}
.acD .prog .pct{font-size:26px;font-weight:900;color:#0a1f52}
.acD .prog .pl{font-size:10.5px;color:#5a6584;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.acD .prog .pbar{height:7px;background:#e6ecf5;border-radius:99px;margin-top:8px;overflow:hidden}
.acD .prog .pbar i{display:block;height:100%;background:linear-gradient(90deg,#12388f,#c8102e);border-radius:99px}
.acD .modh{font-size:12px;font-weight:900;color:#0a1f52;text-transform:uppercase;letter-spacing:.06em;padding:22px 0 8px}
.acD .lesson{display:flex;align-items:center;gap:14px;padding:12px 12px;border:1px solid #e6ecf5;border-radius:12px;margin-bottom:8px;cursor:pointer;background:#fff}
.acD .lesson.active{border-color:#c8102e;box-shadow:0 0 0 1px #c8102e}
.acD .lnum{width:30px;height:30px;border-radius:8px;flex:none;display:grid;place-items:center;font-size:12px;font-weight:900;border:0;cursor:pointer}
.acD .lnum.done{background:#22c26b;color:#fff}
.acD .lnum.todo{background:#eef2fa;color:#8a97b8}
.acD .lbody{flex:1;min-width:0}
.acD .lbody b{display:block;font-size:14px;font-weight:700;color:#0d1230}
.acD .lbody span{font-size:11.5px;color:#5a6584;font-weight:600}
.acD .ldur{font-size:11.5px;font-weight:800;color:#5a6584;flex:none}
.acD .foot{margin-top:24px;background:linear-gradient(135deg,rgba(240,165,42,.12),rgba(200,16,46,.06));border:1px solid rgba(240,165,42,.35);border-radius:14px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.acD .foot b{font-size:15px;font-weight:900;color:#0a1f52}
.acD .foot p{font-size:12.5px;color:#5a6584;font-weight:600;margin-top:2px}
.acD .foot a{background:#0a1f52;color:#fff;font-weight:900;font-size:13px;padding:11px 20px;border-radius:10px;text-decoration:none;white-space:nowrap;cursor:pointer}
`;

export default function AcademyCourse() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [active, setActive] = useState(null); // {embed_url,title,source_creator}

  const load = () => apiGet('/api/al/academy/course/' + slug).then(setC).catch(() => setC({ notfound: true }));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  useEffect(() => {
    if (c && c.modules && !active) {
      // resume at first not-done lesson, else first lesson
      let first = null, resume = null;
      c.modules.forEach(m => m.lessons.forEach(l => { if (!first) first = l; if (!resume && !l.done) resume = l; }));
      setActive(resume || first);
    }
  }, [c, active]);

  async function toggle(lesson, e) {
    if (e) e.stopPropagation();
    try { await apiPost('/api/al/academy/lesson/' + lesson.id + '/complete', {}); await load(); } catch (er) {}
  }

  if (c && c.notfound) return <AlShell><div className="acD"><p>Course not found.</p></div></AlShell>;
  if (!c) return <AlShell><div className="acD">Loading…</div></AlShell>;

  return (
    <AlShell>
      <style>{CSS}</style>
      <div className="acD">
        <span className="back" onClick={() => nav('/academy')}>← Academy</span>

        {active ? (
          <>
            <div className="player"><iframe src={active.embed_url} title={active.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
            <div className="now"><h2>{active.title}</h2>{active.source_creator ? <span>Source: {active.source_creator}</span> : null}</div>
          </>
        ) : null}

        <div className="head">
          <div>
            <span className="lbl">{c.category}</span>
            <h1>{c.title}</h1>
            {c.description ? <p>{c.description}</p> : null}
          </div>
          <div className="prog">
            <div className="pct">{c.progress_pct}%</div>
            <div className="pl">complete · {c.completed}/{c.total_lessons}</div>
            <div className="pbar"><i style={{ width: c.progress_pct + '%' }} /></div>
          </div>
        </div>

        {c.modules.map((m, mi) => (
          <div key={mi}>
            <div className="modh">{m.title}</div>
            {m.lessons.map(l => (
              <div key={l.id} className={'lesson' + (active && active.id === l.id ? ' active' : '')} onClick={() => setActive(l)}>
                <button className={'lnum ' + (l.done ? 'done' : 'todo')} onClick={(e) => toggle(l, e)} title={l.done ? 'Mark not done' : 'Mark done'}>{l.done ? '✓' : '▶'}</button>
                <div className="lbody"><b>{l.title}</b><span>{l.takeaway}{l.takeaway && l.source_creator ? ' · ' : ''}{l.source_creator}</span></div>
                {l.duration ? <div className="ldur">{l.duration}</div> : null}
              </div>
            ))}
          </div>
        ))}

        <div className="foot">
          <div><b>Ready to put this to work?</b><p>You've got the theory — now launch a real campaign on AdvantageLife.</p></div>
          <a onClick={() => nav('/packs')}>Create your campaign →</a>
        </div>
      </div>
    </AlShell>
  );
}
