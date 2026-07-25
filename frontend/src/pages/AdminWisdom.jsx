import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

// AdvantageLife — Daily Wisdom admin. Add quotes, approve/unapprove, delete
// unused ones. The source field is required, mirroring the schema: the box
// guards against a forgotten field, not a wrong attribution — verifying the
// source is still on the person adding it.

const CSS = `
.wadm{background:#f1f5f9;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
.wadm .wrap{max-width:900px;margin:0 auto;padding:26px 18px 70px}
.wadm .bk{display:inline-block;font-size:12.5px;font-weight:800;color:#64748b;text-decoration:none;margin-bottom:14px}
.wadm h1{font-size:26px;font-weight:900;letter-spacing:-.02em;color:#0a1f52}
.wadm .lead{font-size:14px;color:#64748b;margin-top:6px;line-height:1.5}
.wadm .stat{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.wadm .stat div{background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:11px 16px}
.wadm .stat b{display:block;font-size:22px;font-weight:900;color:#0a1f52}
.wadm .stat span{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
.wadm .add{background:#0a1f52;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;margin:16px 0}
.wadm .form{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:18px}
.wadm .form h3{font-size:16px;font-weight:900;color:#0a1f52;margin-bottom:12px}
.wadm label{display:block;font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.04em;margin:12px 0 5px}
.wadm input,.wadm textarea,.wadm select{width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-family:inherit;font-size:14px;color:#0f172a}
.wadm textarea{resize:vertical;min-height:70px;line-height:1.5}
.wadm .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.wadm .hint{font-size:11.5px;color:#94a3b8;margin-top:4px;line-height:1.4}
.wadm .acts{display:flex;gap:9px;margin-top:16px;flex-wrap:wrap}
.wadm .save{background:#c8102e;color:#fff;border:0;border-radius:9px;padding:11px 20px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer}
.wadm .cancel{background:#fff;color:#64748b;border:1.5px solid #e2e8f0;border-radius:9px;padding:11px 18px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer}
.wadm .err{background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:9px;padding:10px 13px;font-size:13px;font-weight:600;margin-top:12px}
.wadm .q{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:15px 16px;margin-bottom:9px}
.wadm .q.off{opacity:.55}
.wadm .q .tx{font-size:14.5px;line-height:1.45;font-weight:600;color:#0a1f52}
.wadm .q .mt{font-size:12px;color:#64748b;margin-top:7px;font-weight:600}
.wadm .q .mt .th{display:inline-block;background:#eef2f8;border-radius:5px;padding:1px 7px;margin-left:6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#12388f;font-weight:800}
.wadm .q .qa{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}
.wadm .q .qa button{border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}
.wadm .q .qa .ap{color:#137a43;border-color:#bfe6cf}
.wadm .q .qa .un{color:#b45309;border-color:#fcd9a8}
.wadm .q .qa .ed{color:#0a1f52}
.wadm .q .qa .del{color:#b91c1c;border-color:#fca5a5}
.wadm .q .shown{font-size:11px;color:#94a3b8;font-weight:700;margin-left:auto;align-self:center}
.wadm .load{padding:40px 0;text-align:center;color:#64748b;font-weight:700}
@media(max-width:600px){.wadm .two{grid-template-columns:1fr}}
`;

const BLANK = { id: 0, text: '', author: '', source: '', year: '', theme: 'persistence', approved: true };

export default function AdminWisdom() {
  const [quotes, setQuotes] = useState([]);
  const [themes, setThemes] = useState([]);
  const [stats, setStats] = useState({ count: 0, approved: 0 });
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    apiGet('/admin/api/al/wisdom-quotes')
      .then(function (j) {
        setQuotes((j && j.quotes) || []);
        setThemes((j && j.themes) || []);
        setStats({ count: (j && j.count) || 0, approved: (j && j.approved) || 0 });
        setLoading(false);
      })
      .catch(function () { setLoading(false); });
  }
  useEffect(load, []);

  function save() {
    setErr('');
    var e = editing;
    if (!e.text.trim() || !e.author.trim() || !e.source.trim()) {
      setErr('Quote, author and source are all required.'); return;
    }
    fetch('/admin/api/al/wisdom-quotes', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) { if (!res.ok) { setErr(res.j.error || 'Could not save.'); return; } setEditing(null); load(); })
      .catch(function () { setErr('Could not save. Try again.'); });
  }

  function toggle(q) {
    fetch('/admin/api/al/wisdom-quotes/' + q.id + '/toggle', { method: 'POST', credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(load).catch(load);
  }

  function del(q) {
    if (!window.confirm('Delete this quote?')) return;
    fetch('/admin/api/al/wisdom-quotes/' + q.id + '/delete', { method: 'POST', credentials: 'include' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) { if (!res.ok) { window.alert(res.j.error || 'Could not delete.'); return; } load(); })
      .catch(function () {});
  }

  function up(k, v) { setEditing(function (e) { return Object.assign({}, e, { [k]: v }); }); }

  return (
    <div className="wadm">
      <style>{CSS}</style>
      <div className="wrap">
        <a className="bk" href="/admin/al">&larr; Admin</a>
        <h1>Daily Wisdom</h1>
        <p className="lead">Add quotes to the rotation. The more there are, the longer before a
          member sees one repeat. The source field is required &mdash; it is what keeps a
          misattributed quote off your members&rsquo; screens, so check it before you add.</p>

        <div className="stat">
          <div><b>{stats.count}</b><span>Total</span></div>
          <div><b>{stats.approved}</b><span>In rotation</span></div>
          <div><b>{stats.approved}</b><span>Days to repeat</span></div>
        </div>

        {!editing && <button className="add" onClick={function () { setErr(''); setEditing(Object.assign({}, BLANK)); }}>+ Add a quote</button>}

        {editing && (
          <div className="form">
            <h3>{editing.id ? 'Edit quote' : 'New quote'}</h3>
            <label>Quote</label>
            <textarea value={editing.text} onChange={function (e) { up('text', e.target.value); }} placeholder="The words themselves." />
            <div className="two">
              <div><label>Author</label><input value={editing.author} onChange={function (e) { up('author', e.target.value); }} placeholder="Seneca" /></div>
              <div>
                <label>Theme</label>
                <select value={editing.theme} onChange={function (e) { up('theme', e.target.value); }}>
                  {themes.map(function (t) { return <option key={t.key} value={t.key}>{t.label}</option>; })}
                </select>
              </div>
            </div>
            <label>Source</label>
            <input value={editing.source} onChange={function (e) { up('source', e.target.value); }} placeholder="Work, speech or letter — where it's actually from" />
            <p className="hint">Required. If you can&rsquo;t source it, don&rsquo;t add it &mdash; a fake attribution to your 611 members is the thing this field exists to stop.</p>
            <label>Year <span style={{ textTransform: 'none', color: '#94a3b8', fontWeight: 600 }}>(optional)</span></label>
            <input value={editing.year} onChange={function (e) { up('year', e.target.value); }} placeholder="1910, c.65, 2008" style={{ maxWidth: 200 }} />
            {err && <div className="err">{err}</div>}
            <div className="acts">
              <button className="save" onClick={save}>{editing.id ? 'Save changes' : 'Add to rotation'}</button>
              <button className="cancel" onClick={function () { setEditing(null); setErr(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="load">Loading&hellip;</div>
        ) : (
          quotes.map(function (q) {
            return (
              <div className={'q' + (q.approved ? '' : ' off')} key={q.id}>
                <div className="tx">&ldquo;{q.text}&rdquo;</div>
                <div className="mt">{q.author}{q.year ? ', ' + q.year : ''} &middot; {q.source}<span className="th">{q.theme.replace('_', ' ')}</span></div>
                <div className="qa">
                  {q.approved
                    ? <button className="un" onClick={function () { toggle(q); }}>Take out of rotation</button>
                    : <button className="ap" onClick={function () { toggle(q); }}>Put in rotation</button>}
                  <button className="ed" onClick={function () { setErr(''); setEditing(Object.assign({}, q)); }}>Edit</button>
                  <button className="del" onClick={function () { del(q); }}>Delete</button>
                  <span className="shown">shown {q.times_shown}&times;</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
