import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost, apiGet } from '../utils/api';

var COUNTRIES = ['Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','India','Indonesia','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mali','Malta','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','UAE','Uganda','Ukraine','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];

var TABS = ['profile', 'security', 'payouts', 'verification'];  // billing removed — no subscriptions on AdvantageLife

var CSS = `
.aset{font-family:'DM Sans',system-ui,sans-serif;color:#0f172a;max-width:1080px;margin:0 auto;}
.aset *{box-sizing:border-box;}
.aset .band{height:120px;border-radius:18px;background:linear-gradient(120deg,#0a1438,#15275f 55%,#1e3a8a);}
.aset .idcard{position:relative;margin:-58px 16px 22px;background:#fff;border-radius:18px;box-shadow:0 2px 6px rgba(10,20,56,.06),0 24px 50px rgba(10,20,56,.12);padding:18px 22px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.aset .av{width:84px;height:84px;border-radius:20px;background:linear-gradient(135deg,#12388f,#0a1f52);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Sora',sans-serif;font-weight:800;font-size:30px;flex:0 0 auto;box-shadow:0 12px 26px rgba(10,31,82,.35);overflow:hidden;border:5px solid #fff;margin-top:-46px;}
.aset .av img{width:100%;height:100%;object-fit:cover;}
.aset .idtext{min-width:180px;}
.aset .nm{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#0a1438;letter-spacing:-.4px;line-height:1.1;}
.aset .meta{font-size:13px;color:#64748b;margin-top:4px;font-family:'JetBrains Mono',monospace;}
.aset .pills{display:flex;gap:9px;flex-wrap:wrap;margin-left:auto;}
.aset .pill{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:7px 13px;border-radius:999px;border:1px solid #e4eaf3;background:#fff;color:#0a1438;}
.aset .pill b{font-weight:800;}
.aset .pill.cyan{background:#ecfeff;border-color:#a5f3fc;color:#0e7490;}
.aset .pill.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857;}
.aset .pill.amber{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.aset .pill .dot{width:7px;height:7px;border-radius:50%;background:currentColor;}
.aset .layout{display:grid;grid-template-columns:228px 1fr;gap:18px;align-items:start;padding:0 16px 10px;}
.aset .rail{background:#fff;border-radius:16px;box-shadow:0 2px 6px rgba(10,20,56,.05),0 16px 36px rgba(10,20,56,.08);padding:10px;display:flex;flex-direction:column;gap:3px;position:sticky;top:14px;}
.aset .tab{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:11px;border:none;background:transparent;color:#334155;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;text-align:left;width:100%;transition:background .15s,color .15s;}
.aset .tab:hover{background:#f4f8fd;}
.aset .tab.on{background:linear-gradient(135deg,#1e3a8a,#15275f);color:#fff;box-shadow:0 8px 20px rgba(10,20,56,.2);}
.aset .tab svg{flex:0 0 auto;}
.aset .panel{background:#fff;border-radius:16px;box-shadow:0 2px 6px rgba(10,20,56,.05),0 16px 36px rgba(10,20,56,.08);padding:26px 28px;min-height:320px;}
.aset .ph{font-family:'Sora',sans-serif;font-weight:800;font-size:21px;color:#0a1438;letter-spacing:-.3px;margin:0 0 3px;}
.aset .psub{font-size:13.5px;color:#64748b;margin:0 0 22px;line-height:1.5;}
.aset .fld{margin-bottom:16px;}
.aset .row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.aset .lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#64748b;margin-bottom:7px;}
.aset .lbl span{font-weight:500;text-transform:none;letter-spacing:0;color:#94a3b8;}
.aset .inp,.aset .sel{width:100%;padding:11px 14px;border:1px solid #e4eaf3;border-radius:11px;font-size:15px;color:#0f172a;font-family:inherit;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;}
.aset .inp:focus,.aset .sel:focus{border-color:#c8102e;box-shadow:0 0 0 3px rgba(200,16,46,.12);}
.aset .inp.ro{background:#f6f8fc;color:#64748b;}
.aset .inp.mono{font-family:'JetBrains Mono',monospace;font-size:14px;}
.aset .inp:disabled{opacity:.55;}
.aset .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 26px;border-radius:11px;border:none;font-family:'Sora',sans-serif;font-size:13.5px;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#12388f,#0a1f52);box-shadow:0 10px 24px rgba(200,16,46,.32);transition:box-shadow .12s;}
.aset .btn:hover{box-shadow:0 14px 30px rgba(14,165,233,.36);}
.aset .btn:disabled{opacity:.6;cursor:wait;box-shadow:none;}
.aset .btn.ghost{background:#fff;color:#1e3a8a;border:1px solid #e4eaf3;box-shadow:0 8px 20px rgba(10,20,56,.07);}
.aset .btn.amber{background:linear-gradient(135deg,#f59e0b,#ef4444);box-shadow:0 10px 24px rgba(239,68,68,.22);}
.aset .btnrow{display:flex;gap:10px;flex-wrap:wrap;}
.aset .note{padding:12px 14px;background:#f6f8fc;border:1px solid #e4eaf3;border-radius:11px;font-size:13px;color:#475569;line-height:1.6;margin-bottom:16px;}
.aset .toast{border-radius:11px;padding:11px 16px;margin:0 16px 14px;font-size:14px;font-weight:700;}
.aset .toast.ok{background:#ecfdf5;color:#047857;}
.aset .toast.err{background:#fef2f2;color:#b91c1c;}
.aset .photorow{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.aset .pav{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#12388f,#0a1f52);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Sora',sans-serif;font-weight:800;font-size:22px;overflow:hidden;flex:0 0 auto;}
.aset .pav img{width:100%;height:100%;object-fit:cover;}
.aset .centre{text-align:center;padding:26px 0;}
.aset .centre .ico{font-size:34px;margin-bottom:8px;}
.aset .centre .h{font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:#0a1438;}
.aset .centre .s{font-size:13px;color:#64748b;margin-top:3px;}
.aset .mcard{border:1px solid #e4eaf3;border-radius:14px;padding:20px;margin-bottom:20px;}
.aset .mtop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:4px;}
.aset .mname{font-family:'Sora',sans-serif;font-weight:800;font-size:17px;color:#0a1438;}
.aset .mdesc{font-size:13px;color:#64748b;line-height:1.55;margin-bottom:18px;}
.aset .mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px;}
.aset .mk{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:5px;}
.aset .mv{font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:#0a1438;}
.aset .mv small{font-size:12px;color:#64748b;font-weight:600;}
.aset .sec-h{font-family:'Sora',sans-serif;font-weight:800;font-size:16px;color:#0a1438;margin:0 0 3px;}
.aset .sec-s{font-size:13px;color:#64748b;margin:0 0 14px;}
.aset .hrow{display:grid;grid-template-columns:86px 1fr auto;gap:16px;align-items:center;padding:15px 0;border-bottom:1px solid #eef2f8;}
.aset .hrow:last-child{border-bottom:none;}
.aset .hdate{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#94a3b8;}
.aset .hprod{font-family:'Sora',sans-serif;font-weight:700;font-size:14.5px;color:#0a1438;}
.aset .hdeliv{font-size:12.5px;color:#64748b;margin-top:2px;}
.aset .hright{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
.aset .hamt{font-family:'Sora',sans-serif;font-weight:800;font-size:16px;color:#0a1438;}
.aset .badge{display:inline-block;font-size:10.5px;font-weight:700;font-family:'JetBrains Mono',monospace;padding:3px 9px;border-radius:999px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;}
.aset .empty{padding:26px;text-align:center;color:#94a3b8;font-size:14px;}
.aset .netbtn{padding:11px 13px;border-radius:11px;border:2px solid #e4eaf3;background:#fff;cursor:pointer;text-align:left;width:100%;transition:border-color .15s,background .15s;}
.aset .netbtn.on{border-color:#c8102e;background:#fdf2f4;}
.aset .netbtn .t{font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:#0a1438;}
.aset .netbtn .d{font-size:12px;color:#64748b;margin-top:2px;}
.aset .file{display:block;width:100%;padding:12px;border-radius:11px;font-size:14px;text-align:center;cursor:pointer;background:#fafbfc;}
@media(max-width:760px){
  .aset .layout{grid-template-columns:1fr;}
  .aset .rail{flex-direction:row;overflow-x:auto;position:static;gap:6px;}
  .aset .tab{white-space:nowrap;}
  .aset .row2,.aset .mgrid{grid-template-columns:1fr;}
  .aset .pills{margin-left:0;width:100%;}
  .aset .panel{padding:22px 18px;}
}
`;

function Icon({ name }) {
  var p = {
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>,
    billing: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></>,
    security: <><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></>,
    payouts: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></>,
    verification: <><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></>,
  };
  return <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
}

export default function Account() {
  var { t } = useTranslation();
  var { user, refreshUser } = useAuth();
  var [sp, setSp] = useSearchParams();
  var [toast, setToast] = useState(null);

  var rawTab = sp.get('tab') || 'profile';
  var activeTab = TABS.indexOf(rawTab) >= 0 ? rawTab : 'profile';
  function go(tab) { setSp(tab === 'profile' ? {} : { tab: tab }); }

  var [firstName, setFirstName] = useState(user?.first_name || '');
  var [lastName, setLastName] = useState(user?.last_name || '');
  var [country, setCountry] = useState(user?.country || '');
  var [interests, setInterests] = useState(user?.interests || '');
  var [gender, setGender] = useState(user?.gender || '');
  var [ageRange, setAgeRange] = useState(user?.age_range || '');
  var [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  var [savingProfile, setSavingProfile] = useState(false);

  var [currentPw, setCurrentPw] = useState('');
  var [newPw, setNewPw] = useState('');
  var [confirmPw, setConfirmPw] = useState('');
  var [savingPw, setSavingPw] = useState(false);

  var [walletAddr, setWalletAddr] = useState(user?.wallet_address || '');
  var [walletNetwork, setWalletNetwork] = useState(user?.wallet_network === 'bsc' ? 'bsc' : '');
  var [savingWallet, setSavingWallet] = useState(false);

  var [kycDob, setKycDob] = useState('');
  var [kycIdType, setKycIdType] = useState('passport');
  var [kycFile, setKycFile] = useState(null);
  var [savingKyc, setSavingKyc] = useState(false);

  var [disable2faCode, setDisable2faCode] = useState('');
  var [disabling2fa, setDisabling2fa] = useState(false);

  // Billing data — membership holdings + purchase history. Source of truth is
  // /api/account/purchases (Payment / GridPosition / CreditPackPurchase tables).
  var [pdata, setPdata] = useState(null);
  var [pLoading, setPLoading] = useState(true);
  useEffect(function () {
    var cancelled = false;
    apiGet('/api/account/purchases')
      .then(function (d) { if (!cancelled) { setPdata(d && d.holdings ? d : null); setPLoading(false); } })
      .catch(function () { if (!cancelled) setPLoading(false); });
    return function () { cancelled = true; };
  }, []);

  function showToast(msg, type) { setToast({ msg: msg, type: type }); setTimeout(function () { setToast(null); }, 4000); }

  async function handleDisable2FA() {
    var code = (disable2faCode || '').trim();
    if (!/^[0-9]{6}$/.test(code)) { showToast('Please enter a valid 6-digit 2FA code.', 'err'); return; }
    setDisabling2fa(true);
    try {
      var formData = new URLSearchParams();
      formData.append('totp_code', code);
      var res = await fetch('/account/2fa-disable', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData.toString(), credentials: 'include' });
      var data;
      try { data = await res.json(); } catch (e) { data = { success: false, error: 'Server returned an unexpected response.' }; }
      if (data.success) { setDisable2faCode(''); showToast(data.message || 'Two-factor authentication disabled.', 'ok'); if (typeof refreshUser === 'function') refreshUser(); }
      else { showToast(data.error || 'Could not disable 2FA. Please try again.', 'err'); }
    } catch (e) { showToast(e.message || 'Network error. Please try again.', 'err'); }
    setDisabling2fa(false);
  }

  function handleAvatarUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      setAvatarUrl(ev.target.result);
      apiPost('/api/account/update', { avatar_url: ev.target.result }).then(function () { refreshUser(); showToast(t('account.photoUpdated'), 'ok'); }).catch(function (err) { showToast(err.message || t('account.uploadFailed'), 'err'); });
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    apiPost('/api/account/update', { avatar_url: '' }).then(function () { setAvatarUrl(''); refreshUser(); showToast(t('account.photoRemoved'), 'ok'); }).catch(function (err) { showToast(err.message || 'Failed', 'err'); });
  }

  function saveProfile() {
    setSavingProfile(true);
    apiPost('/api/account/update', { first_name: firstName, last_name: lastName, country: country, interests: interests, gender: gender, age_range: ageRange }).then(function () { refreshUser(); showToast(t('account.profileSaved'), 'ok'); setSavingProfile(false); }).catch(function (e) { showToast(e.message || t('account.failed'), 'err'); setSavingProfile(false); });
  }

  function changePassword() {
    if (newPw !== confirmPw) { showToast(t('account.passwordsNoMatch'), 'err'); return; }
    if (newPw.length < 8) { showToast(t('account.min8Chars'), 'err'); return; }
    setSavingPw(true);
    apiPost('/api/account/change-password', { current_password: currentPw, new_password: newPw, confirm_password: confirmPw }).then(function () { showToast(t('account.passwordUpdated'), 'ok'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setSavingPw(false); }).catch(function (e) { showToast(e.message || t('account.failed'), 'err'); setSavingPw(false); });
  }

  function saveWallet() {
    var addr = (walletAddr || '').trim();
    var net = (walletNetwork || '').toLowerCase();
    if (!addr && !net) {
      setSavingWallet(true);
      apiPost('/api/account/update', { wallet_address: '', wallet_network: '' }).then(function () { refreshUser(); showToast(t('account.walletSaved') || 'Wallet cleared', 'ok'); setSavingWallet(false); }).catch(function (e) { showToast(e.message || 'Failed', 'err'); setSavingWallet(false); });
      return;
    }
    if (net !== 'bsc') { showToast('Add your USDT (BEP-20 / BSC) wallet address.', 'err'); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) { showToast('BSC (BEP-20) wallet must start with 0x followed by 40 hex characters.', 'err'); return; }
    setSavingWallet(true);
    apiPost('/api/account/update', { wallet_address: addr, wallet_network: net }).then(function () { refreshUser(); showToast(t('account.walletSaved') || 'Wallet saved', 'ok'); setSavingWallet(false); }).catch(function (e) { showToast(e.message || t('account.failed'), 'err'); setSavingWallet(false); });
  }

  function submitKyc() {
    if (!kycDob) { showToast(t('account.dobRequired'), 'err'); return; }
    if (!kycFile) { showToast(t('account.idRequired'), 'err'); return; }
    setSavingKyc(true);
    var fd = new FormData();
    fd.append('kyc_dob', kycDob); fd.append('kyc_id_type', kycIdType); fd.append('kyc_id_file', kycFile);
    fetch('/account/kyc-submit', { method: 'POST', body: fd, credentials: 'include' })
      .then(function (r) { setSavingKyc(false); if (r.ok || r.redirected) { refreshUser(); showToast(t('account.verificationSubmitted'), 'ok'); setKycDob(''); setKycFile(null); } else { showToast(t('account.submissionFailed'), 'err'); } })
      .catch(function () { setSavingKyc(false); showToast(t('account.submissionFailed'), 'err'); });
  }

  if (!user) return null;
  var initials = (((user.first_name || '')[0] || '') + ((user.last_name || user.username || '')[0] || '')).toUpperCase();
  var kyc = user.kyc_status || 'none';
  var tierLabel = (user.access_level === 'lifetime') ? 'Lifetime Member' : 'Free';
  var memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';

  return (
    <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} hideTopbar>
      <style>{CSS}</style>
      <div className="aset">
        {toast && <div className={'toast ' + (toast.type === 'ok' ? 'ok' : 'err')}>{toast.msg}</div>}

        <div className="band" />
        <div className="idcard">
          <label className="av" style={{ cursor: 'pointer' }} title="Change photo">
            {avatarUrl ? <img src={avatarUrl} alt="" onError={function (e) { e.target.style.display = 'none'; }} /> : initials}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          </label>
          <div className="idtext">
            <div className="nm">{(user.first_name || '') + ' ' + (user.last_name || '')}</div>
            <div className="meta">@{user.username} · {user.email}</div>
          </div>
          <div className="pills">
            <span className="pill cyan"><b>{tierLabel}</b> {t('account.tier', { defaultValue: 'tier' })}</span>
            {kyc === 'approved'
              ? <span className="pill green"><span className="dot" /> Verified</span>
              : kyc === 'pending'
                ? <span className="pill amber"><span className="dot" /> Under review</span>
                : <span className="pill"><span className="dot" style={{ background: '#cbd5e1' }} /> Unverified</span>}
            <span className="pill">Member since {memberSince}</span>
          </div>
        </div>

        <div className="layout">
          <nav className="rail">
            {TABS.map(function (tab) {
              var labels = { profile: 'Profile', security: 'Security', payouts: 'Payout Wallets', verification: 'Verification' };
              return (
                <button key={tab} className={'tab' + (activeTab === tab ? ' on' : '')} onClick={function () { go(tab); }}>
                  <Icon name={tab} />{labels[tab]}
                </button>
              );
            })}
          </nav>

          <section className="panel">

            {activeTab === 'profile' && (
              <>
                <h2 className="ph">Profile</h2>
                <p className="psub">Your details and the avatar shown across the platform.</p>
                <div className="photorow">
                  <div className="pav">{avatarUrl ? <img src={avatarUrl} alt="" onError={function (e) { e.target.style.display = 'none'; }} /> : initials}</div>
                  <div className="btnrow">
                    <label className="btn ghost" style={{ cursor: 'pointer' }}>Change photo<input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} /></label>
                    {avatarUrl && <button className="btn ghost" style={{ color: '#b91c1c' }} onClick={removeAvatar}>Remove</button>}
                  </div>
                </div>
                <div className="row2">
                  <div className="fld"><label className="lbl">{t('account.firstName')}</label><input className="inp" value={firstName} onChange={function (e) { setFirstName(e.target.value); }} /></div>
                  <div className="fld"><label className="lbl">{t('account.lastName')}</label><input className="inp" value={lastName} onChange={function (e) { setLastName(e.target.value); }} /></div>
                </div>
                <div className="row2">
                  <div className="fld"><label className="lbl">{t('account.username', { defaultValue: 'Username' })}</label><input className="inp ro" value={'@' + user.username} readOnly /></div>
                  <div className="fld"><label className="lbl">{t('account.email')}</label><input className="inp ro" value={user.email} readOnly /></div>
                </div>
                <div className="row2">
                  <div className="fld"><label className="lbl">{t('account.country')}</label><select className="sel" value={country} onChange={function (e) { setCountry(e.target.value); }}><option value="">{t('account.selectCountry')}</option>{COUNTRIES.map(function (c) { return <option key={c} value={c}>{c}</option>; })}</select></div>
                  <div className="fld"><label className="lbl">{t('account.sponsor')}</label><input className="inp ro" value={user.sponsor_username ? '@' + user.sponsor_username : t('account.direct')} readOnly /></div>
                </div>
                <div className="row2">
                  <div className="fld"><label className="lbl">{t('account.gender')}</label><select className="sel" value={gender} onChange={function (e) { setGender(e.target.value); }}><option value="">{t('account.preferNotToSay')}</option><option value="male">{t('account.male')}</option><option value="female">{t('account.female')}</option><option value="other">{t('account.other')}</option></select></div>
                  <div className="fld"><label className="lbl">{t('account.ageRange')}</label><select className="sel" value={ageRange} onChange={function (e) { setAgeRange(e.target.value); }}><option value="">{t('account.selectCountry')}</option><option value="18-24">18-24</option><option value="25-34">25-34</option><option value="35-44">35-44</option><option value="45-54">45-54</option><option value="55+">55+</option></select></div>
                </div>
                <div className="fld"><label className="lbl">{t('account.interests')} <span>{t('account.interestsHelp')}</span></label><input className="inp" value={interests} onChange={function (e) { setInterests(e.target.value); }} placeholder={t('account.interestsPlaceholder')} /></div>
                <button className="btn" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? t('account.saving') : t('account.saveProfile')}</button>
              </>
            )}

            {activeTab === 'billing' && (
              <>
                <h2 className="ph">Membership &amp; billing</h2>
                <p className="psub">Your monthly membership and your purchase history.</p>
                {pLoading && <div className="empty">Loading…</div>}
                {!pLoading && pdata && (function () {
                  var m = (pdata.holdings && pdata.holdings.membership) || {};
                  var hist = pdata.history || [];
                  var payLabel = user.payment_method === 'stripe' ? 'Card' : 'Crypto · BSC';
                  var renews = m.renews_at ? new Date(m.renews_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
                  return (
                    <>
                      <div className="mcard">
                        <div className="mtop">
                          <div className="mname">{(m.label || tierLabel) + ' membership'}</div>
                          <span className="badge" style={m.active ? {} : { background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }}>{m.active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="mdesc">Your monthly membership keeps your platform access and tools switched on. Campaign tiers — your advertising and Profit Grid — are purchased separately and listed below.</div>
                        <div className="mgrid">
                          <div><div className="mk">Plan</div><div className="mv">${(m.price != null ? m.price : 0).toFixed(0)} <small>/ month</small></div></div>
                          <div><div className="mk">Renews</div><div className="mv" style={{ fontSize: 15 }}>{renews}</div></div>
                          <div><div className="mk">Payment method</div><div className="mv" style={{ fontSize: 15 }}>{payLabel}</div></div>
                        </div>
                        {user.payment_method === 'stripe' && (
                          <button className="btn ghost" onClick={function () { apiPost('/api/stripe/portal', {}).then(function (r) { if (r.url) window.location.href = r.url; }).catch(function () {}); }}>Manage plan via Stripe →</button>
                        )}
                      </div>

                      <div className="sec-h">Purchase history</div>
                      <div className="sec-s">Campaign tiers, credit packs and renewals.</div>
                      {hist.length === 0 && <div className="empty">No purchases yet.</div>}
                      {hist.map(function (row, i) {
                        return (
                          <div key={i} className="hrow">
                            <div className="hdate">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</div>
                            <div><div className="hprod">{row.product}</div><div className="hdeliv">{row.delivered}</div></div>
                            <div className="hright"><div className="hamt">${(row.amount || 0).toFixed(2)}</div><span className="badge">{row.status}</span></div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
                {!pLoading && !pdata && <div className="empty">We couldn't load your billing right now. Please refresh, or contact support if this continues.</div>}
              </>
            )}

            {activeTab === 'security' && (
              <>
                <h2 className="ph">Security</h2>
                <p className="psub">Your password and two-factor authentication.</p>
                <div className="sec-h">{t('account.changePassword')}</div>
                <div className="sec-s" />
                <div className="fld"><label className="lbl">{t('account.currentPassword')}</label><input className="inp" type="password" value={currentPw} onChange={function (e) { setCurrentPw(e.target.value); }} /></div>
                <div className="row2">
                  <div className="fld"><label className="lbl">{t('account.newPassword')}</label><input className="inp" type="password" value={newPw} onChange={function (e) { setNewPw(e.target.value); }} placeholder={t('account.minChars')} /></div>
                  <div className="fld"><label className="lbl">{t('account.confirmNew')}</label><input className="inp" type="password" value={confirmPw} onChange={function (e) { setConfirmPw(e.target.value); }} /></div>
                </div>
                <button className="btn amber" onClick={changePassword} disabled={savingPw}>{savingPw ? t('account.updating') : t('account.updatePassword')}</button>

                <div style={{ height: 1, background: '#eef2f8', margin: '26px 0' }} />
                <div className="sec-h">{t('account.twoFA')}</div>
                {user.totp_enabled ? (
                  <>
                    <div className="centre"><div className="ico">🔒</div><div className="h">{t('account.twoFAActive')}</div><div className="s">{t('account.accountProtected')}</div></div>
                    <form onSubmit={function (e) { e.preventDefault(); handleDisable2FA(); }}>
                      <div className="fld"><label className="lbl">{t('account.enterCodeDisable')}</label><input className="inp" style={{ textAlign: 'center', letterSpacing: 6, fontWeight: 800, fontSize: 18 }} type="text" name="totp_code" value={disable2faCode} onChange={function (e) { setDisable2faCode(e.target.value); }} maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" required disabled={disabling2fa} /></div>
                      <button className="btn amber" type="submit" disabled={disabling2fa}>{disabling2fa ? t('account.submitting') : t('account.disable2FA')}</button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="centre"><div className="ico">🔓</div><div className="h">{t('account.notEnabled')}</div><div className="s">{t('account.requiredWithdrawals')}</div></div>
                    <Link className="btn" to="/2fa-setup" style={{ textDecoration: 'none' }}>{t('account.setup2FA')}</Link>
                  </>
                )}
              </>
            )}

            {activeTab === 'payouts' && (
              <>
                <h2 className="ph">Payout Wallets</h2>
                <p className="psub">Buyers pay your default wallet directly, member to member — there are no platform withdrawals on AdvantageLife.</p>
                <a href="/payout-methods" className="btn" style={{ textDecoration: 'none', marginBottom: 22 }}>Manage payout wallets →</a>
                <div style={{ display: 'none' }}>
                <div className="fld">
                  <label className="lbl">Withdrawal network</label>
                  <button type="button" className={'netbtn' + (walletNetwork === 'bsc' ? ' on' : '')} onClick={function () { setWalletNetwork('bsc'); }}>
                    <div className="t">BEP-20 (BNB Chain)</div>
                    <div className="d">USDT on BNB Smart Chain · Low fees</div>
                  </button>
                </div>
                <div className="fld">
                  <label className="lbl">Wallet address {walletNetwork === 'bsc' ? '(USDT on BSC)' : ''}</label>
                  <input className="inp mono" value={walletAddr} onChange={function (e) { setWalletAddr(e.target.value); }} placeholder={walletNetwork === 'bsc' ? '0x...' : 'Select BEP-20 above'} disabled={!walletNetwork} />
                </div>
                <div className="note">MetaMask · Trust Wallet · Binance — any wallet that supports USDT on BNB Chain (BEP-20). Make sure the address starts with <strong>0x</strong> and is 42 characters.</div>
                <button className="btn" onClick={saveWallet} disabled={savingWallet}>{savingWallet ? t('account.saving') : t('account.saveWallet')}</button>
                </div>
              </>
            )}

            {activeTab === 'verification' && (
              <>
                <h2 className="ph">Verification</h2>
                <p className="psub">Identity verification is required before withdrawals.</p>
                {kyc === 'approved' ? (
                  <div className="centre"><div className="ico">✅</div><div className="h">{t('account.identityVerified')}</div><div className="s">{t('account.approvedWithdrawals')}</div></div>
                ) : kyc === 'pending' ? (
                  <div className="centre"><div className="ico">⏳</div><div className="h">{t('account.underReview').replace('⏳ ', '')}</div><div className="s">{t('account.underReviewTime')}</div></div>
                ) : (
                  <>
                    {kyc === 'rejected' && <div className="note" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>{t('account.rejectedResubmit')}</div>}
                    <div className="fld"><label className="lbl">{t('account.dateOfBirth')}</label><input className="inp" type="date" value={kycDob} onChange={function (e) { setKycDob(e.target.value); }} required /></div>
                    <div className="fld"><label className="lbl">{t('account.idType')}</label><select className="sel" value={kycIdType} onChange={function (e) { setKycIdType(e.target.value); }}><option value="passport">{t('account.passport')}</option><option value="drivers_licence">{t('account.driversLicence')}</option><option value="national_id">{t('account.nationalId')}</option></select></div>
                    <div className="fld">
                      <label className="lbl">{t('account.uploadId')}</label>
                      <label className="file" style={{ border: kycFile ? '2px solid #c8102e' : '2px dashed #cbd5e1', color: kycFile ? '#8f1830' : '#64748b' }}>
                        {kycFile ? '✓ ' + kycFile.name : t('account.chooseFile')}
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={function (e) { setKycFile(e.target.files[0] || null); }} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <button className="btn" onClick={submitKyc} disabled={savingKyc}>{savingKyc ? t('account.submitting') : (kyc === 'rejected' ? t('account.resubmit') : t('account.submitVerification'))}</button>
                  </>
                )}
              </>
            )}

          </section>
        </div>
      </div>
    </AppLayout>
  );
}
