import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { fabric } from 'fabric';

var SIZES = [
  { id: '728x90', name: 'Leaderboard', w: 728, h: 90 },
  { id: '300x250', name: 'Medium Rectangle', w: 300, h: 250 },
  { id: '160x600', name: 'Wide Skyscraper', w: 160, h: 600 },
  { id: '320x50', name: 'Mobile Banner', w: 320, h: 50 },
  { id: '970x250', name: 'Billboard', w: 970, h: 250 },
  { id: '468x60', name: 'Full Banner', w: 468, h: 60 },
  { id: '336x280', name: 'Large Rectangle', w: 336, h: 280 },
  { id: '250x250', name: 'Square', w: 250, h: 250 },
];

var SWATCHES = [
  '#0f172a','#1e293b','#334155','#64748b','#94a3b8','#e2e8f0','#ffffff',
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981',
  '#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7',
  '#d946ef','#ec4899','#f43f5e','#78350f','#7c2d12','#713f12','#365314',
];

var GRADIENTS = [
  { name: 'Ocean', c: ['#667eea','#764ba2'] },
  { name: 'Sunset', c: ['#f97316','#ef4444','#ec4899'] },
  { name: 'Forest', c: ['#059669','#10b981','#34d399'] },
  { name: 'Night', c: ['#0f172a','#1e293b','#334155'] },
  { name: 'Gold', c: ['#78350f','#a16207','#ca8a04'] },
  { name: 'Neon', c: ['#8b5cf6','#6366f1','#3b82f6'] },
  { name: 'Fire', c: ['#dc2626','#f97316','#fbbf24'] },
  { name: 'Cool', c: ['#0ea5e9','#06b6d4','#14b8a6'] },
  { name: 'Rose', c: ['#f43f5e','#ec4899','#d946ef'] },
  { name: 'Slate', c: ['#475569','#64748b','#94a3b8'] },
];

var FONTS = ['Arial','Helvetica','Georgia','Times New Roman','Verdana','Trebuchet MS','Impact','Courier New','Lucida Console','Sora','DM Sans'];

var TEMPLATES = [
  { name: 'Bold CTA', bg: ['#667eea','#764ba2'], texts: [{t:'Big Bold Headline',x:.05,y:.2,sz:28,b:true,c:'#fff'},{t:'Supporting subtitle text',x:.05,y:.55,sz:14,c:'rgba(255,255,255,.7)'}], cta: {t:'Learn More',x:.72,y:.3,bg:'#fbbf24',c:'#764ba2'} },
  { name: 'Dark Pro', bg: ['#0f172a','#1e293b'], texts: [{t:'Premium Quality',x:.05,y:.2,sz:26,b:true,c:'#fff'},{t:'Discover the difference',x:.05,y:.55,sz:13,c:'#64748b'}], cta: {t:'Get Started',x:.72,y:.3,bg:'#0ea5e9',c:'#fff'} },
  { name: 'Green Deal', bg: ['#059669','#10b981'], texts: [{t:'50% OFF TODAY',x:.05,y:.15,sz:30,b:true,c:'#fff'},{t:'Limited time offer',x:.05,y:.55,sz:14,c:'rgba(255,255,255,.8)'}], cta: {t:'Shop Now',x:.72,y:.3,bg:'#fff',c:'#059669'} },
  { name: 'Minimal', bg: ['#ffffff','#f8fafc'], texts: [{t:'Clean & Simple',x:.05,y:.25,sz:24,b:true,c:'#0f172a'},{t:'Less is more',x:.05,y:.6,sz:13,c:'#64748b'}], cta: {t:'Explore',x:.75,y:.3,bg:'#0f172a',c:'#fff'} },
  { name: 'Neon Night', bg: ['#09090b','#18181b'], texts: [{t:'NEON VIBES',x:.05,y:.2,sz:28,b:true,c:'#4ade80'},{t:'Glow in the dark',x:.05,y:.55,sz:13,c:'#4ade8088'}], cta: {t:'Enter',x:.75,y:.3,bg:'#4ade80',c:'#09090b'} },
  { name: 'Luxury Gold', bg: ['#78350f','#a16207'], texts: [{t:'Exclusive Collection',x:.05,y:.2,sz:24,b:true,c:'#fef3c7'},{t:'Premium craftsmanship',x:.05,y:.55,sz:13,c:'rgba(254,243,199,.6)'}], cta: {t:'View',x:.75,y:.3,bg:'#fef3c7',c:'#78350f'} },
];

function CanvasEditor({ canvasSize, onCanvasReady }) {
  var canvasEl = useRef(null);
  var fc = useRef(null);
  useEffect(function() {
    if (!canvasEl.current) return;
    if (fc.current) fc.current.dispose();
    var c = new fabric.Canvas(canvasEl.current, { width: canvasSize.w, height: canvasSize.h, backgroundColor: '#ffffff', preserveObjectStacking: true });
    fc.current = c;
    onCanvasReady(c);
    return function() { if (fc.current) { fc.current.dispose(); fc.current = null; } };
  }, [canvasSize.id]);
  return <canvas ref={canvasEl} />;
}

export default function BannerMaker() {
  var { user } = useAuth();
  var isPro = (user?.membership_tier || 'basic') === 'pro';
  var [canvas, setCanvas] = useState(null);
  var [canvasSize, setCanvasSize] = useState(SIZES[0]);
  var [activeTab, setActiveTab] = useState('templates');
  var [selectedObj, setSelectedObj] = useState(null);
  var [fontSize, setFontSize] = useState(24);
  var [fontFamily, setFontFamily] = useState('Arial');
  var [textColor, setTextColor] = useState('#ffffff');
  var [fillColor, setFillColor] = useState('#0ea5e9');
  var [bold, setBold] = useState(false);
  var [italic, setItalic] = useState(false);

  var onCanvasReady = useCallback(function(c) {
    setCanvas(c);
    c.on('selection:created', function(e) { upSel(e.selected?.[0]); });
    c.on('selection:updated', function(e) { upSel(e.selected?.[0]); });
    c.on('selection:cleared', function() { setSelectedObj(null); });
  }, []);

  function upSel(obj) {
    setSelectedObj(obj);
    if (obj && obj.type === 'i-text') {
      setFontSize(Math.round(obj.fontSize || 24));
      setFontFamily(obj.fontFamily || 'Arial');
      setTextColor(obj.fill || '#fff');
      setBold(obj.fontWeight === 'bold');
      setItalic(obj.fontStyle === 'italic');
    }
  }

  function setGradientBg(colors) {
    if (!canvas) return;
    var grad = new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: canvas.width, y2: canvas.height }, colorStops: colors.map(function(c, i) { return { offset: i / (colors.length - 1), color: c }; }) });
    canvas.setBackgroundColor(grad, function() { canvas.renderAll(); });
  }
  function setSolidBg(c) { if (!canvas) return; canvas.setBackgroundColor(c, function() { canvas.renderAll(); }); }

  function addText(text, opts) {
    if (!canvas) return;
    var t = new fabric.IText(text || 'Your Text', Object.assign({ left: 40, top: 20, fontSize: opts?.fontSize || 24, fontFamily: opts?.fontFamily || 'Arial', fill: opts?.fill || '#ffffff', fontWeight: opts?.bold ? 'bold' : 'normal', editable: true, padding: 4 }, opts || {}));
    canvas.add(t); canvas.setActiveObject(t); canvas.renderAll();
  }

  function addShape(type) {
    if (!canvas) return;
    var obj;
    if (type === 'rect') obj = new fabric.Rect({ left: 50, top: 50, width: 120, height: 50, fill: fillColor, rx: 8, ry: 8 });
    else if (type === 'circle') obj = new fabric.Circle({ left: 50, top: 50, radius: 40, fill: fillColor });
    else if (type === 'line') obj = new fabric.Line([50, 50, 250, 50], { stroke: fillColor, strokeWidth: 3 });
    else if (type === 'cta') {
      var g = new fabric.Group([new fabric.Rect({ width: 140, height: 40, fill: fillColor, rx: 8, ry: 8 }), new fabric.Text('Click Here', { fontSize: 14, fontWeight: 'bold', fill: '#fff', originX: 'center', originY: 'center', fontFamily: 'Arial' })], { left: 50, top: 50 });
      canvas.add(g); canvas.setActiveObject(g); canvas.renderAll(); return;
    }
    if (obj) { canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll(); }
  }

  function addImage(url) {
    if (!canvas || !url) return;
    fabric.Image.fromURL(url, function(img) {
      var s = Math.min((canvas.width * 0.6) / img.width, (canvas.height * 0.8) / img.height, 1);
      img.set({ left: 20, top: 20, scaleX: s, scaleY: s });
      canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  }
  function uploadImage(e) { var f = e.target.files?.[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { addImage(ev.target.result); }; r.readAsDataURL(f); }

  function applyTemplate(tpl) {
    if (!canvas) return;
    canvas.clear(); setGradientBg(tpl.bg);
    var w = canvas.width, h = canvas.height;
    tpl.texts.forEach(function(t) { addText(t.t, { left: w * t.x, top: h * t.y, fontSize: Math.min(t.sz, h * 0.4), fill: t.c, bold: t.b, fontWeight: t.b ? 'bold' : 'normal' }); });
    if (tpl.cta) {
      var g = new fabric.Group([new fabric.Rect({ width: 120, height: 36, fill: tpl.cta.bg, rx: 6, ry: 6 }), new fabric.Text(tpl.cta.t, { fontSize: 13, fontWeight: 'bold', fill: tpl.cta.c, originX: 'center', originY: 'center', fontFamily: 'Arial' })], { left: w * tpl.cta.x, top: h * tpl.cta.y });
      canvas.add(g);
    }
    canvas.renderAll();
  }

  function upd(p, v) { if (canvas && selectedObj) { selectedObj.set(p, v); canvas.renderAll(); } }
  function del() { if (canvas && selectedObj) { canvas.remove(selectedObj); setSelectedObj(null); canvas.renderAll(); } }
  function dup() { if (!canvas || !selectedObj) return; selectedObj.clone(function(c) { c.set({ left: (selectedObj.left||0)+20, top: (selectedObj.top||0)+20 }); canvas.add(c); canvas.setActiveObject(c); canvas.renderAll(); }); }
  function fwd() { if (canvas && selectedObj) { canvas.bringForward(selectedObj); canvas.renderAll(); } }
  function bwd() { if (canvas && selectedObj) { canvas.sendBackwards(selectedObj); canvas.renderAll(); } }

  function exportPNG() { if (!canvas) return; var a = document.createElement('a'); a.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 }); a.download = 'banner-' + canvasSize.id + '.png'; a.click(); }
  function exportHTML() { if (!canvas) return; var html = '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="margin:0">\n' + canvas.toSVG() + '\n</body>\n</html>'; var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = 'banner-' + canvasSize.id + '.html'; a.click(); }
  function copyCode() { if (!canvas) return; navigator.clipboard.writeText(canvas.toSVG()).then(function() { alert('SVG code copied!'); }); }

  var tabS = function(on) { return { padding: '10px 0', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, border: 'none', borderBottom: on ? '2px solid #0ea5e9' : '2px solid transparent', background: 'transparent', color: on ? '#0ea5e9' : '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', flex: 1, textAlign: 'center' }; };
  var btnS = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#475569' };
  var secT = { fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8, marginTop: 16 };

  if (!isPro) {
    return (
      <AppLayout title="Banner Maker" subtitle="Design professional banners">
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Banner Maker is a Pro Feature</h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, maxWidth: 450, margin: '0 auto 24px' }}>Full canvas editor with templates, colour swatches, text styling, image uploads, shapes, layers, and HTML/PNG export.</p>
          <a href="/upgrade" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 0 #6d28d9' }}>Upgrade to Pro — $15</a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Banner Maker" subtitle="Professional banner design studio">
      <style>{'.bm-sw{width:22px;height:22px;border-radius:5px;border:2px solid transparent;cursor:pointer;transition:all .12s}.bm-sw:hover{transform:scale(1.2);border-color:#0ea5e9}.bm-gr{height:26px;border-radius:6px;cursor:pointer;border:2px solid transparent;transition:all .12s}.bm-gr:hover{border-color:#0ea5e9;transform:scale(1.02)}'}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 220px', gap: 12, minHeight: '70vh' }}>

        {/* LEFT */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            {[['templates','Templates'],['elements','Elements'],['text','Text'],['upload','Upload']].map(function([k,l]) { return <button key={k} style={tabS(activeTab===k)} onClick={function(){setActiveTab(k);}}>{l}</button>; })}
          </div>
          <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
            {activeTab === 'templates' && (<div>
              <div style={secT}>Quick Start</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TEMPLATES.map(function(tpl) { return (<button key={tpl.name} onClick={function(){applyTemplate(tpl);}} style={{ padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg,'+tpl.bg.join(',')+')', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}><div style={{ fontSize: 12, fontWeight: 800, color: tpl.texts[0].c }}>{tpl.name}</div><div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>Click to apply</div></button>); })}
              </div>
            </div>)}
            {activeTab === 'elements' && (<div>
              <div style={secT}>Shapes</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                <button style={btnS} onClick={function(){addShape('rect');}}>▬ Rect</button>
                <button style={btnS} onClick={function(){addShape('circle');}}>● Circle</button>
                <button style={btnS} onClick={function(){addShape('line');}}>— Line</button>
                <button style={btnS} onClick={function(){addShape('cta');}}>☐ CTA Btn</button>
              </div>
              <div style={secT}>Shape Fill</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{SWATCHES.map(function(c) { return <div key={c} className="bm-sw" style={{ background: c, borderColor: fillColor===c?'#0ea5e9':'transparent' }} onClick={function(){ setFillColor(c); if(selectedObj&&selectedObj.type!=='i-text') upd('fill',c); }} />; })}</div>
              <div style={secT}>Solid Background</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{SWATCHES.map(function(c) { return <div key={'b'+c} className="bm-sw" style={{ background: c }} onClick={function(){setSolidBg(c);}} />; })}</div>
              <div style={secT}>Gradient Backgrounds</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{GRADIENTS.map(function(g) { return <div key={g.name} className="bm-gr" style={{ background: 'linear-gradient(135deg,'+g.c.join(',')+')'}} onClick={function(){setGradientBg(g.c);}} title={g.name} />; })}</div>
            </div>)}
            {activeTab === 'text' && (<div>
              <div style={secT}>Add Text</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <button style={btnS} onClick={function(){addText('Heading',{fontSize:32,bold:true,fontWeight:'bold'});}}>+ Heading</button>
                <button style={btnS} onClick={function(){addText('Subheading',{fontSize:20});}}>+ Subheading</button>
                <button style={btnS} onClick={function(){addText('Body text',{fontSize:14});}}>+ Body Text</button>
              </div>
              <div style={secT}>Font</div>
              <select style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit', marginBottom: 10 }} value={fontFamily} onChange={function(e){setFontFamily(e.target.value); if(selectedObj&&selectedObj.type==='i-text') upd('fontFamily',e.target.value);}}>
                {FONTS.map(function(f){return <option key={f} value={f}>{f}</option>;})}
              </select>
              <div style={secT}>Size: {fontSize}px</div>
              <input type="range" min={8} max={72} value={fontSize} onChange={function(e){var v=parseInt(e.target.value);setFontSize(v);if(selectedObj&&selectedObj.type==='i-text')upd('fontSize',v);}} style={{ width: '100%', accentColor: '#0ea5e9', marginBottom: 10 }} />
              <div style={secT}>Style</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button style={Object.assign({},btnS,bold?{background:'#0ea5e9',color:'#fff',borderColor:'#0ea5e9'}:{})} onClick={function(){var v=!bold;setBold(v);if(selectedObj&&selectedObj.type==='i-text')upd('fontWeight',v?'bold':'normal');}}>B</button>
                <button style={Object.assign({},btnS,{fontStyle:'italic'},italic?{background:'#0ea5e9',color:'#fff',borderColor:'#0ea5e9'}:{})} onClick={function(){var v=!italic;setItalic(v);if(selectedObj&&selectedObj.type==='i-text')upd('fontStyle',v?'italic':'normal');}}>I</button>
              </div>
              <div style={secT}>Text Colour</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{SWATCHES.map(function(c){return <div key={'t'+c} className="bm-sw" style={{background:c,borderColor:textColor===c?'#0ea5e9':'transparent'}} onClick={function(){setTextColor(c);if(selectedObj&&selectedObj.type==='i-text')upd('fill',c);}} />;})}</div>
            </div>)}
            {activeTab === 'upload' && (<div>
              <div style={secT}>Upload Image</div>
              <label style={{ display: 'block', padding: 20, border: '2px dashed #e2e8f0', borderRadius: 10, textAlign: 'center', cursor: 'pointer', marginBottom: 14 }}>
                <div style={{ fontSize: 24, marginBottom: 6, opacity: .3 }}>📁</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Click to upload</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>PNG, JPG, SVG</div>
                <input type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
              </label>
              <div style={secT}>Or paste URL</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input id="bm-img-url" style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit' }} placeholder="https://..." />
                <button style={btnS} onClick={function(){var u=document.getElementById('bm-img-url')?.value;if(u)addImage(u);}}>Add</button>
              </div>
            </div>)}
          </div>
        </div>

        {/* CENTRE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, flexWrap: 'wrap' }}>
            <select style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }} value={canvasSize.id} onChange={function(e){setCanvasSize(SIZES.find(function(s){return s.id===e.target.value;})||SIZES[0]);}}>
              {SIZES.map(function(s){return <option key={s.id} value={s.id}>{s.name} ({s.id})</option>;})}
            </select>
            <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />
            {selectedObj && (<>
              <button style={btnS} onClick={dup} title="Duplicate">⧉</button>
              <button style={btnS} onClick={fwd} title="Forward">↑</button>
              <button style={btnS} onClick={bwd} title="Backward">↓</button>
              <button style={Object.assign({},btnS,{color:'#dc2626',borderColor:'#fecaca'})} onClick={del} title="Delete">🗑</button>
              <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />
            </>)}
            <div style={{ flex: 1 }} />
            <button style={Object.assign({},btnS,{background:'#0ea5e9',color:'#fff',borderColor:'#0ea5e9',fontSize:11})} onClick={exportPNG}>💾 PNG</button>
            <button style={Object.assign({},btnS,{background:'#8b5cf6',color:'#fff',borderColor:'#8b5cf6',fontSize:11})} onClick={exportHTML}>📄 HTML</button>
            <button style={Object.assign({},btnS,{fontSize:11})} onClick={copyCode}>📋 Copy</button>
          </div>
          <div style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 350, overflow: 'auto', backgroundImage: 'radial-gradient(circle,#cbd5e1 1px,transparent 1px)', backgroundSize: '16px 16px' }}>
            <div style={{ boxShadow: '0 8px 32px rgba(0,0,0,.15)', borderRadius: 2, overflow: 'hidden' }}>
              <CanvasEditor canvasSize={canvasSize} onCanvasReady={onCanvasReady} />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Properties</div>
          {selectedObj ? (<div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 10, padding: '5px 8px', background: '#f8f9fb', borderRadius: 6 }}>
              {selectedObj.type==='i-text'?'Text':selectedObj.type==='rect'?'Rectangle':selectedObj.type==='circle'?'Circle':selectedObj.type==='image'?'Image':'Object'}
            </div>
            {selectedObj.type==='i-text'&&(<>
              <div style={secT}>Font Size</div>
              <input type="range" min={8} max={72} value={fontSize} onChange={function(e){var v=parseInt(e.target.value);setFontSize(v);upd('fontSize',v);}} style={{width:'100%',accentColor:'#0ea5e9'}} />
              <div style={secT}>Opacity</div>
              <input type="range" min={0} max={100} defaultValue={100} onChange={function(e){upd('opacity',parseInt(e.target.value)/100);}} style={{width:'100%',accentColor:'#0ea5e9'}} />
            </>)}
            {(selectedObj.type==='rect'||selectedObj.type==='circle')&&(<>
              <div style={secT}>Fill</div>
              <input type="color" value={selectedObj.fill||'#0ea5e9'} onChange={function(e){upd('fill',e.target.value);}} style={{width:'100%',height:30,border:'none',borderRadius:6,cursor:'pointer'}} />
              <div style={secT}>Opacity</div>
              <input type="range" min={0} max={100} defaultValue={100} onChange={function(e){upd('opacity',parseInt(e.target.value)/100);}} style={{width:'100%',accentColor:'#0ea5e9'}} />
              {selectedObj.type==='rect'&&(<><div style={secT}>Corner Radius</div><input type="range" min={0} max={50} defaultValue={selectedObj.rx||0} onChange={function(e){var v=parseInt(e.target.value);upd('rx',v);upd('ry',v);}} style={{width:'100%',accentColor:'#0ea5e9'}} /></>)}
            </>)}
            {selectedObj.type==='image'&&(<><div style={secT}>Opacity</div><input type="range" min={0} max={100} defaultValue={100} onChange={function(e){upd('opacity',parseInt(e.target.value)/100);}} style={{width:'100%',accentColor:'#0ea5e9'}} /></>)}
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <button style={Object.assign({},btnS,{flex:1,fontSize:11})} onClick={dup}>Duplicate</button>
              <button style={Object.assign({},btnS,{flex:1,color:'#dc2626',borderColor:'#fecaca',fontSize:11})} onClick={del}>Delete</button>
            </div>
          </div>) : (
            <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
              <div style={{ fontSize: 20, marginBottom: 6, opacity: .3 }}>👆</div>
              <div style={{ fontSize: 11 }}>Select an element to edit</div>
            </div>
          )}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 16, paddingTop: 12 }}>
            <div style={secT}>Canvas</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{canvasSize.w}×{canvasSize.h}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{canvasSize.name}</div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 12 }}>
            <div style={secT}>Export</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={Object.assign({},btnS,{width:'100%',background:'#0ea5e9',color:'#fff',borderColor:'#0ea5e9',fontSize:11})} onClick={exportPNG}>Download PNG</button>
              <button style={Object.assign({},btnS,{width:'100%',background:'#8b5cf6',color:'#fff',borderColor:'#8b5cf6',fontSize:11})} onClick={exportHTML}>Download HTML</button>
              <button style={Object.assign({},btnS,{width:'100%',fontSize:11})} onClick={copyCode}>Copy SVG Code</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
