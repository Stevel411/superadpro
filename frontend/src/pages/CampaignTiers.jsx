import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check, X } from 'lucide-react';
import { formatMoney } from '../utils/money';

/* ─────────────────────────────────────────────
   Campaign Tiers — Cyan-blue cards + modal popup
   ───────────────────────────────────────────── */

var TIER_ACCENTS = {
  1: { color:'var(--sap-green-mid)', dark:'var(--sap-green-dark)', bg:'var(--sap-green-bg)', border:'#bbf7d0', grad:'linear-gradient(135deg,#059669,#10b981)', cardGrad:'linear-gradient(135deg,#064e3b,#047857,#10b981)' },
  2: { color:'#3b82f6', dark:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', grad:'linear-gradient(135deg,#2563eb,#3b82f6)', cardGrad:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)' },
  3: { color:'var(--sap-purple)', dark:'var(--sap-violet)', bg:'var(--sap-purple-pale)', border:'#c4b5fd', grad:'linear-gradient(135deg,#7c3aed,#8b5cf6)', cardGrad:'linear-gradient(135deg,#172554,#4c1d95,#8b5cf6)' },
  4: { color:'var(--sap-pink)', dark:'#db2777', bg:'#fce7f3', border:'#f9a8d4', grad:'linear-gradient(135deg,#db2777,#ec4899)', cardGrad:'linear-gradient(135deg,#831843,#be185d,#ec4899)' },
  5: { color:'#14b8a6', dark:'#0d9488', bg:'#ccfbf1', border:'#99f6e4', grad:'linear-gradient(135deg,#0d9488,#14b8a6)', cardGrad:'linear-gradient(135deg,#134e4a,#0d9488,#2dd4bf)' },
  6: { color:'#9ca3af', dark:'#6b7280', bg:'#f3f4f6', border:'#d1d5db', grad:'linear-gradient(135deg,#6b7280,#9ca3af)', cardGrad:'linear-gradient(135deg,#6b7280,#9ca3af,#d1d5db)', darkText:true },
  7: { color:'var(--sap-amber)', dark:'#b45309', bg:'var(--sap-amber-bg)', border:'#fde68a', grad:'linear-gradient(135deg,#b45309,#f59e0b)', cardGrad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)' },
  8: { color:'var(--sap-red-bright)', dark:'var(--sap-red)', bg:'var(--sap-red-bg)', border:'var(--sap-red-bg-mid)', grad:'linear-gradient(135deg,#dc2626,#ef4444)', cardGrad:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)' },
};

var FEATURES_BY_TIER = {
  1: ['1 campaign', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  2: ['3 campaigns', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  3: ['5 campaigns', 'Extended reach', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  4: ['10 campaigns', 'Targeting', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  5: ['20 campaigns', 'Priority queue', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  6: ['30 campaigns', 'Featured placement', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  7: ['50 campaigns', 'Spotlight', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  8: ['Unlimited campaigns', 'All features', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
};

var BONUSES = { 1:64, 2:160, 3:320, 4:640, 5:1280, 6:1920, 7:2560, 8:3200 };

export default function CampaignTiers() {
  var { t } = useTranslation();
  var [tiers, setTiers] = useState([]);

  var FEATURES_BY_TIER_T = {
    1: [t('campaignTiers.feat1Campaign'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    2: [t('campaignTiers.feat3Campaigns'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    3: [t('campaignTiers.feat5Campaigns'), t('campaignTiers.featExtendedReach'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    4: [t('campaignTiers.feat10Campaigns'), t('campaignTiers.featTargeting'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    5: [t('campaignTiers.feat20Campaigns'), t('campaignTiers.featPriorityQueue'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    6: [t('campaignTiers.feat30Campaigns'), t('campaignTiers.featFeaturedPlacement'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    7: [t('campaignTiers.feat50Campaigns'), t('campaignTiers.featSpotlight'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
    8: [t('campaignTiers.featUnlimitedCampaigns'), t('campaignTiers.featAllFeatures'), t('campaignTiers.feat8x8Grid'), t('campaignTiers.feat40Direct'), t('campaignTiers.feat625PerMember')],
  };
  var [loading, setLoading] = useState(true);
  var [selected, setSelected] = useState(null);

  useEffect(function() {
    apiGet('/api/campaign-tiers').then(function(d) {
      setTiers(d.tiers || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  /* Lock body scroll when modal is open */
  useEffect(function() {
    if (selected !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return function() { document.body.style.overflow = ''; };
  }, [selected]);

  if (loading) return (
    <AppLayout title={t("campaignTiers.title")}>
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'var(--sap-accent)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  function calcTotal(tierNum, price) {
    var personals = 5;
    var spillover = 59;
    var directEarn = personals * price * 0.4;
    var spilloverEarn = spillover * price * 0.0625;
    var bonus = BONUSES[tierNum] || 0;
    return Math.round(directEarn + spilloverEarn + bonus);
  }

  /* Modal data */
  var modalTier = selected !== null ? tiers.find(function(x) { return x.tier === selected; }) : null;
  var modalAccent = modalTier ? (TIER_ACCENTS[modalTier.tier] || TIER_ACCENTS[1]) : null;
  var modalFeats = modalTier ? (FEATURES_BY_TIER_T[modalTier.tier] || []) : [];
  var modalTotal = modalTier ? calcTotal(modalTier.tier, modalTier.price) : 0;

  return (
    <AppLayout title={t("campaignTiers.title")} subtitle={t("campaignTiers.subtitle")}>

      <style>{[
        '@keyframes spin{to{transform:rotate(360deg)}}',
        '@keyframes fadeIn{from{opacity:0}to{opacity:1}}',
        '@keyframes slideUp{from{opacity:0;transform:translateY(30px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
        '.ct-card{transition:transform .15s,box-shadow .15s;cursor:pointer}',
        '.ct-card:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(0,0,0,.12)!important}',
        '.ct-btn{transition:transform .1s!important}',
        '.ct-btn:hover{transform:translateY(-1px)!important}',
        '.ct-btn:active{transform:translateY(1px)!important}',
        '.ct-overlay{animation:fadeIn .2s ease-out}',
        '.ct-modal{animation:slideUp .25s ease-out}',
        '@media(max-width:767px){',
        '  .ct-grid{grid-template-columns:1fr 1fr!important}',
        '  .ct-detail-stats{grid-template-columns:1fr 1fr!important}',
        '  .ct-modal-inner{padding:24px 20px!important}',
        '  .ct-modal-header{flex-direction:column!important;gap:12px!important}',
        '  .ct-modal-price{text-align:left!important}',
        '}',
        '@media(max-width:480px){',
        '  .ct-grid{grid-template-columns:1fr!important}',
        '}',
      ].join('\n')}</style>

      {/* ── Header Banner ── */}
      <div style={{
        background:'linear-gradient(135deg,#0c1222,#172554,#2d3561)',
        borderRadius:18, padding:'32px 36px', marginBottom:24,
        textAlign:'center', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,.45)', marginBottom:8 }}>{t('campaignTiers.gridSystem')}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#fff', marginBottom:4 }}>
            {t('campaignTiers.activateTiers')}
          </div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'var(--sap-amber-bright)', marginBottom:12 }}>
            {t('campaignTiers.growYourGrid')}
          </div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', lineHeight:1.7, maxWidth:520, margin:'0 auto' }}>
            {t('campaignTiers.heroDesc')}
          </div>
        </div>
      </div>

      {/* ── Tier Cards — 4-column grid ── */}
      {[0, 4].map(function(start) {
        var row = tiers.slice(start, start + 4);
        if (row.length === 0) return null;
        return (
          <div key={start} className="ct-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
            {row.map(function(t) {
              var a = TIER_ACCENTS[t.tier] || TIER_ACCENTS[1];
              var active = t.is_active;
              var isPopular = t.tier === 3;
              var isMax = t.tier === 8;

              return (
                <div key={t.tier} className="ct-card" onClick={function() { setSelected(t.tier); }}
                  style={{
                    background:a.cardGrad,
                    borderRadius:14, padding:20,
                    display:'flex', flexDirection:'column', gap:10,
                    position:'relative', textAlign:'center', overflow:'hidden',
                    boxShadow:'0 2px 8px rgba(0,0,0,.1)',
                  }}>

                  {/* Decorative circle */}
                  <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>

                  {isPopular && <span style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background: a.darkText ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.15)', color: a.darkText ? '#1f2937' : '#fff' }}>{t('campaignTiers.popular')}</span>}
                  {isMax && <span style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background: a.darkText ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.15)', color: a.darkText ? '#1f2937' : '#fff' }}>{t('campaignTiers.max')}</span>}

                  <div style={{ fontSize:15, fontWeight:800, color: a.darkText ? '#1f2937' : '#fff', position:'relative' }}>{t.name}</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color: a.darkText ? '#1f2937' : '#fff', position:'relative' }}>${t.price.toLocaleString()}</div>
                  <div style={{ fontSize:11, color: a.darkText ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.6)', position:'relative' }}>{t.views_target.toLocaleString()} views</div>

                  {active ? (
                    <div style={{ padding:9, borderRadius:8, background: a.darkText ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.12)', border:'1px solid ' + (a.darkText ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.15)'), marginTop:'auto', position:'relative' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, color: a.darkText ? '#1f2937' : '#fff', fontSize:12, fontWeight:700 }}>
                        <Check size={12}/> {t('campaignTiers.active')}
                      </span>
                    </div>
                  ) : (
                    <div style={{ padding:9, borderRadius:8, background: a.darkText ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.1)', border:'1px solid ' + (a.darkText ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.12)'), color: a.darkText ? '#1f2937' : 'rgba(255,255,255,.8)', fontSize:12, fontWeight:600, marginTop:'auto', position:'relative' }}>
                      View Details
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* How it works + Renewal info */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 24px', marginTop:4, marginBottom:16 }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:10 }}>{t('campaignTiers.howItWorks')}</div>
        <div style={{ fontSize:13, color:'var(--sap-text-muted)', lineHeight:1.8 }}>
          Each tier gives your videos real views through the Watch & Earn network. When you activate a tier, you are placed into an 8×8 grid with 64 member positions. You earn <span style={{ fontWeight:700, color:'var(--sap-text-primary)' }}>{t('campaignTiers.directCommission')}</span> on every referral who activates the same tier, plus <span style={{ fontWeight:700, color:'var(--sap-text-primary)' }}>{t('campaignTiers.gridMemberComm')}</span> as positions fill, plus a <span style={{ fontWeight:700, color:'var(--sap-text-primary)' }}>{t('campaignTiers.completionBonus')}</span> when the grid is full.
        </div>
        <div style={{ borderTop:'1px solid #f1f5f9', marginTop:14, paddingTop:14, display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ width:20, height:20, borderRadius:6, background:'var(--sap-amber-bg)', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
            <span style={{ fontSize:11, color:'var(--sap-amber-dark)', fontWeight:800 }}>!</span>
          </div>
          <div style={{ fontSize:13, color:'var(--sap-text-muted)', lineHeight:1.7 }}>
            <span style={{ fontWeight:700, color:'var(--sap-text-primary)' }}>{t('campaignTiers.renewalLabel')}</span> Tiers expire once all allocated views have been delivered. To continue receiving views and earning grid commissions, simply re-activate the tier. All one-time USDT payments — no subscriptions or recurring charges.
          </div>
        </div>
      </div>

      {/* ── Modal Overlay ── */}
      {modalTier && (
        <div className="ct-overlay"
          onClick={function() { setSelected(null); }}
          style={{
            position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:9999,
            background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:20,
          }}>
          <div className="ct-modal"
            onClick={function(e) { e.stopPropagation(); }}
            style={{ width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="ct-modal-inner" style={{
              background:'#fff', borderRadius:18, padding:'32px 36px',
              boxShadow:'0 20px 60px rgba(0,0,0,.2)',
              borderTop:'4px solid ' + modalAccent.color,
            }}>

              {/* Header */}
              <div className="ct-modal-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <span style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'var(--sap-text-primary)' }}>{modalTier.name}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, background:modalAccent.bg, color:modalAccent.dark }}>Tier {modalTier.tier}</span>
                    {modalTier.tier === 3 && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, background:modalAccent.bg, color:modalAccent.dark }}>{t('campaignTiers.popular')}</span>}
                    {modalTier.tier === 8 && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, background:modalAccent.bg, color:modalAccent.dark }}>{t('campaignTiers.maxEarnings')}</span>}
                  </div>
                  <div style={{ fontSize:13, color:'var(--sap-text-muted)' }}>
                    {t('campaignTiers.videoViewsAcross', {count: modalTier.views_target.toLocaleString()})}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div className="ct-modal-price" style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, color:'var(--sap-text-primary)' }}>${modalTier.price.toLocaleString()}</div>
                    <div style={{ fontSize:11, color:'var(--sap-text-muted)' }}>{t('campaignTiers.oneTimeUSDT')}</div>
                  </div>
                  <div onClick={function() { setSelected(null); }}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                    <X size={16} color="var(--sap-text-muted)"/>
                  </div>
                </div>
              </div>

              {/* Earnings stats */}
              <div className="ct-detail-stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:'var(--sap-bg-elevated)', border:'1px solid #f1f5f9' }}>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:modalAccent.dark }}>${formatMoney(modalTier.direct_commission)}</div>
                  <div style={{ fontSize:11, color:'var(--sap-text-muted)', marginTop:3 }}>{t('campaignTiers.directEarn')}</div>
                </div>
                <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:'var(--sap-bg-elevated)', border:'1px solid #f1f5f9' }}>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:modalAccent.dark }}>${formatMoney(modalTier.uni_level_per_member)}</div>
                  <div style={{ fontSize:11, color:'var(--sap-text-muted)', marginTop:3 }}>{t('campaignTiers.perMember')}</div>
                </div>
                <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:'var(--sap-bg-elevated)', border:'1px solid #f1f5f9' }}>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:modalAccent.dark }}>${modalTier.completion_bonus.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'var(--sap-text-muted)', marginTop:3 }}>{t('campaignTiers.gridBonus')}</div>
                </div>
                <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:modalAccent.bg, border:'1px solid ' + modalAccent.border }}>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:modalAccent.dark }}>${modalTotal.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:modalAccent.dark, marginTop:3, fontWeight:600 }}>{t('campaignTiers.estEarnings')}</div>
                </div>
              </div>

              <div style={{ fontSize:11, color:'var(--sap-text-muted)', fontStyle:'italic', marginBottom:20 }}>
                {t('campaignTiers.earningsDisclaimer')}
              </div>

              {/* Feature tags */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
                {modalFeats.map(function(f) {
                  return (
                    <span key={f} style={{ fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:8, background:'var(--sap-bg-elevated)', border:'1px solid #e2e8f0', color:'var(--sap-text-secondary)' }}>{f}</span>
                  );
                })}
              </div>

              {/* Grid progress if active */}
              {modalTier.is_active && modalTier.grid && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--sap-text-primary)' }}>{t('campaignTiers.gridProgress')}</span>
                    <span style={{ fontSize:12, color:'var(--sap-text-muted)' }}>{modalTier.grid.filled}/64 members · Grid #{modalTier.grid.advance}</span>
                  </div>
                  <div style={{ height:6, background:'var(--sap-bg-page)', borderRadius:4 }}>
                    <div style={{ height:'100%', width:modalTier.grid.pct+'%', background:modalAccent.grad, borderRadius:4, transition:'width .5s' }}/>
                  </div>
                </div>
              )}

              {/* Action button */}
              {modalTier.is_active ? (
                <div style={{
                  textAlign:'center', padding:14, borderRadius:10,
                  background:modalAccent.bg, border:'1px solid ' + modalAccent.border,
                }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:modalAccent.dark, fontSize:14, fontWeight:700 }}>
                    <Check size={14}/> {t('campaignTiers.tierIsActive')}
                  </span>
                </div>
              ) : (
                <Link to={'/activate/' + modalTier.tier} className="ct-btn" style={{
                  display:'block', textAlign:'center', padding:14, borderRadius:10,
                  background:modalAccent.grad, textDecoration:'none',
                }}>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{t('campaignTiers.activate', {name: modalTier.name, price: modalTier.price.toLocaleString()})}</span>
                </Link>
              )}

            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
