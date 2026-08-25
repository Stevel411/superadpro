import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import EmailEditor from 'react-email-editor';

// Steve's free Unlayer Project ID goes here once created (unlayer.com dashboard).
// With it set, the editor runs in page/web mode, white-label config + custom blocks become available.
const PROJECT_ID = 0;

export default function FolioUnlayer() {
  const { id } = useParams();
  const editorRef = useRef(null);
  const designRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/folio/pages/' + id).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      designRef.current = (d.unlayer && d.unlayer.design) ? d.unlayer.design : null;
      setStatus('ok');
    }).catch(() => setStatus('error'));
  }, [id]);

  function onReady(unlayer) {
    if (designRef.current) { try { unlayer.loadDesign(designRef.current); } catch (e) {} }
  }
  function exportAnd(cb) {
    const ed = editorRef.current && editorRef.current.editor;
    if (!ed) { alert('Editor still loading — try again in a moment.'); return; }
    ed.exportHtml((data) => cb(data.design, data.html));
  }
  function save(then) {
    setSaving('Saving…');
    exportAnd((design, html) => {
      fetch('/api/folio/pages/' + id + '/save-unlayer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design, html }) })
        .then(r => r.json()).then(d => { setSaving(d && d.ok ? 'Saved' : 'Save failed'); setTimeout(() => setSaving(''), 1500); if (then && d && d.ok) then(); })
        .catch(() => { setSaving('Save failed'); setTimeout(() => setSaving(''), 1500); });
    });
  }
  function publish() {
    setSaving('Publishing…');
    exportAnd((design, html) => {
      fetch('/api/folio/pages/' + id + '/save-unlayer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design, html }) })
        .then(() => fetch('/api/folio/pages/' + id + '/publish', { method: 'POST' })).then(r => r.json())
        .then(d => { setSaving(''); if (d && d.ok) setToast(d.url); else alert('Publish failed — please try again.'); })
        .catch(() => { setSaving(''); alert('Publish failed — please try again.'); });
    });
  }

  const options = { displayMode: 'web', appearance: { theme: 'modern_light' } };
  if (PROJECT_ID) options.projectId = PROJECT_ID;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#fff', zIndex: 1000 }}>
      <div style={{ height: 52, background: '#17141c', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', flex: 'none', fontFamily: 'Inter,sans-serif' }}>
        <a href="/folio" style={{ color: '#c3c7d4', textDecoration: 'none', fontSize: 20, padding: '4px 6px' }}>←</a>
        <b style={{ fontSize: 14 }}>Page editor</b>
        <div style={{ flex: 1 }} />
        <button onClick={() => save()} style={{ background: '#2a2530', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, padding: '9px 15px', borderRadius: 9, cursor: 'pointer' }}>{saving || 'Save'}</button>
        <button onClick={publish} style={{ background: '#5b3df5', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, padding: '9px 16px', borderRadius: 9, cursor: 'pointer' }}>Publish</button>
      </div>
      {status === 'error' ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Inter,sans-serif' }}>
          <div style={{ textAlign: 'center' }}><p>Couldn't load this page.</p><a href="/folio" style={{ color: '#5b3df5', fontWeight: 800 }}>← Back to your pages</a></div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <EmailEditor ref={editorRef} onReady={onReady} options={options} minHeight="100%" style={{ height: '100%' }} />
        </div>
      )}
      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 1200, background: '#17141c', color: '#fff', padding: '14px 18px', borderRadius: 12, fontSize: 13, display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'Inter,sans-serif' }}>
          <span>Published →</span>
          <a href={toast} target="_blank" rel="noreferrer" style={{ color: '#a99cff', fontWeight: 800 }}>{toast.replace('https://www.', '')}</a>
          <button onClick={() => setToast(null)} style={{ background: '#2a2530', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 11px', fontWeight: 800, cursor: 'pointer' }}>✕</button>
        </div>
      ) : null}
    </div>
  );
}
