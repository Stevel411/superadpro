import { useTranslation } from 'react-i18next';
export default function ComingSoon() {
  var { t } = useTranslation();
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#172554,#1e3a8a)', fontFamily:'DM Sans,sans-serif', padding:24 }}>
      <div style={{ maxWidth:520, textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:40 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#38bdf8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 24px rgba(14,165,233,0.35)' }}>
            <svg viewBox="0 0 24 24" fill="none" width="26" height="26"><polygon points="5,3 19,12 5,21" fill="#fff"/></svg>
          </div>
          <span style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:900, color:'#fff', letterSpacing:-1 }}>Super<span style={{ color:'var(--sap-accent-light)' }}>{t('onboarding.adLabel')}</span>{t('common.pro')}</span>
        </div>

        <div style={{ fontFamily:'Sora,sans-serif', fontSize:42, fontWeight:900, color:'#fff', lineHeight:1.2, marginBottom:16 }}>
          Coming Soon
        </div>

        <div style={{ fontSize:18, color:'rgba(255,255,255,.65)', lineHeight:1.7, marginBottom:32 }}>
          We're putting the finishing touches on something special — AI-powered marketing tools, a creative studio, and an affiliate system that pays.
        </div>

        <div style={{ background:'rgba(255,255,255,.08)', backdropFilter:'blur(12px)', borderRadius:16, padding:'28px 32px', border:'1px solid rgba(255,255,255,.1)', marginBottom:32 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:16 }}>{t('comingSoon.whatYouGet')}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              ['🎬', 'AI Creative Studio — Video, Images, Music & Voiceover'],
              ['📊', '8-Tier Campaign Grid — Advertise & Earn'],
              ['🧮', 'Profit Nexus — Your Earnings Accelerator'],
              ['🚀', 'SuperPages — AI Landing Pages & Funnels'],
              ['💰', '50% Referral Commissions — On Every Signup'],
            ].map(function([icon, text]) {
              return (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                  <span style={{ fontSize:14, color:'rgba(255,255,255,.75)', fontWeight:500 }}>{text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>
          Already have an account? <a href="/login" style={{ color:'var(--sap-accent-light)', textDecoration:'none', fontWeight:700 }}>{t('comingSoon.signIn')}</a>
        </div>
      </div>
    </div>
  );
}
