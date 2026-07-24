import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';

function FAQItem({ q, a }) {
  var [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e9eefa', overflow: 'hidden' }}>
      <button onClick={function(){setOpen(!open);}} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', background: 'none', border: 'none', color: '#0a1f52', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{q}</span>
        <span style={{ fontSize: 20, color: '#ff8095', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
      </button>
      {open && <div style={{ paddingBottom: 20, fontSize: 14, color: '#5b6b8c', lineHeight: 1.8 }}>{a}</div>}
    </div>
  );
}

export function FAQ() {
  var { t } = useTranslation();
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
  return (
    <PublicLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#ff8095', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{t('publicPages.faq')}</div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, margin: '0 0 16px' }}>{t('publicPages.faqTitle')}</h1>
          <p style={{ fontSize: 16, color: '#5b6b8c', margin: 0 }}>{t('publicPages.faqSubtitle')}</p>
        </div>

        <div style={{ marginBottom: 56 }}>
          {faqs.map(function(f) { return <FAQItem key={f.q} q={f.q} a={f.a}/>; })}
        </div>

        <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: '#5b6b8c', marginBottom: 20 }}>{t('publicPages.stillHaveQuestions')}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/support" style={{ padding: '10px 24px', borderRadius: 10, background: '#fff', border: '1.5px solid #dfe5f1', color: '#0a1f52', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>{t('publicPages.contactSupport')}</Link>
            <Link to="/register" style={{ padding: '10px 24px', borderRadius: 10, background: '#c8102e', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>{'Get lifetime access'}</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function LegalSection({ title, children }) {
  var hS = { fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: '#ff8095', marginBottom: 14 };
  var wS = { fontSize: 15, color: '#5b6b8c', lineHeight: 1.85 };
  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={hS}>{title}</h2>
      <div style={wS}>{children}</div>
    </div>
  );
}

export function Legal() {
  var { t } = useTranslation();
  var p = { marginBottom: 14 };
  var bold = { marginBottom: 14, fontWeight: 700, color: '#0a1f52' };
  return (
    <PublicLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 40, fontWeight: 900, marginBottom: 8 }}>{t('publicPages.legalTitle')}</h1>
        <p style={{ color: '#8a97b4', marginBottom: 48 }}>{t('publicPages.lastUpdated')}</p>

        <LegalSection title={t('publicPages.termsTitle')}>
          <p style={p}>{t('publicPages.termsContent1')}</p>
          <p style={p}>{t("publicPages.refundPolicy")}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.earningsDisclaimerTitle')}>
          <p style={p}>{t("publicPages.incomeDisclaimer")}</p>
          <p style={p}>{t('publicPages.earningsDisclaimerContent')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.commissionStructureTitle')}>
          <p style={bold}>{t('publicPages.membershipCommissions')}</p>
          <p style={p}>{t('publicPages.membershipCommContent')}</p>
          <p style={bold}>{t('publicPages.upgradePolicy')}</p>
          <p style={p}>{t('publicPages.upgradePolicyContent')}</p>
          <p style={bold}>{t('publicPages.campaignTierComm')}</p>
          <p style={p}>{t('publicPages.campaignTierCommContent')}</p>
          <p style={bold}>{t('publicPages.campaignViewTargets')}</p>
          <p style={p}>{t('publicPages.campaignViewContent')}</p>
          <p style={bold}>{t('publicPages.courseComm')}</p>
          <p style={p}>{t('publicPages.courseCommContent')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.platformRightsTitle')}>
          <p style={p}>{t('publicPages.platformRightsContent')}</p>
          <p style={p}>{t('publicPages.rightsViewTargets')}</p>
          <p style={p}>{t('publicPages.rightsCommRates')}</p>
          <p style={p}>{t('publicPages.rightsMembership')}</p>
          <p style={p}>{t('publicPages.rightsPolicies')}</p>
          <p style={p}>{t('publicPages.rightsNotice')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.privacyTitle')}>
          <p style={p}>{t('publicPages.privacyContent1')}</p>
          <p style={p}>{t('publicPages.privacyContent2')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.acceptableUseTitle')}>
          <p style={p}>{t('publicPages.acceptableUseContent')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.cryptoPaymentsTitle')}>
          <p style={p}>{t('publicPages.cryptoPaymentsContent')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.kycTitle')}>
          <p style={p}>{t('publicPages.kycIntro')}</p>
          <p style={bold}>{t('publicPages.kycWhatWeCollect')}</p>
          <p style={p}>{t('publicPages.kycDocuments')}</p>
          <p style={bold}>{t('publicPages.kycHowWeUse')}</p>
          <p style={p}>{t('publicPages.kycUseContent')}</p>
          <p style={bold}>{t('publicPages.kycHowWeStore')}</p>
          <p style={p}>{t('publicPages.kycStoreContent')}</p>
          <p style={bold}>{t('publicPages.kycYourRights')}</p>
          <p style={p}>{t('publicPages.kycRightsContent')}</p>
          <p style={bold}>{t('publicPages.kycProcessing')}</p>
          <p style={p}>{t('publicPages.kycProcessingContent')}</p>
        </LegalSection>

        <LegalSection title={t('publicPages.amlTitle')}>
          <p style={p}>{t('publicPages.amlContent1')}</p>
          <p style={p}>{t('publicPages.amlContent2')}</p>
          <p style={p}>{t('publicPages.amlContent3')}</p>
        </LegalSection>

        <div style={{ borderTop: '1px solid #e9eefa', paddingTop: 32, fontSize: 13, color: '#8a97b4' }}>
          {t('publicPages.contactQuestion')} <Link to="/support" style={{ color: '#ff8095', textDecoration: 'none' }}>{t('publicPages.contactUsTitle')}</Link>
        </div>
      </div>
    </PublicLayout>
  );
}


// ForAdvertisers has been moved to ./ForAdvertisers.jsx as a standalone page.
// See App.jsx import: import ForAdvertisers from './pages/public/ForAdvertisers';

