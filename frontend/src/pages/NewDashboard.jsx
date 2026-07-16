import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { formatMoney } from '../utils/money';

// AdvantageLife dashboard — rebuilt 11 Jul 2026 to Steve's approved modern
// light mockup: white page, floating navy sidebar, earnings hero with REAL
// member-to-member figures ("not a projection"), featured campaign video
// (random rotation — every member's campaign gets dashboard exposure),
// Creative Studio door, real team card. Served at /home-preview (main bundle).

const CSS = `
.al{min-height:100vh;background:#f3f5fb;font-family:'Inter',system-ui,sans-serif;color:#0d1230;padding:18px clamp(12px,2.5vw,28px) 90px}
.al *{box-sizing:border-box}
.al a{text-decoration:none;color:inherit}
.al .shell{max-width:1340px;margin:0 auto}
/* ── top bar ── */
.al .top{background:#fff;border-radius:18px;box-shadow:0 10px 30px -18px rgba(10,31,82,.25);display:flex;align-items:center;gap:26px;padding:14px 22px;margin-bottom:18px}
.al .logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:21px;letter-spacing:-.4px;color:#0d1230}
.al .logo .mk{width:38px;height:38px;border-radius:11px;background:linear-gradient(160deg,#12388f,#0a1f52);display:flex;align-items:center;justify-content:center;flex:none}
.al .logo .life{color:#c8102e}
.al .nav{display:flex;gap:22px;align-items:center}
.al .nav a{font-weight:800;font-size:15.5px;color:#3c4770;padding:8px 2px;position:relative}
.al .nav a.on{color:#0d1230}
.al .nav a.on::after{content:'';position:absolute;left:0;right:0;bottom:-15px;height:3px;background:#c8102e;border-radius:2px}
.al .sp{flex:1}
.al .avatar-btn{width:42px;height:42px;border-radius:12px;background:#0a1f52;color:#fff;font-weight:900;font-size:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
.al .acct{position:relative}
.al .menu{position:absolute;right:0;top:52px;background:#fff;border:1.5px solid #e3e8f4;border-radius:14px;box-shadow:0 24px 50px -20px rgba(10,31,82,.35);min-width:230px;padding:8px;z-index:60}
.al .menu .mhead{padding:10px 12px;border-bottom:1.5px solid #eef1f8;margin-bottom:6px}
.al .menu .mhead b{display:block;font-weight:900;font-size:14px}
.al .menu .mhead span{font-size:12px;color:#5a6584;font-weight:600}
.al .menu a{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:700;color:#2a3352}
.al .menu a:hover{background:#f3f5fb}
.al .menu .sep{height:1.5px;background:#eef1f8;margin:6px 0}
.al .menu .out{color:#c8102e}
/* ── layout ── */
.al .cols{display:grid;grid-template-columns:272px 1fr;gap:20px;align-items:stretch}
@media(max-width:980px){.al .cols{grid-template-columns:1fr}.al .side{display:none}.al .nav{display:none}}
/* ── sidebar ── */
.al .side{background:linear-gradient(175deg,#0e2a6e,#0a1f52);border-radius:22px;padding:20px 14px;box-shadow:0 24px 50px -24px rgba(10,31,82,.6);display:flex;flex-direction:column}
.al .side a{display:flex;align-items:center;gap:12px;color:#c7d3f2;font-weight:800;font-size:15px;padding:14px 16px;border-radius:13px;margin-bottom:5px}
.al .side a.on{background:linear-gradient(120deg,#c8102e,#e8203f);color:#fff;box-shadow:0 10px 22px -10px rgba(200,16,46,.7)}
.al .side a:not(.on):hover{background:rgba(255,255,255,.07);color:#fff}
.al .side .sdiv{height:1px;background:rgba(255,255,255,.12);margin:14px 6px;margin-top:auto}
/* ── hero ── */
.al .hero{background:#0a1f52;border-radius:24px;color:#fff;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;box-shadow:0 30px 60px -28px rgba(10,31,82,.55);margin-bottom:20px;min-height:350px}
@media(max-width:820px){.al .hero{grid-template-columns:1fr}.al .hero .img{min-height:160px}}
.al .hero .hl{padding:clamp(22px,3.5vw,38px)}
.al .hero .k{display:flex;align-items:center;gap:10px;font-size:11.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#ff8fa0;margin-bottom:16px}
.al .hero .k::before{content:'';width:26px;height:3px;background:#c8102e;border-radius:2px}
.al .hero .lbl{font-size:15.5px;font-weight:700;color:#aebcf0;margin-bottom:2px}
.al .hero .big{font-weight:900;font-size:clamp(48px,6.4vw,70px);letter-spacing:-3px;line-height:1.03}
.al .hero .cap{font-size:15.5px;font-weight:600;color:#c9d6f7;margin:6px 0 20px}
.al .hero .pill{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(120deg,#c8102e,#e8203f);border-radius:13px;padding:14px 22px;font-weight:900;font-size:15.5px;box-shadow:0 12px 26px -10px rgba(200,16,46,.7)}
.al .hero .note{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#8fa4d8;margin-top:18px}
.al .hero .note i{font-style:normal;color:#7ef0a8}
.al .hero .img{position:relative;background:url('/static/images/al-plan-bg.jpg') center/cover}
.al .hero .img .tag{position:absolute;left:16px;bottom:14px;background:rgba(6,14,40,.72);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:8px 13px;font-size:10.5px;font-weight:800;letter-spacing:.18em;color:#dbe6ff}
/* ── share bar ── */
.al .share{background:#fff;border-radius:18px;box-shadow:0 10px 30px -18px rgba(10,31,82,.22);display:flex;align-items:center;gap:14px;padding:17px 22px;margin-bottom:20px;flex-wrap:wrap}
.al .share .lbl{font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#5a6584}
.al .share .lk{font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;color:#12388f;word-break:break-all}
.al .share .copy{margin-left:auto;background:#c8102e;color:#fff;border:none;border-radius:10px;padding:11px 18px;font-family:'Inter';font-weight:900;font-size:12.5px;cursor:pointer;box-shadow:0 10px 22px -10px rgba(200,16,46,.6)}
/* ── Weekly share card (sidebar on desktop, main column on mobile) ──── */
.al .side .ssp{flex:1;min-height:10px}
.al .sdv{height:1px;background:rgba(255,255,255,.1);margin:12px 6px}
.al .shc{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);border-radius:14px;padding:14px;margin:0 2px}
.al .shc.done{border-color:rgba(74,222,128,.35);background:rgba(74,222,128,.07)}
.al .shc .k{display:flex;align-items:center;gap:7px;font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#ff8090}
.al .shc.done .k{color:#4ade80}
.al .shc .dot{width:7px;height:7px;border-radius:50%;background:#e8203f;box-shadow:0 0 0 3px rgba(232,32,63,.25);flex-shrink:0}
.al .shc.done .dot{background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.25)}
.al .shc .h{font-size:13.5px;font-weight:900;color:#fff;margin-top:7px;line-height:1.35}
.al .shc .s{font-size:11.5px;color:#9aabd6;font-weight:600;margin-top:5px;line-height:1.5}
.al .shc .b{width:100%;margin-top:11px;background:linear-gradient(120deg,#c8102e,#e8203f);color:#fff;border:none;border-radius:10px;padding:10px;font-weight:900;font-size:12.5px;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 10px 22px -10px rgba(200,16,46,.7)}
.al .shc.done .b{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2);box-shadow:none}
.al .shc .v{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;font-weight:700;color:#9aabd6}
.al .shc .v b{color:#4ade80;font-size:14px;font-variant-numeric:tabular-nums}
/* the sidebar holds it on desktop; the main-column copy only shows once the
   sidebar is gone (matches the existing 980px sidebar breakpoint) */
.al .shmob{display:none}
@media(max-width:980px){
  .al .shmob{display:block;margin-top:16px;background:linear-gradient(120deg,#0e2a6e,#0a1f52);border-radius:18px;padding:6px;box-shadow:0 20px 44px -26px rgba(10,31,82,.6)}
  .al .shmob .shc{border:none;background:transparent;padding:14px}
}
/* ── Share modal ───────────────────────────────────────────────────── */
.al .shmodal{position:fixed;inset:0;background:rgba(10,31,82,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;animation:shfade .16s ease-out}
@keyframes shfade{from{opacity:0}to{opacity:1}}
@keyframes shpop{from{transform:translateY(10px) scale(.98);opacity:0}to{transform:none;opacity:1}}
.al .shcard{background:#fff;border-radius:22px;padding:30px;max-width:460px;width:100%;position:relative;box-shadow:0 40px 90px -30px rgba(10,31,82,.7);animation:shpop .2s ease-out}
.al .shx{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:9px;border:none;background:#f3f5fb;color:#5a6584;font-size:20px;line-height:1;cursor:pointer;font-family:'Inter',sans-serif}
.al .shx:hover{background:#e6ecf5;color:#0a1f52}
.al .shk{font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#c8102e}
.al .shh{font-size:23px;font-weight:900;letter-spacing:-.5px;color:#0a1f52;margin:6px 0 0}
.al .shp{font-size:13.5px;color:#5a6584;font-weight:600;line-height:1.6;margin:8px 0 18px}
.al .shlink{display:flex;align-items:center;gap:10px;background:#f3f5fb;border:1.5px solid #e6ecf5;border-radius:12px;padding:10px 10px 10px 14px;margin-bottom:16px}
.al .shurl{flex:1;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#12388f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.al .shcopy{background:#0a1f52;color:#fff;border:none;border-radius:9px;padding:9px 16px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap}
.al .shgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.al .shb{display:flex;align-items:center;gap:10px;padding:13px 15px;border-radius:12px;border:1.5px solid #e6ecf5;background:#fff;color:#0a1f52;font-weight:800;font-size:13.5px;cursor:pointer;font-family:'Inter',sans-serif;transition:transform .12s,border-color .12s}
.al .shb:hover{transform:translateY(-2px)}
.al .shi{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0}
.al .shb.fb .shi{background:#1877f2}.al .shb.fb:hover{border-color:#1877f2}
.al .shb.x .shi{background:#000}.al .shb.x:hover{border-color:#000}
.al .shb.wa .shi{background:#25d366}.al .shb.wa:hover{border-color:#25d366}
.al .shb.tg .shi{background:#229ed9}.al .shb.tg:hover{border-color:#229ed9}
.al .shmore{width:100%;margin-top:9px;padding:12px;border-radius:12px;border:1.5px dashed #dbe4f5;background:#fff;color:#5a6584;font-weight:800;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif}
.al .shmore:hover{border-color:#12388f;color:#12388f}
.al .shview{display:block;text-align:center;margin-top:16px;color:#c8102e;font-weight:800;font-size:13px;text-decoration:none}
@media(max-width:480px){.al .shgrid{grid-template-columns:1fr}.al .shcard{padding:24px}}
/* ── cards row ── */
.al .row{display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:stretch}
.al .card.cwatch{min-width:0}
.al .cwatch .vid{flex:1;aspect-ratio:auto;min-height:300px}
.al .rightcol{display:flex;flex-direction:column;gap:20px;min-width:0}
/* The right column must finish level with the video card on its left.
   Previously the cards were pinned to natural height (flex:0 0 auto) and
   packed to the top, so any surplus height fell out of the bottom of the
   column as dead space — the row looked unbalanced against the sidebar.
   space-between spreads the two cards to the full height, so the last one
   lands flush with the video's bottom edge without stretching a card's
   internals or leaving a hole inside it. */
.al .rightcol{justify-content:space-between}
.al .rightcol>.card{flex:0 1 auto}
.al .card.cboard .rows{min-height:0;overflow-y:auto}
@media(max-width:900px){.al .row{grid-template-columns:1fr}}
.al .card.cboard{overflow:hidden}
.al .cboard .rows{flex:1;overflow-y:auto;padding-right:4px;min-height:0}
.al .cwatch h3{font-size:24px}
.al .cboard h3{font-size:24px}
.al .cwatch .vid .ply{width:84px;height:84px}
.al .cwatch .vid .ply svg{width:30px;height:30px}
.al .cwatch .vid .vt{font-size:14px;left:14px;bottom:16px}
.al .cwatch .wst{font-size:15.5px}
.al .card{background:#fff;border-radius:22px;box-shadow:0 10px 30px -18px rgba(10,31,82,.22);padding:26px;display:flex;flex-direction:column}
.al .card .ch{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;height:56px}
.al .card .ck{font-size:10.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#c8102e;display:block;margin-bottom:4px}
.al .card h3{font-weight:900;font-size:22px;letter-spacing:-.5px;margin:0}
.al .card .go{width:34px;height:34px;border-radius:50%;border:1.5px solid #e3e8f4;display:flex;align-items:center;justify-content:center;color:#0a1f52;flex:none}
/* watch card */
.al .vid{position:relative;border-radius:14px;overflow:hidden;background:#0a1f52;aspect-ratio:16/9;display:block}
.al .vid img{width:100%;height:100%;object-fit:cover;display:block;opacity:.92}
.al .vid .ply{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:68px;height:68px;border-radius:50%;background:#c8102e;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px -8px rgba(200,16,46,.8)}
.al .vid .bar{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.25)}
.al .vid .bar i{display:block;height:100%;width:22%;background:#c8102e}
.al .vid .vt{position:absolute;left:10px;bottom:12px;right:10px;font-size:11px;font-weight:800;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.al .wst{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;margin-top:14px}
.al .wst .dot{width:9px;height:9px;border-radius:50%}
.al .wst.ok{color:#0b7a3e}.al .wst.ok .dot{background:#22c55e}
.al .wst.due{color:#c8102e}.al .wst.due .dot{background:#c8102e;animation:alp 1.6s infinite}
@keyframes alp{50%{opacity:.35}}
.al .feat{font-size:11px;font-weight:600;color:#5a6584;margin-top:6px}
/* studio card */
.al .skel{background:#f6f8fd;border:1.5px solid #e3e8f4;border-radius:14px;padding:16px;flex:1;display:flex;flex-direction:column;gap:9px;justify-content:center}
.al .skel .ln{height:9px;border-radius:5px;background:#e3e8f4}
.al .skel .ln.r{background:linear-gradient(90deg,#f5b8c2,#c8102e);opacity:.55}
.al .skel .btnln{height:26px;width:44%;border-radius:8px;background:#0a1f52;margin-top:4px}
/* team card */
.al .tm{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1}
.al .tm .box{background:#f6f8fd;border:1.5px solid #e3e8f4;border-radius:14px;padding:16px;text-align:center}
.al .tm .n{font-weight:900;font-size:36px;letter-spacing:-1px}
.al .tm .l{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5a6584;margin-top:2px}
.al .cbtn{display:block;text-align:center;background:#0a1f52;color:#fff;border-radius:12px;padding:14px;font-weight:900;font-size:14.5px;margin-top:16px}
.al .cbtn.red{background:#c8102e;box-shadow:0 10px 22px -10px rgba(200,16,46,.6)}
.al .lb{margin-top:0}
.al .lb .rows{display:grid;gap:8px}
.al .lb .r{display:flex;align-items:center;gap:12px;border:1.5px solid #e3e8f4;border-radius:13px;padding:11px 14px}
.al .lb .r.top{background:#fdf2f4;border-color:#f3c2cc}
.al .lb .rk{width:30px;height:30px;border-radius:9px;background:#0a1f52;color:#fff;font-weight:900;font-size:12.5px;display:flex;align-items:center;justify-content:center;flex:none}
.al .lb .r.top .rk{background:#c8102e}
.al .lb .who b{display:block;font-weight:900;font-size:14.5px}
.al .lb .who span{font-size:11.5px;font-weight:700;color:#5a6584}
.al .lb .amt{margin-left:auto;font-weight:900;font-size:16px;color:#0b7a3e;font-family:'JetBrains Mono',monospace}
.al .lb .empty{border:1.5px dashed #e3e8f4;border-radius:13px;padding:22px;text-align:center;color:#5a6584;font-weight:700;font-size:13.5px}
.al .lb .live{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.1em;color:#c8102e}
.al .lb .live i{width:7px;height:7px;border-radius:50%;background:#c8102e;animation:alp 1.6s infinite}
.al .loading{max-width:1120px;margin:80px auto;text-align:center;color:#5a6584;font-weight:700}
.saleToast{position:fixed;top:22px;right:22px;z-index:9999;width:370px;max-width:calc(100vw - 44px);background:#fff;border-radius:18px;box-shadow:0 30px 70px -20px rgba(10,31,82,.5);border:2px solid #bfe6cd;display:flex;gap:14px;padding:18px 20px;animation:stPop .45s cubic-bezier(.2,1.2,.3,1)}
@keyframes stPop{from{transform:translateX(30px) scale(.96);opacity:0}to{transform:none;opacity:1}}
.saleToast .stIcon{font-size:34px;line-height:1;flex:none;animation:stBounce 1s ease 2}
@keyframes stBounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}60%{transform:translateY(-2px)}}
.saleToast .stBody{flex:1;min-width:0}
.saleToast .stTitle{font-family:'Sora','Inter',sans-serif;font-weight:900;font-size:17px;color:#0b7a3e;margin-bottom:3px}
.saleToast .stMsg{font-size:13px;font-weight:600;color:#33406b;line-height:1.5}
.saleToast .stActs{display:flex;gap:9px;margin-top:12px;align-items:center}
.saleToast .stGo{background:#c8102e;color:#fff;font-weight:900;font-size:12.5px;text-decoration:none;padding:9px 15px;border-radius:9px}
.saleToast .stDismiss{background:none;border:none;color:#5a6584;font-weight:800;font-size:12.5px;cursor:pointer;font-family:'Inter'}
.saleToast .stX{position:absolute;top:10px;right:12px;background:none;border:none;font-size:20px;color:#94a0c2;cursor:pointer;line-height:1}
`;

function ytThumb(embedUrl) {
  const m = String(embedUrl || '').match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,})/);
  return m ? 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg' : null;
}

export default function NewDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [watch, setWatch] = useState(null);
  const [alPacks, setAlPacks] = useState(null);
  const [alSales, setAlSales] = useState(null);
  const [feat, setFeat] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saleAlert, setSaleAlert] = useState(null);   // {buyer, amount, level} for the pop-up
  const seenSalesRef = useRef(null);            // ids we've already alerted on

  // Play a short pleasant "cha-ching" using the Web Audio API (no asset needed)
  function playPaymentChime() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var now = ctx.currentTime;
      // two-note rising ding (C6 -> E6) like a till
      [[1046.5, 0], [1318.5, 0.12]].forEach(function (pair) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = pair[0];
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, now + pair[1]);
        g.gain.exponentialRampToValueAtTime(0.3, now + pair[1] + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + pair[1] + 0.5);
        o.start(now + pair[1]); o.stop(now + pair[1] + 0.55);
      });
    } catch (e) { /* audio blocked — pop-up still shows */ }
  }

  // Poll my-sales for NEW sales awaiting confirmation -> chime + pop-up
  useEffect(function () {
    let alive = true;
    function checkSales() {
      apiGet('/api/al/my-sales').then(function (j) {
        if (!alive) return;
        var awaiting = ((j || {}).sales || []).filter(function (x) { return x.action_needed || x.status === 'proof_submitted'; });
        var ids = awaiting.map(function (x) { return x.id; });
        if (seenSalesRef.current === null) {
          // first load — remember what's already there, don't alert on backlog
          seenSalesRef.current = {}; ids.forEach(function (id) { seenSalesRef.current[id] = true; });
          return;
        }
        var fresh = awaiting.filter(function (x) { return !seenSalesRef.current[x.id]; });
        ids.forEach(function (id) { seenSalesRef.current[id] = true; });
        if (fresh.length) {
          var f = fresh[0];
          setAlSales(j);
          playPaymentChime();
          setSaleAlert({ buyer: (f.buyer && f.buyer.username) || 'A member', amount: Number(f.amount || 0), level: f.pack_level });
        }
      }).catch(function () {});
    }
    checkSales();
    var t = setInterval(checkSales, 20000);
    return function () { alive = false; clearInterval(t); };
  }, []);

  useEffect(function () {
    Promise.allSettled([
      apiGet('/api/dashboard'), apiGet('/api/watch'),
      apiGet('/api/al/packs'), apiGet('/api/al/my-sales'),
      apiGet('/api/al/featured-video'), apiGet('/api/share/my-link'),
    ]).then(function (res) {
      if (res[0].status === 'fulfilled') setDash(res[0].value || {});
      if (res[1].status === 'fulfilled') setWatch(res[1].value || {});
      if (res[2].status === 'fulfilled') setAlPacks(res[2].value || {});
      if (res[3].status === 'fulfilled') setAlSales(res[3].value || {});
      if (res[4].status === 'fulfilled') setFeat((res[4].value || {}).video || null);
      if (res[5].status === 'fulfilled') setShareData(res[5].value || null);
      setLoading(false);
    });
    function loadBoard() { apiGet('/api/al/leaderboard').then(setBoard).catch(function () {}); }
    loadBoard();
    const t = setInterval(loadBoard, 60000);
    return function () { clearInterval(t); };
  }, []);

  const d = dash || {};
  const w = watch || {};
  const ap = alPacks || {};
  const name = d.display_name || user?.first_name || user?.username || 'there';
  const initials = ((user?.first_name || name || 'M').charAt(0) + (user?.last_name ? user.last_name.charAt(0) : '')).toUpperCase();
  const packList = ap.packs || [];
  const ownedLevel = Number(ap.owned_level || 0);
  const ownedPack = packList.find(function (p) { return p.level === ownedLevel; }) || null;
  const saleCount = Number(ap.pack_sale_count || 0);
  const nextSaleNo = saleCount + 1;
  const nextPassesUp = nextSaleNo <= 9 && (nextSaleNo % 3 === 0);
  const confirmedSales = ((alSales || {}).sales || []).filter(function (x) { return x.status === 'confirmed'; });
  const earnedTotal = confirmedSales.reduce(function (a, x) { return a + Number(x.amount || 0); }, 0);
  const team = Number(d.total_team || 0);
  const activeTeam = Number(d.directs_active != null ? d.directs_active : (d.network_active || 0));
  const watchedToday = !!w.watched_today;
  const refLink = 'https://www.advantagelife.club/ref/' + (user?.username || '');
  const thumb = feat ? ytThumb(feat.embed_url) : null;

  // Weekly showcase link — /w/{token}. Copying marks the share (analytics
  // only: a click is NOT proof, qualification reads verified public views).
  // One definition, rendered twice: in the sidebar (desktop) and in the main
  // column (mobile). The sidebar is hidden under 980px, so without the mobile
  // copy the weekly prompt would vanish on phones — where most members share.
  function ShareCard() {
    if (!shareData) return null;
    const done = !!shareData.shared_this_week;
    const views = shareData.verified_views_this_week || 0;
    return (
      <div className={'shc' + (done ? ' done' : '')}>
        <div className="k"><span className="dot" /> {done ? 'Shared this week ✓' : 'Weekly share'}</div>
        <div className="h">{done ? 'Your page is working' : 'Share your showcase'}</div>
        <div className="s">{done ? 'Videos rotate on every visit — your post stays fresh.' : 'One post keeps it live all week.'}</div>
        <button className="b" onClick={done ? function () { window.open(shareData.url, '_blank'); } : openShare}>
          {done ? 'View my page' : 'Share my page'}
        </button>
        <div className="v"><span>Verified views</span><b>{views}</b></div>
      </div>
    );
  }

  const shareUrl = shareData
    ? (typeof window !== 'undefined' ? window.location.origin : '') + shareData.url
    : '';

  // Social share. IMPORTANT: none of these can prove a post happened — no
  // platform reports back. They exist to remove friction so more members
  // actually share; the PROOF is verified views on /w/{token}. We still call
  // mark-shared for analytics, never for qualification.
  function shareTo(where) {
    if (!shareData) return;
    var u = encodeURIComponent(shareUrl);
    var txt = encodeURIComponent("This week's video showcase — worth a look:");
    var urls = {
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
      x:        'https://twitter.com/intent/tweet?url=' + u + '&text=' + txt,
      whatsapp: 'https://api.whatsapp.com/send?text=' + txt + '%20' + u,
      telegram: 'https://t.me/share/url?url=' + u + '&text=' + txt,
    };
    if (urls[where]) window.open(urls[where], '_blank', 'noopener,width=640,height=560');
    markShared();
  }

  // Always open OUR modal — the OS share sheet is fine on a phone but on
  // desktop it offers Reading List / Notes / Reminders, which is noise and
  // looks nothing like the platform. Native stays available INSIDE the modal
  // via "More apps…", where it's genuinely useful (WhatsApp, Instagram, etc).
  function openShare() {
    if (!shareData) return;
    setShareOpen(true);
  }

  function moreApps() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'AdvantageLife — Video Showcase', url: shareUrl })
        .then(markShared).catch(function () {});
    } else {
      copyShare();
    }
  }

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  function markShared() {
    apiPost('/api/share/mark-shared', {})
      .then(function () { apiGet('/api/share/my-link').then(setShareData).catch(function () {}); })
      .catch(function () {});
  }

  function copyShare() {
    if (!shareData) return;
    var full = (typeof window !== 'undefined' ? window.location.origin : '') + shareData.url;
    try { navigator.clipboard.writeText(full); } catch (e) {}
    setShareCopied(true);
    setTimeout(function () { setShareCopied(false); }, 1800);
    apiPost('/api/share/mark-shared', {})
      .then(function () { apiGet('/api/share/my-link').then(setShareData).catch(function () {}); })
      .catch(function () {});
  }

  function copyLink() {
    try { navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(function () { setCopied(false); }, 1800); } catch (e) {}
  }

  if (loading) return (<div className="al"><style>{CSS}</style><div className="loading">Loading your dashboard…</div></div>);

  return (
    <div className="al" onClick={function () { if (menuOpen) setMenuOpen(false); }}>
      <style>{CSS}</style>
      {saleAlert && (
        <div className="saleToast" onClick={function (e) { e.stopPropagation(); }}>
          <div className="stIcon">💰</div>
          <div className="stBody">
            <div className="stTitle">Payment received!</div>
            <div className="stMsg"><b>{saleAlert.buyer}</b> reports paying you <b>${saleAlert.amount.toFixed(2)}</b> for a Level {saleAlert.level} pack.</div>
            <div className="stActs">
              <a className="stGo" href="/my-sales">Confirm sale →</a>
              <button className="stDismiss" onClick={function () { setSaleAlert(null); }}>Dismiss</button>
            </div>
          </div>
          <button className="stX" onClick={function () { setSaleAlert(null); }}>×</button>
        </div>
      )}
      <div className="shell">

        <div className="top">
          <span className="logo">
            <span className="mk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 17L9 10l4 4 8-9" stroke="#ff2743" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 5h6v6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <span>Advantage<span className="life">Life</span></span>
          </span>
          <span className="sp"></span>
          <div className="acct" onClick={function (e) { e.stopPropagation(); }}>
            <button className="avatar-btn" onClick={function () { setMenuOpen(function (o) { return !o; }); }} aria-label="Menu" aria-expanded={menuOpen}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
            {menuOpen && (
              <div className="menu">
                <div className="mhead"><b>{name}</b><span>@{user?.username || ''}</span></div>
                <Link to="/account">Profile</Link>
                <Link to="/account?tab=security">Security</Link>
                {user && user.is_admin && (<><div className="sep"></div><Link to="/admin" style={{ color: '#12388f' }}>Admin</Link></>)}
                <div className="sep"></div>
                <a className="out" href="/logout">Sign out</a>
              </div>
            )}
          </div>
        </div>

        <div className="cols">
          <aside className="side">
            <a className="on" href="/home-preview">Dashboard</a>
            <Link to="/ai-tools">AI Tools</Link>
            <Link to="/video-library">Campaigns</Link>
            <Link to="/watch">Watch-to-Earn</Link>
            <Link to="/my-marketing">My Marketing</Link>
            <a href="/packs">Buy Packs</a>
            <a href="/my-sales">Confirm Sale</a>
            <a href="/payout-methods">Wallet</a>
            <span className="ssp" />
            <div className="sdv" />
            <ShareCard />
          </aside>

          <main>
            <div className="hero">
              <div className="hl">
                <div className="k">Your earnings</div>
                <div className="lbl">Total earned — member to member</div>
                <div className="big">{formatMoney(earnedTotal)}</div>
                <div className="cap">Welcome back, {name} — {ownedPack ? ('earning at the $' + Number(ownedPack.price).toLocaleString() + ' level') : 'no pack yet'}</div>
                <span className="pill">{saleCount} sales · next (#{nextSaleNo}) {nextPassesUp ? 'passes up' : 'yours — 100%'}</span>
                <div className="note"><i>ⓘ</i> Your own live figures — paid wallet-to-wallet, not a projection</div>
              </div>
              <div className="img"><span className="tag">FREEDOM HORIZON · ADVANTAGELIFE</span></div>
            </div>

            <div className="share">
              <div>
                <div className="lbl">Your affiliate link — share to grow your team</div>
                <div className="lk">{refLink}</div>
              </div>
              <button className="copy" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy link'}</button>
            </div>

            {/* Mobile only — the sidebar (which holds this on desktop) is
                hidden under 980px, and phones are where most sharing happens. */}
            <div className="shmob"><ShareCard /></div>

            <div className="row">

              <div className="card cwatch">
                <div className="ch"><div><span className="ck">Daily</span><h3>Watch-to-Earn</h3></div>
                  <Link className="go" to="/watch">→</Link></div>
                <Link className="vid" to="/watch">
                  {thumb
                    ? <img src={thumb} alt={feat.title || 'Featured campaign'} />
                    : <span style={{position:'absolute',inset:0,background:'linear-gradient(140deg,#0e2a6e,#0a1f52)'}}></span>}
                  <span className="ply"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{marginLeft:2}}><path d="M8 5v14l11-7z"/></svg></span>
                  {feat && <span className="vt">{feat.title || 'Featured campaign'}</span>}
                  <span className="bar"><i></i></span>
                </Link>
                <div className={'wst ' + (watchedToday ? 'ok' : 'due')}>
                  <span className="dot"></span>{watchedToday ? "Today's watch done — you're qualified" : 'Watch today to stay qualified to earn'}
                </div>
                {feat && feat.owner && <div className="feat">Featured campaign · @{feat.owner} — everyone's campaigns rotate here</div>}
              </div>

              <div className="rightcol">
              <div className="card lb cboard">
                <div className="ch"><div><span className="ck">Team · {(board && board.month) || 'this month'}</span><h3>Referral Leaderboard</h3></div>
                  <span className="live"><i></i> LIVE</span></div>
              {board && board.leaders && board.leaders.length ? (
                <div className="rows">
                  {board.leaders.map(function (l) {
                    return (
                      <div key={l.rank} className={'r' + (l.rank <= 3 ? ' top' : '')}>
                        <span className="rk">{l.rank}</span>
                        <span className="who"><b>@{l.username}</b><span>{l.sales} sales · {l.referrals} direct referrals</span></span>
                        <span className="amt">${Number(l.earned).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">The board opens with the first confirmed sale of the month — every figure here is a real member-to-member payment.</div>
              )}
              <Link className="cbtn" to="/leaderboard">See full leaderboard →</Link>
              </div>

              <div className="card cteam">
                <div className="ch"><div><span className="ck">Team</span><h3>Your network</h3></div>
                  <Link className="go" to="/my-team">→</Link></div>
                <div className="tm">
                  <div className="box"><div className="n">{team}</div><div className="l">Team members</div></div>
                  <div className="box"><div className="n">{activeTeam}</div><div className="l">Active</div></div>
                </div>
                <Link className="cbtn" to="/my-team">Open my team →</Link>
              </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ── Share modal ──────────────────────────────────────────────
          Ours, not the OS sheet. Everything a member needs in one place:
          the link, one-tap platforms, and (on mobile only, where it's
          actually useful) a route into the native sheet. */}
      {shareOpen && (
        <div className="shmodal" onClick={function () { setShareOpen(false); }}>
          <div className="shcard" onClick={function (e) { e.stopPropagation(); }}>
            <button className="shx" onClick={function () { setShareOpen(false); }} aria-label="Close">×</button>
            <div className="shk">Weekly · Video Showcase</div>
            <h3 className="shh">Share your page</h3>
            <p className="shp">One post a week keeps it working — the page refreshes its videos on every visit, so the same link stays current all week.</p>

            <div className="shlink">
              <span className="shurl">{shareUrl}</span>
              <button className="shcopy" onClick={copyShare}>{shareCopied ? 'Copied ✓' : 'Copy'}</button>
            </div>

            <div className="shgrid">
              <button className="shb fb" onClick={function () { shareTo('facebook'); setShareOpen(false); }}>
                <span className="shi">f</span> Facebook
              </button>
              <button className="shb x" onClick={function () { shareTo('x'); setShareOpen(false); }}>
                <span className="shi">𝕏</span> X
              </button>
              <button className="shb wa" onClick={function () { shareTo('whatsapp'); setShareOpen(false); }}>
                <span className="shi"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.6.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.5.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2"/></svg></span> WhatsApp
              </button>
              <button className="shb tg" onClick={function () { shareTo('telegram'); setShareOpen(false); }}>
                <span className="shi"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3l-3 14.2c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7L17.4 5c.4-.3-.1-.5-.6-.2L6.2 11.4l-4.5-1.4c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.2 1.4"/></svg></span> Telegram
              </button>
            </div>

            {hasNativeShare && (
              <button className="shmore" onClick={function () { moreApps(); setShareOpen(false); }}>More apps…</button>
            )}

            <a className="shview" href={shareData ? shareData.url : '#'} target="_blank" rel="noreferrer">Preview my page →</a>
          </div>
        </div>
      )}
    </div>
  );
}
