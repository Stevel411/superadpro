import { useState, useEffect } from 'react';
import AlShell from '../components/layout/AlShell';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Space+Mono:wght@700&display=swap');
.folio{max-width:1000px}
.folio-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.folio-eyebrow{font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#5b3df5}
.folio-h1{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(26px,4vw,38px);font-weight:800;letter-spacing:-.03em;color:#17141c;margin:8px 0 4px;line-height:1}
.folio-sub{font-size:14px;color:#5a6584;font-weight:600;margin:0}
.folio-new{background:#5b3df5;color:#fff;border:none;border-radius:12px;padding:13px 22px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 14px 26px -12px rgba(91,61,245,.55);white-space:nowrap}
.folio-new:hover{background:#4a2fd6}
.folio-empty{background:#fff;border:1.5px dashed #d9d2f0;border-radius:18px;padding:54px 24px;text-align:center}
.folio-empty .ic{font-size:40px}
.folio-empty h3{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;color:#17141c;margin:12px 0 6px}
.folio-empty p{color:#5a6584;font-size:14px;margin:0 0 20px}
.folio-list{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
@media(max-width:720px){.folio-list{grid-template-columns:1fr}}
.folio-card{background:#fff;border:1px solid #e6ecf5;border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:12px}
.folio-card .r1{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.folio-card .tt{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;color:#17141c;line-height:1.2}
.folio-card .badge{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:20px;font-family:'Space Mono',monospace;flex:none}
.folio-card .badge.pub{background:rgba(13,159,110,.12);color:#0d7a52}
.folio-card .badge.draft{background:#f0eef6;color:#6b6e7c}
.folio-card .meta{font-size:12px;color:#8b8496;font-weight:600}
.folio-card .acc{width:26px;height:26px;border-radius:8px;flex:none}
.folio-card .acts{display:flex;gap:8px;margin-top:2px}
.folio-card .acts a,.folio-card .acts button{flex:1;text-align:center;text-decoration:none;border-radius:10px;padding:9px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;border:1.5px solid #e6ecf5;background:#fff;color:#17141c}
.folio-card .acts .edit{background:#17141c;color:#fff;border-color:#17141c}
.folio-card .acts .del{flex:none;color:#c0455a;border-color:#f0d5da;width:40px}
.folio-modal{position:fixed;inset:0;z-index:400;background:rgba(23,20,28,.5);display:flex;align-items:center;justify-content:center;padding:20px}
.folio-modal .box{background:#f6f2ea;border-radius:20px;padding:24px;width:min(94vw,760px);max-height:88vh;overflow:auto}
.folio-modal h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;color:#17141c;margin:0 0 3px}
.folio-modal .ms{color:#5a6584;font-size:13.5px;margin:0 0 18px}
.tpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:640px){.tpl-grid{grid-template-columns:1fr 1fr}}
.tpl{border:1.5px solid #e3dccd;border-radius:14px;overflow:hidden;cursor:pointer;background:#fffdf8;text-align:left;transition:transform .3s,border-color .3s}
.tpl:hover{transform:translateY(-4px);border-color:#5b3df5}
.tpl .cap{height:78px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px}
.tpl .m{padding:11px 13px}
.tpl .m b{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;color:#17141c;display:block}
.tpl .m span{font-family:'Space Mono',monospace;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:#8b8496}
.folio-x{background:#e7e1d4;border:none;border-radius:10px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;margin-top:16px}
.folio-load{color:#8b8496;font-size:14px;padding:30px 0;text-align:center}
`;

const TEMPLATES = [
  { id: 'lumen', name: 'Lumen', cat: 'Lead Capture', accent: '#5b3df5', secs: ['nav', 'hero', 'stats', 'features', 'quote', 'cta', 'footer'] },
  { id: 'ascend', name: 'Ascend', cat: 'Sales Page', accent: '#ff5c39', secs: ['nav', 'heroCenter', 'featRow', 'steps', 'quote', 'pricing', 'faq', 'cta', 'footer'] },
  { id: 'beacon', name: 'Beacon', cat: 'Link in Bio', accent: '#7c3aed', secs: ['bio'] },
  { id: 'assembly', name: 'Assembly', cat: 'Webinar', accent: '#2563eb', secs: ['nav', 'webinar', 'features', 'quote', 'footer'] },
  { id: 'horizon', name: 'Horizon', cat: 'Coming Soon', accent: '#5b3df5', secs: ['comingSoon'] },
  { id: 'relay', name: 'Relay', cat: 'Thank You', accent: '#0d9f6e', secs: ['nav', 'thankYou', 'footer'] },
  { id: 'blank', name: 'Blank', cat: 'Start fresh', accent: '#5b3df5', secs: ['nav', 'heroCenter', 'cta', 'footer'] },
];

export default function Folio() {
  const [pages, setPages] = useState(null);
  const [gallery, setGallery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => { load(); fetch('/api/me').then(r => r.json()).then(setMe).catch(() => {}); }, []);
  function load() {
    fetch('/api/folio/pages').then(r => r.json()).then(d => setPages(d.pages || [])).catch(() => setPages([]));
  }
  function create(t) {
    if (busy) return; setBusy(true);
    fetch('/api/folio/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: t.id, title: t.name + ' page', accent: t.accent, sections: t.secs.map(s => ({ type: s, props: {} })) })
    }).then(r => r.json()).then(d => {
      if (d && d.ok) { window.location.href = '/folio/edit/' + d.id; }
      else { setBusy(false); alert('Could not create the page — please try again.'); }
    }).catch(() => { setBusy(false); alert('Could not create the page — please try again.'); });
  }
  function del(id) {
    if (!window.confirm('Delete this page? This cannot be undone.')) return;
    fetch('/api/folio/pages/' + id + '/delete', { method: 'POST' }).then(r => r.json()).then(() => load()).catch(() => {});
  }

  return (
    <AlShell active="folio">
      <style>{CSS}</style>
      <div className="folio">
        <div className="folio-top">
          <div>
            <div className="folio-eyebrow">Folio · Page Builder</div>
            <h1 className="folio-h1">Your pages</h1>
            <p className="folio-sub">Build beautiful landing pages, opt-ins and bios — free, and ready to publish.</p>
          </div>
          <button className="folio-new" onClick={() => setGallery(true)}>+ New page</button>
        </div>

        {pages === null ? (
          <div className="folio-load">Loading your pages…</div>
        ) : pages.length === 0 ? (
          <div className="folio-empty">
            <div className="ic">✦</div>
            <h3>Create your first page</h3>
            <p>Pick a template, make it yours, and publish in minutes.</p>
            <button className="folio-new" onClick={() => setGallery(true)}>+ New page</button>
          </div>
        ) : (
          <div className="folio-list">
            {pages.map(p => (
              <div className="folio-card" key={p.id}>
                <div className="r1">
                  <div>
                    <div className="tt">{p.title}</div>
                    <div className="meta">Updated {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <span className="acc" style={{ background: p.accent || '#5b3df5' }} />
                </div>
                <span className={'badge ' + (p.status === 'published' ? 'pub' : 'draft')}>{p.status === 'published' ? '● Live' : 'Draft'}</span>
                <div className="acts">
                  <a className="edit" href={'/folio/edit/' + p.id}>Edit</a>
                  {p.status === 'published' && me && me.username
                    ? <a href={'/page/' + me.username + '/' + p.slug} target="_blank" rel="noreferrer">View</a>
                    : null}
                  <button className="del" onClick={() => del(p.id)} title="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {gallery ? (
        <div className="folio-modal" onClick={e => { if (e.target === e.currentTarget) setGallery(false); }}>
          <div className="box">
            <h2>Start from beautiful</h2>
            <p className="ms">Pick a template — you can change everything, and recolour it in one tap.</p>
            <div className="tpl-grid">
              {TEMPLATES.map(t => (
                <button className="tpl" key={t.id} onClick={() => create(t)} disabled={busy}>
                  <div className="cap" style={{ background: 'linear-gradient(135deg,' + t.accent + ',' + t.accent + 'bb)' }}>{busy ? '…' : t.name}</div>
                  <div className="m"><b>{t.name}</b><span>{t.cat}</span></div>
                </button>
              ))}
            </div>
            <button className="folio-x" onClick={() => setGallery(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </AlShell>
  );
}
