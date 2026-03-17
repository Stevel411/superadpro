import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';

export default function Account() {
  var { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [toast, setToast] = useState(null);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [country, setCountry] = useState(user?.country || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwError, setPwError] = useState('');
  const [walletAddr, setWalletAddr] = useState(user?.wallet_address || '');
  const [savingWallet, setSavingWallet] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const showToast = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleAvatarUpload = async (e) => {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
      setAvatarUrl(ev.target.result);
      try {
        await apiPost('/api/account/update', { avatar_url: ev.target.result });
        await refreshUser();
        showToast('Profile photo updated', 'ok');
      } catch(err) { showToast('Upload failed', 'err'); }
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = async () => {
    setSavingProfile(true);
    try { await apiPost('/api/account/update', { first_name: firstName, last_name: lastName, country }); await refreshUser(); showToast('Settings saved', 'ok'); }
    catch (e) { showToast(e.message, 'err'); }
    setSavingProfile(false);
  };
  const saveWallet = async (e) => {
    e.preventDefault(); setSavingWallet(true);
    try { const fd = new FormData(); fd.append('wallet_address', walletAddr); const r = await fetch('/save-wallet',{method:'POST',body:fd,credentials:'include'}); if(r.redirected||r.ok) showToast('Wallet saved','ok'); else showToast('Failed','err'); }
    catch(e) { showToast(e.message,'err'); }
    setSavingWallet(false);
  };

  if (!user) return null;
  const memberId = user.is_admin ? 'SAP-00001' : (user.member_id || `SAP-${String(user.id||0).padStart(5,'0')}`);
  const initials = ((user.first_name||'')[0]||'')+((user.last_name||user.username||'')[0]||'');
  const kyc = user.kyc_status || 'none';

  return (
    <AppLayout title={t("account.title")} subtitle="Manage your account, security, and wallet">
      {toast && <div style={{borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:12,fontWeight:600,...(toast.type==='ok'?{background:'#dcfce7',border:'1px solid rgba(22,163,74,.2)',color:'#16a34a'}:{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626'})}}>{toast.msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,alignItems:'stretch'}}>

          {/* Profile */}
          <C title="Profile">
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10,paddingBottom:10,borderBottom:'1px solid #f1f3f7'}}>
              <label style={{cursor:'pointer',position:'relative',flexShrink:0}}>
                <div style={{width:52,height:52,borderRadius:12,background:'linear-gradient(135deg,#0284c7,#0ea5e9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',overflow:'hidden'}}>
                  {avatarUrl ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/> : initials.toUpperCase()}
                </div>
                <div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,borderRadius:'50%',background:'#0ea5e9',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:10,color:'#fff',fontWeight:800}}>+</span>
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}}/>
              </label>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{user.first_name||''} {user.last_name||''}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>@{user.username}</div>
                <span style={{display:'inline-flex',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,marginTop:3,...(user.is_active?{background:'#dcfce7',color:'#16a34a'}:{background:'#fef3c7',color:'#d97706'})}}>{user.is_active?'● Active':'○ Inactive'}</span>
              </div>
            </div>
            <IR k="Member ID" v={memberId} mono/><IR k="Email" v={user.email}/><IR k="Country" v={user.country||'—'}/><IR k="Sponsor" v={user.sponsor_id?`#${user.sponsor_id}`:'Direct'}/><IR k="Joined" v={user.created_at?new Date(user.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'} last/>
          </C>

          {/* Edit Profile */}
          <C title="Edit Profile">
            <FG><L>First Name</L><I value={firstName} onChange={e=>setFirstName(e.target.value)}/></FG>
            <FG><L>Last Name</L><I value={lastName} onChange={e=>setLastName(e.target.value)}/></FG>
            <FG><L>Country</L><select style={iS} value={country} onChange={e=>setCountry(e.target.value)}><option value="">Select...</option>{COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}</select></FG>
            <button onClick={saveProfile} disabled={savingProfile} style={btn}>{savingProfile?'Saving...':'Save Profile'}</button>
          </C>

          {/* Password */}
          <C title="Change Password">
            <form method="POST" action="/account/change-password" onSubmit={e=>{const n=e.target.new_password.value,c=e.target.confirm_password.value;if(n!==c){e.preventDefault();setPwError('Passwords do not match.');}else setPwError('');}}>
              <FG><L>Current Password</L><I type="password" name="current_password" placeholder="Current password" autoComplete="current-password"/></FG>
              <FG><L>New Password</L><I type="password" name="new_password" placeholder="Min. 8 characters" minLength="8" autoComplete="new-password"/></FG>
              <FG><L>Confirm New</L><I type="password" name="confirm_password" placeholder="Repeat password" autoComplete="new-password"/></FG>
              {pwError&&<div style={{fontSize:10,color:'#dc2626',padding:'6px 10px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,marginBottom:8}}>{pwError}</div>}
              <button type="submit" style={{...btn,background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>Update Password</button>
            </form>
          </C>

          {/* KYC */}
          <C title="Identity Verification (KYC)" chip={
            kyc==='none'?{t:'⬜ Not Started',c:'none'}:kyc==='pending'?{t:'⏳ Under Review',c:'pending'}:kyc==='approved'?{t:'✅ Verified',c:'approved'}:{t:'❌ Rejected',c:'rejected'}
          }>
            {kyc==='approved'?<SC icon="✅" title="Identity Verified" desc="You're approved for withdrawals." tc="#16a34a"/>
            :kyc==='pending'?<SC icon="⏳" title="Under Review" desc="Usually takes 24–48 hours." tc="#d97706"/>
            :<>
              {kyc==='rejected'&&<div style={{padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,marginBottom:10,fontSize:11,color:'#dc2626',fontWeight:600}}>⚠ Rejected. Please resubmit.</div>}
              {kyc!=='rejected'&&<p style={{fontSize:12,color:'#64748b',marginBottom:10,lineHeight:1.5}}>Verify your identity to enable withdrawals.</p>}
              <form method="POST" action="/account/kyc-submit" encType="multipart/form-data" style={{display:'flex',flexDirection:'column',flex:1}}>
                <FG><L>Date of Birth</L><I type="date" name="kyc_dob"/></FG>
                <FG><L>ID Type</L><select name="kyc_id_type" style={iS}><option value="passport">Passport</option><option value="drivers_licence">Driver's Licence</option><option value="national_id">National ID</option></select></FG>
                <FG><L>Upload ID (JPG/PNG/PDF)</L><input type="file" name="kyc_id_file" accept=".jpg,.jpeg,.png,.pdf" required style={{width:'100%',padding:8,border:'2px dashed #e5e7eb',borderRadius:8,fontSize:11,color:'#94a3b8',background:'#f8f9fb',cursor:'pointer',boxSizing:'border-box'}}/></FG>
                <button type="submit" style={{...btn,marginTop:'auto'}}>{kyc==='rejected'?'Resubmit':'Submit Verification'}</button>
              </form>
            </>}
          </C>

          {/* 2FA */}
          <C title="Two-Factor Auth" chip={user.totp_enabled?{t:'🔒 Enabled',c:'enabled'}:{t:'⬜ Disabled',c:'disabled'}}>
            {user.totp_enabled?<>
              <SC icon="🔒" title="2FA Active" desc="Your account is protected." tc="#16a34a"/>
              <form method="POST" action="/account/2fa-disable" style={{marginTop:'auto'}}>
                <FG><L>Enter 2FA code to disable</L><I type="text" name="totp_code" maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" style={{...iS,textAlign:'center',letterSpacing:6,fontWeight:700}}/></FG>
                <button type="submit" style={{...btn,background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>Disable 2FA</button>
              </form>
            </>:<>
              <SC icon="🔓" title="Not Enabled" desc="Required before withdrawals." tc="#94a3b8"/>
              <div style={{marginTop:'auto'}}><a href="/account/2fa-setup" style={{...btn,display:'block',textAlign:'center',textDecoration:'none'}}>Setup 2FA →</a></div>
            </>}
          </C>

          {/* Wallet */}
          <C title="Withdrawal Wallet">
            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
              <FG><L>Wallet Address (USDC on Base)</L><I value={walletAddr} onChange={e=>setWalletAddr(e.target.value)} placeholder="0x..." style={{...iS,fontFamily:'monospace',fontSize:11}}/></FG>
              <div style={{padding:'8px 10px',background:'#f8f9fb',border:'1px solid rgba(14,165,233,.1)',borderRadius:6,marginBottom:10,fontSize:10,color:'#64748b',lineHeight:1.5}}>
                Coinbase · MetaMask · Trust Wallet · Rainbow — any USDC on Base wallet.
              </div>
              <button onClick={saveWallet} disabled={savingWallet} style={{...btn,marginTop:'auto'}}>{savingWallet?'Saving...':'Save Wallet'}</button>
            </div>
          </C>
      </div>
    </AppLayout>
  );
}

// Compact card
function C({title,chip,children}){
  const cc={none:{bg:'#f8f9fb',c:'#94a3b8',b:'#e5e7eb'},pending:{bg:'rgba(217,119,6,.15)',c:'#fbbf24',b:'rgba(217,119,6,.3)'},approved:{bg:'rgba(22,163,74,.15)',c:'#4ade80',b:'rgba(22,163,74,.3)'},rejected:{bg:'rgba(220,38,38,.15)',c:'#f87171',b:'rgba(220,38,38,.3)'},enabled:{bg:'rgba(22,163,74,.15)',c:'#4ade80',b:'rgba(22,163,74,.3)'},disabled:{bg:'rgba(255,255,255,.1)',c:'rgba(255,255,255,.5)',b:'rgba(255,255,255,.15)'}};
  const ch=chip?cc[chip.c]||cc.none:null;
  return <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#1c223d'}}>
      <div style={{fontSize:13,fontWeight:800,color:'#fff',display:'flex',alignItems:'center',gap:6}}><div style={{width:5,height:5,borderRadius:'50%',background:'#0ea5e9',flexShrink:0}}/>{title}</div>
      {chip&&<span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,background:ch.bg,color:ch.c,border:`1px solid ${ch.b}`}}>{chip.t}</span>}
    </div>
    <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column'}}>{children}</div>
  </div>;
}
function IR({k,v,mono,last}){return<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:last?'none':'1px solid #f5f6f8'}}><span style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5}}>{k}</span><span style={{fontSize:12,fontWeight:600,color:mono?'#0ea5e9':'#0f172a',...(mono?{fontFamily:'monospace'}:{})}}>{v}</span></div>}
function SC({icon,title,desc,tc}){return<div style={{textAlign:'center',padding:'12px 0'}}><div style={{fontSize:28,marginBottom:4}}>{icon}</div><div style={{fontSize:13,fontWeight:700,marginBottom:2,color:tc}}>{title}</div><div style={{fontSize:11,color:'#94a3b8',lineHeight:1.5}}>{desc}</div></div>}
function FG({children}){return<div style={{marginBottom:10}}>{children}</div>}
function L({children}){return<label style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:4,display:'block'}}>{children}</label>}
function I(props){return<input {...props} style={{width:'100%',padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#0f172a',fontFamily:'inherit',background:'#f8f9fb',boxSizing:'border-box',...(props.style||{})}} required/>}
const iS={width:'100%',padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#0f172a',fontFamily:'inherit',background:'#f8f9fb',boxSizing:'border-box'};
const btn={padding:'10px 28px',borderRadius:8,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',display:'block',margin:'0 auto',background:'#0ea5e9',color:'#fff'};
const COUNTRIES=['Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','India','Indonesia','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mali','Malta','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','UAE','Uganda','Ukraine','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];
