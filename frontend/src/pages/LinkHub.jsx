import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../utils/api';
import { Copy, Check, Trash2, Plus, ExternalLink, ChevronUp, ChevronDown, Upload, AlignLeft, AlignCenter, AlignRight, ChevronRight, ArrowRight, ArrowUpRight, MoveRight } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

var FONTS = ['DM Sans','Sora','Inter','Poppins','Playfair Display','Space Grotesk','Nunito','Raleway',
  'Montserrat','Lato','Roboto','Open Sans','Oswald','Merriweather','Outfit','Quicksand','Rubik',
  'Barlow','Josefin Sans','Abril Fatface','Bebas Neue','Comfortaa','Righteous','Pacifico',
  'Manrope','Plus Jakarta Sans','Clash Display','Satoshi','General Sans','Cabinet Grotesk',
  'Bricolage Grotesque','Instrument Sans','Geist','Figtree','Onest'];

var EMOJIS = [
  // Links & Web
  '🔗','🌐','🖥️','📱','💻','🌍','🔒',
  // Social & Communication
  '📺','🎥','🎬','📸','📷','🎵','🎶','🎧','🎤','📻',
  '💬','✉️','📩','📞','☎️','💌',
  // Business & Money
  '💰','💵','💎','📈','📊','💼','🏦','💳','🪙','📋',
  // Shopping & Products
  '🛍️','🛒','🎁','🏷️','📦','🎀',
  // Education & Creative
  '📚','📘','📖','🎓','✏️','🖊️','📝','🎨','🖌️','🎭',
  // People & Lifestyle
  '👤','👥','🤝','💪','🧠','❤️','🩷','💜','💙','💚',
  // Nature & Fun
  '🌟','⭐','✨','🔥','⚡','🚀','🎯','💡','🌈','☀️',
  // Food & Drink
  '☕','🍕','🍔','🥂','🍷','🧁',
  // Status & Achievement
  '🏆','🥇','✅','🎉','🎊','👑','🦄','🔮','🧿','🪄',
  // Misc Modern
  '🏠','🗺️','✈️','🏖️','🎮','🕹️','📍','🔔','💬','🫶',
];

var ARROW_STYLES = [
  {key:'none',label:'None',render:function(){return null;}},
  {key:'arrow',label:'→',render:function(c){return <span style={{fontSize:14,color:c,opacity:.5}}>→</span>;}},
  {key:'chevron',label:'›',render:function(c){return <ChevronRight size={16} color={c} style={{opacity:.5}}/>;}},
  {key:'arrowRight',label:'⟶',render:function(c){return <ArrowRight size={14} color={c} style={{opacity:.5}}/>;}},
  {key:'external',label:'↗',render:function(c){return <ArrowUpRight size={14} color={c} style={{opacity:.5}}/>;}},
];

function parseIcon(icon) {
  if (!icon) return '🔗';
  if (typeof icon === 'string') {
    if (icon.startsWith('{')) {
      try {
        var obj = JSON.parse(icon);
        var map = {heart:'❤️',star:'⭐',link:'🔗',globe:'🌍',play:'▶️',music:'🎵',camera:'📷',
          mail:'✉️',phone:'📞',home:'🏠',user:'👤',book:'📚',code:'💻',cart:'🛒',
          gift:'🎁',coffee:'☕',fire:'🔥',rocket:'🚀',bolt:'⚡',check:'✅'};
        return map[obj.key] || '🔗';
      } catch(e) { return '🔗'; }
    }
    return icon;
  }
  return '🔗';
}

export default function LinkHub() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [links, setLinks] = useState([]);
  var [profile, setProfile] = useState({display_name:'',bio:'',avatar_url:''});
  var [style, setStyle] = useState({
    bg_color:'#0f172a',btn_color:'#1a1a2e',text_color:'#ffffff',accent_color:'#8b5cf6',
    bio_color:'#cccccc',btn_text_color:'#ffffff',
    font_family:'DM Sans',btn_style_type:'rounded',btn_radius:'50px',
    btn_font_size:14,btn_align:'center',arrow_style:'arrow',
    bg_image_url:'',
  });
  var [panel, setPanel] = useState('links');
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);
  var [copied, setCopied] = useState(false);
  var [stats, setStats] = useState({total_clicks:0,click_30d:0,total_views:0});
  var [emojiPicker, setEmojiPicker] = useState(null);
  var [phoneDrag, setPhoneDrag] = useState(-1);

  useEffect(function() {
    apiGet('/api/linkhub/editor-data').then(function(d) {
      setData(d);
      if (d.links) setLinks(d.links.map(function(l) { return Object.assign({},l,{icon:parseIcon(l.icon)}); }));
      if (d.profile) {
        setProfile({display_name:d.profile.display_name||'',bio:d.profile.bio||'',avatar_url:d.profile.avatar_url||''});
        setStyle({
          bg_color:d.profile.bg_color||'#0f172a',btn_color:d.profile.btn_color||'#1a1a2e',
          text_color:d.profile.text_color||'#ffffff',accent_color:d.profile.accent_color||'#8b5cf6',
          bio_color:d.profile.bio_color||'#cccccc',btn_text_color:d.profile.btn_text_color||'#ffffff',
          font_family:d.profile.font_family||'DM Sans',
          btn_style_type:d.profile.btn_style_type||'rounded',btn_radius:d.profile.btn_radius||'50px',
          btn_font_size:d.profile.btn_font_size||14,btn_align:d.profile.btn_align||'center',
          arrow_style:d.profile.arrow_style||'arrow',bg_image_url:d.profile.bg_image_url||'',
        });
        setStats({total_clicks:d.total_clicks||0,click_30d:d.click_30d||0,total_views:d.profile.total_views||0});
      }
    });
  }, []);

  function save() {
    setSaving(true);
    var payload = Object.assign({}, style, {
      display_name:profile.display_name, bio:profile.bio, avatar_url:profile.avatar_url,
      is_published:true,
      links:links.map(function(l,i) { return {id:l.id>9999999?undefined:l.id,title:l.title,url:l.url,icon:l.icon||'🔗',is_active:l.is_active,sort_order:i}; }),
    });
    apiPost('/linkhub/save', payload).then(function(r) {
      setSaving(false);
      if (r.ok) { setSaved(true); setTimeout(function() { setSaved(false); }, 2000); }
    }).catch(function() { setSaving(false); });
  }

  function updateLink(id,f,v) { setLinks(function(p){return p.map(function(l){return l.id===id?Object.assign({},l,{[f]:v}):l;});}); }
  function removeLink(id) {
    setLinks(function(p) {
      var updated = p.filter(function(l) { return l.id !== id; });
      // Auto-save immediately after deletion
      var payload = {
        display_name: profile.display_name, bio: profile.bio,
        links: updated.map(function(l, i) { return {id:l.id>9999999?undefined:l.id, title:l.title, url:l.url, icon:l.icon||'🔗', is_active:l.is_active, sort_order:i}; }),
        style: style,
      };
      apiPost('/linkhub/save', payload).catch(function() {});
      return updated;
    });
  }
  function addLink() { setLinks(function(p){return p.concat([{id:Date.now(),title:'New Link',url:'',icon:'🔗',is_active:true,click_count:0}]);}); }
  function toggleLink(id) { var lk=links.find(function(l){return l.id===id;}); if(lk) updateLink(id,'is_active',!lk.is_active); }
  function moveLink(idx, dir) {
    var ni = idx + dir;
    if (ni < 0 || ni >= links.length) return;
    setLinks(function(p) { var n=p.slice(); var tmp=n[idx]; n[idx]=n[ni]; n[ni]=tmp; return n; });
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.origin + '/u/' + (data?.username || 'me'));
    setCopied(true); setTimeout(function(){setCopied(false);},2000);
  }

  var btnRadius = style.btn_style_type==='rounded'?50:style.btn_style_type==='soft'?12:style.btn_style_type==='outline'?50:4;
  var arrowObj = ARROW_STYLES.find(function(a){return a.key===style.arrow_style;}) || ARROW_STYLES[0];
  var pubUrl = window.location.origin + '/u/' + (data?.username || 'me');

  if (!data) return <AppLayout title="LinkHub" subtitle="Your link-in-bio editor"><div style={{display:'flex',height:'60vh',alignItems:'center',justifyContent:'center'}}><Spin/></div></AppLayout>;

  return (
    <AppLayout title="LinkHub" subtitle="Your link-in-bio editor">
    <div style={{display:'flex',height:'calc(100vh - 72px)',fontFamily:'DM Sans,sans-serif',background:'#f0f3f9',overflow:'hidden',margin:'-24px',borderRadius:0}}>
      {/* ═══ LEFT PANEL ═══ */}
      <div style={{width:620,minWidth:620,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'14px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>LinkHub</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>Edit your link-in-bio page</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={copyUrl} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:600,color:copied?'#16a34a':'#64748b'}}>
              {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy URL</>}
            </button>
            <a href={pubUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',textDecoration:'none',fontSize:11,fontWeight:600,color:'#64748b'}}>
              <ExternalLink size={12}/> Preview
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
          {[{v:stats.total_views,l:'Views'},{v:stats.total_clicks,l:'Clicks'},{v:stats.click_30d,l:'30d'}].map(function(s,i) {
            return <div key={i} style={{flex:1,padding:'10px 0',textAlign:'center',borderRight:i<2?'1px solid #e5e7eb':'none'}}><div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>{s.v}</div><div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase'}}>{s.l}</div></div>;
          })}
        </div>

        {/* Tabs — pastel coloured */}
        <div style={{display:'flex',gap:0,flexShrink:0}}>
          {[
            {k:'links',l:'🔗 Links',bg:'#ede9fe',bgOn:'#8b5cf6',color:'#7c3aed'},
            {k:'style',l:'🎨 Style',bg:'#fce7f3',bgOn:'#ec4899',color:'#db2777'},
            {k:'profile',l:'👤 Profile',bg:'#dbeafe',bgOn:'#3b82f6',color:'#2563eb'},
          ].map(function(tb) {
            var on=panel===tb.k;
            return <button key={tb.k} onClick={function(){setPanel(tb.k);}} style={{flex:1,padding:'14px 0',border:'none',borderBottom:'none',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:800,letterSpacing:.3,color:on?'#fff':tb.color,background:on?tb.bgOn:tb.bg,transition:'all .2s'}}>{tb.l}</button>;
          })}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:20}}>
          {panel==='links' && <LinksPanel links={links} addLink={addLink} updateLink={updateLink} removeLink={removeLink} toggleLink={toggleLink} moveLink={moveLink} emojiPicker={emojiPicker} setEmojiPicker={setEmojiPicker}/>}
          {panel==='style' && <StylePanel style={style} setStyle={setStyle}/>}
          {panel==='profile' && <ProfilePanel profile={profile} setProfile={setProfile}/>}
        </div>

        {/* Save */}
        <div style={{padding:'14px 20px',borderTop:'1px solid #e5e7eb',flexShrink:0}}>
          <button onClick={save} disabled={saving}
            style={{width:'100%',padding:'15px',borderRadius:10,border:'none',background:saved?'#16a34a':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:14,fontWeight:800,cursor:saving?'default':'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(139,92,246,.3)',opacity:saving?0.6:1}}>
            {saving?'Saving...':saved?'✓ Saved!':'Save & Publish'}
          </button>
        </div>
      </div>

      {/* ═══ RIGHT — PHONE PREVIEW ═══ */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f1f5',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,#d1d5db 1px,transparent 1px)',backgroundSize:'24px 24px',opacity:.25,pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,width:380,flexShrink:0}}>
        <div style={{width:380,borderRadius:44,background:'#1a1a1a',padding:'12px',boxShadow:'0 32px 80px rgba(0,0,0,.35)'}}>
          <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',width:120,height:28,borderRadius:14,background:'#0a0a0a',zIndex:10}}/>
          <div style={{borderRadius:32,overflow:'hidden',minHeight:680,maxHeight:'calc(100vh - 160px)',overflowY:'auto',fontFamily:style.font_family+',sans-serif',position:'relative',background:style.bg_color}}>
            {/* Background image — clipped inside phone */}
            {style.bg_image_url && <div style={{position:'absolute',inset:0,backgroundImage:'url('+style.bg_image_url+')',backgroundSize:'cover',backgroundPosition:'center',opacity:.35,pointerEvents:'none'}}/>}
            <div style={{position:'relative',padding:'60px 24px 40px',textAlign:'center'}}>
              {/* Avatar */}
              <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 14px',overflow:'hidden',border:'3px solid '+style.accent_color,background:profile.avatar_url?'transparent':'linear-gradient(135deg,'+style.accent_color+','+style.btn_color+')'}}>
                {profile.avatar_url ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:style.text_color}}>{(profile.display_name||'?')[0]}</div>}
              </div>
              <div style={{fontSize:20,fontWeight:800,color:style.text_color}}>{profile.display_name||'Your Name'}</div>
              <div style={{fontSize:13,color:style.bio_color||style.text_color,opacity:style.bio_color?1:.6,marginBottom:28,lineHeight:1.5,marginTop:4}}>{profile.bio||'Your bio here'}</div>
              {/* Links — draggable in phone preview */}
              <div style={{display:'flex',flexDirection:'column',gap:10,maxWidth:280,margin:'0 auto'}}>
                {links.filter(function(l){return l.is_active;}).map(function(link, visIdx) {
                  var isFilled = style.btn_style_type!=='outline';
                  var isDragging = phoneDrag === visIdx;
                  // Map visible index back to full array index for reorder
                  var fullIdx = links.indexOf(link);
                  return (
                    <div key={link.id} draggable
                      onDragStart={function(){setPhoneDrag(visIdx);}}
                      onDragOver={function(e){
                        e.preventDefault();
                        if (phoneDrag === visIdx || phoneDrag < 0) return;
                        // Get the active links, reorder them, then rebuild full list
                        var activeLinks = links.filter(function(l){return l.is_active;});
                        var inactiveLinks = links.filter(function(l){return !l.is_active;});
                        var item = activeLinks.splice(phoneDrag, 1)[0];
                        activeLinks.splice(visIdx, 0, item);
                        setLinks(activeLinks.concat(inactiveLinks));
                        setPhoneDrag(visIdx);
                      }}
                      onDragEnd={function(){setPhoneDrag(-1);}}
                      style={{padding:'12px 16px',borderRadius:btnRadius,
                        background:isFilled?style.btn_color:'transparent',
                        border:isFilled?(isDragging?'2px solid '+style.accent_color:'none'):'2px solid '+style.btn_color,
                        display:'flex',alignItems:'center',gap:10,textAlign:style.btn_align||'center',
                        cursor:'grab',opacity:isDragging?0.7:1,transition:'opacity .15s',
                        boxShadow:isDragging?'0 4px 16px rgba(0,0,0,.3)':'none'}}>
                      <span style={{fontSize:18}}>{parseIcon(link.icon)}</span>
                      <span style={{fontSize:style.btn_font_size||14,fontWeight:600,flex:1,textAlign:style.btn_align||'center',color:style.btn_text_color||style.text_color}}>{link.title||'Untitled'}</span>
                      {arrowObj.render && arrowObj.render(style.btn_text_color||style.text_color)}
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:32,fontSize:10,color:style.text_color,opacity:.2}}>Powered by SuperAdPro LinkHub</div>
            </div>
          </div>
        </div>
        <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',background:'#fff',borderRadius:8,padding:'6px 14px',boxShadow:'0 2px 8px rgba(0,0,0,.1)',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#16a34a'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#64748b'}}>{window.location.host}/u/</span>
          <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{data?.username||'yourname'}</span>
        </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════
// LINKS PANEL — Fix #1: Copy URL renamed, #2: up/down not drag, #3: emoji picker, #4: click count
// ═══════════════════════════════════════════════════

function LinksPanel({ links, addLink, updateLink, removeLink, toggleLink, moveLink, emojiPicker, setEmojiPicker }) {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:0}}>Your Links</h3>
        <button onClick={addLink} style={{display:'flex',alignItems:'center',gap:4,padding:'10px 20px',borderRadius:8,border:'none',background:'#8b5cf6',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={14}/> Add Link</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {links.map(function(link, idx) {
          var showEmoji = emojiPicker === link.id;
          return (
            <div key={link.id} style={{background:'#f8f9fb',border:'1px solid #e5e7eb',borderRadius:12,padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  {/* Up/Down reorder buttons instead of drag */}
                  <div style={{display:'flex',flexDirection:'column',gap:1}}>
                    <button onClick={function(){moveLink(idx,-1);}} disabled={idx===0} style={{border:'none',background:'none',cursor:idx===0?'default':'pointer',padding:0,opacity:idx===0?.3:1}}><ChevronUp size={14} color="#94a3b8"/></button>
                    <button onClick={function(){moveLink(idx,1);}} disabled={idx===links.length-1} style={{border:'none',background:'none',cursor:idx===links.length-1?'default':'pointer',padding:0,opacity:idx===links.length-1?.3:1}}><ChevronDown size={14} color="#94a3b8"/></button>
                  </div>
                  {/* Emoji icon — click to change */}
                  <button onClick={function(){setEmojiPicker(showEmoji?null:link.id);}} style={{fontSize:20,background:'none',border:'1px solid transparent',borderRadius:6,cursor:'pointer',padding:'2px 4px',transition:'all .15s'}}
                    onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.background='rgba(139,92,246,.06)';}}
                    onMouseLeave={function(e){e.currentTarget.style.borderColor='transparent';e.currentTarget.style.background='none';}}>
                    {parseIcon(link.icon)}
                  </button>
                  <span style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{link.title||'Untitled'}</span>
                  {link.click_count > 0 && <span style={{fontSize:9,color:'#94a3b8',background:'#f1f5f9',padding:'1px 5px',borderRadius:3}}>{link.click_count} clicks</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={function(){toggleLink(link.id);}} style={{width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',position:'relative',background:link.is_active?'#8b5cf6':'#d1d5db',transition:'background .2s'}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:link.is_active?18:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                  </button>
                  <button onClick={function(){removeLink(link.id);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={14}/></button>
                </div>
              </div>
              {/* Emoji picker dropdown */}
              {showEmoji && (
                <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:8,background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,marginBottom:8,maxHeight:100,overflowY:'auto'}}>
                  {EMOJIS.map(function(e) {
                    return <button key={e} onClick={function(){updateLink(link.id,'icon',e);setEmojiPicker(null);}} style={{fontSize:18,padding:'4px 6px',borderRadius:6,border:link.icon===e?'2px solid #8b5cf6':'2px solid transparent',background:link.icon===e?'rgba(139,92,246,.06)':'transparent',cursor:'pointer'}}>{e}</button>;
                  })}
                </div>
              )}
              <input value={link.title} onChange={function(e){updateLink(link.id,'title',e.target.value);}} placeholder="Link title" style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:6,background:'#fff'}}/>
              <input value={link.url} onChange={function(e){updateLink(link.id,'url',e.target.value);}} placeholder="https://..." style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',color:'#64748b'}}/>
            </div>
          );
        })}
        {links.length === 0 && <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8',fontSize:13}}>No links yet. Click "Add Link" to get started.</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STYLE PANEL — Fix #3: colourful buttons, #5: more fonts + text sizing, #6: separate btn/bio colours, #9: text alignment, #10: arrow styles
// ═══════════════════════════════════════════════════

function StylePanel({ style, setStyle }) {
  function upd(f) { return function(e) { setStyle(function(s){return Object.assign({},s,{[f]:e.target.value});}); }; }
  function updNum(f) { return function(e) { setStyle(function(s){return Object.assign({},s,{[f]:parseInt(e.target.value)||14});}); }; }

  var colours = [
    {key:'bg_color',label:'Background Color'},
    {key:'btn_color',label:'Button Color'},
    {key:'btn_text_color',label:'Button Text Color'},
    {key:'text_color',label:'Name Color'},
    {key:'bio_color',label:'Bio Text Color'},
    {key:'accent_color',label:'Accent / Border'},
  ];

  return (
    <div>
      <h3 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 20px'}}>Customize Style</h3>

      {/* Colours */}
      {colours.map(function(c) {
        return (
          <div key={c.key} style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>{c.label}</label>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="color" value={style[c.key]||'#ffffff'} onChange={upd(c.key)} style={{width:36,height:36,border:'2px solid #e5e7eb',borderRadius:8,cursor:'pointer',padding:0}}/>
              <input value={style[c.key]||''} onChange={upd(c.key)} style={{flex:1,padding:'7px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:11,fontFamily:'monospace',outline:'none'}}/>
              {/* Preview dot */}
              <div style={{width:20,height:20,borderRadius:4,background:style[c.key]||'#fff',border:'1px solid #d1d5db'}}/>
            </div>
          </div>
        );
      })}

      {/* Background image — upload or URL */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Background Image</label>
        {style.bg_image_url && (
          <div style={{width:'100%',height:60,borderRadius:8,marginBottom:6,backgroundImage:'url('+style.bg_image_url+')',backgroundSize:'cover',backgroundPosition:'center',border:'1px solid #e5e7eb',position:'relative'}}>
            <button onClick={function(){setStyle(function(s){return Object.assign({},s,{bg_image_url:''});});}} style={{position:'absolute',top:4,right:4,width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.6)',color:'#fff',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
        )}
        <div style={{display:'flex',gap:6}}>
          <label style={{display:'flex',alignItems:'center',gap:4,padding:'8px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'#64748b',whiteSpace:'nowrap'}}>
            <Upload size={12}/> Upload
            <input type="file" accept="image/*" onChange={function(e){
              var file=e.target.files[0]; if(!file) return;
              var reader=new FileReader();
              reader.onload=function(ev){setStyle(function(s){return Object.assign({},s,{bg_image_url:ev.target.result});});};
              reader.readAsDataURL(file);
            }} style={{display:'none'}}/>
          </label>
          <input value={style.bg_image_url||''} onChange={upd('bg_image_url')} placeholder="or paste URL..." style={{flex:1,padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:10,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        </div>
      </div>

      {/* Font */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Font Family</label>
        <select value={style.font_family} onChange={upd('font_family')} style={{width:'100%',padding:'9px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:style.font_family+',sans-serif',outline:'none',background:'#fff'}}>
          {FONTS.map(function(f){return <option key={f} value={f} style={{fontFamily:f}}>{f}</option>;})}
        </select>
      </div>

      {/* Button text size */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Button Text Size: {style.btn_font_size||14}px</label>
        <input type="range" min="10" max="22" value={style.btn_font_size||14} onChange={updNum('btn_font_size')} style={{width:'100%',accentColor:'#8b5cf6'}}/>
      </div>

      {/* Button shape */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Button Shape</label>
        <div style={{display:'flex',gap:6}}>
          {[{k:'rounded',r:20,label:'Rounded'},{k:'soft',r:8,label:'Soft'},{k:'sharp',r:2,label:'Sharp'},{k:'outline',r:20,label:'Outline'}].map(function(bs) {
            var on = style.btn_style_type===bs.k;
            return (
              <button key={bs.k} onClick={function(){setStyle(function(s){return Object.assign({},s,{btn_style_type:bs.k,btn_radius:bs.r+'px'});});}}
                style={{flex:1,padding:'8px 4px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:48,height:18,borderRadius:bs.r,background:bs.k==='outline'?'transparent':(on?style.btn_color||'#8b5cf6':'#c4c4c4'),border:bs.k==='outline'?'2px solid '+(on?style.btn_color||'#8b5cf6':'#c4c4c4'):'none'}}/>
                <span style={{fontSize:9,fontWeight:on?700:500,color:on?'#8b5cf6':'#94a3b8'}}>{bs.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text alignment */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Button Text Alignment</label>
        <div style={{display:'flex',gap:6}}>
          {[{k:'left',Icon:AlignLeft},{k:'center',Icon:AlignCenter},{k:'right',Icon:AlignRight}].map(function(a) {
            var on = style.btn_align===a.k;
            return (
              <button key={a.k} onClick={function(){setStyle(function(s){return Object.assign({},s,{btn_align:a.k});});}}
                style={{flex:1,padding:'8px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',display:'flex',justifyContent:'center'}}>
                <a.Icon size={16} color={on?'#8b5cf6':'#94a3b8'}/>
              </button>
            );
          })}
        </div>
      </div>

      {/* Arrow style */}
      <div>
        <label style={{fontSize:13,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Button Arrow</label>
        <div style={{display:'flex',gap:6}}>
          {ARROW_STYLES.map(function(a) {
            var on = style.arrow_style===a.key;
            return (
              <button key={a.key} onClick={function(){setStyle(function(s){return Object.assign({},s,{arrow_style:a.key});});}}
                style={{flex:1,padding:'8px',borderRadius:8,border:on?'2px solid #8b5cf6':'2px solid #e5e7eb',background:on?'rgba(139,92,246,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span style={{fontSize:14}}>{a.label}</span>
                <span style={{fontSize:8,color:on?'#8b5cf6':'#94a3b8'}}>{a.key}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PROFILE PANEL — Fix #7: bg image, #8: avatar upload
// ═══════════════════════════════════════════════════

function ProfilePanel({ profile, setProfile }) {
  function upd(f) { return function(e){setProfile(function(p){return Object.assign({},p,{[f]:e.target.value});});}; }
  var inputStyle = {width:'100%',padding:'12px 14px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'};

  function handleAvatarUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    // Show local preview immediately
    var reader = new FileReader();
    reader.onload = function(ev) {
      setProfile(function(p) { return Object.assign({},p,{avatar_url:ev.target.result}); });
    };
    reader.readAsDataURL(file);
    // Upload to R2 in background
    var fd = new FormData();
    fd.append('avatar', file);
    fetch('/linkhub/upload-avatar', {method:'POST', body:fd, credentials:'include'})
      .then(function(r){return r.json();})
      .then(function(d){
        if (d.avatar_url) {
          setProfile(function(p) { return Object.assign({},p,{avatar_url:d.avatar_url}); });
        }
      }).catch(function(){});
  }

  return (
    <div>
      <h3 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 20px'}}>Profile</h3>

      {/* Avatar */}
      <div style={{marginBottom:18,textAlign:'center'}}>
        <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 10px',overflow:'hidden',border:'3px solid #8b5cf6',background:'#e8ecf2'}}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={function(e){e.target.style.display='none';}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'#94a3b8'}}>{(profile.display_name||'?')[0]}</div>}
        </div>
        <label style={{display:'inline-flex',alignItems:'center',gap:4,padding:'6px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'#64748b'}}>
          <Upload size={12}/> Upload Photo
          <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}}/>
        </label>
      </div>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Display Name</label>
        <input value={profile.display_name} onChange={upd('display_name')} placeholder="Your Name" style={inputStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Bio</label>
        <textarea value={profile.bio} onChange={upd('bio')} rows={3} placeholder="Tell the world about you..." style={Object.assign({},inputStyle,{resize:'vertical'})}/>
      </div>
      <div>
        <label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Avatar URL (or use upload above)</label>
        <input value={profile.avatar_url} onChange={upd('avatar_url')} placeholder="https://..." style={Object.assign({},inputStyle,{fontSize:11,color:'#64748b'})}/>
      </div>
    </div>
  );
}

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
