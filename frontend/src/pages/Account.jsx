import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost, apiGet } from '../utils/api';

var COUNTRIES = ['Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','India','Indonesia','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mali','Malta','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','UAE','Uganda','Ukraine','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];

var TABS = ['profile', 'security', 'payouts'];  // no subscriptions and no KYC on AdvantageLife

var CSS = `
.aset{font-family:'Inter',system-ui,sans-serif;color:#0d1230;max-width:1080px;margin:0 auto;}
.aset *{box-sizing:border-box;}
.aset .hero{position:relative;background:linear-gradient(150deg,#0a1f52,#12388f);border-radius:20px;padding:26px 30px;color:#fff;overflow:hidden;box-shadow:0 24px 60px -30px rgba(10,31,82,.7);margin-bottom:20px;}
.aset .hero:after{content:"";position:absolute;top:-40px;right:-20px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(200,16,46,.28),transparent 68%);}
.aset .hero-in{position:relative;display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
.aset .av{width:82px;height:82px;border-radius:20px;background:linear-gradient(140deg,#1a3a86,#0a1f52);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:30px;flex:0 0 auto;border:3px solid rgba(255,255,255,.9);box-shadow:0 12px 26px rgba(0,0,0,.35);overflow:hidden;cursor:pointer;}
.aset .av img{width:100%;height:100%;object-fit:cover;}
.aset .idtext{min-width:180px;}
.aset .nm{font-weight:900;font-size:26px;color:#fff;letter-spacing:-.6px;line-height:1.05;}
.aset .meta{font-family:'JetBrains Mono',monospace;font-size:13px;color:#a9bbf0;margin-top:5px;}
.aset .pills{display:flex;gap:9px;flex-wrap:wrap;margin-left:auto;}
.aset .pill{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;}
.aset .pill b{font-weight:900;}
.aset .pill.cyan{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff;}
.aset .pill.green{background:#0b7a3e;border-color:#0b7a3e;color:#fff;}
.aset .pill.amber{background:rgba(255,193,80,.16);border-color:rgba(255,193,80,.4);color:#ffd98a;}
.aset .pill.red{background:#c8102e;border-color:#c8102e;color:#fff;}
.aset .pill .dot{width:7px;height:7px;border-radius:50%;background:currentColor;}
.aset .layout{display:grid;grid-template-columns:236px 1fr;gap:20px;align-items:start;}
.aset .rail{background:#fff;border:1.5px solid #e3e8f4;border-radius:16px;box-shadow:0 10px 30px -20px rgba(10,31,82,.4);padding:10px;display:flex;flex-direction:column;gap:4px;position:sticky;top:16px;}
.aset .tab{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:12px;border:none;background:transparent;color:#3a465f;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;text-align:left;width:100%;transition:background .15s,color .15s;}
.aset .tab:hover{background:#f4f7fd;}
.aset .tab.on{background:linear-gradient(140deg,#0a1f52,#12388f);color:#fff;box-shadow:0 10px 22px -10px rgba(10,31,82,.7);}
.aset .tab svg{flex:0 0 auto;}
.aset .panel{background:#fff;border:1.5px solid #e3e8f4;border-radius:16px;box-shadow:0 10px 30px -20px rgba(10,31,82,.4);padding:28px 30px;min-height:340px;}
.aset .ph{font-weight:900;font-size:23px;color:#0d1230;letter-spacing:-.5px;margin:0 0 4px;}
.aset .ph .r{color:#c8102e;}
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
.aset .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 26px;border-radius:11px;border:none;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#c8102e,#e8203f);box-shadow:0 10px 24px rgba(200,16,46,.32);transition:box-shadow .12s;}
.aset .btn:hover{box-shadow:0 14px 30px rgba(200,16,46,.4);}
.aset .btn:disabled{opacity:.6;cursor:wait;box-shadow:none;}
.aset .btn.ghost{background:#fff;color:#12388f;border:1px solid #e4eaf3;box-shadow:0 8px 20px rgba(10,20,56,.07);}
.aset .btn.amber{background:linear-gradient(135deg,#12388f,#0a1f52);box-shadow:0 10px 24px rgba(10,31,82,.28);}
.aset .btnrow{display:flex;gap:10px;flex-wrap:wrap;}
.aset .note{padding:12px 14px;background:#f6f8fc;border:1px solid #e4eaf3;border-radius:11px;font-size:13px;color:#475569;line-height:1.6;margin-bottom:16px;}
.aset .toast{border-radius:11px;padding:11px 16px;margin:0 16px 14px;font-size:14px;font-weight:700;}
.aset .toast.ok{background:#ecfdf5;color:#047857;}
.aset .toast.err{background:#fef2f2;color:#b91c1c;}
.aset .photorow{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.aset .pav{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#12388f,#0a1f52);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Inter',sans-serif;font-weight:800;font-size:22px;overflow:hidden;flex:0 0 auto;}
.aset .pav img{width:100%;height:100%;object-fit:cover;}
.aset .centre{text-align:center;padding:26px 0;}
.aset .centre .ico{font-size:34px;margin-bottom:8px;}
.aset .centre .h{font-family:'Inter',sans-serif;font-size:16px;font-weight:800;color:#0a1438;}
.aset .centre .s{font-size:13px;color:#64748b;margin-top:3px;}
.aset .mcard{border:1px solid #e4eaf3;border-radius:14px;padding:20px;margin-bottom:20px;}
.aset .mtop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:4px;}
.aset .mname{font-family:'Inter',sans-serif;font-weight:800;font-size:17px;color:#0a1438;}
.aset .mdesc{font-size:13px;color:#64748b;line-height:1.55;margin-bottom:18px;}
.aset .mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px;}
.aset .mk{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:5px;}
.aset .mv{font-family:'Inter',sans-serif;font-weight:800;font-size:18px;color:#0a1438;}
.aset .mv small{font-size:12px;color:#64748b;font-weight:600;}
.aset .sec-h{font-family:'Inter',sans-serif;font-weight:800;font-size:16px;color:#0a1438;margin:0 0 3px;}
.aset .sec-s{font-size:13px;color:#64748b;margin:0 0 14px;}
.aset .hrow{display:grid;grid-template-columns:86px 1fr auto;gap:16px;align-items:center;padding:15px 0;border-bottom:1px solid #eef2f8;}
.aset .hrow:last-child{border-bottom:none;}
.aset .hdate{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#94a3b8;}
.aset .hprod{font-family:'Inter',sans-serif;font-weight:700;font-size:14.5px;color:#0a1438;}
.aset .hdeliv{font-size:12.5px;color:#64748b;margin-top:2px;}
.aset .hright{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
.aset .hamt{font-family:'Inter',sans-serif;font-weight:800;font-size:16px;color:#0a1438;}
.aset .badge{display:inline-block;font-size:10.5px;font-weight:700;font-family:'JetBrains Mono',monospace;padding:3px 9px;border-radius:999px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;}
.aset .empty{padding:26px;text-align:center;color:#94a3b8;font-size:14px;}
.aset .netbtn{padding:11px 13px;border-radius:11px;border:2px solid #e4eaf3;background:#fff;cursor:pointer;text-align:left;width:100%;transition:border-color .15s,background .15s;}
.aset .netbtn.on{border-color:#c8102e;background:#fdf2f4;}
.aset .netbtn .t{font-family:'Inter',sans-serif;font-size:15px;font-weight:800;color:#0a1438;}
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


  var [disable2faCode, setDisable2faCode] = useState('');
  var [disabling2fa, setDisabling2fa] = useState(false);

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


  if (!user) return null;
  var initials = (((user.first_name || '')[0] || '') + ((user.last_name || user.username || '')[0] || '')).toUpperCase();
  // Joined = paid the $100 lifetime join OR grandfathered (access_level
  // 'lifetime'), OR an admin — admins bypass the join gate (is_al_member in
  // main.py). is_active covers members activated on any live rail.
  var joined = (user.access_level === 'lifetime') || !!user.is_admin;
  var memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';

  return (
    <AppLayout categoryBack={{ to: '/dashboard', label: 'Dashboard' }} hideTopbar>
      <style>{CSS}</style>
      <div className="aset">
        {toast && <div className={'toast ' + (toast.type === 'ok' ? 'ok' : 'err')}>{toast.msg}</div>}

        <div className="hero">
          <div className="hero-in">
            <label className="av" title="Change photo">
              {avatarUrl ? <img src={avatarUrl} alt="" onError={function (e) { e.target.style.display = 'none'; }} /> : initials}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </label>
            <div className="idtext">
              <div className="nm">{(user.first_name || '') + ' ' + (user.last_name || '')}</div>
              <div className="meta">@{user.username} · {user.email}</div>
            </div>
            <div className="pills">
              {joined
                ? <span className="pill green"><span className="dot" /> {t('account.statusMember', { defaultValue: 'Member' })}</span>
                : <span className="pill red"><span className="dot" /> {t('account.statusNotJoined', { defaultValue: 'Not joined yet' })}</span>}
              <span className="pill">Member since {memberSince}</span>
            </div>
          </div>
        </div>

        <div className="layout">
          <nav className="rail">
            {TABS.map(function (tab) {
              var labels = { profile: 'Profile', security: 'Security', payouts: 'Getting paid' };
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
                <h2 className="ph">Your <span className="r">profile</span></h2>
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

            {activeTab === 'security' && (
              <>
                <h2 className="ph">Account <span className="r">security</span></h2>
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
                    <div className="centre"><div className="ico">🔓</div><div className="h">{t('account.notEnabled')}</div><div className="s">{t('account.protectsAccount', { defaultValue: 'Protects your account and your earnings' })}</div></div>
                    <Link className="btn" to="/2fa-setup" style={{ textDecoration: 'none' }}>{t('account.setup2FA')}</Link>
                  </>
                )}
              </>
            )}

            {activeTab === 'payouts' && (
              <>
                <h2 className="ph">Getting <span className="r">paid</span></h2>
                <p className="psub">Buyers pay your default receiving method directly, member to member — there are no platform withdrawals on AdvantageLife.</p>
                <a href="/payout-methods" className="btn" style={{ textDecoration: 'none', marginBottom: 22 }}>Manage receiving methods →</a>
                              </>
            )}


          </section>
        </div>
      </div>
    </AppLayout>
  );
}
