import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import {
  Plus, Trash2, Copy, Download, Save, ArrowLeft, Sparkles, Monitor,
  ChevronDown, Play, X, Type, Image, BarChart3, Quote, List, Columns,
  MousePointerClick, Loader2, ChevronLeft, ChevronRight, FileText, Wand2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Palette,
  Upload, Minus, PlusCircle
} from 'lucide-react';

var THEMES = {
  midnight: { name:'Midnight', bg:'#0f172a', card:'#1e293b', accent:'#8b5cf6', text:'#f8fafc', muted:'#94a3b8', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  ocean:    { name:'Ocean', bg:'#0c4a6e', card:'#0e5a85', accent:'#38bdf8', text:'#f0f9ff', muted:'#7dd3fc', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  forest:   { name:'Forest', bg:'#14532d', card:'#166534', accent:'#4ade80', text:'#f0fdf4', muted:'#86efac', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  coral:    { name:'Coral', bg:'#7f1d1d', card:'#991b1b', accent:'#fb923c', text:'#fff7ed', muted:'#fdba74', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  charcoal: { name:'Charcoal', bg:'#18181b', card:'#27272a', accent:'#fbbf24', text:'#fafafa', muted:'#a1a1aa', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  clean:    { name:'Clean White', bg:'#ffffff', card:'#f1f5f9', accent:'#3b82f6', text:'#0f172a', muted:'#64748b', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  lavender: { name:'Lavender', bg:'#1e1b4b', card:'#312e81', accent:'#c4b5fd', text:'#ede9fe', muted:'#a78bfa', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  sunset:   { name:'Sunset', bg:'#431407', card:'#7c2d12', accent:'#f97316', text:'#fff7ed', muted:'#fb923c', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
};
var THEME_KEYS = Object.keys(THEMES);

var LAYOUTS = [
  { key:'title', name:'Title', icon:Type, desc:'Big heading + subtitle' },
  { key:'content', name:'Content', icon:FileText, desc:'Heading + body' },
  { key:'two_column', name:'Two Column', icon:Columns, desc:'Side by side' },
  { key:'bullets', name:'Bullets', icon:List, desc:'Bullet points' },
  { key:'stats', name:'Stats', icon:BarChart3, desc:'Big numbers' },
  { key:'quote', name:'Quote', icon:Quote, desc:'Centred quote' },
  { key:'image_text', name:'Image+Text', icon:Image, desc:'Image & text' },
  { key:'cta', name:'CTA', icon:MousePointerClick, desc:'Call to action' },
];

function defaultSlide(layout) {
  var s = { id:'sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), layout:layout, notes:'' };
  if (layout==='title') Object.assign(s,{heading:'Your Presentation Title',subtitle:'Click any text to edit'});
  else if (layout==='content') Object.assign(s,{heading:'Slide Heading',body:'Add your content here. Click to edit.'});
  else if (layout==='two_column') Object.assign(s,{heading:'Two Columns',col1_text:'Left column content.',col2_text:'Right column content.'});
  else if (layout==='bullets') Object.assign(s,{heading:'Key Points',bullets:['First point','Second point','Third point']});
  else if (layout==='stats') Object.assign(s,{heading:'Key Metrics',stats:[{value:'85%',label:'Growth'},{value:'10K+',label:'Users'},{value:'99%',label:'Uptime'}]});
  else if (layout==='quote') Object.assign(s,{quote_text:'The best way to predict the future is to create it.',attribution:'Peter Drucker'});
  else if (layout==='image_text') Object.assign(s,{heading:'Image & Text',body:'Your content here.',image_url:''});
  else if (layout==='cta') Object.assign(s,{heading:'Get Started Today',subtitle:'Join thousands building their future',cta_text:'Sign Up Now'});
  return s;
}

function SlideRenderer({slide,theme,scale,editable,onUpdate}) {
  var t=theme; var fs=scale||1;
  function ep(field) {
    if (!editable) return {};
    return { contentEditable:true, suppressContentEditableWarning:true,
      onBlur:function(e){var u={};u[field]=e.currentTarget.innerText;onUpdate(u);},
      onFocus:function(e){e.currentTarget.style.background='rgba(139,92,246,0.12)';e.currentTarget.style.outline='2px solid #8b5cf6';},
      onBlurCapture:function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.outline='none';},
      style:{cursor:'text',outline:'none',borderRadius:4}
    };
  }
  var box={width:'100%',height:'100%',background:slide.background||t.bg,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:(40*fs)+'px',boxSizing:'border-box',fontFamily:slide.fontFamily||t.bf,overflow:'hidden',position:'relative'};
  var tc=slide.textColor||t.text;
  var mc=slide.textColor?slide.textColor+'99':t.muted;
  var ac=slide.accentColor||t.accent;
  var hs=slide.headingSize||42;
  var fw=slide.bold?800:800;
  var fst=slide.italic?'italic':'normal';
  var td=slide.underline?'underline':'none';
  var ta=slide.textAlign||'center';
  var h1={fontFamily:slide.fontFamily||t.hf,fontSize:(hs*fs)+'px',fontWeight:fw,fontStyle:fst,textDecoration:td,color:tc,textAlign:ta,lineHeight:1.2,marginBottom:(12*fs)+'px',width:'100%'};
  var sub={fontSize:(20*fs)+'px',color:mc,textAlign:ta,lineHeight:1.5,width:'100%'};
  var bod={fontSize:(18*fs)+'px',color:mc,lineHeight:1.7,width:'100%',textAlign:slide.textAlign==='center'?'center':slide.textAlign==='right'?'right':'left'};

  if (slide.layout==='title') return (
    <div style={box}>
      <div {...ep('heading')} style={{...h1,fontSize:(56*fs)+'px',marginBottom:(20*fs)+'px'}}>{slide.heading||''}</div>
      <div {...ep('subtitle')} style={{...sub,fontSize:(24*fs)+'px'}}>{slide.subtitle||''}</div>
    </div>
  );
  if (slide.layout==='content') return (
    <div style={{...box,alignItems:'flex-start',justifyContent:'flex-start',paddingTop:(60*fs)+'px'}}>
      <div {...ep('heading')} style={{...h1,textAlign:'left',fontSize:(38*fs)+'px',marginBottom:(24*fs)+'px'}}>{slide.heading||''}</div>
      <div {...ep('body')} style={bod}>{slide.body||''}</div>
    </div>
  );
  if (slide.layout==='two_column') return (
    <div style={{...box,alignItems:'flex-start',justifyContent:'flex-start',paddingTop:(50*fs)+'px'}}>
      <div {...ep('heading')} style={{...h1,textAlign:'left',fontSize:(36*fs)+'px',marginBottom:(30*fs)+'px'}}>{slide.heading||''}</div>
      <div style={{display:'flex',gap:(30*fs)+'px',width:'100%',flex:1}}>
        <div {...ep('col1_text')} style={{...bod,flex:1,background:t.card,borderRadius:(12*fs)+'px',padding:(24*fs)+'px'}}>{slide.col1_text||''}</div>
        <div {...ep('col2_text')} style={{...bod,flex:1,background:t.card,borderRadius:(12*fs)+'px',padding:(24*fs)+'px'}}>{slide.col2_text||''}</div>
      </div>
    </div>
  );
  if (slide.layout==='bullets') return (
    <div style={{...box,alignItems:'flex-start',justifyContent:'flex-start',paddingTop:(50*fs)+'px'}}>
      <div {...ep('heading')} style={{...h1,textAlign:'left',fontSize:(38*fs)+'px',marginBottom:(28*fs)+'px'}}>{slide.heading||''}</div>
      <div style={{width:'100%'}}>
        {(slide.bullets||[]).map(function(b,i){
          return <div key={i} style={{display:'flex',alignItems:'flex-start',gap:(14*fs)+'px',marginBottom:(16*fs)+'px'}}>
            <div style={{width:(10*fs)+'px',height:(10*fs)+'px',borderRadius:'50%',background:ac,marginTop:(8*fs)+'px',flexShrink:0}}/>
            <div contentEditable={editable} suppressContentEditableWarning
              onBlur={function(e){var nb=(slide.bullets||[]).slice();nb[i]=e.currentTarget.innerText;onUpdate({bullets:nb});}}
              onFocus={function(e){e.currentTarget.style.background='rgba(139,92,246,0.12)';e.currentTarget.style.outline='2px solid #8b5cf6';}}
              onBlurCapture={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.outline='none';}}
              style={{...bod,fontSize:(20*fs)+'px',outline:'none',cursor:editable?'text':'default'}}>{b}</div>
          </div>;
        })}
      </div>
    </div>
  );
  if (slide.layout==='stats') return (
    <div style={box}>
      <div {...ep('heading')} style={{...h1,fontSize:(36*fs)+'px',marginBottom:(40*fs)+'px'}}>{slide.heading||''}</div>
      <div style={{display:'flex',gap:(24*fs)+'px',width:'100%',justifyContent:'center'}}>
        {(slide.stats||[]).map(function(st,i){
          return <div key={i} style={{flex:1,background:t.card,borderRadius:(16*fs)+'px',padding:(28*fs)+'px',textAlign:'center',border:'1px solid '+ac+'22'}}>
            <div contentEditable={editable} suppressContentEditableWarning
              onBlur={function(e){var ns=(slide.stats||[]).slice();ns[i]={...ns[i],value:e.currentTarget.innerText};onUpdate({stats:ns});}}
              style={{fontSize:(48*fs)+'px',fontWeight:800,color:ac,fontFamily:t.hf,outline:'none',cursor:editable?'text':'default'}}>{st.value}</div>
            <div contentEditable={editable} suppressContentEditableWarning
              onBlur={function(e){var ns=(slide.stats||[]).slice();ns[i]={...ns[i],label:e.currentTarget.innerText};onUpdate({stats:ns});}}
              style={{fontSize:(16*fs)+'px',color:t.muted,marginTop:(8*fs)+'px',textTransform:'uppercase',letterSpacing:'0.05em',outline:'none',cursor:editable?'text':'default'}}>{st.label}</div>
          </div>;
        })}
      </div>
    </div>
  );
  if (slide.layout==='quote') return (
    <div style={box}>
      <div style={{fontSize:(80*fs)+'px',color:ac,lineHeight:1,marginBottom:(10*fs)+'px',fontFamily:'Georgia,serif'}}>\u201C</div>
      <div {...ep('quote_text')} style={{fontSize:(28*fs)+'px',color:t.text,textAlign:'center',lineHeight:1.6,fontStyle:'italic',maxWidth:'80%',fontFamily:'Georgia,serif'}}>{slide.quote_text||''}</div>
      <div {...ep('attribution')} style={{fontSize:(18*fs)+'px',color:t.muted,marginTop:(24*fs)+'px',textAlign:'center'}}>{slide.attribution||''}</div>
    </div>
  );
  if (slide.layout==='image_text') return (
    <div style={{...box,flexDirection:'row',gap:(30*fs)+'px',padding:(30*fs)+'px'}}>
      <div style={{flex:1,background:t.card,borderRadius:(12*fs)+'px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',minHeight:'100%'}}>
        {slide.image_url
          ? <img src={slide.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <div style={{textAlign:'center',padding:20}}><Image size={48*fs} color={t.muted}/><div style={{color:t.muted,fontSize:(14*fs)+'px',marginTop:8}}>Double-click to upload</div></div>
        }
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div {...ep('heading')} style={{...h1,textAlign:'left',fontSize:(34*fs)+'px',marginBottom:(16*fs)+'px'}}>{slide.heading||''}</div>
        <div {...ep('body')} style={bod}>{slide.body||''}</div>
      </div>
    </div>
  );
  if (slide.layout==='cta') {
    var isLight=t.bg==='#ffffff'||t.bg==='#f1f5f9';
    return (
      <div style={box}>
        <div {...ep('heading')} style={{...h1,fontSize:(48*fs)+'px',marginBottom:(16*fs)+'px'}}>{slide.heading||''}</div>
        <div {...ep('subtitle')} style={{...sub,fontSize:(22*fs)+'px',marginBottom:(36*fs)+'px',maxWidth:'70%'}}>{slide.subtitle||''}</div>
        <div {...ep('cta_text')} style={{display:'inline-block',padding:(14*fs)+'px '+(40*fs)+'px',background:ac,color:isLight?'#fff':'#0f172a',borderRadius:(12*fs)+'px',fontSize:(20*fs)+'px',fontWeight:700,fontFamily:t.hf,cursor:editable?'text':'default',outline:'none'}}>{slide.cta_text||'Get Started'}</div>
      </div>
    );
  }
  return <div style={box}><div style={{color:t.muted}}>Unknown layout</div></div>;
}

export default function SuperDeckEditor() {
  var p=useParams(),deckId=p.deckId,nav=useNavigate();
  var [slides,setSlides]=useState([]);
  var [active,setActive]=useState(0);
  var [theme,setTheme]=useState('midnight');
  var [title,setTitle]=useState('');
  var [saving,setSaving]=useState(false);
  var [dirty,setDirty]=useState(false);
  var [loaded,setLoaded]=useState(false);
  var [presenting,setPresenting]=useState(false);
  var [showThemes,setShowThemes]=useState(false);
  var [showAdd,setShowAdd]=useState(false);
  var [aiPrompt,setAiPrompt]=useState('');
  var [aiLoading,setAiLoading]=useState(false);
  var [showAi,setShowAi]=useState(false);
  var thRef=useRef(null),addRef=useRef(null);

  useEffect(function(){
    apiGet('/api/superdeck/'+deckId).then(function(d){
      var s=d.slides||[];if(s.length===0)s=[defaultSlide('title')];
      setSlides(s);setTheme(d.theme||'midnight');setTitle(d.title||'');setLoaded(true);
    }).catch(function(){nav('/superdeck');});
  },[deckId]);

  var t=THEMES[theme]||THEMES.midnight;
  var cs=slides[active]||defaultSlide('title');
  function mark(){setDirty(true);}

  var save=useCallback(function(){
    setSaving(true);
    apiPost('/api/superdeck/'+deckId+'/save',{title:title,theme:theme,slides:slides})
      .then(function(){setSaving(false);setDirty(false);}).catch(function(){setSaving(false);});
  },[deckId,title,theme,slides]);

  useEffect(function(){var iv=setInterval(function(){if(dirty)save();},15000);return function(){clearInterval(iv);};},[dirty,save]);
  useEffect(function(){
    function h(e){if(thRef.current&&!thRef.current.contains(e.target))setShowThemes(false);if(addRef.current&&!addRef.current.contains(e.target))setShowAdd(false);}
    document.addEventListener('mousedown',h);return function(){document.removeEventListener('mousedown',h);};
  },[]);

  function updateSlide(u){var ns=slides.slice();ns[active]=Object.assign({},ns[active],u);setSlides(ns);mark();}
  function addSlide(layout){var ns=slides.slice();ns.splice(active+1,0,defaultSlide(layout));setSlides(ns);setActive(active+1);setShowAdd(false);mark();}
  function dupSlide(i){var ns=slides.slice();var d=Object.assign({},ns[i],{id:'sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)});ns.splice(i+1,0,d);setSlides(ns);setActive(i+1);mark();}
  function delSlide(i){if(slides.length<=1)return;var ns=slides.filter(function(_,j){return j!==i;});setSlides(ns);if(active>=ns.length)setActive(ns.length-1);mark();}

  function generateAI(){
    if(!aiPrompt.trim()||aiLoading)return;setAiLoading(true);
    apiPost('/api/superdeck/ai-generate',{prompt:aiPrompt,slide_count:8}).then(function(r){
      if(r.success&&r.slides){
        var ns=r.slides.map(function(s){return Object.assign({},defaultSlide(s.layout||'content'),s,{id:'sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)});});
        setSlides(ns);setActive(0);setShowAi(false);setAiPrompt('');mark();
      }
      setAiLoading(false);
    }).catch(function(){setAiLoading(false);});
  }

  useEffect(function(){
    if(!presenting)return;
    function h(e){
      if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();setActive(function(a){return Math.min(a+1,slides.length-1);});}
      if(e.key==='ArrowLeft'){e.preventDefault();setActive(function(a){return Math.max(a-1,0);});}
      if(e.key==='Escape')setPresenting(false);
    }
    document.addEventListener('keydown',h);return function(){document.removeEventListener('keydown',h);};
  },[presenting,slides.length]);

  if(!loaded)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0f172a'}}><Loader2 size={32} color="#8b5cf6" style={{animation:'spin 1s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;

  if(presenting) return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={function(){setActive(function(a){return Math.min(a+1,slides.length-1);});}}>
      <div style={{width:'100vw',height:'100vh',maxWidth:'177.78vh',maxHeight:'56.25vw'}}>
        <SlideRenderer slide={cs} theme={t} scale={1} editable={false} onUpdate={function(){}}/>
      </div>
      <div style={{position:'fixed',bottom:20,right:20,background:'rgba(0,0,0,0.7)',borderRadius:8,padding:'6px 14px',display:'flex',alignItems:'center',gap:12}}
        onClick={function(e){e.stopPropagation();}}>
        <span style={{color:'#94a3b8',fontSize:13}}>{active+1}/{slides.length}</span>
        <button onClick={function(){setPresenting(false);}} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',display:'flex',padding:4}}><X size={16}/></button>
      </div>
    </div>
  );

  var btnS={background:'#334155',border:'none',color:'#e2e8f0',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:'inherit',padding:'7px 14px',borderRadius:6,fontWeight:600};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#f8fafc',fontFamily:"'DM Sans',sans-serif"}}>
      {/* TOOLBAR */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'#1e293b',borderBottom:'1px solid #334155',flexShrink:0}}>
        <button onClick={function(){if(dirty)save();nav('/superdeck');}} style={{...btnS,background:'none',color:'#94a3b8'}}
          onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='none';}}>
          <ArrowLeft size={14}/> Back</button>
        <div style={{width:1,height:24,background:'#334155'}}/>
        <input value={title} onChange={function(e){setTitle(e.target.value);mark();}}
          style={{background:'transparent',border:'none',color:'#f8fafc',fontSize:16,fontWeight:700,fontFamily:"'Sora',sans-serif",outline:'none',padding:'4px 8px',flex:1,maxWidth:300}} placeholder="Untitled"/>
        <div style={{flex:1}}/>

        <div ref={addRef} style={{position:'relative'}}>
          <button onClick={function(){setShowAdd(!showAdd);}} style={btnS}
            onMouseEnter={function(e){e.currentTarget.style.background='#475569';}} onMouseLeave={function(e){e.currentTarget.style.background='#334155';}}>
            <Plus size={14}/> Add Slide <ChevronDown size={12}/></button>
          {showAdd&&<div style={{position:'absolute',top:'100%',right:0,marginTop:6,background:'#1e293b',border:'1px solid #334155',borderRadius:12,boxShadow:'0 12px 40px rgba(0,0,0,0.4)',zIndex:50,width:240,padding:6}}>
            {LAYOUTS.map(function(l){return <div key={l.key} onClick={function(){addSlide(l.key);}}
              onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer'}}>
              <l.icon size={16} color="#8b5cf6"/><div><div style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{l.name}</div><div style={{fontSize:11,color:'#64748b'}}>{l.desc}</div></div>
            </div>;})}
          </div>}
        </div>

        <div ref={thRef} style={{position:'relative'}}>
          <button onClick={function(){setShowThemes(!showThemes);}} style={btnS}
            onMouseEnter={function(e){e.currentTarget.style.background='#475569';}} onMouseLeave={function(e){e.currentTarget.style.background='#334155';}}>
            <div style={{width:14,height:14,borderRadius:4,background:ac,border:'1px solid rgba(255,255,255,0.2)'}}/> {t.name} <ChevronDown size={12}/></button>
          {showThemes&&<div style={{position:'absolute',top:'100%',right:0,marginTop:6,background:'#1e293b',border:'1px solid #334155',borderRadius:12,boxShadow:'0 12px 40px rgba(0,0,0,0.4)',zIndex:50,width:200,padding:6}}>
            {THEME_KEYS.map(function(k){var th=THEMES[k];var sel=k===theme;return <div key={k} onClick={function(){setTheme(k);mark();setShowThemes(false);}}
              onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background=sel?'#334155':'transparent';}}
              style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,cursor:'pointer',background:sel?'#334155':'transparent'}}>
              <div style={{width:22,height:22,borderRadius:6,background:th.bg,border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:7,height:7,borderRadius:'50%',background:th.accent}}/></div>
              <span style={{fontSize:13,fontWeight:sel?700:500,color:sel?'#8b5cf6':'#cbd5e1'}}>{th.name}</span>
              {sel&&<span style={{marginLeft:'auto',color:'#8b5cf6',fontSize:14}}>\u2713</span>}
            </div>;})}
          </div>}
        </div>

        <button onClick={function(){setShowAi(!showAi);}} style={{...btnS,background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'#fff',fontWeight:700}}>
          <Sparkles size={14}/> AI Generate</button>
        <button onClick={function(){if(dirty)save();setPresenting(true);}} style={{...btnS,background:'#059669',color:'#fff',fontWeight:700}}
          onMouseEnter={function(e){e.currentTarget.style.background='#047857';}} onMouseLeave={function(e){e.currentTarget.style.background='#059669';}}>
          <Play size={14}/> Present</button>
        <button onClick={save} disabled={saving} style={{background:'none',border:'none',color:dirty?'#fbbf24':'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12,fontFamily:'inherit',padding:'6px 8px'}}>
          <Save size={14}/> {saving?'Saving...':dirty?'Unsaved':'Saved'}</button>
      </div>

      {showAi&&<div style={{padding:'16px 20px',background:'#1e1b4b',borderBottom:'1px solid #312e81',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <Wand2 size={20} color="#a78bfa"/>
        <input value={aiPrompt} onChange={function(e){setAiPrompt(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')generateAI();}}
          placeholder="Describe your presentation... e.g. 10-slide pitch deck for a fitness business"
          style={{flex:1,padding:'10px 16px',borderRadius:8,border:'1px solid #4c1d95',background:'#312e81',color:'#e2e8f0',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
        <button onClick={generateAI} disabled={aiLoading||!aiPrompt.trim()}
          style={{padding:'10px 24px',borderRadius:8,border:'none',background:aiLoading?'#64748b':'#8b5cf6',color:'#fff',fontSize:14,fontWeight:700,cursor:aiLoading?'default':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
          {aiLoading?<><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Generating...</>:<><Sparkles size={14}/> Generate Deck</>}</button>
        <button onClick={function(){setShowAi(false);}} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:4,display:'flex'}}><X size={18}/></button>
      </div>}

      <div style={{display:'flex',flex:1,minHeight:0}}>
        {/* LEFT PANEL */}
        <div style={{width:190,borderRight:'1px solid #e2e8f0',background:'#fff',padding:'10px 8px',overflowY:'auto',flexShrink:0}}>
          {slides.map(function(s,i){var isA=i===active;return <div key={s.id||i} style={{marginBottom:8}}>
            <div style={{display:'flex',gap:6,alignItems:'flex-start'}}>
              <span style={{fontSize:11,color:'#94a3b8',width:18,textAlign:'right',paddingTop:6,flexShrink:0,fontWeight:600}}>{i+1}</span>
              <div style={{flex:1}}>
                <div onClick={function(){setActive(i);}}
                  onMouseEnter={function(e){if(!isA)e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';}}
                  onMouseLeave={function(e){e.currentTarget.style.boxShadow=isA?'0 0 0 2px #8b5cf6':'none';}}
                  style={{borderRadius:6,overflow:'hidden',cursor:'pointer',boxShadow:isA?'0 0 0 2px #8b5cf6':'none',transition:'box-shadow 0.15s'}}>
                  <div style={{aspectRatio:'16/9',position:'relative',overflow:'hidden'}}>
                    <SlideRenderer slide={s} theme={t} scale={0.15} editable={false} onUpdate={function(){}}/>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:4,padding:'4px 2px 0'}}>
                  <button onClick={function(){dupSlide(i);}} title="Duplicate"
                    onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}
                    style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:4,borderRadius:4,display:'flex'}}><Copy size={13}/></button>
                  <button onClick={function(){delSlide(i);}} title="Delete"
                    onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';e.currentTarget.style.color='#dc2626';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#94a3b8';}}
                    style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:4,borderRadius:4,display:'flex'}}><Trash2 size={13}/></button>
                </div>
              </div>
            </div>
          </div>;})}
          <button onClick={function(){setShowAdd(true);}}
            onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.color='#8b5cf6';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#94a3b8';}}
            style={{width:'100%',padding:'10px 0',border:'2px dashed #cbd5e1',borderRadius:6,background:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginTop:4}}>
            <Plus size={14}/> Add slide</button>
        </div>

        {/* CENTRE CANVAS */}
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#e2e8f0',padding:20,minWidth:0}}>
          <div style={{width:'100%',maxWidth:960,aspectRatio:'16/9',borderRadius:6,overflow:'hidden',boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
            <SlideRenderer slide={cs} theme={t} scale={0.65} editable={true} onUpdate={updateSlide}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginTop:14}}>
            <button onClick={function(){setActive(Math.max(0,active-1));}} disabled={active===0}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',cursor:active>0?'pointer':'default',color:active>0?'#334155':'#cbd5e1',display:'flex'}}><ChevronLeft size={16}/></button>
            <span style={{fontSize:13,color:'#64748b',fontWeight:600}}>Slide {active+1} of {slides.length}</span>
            <button onClick={function(){setActive(Math.min(slides.length-1,active+1));}} disabled={active>=slides.length-1}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',cursor:active<slides.length-1?'pointer':'default',color:active<slides.length-1?'#334155':'#cbd5e1',display:'flex'}}><ChevronRight size={16}/></button>
          </div>
          <div style={{width:'100%',maxWidth:960,marginTop:12}}>
            <textarea value={cs.notes||''} onChange={function(e){updateSlide({notes:e.target.value});}} placeholder="Speaker notes..." rows={2}
              style={{width:'100%',padding:'10px 14px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,color:'#475569',fontSize:13,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',outline:'none'}}/>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:280,borderLeft:'1px solid #e2e8f0',background:'#fff',padding:16,overflowY:'auto',flexShrink:0}}>
          <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Slide Properties</div>

          {/* Text Formatting */}
          <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Text Formatting</div>
          <div style={{background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0',padding:'10px',marginBottom:16}}>
            {/* Font family */}
            <select value={cs.fontFamily||"'Sora',sans-serif"} onChange={function(e){updateSlide({fontFamily:e.target.value});}}
              style={{width:'100%',padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:12,color:'#0f172a',background:'#fff',fontFamily:'inherit',cursor:'pointer',marginBottom:8,appearance:'none',backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center',paddingRight:24}}>
              {["'Sora',sans-serif","'DM Sans',sans-serif","'Arial',sans-serif","'Georgia',serif","'Trebuchet MS',sans-serif","'Verdana',sans-serif","'Courier New',monospace"].map(function(f){
                return <option key={f} value={f}>{f.split("'")[1]||f.split(",")[0]}</option>;
              })}
            </select>

            {/* Font size + Bold/Italic/Underline */}
            <div style={{display:'flex',gap:4,marginBottom:8,alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',border:'1px solid #e2e8f0',borderRadius:6,overflow:'hidden',background:'#fff'}}>
                <button onClick={function(){updateSlide({headingSize:Math.max(16,(cs.headingSize||42)-2)});}}
                  style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',padding:'4px 6px',display:'flex'}}><Minus size={12}/></button>
                <span style={{fontSize:12,fontWeight:600,color:'#334155',padding:'0 4px',minWidth:24,textAlign:'center'}}>{cs.headingSize||42}</span>
                <button onClick={function(){updateSlide({headingSize:Math.min(80,(cs.headingSize||42)+2)});}}
                  style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',padding:'4px 6px',display:'flex'}}><PlusCircle size={12}/></button>
              </div>
              <div style={{display:'flex',gap:2,marginLeft:4}}>
                <button onClick={function(){updateSlide({bold:!cs.bold});}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background=cs.bold?'#ede9fe':'#fff';}}
                  style={{background:cs.bold?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 6px',cursor:'pointer',display:'flex',color:cs.bold?'#8b5cf6':'#64748b'}}><Bold size={14}/></button>
                <button onClick={function(){updateSlide({italic:!cs.italic});}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background=cs.italic?'#ede9fe':'#fff';}}
                  style={{background:cs.italic?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 6px',cursor:'pointer',display:'flex',color:cs.italic?'#8b5cf6':'#64748b'}}><Italic size={14}/></button>
                <button onClick={function(){updateSlide({underline:!cs.underline});}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background=cs.underline?'#ede9fe':'#fff';}}
                  style={{background:cs.underline?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 6px',cursor:'pointer',display:'flex',color:cs.underline?'#8b5cf6':'#64748b'}}><Underline size={14}/></button>
              </div>
            </div>

            {/* Text alignment */}
            <div style={{display:'flex',gap:2,marginBottom:8}}>
              {[{v:'left',I:AlignLeft},{v:'center',I:AlignCenter},{v:'right',I:AlignRight}].map(function(a){
                var sel=(cs.textAlign||'center')===a.v;
                return <button key={a.v} onClick={function(){updateSlide({textAlign:a.v});}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background=sel?'#ede9fe':'#fff';}}
                  style={{background:sel?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',cursor:'pointer',display:'flex',flex:1,justifyContent:'center',color:sel?'#8b5cf6':'#64748b'}}>
                  <a.I size={14}/></button>;
              })}
            </div>

            {/* Colours */}
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Text</span>
                <input type="color" value={cs.textColor||t.text} onChange={function(e){updateSlide({textColor:e.target.value});}}
                  style={{width:26,height:26,border:'2px solid #e2e8f0',borderRadius:5,cursor:'pointer',padding:1}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Accent</span>
                <input type="color" value={cs.accentColor||t.accent} onChange={function(e){updateSlide({accentColor:e.target.value});}}
                  style={{width:26,height:26,border:'2px solid #e2e8f0',borderRadius:5,cursor:'pointer',padding:1}}/>
              </div>
            </div>
          </div>

          {/* Image upload for image_text layout */}
          {cs.layout==='image_text'&&<div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Slide Image</div>
            <button onClick={function(){
              var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
              inp.onchange=function(){if(inp.files&&inp.files[0]){
                var fd=new FormData();fd.append('file',inp.files[0]);fd.append('folder','superdeck');
                fetch('/api/superdeck/upload-image',{method:'POST',body:fd,credentials:'include'})
                  .then(function(r){return r.json();}).then(function(d){if(d.url)updateSlide({image_url:d.url});});
              }};inp.click();
            }}
              onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
              style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              <Upload size={13} color="#8b5cf6"/> Upload image</button>
          </div>}

          {/* Add bullet point for bullets layout */}
          {cs.layout==='bullets'&&<div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Bullet Points</div>
            <button onClick={function(){var nb=(cs.bullets||[]).slice();nb.push('New point');updateSlide({bullets:nb});}}
              onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
              style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              <Plus size={13} color="#8b5cf6"/> Add bullet point</button>
          </div>}

          {/* Add stat for stats layout */}
          {cs.layout==='stats'&&<div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Statistics</div>
            <button onClick={function(){var ns=(cs.stats||[]).slice();ns.push({value:'0',label:'Label'});updateSlide({stats:ns});}}
              onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
              style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              <Plus size={13} color="#8b5cf6"/> Add stat</button>
          </div>}

          {/* Layout selector */}
          <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Layout</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:16}}>
            {LAYOUTS.map(function(l){var sel=cs.layout===l.key;return <div key={l.key} onClick={function(){updateSlide({layout:l.key});}}
              onMouseEnter={function(e){if(!sel)e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){if(!sel)e.currentTarget.style.background='#f8fafc';}}
              style={{padding:'8px 6px',borderRadius:6,cursor:'pointer',textAlign:'center',background:sel?'#ede9fe':'#f8fafc',border:sel?'1.5px solid #8b5cf6':'1px solid #e2e8f0',transition:'all 0.1s'}}>
              <l.icon size={16} color={sel?'#8b5cf6':'#94a3b8'} style={{margin:'0 auto 2px'}}/>
              <div style={{fontSize:10,fontWeight:600,color:sel?'#7c3aed':'#64748b'}}>{l.name}</div>
            </div>;})}
          </div>
          <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Background</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,padding:'8px 10px',background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0'}}>
            <input type="color" value={cs.background||t.bg} onChange={function(e){updateSlide({background:e.target.value});}}
              style={{width:32,height:32,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/>
            <span style={{fontSize:12,color:'#64748b',fontFamily:'monospace'}}>{cs.background||t.bg}</span>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:'#334155',marginBottom:6}}>Actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <button onClick={function(){dupSlide(active);}}
              onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
              style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              <Copy size={13} color="#8b5cf6"/> Duplicate slide</button>
            <button onClick={function(){delSlide(active);}}
              onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
              style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              <Trash2 size={13} color="#dc2626"/> Delete slide</button>
          </div>
        </div>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
