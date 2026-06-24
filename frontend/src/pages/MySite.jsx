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
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../utils/api';
import {
  PenSquare, Eye, Copy, Check, FileText, Edit3, MoreHorizontal,
  Lock, Globe, Palette, Mail, Sparkles, ArrowRight, Plus, Trash2, X, MessageSquare,
} from 'lucide-react';

const C = {
  ink: '#0a1438', ink2: '#1e2c54', dim: '#5b6b8c', line: '#e6edf8', line2: '#eef3fa',
  cy1: '#0891b2', cy2: '#06b6d4', bg: '#f4f7fc', card: '#fff', grn: '#16a34a', amb: '#b45309',
};
const sora = "'Sora',sans-serif";
const mono = "'JetBrains Mono',monospace";

const THEMES = [
  { key: 'banner',         name: 'Banner',         desc: 'Bold full-width header, editorial serif.' },
  { key: 'classic-sidebar',name: 'Classic Sidebar',desc: 'Timeless two-column blog layout.' },
  { key: 'journal',        name: 'Journal',        desc: 'Minimal, text-first and personal.' },
  { key: 'bento',          name: 'Bento',          desc: 'Modern grid of content cards.' },
  { key: 'cinematic',      name: 'Cinematic',      desc: 'Dark, image-forward and dramatic.' },
  { key: 'glass',          name: 'Glass',          desc: 'Frosted depth, clean and modern.' },
];
const PALETTES = [
  { key: 'default',    name: 'Default',    color: 'conic-gradient(from 210deg,#06b6d4,#1e3a8a,#06b6d4)' },
  { key: 'forest',     name: 'Forest',     color: '#0f6e4f' },
  { key: 'cobalt',     name: 'Cobalt',     color: '#1e3a8a' },
  { key: 'plum',       name: 'Plum',       color: '#7c3aed' },
  { key: 'terracotta', name: 'Terracotta', color: '#c2622d' },
  { key: 'rose',       name: 'Rose',       color: '#c43f63' },
  { key: 'slate',      name: 'Slate',      color: '#1f3354' },
  { key: 'ink',        name: 'Ink',        color: '#1a1a1a' },
];

const SOCIALS = [
  { key: 'x',         name: 'X / Twitter', ph: 'https://x.com/you' },
  { key: 'instagram', name: 'Instagram',   ph: 'https://instagram.com/you' },
  { key: 'youtube',   name: 'YouTube',     ph: 'https://youtube.com/@you' },
  { key: 'tiktok',    name: 'TikTok',      ph: 'https://tiktok.com/@you' },
  { key: 'facebook',  name: 'Facebook',    ph: 'https://facebook.com/you' },
  { key: 'linkedin',  name: 'LinkedIn',    ph: 'https://linkedin.com/in/you' },
  { key: 'website',   name: 'Website',     ph: 'https://yoursite.com' },
];

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [theme, setTheme] = useState('banner');
  const [palette, setPalette] = useState('default');
  const [savingAppr, setSavingAppr] = useState(false);
  const [apprSaved, setApprSaved] = useState(false);
  const [pages, setPages] = useState([]);
  const [menu, setMenu] = useState([]);
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [siteTitle, setSiteTitle] = useState('');
  const [siteTagline, setSiteTagline] = useState('');
  const [social, setSocial] = useState({});
  const [commentsOn, setCommentsOn] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [deletingSite, setDeletingSite] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [domain, setDomain] = useState(null);
  const [domainInput, setDomainInput] = useState('');
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainErr, setDomainErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiGet('/api/blog/me'); setData(d);
      if (d.blog) {
        setTheme(d.blog.theme || 'banner'); setPalette(d.blog.palette || 'default');
        setSiteTitle(d.blog.title || ''); setSiteTagline(d.blog.tagline || '');
        setSocial(d.blog.social || {}); setCommentsOn(d.blog.comments_enabled !== false);
        try { const pg = await apiGet('/api/blog/pages'); setPages(pg.pages || []); } catch (e) {}
        try { const mn = await apiGet('/api/blog/menu'); setMenu(mn.menu || []); } catch (e) {}
        try { const an = await apiGet('/api/blog/analytics'); setAnalytics(an); } catch (e) {}
      }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const launch = async () => {
    setLaunching(true); setErr('');
    try { await apiPost('/api/blog/launch', {}); await load(); }
    catch (e) { setErr(e.message); }
    setLaunching(false);
  };

  const saveAppearance = async () => {
    setSavingAppr(true); setErr('');
    try { await apiPatch('/api/blog', { theme, palette }); setApprSaved(true); setTimeout(() => setApprSaved(false), 2500); }
    catch (e) { setErr(e.message); }
    setSavingAppr(false);
  };

  const deletePage = async (id) => {
    if (!window.confirm('Delete this page permanently?')) return;
    try { await apiDelete(`/api/blog/page/${id}`); await load(); } catch (e) { setErr(e.message); }
  };
  const saveMenu = async () => {
    setSavingMenu(true); setErr('');
    try { await apiPut('/api/blog/menu', { items: menu }); setMenuSaved(true); setTimeout(() => setMenuSaved(false), 2500); }
    catch (e) { setErr(e.message); }
    setSavingMenu(false);
  };
  const addMenuItem = () => setMenu([...menu, { label: 'New link', link_type: 'home', target: '' }]);
  const updateMenuItem = (i, patch) => setMenu(menu.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMenuItem = (i) => setMenu(menu.filter((_, idx) => idx !== i));
  const moveMenuItem = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= menu.length) return;
    const m = [...menu]; [m[i], m[j]] = [m[j], m[i]]; setMenu(m);
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try { const r = await apiGet('/api/blog/comments'); setComments(r.comments || []); } catch (e) {}
    setLoadingComments(false);
  };
  useEffect(() => { if (tab === 'comments') loadComments(); }, [tab]);
  const moderate = async (id, action) => {
    try {
      if (action === 'delete') await apiDelete(`/api/blog/comment/${id}`);
      else await apiPost(`/api/blog/comment/${id}/${action}`, {});
      await loadComments(); await load();
    } catch (e) { setErr(e.message); }
  };

  const loadDomain = async () => {
    try { const r = await apiGet('/api/blog/domain'); setDomain(r.domain || null); } catch (e) {}
  };
  useEffect(() => { if (tab === 'settings') loadDomain(); }, [tab]);
  const connectDomain = async () => {
    setDomainBusy(true); setDomainErr('');
    try { const r = await apiPost('/api/blog/domain', { domain: domainInput.trim() }); setDomain(r.domain || null); setDomainInput(''); }
    catch (e) { setDomainErr(e.message || 'Could not connect domain.'); }
    setDomainBusy(false);
  };
  const verifyDomain = async () => {
    setDomainBusy(true); setDomainErr('');
    try { const r = await apiPost('/api/blog/domain/verify', {}); setDomain(r.domain || null); }
    catch (e) { setDomainErr(e.message); }
    setDomainBusy(false);
  };
  const removeDomain = async () => {
    if (!window.confirm('Disconnect this custom domain?')) return;
    setDomainBusy(true); setDomainErr('');
    try { await apiDelete('/api/blog/domain'); setDomain(null); }
    catch (e) { setDomainErr(e.message); }
    setDomainBusy(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true); setErr('');
    const soc = {};
    Object.keys(social).forEach((k) => {
      let v = (social[k] || '').trim();
      if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
      if (v) soc[k] = v;
    });
    try { await apiPatch('/api/blog', { title: siteTitle, tagline: siteTagline, social: soc, comments_enabled: commentsOn }); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); await load(); }
    catch (e) { setErr(e.message); }
    setSavingSettings(false);
  };
  const deleteSite = async () => {
    if (!window.confirm('Delete your entire site and all posts and pages? This cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? Everything will be permanently removed.')) return;
    setDeletingSite(true);
    try { await apiDelete('/api/blog'); await load(); } catch (e) { setErr(e.message); }
    setDeletingSite(false);
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
            <div style={{ background: 'linear-gradient(135deg,#06b6d4,#1e3a8a)', color: '#fff', padding: '52px 50px', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 110% at 50% 0%,rgba(255,255,255,.18),transparent 60%)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 20, marginBottom: 20 }}>Included with your membership</div>
                <h1 style={{ fontFamily: sora, fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px' }}>Launch your own website</h1>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,.92)', margin: '16px auto 0', maxWidth: '46ch', lineHeight: 1.6 }}>A real blog and website — your posts, your pages, your brand, your custom domain. Built to bring you readers and grow your audience.</p>
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
  const tabs = ['posts', 'pages', 'comments', 'appearance', 'settings'];

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
            <button onClick={() => navigate('/my-site/new')} style={btn('primary')}><PenSquare size={15} /> Write new post</button>
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
            }}>{tb}{tb === 'comments' && data?.blog?.pending_comments > 0 && (
              <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 7px', verticalAlign: 'middle' }}>{data.blog.pending_comments}</span>
            )}</a>
          ))}
        </div>

        {tab === 'posts' && (
          <>
            {analytics && analytics.total_30d > 0 && <AnalyticsCard analytics={analytics} />}
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
                    <span onClick={() => navigate(`/my-site/edit/${p.id}`)} style={iconBtn}><Edit3 size={14} /></span>
                    <span style={iconBtn}><MoreHorizontal size={14} /></span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {tab === 'comments' && (
          <div>
            {loadingComments && <div style={{ padding: 30, textAlign: 'center', color: C.dim }}>Loading…</div>}
            {!loadingComments && comments.length === 0 && (
              <div style={{ ...cardStyle(), padding: 48, textAlign: 'center', color: C.dim }}>
                <MessageSquare size={22} style={{ marginBottom: 10, opacity: 0.6 }} />
                <div style={{ fontFamily: sora, fontWeight: 600, color: C.ink2, marginBottom: 4 }}>No comments yet</div>
                <div style={{ fontSize: 14 }}>When readers comment, they'll appear here for you to approve.</div>
              </div>
            )}
            {!loadingComments && comments.length > 0 && (
              <div style={{ ...cardStyle(), overflow: 'hidden' }}>
                {comments.map((c, i) => (
                  <div key={c.id} style={{ padding: '16px 20px', borderBottom: i < comments.length - 1 ? `1px solid ${C.line2}` : 'none', background: c.status === 'pending' ? '#fffdf5' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{c.author_name}</span>
                      <span style={{ fontSize: 12.5, color: C.dim }}>on “{c.post_title}”</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12 }}>{c.body}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.status !== 'approved' && <button onClick={() => moderate(c.id, 'approve')} style={pillBtn('#15803d', '#e7f6ee')}><Check size={13} /> Approve</button>}
                      {c.status !== 'rejected' && <button onClick={() => moderate(c.id, 'reject')} style={pillBtn('#b45309', '#fdf4e3')}>Reject</button>}
                      <button onClick={() => moderate(c.id, 'delete')} style={pillBtn('#b42318', '#fbeaea')}><Trash2 size={13} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'appearance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 22, alignItems: 'start' }}>
            <div>
              <div style={{ ...cardStyle(), padding: 20, marginBottom: 18 }}>
                <div style={sectionLabel}>Theme</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {THEMES.map((th) => (
                    <div key={th.key} onClick={() => setTheme(th.key)} style={{
                      border: `1.5px solid ${theme === th.key ? C.cy2 : C.line}`, borderRadius: 11,
                      padding: '12px 13px', cursor: 'pointer', position: 'relative',
                      background: theme === th.key ? '#f0fbfe' : '#fff' }}>
                      {theme === th.key && <Check size={14} color={C.cy1} style={{ position: 'absolute', top: 10, right: 10 }} />}
                      <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 14, color: C.ink }}>{th.name}</div>
                      <div style={{ fontSize: 11.5, color: C.dim, marginTop: 3, lineHeight: 1.4 }}>{th.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...cardStyle(), padding: 20, marginBottom: 18 }}>
                <div style={sectionLabel}>Colour palette</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {PALETTES.map((pl) => (
                    <div key={pl.key} onClick={() => setPalette(pl.key)} style={{ textAlign: 'center', cursor: 'pointer', width: 54 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto', background: pl.color,
                        border: palette === pl.key ? `3px solid ${C.cy2}` : `2px solid ${C.line}`, display: 'grid', placeItems: 'center' }}>
                        {palette === pl.key && <Check size={15} color="#fff" />}
                      </div>
                      <div style={{ fontSize: 11, color: palette === pl.key ? C.ink : C.dim, marginTop: 5, fontWeight: palette === pl.key ? 600 : 500 }}>{pl.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={saveAppearance} disabled={savingAppr} style={{ ...btn('primary'), width: '100%', justifyContent: 'center' }}>
                {savingAppr ? 'Saving…' : apprSaved ? <><Check size={16} /> Saved</> : 'Save appearance'}
              </button>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 10, textAlign: 'center' }}>Changes go live on your site when you save.</div>
            </div>
            <div style={{ ...cardStyle(), overflow: 'hidden', position: 'sticky', top: 20 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.line}`, fontSize: 12.5, color: C.dim, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Eye size={14} /> Live preview — {THEMES.find((t) => t.key === theme)?.name}
              </div>
              <iframe title="Site preview" src={`${blog.url}?theme=${theme}&palette=${palette}`}
                style={{ width: '100%', height: 580, border: 'none', display: 'block', background: '#fff' }} />
            </div>
          </div>
        )}

        {tab === 'pages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
            <div style={{ ...cardStyle(), overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: `1px solid ${C.line}` }}>
                <div style={sectionLabel2}>Pages</div>
                <button onClick={() => navigate('/my-site/pages/new')} style={{ ...btn('primary'), marginLeft: 'auto', padding: '8px 14px', fontSize: 13 }}><Plus size={14} /> New page</button>
              </div>
              {pages.length === 0 && <div style={{ padding: 36, textAlign: 'center', color: C.dim, fontSize: 14 }}>No pages yet.</div>}
              {pages.map((pg, i) => (
                <div key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < pages.length - 1 ? `1px solid ${C.line2}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pg.title}</div>
                    <div style={{ fontFamily: mono, fontSize: 12, color: C.dim, marginTop: 2 }}>/{pg.slug}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 20, background: pg.status === 'published' ? '#e7f6ee' : '#fdf4e3', color: pg.status === 'published' ? '#15803d' : '#b45309' }}>{pg.status === 'published' ? 'Published' : 'Draft'}</span>
                  <span onClick={() => navigate(`/my-site/pages/edit/${pg.id}`)} style={iconBtn}><Edit3 size={14} /></span>
                  <span onClick={() => deletePage(pg.id)} style={{ ...iconBtn, color: '#b42318' }}><Trash2 size={14} /></span>
                </div>
              ))}
            </div>
            <div style={{ ...cardStyle(), padding: 20 }}>
              <div style={sectionLabel}>Navigation menu</div>
              {menu.length === 0 && <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>No menu links yet.</div>}
              {menu.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, padding: 9, border: `1px solid ${C.line}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                    <span onClick={() => moveMenuItem(i, -1)} style={{ cursor: 'pointer', color: C.dim, fontSize: 10 }}>▲</span>
                    <span onClick={() => moveMenuItem(i, 1)} style={{ cursor: 'pointer', color: C.dim, fontSize: 10 }}>▼</span>
                  </div>
                  <input value={m.label} onChange={(e) => updateMenuItem(i, { label: e.target.value })} placeholder="Label" style={miniInput(80)} />
                  <select value={m.link_type} onChange={(e) => updateMenuItem(i, { link_type: e.target.value, target: '' })} style={miniSelect}>
                    <option value="home">Home</option>
                    <option value="page">Page</option>
                    <option value="external">URL</option>
                  </select>
                  {m.link_type === 'page' && (
                    <select value={m.target} onChange={(e) => updateMenuItem(i, { target: e.target.value })} style={miniSelect}>
                      <option value="">Select…</option>
                      {pages.map((pg) => <option key={pg.id} value={pg.slug}>{pg.title}</option>)}
                    </select>
                  )}
                  {m.link_type === 'external' && <input value={m.target} onChange={(e) => updateMenuItem(i, { target: e.target.value })} placeholder="https://…" style={miniInput(110)} />}
                  <span onClick={() => removeMenuItem(i)} style={{ ...iconBtn, marginLeft: 'auto', color: '#b42318', flexShrink: 0 }}><X size={14} /></span>
                </div>
              ))}
              <button onClick={addMenuItem} style={{ ...btn('ghost'), width: '100%', justifyContent: 'center', marginTop: 4 }}><Plus size={14} /> Add menu item</button>
              <button onClick={saveMenu} disabled={savingMenu} style={{ ...btn('primary'), width: '100%', justifyContent: 'center', marginTop: 10 }}>{savingMenu ? 'Saving…' : menuSaved ? <><Check size={15} /> Saved</> : 'Save menu'}</button>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ maxWidth: 620 }}>
            <div style={{ ...cardStyle(), padding: 24, marginBottom: 18 }}>
              <div style={sectionLabel}>Site details</div>
              <Field label="Site title">
                <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} style={fullInput} />
              </Field>
              <Field label="Tagline">
                <input value={siteTagline} onChange={(e) => setSiteTagline(e.target.value)} placeholder="A short line under your blog name" style={fullInput} />
              </Field>
            </div>

            <div style={{ ...cardStyle(), padding: 24, marginBottom: 18 }}>
              <div style={sectionLabel}>Social links</div>
              {SOCIALS.map((soc) => (
                <Field key={soc.key} label={soc.name}>
                  <input value={social[soc.key] || ''} onChange={(e) => setSocial({ ...social, [soc.key]: e.target.value })} placeholder={soc.ph} style={fullInput} />
                </Field>
              ))}
            </div>

            <div style={{ ...cardStyle(), padding: 24, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: sora, fontWeight: 600, fontSize: 14.5, color: C.ink }}>Comments</div>
                <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>Let readers comment on your posts.</div>
              </div>
              <div onClick={() => setCommentsOn(!commentsOn)} style={{ width: 46, height: 26, borderRadius: 20, background: commentsOn ? C.cy2 : '#cdd6e6', position: 'relative', cursor: 'pointer', transition: 'background .15s', flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: commentsOn ? 23 : 3, transition: 'left .15s' }} />
              </div>
            </div>

            <button onClick={saveSettings} disabled={savingSettings} style={{ ...btn('primary'), width: '100%', justifyContent: 'center' }}>
              {savingSettings ? 'Saving…' : settingsSaved ? <><Check size={16} /> Saved</> : 'Save settings'}
            </button>

            <div style={{ ...cardStyle(), padding: 24, marginTop: 18 }}>
              <div style={sectionLabel}>Custom domain</div>
              {!domain && (
                <>
                  <div style={{ fontSize: 13.5, color: C.dim, marginBottom: 12, lineHeight: 1.5 }}>Serve your site on your own domain (e.g. blog.yourbrand.com) instead of the SuperAdPro URL.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="blog.yourbrand.com" style={{ ...fullInput, flex: 1 }} />
                    <button onClick={connectDomain} disabled={domainBusy || !domainInput.trim()} style={btn('primary')}>{domainBusy ? 'Connecting…' : 'Connect'}</button>
                  </div>
                </>
              )}
              {domain && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: mono, fontSize: 14.5, color: C.ink, fontWeight: 600 }}>{domain.domain}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: domain.verification_status === 'verified' ? '#e7f6ee' : '#fdf4e3', color: domain.verification_status === 'verified' ? '#15803d' : '#b45309' }}>
                      {domain.verification_status === 'verified' ? 'Verified & live' : 'Pending DNS'}
                    </span>
                  </div>
                  {domain.verification_status !== 'verified' && domain.dns_records && domain.dns_records.length > 0 && (
                    <div style={{ background: '#f7f9fc', border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.dim, marginBottom: 8 }}>Add this DNS record at your registrar, then check status:</div>
                      {domain.dns_records.map((r, i) => (
                        <div key={i} style={{ fontFamily: mono, fontSize: 12.5, color: C.ink2, padding: '4px 0', wordBreak: 'break-all' }}>
                          <b>{(r.type || 'CNAME').toUpperCase()}</b> &nbsp; {r.name || r.host || '@'} &nbsp;→&nbsp; {r.value || r.data || r.target}
                        </div>
                      ))}
                    </div>
                  )}
                  {domain.last_error && domain.verification_status !== 'verified' && (
                    <div style={{ fontSize: 12.5, color: '#b45309', marginBottom: 12 }}>{domain.last_error}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {domain.verification_status !== 'verified' && <button onClick={verifyDomain} disabled={domainBusy} style={btn('ghost')}>{domainBusy ? 'Checking…' : 'Check status'}</button>}
                    <button onClick={removeDomain} disabled={domainBusy} style={{ background: '#fff', border: '1px solid #e5a3a3', color: '#b42318', fontFamily: sora, fontWeight: 600, fontSize: 14, borderRadius: 9, padding: '10px 16px', cursor: 'pointer' }}>Disconnect</button>
                  </div>
                </>
              )}
              {domainErr && <div style={{ fontSize: 13, color: '#b42318', marginTop: 10 }}>{domainErr}</div>}
            </div>

            <div style={{ ...cardStyle(), padding: 24, marginTop: 28, border: '1px solid #f3c2c2' }}>
              <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 14, color: '#b42318', marginBottom: 6 }}>Danger zone</div>
              <div style={{ fontSize: 13.5, color: C.dim, marginBottom: 14, lineHeight: 1.5 }}>Deleting your site permanently removes all posts, pages and settings. This can't be undone.</div>
              <button onClick={deleteSite} disabled={deletingSite} style={{ background: '#fff', border: '1px solid #e5a3a3', color: '#b42318', fontFamily: sora, fontWeight: 600, fontSize: 14, borderRadius: 9, padding: '11px 18px', cursor: 'pointer' }}>
                {deletingSite ? 'Deleting…' : 'Delete my site'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── style helpers ────────────────────────────────────────────────────────────
function AnalyticsCard({ analytics }) {
  const series = analytics.views_30d || [];
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <div style={{ ...cardStyle(), padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={sectionLabel}>Last 30 days</div>
        <div style={{ fontFamily: mono, fontSize: 13, color: C.dim }}>{(analytics.total_30d || 0).toLocaleString()} views</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginBottom: 18 }}>
        {series.map((d, i) => (
          <div key={i} title={`${d.date}: ${d.count}`} style={{ flex: 1, height: `${Math.max(4, (d.count / max) * 100)}%`, background: d.count ? C.cy2 : C.line, borderRadius: 2 }} />
        ))}
      </div>
      {analytics.top_referrers && analytics.top_referrers.length > 0 && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.dim, marginBottom: 8 }}>Top sources</div>
          {analytics.top_referrers.slice(0, 5).map((r, i, arr) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '6px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.line2}` : 'none' }}>
              <span style={{ color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '72%' }}>{r.referrer}</span>
              <span style={{ fontFamily: mono, color: C.dim }}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function StatusPill({ status }) {
  const m = { pending: ['Pending', '#b45309', '#fdf4e3'], approved: ['Approved', '#15803d', '#e7f6ee'], rejected: ['Rejected', '#9ca3af', '#f1f3f7'] };
  const [label, color, bg] = m[status] || m.pending;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color }}>{label}</span>;
}
const pillBtn = (color, bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color, border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 13, fontWeight: 600, fontFamily: sora, cursor: 'pointer' });
function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: C.dim, marginBottom: 6 }}>{label}</div>{children}</div>;
}
const fullInput = { width: '100%', border: `1px solid ${C.line}`, borderRadius: 9, padding: '10px 13px', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.ink2, outline: 'none', boxSizing: 'border-box' };
function cardStyle() { return { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }; }
function btn(kind) {
  const base = { fontFamily: sora, fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 10, padding: '11px 18px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' };
  if (kind === 'primary') return { ...base, background: 'linear-gradient(135deg,#0891b2,#0ea5e9)', color: '#fff' };
  return { ...base, background: '#fff', border: `1px solid ${C.line}`, color: C.ink2 };
}
const sectionLabel = { fontFamily: sora, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.dim, marginBottom: 13 };
const sectionLabel2 = { fontFamily: sora, fontSize: 14, fontWeight: 700, color: C.ink };
const miniSelect = { border: `1px solid ${C.line}`, borderRadius: 7, padding: '7px 8px', fontSize: 12.5, color: C.ink2, background: '#fff', outline: 'none', flex: 1, minWidth: 0 };
const miniInput = (w) => ({ border: `1px solid ${C.line}`, borderRadius: 7, padding: '7px 9px', fontSize: 12.5, color: C.ink2, outline: 'none', width: w, flex: '0 1 auto', minWidth: 0 });
const iconBtn = { width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', color: C.dim, cursor: 'pointer' };
const errBox = { background: '#fdecec', border: '1px solid #f5c2c2', color: '#b42318', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, marginBottom: 16 };
const noticeBox = { background: '#e8f7fb', border: '1px solid #b6e3ef', color: '#0e7490', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, marginBottom: 16, fontWeight: 500 };
const GRADS = ['linear-gradient(135deg,#cfe8dd,#a7d3c0)', 'linear-gradient(135deg,#f3e6d0,#e6c894)', 'linear-gradient(135deg,#dbe7f5,#aac6e6)', 'linear-gradient(135deg,#ecdcef,#cbabd6)', 'linear-gradient(135deg,#d3ece4,#a3cdbb)', 'linear-gradient(135deg,#f6dcd8,#e6aaa0)'];
function gradFor(id) { return GRADS[(id || 0) % GRADS.length]; }
