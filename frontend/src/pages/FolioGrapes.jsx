import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import presetWebpage from 'grapesjs-preset-webpage';
import basicBlocks from 'grapesjs-blocks-basic';
import formsPlugin from 'grapesjs-plugin-forms';

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=Oswald:wght@400;500;600;700&family=Anton&display=swap';

const FONT_OPTS = [
  { value: "'Inter',sans-serif", name: 'Inter' }, { value: "'Bricolage Grotesque',sans-serif", name: 'Bricolage' },
  { value: "'Poppins',sans-serif", name: 'Poppins' }, { value: "'Montserrat',sans-serif", name: 'Montserrat' },
  { value: "'DM Sans',sans-serif", name: 'DM Sans' }, { value: "'Work Sans',sans-serif", name: 'Work Sans' },
  { value: "'Playfair Display',serif", name: 'Playfair Display' }, { value: "'Lora',serif", name: 'Lora' },
  { value: "'Merriweather',serif", name: 'Merriweather' }, { value: "'Oswald',sans-serif", name: 'Oswald' },
  { value: "Anton,sans-serif", name: 'Anton' },
];

// Clean light skin over GrapesJS's default dark theme + AdvantageLife accent.
const SKIN = `
.fg-wrap .gjs-pn-panel,.fg-wrap .gjs-pn-panels{background:#fbf9f4;border-color:#e8e2d5}
.fg-wrap .gjs-pn-btn{color:#6b6475;border-radius:6px}
.fg-wrap .gjs-pn-btn:hover{color:#17141c}
.fg-wrap .gjs-pn-btn.gjs-pn-active{color:#5b3df5;background:#efeaff;box-shadow:none}
.fg-wrap .gjs-cv-canvas{background:#eceaf3}
.fg-wrap .gjs-block{background:#fff;border-radius:10px;border:1px solid #e8e2d5;color:#17141c;box-shadow:0 1px 2px rgba(0,0,0,.04);min-height:auto;padding:12px 6px}
.fg-wrap .gjs-block:hover{border-color:#5b3df5;color:#5b3df5}
.fg-wrap .gjs-block svg,.fg-wrap .gjs-block i{fill:currentColor}
.fg-wrap .gjs-block-label{font-weight:700;font-size:11px}
.fg-wrap .gjs-blocks-c{padding:10px}
.fg-wrap .gjs-title,.fg-wrap .gjs-sm-sector-title,.fg-wrap .gjs-block-category .gjs-title,.fg-wrap .gjs-layer-title{background:#f4f0e8;color:#17141c;font-weight:800;border-color:#e8e2d5}
.fg-wrap .gjs-sm-sector .gjs-sm-properties,.fg-wrap .gjs-sm-sectors{background:#fbf9f4}
.fg-wrap .gjs-field,.fg-wrap .gjs-sm-field,.fg-wrap .gjs-clm-select,.fg-wrap input.gjs-sm-input{background:#fff;border:1px solid #ddd6c8;border-radius:6px;color:#17141c}
.fg-wrap .gjs-sm-label,.fg-wrap .gjs-clm-tags-label,.fg-wrap .gjs-label,.fg-wrap .gjs-sm-sector .gjs-sm-property__name{color:#4a4458}
.fg-wrap .gjs-color-warn,.fg-wrap .gjs-four-color,.fg-wrap .gjs-four-color-h:hover{color:#5b3df5}
.fg-wrap .gjs-editor,.fg-wrap .gjs-block-label,.fg-wrap .gjs-field,.fg-wrap .gjs-one-bg,.fg-wrap .gjs-sm-sector{font-family:'Inter',system-ui,sans-serif}
.fg-wrap .gjs-pn-views-container{box-shadow:-2px 0 8px rgba(23,20,28,.04)}
`;

export default function FolioGrapes() {
  const { id } = useParams();
  const holder = useRef(null);
  const edRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/folio/pages/' + id).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      const editor = grapesjs.init({
        container: holder.current,
        height: '100%',
        fromElement: false,
        storageManager: false,
        assetManager: { upload: '/api/folio/upload-image', uploadName: 'file', autoAdd: true },
        plugins: [basicBlocks, formsPlugin, presetWebpage],
        pluginsOpts: {
          [basicBlocks]: { flexGrid: true },
          [formsPlugin]: {},
          [presetWebpage]: { modalImportTitle: 'Import' },
        },
        canvas: { styles: [FONT_LINK] },
        styleManager: {
          sectors: [
            { name: 'Typography', open: true, properties: [
              { property: 'font-family', name: 'Font', type: 'select', defaults: "'Inter',sans-serif", options: FONT_OPTS },
              'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-shadow',
            ] },
            { name: 'Dimension', open: false, properties: ['width', 'max-width', 'height', 'padding', 'margin'] },
            { name: 'Background', open: false, properties: ['background-color', 'background'] },
            { name: 'Border', open: false, properties: ['border-radius', 'border', 'box-shadow'] },
            { name: 'Extra', open: false, properties: ['opacity', 'display'] },
          ],
        },
      });
      edRef.current = editor;
      const gjs = d.gjs || null;
      if (gjs && gjs.html) {
        editor.setComponents(gjs.html);
        if (gjs.css) editor.setStyle(gjs.css);
      } else {
        editor.setComponents('<section style="padding:70px 20px;text-align:center;font-family:Inter,sans-serif"><h1 style="font-size:46px;margin:0 0 14px;font-weight:800">Your headline here</h1><p style="font-size:18px;color:#555;max-width:560px;margin:0 auto">Drag blocks from the panel, edit any text, and style it with the right-hand panels — fonts, colours, spacing, everything.</p></section>');
      }
      setStatus('ok');
    }).catch(() => setStatus('error'));
    return () => { if (edRef.current) { try { edRef.current.destroy(); } catch (e) {} } };
  }, [id]);

  function content() { const ed = edRef.current; return { html: ed.getHtml(), css: ed.getCss() }; }
  function save(cb) {
    if (!edRef.current) return; setSaving('Saving…');
    fetch('/api/folio/pages/' + id + '/save-gjs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content()) })
      .then(r => r.json()).then(d => { setSaving(d && d.ok ? 'Saved' : 'Save failed'); setTimeout(() => setSaving(''), 1500); if (cb && d && d.ok) cb(); })
      .catch(() => { setSaving('Save failed'); setTimeout(() => setSaving(''), 1500); });
  }
  function publish() {
    if (!edRef.current) return; setSaving('Publishing…');
    fetch('/api/folio/pages/' + id + '/save-gjs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content()) })
      .then(() => fetch('/api/folio/pages/' + id + '/publish', { method: 'POST' })).then(r => r.json())
      .then(d => { setSaving(''); if (d && d.ok) setToast(d.url); else alert('Publish failed — please try again.'); })
      .catch(() => { setSaving(''); alert('Publish failed — please try again.'); });
  }

  return (
    <div className="fg-wrap" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#fff', zIndex: 1000 }}>
      <style>{SKIN}</style>
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
