import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../../utils/api';

export default function TwoFactorSetup() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1=loading, 2=scan, 3=verify, 4=done
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    apiGet('/api/2fa/setup').then(d => {
      setQr(d.qr_b64);
      setSecret(d.secret);
      setEmail(d.email);
      setStep(2);
    }).catch(() => {
      window.location.href = '/account';
    });
  }, []);

  function handleChange(i, val) {
    const digits = val.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[i] = digits;
    setCode(next);
    setError('');
    if (digits && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setCode(pasted.split('')); inputs.current[5]?.focus(); }
  }

  async function verify(e) {
    e.preventDefault();
    const c = code.join('');
    if (c.length !== 6) return setError(t('auth.enterAll6Setup'));
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/2fa/confirm-setup', { code: c });
      setStep(4);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (step === 1) return (
    <div style={styles.page}><div style={styles.bg} /><div style={{ color: 'rgba(255,255,255,.4)', fontFamily: "'DM Sans', sans-serif" }}>{t('auth.settingUp')}</div></div>
  );

  if (step === 4) return (
    <div style={styles.page}>
      <div style={styles.bg} />
      <div style={styles.card}>
        <div style={styles.successIcon}>✅</div>
        <h1 style={styles.heading}>{t('auth.twoFAEnabled')}</h1>
        <p style={styles.sub}>{t('auth.twoFAEnabledDesc')}</p>
        <a href="/account" style={styles.btn}>{t('auth.backToAccount')}</a>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.bg} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoText}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('common.pro')}</span></span>
        </div>

        <h1 style={styles.heading}>{t('auth.setup2FA')}</h1>
        <p style={styles.sub}>{t('auth.setup2FADesc')}</p>

        {/* Steps indicator */}
        <div style={styles.steps}>
          {[t('auth.scanQR'), t('auth.verify')].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ ...styles.stepDot, background: step >= i + 2 ? 'var(--sap-accent)' : 'rgba(255,255,255,.1)', color: step >= i + 2 ? '#fff' : 'rgba(255,255,255,.3)' }}>{i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: step >= i + 2 ? '#7dd3fc' : 'rgba(255,255,255,.3)' }}>{s}</span>
              {i === 0 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,.15)' }} />}
            </div>
          ))}
        </div>

        {step === 2 && (
          <>
            <div style={styles.instructions}>
              <p style={styles.instrText}><strong style={{ color: '#fff' }}>{t('auth.step1Label')}</strong> {t('auth.downloadAuthFull')}</p>
              <p style={styles.instrText}><strong style={{ color: '#fff' }}>{t('auth.step2Label')}</strong> {t('auth.scanQrFull')}</p>
            </div>

            {qr && (
              <div style={styles.qrWrap}>
                <img src={`data:image/png;base64,${qr}`} alt={t('auth.qrAlt')} style={styles.qrImg} />
              </div>
            )}

            <div style={styles.secretBox}>
              <div style={styles.secretLabel}>{t("auth.cantScan")}</div>
              <div style={styles.secretRow}>
                <code style={styles.secretCode}>{secret}</code>
                <button onClick={copySecret} style={styles.copyBtn}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <div style={styles.secretEmail}>Account: {email}</div>
            </div>

            <button onClick={() => { setStep(3); setTimeout(() => inputs.current[0]?.focus(), 100); }} style={styles.btn}>
              I've scanned the QR code →
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={styles.instructions}>
              <p style={styles.instrText}>{t("auth.enter6DigitConfirm")}</p>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={verify}>
              <div style={styles.codeRow} onPaste={handlePaste}>
                {code.map((d, i) => (
                  <input key={i} ref={el => inputs.current[i] = el}
                    value={d} onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    maxLength={1} inputMode="numeric"
                    style={{ ...styles.codeInput, borderColor: error ? 'rgba(239,68,68,.5)' : d ? 'rgba(56,189,248,.5)' : 'rgba(255,255,255,.15)' }}
                  />
                ))}
              </div>

              <button type="submit" disabled={loading} style={{ ...styles.btn, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Verifying…' : 'Enable 2FA'}
              </button>
            </form>

            <button onClick={() => setStep(2)} style={styles.backBtn}>{t('auth.backToQr')}</button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/account" style={styles.cancelLink}>{t('auth.cancelReturn')}</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sap-cobalt-deep)', padding: 20, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(14,165,233,.12) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '40px 36px', backdropFilter: 'blur(20px)', textAlign: 'center' },
  logoRow: { marginBottom: 20 },
  logoText: { fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: "'Sora', sans-serif" },
  heading: { fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 24, lineHeight: 1.5 },
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 },
  stepDot: { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 },
  instructions: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, textAlign: 'left' },
  instrText: { fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, margin: '0 0 6px' },
  qrWrap: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  qrImg: { width: 180, height: 180, borderRadius: 12, border: '3px solid rgba(56,189,248,.3)', background: '#fff', padding: 8 },
  secretBox: { background: 'rgba(56,189,248,.06)', border: '1px solid rgba(56,189,248,.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left' },
  secretLabel: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 },
  secretRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  secretCode: { flex: 1, fontSize: 13, fontFamily: 'monospace', color: '#7dd3fc', wordBreak: 'break-all', letterSpacing: '.05em' },
  copyBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(56,189,248,.3)', background: 'rgba(56,189,248,.1)', color: 'var(--sap-accent-light)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' },
  secretEmail: { fontSize: 11, color: 'rgba(255,255,255,.3)' },
  btn: { display: 'block', width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' },
  errorBox: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 },
  codeRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  codeInput: { width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.06)', border: '2px solid rgba(255,255,255,.15)', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border-color .15s' },
  backBtn: { display: 'block', marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif' " },
  cancelLink: { fontSize: 13, color: 'rgba(255,255,255,.3)', textDecoration: 'none' },
  successIcon: { fontSize: 48, marginBottom: 16 },
};
