import { useState, useEffect } from 'react';
import CategoryShell from '../components/CategoryShell';
import { apiGet, apiPost } from '../utils/api';

// AdvantageLife "Momentum" — the marketer activity dashboard. Phase 1: a daily
// content idea (with hook variations + ready caption), a weekly planner, a
// streak + weekly challenge, a daily momentum checklist, and a curated idea
// library. No auto-posting — one-tap handoff (copy caption, open IG/FB) so it's
// free to run, works on any account, and carries zero ban risk. Data comes from
// /api/al/momentum; content is admin-curated in the momentum_* tables.

const CSS = `
.mmwrap{--navy:#0a1f52;--navy2:#12388f;--red:#c8102e;--green:#17a34a;--green2:#2ecc71;--gold:#f0a52a;--ink:#0d1230;--muted:#5a6584;--line:#e6ecf5;font-family:'Inter',sans-serif;color:var(--ink);max-width:960px;margin:0 auto}
.mmwrap *{box-sizing:border-box}
.mmwrap .hero{position:relative;overflow:hidden;background:linear-gradient(125deg,#0a1f52,#12388f 62%,#1a49b0);border-radius:22px;padding:26px 30px;color:#fff;box-shadow:0 24px 54px -30px rgba(18,56,143,.7);display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.mmwrap .hero::after{content:'';position:absolute;top:-70px;right:-40px;width:280px;height:300px;background:radial-gradient(circle,rgba(200,16,46,.4),transparent 68%);pointer-events:none}
.mmwrap .hl{flex:1;min-width:240px;position:relative}
.mmwrap .hk{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#8ea6e8}
.mmwrap .hero h1{font-size:30px;font-weight:900;letter-spacing:-1.2px;line-height:1.03;margin:8px 0 7px}
.mmwrap .hero h1 .g{color:#2ecc71}
.mmwrap .hero p{font-size:14px;color:#c9d5f2;font-weight:500;line-height:1.5;max-width:52ch}
.mmwrap .streak{position:relative;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:15px 22px;text-align:center;flex:none}
.mmwrap .streak .big{font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1}
.mmwrap .streak .lbl{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9fb4e6;margin-top:5px}
.mmwrap .streak .dots{display:flex;gap:5px;justify-content:center;margin-top:9px}
.mmwrap .streak .dot{width:14px;height:14px;border-radius:5px;background:rgba(255,255,255,.16)}
.mmwrap .streak .dot.on{background:linear-gradient(135deg,#2ecc71,#17a34a)}
.mmwrap .seclabel{font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:26px 4px 12px}
.mmwrap .challenge{display:flex;align-items:center;gap:16px;background:linear-gradient(120deg,#fff8ec,#fdefd3);border:1.5px solid rgba(240,165,42,.35);border-radius:16px;padding:15px 20px;margin-top:14px;box-shadow:0 14px 34px -24px rgba(217,142,18,.5)}
.mmwrap .ch-icon{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#f5b73c,#d98e12);display:flex;align-items:center;justify-content:center;font-size:21px;flex:none}
.mmwrap .ch-body{flex:1;min-width:0}
.mmwrap .ch-lbl{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#a86a09}
.mmwrap .ch-title{font-size:16px;font-weight:900;margin:2px 0 8px;letter-spacing:-.3px}
.mmwrap .ch-bar{height:8px;border-radius:99px;background:rgba(217,142,18,.18);overflow:hidden}
.mmwrap .ch-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#f5b73c,#d98e12)}
.mmwrap .ch-prog{font-size:12px;font-weight:700;color:#8a5a09;margin-top:6px}
.mmwrap .ch-reward{flex:none;font-size:12px;font-weight:700;color:#8a5a09;text-align:center;background:rgba(255,255,255,.65);border:1px solid rgba(240,165,42,.35);border-radius:11px;padding:9px 15px}
.mmwrap .ch-reward b{display:block;color:#6b4406;font-weight:900;font-size:13px;margin-top:2px}
.mmwrap .today{background:#fff;border:1.5px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 18px 44px -28px rgba(10,31,82,.5)}
.mmwrap .t-top{background:linear-gradient(120deg,#fff,#fff6f7);padding:22px 24px;border-bottom:1px solid var(--line)}
.mmwrap .fmt{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#e8203f,#c8102e);color:#fff;font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:5px 11px;border-radius:20px}
.mmwrap .ang{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-left:9px}
.mmwrap .today h2{font-size:25px;font-weight:900;letter-spacing:-.6px;line-height:1.1;margin:13px 0 8px}
.mmwrap .today .sub{font-size:14px;color:var(--muted);font-weight:600;line-height:1.5;max-width:64ch}
.mmwrap .body{padding:22px 24px}
.mmwrap .hooks-lbl{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.mmwrap .hook-opts{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.mmwrap .hook-opt{border:1.5px solid var(--line);border-radius:12px;padding:12px 15px 12px 42px;font-size:14px;font-weight:600;cursor:pointer;position:relative;background:#fff;text-align:left}
.mmwrap .hook-opt::before{content:'';position:absolute;left:15px;top:50%;transform:translateY(-50%);width:16px;height:16px;border-radius:50%;border:2px solid #cfd8ec}
.mmwrap .hook-opt.on{border-color:var(--navy2);background:#f5f8ff;box-shadow:0 0 0 2px rgba(18,56,143,.12)}
.mmwrap .hook-opt.on::before{border-color:var(--navy2);background:var(--navy2);box-shadow:inset 0 0 0 3px #fff}
.mmwrap .cap-lbl{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
.mmwrap .cap{background:#f5f8ff;border:1.5px solid #e0e8fb;border-radius:13px;padding:16px 18px;font-size:14.5px;line-height:1.6;color:#1c2748;font-weight:500;white-space:pre-wrap}
.mmwrap .acts{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
.mmwrap .abtn{height:46px;padding:0 18px;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:8px}
.mmwrap .abtn.copy,.mmwrap .abtn.save{background:#eef3ff;color:var(--navy2);border:1.5px solid #d3ddf5}
.mmwrap .abtn.copy.ok{background:rgba(23,163,74,.12);color:var(--green);border-color:rgba(23,163,74,.3)}
.mmwrap .abtn.share{background:linear-gradient(135deg,#12388f,#0a1f52);color:#fff}
.mmwrap .abtn.ig{background:linear-gradient(135deg,#f9508c,#c8367f);color:#fff}
.mmwrap .abtn.fb{background:linear-gradient(135deg,#1a6dff,#1250c8);color:#fff}
.mmwrap .sharenote{font-size:12px;color:var(--muted);font-weight:600;line-height:1.45;margin-top:10px}
.mmwrap .sharenote b{color:var(--navy2)}
.mmwrap .tip{margin-top:15px;background:rgba(240,165,42,.1);border:1px solid rgba(240,165,42,.3);border-radius:11px;padding:11px 14px;font-size:12.5px;font-weight:600;color:#8a5a09;line-height:1.45}
.mmwrap .tip b{color:#6b4406}
.mmwrap .momentum{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:18px 20px}
.mmwrap .m-hd{font-size:15.5px;font-weight:900;letter-spacing:-.2px}
.mmwrap .m-hd span{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-top:2px}
.mmwrap .m-list{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mmwrap .m-item{display:flex;align-items:center;gap:11px;font-size:14px;font-weight:700;padding:11px 13px;border:1.5px solid var(--line);border-radius:12px;cursor:pointer;text-align:left;background:#fff}
.mmwrap .m-item.done{color:var(--muted);border-color:rgba(23,163,74,.3);background:rgba(23,163,74,.05)}
.mmwrap .m-box{width:22px;height:22px;border-radius:7px;border:2px solid #cfd8ec;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;flex:none}
.mmwrap .m-item.done .m-box{background:linear-gradient(135deg,#2ecc71,#17a34a);border-color:transparent}
.mmwrap .week{display:grid;grid-template-columns:repeat(7,1fr);gap:9px}
.mmwrap .day{background:#fff;border:1.5px solid var(--line);border-radius:13px;padding:12px 10px;min-height:118px;display:flex;flex-direction:column}
.mmwrap .dn{font-size:10.5px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.mmwrap .dd{font-size:16px;font-weight:900;margin-top:1px}
.mmwrap .day.today-d{border-color:var(--navy2);box-shadow:0 0 0 2px rgba(18,56,143,.14)}
.mmwrap .day.today-d .dd{color:var(--navy2)}
.mmwrap .chip{margin-top:8px;font-size:10.5px;font-weight:800;padding:5px 7px;border-radius:7px;line-height:1.2;cursor:pointer;border:none;text-align:left;width:100%}
.mmwrap .chip.reel{background:rgba(200,16,46,.1);color:var(--red)}
.mmwrap .chip.story{background:rgba(18,56,143,.1);color:var(--navy2)}
.mmwrap .chip.post,.mmwrap .chip.carousel{background:rgba(23,163,74,.12);color:var(--green)}
.mmwrap .chip.done{background:rgba(23,163,74,.14);color:var(--green);text-decoration:line-through;opacity:.75}
.mmwrap .day .add{margin-top:auto;font-size:11px;font-weight:800;color:#a9b4cf;text-align:center;border:1.5px dashed #d7deef;border-radius:8px;padding:6px;cursor:pointer;background:none;width:100%}
.mmwrap .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.mmwrap .tab{height:34px;padding:0 15px;border-radius:99px;font-size:12.5px;font-weight:800;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--muted)}
.mmwrap .tab.on{border-color:transparent;background:linear-gradient(135deg,#12388f,#0a1f52);color:#fff}
.mmwrap .lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.mmwrap .idea{background:#fff;border:1.5px solid var(--line);border-radius:15px;padding:17px 18px;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(10,31,82,.05)}
.mmwrap .idea .ih{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.mmwrap .icat{font-size:9.5px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:20px}
.mmwrap .icat.story{background:rgba(18,56,143,.1);color:var(--navy2)}
.mmwrap .icat.proof{background:rgba(23,163,74,.12);color:var(--green)}
.mmwrap .icat.teach{background:rgba(240,165,42,.15);color:#a86a09}
.mmwrap .icat.offer{background:rgba(200,16,46,.1);color:var(--red)}
.mmwrap .icat.bts{background:rgba(90,101,132,.14);color:var(--muted)}
.mmwrap .fmt2{font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.mmwrap .idea .hook{font-size:15px;font-weight:800;line-height:1.3;margin-bottom:6px}
.mmwrap .idea .desc{font-size:12.5px;color:var(--muted);font-weight:500;line-height:1.45;flex:1}
.mmwrap .idea .addbtn{margin-top:13px;height:38px;border-radius:10px;background:#eef3ff;color:var(--navy2);font-size:13px;font-weight:800;cursor:pointer;border:1.5px solid #d3ddf5}
.mmwrap .mm-load{text-align:center;padding:60px 20px;color:var(--muted);font-weight:600}
`;

const CATS = [['all', 'All'], ['story', 'Your story'], ['proof', 'Proof'], ['teach', 'Teach'], ['offer', 'Offer'], ['bts', 'Behind the scenes']];

export default function Momentum() {
  const [data, setData] = useState(null);
  const [selHook, setSelHook] = useState(0);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('all');

  const load = () => apiGet('/api/al/momentum').then((d) => { if (d && d.ok) setData(d); }).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!data) {
    return <CategoryShell><style>{CSS}</style><div className="mmwrap"><div className="mm-load">Loading your Momentum plan…</div></div></CategoryShell>;
  }

  const t = data.today || {};
  const hooks = t.hooks && t.hooks.length ? t.hooks : (t.caption ? [t.caption.split('\n')[0]] : []);
  const capLines = t.caption ? t.caption.split('\n') : [];
  const capBody = capLines.slice(1).join('\n');
  const chosenHook = hooks[selHook] || capLines[0] || '';
  const fullCaption = ((chosenHook + '\n' + capBody).trim() + (t.hashtags ? '\n\n' + t.hashtags : '')).trim();

  const copyCaption = () => {
    try { navigator.clipboard.writeText(fullCaption); } catch (e) { /* older browsers */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');
  const openApp = (url) => { copyCaption(); window.open(url, '_blank', 'noopener'); };
  const fbUrl = (data.ref_link) ? ('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(data.ref_link)) : 'https://www.facebook.com';
  const sharePost = async () => {
    const shareData = { text: fullCaption };
    if (data.ref_link) shareData.url = data.ref_link;
    try {
      if (t.media_url && typeof navigator !== 'undefined' && navigator.canShare) {
        const resp = await fetch(t.media_url);
        const blob = await resp.blob();
        const file = new File([blob], 'advantagelife.jpg', { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) shareData.files = [file];
      }
    } catch (e) { /* share without the image if it can't be fetched */ }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData); } catch (e) { /* user cancelled */ }
    } else {
      copyCaption();
      window.alert('Caption copied! Open Facebook or Instagram and paste it into your post.');
    }
  };

  const toggleCheck = (field) => {
    const cur = !!(data.checklist && data.checklist[field]);
    setData({ ...data, checklist: { ...data.checklist, [field]: !cur } }); // optimistic
    apiPost('/api/al/momentum/checklist', { field, value: !cur }).then(load).catch(load);
  };
  const addToPlan = (ideaId, dateStr) => {
    apiPost('/api/al/momentum/plan', { idea_id: ideaId, date: dateStr }).then(load).catch(load);
  };
  const togglePlanDone = (id) => apiPost(`/api/al/momentum/plan/${id}/done`, {}).then(load).catch(load);

  const ch = data.challenge;
  const streak = data.streak || 0;
  const lib = (data.library || []).filter((i) => tab === 'all' || i.category === tab);

  return (
    <CategoryShell>
      <style>{CSS}</style>
      <div className="mmwrap">

        <div className="hero">
          <div className="hl">
            <div className="hk">AdvantageLife · Build your business</div>
            <h1>Your <span className="g">content</span> planner</h1>
            <p>Post something today. We'll tell you what, write it for you, and keep you on a roll — because members who post are the ones who sell.</p>
          </div>
          <div className="streak">
            <div className="big">🔥 {streak}</div>
            <div className="lbl">Day streak</div>
            <div className="dots">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} className={'dot' + (i < streak ? ' on' : '')} />)}</div>
          </div>
        </div>

        {ch && (
          <div className="challenge">
            <div className="ch-icon">🎯</div>
            <div className="ch-body">
              <div className="ch-lbl">This week's challenge</div>
              <div className="ch-title">{ch.title}</div>
              <div className="ch-bar"><i style={{ width: Math.min(100, Math.round((ch.progress / (ch.goal || 1)) * 100)) + '%' }} /></div>
              <div className="ch-prog">{ch.progress} of {ch.goal} done{ch.progress >= ch.goal ? ' — challenge complete! 🔥' : ''}</div>
            </div>
            {ch.reward && <div className="ch-reward">Reward<b>{ch.reward}</b></div>}
          </div>
        )}

        {t.title && <>
          <div className="seclabel">Today's post — ready to go</div>
          <div className="today">
            <div className="t-top">
              <span className="fmt">▶ {t.format}</span><span className="ang">{catName(t.category)}</span>
              <h2>{t.title}</h2>
              {t.subtitle && <div className="sub">{t.subtitle}</div>}
            </div>
            <div className="body">
              {hooks.length > 1 && <>
                <div className="hooks-lbl">Pick your hook — the first line that stops the scroll</div>
                <div className="hook-opts">
                  {hooks.map((h, i) => (
                    <button key={i} className={'hook-opt' + (i === selHook ? ' on' : '')} onClick={() => setSelHook(i)}>"{h}"</button>
                  ))}
                </div>
              </>}
              <div className="cap-lbl">Caption — edit or use as-is</div>
              <div className="cap">{fullCaption}</div>
              <div className="acts">
                <button className={'abtn copy' + (copied ? ' ok' : '')} onClick={copyCaption}>{copied ? '✓ Copied' : '📋 Copy caption'}</button>
                {t.media_url && <a className="abtn save" href={t.media_url} download target="_blank" rel="noopener">⬇ Save the graphic</a>}
                {isMobile
                  ? <button className="abtn share" onClick={sharePost}>📲 Share post →</button>
                  : <>
                      <button className="abtn fb" onClick={() => openApp(fbUrl)}>Open Facebook →</button>
                      <button className="abtn ig" onClick={() => openApp('https://www.instagram.com')}>Open Instagram →</button>
                    </>}
              </div>
              <div className="sharenote">{isMobile
                ? <>Tap <b>Share post</b> to send your caption{t.media_url ? ' and graphic' : ''} straight into Facebook, Instagram or WhatsApp — pick the app and it's filled in.</>
                : <>On a computer you post through the website: we <b>copy your caption</b> and open the app — just paste it in (Ctrl/Cmd + V){t.media_url ? ', and drop in the graphic you saved' : ''}.</>}</div>
              {t.tip && <div className="tip">💡 <b>Why this works:</b> {t.tip}</div>}
            </div>
          </div>
        </>}

        <div className="seclabel">Today's momentum — the actions that make sales</div>
        <div className="momentum">
          <div className="m-hd">Keep your streak alive<span>Posting is step one — these turn attention into income.</span></div>
          <div className="m-list">
            {[['posted', "Post today's content"], ['shared', 'Share your link'], ['followed_up', 'Follow up a lead'], ['watched', 'Do your daily watch']].map(([f, label]) => {
              const on = !!(data.checklist && data.checklist[f]);
              return <button key={f} className={'m-item' + (on ? ' done' : '')} onClick={() => toggleCheck(f)}><span className="m-box">{on ? '✓' : ''}</span> {label}</button>;
            })}
          </div>
        </div>

        <div className="seclabel">This week's plan</div>
        <div className="week">
          {(data.week || []).map((d) => (
            <div key={d.date} className={'day' + (d.is_today ? ' today-d' : '')}>
              <div className="dn">{d.is_today ? 'Today' : d.day}</div>
              <div className="dd">{d.num}</div>
              {d.items.map((it) => (
                <button key={it.id} className={'chip ' + (it.done ? 'done' : (it.format || 'post'))} onClick={() => togglePlanDone(it.id)} title="Tap to mark done">
                  {it.done ? '✓ ' : ''}{it.title || it.format}
                </button>
              ))}
              <button className="add" onClick={() => addToPlan(null, d.date)}>+ Add</button>
            </div>
          ))}
        </div>

        <div className="seclabel">Idea library — tap to add to your plan</div>
        <div className="tabs">
          {CATS.map(([id, label]) => <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        <div className="lib">
          {lib.map((i) => (
            <div key={i.id} className="idea">
              <div className="ih"><span className={'icat ' + i.category}>{catName(i.category)}</span><span className="fmt2">{i.format}</span></div>
              <div className="hook">{(i.hooks && i.hooks[0]) ? '"' + i.hooks[0] + '"' : i.title}</div>
              <div className="desc">{i.subtitle}</div>
              <button className="addbtn" onClick={() => addToPlan(i.id, todayISO())}>+ Add to plan</button>
            </div>
          ))}
        </div>

      </div>
    </CategoryShell>
  );
}

function catName(c) {
  return ({ story: 'Your story', proof: 'Proof', teach: 'Teach', offer: 'Offer', bts: 'Behind the scenes' })[c] || c || '';
}
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
