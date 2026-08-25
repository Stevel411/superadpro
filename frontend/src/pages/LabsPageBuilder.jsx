/**
 * Page Builder — "My Pages" launcher (member-facing).
 * Lists the member's pages, creates new ones, and opens the drag-anywhere
 * editor at /labs/pagebuilder/edit/{id}. Backend: /api/funnels/*.
 */
import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', INK = '#0d1a3a', MUTED = '#5a6478';
const CARD = 'linear-gradient(180deg,#fffdf9,#fbf7ef)';
const LINE = '1px solid rgba(140,110,60,0.16)';

export default function LabsPageBuilder() {
  const [pages, setPages] = useState(null);
  const [err, setErr] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiGet('/api/funnels').then(d => setPages(d.funnels || [])).catch(() => setErr(true));
  }, []);

  const createNew = async () => {
    if (creating) return; setCreating(true);
    try {
      const res = await apiPost('/api/funnels/save', { title: 'Untitled Page', status: 'draft' });
      if (res && res.id) { window.location.href = `/labs/pagebuilder/edit/${res.id}`; return; }
      alert("Couldn't create the page — please try again."); setCreating(false);
    } catch (e) { alert(`Couldn't create page: ${e.message || e}`); setCreating(false); }
  };

  const newBtn = (small) => (
    <button onClick={createNew} disabled={creating} style={small
      ? { height: 38, padding: '0 16px', border: '1.5px solid rgba(13,26,58,0.14)', borderRadius: 10, background: '#fff', color: NAVY2, fontWeight: 800, fontSize: 13, cursor: creating ? 'default' : 'pointer' }
      : { position: 'relative', height: 46, padding: '0 24px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#e8203f,#c8102e)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: creating ? 'default' : 'pointer', boxShadow: '0 6px 18px rgba(200,16,46,0.35)', opacity: creating ? 0.7 : 1 }}>
      {creating ? 'Creating…' : (small ? '＋ New page' : '＋ New page')}
    </button>
  );

  return (
    <AppLayout title="Page Builder" subtitle="Create and manage your landing pages">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 20, padding: '32px 34px', color: '#fff', marginBottom: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(18,56,143,0.25)' }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 240, height: 260, background: 'radial-gradient(circle, rgba(200,16,46,0.4), transparent 70%)', pointerEvents: 'none' }} />
          <h1 style={{ margin: '0 0 10px', fontSize: 29, fontWeight: 900, letterSpacing: '-0.02em', position: 'relative' }}>Build a page in minutes</h1>
          <p style={{ margin: '0 0 22px', fontSize: 15, opacity: 0.85, maxWidth: 540, lineHeight: 1.55, position: 'relative' }}>Drop any element onto the canvas, style it your way, and publish. Your page goes live at your own link.</p>
          {newBtn(false)}
        </div>

        {/* Your pages */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: INK, letterSpacing: '-0.01em' }}>Your pages</h2>
          {pages && pages.length > 0 && newBtn(true)}
        </div>

        {err && <div style={{ padding: 18, borderRadius: 14, background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.18)', color: RED, fontWeight: 700 }}>Couldn't load your pages right now. Please refresh the page.</div>}
        {!pages && !err && <div style={{ padding: 44, textAlign: 'center', color: MUTED, fontWeight: 600 }}>Loading your pages…</div>}

        {pages && pages.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', background: CARD, border: LINE, borderRadius: 18, boxShadow: '0 1px 3px rgba(10,31,82,0.05)' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 15, background: 'linear-gradient(135deg,rgba(18,56,143,0.12),rgba(200,16,46,0.10))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NAVY2, fontSize: 24 }}>✦</div>
            <div style={{ fontSize: 16, color: INK, fontWeight: 900, marginBottom: 6 }}>No pages yet</div>
            <div style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>Create your first page and start building.</div>
            {newBtn(false)}
          </div>
        )}

        {pages && pages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {pages.map(p => (
              <a key={p.id} href={`/labs/pagebuilder/edit/${p.id}`}
                style={{ textDecoration: 'none', background: CARD, border: LINE, borderRadius: 15, padding: 18, display: 'block', boxShadow: '0 1px 2px rgba(10,31,82,0.05)', transition: 'transform .15s, box-shadow .15s, border-color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(18,56,143,0.14)'; e.currentTarget.style.borderColor = 'rgba(18,56,143,0.28)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 2px rgba(10,31,82,0.05)'; e.currentTarget.style.borderColor = 'rgba(140,110,60,0.16)'; }}>
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
