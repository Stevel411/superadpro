import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

var cyan = '#38bdf8';
var dark = '#050d1a';

var CSS = `
@keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
@keyframes hpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes hpGlow { 0%,100%{opacity:.4;transform:translateX(-50%) scale(1)} 50%{opacity:1;transform:translateX(-50%) scale(1.2)} }
@keyframes missionPulse { 0%{width:50px;height:50px;opacity:.4;margin:-25px 0 0 -25px} 100%{width:280px;height:280px;opacity:0;margin:-140px 0 0 -140px} }
@keyframes missionDrift { 0%{opacity:0;transform:scale(.5)} 20%{opacity:.7;transform:scale(1)} 80%{opacity:.3} 100%{opacity:0;transform:scale(.5) translate(20px,-15px)} }
@keyframes missionFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
.hp-fade1{opacity:0;animation:fadeUp .8s ease forwards .1s}
.hp-fade2{opacity:0;animation:fadeUp .8s ease forwards .2s}
.hp-fade3{opacity:0;animation:fadeUp .8s ease forwards .3s}
.hp-fade4{opacity:0;animation:fadeUp .8s ease forwards .4s}
.hp-fade6{opacity:0;animation:fadeUp .8s ease forwards 1s}
.hp-card{transition:transform .3s}.hp-card:hover{transform:translateY(-4px)}
.hp-btn-p{font-weight:700;font-size:16px;color:#050d1a;background:#38bdf8;padding:13px 34px;border-radius:8px;text-decoration:none;box-shadow:0 0 32px rgba(0,212,255,.4);transition:all .3s;cursor:pointer;border:none;font-family:inherit;display:inline-block}
.hp-btn-p:hover{background:#00e5ff;transform:translateY(-2px)}
.hp-btn-o{font-weight:600;font-size:16px;color:#fff;background:rgba(255,255,255,.06);padding:12px 34px;border-radius:8px;border:1px solid rgba(255,255,255,.2);text-decoration:none;transition:all .3s;cursor:pointer;font-family:inherit;display:inline-block}
.hp-btn-o:hover{border-color:#38bdf8;color:#38bdf8}
@media(max-width:900px){
  .hp-nav-links{display:none!important}.hp-hamburger{display:block!important}
  .hp-hero-btns{flex-direction:column;align-items:center}
  .hp-three{grid-template-columns:1fr 1fr!important}
  .hp-two{grid-template-columns:1fr!important}
  footer.hp-foot{flex-direction:column;gap:12px;text-align:center}
}
@media(max-width:600px){.hp-three,.hp-stats{flex-wrap:wrap}.hp-pkgs{grid-template-columns:1fr 1fr!important}}
`;

var JOINERS = [
  {name:'James O.',country:'Nigeria'},{name:'Sarah K.',country:'United Kingdom'},
  {name:'Maria L.',country:'Philippines'},{name:'Ahmed R.',country:'UAE'},
  {name:'Chen W.',country:'Singapore'},{name:'Priya S.',country:'India'},
  {name:'Carlos M.',country:'Brazil'},{name:'Anna P.',country:'Germany'},
];
var FLAGS = {Nigeria:'🇳🇬','United Kingdom':'🇬🇧',Philippines:'🇵🇭',UAE:'🇦🇪',Singapore:'🇸🇬',India:'🇮🇳',Brazil:'🇧🇷',Germany:'🇩🇪'};

function SocialToast() {
  var [visible, setVisible] = useState(false);
  var [joiner, setJoiner] = useState(null);
  var idx = useRef(0);
  var list = useRef([...JOINERS].sort(function(){return Math.random()-.5;}));
  useEffect(function(){
    function show(){
      var j = list.current[idx.current % list.current.length]; idx.current++;
      setJoiner(j); setVisible(true);
      setTimeout(function(){setVisible(false);}, 5000);
    }
    var t1 = setTimeout(show, 8000);
    var iv = setInterval(show, 25000);
    return function(){clearTimeout(t1);clearInterval(iv);};
  },[]);
  if (!joiner) return null;
  return (
    <div style={{position:'fixed',top:90,right:24,zIndex:9999,background:'rgba(10,10,26,.97)',border:'1px solid rgba(0,180,216,.25)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 32px rgba(0,0,0,.4)',minWidth:260,maxWidth:320,transform:visible?'translateX(0)':'translateX(120%)',transition:'transform .4s cubic-bezier(.34,1.56,.64,1)',pointerEvents:'none'}}>
      <div style={{fontSize:26,flexShrink:0}}>{FLAGS[joiner.country]||'🌍'}</div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2}}>{joiner.name} from {joiner.country}</div>
        <div style={{fontSize:12,color:'rgba(200,220,255,.6)'}}>✅ Just joined SuperAdPro</div>
      </div>
      <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',flexShrink:0,marginLeft:'auto'}}/>
    </div>
  );
}

var iS = {width:'100%',padding:'10px 13px',border:'1.5px solid rgba(0,212,255,.14)',borderRadius:8,background:'rgba(0,212,255,.04)',color:'#f1f5f9',fontSize:15,fontFamily:'inherit',boxSizing:'border-box',outline:'none'};
var lS = {display:'block',fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(148,163,184,.7)',marginBottom:6};

function Modal({open, onClose, children}){
  useEffect(function(){
    function k(e){if(e.key==='Escape')onClose();}
    if(open){document.addEventListener('keydown',k);document.body.style.overflow='hidden';}
    return function(){document.removeEventListener('keydown',k);document.body.style.overflow='';};
  },[open,onClose]);
  if(!open) return null;
  return (
    <div onClick={function(e){if(e.target===e.currentTarget)onClose();}} style={{position:'fixed',inset:0,background:'rgba(2,6,18,.88)',backdropFilter:'blur(8px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#111827',border:'1px solid rgba(0,212,255,.18)',borderRadius:16,padding:'36px 40px',width:'100%',maxWidth:460,position:'relative',boxShadow:'0 32px 80px rgba(0,0,0,.7)'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:16,background:'none',border:'none',color:'rgba(148,163,184,.6)',fontSize:20,cursor:'pointer',padding:'4px 8px',lineHeight:1}}>✕</button>
        {children}
      </div>
    </div>
  );
}

function LoginModal({open,onClose,onSwitchToReg}){
  var [form,setForm] = useState({username:'',password:''});
  var [err,setErr] = useState('');
  var [loading,setLoading] = useState(false);
  function set(k){return function(e){setForm(function(f){return Object.assign({},f,{[k]:e.target.value});});};}
  async function submit(e){
    e.preventDefault(); setLoading(true); setErr('');
    try{
      var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      var d=await r.json();
      if(d.success){window.location.href=d.redirect||'/dashboard';return;}
      setErr(d.error||'Login failed.');
    }catch(ex){setErr('Network error.');}
    setLoading(false);
  }
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Log In</div>
      <div style={{fontSize:14,color:'rgba(148,163,184,.8)',marginBottom:22}}>Welcome back — enter your details below</div>
      {err&&<div style={{padding:'10px 14px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,fontSize:14,color:'#f87171',marginBottom:14}}>{err}</div>}
      <form onSubmit={submit}>
        <div style={{marginBottom:14}}><label style={lS}>Username or Email</label><input style={iS} value={form.username} onChange={set('username')} placeholder="username or email" required autoComplete="username"/></div>
        <div style={{marginBottom:6}}><label style={lS}>Password</label><input style={iS} type="password" value={form.password} onChange={set('password')} placeholder="Your password" required autoComplete="current-password"/></div>
        <div style={{textAlign:'right',marginBottom:18}}><a href="/forgot-password" style={{fontSize:13,color:'rgba(0,212,255,.7)',textDecoration:'none'}}>Forgot password?</a></div>
        <button type="submit" disabled={loading} style={{width:'100%',padding:12,background:loading?'rgba(14,165,233,.4)':'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:9,color:'#fff',fontSize:16,fontWeight:800,fontFamily:'inherit',cursor:loading?'default':'pointer'}}>
          {loading?'Logging in...':'Log In →'}
        </button>
      </form>
      <div style={{textAlign:'center',marginTop:14,fontSize:13,color:'rgba(148,163,184,.5)'}}>No account? <button onClick={function(){onClose();onSwitchToReg('');}} style={{background:'none',border:'none',color:'rgba(0,212,255,.8)',cursor:'pointer',fontWeight:600,fontSize:13,padding:0}}>Register here →</button></div>
    </Modal>
  );
}

function RegisterModal({open,onClose,onSwitchToLogin,sponsor}){
  var [form,setForm]=useState({first_name:'',email:'',username:'',password:'',confirm_password:'',ref:sponsor||''});
  var [err,setErr]=useState('');
  var [loading,setLoading]=useState(false);
  var [terms,setTerms]=useState(false);
  useEffect(function(){setForm(function(f){return Object.assign({},f,{ref:sponsor||''}); });},[sponsor]);
  function set(k){return function(e){setForm(function(f){return Object.assign({},f,{[k]:e.target.value});});};}
  async function submit(e){
    e.preventDefault();
    if(form.password!==form.confirm_password){setErr('Passwords do not match.');return;}
    if(!terms){setErr('Please agree to the Terms of Service.');return;}
    setLoading(true);setErr('');
    try{
      var r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      var d=await r.json();
      if(d.success){window.location.href=d.redirect||'/dashboard?new=1';return;}
      setErr(d.error||'Something went wrong.');
    }catch(ex){setErr('Network error.');}
    setLoading(false);
  }
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Create Your Free Account</div>
      <div style={{fontSize:13,color:'rgba(148,163,184,.8)',marginBottom:22}}>Takes 60 seconds · No credit card required</div>
      {err&&<div style={{padding:'10px 14px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,fontSize:14,color:'#f87171',marginBottom:14}}>{err}</div>}
      <form onSubmit={submit}>
        <div style={{marginBottom:14}}><label style={lS}>First Name</label><input style={iS} value={form.first_name} onChange={set('first_name')} placeholder="John" required/></div>
        <div style={{marginBottom:14}}><label style={lS}>Email Address</label><input style={iS} type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" required/></div>
        <div style={{marginBottom:14}}><label style={lS}>Username</label><input style={iS} value={form.username} onChange={set('username')} placeholder="johnsmith99" required pattern="[a-zA-Z0-9_]{3,30}"/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div><label style={lS}>Password</label><input style={iS} type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 chars" required minLength={8}/></div>
          <div><label style={lS}>Confirm</label><input style={iS} type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="Repeat" required/></div>
        </div>
        {sponsor&&<div style={{marginBottom:14}}><label style={lS}>Referred by</label><input style={{...iS,opacity:.55,cursor:'default'}} value={sponsor} readOnly/></div>}
        <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:18,fontSize:13,color:'rgba(148,163,184,.6)',lineHeight:1.5}}>
          <input type="checkbox" checked={terms} onChange={function(e){setTerms(e.target.checked);}} style={{width:14,height:14,flexShrink:0,marginTop:1,accentColor:'#38bdf8',cursor:'pointer'}}/>
          <div>I agree to the <a href="/legal" target="_blank" style={{color:'rgba(0,212,255,.8)',textDecoration:'none'}}>Terms of Service</a> and <a href="/legal" target="_blank" style={{color:'rgba(0,212,255,.8)',textDecoration:'none'}}>Privacy Policy</a>.</div>
        </div>
        <button type="submit" disabled={loading} style={{width:'100%',padding:12,background:loading?'rgba(14,165,233,.4)':'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:9,color:'#fff',fontSize:16,fontWeight:800,fontFamily:'inherit',cursor:loading?'default':'pointer'}}>
          {loading?'Creating account...':'Get started →'}
        </button>
      </form>
      <div style={{textAlign:'center',marginTop:14,fontSize:13,color:'rgba(148,163,184,.5)'}}>Have an account? <button onClick={function(){onClose();onSwitchToLogin();}} style={{background:'none',border:'none',color:'rgba(0,212,255,.8)',cursor:'pointer',fontWeight:600,fontSize:13,padding:0}}>Log in →</button></div>
    </Modal>
  );
}

export default function HomePage(){
  var [loginOpen,setLoginOpen]=useState(false);
  var [regOpen,setRegOpen]=useState(false);
  var [regSponsor,setRegSponsor]=useState('');
  var [menuOpen,setMenuOpen]=useState(false);
  var videoRef=useRef(null);
  var [videoPlaying,setVideoPlaying]=useState(false);

  useEffect(function(){
    var p=new URLSearchParams(window.location.search);
    var sponsor=p.get('join')||p.get('ref')||'';
    if(p.get('login')==='1') setLoginOpen(true);
    else if(p.get('register')==='1'||sponsor){setRegSponsor(sponsor);setRegOpen(true);}
  },[]);

  function openReg(s){setRegSponsor(s||'');setRegOpen(true);setMenuOpen(false);}
  function openLogin(){setLoginOpen(true);setMenuOpen(false);}

  return (
    <div style={{background:dark,color:'#f0f2f8',fontFamily:"'DM Sans',sans-serif",overflowX:'hidden',minHeight:'100vh'}}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 36px',height:72,background:'rgba(10,18,40,.95)',backdropFilter:'blur(18px)',borderBottom:'1px solid rgba(0,180,216,.12)'}}>
        <Link to="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:9}}>
          <svg style={{width:26,height:26}} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#0ea5e9"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:19,color:'#fff'}}>SuperAd<span style={{color:cyan}}>Pro</span></span>
        </Link>
        <ul className="hp-nav-links" style={{display:'flex',alignItems:'center',gap:6,listStyle:'none',margin:0,padding:0}}>
          {[['How It Works','/how-it-works'],['For Advertisers','/for-advertisers'],['FAQ','/faq']].map(function([l,h]){
            return <li key={h}><Link to={h} style={{fontSize:15,fontWeight:500,color:'rgba(200,220,255,.7)',textDecoration:'none',padding:'4px 10px'}}>{l}</Link></li>;
          })}
        </ul>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={openLogin} style={{fontSize:14,fontWeight:600,color:'rgba(200,230,210,.6)',background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,padding:'7px 14px',cursor:'pointer',fontFamily:'inherit'}}>Sign In</button>
          <button onClick={function(){openReg('');}} style={{fontWeight:600,fontSize:14,color:'#fff',background:'#0ea5e9',padding:'9px 20px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit'}}>Join Free</button>
          <button className="hp-hamburger" onClick={function(){setMenuOpen(!menuOpen);}} style={{display:'none',background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer',padding:'4px 8px'}}>☰</button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen&&(
        <div style={{position:'fixed',top:72,left:0,right:0,bottom:0,background:'rgba(5,13,26,.98)',backdropFilter:'blur(12px)',zIndex:99,overflowY:'auto'}}>
          <div style={{padding:24,display:'flex',flexDirection:'column',gap:4}}>
            {[['How It Works','/how-it-works'],['For Advertisers','/for-advertisers'],['FAQ','/faq'],['Ad Board','/ads']].map(function([l,h]){
              return <Link key={h} to={h} onClick={function(){setMenuOpen(false);}} style={{display:'block',padding:'14px 16px',fontSize:16,fontWeight:600,color:'rgba(200,220,255,.8)',textDecoration:'none',borderRadius:8}}>{l}</Link>;
            })}
            <div style={{borderTop:'1px solid rgba(0,180,216,.15)',marginTop:12,paddingTop:12,display:'flex',flexDirection:'column',gap:10}}>
              <button onClick={openLogin} style={{background:'none',border:'none',color:'#38bdf8',fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textAlign:'left',padding:'8px 16px'}}>Sign In</button>
              <button onClick={function(){openReg('');}} style={{background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer',fontFamily:'inherit',padding:'12px 16px',textAlign:'center'}}>Join Free →</button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section style={{paddingTop:108,paddingBottom:0,textAlign:'center',paddingLeft:40,paddingRight:40}}>
        <div className="hp-fade1" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:36}}>
          <svg width="56" height="56" viewBox="0 0 44 44" style={{filter:'drop-shadow(0 4px 20px rgba(14,165,233,.35))'}}>
            <defs><linearGradient id="hpLG" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#0ea5e9"/><stop offset="1" stopColor="#38bdf8"/></linearGradient></defs>
            <circle cx="22" cy="22" r="20" fill="url(#hpLG)"/><path d="M18 13l14 9-14 9V13z" fill="#fff"/>
          </svg>
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(36px,5vw,58px)',fontWeight:800,color:'#fff',letterSpacing:-1}}>SuperAd<span style={{color:cyan}}>Pro</span></span>
        </div>

        <div className="hp-fade1" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12,fontWeight:600,letterSpacing:3,textTransform:'uppercase',color:'#0ea5e9',border:'1px solid rgba(0,180,216,.3)',borderRadius:50,padding:'5px 16px',marginBottom:22}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#0ea5e9',animation:'blink 2s ease-in-out infinite'}}/>
          Video Advertising &amp; AI Marketing Platform
        </div>

        <h1 className="hp-fade2" style={{fontWeight:800,fontSize:'clamp(28px,4.2vw,56px)',color:'#fff',lineHeight:1.1,marginBottom:14}}>
          <span style={{background:'linear-gradient(135deg,#38bdf8,#7c9fff,#0ea5e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Advertise. Create. Grow.</span>
          <br/>Your Business, Your Way.
        </h1>

        <p className="hp-fade3" style={{fontSize:'clamp(14px,1.4vw,17px)',color:'rgba(200,225,210,.6)',lineHeight:1.65,maxWidth:580,margin:'0 auto 28px'}}>
          Get your video ads in front of real, engaged audiences. Build landing pages, funnels, and campaigns with AI-powered tools — then scale your reach through a global network of marketers who promote for you.
        </p>

        <div className="hp-fade4 hp-hero-btns" style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:32}}>
          <button className="hp-btn-p" onClick={function(){openReg('');}}>Start Advertising →</button>
          <Link to="/how-it-works" className="hp-btn-o">See How It Works</Link>
        </div>

        {/* Welcome video */}
        <div className="hp-fade4" style={{maxWidth:960,margin:'0 auto',position:'relative',zIndex:3}}>
          <div style={{position:'relative',width:'100%',aspectRatio:'16/9',background:'#020818',border:'1.5px solid rgba(0,180,216,.3)',borderRadius:14,boxShadow:'0 0 50px rgba(0,180,216,.2),0 0 100px rgba(0,180,216,.06)',overflow:'hidden'}}>
            <video ref={videoRef} poster="/static/video/welcome-poster.jpg" preload="metadata" playsInline
              onPlay={function(){setVideoPlaying(true);}} onPause={function(){setVideoPlaying(false);}}
              onClick={function(){if(videoRef.current){if(videoRef.current.paused)videoRef.current.play();else videoRef.current.pause();}}}
              style={{width:'100%',height:'100%',objectFit:'cover',display:'block',cursor:'pointer'}}>
              <source src="/static/video/welcome.mp4" type="video/mp4"/>
            </video>
            {!videoPlaying&&(
              <div onClick={function(){if(videoRef.current)videoRef.current.play();}} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'rgba(5,13,26,.3)'}}>
                <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(0,180,216,.85)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 35px rgba(0,180,216,.5),0 0 70px rgba(0,180,216,.2)'}}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="hp-fade6" style={{maxWidth:960,margin:'32px auto 0',border:'1px solid rgba(0,180,216,.15)',borderRadius:10,overflow:'hidden',background:'rgba(5,13,26,.6)',backdropFilter:'blur(10px)',display:'flex'}}>
        {[['9+','AI Marketing Tools'],['8','Campaign Tiers'],['∞','Engaged Video Views'],['20+','Languages'],['$20','From / Month']].map(function([val,label],i,arr){
          return (
            <div key={label} style={{flex:1,padding:'18px 12px',textAlign:'center',borderRight:i<arr.length-1?'1px solid rgba(0,180,216,.1)':'none'}}>
              <div style={{fontSize:22,fontWeight:800,color:i===4?'#16a34a':'#fff'}}>{val}</div>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(0,212,255,.6)',letterSpacing:2,textTransform:'uppercase',marginTop:3}}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* ADVERTISE CREATE GROW */}
      <section style={{padding:'80px 40px 0',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#0ea5e9',marginBottom:12}}>THE SUPERADPRO PLATFORM</div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(26px,3.5vw,44px)',fontWeight:900,color:'#fff',lineHeight:1.15,marginBottom:14}}>Advertise. Create. Grow.</h2>
          <p style={{fontSize:15,color:'rgba(200,220,255,.45)',maxWidth:600,margin:'0 auto'}}>A complete advertising and marketing platform — video campaigns, AI content tools, landing pages, and a built-in audience ready to engage.</p>
        </div>
        <div className="hp-three" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:48}}>
          {[
            {label:'Advertise',color:'#0ea5e9',bg:'linear-gradient(145deg,#0c1e4a,#102a5c,#061230)',desc:'Launch video ad campaigns across 8 tiers. Your videos are watched by real, engaged members — not bots. Track views, measure engagement, and scale your reach.'},
            {label:'Create',color:'#8b5cf6',bg:'linear-gradient(145deg,#120530,#220d52,#0e0628)',desc:'AI Campaign Studio, Social Post Generator, Video Script Writer, SuperPages landing page builder, LinkHub, and email tools. Create professional marketing content in seconds.'},
            {label:'Grow',color:'#10b981',bg:'linear-gradient(145deg,#001a12,#003d22,#001510)',desc:'Build your audience through courses, the Ad Board marketplace, and an affiliate network that promotes your content. Earn commissions as your network grows.'},
          ].map(function(c){
            return (
              <div key={c.label} className="hp-card" style={{borderRadius:16,overflow:'hidden'}}>
                <div style={{height:160,position:'relative',background:c.bg,display:'flex',alignItems:'flex-end',justifyContent:'center',paddingBottom:16}}>
                  <span style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:c.color,position:'relative',zIndex:2}}>{c.label}</span>
                </div>
                <div style={{padding:'18px 20px',background:'rgba(5,13,26,.92)',borderTop:'1px solid rgba(255,255,255,.04)'}}>
                  <p style={{fontSize:13,color:'rgba(200,220,255,.5)',lineHeight:1.65}}>{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{textAlign:'center'}}>
          <Link to="/how-it-works" style={{fontSize:15,fontWeight:700,color:'#0ea5e9',textDecoration:'none',padding:'12px 32px',border:'1px solid rgba(14,165,233,.2)',borderRadius:10,display:'inline-block'}}>See full breakdown — How It Works →</Link>
        </div>
      </section>

      {/* EXPLORE — Ad Board + Video */}
      <section style={{padding:'80px 40px 0',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#10b981',marginBottom:12}}>EXPLORE SUPERADPRO</div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(26px,3.5vw,44px)',fontWeight:900,color:'#fff',lineHeight:1.15,marginBottom:14}}>Free Public Content That Drives Traffic</h2>
          <p style={{fontSize:15,color:'rgba(200,220,255,.45)',maxWidth:640,margin:'0 auto'}}>Our Ad Board and Video Library are public, SEO-indexed, and designed to bring organic traffic to the platform — and to your listings.</p>
        </div>
        <div className="hp-two" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:32}}>
          {[
            {label:'Ad Board',color:'#10b981',href:'/ads',tags:['SEO Indexed','Free to Post','Unlimited Listings','Public Access'],desc:'A public, SEO-indexed community marketplace. Post unlimited listings for free — every ad gets its own Google-indexed page with a shareable URL.',cta:'Browse the Ad Board →'},
            {label:'Video Library',color:'#f59e0b',href:'/videos',tags:['Watch to Earn','Real Engagement','YouTube + Vimeo','Public Access'],desc:'Watch campaign videos from advertisers and earn rewards. A public-facing video library that brings organic viewers to the platform and generates real engagement.',cta:'Watch Videos →'},
          ].map(function(c){
            return (
              <div key={c.label} className="hp-card" style={{borderRadius:16,overflow:'hidden'}}>
                <div style={{height:180,background:'rgba(5,13,26,.9)',display:'flex',alignItems:'flex-end',justifyContent:'center',paddingBottom:16,border:'1px solid rgba(255,255,255,.06)',borderBottom:'none'}}>
                  <span style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:800,color:'#fff'}}>{c.label}</span>
                </div>
                <div style={{padding:20,background:'rgba(5,13,26,.92)',borderTop:'1px solid rgba(255,255,255,.04)'}}>
                  <p style={{fontSize:13,color:'rgba(200,220,255,.5)',lineHeight:1.65,marginBottom:12}}>{c.desc}</p>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                    {c.tags.map(function(t){return <span key={t} style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:5,background:`rgba(${c.color==='#10b981'?'16,185,129':'245,158,11'},.1)`,color:c.color,border:`1px solid ${c.color}30`}}>{t}</span>;})}
                  </div>
                  <Link to={c.href} style={{fontSize:13,fontWeight:700,color:c.color,textDecoration:'none'}}>{c.cta}</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EARN WITH SUPERADPRO — teaser section */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      <section style={{padding:'80px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{background:'linear-gradient(135deg,#061530,#0a1f3a,#071020)',border:'1px solid rgba(56,189,248,.15)',borderRadius:20,padding:'52px 48px',position:'relative',overflow:'hidden'}}>
          {/* Background glow */}
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 80% at 100% 50%,rgba(14,165,233,.1),transparent 60%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(14,165,233,.15),transparent 70%)',pointerEvents:'none'}}/>

          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:40,alignItems:'center',position:'relative'}}>
            <div>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#38bdf8',marginBottom:14}}>💰 Affiliate Programme</div>
              <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(24px,3.5vw,42px)',fontWeight:900,color:'#fff',lineHeight:1.1,marginBottom:16}}>
                Earn With SuperAdPro.<br/>
                <span style={{background:'linear-gradient(135deg,#38bdf8,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>$10/Month Per Referral.</span>
              </h2>
              <p style={{fontSize:15,color:'rgba(200,220,255,.55)',lineHeight:1.75,marginBottom:28,maxWidth:520}}>
                Refer members and earn 50% of their monthly subscription — recurring, every month. Build your network, activate campaign tiers, sell courses. Four income streams running on autopilot.
              </p>
              {/* Mini income bullets */}
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:28}}>
                {[
                  {emoji:'💰',text:'$10/mo per referral',color:'#4ade80'},
                  {emoji:'⚡',text:'Up to $3,200 grid cycle',color:'#38bdf8'},
                  {emoji:'🎓',text:'100% course commissions',color:'#a5b4fc'},
                  {emoji:'🤖',text:'9 AI marketing tools',color:'#fbbf24'},
                ].map(function(b){
                  return (
                    <div key={b.text} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 12px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:8}}>
                      <span style={{fontSize:14}}>{b.emoji}</span>
                      <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:b.color}}>{b.text}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
                <a href="/earn" style={{fontWeight:800,fontSize:15,color:'#050d1a',background:'linear-gradient(135deg,#38bdf8,#0ea5e9)',padding:'13px 32px',borderRadius:10,textDecoration:'none',boxShadow:'0 4px 24px rgba(14,165,233,.35)',display:'inline-block'}}>
                  See the Full Opportunity →
                </a>
                <span style={{fontSize:13,color:'rgba(200,220,255,.35)'}}>✓ Free to join · ✓ No credit card</span>
              </div>
            </div>

            {/* Mini promo card */}
            <div style={{flexShrink:0,width:200}}>
              <div style={{background:'rgba(5,13,26,.9)',border:'1.5px solid rgba(56,189,248,.2)',borderRadius:14,padding:'20px 16px',boxShadow:'0 0 40px rgba(14,165,233,.1)',position:'relative',overflow:'hidden',animation:'hpFloat 4s ease-in-out infinite'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#38bdf8,transparent)'}}/>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:900,color:'#fff',marginBottom:12,lineHeight:1.2}}>
                  Earn With<br/><span style={{color:'#38bdf8'}}>SuperAdPro</span>
                </div>
                {[['💰','$10/mo','per referral'],['⚡','$3,200','grid cycle'],['🎓','100%','commissions']].map(function([e,v,l]){
                  return (
                    <div key={l} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                      <span style={{fontSize:13}}>{e}</span>
                      <div>
                        <div style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:900,color:'#38bdf8',lineHeight:1}}>{v}</div>
                        <div style={{fontSize:9,color:'rgba(200,220,255,.35)',textTransform:'uppercase',letterSpacing:.5}}>{l}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{marginTop:12,background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:7,padding:'8px',textAlign:'center',fontSize:11,fontWeight:800,color:'#fff'}}>Join Free →</div>
                <div style={{position:'absolute',bottom:0,right:0,width:16,height:16,borderBottom:'2px solid rgba(56,189,248,.4)',borderRight:'2px solid rgba(56,189,248,.4)',borderRadius:'0 0 4px 0'}}/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>
      <section style={{padding:'80px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div className="hp-two" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:50,alignItems:'start'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2.5,textTransform:'uppercase',color:'rgba(56,189,248,.6)',marginBottom:16}}>Our Mission</div>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(26px,3.5vw,40px)',fontWeight:800,color:'#fff',lineHeight:1.15,marginBottom:20}}>
              Built for People.<br/>
              <span style={{background:'linear-gradient(135deg,#38bdf8,#7c9fff,#0ea5e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>The People's Platform.</span>
            </h2>
            <p style={{fontSize:15,color:'rgba(200,220,255,.55)',lineHeight:1.75,marginBottom:28}}>We created SuperAdPro with a simple belief: that ordinary people deserve genuine opportunities to build additional income — especially in difficult and uncertain times. Not hype. Not false promises. A real platform with real tools, transparent earnings, and a community where 95% of every dollar flows back to the members who make it work.</p>
            {[['🔓','Low barrier to entry.','From $20/month (Basic) or $30/month (Pro) — unlocking four income streams, AI marketing tools, and a global community.'],
              ['🤝','Built to share, not to hoard.','The majority of all revenue flows back to members through commissions, course sales, and grid payouts.'],
              ['🛠️','Tools that do the heavy lifting.','Not everyone knows how to market. Every member gets AI-powered tools to find their niche, write content, and build funnels.']
            ].map(function([icon,strong,text]){
              return (
                <div key={strong} style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:14}}>
                  <div style={{width:36,height:36,borderRadius:8,background:'rgba(56,189,248,.06)',border:'1px solid rgba(56,189,248,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{icon}</div>
                  <div style={{fontSize:14,color:'rgba(200,220,255,.5)',lineHeight:1.6}}><strong style={{color:'rgba(200,220,255,.8)'}}>{strong}</strong> {text}</div>
                </div>
              );
            })}
          </div>
          <div>
            {/* Global network visual */}
            <div style={{position:'relative',width:'100%',maxWidth:420,aspectRatio:'1/.95',margin:'0 auto 20px'}}>
              <div style={{width:'100%',height:'100%',position:'relative',borderRadius:16,overflow:'hidden',background:'radial-gradient(ellipse at 50% 50%,rgba(56,189,248,.04),transparent 65%)'}}>

                {/* Animated connection lines */}
                <svg style={{position:'absolute',inset:0,zIndex:1}} viewBox="0 0 420 400" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="mlc"><stop offset="0%" stopColor="rgba(56,189,248,0)"/><stop offset="50%" stopColor="rgba(56,189,248,0.2)"/><stop offset="100%" stopColor="rgba(56,189,248,0)"/></linearGradient>
                    <linearGradient id="mlg"><stop offset="0%" stopColor="rgba(16,185,129,0)"/><stop offset="50%" stopColor="rgba(16,185,129,0.18)"/><stop offset="100%" stopColor="rgba(16,185,129,0)"/></linearGradient>
                    <linearGradient id="mlp"><stop offset="0%" stopColor="rgba(168,85,247,0)"/><stop offset="50%" stopColor="rgba(168,85,247,0.18)"/><stop offset="100%" stopColor="rgba(168,85,247,0)"/></linearGradient>
                  </defs>
                  {[
                    ["210","180","210","60","mlc","2s"],["210","180","298","96","mlg","2.3s"],
                    ["210","180","336","180","mlp","1.8s"],["210","180","298","264","mlc","2.5s"],
                    ["210","180","210","300","mlg","2.1s"],["210","180","122","264","mlp","1.9s"],
                    ["210","180","84","180","mlc","2.4s"],["210","180","122","96","mlg","2.2s"],
                  ].map(function([x1,y1,x2,y2,grad,dur],i){
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={"url(#"+grad+")"} strokeWidth="1" strokeDasharray="4,4"><animate attributeName="strokeDashoffset" values="0;-8" dur={dur} repeatCount="indefinite"/></line>;
                  })}
                </svg>

                {/* Pulse rings */}
                {[0,1.5,3].map(function(delay){
                  return <div key={delay} style={{position:'absolute',borderRadius:'50%',border:'1px solid rgba(56,189,248,.1)',animation:'missionPulse 4.5s ease-out '+delay+'s infinite',zIndex:0,pointerEvents:'none',top:'47.5%',left:'50%'}}/>;
                })}

                {/* YOU — centre */}
                <div style={{position:'absolute',display:'flex',flexDirection:'column',alignItems:'center',zIndex:5,left:'50%',top:'42%',marginLeft:-33,animation:'missionFloat 4s ease-in-out infinite',filter:'drop-shadow(0 3px 8px rgba(0,0,0,.4))'}}>
                  <div style={{position:'absolute',bottom:-8,left:'50%',transform:'translateX(-50%)',width:52,height:14,borderRadius:'50%',filter:'blur(6px)',zIndex:-1,background:'rgba(56,189,248,.45)'}}/>
                  <div style={{width:66,height:66,borderRadius:'50%',overflow:'hidden',border:'2.5px solid rgba(56,189,248,.6)',background:'#0a1628',boxShadow:'0 0 16px rgba(56,189,248,.25)'}}>
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" alt="You" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>
                  </div>
                  <div style={{fontSize:7,fontWeight:800,letterSpacing:1.5,color:'#38bdf8',textTransform:'uppercase',marginTop:2}}>YOU</div>
                </div>

                {/* Members around the network */}
                {[
                  {photo:'1506794778202-cad84cf45f1d',flag:'🇳🇬',color:'rgba(16,185,129,.5)',left:'29%',top:'24%',delay:'0.3s',dur:'5.2s'},
                  {photo:'1573496359142-b8d87734a5a2',flag:'🇬🇧',color:'rgba(168,85,247,.5)',left:'71%',top:'24%',delay:'0.8s',dur:'5.8s'},
                  {photo:'1580489944761-15a19d654956',flag:'🇵🇭',color:'rgba(56,189,248,.4)',left:'20%',top:'45%',delay:'0.5s',dur:'6.1s'},
                  {photo:'1500648767791-00dcc994a43e',flag:'🇺🇸',color:'rgba(245,158,11,.5)',left:'80%',top:'45%',delay:'1s',dur:'5.5s'},
                  {photo:'1544005313-94ddf0286df2',flag:'🇮🇳',color:'rgba(99,102,241,.5)',left:'50%',top:'75%',delay:'0.2s',dur:'6.4s'},
                  {photo:'1552058544-f2b08422138a',flag:'🇧🇷',color:'rgba(16,185,129,.5)',left:'71%',top:'66%',delay:'0.6s',dur:'5.7s'},
                  {photo:'1438761681033-6461ffad8d80',flag:'🇰🇪',color:'rgba(168,85,247,.5)',left:'50%',top:'15%',delay:'1.2s',dur:'6.2s'},
                  {photo:'1472099645785-5658abf4ff4e',flag:'🇩🇪',color:'rgba(245,158,11,.5)',left:'29%',top:'66%',delay:'0.9s',dur:'5.4s'},
                ].map(function(m,i){
                  return (
                    <div key={i} style={{position:'absolute',display:'flex',flexDirection:'column',alignItems:'center',zIndex:3,left:m.left,top:m.top,marginLeft:-33,animation:'missionFloat '+m.dur+' ease-in-out '+m.delay+' infinite',filter:'drop-shadow(0 3px 8px rgba(0,0,0,.4))'}}>
                      <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',width:36,height:10,borderRadius:'50%',filter:'blur(5px)',zIndex:-1,background:m.color.replace('.5','.35')}}/>
                      <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',border:'2px solid '+m.color,background:'#0a1628'}}>
                        <img src={'https://images.unsplash.com/photo-'+m.photo+'?w=120&h=120&fit=crop&crop=face'} alt="Member" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>
                      </div>
                      <div style={{fontSize:14,marginTop:2}}>{m.flag}</div>
                    </div>
                  );
                })}

                {/* Data particles */}
                {[['30%','36%','#38bdf8','3s'],['55%','64%','#10b981','3.5s,1s'],['38%','22%','#a855f7','4s,.5s'],['60%','74%','#38bdf8','3.2s,1.5s']].map(function([top,left,color,dur],i){
                  return <div key={i} style={{position:'absolute',top:top,left:left,width:3,height:3,borderRadius:'50%',background:color,zIndex:1,animation:'missionDrift '+dur+' linear infinite'}}/>;
                })}
              </div>
            </div>

            {/* Quote */}
            <div style={{background:'rgba(5,13,26,.8)',border:'1px solid rgba(56,189,248,.12)',borderRadius:16,padding:24,marginBottom:16}}>
              <p style={{fontSize:14,fontStyle:'italic',color:'rgba(200,220,255,.55)',lineHeight:1.7,marginBottom:8}}>"This platform exists because we believe the people who create value should be the ones who capture it. Not venture capitalists. Not platform owners. The people."</p>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(56,189,248,.6)'}}>— SuperAdPro Founding Vision</div>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {[['50%','Membership Commission'],['$20','Unlocks everything'],['6+','Pro marketing tools'],['4','Income streams']].map(function([val,label]){
                return (
                  <div key={val} style={{background:'rgba(56,189,248,.04)',border:'1px solid rgba(56,189,248,.08)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800,color:'#38bdf8',marginBottom:2}}>{val}</div>
                    <div style={{fontSize:9,color:'rgba(200,220,255,.35)',lineHeight:1.3}}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      {/* CTA */}
      <section style={{textAlign:'center',padding:'70px 40px 40px'}}>
        <h2 style={{fontSize:'clamp(28px,4vw,52px)',fontWeight:800,color:'#fff',marginBottom:12}}>
          <span style={{background:'linear-gradient(135deg,#38bdf8,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Earn. Learn. Build.</span> Start Today.
        </h2>
        <p style={{fontSize:17,color:'rgba(200,220,255,.55)',marginBottom:32}}>Join SuperAdPro and get instant access to 4 income streams, a course marketplace, and AI-powered marketing tools.</p>
        <div className="hp-hero-btns" style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:32}}>
          <button className="hp-btn-p" onClick={function(){openReg('');}}>Get Started Free →</button>
          <Link to="/how-it-works" className="hp-btn-o">How It Works</Link>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:16,flexWrap:'wrap'}}>
          {['Video Advertising','·','AI Marketing Tools','·','Landing Page Builder','·','From $20/month'].map(function(t,i){
            return <div key={i} style={{fontSize:13,color:'rgba(200,220,255,.3)'}}>{t}</div>;
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hp-foot" style={{borderTop:'1px solid rgba(0,180,216,.12)',padding:'20px 36px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <Link to="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8}}>
          <svg style={{width:22,height:22}} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#0ea5e9"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:17,color:'#fff'}}>SuperAd<span style={{color:cyan}}>Pro</span></span>
        </Link>
        <div style={{display:'flex',gap:20}}>
          {[['Ad Board','/ads'],['Legal','/legal'],['FAQ','/faq'],['How It Works','/how-it-works'],['Support','/support']].map(function([l,h]){
            return <Link key={h} to={h} style={{fontSize:12,letterSpacing:1,textTransform:'uppercase',color:'rgba(200,225,210,.22)',textDecoration:'none'}}>{l}</Link>;
          })}
        </div>
        <div style={{fontSize:12,color:'rgba(200,225,210,.15)'}}>© 2026 SuperAdPro</div>
      </footer>

      <LoginModal open={loginOpen} onClose={function(){setLoginOpen(false);}} onSwitchToReg={function(s){setRegSponsor(s);setRegOpen(true);}}/>
      <RegisterModal open={regOpen} onClose={function(){setRegOpen(false);}} onSwitchToLogin={function(){setLoginOpen(true);}} sponsor={regSponsor}/>
      <SocialToast/>
    </div>
  );
}
