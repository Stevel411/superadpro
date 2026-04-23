import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { apiPost } from '../../utils/api';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) { setInvalidToken(true); return; }
    setToken(t);
  }, []);

  function set(k) { return function(e) { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); }; }

  async function submit(e) {
    e.preventDefault();
    if (form.password.length < 8) return setError(t('auth.errPassword8'));
    if (form.password !== form.confirm_password) return setError(t('auth.errPasswordMatch'));
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/reset-password', { token, new_password: form.password, confirm_password: form.confirm_password });
      setDone(true);
    } catch (err) {
      setError(err.message || t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  }

  const strength = !form.password ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : /[^a-zA-Z0-9]/.test(form.password) ? 4 : 3;
  const strengthLabel = ['', t('auth.weak'), t('auth.fair'), t('auth.good'), t('auth.strong')];
  const strengthColor = ['', 'var(--sap-red-bright)', 'var(--sap-amber)', 'var(--sap-green-bright)', 'var(--sap-accent)'];

  return (
    <div style={styles.page}>
      <div style={styles.bg} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}><span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span></div>
          <span style={styles.logoText}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('common.pro')}</span></span>
        </div>

        {invalidToken ? (
          <>
            <div style={styles.sentIcon}>⚠️</div>
            <h1 style={styles.heading}>{t('auth.invalidLink')}</h1>
            <p style={styles.sub}>{t('auth.invalidLinkDesc')}</p>
            <a href="/forgot-password" style={styles.btn}>{t('auth.requestNewLink')}</a>
          </>
        ) : done ? (
          <>
            <div style={styles.sentIcon}>🔑</div>
            <h1 style={styles.heading}>{t('auth.passwordReset')}</h1>
            <p style={styles.sub}>{t('auth.passwordResetDesc')}</p>
            <a href="/login" style={styles.btn}>{t('auth.signIn')}</a>
          </>
        ) : (
          <>
            <h1 style={styles.heading}>{t('auth.createNewPassword')}</h1>
            <p style={styles.sub}>{t('auth.enterNewPassword')}</p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={submit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>{t('auth.newPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={form.password}
                    onChange={set('password')}
                    type={showPass ? 'text' : 'password'}
                    placeholder={t("auth.passwordPlaceholder2")}
                    autoComplete="new-password"
                    autoFocus
                    style={{ ...styles.input, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>{showPass ? '🙈' : '👁️'}</button>
                </div>
                {form.password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                      <div style={{ width: `${strength * 25}%`, height: '100%', background: strengthColor[strength], borderRadius: 2, transition: 'width .3s' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{t('auth.confirmNewPassword')}</label>
                <input
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  type="password"
                  placeholder={t("auth.reenterPassword")}
                  autoComplete="new-password"
                  style={{ ...styles.input, borderColor: form.confirm_password && form.confirm_password !== form.password ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)' }}
                />
              </div>

              <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
                {loading ? t('auth.resetting') : t('auth.resetPassword')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
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
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
  btn: { display: 'block', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', textAlign: 'center' },
  btnDisabled: { padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(14,165,233,.4)', color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  backLink: { fontSize: 13, color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontWeight: 600 },
};
