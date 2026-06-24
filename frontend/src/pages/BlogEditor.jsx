/**
 * BlogEditor.jsx — write / edit a blog post
 * ════════════════════════════════════════════════════════════════
 * Focused full-screen editor (no app sidebar). Reuses the existing
 * TipTap RichTextEditor for the body. Routes:
 *   /my-site/new        → new draft
 *   /my-site/edit/:id   → edit existing post
 * API: GET/POST/PUT/DELETE /api/blog/post[/{id}]
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import {
  ArrowLeft, Eye, Trash2, Image as ImageIcon, X, Plus, Check,
} from 'lucide-react';

const C = {
  ink: '#0a1438', ink2: '#1e2c54', dim: '#5b6b8c', line: '#e6edf8', line2: '#eef3fa',
  cy1: '#0891b2', cy2: '#06b6d4', bg: '#f4f7fc', card: '#fff', amb: '#b45309',
};
const sora = "'Sora',sans-serif";
const mono = "'JetBrains Mono',monospace";

export default function BlogEditor({ kind = 'post' }) {
  const isPage = kind === 'page';
  const API = isPage ? 'page' : 'post';
  const { id } = useParams();
  const navigate = useNavigate();
  const [postId, setPostId] = useState(id || null);
  const [loading, setLoading] = useState(!!id);
  const [ready, setReady] = useState(!id);          // body editor mounts once content is ready
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [err, setErr] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const bodyRef = useRef('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await apiGet(`/api/blog/${API}/${id}`);
        setTitle(p.title === 'Untitled' ? '' : p.title);
        setBody(p.body || ''); bodyRef.current = p.body || '';
        setExcerpt(p.excerpt || ''); setCover(p.cover_image || '');
        setSlug(p.slug || ''); setStatus(p.status || 'draft'); setTags(p.tags || []);
      } catch (e) { setErr(e.message); }
      setLoading(false); setReady(true);
    })();
  }, [id]);

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/blog/upload-image', { method: 'POST', credentials: 'include', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
    return data.url;
  };

  const onBody = (html) => { bodyRef.current = html; };

  const save = async (nextStatus) => {
    setSaving(true); setErr('');
    const payload = {
      title, body: bodyRef.current, excerpt, cover_image: cover,
      slug, tags, status: nextStatus,
    };
    try {
      let res;
      if (postId) res = await apiPut(`/api/blog/${API}/${postId}`, payload);
      else {
        res = await apiPost(`/api/blog/${API}`, payload);
        setPostId(res.id);
        window.history.replaceState(null, '', `/my-site/${isPage ? 'pages/' : ''}edit/${res.id}`);
      }
      setSlug(res.slug); setStatus(res.status); setSavedAt(Date.now());
      setSaving(false);
      return res;
    } catch (e) { setErr(e.message); setSaving(false); return null; }
  };

  const remove = async () => {
    if (!postId) { navigate('/my-site'); return; }
    if (!window.confirm('Delete this post permanently?')) return;
    try { await apiDelete(`/api/blog/${API}/${postId}`); navigate('/my-site'); }
    catch (e) { setErr(e.message); }
  };

  const addTag = (val) => {
    const v = (val || '').trim().replace(/,$/, '');
    if (v && !tags.includes(v) && tags.length < 10) setTags([...tags, v]);
    setTagInput('');
  };
  const onCover = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCoverUploading(true); setErr('');
    try { setCover(await uploadImage(file)); } catch (err) { setErr(err.message); }
    setCoverUploading(false);
  };

  const savedLabel = savedAt ? 'Saved' : 'Not saved yet';

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: C.dim, fontFamily: sora, background: C.bg, minHeight: '100vh' }}>Loading…</div>;
  }

  const statusBadge = {
    published: { bg: '#e7f6ee', fg: '#15803d', label: 'Published' },
    draft: { bg: '#fdf4e3', fg: '#b45309', label: 'Draft' },
    scheduled: { bg: '#e9f0fd', fg: '#1e40af', label: 'Scheduled' },
  }[status] || { bg: '#fdf4e3', fg: '#b45309', label: 'Draft' };

  return (
    <div style={{ minHeight: '100vh', background: C.card, fontFamily: "'DM Sans',sans-serif" }}>
      {/* top bar */}
      <div style={{ height: 64, borderBottom: `1px solid ${C.line}`, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, position: 'sticky', top: 0, zIndex: 30 }}>
        <span onClick={() => navigate('/my-site')} style={{ color: C.dim, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><ArrowLeft size={16} /> Posts</span>
        <span style={{ width: 1, height: 24, background: C.line }} />
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.fg }}>{statusBadge.label}</span>
        <span style={{ fontSize: 13, color: C.dim }}>{saving ? 'Saving…' : savedLabel}</span>
        {err && <span style={{ fontSize: 13, color: '#b42318' }}>{err}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
          <button onClick={async () => { const r = await save(status); if (r && r.url) window.open(r.url + '?preview=1', '_blank'); }} style={btn('ghost')}><Eye size={15} /> Preview</button>
          <button onClick={remove} style={{ ...btn('ghost'), color: '#b42318' }}><Trash2 size={15} /></button>
          <button onClick={() => save('draft')} disabled={saving} style={btn('ghost')}>Save draft</button>
          <button onClick={() => save('published')} disabled={saving} style={btn('primary')}>{status === 'published' ? 'Update' : 'Publish'} →</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 'calc(100vh - 64px)' }}>
        {/* writing surface */}
        <div style={{ overflow: 'auto' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 50px 80px' }}>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={isPage ? "Page title" : "Post title"}
              style={{ width: '100%', border: 'none', outline: 'none', fontFamily: sora, fontSize: 38, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.12, color: C.ink, marginBottom: 20 }}
            />
            {ready && <RichTextEditor content={body} onChange={onBody} onImageUpload={uploadImage} placeholder="Write your post… use the toolbar for headings, quotes, images and links." />}
          </div>
        </div>

        {/* settings rail */}
        <div style={{ background: '#fbfcfe', borderLeft: `1px solid ${C.line}`, padding: '24px 22px', overflow: 'auto' }}>
          {!isPage && (<>
          <Rail label="Cover image">
            <label style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{ aspectRatio: '16/9', borderRadius: 11, background: cover ? `url(${cover}) center/cover` : '#eef3fa', border: `1px dashed ${C.line}`, display: 'grid', placeItems: 'center', color: cover ? '#fff' : C.dim, fontSize: 13 }}>
                {!cover && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ImageIcon size={16} /> {coverUploading ? 'Uploading…' : 'Upload cover'}</span>}
              </div>
              <input type="file" accept="image/*" onChange={onCover} style={{ display: 'none' }} />
            </label>
            {cover && <span onClick={() => setCover('')} style={{ fontSize: 12, color: '#b42318', cursor: 'pointer', display: 'inline-block', marginTop: 6 }}>Remove</span>}
          </Rail>

          <Rail label="Excerpt">
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="A short summary shown on the blog home and in search results."
              style={{ width: '100%', height: 72, border: `1px solid ${C.line}`, borderRadius: 9, padding: '10px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, resize: 'none', color: C.ink2, outline: 'none' }} />
          </Rail>

          <Rail label="Tags">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {tags.map((tg) => (
                <span key={tg} style={{ fontSize: 12.5, background: '#e8f7fb', color: C.cy1, fontWeight: 600, padding: '6px 9px 6px 11px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {tg} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setTags(tags.filter((x) => x !== tg))} />
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                onBlur={() => addTag(tagInput)} placeholder="+ add"
                style={{ border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent', minWidth: 60, color: C.ink2 }} />
            </div>
          </Rail>
          </>)}

          <Rail label="URL slug">
            <input value={slug} onChange={(e) => setSlug(e.target.value)}
              style={{ width: '100%', fontFamily: mono, fontSize: 12.5, color: C.cy1, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 11px', outline: 'none' }} />
          </Rail>
        </div>
      </div>
    </div>
  );
}

function Rail({ label, children }) {
  return (
    <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: sora, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.dim, marginBottom: 11 }}>{label}</div>
      {children}
    </div>
  );
}

function btn(kind) {
  const base = { fontFamily: sora, fontWeight: 600, fontSize: 13.5, border: 'none', borderRadius: 9, padding: '9px 15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' };
  if (kind === 'primary') return { ...base, background: 'linear-gradient(135deg,#0891b2,#0ea5e9)', color: '#fff' };
  return { ...base, background: '#fff', border: `1px solid ${C.line}`, color: C.ink2 };
}
