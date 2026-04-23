import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';

export default function PublicIncomeDisclosure() {
  var { t } = useTranslation();
  useEffect(function() { window.scrollTo(0, 0); }, []);

  return (
    <PublicLayout>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(129,140,248,0.08))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '40px 40px 32px', marginBottom: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(14,165,233,0.06)', pointerEvents: 'none' }}/>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(200,220,255,0.5)', marginBottom: 12 }}>
            {t('incomeDisclaimer.legal', { defaultValue: 'LEGAL' })}
          </div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 34, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.15 }}>
            {t('incomeDisclaimer.pageTitle', { defaultValue: 'Income Disclosure' })}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(200,220,255,0.6)', lineHeight: 1.6, margin: 0 }}>
            {t('incomeDisclaimer.pleaseRead', { defaultValue: 'Please read this carefully before joining SuperAdPro.' })}
          </p>
        </div>

        {/* Body */}
        <div style={{ background: 'rgba(11,18,48,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '36px 40px' }}>

          <Section title={t('incomeDisclaimer.noGuaranteedIncome', { defaultValue: 'No guaranteed income' })}>
            <p>{t('incomeDisclaimer.noGuaranteeText', { defaultValue: 'SuperAdPro does not guarantee any level of income or earnings. Any income figures shown on our website, in our marketing, or during sign-up are illustrative examples only. They represent what is mathematically possible under specific scenarios — not typical or expected results.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.resultsVary', { defaultValue: 'Individual results vary' })}>
            <p>{t('incomeDisclaimer.effortDependent', { defaultValue: 'Your results will depend on your own effort, skill, network, time invested, business experience, and market conditions. Many members earn little or nothing. Some earn substantial amounts. Past performance of any member is not a prediction of your future results.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.campaignTierPricing', { defaultValue: 'Campaign Tier commission structure' })}>
            <p>{t('incomeDisclaimer.campaignTierAlloc', { defaultValue: 'When a member purchases a campaign tier, the fee is distributed as follows:' })}</p>
            <CostBreakdown items={[
              { pct: '40%', label: 'Direct Sponsor Commission', desc: 'Paid to the member who personally referred the buyer' },
              { pct: '50%', label: 'Uni-level Commissions', desc: '6.25% × 8 levels deep in the network' },
              { pct: '5%', label: 'Completion Bonus Pool', desc: 'Paid when all 64 grid positions fill' },
              { pct: '5%', label: 'Platform Fee', desc: 'Retained by SuperAdPro to operate the service' },
            ]}/>
            <p style={{ fontSize: 14, color: 'rgba(200,220,255,0.55)', marginTop: 14 }}>
              Maximum earnings scenario: A member who personally refers 64 direct referrals, all of whom purchase all 8 tiers ($20 to $1,000), earns 46.25% of each tier price per referral (40% direct sponsor + 6.25% Level-1 uni-level) plus all 8 completion bonuses ($64 to $3,200). Total: <strong style={{ color: '#fff' }}>$103,976 per completed cycle</strong>. This is the absolute theoretical maximum. Virtually no member will achieve this. Most members who earn do so at a small fraction of this level.
            </p>
          </Section>

          <Section title={t('incomeDisclaimer.membershipPricing', { defaultValue: 'Membership commission structure' })}>
            <p>{t('incomeDisclaimer.membershipAlloc', { defaultValue: 'Members earn 50% recurring commission on each active membership in their direct referral line:' })}</p>
            <CostBreakdown items={[
              { pct: '50%', label: 'Sponsor Commission', desc: 'Paid to the referring member every month they remain active — $10 per Basic, $17.50 per Pro' },
            ]}/>
          </Section>

          <Section title={t('incomeDisclaimer.notEmployment', { defaultValue: 'This is not employment' })}>
            <p>{t('incomeDisclaimer.body_L68', { defaultValue: 'SuperAdPro is a marketing platform, not an employer. Members are independent contractors who choose how and when to engage. There is no salary, no minimum wage, and no guaranteed hours.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.riskTitle', { defaultValue: 'Financial risk' })}>
            <p>{t('incomeDisclaimer.body_L72', { defaultValue: 'Participating in SuperAdPro requires purchasing a membership and may involve purchasing additional campaign tiers or credit packs. These are business expenses that you may not recover. Only spend what you can afford to lose. Do not treat platform activity as a guaranteed investment.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.complianceTitle', { defaultValue: 'Legal compliance' })}>
            <p>{t('incomeDisclaimer.body_L76', { defaultValue: 'You are responsible for complying with all tax, business-registration, and financial-services laws in your country of residence. SuperAdPro provides the platform; it does not provide legal, tax, or financial advice.' })}</p>
          </Section>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, marginTop: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(200,220,255,0.5)', lineHeight: 1.7, margin: '0 0 14px' }}>
              {t('incomeDisclaimer.body_L80', { defaultValue: 'By creating an account with SuperAdPro, you acknowledge that you have read, understood, and agreed to this Income Disclosure.' })}
            </p>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#38bdf8', textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}

function Section(props) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 12 }}>{props.title}</div>
      <div style={{ fontSize: 15, color: 'rgba(200,220,255,0.75)', lineHeight: 1.8 }}>{props.children}</div>
    </div>
  );
}

function CostBreakdown(props) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 22px', margin: '14px 0' }}>
      {props.items.map(function(item, i) {
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < props.items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: '#38bdf8', minWidth: 52 }}>{item.pct}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.label}</div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.55)', textAlign: 'right', flex: '1 1 240px' }}>{item.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
