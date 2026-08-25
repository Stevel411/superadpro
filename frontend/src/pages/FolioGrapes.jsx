import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import presetWebpage from 'grapesjs-preset-webpage';

// First-cut GrapesJS editor wired to the Folio backend (save / publish / load).
// Foundation to iterate on: custom blocks, R2 uploads, lead-capture, fonts, styling all layer on from here.
export default function FolioGrapes() {
  const { id } = useParams();
  const holder = useRef(null);
  const edRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let editor;
    // load the page first, then init the editor with its content
    fetch('/api/folio/pages/' + id).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      editor = grapesjs.init({
        container: holder.current,
        height: '100%',
        fromElement: false,
        storageManager: false,
        plugins: [presetWebpage],
        pluginsOpts: { [presetWebpage]: {} },
        canvas: {
          styles: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&display=swap'],
        },
      });
      edRef.current = editor;
      const gjs = d.gjs || null;
      if (gjs && gjs.html) {
        editor.setComponents(gjs.html);
        if (gjs.css) editor.setStyle(gjs.css);
      } else {
        editor.setComponents('<section style="padding:60px 20px;text-align:center;font-family:Inter,sans-serif"><h1 style="font-size:44px;margin:0 0 12px">Your headline here</h1><p style="font-size:18px;color:#555">Drag blocks from the right, or edit this text. Style anything with the panels.</p></section>');
      }
      setStatus('ok');
    }).catch(() => setStatus('error'));
    return () => { if (edRef.current) { try { edRef.current.destroy(); } catch (e) {} } };
  }, [id]);

  function currentContent() {
    const ed = edRef.current;
    return { html: ed.getHtml(), css: ed.getCss() };
  }
  function save(cb) {
    if (!edRef.current) return;
    setSaving('Saving…');
    fetch('/api/folio/pages/' + id + '/save-gjs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentContent()),
    }).then(r => r.json()).then(d => { setSaving(d && d.ok ? 'Saved' : 'Save failed'); setTimeout(() => setSaving(''), 1500); if (cb && d && d.ok) cb(); })
      .catch(() => { setSaving('Save failed'); setTimeout(() => setSaving(''), 1500); });
  }
  function publish() {
    if (!edRef.current) return;
    setSaving('Publishing…');
    fetch('/api/folio/pages/' + id + '/save-gjs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentContent()),
    }).then(() => fetch('/api/folio/pages/' + id + '/publish', { method: 'POST' })).then(r => r.json())
      .then(d => { setSaving(''); if (d && d.ok) setToast(d.url); else alert('Publish failed — please try again.'); })
      .catch(() => { setSaving(''); alert('Publish failed — please try again.'); });
  }

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
        <div style={{ flex: 1, minHeight: 0 }}><div ref={holder} style={{ height: '100%' }} /></div>
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
