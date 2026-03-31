import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Wand2, Zap, Copy, Check, ChevronRight, Calendar, Mail, Film, FileText, BarChart3, MessageCircle, RefreshCw, Lock, Sparkles, Target, Users, Globe, Play, Trash2, ExternalLink, AlertTriangle, Layout, Share2, RefreshCcw } from 'lucide-react';

var NICHES = ['Digital Marketing','Health & Fitness','Crypto & Trading','Real Estate','Make Money Online','Personal Finance','Travel','Beauty & Skincare','E-Commerce','Education','Technology','Coaching','Food & Nutrition','Parenting','Self Improvement'];
var AUDIENCES = ['Beginners looking to earn online','Small business owners','Stay-at-home parents','Students & young adults','Retirees','Side hustlers','Content creators','Freelancers'];
var TONES = ['Professional','Casual & Friendly','Inspirational & Motivational','Urgent & Direct','Educational'];
var GOALS = ['Lead Generation','Direct Sales','Affiliate Recruitment','Brand Awareness'];

export default function SuperSeller() {
  var { t } = useTranslation();
  var [campaigns, setCampaigns] = useState([]);
  var [loading, setLoading] = useState(true);
  var [view, setView] = useState('list'); // list, wizard, dashboard
  var [activeCampaign, setActiveCampaign] = useState(null);

  useEffect(function() {
    apiGet('/api/superseller/campaigns').then(function(r) {
      setCampaigns(r.campaigns || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  function onCampaignCreated(id) {
    apiGet('/api/superseller/campaign/' + id).then(function(r) {
      setActiveCampaign(r);
      setView('dashboard');
      // Refresh list
      apiGet('/api/superseller/campaigns').then(function(r2) { setCampaigns(r2.campaigns || []); });
    });
  }

  function openCampaign(id) {
    apiGet('/api/superseller/campaign/' + id).then(function(r) {
      setActiveCampaign(r);
      setView('dashboard');
    });
  }

  function deleteCampaign(id) {
    fetch('/api/superseller/campaign/' + id, {method:'DELETE',credentials:'include'})
      .then(function(r){return r.json();})
      .then(function(){
        setCampaigns(function(p){return p.filter(function(c){return c.id!==id;});});
      }).catch(function(){});
  }

  function refreshCampaign(id) {
    apiGet('/api/superseller/campaign/' + id).then(function(r) {
      setActiveCampaign(r);
    });
  }

  if (loading) return <AppLayout title="SuperSeller"><Spin/></AppLayout>;

  return (
    <AppLayout title="SuperSeller" subtitle="AI Sales Autopilot — your complete marketing pipeline">
      {view === 'list' && <CampaignList campaigns={campaigns} onCreate={function() { setView('wizard'); }} onCreateCustom={function() { setView('custom'); }} onOpen={openCampaign} onDelete={deleteCampaign} />}
      {view === 'wizard' && <SetupWizard onComplete={onCampaignCreated} onCancel={function() { setView('list'); }} />}
      {view === 'custom' && <CustomAgentWizard onComplete={onCampaignCreated} onCancel={function() { setView('list'); }} />}
      {view === 'dashboard' && activeCampaign && <CampaignDashboard campaign={activeCampaign} onBack={function() { setView('list'); }} onRefresh={function(){refreshCampaign(activeCampaign.id);}} />}
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════════
// CAMPAIGN LIST
// ══════════════════════════════════════════════════════════

function DeleteCampaignBtn({ id, onDelete }) {
  var [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <div style={{display:'flex',gap:4}}>
      <button onClick={function(){onDelete(id);}} style={{padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,background:'#dc2626',color:'#fff'}}>Delete</button>
      <button onClick={function(){setConfirm(false);}} style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e8ecf2',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:600,background:'#fff',color:'#64748b'}}>Cancel</button>
    </div>
  );
  return (
    <button onClick={function(){setConfirm(true);}} title="Delete campaign" style={{width:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,border:'1px solid #fecaca',cursor:'pointer',background:'#fef2f2',color:'#dc2626',padding:0,height:36}}>
      <Trash2 size={14}/>
    </button>
  );
}

function CampaignList({ campaigns, onCreate, onCreateCustom, onOpen, onDelete }) {
  return (
    <div>
      {/* Hero banner — SuperSeller Emerald Theme */}
      <div style={{background:'linear-gradient(135deg,#042f1a,#0a1f14,#0d2818)',borderRadius:16,padding:'40px 44px',marginBottom:24,position:'relative',overflow:'hidden',border:'1px solid rgba(16,185,129,.15)'}}>
        <div style={{position:'absolute',top:-50,right:-50,width:240,height:240,borderRadius:'50%',background:'rgba(16,185,129,.06)'}}/>
        <div style={{position:'absolute',bottom:-30,right:100,width:150,height:150,borderRadius:'50%',background:'rgba(52,211,153,.04)'}}/>
        {/* Floating dollar signs */}
        {[
          {left:'75%',size:22,delay:0,dur:6,opacity:.08},
          {left:'85%',size:16,delay:1.5,dur:7,opacity:.06},
          {left:'65%',size:28,delay:3,dur:8,opacity:.07},
          {left:'90%',size:14,delay:0.5,dur:5.5,opacity:.05},
          {left:'70%',size:20,delay:4,dur:7.5,opacity:.09},
          {left:'80%',size:24,delay:2,dur:6.5,opacity:.06},
          {left:'60%',size:18,delay:5,dur:8.5,opacity:.07},
          {left:'95%',size:12,delay:1,dur:5,opacity:.04},
          {left:'55%',size:26,delay:3.5,dur:9,opacity:.05},
          {left:'78%',size:15,delay:2.5,dur:6,opacity:.08},
        ].map(function(d, i) {
          return (
            <div key={i} style={{
              position:'absolute',bottom:-30,left:d.left,fontSize:d.size,fontWeight:900,
              color:'#10b981',opacity:d.opacity,fontFamily:'Sora,sans-serif',
              animation:'floatUp '+d.dur+'s ease-in-out '+d.delay+'s infinite',
              pointerEvents:'none',zIndex:0,
            }}>$</div>
          );
        })}
        <style>{`
          @keyframes floatUp {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-260px) rotate(25deg); opacity: 0; }
          }
        `}</style>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:8,background:'rgba(16,185,129,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Zap size={18} color="#34d399"/>
            </div>
            <span style={{fontSize:12,fontWeight:800,letterSpacing:2.5,textTransform:'uppercase'}}><span style={{color:'#fff'}}>Super</span><span style={{color:'#34d399'}}>Seller</span></span>
          </div>
          <h2 style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:900,color:'#fff',margin:'0 0 16px',letterSpacing:-.5}}>SuperSeller</h2>
          <p style={{fontSize:17,color:'rgba(255,255,255,.7)',maxWidth:540,lineHeight:1.8,margin:'0 0 10px',fontWeight:500}}>
            Answer 4 simple questions and AI builds your complete sales pipeline:
          </p>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:24}}>
            {['Landing Page','30 Social Posts','5-Email Sequence','3 Video Scripts','Ad Copy','Strategy Doc'].map(function(item) {
              return <span key={item} style={{padding:'5px 12px',borderRadius:6,background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.2)',fontSize:12,fontWeight:700,color:'#34d399'}}>{item}</span>;
            })}
          </div>
          <p style={{fontSize:14,color:'rgba(255,255,255,.4)',maxWidth:440,lineHeight:1.6,margin:'0 0 28px'}}>
            One link that sells for you 24/7. Your AI agent handles objections while you sleep.
          </p>
          <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
            <button onClick={onCreate}
              style={{display:'flex',alignItems:'center',gap:10,padding:'16px 32px',borderRadius:12,border:'none',cursor:'pointer',
                background:'linear-gradient(135deg,#10b981,#34d399)',color:'#fff',fontSize:16,fontWeight:800,fontFamily:'inherit',
                boxShadow:'0 4px 24px rgba(16,185,129,.4)',transition:'all .2s'}}>
              <Wand2 size={20}/> Create SuperAdPro Campaign
            </button>
            <button onClick={onCreateCustom}
              style={{display:'flex',alignItems:'center',gap:10,padding:'16px 32px',borderRadius:12,border:'2px solid rgba(52,211,153,.3)',cursor:'pointer',
                background:'rgba(16,185,129,.06)',color:'#34d399',fontSize:16,fontWeight:800,fontFamily:'inherit',
                transition:'all .2s'}}>
              <MessageCircle size={20}/> Train Custom AI Agent
            </button>
          </div>
        </div>
      </div>

      {/* Campaign list */}
      {campaigns.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
          {campaigns.map(function(c) {
            var statusColors = {active:{bg:'rgba(22,163,74,.08)',color:'#16a34a'},generating:{bg:'rgba(14,165,233,.08)',color:'#0ea5e9'},paused:{bg:'rgba(245,158,11,.08)',color:'#f59e0b'},failed:{bg:'rgba(239,68,68,.08)',color:'#ef4444'}};
            var sc = statusColors[c.status] || statusColors.active;
            return (
              <div key={c.id}
                style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',transition:'all .2s',boxShadow:'0 2px 12px rgba(0,0,0,.04)',cursor:'default'}}
                onMouseEnter={function(e) { e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.04)'; }}>
                <div style={{background:'#1c223d',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>{c.offer_name || c.niche}</span>
                    {c.campaign_type === 'custom' && <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:3,background:'rgba(14,165,233,.15)',color:'#38bdf8'}}>CUSTOM</span>}
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,background:sc.bg,color:sc.color,textTransform:'capitalize'}}>{c.status}</span>
                </div>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0ea5e9'}}>{c.link_clicks || 0}</div>
                      <div style={{fontSize:9,fontWeight:700,color:'#94a3b8'}}>CLICKS</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#16a34a'}}>{c.leads_count || 0}</div>
                      <div style={{fontSize:9,fontWeight:700,color:'#94a3b8'}}>LEADS</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#8b5cf6'}}>{c.conversions_count || 0}</div>
                      <div style={{fontSize:9,fontWeight:700,color:'#94a3b8'}}>CONVERTS</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'#94a3b8',marginBottom:12}}>Created {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={function(e){e.stopPropagation();onOpen(c.id);}} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'9px 0',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff'}}>
                      Open Campaign
                    </button>
                    <DeleteCampaignBtn id={c.id} onDelete={onDelete}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}>
          <div style={{fontSize:48,marginBottom:12,opacity:.3}}>🚀</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No campaigns yet</div>
          <div style={{fontSize:13,color:'#94a3b8',marginBottom:16}}>Create your first SuperSeller campaign and let AI build your sales pipeline</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SETUP WIZARD
// ══════════════════════════════════════════════════════════

function SetupWizard({ onComplete, onCancel }) {
  var [step, setStep] = useState(1);
  var [niche, setNiche] = useState('');
  var [customNiche, setCustomNiche] = useState('');
  var [audience, setAudience] = useState([]);
  var [customAudience, setCustomAudience] = useState('');
  var [tone, setTone] = useState('Professional');
  var [goal, setGoal] = useState('Lead Generation');
  var [generating, setGenerating] = useState(false);
  var [genStep, setGenStep] = useState('');
  var [error, setError] = useState('');

  function generate() {
    var finalNiche = niche === 'Other' ? customNiche : niche;
    if (!finalNiche) { setError('Please select a niche'); return; }
    setGenerating(true); setError('');

    var steps = ['Analyzing your niche...','Building your landing page...','Writing 30 social posts...','Crafting email sequence...','Creating video scripts...','Generating ad copy...','Building your strategy...','Finalizing your campaign...'];
    var si = 0;
    var interval = setInterval(function() { si++; if (si < steps.length) setGenStep(steps[si]); }, 4000);
    setGenStep(steps[0]);

    var audienceStr = audience.join(', ') + (customAudience ? ', ' + customAudience : '');

    apiPost('/api/superseller/create', {
      niche: finalNiche, audience: audienceStr, tone: tone, goal: goal,
    }).then(function(r) {
      if (!r.success) {
        clearInterval(interval);
        setError(r.error || 'Generation failed');
        setGenerating(false);
        return;
      }
      // Campaign created — poll until status is active or failed
      var campaignId = r.campaign_id;
      var pollCount = 0;
      var pollInterval = setInterval(function() {
        pollCount++;
        if (pollCount > 60) { // 5 min timeout
          clearInterval(pollInterval);
          clearInterval(interval);
          setError('Generation timed out. Please try again.');
          setGenerating(false);
          return;
        }
        apiGet('/api/superseller/campaign/' + campaignId).then(function(d) {
          if (d.status === 'active') {
            clearInterval(pollInterval);
            clearInterval(interval);
            onComplete(campaignId);
          } else if (d.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(interval);
            setError('Generation failed. Please try again.');
            setGenerating(false);
          }
        }).catch(function(){});
      }, 5000); // poll every 5 seconds
    }).catch(function(e) {
      clearInterval(interval);
      setError(e.message || 'Generation failed');
      setGenerating(false);
    });
  }

  if (generating) {
    return (
      <div style={{textAlign:'center',padding:'80px 20px'}}>
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',animation:'pulse 2s ease-in-out infinite'}}>
          <Sparkles size={28} color="#fff"/>
        </div>
        <h2 style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#0f172a',margin:'0 0 8px'}}>SuperSeller is building your campaign</h2>
        <p style={{fontSize:14,color:'#64748b',marginBottom:24}}>{genStep}</p>
        <div style={{width:200,height:4,background:'#e8ecf2',borderRadius:2,margin:'0 auto',overflow:'hidden'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg,#8b5cf6,#0ea5e9)',borderRadius:2,animation:'progress 30s linear'}}/>
        </div>
        <p style={{fontSize:11,color:'#94a3b8',marginTop:16}}>This usually takes 30-60 seconds</p>
        <style>{'@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}} @keyframes progress{0%{width:0%}100%{width:100%}}'}</style>
      </div>
    );
  }

  return (
    <div style={{maxWidth:700,margin:'0 auto'}}>
      {/* Progress bar */}
      <div style={{display:'flex',gap:4,marginBottom:24}}>
        {[1,2,3,4].map(function(s) {
          return <div key={s} style={{flex:1,height:4,borderRadius:2,background:s<=step?'#8b5cf6':'#e8ecf2',transition:'all .3s'}}/>;
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'#1c223d',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Wand2 size={16} color="#a78bfa"/>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>SuperSeller Setup — Step {step} of 4</span>
          </div>
          <button onClick={onCancel} style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
        </div>
        <div style={{padding:'28px'}}>
          {error && <div style={{padding:'10px 14px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca',marginBottom:16,fontSize:12,fontWeight:700,color:'#dc2626'}}>{error}</div>}

          {/* Step 1: Niche */}
          {step === 1 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>What's your niche?</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Choose the market you want to target. SuperSeller will create content tailored to this audience.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {NICHES.concat(['Other']).map(function(n) {
                  var on = niche === n;
                  return (
                    <button key={n} onClick={function() { setNiche(n); }}
                      style={{padding:'12px 10px',borderRadius:10,border:on?'2px solid #8b5cf6':'2px solid #e8ecf2',
                        background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',
                        fontSize:12,fontWeight:on?800:600,color:on?'#8b5cf6':'#64748b',transition:'all .15s',textAlign:'center'}}>
                      {n}
                    </button>
                  );
                })}
              </div>
              {niche === 'Other' && (
                <input value={customNiche} onChange={function(e) { setCustomNiche(e.target.value); }}
                  placeholder="Enter your niche..."
                  style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginTop:12,background:'#f8f9fb'}}/>
              )}
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Who's your target audience?</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Select one or more. The more specific, the better your content will perform.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {AUDIENCES.map(function(a) {
                  var on = audience.indexOf(a) >= 0;
                  return (
                    <button key={a} onClick={function() { setAudience(function(prev) { return on ? prev.filter(function(x){return x!==a;}) : prev.concat([a]); }); }}
                      style={{padding:'12px 14px',borderRadius:10,border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',
                        background:on?'rgba(14,165,233,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',
                        fontSize:12,fontWeight:on?700:500,color:on?'#0ea5e9':'#64748b',transition:'all .15s',textAlign:'left'}}>
                      {on ? '✓ ' : ''}{a}
                    </button>
                  );
                })}
              </div>
              <input value={customAudience} onChange={function(e) { setCustomAudience(e.target.value); }}
                placeholder="Add custom audience description (optional)..."
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginTop:12,background:'#f8f9fb'}}/>
            </div>
          )}

          {/* Step 3: Tone */}
          {step === 3 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>What tone should your content use?</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>This sets the voice for all your posts, emails, and scripts.</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {TONES.map(function(t) {
                  var on = tone === t;
                  return (
                    <button key={t} onClick={function() { setTone(t); }}
                      style={{padding:'16px 18px',borderRadius:10,border:on?'2px solid #8b5cf6':'2px solid #e8ecf2',
                        background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',
                        fontSize:14,fontWeight:on?800:500,color:on?'#8b5cf6':'#475569',transition:'all .15s',textAlign:'left'}}>
                      {on ? '● ' : '○ '}{t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Goal + Generate */}
          {step === 4 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>What's your primary goal?</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>This shapes the CTA strategy across all your content.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:24}}>
                {GOALS.map(function(g) {
                  var on = goal === g;
                  var icons = {'Lead Generation': Target, 'Direct Sales': Zap, 'Affiliate Recruitment': Users, 'Brand Awareness': Globe};
                  var Icon = icons[g] || Target;
                  return (
                    <button key={g} onClick={function() { setGoal(g); }}
                      style={{padding:'18px 16px',borderRadius:10,border:on?'2px solid #8b5cf6':'2px solid #e8ecf2',
                        background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',
                        fontSize:13,fontWeight:on?800:500,color:on?'#8b5cf6':'#475569',transition:'all .15s',textAlign:'center',
                        display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                      <Icon size={20} color={on?'#8b5cf6':'#94a3b8'}/>
                      {g}
                    </button>
                  );
                })}
              </div>

              {/* Summary */}
              <div style={{padding:'16px',background:'#f8f9fb',borderRadius:10,border:'1px solid #e8ecf2',marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Campaign Summary</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12}}>
                  <div><span style={{fontWeight:700,color:'#0f172a'}}>Niche:</span> <span style={{color:'#64748b'}}>{niche === 'Other' ? customNiche : niche}</span></div>
                  <div><span style={{fontWeight:700,color:'#0f172a'}}>Tone:</span> <span style={{color:'#64748b'}}>{tone}</span></div>
                  <div><span style={{fontWeight:700,color:'#0f172a'}}>Audience:</span> <span style={{color:'#64748b'}}>{audience.length > 0 ? audience.join(', ') : 'General'}</span></div>
                  <div><span style={{fontWeight:700,color:'#0f172a'}}>Goal:</span> <span style={{color:'#64748b'}}>{goal}</span></div>
                </div>
              </div>

              <div style={{fontSize:11,color:'#94a3b8',marginBottom:12}}>SuperSeller will generate: landing page, 30 social posts, 5-email sequence, 3 video scripts, ad copy, and a 30-day strategy document.</div>
            </div>
          )}

          {/* Navigation */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}>
            <button onClick={function() { if (step > 1) setStep(step - 1); else onCancel(); }}
              style={{padding:'10px 20px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:'#64748b'}}>
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
            {step < 4 ? (
              <button onClick={function() { if (step === 1 && !niche && !customNiche) { setError('Please select a niche'); return; } setError(''); setStep(step + 1); }}
                style={{display:'flex',alignItems:'center',gap:4,padding:'10px 24px',borderRadius:8,border:'none',cursor:'pointer',
                  background:'#8b5cf6',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:800}}>
                Next <ChevronRight size={14}/>
              </button>
            ) : (
              <button onClick={generate}
                style={{display:'flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:10,border:'none',cursor:'pointer',
                  background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontFamily:'inherit',fontSize:14,fontWeight:800,
                  boxShadow:'0 4px 16px rgba(139,92,246,.3)'}}>
                <Wand2 size={16}/> Generate My Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CUSTOM AI AGENT WIZARD
// ══════════════════════════════════════════════════════════

function CustomAgentWizard({ onComplete, onCancel }) {
  var [step, setStep] = useState(1);
  var [form, setForm] = useState({
    offer_name:'', offer_url:'', offer_description:'', offer_pricing:'',
    offer_benefits:'', offer_objections:'', offer_extra_context:'',
    agent_name:'AI Assistant', agent_greeting:'', tone:'Professional', niche:'',
  });
  var [creating, setCreating] = useState(false);
  var [error, setError] = useState('');

  function upd(field) { return function(e) { setForm(function(f) { var n=Object.assign({},f); n[field]=e.target.value; return n; }); }; }

  function create() {
    if (!form.offer_name) { setError('Offer name is required'); return; }
    if (!form.offer_url) { setError('Offer URL is required'); return; }
    if (!form.offer_description) { setError('Please describe what the offer is'); return; }
    setCreating(true); setError('');
    apiPost('/api/superseller/create-custom-agent', form).then(function(r) {
      if (r.success) onComplete(r.campaign_id);
      else { setError(r.error || 'Failed'); setCreating(false); }
    }).catch(function(e) { setError(e.message); setCreating(false); });
  }

  if (creating) {
    return (
      <div style={{textAlign:'center',padding:'80px 20px'}}>
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <MessageCircle size={28} color="#fff"/>
        </div>
        <h2 style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#0f172a',margin:'0 0 8px'}}>Creating your AI Sales Agent</h2>
        <p style={{fontSize:14,color:'#64748b'}}>Training on your offer details...</p>
      </div>
    );
  }

  var inputStyle = {width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'};
  var textareaStyle = Object.assign({}, inputStyle, {minHeight:100,resize:'vertical'});
  var labelStyle = {fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:6,display:'block'};

  return (
    <div style={{maxWidth:700,margin:'0 auto'}}>
      <div style={{display:'flex',gap:4,marginBottom:24}}>
        {[1,2,3].map(function(s) {
          return <div key={s} style={{flex:1,height:4,borderRadius:2,background:s<=step?'#0ea5e9':'#e8ecf2',transition:'all .3s'}}/>;
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'linear-gradient(135deg,#0c1e4a,#1c223d)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <MessageCircle size={16} color="#38bdf8"/>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Custom AI Agent — Step {step} of 3</span>
          </div>
          <button onClick={onCancel} style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
        </div>
        <div style={{padding:28}}>
          {error && <div style={{padding:'10px 14px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca',marginBottom:16,fontSize:12,fontWeight:700,color:'#dc2626'}}>{error}</div>}

          {/* Step 1: Offer Details */}
          {step === 1 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Tell us about the offer</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>The AI agent will be trained on everything you provide here. The more detail, the better it sells.</p>

              <label style={labelStyle}>Offer Name *</label>
              <input value={form.offer_name} onChange={upd('offer_name')} placeholder="e.g. Crypto Mastery Course, FitLife Pro, SaaS Analytics Tool" style={Object.assign({},inputStyle,{marginBottom:14})}/>

              <label style={labelStyle}>Offer URL (Your Affiliate Link) *</label>
              <input value={form.offer_url} onChange={upd('offer_url')} placeholder="https://example.com/your-affiliate-link" style={Object.assign({},inputStyle,{marginBottom:14})}/>

              <label style={labelStyle}>What does this offer do? *</label>
              <textarea value={form.offer_description} onChange={upd('offer_description')} placeholder="Describe the product/service in detail. What problem does it solve? What do customers get? The AI will use this to answer prospect questions." style={Object.assign({},textareaStyle,{marginBottom:14})}/>

              <label style={labelStyle}>Pricing</label>
              <input value={form.offer_pricing} onChange={upd('offer_pricing')} placeholder="e.g. $97 one-time, $29/month, Free trial then $49/mo" style={inputStyle}/>
            </div>
          )}

          {/* Step 2: Benefits & Objections */}
          {step === 2 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Benefits & Objections</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Help your AI agent sell effectively by listing the key benefits and common objections it should handle.</p>

              <label style={labelStyle}>Key Benefits (what makes this offer great?)</label>
              <textarea value={form.offer_benefits} onChange={upd('offer_benefits')} placeholder={"List the main benefits, one per line:\n• Proven step-by-step system\n• Access to private community\n• 30-day money back guarantee\n• Works for complete beginners"} style={Object.assign({},textareaStyle,{marginBottom:14})}/>

              <label style={labelStyle}>Common Objections & How to Handle Them</label>
              <textarea value={form.offer_objections} onChange={upd('offer_objections')} placeholder={"What do prospects usually worry about? How should the AI respond?\n\n• 'Is this a scam?' → Explain the product value and guarantee\n• 'Too expensive' → Break down the ROI and what's included\n• 'Will it work for me?' → Highlight the beginner-friendly approach"} style={Object.assign({},textareaStyle,{marginBottom:14})}/>

              <label style={labelStyle}>Any Extra Context (optional)</label>
              <textarea value={form.offer_extra_context} onChange={upd('offer_extra_context')} placeholder="Anything else the AI should know — company history, testimonials, special offers, limited-time deals, etc." style={textareaStyle}/>
            </div>
          )}

          {/* Step 3: Agent Personality */}
          {step === 3 && (
            <div>
              <h3 style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Customize Your Agent</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Give your agent a personality that matches your brand.</p>

              <label style={labelStyle}>Agent Name</label>
              <input value={form.agent_name} onChange={upd('agent_name')} placeholder="e.g. CryptoBot, FitCoach, SalesHelper" style={Object.assign({},inputStyle,{marginBottom:14})}/>

              <label style={labelStyle}>Welcome Message</label>
              <textarea value={form.agent_greeting} onChange={upd('agent_greeting')} placeholder={"Leave blank for auto-generated, or write your own:\ne.g. 'Hey! 👋 Curious about Crypto Mastery? I can answer any questions — ask me anything!'"} style={Object.assign({},textareaStyle,{marginBottom:14})}/>

              <label style={labelStyle}>Tone</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:20}}>
                {['Professional','Casual & Friendly','Inspirational','Urgent & Direct','Educational'].map(function(t) {
                  var on = form.tone === t;
                  return (
                    <button key={t} onClick={function() { setForm(function(f) { return Object.assign({},f,{tone:t}); }); }}
                      style={{padding:'10px',borderRadius:8,border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',
                        background:on?'rgba(14,165,233,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',
                        fontSize:12,fontWeight:on?800:500,color:on?'#0ea5e9':'#64748b',transition:'all .15s'}}>
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Preview card */}
              <div style={{padding:16,background:'#f0f3f9',borderRadius:12,border:'1px solid #e8ecf2'}}>
                <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Agent Preview</div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MessageCircle size={14} color="#fff"/>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{form.agent_name || 'AI Assistant'}</div>
                    <div style={{fontSize:10,color:'#16a34a',display:'flex',alignItems:'center',gap:3}}>
                      <span style={{width:5,height:5,borderRadius:'50%',background:'#16a34a',display:'inline-block'}}/>Online
                    </div>
                  </div>
                </div>
                <div style={{padding:'10px 14px',background:'#fff',borderRadius:10,borderBottomLeftRadius:4,fontSize:12,color:'#334155',lineHeight:1.6,border:'1px solid #e8ecf2'}}>
                  {form.agent_greeting || ('Hi! 👋 I\'m here to answer any questions about ' + (form.offer_name || 'this offer') + '. What would you like to know?')}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}>
            <button onClick={function() { if (step > 1) setStep(step - 1); else onCancel(); }}
              style={{padding:'10px 20px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:'#64748b'}}>
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
            {step < 3 ? (
              <button onClick={function() {
                if (step === 1 && !form.offer_name) { setError('Offer name is required'); return; }
                if (step === 1 && !form.offer_url) { setError('Offer URL is required'); return; }
                if (step === 1 && !form.offer_description) { setError('Please describe the offer'); return; }
                setError(''); setStep(step + 1);
              }}
                style={{display:'flex',alignItems:'center',gap:4,padding:'10px 24px',borderRadius:8,border:'none',cursor:'pointer',
                  background:'#0ea5e9',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:800}}>
                Next <ChevronRight size={14}/>
              </button>
            ) : (
              <button onClick={create}
                style={{display:'flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:10,border:'none',cursor:'pointer',
                  background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontFamily:'inherit',fontSize:14,fontWeight:800,
                  boxShadow:'0 4px 16px rgba(14,165,233,.3)'}}>
                <Sparkles size={16}/> Create AI Agent
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// CAMPAIGN DASHBOARD
// ══════════════════════════════════════════════════════════

function CampaignDashboard({ campaign, onBack, onRefresh }) {
  var [copied, setCopied] = useState(false);
  var [regenLoading, setRegenLoading] = useState(false);
  var [deleteConfirm, setDeleteConfirm] = useState(false);
  var c = campaign;

  var shareUrl = c.tracked_url || c.funnel_url || '';
  var landingUrl = c.landing_page_url || (window.location.origin + '/superseller/page/' + c.id);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  function regenLanding() {
    setRegenLoading(true);
    apiPost('/api/superseller/regenerate-landing/' + c.id, {}).then(function() {
      setRegenLoading(false);
      if (onRefresh) onRefresh();
    }).catch(function(){ setRegenLoading(false); });
  }

  var isCustom = c.campaign_type === 'custom';
  var tabs = isCustom ? [
    {key:'agent',label:'AI Sales Agent',icon:MessageCircle},
  ] : [
    {key:'landing',label:'Landing Page',icon:Layout},
    {key:'calendar',label:'Content Calendar',icon:Calendar},
    {key:'emails',label:'Email Sequence',icon:Mail},
    {key:'videos',label:'Video Scripts',icon:Film},
    {key:'ads',label:'Ad Copy',icon:FileText},
    {key:'strategy',label:'Strategy',icon:BarChart3},
    {key:'agent',label:'AI Sales Agent',icon:MessageCircle},
  ];

  var [tab, setTab] = useState(isCustom ? 'agent' : 'landing');

  return (
    <div>
      {/* Back + header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:700,color:'#64748b',background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,cursor:'pointer',fontFamily:'inherit',padding:'8px 16px',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
          ← Back
        </button>
        <div style={{display:'flex',gap:8}}>
          <a href={landingUrl} target="_blank" rel="noopener noreferrer"
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',textDecoration:'none',fontSize:12,fontWeight:700,color:'#475569',cursor:'pointer'}}>
            <ExternalLink size={13}/> View Page
          </a>
          {!isCustom && (
            <button onClick={regenLanding} disabled={regenLoading}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #ddd6fe',background:'#faf5ff',fontSize:12,fontWeight:700,color:'#7c3aed',cursor:regenLoading?'default':'pointer',fontFamily:'inherit',opacity:regenLoading?.6:1}}>
              <RefreshCcw size={13} style={{animation:regenLoading?'spin .8s linear infinite':'none'}}/> {regenLoading?'Regenerating...':'Regen Page'}
            </button>
          )}
        </div>
      </div>

      {/* Funnel link banner */}
      <div style={{background:'linear-gradient(135deg,#1c223d,#0f172a)',borderRadius:14,padding:'18px 24px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#a78bfa',marginBottom:4}}>{isCustom?'Your Offer Link':'Your SuperSeller Funnel Link'}</div>
          <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.55)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shareUrl}</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button onClick={copyLink} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:9,border:'none',cursor:'pointer',background:copied?'#16a34a':'#8b5cf6',color:'#fff',fontSize:12,fontWeight:800,fontFamily:'inherit',transition:'all .2s',whiteSpace:'nowrap'}}>
            {copied?<><Check size={13}/> Copied!</>:<><Copy size={13}/> Copy Link</>}
          </button>
          <a href={'https://wa.me/?text='+encodeURIComponent('Check this out: '+shareUrl)} target="_blank" rel="noopener noreferrer"
            style={{display:'flex',alignItems:'center',gap:5,padding:'10px 16px',borderRadius:9,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.7)',textDecoration:'none',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>
            <Share2 size={13}/> Share
          </a>
        </div>
      </div>

      {/* Stats row — bold gradient cards */}
      <style>{`.ss-stat{transition:transform .2s ease}.ss-stat:hover{transform:translateY(-3px)}@keyframes ssSpin{to{transform:rotate(360deg)}}@keyframes ssCount{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {value:c.link_clicks||0,label:'Link Clicks',sub:'all time',grad:'linear-gradient(135deg,#0284c7,#38bdf8)',shadow:'rgba(14,165,233,.4)',emoji:'🔗'},
          {value:c.page_views||0,label:'Page Views',sub:'total',grad:'linear-gradient(135deg,#4338ca,#818cf8)',shadow:'rgba(99,102,241,.4)',emoji:'👁️'},
          {value:c.leads_count||0,label:'Leads',sub:'captured',grad:'linear-gradient(135deg,#065f46,#34d399)',shadow:'rgba(16,185,129,.4)',emoji:'🎯'},
          {value:c.conversions_count||0,label:'Conversions',sub:'total',grad:'linear-gradient(135deg,#6d28d9,#a78bfa)',shadow:'rgba(139,92,246,.4)',emoji:'💰'},
        ].map(function(s,i) {
          return (
            <div key={i} className="ss-stat" style={{borderRadius:14,padding:'16px 14px',position:'relative',overflow:'hidden',background:s.grad,boxShadow:'0 6px 20px '+s.shadow}}>
              <div style={{position:'absolute',right:8,top:8,fontSize:22,opacity:.2,pointerEvents:'none',userSelect:'none'}}>{s.emoji}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:900,color:'#fff',lineHeight:1,animation:'ssCount .5s ease both',animationDelay:i*.08+'s',textShadow:'0 2px 6px rgba(0,0,0,.15)'}}>{s.value}</div>
              <div style={{fontSize:13,fontWeight:800,color:'rgba(255,255,255,.9)',marginTop:4}}>{s.label}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.55)',fontWeight:600,textTransform:'uppercase',letterSpacing:.6,marginTop:1}}>{s.sub}</div>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'rgba(255,255,255,.25)'}}/>
            </div>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'2px solid #e8ecf2',paddingBottom:0}}>
        {tabs.map(function(t) {
          var Icon = t.icon;
          var on = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              style={{display:'flex',alignItems:'center',gap:5,padding:'10px 16px',fontSize:12,fontWeight:on?800:600,
                border:'none',borderBottom:on?'3px solid #8b5cf6':'3px solid transparent',
                cursor:'pointer',fontFamily:'inherit',background:on?'rgba(139,92,246,.04)':'transparent',
                color:on?'#8b5cf6':'#94a3b8',marginBottom:-2,borderRadius:'6px 6px 0 0',transition:'all .15s'}}>
              <Icon size={13}/>{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'landing' && <LandingPageTab campaign={c} landingUrl={landingUrl} onRegen={regenLanding} regenLoading={regenLoading} onRefresh={onRefresh}/>}
      {tab === 'calendar' && <CalendarTab posts={c.social_posts} funnel={c.funnel_url} created={c.created_at}/>}
      {tab === 'emails' && <EmailsTab emails={c.email_sequence}/>}
      {tab === 'videos' && <VideosTab scripts={c.video_scripts}/>}
      {tab === 'ads' && <AdsTab ads={c.ad_copy}/>}
      {tab === 'strategy' && <StrategyTab strategy={c.strategy}/>}
      {tab === 'agent' && <AgentTab campaignId={c.id} funnelUrl={c.funnel_url}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB COMPONENTS
// ══════════════════════════════════════════════════════════

function CalendarTab({ posts, funnel, created }) {
  var [copiedIdx, setCopiedIdx] = useState(-1);
  var allPosts = Array.isArray(posts) ? posts : [];

  var daysActive = created ? Math.floor((Date.now() - new Date(created).getTime()) / 86400000) + 1 : 1;
  var today = Math.min(daysActive, 30);

  function copyPost(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(function() { setCopiedIdx(-1); }, 2000);
  }

  var platformColors = {facebook:'#1877f2',instagram:'#e4405f',x:'#0f172a',linkedin:'#0a66c2',tiktok:'#010101'};

  return (
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{background:'#1c223d',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>30-Day Content Calendar</div>
        <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>Day {today} of 30</div>
      </div>
      <div style={{maxHeight:600,overflowY:'auto'}}>
        {allPosts.length > 0 ? allPosts.map(function(p, i) {
          var isToday = p.day === today;
          var pc = platformColors[(p.platform||'').toLowerCase()] || '#64748b';
          return (
            <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f5f6f8',background:isToday?'rgba(139,92,246,.03)':'transparent'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {isToday && <span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:3,background:'#8b5cf6',color:'#fff'}}>TODAY</span>}
                  <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>Day {p.day}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,background:pc+'12',color:pc,textTransform:'capitalize',border:'1px solid '+pc+'20'}}>{p.platform}</span>
                  {p.type && <span style={{fontSize:9,fontWeight:600,color:'#94a3b8'}}>{p.type}</span>}
                </div>
                <button onClick={function() { copyPost(p.content + (p.hashtags ? '\n\n' + p.hashtags : ''), i); }}
                  style={{display:'flex',alignItems:'center',gap:3,fontSize:10,fontWeight:700,color:copiedIdx===i?'#16a34a':'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                  {copiedIdx===i ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
                </button>
              </div>
              <div style={{fontSize:13,color:'#334155',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{p.content}</div>
              {p.hashtags && <div style={{fontSize:11,color:'#0ea5e9',marginTop:4}}>{p.hashtags}</div>}
            </div>
          );
        }) : <div style={{padding:'40px 20px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Generating social posts...</div>}
      </div>
    </div>
  );
}

function LandingPageTab({ campaign, landingUrl, onRegen, regenLoading, onRefresh }) {
  var [copied, setCopied] = useState(false);
  var [editing, setEditing] = useState(false);
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);
  var [fields, setFields] = useState({
    custom_video_url: campaign.custom_video_url || '',
    custom_headline: campaign.custom_headline || '',
    custom_subtitle: campaign.custom_subtitle || '',
    custom_cta_text: campaign.custom_cta_text || '',
    custom_cta_color: campaign.custom_cta_color || '',
    custom_html_inject: campaign.custom_html_inject || '',
  });
  var pageUrl = landingUrl || (window.location.origin + '/superseller/page/' + campaign.id);
  var previewUrl = pageUrl + '?t=' + Date.now();

  function copyUrl() {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(function(){setCopied(false);}, 2000);
  }

  function updateField(key, val) {
    setFields(function(p) { var n = Object.assign({}, p); n[key] = val; return n; });
    setSaved(false);
  }

  function saveCustomizations() {
    setSaving(true);
    fetch('/api/superseller/page-customizations/' + campaign.id, {
      method: 'POST', credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(fields),
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        setSaving(false);
        if (data.success) {
          setSaved(true);
          setTimeout(function(){ setSaved(false); }, 3000);
          if (onRefresh) onRefresh();
        }
      }).catch(function() { setSaving(false); });
  }

  // Detect video type for preview
  function getVideoPreview(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return {type:'youtube',id:yt[1]};
    var vim = url.match(/vimeo\.com\/(\d+)/);
    if (vim) return {type:'vimeo',id:vim[1]};
    if (url.toLowerCase().endsWith('.mp4')) return {type:'mp4',url:url};
    return null;
  }

  var hasCustomizations = fields.custom_video_url || fields.custom_headline || fields.custom_subtitle || fields.custom_cta_text || fields.custom_cta_color || fields.custom_html_inject;

  var inputStyle = {width:'100%',padding:'10px 14px',borderRadius:9,border:'1.5px solid #e2e8f0',background:'#f8fafc',color:'#0f172a',fontSize:13,fontFamily:'inherit',fontWeight:500,boxSizing:'border-box',outline:'none',transition:'border-color .15s'};
  var labelStyle = {fontSize:11,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:.8,marginBottom:5,display:'flex',alignItems:'center',gap:6};
  var sectionStyle = {marginBottom:16};

  return (
    <div>
      {/* URL bar */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'16px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:12,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#94a3b8',marginBottom:4}}>Live Landing Page URL</div>
          <div style={{fontSize:13,fontWeight:600,color:'#0ea5e9',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pageUrl}</div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button onClick={copyUrl} style={{display:'flex',alignItems:'center',gap:5,padding:'9px 16px',borderRadius:8,border:'1px solid #bae6fd',background:'#f0f9ff',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#0284c7',transition:'all .15s'}}>
            {copied?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy URL</>}
          </button>
          <a href={pageUrl} target="_blank" rel="noopener noreferrer"
            style={{display:'flex',alignItems:'center',gap:5,padding:'9px 16px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',textDecoration:'none',fontSize:12,fontWeight:700,color:'#475569'}}>
            <ExternalLink size={12}/> Open
          </a>
          <button onClick={function(){setEditing(!editing);}} style={{display:'flex',alignItems:'center',gap:5,padding:'9px 16px',borderRadius:8,border:editing?'1.5px solid #8b5cf6':'1px solid #ddd6fe',background:editing?'#8b5cf6':'#faf5ff',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:editing?'#fff':'#7c3aed',transition:'all .2s'}}>
            <Wand2 size={12}/> {editing?'Close Editor':'Edit Page'}
          </button>
          <button onClick={onRegen} disabled={regenLoading}
            style={{display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',cursor:regenLoading?'default':'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#64748b',opacity:regenLoading?.6:1}}>
            <RefreshCcw size={12} style={{animation:regenLoading?'ssSpin .8s linear infinite':'none'}}/> {regenLoading?'Working...':'Regen'}
          </button>
        </div>
      </div>

      {/* Editor + Preview side by side */}
      {editing ? (
        <div style={{display:'grid',gridTemplateColumns:'380px 1fr',gap:16,alignItems:'start'}}>
          {/* Editor Panel */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'20px',boxShadow:'0 4px 20px rgba(0,0,0,.06)',position:'sticky',top:16}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:4}}>Page Editor</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:20}}>Customise your landing page. Changes apply to the live page instantly on save.</div>

            {/* Video URL */}
            <div style={sectionStyle}>
              <div style={labelStyle}><Play size={12} color="#8b5cf6"/> Sales Video</div>
              <input value={fields.custom_video_url} onChange={function(e){updateField('custom_video_url',e.target.value);}}
                placeholder="YouTube, Vimeo, or .mp4 URL" style={inputStyle}
                onFocus={function(e){e.target.style.borderColor='#8b5cf6';}}
                onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
              {fields.custom_video_url && (function(){
                var vp = getVideoPreview(fields.custom_video_url);
                if (!vp) return <div style={{fontSize:11,color:'#ef4444',marginTop:4}}>Must be YouTube, Vimeo, or .mp4 URL</div>;
                return <div style={{fontSize:11,color:'#16a34a',marginTop:4}}>✓ {vp.type === 'youtube' ? 'YouTube' : vp.type === 'vimeo' ? 'Vimeo' : 'MP4'} video detected — will appear in hero section</div>;
              })()}
            </div>

            {/* Headline */}
            <div style={sectionStyle}>
              <div style={labelStyle}><FileText size={12} color="#0ea5e9"/> Custom Headline</div>
              <input value={fields.custom_headline} onChange={function(e){updateField('custom_headline',e.target.value);}}
                placeholder="Override the main headline" style={inputStyle} maxLength={300}
                onFocus={function(e){e.target.style.borderColor='#8b5cf6';}}
                onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
              <div style={{fontSize:10,color:'#cbd5e1',marginTop:3,textAlign:'right'}}>{fields.custom_headline.length}/300</div>
            </div>

            {/* Subtitle */}
            <div style={sectionStyle}>
              <div style={labelStyle}><FileText size={12} color="#0ea5e9"/> Custom Subtitle</div>
              <textarea value={fields.custom_subtitle} onChange={function(e){updateField('custom_subtitle',e.target.value);}}
                placeholder="Override the subtitle/description" rows={3}
                style={Object.assign({},inputStyle,{resize:'vertical',minHeight:60})} maxLength={1000}
                onFocus={function(e){e.target.style.borderColor='#8b5cf6';}}
                onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
            </div>

            {/* CTA Text */}
            <div style={sectionStyle}>
              <div style={labelStyle}><Target size={12} color="#f59e0b"/> CTA Button Text</div>
              <input value={fields.custom_cta_text} onChange={function(e){updateField('custom_cta_text',e.target.value);}}
                placeholder='e.g. "Start Your Journey →"' style={inputStyle} maxLength={100}
                onFocus={function(e){e.target.style.borderColor='#8b5cf6';}}
                onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
            </div>

            {/* CTA Colour */}
            <div style={sectionStyle}>
              <div style={labelStyle}><Sparkles size={12} color="#ec4899"/> CTA Button Colour</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={fields.custom_cta_color || '#38bdf8'}
                  onChange={function(e){updateField('custom_cta_color',e.target.value);}}
                  style={{width:44,height:38,padding:0,border:'2px solid #e2e8f0',borderRadius:8,cursor:'pointer',background:'none'}}/>
                <input value={fields.custom_cta_color} onChange={function(e){updateField('custom_cta_color',e.target.value);}}
                  placeholder="#38bdf8" style={Object.assign({},inputStyle,{flex:1})} maxLength={20}
                  onFocus={function(e){e.target.style.borderColor='#8b5cf6';}}
                  onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
                {fields.custom_cta_color && (
                  <button onClick={function(){updateField('custom_cta_color','');}} style={{fontSize:10,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>Reset</button>
                )}
              </div>
            </div>

            {/* Custom HTML */}
            <div style={sectionStyle}>
              <div style={labelStyle}><Globe size={12} color="#64748b"/> Custom HTML / Tracking</div>
              <textarea value={fields.custom_html_inject} onChange={function(e){updateField('custom_html_inject',e.target.value);}}
                placeholder="Paste tracking pixels, scripts, or custom HTML here. Injected before </body>." rows={3}
                style={Object.assign({},inputStyle,{resize:'vertical',minHeight:60,fontFamily:'monospace',fontSize:11})} maxLength={5000}
                onFocus={function(e){e.target.style.borderColor='#8b5cf6';}}
                onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
              <div style={{fontSize:10,color:'#cbd5e1',marginTop:3}}>Facebook Pixel, Google Analytics, etc.</div>
            </div>

            {/* Save button */}
            <button onClick={saveCustomizations} disabled={saving}
              style={{width:'100%',padding:'13px',borderRadius:10,border:'none',cursor:saving?'default':'pointer',fontFamily:'inherit',fontSize:14,fontWeight:800,
                background:saved?'#16a34a':saving?'#94a3b8':'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                color:'#fff',boxShadow:saved?'none':'0 4px 16px rgba(139,92,246,.3)',transition:'all .2s',marginBottom:8}}>
              {saved ? '✓ Saved — Live on Your Page!' : saving ? 'Saving...' : 'Save & Apply Changes'}
            </button>

            {hasCustomizations && (
              <div style={{fontSize:11,color:'#64748b',textAlign:'center',lineHeight:1.5}}>
                Changes are applied in real-time to your live landing page when you save.
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
            <div style={{background:'#1c223d',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',gap:5}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#22c55e'}}/>
              </div>
              <div style={{flex:1,background:'rgba(255,255,255,.08)',borderRadius:4,padding:'3px 10px',fontSize:11,color:'rgba(255,255,255,.4)',fontFamily:'monospace'}}>{pageUrl}</div>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)'}}>LIVE PREVIEW</div>
            </div>
            <iframe
              key={saved ? previewUrl : pageUrl}
              src={saved ? previewUrl : pageUrl}
              style={{width:'100%',height:700,border:'none',display:'block'}}
              title="Landing Page Preview"
            />
          </div>
        </div>
      ) : (
        /* Normal preview (no editor) */
        campaign.landing_page_html ? (
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
            <div style={{background:'#1c223d',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',gap:5}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#22c55e'}}/>
              </div>
              <div style={{flex:1,background:'rgba(255,255,255,.08)',borderRadius:4,padding:'3px 10px',fontSize:11,color:'rgba(255,255,255,.4)',fontFamily:'monospace'}}>{pageUrl}</div>
            </div>
            <iframe
              src={pageUrl}
              style={{width:'100%',height:600,border:'none',display:'block'}}
              title="Landing Page Preview"
            />
          </div>
        ) : (
          <div style={{background:'#fff',border:'2px dashed #e8ecf2',borderRadius:14,padding:'60px 20px',textAlign:'center'}}>
            <Layout size={40} color="#cbd5e1" style={{marginBottom:12}}/>
            <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:6}}>Landing page not yet generated</div>
            <div style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Click below to generate one now.</div>
            <button onClick={onRegen} disabled={regenLoading}
              style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:10,border:'none',cursor:regenLoading?'default':'pointer',fontFamily:'inherit',fontSize:14,fontWeight:800,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',boxShadow:'0 4px 16px rgba(139,92,246,.3)',opacity:regenLoading?.6:1}}>
              <Wand2 size={16}/> {regenLoading?'Generating...':'Generate Landing Page'}
            </button>
          </div>
        )
      )}
    </div>
  );
}

function EmailsTab({ emails }) {
  var [expanded, setExpanded] = useState(0);
  var allEmails = Array.isArray(emails) ? emails : [];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {allEmails.map(function(e, i) {
        var isOpen = expanded === i;
        return (
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden'}}>
            <div onClick={function() { setExpanded(isOpen ? -1 : i); }}
              style={{padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',background:isOpen?'#1c223d':'#f8f9fb'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Mail size={14} color={isOpen?'#a78bfa':'#94a3b8'}/>
                <span style={{fontSize:13,fontWeight:800,color:isOpen?'#fff':'#0f172a'}}>Email {e.email_num || i+1}: {e.subject}</span>
              </div>
              <span style={{fontSize:10,fontWeight:600,color:isOpen?'rgba(255,255,255,.4)':'#94a3b8'}}>Day {e.delay_days || i*2}</span>
            </div>
            {isOpen && (
              <div style={{padding:'18px',fontSize:13,color:'#334155',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{(e.body || e.content || '').replace(/<[^>]*>/g, '')}</div>
            )}
          </div>
        );
      })}
      {allEmails.length === 0 && <div style={{padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Generating email sequence...</div>}
    </div>
  );
}

function VideosTab({ scripts }) {
  var allScripts = Array.isArray(scripts) ? scripts : [];
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
      {allScripts.map(function(v, i) {
        var colors = ['#0ea5e9','#8b5cf6','#16a34a'];
        return (
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden'}}>
            <div style={{background:colors[i%3],padding:'18px 16px',textAlign:'center'}}>
              <Film size={24} color="#fff"/>
              <div style={{fontSize:13,fontWeight:800,color:'#fff',marginTop:6}}>{v.duration || v.title}</div>
            </div>
            <div style={{padding:'16px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Hook</div>
              <div style={{fontSize:12,color:'#0f172a',fontWeight:700,marginBottom:12,lineHeight:1.5}}>{v.hook}</div>
              <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Script</div>
              <div style={{fontSize:12,color:'#475569',lineHeight:1.7,marginBottom:12,whiteSpace:'pre-wrap'}}>{v.body}</div>
              <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>CTA</div>
              <div style={{fontSize:12,color:'#8b5cf6',fontWeight:700}}>{v.cta}</div>
            </div>
          </div>
        );
      })}
      {allScripts.length === 0 && <div style={{gridColumn:'1/-1',padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Generating video scripts...</div>}
    </div>
  );
}

function AdsTab({ ads }) {
  var allAds = Array.isArray(ads) ? ads : [];
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
      {allAds.map(function(a, i) {
        var pColors = {facebook:'#1877f2',instagram:'#e4405f',google:'#4285f4'};
        var color = pColors[(a.platform||'').toLowerCase()] || '#64748b';
        return (
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden'}}>
            <div style={{background:color,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#fff',textTransform:'capitalize'}}>{a.platform}</div>
            </div>
            <div style={{padding:'16px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:8}}>{a.headline}</div>
              <div style={{fontSize:12,color:'#475569',lineHeight:1.7,marginBottom:12}}>{a.body}</div>
              <div style={{padding:'8px 14px',background:color+'12',borderRadius:6,textAlign:'center',fontSize:12,fontWeight:700,color:color}}>{a.cta_text || 'Learn More'}</div>
            </div>
          </div>
        );
      })}
      {allAds.length === 0 && <div style={{gridColumn:'1/-1',padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Generating ad copy...</div>}
    </div>
  );
}

function StrategyTab({ strategy }) {
  var s = strategy || {};
  var daily = Array.isArray(s.daily_plan) ? s.daily_plan : [];
  return (
    <div>
      {s.overview && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:14}}>
          <div style={{background:'#1c223d',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Strategy Overview</div>
          </div>
          <div style={{padding:'18px 20px',fontSize:13,color:'#334155',lineHeight:1.8}}>{s.overview}</div>
        </div>
      )}
      {daily.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 20px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>30-Day Action Plan</div>
          </div>
          <div style={{maxHeight:500,overflowY:'auto'}}>
            {daily.map(function(d, i) {
              return (
                <div key={i} style={{padding:'12px 20px',borderBottom:'1px solid #f5f6f8',display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{width:28,height:28,borderRadius:8,background:'rgba(139,92,246,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{d.day}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{d.task}</div>
                    {d.tip && <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{d.tip}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!s.overview && daily.length === 0 && <div style={{padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Generating strategy...</div>}
    </div>
  );
}

function AgentTab({ campaignId, funnelUrl }) {
  var [messages, setMessages] = useState([
    {role:'assistant', content:"Hi there! 👋 I'm the SuperAdPro assistant. I can answer any questions about the platform, tools, pricing, or how it all works. What would you like to know?"}
  ]);
  var [input, setInput] = useState('');
  var [sending, setSending] = useState(false);
  var [codeCopied, setCodeCopied] = useState(false);

  var embedCode = '<script src="' + window.location.origin + '/static/js/superseller-chat.js" data-campaign="' + campaignId + '"><\/script>';

  function send() {
    if (!input.trim() || sending) return;
    var msg = input.trim();
    setInput('');
    setMessages(function(prev) { return prev.concat([{role:'user', content:msg}]); });
    setSending(true);

    fetch('/api/superseller/chat/' + campaignId, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message:msg, history:messages}),
    }).then(function(r) { return r.json(); }).then(function(data) {
      setMessages(function(prev) { return prev.concat([{role:'assistant', content:data.reply || 'Sorry, try again.'}]); });
      setSending(false);
    }).catch(function() {
      setMessages(function(prev) { return prev.concat([{role:'assistant', content:'Had a hiccup — try again!'}]); });
      setSending(false);
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(embedCode);
    setCodeCopied(true);
    setTimeout(function() { setCodeCopied(false); }, 2000);
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
      {/* Left — Live test chat */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg,#1c223d,#0f172a)',padding:'14px 18px',display:'flex',alignItems:'center',gap:8}}>
          <MessageCircle size={16} color="#a78bfa"/>
          <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Test Your AI Sales Agent</span>
        </div>
        <div style={{height:340,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:8,background:'#f8f9fb'}}>
          {messages.map(function(m,i) {
            var isBot = m.role === 'assistant';
            return (
              <div key={i} style={{alignSelf:isBot?'flex-start':'flex-end',maxWidth:'85%',padding:'10px 14px',borderRadius:12,
                background:isBot?'#fff':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:isBot?'#334155':'#fff',
                border:isBot?'1px solid #e8ecf2':'none',fontSize:13,lineHeight:1.6,
                borderBottomLeftRadius:isBot?4:12,borderBottomRightRadius:isBot?12:4}}>
                {m.content}
              </div>
            );
          })}
          {sending && (
            <div style={{alignSelf:'flex-start',padding:'10px 14px',background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,borderBottomLeftRadius:4,display:'flex',gap:4}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#94a3b8',animation:'bounce .6s infinite'}}/>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#94a3b8',animation:'bounce .6s infinite .15s'}}/>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#94a3b8',animation:'bounce .6s infinite .3s'}}/>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8,padding:12,borderTop:'1px solid #e8ecf2'}}>
          <input value={input} onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter') send(); }}
            placeholder="Ask a question as a prospect would..."
            style={{flex:1,padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',fontFamily:'inherit'}}/>
          <button onClick={send} disabled={sending}
            style={{padding:'10px 18px',borderRadius:10,border:'none',background:'#8b5cf6',color:'#fff',fontSize:12,fontWeight:700,cursor:sending?'default':'pointer',fontFamily:'inherit',opacity:sending?0.5:1}}>
            Send
          </button>
        </div>
        <style>{'@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}'}</style>
      </div>

      {/* Right — Setup info and embed code */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 18px'}}>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>How the AI Agent Works</span>
          </div>
          <div style={{padding:'18px'}}>
            {[
              {icon:'💬',title:'24/7 Sales Conversations',desc:'The AI agent answers prospect questions instantly — pricing, features, how it works, objections — all trained on SuperAdPro.'},
              {icon:'🎯',title:'Tailored to Your Campaign',desc:'The agent knows your niche, audience, and funnel URL. It guides prospects naturally toward signing up through YOUR link.'},
              {icon:'🛡️',title:'Compliance Built In',desc:'Never makes income guarantees. Focuses on platform value and tools. Honest, helpful, and professional.'},
              {icon:'⚡',title:'Powered by Claude AI',desc:'Uses the same AI technology behind this platform — fast, accurate, and conversational.'},
            ].map(function(item,i) {
              return (
                <div key={i} style={{display:'flex',gap:12,marginBottom:i<3?14:0}}>
                  <div style={{fontSize:20,flexShrink:0}}>{item.icon}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:2}}>{item.title}</div>
                    <div style={{fontSize:12,color:'#64748b',lineHeight:1.6}}>{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
          <div style={{background:'#1c223d',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Embed Code</span>
            <button onClick={copyCode}
              style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:codeCopied?'#4ade80':'rgba(255,255,255,.5)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              {codeCopied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
            </button>
          </div>
          <div style={{padding:'14px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>Add this script to any webpage to enable the AI chatbot:</div>
            <div style={{padding:'12px',background:'#0f172a',borderRadius:8,fontFamily:'monospace',fontSize:11,color:'#38bdf8',lineHeight:1.6,wordBreak:'break-all'}}>
              {embedCode}
            </div>
            <div style={{fontSize:10,color:'#94a3b8',marginTop:8}}>The chatbot automatically appears as a floating bubble on the bottom-right of the page. It's already active on your join funnel link.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
