// ═══ SuperPages Element Defaults ═══
// Matches the existing editor exactly: 24 element types, 5 categories

export const ELEMENT_TYPES = {
  // ── Text ──
  heading: { w: 1000, h: 55, txt: 'Your Heading Here', s: { fontFamily: 'Sora,sans-serif', fontWeight: '900', fontSize: '36px', color: '#fff', textAlign: 'center' } },
  text: { w: 900, h: 50, txt: 'Your text content goes here. Click to edit.', s: { fontFamily: 'Outfit,sans-serif', fontSize: '15px', color: '#94a3b8', textAlign: 'left', lineHeight: '1.8' } },
  label: { w: 200, h: 30, txt: '⭐ PREMIUM', s: { fontFamily: 'DM Sans,sans-serif', fontWeight: '700', fontSize: '12px', color: '#fbbf24', textAlign: 'center', background: 'rgba(251,191,36,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251,191,36,0.2)' } },

  // ── Media ──
  image: { w: 500, h: 300, txt: '', s: { borderRadius: '12px' } },
  video: { w: 900, h: 500, txt: '', s: {} },
  audio: { w: 500, h: 60, txt: '', s: {}, _audioUrl: '' },

  // ── Actions ──
  button: { w: 500, h: 56, txt: 'Join Now', s: { background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontFamily: 'Sora,sans-serif', fontWeight: '700', fontSize: '18px', textAlign: 'center', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
  form: { w: 600, h: 280, txt: '<div style="text-align:center;padding:4px"><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">Get Free Access</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">Enter your details below</div><input placeholder="Your first name" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#1a1a2e;font-size:13px;margin-bottom:8px;box-sizing:border-box"><input placeholder="Your email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#1a1a2e;font-size:13px;margin-bottom:10px;box-sizing:border-box"><div style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box">Get Access →</div></div>', s: { background: 'rgba(15,23,41,0.4)', borderRadius: '18px', border: '1px solid rgba(14,165,233,0.15)', padding: '20px' } },
  cta: { w: 500, h: 56, txt: 'Get Started Now →', s: { background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontFamily: 'Sora,sans-serif', fontWeight: '700', fontSize: '18px', textAlign: 'center', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },

  // ── Content ──
  review: { w: 700, h: 100, txt: '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:15px;color:#e2e8f0;line-height:1.7;font-style:italic">"This platform is amazing!"</div><div style="font-size:13px;color:#64748b;font-weight:600;margin-top:6px">— Happy Customer</div>', s: { background: '#1e293b', borderRadius: '16px', borderLeft: '4px solid #0ea5e9', padding: '24px' } },
  badge: { w: 200, h: 30, txt: '⭐ PREMIUM', s: { fontFamily: 'DM Sans,sans-serif', fontWeight: '700', fontSize: '12px', color: '#fbbf24', textAlign: 'center', background: 'rgba(251,191,36,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251,191,36,0.2)' } },
  testimonial: { w: 700, h: 140, txt: '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:15px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:10px">"This completely changed how I approach my business. The tools are incredible and the community is so supportive."</div><div style="font-size:13px;color:#64748b;font-weight:600">— Jane D., Online Coach</div>', s: { background: '#1e293b', borderRadius: '16px', borderLeft: '4px solid #fbbf24', padding: '24px' } },
  faq: { w: 700, h: 120, txt: '<div style="cursor:pointer"><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08)"><span style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#fff">How does this work?</span><span style="color:#64748b;font-size:18px">+</span></div><div style="padding:12px 18px;font-size:14px;color:#94a3b8;line-height:1.7;margin-top:4px">Click the edit button to customise the question and answer text for this FAQ item.</div></div>', s: {} },
  stat: { w: 200, h: 80, txt: '<div style="font-family:Sora,sans-serif;font-size:36px;font-weight:900;color:#0ea5e9">95%</div><div style="font-size:12px;color:#64748b;margin-top:2px">Paid Out</div>', s: { textAlign: 'center' } },
  progress: { w: 500, h: 50, txt: '', s: {}, _percent: 75, _label: 'Progress', _color: '#0ea5e9' },

  // ── Layout ──
  countdown: { w: 600, h: 80, txt: '', s: {}, _targetDate: '' },
  socialicons: { w: 300, h: 40, txt: '', s: {}, _links: { youtube: '', instagram: '', tiktok: '', facebook: '', x: '', linkedin: '' } },
  icontext: { w: 700, h: 70, txt: '<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:28px;flex-shrink:0;width:40px;text-align:center">🚀</div><div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">Feature Heading</div><div style="font-size:13px;color:#94a3b8;line-height:1.6">Describe the benefit or feature here. Keep it clear and compelling.</div></div></div>', s: {} },
  separator: { w: 700, h: 30, txt: '<div style="display:flex;align-items:center;gap:16px"><div style="flex:1;height:1px;background:rgba(255,255,255,0.1)"></div><span style="font-size:12px;color:#64748b;font-weight:600;white-space:nowrap">★ ★ ★</span><div style="flex:1;height:1px;background:rgba(255,255,255,0.1)"></div></div>', s: {} },
  logostrip: { w: 800, h: 50, txt: '<div style="display:flex;align-items:center;justify-content:center;gap:32px"><span style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:1px">As seen in:</span><span style="font-size:14px;color:#64748b;font-weight:600;opacity:.6">Brand 1</span><span style="font-size:14px;color:#64748b;font-weight:600;opacity:.6">Brand 2</span><span style="font-size:14px;color:#64748b;font-weight:600;opacity:.6">Brand 3</span><span style="font-size:14px;color:#64748b;font-weight:600;opacity:.6">Brand 4</span></div>', s: {} },
  spacer: { w: 100, h: 40, txt: '', s: { background: 'transparent' } },
  box: { w: 400, h: 200, txt: '', s: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' } },
  divider: { w: 700, h: 2, txt: '', s: { background: '#334155', borderRadius: '1px' } },
  embed: { w: 600, h: 200, txt: '', s: {}, _embedCode: '' },
};

// Types that should auto-centre on the canvas
export const CENTRE_TYPES = [
  'heading', 'text', 'cta', 'separator', 'logostrip', 'countdown', 'progress',
  'socialicons', 'video', 'audio', 'embed', 'form', 'testimonial', 'faq', 'icontext', 'review'
];

// Block palette categories — shown in the right panel
export const PALETTE = [
  { label: 'Text', items: [
    { type: 'heading', name: 'Heading', color: '#0ea5e9' },
    { type: 'text', name: 'Text', color: '#0ea5e9' },
    { type: 'label', name: 'Label', color: '#0ea5e9' },
  ]},
  { label: 'Media', items: [
    { type: 'image', name: 'Image', color: '#8b5cf6' },
    { type: 'video', name: 'Video', color: '#8b5cf6' },
    { type: 'audio', name: 'Audio', color: '#8b5cf6' },
  ]},
  { label: 'Actions', items: [
    { type: 'button', name: 'Button', color: '#10b981' },
    { type: 'form', name: 'Opt-In', color: '#10b981' },
    { type: 'cta', name: 'CTA', color: '#10b981' },
  ]},
  { label: 'Content', items: [
    { type: 'review', name: 'Review', color: '#f59e0b' },
    { type: 'badge', name: 'Badge', color: '#f59e0b' },
    { type: 'testimonial', name: 'Testimonial', color: '#f59e0b' },
    { type: 'faq', name: 'FAQ', color: '#f59e0b' },
    { type: 'stat', name: 'Stat', color: '#f59e0b' },
    { type: 'progress', name: 'Progress', color: '#f59e0b' },
  ]},
  { label: 'Layout', items: [
    { type: 'countdown', name: 'Countdown', color: '#ec4899' },
    { type: 'socialicons', name: 'Socials', color: '#ec4899' },
    { type: 'icontext', name: 'Icon+Text', color: '#ec4899' },
    { type: 'separator', name: 'Separator', color: '#ec4899' },
    { type: 'logostrip', name: 'Logos', color: '#ec4899' },
    { type: 'spacer', name: 'Spacer', color: '#ec4899' },
    { type: 'box', name: 'Box', color: '#ec4899' },
    { type: 'divider', name: 'Divider', color: '#ec4899' },
    { type: 'embed', name: 'Embed', color: '#ec4899' },
  ]},
];

// Background presets
export const BG_PRESETS = [
  '#050d1a', '#0f172a', '#1e293b', '#ffffff', '#f8fafc', '#fef3c7',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(180deg,#0f172a,#1e3a5f)',
  'linear-gradient(135deg,#1a1a2e,#16213e)',
];

// Social icon SVG paths
export const SOCIAL_SVGS = {
  youtube: 'M23.5 6.5a3 3 0 00-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4a3 3 0 00-2.1 2.1C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 002.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 002.1-2.1c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5zM9.5 15.5V8.5l6.3 3.5-6.3 3.5z',
  instagram: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4a3.9 3.9 0 01-1.4-.9c-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2M12 7a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.2-8.4a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z',
  tiktok: 'M16.6 5.8A4.3 4.3 0 0113.4 4h-3v11.3a2.5 2.5 0 11-1.7-2.4V9.5a5.9 5.9 0 105.3 5.8V9.8a7.6 7.6 0 004.4 1.4V7.9a4.3 4.3 0 01-1.8-2.1z',
  facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
  x: 'M18.9 1.2h3.7l-8 9.1L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9zm-1.3 19.4h2L6.5 3.2H4.3l13.3 17.4z',
  linkedin: 'M20.4 20.4h-3.5v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.5V9h3.4v1.6h.1a3.7 3.7 0 013.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2 2 0 110-4.1 2 2 0 010 4.1zM7.1 20.4H3.6V9h3.5v11.4z',
};

// Fonts available in the editor
export const FONTS = [
  { value: 'Sora,sans-serif', label: 'Sora' },
  { value: 'Outfit,sans-serif', label: 'Outfit' },
  { value: 'DM Sans,sans-serif', label: 'DM Sans' },
  { value: 'Montserrat,sans-serif', label: 'Montserrat' },
  { value: 'Poppins,sans-serif', label: 'Poppins' },
  { value: 'Raleway,sans-serif', label: 'Raleway' },
  { value: 'Open Sans,sans-serif', label: 'Open Sans' },
  { value: 'Lato,sans-serif', label: 'Lato' },
  { value: 'Roboto,sans-serif', label: 'Roboto' },
  { value: 'Nunito,sans-serif', label: 'Nunito' },
  { value: 'Work Sans,sans-serif', label: 'Work Sans' },
  { value: 'Urbanist,sans-serif', label: 'Urbanist' },
  { value: 'Plus Jakarta Sans,sans-serif', label: 'Plus Jakarta Sans' },
  { value: 'Space Grotesk,sans-serif', label: 'Space Grotesk' },
  { value: 'Barlow,sans-serif', label: 'Barlow' },
  { value: 'Oswald,sans-serif', label: 'Oswald' },
  { value: 'Anton,sans-serif', label: 'Anton' },
  { value: 'Bebas Neue,sans-serif', label: 'Bebas Neue' },
  { value: 'Cinzel,serif', label: 'Cinzel' },
  { value: 'Playfair Display,serif', label: 'Playfair Display' },
  { value: 'Georgia,serif', label: 'Georgia' },
  { value: 'Merriweather,serif', label: 'Merriweather' },
  { value: 'Dancing Script,cursive', label: 'Dancing Script' },
  { value: 'Pacifico,cursive', label: 'Pacifico' },
];

export const FONT_SIZES = [
  '10px', '12px', '14px', '15px', '16px', '18px', '20px', '22px', '24px',
  '28px', '32px', '36px', '40px', '48px', '56px', '64px', '72px', '80px', '96px', '120px',
];

// Canvas constants
export const CANVAS_WIDTH = 1100;
export const SNAP_THRESHOLD = 6;
export const MAX_HISTORY = 50;
export const AUTO_SAVE_INTERVAL = 30000;
