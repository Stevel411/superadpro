import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import AppLayout from '../components/layout/AppLayout';
import { Gift, Heart, Check, X } from 'lucide-react';

// Recipient-facing accept/decline page for team gifts.
// Different from /gift/:code (the shareable PIF claim) because the
// recipient is pre-selected and consent is explicit. Auth-required:
// the recipient must be logged in as the user the gift is reserved for.
export default function TeamGiftAccept() {
  var { code } = useParams();
  var navigate = useNavigate();
  var [preview, setPreview] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [acting, setActing] = useState(false);
  var [accepted, setAccepted] = useState(false);
  var [declined, setDeclined] = useState(false);

  useEffect(function() {
    apiGet('/api/gift/team/' + code + '/preview').then(function(r) {
      if (r && r.error) {
        setError(r);
      } else {
        setPreview(r);
      }
      setLoading(false);
    }).catch(function(e) {
      setError({ error: 'load_failed', detail: String(e) });
      setLoading(false);
    });
  }, [code]);

  function accept() {
    if (acting) return;
    setActing(true);
    apiPost('/api/gift/team/' + code + '/accept', {}).then(function(r) {
      if (r && r.success) {
        setAccepted(true);
        // Redirect to dashboard after 2.5s — let the user see the success state
        setTimeout(function() { navigate('/dashboard'); }, 2500);
      } else {
        setError(r);
        setActing(false);
      }
    }).catch(function(e) {
      setError({ error: 'accept_failed', detail: String(e) });
      setActing(false);
    });
  }

  function decline() {
    if (acting) return;
    var ok = window.confirm('Are you sure you want to decline this gift? This cannot be undone.');
    if (!ok) return;
    setActing(true);
    apiPost('/api/gift/team/' + code + '/decline', {}).then(function(r) {
      if (r && r.success) {
        setDeclined(true);
        setActing(false);
      } else {
        setError(r);
        setActing(false);
      }
    }).catch(function(e) {
      setError({ error: 'decline_failed', detail: String(e) });
      setActing(false);
    });
  }

  return (
    <AppLayout title="Gift Received" subtitle="">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ color: 'var(--sap-text-faint)' }}>Loading your gift…</div>
          </div>
        )}

        {!loading && error && (
          <div style={{ background: '#fff', border: '1px solid #fbe89c', borderRadius: 14, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--sap-cobalt-deep)' }}>
              {error.error === 'wrong_recipient' ? 'This gift is for a different account' :
               error.error === 'not_active' ? 'This gift is no longer active' :
               error.error === 'login_required' ? 'Please log in to view this gift' :
               error.error === 'not_found' ? 'Gift not found' :
               'Something went wrong'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-faint)', marginBottom: 16 }}>
              {error.detail || 'If you believe this is an error, contact support.'}
            </div>
            <button onClick={function() { navigate('/dashboard'); }} style={{ padding: '10px 18px', border: 'none', borderRadius: 8, background: 'var(--sap-cobalt-deep)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && !error && accepted && (
          <div style={{ background: 'linear-gradient(135deg, var(--sap-cobalt-deep), #1e3a8a)', color: '#fff', borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Welcome to AdvantageLife</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Your membership is active. Redirecting you to your dashboard…</div>
          </div>
        )}

        {!loading && !error && declined && (
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--sap-cobalt-deep)' }}>
              Gift declined
            </div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-faint)', marginBottom: 20 }}>
              No problem. {preview.gifter_name} has been notified.
            </div>
            <button onClick={function() { navigate('/dashboard'); }} style={{ padding: '10px 18px', border: 'none', borderRadius: 8, background: 'var(--sap-cobalt-deep)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && !error && !accepted && !declined && preview && (
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎁</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--sap-cobalt-deep)' }}>
              {preview.gifter_name} sent you a gift
            </div>
            <div style={{ fontSize: 15, color: 'var(--sap-text-faint)', marginBottom: 20 }}>
              A free month of SuperAdPro membership — full access to every tool on the platform.
            </div>

            {preview.personal_message && (
              <div style={{ background: '#f8fafc', border: '1px solid #e8ecf2', borderRadius: 10, padding: 16, margin: '16px 0', textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 6 }}>
                  Personal message
                </div>
                <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--sap-text-primary)' }}>
                  "{preview.personal_message}"
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--sap-text-faint)', margin: '16px 0' }}>
              {preview.expires_in_days != null ? (
                preview.expires_in_days === 0 ? 'This gift expires today.' :
                'This gift expires in ' + preview.expires_in_days + ' day' + (preview.expires_in_days === 1 ? '' : 's') + '.'
              ) : ''}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={accept} disabled={acting} style={{
                flex: 2, padding: '14px 18px', border: 'none', borderRadius: 10,
                background: 'var(--sap-green)', color: '#fff', cursor: acting ? 'wait' : 'pointer',
                fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
                <Check size={18} /> Accept gift
              </button>
              <button onClick={decline} disabled={acting} style={{
                flex: 1, padding: '14px 18px', border: '1px solid #e8ecf2', borderRadius: 10,
                background: '#fff', color: 'var(--sap-text-faint)', cursor: acting ? 'wait' : 'pointer',
                fontWeight: 700, fontSize: 14
              }}>
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
