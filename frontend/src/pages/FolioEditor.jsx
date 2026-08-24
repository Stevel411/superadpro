import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function FolioEditor() {
  const { id } = useParams();
  const [page, setPage] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/api/folio/pages/' + id)
      .then(r => { if (!r.ok) throw new Error('load'); return r.json(); })
      .then(setPage).catch(() => setErr(true));
  }, [id]);

  const wrap = { minHeight: '100vh', background: '#f6f2ea', fontFamily: "'Inter',system-ui,sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
  const box = { background: '#fff', borderRadius: 18, padding: 34, maxWidth: 460, textAlign: 'center', boxShadow: '0 30px 70px -40px rgba(23,20,28,.4)' };

  if (err) return <div style={wrap}><div style={box}><h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif" }}>Page not found</h2><p style={{ color: '#6b6e7c' }}>It may have been deleted.</p><a href="/folio" style={{ color: '#5b3df5', fontWeight: 800 }}>← Back to your pages</a></div></div>;
  if (!page) return <div style={wrap}><div style={{ color: '#8b8496' }}>Loading editor…</div></div>;

  return (
    <div style={wrap}><div style={box}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5b3df5' }}>Folio Editor</div>
      <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 24, margin: '10px 0 4px', color: '#17141c' }}>{page.title}</h2>
      <p style={{ color: '#6b6e7c', margin: '0 0 4px' }}>{(page.sections || []).length} sections · <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: page.accent, verticalAlign: 'middle' }} /> {page.accent}</p>
      <p style={{ color: '#8b8496', fontSize: 13, margin: '14px 0 20px' }}>Loaded successfully. The full editing canvas is the next build.</p>
      <a href="/folio" style={{ color: '#5b3df5', fontWeight: 800, textDecoration: 'none' }}>← Back to your pages</a>
    </div></div>
  );
}
