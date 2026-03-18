import { useState } from 'react';
import { apiPost } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

export default function Register() {
  const { refreshUser } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref') || params.get('r') || '';

  const [form, setForm] = useState({ first_name: '', username: '', email: '', password: '', confirm_password: '', ref: refCode });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function set(k) { return function(e) { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); }; }

  async function submit(e) {
    e.preventDefault();
    if (!form.first_name.trim()) return setError('Please enter your first name.');
    if (!form.username.trim()) return setError('Please enter a username.');
    if (!form.email.trim()) return setError('Please enter your email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm_password) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/register', {
        first_name: form.first_name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        ref: form.ref.trim(),
      });
      await refreshUser();
      window.location.href = '/app/dashboard';
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const strength = !form.password ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : /[^a-zA-Z0-9]/.test(form.password) ? 4 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#0ea5e9'];

  return (
    <div style={styles.page}>
      <div style={styles.bg} />
      <div style={styles.bgGlow1} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span>
          </div>
          <span style={styles.logoText}>SuperAd<span style={{ color: '#38bdf8' }}>Pro</span></span>
        </div>

        <h1 style={styles.heading}>Create your account</h1>
        <p style={styles.sub}>Join thousands of members earning online</p>

        {refCode && (
          <div style={styles.refBadge}>
            🤝 Referred by <strong>{refCode}</strong>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>First Name</label>
              <input value={form.first_name} onChange={set('first_name')} placeholder="John" autoFocus style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Username</label>
              <input value={form.username} onChange={set('username')} placeholder="john_doe" autoComplete="username" style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input value={form.email} onChange={set('email')} type="email" placeholder="john@example.com" autoComplete="email" style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password" style={{ ...styles.input, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>{showPass ? '🙈' : '👁️'}</button>
            </div>
            {form.password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                  <div style={{ width: `${strength * 25}%`, height: '100%', background: strengthColor[strength], borderRadius: 2, transition: 'width .3s, background .3s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input value={form.confirm_password} onChange={set('confirm_password')} type="password" placeholder="Re-enter password" autoComplete="new-password" style={{ ...styles.input, borderColor: form.confirm_password && form.confirm_password !== form.password ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)' }} />
          </div>

          {!refCode && (
            <div style={styles.field}>
              <label style={styles.label}>Referral Code <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>(optional)</span></label>
              <input value={form.ref} onChange={set('ref')} placeholder="sponsor_username" style={styles.input} />
            </div>
          )}

          <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={styles.terms}>
          By creating an account you agree to our <a href="/legal" style={styles.link}>Terms of Service</a> and <a href="/legal" style={styles.link}>Privacy Policy</a>.
        </p>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>Already have an account?</span>
          <span style={styles.dividerLine} />
        </div>

        <a href="/login" style={styles.loginBtn}>Sign in instead</a>
      </div>

      <p style={styles.footer}>© 2026 SuperAdPro · <a href="/legal" style={styles.footerLink}>Terms</a></p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050d1a', padding: '40px 20px', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14,165,233,.15) 0%, transparent 70%)', pointerEvents: 'none' },
  bgGlow1: { position: 'absolute', top: '30%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,.05) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '40px 36px', backdropFilter: 'blur(20px)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: "'Sora', sans-serif" },
  heading: { fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px', textAlign: 'center' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 24, textAlign: 'center' },
  refBadge: { background: 'rgba(14,165,233,.1)', border: '1px solid rgba(14,165,233,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#7dd3fc', marginBottom: 20, textAlign: 'center' },
  errorBox: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.05em' },
  input: { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
  btn: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  btnDisabled: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(14,165,233,.4)', color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  terms: { fontSize: 11, color: 'rgba(255,255,255,.25)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 },
  link: { color: '#38bdf8', textDecoration: 'none' },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.08)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' },
  loginBtn: { display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
  footer: { position: 'relative', zIndex: 1, marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,.2)', textAlign: 'center' },
  footerLink: { color: 'rgba(255,255,255,.3)', textDecoration: 'none' },
};
