import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { TYPE } from '../styles/typography';

/**
 * Internal FAQ page — sits under /account/faq inside AppLayout.
 * Reuses the 10 existing publicPages.faqQ1..10 / faqA1..10 i18n keys.
 * Full-width vertical accordion: one question per row, expands to show answer
 * using the whole page width.
 */
export default function FAQ() {
  var { t } = useTranslation();
  var [search, setSearch] = useState('');
  var [openIdx, setOpenIdx] = useState(null);

  var faqs = [
    { q: t('publicPages.faqQ1'), a: t('publicPages.faqA1') },
    { q: t('publicPages.faqQ2'), a: t('publicPages.faqA2') },
    { q: t('publicPages.faqQ3'), a: t('publicPages.faqA3') },
    { q: t('publicPages.faqQ4'), a: t('publicPages.faqA4') },
    { q: t('publicPages.faqQ5'), a: t('publicPages.faqA5') },
    { q: t('publicPages.faqQ6'), a: t('publicPages.faqA6') },
    { q: t('publicPages.faqQ7'), a: t('publicPages.faqA7') },
    { q: t('publicPages.faqQ8'), a: t('publicPages.faqA8') },
    { q: t('publicPages.faqQ9'), a: t('publicPages.faqA9') },
    { q: t('publicPages.faqQ10'), a: t('publicPages.faqA10') },
  ];

  // Filter by search term — matches question or answer text (case-insensitive)
  var term = search.trim().toLowerCase();
  var filtered = term
    ? faqs.filter(function(f) {
        return (f.q || '').toLowerCase().includes(term) || (f.a || '').toLowerCase().includes(term);
      })
    : faqs;

  return (
    <AppLayout
      title={t('faqPage.title', { defaultValue: 'FAQ' })}
      subtitle={t('faqPage.subtitle', { defaultValue: 'Answers to the most common questions' })}
    >
      {/* Intro card */}
      <div style={{
        background: 'linear-gradient(135deg,#0b1e4c,#1e3a8a 60%,#2563eb)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 8px 30px rgba(23,37,84,0.25)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(255,255,255,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <HelpCircle size={28} color="#7dd3fc"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {t('faqPage.heroTitle', { defaultValue: 'Frequently Asked Questions' })}
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>
            {t('faqPage.heroSubtitle', { defaultValue: 'Tap any question to see the answer. Still stuck? Contact support any time.' })}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} color="var(--sap-text-faint)"
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}/>
        <input
          value={search}
          onChange={function(e) { setSearch(e.target.value); setOpenIdx(null); }}
          placeholder={t('faqPage.searchPlaceholder', { defaultValue: 'Search questions…' })}
          style={{
            width: '100%',
            padding: '14px 16px 14px 46px',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            fontSize: 15,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            background: '#fff',
            color: 'var(--sap-text-primary)',
            transition: 'border-color .15s',
          }}
          onFocus={function(e) { e.target.style.borderColor = 'var(--sap-accent)'; }}
          onBlur={function(e) { e.target.style.borderColor = '#e2e8f0'; }}
        />
      </div>

      {/* FAQ accordion — full page width */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(23,37,84,.06)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: .4 }}>🔍</div>
            <div style={{...TYPE.cardTitleBold, marginBottom: 6}}>
              {t('faqPage.noResultsTitle', { defaultValue: 'No questions match your search' })}
            </div>
            <div style={{...TYPE.bodyMuted}}>
              {t('faqPage.noResultsSub', { defaultValue: 'Try different keywords or clear the search.' })}
            </div>
          </div>
        ) : (
          filtered.map(function(f, i) {
            var isOpen = openIdx === i;
            var isLast = i === filtered.length - 1;
            return (
              <div key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
                <button
                  onClick={function() { setOpenIdx(isOpen ? null : i); }}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: isOpen ? 'var(--sap-bg-elevated)' : '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={function(e) { if (!isOpen) e.currentTarget.style.background = 'var(--sap-bg-page)'; }}
                  onMouseLeave={function(e) { if (!isOpen) e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isOpen ? 'var(--sap-accent)' : 'var(--sap-bg-page)',
                      color: isOpen ? '#fff' : 'var(--sap-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800,
                      flexShrink: 0,
                      transition: 'all .15s',
                    }}>{i + 1}</div>
                    <div style={{...TYPE.cardTitleBold, fontSize: 17, fontWeight: 700, lineHeight: 1.4}}>{f.q}</div>
                  </div>
                  <ChevronDown
                    size={20}
                    color={isOpen ? 'var(--sap-accent)' : 'var(--sap-text-faint)'}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform .2s',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{
                    padding: '0 24px 24px 70px',
                    background: 'var(--sap-bg-elevated)',
                  }}>
                    <div style={{...TYPE.body, lineHeight: 1.75, color: 'var(--sap-text-secondary)'}}>{f.a}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still stuck? Support CTA */}
      <div style={{
        marginTop: 24,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        boxShadow: '0 4px 20px rgba(23,37,84,.06)',
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{...TYPE.cardTitleBold, marginBottom: 4}}>
            {t('faqPage.stillStuckTitle', { defaultValue: 'Still have questions?' })}
          </div>
          <div style={{...TYPE.bodyMuted}}>
            {t('faqPage.stillStuckSub', { defaultValue: 'Our support team usually replies within a few hours.' })}
          </div>
        </div>
        <a
          href="/support"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 10,
            textDecoration: 'none',
            background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(14,165,233,.3)',
            flexShrink: 0,
          }}
        >
          {t('faqPage.contactSupport', { defaultValue: 'Contact Support' })} →
        </a>
      </div>
    </AppLayout>
  );
}
