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

  // Gift voucher flow (added 8 May 2026): existing members who arrive at
  // /login?gift=CODE — typically inactive members who got a gift link
  // and chose "Already have an account? Log in" on the gift page.
  // After successful login we auto-claim the voucher so they don't have
  // to navigate back. Failure paths same as Register: redirect to
  // /gift/{code} for clear error visibility.
  const giftCode = (params.get('gift') || '').trim().toUpperCase();
  const isGiftFlow = !!giftCode;

  function set(k) { return function(e) { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); }; }

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return setError(t('auth.loginRequired'));
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/api/login', { username: form.username.trim(), password: form.password });
      if (data.requires_2fa) {
        // 2FA path — preserve the gift code through the 2FA challenge
        // so the second-factor handler can complete the claim.
        window.location.href = isGiftFlow
          ? '/login/2fa?gift=' + giftCode
          : '/login/2fa';
      } else {
        await refreshUser();
        if (isGiftFlow) {
          try {
            const claimResult = await apiPost('/api/gift/' + giftCode + '/claim', {});
            if (claimResult && claimResult.success) {
              const fromParam = claimResult.gifter_name
                ? '&from=' + encodeURIComponent(claimResult.gifter_name)
                : '';
              window.location.href = '/home-preview?just_claimed=1' + fromParam;
              return;
            }
            window.location.href = '/gift/' + giftCode;
            return;
          } catch (claimErr) {
            window.location.href = '/gift/' + giftCode;
            return;
          }
        }
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17L9 10l4 4 8-9" stroke="#ff2743" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 5h6v6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={styles.logoText}>
            Advantage<span style={{ color: '#c8102e' }}>Life</span>
          </span>
        </div>

        <h1 style={styles.heading}>{t('auth.welcomeBack')}</h1>
        <p style={styles.sub}>{t('auth.signInToAccount')}</p>

        {/* Gift voucher banner — only shown when ?gift=CODE is present.
            For existing inactive members claiming a gift via login. */}
        {isGiftFlow && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,.15), rgba(190,24,93,.15))',
            border: '1px solid rgba(236,72,153,.3)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{ fontSize: 24 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                Log in to claim your gift
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.4 }}>
                Sign in below and we'll activate your gifted membership automatically.
              </div>
            </div>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.usernameOrEmail')}</label>
            <input
              value={form.username}
              onChange={set('username')}
              placeholder={t('auth.usernamePlaceholder')}
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
            {loading
              ? (isGiftFlow ? 'Signing in & claiming gift…' : t('auth.signingIn'))
              : (isGiftFlow ? 'Sign In & Claim Gift 🎁' : t('auth.signIn'))}
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
        © 2026 AdvantageLife · <a href="/legal" style={styles.footerLink}>{t('auth.terms')}</a>
      </p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f8fd', padding: 20, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
  bg: { display: 'none' },
  bgGlow1: { display: 'none' },
  bgGlow2: { display: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: '#ffffff', border: '2px solid #e3e8f4', borderRadius: 20, padding: '40px 36px', boxShadow: '0 30px 70px -30px rgba(10,31,82,.25)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(160deg, #12388f, #0a1f52)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: 900, color: '#0a1f52', fontFamily: "'Inter', sans-serif" },
  heading: { fontSize: 26, fontWeight: 900, color: '#0a1f52', margin: '0 0 6px', textAlign: 'center' },
  sub: { fontSize: 14, color: '#5a6584', fontWeight: 600, marginBottom: 28, textAlign: 'center' },
  errorBox: { background: '#fdecec', border: '1.5px solid #f3c2cc', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#a3132e', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 800, color: '#33406b', textTransform: 'uppercase', letterSpacing: '.05em' },
  input: { padding: '12px 14px', borderRadius: 10, border: '2px solid #e3e8f4', background: '#f8f9fb', color: '#0d1230', fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color .15s' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
  forgotLink: { fontSize: 12, color: '#c8102e', textDecoration: 'none', fontWeight: 600 },
  btn: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: '#c8102e', boxShadow: '0 12px 26px -12px rgba(200,16,46,.6)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'opacity .15s' },
  btnDisabled: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: '#f5b8c2', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 20px' },
  dividerLine: { flex: 1, height: 1.5, background: '#e3e8f4' },
  dividerText: { fontSize: 12, fontWeight: 700, color: '#5a6584', whiteSpace: 'nowrap' },
  registerBtn: { display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12, border: '2px solid #e3e8f4', color: '#0a1f52', fontSize: 14, fontWeight: 800, textDecoration: 'none', transition: 'border-color .15s, color .15s' },
  footer: { position: 'relative', zIndex: 1, marginTop: 24, fontSize: 12, fontWeight: 600, color: '#94a0c2', textAlign: 'center' },
  footerLink: { color: '#94a0c2', textDecoration: 'none' },
};
