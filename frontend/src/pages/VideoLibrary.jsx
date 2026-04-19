import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
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

  if (loading) return <AppLayout title={t("videos.title")}><Spin/></AppLayout>;

  var d = data || {};
  var campaigns = d.campaigns || [];

  var statusIcon = function(s) {
    if (s === 'active') return <CheckCircle size={12} color="var(--sap-green)"/>;
    if (s === 'pending') return <Clock size={12} color="var(--sap-amber)"/>;
    return <AlertCircle size={12} color="var(--sap-text-muted)"/>;
  };
  var statusColor = function(s) {
    if (s === 'active') return {bg:'rgba(22,163,74,.08)',color:'var(--sap-green)',border:'rgba(22,163,74,.15)'};
    if (s === 'pending') return {bg:'rgba(245,158,11,.08)',color:'var(--sap-amber)',border:'rgba(245,158,11,.15)'};
    return {bg:'var(--sap-bg-input)',color:'var(--sap-text-muted)',border:'var(--sap-border-light)'};
  };
  function getThumb(c) {
    if (c.platform === 'youtube' && c.embed_url) {
      var match = c.embed_url.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (match) return 'https://img.youtube.com/vi/' + match[1] + '/mqdefault.jpg';
    }
    return null;
  }

  return (
    <AppLayout title={t("videos.title")} subtitle={t("videos.subtitle")}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
        {[
          {value:d.total_campaigns||0,label:t('videos.totalCampaigns'),color:'var(--sap-accent)',bg:'#f0f9ff',border:'#bae6fd',icon:Film},
          {value:d.active_campaigns||0,label:t('videos.activeCampaigns'),color:'var(--sap-green)',bg:'var(--sap-green-bg)',border:'var(--sap-green-bg-mid)',icon:Play},
          {value:(d.total_views||0).toLocaleString(),label:t('videos.totalViewsDelivered'),color:'var(--sap-indigo)',bg:'#f5f3ff',border:'#e9d5ff',icon:Eye},
        ].map(function(s, i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:s.bg,border:'1px solid '+s.border,borderRadius:14,padding:20,position:'relative'}}>
              <div style={{position:'absolute',top:12,right:12,width:32,height:32,borderRadius:8,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={16} color={s.color}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Campaign list */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'var(--sap-cobalt-deep)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Film size={16} color="var(--sap-accent-light)"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{t('videos.yourCampaigns')}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</span>
            <Link to="/create-campaign" style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'#fff',background:'var(--sap-accent)',padding:'6px 14px',borderRadius:8,textDecoration:'none'}}>
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
                      <img src={thumb} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Film size={24} color="#334155"/>
                      </div>
                    )}
                    {c.video_url && (
                      <a href={c.video_url} target="_blank" rel="noreferrer"
                        style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.35)',opacity:0,transition:'opacity .2s',cursor:'pointer'}}
                        onMouseEnter={function(e){e.currentTarget.style.opacity='1';}}
                        onMouseLeave={function(e){e.currentTarget.style.opacity='0';}}>
                        <Play size={28} color="#fff" fill="#fff"/>
                      </a>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--sap-text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title || 'Untitled'}</div>
                      <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,
                        background:sc.bg,color:sc.color,border:'1px solid '+sc.border,textTransform:'capitalize',flexShrink:0}}>
                        {statusIcon(c.status)} {c.status}
                      </span>
                    </div>
                    <div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:8}}>
                      {c.platform || '—'} · {c.category || 'General'}
                      {c.target_country ? ' · 🎯 ' + c.target_country : ''}
                      {c.target_interests ? ' · ' + c.target_interests : ''}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{flex:1,height:6,background:'var(--sap-border)',borderRadius:3,overflow:'hidden',maxWidth:200}}>
                        <div style={{height:'100%',borderRadius:3,background:pct>=100?'var(--sap-green)':'var(--sap-accent)',width:pct+'%',transition:'width .3s'}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--sap-accent)'}}>{(c.views_delivered||0).toLocaleString()}</span>
                      <span style={{fontSize:10,color:'var(--sap-text-muted)'}}>/ {(c.views_target||0).toLocaleString()} {t('videos.views')}</span>
                      <span style={{fontSize:11,fontWeight:700,color:pct>=100?'var(--sap-green)':'var(--sap-text-muted)'}}>{pct}%</span>
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
                      <a href={c.video_url} target="_blank" rel="noreferrer"
                        style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'var(--sap-accent)',padding:'6px 12px',borderRadius:8,border:'1px solid rgba(14,165,233,.2)',background:'rgba(14,165,233,.04)',textDecoration:'none',cursor:'pointer'}}>
                        <Eye size={12}/> {t('videos.view')}
                      </a>
                    )}
                    <button onClick={function(){deleteCampaign(c.id, c.title);}} disabled={deleting === c.id}
                      style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'var(--sap-red)',padding:'6px 12px',borderRadius:8,border:'1px solid rgba(220,38,38,.15)',background:'rgba(220,38,38,.04)',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
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
            <div style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:20}}>{t('videos.activateATier')}</div>
            <Link to="/create-campaign" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#0ea5e9,#6366f1)',borderRadius:10,padding:'12px 28px',textDecoration:'none'}}>
              <Plus size={16}/> {t('videos.createFirst')}
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
