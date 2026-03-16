import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import {
  DollarSign, Users, Zap, GraduationCap, Eye, Link2, LayoutGrid,
  Target, Megaphone, Mail, Bot, Globe, Shield, Trophy, Award,
  ChevronRight, Star, Check, Lock, Sparkles, ArrowRight
} from 'lucide-react';

// ── Animated counter hook ──
function useCountUp(target, duration, trigger) {
  var ref = useRef(null);
  var [val, setVal] = useState(0);
  useEffect(function() {
    if (!trigger) return;
    var start = 0;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setVal(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, trigger, duration]);
  return val;
}

// ── Intersection observer hook ──
function useInView(threshold) {
  var ref = useRef(null);
  var [inView, setInView] = useState(false);
  useEffect(function() {
    if (!ref.current) return;
    var obs = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: threshold || 0.2 });
    obs.observe(ref.current);
    return function() { obs.disconnect(); };
  }, []);
  return [ref, inView];
}

// ── Tab definitions ──
var TABS = [
  { key: 'membership', label: 'Membership', icon: DollarSign, color: '#16a34a' },
  { key: 'grid', label: 'Profit Grid', icon: Zap, color: '#0ea5e9' },
  { key: 'courses', label: 'Courses', icon: GraduationCap, color: '#8b5cf6', soon: true },
  { key: 'calculator', label: 'Calculator', icon: Target, color: '#f59e0b', soon: true },
];

export default function CompensationPlan() {
  var [tab, setTab] = useState('membership');

  return (
    <AppLayout title="Compensation Plan" subtitle="Your complete guide to earning with SuperAdPro">

      {/* ── Tab Navigation ── */}
      <div style={{display:'flex',gap:6,marginBottom:28,borderBottom:'2px solid #e8ecf2',paddingBottom:0,flexWrap:'wrap'}}>
        {TABS.map(function(t) {
          var Icon = t.icon;
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { if (!t.soon) setTab(t.key); }}
              style={{
                display:'flex',alignItems:'center',gap:6,padding:'12px 20px',fontSize:13,fontWeight:active?800:600,
                border:'none',borderBottom:active?'3px solid '+t.color:'3px solid transparent',
                cursor:t.soon?'default':'pointer',fontFamily:'inherit',
                background:active?'rgba(14,165,233,.04)':'transparent',
                color:active?t.color:t.soon?'#cbd5e1':'#64748b',
                marginBottom:-2,borderRadius:'8px 8px 0 0',transition:'all .2s',
                opacity:t.soon?0.5:1,
              }}>
              <Icon size={15}/>
              {t.label}
              {t.soon && <span style={{fontSize:9,fontWeight:700,background:'#f1f5f9',color:'#94a3b8',padding:'2px 6px',borderRadius:4}}>SOON</span>}
            </button>
          );
        })}
      </div>

      {/* ── Membership Tab ── */}
      {tab === 'membership' && <MembershipSection />}

      {/* ── Placeholder for future tabs ── */}
      {tab === 'grid' && <GridSection />}
      {tab === 'courses' && <ComingSoon label="Courses" />}
      {tab === 'calculator' && <ComingSoon label="Calculator" />}

    </AppLayout>
  );
}


// ══════════════════════════════════════════════════════════════
// ── MEMBERSHIP SECTION ──
// ══════════════════════════════════════════════════════════════

function MembershipSection() {
  var [heroRef, heroVisible] = useInView(0.1);
  var [plansRef, plansVisible] = useInView(0.15);
  var [basicRef, basicVisible] = useInView(0.1);
  var [proRef, proVisible] = useInView(0.1);
  var [earnRef, earnVisible] = useInView(0.1);
  var [tableRef, tableVisible] = useInView(0.1);

  var basicComm = useCountUp(10, 1200, earnVisible);
  var proComm = useCountUp(15, 1200, earnVisible);

  return (
    <div>
      {/* ── Hero Banner ── */}
      <div ref={heroRef} style={{
        background:'linear-gradient(135deg,#0f4c3a,#16a34a,#22c55e)',
        borderRadius:16,padding:'48px 40px',marginBottom:28,position:'relative',overflow:'hidden',
        opacity:heroVisible?1:0,transform:heroVisible?'translateY(0)':'translateY(30px)',
        transition:'all .8s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Decorative circles */}
        <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,.06)'}}/>
        <div style={{position:'absolute',bottom:-60,left:-30,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,.04)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <DollarSign size={20} color="rgba(255,255,255,.7)"/>
            <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.6)'}}>Stream 01</span>
          </div>
          <h2 style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:800,color:'#fff',margin:'0 0 12px',lineHeight:1.2}}>
            Membership Affiliate Income
          </h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,.7)',maxWidth:560,lineHeight:1.7,margin:0}}>
            Refer members and earn recurring monthly commissions for as long as they stay active. Two tiers, two commission levels, one simple model.
          </p>
        </div>
      </div>

      {/* ── Two Plan Cards ── */}
      <div ref={plansRef} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:28}}>

        {/* Basic Plan */}
        <div style={{
          background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',
          boxShadow:'0 4px 20px rgba(0,0,0,.06)',
          opacity:plansVisible?1:0,transform:plansVisible?'translateX(0)':'translateX(-40px)',
          transition:'all .7s cubic-bezier(.16,1,.3,1)',transitionDelay:'.1s',
        }}>
          <div style={{background:'#1c223d',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Basic Plan</div>
              <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800,color:'#fff'}}>$20</span>
                <span style={{fontSize:13,color:'rgba(255,255,255,.4)'}}>/month</span>
              </div>
            </div>
            <div style={{width:48,height:48,borderRadius:12,background:'rgba(14,165,233,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Users size={22} color="#38bdf8"/>
            </div>
          </div>
          <div style={{padding:'24px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>What you get</div>
            {[
              { icon: Eye, label: 'Watch to Earn', desc: 'Earn rewards watching video ads' },
              { icon: LayoutGrid, label: 'LinkHub', desc: 'Link-in-bio page builder' },
              { icon: Link2, label: 'Link Tools', desc: 'Short links, QR codes, UTM tracking' },
              { icon: GraduationCap, label: 'Course Library & Marketplace', desc: 'Access all courses' },
              { icon: LayoutGrid, label: 'Ad Board', desc: 'Community marketplace' },
              { icon: Zap, label: 'Campaign Tiers', desc: '8 campaign levels ($20–$1,000)' },
              { icon: Bot, label: 'Marketing Suite', desc: 'AI content generators' },
              { icon: Users, label: 'Affiliate Tools', desc: 'Network, social share, leaderboard' },
              { icon: Trophy, label: 'Leaderboard & Achievements', desc: 'Track your progress' },
            ].map(function(f, i) {
              var FIcon = f.icon;
              return (
                <div key={i} style={{
                  display:'flex',alignItems:'center',gap:12,padding:'10px 0',
                  borderBottom:i < 8 ? '1px solid #f5f6f8' : 'none',
                  opacity:plansVisible?1:0,transform:plansVisible?'translateY(0)':'translateY(10px)',
                  transition:'all .5s ease',transitionDelay:(0.2 + i * 0.05) + 's',
                }}>
                  <div style={{width:32,height:32,borderRadius:8,background:'#f0f9ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <FIcon size={15} color="#0ea5e9"/>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{f.label}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pro Plan */}
        <div style={{
          background:'#fff',border:'2px solid #8b5cf6',borderRadius:14,overflow:'hidden',
          boxShadow:'0 4px 20px rgba(139,92,246,.12)',position:'relative',
          opacity:plansVisible?1:0,transform:plansVisible?'translateX(0)':'translateX(40px)',
          transition:'all .7s cubic-bezier(.16,1,.3,1)',transitionDelay:'.2s',
        }}>
          {/* Popular badge */}
          <div style={{position:'absolute',top:16,right:16,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',padding:'4px 12px',borderRadius:20,fontSize:10,fontWeight:800,color:'#fff',letterSpacing:1,textTransform:'uppercase',zIndex:1}}>
            Popular
          </div>
          <div style={{background:'linear-gradient(135deg,#1c223d,#2d1b69)',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#a78bfa',marginBottom:4}}>Pro Plan</div>
              <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800,color:'#fff'}}>$30</span>
                <span style={{fontSize:13,color:'rgba(255,255,255,.4)'}}>/month</span>
              </div>
            </div>
            <div style={{width:48,height:48,borderRadius:12,background:'rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Sparkles size={22} color="#a78bfa"/>
            </div>
          </div>
          <div style={{padding:'24px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>Everything in Basic, plus</div>
            {[
              { icon: Globe, label: 'SuperPages', desc: 'Drag-and-drop landing page builder', pro: true },
              { icon: Target, label: 'ProSeller AI', desc: 'AI-powered sales coach & prospect CRM', pro: true },
              { icon: Mail, label: 'My Leads Dashboard', desc: 'Track and nurture captured leads', pro: true },
              { icon: GraduationCap, label: 'Create & Sell Courses', desc: 'Build courses, sell on marketplace', pro: true },
            ].map(function(f, i) {
              var FIcon = f.icon;
              return (
                <div key={i} style={{
                  display:'flex',alignItems:'center',gap:12,padding:'10px 0',
                  borderBottom:i < 3 ? '1px solid #f5f6f8' : 'none',
                  opacity:plansVisible?1:0,transform:plansVisible?'translateY(0)':'translateY(10px)',
                  transition:'all .5s ease',transitionDelay:(0.3 + i * 0.06) + 's',
                }}>
                  <div style={{width:32,height:32,borderRadius:8,background:'rgba(139,92,246,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <FIcon size={15} color="#8b5cf6"/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{f.label}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{f.desc}</div>
                  </div>
                  <div style={{fontSize:9,fontWeight:800,background:'rgba(139,92,246,.08)',color:'#8b5cf6',padding:'3px 8px',borderRadius:4}}>PRO</div>
                </div>
              );
            })}
            <div style={{marginTop:16,padding:'14px 16px',background:'rgba(139,92,246,.04)',borderRadius:10,border:'1px solid rgba(139,92,246,.1)'}}>
              <div style={{fontSize:11,color:'#8b5cf6',fontWeight:700}}>+ All 9 Basic features included</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Affiliate Earnings Section ── */}
      <div ref={earnRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:earnVisible?1:0,transform:earnVisible?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'#1c223d',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Affiliate Commissions</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>What You Earn Per Referral</div>
        </div>
        <div style={{padding:'28px 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:28}}>

            {/* Basic Commission */}
            <div style={{textAlign:'center',padding:24,background:'#f8fffe',borderRadius:12,border:'1px solid #dcfce7'}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#16a34a',marginBottom:8}}>Basic Referral</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:800,color:'#16a34a',lineHeight:1}}>
                ${basicComm}
              </div>
              <div style={{fontSize:13,color:'#64748b',fontWeight:600,marginTop:4}}>/month per member</div>
              <div style={{marginTop:12,display:'flex',justifyContent:'center',gap:4}}>
                <span style={{fontSize:11,fontWeight:700,background:'#dcfce7',color:'#16a34a',padding:'3px 10px',borderRadius:20}}>50% of $20</span>
                <span style={{fontSize:11,fontWeight:700,background:'#f0fdf4',color:'#16a34a',padding:'3px 10px',borderRadius:20}}>Recurring</span>
              </div>
            </div>

            {/* Pro Commission */}
            <div style={{textAlign:'center',padding:24,background:'#faf5ff',borderRadius:12,border:'1px solid #e9d5ff'}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:8}}>Pro Referral</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:800,color:'#8b5cf6',lineHeight:1}}>
                ${proComm}
              </div>
              <div style={{fontSize:13,color:'#64748b',fontWeight:600,marginTop:4}}>/month per member</div>
              <div style={{marginTop:12,display:'flex',justifyContent:'center',gap:4}}>
                <span style={{fontSize:11,fontWeight:700,background:'#e9d5ff',color:'#8b5cf6',padding:'3px 10px',borderRadius:20}}>50% of $30</span>
                <span style={{fontSize:11,fontWeight:700,background:'#f5f3ff',color:'#8b5cf6',padding:'3px 10px',borderRadius:20}}>Recurring</span>
              </div>
            </div>
          </div>

          {/* How it works flow */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:28,flexWrap:'wrap'}}>
            {[
              {label:'You refer a member',icon:'👤',color:'#0ea5e9'},
              {label:'They subscribe',icon:'💳',color:'#f59e0b'},
              {label:'You earn 50% monthly',icon:'💰',color:'#16a34a'},
              {label:'Recurring forever',icon:'♾️',color:'#8b5cf6'},
            ].map(function(s, i) {
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{
                    textAlign:'center',padding:'16px 14px',background:'#f8f9fb',borderRadius:12,border:'1px solid #e8ecf2',minWidth:120,
                    opacity:earnVisible?1:0,transform:earnVisible?'translateY(0)':'translateY(20px)',
                    transition:'all .6s ease',transitionDelay:(0.2 + i * 0.15) + 's',
                  }}>
                    <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'#475569',lineHeight:1.3}}>{s.label}</div>
                  </div>
                  {i < 3 && <ArrowRight size={16} color="#cbd5e1"/>}
                </div>
              );
            })}
          </div>

          {/* Key points */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            {[
              {icon:'🔄',title:'100% Recurring',desc:'Earn every month your referral stays active — not just the first month'},
              {icon:'🚫',title:'No Caps or Limits',desc:'Refer as many members as you want. No ceiling on membership commissions'},
              {icon:'⚡',title:'Instant Credit',desc:'Commission credited to your wallet the moment their payment processes'},
            ].map(function(p, i) {
              return (
                <div key={i} style={{
                  padding:18,background:'#f8f9fb',borderRadius:12,border:'1px solid #e8ecf2',
                  opacity:earnVisible?1:0,transform:earnVisible?'scale(.95)':'scale(.95)',
                  transition:'all .5s ease',transitionDelay:(0.5 + i * 0.1) + 's',
                  ...(earnVisible ? {opacity:1,transform:'scale(1)'} : {}),
                }}>
                  <div style={{fontSize:20,marginBottom:8}}>{p.icon}</div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:4}}>{p.title}</div>
                  <div style={{fontSize:11,color:'#64748b',lineHeight:1.6}}>{p.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Residual Income Table ── */}
      <div ref={tableRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:tableVisible?1:0,transform:tableVisible?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'#1c223d',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Income Projection</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>Residual Income Potential</div>
        </div>
        <div style={{padding:'24px'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Members Referred','Basic Monthly','Pro Monthly','Basic Annual','Pro Annual'].map(function(h) {
                    return <th key={h} style={{fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,padding:'12px 16px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'}}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {[5,10,25,50,100,250,500].map(function(n, i) {
                  var bm = n * 10;
                  var pm = n * 15;
                  return (
                    <tr key={n} style={{
                      opacity:tableVisible?1:0,transform:tableVisible?'translateX(0)':'translateX(-20px)',
                      transition:'all .5s ease',transitionDelay:(0.1 + i * 0.06) + 's',
                    }}>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontWeight:700,color:'#0f172a',fontSize:13}}>{n} members</td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontWeight:700,color:'#16a34a',fontSize:13}}>${bm.toLocaleString()}/mo</td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontWeight:700,color:'#8b5cf6',fontSize:13}}>${pm.toLocaleString()}/mo</td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontWeight:800,color:'#16a34a',fontSize:13}}>${(bm*12).toLocaleString()}</td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontWeight:800,color:'#8b5cf6',fontSize:13}}>${(pm*12).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:16,padding:'12px 16px',background:'#fffbeb',borderRadius:10,border:'1px solid #fef3c7',fontSize:11,color:'#92400e',lineHeight:1.6}}>
            <strong>Note:</strong> All figures represent potential earnings based on active referrals maintaining their membership. Actual income depends on your personal activity and referral retention. Income is not guaranteed.
          </div>
        </div>
      </div>

      {/* ── Progress Bar Visual ── */}
      <MilestoneTracker visible={tableVisible}/>
    </div>
  );
}


// ── Milestone Progress Tracker ──
function MilestoneTracker(props) {
  var [ref, inView] = useInView(0.2);
  var milestones = [
    {n:5,label:'Starter',color:'#94a3b8',basic:50,pro:75},
    {n:10,label:'Builder',color:'#0ea5e9',basic:100,pro:150},
    {n:25,label:'Achiever',color:'#16a34a',basic:250,pro:375},
    {n:50,label:'Leader',color:'#8b5cf6',basic:500,pro:750},
    {n:100,label:'Elite',color:'#f59e0b',basic:1000,pro:1500},
    {n:250,label:'Diamond',color:'#ec4899',basic:2500,pro:3750},
  ];

  return (
    <div ref={ref} style={{
      background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',
      boxShadow:'0 4px 20px rgba(0,0,0,.06)',
      opacity:inView?1:0,transform:inView?'translateY(0)':'translateY(30px)',
      transition:'all .7s cubic-bezier(.16,1,.3,1)',
    }}>
      <div style={{background:'#1c223d',padding:'20px 24px'}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Milestones</div>
        <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>Your Path to Financial Freedom</div>
      </div>
      <div style={{padding:'28px 24px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {milestones.map(function(m, i) {
            var pct = Math.min(100, (m.n / 250) * 100);
            return (
              <div key={i} style={{
                display:'flex',alignItems:'center',gap:16,
                opacity:inView?1:0,transform:inView?'translateX(0)':'translateX(-30px)',
                transition:'all .6s ease',transitionDelay:(0.1 + i * 0.1) + 's',
              }}>
                <div style={{width:70,textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:800,color:m.color}}>{m.n}</div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>{m.label}</div>
                </div>
                <div style={{flex:1,height:28,background:'#f1f5f9',borderRadius:14,overflow:'hidden',position:'relative'}}>
                  <div style={{
                    height:'100%',borderRadius:14,background:'linear-gradient(90deg,' + m.color + ',' + m.color + 'aa)',
                    width:inView?pct+'%':'0%',transition:'width 1.2s cubic-bezier(.16,1,.3,1)',transitionDelay:(0.3 + i * 0.12) + 's',
                    display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:10,
                  }}>
                    {pct > 15 && <span style={{fontSize:10,fontWeight:800,color:'#fff'}}>${m.basic.toLocaleString()}/mo</span>}
                  </div>
                </div>
                <div style={{width:80,textAlign:'right'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#16a34a'}}>${m.basic.toLocaleString()}</div>
                  <div style={{fontSize:10,color:'#8b5cf6',fontWeight:700}}>${m.pro.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:20,fontSize:11,color:'#94a3b8',fontWeight:600}}>
          <span><span style={{display:'inline-block',width:8,height:8,borderRadius:4,background:'#16a34a',marginRight:4,verticalAlign:'middle'}}/>Basic /mo</span>
          <span><span style={{display:'inline-block',width:8,height:8,borderRadius:4,background:'#8b5cf6',marginRight:4,verticalAlign:'middle'}}/>Pro /mo</span>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// ── PROFIT GRID SECTION ──
// ══════════════════════════════════════════════════════════════

var TIERS = [
  {n:1,name:'Starter',price:20,color:'#4ade80'},
  {n:2,name:'Builder',price:50,color:'#38bdf8'},
  {n:3,name:'Pro',price:100,color:'#0ea5e9'},
  {n:4,name:'Advanced',price:200,color:'#6366f1'},
  {n:5,name:'Elite',price:400,color:'#8b5cf6'},
  {n:6,name:'Premium',price:600,color:'#f59e0b'},
  {n:7,name:'Executive',price:800,color:'#f97316'},
  {n:8,name:'Ultimate',price:1000,color:'#ec4899'},
];

function GridSection() {
  var [heroRef, heroVis] = useInView(0.1);
  var [splitRef, splitVis] = useInView(0.1);
  var [tierRef, tierVis] = useInView(0.1);
  var [uniRef, uniVis] = useInView(0.1);
  var [spillRef, spillVis] = useInView(0.1);
  var [bonusRef, bonusVis] = useInView(0.1);

  var d40 = useCountUp(40, 1000, splitVis);
  var d50 = useCountUp(50, 1000, splitVis);
  var d5a = useCountUp(5, 800, splitVis);
  var d5b = useCountUp(5, 800, splitVis);

  return (
    <div>
      {/* ── Hero ── */}
      <div ref={heroRef} style={{
        background:'linear-gradient(135deg,#0c4a6e,#0284c7,#0ea5e9)',
        borderRadius:16,padding:'48px 40px',marginBottom:28,position:'relative',overflow:'hidden',
        opacity:heroVis?1:0,transform:heroVis?'translateY(0)':'translateY(30px)',
        transition:'all .8s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{position:'absolute',top:-50,right:-50,width:220,height:220,borderRadius:'50%',background:'rgba(255,255,255,.05)'}}/>
        <div style={{position:'absolute',bottom:-40,left:-20,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,.04)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <Zap size={20} color="rgba(255,255,255,.7)"/>
            <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.6)'}}>Stream 02</span>
          </div>
          <h2 style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:800,color:'#fff',margin:'0 0 12px',lineHeight:1.2}}>
            8×8 Profit Engine Grid
          </h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,.7)',maxWidth:560,lineHeight:1.7,margin:0}}>
            Activate campaign tiers from $20 to $1,000 and earn commissions from your entire network — 8 levels deep. Every entry pays you instantly.
          </p>
        </div>
      </div>

      {/* ── Commission Split (40/50/5/5) ── */}
      <div ref={splitRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:splitVis?1:0,transform:splitVis?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'#1c223d',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Commission Architecture</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>How Every Dollar is Split</div>
        </div>
        <div style={{padding:'28px 24px'}}>
          {/* Animated bar */}
          <div style={{height:40,borderRadius:10,overflow:'hidden',display:'flex',marginBottom:24}}>
            {[
              {pct:40,color:'#0ea5e9',label:'40% Sponsor'},
              {pct:50,color:'#6366f1',label:'50% Uni-Level'},
              {pct:5,color:'#f59e0b',label:'5% Platform'},
              {pct:5,color:'#10b981',label:'5% Bonus Pool'},
            ].map(function(s, i) {
              return (
                <div key={i} style={{
                  width:splitVis?s.pct+'%':'0%',transition:'width 1s cubic-bezier(.16,1,.3,1)',transitionDelay:(0.2+i*0.15)+'s',
                  background:s.color,display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:s.pct>=10?11:0,fontWeight:800,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',
                }}>{s.pct >= 10 ? s.label : ''}</div>
              );
            })}
          </div>

          {/* 4 split cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
            {[
              {pct:d40,label:'Direct Sponsor',desc:'Paid instantly when someone you personally referred activates any tier',color:'#0ea5e9',icon:'💰'},
              {pct:d50,label:'Uni-Level Pool',desc:'6.25% × 8 levels in the entrant\'s upline chain. Equal pay per level',color:'#6366f1',icon:'🌐'},
              {pct:d5a,label:'Platform Fee',desc:'SuperAdPro operational costs, development, and support',color:'#f59e0b',icon:'🏢'},
              {pct:d5b,label:'Bonus Pool',desc:'Accrues per seat fill. Paid to grid owner on grid completion (64 seats)',color:'#10b981',icon:'🎁'},
            ].map(function(s, i) {
              return (
                <div key={i} style={{
                  textAlign:'center',padding:20,borderRadius:12,border:'1px solid #e8ecf2',background:'#f8f9fb',
                  opacity:splitVis?1:0,transform:splitVis?'translateY(0)':'translateY(20px)',
                  transition:'all .6s ease',transitionDelay:(0.4+i*0.1)+'s',
                }}>
                  <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800,color:s.color,lineHeight:1}}>{s.pct}%</div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginTop:6,marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.5}}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 8 Tier Cards ── */}
      <div ref={tierRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:tierVis?1:0,transform:tierVis?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'#1c223d',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Campaign Tiers</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>8 Tiers — Full Grid Earnings Breakdown</div>
        </div>
        <div style={{padding:'24px'}}>
          <p style={{fontSize:13,color:'#64748b',lineHeight:1.7,marginBottom:20,maxWidth:650}}>
            Each tier has its own 8×8 grid (64 seats). As members join and fill seats, you accumulate uni-level commissions on every single entry. When all 64 seats are filled, the grid completes, you receive the bonus pool, and the grid advances to the next cycle — where you earn it all again.
          </p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {TIERS.map(function(t, i) {
              var directPer = (t.price * 0.40);
              var uniTotal = (t.price * 0.0625 * 64);
              var bonusPool = (t.price * 0.05 * 64);
              var gridTotal = uniTotal + bonusPool;
              return (
                <div key={i} style={{
                  borderRadius:12,border:'1px solid #e8ecf2',overflow:'hidden',display:'flex',flexDirection:'column',
                  opacity:tierVis?1:0,transform:tierVis?'scale(1)':'scale(.9)',
                  transition:'all .5s ease',transitionDelay:(0.1+i*0.06)+'s',
                }}>
                  <div style={{background:t.color,padding:'14px 16px',textAlign:'center'}}>
                    <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,.7)',letterSpacing:1,textTransform:'uppercase'}}>Campaign {t.n}</div>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#fff'}}>${t.price}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.8)'}}>{t.name}</div>
                  </div>
                  <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column'}}>
                    {/* Direct per referral */}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>DIRECT 40%</span>
                      <span style={{fontSize:12,fontWeight:800,color:'#0ea5e9'}}>${directPer.toFixed(0)} <span style={{fontSize:9,fontWeight:600,color:'#94a3b8'}}>per ref</span></span>
                    </div>
                    {/* Uni-level full grid */}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>UNI-LEVEL ×64</span>
                      <span style={{fontSize:12,fontWeight:800,color:'#6366f1'}}>${uniTotal.toLocaleString()}</span>
                    </div>
                    {/* Bonus pool */}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>BONUS POOL</span>
                      <span style={{fontSize:12,fontWeight:800,color:'#10b981'}}>${bonusPool.toLocaleString()}</span>
                    </div>
                    {/* Total per grid */}
                    <div style={{marginTop:'auto',paddingTop:10}}>
                      <div style={{textAlign:'center',padding:'10px 8px',background:'linear-gradient(135deg,'+t.color+'10,'+t.color+'20)',borderRadius:8}}>
                        <div style={{fontSize:9,fontWeight:800,color:t.color,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>Per Grid Completion</div>
                        <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:t.color}}>${gridTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  {/* Advance note */}
                  <div style={{padding:'8px 14px',background:'#f8f9fb',borderTop:'1px solid #e8ecf2',textAlign:'center'}}>
                    <span style={{fontSize:9,fontWeight:700,color:'#94a3b8'}}>🔄 Repeats on every advance</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Uni-Level Payout Table ── */}
      <div ref={uniRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:uniVis?1:0,transform:uniVis?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'#1c223d',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>Uni-Level Commissions</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>6.25% Per Level — 8 Levels Deep</div>
        </div>
        <div style={{padding:'24px'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr>
                  <th style={thStyle}>Level</th>
                  {TIERS.map(function(t) {
                    return <th key={t.n} style={Object.assign({},thStyle,{color:t.color})}>${t.price}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5,6,7,8].map(function(lvl, i) {
                  var colors = ['#0ea5e9','#6366f1','#0284c7','#4f46e5','#0369a1','#7c3aed','#1d4ed8','#2563eb'];
                  return (
                    <tr key={lvl} style={{
                      opacity:uniVis?1:0,transform:uniVis?'translateX(0)':'translateX(-20px)',
                      transition:'all .5s ease',transitionDelay:(0.1+i*0.06)+'s',
                    }}>
                      <td style={Object.assign({},tdStyle,{fontWeight:800,color:colors[i]})}>Level {lvl}</td>
                      {TIERS.map(function(t) {
                        var amt = (t.price * 0.0625).toFixed(2);
                        return <td key={t.n} style={Object.assign({},tdStyle,{color:colors[i],fontWeight:700})}>${amt}</td>;
                      })}
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{background:'#f0f9ff'}}>
                  <td style={Object.assign({},tdStyle,{fontWeight:800,color:'#0f172a'})}>Total (×8)</td>
                  {TIERS.map(function(t) {
                    return <td key={t.n} style={Object.assign({},tdStyle,{fontWeight:800,color:'#16a34a'})}>${(t.price*0.50).toFixed(2)}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{marginTop:12,fontSize:11,color:'#94a3b8',lineHeight:1.6}}>
            Each level pays exactly 6.25% of the tier price (50% ÷ 8 levels). Commissions are paid per seat fill — no waiting for grid completion.
          </div>
        </div>
      </div>

      {/* ── Spillover Model ── */}
      <div ref={spillRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:spillVis?1:0,transform:spillVis?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'#1c223d',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>How It Works</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>Spillover Placement Model</div>
        </div>
        <div style={{padding:'28px 24px'}}>
          {/* Step flow */}
          <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:28}}>
            {[
              {step:'1',title:'Member Purchases a Tier',desc:'E.g. $100 Pro tier. Payment goes to the platform.',color:'#0ea5e9',icon:'💳'},
              {step:'2',title:'40% Paid to Direct Sponsor',desc:'$40 instantly credited to the person who referred them.',color:'#16a34a',icon:'💰'},
              {step:'3',title:'50% Split Across 8 Upline Levels',desc:'$6.25 paid to each of the 8 people above in the upline chain.',color:'#6366f1',icon:'🌐'},
              {step:'4',title:'One Seat Filled in Every Upline Grid',desc:'The new member fills one position in each upline member\'s grid at that tier.',color:'#f59e0b',icon:'📊'},
              {step:'5',title:'64 Unique Members to Complete',desc:'Each grid needs 64 unique members to fill all 8 levels × 8 positions.',color:'#ec4899',icon:'🎯'},
            ].map(function(s, i) {
              return (
                <div key={i} style={{
                  display:'flex',alignItems:'flex-start',gap:16,
                  opacity:spillVis?1:0,transform:spillVis?'translateX(0)':'translateX(-30px)',
                  transition:'all .6s ease',transitionDelay:(0.2+i*0.12)+'s',
                }}>
                  <div style={{width:44,height:44,borderRadius:12,background:s.color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20,boxShadow:'0 4px 12px '+s.color+'33'}}>
                    {s.icon}
                  </div>
                  <div style={{flex:1,paddingTop:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:10,fontWeight:800,color:s.color,background:s.color+'15',padding:'2px 8px',borderRadius:4}}>STEP {s.step}</span>
                      <span style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{s.title}</span>
                    </div>
                    <div style={{fontSize:12,color:'#64748b',lineHeight:1.6}}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Qualification rule */}
          <div style={{padding:'16px 20px',background:'#fffbeb',borderRadius:12,border:'1px solid #fef3c7',display:'flex',alignItems:'flex-start',gap:12}}>
            <div style={{fontSize:20,flexShrink:0}}>⚠️</div>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:'#92400e',marginBottom:4}}>Qualification Rule</div>
              <div style={{fontSize:12,color:'#a16207',lineHeight:1.6}}>
                To earn commissions at a tier, you must have an active (or in-grace) campaign at that same tier or higher. If unqualified, the commission goes to the platform. Each upline level is checked individually.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid Completion Bonus ── */}
      <div ref={bonusRef} style={{
        background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:28,
        boxShadow:'0 4px 20px rgba(0,0,0,.06)',
        opacity:bonusVis?1:0,transform:bonusVis?'translateY(0)':'translateY(30px)',
        transition:'all .7s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{background:'linear-gradient(135deg,#1c223d,#0f4c3a)',padding:'20px 24px'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#4ade80',marginBottom:4}}>Bonus Reward</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>Grid Completion Bonus Pool</div>
        </div>
        <div style={{padding:'28px 24px'}}>
          <p style={{fontSize:13,color:'#64748b',lineHeight:1.7,marginBottom:24,maxWidth:600}}>
            5% of every tier entry accrues in a bonus pool for that grid. When all 64 positions are filled, the grid owner receives the accumulated bonus. Larger tiers = bigger bonus pools.
          </p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {TIERS.map(function(t, i) {
              var bonus = (t.price * 0.05 * 64);
              return (
                <div key={i} style={{
                  textAlign:'center',padding:16,borderRadius:12,
                  background:'linear-gradient(135deg,'+t.color+'08,'+t.color+'15)',
                  border:'1px solid '+t.color+'22',
                  opacity:bonusVis?1:0,transform:bonusVis?'scale(1)':'scale(.85)',
                  transition:'all .5s ease',transitionDelay:(0.1+i*0.06)+'s',
                }}>
                  <div style={{fontSize:10,fontWeight:800,color:t.color,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>${t.price} Tier</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:t.color}}>${bonus.toLocaleString()}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>on completion</div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:20,display:'flex',gap:14}}>
            {[
              {icon:'🔄',title:'Per Advance',desc:'Each grid advance accrues its own pool — you can earn this bonus multiple times'},
              {icon:'⏱️',title:'64 Seats',desc:'Grid completes when 64 unique members have each filled one seat'},
              {icon:'💎',title:'Up to $3,200',desc:'The $1,000 Ultimate tier pays the maximum completion bonus'},
            ].map(function(p, i) {
              return (
                <div key={i} style={{flex:1,padding:16,background:'#f8f9fb',borderRadius:10,border:'1px solid #e8ecf2'}}>
                  <div style={{fontSize:20,marginBottom:6}}>{p.icon}</div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>{p.title}</div>
                  <div style={{fontSize:11,color:'#64748b',lineHeight:1.5}}>{p.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

var thStyle = {fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,padding:'12px 10px',borderBottom:'2px solid #e8ecf2',textAlign:'center',background:'#f8f9fb'};
var tdStyle = {padding:'10px',borderBottom:'1px solid #f5f6f8',textAlign:'center',fontSize:12};


// ── Coming Soon placeholder ──
function ComingSoon(props) {
  return (
    <div style={{textAlign:'center',padding:'80px 20px'}}>
      <div style={{fontSize:40,marginBottom:12,opacity:.3}}>🚧</div>
      <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:4}}>{props.label}</div>
      <div style={{fontSize:13,color:'#94a3b8'}}>This section is coming next</div>
    </div>
  );
}
