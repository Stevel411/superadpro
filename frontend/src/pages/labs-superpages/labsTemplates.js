// ═══════════════════════════════════════════════════════════════
// SuperPages Labs — Starter template library
// ═══════════════════════════════════════════════════════════════
//
// Each template is a complete page definition the editor can load
// in one click. Shape matches the editor's runtime data exactly:
//
//   {
//     id: 'course-sales',          // stable identifier
//     name: 'Course Sales Page',   // shown in gallery card
//     category: 'Conversion',      // for filter pills
//     description: '...',          // 1-2 sentences for card
//     accent: '#a855f7',           // colour for category eyebrow
//     thumbnailGradient: '...',    // CSS gradient for placeholder thumb
//                                  //   (real screenshots come later)
//     canvasBg: '#0a1228',         // page background colour
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
// Template 01 — Course Sales Page
// Dark hero · gradient CTAs · trust stats · testimonials · FAQ.
// The reference design from our v2 mockup process.
// ─────────────────────────────────────────────────────────────────
const COURSE_SALES = {
  id: 'course-sales',
  name: 'Course Sales',
  category: 'Conversion',
  description: 'Premium violet course sales page: benefit headline, price and guarantee beside a course-player card with a module preview. CTA button links to the member\'s checkout.',
  accent: '#7c3aed',
  thumbnailGradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 55%, #1b1033 100%)',
  canvasBg: '#1b1033',
  canvasBgImage: '',
  els: [
    // Badge (top-left)
    { id: tid('cs', 1), type: 'badge', x: 90, y: 90, w: 214, h: 34,
      txt: '&#127891; ONLINE COURSE',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '700', fontSize: '11px', color: '#d6c4fb', textAlign: 'center', background: 'rgba(168,85,247,0.14)', borderRadius: '999px', border: '1px solid rgba(168,85,247,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.1em' } },

    // Hero heading (left)
    { id: tid('cs', 2), type: 'heading', x: 90, y: 150, w: 470, h: 150,
      txt: 'Master the skill that <span style="color:#c4b5fd">actually pays</span>',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '800', fontSize: '40px', color: '#ffffff', textAlign: 'left', letterSpacing: '-0.03em', lineHeight: '1.1' } },

    // Subhead (left)
    { id: tid('cs', 3), type: 'text', x: 90, y: 316, w: 460, h: 84,
      txt: 'A step-by-step system taught from real results, not theory. Eight modules, lifetime access, built for people who want to do the work.',
      s: { fontFamily: "'DM Sans',sans-serif", fontSize: '16px', color: '#b9a9d6', textAlign: 'left', lineHeight: '1.55', fontWeight: '500' } },

    // Price (left)
    { id: tid('cs', 4), type: 'text', x: 90, y: 414, w: 300, h: 50,
      txt: '<div style="display:flex;align-items:baseline;gap:11px"><span style="font-family:Sora,sans-serif;font-size:34px;font-weight:800;color:#fff;letter-spacing:-0.02em">$149</span><span style="font-family:\'DM Sans\',sans-serif;font-size:16px;color:#7d6ba8;text-decoration:line-through">$299</span></div>',
      s: {} },

    // Primary CTA — member sets checkout link via the inspector
    { id: tid('cs', 5), type: 'button', x: 90, y: 486, w: 240, h: 58,
      txt: 'Enrol now &#8594;', url: '',
      s: { background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontFamily: 'Sora,sans-serif', fontWeight: '800', fontSize: '15px', textAlign: 'center', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 32px -12px rgba(124,58,237,0.6)' } },

    // Guarantee (left)
    { id: tid('cs', 6), type: 'text', x: 90, y: 562, w: 440, h: 28,
      txt: '<div style="font-family:\'DM Sans\',sans-serif;font-size:12.5px;color:#b9a9d6">&#128737; 30-day money-back guarantee — no questions asked</div>',
      s: {} },

    // Course-player card (right) — decorative preview
    { id: tid('cs', 7), type: 'text', x: 600, y: 150, w: 410, h: 432,
      txt: '<div><div style="position:relative;border-radius:12px;overflow:hidden;border:1px solid #4c2f7a"><svg width="100%" viewBox="0 0 420 210" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="csbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b1d6e"/><stop offset="1" stop-color="#1b1033"/></linearGradient><linearGradient id="csplay" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="420" height="210" fill="url(#csbg)"/><circle cx="210" cy="95" r="38" fill="url(#csplay)"/><path d="M201 79l24 16-24 16z" fill="#fff"/><rect x="22" y="172" width="376" height="6" rx="3" fill="#4c2f7a"/><rect x="22" y="172" width="150" height="6" rx="3" fill="#a855f7"/></svg></div><div style="margin-top:14px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:11px;background:rgba(255,255,255,0.04);border:1px solid #4c2f7a;border-radius:10px;padding:10px 12px;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#e4dcf6"><span style="flex-shrink:0;width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:700;font-size:12px;color:#fff">1</span>Foundations &amp; mindset</div><div style="display:flex;align-items:center;gap:11px;background:rgba(255,255,255,0.04);border:1px solid #4c2f7a;border-radius:10px;padding:10px 12px;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#e4dcf6"><span style="flex-shrink:0;width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:700;font-size:12px;color:#fff">2</span>The core system, step by step</div><div style="display:flex;align-items:center;gap:11px;background:rgba(255,255,255,0.04);border:1px solid #4c2f7a;border-radius:10px;padding:10px 12px;font-family:\'DM Sans\',sans-serif;font-size:13px;color:#e4dcf6"><span style="flex-shrink:0;width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:700;font-size:12px;color:#fff">3</span>Scaling what works</div></div></div>',
      s: { background: '#241544', border: '1px solid #4c2f7a', borderRadius: '18px', padding: '18px', boxShadow: '0 30px 70px -30px rgba(0,0,0,0.7)' } },
  ]
};

// ─────────────────────────────────────────────────────────────────
// Template 02 — Lead Magnet (Free Guide)
// Light · centred opt-in · trust signals · download promise
// ─────────────────────────────────────────────────────────────────
const LEAD_MAGNET = {
  id: 'lead-magnet',
  name: 'Free Guide / Lead Magnet',
  category: 'Lead Capture',
  description: 'Light, on-brand opt-in page: guide cover, benefit headline, social proof and a single conversion path.',
  accent: '#0ea5e9',
  thumbnailGradient: 'linear-gradient(135deg, #f7faff 0%, #e7eefb 55%, #d9eafb 100%)',
  canvasBg: '#f5f9fe',
  canvasBgImage: '',
  els: [
    // Eyebrow badge (centred, top)
    { id: tid('lm', 1), type: 'badge', x: 450, y: 64, w: 200, h: 32,
      txt: 'FREE GUIDE',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '700', fontSize: '11px', color: '#0284c7', textAlign: 'center', background: '#e3f1fb', borderRadius: '999px', border: '1px solid #bcdcf5', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.12em' } },

    // Guide cover (left) — placeholder image, member swaps for their own
    { id: tid('lm', 2), type: 'image', x: 150, y: 150, w: 300, h: 400,
      txt: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iODAwIiB2aWV3Qm94PSIwIDAgNjAwIDgwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMwYTE0MzgiLz48c3RvcCBvZmZzZXQ9IjAuNiIgc3RvcC1jb2xvcj0iIzFlM2E4YSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBlYTVlOSIvPjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icyIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzIyZDNlZSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBlYTVlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPgo8cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjgwMCIgZmlsbD0idXJsKCNnKSIvPjxyZWN0IHdpZHRoPSIyMiIgaGVpZ2h0PSI4MDAiIGZpbGw9InVybCgjcykiLz4KPHRleHQgeD0iNjQiIHk9IjkwIiBmb250LWZhbWlseT0iU29yYSxBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iODAwIiBsZXR0ZXItc3BhY2luZz0iNCIgZmlsbD0iIzIyZDNlZSI+RlJFRSDCtyBQREYgR1VJREU8L3RleHQ+Cjx0ZXh0IHg9IjY0IiB5PSIzODAiIGZvbnQtZmFtaWx5PSJTb3JhLEFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNjIiIGZvbnQtd2VpZ2h0PSI4MDAiIGZpbGw9IiNmZmZmZmYiPllvdXIgR3VpZGU8L3RleHQ+Cjx0ZXh0IHg9IjY0IiB5PSI0NTAiIGZvbnQtZmFtaWx5PSJTb3JhLEFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNjIiIGZvbnQtd2VpZ2h0PSI4MDAiIGZpbGw9IiNmZmZmZmYiPlRpdGxlIEhlcmU8L3RleHQ+Cjx0ZXh0IHg9IjY0IiB5PSI1MjAiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjI2IiBmaWxsPSIjYmNkM2YwIj5BIHNob3J0IHN1YnRpdGxlIGxpbmU8L3RleHQ+Cjx0ZXh0IHg9IjY0IiB5PSI3NDAiIGZvbnQtZmFtaWx5PSJTb3JhLEFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjIiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC42KSI+U3VwZXJQYWdlczwvdGV4dD4KPC9zdmc+Cg==', _imageAlt: 'Free guide cover', _imageFit: 'cover',
      s: { borderRadius: '14px', boxShadow: '0 18px 44px rgba(10,20,56,0.18)' } },

    // Hero heading (right)
    { id: tid('lm', 3), type: 'heading', x: 500, y: 150, w: 540, h: 140,
      txt: 'Steal My <span style="color:#0ea5e9">AI Funnel</span> Playbook',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '800', fontSize: '42px', color: '#0a1438', textAlign: 'left', letterSpacing: '-0.035em', lineHeight: '1.04' } },

    // Subhead (right)
    { id: tid('lm', 4), type: 'text', x: 500, y: 300, w: 540, h: 64,
      txt: 'The exact system I use to turn cold traffic into buyers. Free PDF, no upsells, no fluff.',
      s: { fontFamily: "'DM Sans',sans-serif", fontSize: '17px', color: '#4d648c', textAlign: 'left', lineHeight: '1.55', fontWeight: '500' } },

    // Benefit checklist (right)
    { id: tid('lm', 5), type: 'text', x: 500, y: 380, w: 540, h: 130,
      txt: '<div style="display:flex;flex-direction:column;gap:11px"><div style="display:flex;gap:10px;align-items:flex-start;font-family:\'DM Sans\',sans-serif;font-size:14px;color:#26354f;font-weight:500"><span style="flex-shrink:0;width:20px;height:20px;border-radius:6px;background:#e3f1fb;border:1px solid #bcdcf5;color:#0284c7;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">&#10003;</span>12 plug-and-play funnel layouts that convert</div><div style="display:flex;gap:10px;align-items:flex-start;font-family:\'DM Sans\',sans-serif;font-size:14px;color:#26354f;font-weight:500"><span style="flex-shrink:0;width:20px;height:20px;border-radius:6px;background:#e3f1fb;border:1px solid #bcdcf5;color:#0284c7;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">&#10003;</span>The 6 AI prompts that write your copy for you</div><div style="display:flex;gap:10px;align-items:flex-start;font-family:\'DM Sans\',sans-serif;font-size:14px;color:#26354f;font-weight:500"><span style="flex-shrink:0;width:20px;height:20px;border-radius:6px;background:#e3f1fb;border:1px solid #bcdcf5;color:#0284c7;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">&#10003;</span>A done-for-you 5-email follow-up sequence</div></div>',
      s: {} },

    // Opt-in form (right) — real capture via data-sp-submit button
    { id: tid('lm', 6), type: 'form', x: 500, y: 530, w: 540, h: 300,
      txt: '<div style="text-align:left;padding:2px"><div style="font-family:Sora,sans-serif;font-weight:800;font-size:21px;color:#0a1438;margin-bottom:5px;letter-spacing:-0.02em">Get instant access</div><div style="font-size:13px;color:#4d648c;margin-bottom:18px;line-height:1.5">Drop your details and we will send it straight over.</div><input placeholder="Your first name" style="display:block;width:100%;padding:13px 15px;background:#f4f8fd;border:1px solid #cdddf0;border-radius:10px;color:#0f1f3d;font-size:13px;margin-bottom:10px;box-sizing:border-box;outline:none;font-family:\'DM Sans\',sans-serif"><input placeholder="Your best email" style="display:block;width:100%;padding:13px 15px;background:#f4f8fd;border:1px solid #cdddf0;border-radius:10px;color:#0f1f3d;font-size:13px;margin-bottom:10px;box-sizing:border-box;outline:none;font-family:\'DM Sans\',sans-serif"><button data-sp-submit="1" style="display:block;width:100%;padding:14px 20px;margin-top:4px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#fff;font-size:14px;font-weight:800;border-radius:10px;text-align:center;box-sizing:border-box;border:none;cursor:pointer;font-family:Sora,sans-serif">Send me the guide &#8594;</button><div style="font-size:10px;color:#7089ac;margin-top:12px;font-weight:500">&#128274; No spam. Unsubscribe anytime.</div></div>',
      s: { background: '#ffffff', borderRadius: '18px', border: '1px solid #dbe6f5', padding: '26px', boxShadow: '0 14px 40px rgba(10,20,56,0.10)' } },

    // Social proof (right)
    { id: tid('lm', 7), type: 'text', x: 500, y: 850, w: 540, h: 36,
      txt: '<div style="font-family:\'DM Sans\',sans-serif;font-size:13px;color:#4d648c;font-weight:500"><span style="color:#fbbf24;letter-spacing:1px">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <b style="color:#0a1438">4.9</b> &middot; Joined by <b style="color:#0a1438">2,847</b> marketers</div>',
      s: {} },
  ]
};

// ─────────────────────────────────────────────────────────────────
// Template 03 — Webinar Registration
// Live event positioning, countdown urgency, presenter credibility.
// ─────────────────────────────────────────────────────────────────
const WEBINAR_REG = {
  id: 'webinar-reg',
  name: 'Webinar Registration',
  category: 'Event',
  description: 'Live training registration with countdown urgency, presenter spotlight, and clear date/time.',
  accent: '#ef4444',
  thumbnailGradient: 'linear-gradient(135deg, #7f1d1d 0%, #1e1b4b 50%, #0f172a 100%)',
  canvasBg: '#0f172a',
  canvasBgImage: '',
  els: [
    // Live badge
    { id: tid('wb', 1), type: 'badge', x: 460, y: 60, w: 180, h: 36,
      txt: '🔴 LIVE TRAINING',
      s: { fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '12px', color: '#fff', textAlign: 'center', background: '#dc2626', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.08em' } },

    // Hero
    { id: tid('wb', 2), type: 'heading', x: 80, y: 120, w: 940, h: 130,
      txt: 'How to Build a Profitable Affiliate Funnel in <span style="color:#fbbf24">90 Minutes</span>',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '900', fontSize: '54px', color: '#fff', textAlign: 'center', letterSpacing: '-0.035em', lineHeight: '1.05' } },

    // Date/time line
    { id: tid('wb', 3), type: 'text', x: 200, y: 268, w: 700, h: 40,
      txt: '<strong style="color:#fbbf24">Wednesday, March 20 · 7pm GMT</strong> · Free live workshop · No recording',
      s: { fontFamily: 'Manrope,sans-serif', fontSize: '17px', color: '#cbd5e1', textAlign: 'center', fontWeight: '600' } },

    // Countdown
    { id: tid('wb', 4), type: 'countdown', x: 280, y: 332, w: 540, h: 100,
      txt: '', s: {}, _targetDate: '' },

    // Primary register button
    { id: tid('wb', 5), type: 'button', x: 380, y: 460, w: 340, h: 64,
      txt: 'Save My Seat (Free) →',
      s: { background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '15px', textAlign: 'center', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 rgba(180,32,32,0.6),0 8px 24px rgba(239,68,68,0.35)' } },

    // What you'll learn — heading
    { id: tid('wb', 6), type: 'heading', x: 350, y: 580, w: 400, h: 50,
      txt: "What You'll Learn",
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '900', fontSize: '32px', color: '#fff', textAlign: 'center', letterSpacing: '-0.025em' } },

    // 3 bullets
    { id: tid('wb', 7), type: 'icontext', x: 200, y: 660, w: 700, h: 80,
      txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0;width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(245,158,11,0.2));border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center">1</div><div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:16px;color:#fff;margin-bottom:4px">The 3 funnel structures that convert at 8%+ cold</div><div style="font-size:14px;color:#94a3b8;line-height:1.55">Steal these exact layouts and start using them today.</div></div></div>',
      s: {} },
    { id: tid('wb', 8), type: 'icontext', x: 200, y: 760, w: 700, h: 80,
      txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0;width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(245,158,11,0.2));border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center">2</div><div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:16px;color:#fff;margin-bottom:4px">How to use AI to write copy that actually converts</div><div style="font-size:14px;color:#94a3b8;line-height:1.55">The prompts I use daily — and the ones that waste your time.</div></div></div>',
      s: {} },
    { id: tid('wb', 9), type: 'icontext', x: 200, y: 860, w: 700, h: 80,
      txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0;width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(245,158,11,0.2));border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center">3</div><div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:16px;color:#fff;margin-bottom:4px">The traffic source nobody is talking about (yet)</div><div style="font-size:14px;color:#94a3b8;line-height:1.55">Live walkthrough — you can replicate it this week.</div></div></div>',
      s: {} },

    // Second CTA
    { id: tid('wb', 10), type: 'button', x: 380, y: 990, w: 340, h: 64,
      txt: 'Save My Seat (Free) →',
      s: { background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '15px', textAlign: 'center', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 rgba(180,32,32,0.6),0 8px 24px rgba(239,68,68,0.35)' } },
  ]
};

// ─────────────────────────────────────────────────────────────────
// Template 04 — Link in Bio
// Linktree-style vertical button stack with profile header.
// ─────────────────────────────────────────────────────────────────
const LINK_IN_BIO = {
  id: 'link-in-bio',
  name: 'Link in Bio',
  category: 'Profile',
  description: 'Linktree-style profile page with avatar, tagline, and stacked link buttons. Perfect for social bios.',
  accent: '#ec4899',
  thumbnailGradient: 'linear-gradient(180deg, #1e1b4b 0%, #581c87 50%, #831843 100%)',
  canvasBg: '#1a0a3a',
  canvasBgImage: '',
  els: [
    // Avatar circle (using image)
    { id: tid('lb', 1), type: 'image', x: 480, y: 60, w: 140, h: 140,
      txt: '',
      s: { borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#a855f7)', border: '4px solid rgba(255,255,255,0.2)' } },

    // Display name
    { id: tid('lb', 2), type: 'heading', x: 250, y: 220, w: 600, h: 50,
      txt: '@yourname',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '900', fontSize: '32px', color: '#fff', textAlign: 'center', letterSpacing: '-0.025em' } },

    // Tagline
    { id: tid('lb', 3), type: 'text', x: 250, y: 285, w: 600, h: 45,
      txt: 'AI Marketing · Affiliate Growth · Daily Tips',
      s: { fontFamily: 'Manrope,sans-serif', fontSize: '15px', color: '#c4b5fd', textAlign: 'center', fontWeight: '600' } },

    // Social row
    { id: tid('lb', 4), type: 'socialicons', x: 400, y: 350, w: 300, h: 40,
      txt: '', s: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      _links: { youtube: '', instagram: '', tiktok: '', facebook: '', x: '', linkedin: '' } },

    // Link buttons (5 stacked)
    { id: tid('lb', 5), type: 'button', x: 250, y: 430, w: 600, h: 64,
      txt: '🎓 My Course — Master AI Marketing',
      s: { background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '800', fontSize: '15px', textAlign: 'center', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' } },
    { id: tid('lb', 6), type: 'button', x: 250, y: 510, w: 600, h: 64,
      txt: '📺 Latest YouTube Video',
      s: { background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '800', fontSize: '15px', textAlign: 'center', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' } },
    { id: tid('lb', 7), type: 'button', x: 250, y: 590, w: 600, h: 64,
      txt: '🎁 Free Conversion Hacks Guide',
      s: { background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '800', fontSize: '15px', textAlign: 'center', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' } },
    { id: tid('lb', 8), type: 'button', x: 250, y: 670, w: 600, h: 64,
      txt: '💼 Work With Me 1:1',
      s: { background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '800', fontSize: '15px', textAlign: 'center', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' } },
    { id: tid('lb', 9), type: 'button', x: 250, y: 750, w: 600, h: 64,
      txt: '📧 Subscribe to my newsletter',
      s: { background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '15px', textAlign: 'center', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 rgba(157,23,77,0.6),0 8px 24px rgba(236,72,153,0.35)' } },
  ]
};

// ─────────────────────────────────────────────────────────────────
// Template 05 — Product Launch
// Limited time · social proof · scarcity · stacked features.
// ─────────────────────────────────────────────────────────────────
const PRODUCT_LAUNCH = {
  id: 'product-launch',
  name: 'Product Launch',
  category: 'Conversion',
  description: 'Time-limited product launch with social proof, feature stack, scarcity bar, and bold gradient hero.',
  accent: '#f59e0b',
  thumbnailGradient: 'linear-gradient(135deg, #18181b 0%, #ea580c 60%, #fb923c 100%)',
  canvasBg: '#0c0a09',
  canvasBgImage: '',
  els: [
    // Top urgency banner
    { id: tid('pl', 1), type: 'announcement', x: 0, y: 0, w: 1100, h: 44,
      txt: '🔥 LAUNCH WEEK · 50% OFF ENDS SUNDAY · USE CODE LAUNCH50',
      s: { background: 'linear-gradient(90deg,#dc2626,#ea580c,#dc2626)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.04em' } },

    // Big launch label
    { id: tid('pl', 2), type: 'badge', x: 460, y: 90, w: 180, h: 36,
      txt: '🚀 NOW LIVE',
      s: { fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '12px', color: '#fb923c', textAlign: 'center', background: 'rgba(251,146,60,0.15)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.1em' } },

    // Hero
    { id: tid('pl', 3), type: 'heading', x: 100, y: 152, w: 900, h: 150,
      txt: 'The AI Marketing Toolkit <span style="color:#fb923c">Built for Speed</span>',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '900', fontSize: '58px', color: '#fff', textAlign: 'center', letterSpacing: '-0.04em', lineHeight: '1.0' } },

    // Subhead
    { id: tid('pl', 4), type: 'text', x: 250, y: 320, w: 600, h: 60,
      txt: '50+ ready-to-use AI prompts, copywriting templates, and funnel scripts. Built by marketers who actually ship.',
      s: { fontFamily: 'Manrope,sans-serif', fontSize: '18px', color: '#a1a1aa', textAlign: 'center', lineHeight: '1.55', fontWeight: '500' } },

    // Stat row
    { id: tid('pl', 5), type: 'stat', x: 280, y: 410, w: 180, h: 80,
      txt: '<div style="font-family:Sora,sans-serif;font-size:34px;font-weight:900;color:#fff;letter-spacing:-0.025em;line-height:1">847</div><div style="font-size:10px;color:#71717a;margin-top:6px;text-transform:uppercase;letter-spacing:0.12em;font-weight:800">Early Adopters</div>',
      s: { textAlign: 'center', background: '#18181b', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
    { id: tid('pl', 6), type: 'stat', x: 460, y: 410, w: 180, h: 80,
      txt: '<div style="font-family:Sora,sans-serif;font-size:34px;font-weight:900;color:#fff;letter-spacing:-0.025em;line-height:1">$<span style="color:#fb923c">49</span></div><div style="font-size:10px;color:#71717a;margin-top:6px;text-transform:uppercase;letter-spacing:0.12em;font-weight:800">Launch Price</div>',
      s: { textAlign: 'center', background: '#18181b', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
    { id: tid('pl', 7), type: 'stat', x: 640, y: 410, w: 180, h: 80,
      txt: '<div style="font-family:Sora,sans-serif;font-size:34px;font-weight:900;color:#fff;letter-spacing:-0.025em;line-height:1">∞</div><div style="font-size:10px;color:#71717a;margin-top:6px;text-transform:uppercase;letter-spacing:0.12em;font-weight:800">Lifetime Access</div>',
      s: { textAlign: 'center', background: '#18181b', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },

    // CTA
    { id: tid('pl', 8), type: 'button', x: 380, y: 530, w: 340, h: 64,
      txt: 'Get Instant Access — $49 →',
      s: { background: 'linear-gradient(135deg,#ea580c,#fb923c)', color: '#fff', fontFamily: 'Manrope,sans-serif', fontWeight: '900', fontSize: '15px', textAlign: 'center', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 rgba(180,83,9,0.6),0 8px 24px rgba(234,88,12,0.35)' } },

    // Scarcity
    { id: tid('pl', 9), type: 'progress', x: 250, y: 624, w: 600, h: 60,
      txt: '', s: {}, _percent: 73, _label: '153 of 200 launch spots claimed', _color: '#fb923c' },

    // Features heading
    { id: tid('pl', 10), type: 'heading', x: 350, y: 720, w: 400, h: 50,
      txt: "What's Inside",
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '900', fontSize: '32px', color: '#fff', textAlign: 'center', letterSpacing: '-0.025em' } },

    // 3 feature cards
    { id: tid('pl', 11), type: 'icontext', x: 80, y: 800, w: 320, h: 110,
      txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0;width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(234,88,12,0.2),rgba(251,146,60,0.2));border:1px solid rgba(234,88,12,0.3);display:flex;align-items:center;justify-content:center">📝</div><div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15px;color:#fff;margin-bottom:4px">50+ Prompts</div><div style="font-size:13px;color:#a1a1aa;line-height:1.55">Tested AI prompts for ads, emails, landing pages, social posts.</div></div></div>',
      s: { background: '#18181b', borderRadius: '14px', border: '1px solid #27272a', padding: '20px' } },
    { id: tid('pl', 12), type: 'icontext', x: 390, y: 800, w: 320, h: 110,
      txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0;width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(234,88,12,0.2),rgba(251,146,60,0.2));border:1px solid rgba(234,88,12,0.3);display:flex;align-items:center;justify-content:center">📋</div><div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15px;color:#fff;margin-bottom:4px">12 Funnel Scripts</div><div style="font-size:13px;color:#a1a1aa;line-height:1.55">Cold→warm→sale sequences. Drop in your offer, hit publish.</div></div></div>',
      s: { background: '#18181b', borderRadius: '14px', border: '1px solid #27272a', padding: '20px' } },
    { id: tid('pl', 13), type: 'icontext', x: 700, y: 800, w: 320, h: 110,
      txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0;width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(234,88,12,0.2),rgba(251,146,60,0.2));border:1px solid rgba(234,88,12,0.3);display:flex;align-items:center;justify-content:center">🎁</div><div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15px;color:#fff;margin-bottom:4px">Lifetime Updates</div><div style="font-size:13px;color:#a1a1aa;line-height:1.55">Pay once, get every future template I build. Forever.</div></div></div>',
      s: { background: '#18181b', borderRadius: '14px', border: '1px solid #27272a', padding: '20px' } },
  ]
};

// ─────────────────────────────────────────────────────────────────
// Template 06 — Coaching / Consultation
// Warm, personal · book-a-call CTA · credibility · testimonials
// ─────────────────────────────────────────────────────────────────
const COACHING = {
  id: 'coaching',
  name: 'Book a Call',
  category: 'Service',
  description: 'Sage-green consultation page: benefit-led hero beside a booking card that captures name, email and what the visitor wants to cover.',
  accent: '#059669',
  thumbnailGradient: 'linear-gradient(135deg, #f0fdf4 0%, #6ee7b7 55%, #059669 100%)',
  canvasBg: '#f0fdf4',
  canvasBgImage: '',
  els: [
    // Badge (top-left)
    { id: tid('co', 1), type: 'badge', x: 100, y: 74, w: 236, h: 34,
      txt: '&#128222; FREE STRATEGY CALL',
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '700', fontSize: '11px', color: '#047857', textAlign: 'center', background: '#d1fae5', borderRadius: '999px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.1em' } },

    // Hero heading (left)
    { id: tid('co', 2), type: 'heading', x: 100, y: 128, w: 480, h: 168,
      txt: "Let's map out your <span style='color:#059669'>next 90 days</span> together",
      s: { fontFamily: 'Sora,sans-serif', fontWeight: '800', fontSize: '40px', color: '#064e3b', textAlign: 'left', letterSpacing: '-0.03em', lineHeight: '1.1' } },

    // Subhead (left)
    { id: tid('co', 3), type: 'text', x: 100, y: 304, w: 470, h: 80,
      txt: 'A focused 30-minute call where we pinpoint exactly what is holding your growth back — and the three moves that fix it.',
      s: { fontFamily: "'DM Sans',sans-serif", fontSize: '17px', color: '#4b6358', textAlign: 'left', lineHeight: '1.55', fontWeight: '500' } },

    // Benefit checklist (left)
    { id: tid('co', 4), type: 'text', x: 100, y: 404, w: 470, h: 150,
      txt: '<div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:10px;align-items:flex-start;font-family:\'DM Sans\',sans-serif;font-size:14.5px;color:#1f3d33;font-weight:500"><span style="flex-shrink:0;width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">&#10003;</span>A clear, personalised action plan you keep</div><div style="display:flex;gap:10px;align-items:flex-start;font-family:\'DM Sans\',sans-serif;font-size:14.5px;color:#1f3d33;font-weight:500"><span style="flex-shrink:0;width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">&#10003;</span>An honest read on what is and is not working</div><div style="display:flex;gap:10px;align-items:flex-start;font-family:\'DM Sans\',sans-serif;font-size:14.5px;color:#1f3d33;font-weight:500"><span style="flex-shrink:0;width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center">&#10003;</span>Zero pressure, zero pitch — just strategy</div></div>',
      s: {} },

    // Booking card (right) — real capture via data-sp-submit button
    { id: tid('co', 5), type: 'form', x: 620, y: 128, w: 400, h: 446,
      txt: '<div style="text-align:left"><div style="display:flex;align-items:center;gap:13px;margin-bottom:18px"><svg width="52" height="52" viewBox="0 0 54 54" fill="none"><defs><linearGradient id="coav" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10b981"/><stop offset="1" stop-color="#059669"/></linearGradient></defs><circle cx="27" cy="27" r="27" fill="url(#coav)"/><circle cx="27" cy="21" r="9" fill="#fff" opacity="0.95"/><path d="M11 47c1-9 8-14 16-14s15 5 16 14" fill="#fff" opacity="0.95"/></svg><div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#064e3b">Your Name</div><div style="font-size:12.5px;color:#4b6358">Founder &middot; Growth Strategist</div></div></div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#5b7468;margin:0 0 9px">Pick a slot</div><input placeholder="Full name" style="display:block;width:100%;padding:13px 15px;background:#f3fbf6;border:1px solid #bbf7d0;border-radius:10px;color:#0f1f1a;font-size:13px;margin-bottom:10px;box-sizing:border-box;outline:none;font-family:\'DM Sans\',sans-serif"><input placeholder="Email address" style="display:block;width:100%;padding:13px 15px;background:#f3fbf6;border:1px solid #bbf7d0;border-radius:10px;color:#0f1f1a;font-size:13px;margin-bottom:10px;box-sizing:border-box;outline:none;font-family:\'DM Sans\',sans-serif"><input name="topic" placeholder="What do you want to cover?" style="display:block;width:100%;padding:13px 15px;background:#f3fbf6;border:1px solid #bbf7d0;border-radius:10px;color:#0f1f1a;font-size:13px;margin-bottom:16px;box-sizing:border-box;outline:none;font-family:\'DM Sans\',sans-serif"><button data-sp-submit="1" style="display:block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:14px;font-weight:800;border-radius:10px;text-align:center;box-sizing:border-box;border:none;cursor:pointer;font-family:Sora,sans-serif">Confirm my call &#8594;</button><div style="text-align:center;margin-top:12px;font-size:12px;color:#5b7468">&#128274; No spam. Cancel anytime.</div></div>',
      s: { background: '#ffffff', borderRadius: '18px', border: '1px solid #c7f0db', padding: '26px', boxShadow: '0 18px 50px rgba(5,80,60,0.12)' } },
  ]
};

// ─────────────────────────────────────────────────────────────────
// Export the full template list. Order = display order in the
// gallery. Add new templates to the bottom and bump the count
// reference in LabsPageBuilder.jsx.
// ─────────────────────────────────────────────────────────────────
export const LABS_TEMPLATES = [
  COURSE_SALES,
  LEAD_MAGNET,
  WEBINAR_REG,
  PRODUCT_LAUNCH,
  LINK_IN_BIO,
  COACHING,
];

// Category list — derived from templates, for filter pills in the
// gallery. Keep "All" as the first entry.
export const TEMPLATE_CATEGORIES = [
  { key: 'all',         label: 'All templates', colour: '#0ea5e9' },
  { key: 'Conversion',  label: 'Conversion',    colour: '#a855f7' },
  { key: 'Lead Capture',label: 'Lead Capture',  colour: '#0ea5e9' },
  { key: 'Event',       label: 'Event',         colour: '#ef4444' },
  { key: 'Profile',     label: 'Profile',       colour: '#ec4899' },
  { key: 'Service',     label: 'Service',       colour: '#10b981' },
];
