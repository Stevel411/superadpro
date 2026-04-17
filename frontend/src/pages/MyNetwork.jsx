import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Users, TrendingUp, Zap, Copy, Check, ExternalLink } from 'lucide-react';
import { formatMoney } from '../utils/money';
import { useAuth } from '../hooks/useAuth';

export default function MyNetwork() {
  var { t } = useTranslation();
  const { user: authUser } = useAuth();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [copied, setCopied] = useState(false);

  useEffect(function() {
    apiGet('/api/network').then(function(r) { setData(r); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return <AppLayout title="My Network & Earnings"><Spin/></AppLayout>;

  var d = data || {};
  var myUsername = d.username || (authUser && authUser.username) || 'member';
  var referrals = d.referrals || [];
  var commissions = d.commissions || [];

  function copyLink() {
    var link = 'https://www.superadpro.com/ref/' + myUsername;
    navigator.clipboard.writeText(link).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    });
  }

  var membershipEarned = d.membership_earned || 0;
  var gridEarned = d.grid_earnings || 0;
  var courseEarned = d.course_earnings || 0;
  var nexusEarned = d.nexus_earnings || 0;

  var cobaltGradient = 'linear-gradient(90deg,#172554,#1e3a8a)';
  var monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });

  return (
    <AppLayout title="My Network & Earnings" subtitle="Your team, your income streams, your growth">

      {/* ── Referral Link Banner ── */}
      <div style={{background:'linear-gradient(135deg,#0b1e4c,#1e3a8a 60%,#2563eb)',borderRadius:16,padding:'22px 28px',marginBottom:28,
                   display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,
                   boxShadow:'0 8px 30px rgba(23,37,84,0.25)'}}>
        <div style={{flex:1,minWidth:280}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.6,textTransform:'uppercase',color:'#7dd3fc',marginBottom:6}}>
            Your Referral Link
          </div>
          <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,.85)',fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',wordBreak:'break-all'}}>
            https://www.superadpro.com/ref/{myUsername}
          </div>
        </div>
        <button onClick={copyLink}
          style={{display:'flex',alignItems:'center',gap:8,padding:'12px 22px',borderRadius:12,border:'none',cursor:'pointer',
                  background:copied?'#16a34a':'#0ea5e9',color:'#fff',fontSize:13,fontWeight:800,fontFamily:'inherit',transition:'all .2s',
                  boxShadow:'0 4px 14px rgba(14,165,233,.35)'}}>
          {copied ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy Link</>}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  YOUR EARNINGS                                    */}
      {/* ═══════════════════════════════════════════════ */}

      <SectionHeading title="Your Earnings" subtitle="Total and monthly, across every income stream" />

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:20}}>
        <BigStatCard
          label="Lifetime Earned"
          value={'$' + (d.total_earned || 0).toFixed(2)}
          sub="All-time across all income streams"
          gradient="linear-gradient(135deg,#0b1e4c,#2563eb)"
        />
        <BigStatCard
          label="This Month"
          value={'$' + (d.this_month_total || 0).toFixed(2)}
          sub={'Commissions paid in ' + monthName}
          gradient="linear-gradient(135deg,#1e3a8a,#0ea5e9)"
        />
      </div>

      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:24,
                   boxShadow:'0 4px 20px rgba(23,37,84,.06)'}}>
        <div style={{background:cobaltGradient,padding:'16px 24px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:.3}}>Earnings by Stream</div>
          <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.55)',marginTop:3}}>
            Four ways members earn on SuperAdPro
          </div>
        </div>
        <div>
          <StreamRow
            icon="🔗"
            name="Membership Residual"
            desc="50% of every direct referral's monthly membership fee"
            amount={membershipEarned}
            colour="#16a34a"
          />
          <StreamRow
            icon="⚡"
            name="Grid / Campaigns"
            desc="40% direct + 50% uni-level from campaign tier purchases"
            amount={gridEarned}
            colour="#0ea5e9"
          />
          <StreamRow
            icon="🎓"
            name="Course Academy"
            desc="100% commissions via 4 infinite Income Chains"
            amount={courseEarned}
            colour="#8b5cf6"
          />
          <StreamRow
            icon="💎"
            name="Credit Nexus"
            desc="3×3 matrix earnings on downline credit pack purchases"
            amount={nexusEarned}
            colour="#f59e0b"
            last
          />
        </div>
      </div>

      {/* Recent Commissions */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',
                   boxShadow:'0 4px 20px rgba(23,37,84,.06)'}}>
        <div style={{background:cobaltGradient,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:4,background:'#0ea5e9',boxShadow:'0 0 8px rgba(14,165,233,.5)'}}/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:.3}}>Recent Commissions</div>
          </div>
          <a href="/wallet" style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.85)',textDecoration:'none',
                                     display:'flex',alignItems:'center',gap:4}}>
            See all <ExternalLink size={12}/>
          </a>
        </div>
        <div style={{maxHeight:400,overflowY:'auto'}}>
          {commissions.length > 0 ? (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Source','Details','Amount','Date'].map(function(h){
                    return <th key={h} style={thStyle}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {commissions.slice(0,15).map(function(c, i){
                  var info = streamFromType(c.commission_type || '');
                  return (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6,
                                      fontSize:11,fontWeight:700,padding:'4px 9px',borderRadius:6,
                                      color:info.colour,background:info.colour+'12',border:'1px solid '+info.colour+'25',
                                      whiteSpace:'nowrap'}}>
                          <span>{info.icon}</span> {info.label}
                        </span>
                      </td>
                      <td style={Object.assign({},tdStyle,{fontSize:12,color:'#475569'})}>
                        {humaniseType(c.commission_type || '')}
                      </td>
                      <td style={Object.assign({},tdStyle,{fontWeight:800,color:'#16a34a',fontSize:14})}>
                        +${formatMoney(c.amount_usdt || c.amount)}
                      </td>
                      <td style={Object.assign({},tdStyle,{fontSize:11,color:'#64748b'})}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="💰" title="No commissions yet" subtitle="Commissions will appear here as your team grows" />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  YOUR TEAM                                        */}
      {/* ═══════════════════════════════════════════════ */}

      <SectionHeading title="Your Team" subtitle="Everyone below you, growing over time" />

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        <StatCard
          icon={Users}
          value={d.personal_referrals || 0}
          label="Direct Referrals"
          sub="People you recruited personally"
          color="#0ea5e9"
          iconBg="rgba(14,165,233,.12)"
        />
        <StatCard
          icon={TrendingUp}
          value={d.total_team || 0}
          label="Total Network"
          sub="Everyone below you at every depth"
          color="#6366f1"
          iconBg="rgba(99,102,241,.12)"
        />
        <StatCard
          icon={Zap}
          value={d.active_this_month || 0}
          label="Active Members"
          sub="Still active on the platform"
          color="#16a34a"
          iconBg="rgba(22,163,74,.12)"
        />
      </div>

      {/* Direct Referrals list */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:36,
                   boxShadow:'0 4px 20px rgba(23,37,84,.06)'}}>
        <div style={{background:cobaltGradient,padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:4,background:'#22c55e',boxShadow:'0 0 8px rgba(34,197,94,.5)'}}/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:.3}}>Direct Referrals</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.55)'}}>{referrals.length} total</div>
        </div>
        <div style={{maxHeight:440,overflowY:'auto'}}>
          {referrals.length > 0 ? (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Member','Status','Their Team','Joined'].map(function(h){
                    return <th key={h} style={thStyle}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {referrals.map(function(r, i){
                  return (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:16,background:'linear-gradient(135deg,#1e3a8a,#0ea5e9)',
                                       display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',
                                       fontSize:13,fontWeight:800,fontFamily:'Sora,sans-serif'}}>
                            {((r.first_name || r.username || '?').charAt(0)).toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>
                              {r.first_name || r.username}
                            </div>
                            <div style={{fontSize:11,color:'#94a3b8'}}>@{r.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{fontSize:10,fontWeight:700,padding:'4px 9px',borderRadius:6,
                          background: r.is_active ? 'rgba(22,163,74,.1)' : 'rgba(148,163,184,.15)',
                          color: r.is_active ? '#15803d' : '#64748b',
                          border: '1px solid ' + (r.is_active ? 'rgba(22,163,74,.2)' : 'rgba(148,163,184,.25)')}}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {r.membership_tier === 'pro' && (
                          <span style={{fontSize:9,fontWeight:800,padding:'3px 6px',borderRadius:4,
                            background:'rgba(139,92,246,.1)',color:'#8b5cf6',marginLeft:6,
                            border:'1px solid rgba(139,92,246,.2)',letterSpacing:.5}}>PRO</span>
                        )}
                      </td>
                      <td style={Object.assign({},tdStyle,{textAlign:'center'})}>
                        <span style={{fontSize:14,fontWeight:800,color:'#0ea5e9'}}>{r.personal_referrals || 0}</span>
                      </td>
                      <td style={Object.assign({},tdStyle,{fontSize:11,color:'#64748b'})}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="👥" title="No referrals yet" subtitle="Share your link above to start building your network" />
          )}
        </div>
      </div>

    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Helpers                                                        */
/* ══════════════════════════════════════════════════════════════ */

function SectionHeading(props) {
  return (
    <div style={{marginBottom:14,marginTop:4}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',letterSpacing:-.2}}>
        {props.title}
      </div>
      <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{props.subtitle}</div>
    </div>
  );
}

function StatCard(props) {
  var Icon = props.icon;
  return (
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:20,
                 position:'relative',overflow:'hidden',boxShadow:'0 4px 16px rgba(23,37,84,.04)'}}>
      <div style={{position:'absolute',top:14,right:14,width:38,height:38,borderRadius:10,background:props.iconBg,
                   display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Icon size={18} color={props.color}/>
      </div>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:800,color:props.color,marginBottom:4,letterSpacing:-.5}}>
        {props.value}
      </div>
      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:2}}>{props.label}</div>
      <div style={{fontSize:11,color:'#64748b'}}>{props.sub}</div>
    </div>
  );
}

function BigStatCard(props) {
  return (
    <div style={{background:props.gradient,borderRadius:14,padding:'24px 28px',color:'#fff',
                 boxShadow:'0 8px 28px rgba(23,37,84,.25)',position:'relative',overflow:'hidden'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(255,255,255,.75)',marginBottom:8}}>
        {props.label}
      </div>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:38,fontWeight:800,letterSpacing:-.8,marginBottom:4}}>
        {props.value}
      </div>
      <div style={{fontSize:12,color:'rgba(255,255,255,.7)'}}>{props.sub}</div>
    </div>
  );
}

function StreamRow(props) {
  return (
    <div style={{display:'flex',alignItems:'center',padding:'18px 24px',
                 borderBottom: props.last ? 'none' : '1px solid #f1f5f9'}}>
      <div style={{width:44,height:44,borderRadius:12,background:props.colour+'15',
                   display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginRight:16,flexShrink:0}}>
        {props.icon}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:2}}>{props.name}</div>
        <div style={{fontSize:12,color:'#64748b'}}>{props.desc}</div>
      </div>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:props.colour,marginLeft:16,whiteSpace:'nowrap'}}>
        ${(props.amount || 0).toFixed(2)}
      </div>
    </div>
  );
}

function EmptyState(props) {
  return (
    <div style={{textAlign:'center',padding:'48px 20px'}}>
      <div style={{fontSize:36,marginBottom:12,opacity:.35}}>{props.icon}</div>
      <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:6}}>{props.title}</div>
      <div style={{fontSize:12,color:'#64748b'}}>{props.subtitle}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Type classifiers                                               */
/* ══════════════════════════════════════════════════════════════ */

function streamFromType(type) {
  type = (type || '').toLowerCase();
  if (type.indexOf('matrix') >= 0 || type.indexOf('nexus') >= 0) {
    return { icon:'💎', label:'Credit Nexus', colour:'#f59e0b' };
  }
  if (type.indexOf('course') >= 0 || type.indexOf('pass_up') >= 0 || type === 'direct_sale' || type === 'pass_up') {
    return { icon:'🎓', label:'Courses', colour:'#8b5cf6' };
  }
  if (type.indexOf('membership') >= 0 || type === 'sponsor') {
    return { icon:'🔗', label:'Membership', colour:'#16a34a' };
  }
  if (type.indexOf('direct_sponsor') >= 0 || type.indexOf('uni_level') >= 0 || type.indexOf('grid') >= 0 || type.indexOf('bonus') >= 0) {
    return { icon:'⚡', label:'Grid', colour:'#0ea5e9' };
  }
  return { icon:'•', label:'Other', colour:'#64748b' };
}

function humaniseType(type) {
  type = (type || '').toLowerCase();
  if (type === 'direct_sponsor') return 'Direct sponsor bonus';
  if (type === 'uni_level') return 'Uni-level commission';
  if (type === 'grid_completion_bonus') return 'Grid completion bonus';
  if (type === 'platform') return 'Platform commission';
  if (type === 'matrix_level' || type === 'nexus_level') return 'Credit matrix level bonus';
  if (type === 'matrix_completion' || type === 'nexus_completion') return 'Credit matrix completion';
  if (type === 'nexus_sponsor') return 'Credit Nexus sponsor bonus';
  if (type === 'direct_sale') return 'Course direct sale (100%)';
  if (type === 'pass_up') return 'Course pass-up cascade';
  if (type === 'membership' || type === 'sponsor') return 'Membership referral';
  return type.replace(/_/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}

/* ══════════════════════════════════════════════════════════════ */
/*  Styles                                                         */
/* ══════════════════════════════════════════════════════════════ */

var thStyle = {
  fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:1.2,
  padding:'12px 16px', borderBottom:'1px solid #e8ecf2', textAlign:'left', background:'#f8fafc',
};

var tdStyle = {
  padding:'14px 16px', borderBottom:'1px solid #f5f6f8', fontSize:13, color:'#0f172a', verticalAlign:'middle',
};

function Spin() {
  return (
    <div style={{display:'flex',justifyContent:'center',padding:80}}>
      <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
