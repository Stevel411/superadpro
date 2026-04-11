import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';

var COUNTRIES = ['Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','India','Indonesia','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mali','Malta','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','UAE','Uganda','Ukraine','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];

export default function Account() {
  var { t } = useTranslation();
  var { user, refreshUser } = useAuth();
  var [toast, setToast] = useState(null);

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
  var [savingWallet, setSavingWallet] = useState(false);

  var [kycDob, setKycDob] = useState('');
  var [kycIdType, setKycIdType] = useState('passport');
  var [kycFile, setKycFile] = useState(null);
  var [savingKyc, setSavingKyc] = useState(false);

  function showToast(msg, type) { setToast({msg, type}); setTimeout(function(){setToast(null);}, 4000); }

  function handleAvatarUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      setAvatarUrl(ev.target.result);
      apiPost('/api/account/update', {avatar_url: ev.target.result}).then(function() {
        refreshUser(); showToast(t('account.photoUpdated'), 'ok');
      }).catch(function(err) { showToast(err.message || t('account.uploadFailed'), 'err'); });
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    apiPost('/api/account/update', {avatar_url: ''}).then(function() {
      setAvatarUrl(''); refreshUser(); showToast(t('account.photoRemoved'), 'ok');
    }).catch(function(err) { showToast(err.message || 'Failed', 'err'); });
  }

  function saveProfile() {
    setSavingProfile(true);
    apiPost('/api/account/update', {first_name: firstName, last_name: lastName, country: country, interests: interests, gender: gender, age_range: ageRange}).then(function() {
      refreshUser(); showToast(t('account.profileSaved'), 'ok'); setSavingProfile(false);
    }).catch(function(e) { showToast(e.message || t('account.failed'), 'err'); setSavingProfile(false); });
  }

  function changePassword() {
    if (newPw !== confirmPw) { showToast(t('account.passwordsNoMatch'), 'err'); return; }
    if (newPw.length < 8) { showToast(t('account.min8Chars'), 'err'); return; }
    setSavingPw(true);
    apiPost('/api/account/change-password', {current_password: currentPw, new_password: newPw, confirm_password: confirmPw}).then(function() {
      showToast(t('account.passwordUpdated'), 'ok'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setSavingPw(false);
    }).catch(function(e) { showToast(e.message || t('account.failed'), 'err'); setSavingPw(false); });
  }

  function saveWallet() {
    setSavingWallet(true);
    apiPost('/api/account/update', {wallet_address: walletAddr}).then(function() {
      refreshUser(); showToast(t('account.walletSaved'), 'ok'); setSavingWallet(false);
    }).catch(function(e) { showToast(e.message || t('account.failed'), 'err'); setSavingWallet(false); });
  }

  function submitKyc() {
    if (!kycDob) { showToast(t('account.dobRequired'), 'err'); return; }
    if (!kycFile) { showToast(t('account.idRequired'), 'err'); return; }
    setSavingKyc(true);
    var fd = new FormData();
    fd.append('kyc_dob', kycDob);
    fd.append('kyc_id_type', kycIdType);
    fd.append('kyc_id_file', kycFile);
    fetch('/account/kyc-submit', {method:'POST', body:fd, credentials:'include'})
      .then(function(r) {
        setSavingKyc(false);
        if (r.ok || r.redirected) { refreshUser(); showToast(t('account.verificationSubmitted'), 'ok'); setKycDob(''); setKycFile(null); }
        else { showToast(t('account.submissionFailed'), 'err'); }
      }).catch(function() { setSavingKyc(false); showToast(t('account.submissionFailed'), 'err'); });
  }

  if (!user) return null;
  var memberId = user.is_admin ? 'SAP-00001' : (user.member_id || ('SAP-' + String(user.id||0).padStart(5,'0')));
  var initials = ((user.first_name||'')[0]||'')+((user.last_name||user.username||'')[0]||'');
  var kyc = user.kyc_status || 'none';

  var iS = {width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:13,color:'#0f172a',fontFamily:'inherit',background:'#fff',boxSizing:'border-box',outline:'none',transition:'border .2s'};
  function foc(e){e.target.style.borderColor='#0ea5e9';} function blu(e){e.target.style.borderColor='#e8ecf2';}
  var btnS = {padding:'10px 28px',borderRadius:10,fontSize:12,fontWeight:800,border:'none',cursor:'pointer',fontFamily:'inherit',display:'block',margin:'0 auto',color:'#fff'};

  return (
    <AppLayout title={t("account.title")} subtitle={t("account.subtitle")}>
      {toast && <div style={{borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:13,fontWeight:700,...(toast.type==='ok'?{background:'#dcfce7',color:'#16a34a'}:{background:'#fef2f2',color:'#dc2626'})}}>{toast.msg}</div>}

      <div className="grid-3-col" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,alignItems:'stretch'}}>

        <Card title={t("account.profile")}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,paddingBottom:14,borderBottom:'1px solid #f1f3f7'}}>
            <div style={{position:'relative',flexShrink:0}}>
              <label style={{cursor:'pointer',position:'relative',display:'block'}}>
              <div style={{width:56,height:56,borderRadius:14,background:'linear-gradient(135deg,#0284c7,#0ea5e9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#fff',overflow:'hidden'}}>
                {avatarUrl ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/> : initials.toUpperCase()}
              </div>
              <div style={{position:'absolute',bottom:-2,right:-2,width:20,height:20,borderRadius:'50%',background:'#0ea5e9',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:11,color:'#fff',fontWeight:800}}>+</span></div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}}/>
              </label>
              {avatarUrl && <button onClick={removeAvatar} title="Remove photo" style={{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',background:'#ef4444',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:10,color:'#fff',fontWeight:800,lineHeight:1,padding:0,zIndex:2}}>✕</button>}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{user.first_name||''} {user.last_name||''}</div>
              <div style={{fontSize:11,color:'#64748b'}}>@{user.username}</div>
              <span style={{display:'inline-block',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,marginTop:3,...(user.is_active?{background:'#dcfce7',color:'#16a34a'}:{background:'#fef3c7',color:'#d97706'})}}>{user.is_active?t('account.activeStatus'):t('account.inactiveStatus')}</span>
            </div>
          </div>
          <Row k={t("account.memberId")} v={memberId} mono/><Row k={t("account.email")} v={user.email}/><Row k={t("account.tier")} v={(user.membership_tier||'basic').toUpperCase()}/><Row k={t("account.country")} v={user.country||'—'}/><Row k={t("account.sponsor")} v={user.sponsor_username?'@'+user.sponsor_username:t('account.direct')}/><Row k={t("account.joined")} v={user.created_at?new Date(user.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'} last/>
        </Card>

        <Card title={t("account.editProfile")}>
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.firstName")}</label><input value={firstName} onChange={function(e){setFirstName(e.target.value);}} style={iS} onFocus={foc} onBlur={blu}/></div>
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.lastName")}</label><input value={lastName} onChange={function(e){setLastName(e.target.value);}} style={iS} onFocus={foc} onBlur={blu}/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.country")}</label><select value={country} onChange={function(e){setCountry(e.target.value);}} style={iS}><option value="">{t("account.selectCountry")}</option>{COUNTRIES.map(function(c){return <option key={c} value={c}>{c}</option>;})}</select></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            <div><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.gender")}</label><select value={gender} onChange={function(e){setGender(e.target.value);}} style={iS}><option value="">{t("account.preferNotToSay")}</option><option value="male">{t("account.male")}</option><option value="female">{t("account.female")}</option><option value="other">{t("account.other")}</option></select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.ageRange")}</label><select value={ageRange} onChange={function(e){setAgeRange(e.target.value);}} style={iS}><option value="">{t("account.selectCountry")}</option><option value="18-24">18-24</option><option value="25-34">25-34</option><option value="35-44">35-44</option><option value="45-54">45-54</option><option value="55+">55+</option></select></div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.interests")} <span style={{fontWeight:400,textTransform:'none'}}>{t("account.interestsHelp")}</span></label>
            <input value={interests} onChange={function(e){setInterests(e.target.value);}} placeholder={t("account.interestsPlaceholder")} style={iS} onFocus={foc} onBlur={blu}/>
            <div style={{fontSize:10,color:'#64748b',marginTop:4}}>{t("account.interestsNote")}</div>
          </div>
          <button onClick={saveProfile} disabled={savingProfile} style={Object.assign({},btnS,{background:'#0ea5e9'})}>{savingProfile?t('account.saving'):t('account.saveProfile')}</button>
        </Card>

        <Card title={t("account.changePassword")}>
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.currentPassword")}</label><input type="password" value={currentPw} onChange={function(e){setCurrentPw(e.target.value);}} placeholder={t("account.currentPassword")} style={iS} onFocus={foc} onBlur={blu}/></div>
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.newPassword")}</label><input type="password" value={newPw} onChange={function(e){setNewPw(e.target.value);}} placeholder={t("account.minChars")} style={iS} onFocus={foc} onBlur={blu}/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.confirmNew")}</label><input type="password" value={confirmPw} onChange={function(e){setConfirmPw(e.target.value);}} placeholder={t("account.repeatPassword")} style={iS} onFocus={foc} onBlur={blu}/></div>
          <button onClick={changePassword} disabled={savingPw} style={Object.assign({},btnS,{background:'linear-gradient(135deg,#f59e0b,#ef4444)'})}>{savingPw?t('account.updating'):t('account.updatePassword')}</button>
        </Card>

        <Card title={t("account.kyc")} chip={kyc==='approved'?{t:t('account.verified'),c:'#16a34a'}:kyc==='pending'?{t:t('account.underReview'),c:'#f59e0b'}:kyc==='rejected'?{t:t('account.rejected'),c:'#dc2626'}:{t:t('account.notStarted'),c:'#64748b'}}>
          {kyc==='approved'?<div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:32,marginBottom:6}}>✅</div><div style={{fontSize:14,fontWeight:700,color:'#16a34a'}}>{t("account.identityVerified")}</div><div style={{fontSize:11,color:'#64748b'}}>{t("account.approvedWithdrawals")}</div></div>
          :kyc==='pending'?<div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:32,marginBottom:6}}>⏳</div><div style={{fontSize:14,fontWeight:700,color:'#f59e0b'}}>{t("account.underReview").replace("⏳ ","")}</div><div style={{fontSize:11,color:'#64748b'}}>{t("account.underReviewTime")}</div></div>
          :<>
            {kyc==='rejected'&&<div style={{padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,marginBottom:10,fontSize:11,color:'#dc2626',fontWeight:600}}>{t("account.rejectedResubmit")}</div>}
            <div>
              <div style={{marginBottom:10}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.dateOfBirth")}</label><input type="date" value={kycDob} onChange={function(e){setKycDob(e.target.value);}} required style={iS} onFocus={foc} onBlur={blu}/></div>
              <div style={{marginBottom:10}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.idType")}</label><select value={kycIdType} onChange={function(e){setKycIdType(e.target.value);}} style={iS}><option value="passport">{t("account.passport")}</option><option value="drivers_licence">{t("account.driversLicence")}</option><option value="national_id">{t("account.nationalId")}</option></select></div>
              <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.uploadId")}</label>
                <label style={{display:'block',width:'100%',padding:10,border:kycFile?'2px solid #0ea5e9':'2px dashed #d1d5db',borderRadius:10,fontSize:11,color:kycFile?'#0ea5e9':'#64748b',background:'#fafbfc',cursor:'pointer',boxSizing:'border-box',textAlign:'center'}}>
                  {kycFile ? '✓ '+kycFile.name : t('account.chooseFile')}
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={function(e){setKycFile(e.target.files[0]||null);}} style={{display:'none'}}/>
                </label>
              </div>
              <button onClick={submitKyc} disabled={savingKyc} style={Object.assign({},btnS,{background:'#0ea5e9'})}>{savingKyc?t('account.submitting'):(kyc==='rejected'?t('account.resubmit'):t('account.submitVerification'))}</button>
            </div>
          </>}
        </Card>

        <Card title={t("account.twoFA")} chip={user.totp_enabled?{t:t('account.twoFAEnabled'),c:'#16a34a'}:{t:t('account.twoFADisabled'),c:'#64748b'}}>
          {user.totp_enabled?<>
            <div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:32,marginBottom:6}}>🔒</div><div style={{fontSize:14,fontWeight:700,color:'#16a34a'}}>{t("account.twoFAActive")}</div><div style={{fontSize:11,color:'#64748b'}}>{t("account.accountProtected")}</div></div>
            <form method="POST" action="/account/2fa-disable" style={{marginTop:'auto'}}>
              <div style={{marginBottom:10}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.enterCodeDisable")}</label><input type="text" name="totp_code" maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" required style={Object.assign({},iS,{textAlign:'center',letterSpacing:6,fontWeight:800,fontSize:18})}/></div>
              <button type="submit" style={Object.assign({},btnS,{background:'linear-gradient(135deg,#f59e0b,#ef4444)'})}>{t("account.disable2FA")}</button>
            </form>
          </>:<>
            <div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:32,marginBottom:6}}>🔓</div><div style={{fontSize:14,fontWeight:700,color:'#64748b'}}>{t("account.notEnabled")}</div><div style={{fontSize:11,color:'#64748b'}}>{t("account.requiredWithdrawals")}</div></div>
            <a href="/account/2fa-setup" style={Object.assign({},btnS,{display:'block',textAlign:'center',textDecoration:'none',background:'#0ea5e9',marginTop:'auto'})}>{t("account.setup2FA")}</a>
          </>}
        </Card>

        <Card title={t("account.withdrawalWallet")}>
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4}}>{t("account.walletAddressLabel")}</label><input value={walletAddr} onChange={function(e){setWalletAddr(e.target.value);}} placeholder="0x..." style={Object.assign({},iS,{fontFamily:'monospace',fontSize:11})} onFocus={foc} onBlur={blu}/></div>
          <div style={{padding:'10px 12px',background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:8,marginBottom:12,fontSize:10,color:'#64748b',lineHeight:1.6}}>{t("account.walletSupported")}</div>
          <button onClick={saveWallet} disabled={savingWallet} style={Object.assign({},btnS,{background:'#0ea5e9',marginTop:'auto'})}>{savingWallet?t('account.saving'):t('account.saveWallet')}</button>
        </Card>
      </div>
    </AppLayout>
  );
}

function Card({title, chip, children}) {
  return (
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 2px 8px rgba(0,0,0,.03)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#172554'}}>
        <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{title}</div>
        {chip&&<span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,background:chip.c+'20',color:chip.c}}>{chip.t}</span>}
      </div>
      <div style={{padding:'16px',flex:1,display:'flex',flexDirection:'column'}}>{children}</div>
    </div>
  );
}

function Row({k, v, mono, last}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:last?'none':'1px solid #f5f6f8'}}>
      <span style={{fontSize:11,fontWeight:700,color:'#64748b'}}>{k}</span>
      <span style={{fontSize:12,fontWeight:600,color:mono?'#0ea5e9':'#0f172a',...(mono?{fontFamily:'monospace'}:{})}}>{v}</span>
    </div>
  );
}
