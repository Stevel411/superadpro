import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Loader, ArrowRight, Home } from 'lucide-react';

function getTypeConfig(t) {
  return {
  membership: {
    icon: '🎉',
    title: t('paymentSuccess.membershipActivated'),
    desc: t('paymentSuccess.membership'),
    action: '/dashboard',
    actionLabel: t('paymentSuccess.goToDashboard'),
    color: 'var(--sap-green-mid)',
  },
  membership_upgrade: {
    icon: '⭐',
    title: t('paymentSuccess.upgradedToPro'),
    desc: t('paymentSuccess.upgradedToProDesc'),
    action: '/dashboard',
    actionLabel: t('paymentSuccess.exploreProFeatures'),
    color: 'var(--sap-cyan, #06b6d4)',
  },
  pif: {
    icon: '🎁',
    title: t('paymentSuccess.giftVoucherCreated'),
    desc: t('paymentSuccess.giftVoucherDesc'),
    action: '/pay-it-forward',
    actionLabel: t('paymentSuccess.viewMyVouchers'),
    color: 'var(--sap-pink-bright)',
  },
  grid: {
    icon: '⚡',
    title: t('paymentSuccess.campaignTierActivated'),
    desc: t('paymentSuccess.campaignTierDesc'),
    action: '/watch',
    actionLabel: t('paymentSuccess.startWatching'),
    color: 'var(--sap-indigo)',
  },
  credit_matrix: {
    icon: '💎',
    title: t('paymentSuccess.creditNexusActivated'),
    desc: t('paymentSuccess.creditNexusDesc'),
    action: '/my-credits',
    actionLabel: t('paymentSuccess.viewCreditNexus'),
    color: 'var(--sap-cyan, #06b6d4)',
  },
  superscene: {
    icon: '🎬',
    title: t('paymentSuccess.creditsAdded'),
    desc: t('paymentSuccess.creditsReady'),
    action: '/tools',
    actionLabel: t('paymentSuccess.goToCreativeStudio'),
    color: 'var(--sap-cyan, #06b6d4)',
  },
  course: {
    icon: '🎓',
    title: t('paymentSuccess.courseUnlocked'),
    desc: t('paymentSuccess.courseReady'),
    action: '/ai-tools',
    actionLabel: t('paymentSuccess.goToCourseLibrary'),
    color: 'var(--sap-cyan, #06b6d4)',
  },
  email_boost: {
    icon: '🚀',
    title: t('paymentSuccess.emailBoostActivated'),
    desc: t('paymentSuccess.emailCredits'),
    action: '/pro/leads',
    actionLabel: t('paymentSuccess.goToSuperLeads'),
    color: 'var(--sap-red-bright)',
  },
  };
}

export default function PaymentSuccess() {
  var { t } = useTranslation();
  var [params] = useSearchParams();
  var navigate = useNavigate();
  var { refreshUser } = useAuth();
  // status: polling | success | failed | timeout
  var [status, setStatus] = useState('polling');
  var [pollSeconds, setPollSeconds] = useState(0);

  var type = params.get('type') || 'membership';
  var orderId = params.get('order_id');
  var source = params.get('source') || '';
  var txHash = params.get('tx_hash') || '';  // populated for source=walletconnect
  var TYPE_CONFIG = getTypeConfig(t);
  var config = TYPE_CONFIG[type] || TYPE_CONFIG.membership;

  useEffect(function() {
    var cancelled = false;
    var elapsedMs = 0;
    var POLL_INTERVAL = 2000;
    var POLL_TIMEOUT_MS = 90000;  // WC cron is 30s + BSC finality; 90s tolerance

    // ── Path A: WalletConnect rail ────────────────────────────────
    // Poll /api/onchain/order/{id} until status=='confirmed' (success)
    // or 'expired' (failure). Critical: only call refreshUser() AFTER
    // the server has actually flipped status, otherwise the auth
    // context picks up stale user state and the dashboard shows the
    // pre-payment tier until a hard refresh. (Bug observed 7 May 2026
    // on the first $15 Pro upgrade smoke test.)
    if (orderId && source === 'walletconnect') {
      function pollWcOrder() {
        if (cancelled) return;
        fetch('/api/onchain/order/' + orderId, { credentials: 'include' })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) {
            if (cancelled || !data) return;
            var s = (data.status || '').toLowerCase();
            if (s === 'confirmed') {
              refreshUser().finally(function() {
                if (!cancelled) setStatus('success');
              });
              return;
            }
            if (s === 'expired' || s === 'cancelled') {
              if (!cancelled) setStatus('failed');
              return;
            }
            // Still pending — keep polling
            elapsedMs += POLL_INTERVAL;
            setPollSeconds(Math.floor(elapsedMs / 1000));
            if (elapsedMs >= POLL_TIMEOUT_MS) {
              if (!cancelled) setStatus('timeout');
              return;
            }
            setTimeout(pollWcOrder, POLL_INTERVAL);
          })
          .catch(function() {
            // Transient network error — keep polling
            elapsedMs += POLL_INTERVAL;
            if (elapsedMs >= POLL_TIMEOUT_MS) {
              if (!cancelled) setStatus('timeout');
              return;
            }
            setTimeout(pollWcOrder, POLL_INTERVAL);
          });
      }
      pollWcOrder();
      return function() { cancelled = true; };
    }

    // ── Path B: legacy fallback (no order_id, or non-known source) ──
    // Defensive fallback: if no order_id in URL (non-NOWPayments redirect path,
    // e.g. internal credit purchases), use the legacy 2-second-then-success.
    if (!orderId || source !== 'nowpayments') {
      var legacyTimer = setTimeout(function() {
        if (cancelled) return;
        refreshUser().finally(function() {
          if (!cancelled) setStatus('success');
        });
      }, 2000);
      return function() { cancelled = true; clearTimeout(legacyTimer); };
    }

    // ── Path C: NOWPayments — poll their order status ────────────
    function pollOrderStatus() {
      if (cancelled) return;
      fetch('/api/nowpayments/order/' + orderId, { credentials: 'include' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (cancelled || !data) return;
          var s = (data.status || '').toLowerCase();
          // Terminal success states from NOWPayments IPN
          if (s === 'confirmed' || s === 'finished') {
            refreshUser().finally(function() {
              if (!cancelled) setStatus('success');
            });
            return;
          }
          // Terminal failure states
          if (s === 'failed' || s === 'expired' || s === 'refunded') {
            if (!cancelled) setStatus('failed');
            return;
          }
          // Still in-flight (waiting/confirming/sending/pending) — keep polling
          elapsedMs += POLL_INTERVAL;
          setPollSeconds(Math.floor(elapsedMs / 1000));
          if (elapsedMs >= POLL_TIMEOUT_MS) {
            if (!cancelled) setStatus('timeout');
            return;
          }
          setTimeout(pollOrderStatus, POLL_INTERVAL);
        })
        .catch(function() {
          // Network error — back off and retry once, then time out
          if (cancelled) return;
          elapsedMs += POLL_INTERVAL;
          if (elapsedMs >= POLL_TIMEOUT_MS) {
            if (!cancelled) setStatus('timeout');
            return;
          }
          setTimeout(pollOrderStatus, POLL_INTERVAL);
        });
    }

    // First poll fires immediately so a fast-finishing IPN shows success quickly
    pollOrderStatus();
    return function() { cancelled = true; };
  }, []);

  return (
    <AppLayout title={t('paymentSuccess.paymentComplete')}>
      <div style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>

        {status === 'polling' ? (
          <div style={{ padding: '60px 40px', background: '#fff', borderRadius: 24, border: '1px solid #e8ecf2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={28} color={config.color} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('paymentSuccess.confirmingPayment')}</div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.6, marginBottom: 6 }}>
              {pollSeconds > 12
                ? t('paymentSuccess.verifyingLong')
                : t('paymentSuccess.verifyingShort')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-faint)', lineHeight: 1.5 }}>{t('paymentSuccess.dontCloseHint')}</div>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        ) : status === 'failed' ? (
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #fecaca', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ height: 6, background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
            <div style={{ padding: '48px 40px 40px' }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={32} color="#ef4444" />
              </div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('paymentSuccess.paymentFailed')}</div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
                {t('paymentSuccess.paymentFailedDesc')}
              </div>
              <button
                onClick={function() { navigate(-1); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: '0 4px 16px rgba(239,68,68,0.4)', marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                {t('paymentSuccess.tryAgain')}
              </button>
              <button
                onClick={function() { navigate('/home-preview'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1px solid #e8ecf2', background: '#fff', color: 'var(--sap-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
              >
                <Home size={14} /> {t('paymentSuccess.backToDashboard')}
              </button>
            </div>
          </div>
        ) : status === 'timeout' ? (
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #fde68a', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ height: 6, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
            <div style={{ padding: '48px 40px 40px' }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={32} color="#f59e0b" style={{ animation: 'spin 2s linear infinite' }} />
              </div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('paymentSuccess.stillProcessing')}</div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 12 }}>
                {t('paymentSuccess.stillProcessingDesc')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--sap-text-faint)', lineHeight: 1.6, marginBottom: 32 }}>
                {t('paymentSuccess.safeToLeave')}
              </div>
              <button
                onClick={function() { navigate('/home-preview'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: `0 4px 16px ${config.color}40`, marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                <Home size={16} /> {t('paymentSuccess.backToDashboard')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #e8ecf2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Top colour bar */}
            <div style={{ height: 6, background: `linear-gradient(90deg, ${config.color}, ${config.color}88)` }} />

            <div style={{ padding: '32px 40px 32px' }}>
              {/* Icon */}
              <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>{config.icon}</div>

              {/* Check badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${config.color}12`, border: `1px solid ${config.color}30`, borderRadius: 99, padding: '4px 14px', marginBottom: 16 }}>
                <CheckCircle size={14} color={config.color} />
                <span style={{ fontSize: 13, fontWeight: 700, color: config.color }}>{t('paymentSuccess.paymentConfirmed')}</span>
              </div>

              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>
                {config.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                {config.desc}
              </div>

              {/* On-chain receipt — only for WalletConnect/BSC payments */}
              {txHash ? (
                <div style={{
                  marginBottom: 24, padding: '14px 18px', borderRadius: 12,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      On-chain receipt
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sap-green-mid)' }}>
                      ⛓ BNB Chain
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sap-text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 8, lineHeight: 1.4 }}>
                    {txHash}
                  </div>
                  <a
                    href={`https://bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--sap-accent)', textDecoration: 'none' }}
                  >
                    View on BscScan →
                  </a>
                </div>
              ) : null}

              {/* CTA — primary action goes to the relevant feature
                  (config.action — e.g. /dashboard for membership,
                  /credit-nexus for credit packs). Secondary 'Back to
                  Dashboard' button below ensures the user always has a
                  clear way out, even if the primary action label feels
                  feature-specific and they just want to get to the
                  homepage. The previous version of this page had only
                  the primary CTA — Steve hit a dead-end on a real
                  WalletConnect payment because the page rendered the
                  CTA below the on-chain receipt and it wasn't obvious
                  where to go. (Fixed 9 May 2026 after smoke test.) */}
              <button
                onClick={function() { navigate(config.action || '/dashboard'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: `0 6px 20px ${config.color}50`, marginTop: 8, marginBottom: 10, width: '100%', justifyContent: 'center' }}
              >
                {config.actionLabel || 'Go to Dashboard'} <ArrowRight size={16} />
              </button>

              {/* Secondary: explicit Dashboard escape hatch, always
                  available regardless of which product config is loaded. */}
              <button
                onClick={function() { navigate('/home-preview'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1px solid #e8ecf2', background: '#fff', color: 'var(--sap-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
              >
                <Home size={14} /> Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
