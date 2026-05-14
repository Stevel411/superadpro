import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';

// Section keys match the structure in locale files: superPagesEditor.help.sections.{key}
const SECTION_KEYS = [
  { key: 'gettingStarted',     color: 'var(--sap-accent)' },
  { key: 'textElements',       color: 'var(--sap-accent)' },
  { key: 'mediaElements',      color: 'var(--sap-purple)' },
  { key: 'actionElements',     color: 'var(--sap-green-mid)' },
  { key: 'contentElements',    color: 'var(--sap-amber)' },
  { key: 'layoutElements',     color: 'var(--sap-pink)' },
  { key: 'settingsPublishing', color: 'var(--sap-green)' },
  { key: 'aiAssistant',        color: 'var(--sap-indigo)' },
];

export default function HelpPanel({ visible, onClose }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (visible) { setExpanded({}); setSearch(''); }
  }, [visible]);

  if (!visible) return null;

  const toggle = (idx) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const q = search.toLowerCase().trim();
  const sections = SECTION_KEYS.map((sk) => {
    let items = t('superPagesEditor.help.sections.' + sk.key + '.items', { returnObjects: true });
    if (!Array.isArray(items)) items = [];
    const filtered = items.filter(item => {
      if (!q) return true;
      const titleMatch = (item.title || '').toLowerCase().indexOf(q) >= 0;
      const descMatch = (item.desc || '').toLowerCase().indexOf(q) >= 0;
      return titleMatch || descMatch;
    });
    return {
      key: sk.key,
      color: sk.color,
      category: t('superPagesEditor.help.sections.' + sk.key + '.category'),
      items: filtered,
    };
  }).filter(s => s.items.length > 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      {/* Panel — widened + bolder */}
      <div style={{
        position: 'relative', width: 480, maxWidth: '95vw', height: '100vh',
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'spHelpSlide 0.25s ease-out',
      }}>
        {/* Header — cobalt gradient */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'linear-gradient(135deg,#0b1e4c,#1e3a8a 70%,#3730a3)' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
              {t('superPagesEditor.help.title')}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>
              {t('superPagesEditor.help.subtitle')}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: 'rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={18} color="#fff" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--sap-text-faint)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('superPagesEditor.help.searchPlaceholder')}
              style={{ width: '100%', padding: '12px 14px 12px 40px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {sections.map((section, si) => {
            const isOpen = expanded[si] || q;
            return (
              <div key={section.key}>
                <div
                  onClick={() => toggle(si)}
                  style={{
                    padding: '14px 24px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none',
                    background: isOpen ? section.color + '10' : 'transparent',
                    transition: 'background .15s',
                  }}
                >
                  {isOpen
                    ? <ChevronDown size={16} color={section.color} />
                    : <ChevronRight size={16} color={section.color} />}
                  <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: section.color }}>
                    {section.category}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--sap-text-faint)', fontWeight: 700 }}>
                    ({section.items.length})
                  </span>
                </div>
                {isOpen && section.items.map((item, ii) => (
                  <div key={ii} style={{ padding: '14px 24px 14px 46px', borderBottom: '1px solid #f5f6f8' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 6, lineHeight: 1.35 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--sap-text-secondary)', lineHeight: 1.65 }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {sections.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--sap-text-faint)', fontSize: 14 }}>
              {t('superPagesEditor.help.noResults')} "{search}"
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spHelpSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
