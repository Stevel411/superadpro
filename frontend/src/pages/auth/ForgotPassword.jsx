import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { apiPost } from '../../utils/api';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return setError(t('auth.errEnterEmail'));
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.message || t('auth.forgotFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}><span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span></div>
          <span style={styles.logoText}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('common.pro')}</span></span>
        </div>

        {sent ? (
          <>
            <div style={styles.sentIcon}>📧</div>
            <h1 style={styles.heading}>{t('auth.checkEmail')}</h1>
            <p style={styles.sub}>{t('auth.checkEmailDesc1')}<strong style={{ color: '#7dd3fc' }}>{email}</strong>{t('auth.checkEmailDesc2')}</p>
            <a href="/login" style={styles.btn}>{t('auth.backToLogin')}</a>
          </>
        ) : (
          <>
            <h1 style={styles.heading}>{t('auth.resetYourPassword')}</h1>
            <p style={styles.sub}>{t('auth.resetDesc')}</p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={submit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>{t('auth.emailAddress')}</label>
                <input
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  autoFocus
                  autoComplete="email"
                  style={styles.input}
                />
              </div>
              <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <a href="/login" style={styles.backLink}>{t('common.backToLogin')}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sap-cobalt-deep)', padding: 20, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(14,165,233,.12) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '40px 36px', backdropFilter: 'blur(20px)', textAlign: 'center' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: "'Sora', sans-serif" },
  sentIcon: { fontSize: 48, marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 28, lineHeight: 1.6 },
  errorBox: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20, textAlign: 'left' },
  form: { display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.05em' },
  input: { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none' },
  btn: { display: 'block', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', textAlign: 'center' },
  btnDisabled: { padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(14,165,233,.4)', color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  backLink: { fontSize: 13, color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontWeight: 600 },
};
