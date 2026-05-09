import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../utils/api';
import AppLayout from '../components/layout/AppLayout';
import { Gift, Copy, Check, Heart, ExternalLink, ChevronRight } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Step 4 triple-rail audit (7 May 2026): WalletConnect rail for PIF.
// Lazy-loaded so the rest of the page stays fast for users not paying
// via wallet.
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

export default function PayItForward() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [creating, setCreating] = useState(false);
  var [showForm, setShowForm] = useState(false);
  var [recipientName, setRecipientName] = useState('');
  var [message, setMessage] = useState('');
  var [newLink, setNewLink] = useState('');
  var [copied, setCopied] = useState('');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');

  // Consent gate hook — MUST be called before any early return so the
  // hook count is stable across renders. The first render returns the
  // loading spinner early; without this hook positioned above the
  // early-return, the second render would call useConsentGate where
  // the first didn't, triggering React error #310 ("Rendered more
  // hooks than during the previous render").
  // Used by the WalletPayLink for the on-chain rail. The wallet/crypto
  // buttons go through the backend's require_fresh_consent check;
  // they don't need this client-side gate.
  var consentGate = useConsentGate();

  function loadData() {
    apiGet('/api/pay-it-forward/dashboard').then(function(d) {
      setData(d);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadData(); }, []);

  function createVoucher(method) {
    if (creating) return;
    setCreating(true);
    setError('');
    setSuccess('');
    apiPost('/api/pay-it-forward/create', {
      recipient_name: recipientName,
      personal_message: message,
      pay_method: method || 'wallet',
    }).then(function(r) {
      if (r.checkout_url) {
        // Crypto — redirect to payment page
        window.location.href = r.checkout_url;
        return;
      }
      if (r.success) {
        setNewLink(r.link);
        setSuccess(t('payItForward.giftCreated'));
        setShowForm(false);
        setRecipientName('');
        setMessage('');
        loadData();
      } else {
        setError(r.error || t('payItForward.createFailed'));
      }
      setCreating(false);
    }).catch(function(e) {
      setError(e.message || t('payItForward.createFailed'));
      setCreating(false);
    });
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(function() { setCopied(''); }, 2000);
  }

  if (loading) return (
    <AppLayout title={t('payItForward.title')}>
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'var(--sap-pink)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  var stats = data ? data.stats : {};
  var vouchers = data ? data.vouchers : [];
  var canPayFromWallet = data ? data.can_pay_from_wallet : false;

  return (
    <Suspense fallback={
      <AppLayout title={t("payItForward.title")} subtitle={t("payItForward.subtitle")}>
        <div style={{ padding:80, textAlign:'center' }}>{t('common.loading') || 'Loading…'}</div>
      </AppLayout>
    }>
    <WalletConnectProvider onBeforeClick={async function() { return await consentGate.ensureConsent(); }}>
    <AppLayout
      title={t("payItForward.title")}
      subtitle={t("payItForward.subtitle")}
      topbarActions={
        <Suspense fallback={null}>
          <WalletConnectGate variant="compact" />
        </Suspense>
      }
    >

      <style>{'@keyframes spin{to{transform:rotate(360deg)}} .pif-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)!important}'}</style>

      {/* Hero Banner */}
      <div style={{
        background:'linear-gradient(135deg,#831843,#be185d,#ec4899)',
        borderRadius:18, padding:'32px 36px', marginBottom:24,
        textAlign:'center', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=75)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.12, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:-40, right:-40, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ width:68, height:68, borderRadius:18, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Heart size={34} color="#fff"/>
          </div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, color:'#fff', marginBottom:6 }}>{t('payItForward.heroTitle')}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, color:'var(--sap-amber-bright)', marginBottom:14 }}>{t('payItForward.changeLife')}</div>
          <div style={{ fontSize:16, color:'rgba(255,255,255,.85)', lineHeight:1.7, maxWidth:500, margin:'0 auto' }}>
            Gift a free membership to someone who needs it. When they succeed, they'll do the same for someone else. One act of generosity creates a chain of success.
          </div>
        </div>
      </div>

      {/* Stats — top row: the 4 metrics that tell the story.
          Earned-back is the marketing headline ("I gifted N people and
          earned $X back through their downstream activity"). On mobile
          the 4-col collapses to 2-col via globals.css's repeat(4 rule. */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:800, color:'var(--sap-pink)' }}>{stats.total_gifted || 0}</div>
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', marginTop:6 }}>{t('payItForward.giftsGiven')}</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:800, color:'var(--sap-green-mid)' }}>{stats.total_claimed || 0}</div>
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', marginTop:6 }}>{t('payItForward.livesChanged')}</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:800, color:'var(--sap-purple)' }}>{stats.max_chain_depth || 0}</div>
          <div style={{ fontSize:14, color:'var(--sap-text-muted)', marginTop:6 }}>{t('payItForward.chainDepthLabel')}</div>
        </div>
        <div style={{ background:'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border:'1px solid #86efac', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:800, color:'var(--sap-green-dark)' }}>${(stats.earned_back || 0).toFixed(2)}</div>
          <div style={{ fontSize:14, color:'var(--sap-green-dark)', marginTop:6, fontWeight:600 }}>Earned back</div>
        </div>
      </div>

      {/* Secondary funnel signals — surfaced when there's something to
          say. The "X clicked, Y not yet claimed" line is the most
          actionable: it tells the gifter the link IS being viewed but
          conversion's not happening, which is a different problem from
          "no one's looking at the link at all". */}
      {stats.total_gifted > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:24, fontSize:14, color:'var(--sap-text-muted)' }}>
          <div style={{ padding:'8px 14px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:999 }}>
            <strong style={{ color:'var(--sap-text-primary)' }}>{stats.total_clicks || 0}</strong> total clicks
          </div>
          {stats.clicked_not_claimed > 0 && (
            <div style={{ padding:'8px 14px', background:'#fefce8', border:'1px solid #fde68a', borderRadius:999, color:'#854d0e' }}>
              <strong>{stats.clicked_not_claimed}</strong> clicked but not claimed — try a follow-up nudge
            </div>
          )}
          {stats.total_clicks === 0 && stats.total_gifted > 0 && (
            <div style={{ padding:'8px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:999, color:'#991b1b' }}>
              No clicks yet — share the link to start your chain
            </div>
          )}
        </div>
      )}

      {/* Received gift notice */}
      {data && data.received_gift && data.received_gift.gifter_name && (
        <div style={{ background:'#fdf4ff', border:'1px solid #f0abfc', borderRadius:12, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <Gift size={20} color="#a855f7"/>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--sap-text-primary)' }}>Your membership was gifted by {data.received_gift.gifter_name}</div>
            {data.received_gift.message && <div style={{ fontSize:14, color:'var(--sap-text-muted)', marginTop:2, fontStyle:'italic' }}>"{data.received_gift.message}"</div>}
            <div style={{ fontSize:14, color:'#a855f7', marginTop:4, fontWeight:600 }}>{t("payItForward.payItForwardDesc")}</div>
          </div>
        </div>
      )}

      {/* Error / Success */}
      {error && <div style={{ padding:'12px 16px', background:'var(--sap-red-bg)', border:'1px solid #fecaca', borderRadius:10, marginBottom:16, fontSize:14, fontWeight:600, color:'var(--sap-red)' }}>{error}</div>}
      {success && (
        <div style={{ padding:'16px 20px', background:'var(--sap-green-bg)', border:'1px solid #bbf7d0', borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--sap-green-dark)', marginBottom:8 }}>{success}</div>
          {newLink && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input value={newLink} readOnly style={{ flex:1, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:15, fontFamily:'inherit', background:'#fff' }}/>
              <button onClick={function() { copyLink(newLink); }}
                style={{ padding:'10px 16px', borderRadius:8, border:'none', background: copied === newLink ? 'var(--sap-green-mid)' : 'var(--sap-purple)', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                {copied === newLink ? <><Check size={14}/> {t('payItForward.copiedLabel')}</> : <><Copy size={14}/> {t('payItForward.copyBtn')}</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Gift Button / Form */}
      {!showForm ? (
        <button onClick={function() { setShowForm(true); setError(''); setSuccess(''); setNewLink(''); }}
          style={{
            padding:'14px 28px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:16, fontWeight:800, color:'#fff',
            background:'linear-gradient(135deg,#ec4899,#db2777)',
            boxShadow:'0 4px 0 #9d174d, 0 6px 16px rgba(236,72,153,.3)',
            marginBottom:24, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            margin:'0 auto 24px', transition:'all .1s',
          }}
          onMouseDown={function(e) { e.currentTarget.style.boxShadow='0 1px 0 #9d174d, 0 2px 8px rgba(236,72,153,.2)'; e.currentTarget.style.transform='translateY(3px)'; }}
          onMouseUp={function(e) { e.currentTarget.style.boxShadow='0 4px 0 #9d174d, 0 6px 16px rgba(236,72,153,.3)'; e.currentTarget.style.transform='translateY(0)'; }}
          onMouseLeave={function(e) { e.currentTarget.style.boxShadow='0 4px 0 #9d174d, 0 6px 16px rgba(236,72,153,.3)'; e.currentTarget.style.transform='translateY(0)'; }}
        >
          <Gift size={18}/> Gift a Membership — $20
        </button>
      ) : (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:24, marginBottom:24 }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:16 }}>{t('payItForward.giftMembership')}</div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--sap-text-muted)', display:'block', marginBottom:4 }}>{t('payItForward.recipientName')}</label>
            <input value={recipientName} onChange={function(e) { setRecipientName(e.target.value); }}
              placeholder={t("payItForward.recipientNamePlaceholder")}
              style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:15, fontFamily:'inherit', boxSizing:'border-box' }}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--sap-text-muted)', display:'block', marginBottom:4 }}>{t('payItForward.personalMessage')}</label>
            <textarea value={message} onChange={function(e) { setMessage(e.target.value); }}
              placeholder={t("payItForward.personalMessagePlaceholder")}
              rows={3}
              style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:15, fontFamily:'inherit', boxSizing:'border-box', resize:'vertical' }}/>
          </div>

          <div style={{ padding:'12px 16px', background:'var(--sap-bg-elevated)', borderRadius:8, border:'1px solid #f1f5f9', marginBottom:16, fontSize:15, color:'var(--sap-text-muted)' }}>
            Choose how to pay — <strong style={{ color:'var(--sap-text-primary)' }}>$20.00</strong> per gift voucher
            {data && <span> · Wallet balance: <strong style={{ color:'var(--sap-green-mid)' }}>${data.wallet_balance.toFixed(2)}</strong></span>}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
            <button onClick={function() { createVoucher('wallet'); }} disabled={creating || !canPayFromWallet}
              style={{
                width:'100%', padding:14, borderRadius:10, border:'none', cursor: creating || !canPayFromWallet ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', fontSize:15, fontWeight:800, color:'#fff',
                background: canPayFromWallet ? 'linear-gradient(135deg,#059669,#10b981)' : 'var(--sap-text-ghost)',
                boxShadow: canPayFromWallet ? '0 4px 12px rgba(16,185,129,.3)' : 'none',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {creating ? t('payItForward.creating') : canPayFromWallet ? t('payItForward.payWallet') : t('payItForward.insufficientBalance')}
            </button>
            <button onClick={function() { createVoucher('crypto'); }} disabled={creating}
              style={{
                width:'100%', padding:14, borderRadius:10, border:'1.5px solid #e2e8f0', cursor: creating ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', fontSize:15, fontWeight:700, color:'var(--sap-text-secondary)', background:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {creating ? t('payItForward.creating') : t('payItForward.payCrypto')}
            </button>

            {/* WalletConnect (self-custody) — only renders if wallet connected.
                Step 4 triple-rail audit (7 May 2026): added so members can
                pay direct from their own BSC wallet without going through a
                third-party processor. */}
            <Suspense fallback={null}>
              <WalletPayLink
                productType="pif"
                productKey="pif_voucher"
                productMeta={{
                  recipient_name: recipientName,
                  personal_message: message,
                }}
                label="Pay $20 from wallet"
                style={{ padding:'12px 16px', fontSize:13, borderRadius:10 }}
              />
            </Suspense>
          </div>

          <div style={{ display:'flex', justifyContent:'center' }}>
            <button onClick={function() { setShowForm(false); }}
              style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--sap-text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Vouchers */}
      {vouchers.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', marginBottom:24 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)' }}>{t('payItForward.yourGiftVouchers')}</div>
          </div>
          {vouchers.map(function(v) {
            var isClaimed = v.status === 'claimed';
            var act = v.recipient_activity || {};
            return (
              <div key={v.id} style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex:1 }}>
                    <div style={{
                      width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      background: isClaimed ? 'var(--sap-green-bg)' : '#fdf4ff',
                      border: '1px solid ' + (isClaimed ? '#bbf7d0' : '#f0abfc'),
                    }}>
                      {isClaimed ? <Check size={16} color="var(--sap-green-mid)"/> : <Gift size={16} color="#a855f7"/>}
                    </div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:'var(--sap-text-primary)' }}>
                        {v.recipient_name || 'Open gift'}
                        {isClaimed && v.claimed_by && <span style={{ fontWeight:400, color:'var(--sap-text-muted)' }}> — claimed by {v.claimed_by.first_name || v.claimed_by.username}</span>}
                      </div>
                      <div style={{ fontSize:14, color:'var(--sap-text-muted)' }}>
                        {v.code} · {isClaimed ? 'Claimed' : 'Available'}
                        {/* Click count for unclaimed vouchers — the key
                            new signal. "0 clicks" on an old voucher means
                            "nobody has even looked"; >0 means it's being
                            viewed but not converting. */}
                        {!isClaimed && (v.link_clicks > 0
                          ? <> · <strong style={{ color:'#a16207' }}>{v.link_clicks} click{v.link_clicks === 1 ? '' : 's'}</strong></>
                          : <> · <span style={{ color:'#94a3b8' }}>Not clicked yet</span></>
                        )}
                        {v.chain_depth > 1 && <> · Chain depth {v.chain_depth}</>}
                      </div>
                    </div>
                  </div>
                  {!isClaimed && (
                    <button onClick={function() { copyLink(v.link); }}
                      style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700, color:'var(--sap-text-muted)', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      {copied === v.link ? <><Check size={12}/> {t('payItForward.copiedLabel')}</> : <><Copy size={12}/> {t('payItForward.copyLinkBtn')}</>}
                    </button>
                  )}
                </div>

                {/* Recipient activity badges — claimed vouchers only.
                    The story for the gifter: did the gift "take"? Active
                    member, tier active, dollar earnings, did-pif each
                    represent a deeper level of engagement. Surfaces the
                    success-story material for personal marketing. */}
                {isClaimed && v.recipient_activity && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10, marginLeft:48 }}>
                    {act.is_active_member && (
                      <span style={{ padding:'4px 10px', background:'var(--sap-green-bg)', border:'1px solid #bbf7d0', borderRadius:999, fontSize:12, fontWeight:600, color:'var(--sap-green-dark)' }}>✓ Active member</span>
                    )}
                    {act.tier_active && (
                      <span style={{ padding:'4px 10px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:999, fontSize:12, fontWeight:600, color:'#854d0e' }}>⚡ Tier active</span>
                    )}
                    {act.total_earned > 0 && (
                      <span style={{ padding:'4px 10px', background:'#dbeafe', border:'1px solid #bfdbfe', borderRadius:999, fontSize:12, fontWeight:600, color:'#1e40af' }}>💰 Earned ${act.total_earned.toFixed(2)}</span>
                    )}
                    {act.did_pif && (
                      <span style={{ padding:'4px 10px', background:'#fdf4ff', border:'1px solid #f0abfc', borderRadius:999, fontSize:12, fontWeight:600, color:'#a21caf' }}>🎁 Paid it forward</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 24px' }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:16 }}>{t('payItForward.howItWorksTitle')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { n:'1', color:'var(--sap-pink)', bg:'#fce7f3', title:'You gift a membership', desc:'Pay $20 from your wallet or with crypto to create a gift voucher with a unique shareable link.' },
            { n:'2', color:'var(--sap-purple)', bg:'var(--sap-purple-pale)', title:'Someone joins for free', desc:'Your recipient clicks the link, creates an account, and their membership activates instantly — no cost to them.' },
            { n:'3', color:'var(--sap-green-mid)', bg:'var(--sap-green-bg)', title:'They pay it forward', desc:"When they earn $20+ in commissions, they're prompted to gift a membership to someone else. The chain continues." },
          ].map(function(s) {
            return (
              <div key={s.n} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:s.color, flexShrink:0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--sap-text-primary)' }}>{s.title}</div>
                  <div style={{ fontSize:16, color:'var(--sap-text-muted)', lineHeight:1.7 }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </AppLayout>
    {consentGate.consentModal}
    </WalletConnectProvider>
    </Suspense>
  );
}
