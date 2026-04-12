import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PDFCreator from './PDFCreator';
import PDFMerge from './PDFMerge';
import PDFImages from './PDFImages';
import PDFCompress from './PDFCompress';

const TABS = [
  { id: 'create', name: 'Create PDF' },
  { id: 'merge', name: 'Merge PDFs' },
  { id: 'images', name: 'Images to PDF' },
  { id: 'compress', name: 'Compress PDF' },
];

export default function PDFStudio() {

  var { t } = useTranslation();  const [tab, setTab] = useState('create');

  return (
    <div style={{ background: 'var(--sap-cobalt-deep)', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 72, background: 'rgba(10,18,40,0.95)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)', flexShrink: 0, position: 'relative' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <svg style={{ width: 28, height: 28 }} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="var(--sap-accent)"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('common.pro')}</span></span>
        </Link>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{t('pdfTools.pdfStudio')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-accent)', border: '1px solid rgba(14,165,233,0.4)', borderRadius: 20, padding: '4px 14px', letterSpacing: 1.5 }}>{t('pdfTools.freeLabel')}</span>
        </div>
        <Link to="/register" style={{ background: 'var(--sap-accent)', color: '#fff', fontSize: 15, fontWeight: 600, padding: '10px 24px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>{t('pdfTools.getStartedFree')}</Link>
      </nav>

      {/* TOOL TABS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 28px', height: 44, background: '#0a1220', borderBottom: '1px solid rgba(0,180,216,0.06)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: '"DM Sans",sans-serif', fontSize: 12,
              fontWeight: tab === t.id ? 700 : 600,
              background: tab === t.id ? 'var(--sap-accent)' : 'var(--sap-navy-soft)',
              color: tab === t.id ? '#fff' : '#7b8594',
              borderWidth: 1, borderStyle: 'solid',
              borderColor: tab === t.id ? 'var(--sap-accent)' : 'var(--sap-navy-card)',
              transition: 'all .15s',
            }}>{t.name}</button>
        ))}
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'create' && <PDFCreator />}
        {tab === 'merge' && <PDFMerge />}
        {tab === 'images' && <PDFImages />}
        {tab === 'compress' && <PDFCompress />}
      </div>
    </div>
  );
}
