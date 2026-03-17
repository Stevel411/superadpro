import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../utils/api';
import { Copy, Check, Eye, Trash2, GripVertical, Plus, ExternalLink, BarChart3 } from 'lucide-react';

var FONTS = ['DM Sans','Sora','Inter','Poppins','Playfair Display','Space Grotesk','Nunito','Raleway','Montserrat','Lato'];

// Convert legacy SVG icon JSON to emoji fallback
function parseIcon(icon) {
  if (!icon) return '🔗';
  if (typeof icon === 'string') {
    // Check if it's a JSON string
    if (icon.startsWith('{')) {
      try {
        var obj = JSON.parse(icon);
        // Map known SVG keys to emojis
        var map = {heart:'❤️',star:'⭐',link:'🔗',globe:'🌍',play:'▶️',music:'🎵',camera:'📷',
          mail:'✉️',phone:'📞',home:'🏠',user:'👤',book:'📚',code:'💻',cart:'🛒',
          gift:'🎁',coffee:'☕',fire:'🔥',rocket:'🚀',bolt:'⚡',check:'✅'};
        return map[obj.key] || '🔗';
      } catch(e) { return '🔗'; }
    }
    // Already an emoji or text
    return icon;
  }
  if (typeof icon === 'object' && icon.key) {
    var map2 = {heart:'❤️',star:'⭐',link:'🔗',globe:'🌍',play:'▶️',music:'🎵',camera:'📷',
      mail:'✉️',phone:'📞',home:'🏠',user:'👤',book:'📚',code:'💻',cart:'🛒'};
    return map2[icon.key] || '🔗';
  }
  return '🔗';
}

export default function LinkHub() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [links, setLinks] = useState([]);
  var [profile, setProfile] = useState({display_name:'',bio:'',avatar_url:''});
  var [style, setStyle] = useState({bg_color:'#0f172a',btn_color:'#1a1a2e',text_color:'#ffffff',accent_color:'#8b5cf6',font_family:'DM Sans',btn_style_type:'rounded',btn_radius:'50px'});
  var [panel, setPanel] = useState('links');
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);
  var [copied, setCopied] = useState(false);
  var [dragIdx, setDragIdx] = useState(-1);
  var [stats, setStats] = useState({total_clicks:0,click_30d:0,total_views:0});

  useEffect(function() {
    apiGet('/api/linkhub/editor-data').then(function(d) {
      setData(d);
      if (d.links) setLinks(d.links);
      if (d.profile) {
        setProfile({display_name:d.profile.display_name||'',bio:d.profile.bio||'',avatar_url:d.profile.avatar_url||''});
        setStyle({
          bg_color:d.profile.bg_color||'#0f172a',
          btn_color:d.profile.btn_color||'#1a1a2e',
          text_color:d.profile.text_color||'#ffffff',
          accent_color:d.profile.accent_color||'#8b5cf6',
          font_family:d.profile.font_family||'DM Sans',
          btn_style_type:d.profile.btn_style_type||'rounded',
          btn_radius:d.profile.btn_radius||'50px',
        });
        setStats({total_clicks:d.total_clicks||0,click_30d:d.click_30d||0,total_views:d.profile.total_views||0});
      }
    });
  }, []);

  function save() {
    setSaving(true);
    var payload = {
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      bg_color: style.bg_color,
      btn_color: style.btn_color,
      text_color: style.text_color,
      accent_color: style.accent_color,
      font_family: style.font_family,
      btn_style_type: style.btn_style_type,
      btn_radius: style.btn_radius,
      is_published: true,
      links: links.map(function(l,i) { return {id:l.id>9999999?undefined:l.id,title:l.title,url:l.url,icon:l.icon||'🔗',is_active:l.is_active,sort_order:i}; }),
    };
    apiPost('/linkhub/save', payload).then(function(r) {
      setSaving(false);
      if (r.ok) { setSaved(true); setTimeout(function() { setSaved(false); }, 2000); }
    }).catch(function() { setSaving(false); });
  }

  function updateLink(id, field, val) { setLinks(function(p) { return p.map(function(l) { return l.id===id?Object.assign({},l,{[field]:val}):l; }); }); }
  function removeLink(id) { setLinks(function(p) { return p.filter(function(l) { return l.id!==id; }); }); }
  function addLink() { setLinks(function(p) { return p.concat([{id:Date.now(),title:'New Link',url:'',icon:'🔗',is_active:true,click_count:0}]); }); }
  function toggleLink(id) { var link = links.find(function(l){return l.id===id;}); if(link) updateLink(id,'is_active',!link.is_active); }

  function onDragStart(idx) { setDragIdx(idx); }
  function onDragOver(e, idx) { e.preventDefault(); if (dragIdx===idx) return;
    setLinks(function(p) { var n=p.slice(); var item=n.splice(dragIdx,1)[0]; n.splice(idx,0,item); setDragIdx(idx); return n; });
  }
  function onDragEnd() { setDragIdx(-1); }

  function copyLink() {
    var url = window.location.origin + '/link/' + (data?.username || 'me');
    navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(function() { setCopied(false); }, 2000);
  }

  var btnRadius = style.btn_style_type==='rounded'?50:style.btn_style_type==='soft'?12:4;
  var linkUrl = window.location.origin + '/link/' + (data?.username || 'me');

  if (!data) return <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'#f5f6fa'}}><Spin/></div>;

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:'DM Sans,sans-serif',background:'#f5f6fa',overflow:'hidden'}}>

      {/* ═══ LEFT PANEL ═══ */}
      <div style={{width:400,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>LinkHub</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>Edit your link-in-bio page</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={copyLink} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:600,color:copied?'#16a34a':'#64748b'}}>
              {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Share</>}
            </button>
            <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',textDecoration:'none',fontSize:11,fontWeight:600,color:'#64748b'}}>
              <ExternalLink size={12}/> Preview
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
          {[
            {value:stats.total_views,label:'Views'},
            {value:stats.total_clicks,label:'Clicks'},
            {value:stats.click_30d,label:'30d Clicks'},
          ].map(function(s,i) {
            return (
              <div key={i} style={{flex:1,padding:'10px 0',textAlign:'center',borderRight:i<2?'1px solid #e5e7eb':'none'}}>
                <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{s.value}</div>
                <div style={{fontSize:9,fontWeight:600,color:'#94a3b8',textTransform:'uppercase'}}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Panel tabs */}
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
          {[{key:'links',label:'🔗 Links'},{key:'style',label:'🎨 Style'},{key:'profile',label:'👤 Profile'}].map(function(tb) {
            var on = panel === tb.key;
            return (
              <button key={tb.key} onClick={function() { setPanel(tb.key); }}
                style={{flex:1,padding:'12px 0',border:'none',borderBottom:on?'3px solid #8b5cf6':'3px solid transparent',
                  cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:on?800:500,
                  color:on?'#8b5cf6':'#94a3b8',background:on?'rgba(139,92,246,.03)':'transparent',transition:'all .15s'}}>
                {tb.label}
              </button>
            );
          })}
        </div>

        {/* Panel content */}
        <div style={{flex:1,overflowY:'auto',padding:20}}>
          {panel === 'links' && <LinksPanel links={links} addLink={addLink} updateLink={updateLink} removeLink={removeLink} toggleLink={toggleLink} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} dragIdx={dragIdx}/>}
          {panel === 'style' && <StylePanel style={style} setStyle={setStyle}/>}
          {panel === 'profile' && <ProfilePanel profile={profile} setProfile={setProfile}/>}
        </div>

        {/* Save */}
        <div style={{padding:'14px 20px',borderTop:'1px solid #e5e7eb',flexShrink:0}}>
          <button onClick={save} disabled={saving}
            style={{width:'100%',padding:'13px',borderRadius:10,border:'none',
              background:saved?'#16a34a':'linear-gradient(135deg,#8b5cf6,#a78bfa)',
              color:'#fff',fontSize:14,fontWeight:800,cursor:saving?'default':'pointer',
              fontFamily:'inherit',boxShadow:'0 4px 14px rgba(139,92,246,.3)',opacity:saving?0.6:1,transition:'all .2s'}}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* ═══ RIGHT — PHONE PREVIEW ═══ */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f1f5',position:'relative'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,#d1d5db 1px,transparent 1px)',backgroundSize:'24px 24px',opacity:.25}}/>

        {/* Phone frame */}
        <div style={{position:'relative',zIndex:1,width:375,borderRadius:40,background:'#1a1a1a',padding:'12px',boxShadow:'0 20px 60px rgba(0,0,0,.2),0 0 0 1px rgba(255,255,255,.05) inset'}}>
          <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',width:120,height:28,borderRadius:14,background:'#0a0a0a',zIndex:10}}/>

          <div style={{borderRadius:30,overflow:'hidden',background:style.bg_color,minHeight:680,fontFamily:style.font_family+',sans-serif'}}>
            <div style={{padding:'60px 24px 40px',textAlign:'center'}}>
              {/* Avatar */}
              <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 14px',overflow:'hidden',
                border:'3px solid '+style.accent_color,
                background:profile.avatar_url?'transparent':'linear-gradient(135deg,'+style.accent_color+','+style.btn_color+')'}}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/>
                ) : (
                  <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:style.text_color}}>
                    {(profile.display_name||'?')[0]}
                  </div>
                )}
              </div>
              <div style={{fontSize:20,fontWeight:800,color:style.text_color,marginBottom:4}}>{profile.display_name || 'Your Name'}</div>
              <div style={{fontSize:13,color:style.text_color,opacity:.6,marginBottom:28,lineHeight:1.5}}>{profile.bio || 'Your bio here'}</div>

              {/* Links */}
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {links.filter(function(l) { return l.is_active; }).map(function(link) {
                  var isFilled = style.btn_style_type !== 'outline';
                  return (
                    <div key={link.id}
                      style={{padding:'14px 18px',borderRadius:btnRadius,
                        background:isFilled?style.btn_color:'transparent',
                        border:isFilled?'none':'2px solid '+style.btn_color,
                        color:style.text_color,
                        display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                        transition:'all .2s'}}>
                      <span style={{fontSize:18}}>{parseIcon(link.icon)}</span>
                      <span style={{fontSize:14,fontWeight:600,flex:1,textAlign:'left'}}>{link.title || 'Untitled'}</span>
                      <span style={{fontSize:12,opacity:.4}}>→</span>
                    </div>
                  );
                })}
                {links.filter(function(l){return l.is_active;}).length === 0 && (
                  <div style={{padding:20,fontSize:13,color:style.text_color,opacity:.3}}>Add links to see them here</div>
                )}
              </div>

              <div style={{marginTop:32,fontSize:10,color:style.text_color,opacity:.2}}>Powered by SuperAdPro LinkHub</div>
            </div>
          </div>
        </div>

        {/* URL bar below phone */}
        <div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',background:'#fff',borderRadius:8,padding:'8px 16px',boxShadow:'0 2px 8px rgba(0,0,0,.1)',display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#16a34a'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#64748b'}}>{window.location.host}/link/</span>
          <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{data?.username || 'yourname'}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LINKS PANEL
// ═══════════════════════════════════════════════════

function LinksPanel({ links, addLink, updateLink, removeLink, toggleLink, onDragStart, onDragOver, onDragEnd, dragIdx }) {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>Your Links</h3>
        <button onClick={addLink} style={{display:'flex',alignItems:'center',gap:4,padding:'8px 16px',borderRadius:8,border:'none',background:'#8b5cf6',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          <Plus size={14}/> Add Link
        </button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {links.map(function(link, idx) {
          return (
            <div key={link.id} draggable onDragStart={function(){onDragStart(idx);}} onDragOver={function(e){onDragOver(e,idx);}} onDragEnd={onDragEnd}
              style={{background:dragIdx===idx?'#f3f0ff':'#f8f9fb',border:'1px solid '+(dragIdx===idx?'#8b5cf6':'#e5e7eb'),borderRadius:12,padding:14,cursor:'grab',transition:'all .15s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <GripVertical size={14} color="#c4c4c4" style={{cursor:'grab'}}/>
                  <span style={{fontSize:16}}>{parseIcon(link.icon)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{link.title||'Untitled'}</span>
                  {link.click_count > 0 && <span style={{fontSize:9,color:'#94a3b8'}}>{link.click_count} clicks</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={function(){toggleLink(link.id);}}
                    style={{width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',position:'relative',
                      background:link.is_active?'#8b5cf6':'#d1d5db',transition:'background .2s'}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,
                      left:link.is_active?18:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                  </button>
                  <button onClick={function(){removeLink(link.id);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:2}}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <input value={link.title} onChange={function(e){updateLink(link.id,'title',e.target.value);}}
                placeholder="Link title" style={{width:'100%',padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:6,background:'#fff'}}/>
              <input value={link.url} onChange={function(e){updateLink(link.id,'url',e.target.value);}}
                placeholder="https://..." style={{width:'100%',padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',color:'#64748b'}}/>
            </div>
          );
        })}
        {links.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8',fontSize:13}}>
            No links yet. Click "Add Link" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STYLE PANEL
// ═══════════════════════════════════════════════════

function StylePanel({ style, setStyle }) {
  function upd(field) { return function(e) { setStyle(function(s) { return Object.assign({},s,{[field]:e.target.value}); }); }; }

  var colours = [
    {key:'bg_color',label:'Background'},
    {key:'btn_color',label:'Button Color'},
    {key:'accent_color',label:'Accent'},
    {key:'text_color',label:'Text'},
  ];

  return (
    <div>
      <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 16px'}}>Customize Style</h3>

      {colours.map(function(c) {
        return (
          <div key={c.key} style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>{c.label}</label>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="color" value={style[c.key]} onChange={upd(c.key)}
                style={{width:40,height:40,border:'2px solid #e5e7eb',borderRadius:10,cursor:'pointer',padding:0}}/>
              <input value={style[c.key]} onChange={upd(c.key)}
                style={{flex:1,padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'monospace',outline:'none'}}/>
            </div>
          </div>
        );
      })}

      {/* Font */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Font</label>
        <select value={style.font_family} onChange={upd('font_family')}
          style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff'}}>
          {FONTS.map(function(f) { return <option key={f} value={f}>{f}</option>; })}
        </select>
      </div>

      {/* Button shape */}
      <div>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Button Shape</label>
        <div style={{display:'flex',gap:8}}>
          {[{key:'rounded',r:20},{key:'soft',r:8},{key:'sharp',r:2},{key:'outline',r:20}].map(function(bs) {
            var on = style.btn_style_type === bs.key;
            return (
              <button key={bs.key} onClick={function() { setStyle(function(s) { return Object.assign({},s,{btn_style_type:bs.key,btn_radius:bs.r+'px'}); }); }}
                style={{flex:1,padding:'10px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',
                  background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:50,height:20,borderRadius:bs.r,background:bs.key==='outline'?'transparent':(on?'#8b5cf6':'#d1d5db'),border:bs.key==='outline'?'2px solid '+(on?'#8b5cf6':'#d1d5db'):'none'}}/>
                <span style={{fontSize:9,fontWeight:on?700:500,color:on?'#8b5cf6':'#94a3b8',textTransform:'capitalize'}}>{bs.key}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PROFILE PANEL
// ═══════════════════════════════════════════════════

function ProfilePanel({ profile, setProfile }) {
  function upd(field) { return function(e) { setProfile(function(p) { return Object.assign({},p,{[field]:e.target.value}); }); }; }
  var inputStyle = {width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'};

  return (
    <div>
      <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 16px'}}>Profile</h3>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Display Name</label>
        <input value={profile.display_name} onChange={upd('display_name')} placeholder="Your Name" style={inputStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Bio</label>
        <textarea value={profile.bio} onChange={upd('bio')} rows={3} placeholder="Tell the world about you..." style={Object.assign({},inputStyle,{resize:'vertical'})}/>
      </div>
      <div>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Avatar URL</label>
        <input value={profile.avatar_url} onChange={upd('avatar_url')} placeholder="https://..." style={Object.assign({},inputStyle,{fontSize:12,color:'#64748b'})}/>
        <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Paste an image URL or leave blank for initial</div>
      </div>
    </div>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
