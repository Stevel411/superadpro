import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

export default function Register() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const params = new URLSearchParams(window.location.search);
  // Precedence: URL ?ref= or ?r= wins, cookie is the fallback.
  // Cookie is set by /ref/:username (30-day life) so the sponsor is preserved
  // if the user clicks a referral link, navigates away, and returns later.
  function readCookie(name) {
    const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }
  // Sponsor resolution, in precedence order:
  //   1. URL ?ref= or ?r= — explicit, came from either /ref/:username
  //      OR from /start's peek-next-sponsor handler (the rotator-assigned
  //      Founder for this specific click). Always wins.
  //   2. Cookie (only if NOT via=start) — preserves the sponsor from a
  //      previous /ref/:username visit for organic /register arrivals.
  //   3. Empty — no sponsor; backend will assign rotator/house as
  //      appropriate.
  // When via=start the cookie is deliberately ignored so a stale referral
  // cookie cannot hijack the company funnel.
  const via = params.get('via') || '';
  const viaIsCompanyFunnel = (via === 'start' || via === 'rotator');
  const urlRef = params.get('ref') || params.get('r') || '';
  const refCode = urlRef || (viaIsCompanyFunnel ? '' : readCookie('ref') || '');
  // Distinguishes a "rotator-assigned" sponsor (came via /start) from a
  // "personal referral" sponsor (came via /ref/:username or a personal
  // link share). Tiny UI difference: the rotator-assigned case gets a
  // friendlier "You've been matched with..." framing.
  const refIsRotatorPick = viaIsCompanyFunnel && !!urlRef;

  // Gift voucher claim flow (added 8 May 2026).
  // When a recipient lands on /gift/{code} → clicks "Create Free Account",
  // they arrive here with ?gift=CODE. We:
  //   1. Display a banner so they know they're claiming a gift, not just
  //      doing a generic signup. Frames the experience.
  //   2. Auto-claim the voucher immediately after a successful registration
  //      so the dashboard they land on already shows their active membership.
  //   3. If claim fails (race: someone else claimed first, voucher already
  //      used, etc), redirect to /gift/{code} so they see a clear error
  //      instead of a confusing dashboard with no membership.
  // Without this, users had to register → land on dashboard → manually
  // navigate back to /gift/{code} → click claim again. Most never did.
  const giftCode = (params.get('gift') || '').trim().toUpperCase();
  const isGiftFlow = !!giftCode;

  // Pre-launch gate: hit /api/registration-status and only show the form if open.
  // null = still checking, true = open (or admin bypass), false = closed.
  // Forward ref and gift query params so the backend's bypass checks
  // can see them — the API call itself has no URL params, only the page
  // does, so we explicitly pass them through. Without this, gift recipients
  // and referral-link arrivals get "Launching soon" even though they
  // qualify for bypass. (Bug fixed 8 May 2026 — caught when test6 tried
  // to claim test3's voucher and got a closed-registration page.)
  const [registrationOpen, setRegistrationOpen] = useState(null);
  useEffect(function() {
    const statusParams = new URLSearchParams();
    if (refCode) statusParams.set('ref', refCode);
    if (giftCode) statusParams.set('gift', giftCode);
    const qs = statusParams.toString();
    fetch('/api/registration-status' + (qs ? '?' + qs : ''), { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(d) { setRegistrationOpen(!!d.open); })
      .catch(function() { setRegistrationOpen(false); }); // err on side of closed
  }, []);

  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', email: '', password: '', confirm_password: '', ref: refCode });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function set(k) { return function(e) { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); }; }

  async function submit(e) {
    e.preventDefault();
    if (!form.first_name.trim()) return setError(t('auth.errFirstName'));
    if (!form.username.trim()) return setError(t('auth.errUsername'));
    if (!form.email.trim()) return setError(t('auth.errEmail'));
    if (form.password.length < 8) return setError(t('auth.errPassword8'));
    if (form.password !== form.confirm_password) return setError(t('auth.errPasswordMatch'));
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/register', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        ref: form.ref.trim(),
        // Funnel marker — backend uses this to decide whether to
        // engage the rotator queue (via=start | via=rotator) or
        // fall through to the standard sponsor flow.
        via: via,
        // Include gift_code so backend's pre-launch gate can recognise
        // gift-claim signups as legitimate even when the URL has no ?ref=
        gift_code: giftCode || '',
      });
      await refreshUser();

      // Gift voucher auto-claim (see comment near top of component).
      // Claim happens AFTER refreshUser() so the session cookie is
      // recognised by the claim endpoint. If the claim fails (voucher
      // already claimed by someone else, expired, etc), we send the
      // user to /gift/{code} where they'll see a clear error rather
      // than a silent dashboard with no membership active.
      if (isGiftFlow) {
        try {
          const claimResult = await apiPost('/api/gift/' + giftCode + '/claim', {});
          if (claimResult && claimResult.success) {
            // Membership is active. Pass the gifter name through to the
            // dashboard so the celebratory banner can personalise its
            // message ("Your gift from Steve is active.") rather than
            // showing a generic welcome. encodeURIComponent handles names
            // with spaces or special characters safely.
            const fromParam = claimResult.gifter_name
              ? '&from=' + encodeURIComponent(claimResult.gifter_name)
              : '';
            window.location.href = '/home-preview?just_claimed=1' + fromParam;
            return;
          }
          // Claim returned without success — the user got a real account but
          // no membership. Push them to /gift/{code} so the GiftLanding page's
          // own error handling explains what happened. (Common case: voucher
          // was already claimed in the time it took them to fill the form.)
          window.location.href = '/gift/' + giftCode;
          return;
        } catch (claimErr) {
          // Network or 4xx error during claim — same fallback. The gift page
          // will re-fetch voucher status and show the appropriate error.
          window.location.href = '/gift/' + giftCode;
          return;
        }
      }

      window.location.href = '/home-preview';
    } catch (err) {
      setError(err.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  const strength = !form.password ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : /[^a-zA-Z0-9]/.test(form.password) ? 4 : 3;
  const strengthLabel = ['', t('auth.weak'), t('auth.fair'), t('auth.good'), t('auth.strong')];
  const strengthColor = ['', 'var(--sap-red-bright)', 'var(--sap-amber)', 'var(--sap-green-bright)', 'var(--sap-accent)'];

  // ── Pre-launch gate ──
  // Show "Launching soon" screen when public registration is closed.
  // Loading state intentionally minimal (just a thin spinner area) so the
  // page doesn't flash form-then-gate.
  if (registrationOpen === null) {
    return (
      <div style={styles.page}>
        <div style={styles.bg} />
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh' }}>
          <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,.2)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (registrationOpen === false) {
    return (
      <div style={styles.page}>
        <div style={styles.bg} />
        <div style={styles.bgGlow1} />
        <div className="reg-card" style={{ ...styles.card, textAlign:'center' }}>
          <div style={styles.logoRow}>
            <div style={styles.logoMark}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span>
            </div>
            <span style={styles.logoText}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('common.pro')}</span></span>
          </div>
          <div style={{ fontSize:64, marginTop:24, marginBottom:16, lineHeight:1 }}>🚀</div>
          <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#fff', marginBottom:16, letterSpacing:-.5 }}>
            Launching soon
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.7)', lineHeight:1.6, marginBottom:32, maxWidth:380, marginLeft:'auto', marginRight:'auto' }}>
            SuperAdPro is in final testing with a closed group. We'll be opening to the public very soon — keep an eye out.
          </p>
          <Link to="/login" style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:12,
            background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#fff',
            fontWeight:800, fontSize:14, fontFamily:'Sora,sans-serif',
            textDecoration:'none', boxShadow:'0 6px 20px rgba(14,165,233,0.4)',
          }}>
            Sign in →
          </Link>
          <div style={{ marginTop:20, fontSize:13, color:'rgba(255,255,255,.5)' }}>
            Already have an account? Use the sign in link above.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        /* Mobile breakpoint matches the rest of the platform (767px).
           At this width, the firstName/lastName grid collapses to a
           single column for cleaner stacking, and the card's horizontal
           padding tightens so the form has more room. */
        @media (max-width: 767px) {
          .reg-card { padding: 32px 20px !important; }
          .reg-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={styles.bg} />
      <div style={styles.bgGlow1} />

      <div className="reg-card" style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span>
          </div>
          <span style={styles.logoText}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('common.pro')}</span></span>
        </div>

        <h1 style={styles.heading}>{t('auth.createYourAccount')}</h1>
        <p style={styles.sub}>{t('auth.joinThousands')}</p>

        {refCode && (
          <div style={styles.refBadge}>
            {refIsRotatorPick ? (
              <>🤝 You've been matched with <strong>{refCode}</strong> — an active Founder</>
            ) : (
              <>🤝 Referred by <strong>{refCode}</strong></>
            )}
          </div>
        )}

        {/* Gift voucher banner — only shown when ?gift=CODE is present.
            Frames the experience so the user understands they're claiming
            a gift, not just doing a generic signup. The banner sits above
            the error box so any subsequent errors render below it. */}
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
                You're claiming a gift
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.4 }}>
                Just create your account below. We'll activate your free membership automatically — no extra steps.
              </div>
            </div>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div className="reg-row" style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>{t('auth.firstName')}</label>
              <input value={form.first_name} onChange={set('first_name')} placeholder={t("auth.firstNamePlaceholder")} autoFocus style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('auth.lastName')}</label>
              <input value={form.last_name} onChange={set('last_name')} placeholder={t("auth.lastNamePlaceholder")} style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t('auth.username')}</label>
            <input value={form.username} onChange={set('username')} placeholder={t("auth.usernamePlaceholder2")} autoComplete="username" style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t('auth.emailAddressLabel')}</label>
            <input value={form.email} onChange={set('email')} type="email" placeholder={t("auth.emailPlaceholder2")} autoComplete="email" style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t('auth.password')}</label>
            <div style={{ position: 'relative' }}>
              <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'} placeholder={t("auth.passwordPlaceholder2")} autoComplete="new-password" style={{ ...styles.input, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>{showPass ? '🙈' : '👁️'}</button>
            </div>
            {form.password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                  <div style={{ width: `${strength * 25}%`, height: '100%', background: strengthColor[strength], borderRadius: 2, transition: 'width .3s, background .3s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t('auth.confirmPassword')}</label>
            <input value={form.confirm_password} onChange={set('confirm_password')} type="password" placeholder={t('auth.reEnterPassword')} autoComplete="new-password" style={{ ...styles.input, borderColor: form.confirm_password && form.confirm_password !== form.password ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)' }} />
          </div>

          {refCode ? (
            <div style={styles.field}>
              <label style={styles.label}>{t('auth.yourSponsor')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input value={form.ref} readOnly style={{ ...styles.input, opacity: 0.6, cursor: 'default', flex: 1 }} />
                <div style={{ fontSize: 12, color: 'var(--sap-green-mid)', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('auth.verified')}</div>
              </div>
            </div>
          ) : viaIsCompanyFunnel ? (
            // Fallback: visitor arrived with via=start but no ref param.
            // This shouldn't normally happen — /start's click handler
            // calls peek-next-sponsor before redirecting, and that
            // endpoint always returns a sponsor (Founder or house
            // account fallback). If we DO land here it means JS failed,
            // the network call errored, or someone hand-typed the URL.
            // Show generic copy; backend rotator will fire at submit.
            <div style={styles.field}>
              <div style={{
                background: 'rgba(34,211,238,.08)',
                border: '1px solid rgba(34,211,238,.25)',
                borderRadius: 10,
                padding: '14px 18px',
                fontSize: 13,
                color: 'rgba(255,255,255,.78)',
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 700, color: '#22d3ee', marginBottom: 4 }}>You'll be matched with an active Founder</div>
                We'll connect you with one of our active Founding Partners — they're successful members of the platform and your point of contact.
              </div>
            </div>
          ) : (
            <div style={styles.field}>
              <label style={styles.label}>{t('common.sponsorUsername')} <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>{t('auth.whoReferred')}</span></label>
              <input value={form.ref} onChange={set('ref')} placeholder={t('auth.defaultSponsor')} style={styles.input} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', marginTop: 4, lineHeight: 1.4 }}>{t("auth.sponsorDesc")}</div>
            </div>
          )}

          <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
            {loading
              ? (isGiftFlow ? 'Creating account & claiming gift…' : t('auth.creatingAccount'))
              : (isGiftFlow ? 'Create Account & Claim Gift 🎁' : t('auth.createAccount'))}
          </button>
        </form>

        <p style={styles.terms}>
          By creating an account you agree to our <a href="/legal" style={styles.link}>{t('auth.termsOfService')}</a> and <a href="/legal" style={styles.link}>{t('auth.privacyPolicy')}</a>.
        </p>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>{t('auth.haveAccount')}</span>
          <span style={styles.dividerLine} />
        </div>

        <a href="/login" style={styles.loginBtn}>{t('auth.signInInstead')}</a>
      </div>

      <p style={styles.footer}>© 2026 SuperAdPro · <a href="/legal" style={styles.footerLink}>{t('auth.termsLabel')}</a></p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--sap-cobalt-deep)', padding: '40px 20px', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" },
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
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.05em' },
  input: { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
  btn: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  btnDisabled: { marginTop: 6, padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(14,165,233,.4)', color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" },
  terms: { fontSize: 13, color: 'rgba(255,255,255,.25)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 },
  link: { color: 'var(--sap-accent-light)', textDecoration: 'none' },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.08)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' },
  loginBtn: { display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
  footer: { position: 'relative', zIndex: 1, marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,.2)', textAlign: 'center' },
  footerLink: { color: 'rgba(255,255,255,.3)', textDecoration: 'none' },
};
