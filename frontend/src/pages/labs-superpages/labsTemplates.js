// ═══════════════════════════════════════════════════════════════
// SuperPages Labs — Starter template library
// ═══════════════════════════════════════════════════════════════
//
// Each template is a complete page definition the editor can load
// in one click. Shape matches the editor's runtime data exactly:
//
//   {
//     id: 'free-toolkit-opt-in',   // stable identifier
//     name: 'Free Toolkit Opt-in', // shown in gallery card
//     category: 'Lead Capture',    // for filter pills
//     description: '...',          // 1-2 sentences for card
//     accent: '#12388f',           // colour for category eyebrow
//     thumbnailGradient: '...',    // CSS gradient for placeholder thumb
//                                  //   (real screenshots come later)
//     canvasBg: '#081335',         // page background colour
//     canvasBgImage: '',           // page background image URL (optional)
//     els: [ {id, type, x, y, w, h, txt, s, ...}, ... ]
//   }
//
// Coordinates assume a 1100px canvas width. CENTRE_TYPES are placed
// at x = (1100 - w) / 2 (consistent with the editor's centring rule).
//
// Templates use the Hybrid block system locked 14 May 2026 — see
// the design index document for the engagement-vs-information rule.

// Helper: deterministic ID generator so the same template applied
// twice doesn't collide. Real elements use timestamp-random IDs;
// templates use predictable ones because they're seed data.
function tid(template, n) { return 't_' + template + '_' + n; }

// ─────────────────────────────────────────────────────────────────
// AdvantageLife lead pages — curiosity-first opt-ins + reveal bridge.
// Honest copy (no income claims / fake scarcity), AL palette only.
// ─────────────────────────────────────────────────────────────────
const AL_OPTIN_TOOLKIT = {
  id: 'free-toolkit-opt-in', name: 'Free Toolkit Opt-in', category: 'Lead Capture', canvasBg: '#081335',
  els: [
    { id: tid('AL_', 1), type: 'badge', x: 400, y: 74, w: 300, h: 34, txt: 'FREE &middot; NO CARD',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '800', fontSize: '12px', letterSpacing: '.08em', color: '#22c26b', textAlign: 'center', background: 'rgba(34,194,107,0.12)', borderRadius: '30px', border: '1px solid #22c26b55', padding: '8px 0' } },
    { id: tid('AL_', 2), type: 'heading', x: 170, y: 145, w: 760, h: 155, txt: 'The free toolkit smart marketers use to get leads &mdash; without paying for ads.',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '900', fontSize: '44px', color: '#ffffff', textAlign: 'center', lineHeight: '1.08', letterSpacing: '-0.5px' } },
    { id: tid('AL_', 3), type: 'text', x: 250, y: 320, w: 600, h: 70, txt: 'Page builder, autoresponder, and a daily habit that actually brings you traffic. I&rsquo;ll send it straight over.',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '17px', color: '#c8d6f5', textAlign: 'center', lineHeight: '1.55', fontWeight: '500' } },
    { id: tid('AL_', 4), type: 'form', x: 340, y: 415, w: 420, h: 135,
      txt: '<div style="text-align:center"><input placeholder="Your best email address" style="display:block;width:100%;padding:15px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);color:#fff;font-size:15px;margin-bottom:10px;box-sizing:border-box;outline:none"><button data-sp-submit="1" style="display:block;width:100%;padding:16px;border-radius:12px;background:linear-gradient(180deg,#ff2743,#c8102e);color:#fff;font-weight:900;font-size:17px;text-align:center;box-sizing:border-box;border:none;cursor:pointer">Send me free access &#8594;</button></div>',
      s: { background: 'transparent' } },
    { id: tid('AL_', 5), type: 'text', x: 300, y: 570, w: 500, h: 26, txt: '100%% free &middot; No credit card &middot; Unsubscribe anytime',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '12px', color: '#7f90bd', textAlign: 'center', fontWeight: '600' } },
  ],
};

const AL_OPTIN_HOWITWORKS = {
  id: 'how-it-works-opt-in', name: 'How It Works Opt-in', category: 'Lead Capture', canvasBg: '#0b0f1a',
  els: [
    { id: tid('AL_', 1), type: 'badge', x: 400, y: 74, w: 300, h: 34, txt: '&#9889; SEE HOW IT WORKS',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '800', fontSize: '12px', letterSpacing: '.08em', color: '#f0a52a', textAlign: 'center', background: 'rgba(240,165,42,0.12)', borderRadius: '30px', border: '1px solid #f0a52a55', padding: '8px 0' } },
    { id: tid('AL_', 2), type: 'heading', x: 170, y: 145, w: 760, h: 155, txt: 'What if your ads were watched by real people &mdash; not lost in a feed?',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '900', fontSize: '44px', color: '#ffffff', textAlign: 'center', lineHeight: '1.08', letterSpacing: '-0.5px' } },
    { id: tid('AL_', 3), type: 'text', x: 250, y: 320, w: 600, h: 70, txt: 'Enter your email and I&rsquo;ll show you exactly how it works. Free to try, nothing to buy.',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '17px', color: '#c8d6f5', textAlign: 'center', lineHeight: '1.55', fontWeight: '500' } },
    { id: tid('AL_', 4), type: 'form', x: 340, y: 415, w: 420, h: 135,
      txt: '<div style="text-align:center"><input placeholder="Your best email address" style="display:block;width:100%;padding:15px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);color:#fff;font-size:15px;margin-bottom:10px;box-sizing:border-box;outline:none"><button data-sp-submit="1" style="display:block;width:100%;padding:16px;border-radius:12px;background:linear-gradient(180deg,#ffb43e,#f0a52a);color:#fff;font-weight:900;font-size:17px;text-align:center;box-sizing:border-box;border:none;cursor:pointer">Show me how &#8594;</button></div>',
      s: { background: 'transparent' } },
    { id: tid('AL_', 5), type: 'text', x: 300, y: 570, w: 500, h: 26, txt: 'Free walkthrough &middot; No card &middot; Cancel anytime',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '12px', color: '#7f90bd', textAlign: 'center', fontWeight: '600' } },
  ],
};

const AL_OPTIN_GAME = {
  id: '$400-game-opt-in', name: '$400 Game Opt-in', category: 'Lead Capture', canvasBg: '#0d1230',
  els: [
    { id: tid('AL_', 1), type: 'badge', x: 400, y: 74, w: 300, h: 34, txt: '&#127918; FREE TO PLAY',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '800', fontSize: '12px', letterSpacing: '.08em', color: '#ff8a99', textAlign: 'center', background: 'rgba(255,39,67,0.14)', borderRadius: '30px', border: '1px solid #ff8a9955', padding: '8px 0' } },
    { id: tid('AL_', 2), type: 'heading', x: 170, y: 145, w: 760, h: 155, txt: 'Beat this month&rsquo;s top score and win $400.',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '900', fontSize: '44px', color: '#ffffff', textAlign: 'center', lineHeight: '1.08', letterSpacing: '-0.5px' } },
    { id: tid('AL_', 3), type: 'text', x: 250, y: 320, w: 600, h: 70, txt: 'Drop your email, play free, and you&rsquo;re on the leaderboard. Top score at month end wins.',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '17px', color: '#c8d6f5', textAlign: 'center', lineHeight: '1.55', fontWeight: '500' } },
    { id: tid('AL_', 4), type: 'form', x: 340, y: 415, w: 420, h: 135,
      txt: '<div style="text-align:center"><input placeholder="Your best email address" style="display:block;width:100%;padding:15px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);color:#fff;font-size:15px;margin-bottom:10px;box-sizing:border-box;outline:none"><button data-sp-submit="1" style="display:block;width:100%;padding:16px;border-radius:12px;background:linear-gradient(180deg,#ff2743,#c8102e);color:#fff;font-weight:900;font-size:17px;text-align:center;box-sizing:border-box;border:none;cursor:pointer">Let me play free &#8594;</button></div>',
      s: { background: 'transparent' } },
    { id: tid('AL_', 5), type: 'text', x: 300, y: 570, w: 500, h: 26, txt: 'Free to play &middot; Skill wins &middot; No purchase to enter',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '12px', color: '#7f90bd', textAlign: 'center', fontWeight: '600' } },
  ],
};

const AL_REVEAL = {
  id: 'reveal-bridge', name: 'Reveal / Bridge Page', category: 'Conversion', canvasBg: '#081335',
  els: [
    { id: tid('alr', 1), type: 'badge', x: 370, y: 64, w: 360, h: 32, txt: '&#10003; YOU&rsquo;RE IN &mdash; CHECK YOUR INBOX',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '800', fontSize: '13px', letterSpacing: '.06em', color: '#22c26b', textAlign: 'center', background: 'transparent' } },
    { id: tid('alr', 2), type: 'heading', x: 200, y: 120, w: 700, h: 70, txt: 'It&rsquo;s called AdvantageLife',
      s: { fontFamily: 'Inter,sans-serif', fontWeight: '900', fontSize: '46px', color: '#ffffff', textAlign: 'center', letterSpacing: '-0.5px' } },
    { id: tid('alr', 3), type: 'text', x: 240, y: 210, w: 620, h: 70, txt: 'Video advertising watched by real people, plus the full marketing toolkit. Watch the 2-minute overview, then claim your free account.',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '17px', color: '#c8d6f5', textAlign: 'center', lineHeight: '1.55', fontWeight: '500' } },
    { id: tid('alr', 4), type: 'video', x: 270, y: 305, w: 560, h: 300, txt: 'https://customer-oubslbdxlrt8pz6n.cloudflarestream.com/3d4fe9c5fc5289700d21a3c2401e2e39/iframe?primaryColor=%23c8102e', url: '',
      s: { background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)' } },
    { id: tid('alr', 5), type: 'button', x: 370, y: 630, w: 360, h: 58, txt: 'Claim my free account &#8594;', url: '/register',
      s: { background: 'linear-gradient(180deg,#ff2743,#c8102e)', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: '900', fontSize: '18px', textAlign: 'center', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    { id: tid('alr', 6), type: 'text', x: 340, y: 705, w: 420, h: 24, txt: 'Free &middot; no card &middot; full access from day one',
      s: { fontFamily: 'Inter,sans-serif', fontSize: '12px', color: '#7f90bd', textAlign: 'center', fontWeight: '600' } },
  ],
};

export const LABS_TEMPLATES = [
  AL_OPTIN_TOOLKIT,
  AL_OPTIN_HOWITWORKS,
  AL_OPTIN_GAME,
  AL_REVEAL,
];

// Category list — derived from templates, for filter pills in the
// gallery. Keep "All" as the first entry.
export const TEMPLATE_CATEGORIES = [
  { key: 'all',         label: 'All templates', colour: '#12388f' },
  { key: 'Conversion',  label: 'Conversion',    colour: '#c8102e' },
  { key: 'Lead Capture',label: 'Lead Capture',  colour: '#22c26b' },
];
