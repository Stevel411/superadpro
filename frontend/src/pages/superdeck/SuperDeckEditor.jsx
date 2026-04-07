import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import {
  Plus, Trash2, Copy, Save, ArrowLeft, Sparkles, ChevronDown, Play, X,
  Type, Image, Square, Circle, Loader2, ChevronLeft, ChevronRight, Wand2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  ArrowUp, ArrowDown, Upload, Minus, PlusCircle
} from 'lucide-react';

/* ── Themes ──────────────────────────────────────────── */
var THEMES = {
  midnight:  { name:'Midnight', bg:'#0f172a', accent:'#8b5cf6', text:'#f8fafc', muted:'#94a3b8', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  ocean:     { name:'Ocean', bg:'#0c4a6e', accent:'#38bdf8', text:'#f0f9ff', muted:'#7dd3fc', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  forest:    { name:'Forest', bg:'#14532d', accent:'#4ade80', text:'#f0fdf4', muted:'#86efac', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  coral:     { name:'Coral', bg:'#7f1d1d', accent:'#fb923c', text:'#fff7ed', muted:'#fdba74', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  charcoal:  { name:'Charcoal', bg:'#18181b', accent:'#fbbf24', text:'#fafafa', muted:'#a1a1aa', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  clean:     { name:'Clean White', bg:'#ffffff', accent:'#3b82f6', text:'#0f172a', muted:'#64748b', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  lavender:  { name:'Lavender', bg:'#1e1b4b', accent:'#c4b5fd', text:'#ede9fe', muted:'#a78bfa', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
  sunset:    { name:'Sunset', bg:'#431407', accent:'#f97316', text:'#fff7ed', muted:'#fb923c', hf:"'Sora',sans-serif", bf:"'DM Sans',sans-serif" },
};
var TK = Object.keys(THEMES);

/* ── Canvas constants ────────────────────────────────── */
var CW = 960, CH = 540;
var UID = function(){ return 'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); };
var clamp = function(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); };

/* ── Default elements for new slides ─────────────────── */
function newSlide(t) {
  return {
    id: 'sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    background: '',
    notes: '',
    elements: [
      { id:UID(), type:'heading', text:'Click to edit title', x:120, y:180, w:720, h:80, fontSize:44, fontFamily:t.hf, color:t.text, bold:true, italic:false, underline:false, align:'center' },
      { id:UID(), type:'text', text:'Click to add subtitle text', x:180, y:280, w:600, h:50, fontSize:22, fontFamily:t.bf, color:t.muted, bold:false, italic:false, underline:false, align:'center' },
    ],
  };
}

function blankSlide() {
  return { id:'sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), background:'', notes:'', elements:[] };
}

/* ── Main Component ──────────────────────────────────── */
export default function SuperDeckEditor() {
  var p=useParams(), deckId=p.deckId, nav=useNavigate();

  var [slides,setSlides]=useState([]);
  var [active,setActive]=useState(0);
  var [theme,setTheme]=useState('midnight');
  var [title,setTitle]=useState('');
  var [saving,setSaving]=useState(false);
  var [dirty,setDirty]=useState(false);
  var [loaded,setLoaded]=useState(false);
  var [selId,setSelId]=useState(null);
  var [editingId,setEditingId]=useState(null);
  var [presenting,setPresenting]=useState(false);
  var [showThemes,setShowThemes]=useState(false);
  var [showInsert,setShowInsert]=useState(false);
  var [showAi,setShowAi]=useState(false);
  var [aiPrompt,setAiPrompt]=useState('');
  var [aiLoading,setAiLoading]=useState(false);

  var canvasRef=useRef(null);
  var editRef=useRef(null);
  var dragRef=useRef(null);
  var resizeRef=useRef(null);
  var thRef=useRef(null);
  var insRef=useRef(null);

  /* ── Load ────────────────────────────────────────── */
  useEffect(function(){
    apiGet('/api/superdeck/'+deckId).then(function(d){
      var s=d.slides||[];
      if(s.length===0) s=[newSlide(THEMES.midnight)];
      setSlides(s); setTheme(d.theme||'midnight'); setTitle(d.title||''); setLoaded(true);
    }).catch(function(){ nav('/superdeck'); });
  },[deckId]);

  var t=THEMES[theme]||THEMES.midnight;
  var cs=slides[active]||{elements:[],background:'',notes:''};
  var selEl=selId?cs.elements.find(function(e){return e.id===selId;}):null;

  function mark(){setDirty(true);}

  /* ── Save ────────────────────────────────────────── */
  var save=useCallback(function(){
    setSaving(true);
    apiPost('/api/superdeck/'+deckId+'/save',{title:title,theme:theme,slides:slides})
      .then(function(){setSaving(false);setDirty(false);}).catch(function(){setSaving(false);});
  },[deckId,title,theme,slides]);

  useEffect(function(){var iv=setInterval(function(){if(dirty)save();},15000);return function(){clearInterval(iv);};},[dirty,save]);

  /* ── Click outside dropdowns ─────────────────────── */
  useEffect(function(){
    function h(e){
      if(thRef.current&&!thRef.current.contains(e.target))setShowThemes(false);
      if(insRef.current&&!insRef.current.contains(e.target))setShowInsert(false);
    }
    document.addEventListener('mousedown',h);return function(){document.removeEventListener('mousedown',h);};
  },[]);

  /* ── Slide operations ────────────────────────────── */
  function addSlide(){ var ns=slides.slice(); ns.splice(active+1,0,newSlide(t)); setSlides(ns); setActive(active+1); setSelId(null); mark(); }
  function addBlankSlide(){ var ns=slides.slice(); ns.splice(active+1,0,blankSlide()); setSlides(ns); setActive(active+1); setSelId(null); mark(); }
  function dupSlide(i){ var ns=slides.slice(); var d=JSON.parse(JSON.stringify(ns[i])); d.id='sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); d.elements.forEach(function(e){e.id=UID();}); ns.splice(i+1,0,d); setSlides(ns); setActive(i+1); mark(); }
  function delSlide(i){ if(slides.length<=1)return; var ns=slides.filter(function(_,j){return j!==i;}); setSlides(ns); if(active>=ns.length)setActive(ns.length-1); setSelId(null); mark(); }
  function updBg(c){ var ns=slides.slice(); ns[active]=Object.assign({},ns[active],{background:c}); setSlides(ns); mark(); }
  function updNotes(v){ var ns=slides.slice(); ns[active]=Object.assign({},ns[active],{notes:v}); setSlides(ns); mark(); }

  /* ── Element operations ──────────────────────────── */
  function addEl(type){
    var el={id:UID(),type:type,x:100,y:100,w:300,h:60};
    if(type==='heading') Object.assign(el,{text:'Heading',fontSize:42,fontFamily:t.hf,color:t.text,bold:true,italic:false,underline:false,align:'center',w:700,h:80,x:130,y:200});
    else if(type==='text') Object.assign(el,{text:'Body text',fontSize:20,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'left',w:600,h:50,x:180,y:300});
    else if(type==='image') Object.assign(el,{src:'',w:300,h:200,x:330,y:170});
    else if(type==='rect') Object.assign(el,{type:'shape',shapeType:'rect',fill:t.accent,w:200,h:120,x:380,y:210});
    else if(type==='circle') Object.assign(el,{type:'shape',shapeType:'circle',fill:t.accent,w:150,h:150,x:405,y:195});
    var ns=slides.slice(); var s=Object.assign({},ns[active]); s.elements=s.elements.concat([el]); ns[active]=s;
    setSlides(ns); setSelId(el.id); setShowInsert(false); mark();
  }

  function upd(id,u){
    var ns=slides.slice(); var s=Object.assign({},ns[active]);
    s.elements=s.elements.map(function(e){return e.id===id?Object.assign({},e,u):e;});
    ns[active]=s; setSlides(ns); mark();
  }

  function delEl(){
    if(!selId)return; var ns=slides.slice(); var s=Object.assign({},ns[active]);
    s.elements=s.elements.filter(function(e){return e.id!==selId;});
    ns[active]=s; setSlides(ns); setSelId(null); mark();
  }

  function moveForward(){
    if(!selId)return; var ns=slides.slice(); var s=Object.assign({},ns[active]); var els=s.elements.slice();
    var idx=els.findIndex(function(e){return e.id===selId;}); if(idx<0||idx>=els.length-1)return;
    var tmp=els[idx];els[idx]=els[idx+1];els[idx+1]=tmp; s.elements=els;ns[active]=s;setSlides(ns);mark();
  }
  function moveBackward(){
    if(!selId)return; var ns=slides.slice(); var s=Object.assign({},ns[active]); var els=s.elements.slice();
    var idx=els.findIndex(function(e){return e.id===selId;}); if(idx<=0)return;
    var tmp=els[idx];els[idx]=els[idx-1];els[idx-1]=tmp; s.elements=els;ns[active]=s;setSlides(ns);mark();
  }

  /* ── Inline text editing ─────────────────────────── */
  function startEdit(id){ setEditingId(id); setTimeout(function(){if(editRef.current){editRef.current.focus();var r=document.createRange();r.selectNodeContents(editRef.current);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}},50); }
  function finishEdit(){
    if(!editingId||!editRef.current)return;
    upd(editingId,{text:editRef.current.innerText}); setEditingId(null);
  }

  /* ── Drag ────────────────────────────────────────── */
  function onElMouseDown(e,id){
    e.stopPropagation(); e.preventDefault(); setSelId(id);
    var rect=canvasRef.current.getBoundingClientRect();
    var el=cs.elements.find(function(x){return x.id===id;});
    if(!el)return;
    var sx=e.clientX, sy=e.clientY, ox=el.x, oy=el.y;
    function mm(ev){
      var dx=(ev.clientX-sx)/(rect.width/CW), dy=(ev.clientY-sy)/(rect.height/CH);
      upd(id,{x:clamp(Math.round(ox+dx),0,CW-20),y:clamp(Math.round(oy+dy),0,CH-20)});
    }
    function mu(){ document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); }
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
  }

  /* ── Resize ──────────────────────────────────────── */
  function onResizeDown(e,id,corner){
    e.stopPropagation(); e.preventDefault();
    var rect=canvasRef.current.getBoundingClientRect();
    var el=cs.elements.find(function(x){return x.id===id;});
    if(!el)return;
    var sx=e.clientX,sy=e.clientY,ox=el.x,oy=el.y,ow=el.w,oh=el.h;
    function mm(ev){
      var dx=(ev.clientX-sx)/(rect.width/CW), dy=(ev.clientY-sy)/(rect.height/CH);
      var nx=ox,ny=oy,nw=ow,nh=oh;
      if(corner.includes('r'))nw=Math.max(40,ow+dx);
      if(corner.includes('l')){nx=ox+dx;nw=Math.max(40,ow-dx);}
      if(corner.includes('b'))nh=Math.max(20,oh+dy);
      if(corner.includes('t')){ny=oy+dy;nh=Math.max(20,oh-dy);}
      upd(id,{x:Math.round(nx),y:Math.round(ny),w:Math.round(nw),h:Math.round(nh)});
    }
    function mu(){document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);}
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  }

  /* ── Image upload ────────────────────────────────── */
  function uploadImage(){
    var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
    inp.onchange=function(){if(inp.files&&inp.files[0]){
      var fd=new FormData();fd.append('file',inp.files[0]);fd.append('folder','superdeck');
      fetch('/api/superdeck/upload-image',{method:'POST',body:fd,credentials:'include'})
        .then(function(r){return r.json();}).then(function(d){
          if(d.url){
            if(selEl&&selEl.type==='image'){upd(selId,{src:d.url});}
            else{addEl('image');setTimeout(function(){/* update last added */},100);}
          }
        });
    }};inp.click();
  }

  /* ── AI Generate ─────────────────────────────────── */
  function generateAI(){
    if(!aiPrompt.trim()||aiLoading)return; setAiLoading(true);
    apiPost('/api/superdeck/ai-generate',{prompt:aiPrompt,slide_count:8}).then(function(r){
      if(r.success&&r.slides){
        var newSlides=r.slides.map(function(s){
          var sl={id:'sl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),background:'',notes:s.notes||'',elements:[]};
          // Convert AI layout data into free-form elements
          if(s.heading){sl.elements.push({id:UID(),type:'heading',text:s.heading,x:60,y:s.layout==='title'?180:40,w:840,h:70,fontSize:s.layout==='title'?48:36,fontFamily:t.hf,color:t.text,bold:true,italic:false,underline:false,align:'center'});}
          if(s.subtitle){sl.elements.push({id:UID(),type:'text',text:s.subtitle,x:120,y:270,w:720,h:50,fontSize:22,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'center'});}
          if(s.body){sl.elements.push({id:UID(),type:'text',text:s.body,x:60,y:130,w:840,h:200,fontSize:18,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'left'});}
          if(s.bullets){var btext=s.bullets.map(function(b){return '\u2022 '+b;}).join('\n');sl.elements.push({id:UID(),type:'text',text:btext,x:80,y:130,w:800,h:300,fontSize:20,fontFamily:t.bf,color:t.text,bold:false,italic:false,underline:false,align:'left'});}
          if(s.quote_text){sl.elements.push({id:UID(),type:'text',text:'\u201C'+s.quote_text+'\u201D',x:100,y:160,w:760,h:150,fontSize:28,fontFamily:'Georgia,serif',color:t.text,bold:false,italic:true,underline:false,align:'center'});if(s.attribution)sl.elements.push({id:UID(),type:'text',text:s.attribution,x:300,y:350,w:360,h:40,fontSize:18,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'center'});}
          if(s.stats){var sw=Math.floor(800/s.stats.length);s.stats.forEach(function(st,i){sl.elements.push({id:UID(),type:'heading',text:st.value,x:80+i*sw,y:200,w:sw-20,h:60,fontSize:48,fontFamily:t.hf,color:t.accent,bold:true,italic:false,underline:false,align:'center'});sl.elements.push({id:UID(),type:'text',text:st.label,x:80+i*sw,y:270,w:sw-20,h:30,fontSize:16,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'center'});});}
          if(s.cta_text){sl.elements.push({id:UID(),type:'shape',shapeType:'rect',fill:t.accent,x:330,y:380,w:300,h:55});sl.elements.push({id:UID(),type:'text',text:s.cta_text,x:330,y:390,w:300,h:40,fontSize:20,fontFamily:t.hf,color:'#ffffff',bold:true,italic:false,underline:false,align:'center'});}
          if(s.col1_text&&s.col2_text){sl.elements.push({id:UID(),type:'text',text:s.col1_text,x:40,y:130,w:420,h:300,fontSize:18,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'left'});sl.elements.push({id:UID(),type:'text',text:s.col2_text,x:500,y:130,w:420,h:300,fontSize:18,fontFamily:t.bf,color:t.muted,bold:false,italic:false,underline:false,align:'left'});}
          if(sl.elements.length===0){sl.elements.push({id:UID(),type:'text',text:'Slide content',x:200,y:220,w:560,h:100,fontSize:24,fontFamily:t.bf,color:t.text,bold:false,italic:false,underline:false,align:'center'});}
          return sl;
        });
        setSlides(newSlides);setActive(0);setShowAi(false);setAiPrompt('');setSelId(null);mark();
      }
      setAiLoading(false);
    }).catch(function(){setAiLoading(false);});
  }

  /* ── Keyboard: present mode + delete ─────────────── */
  useEffect(function(){
    function h(e){
      if(presenting){
        if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();setActive(function(a){return Math.min(a+1,slides.length-1);});}
        if(e.key==='ArrowLeft'){e.preventDefault();setActive(function(a){return Math.max(a-1,0);});}
        if(e.key==='Escape')setPresenting(false);
      } else {
        if((e.key==='Delete'||e.key==='Backspace')&&selId&&!editingId){e.preventDefault();delEl();}
      }
    }
    document.addEventListener('keydown',h);return function(){document.removeEventListener('keydown',h);};
  },[presenting,slides.length,selId,editingId]);

  if(!loaded)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0f172a'}}><Loader2 size={32} color="#8b5cf6" style={{animation:'spin 1s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;

  /* ── PRESENT MODE ──────────────────────────────────── */
  if(presenting){
    var pcs=slides[active]||{elements:[],background:''};
    return (
      <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
        onClick={function(){setActive(function(a){return Math.min(a+1,slides.length-1);});}}>
        <div style={{width:'100vw',height:'100vh',maxWidth:'177.78vh',maxHeight:'56.25vw',position:'relative',background:pcs.background||t.bg}}>
          {pcs.elements.map(function(el){
            var pX=(el.x/CW)*100,pY=(el.y/CH)*100,pW=(el.w/CW)*100,pH=(el.h/CH)*100;
            return <div key={el.id} style={{position:'absolute',left:pX+'%',top:pY+'%',width:pW+'%',height:pH+'%'}}>
              {(el.type==='heading'||el.type==='text')&&<div style={{fontSize:'clamp(8px,'+el.fontSize*0.1+'vw,'+el.fontSize*1.8+'px)',fontWeight:el.bold?800:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bf,width:'100%',height:'100%',display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',lineHeight:1.3,whiteSpace:'pre-wrap',overflow:'hidden'}}>{el.text||''}</div>}
              {el.type==='image'&&(el.src?<img src={el.src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4}}/>:<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,0.05)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}><Image size={32} color="#475569"/></div>)}
              {el.type==='shape'&&<div style={{width:'100%',height:'100%',background:el.fill||t.accent,borderRadius:el.shapeType==='circle'?'50%':8}}/>}
            </div>;
          })}
        </div>
        <div style={{position:'fixed',bottom:20,right:20,background:'rgba(0,0,0,0.7)',borderRadius:8,padding:'6px 14px',display:'flex',alignItems:'center',gap:12}} onClick={function(e){e.stopPropagation();}}>
          <span style={{color:'#94a3b8',fontSize:13}}>{active+1}/{slides.length}</span>
          <button onClick={function(){setPresenting(false);}} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',display:'flex',padding:4}}><X size={16}/></button>
        </div>
      </div>
    );
  }

  /* ── EDITOR ────────────────────────────────────────── */
  var btnS={background:'#334155',border:'none',color:'#e2e8f0',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:'inherit',padding:'7px 14px',borderRadius:6,fontWeight:600};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#f1f5f9',fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── TOOLBAR ──────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#1e293b',borderBottom:'1px solid #334155',flexShrink:0}}>
        <button onClick={function(){if(dirty)save();nav('/superdeck');}} style={{...btnS,background:'none',color:'#94a3b8'}}
          onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='none';}}>
          <ArrowLeft size={14}/> Back</button>
        <div style={{width:1,height:24,background:'#334155'}}/>
        <input value={title} onChange={function(e){setTitle(e.target.value);mark();}}
          style={{background:'transparent',border:'none',color:'#f8fafc',fontSize:15,fontWeight:700,fontFamily:"'Sora',sans-serif",outline:'none',padding:'4px 8px',flex:1,maxWidth:280}} placeholder="Untitled"/>
        <div style={{flex:1}}/>

        {/* Insert dropdown */}
        <div ref={insRef} style={{position:'relative'}}>
          <button onClick={function(){setShowInsert(!showInsert);}} style={btnS}
            onMouseEnter={function(e){e.currentTarget.style.background='#475569';}} onMouseLeave={function(e){e.currentTarget.style.background='#334155';}}>
            <Plus size={14}/> Insert <ChevronDown size={11}/></button>
          {showInsert&&<div style={{position:'absolute',top:'100%',right:0,marginTop:4,background:'#1e293b',border:'1px solid #334155',borderRadius:10,boxShadow:'0 12px 40px rgba(0,0,0,0.4)',zIndex:50,width:200,padding:4}}>
            {[{k:'heading',n:'Heading',i:Type},{k:'text',n:'Text',i:Type},{k:'image',n:'Image',i:Image},{k:'rect',n:'Rectangle',i:Square},{k:'circle',n:'Circle',i:Circle}].map(function(it){
              return <div key={it.k} onClick={function(){addEl(it.k);}}
                onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}
                style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,cursor:'pointer',color:'#e2e8f0',fontSize:13,fontWeight:500}}>
                <it.i size={15} color="#8b5cf6"/>{it.n}</div>;
            })}
          </div>}
        </div>

        {/* Theme dropdown */}
        <div ref={thRef} style={{position:'relative'}}>
          <button onClick={function(){setShowThemes(!showThemes);}} style={btnS}
            onMouseEnter={function(e){e.currentTarget.style.background='#475569';}} onMouseLeave={function(e){e.currentTarget.style.background='#334155';}}>
            <div style={{width:12,height:12,borderRadius:3,background:t.accent}}/> {t.name} <ChevronDown size={11}/></button>
          {showThemes&&<div style={{position:'absolute',top:'100%',right:0,marginTop:4,background:'#1e293b',border:'1px solid #334155',borderRadius:10,boxShadow:'0 12px 40px rgba(0,0,0,0.4)',zIndex:50,width:190,padding:4}}>
            {TK.map(function(k){var th=THEMES[k];var sel=k===theme;return <div key={k} onClick={function(){setTheme(k);mark();setShowThemes(false);}}
              onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background=sel?'#334155':'transparent';}}
              style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:6,cursor:'pointer',background:sel?'#334155':'transparent'}}>
              <div style={{width:20,height:20,borderRadius:5,background:th.bg,border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:6,height:6,borderRadius:'50%',background:th.accent}}/></div>
              <span style={{fontSize:12,fontWeight:sel?700:500,color:sel?'#8b5cf6':'#cbd5e1'}}>{th.name}</span>
            </div>;})}
          </div>}
        </div>

        <button onClick={function(){setShowAi(!showAi);}} style={{...btnS,background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'#fff',fontWeight:700}}>
          <Sparkles size={14}/> AI Generate</button>
        <button onClick={function(){if(dirty)save();setPresenting(true);}} style={{...btnS,background:'#059669',color:'#fff',fontWeight:700}}
          onMouseEnter={function(e){e.currentTarget.style.background='#047857';}} onMouseLeave={function(e){e.currentTarget.style.background='#059669';}}>
          <Play size={14}/> Present</button>
        <button onClick={save} disabled={saving} style={{background:'none',border:'none',color:dirty?'#fbbf24':'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:11,fontFamily:'inherit',padding:'6px'}}>
          <Save size={13}/> {saving?'Saving...':dirty?'Unsaved':'Saved'}</button>
      </div>

      {/* ── AI Panel ──────────────────────────────────── */}
      {showAi&&<div style={{padding:'12px 16px',background:'#1e1b4b',borderBottom:'1px solid #312e81',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <Wand2 size={18} color="#a78bfa"/>
        <input value={aiPrompt} onChange={function(e){setAiPrompt(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')generateAI();}}
          placeholder="Describe your presentation..."
          style={{flex:1,padding:'9px 14px',borderRadius:8,border:'1px solid #4c1d95',background:'#312e81',color:'#e2e8f0',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
        <button onClick={generateAI} disabled={aiLoading||!aiPrompt.trim()}
          style={{padding:'9px 20px',borderRadius:8,border:'none',background:aiLoading?'#64748b':'#8b5cf6',color:'#fff',fontSize:13,fontWeight:700,cursor:aiLoading?'default':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
          {aiLoading?<><Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> Generating...</>:<><Sparkles size={13}/> Generate</>}</button>
        <button onClick={function(){setShowAi(false);}} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:3,display:'flex'}}><X size={16}/></button>
      </div>}

      {/* ── MAIN AREA ────────────────────────────────── */}
      <div style={{display:'flex',flex:1,minHeight:0}}>

        {/* ── LEFT: Thumbnails ────────────────────────── */}
        <div style={{width:180,borderRight:'1px solid #e2e8f0',background:'#fff',padding:'8px 6px',overflowY:'auto',flexShrink:0}}>
          {slides.map(function(s,i){var isA=i===active;return <div key={s.id||i} style={{marginBottom:6}}>
            <div style={{display:'flex',gap:4,alignItems:'flex-start'}}>
              <span style={{fontSize:10,color:'#94a3b8',width:16,textAlign:'right',paddingTop:4,flexShrink:0,fontWeight:600}}>{i+1}</span>
              <div style={{flex:1}}>
                <div onClick={function(){setActive(i);setSelId(null);setEditingId(null);}}
                  style={{borderRadius:4,overflow:'hidden',cursor:'pointer',boxShadow:isA?'0 0 0 2px #8b5cf6':'none',aspectRatio:'16/9',background:s.background||t.bg,position:'relative'}}>
                  {s.elements.slice(0,3).map(function(el,ei){
                    if(el.type==='heading')return <div key={ei} style={{position:'absolute',left:(el.x/CW*100)+'%',top:(el.y/CH*100)+'%',fontSize:5,fontWeight:700,color:el.color||'#fff',overflow:'hidden',maxHeight:12,whiteSpace:'nowrap'}}>{(el.text||'').slice(0,30)}</div>;
                    if(el.type==='text')return <div key={ei} style={{position:'absolute',left:(el.x/CW*100)+'%',top:(el.y/CH*100)+'%',fontSize:3.5,color:el.color||'#999',overflow:'hidden',maxHeight:8,whiteSpace:'nowrap'}}>{(el.text||'').slice(0,40)}</div>;
                    if(el.type==='shape')return <div key={ei} style={{position:'absolute',left:(el.x/CW*100)+'%',top:(el.y/CH*100)+'%',width:(el.w/CW*100)+'%',height:(el.h/CH*100)+'%',background:el.fill||t.accent,borderRadius:el.shapeType==='circle'?'50%':2}}/>;
                    return null;
                  })}
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:4,padding:'3px 0'}}>
                  <button onClick={function(e){e.stopPropagation();dupSlide(i);}} title="Duplicate"
                    onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}
                    style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:3,borderRadius:3,display:'flex'}}><Copy size={12}/></button>
                  <button onClick={function(e){e.stopPropagation();delSlide(i);}} title="Delete"
                    onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';e.currentTarget.style.color='#dc2626';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#94a3b8';}}
                    style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:3,borderRadius:3,display:'flex'}}><Trash2 size={12}/></button>
                </div>
              </div>
            </div>
          </div>;})}
          <button onClick={addSlide}
            onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.color='#8b5cf6';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#94a3b8';}}
            style={{width:'100%',padding:'8px 0',border:'1.5px dashed #cbd5e1',borderRadius:4,background:'none',color:'#94a3b8',fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
            <Plus size={12}/> Add</button>
        </div>

        {/* ── CENTRE: Canvas ─────────────────────────── */}
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#e2e8f0',padding:16,minWidth:0}}
          onClick={function(){if(editingId)finishEdit();setSelId(null);}}>

          <div ref={canvasRef} style={{width:'100%',maxWidth:960,aspectRatio:'16/9',background:cs.background||t.bg,borderRadius:4,position:'relative',overflow:'hidden',boxShadow:'0 6px 30px rgba(0,0,0,0.25)'}}>
            {cs.elements.map(function(el){
              var isSel=el.id===selId, isEdit=el.id===editingId;
              var pX=(el.x/CW)*100,pY=(el.y/CH)*100,pW=(el.w/CW)*100,pH=(el.h/CH)*100;
              return <div key={el.id}
                onMouseDown={function(e){if(!isEdit)onElMouseDown(e,el.id);}}
                onDoubleClick={function(e){e.stopPropagation();if(el.type==='heading'||el.type==='text')startEdit(el.id);else if(el.type==='image')uploadImage();}}
                onClick={function(e){e.stopPropagation();if(!isEdit)setSelId(el.id);}}
                style={{position:'absolute',left:pX+'%',top:pY+'%',width:pW+'%',height:pH+'%',cursor:isEdit?'text':'move',outline:isSel&&!isEdit?'2px solid #3b82f6':'none',borderRadius:2,boxSizing:'border-box',zIndex:isSel?10:1}}>

                {(el.type==='heading'||el.type==='text')&&(
                  isEdit?<div ref={editRef} contentEditable suppressContentEditableWarning
                    onBlur={finishEdit} onKeyDown={function(e){if(e.key==='Escape')finishEdit();}}
                    style={{fontSize:Math.max(8,el.fontSize*0.65)+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bf,width:'100%',height:'100%',outline:'2px solid #8b5cf6',padding:'4px 6px',lineHeight:1.3,overflow:'hidden',background:'rgba(0,0,0,0.15)',borderRadius:2,whiteSpace:'pre-wrap'}}>{el.text||''}</div>
                  :<div style={{fontSize:Math.max(8,el.fontSize*0.65)+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bf,width:'100%',height:'100%',overflow:'hidden',padding:'4px 6px',display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',lineHeight:1.3,userSelect:'none',whiteSpace:'pre-wrap'}}>{el.text||''}</div>
                )}
                {el.type==='image'&&(el.src?<img src={el.src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4,pointerEvents:'none'}}/>:<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,0.05)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',border:'1px dashed rgba(255,255,255,0.2)'}}><Image size={24} color="#475569"/></div>)}
                {el.type==='shape'&&<div style={{width:'100%',height:'100%',background:el.fill||t.accent,borderRadius:el.shapeType==='circle'?'50%':8}}/>}

                {/* Resize handles + floating toolbar */}
                {isSel&&!isEdit&&<>
                  {['tl','t','tr','r','br','b','bl','l'].map(function(c){
                    var hs={position:'absolute',width:9,height:9,background:'#3b82f6',borderRadius:2,zIndex:20,border:'1px solid #fff'};
                    var cur={tl:'nwse-resize',t:'ns-resize',tr:'nesw-resize',r:'ew-resize',br:'nwse-resize',b:'ns-resize',bl:'nesw-resize',l:'ew-resize'};
                    hs.cursor=cur[c];
                    if(c.includes('t'))hs.top=-5;if(c.includes('b'))hs.bottom=-5;if(c.includes('l'))hs.left=-5;if(c.includes('r'))hs.right=-5;
                    if(c==='t'||c==='b'){hs.left='50%';hs.transform='translateX(-50%)';}
                    if(c==='l'||c==='r'){hs.top='50%';hs.transform='translateY(-50%)';}
                    return <div key={c} onMouseDown={function(e){onResizeDown(e,el.id,c);}} style={hs}/>;
                  })}
                  <div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',display:'flex',gap:1,background:'#1e293b',borderRadius:5,padding:'2px 3px',boxShadow:'0 4px 12px rgba(0,0,0,0.3)',zIndex:30}}
                    onClick={function(e){e.stopPropagation();}}>
                    <button onClick={function(e){e.stopPropagation();moveBackward();}} title="Send back" style={{background:'transparent',border:'none',color:'#cbd5e1',cursor:'pointer',padding:'3px 5px',borderRadius:3,display:'flex'}}
                      onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}><ArrowDown size={12}/></button>
                    <button onClick={function(e){e.stopPropagation();moveForward();}} title="Bring forward" style={{background:'transparent',border:'none',color:'#cbd5e1',cursor:'pointer',padding:'3px 5px',borderRadius:3,display:'flex'}}
                      onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}><ArrowUp size={12}/></button>
                    <div style={{width:1,height:16,background:'#475569',margin:'0 1px'}}/>
                    <button onClick={function(e){e.stopPropagation();delEl();}} title="Delete" style={{background:'transparent',border:'none',color:'#f87171',cursor:'pointer',padding:'3px 5px',borderRadius:3,display:'flex'}}
                      onMouseEnter={function(e){e.currentTarget.style.background='#7f1d1d';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}><Trash2 size={12}/></button>
                  </div>
                </>}
              </div>;
            })}
          </div>

          {/* Nav + notes */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginTop:10}}>
            <button onClick={function(){setActive(Math.max(0,active-1));}} disabled={active===0} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:5,padding:'5px 8px',cursor:active>0?'pointer':'default',color:active>0?'#334155':'#cbd5e1',display:'flex'}}><ChevronLeft size={14}/></button>
            <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>Slide {active+1} of {slides.length}</span>
            <button onClick={function(){setActive(Math.min(slides.length-1,active+1));}} disabled={active>=slides.length-1} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:5,padding:'5px 8px',cursor:active<slides.length-1?'pointer':'default',color:active<slides.length-1?'#334155':'#cbd5e1',display:'flex'}}><ChevronRight size={14}/></button>
          </div>
          <textarea value={cs.notes||''} onChange={function(e){updNotes(e.target.value);}} placeholder="Speaker notes..." rows={2}
            style={{width:'100%',maxWidth:960,marginTop:8,padding:'8px 12px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,color:'#475569',fontSize:12,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',outline:'none'}}/>
        </div>

        {/* ── RIGHT: Properties ───────────────────────── */}
        <div style={{width:260,borderLeft:'1px solid #e2e8f0',background:'#fff',padding:'12px 14px',overflowY:'auto',flexShrink:0}}>

          {selEl?<>
            <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Element Properties</div>

            {/* Text formatting */}
            {(selEl.type==='heading'||selEl.type==='text')&&<div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:5}}>Font</div>
              <select value={(selEl.fontFamily||'').split("'")[1]||'Sora'} onChange={function(e){upd(selId,{fontFamily:"'"+e.target.value+"',sans-serif"});}}
                style={{width:'100%',padding:'6px 8px',borderRadius:5,border:'1px solid #e2e8f0',fontSize:12,color:'#0f172a',background:'#fff',fontFamily:'inherit',cursor:'pointer',marginBottom:6}}>
                {['Sora','DM Sans','Arial','Georgia','Trebuchet MS','Verdana','Courier New'].map(function(f){return <option key={f} value={f}>{f}</option>;})}</select>

              <div style={{display:'flex',gap:3,marginBottom:6,alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',border:'1px solid #e2e8f0',borderRadius:5,overflow:'hidden',background:'#fff'}}>
                  <button onClick={function(){upd(selId,{fontSize:Math.max(8,(selEl.fontSize||18)-2)});}} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',padding:'3px 5px',display:'flex'}}><Minus size={11}/></button>
                  <span style={{fontSize:11,fontWeight:600,color:'#334155',padding:'0 3px',minWidth:20,textAlign:'center'}}>{selEl.fontSize||18}</span>
                  <button onClick={function(){upd(selId,{fontSize:Math.min(96,(selEl.fontSize||18)+2)});}} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',padding:'3px 5px',display:'flex'}}><PlusCircle size={11}/></button>
                </div>
                <button onClick={function(){upd(selId,{bold:!selEl.bold});}} style={{background:selEl.bold?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:3,padding:'3px 5px',cursor:'pointer',display:'flex',color:selEl.bold?'#8b5cf6':'#64748b'}}><Bold size={13}/></button>
                <button onClick={function(){upd(selId,{italic:!selEl.italic});}} style={{background:selEl.italic?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:3,padding:'3px 5px',cursor:'pointer',display:'flex',color:selEl.italic?'#8b5cf6':'#64748b'}}><Italic size={13}/></button>
                <button onClick={function(){upd(selId,{underline:!selEl.underline});}} style={{background:selEl.underline?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:3,padding:'3px 5px',cursor:'pointer',display:'flex',color:selEl.underline?'#8b5cf6':'#64748b'}}><Underline size={13}/></button>
              </div>

              <div style={{display:'flex',gap:2,marginBottom:6}}>
                {[{v:'left',I:AlignLeft},{v:'center',I:AlignCenter},{v:'right',I:AlignRight}].map(function(a){var sel=(selEl.align||'left')===a.v;return <button key={a.v} onClick={function(){upd(selId,{align:a.v});}} style={{background:sel?'#ede9fe':'#fff',border:'1px solid #e2e8f0',borderRadius:3,padding:'3px 6px',cursor:'pointer',display:'flex',flex:1,justifyContent:'center',color:sel?'#8b5cf6':'#64748b'}}><a.I size={13}/></button>;})}</div>

              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:11,color:'#64748b'}}>Colour</span>
                <input type="color" value={selEl.color||t.text} onChange={function(e){upd(selId,{color:e.target.value});}} style={{width:24,height:24,border:'2px solid #e2e8f0',borderRadius:4,cursor:'pointer',padding:0}}/>
              </div>
            </div>}

            {/* Shape fill */}
            {selEl.type==='shape'&&<div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:5}}>Fill colour</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="color" value={selEl.fill||t.accent} onChange={function(e){upd(selId,{fill:e.target.value});}} style={{width:32,height:32,border:'2px solid #e2e8f0',borderRadius:5,cursor:'pointer',padding:1}}/>
                <span style={{fontSize:11,color:'#64748b',fontFamily:'monospace'}}>{selEl.fill||t.accent}</span>
              </div>
            </div>}

            {/* Image */}
            {selEl.type==='image'&&<div style={{marginBottom:14}}>
              <button onClick={uploadImage}
                onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
                style={{display:'flex',alignItems:'center',gap:5,width:'100%',padding:'7px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <Upload size={12} color="#8b5cf6"/> Upload image</button>
            </div>}

            {/* Position */}
            <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Position</div>
            <div style={{display:'flex',gap:4,marginBottom:10}}>
              <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>X</div><input type="number" value={selEl.x} onChange={function(e){upd(selId,{x:parseInt(e.target.value)||0});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,color:'#0f172a',boxSizing:'border-box'}}/></div>
              <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>Y</div><input type="number" value={selEl.y} onChange={function(e){upd(selId,{y:parseInt(e.target.value)||0});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,color:'#0f172a',boxSizing:'border-box'}}/></div>
              <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>W</div><input type="number" value={selEl.w} onChange={function(e){upd(selId,{w:Math.max(20,parseInt(e.target.value)||40)});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,color:'#0f172a',boxSizing:'border-box'}}/></div>
              <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>H</div><input type="number" value={selEl.h} onChange={function(e){upd(selId,{h:Math.max(10,parseInt(e.target.value)||20)});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,color:'#0f172a',boxSizing:'border-box'}}/></div>
            </div>

            <button onClick={delEl}
              onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
              style={{display:'flex',alignItems:'center',gap:5,width:'100%',padding:'7px 8px',borderRadius:5,border:'1px solid #fecaca',background:'#f8fafc',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              <Trash2 size={12}/> Delete element</button>
          </>

          :<>
            {/* No element selected — slide properties */}
            <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Slide Properties</div>

            <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:5}}>Background</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,padding:'6px 8px',background:'#f8fafc',borderRadius:6,border:'1px solid #e2e8f0'}}>
              <input type="color" value={cs.background||t.bg} onChange={function(e){updBg(e.target.value);}} style={{width:28,height:28,border:'2px solid #e2e8f0',borderRadius:5,cursor:'pointer',padding:1}}/>
              <span style={{fontSize:11,color:'#64748b',fontFamily:'monospace'}}>{cs.background||t.bg}</span>
            </div>

            <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:5}}>Actions</div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <button onClick={function(){dupSlide(active);}} onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
                style={{display:'flex',alignItems:'center',gap:5,width:'100%',padding:'7px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <Copy size={12} color="#8b5cf6"/> Duplicate slide</button>
              <button onClick={function(){delSlide(active);}} onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
                style={{display:'flex',alignItems:'center',gap:5,width:'100%',padding:'7px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <Trash2 size={12} color="#dc2626"/> Delete slide</button>
            </div>
          </>}
        </div>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
