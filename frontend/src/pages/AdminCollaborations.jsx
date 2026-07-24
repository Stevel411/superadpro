import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

// AdvantageLife — Collaborations admin. Add / edit / kill-switch.
// The toggle is the important control: off pulls a listing from every
// member's page instantly, and the go-redirect stops resolving the same
// moment, so a bad opportunity can be cut without a deploy.

const CSS = `
.cadm{background:#f1f5f9;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
.cadm .wrap{max-width:860px;margin:0 auto;padding:26px 18px 70px}
.cadm .bk{display:inline-block;font-size:12.5px;font-weight:800;color:#64748b;text-decoration:none;margin-bottom:14px}
.cadm h1{font-size:26px;font-weight:900;letter-spacing:-.02em;color:#0a1f52}
.cadm .lead{font-size:14px;color:#64748b;margin-top:6px;line-height:1.5}
.cadm .row{display:flex;align-items:center;gap:13px;padding:13px;border:1px solid #e2e8f0;border-radius:11px;margin-bottom:9px;background:#fff}
.cadm .row.hid{opacity:.55}
.cadm .lg{width:40px;height:40px;border-radius:9px;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px}
.cadm .meta{flex:1;min-width:0}
.cadm .meta b{font-size:14.5px;font-weight:800}
.cadm .meta span{display:block;font-size:12px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cadm .clk{font-size:11px;color:#94a3b8;font-weight:700;margin-top:2px}
.cadm .tog{width:44px;height:25px;border-radius:99px;background:#16a34a;position:relative;flex-shrink:0;cursor:pointer;border:0}
.cadm .tog::after{content:'';position:absolute;width:19px;height:19px;border-radius:50%;background:#fff;top:3px;right:3px}
.cadm .tog.off{background:#cbd5e1}
.cadm .tog.off::after{right:auto;left:3px}
.cadm .ed{border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;padding:8px 13px;font-family:inherit;font-size:12.5px;font-weight:800;color:#0a1f52;cursor:pointer}
.cadm .add{background:#0a1f52;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;margin-top:8px}
.cadm .form{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-top:14px}
.cadm .form h3{font-size:16px;font-weight:900;color:#0a1f52;margin-bottom:14px}
.cadm label{display:block;font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.04em;margin:12px 0 5px}
.cadm input,.cadm textarea,.cadm select{width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-family:inherit;font-size:14px;color:#0f172a}
.cadm textarea{resize:vertical;min-height:64px;line-height:1.5}
.cadm .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cadm .hint{font-size:11.5px;color:#94a3b8;margin-top:4px;line-height:1.4}
.cadm .acts{display:flex;gap:9px;margin-top:18px;flex-wrap:wrap}
.cadm .save{background:#c8102e;color:#fff;border:0;border-radius:9px;padding:11px 20px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer}
.cadm .cancel{background:#fff;color:#64748b;border:1.5px solid #e2e8f0;border-radius:9px;padding:11px 18px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer}
.cadm .err{background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:9px;padding:10px 13px;font-size:13px;font-weight:600;margin-top:12px}
.cadm .sw{display:flex;gap:8px;align-items:center;margin-top:6px}
.cadm .sw i{width:28px;height:28px;border-radius:7px;cursor:pointer;border:2px solid transparent;display:block}
.cadm .sw i.on{border-color:#0f172a}
@media(max-width:600px){.cadm .two{grid-template-columns:1fr}}
`;

const PALETTES = [
  ['#0a1f52', '#12388f'], ['#c8102e', '#8f1830'], ['#7c3aed', '#a855f7'],
  ['#0891b2', '#06b6d4'], ['#059669', '#10b981'], ['#ea580c', '#f59e0b'],
];
const BLANK = { id: 0, name: '', category: 'Tools', blurb: '', take: '', ref_url: '', logo_text: '', logo_from: '#0a1f52', logo_to: '#12388f', published: false };

export default function AdminCollaborations() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    apiGet('/admin/api/al/collaborations')
      .then(function (j) { setItems((j && j.items) || []); setLoading(false); })
      .catch(function () { setItems([]); setLoading(false); });
  }
  useEffect(load, []);

  function toggle(it) {
    setItems(function (l) { return l.map(function (x) { return x.id === it.id ? Object.assign({}, x, { published: !x.published }) : x; }); });
    fetch('/admin/api/al/collaborations/' + it.id + '/toggle', { method: 'POST', credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) { setItems(function (l) { return l.map(function (x) { return x.id === it.id ? Object.assign({}, x, { published: j.published }) : x; }); }); })
      .catch(function () { load(); });
  }

  function save() {
    setErr('');
    var e = editing;
    if (!e.name.trim() || !e.ref_url.trim() || !e.blurb.trim()) { setErr('Name, referral link and description are all required.'); return; }
    fetch('/admin/api/al/collaborations', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { setErr(res.j.error || 'Could not save.'); return; }
        setEditing(null); load();
      })
      .catch(function () { setErr('Could not save. Try again.'); });
  }

  function up(k, v) { setEditing(function (e) { return Object.assign({}, e, k === 'palette' ? { logo_from: v[0], logo_to: v[1] } : { [k]: v }); }); }

  return (
    <div className="cadm">
      <style>{CSS}</style>
      <div className="wrap">
        <a className="bk" href="/admin/al">&larr; Admin</a>
        <h1>Collaborations</h1>
        <p className="lead">Outside opportunities on the member &ldquo;Vetted Extras&rdquo; page. Toggle a
          listing off to pull it from every member instantly &mdash; no deploy.</p>

        {loading ? null : (
          <div style={{ marginTop: 18 }}>
            {items.map(function (it) {
              return (
                <div className={'row' + (it.published ? '' : ' hid')} key={it.id}>
                  <div className="lg" style={{ background: 'linear-gradient(135deg,' + it.logo_from + ',' + it.logo_to + ')' }}>{it.logo_text}</div>
                  <div className="meta">
                    <b>{it.name}{it.published ? '' : ' (hidden)'}</b>
                    <span>{it.category} &middot; {it.ref_url}</span>
                    <span className="clk">{it.clicks} click{it.clicks === 1 ? '' : 's'}</span>
                  </div>
                  <button className={'tog' + (it.published ? '' : ' off')} title={it.published ? 'Live — tap to hide' : 'Hidden — tap to show'} onClick={function () { toggle(it); }} />
                  <button className="ed" onClick={function () { setErr(''); setEditing(Object.assign({}, it)); }}>Edit</button>
                </div>
              );
            })}
            {!editing && <button className="add" onClick={function () { setErr(''); setEditing(Object.assign({}, BLANK)); }}>+ Add an opportunity</button>}
          </div>
        )}

        {editing && (
          <div className="form">
            <h3>{editing.id ? 'Edit opportunity' : 'New opportunity'}</h3>
            <div className="two">
              <div><label>Name</label><input value={editing.name} onChange={function (e) { up('name', e.target.value); }} placeholder="FX Signals Pro" /></div>
              <div><label>Category</label><input value={editing.category} onChange={function (e) { up('category', e.target.value); }} placeholder="Trading & markets" /></div>
            </div>
            <label>Your referral link</label>
            <input value={editing.ref_url} onChange={function (e) { up('ref_url', e.target.value); }} placeholder="https://..." />
            <p className="hint">Shown openly to members as &ldquo;my link&rdquo;. Must start with http:// or https://</p>
            <label>Description</label>
            <textarea value={editing.blurb} onChange={function (e) { up('blurb', e.target.value); }} placeholder="What it is, factually. No income or earnings claims." />
            <label>Your personal take <span style={{ textTransform: 'none', color: '#94a3b8', fontWeight: 600 }}>(optional, shown in italics)</span></label>
            <textarea value={editing.take} onChange={function (e) { up('take', e.target.value); }} placeholder="I've used this for months — here's why I rate it." />
            <div className="two">
              <div>
                <label>Logo monogram</label>
                <input maxLength={4} value={editing.logo_text} onChange={function (e) { up('logo_text', e.target.value.toUpperCase()); }} placeholder="FX" />
              </div>
              <div>
                <label>Logo colour</label>
                <div className="sw">
                  {PALETTES.map(function (p, i) {
                    var on = editing.logo_from === p[0];
                    return <i key={i} className={on ? 'on' : ''} style={{ background: 'linear-gradient(135deg,' + p[0] + ',' + p[1] + ')' }} onClick={function () { up('palette', p); }} />;
                  })}
                </div>
              </div>
            </div>
            {err && <div className="err">{err}</div>}
            <div className="acts">
              <button className="save" onClick={save}>{editing.id ? 'Save changes' : 'Create'}</button>
              <button className="cancel" onClick={function () { setEditing(null); setErr(''); }}>Cancel</button>
            </div>
            {!editing.id && <p className="hint" style={{ marginTop: 10 }}>New opportunities are created hidden. Toggle it live when you&rsquo;re ready.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
