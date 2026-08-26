/**
 * Page Builder — Templates page. Browse + start from a template, or from
 * scratch. Links to My Pages. Editor at /labs/pagebuilder/edit/{id}.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { LABS_TEMPLATES, TEMPLATE_CATEGORIES } from './labs-superpages/labsTemplates';
import exportHTML from './labs-superpages/exportHTML';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', INK = '#0d1a3a', MUTED = '#5a6478';
const CARD = 'linear-gradient(180deg,#fffdf9,#fbf7ef)';
const LINE = '1px solid rgba(140,110,60,0.16)';

export default function LabsPageBuilder() {
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');

  async function create(payload) {
    if (busy) return; setBusy(true);
    try {
      const res = await apiPost('/api/funnels/save', payload);
      if (res && res.id) { window.location.href = `/labs/pagebuilder/edit/${res.id}`; return; }
      alert("Couldn't create the page — please try again."); setBusy(false);
    } catch (e) { alert(`Couldn't create page: ${e.message || e}`); setBusy(false); }
  }
  const createBlank = () => create({ title: 'Untitled Page', status: 'draft' });
  const createFromTemplate = (tpl) => {
    let html = ''; try { html = exportHTML(tpl.els, tpl.canvasBg, tpl.canvasBgImage || '', undefined, undefined); } catch (e) {}
    create({ title: tpl.name, headline: tpl.name, gjs_html: html,
      gjs_css: JSON.stringify({ els: tpl.els, canvasBg: tpl.canvasBg, canvasBgImage: tpl.canvasBgImage || '', pageSettings: {} }), status: 'draft' });
  };

  const cats = (TEMPLATE_CATEGORIES || []).filter(c => c.key === 'all' || LABS_TEMPLATES.some(t => t.category === c.key));
  const visible = filter === 'all' ? LABS_TEMPLATES : LABS_TEMPLATES.filter(t => t.category === filter);

  return (
    <AppLayout title="Page Builder" subtitle="Start from a professionally designed template">
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 20, padding: '30px 34px', color: '#fff', marginBottom: 30, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(18,56,143,0.25)' }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 240, height: 260, background: 'radial-gradient(circle, rgba(200,16,46,0.4), transparent 70%)', pointerEvents: 'none' }} />
          <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', position: 'relative' }}>Pick a template. Make it yours. Publish.</h1>
          <p style={{ margin: '0 0 20px', fontSize: 15, opacity: 0.85, maxWidth: 560, lineHeight: 1.55, position: 'relative' }}>Start from a professionally designed page below, or build your own from scratch. It goes live at your own link.</p>
          <div style={{ display: 'flex', gap: 12, position: 'relative', flexWrap: 'wrap' }}>
            <button onClick={createBlank} disabled={busy} style={{ height: 44, padding: '0 22px', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: busy ? 'default' : 'pointer' }}>＋ Start from scratch</button>
            <Link to="/labs/pagebuilder/mine" style={{ height: 44, padding: '0 22px', borderRadius: 12, background: '#fff', color: NAVY, fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>My Pages →</Link>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {cats.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)} style={{ height: 34, padding: '0 14px', borderRadius: 99, border: filter === c.key ? 'none' : LINE, background: filter === c.key ? `linear-gradient(135deg,${NAVY2},${NAVY})` : '#fff', color: filter === c.key ? '#fff' : MUTED, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{c.label}</button>
          ))}
        </div>

        {/* Template grid with real thumbnails */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18, marginBottom: 44 }}>
          {visible.map(tpl => (
            <div key={tpl.id} style={{ background: CARD, border: LINE, borderRadius: 15, overflow: 'hidden', boxShadow: '0 1px 2px rgba(10,31,82,0.05)', transition: 'transform .15s, box-shadow .15s', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(18,56,143,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 2px rgba(10,31,82,0.05)'; }}>
              <div style={{ height: 158, overflow: 'hidden', position: 'relative', background: tpl.thumbnailGradient || `linear-gradient(135deg,${NAVY},${NAVY2})`, borderBottom: LINE }}>
                <img src={`/static/tpl-thumbs/${tpl.id}.png`} alt="" loading="lazy" style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.9)', color: NAVY2 }}>{tpl.category}</span>
              </div>
              <div style={{ padding: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 5 }}>{tpl.name}</div>
                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45, flex: 1 }} dangerouslySetInnerHTML={{ __html: tpl.description || '' }} />
                <button onClick={() => createFromTemplate(tpl)} disabled={busy} style={{ marginTop: 13, height: 40, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#e8203f,#c8102e)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: busy ? 'default' : 'pointer', boxShadow: '0 4px 12px rgba(200,16,46,0.25)' }}>{busy ? 'Creating…' : 'Use this template'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
