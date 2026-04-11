import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import QRCode from 'qrcode';
import LinkToolsHelp from './LinkToolsHelp';
import {
  Link2, Shuffle, Plus, Trash2, Copy, BarChart3, ExternalLink,
  Clock, Globe, MousePointer, ChevronDown, X, Edit3, QrCode,
  Tag, Lock, Calendar, Link as LinkIcon, Shield, Palette,
  Download, Search, AlertCircle, Check, HelpCircle
} from 'lucide-react';

// ── Colour presets for tags ──
const TAG_COLORS = [
  { name:'Blue', bg:'#dbeafe', text:'#1d4ed8' },
  { name:'Green', bg:'#dcfce7', text:'#15803d' },
  { name:'Purple', bg:'#f3e8ff', text:'#7c3aed' },
  { name:'Orange', bg:'#ffedd5', text:'#c2410c' },
  { name:'Pink', bg:'#fce7f3', text:'#be185d' },
  { name:'Cyan', bg:'#cffafe', text:'#0e7490' },
  { name:'Red', bg:'#fee2e2', text:'#dc2626' },
  { name:'Yellow', bg:'#fef9c3', text:'#a16207' },
];

export default function LinkTools() {
  var { t } = useTranslation();
  const [links, setLinks] = useState([]);
  const [rotators, setRotators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('links');
  const [showCreate, setShowCreate] = useState(false);
  const [showRotatorCreate, setShowRotatorCreate] = useState(false);
  const [analyticsId, setAnalyticsId] = useState(null);
  const [analyticsType, setAnalyticsType] = useState('short');
  const [analytics, setAnalytics] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState('');

  // ── Modals ──
  const [editLink, setEditLink] = useState(null);
  const [editRotator, setEditRotator] = useState(null);
  const [editRotDests, setEditRotDests] = useState([]);
  const [editRotName, setEditRotName] = useState('');
  const [editRotMode, setEditRotMode] = useState('equal');
  const [editRotSaving, setEditRotSaving] = useState(false);
  const [qrLink, setQrLink] = useState(null);
  const [showUtm, setShowUtm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [tagLink, setTagLink] = useState(null);

  // ── Create link form ──
  const [newUrl, setNewUrl] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newClickCap, setNewClickCap] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Create rotator form ──
  const [rotName, setRotName] = useState('');
  const [rotSlug, setRotSlug] = useState('');
  const [rotMode, setRotMode] = useState('equal');
  const [rotDests, setRotDests] = useState([{url:'',weight:50},{url:'',weight:50}]);
  const [rotCreating, setRotCreating] = useState(false);

  // ── Edit form ──
  const [editDest, setEditDest] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editClickCap, setEditClickCap] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // ── UTM Builder ──
  const [utmUrl, setUtmUrl] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');

  // ── Tag editor ──
  const [tagInput, setTagInput] = useState('');
  const [tagColorIdx, setTagColorIdx] = useState(0);
  const [editTags, setEditTags] = useState([]);

  const BASE = window.location.origin;

  const load = () => apiGet('/api/link-tools').then(d => {
    setLinks(d.short_links || []);
    setRotators(d.rotators || []);
    setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const copyToClip = (text) => { navigator.clipboard.writeText(text); showToast('✓ Copied to clipboard'); };

  // ── Create Link ──
  const createLink = async () => {
    if (!newUrl.trim()) return;
    setCreating(true);
    try {
      const payload = {
        destination_url: newUrl,
        slug: newSlug || undefined,
        title: newTitle || undefined,
        expires_at: newExpiry || undefined,
        click_cap: newClickCap ? parseInt(newClickCap) : undefined,
        password: newPassword || undefined,
      };
      const res = await apiPost('/api/links/create', payload);
      if (res.success) {
        showToast('✓ Link created');
        setNewUrl(''); setNewSlug(''); setNewTitle(''); setNewPassword('');
        setNewExpiry(''); setNewClickCap(''); setShowCreate(false); setShowAdvanced(false);
        load();
      } else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
    setCreating(false);
  };

  // ── Create Rotator ──
  const createRotator = async () => {
    if (!rotName.trim()) return;
    const dests = rotDests.filter(d => d.url.trim());
    if (dests.length < 2) { showToast('Add at least 2 URLs'); return; }
    setRotCreating(true);
    try {
      const res = await apiPost('/api/rotators/create', { title: rotName, slug: rotSlug || undefined, mode: rotMode, destinations: dests });
      if (res.success) { showToast('✓ Rotator created'); setRotName(''); setRotSlug(''); setRotDests([{url:'',weight:50},{url:'',weight:50}]); setShowRotatorCreate(false); load(); }
      else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
    setRotCreating(false);
  };

  // ── Delete ──
  const deleteItem = async (id, type) => {
    try {
      await apiPost(type === 'rotator' ? '/api/rotators/delete/' + id : '/api/links/delete/' + id, {});
      showToast('✓ Deleted'); setConfirmDelete(null); load();
    } catch(e) { showToast(e.message); }
  };

  // ── Analytics ──
  const openAnalytics = async (id, type) => {
    setAnalyticsId(id); setAnalyticsType(type); setAnalytics(null);
    try {
      const d = await apiGet('/api/links/analytics/' + id + '?link_type=' + type);
      setAnalytics(d);
    } catch(e) { setAnalytics({error: e.message}); }
  };

  // ── Edit Link ──
  const openEditRotator = (r) => {
    setEditRotator(r);
    setEditRotName(r.name || '');
    setEditRotMode(r.mode || 'equal');
    try {
      var dests = r.destinations_json ? JSON.parse(r.destinations_json) : [];
      setEditRotDests(dests.length >= 2 ? dests : [{url:'',weight:50},{url:'',weight:50}]);
    } catch(e) { setEditRotDests([{url:'',weight:50},{url:'',weight:50}]); }
  };
  const saveEditRotator = async () => {
    if (!editRotator) return;
    var dests = editRotDests.filter(d => d.url.trim());
    if (dests.length < 2) { showToast('Need at least 2 URLs'); return; }
    setEditRotSaving(true);
    try {
      var res = await apiPost('/api/rotators/edit/' + editRotator.id, {
        title: editRotName, mode: editRotMode, destinations: dests,
      });
      if (res.success) { showToast('✓ Rotator updated'); setEditRotator(null); load(); }
      else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
    setEditRotSaving(false);
  };

  const openEdit = (link) => {
    setEditLink(link);
    setEditDest(link.destination_url || '');
    setEditTitle(link.title || '');
    setEditExpiry(link.expires_at ? link.expires_at.slice(0,16) : '');
    setEditClickCap(link.click_cap ? String(link.click_cap) : '');
    setEditPassword('');
  };
  const saveEdit = async () => {
    if (!editLink) return;
    setEditSaving(true);
    try {
      const payload = {
        destination_url: editDest,
        title: editTitle,
        expires_at: editExpiry || null,
        click_cap: editClickCap ? parseInt(editClickCap) : null,
      };
      if (editPassword) payload.password = editPassword;
      const res = await apiPost('/api/links/edit/' + editLink.id, payload);
      if (res.success) { showToast('✓ Link updated'); setEditLink(null); load(); }
      else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
    setEditSaving(false);
  };

  // ── Tags ──
  const openTags = (link) => {
    setTagLink(link);
    try {
      setEditTags(link.tags_json ? JSON.parse(link.tags_json) : []);
    } catch(err) { setEditTags([]); }
    setTagInput('');
  };
  const addTag = () => {
    const t = tagInput.trim();
    if (!t || editTags.some(et => et.name === t)) return;
    setEditTags([...editTags, { name: t, color: tagColorIdx }]);
    setTagInput('');
  };
  const removeTag = (idx) => setEditTags(editTags.filter((_, i) => i !== idx));
  const saveTags = async () => {
    if (!tagLink) return;
    try {
      const res = await apiPost('/api/links/edit/' + tagLink.id, { tags: editTags.length ? editTags : null });
      if (res.success) { showToast('✓ Tags saved'); setTagLink(null); load(); }
      else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
  };

  // ── UTM Builder ──
  const utmResult = (() => {
    if (!utmUrl.trim()) return '';
    try {
      const u = new URL(utmUrl.trim().startsWith('http') ? utmUrl.trim() : 'https://' + utmUrl.trim());
      if (utmSource) u.searchParams.set('utm_source', utmSource);
      if (utmMedium) u.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) u.searchParams.set('utm_campaign', utmCampaign);
      if (utmTerm) u.searchParams.set('utm_term', utmTerm);
      if (utmContent) u.searchParams.set('utm_content', utmContent);
      return u.toString();
    } catch(err) { return ''; }
  })();

  const totalClicks = links.reduce((a, l) => a + (l.click_count || 0), 0) + rotators.reduce((a, r) => a + (r.click_count || 0), 0);

  if (loading) return (
    <AppLayout title="Link Tools">
      <div style={{display:'flex',justifyContent:'center',padding:80}}>
        <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title={t("linkTools.title")} subtitle={t("linkTools.subtitle")} topbarActions={
      <button onClick={() => setShowHelp(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:'rgba(255,255,255,0.08)',color:'#38bdf8'}}>
        <HelpCircle size={14}/> Help
      </button>
    }>

      {/* ── Stats Cards + Controls ── */}
      <style>{`
        @keyframes ltSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes ltPop{0%{opacity:0;transform:scale(.92) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes ltPulseRing{0%,100%{transform:scale(.95);opacity:.5}50%{transform:scale(1.08);opacity:.9}}
        @keyframes ltFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)}}
        @keyframes ltCount{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .lt-stat{transition:all .28s cubic-bezier(.34,1.56,.64,1);animation:ltPop .8s ease both}
        .lt-stat:hover{transform:translateY(-6px) scale(1.02)!important}
        .lt-action-btn{transition:all .18s ease}
        .lt-action-btn:hover{background:#f0f9ff!important;color:#0ea5e9!important;border-color:#bae6fd!important}
        .lt-create-btn{transition:all .2s cubic-bezier(.34,1.56,.64,1)}
        .lt-create-btn:hover{transform:translateY(-3px) scale(1.04)!important}
      `}</style>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:18,marginBottom:24}}>
        {[
          {label:t('linkTools.shortLinks'),val:links.length,sub:'active links',grad:'linear-gradient(135deg,#0284c7 0%,#0ea5e9 50%,#38bdf8 100%)',shadow:'rgba(14,165,233,.45)',icon:Link2,emoji:'🔗',delay:0},
          {label:t('linkTools.rotators'),val:rotators.length,sub:'traffic splitters',grad:'linear-gradient(135deg,#6d28d9 0%,#8b5cf6 50%,#a78bfa 100%)',shadow:'rgba(139,92,246,.45)',icon:Shuffle,emoji:'🔀',delay:.08},
          {label:'Total Clicks',val:totalClicks,sub:'all time',grad:'linear-gradient(135deg,#065f46 0%,#10b981 50%,#34d399 100%)',shadow:'rgba(16,185,129,.45)',icon:MousePointer,emoji:'👆',delay:.16},
          {label:'Protected',val:links.filter(l=>l.has_password).length,sub:'password locked',grad:'linear-gradient(135deg,#92400e 0%,#f59e0b 50%,#fbbf24 100%)',shadow:'rgba(245,158,11,.45)',icon:Shield,emoji:'🔒',delay:.24},
        ].map((s,i) => (
          <div key={i} className="lt-stat" style={{
            background:s.grad,borderRadius:20,padding:'28px 26px 24px',
            boxShadow:`0 12px 40px ${s.shadow},0 4px 12px rgba(0,0,0,.1)`,
            position:'relative',overflow:'hidden',cursor:'default',
            animationDelay:s.delay+'s',
          }}>

            {/* Big decorative emoji */}
            <div style={{position:'absolute',right:16,top:16,fontSize:52,opacity:.18,animation:'ltFloat '+(5+i)+'s ease-in-out infinite',animationDelay:i*1.2+'s',pointerEvents:'none',userSelect:'none'}}>{s.emoji}</div>
            {/* Pulse ring */}
            <div style={{position:'absolute',right:18,top:18,width:56,height:56,borderRadius:'50%',border:'2px solid rgba(255,255,255,.25)',animation:'ltPulseRing 3s ease-in-out infinite',animationDelay:i*.5+'s',pointerEvents:'none'}}/>

            {/* Icon */}
            <div style={{width:48,height:48,borderRadius:14,background:'rgba(255,255,255,.2)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18,border:'1px solid rgba(255,255,255,.3)'}}>
              <s.icon size={22} color="#fff"/>
            </div>
            {/* Number */}
            <div style={{fontFamily:'Sora,sans-serif',fontSize:52,fontWeight:900,color:'#fff',lineHeight:1,marginBottom:6,animation:'ltCount .6s ease both',animationDelay:s.delay+.1+'s',textShadow:'0 2px 8px rgba(0,0,0,.15)'}}>{s.val}</div>
            {/* Labels */}
            <div style={{fontSize:15,fontWeight:800,color:'rgba(255,255,255,.95)',marginBottom:3,letterSpacing:.2}}>{s.label}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.65)',fontWeight:600,textTransform:'uppercase',letterSpacing:.8}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Action bar ── */}
      <div style={{display:'flex',gap:8,marginBottom:20,alignItems:'center'}}>
        {/* Tabs */}
        <div style={{display:'flex',gap:0,background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:4,boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
          {[['links','Short Links',Link2,'#0ea5e9'],['rotators','Rotators',Shuffle,'#8b5cf6']].map(([key,label,Icon,color]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display:'flex',alignItems:'center',gap:7,padding:'10px 20px',borderRadius:9,fontSize:13,fontWeight:700,
              border:'none',cursor:'pointer',fontFamily:'inherit',
              background:tab===key?`linear-gradient(135deg,${color}ee,${color}bb)`:'transparent',
              color:tab===key?'#fff':'#64748b',
              boxShadow:tab===key?`0 4px 14px ${color}55`:'none',
              transition:'all .18s ease',
            }}><Icon size={14}/> {label}</button>
          ))}
        </div>
        <button onClick={() => setShowUtm(true)} style={{
          display:'flex',alignItems:'center',gap:7,padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:700,
          border:'1px solid #e2e8f0',cursor:'pointer',fontFamily:'inherit',background:'#fff',color:'#64748b',
          boxShadow:'0 2px 6px rgba(0,0,0,.05)',transition:'all .18s ease',
        }}><Search size={14}/> UTM Builder</button>
        <div style={{flex:1}}/>
        <button onClick={() => tab==='links'?setShowCreate(true):setShowRotatorCreate(true)} className="lt-create-btn" style={{
          display:'flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:12,fontSize:14,fontWeight:800,
          border:'none',cursor:'pointer',fontFamily:'inherit',
          background:'linear-gradient(135deg,#0284c7,#0ea5e9,#38bdf8)',color:'#fff',
          boxShadow:'0 8px 24px rgba(14,165,233,.4)',
          letterSpacing:.2,
        }}><Plus size={16}/> {tab==='links'?'New Short Link':'New Rotator'}</button>
      </div>

      {/* ── SHORT LINKS TAB ── */}
      {tab === 'links' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {links.length === 0 && (
            <div style={{textAlign:'center',padding:'40px 20px',background:'#fff',border:'1px solid #e8ecf2',borderRadius:10}}>
              <Link2 size={32} color="#94a3b8" style={{marginBottom:8}}/>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>No short links yet</div>
              <div style={{fontSize:12,color:'#64748b'}}>Create your first short link to start tracking clicks</div>
            </div>
          )}
          {links.map(l => {
            var tags = [];
            try { tags = l.tags_json ? JSON.parse(l.tags_json) : []; } catch(err) { tags = []; }
            var isExpired = l.expires_at && new Date(l.expires_at) < new Date();
            return (
              <div key={l.id} className="lt-card" style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',opacity:isExpired?0.5:1,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:42,height:42,borderRadius:10,background: l.has_password ? 'rgba(245,158,11,.08)' : 'rgba(14,165,233,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:l.has_password?'1px solid rgba(245,158,11,.2)':'1px solid rgba(14,165,233,.2)'}}>
                    {l.has_password ? <Lock size={18} color="#f59e0b"/> : <Link2 size={18} color="#0ea5e9"/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#0ea5e9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{BASE}/go/{l.short_code}</span>
                      {l.has_password && <Lock size={11} color="#f59e0b"/>}
                      {isExpired && <span style={{fontSize:9,fontWeight:700,background:'#fee2e2',color:'#dc2626',padding:'1px 6px',borderRadius:4}}>EXPIRED</span>}
                      {l.expires_at && !isExpired && <span style={{fontSize:9,fontWeight:700,background:'#fef9c3',color:'#a16207',padding:'1px 6px',borderRadius:4}}>EXPIRES {new Date(l.expires_at).toLocaleDateString()}</span>}
                    </div>
                    <div style={{fontSize:11,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title ? l.title + ' — ' : ''}{l.destination_url}</div>
                    {tags.length > 0 && (
                      <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                        {tags.map(function(t, i) {
                          var c = TAG_COLORS[t.color] || TAG_COLORS[0];
                          return <span key={i} style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:10,background:c.bg,color:c.text}}>{t.name}</span>;
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:'center',padding:'8px 14px',background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',borderRadius:10,flexShrink:0,border:'1px solid #bae6fd',minWidth:64}}>
                    <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:900,color:'#0284c7',lineHeight:1}}>{l.click_count||0}{l.click_cap ? <span style={{fontSize:11,fontWeight:600,color:'#64748b'}}>/{l.click_cap}</span> : null}</div>
                    <div style={{fontSize:8,color:'#0ea5e9',fontWeight:700,letterSpacing:.5,marginTop:2}}>CLICKS</div>
                    {l.click_cap && (
                      <div style={{height:3,background:'#e0f2fe',borderRadius:2,marginTop:4,overflow:'hidden'}}>
                        <div style={{height:'100%',background:((l.click_count||0)/l.click_cap)>0.8?'#ef4444':'#0ea5e9',borderRadius:2,width:Math.min(100,Math.round(((l.click_count||0)/l.click_cap)*100))+'%'}}/>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{padding:'8px 16px',borderTop:'1px solid #f1f5f9',display:'flex',gap:6,flexWrap:'wrap',padding:'10px 20px'}}>
                  <button onClick={() => copyToClip(BASE + '/go/' + l.short_code)} style={smallBtn}><Copy size={12}/> {t('linkTools.copy')}</button>
                  <button onClick={() => openAnalytics(l.id, 'short')} style={smallBtn}><BarChart3 size={12}/> {t('linkTools.analytics')}</button>
                  <button onClick={() => openEdit(l)} style={smallBtn}><Edit3 size={12}/> Edit</button>
                  <button onClick={() => setQrLink(l)} style={smallBtn}><QrCode size={12}/> QR</button>
                  <button onClick={() => openTags(l)} style={smallBtn}><Tag size={12}/> Tags</button>
                  <a href={'/go/' + l.short_code} target="_blank" rel="noopener noreferrer" style={{...smallBtn,textDecoration:'none'}}><ExternalLink size={12}/> Open</a>
                  <div style={{flex:1}}/>
                  {confirmDelete === 'link-' + l.id ? (
                    <>
                      <span style={{fontSize:11,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center'}}>Delete?</span>
                      <button onClick={() => deleteItem(l.id,'short')} style={{...smallBtn,background:'#dc2626',color:'#fff',border:'none'}}>Yes</button>
                      <button onClick={() => setConfirmDelete(null)} style={smallBtn}>No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete('link-' + l.id)} style={{...smallBtn,color:'#dc2626',borderColor:'#fecaca'}}><Trash2 size={12}/></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ROTATORS TAB ── */}
      {tab === 'rotators' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {rotators.length === 0 && (
            <div style={{textAlign:'center',padding:'40px 20px',background:'#fff',border:'1px solid #e8ecf2',borderRadius:10}}>
              <Shuffle size={32} color="#94a3b8" style={{marginBottom:8}}/>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>No rotators yet</div>
              <div style={{fontSize:12,color:'#64748b'}}>Create a rotator to split traffic across multiple URLs</div>
            </div>
          )}
          {rotators.map(r => (
            <div key={r.id} className="lt-card" style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
              <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:42,height:42,borderRadius:10,background:'rgba(139,92,246,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1px solid rgba(139,92,246,.2)'}}>
                  <Shuffle size={18} color="#8b5cf6"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{r.name}</div>
                  <div style={{fontSize:12,color:'#8b5cf6',fontWeight:600}}>{BASE}/go/{r.short_code}</div>
                </div>
                <div style={{textAlign:'center',padding:'8px 14px',background:'linear-gradient(135deg,#faf5ff,#ede9fe)',borderRadius:10,border:'1px solid #ddd6fe'}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:900,color:'#7c3aed',lineHeight:1}}>{r.click_count||0}</div>
                  <div style={{fontSize:8,color:'#8b5cf6',fontWeight:700,letterSpacing:.5,marginTop:2}}>CLICKS</div>
                </div>
              </div>
              <div style={{padding:'8px 16px',borderTop:'1px solid #f1f3f7',display:'flex',gap:6}}>
                <button onClick={() => copyToClip(BASE + '/go/' + r.short_code)} style={smallBtn}><Copy size={12}/> {t('linkTools.copy')}</button>
                <button onClick={() => openAnalytics(r.id, 'rotator')} style={smallBtn}><BarChart3 size={12}/> {t('linkTools.analytics')}</button>
                <div style={{flex:1}}/>
                {confirmDelete === 'rot-' + r.id ? (
                  <>
                    <span style={{fontSize:11,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center'}}>Delete?</span>
                    <button onClick={() => deleteItem(r.id,'rotator')} style={{...smallBtn,background:'#dc2626',color:'#fff',border:'none'}}>Yes</button>
                    <button onClick={() => setConfirmDelete(null)} style={smallBtn}>No</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete('rot-' + r.id)} style={{...smallBtn,color:'#dc2626',borderColor:'#fecaca'}}><Trash2 size={12}/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE SHORT LINK MODAL ── */}
      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setShowAdvanced(false); }} title="Create Short Link" icon={<Link2 size={18} color="#0ea5e9"/>}>
          <Label>{t('linkTools.destinationUrl')}</Label>
          <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder={t("linkTools.destinationUrlPlaceholder")}/>
          <Label>{t('linkTools.customSlug')}</Label>
          <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder={t("linkTools.customSlugPlaceholder")}/>
          {newSlug && <div style={{fontSize:11,color:'#64748b',marginTop:-6,marginBottom:10}}>Preview: {BASE}/go/{newSlug || '...'}</div>}
          <Label>{t('linkTools.titleOptional')}</Label>
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t("linkTools.titlePlaceholder")}/>

          <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
            display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#0ea5e9',
            background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:12,fontFamily:'inherit',
          }}>
            <ChevronDown size={14} style={{transform:showAdvanced?'rotate(180deg)':'none',transition:'transform .2s'}}/> Advanced Options
          </button>

          {showAdvanced && (
            <div style={{background:'#f8f9fb',borderRadius:10,padding:16,marginBottom:14,border:'1px solid #e8ecf2'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <Label><Lock size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>Password Protection</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank for none" style={{marginBottom:0}}/>
                </div>
                <div>
                  <Label><Calendar size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>Expiration Date</Label>
                  <Input type="datetime-local" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} style={{marginBottom:0}}/>
                </div>
              </div>
              <div style={{marginTop:12}}>
                <Label><MousePointer size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>Click Cap (optional)</Label>
                <Input type="number" value={newClickCap} onChange={e => setNewClickCap(e.target.value)} placeholder="Deactivate after N clicks" style={{marginBottom:0}}/>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={createLink} disabled={creating} style={btnPrimary('#0ea5e9')}>{creating?'Creating...':'Create Link →'}</button>
            <button onClick={() => { setShowCreate(false); setShowAdvanced(false); }} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── CREATE ROTATOR MODAL ── */}
      {showRotatorCreate && (
        <Modal onClose={() => setShowRotatorCreate(false)} title="Create Link Rotator" icon={<Shuffle size={18} color="#8b5cf6"/>}>
          <Label>{t('linkTools.rotatorName')}</Label>
          <Input value={rotName} onChange={e => setRotName(e.target.value)} placeholder={t("linkTools.rotatorNamePlaceholder")}/>
          <Label>{t('linkTools.customSlug')}</Label>
          <Input value={rotSlug} onChange={e => setRotSlug(e.target.value)} placeholder="my-rotator"/>
          <Label>{t('linkTools.rotationMode')}</Label>
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            {[['equal','Equal Split'],['weighted','Weighted'],['sequential','Sequential']].map(([k,l]) => (
              <button key={k} onClick={() => setRotMode(k)} style={{
                flex:1,padding:'8px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                border:rotMode===k?'2px solid #8b5cf6':'2px solid #e2e8f0',
                background:rotMode===k?'rgba(139,92,246,.06)':'#fff',color:rotMode===k?'#8b5cf6':'#64748b',
              }}>{l}</button>
            ))}
          </div>
          <Label>{t('linkTools.destinationUrls')}</Label>
          {rotDests.map((d,i) => (
            <div key={i} style={{display:'flex',gap:6,marginBottom:8}}>
              <Input value={d.url} onChange={e => { var n=[...rotDests]; n[i].url=e.target.value; setRotDests(n); }} placeholder={'URL ' + (i+1)} style={{flex:1,marginBottom:0}}/>
              {rotMode==='weighted' && (
                <input type="number" value={d.weight} onChange={e => { var n=[...rotDests]; n[i].weight=parseInt(e.target.value)||0; setRotDests(n); }}
                  style={{width:60,padding:'8px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,textAlign:'center'}} min={0} max={100}/>
              )}
              {rotDests.length > 2 && (
                <button onClick={() => setRotDests(rotDests.filter(function(_, j){ return j!==i; }))} style={{width:32,height:38,border:'1px solid #fecaca',borderRadius:8,background:'#fef2f2',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <X size={12} color="#dc2626"/>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setRotDests([...rotDests,{url:'',weight:50}])} style={{fontSize:11,fontWeight:600,color:'#0ea5e9',background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:12}}>+ Add another URL</button>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={createRotator} disabled={rotCreating} style={btnPrimary('#8b5cf6')}>{rotCreating?'Creating...':'Create Rotator →'}</button>
            <button onClick={() => setShowRotatorCreate(false)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── EDIT LINK MODAL ── */}
      {editLink && (
        <Modal onClose={() => setEditLink(null)} title="Edit Link" icon={<Edit3 size={18} color="#0ea5e9"/>}>
          <div style={{fontSize:11,color:'#64748b',marginBottom:14,fontWeight:600}}>{BASE}/go/{editLink.short_code}</div>
          <Label>{t('linkTools.destinationUrl')}</Label>
          <Input value={editDest} onChange={e => setEditDest(e.target.value)} placeholder="https://..."/>
          <Label>{t('linkTools.linkTitle')}</Label>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder={t("linkTools.linkTitlePlaceholder")}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <Label><Calendar size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>Expiration</Label>
              <Input type="datetime-local" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} style={{marginBottom:0}}/>
            </div>
            <div>
              <Label><MousePointer size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>Click Cap</Label>
              <Input type="number" value={editClickCap} onChange={e => setEditClickCap(e.target.value)} placeholder="No limit" style={{marginBottom:0}}/>
            </div>
          </div>
          <div style={{marginTop:12}}>
            <Label><Lock size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>Password {editLink.has_password && <span style={{fontSize:9,color:'#f59e0b'}}>(currently set)</span>}</Label>
            <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder={editLink.has_password ? 'Enter new password or leave blank' : 'Leave blank for none'}/>
            {editLink.has_password && (
              <button onClick={async () => {
                await apiPost('/api/links/edit/' + editLink.id, { password: '' });
                showToast('✓ Password removed'); setEditLink(null); load();
              }} style={{fontSize:11,fontWeight:600,color:'#dc2626',background:'none',border:'none',cursor:'pointer',marginTop:-6,marginBottom:8,fontFamily:'inherit'}}>
                Remove password protection
              </button>
            )}
          </div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={saveEdit} disabled={editSaving} style={btnPrimary('#0ea5e9')}>{editSaving?'Saving...':'Save Changes →'}</button>
            <button onClick={() => setEditLink(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── EDIT ROTATOR MODAL ── */}
      {editRotator && (
        <Modal onClose={() => setEditRotator(null)} title="Edit Rotator" icon={<Shuffle size={18} color="#8b5cf6"/>}>
          <Label>{t('linkTools.rotatorName')}</Label>
          <Input value={editRotName} onChange={e => setEditRotName(e.target.value)} placeholder={t("linkTools.rotatorNameEdit")}/>
          <Label>{t('linkTools.rotationMode')}</Label>
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            {[['equal','Equal Split'],['weighted','Weighted'],['sequential','Sequential']].map(([k,l]) => (
              <button key={k} onClick={() => setEditRotMode(k)} style={{
                flex:1,padding:'8px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                border:editRotMode===k?'2px solid #8b5cf6':'2px solid #e2e8f0',
                background:editRotMode===k?'rgba(139,92,246,.06)':'#fff',color:editRotMode===k?'#8b5cf6':'#64748b',
              }}>{l}</button>
            ))}
          </div>
          <Label>{t('linkTools.destinationUrls')}</Label>
          {editRotDests.map((d,i) => (
            <div key={i} style={{display:'flex',gap:6,marginBottom:8}}>
              <Input value={d.url} onChange={e => { var n=[...editRotDests]; n[i]={...n[i],url:e.target.value}; setEditRotDests(n); }} placeholder={'URL ' + (i+1)} style={{flex:1,marginBottom:0}}/>
              {editRotMode==='weighted' && (
                <input type="number" value={d.weight||50} onChange={e => { var n=[...editRotDests]; n[i]={...n[i],weight:parseInt(e.target.value)||0}; setEditRotDests(n); }}
                  style={{width:60,padding:'8px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,textAlign:'center'}} min={0} max={100}/>
              )}
              {editRotDests.length > 2 && (
                <button onClick={() => setEditRotDests(editRotDests.filter(function(_,j){ return j!==i; }))} style={{width:32,height:38,border:'1px solid #fecaca',borderRadius:8,background:'#fef2f2',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <X size={12} color="#dc2626"/>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setEditRotDests([...editRotDests,{url:'',weight:50,clicks:0}])} style={{fontSize:11,fontWeight:600,color:'#8b5cf6',background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:12}}>+ Add URL</button>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={saveEditRotator} disabled={editRotSaving} style={btnPrimary('#8b5cf6')}>{editRotSaving?'Saving...':'Save Changes →'}</button>
            <button onClick={() => setEditRotator(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── QR CODE MODAL ── */}
      {qrLink && (
        <Modal onClose={() => setQrLink(null)} title="QR Code" icon={<QrCode size={18} color="#0ea5e9"/>}>
          <QrCodeDisplay url={BASE + '/go/' + qrLink.short_code} slug={qrLink.short_code}/>
        </Modal>
      )}

      {/* ── UTM BUILDER MODAL ── */}
      {showUtm && (
        <Modal onClose={() => setShowUtm(false)} title="UTM Tag Builder" icon={<Search size={18} color="#10b981"/>} wide>
          <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Build campaign-tracked URLs with UTM parameters. Paste any URL and add your campaign tags.</p>
          <Label>{t('linkTools.baseUrl')}</Label>
          <Input value={utmUrl} onChange={e => setUtmUrl(e.target.value)} placeholder={t("linkTools.baseUrlPlaceholder")}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <Label>Source <span style={{color:'#dc2626'}}>*</span></Label>
              <Input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder={t("linkTools.sourcePlaceholder")}/>
            </div>
            <div>
              <Label>{t('linkTools.medium')}</Label>
              <Input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder={t("linkTools.mediumPlaceholder")}/>
            </div>
            <div>
              <Label>{t('linkTools.campaign')}</Label>
              <Input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder={t("linkTools.campaignPlaceholder")}/>
            </div>
            <div>
              <Label>{t('linkTools.term')}</Label>
              <Input value={utmTerm} onChange={e => setUtmTerm(e.target.value)} placeholder={t("linkTools.termPlaceholder")}/>
            </div>
          </div>
          <Label>{t('linkTools.content')}</Label>
          <Input value={utmContent} onChange={e => setUtmContent(e.target.value)} placeholder="banner_ad, text_link"/>

          {utmResult && (
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:14,marginTop:8}}>
              <div style={{fontSize:10,fontWeight:700,color:'#15803d',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Generated URL</div>
              <div style={{fontSize:12,color:'#0f172a',wordBreak:'break-all',fontFamily:'monospace',lineHeight:1.6}}>{utmResult}</div>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={() => copyToClip(utmResult)} style={{...smallBtn,background:'#10b981',color:'#fff',border:'none'}}><Copy size={12}/> Copy URL</button>
                <button onClick={() => { setNewUrl(utmResult); setShowUtm(false); setShowCreate(true); }} style={{...smallBtn,background:'#0ea5e9',color:'#fff',border:'none'}}><Link2 size={12}/> Shorten This</button>
              </div>
            </div>
          )}

          <div style={{marginTop:16}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Quick Presets</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[
                {label:'Facebook Ad',s:'facebook',m:'cpc',c:'fb_ad'},
                {label:'Instagram',s:'instagram',m:'social',c:'ig_post'},
                {label:'Email',s:'newsletter',m:'email',c:'email_blast'},
                {label:'Google Ad',s:'google',m:'cpc',c:'google_ad'},
                {label:'YouTube',s:'youtube',m:'video',c:'yt_desc'},
                {label:'TikTok',s:'tiktok',m:'social',c:'tt_bio'},
              ].map(function(p, i) {
                return (
                  <button key={i} onClick={() => { setUtmSource(p.s); setUtmMedium(p.m); setUtmCampaign(p.c); }}
                    style={{fontSize:10,fontWeight:700,padding:'5px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* ── TAG EDITOR MODAL ── */}
      {tagLink && (
        <Modal onClose={() => setTagLink(null)} title="Edit Tags" icon={<Tag size={18} color="#8b5cf6"/>}>
          <div style={{fontSize:11,color:'#64748b',marginBottom:14}}>{BASE}/go/{tagLink.short_code}</div>
          {editTags.length > 0 && (
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
              {editTags.map(function(t, i) {
                var c = TAG_COLORS[t.color] || TAG_COLORS[0];
                return (
                  <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:12,background:c.bg,color:c.text}}>
                    {t.name}
                    <button onClick={() => removeTag(i)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex'}}><X size={10} color={c.text}/></button>
                  </span>
                );
              })}
            </div>
          )}
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tag name..." onKeyDown={e => { if(e.key==='Enter') addTag(); }} style={{flex:1,marginBottom:0}}/>
            <button onClick={addTag} style={{...smallBtn,background:'#8b5cf6',color:'#fff',border:'none',padding:'8px 14px'}}>Add</button>
          </div>
          <div style={{display:'flex',gap:4,marginBottom:16}}>
            {TAG_COLORS.map(function(c, i) {
              return (
                <button key={i} onClick={() => setTagColorIdx(i)} style={{
                  width:24,height:24,borderRadius:12,background:c.bg,border:tagColorIdx===i?'2px solid ' + c.text:'2px solid transparent',
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                }}>{tagColorIdx===i && <Check size={10} color={c.text}/>}</button>
              );
            })}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={saveTags} style={btnPrimary('#8b5cf6')}>Save Tags →</button>
            <button onClick={() => setTagLink(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── ANALYTICS MODAL ── */}
      {analyticsId !== null && (
        <Modal onClose={() => setAnalyticsId(null)} title="Click Analytics" icon={<BarChart3 size={18} color="#10b981"/>} wide>
          {!analytics ? (
            <div style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading analytics...</div>
          ) : analytics.error ? (
            <div style={{textAlign:'center',padding:30,color:'#dc2626'}}>{analytics.error}</div>
          ) : (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
                <StatBox label="Total Clicks" val={analytics.total_clicks} color="#10b981"/>
                <StatBox label="Mobile" val={analytics.devices?.mobile||0} color="#0ea5e9"/>
                <StatBox label="Desktop" val={analytics.devices?.desktop||0} color="#8b5cf6"/>
              </div>
              {analytics.timeline && analytics.timeline.length > 0 && (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Clicks — Last 30 Days</div>
                  <div style={{display:'flex',alignItems:'flex-end',gap:2,height:80,background:'#f8f9fb',borderRadius:8,padding:'8px 4px'}}>
                    {analytics.timeline.map(function(d, i) {
                      var max = Math.max.apply(null, analytics.timeline.map(function(t){ return t.clicks; }).concat([1]));
                      var h = Math.max(2, (d.clicks/max)*60);
                      return <div key={i} title={d.date + ': ' + d.clicks + ' clicks'} style={{flex:1,height:h,background:d.clicks>0?'#0ea5e9':'#e2e8f0',borderRadius:2,minWidth:1}}/>;
                    })}
                  </div>
                </div>
              )}
              {analytics.sources && Object.keys(analytics.sources).length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Traffic Sources</div>
                  {Object.entries(analytics.sources).sort(function(a,b){ return b[1]-a[1]; }).map(function(pair) {
                    return (
                      <div key={pair[0]} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                        <span style={{fontSize:12,color:'#0f172a',fontWeight:600}}>{pair[0]}</span>
                        <span style={{fontSize:12,color:'#64748b',fontWeight:700}}>{pair[1]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {analytics.countries && Object.keys(analytics.countries).length > 0 && (
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Top Countries</div>
                  {Object.entries(analytics.countries).map(function(pair) {
                    return (
                      <div key={pair[0]} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                        <span style={{fontSize:12,color:'#0f172a',fontWeight:600}}>{pair[0]}</span>
                        <span style={{fontSize:12,color:'#64748b',fontWeight:700}}>{pair[1]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:toast.includes('✓')?'#10b981':'#ef4444',color:'#fff',padding:'10px 24px',borderRadius:12,fontSize:13,fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.2)',zIndex:300}}>{toast}</div>
      )}

      {/* ── Help Panel ── */}
      <LinkToolsHelp visible={showHelp} onClose={() => setShowHelp(false)} />
    </AppLayout>
  );
}


// ── QR Code Display Component ──
function QrCodeDisplay({ url, slug }) {
  var canvasRef = useRef(null);
  var [size, setSize] = useState(256);
  var [fgColor, setFgColor] = useState('#0f172a');
  var [bgColor, setBgColor] = useState('#ffffff');

  var generate = useCallback(function() {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size, margin: 2,
      color: { dark: fgColor, light: bgColor },
    });
  }, [url, size, fgColor, bgColor]);

  useEffect(function() { generate(); }, [generate]);

  var download = function() {
    if (!canvasRef.current) return;
    var a = document.createElement('a');
    a.download = 'qr-' + slug + '.png';
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{textAlign:'center'}}>
      <canvas ref={canvasRef} style={{borderRadius:8,margin:'0 auto 16px',display:'block'}}/>
      <div style={{fontSize:11,color:'#64748b',marginBottom:16,wordBreak:'break-all'}}>{url}</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        <div>
          <Label>Size</Label>
          <select value={size} onChange={e => setSize(parseInt(e.target.value))} style={{width:'100%',padding:'8px',border:'2px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit'}}>
            <option value={128}>128px</option>
            <option value={256}>256px</option>
            <option value={512}>512px</option>
            <option value={1024}>1024px</option>
          </select>
        </div>
        <div>
          <Label>Foreground</Label>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{width:32,height:32,border:'none',background:'none',cursor:'pointer',padding:0}}/>
            <span style={{fontSize:11,color:'#64748b'}}>{fgColor}</span>
          </div>
        </div>
        <div>
          <Label>Background</Label>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{width:32,height:32,border:'none',background:'none',cursor:'pointer',padding:0}}/>
            <span style={{fontSize:11,color:'#64748b'}}>{bgColor}</span>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
        <button onClick={download} style={{...smallBtn,background:'#0ea5e9',color:'#fff',border:'none',padding:'10px 20px',fontSize:13,fontWeight:700}}>
          <Download size={14}/> Download PNG
        </button>
        <button onClick={function() { navigator.clipboard.writeText(url); }} style={{...smallBtn,padding:'10px 20px',fontSize:13}}>
          <Copy size={14}/> Copy URL
        </button>
      </div>
    </div>
  );
}


// ── Reusable Components ──
function Modal({ onClose, title, icon, wide, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={function(e){ e.stopPropagation(); }} style={{background:'#fff',borderRadius:16,width:wide?640:480,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#fff',borderRadius:'16px 16px 0 0',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {icon}
            <h3 style={{margin:0,fontSize:16,fontWeight:800,color:'#0f172a'}}>{title}</h3>
          </div>
          <button onClick={onClose} style={{width:30,height:30,border:'none',borderRadius:8,background:'#f1f5f9',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} color="#64748b"/></button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function StatBox({ label, val, color }) {
  return (
    <div style={{background:'#f8f9fb',borderRadius:8,padding:'12px',borderLeft:'3px solid ' + color}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:'#64748b',textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:'#0f172a',fontFamily:'Sora,sans-serif'}}>{val}</div>
    </div>
  );
}

function Label({ children }) { return <label style={{display:'block',fontSize:12,fontWeight:700,color:'#475569',marginBottom:4}}>{children}</label>; }
function Input(props) {
  var extraStyle = props.style || {};
  var rest = Object.assign({}, props);
  delete rest.style;
  return <input {...rest} style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:'inherit',...extraStyle}}/>;
}

var smallBtn = {
  display:'inline-flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:7,
  fontSize:11,fontWeight:700,border:'1px solid #e8ecf2',background:'#fff',
  color:'#475569',cursor:'pointer',fontFamily:'inherit',
  transition:'all .15s ease',
};

var btnPrimary = function(bg) {
  return {
    flex:1,padding:'11px',borderRadius:10,border:'none',background:bg,color:'#fff',
    fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
  };
};

var btnSecondary = {
  padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',
  color:'#64748b',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
};
