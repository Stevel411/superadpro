import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Users, DollarSign, TrendingUp, Award, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { formatMoney } from '../utils/money';
import { useAuth } from '../hooks/useAuth';

export default function MyNetwork() {
  var { t } = useTranslation();
  const { user: authUser } = useAuth();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [commView, setCommView] = useState('all');
  var [copied, setCopied] = useState(false);

  useEffect(function() {
    apiGet('/api/network').then(function(r) { setData(r); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return <AppLayout title={t('network.title')}><Spin/></AppLayout>;

  var d = data || {};
  var myUsername = d.username || (authUser && authUser.username) || 'member';
  var referrals = d.referrals || [];
  var commissions = d.commissions || [];
  var activeRefs = referrals.filter(function(r) { return r.is_active; }).length;
  var inactiveRefs = referrals.length - activeRefs;

  var filteredComms = commView === 'all' ? commissions :
    commissions.filter(function(c) {
      if (commView === 'membership') return (c.commission_type || '').indexOf('membership') >= 0 || (c.commission_type || '').indexOf('sponsor') >= 0;
      if (commView === 'grid') return (c.commission_type || '').indexOf('direct_sponsor') >= 0 || (c.commission_type || '').indexOf('uni_level') >= 0;
      if (commView === 'courses') return (c.commission_type || '').indexOf('course') >= 0 || (c.commission_type || '').indexOf('pass') >= 0;
      return true;
    });

  function copyLink() {
    var link = 'https://www.superadpro.com/ref/' + (myUsername);
    navigator.clipboard.writeText(link).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    });
  }

  return (
    <AppLayout title={t('network.title')} subtitle={t('network.subtitle')}>

      {/* ── Referral Link Banner ── */}
      <div style={{background:'linear-gradient(135deg,#172554,#1e3a8a)',borderRadius:14,padding:'20px 24px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#38bdf8',marginBottom:4}}>{t('network.yourReferralLink')}</div>
          <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.6)',fontFamily:'monospace'}}>
            https://www.superadpro.com/ref/{myUsername}
          </div>
        </div>
        <button onClick={copyLink}
          style={{display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer',
            background:copied?'#16a34a':'#0ea5e9',color:'#fff',fontSize:13,fontWeight:800,fontFamily:'inherit',transition:'all .2s'}}>
          {copied ? <><Check size={14}/> {t('common.copied')}</> : <><Copy size={14}/> {t('network.copyLink')}</>}
        </button>
      </div>

      {/* ── Hero Stats ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {icon: Users, value: d.personal_referrals || 0, label: t('network.directReferrals'), sub: activeRefs + ' active · ' + inactiveRefs + ' inactive', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7'},
          {icon: TrendingUp, value: d.total_team || 0, label: t('network.totalNetwork'), sub: t('network.allLevelsCombined'), color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd'},
          {icon: DollarSign, value: '$' + (d.total_earned || 0).toFixed(0), label: t('network.lifetimeEarned'), sub: t('network.allStreamsCombined'), color: '#6366f1', bg: '#f5f3ff', border: '#e9d5ff'},
          {icon: Award, value: '$' + ((d.grid_earnings || 0) + (d.course_earnings || 0) + (d.marketplace_earnings || 0)).toFixed(0), label: t('network.thisMonth'), sub: t('network.membershipGridCourses'), color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7'},
        ].map(function(s, i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:s.bg,border:'1px solid '+s.border,borderRadius:14,padding:20,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:12,right:12,width:36,height:36,borderRadius:10,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={18} color={s.color}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color,marginBottom:4}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Earnings by Stream ── */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:20,boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'linear-gradient(90deg,#172554,#1e3a8a)',padding:'16px 24px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{t('network.earningsByStream')}</div>
        </div>
        <div style={{padding:'20px 24px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
          {[
            {label:t('network.membershipResidual'),value:'$'+(d.membership_earnings || d.membership_earned || 0).toFixed(0),color:'#16a34a',desc:t('network.fiftyPercentPerReferral')},
            {label:t('network.gridCampaigns'),value:'$'+(d.grid_earnings || 0).toFixed(0),color:'#0ea5e9',desc:t('network.fortyDirectUniLevel')},
            {label:t('network.coursesSuperMarket'),value:'$'+((d.course_earnings || 0) + (d.marketplace_earnings || 0)).toFixed(0),color:'#8b5cf6',desc:t('network.passUpsMarketplace')},
          ].map(function(s, i) {
            return (
              <div key={i} style={{padding:18,borderRadius:12,background:'#f8f9fb',border:'1px solid #e8ecf2',textAlign:'center'}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginTop:4}}>{s.label}</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two Column: Referrals + Commissions ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'stretch'}}>

        {/* Direct Referrals */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'linear-gradient(90deg,#172554,#1e3a8a)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:6,height:6,borderRadius:3,background:'#16a34a'}}/>
              <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{t('network.directReferrals')}</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{referrals.length} total</div>
          </div>
          <div style={{maxHeight:500,overflowY:'auto'}}>
            {referrals.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {[t('network.member'),t('common.status'),t('network.referrals'),t('network.joined')].map(function(h) {
                      return <th key={h} style={thStyle}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(function(r, i) {
                    return (
                      <tr key={i}>
                        <td style={tdStyle}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',flexShrink:0}}>
                              {(r.first_name || r.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{r.first_name || r.username}</div>
                              <div style={{fontSize:10,color:'#64748b',fontFamily:'monospace'}}>@{r.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                            background:r.is_active?'rgba(22,163,74,.08)':'rgba(245,158,11,.08)',
                            color:r.is_active?'#16a34a':'#d97706',
                            border:'1px solid '+(r.is_active?'rgba(22,163,74,.15)':'rgba(245,158,11,.15)')}}>
                            {r.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {r.membership_tier === 'pro' && <span style={{fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(139,92,246,.08)',color:'#8b5cf6',marginLeft:4,border:'1px solid rgba(139,92,246,.15)'}}>PRO</span>}
                        </td>
                        <td style={Object.assign({},tdStyle,{textAlign:'center'})}>
                          <span style={{fontSize:13,fontWeight:700,color:'#0ea5e9'}}>{r.personal_referrals || 0}</span>
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
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:32,marginBottom:8,opacity:.3}}>👥</div>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>{t('network.noReferralsYet')}</div>
                <div style={{fontSize:12,color:'#64748b'}}>{t('network.shareYourLink')}</div>
              </div>
            )}
          </div>
        </div>

        {/* Commission History */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'linear-gradient(90deg,#172554,#1e3a8a)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:6,height:6,borderRadius:3,background:'#0ea5e9'}}/>
              <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{t('network.commissionHistory')}</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{commissions.length} entries</div>
          </div>

          {/* Filter tabs */}
          <div style={{display:'flex',gap:4,padding:'12px 20px',borderBottom:'1px solid #f1f5f9'}}>
            {[
              {key:'all',label:t('common.all')},
              {key:'membership',label:t('network.membership')},
              {key:'grid',label:t('network.grid')},
              {key:'courses',label:t('nav.courses')},
            ].map(function(f) {
              var on = commView === f.key;
              return (
                <button key={f.key} onClick={function() { setCommView(f.key); }}
                  style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',
                    border:on?'1px solid #0ea5e9':'1px solid #e8ecf2',
                    background:on?'rgba(14,165,233,.06)':'transparent',
                    color:on?'#0ea5e9':'#64748b',transition:'all .15s'}}>
                  {f.label}
                </button>
              );
            })}
          </div>

          <div style={{maxHeight:460,overflowY:'auto'}}>
            {filteredComms.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {[t('common.type'),t('common.amount'),t('common.status'),t('common.date')].map(function(h) {
                      return <th key={h} style={thStyle}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredComms.slice(0, 30).map(function(c, i) {
                    var type = (c.commission_type || '').replace(/_/g, ' ');
                    var typeColor = type.indexOf('sponsor') >= 0 ? '#0ea5e9' :
                                    type.indexOf('uni') >= 0 ? '#6366f1' :
                                    type.indexOf('membership') >= 0 ? '#16a34a' :
                                    type.indexOf('course') >= 0 || type.indexOf('pass') >= 0 ? '#8b5cf6' :
                                    type.indexOf('bonus') >= 0 ? '#f59e0b' : '#64748b';
                    return (
                      <tr key={i}>
                        <td style={tdStyle}>
                          <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,
                            color:typeColor,background:typeColor+'10',border:'1px solid '+typeColor+'20',
                            textTransform:'capitalize',whiteSpace:'nowrap'}}>
                            {type}
                          </span>
                        </td>
                        <td style={Object.assign({},tdStyle,{fontWeight:800,color:'#16a34a',fontSize:14})}>
                          +${formatMoney(c.amount_usdt || c.amount)}
                        </td>
                        <td style={tdStyle}>
                          <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                            background:c.status==='paid'?'rgba(22,163,74,.08)':'rgba(245,158,11,.08)',
                            color:c.status==='paid'?'#16a34a':'#d97706'}}>
                            {c.status || 'pending'}
                          </span>
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
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:32,marginBottom:8,opacity:.3}}>💰</div>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>{t('network.noCommissionsYet')}</div>
                <div style={{fontSize:12,color:'#64748b'}}>{t('network.commissionsAppear')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

var thStyle = {fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:1,padding:'11px 16px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'};
var tdStyle = {padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontSize:13,color:'#0f172a'};

function Spin() {
  return (
    <div style={{display:'flex',justifyContent:'center',padding:80}}>
      <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
