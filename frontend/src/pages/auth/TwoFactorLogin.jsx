import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

export default function TwoFactorLogin() {
  const { refreshUser } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  function handleChange(i, val) {
    const digits = val.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[i] = digits;
    setCode(next);
    setError('');
    if (digits && i < 5) inputs.current[i + 1]?.focus();
    // Auto-submit when all 6 digits entered
    if (digits && i === 5 && next.every(d => d)) {
      submitCode(next.join(''));
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setCode(next);
      inputs.current[5]?.focus();
      submitCode(pasted);
    }
  }

  async function submitCode(c) {
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/2fa/verify-login', { code: c });
      await refreshUser();
      window.location.href = '/app/dashboard';
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const c = code.join('');
    if (c.length !== 6) return setError('Please enter all 6 digits.');
    submitCode(c);
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} />

      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <span style={{ fontSize: 28 }}>🔐</span>
        </div>

        <div style={styles.logoRow}>
          <span style={styles.logoText}>SuperAd<span style={{ color: '#38bdf8' }}>Pro</span></span>
        </div>

        <h1 style={styles.heading}>Two-Factor Authentication</h1>
        <p style={styles.sub}>Enter the 6-digit code from your authenticator app</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.codeRow} onPaste={handlePaste}>
            {code.map((d, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                maxLength={1}
                inputMode="numeric"
                style={{ ...styles.codeInput, borderColor: error ? 'rgba(239,68,68,.5)' : d ? 'rgba(56,189,248,.5)' : 'rgba(255,255,255,.15)' }}
              />
            ))}
          </div>

          <button type="submit" disabled={loading || code.join('').length !== 6} style={loading || code.join('').length !== 6 ? styles.btnDisabled : styles.btn}>
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        <div style={styles.help}>
          <p style={styles.helpText}>Open Google Authenticator or your 2FA app and enter the current 6-digit code for SuperAdPro.</p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={styles.backLink}>← Back to login</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050d1a', padding: 20, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(14,165,233,.12) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '40px 36px', backdropFilter: 'blur(20px)', textAlign: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, background: 'rgba(14,165,233,.12)', border: '1px solid rgba(14,165,233,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  logoRow: { marginBottom: 20 },
  logoText: { fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: "'Sora', sans-serif" },
  heading: { fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 28, lineHeight: 1.5 },
  errorBox: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  codeRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  codeInput: { width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.06)', border: '2px solid rgba(255,255,255,.15)', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border-color .15s' },
  btn: { padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  btnDisabled: { padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(14,165,233,.3)', color: 'rgba(255,255,255,.4)', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  help: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 16px', marginTop: 8 },
  helpText: { fontSize: 13, color: 'rgba(255,255,255,.4)', lineHeight: 1.6, margin: 0 },
  backLink: { fontSize: 13, color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontWeight: 600 },
};
