import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { Globe, Check, Zap, Wrench, Users, Mail, BookOpen, Headphones } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Lazy-load self-custody payment components — Reown/wagmi adds heavy
// crypto deps to the bundle. Loaded only when this page renders.
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

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

  var isBasicActive = isActive && !isPro;

  // Purchase consent gate — shows the no-refund / immediate-activation
  // modal before any money-in action. See app/purchase_consent.py.
  var { ensureConsent, consentModal } = useConsentGate();

  async function nowPaymentsCheckout(tier, billing) {
    // Consent gate FIRST. If the user cancels, abort silently.
    var consented = await ensureConsent();
    if (!consented) return;

    var loadKey = tier + '_' + billing + '_np';
    setLoading(loadKey);
    setError('');
    var productKey = billing === 'annual' ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    apiPost('/api/nowpayments/create-invoice', { product_key: productKey })
      .then(function(d) {
        setLoading('');
        if (d.invoice_url) { window.location.href = d.invoice_url; }
        else { setError(d.error || t('upgrade.couldNotStart')); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || t('upgrade.checkoutFailed')); });
  }

  async function handleUpgradeToPro() {
    // Consent gate FIRST. /api/upgrade-to-pro is a money-in flow
    // (deducts $15 from balance) so it needs the same gate.
    var consented = await ensureConsent();
    if (!consented) return;

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
        <span style={{ fontSize:15, color: bold ? 'var(--sap-text-primary)' : 'var(--sap-text-secondary)', fontWeight: bold ? 700 : 400, lineHeight:1.5 }}>{text}</span>
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

    // Pricing per tier — annual saves $40 (basic) or $70 (pro)
    var monthlyPrice = tier === 'pro' ? '$35' : '$20';
    var annualPrice = tier === 'pro' ? '$350' : '$200';
    var saveBadge = tier === 'pro' ? 'Save $70' : 'Save $40';
    var annualKey = tier + '_annual_np';
    var monthlyKey = tier + '_monthly_np';

    if (isCurrent) {
      return (
        <div style={{ padding:14, borderRadius:14, fontSize:15, fontWeight:700, textAlign:'center', background:'linear-gradient(135deg,#dcfce7,#bbf7d0)', color:'var(--sap-green-dark)', border:'1px solid #86efac' }}>
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
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', textAlign:'center' }}>{t('upgrade.upgradeProDiff')}</div>
        </div>
      );
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Annual — primary CTA with savings badge */}
        <button onClick={function(){ nowPaymentsCheckout(tier, 'annual'); }} disabled={loading === annualKey}
          style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', gap:12, width:'100%', padding:'22px 20px', borderRadius:14, fontSize:17, fontWeight:800, border:'none', cursor: loading === annualKey ? 'wait' : 'pointer', fontFamily:'inherit', background:btnGrad, color:'#fff', boxShadow:btnShadow, transition:'all .2s', opacity: loading === annualKey ? 0.85 : 1 }}>
          <span style={{ position:'absolute', top:-9, right:14, fontSize:11, fontWeight:800, color:'#064e3b', background:'#bbf7d0', border:'1px solid #86efac', padding:'2px 10px', borderRadius:20, letterSpacing:.3 }}>{saveBadge}</span>
          {loading === annualKey ? (
            <>
              <span style={{ display:'inline-block', width:18, height:18, border:'2.5px solid rgba(255,255,255,.5)', borderTopColor:'#fff', borderRadius:'50%', animation:'sap-spin 0.8s linear infinite' }}/>
              <span>Creating your secure invoice…</span>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Globe size={20} />
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.2 }}>
                <span>{`Pay yearly · ${annualPrice}`}</span>
                <span style={{ fontSize:10, fontWeight:600, opacity:0.75, letterSpacing:0.5, textTransform:'uppercase', marginTop:2 }}>via NOWPayments</span>
              </div>
            </div>
          )}
        </button>

        {/* Monthly — secondary outline */}
        <button onClick={function(){ nowPaymentsCheckout(tier, 'monthly'); }} disabled={loading === monthlyKey}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:'18px 16px', borderRadius:14, fontSize:15, fontWeight:700, border:'1.5px solid #e2e8f0', cursor: loading === monthlyKey ? 'wait' : 'pointer', fontFamily:'inherit', background:'#fff', color:'var(--sap-text-muted)', transition:'all .2s' }}
          onMouseOver={function(e){ if (loading !== monthlyKey) { e.currentTarget.style.borderColor='var(--sap-accent)'; e.currentTarget.style.color='var(--sap-accent)'; } }}
          onMouseOut={function(e){ e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='var(--sap-text-muted)'; }}>
          {loading === monthlyKey ? (
            <>
              <span style={{ display:'inline-block', width:16, height:16, border:'2.5px solid rgba(0,0,0,.15)', borderTopColor:'var(--sap-accent)', borderRadius:'50%', animation:'sap-spin 0.8s linear infinite' }}/>
              <span>Creating your secure invoice…</span>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Globe size={17} />
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.2 }}>
                <span>{`Pay monthly · ${monthlyPrice}`}</span>
                <span style={{ fontSize:10, fontWeight:600, opacity:0.7, letterSpacing:0.5, textTransform:'uppercase', marginTop:2 }}>via NOWPayments</span>
              </div>
            </div>
          )}
        </button>
        <style>{'@keyframes sap-spin{to{transform:rotate(360deg)}}'}</style>

        {/* ── Self-custody BSC payment (parallel-run alongside NOWPayments) ──
            Provider + connect button live at page level (above both tier
            cards). PayLinks only render once wallet is connected. */}
        <div style={{ position:'relative', margin:'2px 0', textAlign:'center' }}>
          <div style={{ height:1, background:'#e2e8f0', position:'absolute', left:0, right:0, top:'50%' }}/>
          <span style={{ position:'relative', background:'#fff', padding:'0 12px', fontSize:11, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:.5, fontWeight:600 }}>or pay direct from your wallet</span>
        </div>
        <Suspense fallback={null}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <WalletPayLink
              productType="membership"
              productKey={`membership_${tier}_annual`}
              label={`Pay yearly $${annualPrice.replace('$','')} from wallet`}
              style={{ padding:'12px 16px', fontSize:13, borderRadius:10 }}
            />
            <WalletPayLink
              productType="membership"
              productKey={`membership_${tier}`}
              label={`Pay monthly $${monthlyPrice.replace('$','')} from wallet`}
              style={{ padding:'10px 14px', fontSize:12, borderRadius:10 }}
            />
          </div>
        </Suspense>

        <div style={{ textAlign:'center', fontSize:13, color:'var(--sap-text-muted)', lineHeight:1.6 }}>
          {"\uD83D\uDD12"} Secure checkout · 350+ cryptos accepted (USDT, BTC, ETH, more)
          <br/>
          {"\u26A1"} {t('upgrade.securePayment')}
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <AppLayout title={t("upgrade.title")} subtitle={t("upgrade.subtitle")}>
        <div />
      </AppLayout>
    }>
    <WalletConnectProvider onBeforeClick={async function() { return await ensureConsent(); }}>
    <AppLayout
      title={t("upgrade.title")}
      subtitle={t("upgrade.subtitle")}
      topbarActions={
        <Suspense fallback={null}>
          <WalletConnectGate variant="compact" />
        </Suspense>
      }
    >
      <style>{css}</style>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {error && (
          <div style={{ background:'var(--sap-red-bg)', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:15, color:'var(--sap-red)', textAlign:'center' }}>
            {error}
          </div>
        )}

        {/* Tier cards — connect button now lives in the top header
            via topbarActions. PayLinks read connection state from the
            page-level WalletConnectProvider context. */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'stretch', marginBottom:32 }}>

          {/* BASIC */}
          <div className="up-card up-card-basic" style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'44px 32px 40px', background:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', bottom:-30, left:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>{t('upgrade.basic')}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                  $200<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>/yr</span>
                </div>
                <div style={{ fontSize:15, fontWeight:500, color:'rgba(255,255,255,.8)', marginTop:8 }}>
                  $16.67/mo equivalent
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'#fff', background:'rgba(34,197,94,.85)', padding:'4px 12px', borderRadius:20, display:'inline-block', marginTop:12 }}>
                  Save $40 vs monthly
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,.65)', marginTop:14 }}>
                  or $20/mo billed monthly
                </div>
                <div style={{ fontSize:15, fontWeight:500, color:'rgba(255,255,255,.8)', marginTop:16, lineHeight:1.6 }}>
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
                {isBasicActive ? (
                  <>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                      $15<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>/upgrade</span>
                    </div>
                    <div style={{ fontSize:15, fontWeight:500, color:'rgba(255,255,255,.8)', marginTop:8 }}>
                      {t('upgrade.proUpgradeNext')}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                      $350<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>/yr</span>
                    </div>
                    <div style={{ fontSize:15, fontWeight:500, color:'rgba(255,255,255,.8)', marginTop:8 }}>
                      $29.17/mo equivalent
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#fff', background:'rgba(34,197,94,.85)', padding:'4px 12px', borderRadius:20, display:'inline-block', marginTop:12 }}>
                      Save $70 vs monthly
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,.65)', marginTop:14 }}>
                      or $35/mo billed monthly
                    </div>
                  </>
                )}
                <div style={{ fontSize:15, fontWeight:500, color:'rgba(255,255,255,.8)', marginTop:16, lineHeight:1.6 }}>
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
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:8 }}>{t('upgrade.earnWhileGrow')}</div>
          <div style={{ fontSize:16, color:'var(--sap-text-muted)', lineHeight:1.7 }}>{t('upgrade.earnWhileGrowDesc')}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:14, padding:'10px 20px', background:'var(--sap-green-bg)', border:'1px solid #dcfce7', borderRadius:12, fontSize:14, fontWeight:700, color:'var(--sap-green)' }}>
            {t('upgrade.annualProReferral')}
          </div>
        </div>

        <div style={{ marginTop:24, padding:'18px 20px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:8 }}>
            Withdrawal wallet setup
          </div>
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', lineHeight:1.6, marginBottom:12 }}>
            SuperAdPro pays out in USDT on <strong>BEP-20 (BNB Chain)</strong>.
            You'll need a wallet that supports BEP-20 — MetaMask, Trust Wallet, or Binance all work.
          </div>
          <Link to="/account" style={{ fontSize:14, fontWeight:700, color:'var(--sap-accent)', textDecoration:'none' }}>
            Set up your withdrawal wallet →
          </Link>
        </div>

        <p style={{ textAlign:'center', fontSize:13, color:'var(--sap-text-muted)', marginTop:16 }}>
          {t('upgrade.securePaymentFooter')}
        </p>
      </div>
      {consentModal}
    </AppLayout>
    </WalletConnectProvider>
    </Suspense>
  );
}
