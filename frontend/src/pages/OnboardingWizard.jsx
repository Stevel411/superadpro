import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';

var STEPS = [
  { id: 'welcome', title: 'Welcome to SuperAdPro', icon: '👋' },
  { id: 'profile', title: 'Set Up Your Profile', icon: '📸' },
  { id: 'referral', title: 'Your Referral Link', icon: '🔗' },
  { id: 'tour', title: 'Platform Tour', icon: '🗺️' },
  { id: 'create', title: 'Create Your First Content', icon: '✨' },
];

export default function OnboardingWizard() {
  var { t } = useTranslation();
  var { user, refreshUser, setUser } = useAuth();
  var navigate = useNavigate();
  var [step, setStep] = useState(0);
  var [firstName, setFirstName] = useState(user?.first_name || '');
  var [lastName, setLastName] = useState(user?.last_name || '');
  var [bio, setBio] = useState('');
  var [photoUrl, setPhotoUrl] = useState(user?.avatar_url || '');
  var [uploading, setUploading] = useState(false);
  var [refCopied, setRefCopied] = useState(false);
  var [saving, setSaving] = useState(false);
  var fileRef = useRef(null);

  var refLink = 'https://www.superadpro.com/ref/' + (user?.username || '');
  var current = STEPS[step];
  var progress = ((step + 1) / STEPS.length) * 100;

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function uploadPhoto(e) {
    var file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    var fd = new FormData();
    fd.append('file', file);
    fetch('/api/upload-image', { method: 'POST', credentials: 'include', body: fd })
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d.url) setPhotoUrl(d.url); setUploading(false); })
      .catch(function() { setUploading(false); });
  }

  function saveProfile() {
    setSaving(true);
    apiPost('/api/account/update', {
      first_name: firstName,
      last_name: lastName,
      bio: bio,
      avatar_url: photoUrl,
    }).then(function() { setSaving(false); next(); }).catch(function() { setSaving(false); next(); });
  }

  function copyRefLink() {
    navigator.clipboard.writeText(refLink);
    setRefCopied(true);
    setTimeout(function() { setRefCopied(false); }, 2000);
  }

  function completeOnboarding() {
    apiPost('/api/onboarding/complete', {}).then(function() {
      // Update user state immediately to prevent dashboard redirect loop
      if (setUser && user) {
        setUser(Object.assign({}, user, { onboarding_completed: true }));
      }
      // Then refresh from server in background and navigate
      if (refreshUser) {
        refreshUser().then(function() { navigate('/dashboard'); }).catch(function() { navigate('/dashboard'); });
      } else {
        navigate('/dashboard');
      }
    }).catch(function() {
      // Even on error, try to navigate
      if (setUser && user) {
        setUser(Object.assign({}, user, { onboarding_completed: true }));
      }
      navigate('/dashboard');
    });
  }

  // ── Outer shell ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #172554 0%, #172554 50%, #1e3a8a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'DM Sans, sans-serif' }}>

      {/* Logo */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff' }}>Super<span style={{ color: 'var(--sap-accent)' }}>{t('onboarding.adLabel')}</span><span style={{ color: 'var(--sap-purple-light)' }}>{t('onboarding.pro')}</span></div>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 560, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {STEPS.map(function(s, i) {
            var done = i < step;
            var active = i === step;
            return <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? 'var(--sap-green-bright)' : active ? 'var(--sap-purple)' : 'rgba(255,255,255,.1)', border: active ? '2px solid #a78bfa' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: done || active ? '#fff' : 'rgba(255,255,255,.3)', fontWeight: 700, transition: 'all .3s' }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 9, color: active ? 'var(--sap-purple-light)' : done ? 'var(--sap-green-bright)' : 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'center' }}>{s.title.split(' ').slice(0, 2).join(' ')}</div>
            </div>;
          })}
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, #8b5cf6, #0ea5e9)', borderRadius: 2, width: progress + '%', transition: 'width .4s ease' }}/>
        </div>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 20, padding: '36px 32px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        {/* ── STEP 1: Welcome ── */}
        {step === 0 && <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 8 }}>Welcome{firstName ? ', ' + firstName : ''}!</h1>
          <p style={{ fontSize: 15, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 24, maxWidth: 420, margin: '0 auto 24px' }}>
            Let's get you set up in 5 quick steps. This will take about 3 minutes and you'll be ready to start earning and creating.
          </p>
          <div style={{ background: 'var(--sap-bg-elevated)', borderRadius: 12, padding: '16px 20px', textAlign: 'left', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 8 }}>{t('onboarding.heresWhatWeDo')}</div>
            {['Set up your profile photo and name', 'Copy your personal referral link', 'Take a quick platform tour', 'Create your first piece of AI content'].map(function(t, i) {
              return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sap-text-secondary)', marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--sap-purple-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--sap-violet)', flexShrink: 0 }}>{i + 1}</div>
                {t}
              </div>;
            })}
          </div>
          <button onClick={next} style={btnPrimary}>{t('onboarding.letsGo')}</button>
        </div>}

        {/* ── STEP 2: Profile ── */}
        {step === 1 && <div>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('onboarding.setupProfile')}</h2>
            <p style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>{t('onboarding.profileDesc')}</p>
          </div>

          {/* Photo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div onClick={function() { if (fileRef.current) fileRef.current.click(); }}
              style={{ width: 96, height: 96, borderRadius: '50%', background: photoUrl ? 'none' : 'var(--sap-bg-page)', border: '3px dashed ' + (photoUrl ? 'var(--sap-purple)' : 'var(--sap-border)'), overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {photoUrl ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> :
                <div style={{ textAlign: 'center', color: 'var(--sap-text-muted)', fontSize: 11, fontWeight: 600 }}>{uploading ? 'Uploading...' : 'Click to\nupload'}</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }}/>
          </div>

          {/* Name fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lblStyle}>{t('onboarding.firstName')}</label>
              <input value={firstName} onChange={function(e) { setFirstName(e.target.value); }} placeholder={t('onboarding.firstNamePlaceholder')} style={inputStyle}/>
            </div>
            <div>
              <label style={lblStyle}>{t('onboarding.lastName')}</label>
              <input value={lastName} onChange={function(e) { setLastName(e.target.value); }} placeholder={t('onboarding.lastNamePlaceholder')} style={inputStyle}/>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lblStyle}>{t('onboarding.shortBio')} <span style={{ fontWeight: 400, color: 'var(--sap-text-ghost)' }}>{t('onboarding.optionalLabel')}</span></label>
            <textarea value={bio} onChange={function(e) { setBio(e.target.value); }} placeholder={t('onboarding.bioPlaceholderFull')} rows={2} style={{ ...inputStyle, resize: 'vertical' }}/>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={prev} style={btnSecondary}>{t('onboarding.backLabel')}</button>
            <button onClick={saveProfile} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'Saving...' : 'Save & Continue →'}</button>
          </div>
        </div>}

        {/* ── STEP 3: Referral Link ── */}
        {step === 2 && <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('onboarding.yourReferralLink')}</h2>
          <p style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginBottom: 20 }}>{t('onboarding.referralLinkDesc')}</p>

          <div style={{ background: 'var(--sap-bg-elevated)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--sap-text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{refLink}</div>
            <button onClick={copyRefLink} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: refCopied ? 'var(--sap-green-bright)' : 'var(--sap-purple)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{refCopied ? '✓ Copied!' : 'Copy Link'}</button>
          </div>

          <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 18px', textAlign: 'left', marginBottom: 24, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>{t('onboarding.howYouEarn')}</div>
            <div style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.7 }}>
              Every person who signs up through your link becomes your referral. You earn $10/month for Basic members and $17.50/month for Pro members — recurring, every month they stay active.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={prev} style={btnSecondary}>{t('onboarding.backLabel')}</button>
            <button onClick={next} style={{ ...btnPrimary, flex: 1 }}>{t('onboarding.continue')}</button>
          </div>
        </div>}

        {/* ── STEP 4: Platform Tour ── */}
        {step === 3 && <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('onboarding.quickTour')}</h2>
          <p style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginBottom: 20 }}>{t('onboarding.quickTourDesc')}</p>

          <div style={{ background: 'var(--sap-bg-elevated)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
            {[
              { icon: '📊', title: 'Dashboard', desc: 'Your home base — see earnings, team growth, and quick actions' },
              { icon: '💰', title: 'How You Earn', desc: '4 income streams: referrals, campaign grid, Profit Nexus, courses' },
              { icon: '🎬', title: 'Creative Studio', desc: 'AI video, images, music, voiceover — 9 video models, 11 image models' },
              { icon: '🛠️', title: 'Pro Tools', desc: 'SuperPages, SuperDeck, AutoResponder, SuperSeller (upgrade to Pro)' },
              { icon: '👁️', title: 'Watch to Earn', desc: 'Watch daily videos to keep your campaign commissions active' },
              { icon: '💳', title: 'Wallet', desc: 'Two wallets — withdraw anytime via USDT crypto' },
            ].map(function(item, i) {
              return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 5 ? '1px solid #e2e8f0' : 'none', textAlign: 'left' }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--sap-text-muted)' }}>{item.desc}</div>
                </div>
              </div>;
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={prev} style={btnSecondary}>{t('onboarding.backLabel')}</button>
            <button onClick={function() { window.open('/tour', '_blank'); }} style={{ ...btnSecondary, flex: 1 }}>{t('onboarding.openFullTour')}</button>
            <button onClick={next} style={{ ...btnPrimary, flex: 1 }}>{t('onboarding.continue')}</button>
          </div>
        </div>}

        {/* ── STEP 5: Create Content ── */}
        {step === 4 && <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('onboarding.allSet')}</h2>
          <p style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginBottom: 24 }}>{t('onboarding.accountReadyBody')}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '🎬', title: 'Create a video in Creative Studio', desc: 'Use AI to generate marketing videos, images, and music', link: '/creative-studio', color: 'var(--sap-purple)' },
              { icon: '🔗', title: 'Build your LinkHub page', desc: 'Create your personal link-in-bio page to share everywhere', link: '/linkhub', color: 'var(--sap-accent)' },
              { icon: '📢', title: 'Share your referral link', desc: 'Post on social media and start building your team', link: '/affiliate', color: 'var(--sap-green-bright)' },
            ].map(function(item) {
              return <div key={item.title} onClick={function() { completeOnboarding(); setTimeout(function() { window.location.href = item.link; }, 200); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.background = 'var(--sap-bg-elevated)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = 'var(--sap-border)'; e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: 16, color: 'var(--sap-text-ghost)' }}>→</div>
              </div>;
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={prev} style={btnSecondary}>{t('onboarding.backLabel')}</button>
            <button onClick={completeOnboarding} style={{ ...btnPrimary, flex: 1, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>{t('onboarding.goToDashboard')}</button>
          </div>
        </div>}
      </div>

      {/* Skip button — prominent for experienced users */}
      <button onClick={completeOnboarding} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
        onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}>
        Skip Setup → Go to Dashboard
      </button>
    </div>
  );
}

// ── Shared styles ──
var btnPrimary = { padding: '14px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora, sans-serif', boxShadow: '0 4px 0 #5b21b6, 0 6px 16px rgba(124,58,237,.25)', transition: 'all .15s', width: '100%' };
var btnSecondary = { padding: '14px 20px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: 'var(--sap-text-muted)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
var lblStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-secondary)', marginBottom: 4 };
var inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: 'var(--sap-text-primary)', outline: 'none', boxSizing: 'border-box' };
