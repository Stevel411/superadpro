import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function PDFCompress() {

  var { t } = useTranslation();  const [file, setFile] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const formatSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') { setFile(f); setResult(null); }
    e.target.value = '';
  };

  const compress = async () => {
    if (!file) return;
    setCompressing(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(src, src.getPageIndices());
      pages.forEach(p => newPdf.addPage(p));
      // Save without object streams for smaller size
      const compressed = await newPdf.save({ useObjectStreams: false });
      const blob = new Blob([compressed], { type: 'application/pdf' });
      const savings = Math.max(0, ((file.size - blob.size) / file.size * 100));
      setResult({ blob, originalSize: file.size, newSize: blob.size, savings: savings.toFixed(1) });
    } catch (e) { alert('Error compressing PDF.'); console.error(e); }
    setCompressing(false);
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a'); a.href = url; a.download = 'compressed-superadpro.pdf'; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => { setFile(null); setResult(null); };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 500, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 6 }}>{t('pdfTools.compressPdf')}</div>
          <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.35)' }}>{t("pdfTools.compressPdfDesc")}</div>
        </div>

        {!file ? (
          <div onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed #2a3040', borderRadius: 14, padding: '60px 20px', textAlign: 'center', cursor: 'pointer', background: '#0a1220', transition: 'border-color .2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--sap-accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--sap-navy-card)'}
          >
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>+</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#c5cad1', marginBottom: 4 }}>{t('pdfTools.clickToUpload')}</div>
            <div style={{ fontSize: 12, color: '#7b8594' }}>{t('pdfTools.maxSize')}</div>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={onFile} style={{ display: 'none' }} />
          </div>
        ) : !result ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '20px 24px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: '#7b8594' }}>Original size: {formatSize(file.size)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={compress} disabled={compressing}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 15, fontWeight: 700, background: 'var(--sap-accent)', color: '#fff', boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>
                {compressing ? 'Compressing...' : 'Compress PDF'}
              </button>
              <button onClick={reset} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(200,220,255,0.6)', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 14, fontWeight: 600 }}>{t('pdfTools.reset')}</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '24px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--sap-green-bright)', marginBottom: 8 }}>{result.savings}%</div>
              <div style={{ fontSize: 13, color: '#7b8594', marginBottom: 12 }}>{t('pdfTools.fileSizeReduced')}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                <div><div style={{ fontSize: 11, color: '#7b8594' }}>{t('pdfTools.originalLabel')}</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{formatSize(result.originalSize)}</div></div>
                <div style={{ fontSize: 18, color: '#7b8594', alignSelf: 'center' }}>→</div>
                <div><div style={{ fontSize: 11, color: '#7b8594' }}>{t('pdfTools.compressedLabel')}</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-green-bright)' }}>{formatSize(result.newSize)}</div></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={download} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 15, fontWeight: 700, background: 'var(--sap-accent)', color: '#fff', boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>{t('pdfTools.downloadCompressed')}</button>
              <button onClick={reset} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(200,220,255,0.6)', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 14, fontWeight: 600 }}>{t('pdfTools.newFile')}</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.08)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(200,220,255,0.3)' }}>{t('pdfTools.wantAiVideo')}</span>
            <Link to="/register" style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-accent)', textDecoration: 'none' }}>{t('pdfTools.joinFree')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
