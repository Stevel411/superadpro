/**
 * My Pages — the member's created pages. Edit, delete, and view stats.
 * Separate from the Templates page (/labs/pagebuilder).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { apiGet, apiPost } from '../../utils/api';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', INK = '#0d1a3a', MUTED = '#5a6478';
const CARD = 'linear-gradient(180deg,#fffdf9,#fbf7ef)';
const LINE = '1px solid rgba(140,110,60,0.16)';

export default function MyPages() {
  const [pages, setPages] = useState(null);
  const [err, setErr] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => apiGet('/api/funnels').then(d => setPages(d.funnels || [])).catch(() => setErr(true));
  useEffect(() => { load(); }, []);

  const del = async (p) => {
    if (!window.confirm(`Delete "${p.title || 'Untitled Page'}"? This can't be undone.`)) return;
    setDeleting(p.id);
    try { await apiPost(`/api/funnels/delete/${p.id}`, {}); setPages(cur => (cur || []).filter(x => x.id !== p.id)); }
    catch (e) { alert(`Couldn't delete the page: ${e.message || e}`); }
    setDeleting(null);
  };

  return (
    <AppLayout title="My Pages" subtitle="Edit, publish, and track your pages">
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: INK, letterSpacing: '-0.01em' }}>Your pages</h2>
          <Link to="/labs/pagebuilder" style={{ height: 42, padding: '0 20px', borderRadius: 12, background: 'linear-gradient(135deg,#e8203f,#c8102e)', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', boxShadow: '0 5px 14px rgba(200,16,46,0.28)' }}>＋ New page from a template</Link>
        </div>

        {err && <div style={{ padding: 18, borderRadius: 14, background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.18)', color: RED, fontWeight: 700 }}>Couldn't load your pages right now. Please refresh.</div>}
        {!pages && !err && <div style={{ padding: 44, textAlign: 'center', color: MUTED, fontWeight: 600 }}>Loading your pages…</div>}
        {pages && pages.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', background: CARD, border: LINE, borderRadius: 18 }}>
            <div style={{ fontSize: 16, color: INK, fontWeight: 900, marginBottom: 6 }}>No pages yet</div>
            <div style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>Pick a professionally designed template to create your first one.</div>
            <Link to="/labs/pagebuilder" style={{ height: 44, padding: '0 22px', borderRadius: 12, background: 'linear-gradient(135deg,#e8203f,#c8102e)', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Browse templates →</Link>
          </div>
        )}

        {pages && pages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
            {pages.map(p => (
              <div key={p.id} style={{ background: CARD, border: LINE, borderRadius: 15, padding: 18, boxShadow: '0 1px 2px rgba(10,31,82,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: INK, marginBottom: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || 'Untitled Page'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 6, background: p.status === 'published' ? 'rgba(22,163,74,0.12)' : 'rgba(200,16,46,0.10)', color: p.status === 'published' ? '#16a34a' : RED }}>{p.status === 'published' ? 'Published' : 'Draft'}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, display: 'inline-flex', alignItems: 'center', gap: 4 }}>👁 {(p.views != null ? p.views : 0).toLocaleString()} views</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <a href={`/labs/pagebuilder/edit/${p.id}`} style={{ flex: 1, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#1a44a8,#0a1f52)', color: '#fff', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Edit</a>
                  <button onClick={() => del(p)} disabled={deleting === p.id} title="Delete page" style={{ width: 44, height: 40, borderRadius: 10, border: '1.5px solid rgba(200,16,46,0.3)', background: '#fff', color: RED, fontWeight: 800, fontSize: 15, cursor: deleting === p.id ? 'default' : 'pointer', opacity: deleting === p.id ? 0.5 : 1 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
