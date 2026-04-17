import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Zap, Info, TrendingUp, ArrowUpRight } from 'lucide-react';
import { formatMoney } from '../utils/money';

export default function IncomeChains() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [showExplainer, setShowExplainer] = useState(false);

  useEffect(function() {
    apiGet('/api/income-chains').then(function(r) { setData(r); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return <AppLayout title="Income Chains"><Spin/></AppLayout>;

  var d = data || {};
  var chains = d.chains || [];
  var recentCascades = d.recent_cascades || [];
  var directSales = d.direct_sales || {total: 0, count: 0};

  // Each chain gets its own identity colour
  var chainColours = {
    1: '#0ea5e9',  // cobalt blue
    2: '#8b5cf6',  // purple
    3: '#16a34a',  // green
    4: '#f59e0b',  // amber
  };

  var cobaltGradient = 'linear-gradient(90deg,#172554,#1e3a8a)';

  return (
    <AppLayout title="Income Chains" subtitle="Your four infinite streams of passive course income">

      {/* ── Hero / Headline Banner ── */}
      <div style={{background:'linear-gradient(135deg,#0b1e4c,#1e3a8a 60%,#2563eb)',borderRadius:16,padding:'28px 32px',marginBottom:28,
                   color:'#fff',position:'relative',overflow:'hidden',boxShadow:'0 8px 30px rgba(23,37,84,0.3)'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',
                     background:'radial-gradient(circle,rgba(14,165,233,0.25) 0%,transparent 70%)'}}/>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div style={{flex:1,minWidth:280}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.6,textTransform:'uppercase',color:'#7dd3fc',marginBottom:8}}>
              Total Income Chain Earnings
            </div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:44,fontWeight:800,letterSpacing:-1,marginBottom:6}}>
              ${(d.total_chain_income || 0).toFixed(2)}
            </div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>
              Passive income cascading up from your team's 2nd, 4th, 6th, and 8th referrals
            </div>
          </div>
          <button onClick={function(){ setShowExplainer(!showExplainer); }}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'12px 20px',borderRadius:12,border:'1px solid rgba(255,255,255,.2)',
                          background:'rgba(255,255,255,.08)',color:'#fff',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer',
                          transition:'background .2s'}}
                  onMouseEnter={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
                  onMouseLeave={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}>
            <Info size={15}/> {showExplainer ? 'Hide' : 'How it works'}
          </button>
        </div>
      </div>

      {/* ── Explainer (toggleable) ── */}
      {showExplainer && <ExplainerBlock/>}

      {/* ── 4 Chain Cards ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:28}}>
        {chains.map(function(chain){
          var colour = chainColours[chain.chain_number] || '#64748b';
          return (
            <ChainCard
              key={chain.chain_number}
              number={chain.chain_number}
              name={chain.name}
              opensAt={chain.opens_at}
              total={chain.total_earned}
              cascadeCount={chain.cascade_count}
              colour={colour}
            />
          );
        })}
      </div>

      {/* ── Direct Sales context card ── */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'20px 24px',marginBottom:28,
                   display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14,
                   boxShadow:'0 4px 20px rgba(23,37,84,.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flex:1,minWidth:280}}>
          <div style={{width:48,height:48,borderRadius:12,background:'rgba(22,163,74,.1)',
                       display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
            🎯
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:2}}>Direct Course Sales</div>
            <div style={{fontSize:12,color:'#64748b'}}>
              {directSales.count} sales where you kept 100% — doesn't flow through any Income Chain
            </div>
          </div>
        </div>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#16a34a',whiteSpace:'nowrap'}}>
          ${directSales.total.toFixed(2)}
        </div>
      </div>

      {/* ── Recent Cascades List ── */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',
                   boxShadow:'0 4px 20px rgba(23,37,84,.06)'}}>
        <div style={{background:cobaltGradient,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:4,background:'#0ea5e9',boxShadow:'0 0 8px rgba(14,165,233,.5)'}}/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:.3}}>Recent Cascades</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.55)'}}>
            {recentCascades.length} entries
          </div>
        </div>

        {recentCascades.length > 0 ? (
          <div style={{maxHeight:500,overflowY:'auto'}}>
            {recentCascades.map(function(c, i){
              var colour = chainColours[c.chain_number] || '#64748b';
              return (
                <div key={c.id || i} style={{display:'flex',alignItems:'center',padding:'14px 24px',
                                              borderBottom: i === recentCascades.length - 1 ? 'none' : '1px solid #f1f5f9'}}>
                  {/* Chain badge */}
                  <div style={{width:64,textAlign:'center',marginRight:16,flexShrink:0}}>
                    <div style={{display:'inline-block',padding:'4px 10px',borderRadius:6,
                                 background:colour+'15',color:colour,
                                 border:'1px solid '+colour+'30',
                                 fontSize:10,fontWeight:800,letterSpacing:.5}}>
                      CHAIN {c.chain_number}
                    </div>
                  </div>
                  {/* Buyer & cascade info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:2}}>
                      {c.buyer_name || 'A member'} bought Tier {c.course_tier}
                    </div>
                    <div style={{fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:6}}>
                      <ArrowUpRight size={11} color={colour}/>
                      Cascaded {c.depth_walked} level{c.depth_walked === 1 ? '' : 's'} to you
                      {c.created_at && <span style={{color:'#94a3b8',marginLeft:4}}>
                        • {new Date(c.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}
                      </span>}
                    </div>
                  </div>
                  {/* Amount */}
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:colour,whiteSpace:'nowrap',marginLeft:16}}>
                    +${formatMoney(c.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="⛓️"
            title="No cascades yet"
            subtitle="As your team grows and they recruit their 2nd, 4th, 6th, and 8th members, those commissions will cascade up to you here"
          />
        )}
      </div>

    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Chain Card                                                     */
/* ══════════════════════════════════════════════════════════════ */

function ChainCard(props) {
  var colour = props.colour;
  return (
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'22px 20px',
                 position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(23,37,84,.06)',
                 transition:'transform .2s, box-shadow .2s'}}
         onMouseEnter={function(e){
           e.currentTarget.style.transform = 'translateY(-3px)';
           e.currentTarget.style.boxShadow = '0 10px 28px rgba(23,37,84,.12)';
         }}
         onMouseLeave={function(e){
           e.currentTarget.style.transform = 'translateY(0)';
           e.currentTarget.style.boxShadow = '0 4px 20px rgba(23,37,84,.06)';
         }}>
      {/* Colour strip at top */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:4,
                   background:'linear-gradient(90deg,'+colour+','+colour+'80)'}}/>

      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:6,
                     background:colour+'15',color:colour,border:'1px solid '+colour+'30',
                     fontSize:10,fontWeight:800,letterSpacing:.5}}>
          <Zap size={10}/> CHAIN {props.number}
        </div>
        <div style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>
          opens at #{props.opensAt}
        </div>
      </div>

      {/* Name */}
      <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{props.name}</div>
      <div style={{fontSize:11,color:'#64748b',marginBottom:18}}>
        Your {ordinal(props.opensAt)} referral and every {ordinal(props.opensAt)} below
      </div>

      {/* Amount */}
      <div style={{fontFamily:'Sora,sans-serif',fontSize:30,fontWeight:800,color:colour,letterSpacing:-.5,marginBottom:4}}>
        ${props.total.toFixed(2)}
      </div>
      <div style={{fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:4}}>
        <TrendingUp size={11} color={colour}/>
        {props.cascadeCount} cascade{props.cascadeCount === 1 ? '' : 's'} received
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Explainer Block                                                */
/* ══════════════════════════════════════════════════════════════ */

function ExplainerBlock() {
  return (
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'24px 28px',marginBottom:28,
                 boxShadow:'0 4px 20px rgba(23,37,84,.06)'}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:12,letterSpacing:-.2}}>
        How Income Chains Work
      </div>
      <div style={{fontSize:13,color:'#475569',lineHeight:1.65,marginBottom:20}}>
        Every time you recruit someone, they enter a specific position in your referral sequence.
        The 2nd, 4th, 6th, and 8th people you recruit each open a separate "Income Chain" that pays commissions
        back up to the person who sponsored you — forever.
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:20}}>
        <RuleCard
          title="Referrals 1, 3, 5, 7, 9+"
          colour="#16a34a"
          rule="You keep 100% of the commission"
          detail="These are your 'kept' sales — the commission stays with you."
        />
        <RuleCard
          title="Referrals 2, 4, 6, 8"
          colour="#0ea5e9"
          rule="Commission passes up the chain"
          detail="These are the 4 Income Chains — each pays up to your pass-up sponsor."
        />
      </div>

      <div style={{padding:'16px 20px',background:'#f8fafc',borderRadius:10,border:'1px solid #e8ecf2'}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:8}}>The Infinite Cascade</div>
        <div style={{fontSize:12,color:'#475569',lineHeight:1.6}}>
          Your team's 2nd, 4th, 6th, and 8th referrals also pass up — to the same chains, flowing through generations.
          A sale 10 levels deep in your organisation can still cascade all the way up to you, as long as it
          followed the right chain path. That's why it's called "infinite" — the depth has no limit.
        </div>
      </div>
    </div>
  );
}

function RuleCard(props) {
  return (
    <div style={{padding:'18px 20px',background:'#f8fafc',borderRadius:10,border:'1px solid #e8ecf2',position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,bottom:0,width:3,background:props.colour,borderRadius:'10px 0 0 10px'}}/>
      <div style={{fontSize:11,fontWeight:800,color:props.colour,letterSpacing:.5,marginBottom:6,textTransform:'uppercase'}}>
        {props.title}
      </div>
      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:4}}>{props.rule}</div>
      <div style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{props.detail}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Helpers                                                        */
/* ══════════════════════════════════════════════════════════════ */

function ordinal(n) {
  if (n === 2) return '2nd';
  if (n === 4) return '4th';
  if (n === 6) return '6th';
  if (n === 8) return '8th';
  return n + 'th';
}

function EmptyState(props) {
  return (
    <div style={{textAlign:'center',padding:'56px 32px'}}>
      <div style={{fontSize:40,marginBottom:14,opacity:.4}}>{props.icon}</div>
      <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:8}}>{props.title}</div>
      <div style={{fontSize:12,color:'#64748b',maxWidth:420,margin:'0 auto',lineHeight:1.55}}>{props.subtitle}</div>
    </div>
  );
}

function Spin() {
  return (
    <div style={{display:'flex',justifyContent:'center',padding:80}}>
      <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
