import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import {
  Link2, Plus, Trash2, GripVertical, Eye, Save, ExternalLink,
  Upload, X, ChevronDown, HelpCircle, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

var FONTS = ['DM Sans','Sora','Poppins','Outfit','Space Grotesk','Playfair Display','Montserrat','Raleway','Inter','Lato','Roboto','Nunito','Merriweather','Caveat','Bebas Neue'];
var SOCIALS = [
  {key:'youtube',label:'YouTube',color:'#ff0000',placeholder:'youtube.com/@yourname'},
  {key:'x',label:'𝕏 / Twitter',color:'#000000',placeholder:'x.com/yourname'},
  {key:'instagram',label:'Instagram',color:'#e4405f',placeholder:'instagram.com/yourname'},
  {key:'tiktok',label:'TikTok',color:'#000000',placeholder:'tiktok.com/@yourname'},
  {key:'facebook',label:'Facebook',color:'#1877f2',placeholder:'facebook.com/yourname'},
  {key:'linkedin',label:'LinkedIn',color:'#0a66c2',placeholder:'linkedin.com/in/yourname'},
];

var SOC_PATHS = {
  youtube:'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z',
  x:'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  instagram:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  tiktok:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  facebook:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  linkedin:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};
var SOC_COLORS = {youtube:'#ff0000',x:'#000000',instagram:'#e4405f',tiktok:'#000000',facebook:'#1877f2',linkedin:'#0a66c2'};

export default function LinkHub() {
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [toast, setToast] = useState('');
  var [username, setUsername] = useState('');

  // Profile fields
  var [displayName, setDisplayName] = useState('');
  var [bio, setBio] = useState('');
  var [avatarUrl, setAvatarUrl] = useState('');
  var [bgColor, setBgColor] = useState('#0f172a');
  var [bgImage, setBgImage] = useState('');
  var [textColor, setTextColor] = useState('#ffffff');
  var [btnColor, setBtnColor] = useState('#0ea5e9');
  var [btnTextColor, setBtnTextColor] = useState('#ffffff');
  var [fontFamily, setFontFamily] = useState('DM Sans');
  var [btnRadius, setBtnRadius] = useState('12px');
  var [btnStyle, setBtnStyle] = useState('3d');
  var [btnFontSize, setBtnFontSize] = useState(15);
  var [btnAlign, setBtnAlign] = useState('left');

  // Links
  var [links, setLinks] = useState([]);

  // Social
  var [socials, setSocials] = useState({});

  // Stats
  var [stats, setStats] = useState({views:0,clicks:0,click_30d:0});

  var [dragIdx, setDragIdx] = useState(null);
  var fileRef = useRef(null);
  var bgFileRef = useRef(null);

  var showToast = function(msg) { setToast(msg); setTimeout(function() { setToast(''); }, 3000); };

  // Load data
  useEffect(function() {
    apiGet('/api/linkhub/editor-data').then(function(d) {
      setUsername(d.username || '');
      var p = d.profile || {};
      setDisplayName(p.display_name || d.first_name || '');
      setBio(p.bio || '');
      setAvatarUrl(p.avatar_url || '');
      setBgColor(p.bg_color || '#0f172a');
      setBgImage(p.bg_image_url || '');
      setTextColor(p.text_color || '#ffffff');
      setBtnColor(p.btn_color || '#0ea5e9');
      setBtnTextColor(p.accent_color || '#ffffff');
      setFontFamily(p.font_family || 'DM Sans');
      setBtnStyle(p.btn_style_type || '3d');
      setBtnRadius(p.btn_radius || '12px');
      setBtnFontSize(p.btn_font_size || 15);
      setBtnAlign(p.btn_align || 'center');
      setLinks(d.links || []);
      setStats({views: p.total_views || 0, clicks: d.total_clicks || 0, click_30d: d.click_30d || 0});
      // Parse socials into object
      var soc = {};
      (d.social_links || []).forEach(function(s) { soc[s.platform] = s.url; });
      setSocials(soc);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  // Add link
  var addLink = function() {
    if (links.length >= 20) { showToast('Maximum 20 links'); return; }
    setLinks([...links, {id:0, title:'', url:'', icon:'🔗', is_active:true, click_count:0}]);
  };

  // Remove link
  var removeLink = function(idx) {
    setLinks(links.filter(function(_, i) { return i !== idx; }));
  };

  // Update link field
  var updateLink = function(idx, field, val) {
    var newLinks = links.map(function(l, i) {
      if (i === idx) { var copy = Object.assign({}, l); copy[field] = val; return copy; }
      return l;
    });
    setLinks(newLinks);
  };

  // Drag reorder
  var onDragStart = function(idx) { setDragIdx(idx); };
  var onDragOver = function(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    var newLinks = [...links];
    var item = newLinks.splice(dragIdx, 1)[0];
    newLinks.splice(idx, 0, item);
    setLinks(newLinks);
    setDragIdx(idx);
  };
  var onDragEnd = function() { setDragIdx(null); };

  // Avatar upload
  var handleAvatarUpload = async function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var fd = new FormData();
    fd.append('file', file);
    try {
      var resp = await fetch('/linkhub/upload-avatar', {method:'POST', body:fd, credentials:'include'});
      var d = await resp.json();
      if (d.ok && d.url) { setAvatarUrl(d.url); showToast('✓ Avatar uploaded'); }
      else showToast(d.error || 'Upload failed');
    } catch(err) { showToast('Upload failed'); }
  };

  // Background image — convert to base64 for save endpoint (R2 upload happens server-side)
  var handleBgUpload = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Max file size is 5MB'); return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      setBgImage(ev.target.result);
      showToast('✓ Background image set — click Save to upload');
    };
    reader.readAsDataURL(file);
  };

  // Save
  var saveAll = async function() {
    setSaving(true);
    var socialLinks = [];
    SOCIALS.forEach(function(s) {
      var val = (socials[s.key] || '').trim();
      if (val) {
        if (!val.startsWith('http')) val = 'https://' + val;
        socialLinks.push({platform: s.key, url: val});
      }
    });
    var payload = {
      display_name: displayName,
      bio: bio,
      bg_color: bgColor,
      bg_image: bgImage || undefined,
      clear_bg_image: !bgImage ? true : undefined,
      text_color: textColor,
      btn_color: btnColor,
      accent_color: btnTextColor,
      font_family: fontFamily,
      theme: 'dark',
      is_published: true,
      soc_icon_shape: 'circle',
      btn_style_type: btnStyle,
      btn_radius: btnRadius,
      btn_font_size: btnFontSize,
      btn_align: btnAlign,
      social_links: socialLinks,
      links: links.map(function(l, i) {
        return {
          id: l.id || 0, title: l.title, url: l.url, icon: l.icon || '🔗',
          btn_style: 'filled', is_active: l.is_active !== false, sort_order: i,
          click_count: l.click_count || 0,
        };
      }),
    };
    try {
      var resp = await fetch('/linkhub/save', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload), credentials:'include',
      });
      var d = await resp.json();
      if (d.ok) showToast('✓ Saved!');
      else showToast(d.error || 'Save failed');
    } catch(err) { showToast('Network error'); }
    setSaving(false);
  };

  // Darken helper for 3D button shadow
  var darken = function(hex, amt) {
    try {
      hex = hex.replace('#','');
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      var r = Math.max(0, parseInt(hex.slice(0,2),16) - amt);
      var g = Math.max(0, parseInt(hex.slice(2,4),16) - amt);
      var b = Math.max(0, parseInt(hex.slice(4,6),16) - amt);
      return '#' + [r,g,b].map(function(c) { return c.toString(16).padStart(2,'0'); }).join('');
    } catch(e) { return '#000000'; }
  };

  // Button style generator for preview
  var getLinkStyle = function() {
    var base = {
      display:'block', padding:'14px 18px', marginBottom:12, fontSize:btnFontSize,
      fontWeight:600, textDecoration:'none', textAlign:'center',
      borderRadius: btnRadius, fontFamily: fontFamily + ',sans-serif',
      transition: '.15s', cursor:'pointer',
    };
    if (btnStyle === '3d') {
      return Object.assign({}, base, {
        background: btnColor, color: btnTextColor, border:'none',
        boxShadow: '0 4px 0 ' + darken(btnColor,40) + ',0 6px 12px rgba(0,0,0,.15)',
        transform: 'translateY(-1px)',
      });
    } else if (btnStyle === 'outline') {
      return Object.assign({}, base, {
        background: 'transparent', color: btnColor,
        border: '2px solid ' + btnColor,
      });
    }
    return Object.assign({}, base, {
      background: btnColor, color: btnTextColor, border:'none',
    });
  };

  if (loading) return (
    <AppLayout title="LinkHub Editor">
      <div style={{display:'flex',justifyContent:'center',padding:80}}>
        <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="LinkHub Editor" subtitle={'superadpro.com/u/' + username} topbarActions={
      <div style={{display:'flex',gap:8}}>
        <a href={'/u/' + username + '?preview=1'} target="_blank" rel="noopener noreferrer"
          style={{display:'flex',alignItems:'center',gap:5,padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none',background:'rgba(255,255,255,0.08)',color:'#fff',border:'1px solid rgba(255,255,255,.1)'}}>
          <Eye size={14}/> Preview
        </a>
        <button onClick={saveAll} disabled={saving}
          style={{display:'flex',alignItems:'center',gap:5,padding:'7px 18px',borderRadius:8,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:'#0ea5e9',color:'#fff'}}>
          <Save size={14}/> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    }>

      {/* Stats bar */}
      <div style={{display:'flex',gap:20,marginBottom:20,fontSize:12,color:'#64748b'}}>
        <span>Views: <strong style={{color:'#1e293b'}}>{stats.views}</strong></span>
        <span>Clicks (30d): <strong style={{color:'#1e293b'}}>{stats.click_30d}</strong></span>
        <span>Total clicks: <strong style={{color:'#1e293b'}}>{stats.clicks}</strong></span>
      </div>

      {/* Editor grid — left panel + right preview */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden',minHeight:'calc(100vh - 200px)'}}>

        {/* ═══ LEFT PANEL ═══ */}
        <div style={{background:'#fff',borderRight:'1px solid #e2e8f0',overflowY:'auto',maxHeight:'calc(100vh - 200px)'}}>

          {/* Profile */}
          <Section label="Profile">
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
              <div onClick={function() { fileRef.current && fileRef.current.click(); }}
                style={{width:64,height:64,borderRadius:'50%',background:'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',cursor:'pointer',border:'2.5px solid #e2e8f0',flexShrink:0}}>
                {avatarUrl ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <Upload size={20} color="#94a3b8"/>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload}/>
              <div style={{flex:1}}>
                <FLabel>Display name</FLabel>
                <FInput value={displayName} onChange={function(e) { setDisplayName(e.target.value); }} placeholder="Your name"/>
              </div>
            </div>
            <FLabel>Bio</FLabel>
            <textarea value={bio} onChange={function(e) { setBio(e.target.value); }} placeholder="Tell people about yourself..."
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',minHeight:70,resize:'vertical',boxSizing:'border-box'}}/>
          </Section>

          {/* Style */}
          <Section label="Style">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
              <ColorPick label="Background" value={bgColor} onChange={setBgColor}/>
              <ColorPick label="Text colour" value={textColor} onChange={setTextColor}/>
              <ColorPick label="Button background" value={btnColor} onChange={setBtnColor}/>
              <ColorPick label="Button text" value={btnTextColor} onChange={setBtnTextColor}/>
            </div>

            {/* Background image */}
            <div style={{marginBottom:16}}>
              <FLabel>Background image (optional)</FLabel>
              {bgImage ? (
                <div style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1.5px solid #e2e8f0',marginBottom:8}}>
                  <img src={bgImage} style={{width:'100%',height:80,objectFit:'cover',display:'block'}} alt=""/>
                  <button onClick={function() { setBgImage(''); }} style={{position:'absolute',top:6,right:6,width:24,height:24,borderRadius:12,background:'rgba(0,0,0,.6)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <X size={12} color="#fff"/>
                  </button>
                </div>
              ) : (
                <button onClick={function() { bgFileRef.current && bgFileRef.current.click(); }}
                  style={{width:'100%',padding:'14px',border:'2px dashed #e2e8f0',borderRadius:10,fontSize:12,fontWeight:600,color:'#94a3b8',background:'none',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <Upload size={14}/> Upload background image
                </button>
              )}
              <input ref={bgFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleBgUpload}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <FLabel>Font</FLabel>
                <select value={fontFamily} onChange={function(e) { setFontFamily(e.target.value); }}
                  style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff'}}>
                  {FONTS.map(function(f) { return <option key={f} value={f}>{f}</option>; })}
                </select>
                <FLabel style={{marginTop:12}}>Text size — {btnFontSize}px</FLabel>
                <input type="range" min={8} max={40} value={btnFontSize} onChange={function(e) { setBtnFontSize(parseInt(e.target.value)); }}
                  style={{width:'100%',accentColor:'#0ea5e9',cursor:'pointer'}}/>
                <FLabel style={{marginTop:12}}>Text alignment</FLabel>
                <div style={{display:'flex',gap:6}}>
                  {[['left','Left',AlignLeft],['center','Center',AlignCenter],['right','Right',AlignRight]].map(function(a) {
                    var Icon = a[2];
                    return <button key={a[0]} onClick={function() { setBtnAlign(a[0]); }} style={{
                      flex:1,padding:8,fontSize:11,fontWeight:700,cursor:'pointer',textAlign:'center',
                      borderRadius:8,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4,
                      border: btnAlign===a[0] ? '1.5px solid #0ea5e9' : '1.5px solid #e2e8f0',
                      color: btnAlign===a[0] ? '#0ea5e9' : '#64748b',
                      background: btnAlign===a[0] ? '#f0f9ff' : '#fff',
                    }}><Icon size={13}/> {a[1]}</button>;
                  })}
                </div>
              </div>
              <div>
                <FLabel>Button shape</FLabel>
                <div style={{display:'flex',gap:6}}>
                  {[['6px','Square'],['12px','Rounded'],['50px','Pill']].map(function(pair) {
                    return <ShapeBtn key={pair[0]} active={btnRadius===pair[0]} onClick={function() { setBtnRadius(pair[0]); }}>{pair[1]}</ShapeBtn>;
                  })}
                </div>
                <FLabel style={{marginTop:12}}>Button style</FLabel>
                <div style={{display:'flex',gap:6}}>
                  {[['flat','Flat'],['3d','3D'],['outline','Outline']].map(function(pair) {
                    return <ShapeBtn key={pair[0]} active={btnStyle===pair[0]} onClick={function() { setBtnStyle(pair[0]); }}>{pair[1]}</ShapeBtn>;
                  })}
                </div>
              </div>
            </div>
          </Section>

          {/* Links */}
          <Section label="Links" right={<span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>{links.length} / 20</span>}>
            {links.map(function(l, i) {
              return (
                <div key={i} draggable onDragStart={function() { onDragStart(i); }} onDragOver={function(e) { onDragOver(e, i); }} onDragEnd={onDragEnd}
                  style={{background:dragIdx===i?'#f0f9ff':'#f8fafc',border:'1.5px solid ' + (dragIdx===i?'#0ea5e9':'#e2e8f0'),borderRadius:12,padding:14,marginBottom:10,display:'flex',alignItems:'flex-start',gap:10}}>
                  <GripVertical size={18} color="#cbd5e1" style={{cursor:'grab',flexShrink:0,marginTop:10}}/>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',gap:6}}>
                      <div style={{position:'relative'}}>
                        <button onClick={function() {
                          var picker = document.getElementById('iconPicker-'+i);
                          if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
                        }} style={{width:38,height:38,border:'1.5px solid #e2e8f0',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:l.icon?16:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:l.icon?'inherit':'#94a3b8',fontWeight:l.icon?400:700}}>
                          {l.icon || '⊘'}
                        </button>
                        <div id={'iconPicker-'+i} style={{display:'none',position:'absolute',top:42,left:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:8,boxShadow:'0 8px 24px rgba(0,0,0,.15)',zIndex:10,width:200}}>
                          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                            {['','🔗','🌐','📺','🎵','📱','💬','📧','🛒','💰','📚','🎯','🔥','⭐','💎','🚀','📸','🎮','🎤','📝','👤','💼','🏠','🎁','❤️'].map(function(emoji) {
                              return <button key={emoji||'none'} onClick={function() {
                                updateLink(i, 'icon', emoji);
                                var picker = document.getElementById('iconPicker-'+i);
                                if (picker) picker.style.display = 'none';
                              }} style={{width:32,height:32,border:'none',borderRadius:6,background:l.icon===emoji||((!l.icon)&&emoji==='')?'#dbeafe':'transparent',cursor:'pointer',fontSize:emoji?16:11,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontWeight:700}}>{emoji || '⊘'}</button>;
                            })}
                          </div>
                        </div>
                      </div>
                      <FInput value={l.title} onChange={function(e) { updateLink(i,'title',e.target.value); }} placeholder="Link title" style={{marginBottom:0,flex:1}}/>
                    </div>
                    <FInput value={l.url} onChange={function(e) { updateLink(i,'url',e.target.value); }} placeholder="https://..." style={{marginBottom:0,fontSize:12,color:'#64748b'}}/>
                  </div>
                  <button onClick={function() { removeLink(i); }} style={{cursor:'pointer',color:'#cbd5e1',background:'none',border:'none',padding:'4px 6px',flexShrink:0,marginTop:6}}>
                    <Trash2 size={16}/>
                  </button>
                </div>
              );
            })}
            <button onClick={addLink} style={{width:'100%',padding:12,border:'2px dashed #e2e8f0',borderRadius:12,fontSize:13,fontWeight:700,color:'#94a3b8',background:'none',cursor:'pointer',fontFamily:'inherit'}}>
              + Add link
            </button>
          </Section>

          {/* Social */}
          <Section label="Social Icons">
            {SOCIALS.map(function(s) {
              return (
                <div key={s.key} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <span style={{width:70,fontSize:12,fontWeight:600,color:s.color,flexShrink:0}}>{s.label}</span>
                  <FInput value={socials[s.key] || ''} onChange={function(e) {
                    var newSoc = Object.assign({}, socials);
                    newSoc[s.key] = e.target.value;
                    setSocials(newSoc);
                  }} placeholder={s.placeholder} style={{marginBottom:0}}/>
                </div>
              );
            })}
          </Section>

          {/* Settings */}
          <Section label="Settings">
            <FLabel>Your LinkHub URL</FLabel>
            <div style={{display:'flex',alignItems:'center'}}>
              <span style={{fontSize:13,color:'#64748b',background:'#f1f5f9',padding:'11px 12px',border:'1.5px solid #e2e8f0',borderRight:'none',borderRadius:'10px 0 0 10px',whiteSpace:'nowrap',fontWeight:600}}>
                superadpro.com/u/
              </span>
              <input value={username} readOnly style={{flex:1,padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:'0 10px 10px 0',fontSize:13,fontFamily:'inherit',outline:'none',background:'#f8fafc',color:'#94a3b8',boxSizing:'border-box'}}/>
            </div>
          </Section>
        </div>

        {/* ═══ PHONE PREVIEW ═══ */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto',background:'#f0f3f9',maxHeight:'calc(100vh - 200px)'}}>
          <div>
            <div style={{width:370,minHeight:740,borderRadius:50,border:'4px solid #c9cdd4',background:'#f8f9fa',padding:16,flexShrink:0,boxShadow:'0 24px 80px rgba(0,0,0,.08)'}}>
              {/* Notch */}
              <div style={{width:120,height:28,background:'#c9cdd4',borderRadius:'0 0 16px 16px',margin:'0 auto',position:'relative',top:-16}}/>
              {/* Screen */}
              <div style={{borderRadius:34,overflow:'hidden',minHeight:680}}>
                <div style={{
                  minHeight:680,padding:'44px 26px 24px',textAlign:'center',
                  background: bgImage ? 'url(' + bgImage + ') center/cover no-repeat' : bgColor,
                  backgroundColor: bgColor,
                  fontFamily:fontFamily+',sans-serif',transition:'background .3s',
                }}>
                  {/* Avatar */}
                  <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 14px',background:'#334155',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:'3px solid rgba(255,255,255,.15)'}}>
                    {avatarUrl
                      ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                      : <span style={{fontSize:32,color:'#fff'}}>{(displayName || username || '?')[0].toUpperCase()}</span>
                    }
                  </div>
                  {/* Name */}
                  <div style={{fontSize:20,fontWeight:800,color:textColor,marginBottom:4,fontFamily:fontFamily+',sans-serif'}}>{displayName || 'Your Name'}</div>
                  {/* Bio */}
                  <div style={{fontSize:13,color:textColor,opacity:.5,marginBottom:6,lineHeight:1.5}}>{bio || ''}</div>
                  {/* Social icons — above links like public template */}
                  {SOCIALS.filter(function(s) { return socials[s.key]; }).length > 0 && (
                    <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:24,marginTop:16}}>
                      {SOCIALS.filter(function(s) { return socials[s.key]; }).map(function(s) {
                        var col = SOC_COLORS[s.key] || '#888';
                        return (
                          <div key={s.key} style={{width:36,height:36,borderRadius:'50%',background:col+'22',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={col}><path d={SOC_PATHS[s.key] || ''}/></svg>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Separator */}
                  <div style={{width:40,height:2,borderRadius:2,background:'rgba(255,255,255,.15)',margin:'0 auto 24px'}}/>
                  {/* Links — card style matching public template */}
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {links.filter(function(l) { return l.title; }).map(function(l, i) {
                      var hasIcon = l.icon && l.icon.trim();
                      var iconEl = hasIcon ? <span style={{fontSize:'1.1rem'}}>{l.icon}</span> : null;
                      var alignStyle = btnAlign === 'center' ? 'center' : btnAlign === 'right' ? 'flex-end' : 'flex-start';

                      if (btnStyle === 'outline') {
                        return (
                          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:alignStyle,gap:8,width:'100%',padding:'13px 18px',background:'rgba(0,0,0,.25)',border:'1.5px solid ' + btnColor + '99',borderRadius:parseInt(btnRadius)||12,color:btnColor,fontSize:btnFontSize,fontWeight:700,fontFamily:fontFamily+',sans-serif'}}>
                            {iconEl}
                            <span>{l.title}</span>
                          </div>
                        );
                      }
                      if (btnStyle === 'flat') {
                        return (
                          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:alignStyle,gap:8,width:'100%',padding:'14px 18px',background:btnColor,border:'none',borderRadius:parseInt(btnRadius)||12,color:btnTextColor,fontSize:btnFontSize,fontWeight:700,fontFamily:fontFamily+',sans-serif',boxSizing:'border-box'}}>
                            {iconEl}
                            <span>{l.title}</span>
                          </div>
                        );
                      }
                      // Default: card style (3D / card)
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',width:'100%',background:btnColor,borderRadius:parseInt(btnRadius)||12,overflow:'hidden',color:btnTextColor,boxShadow:'0 4px 0 ' + darken(btnColor,40) + ',0 6px 12px rgba(0,0,0,.2)',transform:'translateY(-1px)'}}>
                          {hasIcon && (
                            <div style={{width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0,background:'rgba(0,0,0,.1)',borderRight:'1px solid rgba(255,255,255,.15)'}}>
                              {l.icon}
                            </div>
                          )}
                          <div style={{flex:1,padding:'12px 14px',minWidth:0,textAlign:btnAlign}}>
                            <div style={{fontSize:btnFontSize,fontWeight:700,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontFamily:fontFamily+',sans-serif'}}>{l.title}</div>
                          </div>
                          <span style={{padding:'0 14px',color:'rgba(255,255,255,.5)',fontSize:13,flexShrink:0}}>→</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Footer */}
                  <div style={{fontSize:10,color:textColor,opacity:.2,marginTop:24}}>Powered by SuperAdPro</div>
                </div>
              </div>
            </div>
            <div style={{textAlign:'center',fontSize:12,color:'#94a3b8',marginTop:14}}>Live preview — updates as you edit</div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:toast.includes('✓')?'#10b981':'#ef4444',color:'#fff',padding:'10px 24px',borderRadius:12,fontSize:13,fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.2)',zIndex:300}}>{toast}</div>
      )}
    </AppLayout>
  );
}


// ── Reusable sub-components ──

function Section(props) {
  return (
    <div style={{padding:'24px 28px',borderBottom:'1px solid #f1f5f9'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1}}>{props.label}</div>
        {props.right || null}
      </div>
      {props.children}
    </div>
  );
}

function FLabel(props) {
  return <label style={Object.assign({display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}, props.style || {})}>{props.children}</label>;
}

function FInput(props) {
  var extraStyle = props.style || {};
  var rest = Object.assign({}, props);
  delete rest.style;
  return <input {...rest} style={Object.assign({width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:0,background:'#fff'}, extraStyle)}/>;
}

function ColorPick(props) {
  return (
    <div>
      <FLabel>{props.label}</FLabel>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <input type="color" value={props.value} onChange={function(e) { props.onChange(e.target.value); }}
          style={{width:40,height:34,border:'1.5px solid #e2e8f0',borderRadius:8,cursor:'pointer',padding:2}}/>
        <span style={{fontSize:12,color:'#94a3b8',fontFamily:'monospace'}}>{props.value}</span>
      </div>
    </div>
  );
}

function ShapeBtn(props) {
  return (
    <button onClick={props.onClick} style={{
      flex:1,padding:8,fontSize:11,fontWeight:700,cursor:'pointer',textAlign:'center',
      borderRadius:8,fontFamily:'inherit',
      border: props.active ? '1.5px solid #0ea5e9' : '1.5px solid #e2e8f0',
      color: props.active ? '#0ea5e9' : '#64748b',
      background: props.active ? '#f0f9ff' : '#fff',
    }}>{props.children}</button>
  );
}
