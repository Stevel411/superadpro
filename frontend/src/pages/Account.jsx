import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';

export default function Account() {
  const { user, refreshUser } = useAuth();
  const [toast, setToast] = useState(null);

  // Edit profile
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [country, setCountry] = useState(user?.country || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password
  const [pwError, setPwError] = useState('');

  // Wallet
  const [walletAddr, setWalletAddr] = useState(user?.wallet_address || '');
  const [savingWallet, setSavingWallet] = useState(false);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiPost('/api/account/update', { first_name: firstName, last_name: lastName, country });
      await refreshUser();
      showToast('Settings saved successfully', 'ok');
    } catch (e) { showToast(e.message, 'err'); }
    setSavingProfile(false);
  };

  const saveWallet = async (e) => {
    e.preventDefault();
    setSavingWallet(true);
    try {
      const formData = new FormData();
      formData.append('wallet_address', walletAddr);
      const res = await fetch('/save-wallet', { method: 'POST', body: formData, credentials: 'include' });
      if (res.redirected || res.ok) showToast('Wallet saved', 'ok');
      else showToast('Failed to save wallet', 'err');
    } catch (e) { showToast(e.message, 'err'); }
    setSavingWallet(false);
  };

  if (!user) return null;

  const memberId = `SAP-${String(user.id || 0).padStart(5, '0')}`;
  const initials = ((user.first_name || '')[0] || '') + ((user.last_name || user.username || '')[0] || user.username?.[1] || '');
  const kyc = user.kyc_status || 'none';

  return (
    <AppLayout title="My Profile" subtitle="Manage your account, security, and wallet">

      {toast && (
        <div style={{
          borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 13, fontWeight: 600,
          ...(toast.type === 'ok'
            ? { background: '#dcfce7', border: '1px solid rgba(22,163,74,0.2)', color: '#16a34a' }
            : { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }),
        }}>{toast.msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ══ LEFT COLUMN ══ */}
        <div>
          {/* Profile Card */}
          <PCard title="Profile">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {initials.toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>{user.first_name || ''} {user.last_name || ''}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>@{user.username}</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, marginTop: 6,
                  ...(user.is_active
                    ? { background: '#dcfce7', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }
                    : { background: '#fef3c7', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }),
                }}>{user.is_active ? '● Active Member' : '○ Inactive'}</span>
              </div>
            </div>
            <InfoRow k="Member ID" v={memberId} mono />
            <InfoRow k="Email" v={user.email} />
            <InfoRow k="Country" v={user.country || '—'} />
            <InfoRow k="Sponsor" v={user.sponsor_id ? `#${user.sponsor_id}` : 'Direct'} />
            <InfoRow k="Joined" v={user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} last />
          </PCard>

          {/* Edit Profile */}
          <PCard title="Edit Profile">
            <div style={fgStyle}><label style={labelStyle}>First Name</label><input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
            <div style={fgStyle}><label style={labelStyle}>Last Name</label><input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            <div style={fgStyle}>
              <label style={labelStyle}>Country</label>
              <select style={inputStyle} value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">Select...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={saveProfile} disabled={savingProfile} style={btnPrimary}>{savingProfile ? 'Saving...' : 'Save Profile'}</button>
          </PCard>

          {/* Change Password */}
          <PCard title="Change Password">
            <form method="POST" action="/account/change-password" onSubmit={e => {
              const np = e.target.new_password.value;
              const cp = e.target.confirm_password.value;
              if (np !== cp) { e.preventDefault(); setPwError('Passwords do not match.'); }
              else setPwError('');
            }}>
              <div style={fgStyle}><label style={labelStyle}>Current Password</label><input style={inputStyle} type="password" name="current_password" placeholder="Current password" required autoComplete="current-password" /></div>
              <div style={fgStyle}><label style={labelStyle}>New Password</label><input style={inputStyle} type="password" name="new_password" placeholder="Min. 8 characters" required minLength="8" autoComplete="new-password" /></div>
              <div style={fgStyle}><label style={labelStyle}>Confirm New</label><input style={inputStyle} type="password" name="confirm_password" placeholder="Repeat password" required autoComplete="new-password" /></div>
              {pwError && <div style={{ fontSize: 11, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 10 }}>{pwError}</div>}
              <button type="submit" style={{ ...btnPrimary, background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>Update Password</button>
            </form>
          </PCard>
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div>
          {/* KYC */}
          <PCard title="Identity Verification (KYC)" chip={
            kyc === 'none' ? { text: '⬜ Not Started', cls: 'none' } :
            kyc === 'pending' ? { text: '⏳ Under Review', cls: 'pending' } :
            kyc === 'approved' ? { text: '✅ Verified', cls: 'approved' } :
            { text: '❌ Rejected', cls: 'rejected' }
          }>
            {kyc === 'approved' ? (
              <StatusCentre icon="✅" title="Identity Verified" desc="Your identity has been verified. You're approved for withdrawals." titleColor="#16a34a" />
            ) : kyc === 'pending' ? (
              <StatusCentre icon="⏳" title="Verification In Progress" desc="We're reviewing your documents. This usually takes 24–48 hours." titleColor="#d97706" />
            ) : (
              <>
                {kyc === 'rejected' && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠ Your submission was rejected. Please resubmit with clearer documents.</div>}
                {kyc !== 'rejected' && <p style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.6 }}>Verify your identity to enable withdrawals. We need your date of birth and a government-issued ID.</p>}
                <form method="POST" action="/account/kyc-submit" encType="multipart/form-data">
                  <div style={fgStyle}><label style={labelStyle}>Date of Birth</label><input style={inputStyle} type="date" name="kyc_dob" required /></div>
                  <div style={fgStyle}>
                    <label style={labelStyle}>ID Type</label>
                    <select name="kyc_id_type" style={inputStyle}>
                      <option value="passport">Passport</option>
                      <option value="drivers_licence">Driver's Licence</option>
                      <option value="national_id">National ID Card</option>
                    </select>
                  </div>
                  <div style={fgStyle}><label style={labelStyle}>Upload ID (JPG, PNG, or PDF — max 10MB)</label>
                    <input type="file" name="kyc_id_file" accept=".jpg,.jpeg,.png,.pdf" required style={{ width: '100%', padding: 10, border: '2px dashed #e5e7eb', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', color: '#94a3b8', background: '#f8f9fb', cursor: 'pointer' }} />
                  </div>
                  <button type="submit" style={btnPrimary}>{kyc === 'rejected' ? 'Resubmit Verification' : 'Submit Verification'}</button>
                </form>
              </>
            )}
          </PCard>

          {/* 2FA */}
          <PCard title="Two-Factor Authentication" chip={
            user.totp_enabled ? { text: '🔒 Enabled', cls: 'enabled' } : { text: '⬜ Disabled', cls: 'disabled' }
          }>
            {user.totp_enabled ? (
              <>
                <StatusCentre icon="🔒" title="2FA is Active" desc="Your account is protected with two-factor authentication." titleColor="#16a34a" />
                <form method="POST" action="/account/2fa-disable">
                  <div style={fgStyle}><label style={labelStyle}>Enter current 2FA code to disable</label>
                    <input style={{ ...inputStyle, textAlign: 'center', letterSpacing: 6, fontWeight: 700 }} type="text" name="totp_code" maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" required />
                  </div>
                  <button type="submit" style={{ ...btnPrimary, background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>Disable 2FA</button>
                </form>
              </>
            ) : (
              <>
                <StatusCentre icon="🔓" title="Not Enabled" desc="Protect your account with an authenticator app. Required before you can make withdrawals." titleColor="#94a3b8" />
                <a href="/account/2fa-setup" style={{ ...btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Setup 2FA →</a>
              </>
            )}
          </PCard>

          {/* Withdrawal Wallet */}
          <PCard title="Withdrawal Wallet">
            <form onSubmit={saveWallet}>
              <div style={fgStyle}>
                <label style={labelStyle}>Wallet Address (USDC on Base)</label>
                <input style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} value={walletAddr} onChange={e => setWalletAddr(e.target.value)} placeholder="0x..." />
              </div>
              <button type="submit" disabled={savingWallet} style={btnPrimary}>{savingWallet ? 'Saving...' : 'Save Wallet'}</button>
            </form>
            <div style={{ padding: '12px 14px', background: '#f8f9fb', border: '1px solid rgba(14,165,233,0.1)', borderRadius: 10, marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', marginBottom: 4 }}>Supported Wallets</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>Coinbase · MetaMask · Coinbase Wallet · Trust Wallet · Rainbow — any wallet accepting USDC on Base. <Link to="/support" style={{ color: '#0ea5e9', textDecoration: 'none' }}>Need help? →</Link></div>
            </div>
          </PCard>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Sub-components ──
function PCard({ title, chip, children }) {
  const chipColors = {
    none: { bg: '#f8f9fb', color: '#94a3b8', border: '#e5e7eb' },
    pending: { bg: '#fef3c7', color: '#d97706', border: 'rgba(217,119,6,0.2)' },
    approved: { bg: '#dcfce7', color: '#16a34a', border: 'rgba(22,163,74,0.2)' },
    rejected: { bg: '#fef2f2', color: '#dc2626', border: 'rgba(220,38,38,0.2)' },
    enabled: { bg: '#dcfce7', color: '#16a34a', border: 'rgba(22,163,74,0.2)' },
    disabled: { bg: '#f8f9fb', color: '#94a3b8', border: '#e5e7eb' },
  };
  const cc = chip ? chipColors[chip.cls] || chipColors.none : null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ea5e9', flexShrink: 0 }} />
          {title}
        </div>
        {chip && <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: cc.bg, color: cc.color, border: `1px solid ${cc.border}` }}>{chip.text}</span>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function InfoRow({ k, v, mono, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: last ? 'none' : '1px solid #e5e7eb' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: mono ? '#0ea5e9' : '#1a1a2e', ...(mono ? { fontFamily: 'monospace' } : {}) }}>{v}</span>
    </div>
  );
}

function StatusCentre({ icon, title, desc, titleColor }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: titleColor }}>{title}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

// ── Styles ──
const fgStyle = { marginBottom: 14 };
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, display: 'block' };
const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#1a1a2e', fontFamily: 'inherit', background: '#f8f9fb', boxSizing: 'border-box' };
const btnPrimary = { padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', background: '#0ea5e9', color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.25)' };

const COUNTRIES = ['Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','India','Indonesia','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mali','Malta','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','UAE','Uganda','Ukraine','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];
