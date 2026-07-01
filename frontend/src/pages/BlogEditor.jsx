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
  ArrowLeft, Eye, Trash2, Image as ImageIcon, X, Plus, Check, Sparkles,
} from 'lucide-react';

const C = {
  ink: '#0a1438', ink2: '#1e2c54', dim: '#5b6b8c', line: '#e6edf8', line2: '#eef3fa',
  cy1: '#0891b2', cy2: '#06b6d4', bg: '#f4f7fc', card: '#fff', amb: '#b45309',
};
const sora = "'Sora',sans-serif";
const mono = "'JetBrains Mono',monospace";

// Live preview mirroring the PUBLISHED post page exactly: Merriweather body,
// 720px column, real block styles, and image size/align presets. Breakouts use
// container-query units (cqw) so the preview pane behaves as "the page" — Wide
// and Full break out of the text column exactly as they will once published.
function BlogPreview({ title, cover, html }) {
  const hasContent = (html && html.replace(/<[^>]+>/g, '').trim().length > 0) || /<img|<iframe|bn-embed/.test(html || '');
  return (
    <div style={{ padding: '0 0 60px', minHeight: '100%' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@400;500;600;700&display=swap');
        .sap-pv{container-type:inline-size;background:#fff;min-height:100%;--accent:#0ea5e9;--hfont:'Inter',sans-serif}
        .sap-pv-cover{display:block;width:100%;max-height:440px;object-fit:cover}
        .sap-pv-col{max-width:820px;margin:0 auto;padding:0 32px}
        .sap-pv-title{font-family:'Merriweather',serif;font-weight:900;font-size:40px;line-height:1.15;color:#1a2b23;margin:40px 0 20px}
        .sap-pv-body{font-family:'Merriweather',serif;font-size:19px;line-height:1.78;color:#26332c}
        .sap-pv-body p{margin:26px 0}
        .sap-pv-body h1{font-size:36px;font-weight:900;margin:44px 0 4px;line-height:1.15}
        .sap-pv-body h2{font-size:30px;font-weight:900;margin:46px 0 4px;line-height:1.2}
        .sap-pv-body h3{font-size:23px;font-weight:800;margin:36px 0 2px}
        .sap-pv-body blockquote{border-left:4px solid var(--accent);padding:6px 0 6px 26px;margin:34px 0;font-size:24px;font-style:italic;line-height:1.5;color:#40514a}
        .sap-pv-body a{color:var(--accent)}
        .sap-pv-body ul,.sap-pv-body ol{margin:22px 0;padding-left:26px}
        .sap-pv-body pre{background:#1e293b;color:#e2e8f0;padding:16px 20px;border-radius:10px;overflow-x:auto;font-size:15px;margin:24px 0}
        .sap-pv-body img{max-width:100%;height:auto;border-radius:14px;margin:30px auto;display:block}
        .sap-pv-body img[data-align="left"]{float:left;max-width:min(48%,340px);margin:8px 28px 14px 0}
        .sap-pv-body img[data-align="right"]{float:right;max-width:min(48%,340px);margin:8px 0 14px 28px}
        .sap-pv-body img[data-w="wide"]{float:none;width:min(1000px,92cqw);max-width:none;margin-left:calc(50% - min(500px,46cqw))}
        .sap-pv-body img[data-w="full"]{float:none;width:100cqw;max-width:100cqw;margin-left:calc(50% - 50cqw);border-radius:0}
        .sap-pv-body::after{content:"";display:table;clear:both}
        .sap-pv-body h2,.sap-pv-body h3,.sap-pv-body blockquote{clear:both}
        .sap-pv-body .bn-callout{display:flex;gap:13px;padding:16px 18px;border-radius:12px;margin:22px 0;border-left:4px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
        .sap-pv-body .bn-callout::before{content:'i';flex:0 0 22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-weight:800;font-style:italic;display:grid;place-items:center;font-size:14px;margin-top:1px}
        .sap-pv-body .bn-callout>*{margin:0}
        .sap-pv-body .bn-callout[data-type="tip"]{border-left-color:#16a34a;background:color-mix(in srgb,#16a34a 8%,transparent)}
        .sap-pv-body .bn-callout[data-type="tip"]::before{content:'✦';background:#16a34a;font-style:normal}
        .sap-pv-body .bn-callout[data-type="warning"]{border-left-color:#d97706;background:color-mix(in srgb,#d97706 9%,transparent)}
        .sap-pv-body .bn-callout[data-type="warning"]::before{content:'!';background:#d97706;font-style:normal}
        .sap-pv-body .bn-callout[data-type="success"]{border-left-color:#7c3aed;background:color-mix(in srgb,#7c3aed 8%,transparent)}
        .sap-pv-body .bn-callout[data-type="success"]::before{content:'✓';background:#7c3aed;font-style:normal}
        .sap-pv-body .bn-embed{position:relative;aspect-ratio:16/9;margin:26px 0;border-radius:14px;overflow:hidden;background:#000}
        .sap-pv-body .bn-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
        .sap-pv-body .bn-embed[data-align="left"]{float:left;width:min(48%,340px);margin:8px 28px 14px 0}
        .sap-pv-body .bn-embed[data-align="right"]{float:right;width:min(48%,340px);margin:8px 0 14px 28px}
        .sap-pv-body .bn-embed[data-w="wide"]{width:min(1000px,92cqw);margin-left:calc(50% - min(500px,46cqw))}
        .sap-pv-body .bn-embed[data-w="full"]{width:100cqw;margin-left:calc(50% - 50cqw);border-radius:0}
        @container (max-width:600px){
          .sap-pv-body img[data-align="left"],.sap-pv-body img[data-align="right"],
          .sap-pv-body .bn-embed[data-align="left"],.sap-pv-body .bn-embed[data-align="right"]{float:none;width:auto;max-width:100%;margin:22px auto}
          .sap-pv-body img[data-w="wide"],.sap-pv-body img[data-w="full"],
          .sap-pv-body .bn-embed[data-w="wide"],.sap-pv-body .bn-embed[data-w="full"]{width:100%;max-width:100%;margin-left:auto;margin-right:auto}
        }
        .sap-pv-body .bn-btn-wrap{margin:26px 0;text-align:center}
        .sap-pv-body .bn-btn{display:inline-block;padding:13px 30px;background:var(--accent);color:#fff;border-radius:9px;font-weight:700;text-decoration:none;font-family:var(--hfont)}
        .sap-pv-empty{color:#9aa8a1;font-family:'Merriweather',serif;font-size:18px;line-height:1.7;margin:40px 0}
      `}</style>
      <div className="sap-pv">
        {cover && <img className="sap-pv-cover" src={cover} alt="" />}
        <div className="sap-pv-col">
          <h1 className="sap-pv-title">{title || 'Untitled'}</h1>
          {hasContent
            ? <div className="sap-pv-body" dangerouslySetInnerHTML={{ __html: html }} />
            : <div className="sap-pv-empty">This is a live preview of your published post — the same fonts, column width and image sizing your readers will see. Start writing on the left and it appears here exactly as it'll look on the page.</div>}
        </div>
      </div>
    </div>
  );
}

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
  const [view, setView] = useState('split');        // write | split | preview
  const [previewHtml, setPreviewHtml] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [ogUploading, setOgUploading] = useState(false);
  const [aiTitles, setAiTitles] = useState([]);
  const [aiBusy, setAiBusy] = useState('');
  const [aiErr, setAiErr] = useState('');
  const bodyRef = useRef('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await apiGet(`/api/blog/${API}/${id}`);
        setTitle(p.title === 'Untitled' ? '' : p.title);
        setBody(p.body || ''); bodyRef.current = p.body || ''; setPreviewHtml(p.body || '');
        setExcerpt(p.excerpt || ''); setCover(p.cover_image || '');
        setSlug(p.slug || ''); setStatus(p.status || 'draft'); setTags(p.tags || []);
        setSeoTitle(p.seo_title || ''); setSeoDescription(p.seo_description || ''); setOgImage(p.og_image || '');
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

  const onBody = (html) => { bodyRef.current = html; setPreviewHtml(html); };

  const save = async (nextStatus) => {
    setSaving(true); setErr('');
    const payload = {
      title, body: bodyRef.current, excerpt, cover_image: cover,
      slug, tags, status: nextStatus,
    };
    if (!isPage) { payload.seo_title = seoTitle; payload.seo_description = seoDescription; payload.og_image = ogImage; }
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
  const onOg = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setOgUploading(true); setErr('');
    try { setOgImage(await uploadImage(file)); } catch (err) { setErr(err.message); }
    setOgUploading(false);
  };
  const stripHtml = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const suggestTitles = async () => {
    setAiBusy('titles'); setAiErr('');
    try {
      const r = await apiPost('/api/blog/ai/assist', { mode: 'titles', topic: title, text: stripHtml(bodyRef.current).slice(0, 2000) });
      setAiTitles(r.results || []);
    } catch (e) { setAiErr(e.message || 'AI unavailable'); }
    setAiBusy('');
  };
  const generateMeta = async () => {
    setAiBusy('meta'); setAiErr('');
    try {
      const r = await apiPost('/api/blog/ai/assist', { mode: 'meta', topic: title, text: stripHtml(bodyRef.current).slice(0, 4000) });
      if (r.result) setSeoDescription(r.result);
    } catch (e) { setAiErr(e.message || 'AI unavailable'); }
    setAiBusy('');
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
        {/* writing surface + live preview */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${C.line}`, background: '#fff', flex: 'none' }}>
            {[['write', '✍ Write'], ['split', '◫ Split'], ['preview', '👁 Preview']].map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{ fontFamily: sora, fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 8, cursor: 'pointer', border: 'none', background: view === v ? C.ink : '#eef2f7', color: view === v ? '#fff' : C.ink2 }}>{lbl}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: C.dim }}>Preview = exactly how the published page will look</span>
          </div>
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            {(view === 'write' || view === 'split') && (
              <div style={{ flex: 1, overflow: 'auto', minWidth: 0, borderRight: view === 'split' ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 44px 80px' }}>
                  <input
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder={isPage ? "Page title" : "Post title"}
                    style={{ width: '100%', border: 'none', outline: 'none', fontFamily: sora, fontSize: 38, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.12, color: C.ink, marginBottom: 20 }}
                  />
                  {!isPage && (
                    <div style={{ marginTop: -8, marginBottom: 20 }}>
                      <button onClick={suggestTitles} disabled={aiBusy === 'titles'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sora, fontSize: 12.5, fontWeight: 600, color: '#6d28d9', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 8, padding: '7px 12px', cursor: aiBusy === 'titles' ? 'default' : 'pointer' }}>
                        <Sparkles size={13} /> {aiBusy === 'titles' ? 'Thinking…' : 'Suggest titles'}
                      </button>
                      {aiErr && <span style={{ marginLeft: 10, fontSize: 12, color: '#b42318' }}>{aiErr}</span>}
                      {aiTitles.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {aiTitles.map((tt, i) => (
                            <div key={i} onClick={() => { setTitle(tt); setAiTitles([]); }}
                              style={{ cursor: 'pointer', fontSize: 14, color: C.ink2, padding: '9px 13px', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, transition: 'border-color .12s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#a78bfa')}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line)}>
                              {tt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {ready && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#075985', marginBottom: 10, padding: '9px 13px', background: '#f0f9ff', border: '1px dashed #7dd3fc', borderRadius: 9 }}>
                        <ImageIcon size={15} color="#0ea5e9" style={{ flex: 'none' }} />
                        <span><b>Add images to your post:</b> drag &amp; drop or paste one straight into the writing area, or use the image button. Select an image to set its <b>size &amp; position</b> — watch the Preview to see exactly where it lands.</span>
                      </div>
                      <RichTextEditor content={body} onChange={onBody} onImageUpload={uploadImage} richBlocks placeholder="Write your post… drag or paste images in, or use the toolbar for headings, callouts, video, buttons and links." />
                    </>
                  )}
                </div>
              </div>
            )}
            {(view === 'preview' || view === 'split') && (
              <div style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#f4f5f7' }}>
                <BlogPreview title={title} cover={cover} html={previewHtml} />
              </div>
            )}
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

          <Rail label="SEO & sharing">
            <div style={seoLbl}>Search title</div>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70}
              placeholder={title || 'Defaults to the post title'} style={seoInput} />
            <div style={seoHint}>{(seoTitle || title || '').length}/70 — the clickable headline in Google.</div>
            <div style={{ ...seoLbl, marginTop: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Meta description</span>
              <span onClick={generateMeta} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#6d28d9', cursor: aiBusy === 'meta' ? 'default' : 'pointer' }}><Sparkles size={11} /> {aiBusy === 'meta' ? '…' : 'Generate'}</span>
            </div>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} maxLength={160}
              placeholder={excerpt || 'Defaults to your excerpt — a compelling 1–2 sentence summary.'}
              style={{ ...seoInput, resize: 'vertical', lineHeight: 1.5 }} />
            <div style={seoHint}>{(seoDescription || excerpt || '').length}/160 — the grey summary under the title in search.</div>
            <div style={{ ...seoLbl, marginTop: 13 }}>Social share thumbnail</div>
            <div style={seoHint}>Only appears when your post <b>link is shared</b> on social media — <b>not on the post page itself</b>. Falls back to the cover. For an image people see <b>on the post</b>, use the Cover image or drop one into the body.</div>
            {ogImage ? (
              <div style={{ marginTop: 7 }}>
                <div style={{ aspectRatio: '1.91/1', borderRadius: 9, background: `url(${ogImage}) center/cover`, border: `1px solid ${C.line}` }} />
                <span onClick={() => setOgImage('')} style={{ fontSize: 12, color: '#b42318', cursor: 'pointer', display: 'inline-block', marginTop: 5 }}>Remove</span>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 7, fontFamily: sora, fontSize: 12.5, fontWeight: 600, color: C.ink2, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px', cursor: ogUploading ? 'default' : 'pointer' }}>
                <ImageIcon size={14} /> {ogUploading ? 'Uploading…' : 'Upload thumbnail'}
                <input type="file" accept="image/*" hidden onChange={onOg} />
              </label>
            )}
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

const seoLbl = { fontFamily: sora, fontSize: 12.5, fontWeight: 600, color: C.ink2, marginBottom: 5 };
const seoHint = { fontFamily: sora, fontSize: 11, color: C.dim, marginTop: 5, lineHeight: 1.45 };
const seoInput = { width: '100%', boxSizing: 'border-box', fontFamily: sora, fontSize: 13, color: C.ink, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 11px', outline: 'none' };

function btn(kind) {
  const base = { fontFamily: sora, fontWeight: 600, fontSize: 13.5, border: 'none', borderRadius: 9, padding: '9px 15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' };
  if (kind === 'primary') return { ...base, background: 'linear-gradient(135deg,#0891b2,#0ea5e9)', color: '#fff' };
  return { ...base, background: '#fff', border: `1px solid ${C.line}`, color: C.ink2 };
}
