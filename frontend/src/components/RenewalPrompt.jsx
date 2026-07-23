import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/*
 * RenewalPrompt — dashboard nudge for an ACTIVE-but-overdue member (the
 * Option-B runway cohort: membership_expires_at has passed but is_active is
 * still true, so nothing has lapsed yet). Two parts:
 *   - a persistent red banner at the top of the dashboard (stays until renewed)
 *   - an attention modal shown once per calendar day (localStorage-gated)
 * Both CTAs route to /upgrade?renew=1 (the renew view). Gated entirely on the
 * server-computed user.membership_overdue flag from /api/me — never renders for
 * healthy members, admins, or lapsed-inactive members.
 */
export default function RenewalPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const overdue = !!(user && user.membership_overdue);
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!overdue) return;
    try {
      if (localStorage.getItem('renewalModalDay') !== todayKey) setShowModal(true);
    } catch (e) {
      setShowModal(true);
    }
  }, [overdue, todayKey]);

  if (!overdue) return null;

  const isFounder = !!user.is_founding_member;
  const price = user.membership_price_locked != null
    ? String(user.membership_price_locked).replace(/\.00$/, '')
    : (isFounder ? '15' : '20');

  let expStr = '';
  if (user.membership_expires_at) {
    const d = new Date(user.membership_expires_at);
    if (!isNaN(d)) expStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function goRenew() { window.location.replace('/join'); }
  function dismissModal() {
    setShowModal(false);
    try { localStorage.setItem('renewalModalDay', todayKey); } catch (e) { /* ignore */ }
  }

  const rateLine = isFounder
    ? ('$' + price + '/month \u2014 your Founder rate, locked for life')
    : ('$' + price + '/month');

  return (
    <>
      {/* Persistent banner */}
      <div role="alert" style={{
        background: '#d93a34', borderRadius: 12, display: 'flex', alignItems: 'center',
        gap: 14, padding: '13px 18px', margin: '0 0 18px',
        fontFamily: "'DM Sans', system-ui, sans-serif"
      }}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff"
          strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }} aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 500, fontFamily: "'Sora', system-ui, sans-serif" }}>
            {'Your ' + (isFounder ? 'founding ' : '') + 'membership expired' + (expStr ? ' on ' + expStr : '') + ' \u2014 action needed'}
          </div>
          <div style={{ color: '#ffe2e0', fontSize: 12.5, marginTop: 2 }}>
            Renew to keep your tools and your commissions withdrawable.{isFounder ? ' Your locked $' + price + '/mo Founder rate still applies.' : ''}
          </div>
        </div>
        <button onClick={goRenew} style={{
          background: '#fff', color: '#b3251f', border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: 13, padding: '9px 18px', borderRadius: 8,
          whiteSpace: 'nowrap', fontFamily: "'Sora', system-ui, sans-serif"
        }}>Renew now</button>
      </div>

      {/* Once-a-day attention modal */}
      {showModal && (
        <div role="dialog" aria-modal="true" aria-label="Membership renewal" onClick={dismissModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(10,20,56,0.55)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{
            background: '#fff', borderRadius: 16, maxWidth: 392, width: '100%',
            padding: '24px 26px 22px', textAlign: 'center', position: 'relative',
            fontFamily: "'DM Sans', system-ui, sans-serif"
          }}>
            <button onClick={dismissModal} aria-label="Close" style={{
              position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
              cursor: 'pointer', color: '#9aa6bd', fontSize: 22, lineHeight: 1, padding: 4
            }}>&times;</button>

            <div style={{ margin: '6px auto 12px', width: 56, height: 56 }}>
              <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
                <path d="M31.38 14.13 L45.62 39.87 Q49 46 42 46 L14 46 Q7 46 10.38 39.87 L24.62 14.13 Q28 8 31.38 14.13 Z"
                  fill="#FACC15" stroke="#1a1a1a" strokeWidth="2.6" strokeLinejoin="round" />
                <rect x="25.4" y="22" width="5.2" height="12.6" rx="2.6" fill="#1a1a1a" />
                <circle cx="28" cy="40.5" r="2.9" fill="#1a1a1a" />
              </svg>
            </div>

            <div style={{
              display: 'inline-block', background: '#fdeceb', color: '#b3251f', fontSize: 11.5,
              fontWeight: 600, letterSpacing: 0.3, padding: '4px 11px', borderRadius: 20, marginBottom: 10
            }}>MEMBERSHIP EXPIRED</div>

            <div style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 600, fontSize: 19, color: '#0a1438' }}>
              Don&rsquo;t lose your tools or earnings
            </div>
            <p style={{ color: '#5b6880', fontSize: 14, lineHeight: 1.6, margin: '9px 0 12px' }}>
              You&rsquo;re still active for now &mdash; but to keep your tools and keep your commissions flowing, you&rsquo;ll need to renew.
            </p>

            <div style={{
              textAlign: 'left', background: '#f6f9fd', border: '1px solid #e6ecf5',
              borderRadius: 10, padding: '12px 14px', margin: '0 0 14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                <span style={{ color: '#0891b2', fontSize: 17, lineHeight: 1.3 }}>&#9632;</span>
                <span style={{ fontSize: 13, color: '#3a465c', lineHeight: 1.45 }}>Your tools stay on &mdash; SuperPages, SuperLeads, Ad Studio</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ color: '#0891b2', fontSize: 17, lineHeight: 1.3 }}>&#9632;</span>
                <span style={{ fontSize: 13, color: '#3a465c', lineHeight: 1.45 }}>Your Campaign earnings stay unlocked &mdash; lapse, and they&rsquo;re locked until you renew</span>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5fb',
              borderRadius: 8, padding: '7px 13px', margin: '0 0 16px'
            }}>
              <span style={{ color: '#0a1438', fontSize: 15 }}>&#128274;</span>
              <span style={{ fontSize: 13, color: '#0a1438', fontWeight: 600 }}>{rateLine}</span>
            </div>

            <button onClick={goRenew} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
              fontSize: 15, padding: 13, borderRadius: 10, fontFamily: "'Sora', system-ui, sans-serif"
            }}>Renew now &rarr;</button>

            <div style={{ color: '#8893a8', fontSize: 12, marginTop: 10 }}>Card auto-renew or one-month USDT</div>
            <button onClick={dismissModal} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#9aa6bd', fontSize: 13,
              marginTop: 14, textDecoration: 'underline'
            }}>Remind me later</button>
          </div>
        </div>
      )}
    </>
  );
}
