import { useState, useEffect } from 'react';
import CategoryShell from '../components/CategoryShell';
import { apiGet } from '../utils/api';

// AdvantageLife compensation plan — internal (logged-in) page at /compensation-plan.
// Rebuilt 10 Aug 2026 for the RECURRING operational-fee model (solicitor-approved,
// Kitson Solicitors) — replaces the earlier one-time 3/6/9 "three chains pay you
// back" page and its explainer video.
//
// Model (verified against passup_engine.py, 10 Aug 2026):
//   Recurring 11-sale cycle, repeating for as long as the member sells:
//     positions 1,2,4,5,7,8,10  -> seller keeps          (7 per cycle)
//     position 3                -> COMPANY operational fee (1 per cycle)
//     positions 6,9,11          -> pass up to qualified upline (3 per cycle)
//   Two earning gates: owned_level >= pack_level AND watch-qualified (48h grace).
//   Pack prices are FETCHED from /api/al/packs (never hardcoded) so they can't
//   drift from what the engine actually enforces.

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');

// The 11-sale cycle. kind: keep | ops | up
const CYCLE = [
  { n: 1, kind: 'keep' }, { n: 2, kind: 'keep' }, { n: 3, kind: 'ops' },
  { n: 4, kind: 'keep' }, { n: 5, kind: 'keep' }, { n: 6, kind: 'up' },
  { n: 7, kind: 'keep' }, { n: 8, kind: 'keep' }, { n: 9, kind: 'up' },
  { n: 10, kind: 'keep' }, { n: 11, kind: 'up' },
];

const CSS = `
.cp{--navy:#0a1f52;--navy2:#12388f;--red:#c8102e;--green:#2ecc71;--line:#e3e9f5;--mute:#7c89a8;max-width:900px;margin:0 auto;padding:8px 0 60px}
.cp *{box-sizing:border-box}
.cp .hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:22px;padding:36px 30px;color:#fff;text-align:center}
.cp .hero .eb{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8fb0ff}
.cp .hero h1{font-size:clamp(30px,7vw,44px);font-weight:900;letter-spacing:-.02em;margin-top:10px;line-height:1.04}
.cp .hero p{font-size:15px;color:#c3cff0;margin-top:14px;font-weight:500;line-height:1.55;max-width:44ch;margin-left:auto;margin-right:auto}
.cp .card{background:#fff;border-radius:20px;padding:26px;margin-top:18px;box-shadow:0 12px 34px -22px rgba(10,31,82,.3);border:1px solid var(--line)}
.cp .card h2{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.01em}
.cp .sub{font-size:14px;color:var(--mute);margin-top:6px;font-weight:500;line-height:1.55}
.cp .cycle{display:grid;grid-template-columns:repeat(auto-fit,minmax(66px,1fr));gap:9px;margin-top:20px}
.cp .chip{border-radius:13px;padding:13px 6px;text-align:center;color:#fff}
.cp .chip .cn{font-size:21px;font-weight:900;line-height:1}
.cp .chip .ct{font-size:9px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;margin-top:5px;opacity:.95}
.cp .keep{background:var(--green)}.cp .ops{background:var(--red)}.cp .up{background:var(--navy2)}
.cp .legend{display:flex;gap:18px;margin-top:18px;flex-wrap:wrap}
.cp .lg{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--navy)}
.cp .ldot{width:13px;height:13px;border-radius:4px}
.cp .sum{display:flex;gap:12px;margin-top:20px}
.cp .sc{flex:1;border-radius:15px;padding:16px 10px;text-align:center}
.cp .sc .big{font-size:28px;font-weight:900;line-height:1}
.cp .sc .lbl{font-size:10.5px;font-weight:800;margin-top:5px;letter-spacing:.03em}
.cp .sc.k{background:rgba(46,204,113,.12)}.cp .sc.k .big,.cp .sc.k .lbl{color:#1f9d57}
.cp .sc.u{background:rgba(18,56,143,.1)}.cp .sc.u .big,.cp .sc.u .lbl{color:var(--navy2)}
.cp .sc.o{background:rgba(200,16,46,.1)}.cp .sc.o .big,.cp .sc.o .lbl{color:var(--red)}
.cp .ops-card{background:linear-gradient(135deg,#fff,#fff6f7);border:1.5px solid rgba(200,16,46,.22)}
.cp .ops-card h2{color:var(--red)}
.cp .ops-card .sub{color:#8a5560}
.cp .repeat{display:flex;align-items:center;gap:12px;background:#f6f8fd;border-radius:15px;padding:15px 17px;margin-top:18px}
.cp .repeat .ic{font-size:23px}
.cp .repeat .tx{font-size:13px;color:#33415c;font-weight:600;line-height:1.5}
.cp .repeat .tx b{color:var(--navy);font-weight:800}
.cp table{width:100%;border-collapse:collapse;margin-top:16px}
.cp th{text-align:left;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--mute);padding:0 10px 10px;border-bottom:1px solid var(--line)}
.cp th.num{text-align:right}
.cp td{padding:12px 10px;border-bottom:1px solid #f0f3f9;font-size:14px;color:var(--navy);font-weight:600}
.cp td.price{font-weight:800}
.cp td.num{text-align:right;font-weight:600;color:var(--mute)}
.cp .tbl-foot{font-size:12px;color:var(--mute);margin-top:12px;line-height:1.5}
.cp .cta-wrap{margin-top:20px;text-align:center}
.cp .cta{display:inline-block;background:var(--red);color:#fff;font-weight:800;font-size:15px;padding:14px 34px;border-radius:12px;text-decoration:none}
.cp .state{padding:22px;text-align:center;color:var(--mute);font-size:14px}
`;

export default function CompensationPlan() {
  const [packs, setPacks] = useState(null);

  useEffect(() => {
    let alive = true;
    apiGet('/api/al/packs')
      .then((d) => { if (alive) setPacks(Array.isArray(d?.packs) ? d.packs : []); })
      .catch(() => { if (alive) setPacks([]); });
    return () => { alive = false; };
  }, []);

  return (
    <CategoryShell>
      <style>{CSS}</style>
      <div className="cp">
        <div className="hero">
          <div className="eb">Compensation Plan</div>
          <h1>Your effort.<br />Your income.</h1>
          <p>Sales are paid member-to-member, straight to your wallet. Here's exactly where every sale you make goes — nothing hidden.</p>
        </div>

        {/* NEW ANIMATION SLOT — the recurring-cycle explainer video drops in here
            once built in Claude Design (replaces the retired pass-up video). */}

        <div className="card">
          <h2>Every 11 sales — the full cycle</h2>
          <div className="sub">This pattern repeats for as long as you keep selling. You keep most; three pass up to your team; one funds the platform.</div>
          <div className="cycle">
            {CYCLE.map((c) => (
              <div key={c.n} className={'chip ' + c.kind}>
                <div className="cn">{c.n}</div>
                <div className="ct">{c.kind === 'keep' ? 'You' : c.kind === 'ops' ? 'Ops' : 'Pass-up'}</div>
              </div>
            ))}
          </div>
          <div className="legend">
            <div className="lg"><span className="ldot" style={{ background: '#2ecc71' }} />You keep</div>
            <div className="lg"><span className="ldot" style={{ background: '#12388f' }} />Passes up to your upline</div>
            <div className="lg"><span className="ldot" style={{ background: '#c8102e' }} />Operational fee</div>
          </div>
          <div className="sum">
            <div className="sc k"><div className="big">7</div><div className="lbl">YOU KEEP</div></div>
            <div className="sc u"><div className="big">3</div><div className="lbl">PASS UP</div></div>
            <div className="sc o"><div className="big">1</div><div className="lbl">OPERATIONS</div></div>
          </div>
        </div>

        <div className="card ops-card">
          <h2>The 3rd sale — your operational fee</h2>
          <div className="sub">The 3rd sale of each cycle goes to the platform. It's what keeps AdvantageLife running — the hosting that keeps it online, the tools you use every day, and member support. There's no separate subscription and nothing to pay from your pocket: the platform funds itself from activity, so it can stay free to join and member-to-member on everything else.</div>
        </div>

        <div className="card">
          <h2>How pass-ups work</h2>
          <div className="sub">Your 6th, 9th and 11th sales pass up to the first qualified member above you — someone who owns that pack level or higher and has done their daily watch. That's the team-building engine: as your team sells, their pass-ups flow up to you too.</div>
          <div className="repeat">
            <span className="ic">🔁</span>
            <span className="tx"><b>It repeats.</b> After the 11th, the cycle starts again at sale 1. Keep selling, and you keep earning — cycle after cycle.</span>
          </div>
        </div>

        <div className="card">
          <h2>The packs</h2>
          <div className="sub">Every pack is a real video-advertising campaign. The price is the full commission that moves member-to-member on each sale.</div>
          {packs === null ? (
            <div className="state">Loading packs…</div>
          ) : packs.length === 0 ? (
            <div className="state">No active packs to show.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Pack</th>
                  <th className="num">Price</th>
                  <th className="num">Views</th>
                  <th className="num">Daily watch</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => (
                  <tr key={p.level}>
                    <td className="name">{p.name}</td>
                    <td className="price">{money(p.price)}</td>
                    <td className="num">{Number(p.views_target || 0).toLocaleString('en-US')}</td>
                    <td className="num">{p.daily_watch_required ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="tbl-foot">
            Your watch quota follows the largest pack you own. A campaign runs until its
            views are delivered, then has a grace window before it expires.
          </p>
          <div className="cta-wrap">
            <a className="cta" href="/packs">Buy a pack →</a>
          </div>
        </div>
      </div>
    </CategoryShell>
  );
}
