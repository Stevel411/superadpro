import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

/**
 * Your Purchases & Holdings — dedicated page (moved off the Account page
 * 28 May 2026 so Account stays focused on settings). Reads
 * /api/account/purchases (source-of-truth tables) so what members see can't
 * drift from reality. Closes the gap that caused the Daniela/cashflow
 * billing confusion.
 */
export default function AccountPurchases() {
  var { t } = useTranslation();
  var [purchases, setPurchases] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var cancelled = false;
    apiGet('/api/account/purchases')
      .then(function(d) { if (!cancelled && d && d.holdings) setPurchases(d); })
      .catch(function() { /* leave null — degrades gracefully */ })
      .finally(function() { if (!cancelled) setLoading(false); });
    return function() { cancelled = true; };
  }, []);

  var GREEN = 'var(--sap-green)', GREENBG = 'var(--sap-green-bg)';
  var labelS = {fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--sap-cobalt-mid)',margin:'0 0 14px'};
  var hcard = {background:'var(--sap-bg-card)',border:'1px solid var(--sap-border)',borderRadius:16,padding:22,display:'flex',flexDirection:'column',boxShadow:'var(--sap-shadow-sm)',position:'relative',overflow:'hidden'};
  var topbar = {content:'',position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,var(--sap-cobalt-mid),var(--sap-accent))'};
  var hicon = {width:40,height:40,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--sap-cobalt-deep),var(--sap-cobalt-mid))',color:'#fff',fontSize:18,flexShrink:0};
  var pill = {display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono,monospace',padding:'3px 9px',borderRadius:99,marginTop:12,alignSelf:'flex-start',background:GREENBG,color:GREEN,border:'1px solid rgba(22,163,74,.25)'};

  function HCard(props){return (
    <div style={hcard}>
      <div style={topbar}/>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={hicon}>{props.icon}</div>
        <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:14,color:'var(--sap-text-primary)'}}>{props.title}</div>
      </div>
      <div style={{fontFamily:'Sora,sans-serif',fontWeight:900,fontSize:26,color:'var(--sap-text-primary)',lineHeight:1.1,marginBottom:2}}>{props.value}</div>
      <div style={{fontSize:13,color:'var(--sap-text-faint)',flex:1}}>{props.meta}</div>
      <span style={pill}><span style={{width:6,height:6,borderRadius:'50%',background:GREEN,display:'inline-block'}}/>{props.status}</span>
    </div>
  );}

  return (
    <AppLayout title={t('account.purchasesTitle',{defaultValue:'Your Purchases & Holdings'})} subtitle={t('account.purchasesSub',{defaultValue:"Everything you've bought and what's active on your account."})}>

      <div style={{marginBottom:18}}>
        <Link to="/account" style={{fontSize:14,fontWeight:700,color:'var(--sap-accent)',textDecoration:'none'}}>&larr; {t('account.backToAccount',{defaultValue:'Back to Account'})}</Link>
      </div>

      {loading && <div style={{padding:'40px',textAlign:'center',color:'var(--sap-text-faint)',fontSize:15}}>{t('common.loading',{defaultValue:'Loading…'})}</div>}

      {!loading && !purchases && (
        <div style={{background:'var(--sap-bg-card)',border:'1px solid var(--sap-border)',borderRadius:16,padding:'30px',textAlign:'center',color:'var(--sap-text-faint)',fontSize:14,boxShadow:'var(--sap-shadow-sm)'}}>
          {t('account.purchasesUnavailable',{defaultValue:"We couldn't load your purchases right now. Please refresh, or contact support if this continues."})}
        </div>
      )}

      {!loading && purchases && (function() {
        var h = purchases.holdings || {};
        var m = h.membership || {};
        var g = h.grid || {};
        var hist = purchases.history || [];
        return (
          <div>
            <div style={labelS}>{t('account.holdingsLabel',{defaultValue:'What you have right now'})}</div>
            <div className="grid-3-col" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,alignItems:'stretch',marginBottom:28}}>
              <HCard icon="★" title={t('account.membership',{defaultValue:'Membership'})}
                value={m.label||'—'}
                meta={(m.price?('$'+m.price+'/month'):'')+(m.renews_at?(' · renews '+new Date(m.renews_at).toLocaleDateString()):'')}
                status={m.active?t('account.activeStatus',{defaultValue:'Active'}):t('account.inactiveStatus',{defaultValue:'Inactive'})}/>
              {g.has_position
                ? <HCard icon="▦" title={t('account.profitGrid',{defaultValue:'Profit Grid'})}
                    value={'Tier '+(g.tier||1)}
                    meta={t('account.gridMeta',{defaultValue:'Active campaign position'})}
                    status={t('account.activeStatus',{defaultValue:'Active'})}/>
                : <HCard icon="▦" title={t('account.profitGrid',{defaultValue:'Profit Grid'})}
                    value="—"
                    meta={t('account.noGrid',{defaultValue:'No active campaign tier yet'})}
                    status={t('account.notActive',{defaultValue:'None'})}/>}
            </div>

            <div style={labelS}>{t('account.historyLabel',{defaultValue:'Purchase history'})}</div>
            <div style={{background:'var(--sap-bg-card)',border:'1px solid var(--sap-border)',borderRadius:16,overflow:'hidden',boxShadow:'var(--sap-shadow-sm)'}}>
              {hist.length===0 && <div style={{padding:'22px',textAlign:'center',color:'var(--sap-text-faint)',fontSize:14}}>{t('account.noPurchases',{defaultValue:'No purchases yet.'})}</div>}
              {hist.map(function(row,i){
                return (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'90px 1fr auto',gap:18,alignItems:'center',padding:'18px 22px',borderBottom:i<hist.length-1?'1px solid var(--sap-border-light)':'none'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:'var(--sap-text-faint)'}}>{row.date?new Date(row.date).toLocaleDateString():'—'}</div>
                    <div>
                      <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:15,color:'var(--sap-text-primary)'}}>{row.product}</div>
                      <div style={{fontSize:13,color:'var(--sap-text-secondary)',marginTop:3}}>{row.delivered}</div>
                    </div>
                    <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                      <div style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:17,color:'var(--sap-text-primary)'}}>${row.amount.toFixed(2)}</div>
                      <span style={{fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono,monospace',padding:'3px 9px',borderRadius:99,background:GREENBG,color:GREEN,border:'1px solid rgba(22,163,74,.25)'}}>{row.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{marginTop:16,fontSize:13,color:'var(--sap-text-faint)',textAlign:'center'}}>
              {t('account.purchasesHelp',{defaultValue:'Questions about a charge? Contact support — we\'re happy to help.'})}
            </div>
          </div>
        );
      })()}

    </AppLayout>
  );
}
