import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';

export default function PDFMerge() {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...newFiles.map(f => ({ file: f, name: f.name, size: f.size, id: Date.now() + Math.random() }))]);
    e.target.value = '';
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const moveUp = (i) => { if (i === 0) return; setFiles(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); };
  const moveDown = (i) => { if (i >= files.length - 1) return; setFiles(prev => { const n = [...prev]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); };

  const merge = async () => {
    if (files.length < 2) return;
    setMerging(true);
    try {
      const merged = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'merged-superadpro.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error merging PDFs. Please check your files.'); console.error(e); }
    setMerging(false);
  };

  const formatSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 6 }}>Merge PDFs</div>
          <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.35)' }}>Combine multiple PDF files into a single document. Drag to reorder.</div>
        </div>

        <div onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed #2a3040', borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#0a1220', transition: 'border-color .2s', marginBottom: 16 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.borderColor = '#2a3040'}
        >
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>+</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#c5cad1', marginBottom: 4 }}>Click to upload PDF files</div>
          <div style={{ fontSize: 12, color: '#7b8594' }}>or drag and drop</div>
          <input ref={fileRef} type="file" accept="application/pdf" multiple onChange={addFiles} style={{ display: 'none' }} />
        </div>

        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {files.map((f, i) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', minWidth: 20 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: '#7b8594' }}>{formatSize(f.size)}</div>
                </div>
                <button onClick={() => moveUp(i)} style={{ background: 'none', border: 'none', color: '#7b8594', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>↑</button>
                <button onClick={() => moveDown(i)} style={{ background: 'none', border: 'none', color: '#7b8594', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>↓</button>
                <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button onClick={merge} disabled={files.length < 2 || merging}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: files.length < 2 ? 'not-allowed' : 'pointer',
            fontFamily: '"DM Sans",sans-serif', fontSize: 15, fontWeight: 700,
            background: files.length < 2 ? '#1b2030' : '#0ea5e9',
            color: files.length < 2 ? '#7b8594' : '#fff',
            boxShadow: files.length >= 2 ? '0 0 24px rgba(0,212,255,0.2)' : 'none',
          }}>{merging ? 'Merging...' : `Merge ${files.length} PDF${files.length !== 1 ? 's' : ''}`}</button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.08)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(200,220,255,0.3)' }}>Want AI video, music & voiceover?</span>
            <Link to="/register" style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none' }}>Join SuperAdPro free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
