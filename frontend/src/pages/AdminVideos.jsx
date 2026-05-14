/**
 * AdminVideos.jsx — Admin video library management
 * ════════════════════════════════════════════════════════
 * Lives at /admin/videos. Admin-only. Lets Steve:
 *   - Upload a new video file to R2 (returns public URL)
 *   - Create a new ExplainerVideo record with metadata
 *   - Edit existing video metadata (title, category, etc.)
 *   - Publish/unpublish (drafts hidden from members)
 *   - Delete a video (also removes view records)
 *
 * The flow is two-step on purpose: upload first (slow,
 * shows progress), then save metadata once the file is up.
 * This way if metadata entry is interrupted, the file
 * is already safe in R2.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import { Upload, Trash2, Edit3, Eye, EyeOff, Plus, X, CheckCircle, Loader } from 'lucide-react';

var CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'income-streams',  label: 'Income Streams' },
  { id: 'tools',           label: 'Tools' },
  { id: 'advanced',        label: 'Advanced' },
];

// Auto-generate a slug from the title
function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function VideoForm({ initial, onSave, onCancel, busy }) {
  var [form, setForm] = useState(function() {
    return {
      slug: (initial && initial.slug) || '',
      title: (initial && initial.title) || '',
      description: (initial && initial.description) || '',
      category: (initial && initial.category) || 'getting-started',
      r2_url: (initial && initial.r2_url) || '',
      thumbnail_url: (initial && initial.thumbnail_url) || '',
      duration_sec: (initial && initial.duration_sec) || '',
      sort_order: (initial && initial.sort_order) || 0,
      is_published: !!(initial && initial.is_published),
    };
  });
  var [uploading, setUploading] = useState(false);
  var [uploadMsg, setUploadMsg] = useState('');
  var [autoSlug, setAutoSlug] = useState(!initial);  // auto-fill slug from title for new videos

  function update(field, val) {
    setForm(function(f) {
      var next = Object.assign({}, f);
      next[field] = val;
      // Auto-derive slug from title while user types, if they haven't manually edited it
      if (field === 'title' && autoSlug) {
        next.slug = slugify(val);
      }
      return next;
    });
  }

  async function handleFileUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      alert('File too large (max 200MB). Compress with ffmpeg or HandBrake first.');
      return;
    }
    setUploading(true);
    setUploadMsg('Uploading ' + Math.round(file.size / 1024 / 1024) + 'MB to R2…');
    try {
      var fd = new FormData();
      fd.append('file', file);
      var res = await fetch('/admin/api/videos/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      var data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      update('r2_url', data.url);
      setUploadMsg('✓ Uploaded — ' + Math.round(data.size_bytes / 1024 / 1024) + 'MB');
      // Try to auto-detect duration via a hidden video element
      try {
        var url = URL.createObjectURL(file);
        var tmp = document.createElement('video');
        tmp.preload = 'metadata';
        tmp.onloadedmetadata = function() {
          if (tmp.duration && isFinite(tmp.duration)) {
            update('duration_sec', Math.round(tmp.duration));
          }
          URL.revokeObjectURL(url);
        };
        tmp.src = url;
      } catch (err) { /* non-fatal */ }
    } catch (err) {
      setUploadMsg('✗ ' + (err.message || 'Upload failed'));
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  function handleSubmit() {
    if (!form.title.trim()) { alert('Title is required'); return; }
    if (!form.slug.trim()) { alert('Slug is required'); return; }
    if (!form.r2_url.trim()) { alert('Upload a video first'); return; }
    var payload = Object.assign({}, form);
    payload.duration_sec = parseInt(form.duration_sec, 10) || null;
    payload.sort_order = parseInt(form.sort_order, 10) || 0;
    onSave(payload);
  }

  var labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };
  var inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: '#172554' }}>
        {initial ? 'Edit video' : 'Add new video'}
      </h3>

      {/* Upload */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Video file</label>
        {form.r2_url ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 8, fontSize: 13,
          }}>
            <CheckCircle size={18} color="#16a34a" />
            <span style={{ color: '#15803d', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.r2_url}
            </span>
            <button onClick={function() { update('r2_url', ''); setUploadMsg(''); }} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
            }}>Replace</button>
          </div>
        ) : (
          <div>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: '#172554', color: '#fff',
              borderRadius: 8, cursor: uploading ? 'wait' : 'pointer',
              fontSize: 14, fontWeight: 600,
              opacity: uploading ? 0.7 : 1,
            }}>
              {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
              {uploading ? 'Uploading…' : 'Choose video file'}
              <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
            {uploadMsg && <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>{uploadMsg}</div>}
            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
              MP4, MOV, WebM. Max 200MB. Tip: compress with HandBrake if larger.
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={form.title} onChange={function(e) { update('title', e.target.value); }} placeholder="What is SuperAdPro?" />
        </div>
        <div>
          <label style={labelStyle}>URL slug *</label>
          <input style={inputStyle} value={form.slug} onChange={function(e) { setAutoSlug(false); update('slug', slugify(e.target.value)); }} placeholder="what-is-superadpro" />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description</label>
        <textarea style={Object.assign({}, inputStyle, { minHeight: 80, resize: 'vertical' })}
          value={form.description}
          onChange={function(e) { update('description', e.target.value); }}
          placeholder="One or two sentences shown under the title." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Category *</label>
          <select style={inputStyle} value={form.category} onChange={function(e) { update('category', e.target.value); }}>
            {CATEGORIES.map(function(c) { return <option key={c.id} value={c.id}>{c.label}</option>; })}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Duration (seconds)</label>
          <input style={inputStyle} type="number" min="0"
            value={form.duration_sec}
            onChange={function(e) { update('duration_sec', e.target.value); }}
            placeholder="90" />
        </div>
        <div>
          <label style={labelStyle}>Sort order</label>
          <input style={inputStyle} type="number"
            value={form.sort_order}
            onChange={function(e) { update('sort_order', e.target.value); }}
            placeholder="0" />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Thumbnail URL (optional)</label>
        <input style={inputStyle} value={form.thumbnail_url}
          onChange={function(e) { update('thumbnail_url', e.target.value); }}
          placeholder="https://… leave blank to use no thumbnail" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_published} onChange={function(e) { update('is_published', e.target.checked); }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#172554' }}>
            Publish — make visible to members
          </span>
        </label>
        <div style={{ marginTop: 4, marginLeft: 26, fontSize: 12, color: '#94a3b8' }}>
          Leave unchecked to save as a draft.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleSubmit} disabled={busy} style={{
          padding: '10px 20px', background: '#172554', color: '#fff',
          border: 'none', borderRadius: 8, cursor: busy ? 'wait' : 'pointer',
          fontSize: 14, fontWeight: 600, opacity: busy ? 0.7 : 1,
        }}>
          {busy ? 'Saving…' : (initial ? 'Save changes' : 'Add video')}
        </button>
        <button onClick={onCancel} disabled={busy} style={{
          padding: '10px 20px', background: '#fff', color: '#64748b',
          border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer',
          fontSize: 14, fontWeight: 600,
        }}>Cancel</button>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AdminVideos() {
  var [videos, setVideos] = useState([]);
  var [loading, setLoading] = useState(true);
  var [showForm, setShowForm] = useState(false);
  var [editing, setEditing] = useState(null);
  var [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    apiGet('/admin/api/videos').then(function(r) {
      setVideos(r.videos || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }
  useEffect(load, []);

  async function handleSave(payload) {
    setBusy(true);
    try {
      if (editing) {
        await apiPatch('/admin/api/videos/' + editing.id, payload);
      } else {
        await apiPost('/admin/api/videos', payload);
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (e) {
      alert('Save failed: ' + (e.message || 'unknown error'));
    }
    setBusy(false);
  }

  async function handleDelete(v) {
    if (!confirm('Delete "' + v.title + '"? This cannot be undone. The video file in R2 will be kept.')) return;
    try {
      await apiDelete('/admin/api/videos/' + v.id);
      load();
    } catch (e) {
      alert('Delete failed: ' + (e.message || 'unknown'));
    }
  }

  async function togglePublish(v) {
    try {
      await apiPatch('/admin/api/videos/' + v.id, { is_published: !v.is_published });
      load();
    } catch (e) {
      alert('Toggle failed: ' + (e.message || 'unknown'));
    }
  }

  return (
    <AppLayout title="Video Library — Admin" subtitle="Upload and manage explainer videos for members">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Link to="/videos" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#64748b', textDecoration: 'none', fontSize: 14,
          }}>View member library →</Link>
          {!showForm && (
            <button onClick={function() { setShowForm(true); setEditing(null); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: '#172554', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}>
              <Plus size={16} /> Add video
            </button>
          )}
        </div>

        {showForm && (
          <VideoForm
            initial={editing}
            busy={busy}
            onSave={handleSave}
            onCancel={function() { setShowForm(false); setEditing(null); }}
          />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading…</div>
        ) : videos.length === 0 ? (
          <div style={{
            background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12,
            padding: 60, textAlign: 'center', color: '#64748b',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              No videos yet
            </div>
            <div style={{ fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
              Click "Add video" to upload your first explainer. The "What is SuperAdPro?"
              intro is a good first one.
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: 12, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Views</th>
                  <th style={{ textAlign: 'right', padding: 12, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map(function(v) {
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: '#172554', marginBottom: 2 }}>{v.title}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>/{v.slug}</div>
                      </td>
                      <td style={{ padding: 12, fontSize: 13, color: '#475569' }}>{(CATEGORIES.find(function(c) { return c.id === v.category; }) || { label: v.category }).label}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: v.is_published ? '#dcfce7' : '#fef3c7',
                          color: v.is_published ? '#15803d' : '#a16207',
                        }}>
                          {v.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                        {v.view_count || 0}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button onClick={function() { togglePublish(v); }} title={v.is_published ? 'Unpublish' : 'Publish'} style={{
                          background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, marginRight: 4, color: '#64748b',
                        }}>
                          {v.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={function() { setEditing(v); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} title="Edit" style={{
                          background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, marginRight: 4, color: '#64748b',
                        }}>
                          <Edit3 size={16} />
                        </button>
                        <button onClick={function() { handleDelete(v); }} title="Delete" style={{
                          background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: '#dc2626',
                        }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
