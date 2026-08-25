import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FOLIO_CSS } from './folioCss';
import { renderSection, SECTION_LIB, BLOCK_LIB, newBlock } from './folioSections';

const CHROME = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Space+Mono:wght@700&display=swap');
.fed{position:fixed;inset:0;background:#e9ebf1;display:flex;flex-direction:column;font-family:'Inter',system-ui,sans-serif;z-index:1000}
.fed-bar{height:56px;background:#17141c;color:#fff;display:flex;align-items:center;gap:10px;padding:0 12px;flex:none}
.fed-bar a.back{color:#c3c7d4;text-decoration:none;font-size:20px;padding:4px 6px}
.fed-bar .ti{background:none;border:none;color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;max-width:150px;text-overflow:ellipsis;outline:none}
.fed-bar .sp{flex:1}
.fed-bar .seg{display:flex;background:#2a2530;border-radius:8px;padding:3px}
.fed-bar .seg button{background:none;border:none;color:#9aa0b0;font-weight:700;font-size:12px;padding:6px 11px;border-radius:5px;cursor:pointer;font-family:inherit}
.fed-bar .seg button.on{background:#3a3548;color:#fff}
.fed-bar .dots{display:flex;gap:5px}
.fed-bar .dots i{width:22px;height:22px;border-radius:6px;cursor:pointer;border:2px solid transparent}.fed-bar .dots i.on{border-color:#fff}
.fed-bar input[type=color]{width:24px;height:24px;border:none;border-radius:6px;background:none;padding:0;cursor:pointer}
.fed-bar .save{background:#2a2530;border:none;color:#fff;font-weight:800;font-size:13px;padding:9px 15px;border-radius:9px;cursor:pointer;font-family:inherit}
.fed-bar .pub{background:#5b3df5;border:none;color:#fff;font-weight:800;font-size:13px;padding:9px 16px;border-radius:9px;cursor:pointer;font-family:inherit}
.fed-hint{background:#221d2b;color:#b8b1c2;font-size:12px;text-align:center;padding:6px;flex:none;font-weight:600}
.fed-stage{flex:1;overflow:auto;padding:18px;display:flex;justify-content:center}
.fed-doc{background:#fff;width:100%;max-width:1160px;border-radius:12px;overflow:hidden;box-shadow:0 24px 60px -34px rgba(23,20,28,.55);align-self:flex-start;transition:max-width .3s}
.fed-doc.mobile{max-width:390px}
.fsec{position:relative}
.fsec-ctrl{position:absolute;top:8px;right:8px;z-index:30;display:flex;gap:4px;background:#17141c;border-radius:9px;padding:4px;opacity:.32;transition:opacity .2s}
.fsec:hover .fsec-ctrl,.fsec-ctrl:hover{opacity:1}
.fsec-ctrl button{width:28px;height:28px;border:none;border-radius:6px;background:#2a2e3a;color:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;padding:0}
.fsec-ctrl button:hover{background:#5b3df5}
[data-e]:hover{outline:1px dashed rgba(91,61,245,.5);outline-offset:2px;border-radius:2px;cursor:text}
[data-btn]{cursor:pointer}
[data-btn]:hover{outline:2px solid #5b3df5;outline-offset:2px;border-radius:4px}
[data-img]{cursor:pointer;position:relative}
[data-img]:hover{outline:2px solid #5b3df5;outline-offset:2px}
[data-e]:focus{outline:2px solid #5b3df5;outline-offset:2px;border-radius:2px}
.fed-add{display:block;margin:14px auto;background:#fff;border:2px dashed #c3c9d8;color:#5b6070;font-weight:800;font-size:13px;padding:12px 20px;border-radius:10px;cursor:pointer;font-family:inherit}
.fed-add:hover{border-color:#5b3df5;color:#5b3df5}
.fed-modal{position:fixed;inset:0;z-index:1100;background:rgba(23,20,28,.5);display:flex;align-items:center;justify-content:center;padding:20px}
.fed-modal .box{background:#fff;border-radius:16px;padding:20px;width:min(94vw,520px);max-height:82vh;overflow:auto}
.fed-modal h3{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;margin:0 0 14px}
.fed-modal .grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.fed-modal .opt{border:1.5px solid #e6e1d6;border-radius:11px;padding:13px;cursor:pointer;text-align:left;background:#fffdf8}
.fed-modal .opt:hover{border-color:#5b3df5;background:#f6f5ff}
.fed-modal .opt b{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:13.5px;display:block;color:#17141c}
.fed-modal .opt span{font-size:10.5px;color:#8b8496;font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.06em}
.fed-modal .hint{font-size:12.5px;color:#6b6e7c;line-height:1.55;margin-bottom:4px}
.fed-modal label{display:block;font-size:11.5px;font-weight:800;color:#5a6584;margin:12px 0 5px;text-transform:uppercase;letter-spacing:.04em}
.fed-modal .in{width:100%;border:1.5px solid #e3dccd;border-radius:10px;padding:11px 12px;font-size:14px;font-family:inherit}
.fed-modal .in:focus{outline:none;border-color:#5b3df5}
.fed-modal .row{display:flex;gap:10px}.fed-modal .row>div{flex:1}
.fed-modal .save-ar{background:#5b3df5;color:#fff;border:none;border-radius:10px;padding:13px;font-weight:800;cursor:pointer;font-family:inherit;width:100%;margin-top:16px}
.fed-x{background:#efe9dd;border:none;border-radius:10px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;margin-top:14px;width:100%}
.fed-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1200;background:#17141c;color:#fff;padding:14px 18px;border-radius:12px;box-shadow:0 20px 40px -20px rgba(0,0,0,.5);max-width:92vw;font-size:13px;display:flex;align-items:center;gap:12px}
.fed-toast a{color:#a99cff;font-weight:800;text-decoration:none;word-break:break-all}
.fed-toast button{background:#2a2530;border:none;color:#fff;border-radius:8px;padding:7px 11px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;flex:none}
.fed-center{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#8b8496;font-family:'Inter',sans-serif}
.fb-add{display:block;width:100%;margin-top:10px;background:#f2f0ff;border:1.5px dashed #b9aef7;color:#5b3df5;font-weight:800;font-size:13px;padding:12px;border-radius:10px;cursor:pointer;font-family:inherit}
.fb-add:hover{background:#e9e4ff}
.fblk{position:relative;border-radius:8px;transition:box-shadow .15s;cursor:pointer;min-height:8px}
.fblk:hover{box-shadow:0 0 0 2px #c9bdff}
.fblk.sel{box-shadow:0 0 0 2px #5b3df5}
.fb-spacer{display:flex;align-items:center;justify-content:center;color:#b9aef7;font-size:11px;font-family:'Space Mono',monospace;border:1px dashed #d9d3ea;border-radius:6px}
.fbtray{position:fixed;inset:0;z-index:1250;background:rgba(23,20,28,.5);display:flex;align-items:flex-end}
.fbtray .sheet{background:#fff;width:100%;border-top-left-radius:18px;border-top-right-radius:18px;padding:18px 16px 26px}
.fbtray h4{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;margin:0 0 14px}
.fbtray .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:9px}
.fbtray .opt{border:1.5px solid #e6e1d6;border-radius:12px;padding:14px 8px;text-align:center;background:#fffdf8;cursor:pointer;font-weight:800;font-size:12.5px;color:#17141c}
.fbtray .opt:hover{border-color:#5b3df5;background:#f6f5ff;color:#5b3df5}
.fbtray .opt .i{font-size:19px;display:block;margin-bottom:6px}
.fbp{position:fixed;left:0;right:0;bottom:0;z-index:1200;background:#fff;border-top-left-radius:18px;border-top-right-radius:18px;box-shadow:0 -12px 40px -18px rgba(23,20,28,.4);padding:16px 16px 22px;max-height:72vh;overflow:auto}
.fbp h4{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;margin:0 0 4px;display:flex;align-items:center;justify-content:space-between}
.fbp .close{background:#efe9dd;border:none;border-radius:8px;width:30px;height:30px;font-weight:800;cursor:pointer;font-family:inherit}
.fbp label{display:block;font-size:11px;font-weight:800;color:#5a6584;margin:12px 0 5px;text-transform:uppercase;letter-spacing:.04em}
.fbp .in,.fbp textarea{width:100%;border:1.5px solid #e3dccd;border-radius:9px;padding:10px 11px;font-size:14px;font-family:inherit;box-sizing:border-box}
.fbp textarea{min-height:70px;resize:vertical}
.fbp .seg2{display:flex;gap:6px}
.fbp .seg2 button{flex:1;border:1.5px solid #e3dccd;background:#fff;border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;color:#17141c}
.fbp .seg2 button.on{border-color:#5b3df5;background:#f2f0ff;color:#5b3df5}
.fbp .thumb{width:100%;max-height:120px;object-fit:contain;border-radius:9px;margin-top:8px;background:#f6f2ea}
.fbp .up{background:#5b3df5;color:#fff;border:none;border-radius:9px;padding:11px;font-weight:800;cursor:pointer;font-family:inherit;width:100%;font-size:13px;margin-top:6px}
.fbp .acts{display:flex;gap:8px;margin-top:16px}
.fbp .acts button{flex:1;border:none;border-radius:9px;padding:11px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;background:#efe9dd;color:#17141c}
.fbp .acts .del{background:#ffe9e9;color:#c8102e}
.fbp .note{font-size:13px;color:#6b6e7c;padding:8px 0;line-height:1.5}

`;

let _uid = 0;
const nid = () => 'fs' + (++_uid);
const DOTS = ['#5b3df5', '#ff5c39', '#2563eb', '#0d9f6e', '#e11d64', '#f2b53c'];
const BLK_ICON = { heading: 'H', text: '¶', image: '▣', button: '▭', video: '▶', divider: '―', spacer: '↕' };
const BLK_NAME = { heading: 'Heading', text: 'Text', image: 'Image', button: 'Button', video: 'Video', divider: 'Divider', spacer: 'Spacer' };

export default function FolioEditor() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [title, setTitle] = useState('');
  const [accent, setAccent] = useState('#5b3df5');
  const [device, setDevice] = useState('desktop');
  const [saving, setSaving] = useState('');
  const [addAt, setAddAt] = useState(-1); // -1 closed
  const [toast, setToast] = useState(null);
  const [arOpen, setArOpen] = useState(false);
  const [ar, setAr] = useState({ forward_url: '', email_field: 'email', name_field: '' });
  const [linkEdit, setLinkEdit] = useState(null);
  const [blkTray, setBlkTray] = useState(null);
  const [blkSel, setBlkSel] = useState(null);
  const canvasRef = useRef(null);
  const secsRef = useRef([]);
  const accentRef = useRef('#5b3df5');
  const titleRef = useRef('');
  const fileRef = useRef(null);
  const imgTargetRef = useRef(null);
  const [ver, setVer] = useState(0);

  useEffect(() => {
    fetch('/api/folio/pages/' + id).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      secsRef.current = (d.sections || []).map(s => ({ id: nid(), type: s.type, props: s.props || {} }));
      accentRef.current = d.accent || '#5b3df5';
      titleRef.current = d.title || 'Untitled page';
      if (d.capture_config) setAr({ forward_url: d.capture_config.forward_url || '', email_field: d.capture_config.email_field || 'email', name_field: d.capture_config.name_field || '' });
      setAccent(accentRef.current); setTitle(titleRef.current); setStatus('ok');
    }).catch(() => setStatus('error'));
  }, [id]);

  // (re)build the canvas HTML from the data model
  function build() {
    if (!canvasRef.current) return;
    const secs = secsRef.current;
    const inner = secs.map((s, i) =>
      '<div class="fsec" data-idx="' + i + '">'
      + '<div class="fsec-ctrl">'
      + '<button data-act="up" data-idx="' + i + '" title="Move up">\u2191</button>'
      + '<button data-act="down" data-idx="' + i + '" title="Move down">\u2193</button>'
      + '<button data-act="add" data-idx="' + i + '" title="Add below">+</button>'
      + '<button data-act="del" data-idx="' + i + '" title="Delete">\u2715</button>'
      + '</div>' + renderSection(s.type, s.props, s.id) + '</div>'
    ).join('');
    canvasRef.current.innerHTML = '<div class="fo-page" style="--fo-accent:' + accentRef.current + '">' + inner + '</div>';
  }
  useEffect(() => { if (status !== 'ok') return; build(); if (blkSel && canvasRef.current) { const el = canvasRef.current.querySelector('[data-blk="' + blkSel.sid + '|' + blkSel.idx + '"]'); if (el) el.classList.add('sel'); } }, [status, ver, blkSel]);

  function syncFromDOM() {
    if (!canvasRef.current) return;
    canvasRef.current.querySelectorAll('[data-e]').forEach(el => {
      const parts = (el.dataset.e || '').split('|'); if (parts.length !== 2) return;
      const sec = secsRef.current.find(x => x.id === parts[0]);
      if (sec) { sec.props = sec.props || {}; sec.props[parts[1]] = el.innerText.replace(/\u00a0/g, ' ').trim(); }
    });
  }

  // event delegation: control buttons + capture edits on blur
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const onClick = (e) => {
      const addb = e.target.closest('[data-addblk]');
      if (addb) { e.preventDefault(); syncFromDOM(); setBlkTray(addb.dataset.addblk); return; }
      const blk = e.target.closest('.fblk');
      if (blk) { e.preventDefault(); syncFromDOM(); const pr = (blk.dataset.blk || '').split('|'); setBlkSel({ sid: pr[0], idx: parseInt(pr[1], 10) }); return; }
      const im = e.target.closest('[data-img]');
      if (im) { e.preventDefault(); syncFromDOM(); imgTargetRef.current = im.dataset.img; if (fileRef.current) fileRef.current.click(); return; }
      const lk = e.target.closest('[data-btn]');
      if (lk) { e.preventDefault(); syncFromDOM(); const pr = (lk.dataset.btn || '').split('|'); const sc = secsRef.current.find(x => x.id === pr[0]); if (sc) { sc.props = sc.props || {}; setLinkEdit({ sid: pr[0], field: pr[1], text: sc.props[pr[1]] != null ? sc.props[pr[1]] : (lk.innerText || ''), href: sc.props[pr[1] + '_href'] || '' }); } return; }
      const btn = e.target.closest('.fsec-ctrl button'); if (!btn) return;
      e.preventDefault(); syncFromDOM();
      const i = parseInt(btn.dataset.idx, 10); const act = btn.dataset.act; const arr = secsRef.current;
      if (act === 'up' && i > 0) { const t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; setVer(v => v + 1); }
      else if (act === 'down' && i < arr.length - 1) { const t = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t; setVer(v => v + 1); }
      else if (act === 'del') { if (window.confirm('Delete this section?')) { arr.splice(i, 1); setVer(v => v + 1); } }
      else if (act === 'add') { setAddAt(i + 1); }
    };
    const onBlur = (e) => { if (e.target.hasAttribute && e.target.hasAttribute('data-e')) syncFromDOM(); };
    c.addEventListener('click', onClick);
    c.addEventListener('focusout', onBlur);
    return () => { c.removeEventListener('click', onClick); c.removeEventListener('focusout', onBlur); };
  }, [status]);

  function pickAccent(cx) { accentRef.current = cx; setAccent(cx); const pg = canvasRef.current && canvasRef.current.querySelector('.fo-page'); if (pg) pg.style.setProperty('--fo-accent', cx); }
  function addSection(type) { const at = addAt < 0 ? secsRef.current.length : addAt; syncFromDOM(); secsRef.current.splice(at, 0, { id: nid(), type, props: {} }); setAddAt(-1); setVer(v => v + 1); }

  function payload() { syncFromDOM(); return { title: titleRef.current, accent: accentRef.current, sections: secsRef.current.map(s => ({ type: s.type, props: s.props || {} })) }; }
  function save(cb) {
    setSaving('Saving…');
    fetch('/api/folio/pages/' + id + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) })
      .then(r => r.json()).then(d => { setSaving(d && d.ok ? 'Saved' : 'Save failed'); setTimeout(() => setSaving(''), 1600); if (cb && d && d.ok) cb(); })
      .catch(() => { setSaving('Save failed'); setTimeout(() => setSaving(''), 1600); });
  }
  function publish() {
    setSaving('Publishing…');
    fetch('/api/folio/pages/' + id + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) })
      .then(() => fetch('/api/folio/pages/' + id + '/publish', { method: 'POST' })).then(r => r.json())
      .then(d => { setSaving(''); if (d && d.ok) setToast(d.url); else alert('Publish failed — please try again.'); })
      .catch(() => { setSaving(''); alert('Publish failed — please try again.'); });
  }

  function bkList(sid) { const sc = secsRef.current.find(x => x.id === sid); if (!sc) return null; sc.props = sc.props || {}; if (!Array.isArray(sc.props.blocks)) sc.props.blocks = []; return sc.props.blocks; }
  function addBlock(sid, type) { const l = bkList(sid); if (!l) return; l.push(newBlock(type)); setBlkTray(null); setBlkSel({ sid: sid, idx: l.length - 1 }); setVer(v => v + 1); }
  function patchBlock(patch) { if (!blkSel) return; const l = bkList(blkSel.sid); if (l && l[blkSel.idx]) { Object.assign(l[blkSel.idx], patch); setVer(v => v + 1); } }
  function moveBlock(dir) { if (!blkSel) return; const l = bkList(blkSel.sid); if (!l) return; const j = blkSel.idx + dir; if (j < 0 || j >= l.length) return; const t = l[blkSel.idx]; l[blkSel.idx] = l[j]; l[j] = t; setBlkSel({ sid: blkSel.sid, idx: j }); setVer(v => v + 1); }
  function delBlock() { if (!blkSel) return; const l = bkList(blkSel.sid); if (l) { l.splice(blkSel.idx, 1); setBlkSel(null); setVer(v => v + 1); } }
  function uploadBlockImage() { if (!blkSel) return; imgTargetRef.current = 'blk|' + blkSel.sid + '|' + blkSel.idx; if (fileRef.current) fileRef.current.click(); }

  function handleImg(e) {
    const f = e.target.files && e.target.files[0]; const tgt = imgTargetRef.current;
    e.target.value = '';
    if (!f || !tgt) return;
    const pr = tgt.split('|');
    const fd = new FormData(); fd.append('file', f);  // section: sid|field ; block: blk|sid|idx
    setSaving('Uploading image\u2026');
    fetch('/api/folio/upload-image', { method: 'POST', body: fd }).then(r => r.json()).then(d => {
      if (d && d.success && d.url) { if (tgt.indexOf('blk|') === 0) { const l = bkList(pr[1]); if (l && l[+pr[2]]) l[+pr[2]].url = d.url; } else { const sc = secsRef.current.find(x => x.id === pr[0]); if (sc) { sc.props = sc.props || {}; sc.props[pr[1]] = d.url; } } setVer(v => v + 1); setSaving('Image added'); setTimeout(() => setSaving(''), 1500); }
      else { alert((d && d.error) || 'Upload failed.'); setSaving(''); }
    }).catch(() => { alert('Upload failed.'); setSaving(''); });
  }

  function saveLinkEdit() {
    const sc = secsRef.current.find(x => x.id === linkEdit.sid);
    if (sc) { sc.props = sc.props || {}; sc.props[linkEdit.field] = linkEdit.text; sc.props[linkEdit.field + '_href'] = linkEdit.href.trim(); }
    setLinkEdit(null); setVer(v => v + 1);
  }

  function saveAr() {
    fetch('/api/folio/pages/' + id + '/autoresponder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ar) })
      .then(r => r.json()).then(d => { if (d && d.ok) { setArOpen(false); setSaving(ar.forward_url ? 'Autoresponder connected' : 'Saved'); setTimeout(() => setSaving(''), 1800); } else alert((d && d.error) || 'Could not save.'); })
      .catch(() => alert('Could not save.'));
  }

  if (status === 'loading') return <><style>{CHROME}</style><div className="fed-center">Loading editor…</div></>;
  if (status === 'error') return <><style>{CHROME}</style><div className="fed-center"><div style={{ textAlign: 'center' }}><p>Couldn't load this page.</p><a href="/folio" style={{ color: '#5b3df5', fontWeight: 800 }}>← Back to your pages</a></div></div></>;

  return (
    <div className="fed">
      <style>{CHROME}{FOLIO_CSS}</style>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImg} />
      <div className="fed-bar">
        <a className="back" href="/folio" title="Back">←</a>
        <input className="ti" defaultValue={title} onChange={e => { titleRef.current = e.target.value; }} title="Page title" />
        <div className="sp" />
        <div className="dots">
          {DOTS.map(c => <i key={c} className={c === accent ? 'on' : ''} style={{ background: c }} onClick={() => pickAccent(c)} />)}
        </div>
        <input type="color" value={accent} onChange={e => pickAccent(e.target.value)} title="Custom colour" />
        <div className="seg">
          <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Desktop</button>
          <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
        </div>
        <button className="save" onClick={() => setArOpen(true)} title="Connect autoresponder">⚡</button>
        <button className="save" onClick={() => save()}>{saving || 'Save'}</button>
        <button className="pub" onClick={publish}>Publish</button>
      </div>
      <div className="fed-hint">Tap text to edit · tap a button for its link · tap an image to replace it</div>
      <div className="fed-stage">
        <div className={'fed-doc ' + (device === 'mobile' ? 'mobile' : '')}>
          <div ref={canvasRef} />
          <button className="fed-add" onClick={() => setAddAt(secsRef.current.length)}>+ Add section</button>
        </div>
      </div>

      {addAt >= 0 ? (
        <div className="fed-modal" onClick={e => { if (e.target === e.currentTarget) setAddAt(-1); }}>
          <div className="box">
            <h3>Add a section</h3>
            <div className="grid">
              {SECTION_LIB.map(x => (
                <button className="opt" key={x.type} onClick={() => addSection(x.type)}>
                  <b>{x.label}</b><span>{x.cat}</span>
                </button>
              ))}
            </div>
            <button className="fed-x" onClick={() => setAddAt(-1)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {blkTray ? (
        <div className="fbtray" onClick={e => { if (e.target === e.currentTarget) setBlkTray(null); }}>
          <div className="sheet">
            <h4>Add a block</h4>
            <div className="grid">
              {BLOCK_LIB.map(b => (
                <button className="opt" key={b.type} onClick={() => addBlock(blkTray, b.type)}>
                  <span className="i">{BLK_ICON[b.type]}</span>{b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {blkSel ? (() => {
        const l = bkList(blkSel.sid); const b = l && l[blkSel.idx];
        if (!b) return null;
        const seg = (val, opts, key) => (<div className="seg2">{opts.map(o => <button key={o.v} className={val === o.v ? 'on' : ''} onClick={() => patchBlock({ [key]: o.v })}>{o.l}</button>)}</div>);
        const alignSeg = seg(b.align || 'left', [{ v: 'left', l: 'Left' }, { v: 'center', l: 'Center' }, { v: 'right', l: 'Right' }], 'align');
        return (
          <div className="fbp">
            <h4><span>{BLK_NAME[b.type]}</span><button className="close" onClick={() => setBlkSel(null)}>✕</button></h4>
            {b.type === 'heading' ? (<><label>Text</label><input className="in" value={b.text || ''} onChange={e => patchBlock({ text: e.target.value })} /><label>Size</label>{seg(b.level || 'h2', [{ v: 'h1', l: 'H1' }, { v: 'h2', l: 'H2' }, { v: 'h3', l: 'H3' }], 'level')}<label>Align</label>{alignSeg}</>) : null}
            {b.type === 'text' ? (<><label>Text</label><textarea value={b.text || ''} onChange={e => patchBlock({ text: e.target.value })} /><label>Align</label>{alignSeg}</>) : null}
            {b.type === 'image' ? (<><button className="up" onClick={uploadBlockImage}>{b.url ? 'Replace image' : 'Upload image'}</button>{b.url ? <img className="thumb" src={b.url} alt="" /> : null}<label>Link (optional)</label><input className="in" value={b.href || ''} onChange={e => patchBlock({ href: e.target.value })} placeholder="https://..." /><label>Align</label>{alignSeg}</>) : null}
            {b.type === 'button' ? (<><label>Text</label><input className="in" value={b.text || ''} onChange={e => patchBlock({ text: e.target.value })} /><label>Links to (URL)</label><input className="in" value={b.href || ''} onChange={e => patchBlock({ href: e.target.value })} placeholder="https://..." /><label>Style</label>{seg(b.variant || 'solid', [{ v: 'solid', l: 'Solid' }, { v: 'ghost', l: 'Outline' }], 'variant')}<label>Align</label>{alignSeg}</>) : null}
            {b.type === 'video' ? (<><label>YouTube or Vimeo link</label><input className="in" value={b.url || ''} onChange={e => patchBlock({ url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /><p className="note">Paste the link and it embeds as a player on your published page.</p></>) : null}
            {b.type === 'divider' ? (<p className="note">A horizontal divider line to separate content.</p>) : null}
            {b.type === 'spacer' ? (<><label>Height (px)</label><input className="in" type="number" value={b.height || 32} onChange={e => patchBlock({ height: parseInt(e.target.value, 10) || 32 })} /></>) : null}
            <div className="acts">
              <button onClick={() => moveBlock(-1)}>↑ Up</button>
              <button onClick={() => moveBlock(1)}>↓ Down</button>
              <button className="del" onClick={delBlock}>Delete</button>
            </div>
          </div>
        );
      })() : null}

      {linkEdit ? (
        <div className="fed-modal" onClick={e => { if (e.target === e.currentTarget) setLinkEdit(null); }}>
          <div className="box">
            <h3>Button &amp; link</h3>
            <p className="hint">Set what this button or link says, and where it sends people when clicked.</p>
            <label>Text</label>
            <input className="in" value={linkEdit.text} onChange={e => setLinkEdit({ ...linkEdit, text: e.target.value })} placeholder="Button text" />
            <label>Links to (URL)</label>
            <input className="in" value={linkEdit.href} onChange={e => setLinkEdit({ ...linkEdit, href: e.target.value })} placeholder="https://your-link.com" />
            <button className="save-ar" onClick={saveLinkEdit}>Save</button>
            <button className="fed-x" onClick={() => setLinkEdit(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {arOpen ? (
        <div className="fed-modal" onClick={e => { if (e.target === e.currentTarget) setArOpen(false); }}>
          <div className="box">
            <h3>Connect your autoresponder</h3>
            <p className="hint">Every lead is always saved to your <b>MyLeads</b>. To <i>also</i> send opt-ins straight to your own autoresponder (Mailchimp, GetResponse, AWeber, Brevo…), paste your form’s action URL and the field names it uses — you’ll find these in your autoresponder’s “raw HTML” or “embed form” code. Leave the URL blank to keep leads in MyLeads only.</p>
            <label>Form action URL</label>
            <input className="in" value={ar.forward_url} onChange={e => setAr({ ...ar, forward_url: e.target.value })} placeholder="https://your-autoresponder.com/subscribe" />
            <div className="row">
              <div><label>Email field name</label><input className="in" value={ar.email_field} onChange={e => setAr({ ...ar, email_field: e.target.value })} placeholder="email" /></div>
              <div><label>Name field (optional)</label><input className="in" value={ar.name_field} onChange={e => setAr({ ...ar, name_field: e.target.value })} placeholder="name" /></div>
            </div>
            <button className="save-ar" onClick={saveAr}>Save connection</button>
            <button className="fed-x" onClick={() => setArOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fed-toast">
          <span>Published →</span><a href={toast} target="_blank" rel="noreferrer">{toast.replace('https://www.', '')}</a>
          <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(toast); }}>Copy</button>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      ) : null}
    </div>
  );
}
