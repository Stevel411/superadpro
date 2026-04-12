import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { apiPost } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Pre-fill ref from URL
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/dashboard';

  function set(k) { return function(e) { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); }; }

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return setError(t('auth.loginRequired'));
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/api/login', { username: form.username.trim(), password: form.password });
      if (data.requires_2fa) {
        window.location.href = '/login/2fa';
      } else {
        await refreshUser();
        window.location.href = next;
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Background */}
      <div style={styles.bg} />
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span>
          </div>
          <span style={styles.logoText}>
            SuperAd<span style={{ color: '#38bdf8' }}>Pro</span>
          </span>
        </div>

        <h1 style={styles.heading}>{t('auth.welcomeBack')}</h1>
        <p style={styles.sub}>{t('auth.signInToAccount')}</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.usernameOrEmail')}</label>
            <input
              value={form.username}
              onChange={set('username')}
              placeholder="your_username"
              autoComplete="username"
              autoFocus
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>{t('auth.password')}</label>
              <a href="/forgot-password" style={styles.forgotLink}>{t('auth.forgotPassword')}</a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                value={form.password}
                onChange={set('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...styles.input, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>{t('auth.noAccount')}</span>
          <span style={styles.dividerLine} />
        </div>

        <a href="/register" style={styles.registerBtn}>{t('auth.createAccount')}</a>
      </div>

      <p style={styles.footer}>
        © 2026 SuperAdPro · <a href="/legal" style={styles.footerLink}>{t('auth.terms')}</a>
      </p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#172554', padding: 20, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14,165,233,.15) 0%, transparent 70%)', pointerEvents: 'none' },
  bgGlow1: { position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,.06) 0%, transparent 70%)', pointerEvents: 'none' },
  bgGlow2: { position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,.06) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '40px 36px', backdropFilter: 'blur(20px)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: "'Sora', sans-serif" },
  heading: { fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px', textAlign: 'center' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 28, textAlign: 'center' },
  errorBox: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.05em' },
  input: { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border-color .15s' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
  forgotLink: { fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 },
  btn: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'opacity .15s' },
  btnDisabled: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(14,165,233,.4)', color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 20px' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.08)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' },
  registerBtn: { display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'border-color .15s, color .15s' },
  footer: { position: 'relative', zIndex: 1, marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,.2)', textAlign: 'center' },
  footerLink: { color: 'rgba(255,255,255,.3)', textDecoration: 'none' },
};
