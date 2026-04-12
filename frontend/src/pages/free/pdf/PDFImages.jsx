import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function PDFImages() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [fitting, setFitting] = useState('fit');
  const [building, setBuilding] = useState(false);
  const fileRef = useRef(null);

  const SIZES = { A4: [595.28, 841.89], Letter: [612, 792] };

  const addImages = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    Promise.all(newFiles.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = ev => res({ file: f, name: f.name, size: f.size, src: ev.target.result, id: Date.now() + Math.random() });
      r.readAsDataURL(f);
    }))).then(imgs => setImages(prev => [...prev, ...imgs]));
    e.target.value = '';
  };

  const removeImg = (id) => setImages(prev => prev.filter(i => i.id !== id));
  const moveUp = (i) => { if (i === 0) return; setImages(p => { const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); };
  const moveDown = (i) => { if (i >= images.length - 1) return; setImages(p => { const n = [...p]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); };

  const buildPDF = async () => {
    if (images.length === 0) return;
    setBuilding(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const [pw, ph] = orientation === 'portrait' ? SIZES[pageSize] : [SIZES[pageSize][1], SIZES[pageSize][0]];
      const pdf = new jsPDF({ orientation: orientation === 'portrait' ? 'p' : 'l', unit: 'pt', format: [pw, ph] });

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage([pw, ph], orientation === 'portrait' ? 'p' : 'l');
        const img = new Image(); img.src = images[i].src;
        await new Promise(res => { img.onload = res; });
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const margin = 20;
        const aw = pw - margin * 2, ah = ph - margin * 2;

        let dx, dy, dw, dh;
        if (fitting === 'fill') {
          const scale = Math.max(aw / iw, ah / ih);
          dw = iw * scale; dh = ih * scale;
          dx = (pw - dw) / 2; dy = (ph - dh) / 2;
        } else {
          const scale = Math.min(aw / iw, ah / ih);
          dw = iw * scale; dh = ih * scale;
          dx = (pw - dw) / 2; dy = (ph - dh) / 2;
        }
        pdf.addImage(images[i].src, 'JPEG', dx, dy, dw, dh);
      }
      pdf.save('images-superadpro.pdf');
    } catch (e) { alert('Error creating PDF.'); console.error(e); }
    setBuilding(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 6 }}>Images to PDF</div>
          <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.35)' }}>Convert images into a PDF document. One image per page.</div>
        </div>

        <div onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed #2a3040', borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#0a1220', marginBottom: 16, transition: 'border-color .2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--sap-accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--sap-navy-card)'}
        >
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>+</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#c5cad1', marginBottom: 4 }}>Click to upload images</div>
          <div style={{ fontSize: 12, color: '#7b8594' }}>JPG, PNG, WebP supported</div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addImages} style={{ display: 'none' }} />
        </div>

        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {images.map((img, i) => (
              <div key={img.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #2a3040', background: 'var(--sap-navy-soft)' }}>
                <img src={img.src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 700, background: 'var(--sap-accent)', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>{i + 1}</div>
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
                  <button onClick={() => moveUp(i)} style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}>↑</button>
                  <button onClick={() => moveDown(i)} style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}>↓</button>
                  <button onClick={() => removeImg(img.id)} style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Page size</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['A4', 'Letter'].map(s => (
                <button key={s} onClick={() => setPageSize(s)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, fontWeight: pageSize === s ? 700 : 600, background: pageSize === s ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: pageSize === s ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: pageSize === s ? 'var(--sap-accent)' : 'var(--sap-navy-card)' }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Orientation</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['portrait', 'landscape'].map(o => (
                <button key={o} onClick={() => setOrientation(o)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 10, fontWeight: orientation === o ? 700 : 600, background: orientation === o ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: orientation === o ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: orientation === o ? 'var(--sap-accent)' : 'var(--sap-navy-card)', textTransform: 'capitalize' }}>{o}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Image fit</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['fit', 'fill'].map(f => (
                <button key={f} onClick={() => setFitting(f)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, fontWeight: fitting === f ? 700 : 600, background: fitting === f ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: fitting === f ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: fitting === f ? 'var(--sap-accent)' : 'var(--sap-navy-card)', textTransform: 'capitalize' }}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={buildPDF} disabled={images.length === 0 || building}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: images.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: '"DM Sans",sans-serif', fontSize: 15, fontWeight: 700,
            background: images.length === 0 ? 'var(--sap-navy-soft)' : 'var(--sap-accent)', color: images.length === 0 ? '#7b8594' : '#fff',
            boxShadow: images.length > 0 ? '0 0 24px rgba(0,212,255,0.2)' : 'none',
          }}>{building ? 'Building PDF...' : `Create PDF (${images.length} image${images.length !== 1 ? 's' : ''})`}</button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.08)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(200,220,255,0.3)' }}>Want AI video, music & voiceover?</span>
            <Link to="/register" style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-accent)', textDecoration: 'none' }}>Join SuperAdPro free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
