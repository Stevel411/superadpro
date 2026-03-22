import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';

const CAPTIONS = [
  {tone:'🔥 Hype', text:'🚀 I just discovered a platform where you earn real commissions by watching video ads and building an 8x8 Income Grid. Three income streams, 95% payouts, AI marketing tools included.\n\nNo selling, no guesswork — just real participation that pays.\n\nCheck it out 👇\n{REF}\n\n#SuperAdPro #PassiveIncome #VideoAds #OnlineIncome #SideHustle #IncomeGrid'},
  {tone:'💰 Income', text:'💰 What if you could earn just by watching video ads? SuperAdPro pays 95% of every dollar back to members through 3 income streams.\n\nSee for yourself 👇\n{REF}\n\n#SuperAdPro #MakeMoneyOnline #VideoMarketing #AffiliateMarketing'},
  {tone:'🤝 Trust', text:'✅ Found something that actually pays — not a scam, not MLM hype.\n\nSuperAdPro: earn real income from 4 streams:\n• $10/month per referral\n• 40% grid commissions\n• 8 levels deep\n\nJoin here 👇\n{REF}\n\n#SuperAdPro #OnlineIncome #PassiveIncome #SideHustle'},
  {tone:'🚀 FOMO', text:'⏰ Still scrolling while others build income grids?\n\nSuperAdPro pays you to watch ads + 3 income streams:\n🔥 $10/month per referral\n🔥 Grid commissions 8 levels deep\n🔥 AI tools FREE\n\n{REF}\n\n#SuperAdPro #FOMO #SideHustle #FinancialFreedom'},
];

export default function Affiliate() {
  var { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capIdx, setCapIdx] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => { apiGet('/api/affiliate').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const refLink = `https://www.www.superadpro.com/ref/${user?.username}`;
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const copyRef = () => { navigator.clipboard.writeText(refLink); showToast('Referral link copied!'); };
  const copyCaption = () => { navigator.clipboard.writeText(CAPTIONS[capIdx].text.replace('{REF}', refLink)); showToast('Caption copied!'); };
  const enc = encodeURIComponent;

  if (loading) return <AppLayout title="🤝 Social Share Hub"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  const d = data || {};
  const referrals = d.referrals || [];

  return (
    <AppLayout title="🤝 Social Share Hub" subtitle="Your referral link, captions & share tools">
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#0b1729,#132240,#0e1c30)',borderRadius:8,padding:'32px 36px',marginBottom:20,position:'relative',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
        <div style={{position:'absolute',top:'-50px',right:'10%',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(14,165,233,.15),transparent 70%)',pointerEvents:'none'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:24,position:'relative',zIndex:1}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#38bdf8',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>🤝 Affiliate Hub</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#fff',marginBottom:8}}>Your Social <span style={{color:'#38bdf8'}}>Share Command Centre</span></div>
            <div style={{fontSize:13,color:'rgba(200,220,255,.45)',lineHeight:1.6,maxWidth:420,marginBottom:16}}>Every share plants a seed. Every referral is tracked to you permanently — even if they click weeks later.</div>
            <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'10px 14px'}}>
              <span style={{fontSize:13,color:'#38bdf8',fontWeight:600,fontFamily:'monospace',flex:1,wordBreak:'break-all'}}>{refLink}</span>
              <button onClick={copyRef} style={{padding:'7px 16px',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:8,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit'}}>📋 Copy Link</button>
            </div>
          </div>
          <div style={{display:'flex',gap:14}}>
            <HeroStat val={d.personal_referrals || 0} lbl="Direct Recruits" color="#4ade80"/>
            <HeroStat val={d.total_team || 0} lbl="Total Network" color="#00c8ff"/>
            <HeroStat val={`$${Math.round(d.total_earned || 0)}`} lbl="Total Earned" color="#fbbf24"/>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'stretch'}}>
        {/* LEFT */}
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {/* Share Platforms */}
          <WCard title="Share Your Link Instantly" dot="#0ea5e9" headerRight={<span style={{fontSize:11,color:'#7b91a8',fontWeight:600}}>Click to share or copy</span>}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
              <SocBtn href={`https://www.facebook.com/sharer/sharer.php?u=${enc(refLink)}`} bg="#1877f2" label="Facebook" sub="Share →"/>
              <SocBtn onClick={() => { navigator.clipboard.writeText(`🚀 Earning from video ads is a thing now.\n\nSuperAdPro — 8x8 income grid, 3 streams, 95% payout rate.\n\n✅ Link in bio!\n\n#SuperAdPro #PassiveIncome #SideHustle`); showToast('📸 Instagram caption copied!'); }} bg="linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" label="Instagram" sub="Copy →" tag="COPY"/>
              <SocBtn onClick={() => { navigator.clipboard.writeText(`Check out SuperAdPro — earn from video ads 🚀\n\n${refLink}\n\n#SuperAdPro #MakeMoneyOnline #TikTokBusiness`); showToast('🎵 TikTok caption copied!'); }} bg="#000" label="TikTok" sub="Copy →" tag="COPY"/>
              <SocBtn href={`https://twitter.com/intent/tweet?text=${enc('Check out SuperAdPro!')}&url=${enc(refLink)}`} bg="#000" label="X / Twitter" sub="Tweet →"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              <SocBtn href={`https://wa.me/?text=${enc('Join SuperAdPro! '+refLink)}`} bg="#25d366" label="WhatsApp" sub="Send →"/>
              <SocBtn href={`https://t.me/share/url?url=${enc(refLink)}`} bg="#229ed9" label="Telegram" sub="Send →"/>
              <SocBtn href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(refLink)}`} bg="#0a66c2" label="LinkedIn" sub="Share →"/>
              <SocBtn onClick={() => { navigator.clipboard.writeText(`🚀 SuperAdPro — The Video Ad Platform That Pays YOU\n\nEarn from 3 income streams. AI tools included FREE.\n\n👉 ${refLink}\n\n#SuperAdPro #OnlineIncome #VideoAds`); showToast('▶️ YouTube description copied!'); }} bg="#ff0000" label="YouTube" sub="Copy →" tag="COPY"/>
            </div>
          </WCard>

          {/* Caption Workshop */}
          <WCard title="Caption Workshop" dot="#a855f7" headerRight={
            <div style={{display:'flex',gap:6}}>
              {CAPTIONS.map((c,i) => (
                <button key={i} onClick={() => setCapIdx(i)} style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:capIdx===i?'rgba(168,85,247,.12)':'#f6f8fc',color:capIdx===i?'#a855f7':'#7b91a8'}}>{c.tone}</button>
              ))}
            </div>
          } flex>
            <div style={{fontSize:11,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Ready-to-post caption</div>
            <div style={{background:'#f6f8fc',border:'1px solid rgba(15,25,60,.08)',borderRadius:10,padding:14,fontSize:13,color:'#334155',lineHeight:1.8,whiteSpace:'pre-wrap',minHeight:120,flex:1,marginBottom:12}}>
              {CAPTIONS[capIdx].text.replace('{REF}', refLink)}
            </div>
            <div style={{background:'#f0fdf4',border:'1px solid rgba(22,163,74,.2)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#16a34a',fontWeight:600,marginBottom:12}}>✅ Your link is embedded: {refLink}</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={copyCaption} style={{flex:1,fontSize:13,fontWeight:700,padding:10,borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',background:'linear-gradient(135deg,#a855f7,#7c3aed)',color:'#fff'}}>📋 Copy Caption</button>
              <button onClick={() => setCapIdx((capIdx+1)%CAPTIONS.length)} style={{fontSize:13,fontWeight:600,padding:'10px 16px',borderRadius:9,border:'1px solid rgba(15,25,60,.1)',cursor:'pointer',fontFamily:'inherit',background:'#f6f8fc',color:'#3d5068'}}>🔄 Next</button>
            </div>
          </WCard>
        </div>

        {/* RIGHT */}
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {/* Traffic Flywheel */}
          <WCard title="The Traffic Flywheel" dot="#f59e0b" headerRight={<span style={{fontSize:11,fontWeight:600,color:'#f59e0b',opacity:.8}}>↻ How it compounds</span>}>
            {[
              {n:'1',bg:'linear-gradient(135deg,#dcfce7,#bbf7d0)',c:'#16a34a',t:'Post your referral link anywhere',d:'Social media, blogs, forums, DMs — everywhere'},
              {n:'2',bg:'linear-gradient(135deg,#e0f2fe,#bae6fd)',c:'#0284c7',t:'People click and land on SuperAdPro',d:'Their click is tracked to you for 30 days'},
              {n:'3',bg:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',c:'#0ea5e9',t:'They sign up and pay $20/month',d:'You earn $10 immediately, credited to wallet'},
              {n:'4',bg:'linear-gradient(135deg,#fdf4ff,#fae8ff)',c:'#a855f7',t:'They activate their income grid',d:'You earn 40% direct sponsor commission'},
              {n:'5',bg:'linear-gradient(135deg,#fefce8,#fef08a)',c:'#d97706',t:'Their network grows your earnings',d:'6.25% across 8 levels deep — forever'},
            ].map((s,i) => (
              <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'10px 0',borderBottom:i<4?'1px solid rgba(15,25,60,.06)':'none'}}>
                <div style={{width:32,height:32,borderRadius:10,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:s.c,flexShrink:0}}>{s.n}</div>
                <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{s.t}</div><div style={{fontSize:12,color:'#7b91a8'}}>{s.d}</div></div>
              </div>
            ))}
          </WCard>

          {/* Commission Structure */}
          <WCard title="Your Commission Structure" dot="#16a34a">
            {[
              {icon:'🔑',bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)',bc:'#bbf7d0',c:'#16a34a',t:'Membership Referral',d:'50% monthly · $10/referral · recurring',v:'$10',vs:'/mo'},
              {icon:'⚡',bg:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',bc:'#bae6fd',c:'#0284c7',t:'Grid Direct Sponsor',d:'40% on campaign tier activation',v:'40%',vs:''},
              {icon:'🌐',bg:'linear-gradient(135deg,#fdf4ff,#f3e8ff)',bc:'#e9d5ff',c:'#a855f7',t:'Uni-Level (8 Levels Deep)',d:'6.25% across your entire network',v:'6.25%',vs:''},
            ].map((s,i) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',gap:12,padding:'12px 14px',background:s.bg,border:`1px solid ${s.bc}`,borderRadius:12,marginBottom:i<2?10:0}}>
                <div style={{width:36,height:36,borderRadius:10,background:s.c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{s.icon}</div>
                <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{s.t}</div><div style={{fontSize:12,color:'#7b91a8'}}>{s.d}</div></div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:s.c}}>{s.v}<span style={{fontSize:11}}>{s.vs}</span></div>
              </div>
            ))}
          </WCard>

          {/* Direct Recruits */}
          <WCard title="Your Direct Recruits" dot="#f59e0b" headerRight={<span style={{fontSize:12,fontWeight:700,color:'#0284c7'}}>{d.personal_referrals || 0} direct · {d.total_team || 0} total</span>} flex>
            {referrals.length > 0 ? (
              <div style={{margin:'-20px -20px 0',overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    {['Member','Username','Joined','Status'].map(h=><th key={h} style={{fontSize:11,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,padding:'11px 14px',borderBottom:'1px solid rgba(15,25,60,.08)',textAlign:'left',background:'#f6f8fc'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {referrals.map((r,i) => (
                      <tr key={i}>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',fontWeight:700,color:'#0f172a'}}>{r.first_name} {r.last_name || ''}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',color:'#64748b',fontFamily:'monospace',fontSize:12}}>@{r.username}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',color:'#6b7d94',fontSize:12}}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(15,25,60,.05)'}}>
                          <span style={{fontSize:12,fontWeight:700,padding:'4px 11px',borderRadius:999,...(r.is_active?{background:'rgba(22,163,74,.09)',color:'#16a34a',border:'1px solid rgba(22,163,74,.2)'}:{background:'rgba(245,158,11,.09)',color:'#d97706',border:'1px solid rgba(245,158,11,.2)'})}}>{r.is_active?'Active':'Inactive'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:32,textAlign:'center',minHeight:120}}>
                <div style={{fontSize:28,marginBottom:8}}>🤝</div>
                <div style={{fontSize:14,fontWeight:700,color:'#3d5068',marginBottom:4}}>No referrals yet</div>
                <div style={{fontSize:12,color:'#7b91a8',marginBottom:14}}>Share your link — your first recruit is closer than you think.</div>
                <button onClick={copyRef} style={{fontSize:13,fontWeight:700,padding:'9px 18px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff'}}>📋 Copy My Link</button>
              </div>
            )}
          </WCard>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#0f172a',color:'#fff',padding:'10px 24px',borderRadius:12,fontSize:13,fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.3)',zIndex:300}}>{toast}</div>}
    </AppLayout>
  );
}

function HeroStat({val,lbl,color}) {
  return <div style={{textAlign:'center',minWidth:80}}>
    <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color}}>{val}</div>
    <div style={{fontSize:11,color:'rgba(200,220,255,.4)',fontWeight:600,marginTop:2}}>{lbl}</div>
  </div>;
}

function WCard({title,dot,headerRight,flex,children}) {
  return <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',overflow:'hidden',...(flex?{flex:1,display:'flex',flexDirection:'column'}:{})}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'15px 20px',borderBottom:'1px solid rgba(15,25,60,.07)'}}>
      <div style={{fontSize:16,fontWeight:700,color:'#0f172a',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:dot,flexShrink:0}}/>{title}
      </div>
      {headerRight}
    </div>
    <div style={{padding:'18px 20px',...(flex?{flex:1,display:'flex',flexDirection:'column'}:{})}}>{children}</div>
  </div>;
}

function SocBtn({href,onClick,bg,label,sub,tag}) {
  const inner = <>
    {tag && <div style={{position:'absolute',top:6,right:6,fontSize:8,fontWeight:800,color:'rgba(255,255,255,.7)',background:'rgba(0,0,0,.2)',padding:'2px 5px',borderRadius:4}}>{tag}</div>}
    <div style={{fontSize:14,marginBottom:4}}>
      <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',fontSize:16}}>
        {label[0]}
      </div>
    </div>
    <div style={{fontSize:11,fontWeight:700,color:'#fff'}}>{label}</div>
    <div style={{fontSize:10,color:'rgba(255,255,255,.6)'}}>{sub}</div>
  </>;
  const style = {display:'flex',flexDirection:'column',alignItems:'center',padding:'14px 8px',borderRadius:12,background:bg,textDecoration:'none',cursor:'pointer',position:'relative',transition:'all .15s',textAlign:'center'};
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{inner}</a>;
  return <div onClick={onClick} style={style}>{inner}</div>;
}
