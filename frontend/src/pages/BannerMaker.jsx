import { useTranslation } from 'react-i18next';
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

var FONTS = ['Arial','Helvetica','Georgia','Times New Roman','Verdana','Impact','Trebuchet MS','Courier New','Sora','DM Sans'];

function CanvasEditor({ canvasSize, onCanvasReady }) {
  var canvasEl = useRef(null);
  var fc = useRef(null);
  useEffect(function() {
    if (!canvasEl.current) return;
    if (fc.current) fc.current.dispose();
    var c = new fabric.Canvas(canvasEl.current, {
      width: canvasSize.w, height: canvasSize.h,
      backgroundColor: 'var(--sap-text-primary)', preserveObjectStacking: true,
    });
    fc.current = c;
    onCanvasReady(c);
    return function() { if (fc.current) { fc.current.dispose(); fc.current = null; } };
  }, [canvasSize.id]);
  return <canvas ref={canvasEl} />;
}

export default function BannerMaker() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var isPro = (user?.membership_tier || 'basic') === 'pro';
  var [canvas, setCanvas] = useState(null);
  var [canvasSize, setCanvasSize] = useState(SIZES[0]);
  var [sel, setSel] = useState(null);
  var [color, setColor] = useState('var(--sap-accent)');
  var [bgColor, setBgColor] = useState('var(--sap-text-primary)');
  var [fontSize, setFontSize] = useState(24);
  var [fontFamily, setFontFamily] = useState('Arial');

  var onCanvasReady = useCallback(function(c) {
    setCanvas(c);
    c.on('selection:created', function(e) { onSel(e.selected?.[0]); });
    c.on('selection:updated', function(e) { onSel(e.selected?.[0]); });
    c.on('selection:cleared', function() { setSel(null); });
    c.on('object:modified', function(e) { onSel(e.target); });
  }, []);

  function onSel(obj) {
    setSel(obj);
    if (obj && obj.type === 'i-text') {
      setFontSize(Math.round(obj.fontSize || 24));
      setFontFamily(obj.fontFamily || 'Arial');
      setColor(obj.fill || '#ffffff');
    } else if (obj && (obj.type === 'rect' || obj.type === 'circle')) {
      setColor(obj.fill || 'var(--sap-accent)');
    }
  }

  function upd(p, v) { if (canvas && sel) { sel.set(p, v); canvas.renderAll(); } }

  /* ── Add Elements ── */
  function addHeading() {
    if (!canvas) return;
    var el = new fabric.IText('Heading', { left: 30, top: canvas.height * 0.2, fontSize: 32, fontFamily: 'Arial', fill: '#ffffff', fontWeight: 'bold', editable: true });
    canvas.add(el); canvas.setActiveObject(el); canvas.renderAll();
  }
  function addBody() {
    if (!canvas) return;
    var el = new fabric.IText('Body text here', { left: 30, top: canvas.height * 0.5, fontSize: 16, fontFamily: 'Arial', fill: '#ffffff', editable: true });
    canvas.add(el); canvas.setActiveObject(el); canvas.renderAll();
  }
  function addButton() {
    if (!canvas) return;
    var g = new fabric.Group([
      new fabric.Rect({ width: 130, height: 38, fill: color, rx: 8, ry: 8 }),
      new fabric.Text('Click Here', { fontSize: 14, fontWeight: 'bold', fill: '#ffffff', originX: 'center', originY: 'center', fontFamily: 'Arial' }),
    ], { left: canvas.width * 0.65, top: canvas.height * 0.3 });
    canvas.add(g); canvas.setActiveObject(g); canvas.renderAll();
  }
  function addRect() {
    if (!canvas) return;
    var r = new fabric.Rect({ left: 50, top: 30, width: 120, height: 60, fill: color, rx: 6, ry: 6 });
    canvas.add(r); canvas.setActiveObject(r); canvas.renderAll();
  }
  function addCircle() {
    if (!canvas) return;
    var c2 = new fabric.Circle({ left: 80, top: 30, radius: 30, fill: color });
    canvas.add(c2); canvas.setActiveObject(c2); canvas.renderAll();
  }
  function addLine() {
    if (!canvas) return;
    var l = new fabric.Line([30, canvas.height / 2, canvas.width - 30, canvas.height / 2], { stroke: color, strokeWidth: 2 });
    canvas.add(l); canvas.setActiveObject(l); canvas.renderAll();
  }
  function uploadImg(e) {
    var f = e.target.files?.[0]; if (!f || !canvas) return;
    var r = new FileReader();
    r.onload = function(ev) {
      fabric.Image.fromURL(ev.target.result, function(img) {
        var s = Math.min((canvas.width * 0.5) / img.width, (canvas.height * 0.8) / img.height, 1);
        img.set({ left: 20, top: 10, scaleX: s, scaleY: s });
        canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
      });
    };
    r.readAsDataURL(f);
  }
  function addImgUrl() {
    var url = document.getElementById('bm-url')?.value; if (!url || !canvas) return;
    fabric.Image.fromURL(url, function(img) {
      var s = Math.min((canvas.width * 0.5) / img.width, (canvas.height * 0.8) / img.height, 1);
      img.set({ left: 20, top: 10, scaleX: s, scaleY: s });
      canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  }

  function changeBg(c) {
    if (!canvas) return;
    setBgColor(c);
    canvas.setBackgroundColor(c, function() { canvas.renderAll(); });
  }
  function setGradBg(c1, c2) {
    if (!canvas) return;
    var grad = new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: canvas.width, y2: canvas.height }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] });
    canvas.setBackgroundColor(grad, function() { canvas.renderAll(); });
  }

  function del() { if (canvas && sel) { canvas.remove(sel); setSel(null); canvas.renderAll(); } }
  function dup() { if (!canvas || !sel) return; sel.clone(function(c) { c.set({ left: (sel.left || 0) + 15, top: (sel.top || 0) + 15 }); canvas.add(c); canvas.setActiveObject(c); canvas.renderAll(); }); }
  function fwd() { if (canvas && sel) { canvas.bringForward(sel); canvas.renderAll(); } }
  function bwd() { if (canvas && sel) { canvas.sendBackwards(sel); canvas.renderAll(); } }

  function exportPNG() { if (!canvas) return; var a = document.createElement('a'); a.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 }); a.download = 'banner-' + canvasSize.id + '.png'; a.click(); }
  function exportHTML() { if (!canvas) return; var h = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">' + canvas.toSVG() + '</body></html>'; var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([h], { type: 'text/html' })); a.download = 'banner.html'; a.click(); }
  function copySVG() { if (!canvas) return; navigator.clipboard.writeText(canvas.toSVG()).then(function() { alert('SVG code copied!'); }); }

  var btnS = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--sap-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', transition: 'all .12s' };

  if (!isPro) {
    return (
      <AppLayout title={t('bannerMaker.title')} subtitle={t('bannerMaker.designBanners')}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{t('bannerMaker.proFeature')}</h2>
          <p style={{ fontSize: 15, color: 'var(--sap-text-muted)', lineHeight: 1.6, maxWidth: 450, margin: '0 auto 24px' }}>{t("bannerMaker.proFeatureDesc")}</p>
          <a href="/upgrade" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 0 #6d28d9' }}>{t('bannerMaker.upgradeToPro')}</a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('bannerMaker.title')} subtitle={t('bannerMaker.dragElements')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ═══ TOP TOOLBAR ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, flexWrap: 'wrap' }}>
          {/* Size */}
          <select style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', background: 'var(--sap-bg-input)' }}
            value={canvasSize.id} onChange={function(e) { setCanvasSize(SIZES.find(function(s) { return s.id === e.target.value; }) || SIZES[0]); }}>
            {SIZES.map(function(s) { return <option key={s.id} value={s.id}>{s.name} ({s.id})</option>; })}
          </select>

          <div style={{ width: 1, height: 24, background: 'var(--sap-border)' }} />

          {/* Add elements */}
          <button style={btnS} onClick={addHeading}>{t('bannerMaker.heading')}</button>
          <button style={btnS} onClick={addBody}>{t('bannerMaker.text')}</button>
          <button style={btnS} onClick={addButton}>{t('bannerMaker.button')}</button>
          <button style={btnS} onClick={addRect}>{t('bannerMaker.rect')}</button>
          <button style={btnS} onClick={addCircle}>{t('bannerMaker.circle')}</button>
          <button style={btnS} onClick={addLine}>{t('bannerMaker.line')}</button>
          <label style={Object.assign({}, btnS, { cursor: 'pointer' })}>
            📁 Image
            <input type="file" accept="image/*" onChange={uploadImg} style={{ display: 'none' }} />
          </label>

          <div style={{ width: 1, height: 24, background: 'var(--sap-border)' }} />

          {/* Colour picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-faint)' }}>{t('bannerMaker.colour')}</span>
            <input type="color" value={color} onChange={function(e) {
              setColor(e.target.value);
              if (sel) {
                if (sel.type === 'i-text') upd('fill', e.target.value);
                else if (sel.type === 'rect' || sel.type === 'circle') upd('fill', e.target.value);
                else if (sel.type === 'line') upd('stroke', e.target.value);
              }
            }} style={{ width: 32, height: 32, border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-faint)' }}>{t('bannerMaker.bg')}</span>
            <input type="color" value={bgColor} onChange={function(e) { changeBg(e.target.value); }}
              style={{ width: 32, height: 32, border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
          </div>

          <div style={{ flex: 1 }} />

          {/* Layer controls (only when selected) */}
          {sel && (
            <>
              <button style={btnS} onClick={dup} title={t('bannerMaker.duplicateEl')}>⧉</button>
              <button style={btnS} onClick={fwd} title={t('bannerMaker.bringForward')}>↑</button>
              <button style={btnS} onClick={bwd} title={t('bannerMaker.sendBackward')}>↓</button>
              <button style={Object.assign({}, btnS, { color: 'var(--sap-red)', borderColor: 'var(--sap-red-bg-mid)' })} onClick={del} title={t('bannerMaker.deleteEl')}>🗑</button>
              <div style={{ width: 1, height: 24, background: 'var(--sap-border)' }} />
            </>
          )}

          {/* Export */}
          <button style={Object.assign({}, btnS, { background: 'var(--sap-accent)', color: '#fff', borderColor: 'var(--sap-accent)' })} onClick={exportPNG}>{t('bannerMaker.savePng')}</button>
          <button style={Object.assign({}, btnS, { background: 'var(--sap-purple)', color: '#fff', borderColor: 'var(--sap-purple)' })} onClick={exportHTML}>{t('bannerMaker.saveHtml')}</button>
          <button style={btnS} onClick={copySVG}>{t('bannerMaker.copyCode')}</button>
        </div>

        {/* ═══ MAIN AREA ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12 }}>

          {/* Canvas */}
          <div ref={function(el) {
            if (el && !el._measured) {
              el._measured = true;
              var rect = el.getBoundingClientRect();
              el.style.setProperty('--cw', rect.width - 48 + 'px');
            }
          }} style={{ background: 'var(--sap-bg-page)', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24,
            display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 500,
            overflow: 'hidden' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{
                boxShadow: '0 12px 40px rgba(0,0,0,.2)', borderRadius: 4, overflow: 'hidden',
                transform: 'scale(' + Math.min(3, 900 / canvasSize.w, 450 / canvasSize.h) + ')',
                transformOrigin: 'center center',
              }}>
                <CanvasEditor canvasSize={canvasSize} onCanvasReady={onCanvasReady} />
              </div>
            </div>
          </div>

          {/* Right Panel — Properties + Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Properties */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('bannerMaker.properties')}</div>

              {sel ? (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sap-text-faint)', padding: '4px 8px', background: 'var(--sap-bg-input)', borderRadius: 6, marginBottom: 12 }}>
                    {sel.type === 'i-text' ? '🔤 Text' : sel.type === 'rect' ? '▬ Rectangle' : sel.type === 'circle' ? '● Circle' : sel.type === 'image' ? '📁 Image' : sel.type === 'line' ? '— Line' : '☐ Object'}
                  </div>

                  {sel.type === 'i-text' && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sap-text-faint)', marginBottom: 4 }}>{t('bannerMaker.font')}</div>
                      <select style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit', marginBottom: 10 }}
                        value={fontFamily} onChange={function(e) { setFontFamily(e.target.value); upd('fontFamily', e.target.value); }}>
                        {FONTS.map(function(f) { return <option key={f} value={f}>{f}</option>; })}
                      </select>

                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sap-text-faint)', marginBottom: 4 }}>Size: {fontSize}px</div>
                      <input type="range" min={8} max={80} value={fontSize}
                        onChange={function(e) { var v = parseInt(e.target.value); setFontSize(v); upd('fontSize', v); }}
                        style={{ width: '100%', accentColor: 'var(--sap-accent)', marginBottom: 10 }} />

                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <button style={Object.assign({}, btnS, { flex: 1, fontSize: 13, fontWeight: 900 }, sel.fontWeight === 'bold' ? { background: 'var(--sap-accent)', color: '#fff', borderColor: 'var(--sap-accent)' } : {})}
                          onClick={function() { var v = sel.fontWeight === 'bold' ? 'normal' : 'bold'; upd('fontWeight', v); }}>B</button>
                        <button style={Object.assign({}, btnS, { flex: 1, fontSize: 13, fontStyle: 'italic' }, sel.fontStyle === 'italic' ? { background: 'var(--sap-accent)', color: '#fff', borderColor: 'var(--sap-accent)' } : {})}
                          onClick={function() { var v = sel.fontStyle === 'italic' ? 'normal' : 'italic'; upd('fontStyle', v); }}>I</button>
                        <button style={Object.assign({}, btnS, { flex: 1, fontSize: 11, textDecoration: 'underline' }, sel.underline ? { background: 'var(--sap-accent)', color: '#fff', borderColor: 'var(--sap-accent)' } : {})}
                          onClick={function() { upd('underline', !sel.underline); }}>U</button>
                      </div>
                    </>
                  )}

                  {(sel.type === 'rect' || sel.type === 'circle') && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sap-text-faint)', marginBottom: 4 }}>{t('bannerMaker.fill')}</div>
                      <input type="color" value={sel.fill || 'var(--sap-accent)'} onChange={function(e) { upd('fill', e.target.value); setColor(e.target.value); }}
                        style={{ width: '100%', height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 10 }} />
                      {sel.type === 'rect' && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sap-text-faint)', marginBottom: 4 }}>Corners: {sel.rx || 0}px</div>
                          <input type="range" min={0} max={50} value={sel.rx || 0}
                            onChange={function(e) { var v = parseInt(e.target.value); upd('rx', v); upd('ry', v); }}
                            style={{ width: '100%', accentColor: 'var(--sap-accent)', marginBottom: 10 }} />
                        </>
                      )}
                    </>
                  )}

                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sap-text-faint)', marginBottom: 4 }}>{t('bannerMaker.opacity')}</div>
                  <input type="range" min={0} max={100} value={Math.round((sel.opacity || 1) * 100)}
                    onChange={function(e) { upd('opacity', parseInt(e.target.value) / 100); }}
                    style={{ width: '100%', accentColor: 'var(--sap-accent)', marginBottom: 10 }} />

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={Object.assign({}, btnS, { flex: 1, fontSize: 11 })} onClick={dup}>{t('bannerMaker.duplicate')}</button>
                    <button style={Object.assign({}, btnS, { flex: 1, fontSize: 11, color: 'var(--sap-red)', borderColor: 'var(--sap-red-bg-mid)' })} onClick={del}>{t('bannerMaker.delete')}</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 12, color: 'var(--sap-text-faint)' }}>
                  <div style={{ fontSize: 18, marginBottom: 6, opacity: .3 }}>👆</div>
                  <div style={{ fontSize: 11, lineHeight: 1.5 }}>{t('bannerMaker.clickElement')}</div>
                </div>
              )}
            </div>

            {/* Quick Gradient BG */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('bannerMaker.quickBackgrounds')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {[
                  ['#667eea','#764ba2'], ['var(--sap-text-primary)','#334155'], ['var(--sap-green-dark)','#34d399'],
                  ['#f97316','var(--sap-pink)'], ['var(--sap-accent)','#14b8a6'], ['var(--sap-purple)','#3b82f6'],
                  ['var(--sap-red)','var(--sap-amber-bright)'], ['#78350f','#ca8a04'], ['#09090b','#18181b'],
                ].map(function(pair, i) {
                  return <div key={i} style={{ height: 24, borderRadius: 4, cursor: 'pointer', background: 'linear-gradient(135deg,' + pair[0] + ',' + pair[1] + ')', border: '1px solid rgba(0,0,0,.1)' }}
                    onClick={function() { setGradBg(pair[0], pair[1]); }} />;
                })}
              </div>
            </div>

            {/* Image URL */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('bannerMaker.addImageUrl')}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input id="bm-url" style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit' }} placeholder={t('common.urlPlaceholder')} />
                <button style={Object.assign({}, btnS, { fontSize: 11 })} onClick={addImgUrl}>{t('bannerMaker.add')}</button>
              </div>
            </div>

            {/* Canvas info */}
            <div style={{ padding: '10px 16px', background: 'var(--sap-bg-input)', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11, color: 'var(--sap-text-faint)' }}>
              <span style={{ fontWeight: 800, color: 'var(--sap-text-secondary)' }}>{canvasSize.w}×{canvasSize.h}</span> · {canvasSize.name}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
