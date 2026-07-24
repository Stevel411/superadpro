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
          border: '1px solid #e9eefa',
          borderRadius: 20, padding: '40px 40px 32px', marginBottom: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(14,165,233,0.06)', pointerEvents: 'none' }}/>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(200,220,255,0.5)', marginBottom: 12 }}>
            {t('incomeDisclaimer.legal', { defaultValue: 'LEGAL' })}
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 34, fontWeight: 900, color: '#0a1f52', margin: '0 0 10px', lineHeight: 1.15 }}>
            {t('incomeDisclaimer.pageTitle', { defaultValue: 'Income Disclosure' })}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(200,220,255,0.6)', lineHeight: 1.6, margin: 0 }}>
            {t('incomeDisclaimer.pleaseRead', { defaultValue: 'Please read this carefully before joining AdvantageLife.' })}
          </p>
        </div>

        {/* Body */}
        <div style={{ background: 'rgba(11,18,48,0.5)', border: '1px solid #e9eefa', borderRadius: 18, padding: '36px 40px' }}>

          <Section title={t('incomeDisclaimer.noGuaranteedIncome', { defaultValue: 'No guaranteed income' })}>
            <p>{t('incomeDisclaimer.noGuaranteeText', { defaultValue: 'AdvantageLife does not guarantee any level of income or earnings. Any income figures shown on our website, in our marketing, or during sign-up are illustrative examples only. They represent what is mathematically possible under specific scenarios — not typical or expected results.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.resultsVary', { defaultValue: 'Individual results vary' })}>
            <p>{t('incomeDisclaimer.effortDependent', { defaultValue: 'Your results will depend on your own effort, skill, network, time invested, business experience, and market conditions. Many members earn little or nothing. Some earn substantial amounts. Past performance of any member is not a prediction of your future results.' })}</p>
          </Section>

          <Section title="Pack commission structure">
            <p>AdvantageLife pays 100% of every VideoView pack sale to a member. Packs are bought and sold person to person, wallet to wallet — the platform does not take a cut and does not hold the money:</p>
            <CostBreakdown items={[
              { pct: '100%', label: 'To a member', desc: 'The full pack price is paid directly by the buyer to the qualifying member. AdvantageLife takes no percentage.' },
              { pct: '0%', label: 'To the platform', desc: 'The platform earns nothing from pack sales. Its income is the one-time $100 lifetime join.' },
            ]}/>
            <p style={{ fontSize: 14, color: 'rgba(200,220,255,0.55)', marginTop: 14 }}>
              Two conditions determine whether a member receives a commission, and both are disclosed to members before purchase.
            </p>
            <div style={{
              marginTop: 14,
              padding: '14px 18px',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              background: 'rgba(245, 158, 11, 0.06)',
              borderRadius: 10,
              fontSize: 14,
              color: 'rgba(220,230,250,0.85)',
              lineHeight: 1.55,
            }}>
              <div style={{
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:11,
                fontWeight:700,
                letterSpacing:'.15em',
                textTransform:'uppercase',
                color:'#fbbf24',
                marginBottom:8,
              }}>
                ⚠ How the pass-up works — not an income claim
              </div>
              <p style={{ margin: 0 }}>
                A member keeps their 1st and 2nd pack sales; their 3rd passes up to their sponsor. The same happens at the 6th and the 9th. From the 10th sale onward, every sale is theirs. A member earns only on a pack level they own themselves, and only while they meet the daily watch requirement. If either condition is unmet, the commission passes to the first qualifying member above them, or to the company. <strong style={{ color: '#0a1f52' }}>No income is promised, projected or implied. Many members earn nothing at all.</strong> What a member earns depends entirely on their own activity.
              </p>
            </div>
          </Section>

          <Section title="The joining fee pays no commission">
            <p>AdvantageLife charges a one-time $100 fee for lifetime access to the platform and its tools. This fee is paid to the platform. <strong>It generates no commission of any kind</strong> — the member who referred a new member earns nothing from that person joining:</p>
            <CostBreakdown items={[
              { pct: '$0', label: 'To the referring member', desc: 'No commission, bonus or override is paid on the $100 join. Nobody earns from a signup.' },
              { pct: '$100', label: 'To the platform', desc: 'One payment, lifetime access. There is no monthly membership, subscription or recurring fee.' },
            ]}/>
          </Section>

          <Section title={t('incomeDisclaimer.notEmployment', { defaultValue: 'This is not employment' })}>
            <p>{t('incomeDisclaimer.body_L68', { defaultValue: 'AdvantageLife is a marketing platform, not an employer. Members are independent contractors who choose how and when to engage. There is no salary, no minimum wage, and no guaranteed hours.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.riskTitle', { defaultValue: 'Financial risk' })}>
            <p>{t('incomeDisclaimer.body_L72', { defaultValue: 'Participating in AdvantageLife requires a one-time $100 lifetime join, and earning from the compensation plan requires buying VideoView packs at your own expense. These are business expenses that you may not recover. Only spend what you can afford to lose. Do not treat platform activity as a guaranteed investment.' })}</p>
          </Section>

          <Section title={t('incomeDisclaimer.complianceTitle', { defaultValue: 'Legal compliance' })}>
            <p>{t('incomeDisclaimer.body_L76', { defaultValue: 'You are responsible for complying with all tax, business-registration, and financial-services laws in your country of residence. AdvantageLife provides the platform; it does not provide legal, tax, or financial advice.' })}</p>
          </Section>

          <div style={{ borderTop: '1px solid #e9eefa', paddingTop: 20, marginTop: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(200,220,255,0.5)', lineHeight: 1.7, margin: '0 0 14px' }}>
              {t('incomeDisclaimer.body_L80', { defaultValue: 'By creating an account with AdvantageLife, you acknowledge that you have read, understood, and agreed to this Income Disclosure.' })}
            </p>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#ff8095', textDecoration: 'none' }}>
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
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 19, fontWeight: 800, color: '#0a1f52', marginBottom: 12 }}>{props.title}</div>
      <div style={{ fontSize: 15, color: 'rgba(200,220,255,0.75)', lineHeight: 1.8 }}>{props.children}</div>
    </div>
  );
}

function CostBreakdown(props) {
  return (
    <div style={{ background: '#f4f7fd', border: '1px solid #e9eefa', borderRadius: 12, padding: '18px 22px', margin: '14px 0' }}>
      {props.items.map(function(item, i) {
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < props.items.length - 1 ? '1px solid #e9eefa' : 'none', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, color: '#ff8095', minWidth: 52 }}>{item.pct}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0a1f52' }}>{item.label}</div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.55)', textAlign: 'right', flex: '1 1 240px' }}>{item.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
