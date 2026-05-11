// TextStyleRenderer.jsx
// ============================================================================
// Renders one of the 8 text styles as an SVG. Each style is a small
// component; the dispatcher picks one based on `layer.styleKey`.
//
// All styles use the same multi-layer SVG technique proved in the
// 8-style demo (text-engine-demo-full.html). No CSS-only shortcuts:
// extrusion stacks, gradient fills, paint-order strokes.
//
// Props:
//   layer  — the canvas layer object {type:'text', styleKey, content,
//            fontSize, color, ...}
//   width  — render width in design-space px (matches layer.w)
//   height — render height in design-space px (matches layer.h)
// ============================================================================

// Unique-per-renderer-instance id suffix for gradient defs so multiple
// text layers on the same canvas don't share/clobber gradient IDs.
let _gradCounter = 0;
function nextGradId() { _gradCounter += 1; return 'g' + _gradCounter; }

export default function TextStyleRenderer({ layer, width, height }) {
  var styleKey = layer.styleKey || 'solid-punch';
  var content  = layer.content  || ' ';
  var fontSize = layer.fontSize || 140;

  // viewBox sized to the layer's design-space dimensions so the text
  // scales naturally with resize handles.
  var viewBox = '0 0 ' + width + ' ' + height;

  switch (styleKey) {
    case 'gold-extrude':    return <GoldExtrude   viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} />;
    case 'blue-chrome':     return <BlueChrome    viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} />;
    case 'solid-punch':     return <SolidPunch    viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} />;
    case 'neon-glow':       return <NeonGlow      viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} layer={layer} />;
    case 'inset-carved':    return <InsetCarved   viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} />;
    case 'gradient-slice':  return <GradientSlice viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} />;
    case 'stamped-outline': return <StampedOutline viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} layer={layer} />;
    case 'editorial-serif': return <EditorialSerif viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} layer={layer} />;
    default:                return <SolidPunch    viewBox={viewBox} text={content} fontSize={fontSize} w={width} h={height} />;
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────
function svgRoot(viewBox, children) {
  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', userSelect: 'none' }}>
      {children}
    </svg>
  );
}

// All styles centre vertically + horizontally inside the layer box.
function centreXY(w, h) { return { cx: w / 2, cy: h / 2 + 0.32 * (h / 2) }; }   // 0.32 offset = visual baseline alignment

// ═══════════════════════════════════════════════════════════════════════════
// 01 · 3D GOLD EXTRUDE
// ═══════════════════════════════════════════════════════════════════════════
function GoldExtrude({ viewBox, text, fontSize, w, h }) {
  var gid = 'gold' + nextGradId();
  var sid = 'goldShine' + nextGradId();
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE680"/>
          <stop offset="35%" stopColor="#FFA728"/>
          <stop offset="65%" stopColor="#E07810"/>
          <stop offset="100%" stopColor="#8B4500"/>
        </linearGradient>
        <linearGradient id={sid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)"/>
          <stop offset="40%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>
      {/* extrusion stack — 5 layers of darkening shadow */}
      {[
        { dx: 10, dy: 10, fill: '#3a1a00' },
        { dx: 8,  dy: 8,  fill: '#4a2200' },
        { dx: 6,  dy: 6,  fill: '#5a2a00' },
        { dx: 4,  dy: 4,  fill: '#6a3500' },
        { dx: 2,  dy: 2,  fill: '#7a4000' },
      ].map(function(s, i) {
        return (
          <text key={i} x={cx} y={cy} textAnchor="middle"
                fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
                fill={s.fill} stroke={s.fill} strokeWidth="2"
                transform={'translate(' + s.dx + ',' + s.dy + ')'}>
            {text}
          </text>
        );
      })}
      {/* gradient face with dark rim */}
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            fill={'url(#' + gid + ')'} stroke="#3a1a00" strokeWidth="3" paintOrder="stroke">
        {text}
      </text>
      {/* top shine */}
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            fill={'url(#' + sid + ')'} style={{ mixBlendMode: 'screen' }}>
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 02 · 3D BLUE CHROME
// ═══════════════════════════════════════════════════════════════════════════
function BlueChrome({ viewBox, text, fontSize, w, h }) {
  var fid = 'blue' + nextGradId();
  var sid = 'blueShine' + nextGradId();
  var eid = 'goldEdge' + nextGradId();
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      <defs>
        <linearGradient id={fid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A8D0FF"/>
          <stop offset="15%" stopColor="#3D7FE8"/>
          <stop offset="35%" stopColor="#1E4FB8"/>
          <stop offset="50%" stopColor="#0A2F8C"/>
          <stop offset="65%" stopColor="#1A4AA8"/>
          <stop offset="85%" stopColor="#2D5FC8"/>
          <stop offset="100%" stopColor="#0F2855"/>
        </linearGradient>
        <linearGradient id={sid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)"/>
          <stop offset="35%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <linearGradient id={eid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE680"/>
          <stop offset="100%" stopColor="#996600"/>
        </linearGradient>
      </defs>
      {[
        { dx: 14, dy: 14, fill: '#021238' },
        { dx: 10, dy: 10, fill: '#031a4a' },
        { dx: 6,  dy: 6,  fill: '#052255' },
        { dx: 3,  dy: 3,  fill: '#072d6a' },
      ].map(function(s, i) {
        return (
          <text key={i} x={cx} y={cy} textAnchor="middle"
                fontFamily="Archivo Black, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
                fill={s.fill} stroke={s.fill} strokeWidth="3"
                transform={'translate(' + s.dx + ',' + s.dy + ')'}>
            {text}
          </text>
        );
      })}
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Archivo Black, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            fill={'url(#' + fid + ')'} stroke={'url(#' + eid + ')'} strokeWidth="5" paintOrder="stroke">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Archivo Black, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            fill={'url(#' + sid + ')'} style={{ mixBlendMode: 'screen' }}>
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 03 · SOLID PUNCH (the "I'LL BE BACK" meme treatment)
// ═══════════════════════════════════════════════════════════════════════════
function SolidPunch({ viewBox, text, fontSize, w, h }) {
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="2" fill="rgba(0,0,0,0.6)" transform="translate(4, 8)">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="2" fill="#ffffff" stroke="#000000" strokeWidth="10" paintOrder="stroke">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="2" fill="#ffffff">
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 04 · NEON GLOW
// ═══════════════════════════════════════════════════════════════════════════
function NeonGlow({ viewBox, text, fontSize, w, h, layer }) {
  var fid = 'neon' + nextGradId();
  var coreColor = (layer && layer.color) || '#aef4ff';
  var glowColor = (layer && layer.glowColor) || '#00d4ff';
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      <defs>
        <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur1"/>
          <feGaussianBlur stdDeviation="8" result="blur2"/>
          <feGaussianBlur stdDeviation="20" result="blur3"/>
          <feMerge>
            <feMergeNode in="blur3"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Orbitron, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="6" fill={glowColor} filter={'url(#' + fid + ')'} opacity="0.9">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Orbitron, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="6" fill={coreColor} stroke="#ffffff" strokeWidth="1">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Orbitron, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="6" fill="#ffffff" opacity="0.7">
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 05 · INSET CARVED
// ═══════════════════════════════════════════════════════════════════════════
function InsetCarved({ viewBox, text, fontSize, w, h }) {
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Oswald, sans-serif" fontSize={fontSize} fontWeight="700"
            letterSpacing="6" fill="rgba(255,255,255,0.18)" transform="translate(0, 2)">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Oswald, sans-serif" fontSize={fontSize} fontWeight="700"
            letterSpacing="6" fill="#0a0a0d">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Oswald, sans-serif" fontSize={fontSize} fontWeight="700"
            letterSpacing="6" fill="rgba(0,0,0,0.6)" transform="translate(-1, -1)">
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 06 · GRADIENT SLICE
// ═══════════════════════════════════════════════════════════════════════════
function GradientSlice({ viewBox, text, fontSize, w, h }) {
  var fid = 'slice' + nextGradId();
  var bid = 'sliceBack' + nextGradId();
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      <defs>
        <linearGradient id={fid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFA500"/>
          <stop offset="49.9%" stopColor="#FF6600"/>
          <stop offset="50%" stopColor="#FF1A8C"/>
          <stop offset="100%" stopColor="#B30060"/>
        </linearGradient>
        <linearGradient id={bid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7a2a00"/>
          <stop offset="49.9%" stopColor="#4a1500"/>
          <stop offset="50%" stopColor="#601535"/>
          <stop offset="100%" stopColor="#2a0a18"/>
        </linearGradient>
      </defs>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="3" fill={'url(#' + bid + ')'} transform="translate(8, 8)">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="3" fill={'url(#' + bid + ')'} transform="translate(4, 4)">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="3" fill={'url(#' + fid + ')'} stroke="#1a0510" strokeWidth="3" paintOrder="stroke">
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 07 · STAMPED OUTLINE
// ═══════════════════════════════════════════════════════════════════════════
function StampedOutline({ viewBox, text, fontSize, w, h, layer }) {
  var sid = 'stamp' + nextGradId();
  var strokeColor = (layer && layer.color);   // member can override; default gold gradient
  var useDefault = !strokeColor;
  var { cx, cy } = centreXY(w, h);
  return svgRoot(viewBox, (
    <>
      {useDefault && (
        <defs>
          <linearGradient id={sid} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE680"/>
            <stop offset="50%" stopColor="#FFC125"/>
            <stop offset="100%" stopColor="#996600"/>
          </linearGradient>
        </defs>
      )}
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="6" fill="none" stroke="rgba(255,193,37,0.35)" strokeWidth="20">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="6" fill="none"
            stroke={useDefault ? ('url(#' + sid + ')') : strokeColor}
            strokeWidth="6">
        {text}
      </text>
      <text x={cx} y={cy} textAnchor="middle"
            fontFamily="Anton, Impact, sans-serif" fontSize={fontSize} fontWeight="900"
            letterSpacing="6" fill="none" stroke="#2a1a00" strokeWidth="1.5">
        {text}
      </text>
    </>
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 08 · EDITORIAL SERIF
// ═══════════════════════════════════════════════════════════════════════════
function EditorialSerif({ viewBox, text, fontSize, w, h, layer }) {
  var rid = 'rule' + nextGradId();
  var ink = (layer && layer.color) || '#3a2410';
  return svgRoot(viewBox, (
    <>
      <defs>
        <linearGradient id={rid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(150,100,0,0)"/>
          <stop offset="50%" stopColor="#B8860B"/>
          <stop offset="100%" stopColor="rgba(150,100,0,0)"/>
        </linearGradient>
      </defs>
      <text x={w / 2} y={h * 0.6} textAnchor="middle"
            fontFamily="Playfair Display, Georgia, serif" fontStyle="italic"
            fontWeight="700" fontSize={fontSize} fill={ink}>
        {text}
      </text>
      <line x1={w * 0.28} y1={h * 0.75} x2={w * 0.72} y2={h * 0.75}
            stroke={'url(#' + rid + ')'} strokeWidth="2"/>
    </>
  ));
}
