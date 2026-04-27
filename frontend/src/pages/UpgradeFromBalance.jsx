import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { CheckCircle2, Wallet, Sparkles, ArrowRight } from 'lucide-react';

// Page rendered when a free member clicks the "Activate your membership for
// free" notification, or navigates to /upgrade-from-balance directly. They
// see their balance, the offer, and choose between Activate (consume $20
// from balance) or Keep (keep earnings + dismiss).
//
// The choice is the entire point — never auto-consume earnings. See
// app/payment.py::_cascade_auto_activation for the new (Option B)
// notification-only behaviour that replaces the old silent cascade.
export default function UpgradeFromBalance() {
  var { t } = useTranslation();
  var navigate = useNavigate();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [activating, setActivating] = useState(false);
  var [error, setError] = useState(null);

  useEffect(function() {
    apiGet('/api/membership/balance-offer')
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  function handleActivate() {
    setActivating(true);
    setError(null);
    apiPost('/api/membership/activate-from-balance', {})
      .then(function(res) {
        if (res && res.success) {
          navigate('/dashboard?activated=balance');
        } else {
          setError((res && res.error) || t('upgradeFromBalance.errorGeneric', { defaultValue: 'Something went wrong. Please try again.' }));
          setActivating(false);
        }
      })
      .catch(function() {
        setError(t('upgradeFromBalance.errorGeneric', { defaultValue: 'Something went wrong. Please try again.' }));
        setActivating(false);
      });
  }

  function handleKeep() {
    // Keep earnings — dismiss and go back to dashboard. The offer
    // notification was already marked read (or will be on next earn).
    navigate('/dashboard');
  }

  if (loading) {
    return (
      <AppLayout title={t('upgradeFromBalance.title', { defaultValue: 'Activate your membership' })}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: 'var(--sap-accent)',
            borderRadius: '50%',
            animation: 'spin .8s linear infinite',
          }} />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </AppLayout>
    );
  }

  // Already active — show a friendly message and route them home
  if (data && data.is_active) {
    return (
      <AppLayout title={t('upgradeFromBalance.title', { defaultValue: 'Activate your membership' })}>
        <div style={{
          maxWidth: 540, margin: '40px auto',
          background: '#fff', border: '1px solid #e8ecf2',
          borderRadius: 18, padding: '40px 36px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <CheckCircle2 size={48} color="var(--sap-green-mid, #10b981)" style={{ marginBottom: 16 }} />
          <h2 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800,
            color: 'var(--sap-text-primary)', marginBottom: 8,
          }}>{t('upgradeFromBalance.alreadyActiveTitle', { defaultValue: 'You\'re already active!' })}</h2>
          <p style={{ color: 'var(--sap-text-muted)', marginBottom: 24 }}>
            {t('upgradeFromBalance.alreadyActiveBody', { defaultValue: 'Your membership is already active. There\'s nothing to do here.' })}
          </p>
          <button onClick={function(){ navigate('/dashboard'); }}
            style={{
              padding: '12px 24px', borderRadius: 10,
              background: 'var(--sap-cobalt-deep, #172554)',
              color: '#fff', border: 'none', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}>
            {t('upgradeFromBalance.goToDashboard', { defaultValue: 'Go to dashboard' })}
          </button>
        </div>
      </AppLayout>
    );
  }

  // Doesn't qualify yet — balance below threshold
  if (data && !data.qualifies) {
    var balance = (data.balance || 0).toFixed(2);
    var fee = (data.membership_fee || 20).toFixed(0);
    var needed = ((data.membership_fee || 20) - (data.balance || 0)).toFixed(2);
    return (
      <AppLayout title={t('upgradeFromBalance.title', { defaultValue: 'Activate your membership' })}>
        <div style={{
          maxWidth: 540, margin: '40px auto',
          background: '#fff', border: '1px solid #e8ecf2',
          borderRadius: 18, padding: '40px 36px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <Wallet size={48} color="var(--sap-accent, #0ea5e9)" style={{ marginBottom: 16 }} />
          <h2 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800,
            color: 'var(--sap-text-primary)', marginBottom: 8,
          }}>{t('upgradeFromBalance.notYetTitle', { defaultValue: 'Not quite there yet' })}</h2>
          <p style={{ color: 'var(--sap-text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
            {t('upgradeFromBalance.notYetBody', {
              balance: balance, fee: fee, needed: needed,
              defaultValue: 'You currently have ${{balance}} in your commission balance. Once you reach ${{fee}}, you can activate Basic membership using your earnings — no out-of-pocket cost.',
            })}
          </p>
          <p style={{
            color: 'var(--sap-cobalt-deep, #172554)',
            fontWeight: 700, marginBottom: 24,
          }}>
            {t('upgradeFromBalance.notYetGoal', { needed: needed, defaultValue: 'You need ${{needed}} more to qualify.' })}
          </p>
          <button onClick={function(){ navigate('/social-share'); }}
            style={{
              padding: '12px 24px', borderRadius: 10,
              background: 'var(--sap-cobalt-deep, #172554)',
              color: '#fff', border: 'none', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}>
            {t('upgradeFromBalance.shareYourLink', { defaultValue: 'Share your link to earn' })}
          </button>
        </div>
      </AppLayout>
    );
  }

  // Qualifies — show the consent UI
  var balance = data ? data.balance.toFixed(2) : '0.00';
  var fee = data ? data.membership_fee.toFixed(0) : '20';
  var remaining = data ? (data.balance - data.membership_fee).toFixed(2) : '0.00';

  return (
    <AppLayout title={t('upgradeFromBalance.title', { defaultValue: 'Activate your membership' })}>
      <div style={{ maxWidth: 640, margin: '24px auto' }}>
        {/* Hero — celebratory, matches Dashboard cobalt pattern */}
        <div style={{
          background: 'linear-gradient(135deg, var(--sap-cobalt-deep, #172554), var(--sap-cobalt-mid, #1e3a8a))',
          borderRadius: 18,
          padding: '28px 32px',
          marginBottom: 16,
          color: '#fff',
          boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 24px rgba(251,191,36,0.45)',
          }}>
            <Sparkles size={30} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
              marginBottom: 4,
            }}>{t('upgradeFromBalance.heroEyebrow', { defaultValue: 'You\'ve qualified' })}</div>
            <div style={{
              fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 900,
              lineHeight: 1.1, marginBottom: 6, letterSpacing: '-0.3px',
            }}>{t('upgradeFromBalance.heroTitle', { defaultValue: 'Activate Basic membership for free' })}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              {t('upgradeFromBalance.heroSubtitle', { defaultValue: 'Your commission earnings cover it — no out-of-pocket cost.' })}
            </div>
          </div>
        </div>

        {/* The choice */}
        <div style={{
          background: '#fff', border: '1px solid #e8ecf2',
          borderRadius: 16, padding: '28px 32px',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        }}>
          <h3 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800,
            color: 'var(--sap-text-primary)', marginBottom: 16,
          }}>{t('upgradeFromBalance.choiceTitle', { defaultValue: 'It\'s your choice' })}</h3>

          <p style={{ color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.7, marginBottom: 12 }}>
            {t('upgradeFromBalance.choiceBody1', {
              balance: balance,
              defaultValue: 'You\'ve earned ${{balance}} in commissions so far. You can use ${{fee}} of that to activate Basic membership now, or keep your earnings in your wallet to withdraw whenever you like.',
              fee: fee,
            })}
          </p>
          <p style={{ color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.7, marginBottom: 24 }}>
            {t('upgradeFromBalance.choiceBody2', { defaultValue: 'Activating unlocks higher commission rates and full Basic features. Keeping your earnings means they stay in your wallet — you can activate later when you\'re ready.' })}
          </p>

          {/* Balance summary box */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>{t('upgradeFromBalance.currentBalance', { defaultValue: 'Current balance' })}</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: 'var(--sap-text-primary)' }}>${balance}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>{t('upgradeFromBalance.basicFee', { defaultValue: 'Basic membership fee' })}</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: 'var(--sap-text-primary)' }}>−${fee}</span>
            </div>
            <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{t('upgradeFromBalance.remainingAfter', { defaultValue: 'Remaining after activation' })}</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: 'var(--sap-green-mid, #10b981)' }}>${remaining}</span>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: '#991b1b', fontSize: 13,
            }}>{error}</div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleActivate} disabled={activating}
              style={{
                flex: '1 1 220px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 20px', borderRadius: 12,
                background: 'var(--sap-cobalt-deep, #172554)',
                color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 14,
                cursor: activating ? 'wait' : 'pointer',
                opacity: activating ? 0.7 : 1,
                transition: 'all 0.15s',
                boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
              }}>
              {activating
                ? t('upgradeFromBalance.activating', { defaultValue: 'Activating…' })
                : <>
                    {t('upgradeFromBalance.activateBtn', { defaultValue: 'Activate Basic for ${{fee}}', fee: fee })}
                    <ArrowRight size={16} />
                  </>
              }
            </button>
            <button onClick={handleKeep} disabled={activating}
              style={{
                flex: '1 1 180px',
                padding: '14px 20px', borderRadius: 12,
                background: '#fff',
                color: 'var(--sap-text-primary)',
                border: '1px solid #e2e8f0',
                fontWeight: 700, fontSize: 14,
                cursor: activating ? 'wait' : 'pointer',
                opacity: activating ? 0.5 : 1,
                transition: 'all 0.15s',
              }}>
              {t('upgradeFromBalance.keepBtn', { defaultValue: 'Keep my earnings' })}
            </button>
          </div>
        </div>

        {/* Reassurance footer */}
        <div style={{
          background: '#fff', border: '1px solid #e8ecf2',
          borderRadius: 12, padding: '16px 20px',
          fontSize: 12, color: 'var(--sap-text-muted)',
          lineHeight: 1.6,
        }}>
          {t('upgradeFromBalance.reassurance', { defaultValue: 'You can always activate later — your earnings will stay in your wallet until you decide.' })}
        </div>
      </div>
    </AppLayout>
  );
}
