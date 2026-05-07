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
    title: 'Membership Activated!',
    desc: t('paymentSuccess.membership'),
    action: '/dashboard',
    actionLabel: 'Go to Dashboard',
    color: 'var(--sap-green-mid)',
  },
  membership_upgrade: {
    icon: '⭐',
    title: 'Upgraded to Pro!',
    desc: 'Your account now has full Pro access — Marketing Suite, ProSeller AI, SuperPages, MyLeads, and more.',
    action: '/dashboard',
    actionLabel: 'Explore Pro Features',
    color: 'var(--sap-purple)',
  },
  pif: {
    icon: '🎁',
    title: 'Gift Voucher Created!',
    desc: 'Your Pay It Forward voucher is ready. Share the code with anyone — they redeem it for a free month of Basic membership.',
    action: '/pay-it-forward',
    actionLabel: 'View My Vouchers',
    color: 'var(--sap-pink-bright)',
  },
  grid: {
    icon: '⚡',
    title: 'Campaign Tier Activated!',
    desc: "Your tier is live. Watch your daily videos to keep commissions flowing — miss too many days in a row and they'll pause until you catch up.",
    action: '/watch',
    actionLabel: 'Start Watching',
    color: 'var(--sap-indigo)',
  },
  credit_matrix: {
    icon: '💎',
    title: 'Profit Nexus Pack Activated!',
    desc: 'Your credits have been added and you\'ve been placed in the Nexus matrix.',
    action: '/credit-nexus',
    actionLabel: 'View Profit Nexus',
    color: 'var(--sap-purple)',
  },
  superscene: {
    icon: '🎬',
    title: 'Credits Added!',
    desc: t('paymentSuccess.creditsReady'),
    action: '/creative-studio',
    actionLabel: 'Go to Creative Studio',
    color: 'var(--sap-purple)',
  },
  course: {
    icon: '🎓',
    title: 'Course Unlocked!',
    desc: t('paymentSuccess.courseReady'),
    action: '/courses',
    actionLabel: 'Go to Course Library',
    color: 'var(--sap-purple)',
  },
  email_boost: {
    icon: '🚀',
    title: 'Email Boost Activated!',
    desc: t('paymentSuccess.emailCredits'),
    action: '/pro/leads',
    actionLabel: 'Go to SuperLeads',
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
    var POLL_TIMEOUT_MS = 30000;

    // Defensive fallback: if no order_id in URL (non-NOWPayments redirect path,
    // e.g. internal credit purchases), use the legacy 2-second-then-success.
    // Same behaviour as before, no regression.
    if (!orderId || source !== 'nowpayments') {
      var legacyTimer = setTimeout(function() {
        if (cancelled) return;
        refreshUser().finally(function() {
          if (!cancelled) setStatus('success');
        });
      }, 2000);
      return function() { cancelled = true; clearTimeout(legacyTimer); };
    }

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
      <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>

        {status === 'polling' ? (
          <div style={{ padding: '60px 40px', background: '#fff', borderRadius: 24, border: '1px solid #e8ecf2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={28} color={config.color} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 10 }}>Confirming your payment</div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.6, marginBottom: 6 }}>
              {pollSeconds > 12
                ? "Still checking with the blockchain. Some transactions take a little longer to confirm."
                : "Your transaction is being verified on the blockchain."}
            </div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-faint)', lineHeight: 1.5 }}>This usually takes a few seconds. Please don't close this page.</div>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        ) : status === 'failed' ? (
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #fecaca', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ height: 6, background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
            <div style={{ padding: '48px 40px 40px' }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={32} color="#ef4444" />
              </div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>Payment didn't go through</div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
                Your payment was not received or was cancelled. No charges were made and nothing was activated. You can try again whenever you're ready.
              </div>
              <button
                onClick={function() { navigate(-1); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: '0 4px 16px rgba(239,68,68,0.4)', marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                Try Again
              </button>
              <button
                onClick={function() { navigate('/dashboard'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1px solid #e8ecf2', background: '#fff', color: 'var(--sap-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
              >
                <Home size={14} /> Back to Dashboard
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
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>Still processing</div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 12 }}>
                Your payment is taking longer than usual to confirm on the blockchain. This can happen during busy periods.
              </div>
              <div style={{ fontSize: 13, color: 'var(--sap-text-faint)', lineHeight: 1.6, marginBottom: 32 }}>
                It's safe to leave this page. We'll activate your purchase automatically as soon as the payment confirms — usually within a few minutes. You'll see it appear in your wallet.
              </div>
              <button
                onClick={function() { navigate('/dashboard'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: `0 4px 16px ${config.color}40`, marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                <Home size={16} /> Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #e8ecf2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Top colour bar */}
            <div style={{ height: 6, background: `linear-gradient(90deg, ${config.color}, ${config.color}88)` }} />

            <div style={{ padding: '48px 40px 40px' }}>
              {/* Icon */}
              <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>{config.icon}</div>

              {/* Check badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${config.color}12`, border: `1px solid ${config.color}30`, borderRadius: 99, padding: '4px 14px', marginBottom: 20 }}>
                <CheckCircle size={14} color={config.color} />
                <span style={{ fontSize: 13, fontWeight: 700, color: config.color }}>{t('paymentSuccess.paymentConfirmed')}</span>
              </div>

              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>
                {config.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
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

              {/* CTA — single button so users have one clear next action.
                  Steve clicked the secondary 'Back to Dashboard' by mistake
                  during 7 May testing — easy to do, and it sent him to the
                  wrong place. The success page now shows only the primary
                  'View Profit Nexus' (or equivalent for other product types)
                  button, which navigates to config.action — the right place
                  for the product they just bought. */}
              <button
                onClick={function() { navigate(config.action); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: `0 4px 16px ${config.color}40`, marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                {config.actionLabel} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
