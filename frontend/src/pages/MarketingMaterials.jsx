import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';

var LANGUAGES = [
  { code: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'ES', flag: '🇪🇸', name: 'Español' },
  { code: 'FR', flag: '🇫🇷', name: 'Français' },
  { code: 'DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'PT', flag: '🇧🇷', name: 'Português' },
  { code: 'AR', flag: '🇸🇦', name: 'العربية' },
  { code: 'HI', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'ZH', flag: '🇨🇳', name: '中文' },
  { code: 'JA', flag: '🇯🇵', name: '日本語' },
  { code: 'KO', flag: '🇰🇷', name: '한국어' },
  { code: 'RU', flag: '🇷🇺', name: 'Русский' },
  { code: 'IT', flag: '🇮🇹', name: 'Italiano' },
  { code: 'NL', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'PL', flag: '🇵🇱', name: 'Polski' },
  { code: 'TR', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'VI', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'TH', flag: '🇹🇭', name: 'ภาษาไทย' },
  { code: 'ID', flag: '🇮🇩', name: 'Bahasa Indonesia' },
  { code: 'TL', flag: '🇵🇭', name: 'Filipino' },
  { code: 'SW', flag: '🇰🇪', name: 'Kiswahili' },
];

var SLIDE_NAMES = ['Intro — 4 Income Streams', 'Membership Referrals', 'Campaign Grid', 'Credit Nexus', 'Course Academy'];
var SLIDE_COLORS = ['#172554', '#0ea5e9', '#22c55e', '#8b5cf6', '#ef4444'];

export default function MarketingMaterials() {
  var { t, i18n } = useTranslation();
  var [selectedLang, setSelectedLang] = useState('EN');
  var [dropdownOpen, setDropdownOpen] = useState(false);
  var [copied, setCopied] = useState(false);
  var dropRef = useRef(null);

  // Auto-detect from platform language
  useEffect(function() {
    var platformLang = (i18n.language || 'en').toUpperCase().slice(0, 2);
    var match = LANGUAGES.find(function(l) { return l.code === platformLang; });
    if (match) setSelectedLang(match.code);
  }, [i18n.language]);

  // Close dropdown on outside click
  useEffect(function() {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  var selected = LANGUAGES.find(function(l) { return l.code === selectedLang; }) || LANGUAGES[0];
  var downloadUrl = '/static/downloads/income-streams/SuperAdPro-4-Income-Streams-' + selectedLang + '.pptx';

  function copyLink() {
    navigator.clipboard.writeText(window.location.origin + downloadUrl);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  return <AppLayout title="Marketing Materials" activePage="marketing-materials">
    <style>{'.mm-lang-option:hover{background:#f8fafc !important}'}</style>
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Marketing Materials</h1>
        <p style={{ fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 1.6 }}>Download ready-made presentations to share with prospects. Available in 20 languages.</p>
      </div>

      {/* Language selector — premium dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '14px 18px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>🌐 Language:</div>
        <div ref={dropRef} style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <div onClick={function() { setDropdownOpen(!dropdownOpen); }} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            borderRadius: 10, border: '1.5px solid ' + (dropdownOpen ? '#8b5cf6' : '#e2e8f0'),
            background: dropdownOpen ? '#faf5ff' : '#f8fafc', cursor: 'pointer', transition: 'all .15s'
          }}>
            <span style={{ fontSize: 20 }}>{selected.flag}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{selected.name}</span>
            <span style={{ fontSize: 13, color: '#7a8899', fontWeight: 700 }}>{selected.code}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a8899" strokeWidth="2.5" style={{ transform: dropdownOpen ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {/* Dropdown panel */}
          {dropdownOpen && <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
            background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0',
            boxShadow: '0 12px 40px rgba(0,0,0,.1)', maxHeight: 320, overflowY: 'auto'
          }} onMouseDown={function(e) { e.stopPropagation(); }}>
            {LANGUAGES.map(function(lang) {
              var isSelected = lang.code === selectedLang;
              return <div key={lang.code} onClick={function(e) { e.stopPropagation(); setSelectedLang(lang.code); setDropdownOpen(false); }} className="mm-lang-option" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                cursor: 'pointer',
                background: isSelected ? '#f5f3ff' : 'transparent',
                borderLeft: isSelected ? '3px solid #8b5cf6' : '3px solid transparent',
              }}>
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#7c3aed' : '#334155' }}>{lang.name}</span>
                <span style={{ fontSize: 13, color: '#7a8899', fontWeight: 600 }}>{lang.code}</span>
                {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>;
            })}
          </div>}
        </div>
      </div>

      {/* Main download card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'all .2s' }}>

        {/* Slide preview strip */}
        <div style={{ padding: '16px 20px 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: '#7a8899', textTransform: 'uppercase', marginBottom: 10 }}>Preview — 5 Slides</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
            {SLIDE_NAMES.map(function(name, i) {
              return <div key={i} style={{
                width: 160, height: 90, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, ' + SLIDE_COLORS[i] + ', ' + SLIDE_COLORS[i] + '88)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 8, border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{['📊', '💰', '🎯', '🌀', '🎓'][i]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>{name}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '12px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>4 Income Streams Presentation</div>
            <div style={{ fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>✓ 20 Languages</div>
          </div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>
            Professional presentation covering all four SuperAdPro income streams — Membership Referrals, Campaign Grid, Credit Nexus, and Course Academy. Perfect for prospect meetings, team calls, or sharing online.
          </p>

          {/* Meta */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['📊', '5 slides'], ['📁', 'PowerPoint (.pptx)'], ['📐', '16:9 widescreen'], ['💾', '~4 MB']].map(function(m, i) {
              return <div key={i} style={{ fontSize: 12, color: '#7a8899', display: 'flex', alignItems: 'center', gap: 4 }}>{m[0]} {m[1]}</div>;
            })}
          </div>

          {/* Download selected language */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>{selected.flag}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#334155' }}>Downloading in: <span style={{ color: '#7c3aed' }}>{selected.name}</span></span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={downloadUrl} download style={{
              flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none', textDecoration: 'none',
              background: 'linear-gradient(135deg, #172554, #1e3a8a)', color: '#fff',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(23,37,84,.2)', transition: 'all .15s'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PowerPoint
            </a>
            <button onClick={copyLink} style={{
              padding: '12px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0',
              background: '#f8fafc', color: copied ? '#16a34a' : '#475569',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s'
            }}>
              {copied ? '✓ Copied!' : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Copy Link</>}
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#475569', marginBottom: 14 }}>Coming Soon</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[['🎬', 'Platform Tour Video'], ['📱', 'Social Media Graphics'], ['📄', 'One-Page Flyer']].map(function(item, i) {
            return <div key={i} style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', textAlign: 'center', opacity: .6 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{item[1]}</div>
              <div style={{ fontSize: 13, color: '#7a8899', marginTop: 4, fontWeight: 600 }}>Coming Soon</div>
            </div>;
          })}
        </div>
      </div>
    </div>
  </AppLayout>;
}
