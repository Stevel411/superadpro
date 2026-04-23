import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { Coins, Globe, Check, Zap, Wrench, Users, Mail, BookOpen, Headphones } from 'lucide-react';
import CryptoCheckout from '../components/CryptoCheckout';
import WalletGuideCard from '../components/WalletGuideCard';

var css = `
  .up-card{border-radius:20px;overflow:hidden;position:relative;background:#fff;transition:transform .25s,box-shadow .25s}
  .up-card:hover{transform:translateY(-6px)}
  .up-card-basic{border:1px solid #e2e8f0;box-shadow:0 4px 6px rgba(0,0,0,.04),0 10px 24px rgba(0,0,0,.06),0 20px 48px rgba(0,0,0,.04)}
  .up-card-basic:hover{box-shadow:0 8px 16px rgba(0,0,0,.06),0 20px 40px rgba(0,0,0,.1),0 32px 64px rgba(0,0,0,.06)}
  .up-card-pro{border:2px solid rgba(239,68,68,.4);box-shadow:0 4px 6px rgba(239,68,68,.06),0 10px 24px rgba(239,68,68,.08),0 20px 48px rgba(239,68,68,.06)}
  .up-card-pro:hover{box-shadow:0 8px 16px rgba(239,68,68,.08),0 20px 40px rgba(239,68,68,.12),0 32px 64px rgba(239,68,68,.08)}
  .up-toggle-track{width:48px;height:26px;border-radius:13px;position:relative;cursor:pointer;transition:background .3s;background:#94a3b8}
  .up-toggle-track.on{background:linear-gradient(90deg,#172554,#1e3a8a)}
  .up-toggle-thumb{width:20px;height:20px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:transform .3s;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .up-toggle-track.on .up-toggle-thumb{transform:translateX(22px)}
  .up-feat{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid #f1f5f9}
  .up-feat:first-child{border-top:none}
`;

export default function Upgrade() {
  var { t } = useTranslation();
  var { user, refreshUser } = useAuth();

  // Admin preview mode: add ?preview=1 to URL to see page as a new user
  var urlParams = new URLSearchParams(window.location.search);
  var previewMode = user?.is_admin && urlParams.get('preview') === '1';

  var isPro = previewMode ? false : user?.membership_tier === 'pro';
  var isActive = previewMode ? false : user?.is_active;
  var [loading, setLoading] = useState('');
  var [error, setError] = useState('');
  var [cryptoCheckout, setCryptoCheckout] = useState(null);
  var [billing, setBilling] = useState('monthly');

  var isAnnual = billing === 'annual';
  var isBasicActive = isActive && !isPro;

  function nowPaymentsCheckout(tier) {
    setLoading(tier + '_np');
    setError('');
    var productKey = isAnnual ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    apiPost('/api/nowpayments/create-invoice', { product_key: productKey })
      .then(function(d) {
        setLoading('');
        if (d.invoice_url) { window.location.href = d.invoice_url; }
        else { setError(d.error || t('upgrade.couldNotStart')); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || t('upgrade.checkoutFailed')); });
  }

  function openCryptoCheckout(tier) {
    var label = isAnnual
      ? (tier === 'pro' ? 'Pro Annual \u2014 $350/year' : 'Basic Annual \u2014 $200/year')
      : (tier === 'pro' ? 'Pro Membership \u2014 $35/mo' : 'Basic Membership \u2014 $20/mo');
    var productKey = isAnnual ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    setCryptoCheckout({ productKey: productKey, label: label });
  }

  function handleUpgradeToPro() {
    setLoading('upgrade');
    setError('');
    apiPost('/api/upgrade-to-pro', {})
      .then(function(d) {
        setLoading('');
        if (d.message) { if (refreshUser) refreshUser(); }
        else { setError(d.error || t('upgrade.upgradeFailed')); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || t('upgrade.upgradeFailed')); });
  }

  function FeatureRow({ icon, text, bold, color }) {

    var { t } = useTranslation();
  var bg = color === 'red' ? 'var(--sap-red-bg)' : '#eff6ff';
    var stroke = color === 'red' ? 'var(--sap-red)' : '#2563eb';
    return (
      <div className="up-feat">
        <div style={{ width:30, height:30, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {icon || <Check size={14} color={stroke} strokeWidth={2.5} />}
        </div>
        <span style={{ fontSize:14, color: bold ? 'var(--sap-text-primary)' : 'var(--sap-text-secondary)', fontWeight: bold ? 700 : 400, lineHeight:1.5 }}>{text}</span>
      </div>
    );
  }

  function PayButtons({ tier }) {

    var { t } = useTranslation();
  var isCurrent = (tier === 'basic' && isBasicActive) || (tier === 'pro' && isPro);
    var isUpgrade = tier === 'pro' && isBasicActive;
    var btnGrad = tier === 'pro'
      ? 'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)'
      : 'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)';
    var btnShadow = tier === 'pro'
      ? '0 4px 16px rgba(239,68,68,.2)'
      : '0 4px 16px rgba(37,99,235,.2)';
    var price = isAnnual
      ? (tier === 'pro' ? '$350' : '$200')
      : (tier === 'pro' ? '$35' : '$20');

    if (isCurrent) {
      return (
        <div style={{ padding:14, borderRadius:14, fontSize:14, fontWeight:700, textAlign:'center', background:'linear-gradient(135deg,#dcfce7,#bbf7d0)', color:'var(--sap-green-dark)', border:'1px solid #86efac' }}>
          {t("upgrade.currentPlan")}
        </div>
      );
    }

    if (isUpgrade) {
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={handleUpgradeToPro} disabled={loading === 'upgrade'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:16, borderRadius:14, fontSize:15, fontWeight:700, border:'none', cursor: loading === 'upgrade' ? 'default' : 'pointer', fontFamily:'inherit', background: loading === 'upgrade' ? 'var(--sap-text-muted)' : btnGrad, color:'#fff', boxShadow: loading === 'upgrade' ? 'none' : btnShadow }}>
            {loading === 'upgrade' ? t('upgrade.upgrading') : t('upgrade.upgradeToPro')}
          </button>
          <div style={{ fontSize:13, color:'var(--sap-text-muted)', textAlign:'center' }}>{t('upgrade.upgradeProDiff')}</div>
        </div>
      );
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={function(){ openCryptoCheckout(tier); }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:16, borderRadius:14, fontSize:15, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', background:btnGrad, color:'#fff', boxShadow:btnShadow, transition:'all .2s' }}>
          <Coins size={17} /> {t('upgrade.payWithCrypto')}
        </button>
        <button onClick={function(){ nowPaymentsCheckout(tier); }} disabled={loading === tier + '_np'}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:14, borderRadius:14, fontSize:14, fontWeight:700, border:'1.5px solid #e2e8f0', cursor: loading === tier + '_np' ? 'default' : 'pointer', fontFamily:'inherit', background:'#fff', color:'var(--sap-text-muted)', transition:'all .2s' }}
          onMouseOver={function(e){e.currentTarget.style.borderColor='var(--sap-accent)';e.currentTarget.style.color='var(--sap-accent)'}}
          onMouseOut={function(e){e.currentTarget.style.borderColor='var(--sap-border)';e.currentTarget.style.color='var(--sap-text-muted)'}}>
          <Globe size={16} />
          {loading === tier + '_np' ? t('upgrade.loadingCheckout') : t('upgrade.payWith350', {price})}
        </button>
        <div style={{ textAlign:'center', fontSize:13, color:'var(--sap-text-muted)' }}>{t('upgrade.securePayment')}</div>
      </div>
    );
  }

  return (
    <AppLayout title={t("upgrade.title")} subtitle={t("upgrade.subtitle")}>
      <style>{css}</style>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {error && (
          <div style={{ background:'var(--sap-red-bg)', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:14, color:'var(--sap-red)', textAlign:'center' }}>
            {error}
          </div>
        )}

        {/* Toggle */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:14, background:'var(--sap-bg-elevated)', border:'1px solid #e2e8f0', borderRadius:50, padding:'8px 24px' }}>
            <span onClick={function(){setBilling('monthly')}} style={{ fontSize:14, fontWeight:600, color: !isAnnual ? 'var(--sap-text-primary)' : 'var(--sap-text-muted)', cursor:'pointer', userSelect:'none', transition:'color .2s' }}>{t('upgrade.monthly')}</span>
            <div className={'up-toggle-track' + (isAnnual ? ' on' : '')} onClick={function(){setBilling(isAnnual ? 'monthly' : 'annual')}}>
              <div className="up-toggle-thumb"/>
            </div>
            <span onClick={function(){setBilling('annual')}} style={{ fontSize:14, fontWeight:600, color: isAnnual ? 'var(--sap-text-primary)' : 'var(--sap-text-muted)', cursor:'pointer', userSelect:'none', transition:'color .2s' }}>{t('upgrade.annual')}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--sap-green)', background:'var(--sap-green-bg)', border:'1px solid #dcfce7', padding:'3px 10px', borderRadius:20 }}>{t('upgrade.save17')}</span>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'stretch', marginBottom:32 }}>

          {/* BASIC */}
          <div className="up-card up-card-basic" style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'44px 32px 40px', background:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', bottom:-30, left:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>{t('upgrade.basic')}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                  {isAnnual ? '$200' : '$20'}<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:8 }}>
                  {isAnnual ? t('upgrade.basicEffective') : t('upgrade.billedMonthly')}
                </div>
                {isAnnual && (
                  <div style={{ fontSize:18, fontWeight:800, color:'#4ade80', marginTop:12, textShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                    {t('upgrade.saveBasicAnnual')}
                  </div>
                )}
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:16, lineHeight:1.6 }}>
                  {t('upgrade.basicDesc')}
                </div>
              </div>
            </div>
            <div style={{ padding:'24px 32px 32px', flex:1, display:'flex', flexDirection:'column' }}>
              <div style={{ marginBottom:20 }}>
                <FeatureRow text={t("upgrade.featCreativeStudio")} bold color="blue" />
                <FeatureRow text={t("upgrade.featLinkHub")} color="blue" />
                <FeatureRow text={t("upgrade.featLinkTools")} color="blue" />
                <FeatureRow text={t("upgrade.featContentCreator")} color="blue" />
                <FeatureRow text={t("upgrade.featCampaignGrid")} color="blue" />
                <FeatureRow text={t("upgrade.featReferralComm")} color="blue" />
                <FeatureRow text={t("upgrade.featProfitNexus")} color="blue" />
              </div>
              <div style={{ flex:1 }}/>
              <PayButtons tier="basic" />
            </div>
          </div>

          {/* PRO */}
          <div className="up-card up-card-pro" style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ position:'absolute', top:16, right:16, fontSize:13, fontWeight:700, color:'#fff', background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', padding:'5px 14px', borderRadius:6, zIndex:3, textTransform:'uppercase', letterSpacing:.5 }}>{t('upgrade.mostPopular')}</div>
            <div style={{ padding:'44px 32px 40px', background:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', bottom:-30, left:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>{t('upgrade.pro')}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                  {isBasicActive ? '$15' : isAnnual ? '$350' : '$35'}<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>/{isBasicActive ? 'upgrade' : isAnnual ? 'yr' : 'mo'}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:8 }}>
                  {isBasicActive ? t('upgrade.proUpgradeNext') : isAnnual ? t('upgrade.proEffective') : t('upgrade.billedMonthly')}
                </div>
                {isAnnual && !isBasicActive && (
                  <div style={{ fontSize:18, fontWeight:800, color:'#4ade80', marginTop:12, textShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                    {t('upgrade.saveProAnnual')}
                  </div>
                )}
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:16, lineHeight:1.6 }}>
                  {t('upgrade.proDesc')}
                </div>
              </div>
            </div>
            <div style={{ padding:'24px 32px 32px', flex:1, display:'flex', flexDirection:'column' }}>
              <div style={{ marginBottom:20 }}>
                <FeatureRow text={t("upgrade.featEverythingPlus")} bold color="red" />
                <FeatureRow text={t("upgrade.featSuperPages")} color="red" icon={<Zap size={14} color="var(--sap-red)" />} />
                <FeatureRow text={t("upgrade.featSuperSeller")} color="red" icon={<Wrench size={14} color="var(--sap-red)" />} />
                <FeatureRow text={t("upgrade.featLeadsCRM")} color="red" icon={<Users size={14} color="var(--sap-red)" />} />
                <FeatureRow text={t("upgrade.featAutoresponder")} color="red" icon={<Mail size={14} color="var(--sap-red)" />} />
                <FeatureRow text={t("upgrade.featCourseCreator")} color="red" icon={<BookOpen size={14} color="var(--sap-red)" />} />
                <FeatureRow text={t("upgrade.featPrioritySupport")} color="red" icon={<Headphones size={14} color="var(--sap-red)" />} />
              </div>
              <div style={{ flex:1 }}/>
              <PayButtons tier="pro" />
            </div>
          </div>

        </div>

        {/* Sponsor section */}
        <div style={{ background:'var(--sap-bg-elevated)', borderRadius:20, border:'1px solid #e2e8f0', padding:'28px 32px', textAlign:'center', marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,.03)' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:8 }}>{t('upgrade.earnWhileGrow')}</div>
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', lineHeight:1.7 }}>{t('upgrade.earnWhileGrowDesc')}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:14, padding:'10px 20px', background:'var(--sap-green-bg)', border:'1px solid #dcfce7', borderRadius:12, fontSize:14, fontWeight:700, color:'var(--sap-green)' }}>
            {t('upgrade.annualProReferral')}
          </div>
        </div>

        <div style={{ marginTop:24 }}>
          <WalletGuideCard compact />
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--sap-text-muted)', marginTop:16 }}>
          {t('upgrade.securePaymentFooter')}
        </p>
      </div>

      {cryptoCheckout && (
        <CryptoCheckout
          productKey={cryptoCheckout.productKey}
          productLabel={cryptoCheckout.label}
          onSuccess={function(){ setCryptoCheckout(null); if (refreshUser) refreshUser(); }}
          onCancel={function(){ setCryptoCheckout(null); }}
        />
      )}
    </AppLayout>
  );
}
