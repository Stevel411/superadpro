/**
 * Page Builder — "My Pages" launcher (member-facing).
 * Start from a template (one click -> pre-built page) or from scratch,
 * then manage existing pages. Editor at /labs/pagebuilder/edit/{id}.
 */
import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { LABS_TEMPLATES, TEMPLATE_CATEGORIES } from './labs-superpages/labsTemplates';
import exportHTML from './labs-superpages/exportHTML';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', INK = '#0d1a3a', MUTED = '#5a6478';
const CARD = 'linear-gradient(180deg,#fffdf9,#fbf7ef)';
const LINE = '1px solid rgba(140,110,60,0.16)';

export default function LabsPageBuilder() {
  const [pages, setPages] = useState(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiGet('/api/funnels').then(d => setPages(d.funnels || [])).catch(() => setErr(true));
  }, []);

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
    let html = '';
    try { html = exportHTML(tpl.els, tpl.canvasBg, tpl.canvasBgImage || '', undefined, undefined); } catch (e) { html = ''; }
    create({
      title: tpl.name, headline: tpl.name, gjs_html: html,
      gjs_css: JSON.stringify({ els: tpl.els, canvasBg: tpl.canvasBg, canvasBgImage: tpl.canvasBgImage || '', pageSettings: {} }),
      status: 'draft',
    });
  };

  const cats = (TEMPLATE_CATEGORIES || []).filter(c => c.key === 'all' || LABS_TEMPLATES.some(t => t.category === c.key));
  const visible = filter === 'all' ? LABS_TEMPLATES : LABS_TEMPLATES.filter(t => t.category === filter);

  return (
    <AppLayout title="Page Builder" subtitle="Start from a template, or build from scratch">
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 20, padding: '30px 34px', color: '#fff', marginBottom: 30, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(18,56,143,0.25)' }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 240, height: 260, background: 'radial-gradient(circle, rgba(200,16,46,0.4), transparent 70%)', pointerEvents: 'none' }} />
          <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', position: 'relative' }}>Pick a template. Make it yours. Publish.</h1>
          <p style={{ margin: '0 0 20px', fontSize: 15, opacity: 0.85, maxWidth: 560, lineHeight: 1.55, position: 'relative' }}>Start from a professionally designed page below, or build your own from a blank canvas. Either way, it goes live at your own link.</p>
          <button onClick={createBlank} disabled={busy} style={{ position: 'relative', height: 44, padding: '0 22px', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: busy ? 'default' : 'pointer' }}>＋ Start from scratch</button>
        </div>

        {/* Templates */}
        <h2 style={{ margin: '0 0 14px', fontSize: 19, fontWeight: 900, color: INK, letterSpacing: '-0.01em' }}>Start from a template</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {cats.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)} style={{ height: 34, padding: '0 14px', borderRadius: 99, border: filter === c.key ? 'none' : LINE, background: filter === c.key ? `linear-gradient(135deg,${NAVY2},${NAVY})` : '#fff', color: filter === c.key ? '#fff' : MUTED, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{c.label}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, marginBottom: 40 }}>
          {visible.map(tpl => (
            <div key={tpl.id} style={{ background: CARD, border: LINE, borderRadius: 15, overflow: 'hidden', boxShadow: '0 1px 2px rgba(10,31,82,0.05)', transition: 'transform .15s, box-shadow .15s', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(18,56,143,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 2px rgba(10,31,82,0.05)'; }}>
              <div style={{ height: 130, background: tpl.thumbnailGradient || `linear-gradient(135deg,${NAVY},${NAVY2})`, position: 'relative' }}>
                <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.85)', color: NAVY2 }}>{tpl.category}</span>
              </div>
              <div style={{ padding: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 5 }}>{tpl.name}</div>
                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45, flex: 1 }} dangerouslySetInnerHTML={{ __html: tpl.description || '' }} />
                <button onClick={() => createFromTemplate(tpl)} disabled={busy} style={{ marginTop: 13, height: 40, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#e8203f,#c8102e)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: busy ? 'default' : 'pointer', boxShadow: '0 4px 12px rgba(200,16,46,0.25)' }}>{busy ? 'Creating…' : 'Use this template'}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Your pages */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: INK, letterSpacing: '-0.01em' }}>Your pages</h2>
        </div>
        {err && <div style={{ padding: 18, borderRadius: 14, background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.18)', color: RED, fontWeight: 700 }}>Couldn't load your pages right now. Please refresh.</div>}
        {!pages && !err && <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>Loading your pages…</div>}
        {pages && pages.length === 0 && (
          <div style={{ padding: 36, textAlign: 'center', background: CARD, border: LINE, borderRadius: 16, color: MUTED, fontWeight: 600 }}>No pages yet — pick a template above to create your first one.</div>
        )}
        {pages && pages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 40 }}>
            {pages.map(p => (
              <a key={p.id} href={`/labs/pagebuilder/edit/${p.id}`}
                style={{ textDecoration: 'none', background: CARD, border: LINE, borderRadius: 15, padding: 18, display: 'block', boxShadow: '0 1px 2px rgba(10,31,82,0.05)', transition: 'transform .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(18,56,143,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 2px rgba(10,31,82,0.05)'; }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || 'Untitled Page'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 6, background: p.status === 'published' ? 'rgba(22,163,74,0.12)' : 'rgba(200,16,46,0.10)', color: p.status === 'published' ? '#16a34a' : RED }}>{p.status === 'published' ? 'Published' : 'Draft'}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: NAVY2 }}>Edit →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
