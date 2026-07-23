import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import { apiGet } from '../utils/api';
import { Film, Eye, Play, CheckCircle, Clock, AlertCircle, Trash2, Plus } from 'lucide-react';
import FeatureOnExploreButton from '../components/FeatureOnExploreButton';

export default function VideoLibrary() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [deleting, setDeleting] = useState(null);

  function load() {
    apiGet('/api/video-library').then(function(r) { setData(r); setLoading(false); }).catch(function() { setLoading(false); });
  }
  useEffect(function() { load(); }, []);

  async function deleteCampaign(id, title) {
    if (!confirm(t('videos.deleteConfirm', {title: title}))) return;
    setDeleting(id);
    try {
      var res = await fetch('/api/campaigns/' + id, { method: 'DELETE', credentials: 'include' });
      var d = await res.json();
      if (d.success) { load(); } else { alert(d.error || 'Delete failed'); }
    } catch (e) { alert(e.message || 'Delete failed'); }
    setDeleting(null);
  }

  if (loading) return <AlShell active="campaigns" back={{ to: '/dashboard', label: 'Dashboard' }}><Spin/></AlShell>;

  var d = data || {};
  var campaigns = d.campaigns || [];

  var statusIcon = function(s) {
    if (s === 'active') return <CheckCircle size={12} color="var(--sap-green)"/>;
    if (s === 'pending') return <Clock size={12} color="var(--sap-amber)"/>;
    if (s === 'paused_no_tier') return <AlertCircle size={12} color="#b45309"/>;
    return <AlertCircle size={12} color="var(--sap-text-muted)"/>;
  };
  var statusColor = function(s) {
    if (s === 'active') return {bg:'rgba(22,163,74,.08)',color:'var(--sap-green)',border:'rgba(22,163,74,.15)'};
    if (s === 'pending') return {bg:'rgba(245,158,11,.08)',color:'var(--sap-amber)',border:'rgba(245,158,11,.15)'};
    if (s === 'paused_no_tier') return {bg:'#fef3c7',color:'#b45309',border:'#fde68a'};
    return {bg:'var(--sap-bg-input)',color:'var(--sap-text-muted)',border:'var(--sap-border-light)'};
  };
  // Friendly label for the status badge (raw status strings like 'paused_no_tier'
  // are too technical for a member). Falls back to title-cased raw status.
  var statusLabel = function(s) {
    if (s === 'paused_no_tier') return 'No Tier';
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  function getThumb(c) {
    if (c.platform === 'youtube' && c.embed_url) {
      var match = c.embed_url.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (match) return 'https://img.youtube.com/vi/' + match[1] + '/mqdefault.jpg';
    }
    return null;
  }

  return (
    <AlShell active="campaigns" back={{ to: '/dashboard', label: 'Dashboard' }}>
      <div style={{maxWidth:960,margin:'0 auto'}}>
      <div style={{background:'#0a1f52',borderRadius:20,color:'#fff',padding:'22px 26px',boxShadow:'0 24px 50px -28px rgba(10,31,82,.55)',marginBottom:18,display:'flex',alignItems:'center',gap:15}}>
        <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(120deg,#c8102e,#e8203f)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 8l-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:23,letterSpacing:-.6}}>{t("videos.title")}</div>
          <div style={{fontSize:13.5,color:'#c9d6f7',fontWeight:600,marginTop:2}}>{t("videos.subtitle")}</div>
        </div>
      </div>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:22}}>
        {[
          {value:d.total_campaigns||0,label:t('videos.totalCampaigns'),color:'#c8102e',bg:'#fff',border:'#e3e8f4',top:'#c8102e',iconbg:'#fde8ec',icon:Film},
          {value:d.active_campaigns||0,label:t('videos.activeCampaigns'),color:'#0b7a3e',bg:'#fff',border:'#e3e8f4',top:'#0b7a3e',iconbg:'#e4f7ee',icon:Play},
          {value:(d.total_views||0).toLocaleString(),label:t('videos.totalViewsDelivered'),color:'#12388f',bg:'#fff',border:'#e3e8f4',top:'#12388f',iconbg:'#e8eeff',icon:Eye},
        ].map(function(s, i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:s.bg,border:'2px solid '+s.border,borderTop:'3px solid '+s.top,borderRadius:16,padding:'20px 22px',position:'relative'}}>
              <div style={{position:'absolute',top:16,right:16,width:38,height:38,borderRadius:11,background:s.iconbg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={16} color={s.color}/>
              </div>
              <div style={{fontFamily:'Inter,sans-serif',fontSize:32,fontWeight:900,letterSpacing:'-1px',color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Campaign list */}
      <div style={{background:'#fff',border:'2px solid #e3e8f4',borderRadius:18,overflow:'hidden',boxShadow:'0 20px 50px -30px rgba(10,31,82,.35)'}}>
        <div style={{background:'linear-gradient(120deg,#12388f,#0a1f52)',padding:'17px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Film size={17} color="#ff5a70"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{t('videos.yourCampaigns')}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</span>
            <Link to="/campaign-analytics" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:800,color:'rgba(255,255,255,.92)',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.22)',padding:'9px 15px',borderRadius:10,textDecoration:'none'}}>
              {t('videos.performance', { defaultValue: 'Performance' })}
            </Link>
            <Link to="/create-campaign" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:900,color:'#fff',background:'#c8102e',padding:'9px 16px',borderRadius:10,textDecoration:'none',boxShadow:'0 8px 18px -8px rgba(200,16,46,.7)'}}>
              <Plus size={12}/> {t('videos.newCampaign')}
            </Link>
          </div>
        </div>
        {campaigns.length > 0 ? (
          <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
            {campaigns.map(function(c) {
              var sc = statusColor(c.status);
              var pct = c.views_target > 0 ? Math.min(100, Math.round((c.views_delivered / c.views_target) * 100)) : 0;
              var thumb = getThumb(c);
              return (
                <div key={c.id} style={{display:'flex',gap:16,padding:16,background:'var(--sap-bg-input)',border:'1px solid #e8ecf2',borderRadius:12,alignItems:'center'}}>
                  {/* Thumbnail */}
                  <div style={{width:160,height:90,borderRadius:8,overflow:'hidden',background:'var(--sap-text-primary)',flexShrink:0,position:'relative'}}>
                    {thumb ? (
                      <img src={thumb} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy" />
                    ) : (
                      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Film size={24} color="#334155"/>
                      </div>
                    )}
                    {c.video_url && (
                      <Link to={'/watch?preview=' + c.id}
                        style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.35)',opacity:0,transition:'opacity .2s',cursor:'pointer'}}
                        onMouseEnter={function(e){e.currentTarget.style.opacity='1';}}
                        onMouseLeave={function(e){e.currentTarget.style.opacity='0';}}>
                        <Play size={28} color="#fff" fill="#fff"/>
                      </Link>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--sap-text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title || 'Untitled'}</div>
                      <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:13,fontWeight:700,padding:'2px 8px',borderRadius:6,
                        background:sc.bg,color:sc.color,border:'1px solid '+sc.border,textTransform:'capitalize',flexShrink:0}}>
                        {statusIcon(c.status)} {statusLabel(c.status)}
                      </span>
                    </div>
                    {c.status === 'paused_no_tier' && (
                      <div style={{fontSize:13, color:'#b45309', marginBottom:6, display:'flex', alignItems:'center', gap:6}}>
                        <span>{t('videoLibrary.needActiveCampaign')}</span>
                        <Link to="/campaign-tiers" style={{color:'#b45309', fontWeight:700, textDecoration:'underline'}}>
                          Purchase tier to reactivate →
                        </Link>
                      </div>
                    )}
                    <div style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:8}}>
                      {c.platform || '—'} · {c.category || 'General'}
                      {c.target_country ? ' · 🎯 ' + c.target_country : ''}
                      {c.target_interests ? ' · ' + c.target_interests : ''}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{flex:1,height:6,background:'var(--sap-border)',borderRadius:3,overflow:'hidden',maxWidth:200}}>
                        <div style={{height:'100%',borderRadius:4,background:pct>=100?'#0b7a3e':'#c8102e',width:pct+'%',transition:'width .3s'}}/>
                      </div>
                      <span style={{fontSize:12.5,fontWeight:800,color:'#c8102e'}}>{(c.views_delivered||0).toLocaleString()}</span>
                      <span style={{fontSize:13,color:'var(--sap-text-muted)'}}>/ {(c.views_target||0).toLocaleString()} {t('videos.views')}</span>
                      <span style={{fontSize:13,fontWeight:700,color:pct>=100?'var(--sap-green)':'var(--sap-text-muted)'}}>{pct}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                    {(c.views_delivered || 0) >= 1 && (
                      <FeatureOnExploreButton
                        artifactType="campaign"
                        artifactId={c.id}
                        artifactTitle={c.title || ''}
                        variant="secondary"
                      />
                    )}
                    {c.video_url && (
                      <Link to={'/watch?preview=' + c.id}
                        style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:13,fontWeight:800,color:'#c8102e',padding:'6px 12px',borderRadius:8,border:'1px solid rgba(200,16,46,.2)',background:'rgba(200,16,46,.04)',textDecoration:'none',cursor:'pointer'}}>
                        <Eye size={12}/> {t('videos.view')}
                      </Link>
                    )}
                    <button onClick={function(){deleteCampaign(c.id, c.title);}} disabled={deleting === c.id}
                      style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:13,fontWeight:700,color:'var(--sap-red)',padding:'6px 12px',borderRadius:8,border:'1px solid rgba(220,38,38,.15)',background:'rgba(220,38,38,.04)',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                      <Trash2 size={12}/> {deleting === c.id ? '...' : t('videos.delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.3}}>🎬</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:4}}>{t('videos.noCampaignsYet')}</div>
            <div style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:20,maxWidth:420,marginLeft:'auto',marginRight:'auto',lineHeight:1.6}}>{t('videos.needAPack', { defaultValue: 'You need a campaign pack before your video can be delivered to members. Packs start at $10.' })}</div>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:4}}>
              <a href="/packs" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14,fontWeight:800,color:'#0a1f52',background:'#fff',border:'2px solid #d7deef',borderRadius:13,padding:'13px 22px',textDecoration:'none'}}>
                {t('videos.buyAPack', { defaultValue: 'Buy a pack' })}
              </a>
            </div>
            <Link to="/create-campaign" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:15,fontWeight:900,color:'#fff',background:'#c8102e',borderRadius:13,padding:'15px 28px',textDecoration:'none',boxShadow:'0 14px 30px -12px rgba(200,16,46,.6)'}}>
              <Plus size={16}/> {t('videos.createFirst')}
            </Link>
          </div>
        )}
      </div>
      </div>
    </AlShell>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#c8102e',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
