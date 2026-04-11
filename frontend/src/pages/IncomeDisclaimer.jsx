import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

export default function IncomeDisclaimer() {
  return (
    <AppLayout title="Income Disclaimer" subtitle="Important information about earning with SuperAdPro">
      <div style={{ maxWidth:780, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:18, padding:'36px 36px 28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(14,165,233,.08)', pointerEvents:'none' }}/>
          <div style={{ fontSize:12, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:10 }}>Legal</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:900, color:'#fff', marginBottom:8 }}>Income Disclaimer</div>
          <div style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>Please read this disclaimer carefully before participating in any SuperAdPro income programme.</div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'32px 36px' }}>

          <Section title="No Guaranteed Income">
            <p>SuperAdPro does not guarantee any level of income or earnings. The income examples, calculations, and projections shown on this platform, including on the Compensation Plan page and any calculators, are for illustrative purposes only. They represent potential earnings based on hypothetical scenarios and should not be interpreted as a promise or guarantee of actual results.</p>
          </Section>

          <Section title="Individual Results Vary">
            <p>Your earnings depend entirely on your own efforts, skills, dedication, market conditions, and the activity of your network. There is no assurance that any prior successes or past results regarding income will apply to you. Many participants in affiliate and network marketing programmes earn little to no income.</p>
          </Section>

          <Section title="Credit Pack Pricing Transparency">
            <p>When you purchase a Credit Pack, the funds are allocated as follows:</p>
            <CostBreakdown items={[
              { pct:'50%', label:'AI Service Costs', desc:'Covers API usage for video, image, music, and voice generation' },
              { pct:'15%', label:'Platform Management', desc:'Infrastructure, support, and operational costs' },
              { pct:'35%', label:'Member Commissions', desc:'15% direct referral + 10% auto-place + 10% completion bonus' },
            ]}/>
            <p>Credit packs provide genuine AI credits that can be used in the Creative Studio to generate videos, images, music, voiceovers, and other AI-powered content. The credits have real utility value independent of the commission structure.</p>
          </Section>

          <Section title="Campaign Tier Pricing Transparency">
            <p>When you purchase a Campaign Tier, the funds are allocated as follows:</p>
            <CostBreakdown items={[
              { pct:'40%', label:'Direct Sponsor Commission', desc:'Paid to the member who referred you' },
              { pct:'50%', label:'Uni-level Commissions', desc:'6.25% × 8 levels deep in the network' },
              { pct:'5%', label:'Completion Bonus Pool', desc:'Paid when all 64 grid positions fill' },
              { pct:'5%', label:'Platform Management', desc:'Company operational costs' },
            ]}/>
            <p>Campaign Tiers activate your participation in the 8×8 Income Grid and unlock daily video campaign views. Your tier purchase delivers real advertising views to campaign holders on the platform.</p>
          </Section>

          <Section title="Membership Pricing Transparency">
            <p>When a member pays their monthly or annual membership fee:</p>
            <CostBreakdown items={[
              { pct:'50%', label:'Sponsor Commission', desc:'Paid to the referring member' },
              { pct:'50%', label:'Platform Revenue', desc:'Covers tools, AI services, hosting, support' },
            ]}/>
          </Section>

          <Section title="Commission Structure">
            <p>SuperAdPro offers four income streams: Membership Referrals (50% commission), Campaign Grid (40% direct + 6.25% uni-level + 5% completion), Profit Nexus (15% direct + 10% auto-place + 10% completion), and Course Marketplace (coming soon). All commission rates are clearly disclosed on the Compensation Plan page.</p>
            <p>Commission rates may be adjusted by SuperAdPro at any time with reasonable notice to members. Any changes will be communicated via the platform and email.</p>
          </Section>

          <Section title="Two Wallet System">
            <p>SuperAdPro operates a dual wallet system. Your Affiliate Wallet holds membership and Profit Nexus commissions and can be withdrawn at any time. Your Campaign Wallet holds grid commissions and requires an active Campaign Tier and completion of daily watch quotas to access. This structure ensures the platform's advertising ecosystem remains active and sustainable.</p>
          </Section>

          <Section title="Not Employment">
            <p>Participation in SuperAdPro's compensation plan does not create an employer-employee relationship. Members are independent participants and are solely responsible for their own tax obligations, business expenses, and compliance with local laws and regulations.</p>
          </Section>

          <Section title="Risk Acknowledgement">
            <p>As with any business opportunity, there is risk involved. You should not invest more than you can afford to lose. Do not rely on income from SuperAdPro as your sole source of income. We encourage all members to treat this as a supplementary income opportunity and to make informed decisions based on their own financial circumstances.</p>
          </Section>

          <Section title="Compliance">
            <p>SuperAdPro is committed to ethical business practices. Members must not make misleading income claims when promoting the platform. Any income projections shared must be accompanied by a clear disclaimer that results are not typical and individual results will vary.</p>
          </Section>

          <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:20, marginTop:8, textAlign:'center' }}>
            <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>Last updated: April 2026. This disclaimer applies to all income programmes operated by SuperAdPro.</p>
            <Link to="/compensation-plan" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, fontSize:14, fontWeight:700, color:'#2563eb', textDecoration:'none' }}>← Back to Compensation Plan</Link>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function Section(props) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:10 }}>{props.title}</div>
      <div style={{ fontSize:15, color:'#475569', lineHeight:1.8 }}>{props.children}</div>
    </div>
  );
}

function CostBreakdown(props) {
  return (
    <div style={{ background:'#f8fafc', borderRadius:12, padding:'18px 22px', margin:'12px 0' }}>
      {props.items.map(function(item, i) {
        return (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i < props.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a', minWidth:50 }}>{item.pct}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{item.label}</div>
            </div>
            <div style={{ fontSize:13, color:'#94a3b8', textAlign:'right' }}>{item.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
