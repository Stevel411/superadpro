import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

export default function IncomeDisclaimer() {
  var { t } = useTranslation();
  return (
    <AppLayout title={t('incomeDisclaimer.pageTitle')} subtitle={t('incomeDisclaimer.pageSubtitle')}>
      <div style={{ maxWidth:780, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:18, padding:'36px 36px 28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(14,165,233,.08)', pointerEvents:'none' }}/>
          <div style={{ fontSize:12, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:10 }}>{t('incomeDisclaimer.legal')}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:900, color:'#fff', marginBottom:8 }}>{t('incomeDisclaimer.pageTitle')}</div>
          <div style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>{t("incomeDisclaimer.pleaseRead")}</div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'32px 36px' }}>

          <Section title={t('incomeDisclaimer.noGuaranteedIncome')}>
            <p>{t("incomeDisclaimer.noGuaranteeText")}</p>
          </Section>

          <Section title={t('incomeDisclaimer.resultsVary')}>
            <p>{t("incomeDisclaimer.effortDependent")}</p>
          </Section>

          <Section title={t('incomeDisclaimer.creditPricing')}>
            <p>{t("incomeDisclaimer.creditPackAlloc")}</p>
            <CostBreakdown items={[
              { pct:'15%', label:'Direct Referral Commission', desc:'Paid to the member who personally recruited the buyer' },
              { pct:'10%', label:'Auto-Place Commission', desc:'Paid on positions placed by network growth (spillover)' },
              { pct:'10%', label:'Completion Bonus', desc:'Paid to the nexus owner when all 39 positions fill' },
            ]}/>
            <p>{t("incomeDisclaimer.creditPackNote")}</p>
          </Section>

          <Section title={t('incomeDisclaimer.campaignTierPricing')}>
            <p>{t("incomeDisclaimer.campaignTierAlloc")}</p>
            <CostBreakdown items={[
              { pct:'40%', label:'Direct Sponsor Commission', desc:'Paid to the member who referred you' },
              { pct:'50%', label:'Uni-level Commissions', desc:'6.25% × 8 levels deep in the network' },
              { pct:'5%', label:'Completion Bonus Pool', desc:'Paid when all 64 grid positions fill' },
            ]}/>
            <p>{t('incomeDisclaimer.body_L47')}</p>
          </Section>

          <Section title={t('incomeDisclaimer.membershipPricing')}>
            <p>{t("incomeDisclaimer.membershipAlloc")}</p>
            <CostBreakdown items={[
              { pct:'50%', label:'Sponsor Commission', desc:'Paid to the referring member every month they remain active' },
            ]}/>
          </Section>

          <Section title={t('incomeDisclaimer.commStructure')}>
            <p>{t('incomeDisclaimer.body_L59')}</p>
            <p>{t("incomeDisclaimer.commissionNotice")}</p>
          </Section>

          <Section title={t('incomeDisclaimer.twoWalletTitle')}>
            <p>{t('incomeDisclaimer.body_L64')}</p>
          </Section>

          <Section title={t('incomeDisclaimer.notEmployment')}>
            <p>{t('incomeDisclaimer.body_L68')}</p>
          </Section>

          <Section title={t('incomeDisclaimer.riskTitle')}>
            <p>{t('incomeDisclaimer.body_L72')}</p>
          </Section>

          <Section title={t('incomeDisclaimer.complianceTitle')}>
            <p>{t('incomeDisclaimer.body_L76')}</p>
          </Section>

          <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:20, marginTop:8, textAlign:'center' }}>
            <p style={{ fontSize:13, color:'var(--sap-text-muted)', lineHeight:1.7 }}>{t('incomeDisclaimer.body_L80')}</p>
            <Link to="/compensation-plan" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, fontSize:14, fontWeight:700, color:'#2563eb', textDecoration:'none' }}>{t('incomeDisclaimer.backToCompPlan')}</Link>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function Section(props) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:10 }}>{props.title}</div>
      <div style={{ fontSize:15, color:'var(--sap-text-secondary)', lineHeight:1.8 }}>{props.children}</div>
    </div>
  );
}

function CostBreakdown(props) {
  return (
    <div style={{ background:'var(--sap-bg-elevated)', borderRadius:12, padding:'18px 22px', margin:'12px 0' }}>
      {props.items.map(function(item, i) {
        return (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i < props.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', minWidth:50 }}>{item.pct}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--sap-text-primary)' }}>{item.label}</div>
            </div>
            <div style={{ fontSize:13, color:'var(--sap-text-muted)', textAlign:'right' }}>{item.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
