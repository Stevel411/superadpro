import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Reveal({ children, delay }) {
  var ref = useRef(null);
  var [vis, setVis] = useState(false);
  useEffect(function() {
    var obs = new IntersectionObserver(function(entries) { if (entries[0].isIntersecting) setVis(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return function() { obs.disconnect(); };
  }, []);
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(40px)', transition: 'opacity 0.8s cubic-bezier(.16,1,.3,1) '+(delay||0)+'s, transform 0.8s cubic-bezier(.16,1,.3,1) '+(delay||0)+'s' }}>{children}</div>;
}

export default function AffiliatePlan() {
  var { t } = useTranslation();
  var [playing, setPlaying] = useState(false);
  var vidRef = useRef(null);

  function togglePlay() {
    if (!vidRef.current) return;
    if (playing) { vidRef.current.pause(); setPlaying(false); }
    else { vidRef.current.play(); setPlaying(true); }
  }

  var accent = 'var(--sap-accent)';

  return (
    <div style={{ background: 'var(--sap-cobalt-deep)', color: '#fff', fontFamily: "'DM Sans',sans-serif", minHeight: '100vh' }}>
      <style>{`
        .hiw-card:hover{transform:translateY(-4px)!important;border-color:rgba(14,165,233,0.2)!important}
        .hiw-step:hover{border-color:rgba(14,165,233,0.25)!important;background:rgba(14,165,233,0.04)!important}
        .hiw-nav a:hover{color:#fff!important}
        @media(max-width:768px){
          .hiw-nav-links{display:none!important}
          .hiw-steps-grid{grid-template-columns:1fr!important}
          .hiw-streams{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:72, background:'rgba(3,7,18,0.7)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 12px rgba(14,165,233,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="10,4 10,20 21,12" fill="#fff"/></svg>
          </div>
          <span style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:900, color:'#fff' }}>SuperAd<span style={{ color:'var(--sap-accent-light)' }}>{t('affiliatePlan.pro')}</span></span>
        </Link>
        <div className="hiw-nav-links hiw-nav" style={{ display:'flex', alignItems:'center', gap:24 }}>
          <Link to="/explore" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>{t('affiliatePlan.explore')}</Link>
          <Link to="/earn" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>{t('affiliatePlan.earn')}</Link>
          <Link to="/login" style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.2s' }}>{t('affiliatePlan.signIn')}</Link>
          <Link to="/register" style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', fontSize:13, fontWeight:800, textDecoration:'none' }}>{t('affiliatePlan.joinFree')}</Link>
        </div>
      </nav>

      {/* ═══ HERO — Full-screen image ═══ */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="/static/images/how-it-works-hero.png" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(3,7,18,0.92) 0%,rgba(3,7,18,0.7) 40%,rgba(3,7,18,0.35) 70%,rgba(3,7,18,0.2) 100%)' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(3,7,18,0.5) 0%,transparent 20%,transparent 80%,rgba(3,7,18,0.95) 100%)' }}/>
        </div>
        <div style={{ position:'relative', zIndex:2, maxWidth:1200, margin:'0 auto', padding:'120px 48px 60px', width:'100%' }}>
          <Reveal>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 20px', borderRadius:99, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(14,165,233,0.2)', fontSize:12, fontWeight:700, color:accent, marginBottom:28, letterSpacing:1, textTransform:'uppercase', backdropFilter:'blur(8px)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:accent }}/>
              Affiliate Plan
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(40px,6vw,72px)', fontWeight:900, lineHeight:0.92, marginBottom:20, letterSpacing:-2, maxWidth:550 }}>
              Three Steps to<br/><span style={{ color:accent }}>{t('affiliatePlan.earningMoney')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize:'clamp(15px,1.8vw,18px)', color:'rgba(255,255,255,0.55)', maxWidth:440, lineHeight:1.7, marginBottom:36 }}>
              No experience needed. No tech skills required.<br/>
              Share one link. The platform does the rest.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <Link to="/register" style={{ padding:'18px 44px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:800, textDecoration:'none', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', boxShadow:'0 4px 24px rgba(14,165,233,0.25)', transition:'all 0.3s' }}>{t('affiliatePlan.getStartedFree')}</Link>
              <a href="#video" style={{ padding:'18px 44px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:800, textDecoration:'none', border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.2)', color:'#fff', transition:'all 0.3s', backdropFilter:'blur(4px)' }}>▶ Watch Video</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ VIDEO SECTION ═══ */}
      <section id="video" style={{ padding:'80px 24px', background:'linear-gradient(180deg,#172554,#172554,#172554)' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(24px,4vw,36px)', fontWeight:900, marginBottom:8 }}>{t('affiliatePlan.seeItInAction')}</h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,0.45)' }}>{t("affiliatePlan.watchHowItWorks")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ position:'relative', borderRadius:20, overflow:'hidden', border:'1px solid rgba(14,165,233,0.15)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', cursor:'pointer' }} onClick={togglePlay}>
              <video ref={vidRef} src="/static/images/how-it-works-video.mp4" style={{ width:'100%', display:'block', borderRadius:20 }} playsInline onEnded={function(){setPlaying(false)}}/>
              {!playing && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(14,165,233,0.4)', transition:'transform 0.3s' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polygon points="9,5 9,19 20,12" fill="#fff"/></svg>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ 3 STEPS ═══ */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <Reveal><h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(28px,4vw,42px)', fontWeight:900, textAlign:'center', marginBottom:8 }}>{t('affiliatePlan.simpleAs123')}</h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize:17, color:'rgba(255,255,255,0.4)', textAlign:'center', maxWidth:480, margin:'0 auto 48px' }}>{t("affiliatePlan.simpleAs123Desc")}</p></Reveal>

          <div className="hiw-steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {[
              { num:'01', title:'Share Your Link', desc:'Every member gets a unique SuperLink. Share it on social media, in messages, via QR code — anywhere. When someone clicks it, they land on your personal sales page.', icon:'🔗', color:'var(--sap-accent)' },
              { num:'02', title:'Grid Fills Up', desc:'When your referrals join and activate, they fill positions in your 8×8 grid. Each position pays you 6.25%. The grid has 64 slots — and it auto-renews when complete.', icon:'⚡', color:'var(--sap-amber-bright)' },
              { num:'03', title:'Money Hits Your Wallet', desc:'Commissions are credited instantly. Withdraw to crypto or bank. Multiple income streams working simultaneously — with more launching soon.', icon:'💰', color:'var(--sap-green-mid)' },
            ].map(function(step, i) {
              return (
                <Reveal key={i} delay={i * 0.15}>
                  <div className="hiw-step" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'36px 28px', transition:'all 0.3s', height:'100%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:36, fontWeight:900, color:step.color, opacity:0.3, lineHeight:1 }}>{step.num}</div>
                      <div style={{ fontSize:28 }}>{step.icon}</div>
                    </div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:800, color:'#fff', marginBottom:10 }}>{step.title}</div>
                    <div style={{ fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>{step.desc}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FOUR INCOME STREAMS ═══ */}
      <section style={{ padding:'80px 24px', background:'linear-gradient(180deg,#172554,#172554,#172554)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <Reveal><h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(28px,4vw,42px)', fontWeight:900, textAlign:'center', marginBottom:8 }}>{t('affiliatePlan.fourIncomeStreams')}</h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize:17, color:'rgba(255,255,255,0.4)', textAlign:'center', maxWidth:500, margin:'0 auto 48px' }}>{t("affiliatePlan.fourIncomeStreamsDesc")}</p></Reveal>

          <div className="hiw-streams" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
            {[
              { name:'Membership Commissions', rate:'50%', sub:'recurring monthly', desc:'$10 per Basic member, $17.50 per Pro member — every month they stay active.', color:'var(--sap-green-mid)' },
              { name:'8×8 Profit Grid', rate:'$7,200+', sub:'per grid cycle at Tier 8', desc:'That\'s just the baseline. Personally refer them and earn up to $32,800 per grid. Eight tiers from $20 to $1,000 — each with its own grid that auto-renews.', color:'var(--sap-indigo)' },
              { name:'Course Marketplace', rate:'100%', sub:'commissions', desc:'Keep every sale. Sales 2,4,6,8 pass up infinitely deep.', color:'var(--sap-amber-bright)', comingSoon:true },
              { name:'SuperMarket', rate:'50/25/25', sub:'creator / affiliate / platform', desc:'Sell digital products. Create once, earn forever.', color:'var(--sap-accent)', comingSoon:true },
            ].map(function(s, i) {
              return (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="hiw-card" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderTop:'3px solid '+s.color, borderRadius:20, padding:'32px 28px', transition:'all 0.3s', height:'100%', position:'relative' }}>
                    {s.comingSoon && <div style={{ position:'absolute', top:16, right:16, padding:'5px 14px', borderRadius:8, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)', fontFamily:"'Sora',sans-serif", fontSize:10, fontWeight:800, color:'var(--sap-amber-bright)', letterSpacing:1.5, textTransform:'uppercase' }}>{t('affiliatePlan.comingSoon')}</div>}
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#fff', marginBottom:6 }}>{s.name}</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:36, fontWeight:900, color:s.color, marginBottom:4 }}>{s.rate}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>{s.sub}</div>
                    <div style={{ fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>{s.desc}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.3}>
            <div style={{ textAlign:'center', marginTop:40 }}>
              <Link to="/earn" style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:accent, textDecoration:'none', borderBottom:'2px solid '+accent, paddingBottom:4, transition:'all 0.2s' }}>{t('affiliatePlan.seeFullCompPlan')}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ WHAT YOU GET ═══ */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <Reveal><h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(28px,4vw,42px)', fontWeight:900, textAlign:'center', marginBottom:8 }}>{t('affiliatePlan.whatsIncluded')}</h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize:17, color:'rgba(255,255,255,0.4)', textAlign:'center', maxWidth:480, margin:'0 auto 48px' }}>{t("affiliatePlan.whatsIncludedDesc")}</p></Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {[
              { name:'SuperLink', desc:'Your personal sales page — one link does everything', icon:'🔗' },
              { name:'AI Campaign Studio', desc:'Generate social posts, emails, ad copy in seconds', icon:'🤖' },
              { name:'LinkHub', desc:'Your bio link page — all offers, one URL', icon:'🌐' },
              { name:'SuperPages', desc:'Drag-and-drop landing page builder', icon:'📄' },
              { name:'Email Autoresponder', desc:'Automated follow-up that converts while you sleep', icon:'📧' },
              { name:'Training Centre', desc:'Step-by-step from zero to earning', icon:'🎓' },
            ].map(function(t, i) {
              return (
                <Reveal key={i} delay={i * 0.05}>
                  <div className="hiw-card" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'24px 20px', textAlign:'center', transition:'all 0.3s' }}>
                    <div style={{ fontSize:28, marginBottom:12 }}>{t.icon}</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#fff', marginBottom:6 }}>{t.name}</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{t.desc}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding:'80px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(30px,5vw,48px)', fontWeight:900, marginBottom:16 }}>
              Ready to start<br/><span style={{ color:accent }}>{t("affiliatePlan.readyToStartEarning")}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontSize:17, color:'rgba(255,255,255,0.4)', marginBottom:32 }}>{t("affiliatePlan.ctaDesc")}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link to="/register" style={{ display:'inline-block', padding:'20px 56px', borderRadius:14, fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, textDecoration:'none', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', boxShadow:'0 4px 24px rgba(14,165,233,0.25)', transition:'all 0.3s' }}>{t('affiliatePlan.createFreeAccount')}</Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign:'center', padding:'40px 24px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.15)', lineHeight:1.7 }}>
          SuperAdPro · <Link to="/legal" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>{t('affiliatePlan.terms')}</Link> · <Link to="/legal" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>{t('affiliatePlan.privacy')}</Link> · <Link to="/support" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>{t('affiliatePlan.support')}</Link>
        </p>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.1)', marginTop:6 }}>Income figures represent the compensation plan structure. Results depend on individual effort.</p>
      </footer>
    </div>
  );
}
