import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Monitor, Sparkles, LayoutGrid, FolderOpen, Edit3, Trash2, Eye, Download, Copy, Check, ExternalLink, ChevronLeft, ChevronRight, HelpCircle, Plus, Save, Palette, Type } from 'lucide-react';

var STYLES = ['Professional','Bold','Minimal','Vibrant'];
var NICHES = ['General','Fitness','Crypto','Travel','Beauty','Health','Finance','Tech','Real Estate','Education'];
var SLIDE_COUNTS = [6,8,10,12,15];

var TEMPLATES = [
  { key:'opportunity', title:'The Opportunity', desc:'Full comp plan walkthrough with your earnings', slides:10, grad:'linear-gradient(135deg,#1e1b4b,#4338ca)', badge:'Popular' },
  { key:'income_proof', title:'Income Proof', desc:'Auto-populated with your actual earnings', slides:8, grad:'linear-gradient(135deg,#064e3b,#10b981)' },
  { key:'ai_tools', title:'AI Tools Demo', desc:'Showcase SuperScene, LinkHub, SuperSeller', slides:12, grad:'linear-gradient(135deg,#831843,#ec4899)' },
  { key:'team_training', title:'Team Training', desc:'Onboard new recruits step by step', slides:15, grad:'linear-gradient(135deg,#78350f,#f59e0b)' },
  { key:'crypto_niche', title:'Crypto Niche Pitch', desc:'Tailored for crypto/DeFi audience', slides:10, grad:'linear-gradient(135deg,#0c4a6e,#0ea5e9)' },
  { key:'blank', title:'Blank Canvas', desc:'Build your own deck from scratch', slides:1, grad:'linear-gradient(135deg,#1a1a2e,#16213e)' },
];

var LAYOUT_COLORS = {
  title: { bg:'#1e1b4b', text:'#fff', accent:'#818cf8' },
  content: { bg:'#fff', text:'#1e293b', accent:'#6366f1' },
  stats: { bg:'#0f172a', text:'#fff', accent:'#4ade80' },
  quote: { bg:'#f8fafc', text:'#1e293b', accent:'#8b5cf6' },
  closing: { bg:'#1e1b4b', text:'#fff', accent:'#0ea5e9' },
  'two-column': { bg:'#fff', text:'#1e293b', accent:'#6366f1' },
};

export default function SuperDeckPage() {
  var [sp] = useSearchParams();
  var [tab, setTab] = useState(sp.get('tab') || 'generate');
  var [prompt, setPrompt] = useState('');
  var [slideCount, setSlideCount] = useState(10);
  var [style, setStyle] = useState('Professional');
  var [niche, setNiche] = useState('General');
  var [generating, setGenerating] = useState(false);
  var [error, setError] = useState('');
  var [decks, setDecks] = useState([]);
  var [loadingDecks, setLoadingDecks] = useState(false);
  var [currentDeck, setCurrentDeck] = useState(null);
  var [currentSlide, setCurrentSlide] = useState(0);
  var [copied, setCopied] = useState(false);
  var [showHelp, setShowHelp] = useState(false);
  var [saving, setSaving] = useState(false);
  var [editingTitle, setEditingTitle] = useState(false);

  function updateSlideField(slideIdx, field, value) {
    if (!currentDeck) return;
    var newSlides = currentDeck.slides.map(function(s, i) {
      if (i !== slideIdx) return s;
      var copy = Object.assign({}, s);
      copy[field] = value;
      return copy;
    });
    setCurrentDeck(Object.assign({}, currentDeck, { slides: newSlides }));
  }

  function updateBullet(slideIdx, bulletIdx, value) {
    if (!currentDeck) return;
    var newSlides = currentDeck.slides.map(function(s, i) {
      if (i !== slideIdx) return s;
      var copy = Object.assign({}, s);
      copy.bullets = (copy.bullets || []).map(function(b, bi) { return bi === bulletIdx ? value : b; });
      return copy;
    });
    setCurrentDeck(Object.assign({}, currentDeck, { slides: newSlides }));
  }

  function addBullet(slideIdx) {
    if (!currentDeck) return;
    var newSlides = currentDeck.slides.map(function(s, i) {
      if (i !== slideIdx) return s;
      var copy = Object.assign({}, s);
      copy.bullets = (copy.bullets || []).concat(['New point']);
      return copy;
    });
    setCurrentDeck(Object.assign({}, currentDeck, { slides: newSlides }));
  }

  function removeBullet(slideIdx, bulletIdx) {
    if (!currentDeck) return;
    var newSlides = currentDeck.slides.map(function(s, i) {
      if (i !== slideIdx) return s;
      var copy = Object.assign({}, s);
      copy.bullets = (copy.bullets || []).filter(function(_, bi) { return bi !== bulletIdx; });
      return copy;
    });
    setCurrentDeck(Object.assign({}, currentDeck, { slides: newSlides }));
  }

  function addSlide() {
    if (!currentDeck) return;
    var newSlide = { title: 'New Slide', bullets: ['Point 1', 'Point 2', 'Point 3'], notes: '', layout: 'content' };
    var newSlides = currentDeck.slides.concat([newSlide]);
    setCurrentDeck(Object.assign({}, currentDeck, { slides: newSlides, slide_count: newSlides.length }));
    setCurrentSlide(newSlides.length - 1);
  }

  function removeSlide(idx) {
    if (!currentDeck || currentDeck.slides.length <= 1) return;
    var newSlides = currentDeck.slides.filter(function(_, i) { return i !== idx; });
    setCurrentDeck(Object.assign({}, currentDeck, { slides: newSlides, slide_count: newSlides.length }));
    if (currentSlide >= newSlides.length) setCurrentSlide(newSlides.length - 1);
  }

  function changeLayout(slideIdx, layout) {
    updateSlideField(slideIdx, 'layout', layout);
  }

  function saveDeck() {
    if (!currentDeck || !currentDeck.id) return;
    setSaving(true);
    apiPut('/api/superdeck/' + currentDeck.id, {
      title: currentDeck.title,
      slides: currentDeck.slides,
    }).then(function() { setSaving(false); loadDecks(); })
      .catch(function() { setSaving(false); });
  }

  function loadDecks() {
    setLoadingDecks(true);
    apiGet('/api/superdeck/list').then(function(r) { setDecks(r || []); setLoadingDecks(false); })
      .catch(function() { setLoadingDecks(false); });
  }

  useEffect(function() { loadDecks(); }, []);

  function generate() {
    if (!prompt.trim()) { setError('Please describe what your presentation should be about'); return; }
    setGenerating(true); setError('');
    apiPost('/api/superdeck/generate', {
      prompt: prompt, slide_count: slideCount,
      style: style.toLowerCase(), niche: niche.toLowerCase(),
    }).then(function(r) {
      if (r.success) {
        setCurrentDeck({ id:r.deck_id, title:r.title, slides:r.slides, share_token:r.share_token, slide_count:r.slide_count });
        setCurrentSlide(0);
        setTab('editor');
        loadDecks();
      } else {
        setError(r.error || 'Generation failed');
      }
      setGenerating(false);
    }).catch(function(e) { setError(e.message || 'Generation failed'); setGenerating(false); });
  }

  function generateFromTemplate(tmpl) {
    var prompts = {
      opportunity: 'A comprehensive SuperAdPro opportunity presentation covering the 5 income streams, compensation plan, 8x8 grid system, AI tools, and why someone should join today',
      income_proof: 'An income proof presentation showcasing real earnings potential from SuperAdPro — membership commissions, grid earnings, SuperScene sponsor income, with compelling statistics',
      ai_tools: 'A demo presentation showcasing SuperAdPro AI tools — SuperScene video/image/music creator, LinkHub bio page builder, SuperSeller AI sales autopilot, and SuperPages funnel builder',
      team_training: 'A team training and onboarding guide for new SuperAdPro members covering account setup, referral sharing, campaign tiers, Watch-to-Earn, and building their network',
      crypto_niche: 'A pitch deck targeting crypto and DeFi enthusiasts — emphasising USDT payments, blockchain transparency, decentralised earning, and SuperAdPro as a Web3-friendly platform',
    };
    if (tmpl.key === 'blank') {
      setCurrentDeck({ id:null, title:'Untitled Deck', slides:[{title:'Slide 1',bullets:[],notes:'',layout:'title'}], share_token:null, slide_count:1 });
      setCurrentSlide(0); setTab('editor');
      return;
    }
    setPrompt(prompts[tmpl.key] || tmpl.desc);
    setSlideCount(tmpl.slides);
    setTab('generate');
  }

  function openDeck(d) {
    apiGet('/api/superdeck/' + d.id).then(function(r) {
      setCurrentDeck({ id:r.id, title:r.title, slides:r.slides || [], share_token:r.share_token, slide_count:r.slide_count });
      setCurrentSlide(0); setTab('editor');
    });
  }

  function deleteDeck(id) {
    if (!confirm('Delete this deck?')) return;
    apiDelete('/api/superdeck/' + id).then(function() { loadDecks(); });
  }

  function copyShareLink() {
    if (!currentDeck || !currentDeck.share_token) return;
    navigator.clipboard.writeText('https://www.superadpro.com/deck/' + currentDeck.share_token);
    setCopied(true); setTimeout(function() { setCopied(false); }, 2000);
  }

  function downloadPptx() {
    if (!currentDeck || !currentDeck.id) return;
    window.open('/api/superdeck/' + currentDeck.id + '/download', '_blank');
  }

  var slide = currentDeck && currentDeck.slides && currentDeck.slides[currentSlide];
  var lc = slide ? (LAYOUT_COLORS[slide.layout] || LAYOUT_COLORS.content) : LAYOUT_COLORS.content;

  return (
    <AppLayout title="SuperDeck" subtitle="AI Presentation Studio"
      topbarActions={
        <button onClick={function() { setShowHelp(!showHelp); }} style={{ padding:'7px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#64748b', display:'flex', alignItems:'center', gap:4 }}><HelpCircle size={14}/> Help</button>
      }>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e293b,#334155)', borderRadius:18, padding:'28px 34px 22px', marginBottom:18, textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(56,189,248,.08)' }}/>
        <div style={{ position:'absolute', bottom:-20, left:-20, width:90, height:90, borderRadius:'50%', background:'rgba(99,102,241,.08)' }}/>
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:6 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#3b82f6,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Monitor size={24} color="#fff"/>
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#fff' }}>SuperDeck</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>AI Presentation Studio</div>
          </div>
        </div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,.55)', marginTop:6 }}>Create stunning pitch decks in seconds — branded, personalised, ready to present</div>
      </div>

      {/* Tab Bar */}
      <div style={{ display:'flex', gap:2, background:'linear-gradient(135deg,#172554,#1e3a8a)', border:'1px solid rgba(56,189,248,.15)', borderRadius:11, padding:4, marginBottom:18 }}>
        {[
          { k:'generate', l:'AI Generate', icon:Sparkles },
          { k:'templates', l:'Templates', icon:LayoutGrid },
          { k:'decks', l:'My Decks', icon:FolderOpen },
          { k:'editor', l:'Editor', icon:Edit3 },
        ].map(function(t) {
          var on = tab === t.k;
          var Icon = t.icon;
          return <button key={t.k} onClick={function() { setTab(t.k); }} style={{
            flex:1, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer',
            fontSize:14, fontWeight: on ? 700 : 600, fontFamily:'inherit', textAlign:'center',
            background: on ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)' : 'transparent',
            color: on ? '#fff' : 'rgba(255,255,255,.45)',
            boxShadow: on ? '0 3px 12px rgba(56,189,248,.3)' : 'none',
            transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}><Icon size={16}/> {t.l}</button>;
        })}
      </div>

      {/* AI GENERATE TAB */}
      {tab === 'generate' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'24px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'rgba(99,102,241,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles size={24} color="#6366f1"/>
            </div>
            <div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800 }}>Generate with AI</div>
              <div style={{ fontSize:14, color:'#64748b' }}>Describe your deck and AI builds it in seconds</div>
            </div>
          </div>

          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#475569', marginBottom:6 }}>What's your presentation about?</div>
            <textarea value={prompt} onChange={function(e) { setPrompt(e.target.value); }}
              placeholder="e.g. A 10-slide pitch deck for recruiting fitness coaches into SuperAdPro, highlighting the comp plan, AI tools, and income potential"
              style={{ width:'100%', height:80, border:'1.5px solid #e2e8f0', borderRadius:10, padding:'12px 14px', fontSize:14, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', outline:'none' }}/>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, margin:'14px 0' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:4 }}>Slides</div>
                <select value={slideCount} onChange={function(e) { setSlideCount(parseInt(e.target.value)); }}
                  style={{ width:'100%', padding:'9px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, fontFamily:'inherit' }}>
                  {SLIDE_COUNTS.map(function(n) { return <option key={n} value={n}>{n} slides</option>; })}
                </select>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:4 }}>Style</div>
                <select value={style} onChange={function(e) { setStyle(e.target.value); }}
                  style={{ width:'100%', padding:'9px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, fontFamily:'inherit' }}>
                  {STYLES.map(function(s) { return <option key={s}>{s}</option>; })}
                </select>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:4 }}>Niche</div>
                <select value={niche} onChange={function(e) { setNiche(e.target.value); }}
                  style={{ width:'100%', padding:'9px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, fontFamily:'inherit' }}>
                  {NICHES.map(function(n) { return <option key={n}>{n}</option>; })}
                </select>
              </div>
            </div>

            {error && <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, fontSize:13, fontWeight:600, color:'#dc2626', marginBottom:10 }}>{error}</div>}

            <button onClick={generate} disabled={generating}
              style={{ width:'100%', padding:'14px 20px', borderRadius:10, border:'none', cursor: generating ? 'wait' : 'pointer',
                fontFamily:'inherit', fontSize:16, fontWeight:700, color:'#fff',
                background: generating ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#818cf8)',
                boxShadow: generating ? 'none' : '0 4px 16px rgba(99,102,241,.3)',
                marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {generating ? (
                <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Generating...</>
              ) : (
                <><Sparkles size={18}/> Generate Deck — 3 credits</>
              )}
            </button>
          </div>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === 'templates' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {TEMPLATES.map(function(t) {
            return <div key={t.key} onClick={function() { generateFromTemplate(t); }}
              style={{ borderRadius:14, overflow:'hidden', cursor:'pointer', border:'2px solid transparent', transition:'all .15s', background:'#fff' }}
              onMouseEnter={function(e) { e.currentTarget.style.borderColor='#3b82f6'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'; }}
              onMouseLeave={function(e) { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ background:t.grad, aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{t.title}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>{t.slides} slides</div>
                </div>
                {t.badge && <div style={{ position:'absolute', top:8, right:8, padding:'3px 10px', borderRadius:6, fontSize:10, fontWeight:700, background:'rgba(0,0,0,.5)', color:'#fff' }}>{t.badge}</div>}
              </div>
              <div style={{ padding:'12px 14px', borderTop:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{t.title}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{t.desc}</div>
              </div>
            </div>;
          })}
        </div>
      )}

      {/* MY DECKS TAB */}
      {tab === 'decks' && (
        <div>
          {loadingDecks ? (
            <div style={{ textAlign:'center', padding:60 }}>
              <div style={{ width:36, height:36, border:'3px solid #e5e7eb', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : decks.length === 0 ? (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'50px 24px', textAlign:'center' }}>
              <Monitor size={40} color="#cbd5e1" style={{ margin:'0 auto 12px', display:'block' }}/>
              <div style={{ fontSize:17, fontWeight:700, color:'#475569', marginBottom:6 }}>No decks yet</div>
              <div style={{ fontSize:14, color:'#94a3b8' }}>Generate your first deck with AI or start from a template</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {decks.map(function(d) {
                return <div key={d.id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={function(e) { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.08)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}>
                  <div onClick={function() { openDeck(d); }} style={{ background:'linear-gradient(135deg,#1e1b4b,#4338ca)', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#fff', textAlign:'center', padding:'0 16px' }}>{d.title}</div>
                  </div>
                  <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{d.title.slice(0, 40)}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{d.slide_count} slides · {d.views || 0} views</div>
                    </div>
                    <button onClick={function(e) { e.stopPropagation(); deleteDeck(d.id); }}
                      style={{ padding:6, borderRadius:6, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer' }}>
                      <Trash2 size={14} color="#94a3b8"/>
                    </button>
                  </div>
                </div>;
              })}
            </div>
          )}
        </div>
      )}

      {/* EDITOR TAB */}
      {tab === 'editor' && (
        <div>
          {!currentDeck ? (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'50px 24px', textAlign:'center' }}>
              <Edit3 size={40} color="#cbd5e1" style={{ margin:'0 auto 12px', display:'block' }}/>
              <div style={{ fontSize:17, fontWeight:700, color:'#475569', marginBottom:6 }}>No deck open</div>
              <div style={{ fontSize:14, color:'#94a3b8' }}>Generate a deck or open one from My Decks</div>
            </div>
          ) : (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:18 }}>
              {/* Toolbar */}
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
                {editingTitle ? (
                  <input value={currentDeck.title} autoFocus
                    onChange={function(e) { setCurrentDeck(Object.assign({}, currentDeck, { title: e.target.value })); }}
                    onBlur={function() { setEditingTitle(false); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') setEditingTitle(false); }}
                    style={{ flex:1, fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', border:'1.5px solid #6366f1', borderRadius:8, padding:'6px 12px', outline:'none' }}/>
                ) : (
                  <div onClick={function() { setEditingTitle(true); }} style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', flex:1, cursor:'pointer', padding:'6px 0', borderBottom:'1px dashed #cbd5e1' }} title="Click to edit title">{currentDeck.title}</div>
                )}
                <button onClick={saveDeck} disabled={saving || !currentDeck.id}
                  style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #10b981', background: saving ? '#d1fae5' : '#f0fdf4', cursor:'pointer', fontSize:12, fontWeight:600, color:'#059669', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                  <Save size={14}/> {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={downloadPptx} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#475569', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                  <Download size={14}/> Export PPTX
                </button>
                <button onClick={copyShareLink} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:'#fff', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4, background:'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                  {copied ? <><Check size={14}/> Copied</> : <><ExternalLink size={14}/> Share link</>}
                </button>
              </div>

              {/* Editor Layout */}
              <div style={{ display:'grid', gridTemplateColumns:'180px 1fr 240px', gap:14 }}>
                {/* Slide Thumbnails */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:500, overflowY:'auto' }}>
                  {currentDeck.slides.map(function(s, i) {
                    var slc = LAYOUT_COLORS[s.layout] || LAYOUT_COLORS.content;
                    var on = currentSlide === i;
                    return <div key={i} style={{ position:'relative' }}>
                      <div onClick={function() { setCurrentSlide(i); }}
                        style={{ aspectRatio:'16/9', borderRadius:8, background:slc.bg, border: on ? '2.5px solid #3b82f6' : '2px solid transparent', cursor:'pointer', position:'relative', overflow:'hidden', padding:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ fontSize:8, fontWeight:700, color:slc.text, textAlign:'center', opacity:.8, overflow:'hidden', maxHeight:'100%' }}>{s.title}</div>
                        <div style={{ position:'absolute', bottom:3, left:6, fontSize:9, fontWeight:700, color:slc.text, opacity:.5 }}>{i + 1}</div>
                      </div>
                      {currentDeck.slides.length > 1 && on && (
                        <button onClick={function(e) { e.stopPropagation(); removeSlide(i); }}
                          style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', border:'none', background:'#ef4444', color:'#fff', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                      )}
                    </div>;
                  })}
                  <button onClick={addSlide}
                    style={{ aspectRatio:'16/9', borderRadius:8, border:'2px dashed #cbd5e1', background:'#f8fafc', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#94a3b8' }}>
                    <Plus size={18}/>
                  </button>
                </div>

                {/* Main Canvas — editable */}
                <div>
                  <div style={{ aspectRatio:'16/9', borderRadius:12, background:lc.bg, border:'1px solid #e2e8f0', position:'relative', overflow:'hidden', padding:'24px 32px', display:'flex', flexDirection:'column' }}>
                    {slide && slide.layout === 'title' ? (
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        <input value={slide.title} onChange={function(e) { updateSlideField(currentSlide, 'title', e.target.value); }}
                          style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:lc.text, textAlign:'center', background:'transparent', border:'none', outline:'none', width:'100%', marginBottom:8 }}/>
                        <input value={(slide.bullets && slide.bullets[0]) || ''} onChange={function(e) { updateBullet(currentSlide, 0, e.target.value); }}
                          placeholder="Subtitle..."
                          style={{ fontSize:15, color:lc.accent, textAlign:'center', background:'transparent', border:'none', outline:'none', width:'100%' }}/>
                      </div>
                    ) : slide && slide.layout === 'closing' ? (
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        <input value={slide.title} onChange={function(e) { updateSlideField(currentSlide, 'title', e.target.value); }}
                          style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:lc.text, textAlign:'center', background:'transparent', border:'none', outline:'none', width:'100%', marginBottom:12 }}/>
                        {slide.bullets && slide.bullets.map(function(b, bi) {
                          return <input key={bi} value={b} onChange={function(e) { updateBullet(currentSlide, bi, e.target.value); }}
                            style={{ fontSize:14, color:'rgba(255,255,255,.6)', textAlign:'center', background:'transparent', border:'none', outline:'none', width:'100%', marginBottom:4 }}/>;
                        })}
                      </div>
                    ) : slide && slide.layout === 'stats' ? (
                      <>
                        <input value={slide.title} onChange={function(e) { updateSlideField(currentSlide, 'title', e.target.value); }}
                          style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:lc.text, background:'transparent', border:'none', outline:'none', width:'100%', marginBottom:16 }}/>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, flex:1 }}>
                          {slide.bullets && slide.bullets.map(function(b, bi) {
                            return <div key={bi} style={{ background:'rgba(255,255,255,.06)', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <input value={b} onChange={function(e) { updateBullet(currentSlide, bi, e.target.value); }}
                                style={{ fontSize:14, fontWeight:600, color:lc.accent, textAlign:'center', background:'transparent', border:'none', outline:'none', width:'100%' }}/>
                            </div>;
                          })}
                        </div>
                      </>
                    ) : slide ? (
                      <>
                        <input value={slide.title} onChange={function(e) { updateSlideField(currentSlide, 'title', e.target.value); }}
                          style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:lc.accent, background:'transparent', border:'none', outline:'none', width:'100%', marginBottom:14 }}/>
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                          {slide.bullets && slide.bullets.map(function(b, bi) {
                            return <div key={bi} style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <div style={{ width:6, height:6, borderRadius:'50%', background:lc.accent, flexShrink:0 }}/>
                              <input value={b} onChange={function(e) { updateBullet(currentSlide, bi, e.target.value); }}
                                style={{ fontSize:14, color:lc.text, background:'transparent', border:'none', outline:'none', flex:1 }}/>
                              <button onClick={function() { removeBullet(currentSlide, bi); }}
                                style={{ width:18, height:18, borderRadius:'50%', border:'none', background:'rgba(239,68,68,.15)', color:'#ef4444', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
                            </div>;
                          })}
                          <button onClick={function() { addBullet(currentSlide); }}
                            style={{ fontSize:12, color:lc.accent, background:'transparent', border:'1px dashed '+(lc.bg === '#fff' ? '#cbd5e1' : 'rgba(255,255,255,.2)'), borderRadius:6, padding:'6px 12px', cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>+ Add point</button>
                        </div>
                      </>
                    ) : null}
                    <div style={{ position:'absolute', bottom:8, right:14, fontSize:10, color:'rgba(148,163,184,.5)' }}>{currentSlide + 1} / {currentDeck.slides.length}</div>
                  </div>

                  {/* Navigation */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:10 }}>
                    <button onClick={function() { setCurrentSlide(Math.max(0, currentSlide - 1)); }}
                      disabled={currentSlide === 0}
                      style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', gap:4, opacity: currentSlide === 0 ? .4 : 1 }}>
                      <ChevronLeft size={16}/> Previous
                    </button>
                    <span style={{ fontSize:14, fontWeight:600, color:'#64748b' }}>Slide {currentSlide + 1} of {currentDeck.slides.length}</span>
                    <button onClick={function() { setCurrentSlide(Math.min(currentDeck.slides.length - 1, currentSlide + 1)); }}
                      disabled={currentSlide === currentDeck.slides.length - 1}
                      style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', gap:4, opacity: currentSlide === currentDeck.slides.length - 1 ? .4 : 1 }}>
                      Next <ChevronRight size={16}/>
                    </button>
                  </div>
                </div>

                {/* Right Panel — Slide Properties */}
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {/* Layout Selector */}
                  <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}><Palette size={13}/> Slide layout</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                      {['title','content','stats','two-column','quote','closing'].map(function(l) {
                        var on2 = slide && slide.layout === l;
                        var llc = LAYOUT_COLORS[l] || LAYOUT_COLORS.content;
                        return <button key={l} onClick={function() { changeLayout(currentSlide, l); }}
                          style={{ padding:'6px 8px', borderRadius:6, border: on2 ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: on2 ? '#eff6ff' : '#fff', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight: on2 ? 700 : 500, color: on2 ? '#1d4ed8' : '#64748b', textTransform:'capitalize' }}>{l}</button>;
                      })}
                    </div>
                  </div>

                  {/* Speaker Notes */}
                  <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}><Type size={13}/> Speaker notes</div>
                    <textarea value={(slide && slide.notes) || ''} onChange={function(e) { updateSlideField(currentSlide, 'notes', e.target.value); }}
                      placeholder="Add speaker notes..."
                      style={{ width:'100%', height:120, border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', fontSize:12, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.6, background:'#fff' }}/>
                  </div>

                  {/* Quick Tips */}
                  <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#1e40af', marginBottom:4 }}>Tips</div>
                    <div style={{ fontSize:11, color:'#3b82f6', lineHeight:1.6 }}>
                      Click any text on the slide to edit it directly. Use the layout selector to change how content is arranged. Save your changes before exporting.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </AppLayout>
  );
}
