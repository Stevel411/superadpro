import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../utils/api';

// Momentum admin — manage the content library (ideas, hooks, captions, tips),
// the weekly challenge, and per-idea graphics (uploaded to R2). Admin-gated
// server-side (/api/al/momentum/admin/*). Accessed at /momentum-admin.

const CATS = ['story', 'proof', 'teach', 'offer', 'bts'];
const FORMATS = ['reel', 'story', 'post', 'carousel'];
const CATLABEL = { story: 'Your story', proof: 'Proof', teach: 'Teach', offer: 'Offer', bts: 'Behind the scenes' };

const CSS = `
.mma{font-family:'Inter',sans-serif;color:#0d1230;max-width:920px;margin:0 auto;padding:26px 20px 80px}
.mma a{color:#12388f}
.mma .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.mma h1{font-size:28px;font-weight:900;letter-spacing:-1px}
.mma h1 .r{color:#c8102e}
.mma .sub{font-size:13.5px;color:#5a6584;font-weight:500;margin-bottom:22px}
.mma .back{font-size:13px;font-weight:800;text-decoration:none;color:#5a6584}
.mma .sec{font-size:12px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#5a6584;margin:24px 2px 12px}
.mma .card{background:#fff;border:1.5px solid #e6ecf5;border-radius:15px;padding:18px 20px;margin-bottom:14px;box-shadow:0 1px 2px rgba(10,31,82,.05)}
.mma .row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.mma .f{flex:1;min-width:180px;display:flex;flex-direction:column;gap:5px}
.mma .f.full{flex-basis:100%}
.mma label{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5a6584}
.mma input[type=text],.mma input[type=number],.mma select,.mma textarea{border:1.5px solid #e0e6f3;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;color:#0d1230;background:#fff;width:100%}
.mma textarea{resize:vertical;min-height:64px;line-height:1.45}
.mma input:focus,.mma select:focus,.mma textarea:focus{border-color:#12388f}
.mma .checks{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.mma .chk{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;color:#0d1230;cursor:pointer}
.mma .chk input{width:17px;height:17px}
.mma .actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:6px}
.mma .btn{height:42px;padding:0 18px;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:7px}
.mma .btn.save{background:linear-gradient(135deg,#12388f,#0a1f52);color:#fff}
.mma .btn.del{background:#fff;color:#c8102e;border:1.5px solid #f2c9d0}
.mma .btn.add{background:linear-gradient(135deg,#17a34a,#0b7a3e);color:#fff}
.mma .btn.ghost{background:#eef3ff;color:#12388f;border:1.5px solid #d3ddf5}
.mma .imgbox{display:flex;align-items:center;gap:14px}
.mma .thumb{width:96px;height:96px;border-radius:12px;object-fit:cover;border:1.5px solid #e6ecf5;background:#f5f8ff;flex:none}
.mma .thumb.empty{display:flex;align-items:center;justify-content:center;font-size:11px;color:#a9b4cf;font-weight:700;text-align:center;padding:6px}
.mma .idhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.mma .idhead .t{font-size:16px;font-weight:900}
.mma .pill{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;padding:3px 9px;border-radius:20px;background:#eef3ff;color:#12388f}
.mma .pill.off{background:#fbeaec;color:#c8102e}
.mma .msg{font-size:12.5px;font-weight:700;margin-left:6px}
.mma .msg.ok{color:#17a34a}.mma .msg.err{color:#c8102e}
.mma .load{text-align:center;padding:60px;color:#5a6584;font-weight:600}
`;

export default function MomentumAdmin() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState({});

  const load = () => apiGet('/api/al/momentum/admin/list').then((d) => { if (d && d.ok) setData(d); }).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!data) return <div className="mma"><style>{CSS}</style><div className="load">Loading admin…</div></div>;

  const flash = (key, text, kind) => { setMsg((m) => ({ ...m, [key]: { text, kind } })); setTimeout(() => setMsg((m) => ({ ...m, [key]: null })), 2500); };

  const ch = (data.challenges && data.challenges[0]) || { title: 'Post 5 days this week', goal_count: 5, unit: 'days', reward: 'Consistency badge', is_active: true };

  const saveChallenge = (c) => apiPost('/api/al/momentum/admin/challenge', c).then((r) => { flash('ch', r && r.ok ? 'Saved' : 'Error', r && r.ok ? 'ok' : 'err'); load(); });
  const saveIdea = (idea) => apiPost('/api/al/momentum/admin/idea', idea).then((r) => { flash('i' + (idea.id || 'new'), r && r.ok ? 'Saved' : 'Error', r && r.ok ? 'ok' : 'err'); load(); });
  const delIdea = (id) => { if (window.confirm('Delete this idea?')) apiPost(`/api/al/momentum/admin/idea/${id}/delete`, {}).then(load); };
  const uploadImg = async (id, fileInput) => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    flash('i' + id, 'Uploading…', 'ok');
    try {
      const resp = await fetch(`/api/al/momentum/admin/idea/${id}/image`, { method: 'POST', body: fd, credentials: 'include' });
      const r = await resp.json();
      flash('i' + id, r && r.ok ? 'Image saved' : (r.error || 'Upload failed'), r && r.ok ? 'ok' : 'err');
      load();
    } catch (e) { flash('i' + id, 'Upload failed', 'err'); }
  };
  const addIdea = () => saveIdea({ category: 'story', format: 'reel', title: 'New idea', subtitle: '', hooks: [''], caption: '', tip: '', hashtags: '', is_daily: true, is_published: false, sort_order: (data.ideas.length + 1) });

  return (
    <div className="mma">
      <style>{CSS}</style>
      <div className="top">
        <div><h1>Momentum <span className="r">admin</span></h1></div>
        <a className="back" href="/momentum">← View dashboard</a>
      </div>
      <div className="sub">Manage the content library members see. Changes are live immediately. Ideas marked "daily" rotate through the "Today's post" slot.</div>

      <div className="sec">Weekly challenge</div>
      <ChallengeCard challenge={ch} onSave={saveChallenge} msg={msg.ch} />

      <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Content ideas ({data.ideas.length})</span>
        <button className="btn add" onClick={addIdea}>+ New idea</button>
      </div>
      {data.ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} onSave={saveIdea} onDelete={delIdea} onUpload={uploadImg} msg={msg['i' + idea.id]} />
      ))}
    </div>
  );
}

function ChallengeCard({ challenge, onSave, msg }) {
  const [c, setC] = useState(challenge);
  useEffect(() => { setC(challenge); }, [challenge]);
  const up = (k, v) => setC({ ...c, [k]: v });
  return (
    <div className="card">
      <div className="row">
        <div className="f" style={{ flexBasis: '55%' }}><label>Title</label><input type="text" value={c.title || ''} onChange={(e) => up('title', e.target.value)} /></div>
        <div className="f"><label>Goal</label><input type="number" value={c.goal_count || 5} onChange={(e) => up('goal_count', e.target.value)} /></div>
        <div className="f"><label>Unit</label><select value={c.unit || 'days'} onChange={(e) => up('unit', e.target.value)}><option value="days">days</option><option value="posts">posts</option></select></div>
      </div>
      <div className="row">
        <div className="f"><label>Reward</label><input type="text" value={c.reward || ''} onChange={(e) => up('reward', e.target.value)} /></div>
        <div className="f" style={{ justifyContent: 'flex-end' }}><div className="checks"><label className="chk"><input type="checkbox" checked={!!c.is_active} onChange={(e) => up('is_active', e.target.checked)} /> Active</label></div></div>
      </div>
      <div className="actions"><button className="btn save" onClick={() => onSave(c)}>Save challenge</button>{msg && <span className={'msg ' + msg.kind}>{msg.text}</span>}</div>
    </div>
  );
}

function IdeaCard({ idea, onSave, onDelete, onUpload, msg }) {
  const [d, setD] = useState({ ...idea, hooks: (idea.hooks || []).join('\n') });
  useEffect(() => { setD({ ...idea, hooks: (idea.hooks || []).join('\n') }); }, [idea]);
  const up = (k, v) => setD({ ...d, [k]: v });
  const save = () => onSave({ ...d, hooks: (d.hooks || '').split('\n').map((s) => s.trim()).filter(Boolean) });

  return (
    <div className="card">
      <div className="idhead">
        <div className="t">{d.title || 'Untitled'}</div>
        <div>
          <span className="pill">{CATLABEL[d.category] || d.category}</span>{' '}
          <span className={'pill' + (d.is_published ? '' : ' off')}>{d.is_published ? 'Live' : 'Draft'}</span>
        </div>
      </div>
      <div className="row">
        <div className="f"><label>Title</label><input type="text" value={d.title || ''} onChange={(e) => up('title', e.target.value)} /></div>
        <div className="f"><label>Category</label><select value={d.category} onChange={(e) => up('category', e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{CATLABEL[c]}</option>)}</select></div>
        <div className="f"><label>Format</label><select value={d.format} onChange={(e) => up('format', e.target.value)}>{FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
        <div className="f" style={{ maxWidth: 110 }}><label>Sort</label><input type="number" value={d.sort_order || 0} onChange={(e) => up('sort_order', e.target.value)} /></div>
      </div>
      <div className="row"><div className="f full"><label>Angle / description</label><textarea value={d.subtitle || ''} onChange={(e) => up('subtitle', e.target.value)} /></div></div>
      <div className="row"><div className="f full"><label>Hooks (one per line — first is the default)</label><textarea value={d.hooks || ''} onChange={(e) => up('hooks', e.target.value)} /></div></div>
      <div className="row"><div className="f full"><label>Caption</label><textarea style={{ minHeight: 110 }} value={d.caption || ''} onChange={(e) => up('caption', e.target.value)} /></div></div>
      <div className="row">
        <div className="f"><label>Why this works (tip)</label><textarea value={d.tip || ''} onChange={(e) => up('tip', e.target.value)} /></div>
        <div className="f"><label>Hashtags</label><input type="text" value={d.hashtags || ''} onChange={(e) => up('hashtags', e.target.value)} /></div>
      </div>
      <div className="row">
        <div className="f full">
          <label>Graphic (optional — attaches to the member's post)</label>
          <div className="imgbox">
            {d.media_url ? <img className="thumb" src={d.media_url} alt="" /> : <div className="thumb empty">No image yet</div>}
            {d.id
              ? <label className="btn ghost" style={{ cursor: 'pointer' }}>Upload image<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onUpload(d.id, e.target)} /></label>
              : <span style={{ fontSize: 12, color: '#5a6584', fontWeight: 600 }}>Save the idea first, then upload a graphic.</span>}
          </div>
        </div>
      </div>
      <div className="checks" style={{ marginBottom: 12 }}>
        <label className="chk"><input type="checkbox" checked={!!d.is_daily} onChange={(e) => up('is_daily', e.target.checked)} /> Eligible for "Today's post"</label>
        <label className="chk"><input type="checkbox" checked={!!d.is_published} onChange={(e) => up('is_published', e.target.checked)} /> Published (visible to members)</label>
      </div>
      <div className="actions">
        <button className="btn save" onClick={save}>Save idea</button>
        {d.id && <button className="btn del" onClick={() => onDelete(d.id)}>Delete</button>}
        {msg && <span className={'msg ' + msg.kind}>{msg.text}</span>}
      </div>
    </div>
  );
}
