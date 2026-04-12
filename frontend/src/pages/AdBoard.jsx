import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { ExternalLink, Tag, Clock } from 'lucide-react';

var CATEGORIES = ['All','Business','Crypto','Health','Tech','Education','Finance','Marketing','Lifestyle','General'];
var CAT_COLORS = {business:'var(--sap-accent)',crypto:'var(--sap-amber)',health:'var(--sap-green)',tech:'var(--sap-indigo)',education:'var(--sap-purple)',finance:'#0284c7',marketing:'var(--sap-pink)',lifestyle:'#f97316',general:'var(--sap-text-muted)'};

export default function AdBoard() {
  var { t } = useTranslation();
  var [ads, setAds] = useState([]);
  var [loading, setLoading] = useState(true);
  var [filter, setFilter] = useState('All');

  useEffect(function() {
    apiGet('/api/ad-board').then(function(r) { setAds(r.ads || []); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  var filtered = filter === 'All' ? ads : ads.filter(function(a) { return (a.category || '').toLowerCase() === filter.toLowerCase(); });

  if (loading) return <AppLayout title={t("adBoard.title")}><Spin/></AppLayout>;

  return (
    <AppLayout title={t("adBoard.title")} subtitle={t("adBoard.subtitle")}>
      {/* Action buttons */}
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <a href="/ads/my" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',fontWeight:700,fontSize:14,textDecoration:'none',fontFamily:'inherit',boxShadow:'0 4px 0 #047857,0 6px 12px rgba(16,185,129,.2)'}}>
          + Create Ad
        </a>
        <a href="/banner-manager" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',fontWeight:700,fontSize:14,textDecoration:'none',fontFamily:'inherit',boxShadow:'0 4px 0 #b45309,0 6px 12px rgba(245,158,11,.2)'}}>
          + Create Banner
        </a>
        <a href="/ads/my" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'var(--sap-text-muted)',fontWeight:700,fontSize:14,textDecoration:'none',fontFamily:'inherit'}}>
          My Listings
        </a>
      </div>

      {/* Category filter */}
      <div style={{display:'flex',gap:4,marginBottom:20,flexWrap:'wrap'}}>
        {CATEGORIES.map(function(c) {
          var on = filter === c;
          return (
            <button key={c} onClick={function() { setFilter(c); }}
              style={{padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:700,fontFamily:'inherit',cursor:'pointer',
                border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',
                background:on?'rgba(14,165,233,.06)':'#fff',color:on?'var(--sap-accent)':'var(--sap-text-faint)',transition:'all .15s'}}>
              {c}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {filtered.map(function(a, i) {
            var catColor = CAT_COLORS[(a.category || '').toLowerCase()] || 'var(--sap-text-muted)';
            return (
              <div key={a.id || i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.04)',transition:'all .2s',cursor:'pointer'}}
                onMouseEnter={function(e) { e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.04)'; e.currentTarget.style.transform='translateY(0)'; }}>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontSize:24}}>{a.icon || '📢'}</div>
                    <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:4,color:catColor,background:catColor+'12',border:'1px solid '+catColor+'20',textTransform:'uppercase',letterSpacing:.5}}>{a.category || 'General'}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:6,lineHeight:1.3}}>{a.title}</div>
                  <div style={{fontSize:12,color:'var(--sap-text-muted)',lineHeight:1.6,marginBottom:12,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{a.description}</div>
                  {a.link_url && (
                    <a href={a.link_url} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'var(--sap-accent)',textDecoration:'none'}}>
                      <ExternalLink size={12}/> Visit
                    </a>
                  )}
                </div>
                <div style={{padding:'8px 18px',background:'var(--sap-bg-input)',borderTop:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:4}}>
                  <Clock size={10} color="var(--sap-text-faint)"/>
                  <span style={{fontSize:10,color:'var(--sap-text-faint)'}}>{a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:40,marginBottom:12,opacity:.3}}>📢</div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:4}}>{t('adBoard.noListingsYet')}</div>
          <div style={{fontSize:13,color:'var(--sap-text-faint)'}}>{t('adBoard.adBoardWillFill')}</div>
        </div>
      )}
    </AppLayout>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
