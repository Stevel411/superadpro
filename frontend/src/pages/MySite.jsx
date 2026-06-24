/**
 * MySite.jsx — Member blog/website dashboard ("My Site")
 * ════════════════════════════════════════════════════════════════
 * Lives behind the Builder Tools door. Three states:
 *   - not paid        → upgrade prompt
 *   - no blog yet     → launch screen (one-click "Launch my site")
 *   - blog exists     → dashboard (site header + stats + posts list)
 *
 * The post editor is a dedicated next build; the "Write new post"
 * action flags that rather than dead-linking.
 *
 * Public rendering engine: app/blog_render.py. API: /api/blog/me,
 * /api/blog/launch.
 */
import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import {
  PenSquare, Eye, Copy, Check, FileText, Edit3, MoreHorizontal,
  Lock, Globe, Palette, Mail, Sparkles, ArrowRight,
} from 'lucide-react';

const C = {
  ink: '#0a1438', ink2: '#1e2c54', dim: '#5b6b8c', line: '#e6edf8', line2: '#eef3fa',
  cy1: '#0891b2', cy2: '#06b6d4', bg: '#f4f7fc', card: '#fff', grn: '#16a34a', amb: '#b45309',
};
const sora = "'Sora',sans-serif";
const mono = "'JetBrains Mono',monospace";

const STATUS = {
  published: { bg: '#e7f6ee', fg: '#15803d', label: 'Published' },
  draft:     { bg: '#fdf4e3', fg: '#b45309', label: 'Draft' },
  scheduled: { bg: '#e9f0fd', fg: '#1e40af', label: 'Scheduled' },
};

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return ''; }
}

export default function MySite() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try { setData(await apiGet('/api/blog/me')); } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const launch = async () => {
    setLaunching(true); setErr('');
    try { await apiPost('/api/blog/launch', {}); await load(); }
    catch (e) { setErr(e.message); }
    setLaunching(false);
  };

  const copyUrl = (url) => {
    const full = window.location.origin + url;
    try { navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) {}
  };

  const flagEditor = () => {
    setNotice('The post editor lands in the very next update — your site is already live and ready.');
    setTimeout(() => setNotice(''), 4200);
  };

  if (loading) {
    return <AppLayout title="My Site"><div style={{ padding: 60, textAlign: 'center', color: C.dim, fontFamily: sora }}>Loading your site…</div></AppLayout>;
  }

  const isPro = data?.is_pro;
  const blog = data?.blog;

  // ── gated (not a paid member) ──────────────────────────────────────────────
  if (!isPro) {
    return (
      <AppLayout title="My Site">
        <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#eef3fa', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Lock size={26} color={C.dim} />
          </div>
          <h2 style={{ fontFamily: sora, fontSize: 24, fontWeight: 800, color: C.ink }}>Your own website is a Partner feature</h2>
          <p style={{ color: C.dim, fontSize: 16, lineHeight: 1.6, margin: '12px 0 24px' }}>
            Build a full blog and website — your posts, your pages, your brand, your domain. Included with Partner membership.
          </p>
          <a href="/upgrade" style={btn('primary')}>Activate Partner <ArrowRight size={16} /></a>
        </div>
      </AppLayout>
    );
  }

  // ── launch screen (no blog yet) ────────────────────────────────────────────
  if (!blog) {
    const themeStrip = ['linear-gradient(135deg,#0f6e4f,#0a4d37)', '#1d2c4a', '#faf8f3', 'linear-gradient(135deg,#7c3aed,#5b21b6)', '#0a0a12', 'linear-gradient(135deg,#b8e6ff,#d7c9ff)'];
    const feats = [
      [PenSquare, 'Write & publish posts', 'A clean editor with AI-assisted drafting.'],
      [Palette, '6 themes & 7 palettes', 'Switch the whole look in one click.'],
      [Mail, 'Capture subscribers', 'Opt-in forms flow into SuperLeads.'],
      [Globe, 'Your own domain', 'Connect a custom domain, or use a free address.'],
    ];
    return (
      <AppLayout title="My Site">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ ...cardStyle(), overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#0a1438,#13224a)', color: '#fff', padding: '52px 50px', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 100% at 50% 0%,rgba(14,165,233,.25),transparent 60%)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'inline-block', background: 'rgba(14,165,233,.18)', border: '1px solid rgba(14,165,233,.3)', color: '#7dd3fc', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 20, marginBottom: 20 }}>Included with your membership</div>
                <h1 style={{ fontFamily: sora, fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px' }}>Launch your own website</h1>
                <p style={{ fontSize: 17, color: '#c3d2ee', margin: '16px auto 0', maxWidth: '46ch', lineHeight: 1.6 }}>A real blog and website — your posts, your pages, your brand, your custom domain. Built to bring you readers and grow your audience.</p>
              </div>
            </div>
            <div style={{ padding: '38px 50px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18, marginBottom: 30 }}>
                {feats.map(([Icon, title, desc], i) => (
                  <div key={i} style={{ display: 'flex', gap: 13 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#e8f7fb', color: C.cy1, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={18} /></div>
                    <div><b style={{ fontFamily: sora, fontSize: 15 }}>{title}</b><div style={{ fontSize: 13.5, color: C.dim, marginTop: 3 }}>{desc}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                {themeStrip.map((bg, i) => <div key={i} style={{ flex: 1, height: 64, borderRadius: 10, background: bg, border: bg === '#faf8f3' ? `1px solid ${C.line}` : 'none' }} />)}
              </div>
              {err && <div style={errBox}>{err}</div>}
              <div style={{ textAlign: 'center' }}>
                <button onClick={launch} disabled={launching} style={{ ...btn('primary'), fontSize: 16, padding: '15px 38px', opacity: launching ? 0.7 : 1 }}>
                  {launching ? 'Building your site…' : <>Launch my site <ArrowRight size={17} /></>}
                </button>
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 12 }}>Takes a few seconds. You can change everything later.</div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── dashboard (blog exists) ────────────────────────────────────────────────
  const posts = data.posts || [];
  const stats = [
    ['Published', blog.published, C.ink],
    ['Drafts', blog.drafts, C.ink],
    ['Total views', blog.total_views.toLocaleString(), C.cy1],
    ['Subscribers', blog.subscribers, C.grn],
  ];
  const tabs = ['posts', 'pages', 'appearance', 'settings'];

  return (
    <AppLayout title="My Site">
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {notice && <div style={{ ...noticeBox }}>{notice}</div>}

        {/* site header */}
        <div style={{ ...cardStyle(), padding: '24px 26px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ width: 54, height: 54, borderRadius: 13, background: 'linear-gradient(135deg,#0f6e4f,#0a4d37)', flexShrink: 0 }} />
          <div style={{ minWidth: 200 }}>
            <h2 style={{ fontFamily: sora, fontSize: 21, fontWeight: 800, color: C.ink }}>{blog.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <span style={{ fontFamily: mono, fontSize: 13, color: C.cy1 }}>{window.location.host}{blog.url}</span>
              <span onClick={() => copyUrl(blog.url)} style={{ fontSize: 12, color: C.dim, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {copied ? <><Check size={13} /> copied</> : <><Copy size={13} /> copy</>}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <a href={blog.url} target="_blank" rel="noopener noreferrer" style={btn('ghost')}>View site <Eye size={15} /></a>
            <button onClick={flagEditor} style={btn('primary')}><PenSquare size={15} /> Write new post</button>
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
          {stats.map(([label, val, color], i) => (
            <div key={i} style={{ ...cardStyle(), padding: '18px 20px' }}>
              <div style={{ fontSize: 12.5, color: C.dim, fontWeight: 600 }}>{label}</div>
              <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, marginTop: 4, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, marginBottom: 20 }}>
          {tabs.map((tb) => (
            <a key={tb} onClick={() => setTab(tb)} style={{
              padding: '12px 18px', fontFamily: sora, fontSize: 14.5, cursor: 'pointer', textTransform: 'capitalize',
              fontWeight: tab === tb ? 600 : 500, color: tab === tb ? C.ink : C.dim,
              borderBottom: tab === tb ? `2px solid ${C.cy1}` : '2px solid transparent',
            }}>{tb}</a>
          ))}
        </div>

        {tab === 'posts' && (
          <div style={{ ...cardStyle(), overflow: 'hidden' }}>
            {posts.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: C.dim }}>No posts yet. Your starter post is on its way.</div>}
            {posts.map((p, i) => {
              const st = STATUS[p.status] || STATUS.draft;
              const meta = p.status === 'scheduled' && p.scheduled_at ? `Scheduled for ${fmtDate(p.scheduled_at)}`
                : p.status === 'draft' ? (p.updated_at ? `Last edited ${fmtDate(p.updated_at)}` : 'Draft')
                : `${p.tags[0] ? p.tags[0] + ' · ' : ''}${fmtDate(p.published_at)}`;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderBottom: i < posts.length - 1 ? `1px solid ${C.line2}` : 'none' }}>
                  <div style={{ width: 52, height: 38, borderRadius: 8, background: gradFor(p.id), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                    <div style={{ fontSize: 12.5, color: C.dim, marginTop: 2 }}>{meta}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 20, background: st.bg, color: st.fg }}>{st.label}</span>
                  <div style={{ fontFamily: mono, fontSize: 13, color: C.dim, width: 60, textAlign: 'right' }}>{p.status === 'published' ? p.views : '—'}</div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                    <span onClick={flagEditor} style={iconBtn}><Edit3 size={14} /></span>
                    <span style={iconBtn}><MoreHorizontal size={14} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab !== 'posts' && (
          <div style={{ ...cardStyle(), padding: 48, textAlign: 'center', color: C.dim }}>
            <Sparkles size={22} style={{ marginBottom: 10, opacity: 0.6 }} />
            <div style={{ fontFamily: sora, fontWeight: 600, color: C.ink2, marginBottom: 4, textTransform: 'capitalize' }}>{tab}</div>
            <div style={{ fontSize: 14 }}>This section arrives in an upcoming update.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── style helpers ────────────────────────────────────────────────────────────
function cardStyle() { return { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }; }
function btn(kind) {
  const base = { fontFamily: sora, fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 10, padding: '11px 18px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' };
  if (kind === 'primary') return { ...base, background: 'linear-gradient(135deg,#0891b2,#0ea5e9)', color: '#fff' };
  return { ...base, background: '#fff', border: `1px solid ${C.line}`, color: C.ink2 };
}
const iconBtn = { width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', color: C.dim, cursor: 'pointer' };
const errBox = { background: '#fdecec', border: '1px solid #f5c2c2', color: '#b42318', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, marginBottom: 16 };
const noticeBox = { background: '#e8f7fb', border: '1px solid #b6e3ef', color: '#0e7490', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, marginBottom: 16, fontWeight: 500 };
const GRADS = ['linear-gradient(135deg,#cfe8dd,#a7d3c0)', 'linear-gradient(135deg,#f3e6d0,#e6c894)', 'linear-gradient(135deg,#dbe7f5,#aac6e6)', 'linear-gradient(135deg,#ecdcef,#cbabd6)', 'linear-gradient(135deg,#d3ece4,#a3cdbb)', 'linear-gradient(135deg,#f6dcd8,#e6aaa0)'];
function gradFor(id) { return GRADS[(id || 0) % GRADS.length]; }
