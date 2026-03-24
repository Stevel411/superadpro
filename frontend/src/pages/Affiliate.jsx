import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { Copy, Check, RefreshCw, Share2 } from 'lucide-react';

var PLATFORMS = [
  { key: 'facebook', label: 'Facebook', bg: '#1877F2', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
  { key: 'x', label: 'X', bg: '#000', path: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-5.21-6.82L4.99 21.75H1.68l7.73-8.84L1.25 2.25H8.08l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z' },
  { key: 'linkedin', label: 'LinkedIn', bg: '#0A66C2', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z' },
  { key: 'whatsapp', label: 'WhatsApp', bg: '#25D366', path: 'M12.04 2a9.94 9.94 0 00-8.48 15.18L2 22l4.97-1.31A9.94 9.94 0 1012.04 2zm5.78 14.07a3 3 0 01-1.97 1.38 4.01 4.01 0 01-1.84-.12 16.7 16.7 0 01-1.66-.61 12.97 12.97 0 01-4.97-4.4 5.66 5.66 0 01-1.18-3.01 3.26 3.26 0 011.02-2.43 1.07 1.07 0 01.77-.36h.56c.17.01.41-.08.65.49.24.58.82 2.01.89 2.15a.53.53 0 010 .51c-.1.19-.14.31-.29.48s-.28.37-.43.51c-.14.14-.3.3-.13.59a8.76 8.76 0 001.62 2.01 7.93 7.93 0 002.34 1.44c.29.15.46.13.63-.07s.75-.88.92-1.12.36-.28.65-.14 1.67.79 1.96.93.48.22.55.34a2.43 2.43 0 01-.17 1.38z' },
  { key: 'telegram', label: 'Telegram', bg: '#26A5E4', path: 'M22.27 2.06a1 1 0 00-1.06-.17L1.46 10.12a1 1 0 00.06 1.86l4.15 1.63 2.1 6.72a.5.5 0 00.84.17l2.93-2.68 4.42 3.36a1 1 0 001.52-.5l3.75-17.5a1 1 0 00-.96-1.12zM9.88 14.39l-.58 3.29-1.34-4.3 9.75-6.07z' },
  { key: 'reddit', label: 'Reddit', bg: '#FF4500', path: 'M12 22c5.52 0 10-4-10-8.5 0-.5.1-.9.2-1.3A2.5 2.5 0 014.5 10a2.5 2.5 0 012.1 1.1A10.5 10.5 0 0112 10a10.5 10.5 0 015.4 1.1A2.5 2.5 0 0119.5 10a2.5 2.5 0 012.3 3.2c.1.4.2.8.2 1.3C22 18 17.52 22 12 22zM8.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 19c2 0 3.5-.8 4-2H8c.5 1.2 2 2 4 2z' },
  { key: 'tiktok', label: 'TikTok', bg: '#010101', path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.76 0 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 100 12.63 6.34 6.34 0 006.34-6.34V9.41a8.16 8.16 0 004.77 1.53V7.49a4.85 4.85 0 01-1.01-.8z' },
  { key: 'instagram', label: 'Instagram', bg: 'linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)', path: 'M16 3H8a5 5 0 00-5 5v8a5 5 0 005 5h8a5 5 0 005-5V8a5 5 0 00-5-5zm-4 12a4 4 0 110-8 4 4 0 010 8zm5-8.5a1 1 0 110-2 1 1 0 010 2z', isGrad: true },
  { key: 'youtube', label: 'YouTube', bg: '#FF0000', path: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z' },
  { key: 'pinterest', label: 'Pinterest', bg: '#E60023', path: 'M12 2a10 10 0 00-3.64 19.33c-.1-.85-.18-2.16.04-3.09l.59-2.52s-.44-.88-.44-2.18c0-2.04 1.18-3.57 2.66-3.57 1.25 0 1.86.94 1.86 2.07 0 1.26-.8 3.14-1.22 4.89-.35 1.47.74 2.66 2.18 2.66 2.62 0 4.63-2.76 4.63-6.74 0-3.52-2.53-5.99-6.14-5.99z' },
  { key: 'email', label: 'Email', bg: '#6366f1', path: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6', isStroke: true },
  { key: 'snapchat', label: 'Snapchat', bg: '#FFFC00', path: 'M12 2C6.48 2 4 5 4 8c0 1.5.5 2.5 1 3-.5.3-1.5.5-1.5 1s1 1 2 1.2c-.2.8-.5 1.5-1.2 2.3.8.2 1.5.3 2.2-.2.5 1 1.5 2 3.5 2.2-.3.5-.5 1.2-.5 1.5h5c0-.3-.2-1-.5-1.5 2-.2 3-1.2 3.5-2.2.7.5 1.4.4 2.2.2-.7-.8-1-1.5-1.2-2.3 1-.2 2-.2 2-1.2s-1-.7-1.5-1c.5-.5 1-1.5 1-3 0-3-2.48-6-8-6z', darkIcon: true },
];

var TONES = ['Professional', 'Casual', 'Hype', 'Story', 'Educational'];

function SocialIcon({ p, size }) {
  return <svg width={size||24} height={size||24} viewBox="0 0 24 24" fill={p.isStroke?'none':(p.darkIcon?'#333':'#fff')} stroke={p.isStroke?'#fff':'none'} strokeWidth={p.isStroke?'2':'0'}><path d={p.path}/></svg>;
}

export default function Affiliate() {
  var { user } = useAuth();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [copied, setCopied] = useState(false);
  var [platform, setPlatform] = useState('facebook');
  var [tone, setTone] = useState('Professional');
  var [niche, setNiche] = useState('');
  var [generating, setGenerating] = useState(false);
  var [post, setPost] = useState('');
  var [postCopied, setPostCopied] = useState(false);

  useEffect(function() {
    apiGet('/api/affiliate').then(function(d) { setData(d); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  var refLink = 'https://www.superadpro.com/ref/' + (user ? user.username : '');

  function copyRef() {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  function copyPost() {
    navigator.clipboard.writeText(post);
    setPostCopied(true);
    setTimeout(function() { setPostCopied(false); }, 2000);
  }

  function generate() {
    setGenerating(true);
    setPost('');
    apiPost('/api/social-posts/generate', {
      topic: 'SuperAdPro — earn by watching video ads and building an affiliate network',
      platform: platform,
      tone: tone.toLowerCase(),
      niche: niche || 'affiliate marketing',
      link: refLink,
      goal: 'drive signups through referral link'
    }).then(function(r) {
      setPost(r.result || r.content || '');
      setGenerating(false);
    }).catch(function(e) {
      setPost('Error: ' + (e.message || 'Generation failed'));
      setGenerating(false);
    });
  }

  function shareToUrl(p) {
    var text = post || 'Check out SuperAdPro — earn real income from video advertising! ' + refLink;
    var enc = encodeURIComponent;
    var urls = {
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + enc(refLink) + '&quote=' + enc(text),
      x: 'https://twitter.com/intent/tweet?text=' + enc(text),
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc(refLink),
      whatsapp: 'https://wa.me/?text=' + enc(text),
      telegram: 'https://t.me/share/url?url=' + enc(refLink) + '&text=' + enc(text),
      reddit: 'https://www.reddit.com/submit?url=' + enc(refLink) + '&title=' + enc('SuperAdPro — Earn from Video Advertising'),
      email: 'mailto:?subject=' + enc('Check out SuperAdPro') + '&body=' + enc(text),
      pinterest: 'https://pinterest.com/pin/create/button/?url=' + enc(refLink) + '&description=' + enc(text),
    };
    var url = urls[p.key];
    if (url) window.open(url, '_blank');
    else {
      navigator.clipboard.writeText(text);
      setPostCopied(true);
      setTimeout(function() { setPostCopied(false); }, 2000);
    }
  }

  if (loading) return <AppLayout title="Social Share"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  var d = data || {};

  return (
    <AppLayout title="Social Share" subtitle="Generate posts and share your referral link across social media">

      {/* Referral link bar */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'18px 22px',marginBottom:18,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:8}}>Your referral link</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{flex:1,padding:'10px 14px',borderRadius:10,background:'#f8f9fb',border:'1.5px solid #e2e8f0',fontSize:13,fontFamily:'monospace',color:'#0ea5e9',wordBreak:'break-all'}}>{refLink}</div>
          <button onClick={copyRef} style={{display:'flex',alignItems:'center',gap:5,padding:'10px 18px',borderRadius:10,border:'none',background:copied?'#16a34a':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            {copied ? <><Check size={13}/> Copied</> : <><Copy size={13}/> Copy</>}
          </button>
        </div>
        <div style={{fontSize:11,color:'#94a3b8',marginTop:6}}>Every click is tracked to you permanently. Share anywhere — social, email, DMs, groups.</div>
      </div>

      {/* Two column layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:18,alignItems:'start'}}>

        {/* LEFT: AI Post Generator */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{background:'linear-gradient(135deg,#1c223d,#334155)',padding:'16px 20px',display:'flex',alignItems:'center',gap:8}}>
            <Share2 size={16} color="#38bdf8"/>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Generate a Post</span>
          </div>
          <div style={{padding:'18px 20px'}}>
            {/* Platform selector */}
            <div style={{fontSize:12,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Platform</div>
            <div style={{display:'flex',gap:5,marginBottom:14,flexWrap:'wrap'}}>
              {['facebook','x','linkedin','instagram','tiktok'].map(function(p) {
                var pl = PLATFORMS.find(function(x){return x.key===p;});
                var on = platform === p;
                return <button key={p} onClick={function(){setPlatform(p);}} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:on?'1.5px solid #0ea5e9':'1.5px solid #e2e8f0',background:on?'rgba(14,165,233,.06)':'#fff',color:on?'#0ea5e9':'#94a3b8',transition:'all .15s'}}>
                  <div style={{width:16,height:16,borderRadius:4,background:pl.isGrad?pl.bg:pl.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><SocialIcon p={pl} size={10}/></div>
                  {pl.label}
                </button>;
              })}
            </div>

            {/* Tone selector */}
            <div style={{fontSize:12,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Tone</div>
            <div style={{display:'flex',gap:5,marginBottom:14,flexWrap:'wrap'}}>
              {TONES.map(function(t) {
                var on = tone === t;
                return <button key={t} onClick={function(){setTone(t);}} style={{padding:'7px 12px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:on?'1.5px solid #8b5cf6':'1.5px solid #e2e8f0',background:on?'rgba(139,92,246,.06)':'#fff',color:on?'#8b5cf6':'#94a3b8',transition:'all .15s'}}>{t}</button>;
              })}
            </div>

            {/* Niche input */}
            <div style={{fontSize:12,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Your niche (optional)</div>
            <input value={niche} onChange={function(e){setNiche(e.target.value);}} placeholder="e.g. fitness, crypto, travel..."
              style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',background:'#f8f9fb',boxSizing:'border-box',outline:'none',marginBottom:14}}
              onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>

            {/* Generate button */}
            <button onClick={generate} disabled={generating} style={{width:'100%',padding:'12px',borderRadius:10,fontSize:13,fontWeight:800,border:'none',cursor:generating?'default':'pointer',fontFamily:'inherit',background:generating?'#94a3b8':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:generating?'none':'0 4px 14px rgba(14,165,233,.25)',opacity:generating?0.7:1,transition:'all .2s'}}>
              {generating ? <><RefreshCw size={14} style={{animation:'spin .8s linear infinite'}}/> Generating...</> : 'Generate Post'}
            </button>

            {/* Output */}
            {post && (
              <div style={{marginTop:14}}>
                <div style={{padding:'14px 16px',background:'#f8f9fb',borderRadius:10,border:'1px solid #e8ecf2',fontSize:13,color:'#334155',lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:220,overflowY:'auto'}}>{post}</div>
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  <button onClick={copyPost} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'9px',borderRadius:8,fontSize:12,fontWeight:700,border:'1px solid #e2e8f0',background:postCopied?'#dcfce7':'#fff',color:postCopied?'#16a34a':'#64748b',cursor:'pointer',fontFamily:'inherit'}}>
                    {postCopied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy Post</>}
                  </button>
                  <button onClick={generate} disabled={generating} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'9px',borderRadius:8,fontSize:12,fontWeight:700,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',cursor:'pointer',fontFamily:'inherit'}}>
                    <RefreshCw size={12}/> Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Share buttons */}
        <div>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
            <div style={{background:'linear-gradient(135deg,#1c223d,#334155)',padding:'16px 20px',display:'flex',alignItems:'center',gap:8}}>
              <Share2 size={16} color="#38bdf8"/>
              <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Share Now</span>
            </div>
            <div style={{padding:'16px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {PLATFORMS.map(function(p) {
                  return (
                    <div key={p.key} onClick={function(){shareToUrl(p);}}
                      style={{background:p.isGrad?p.bg:p.bg,borderRadius:10,padding:'16px 10px',textAlign:'center',cursor:'pointer',transition:'transform .2s,box-shadow .2s'}}
                      onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.2)';}}
                      onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
                      <div style={{marginBottom:6,display:'flex',justifyContent:'center'}}><SocialIcon p={p}/></div>
                      <div style={{fontSize:11,fontWeight:700,color:p.darkIcon?'#333':'#fff'}}>{p.label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:12,padding:'10px 14px',background:'#f8f9fb',borderRadius:8,fontSize:11,color:'#94a3b8',lineHeight:1.6}}>
                Generate a post on the left, then click a platform to share it. Your referral link is included automatically.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {val: d.personal_referrals || 0, lbl: 'Direct referrals', color: '#16a34a'},
          {val: d.total_team || 0, lbl: 'Total network', color: '#0ea5e9'},
          {val: '$' + Math.round(d.total_earned || 0), lbl: 'Total earned', color: '#f59e0b'},
        ].map(function(s) {
          return (
            <div key={s.lbl} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'18px 20px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:s.color}}>{s.val}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',marginTop:4}}>{s.lbl}</div>
            </div>
          );
        })}
      </div>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </AppLayout>
  );
}
