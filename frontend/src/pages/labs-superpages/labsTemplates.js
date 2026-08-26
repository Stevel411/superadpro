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
      _formRedirect: '__OWNER_REF__',
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
      _formRedirect: '__OWNER_REF__',
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
      _formRedirect: '__OWNER_REF__',
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


// -- Professional starter templates (batch 1, verified 25 Aug 2026) --
const _I = 'Inter,sans-serif';
function _spForm(label, grad, dark) {
  return `<div style="text-align:center"><input placeholder="Your best email address" style="display:block;width:100%;padding:16px 18px;border-radius:12px;border:1.5px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(13,26,58,0.15)'};background:${dark ? 'rgba(255,255,255,0.06)' : '#fff'};color:${dark ? '#fff' : '#0d1a3a'};font-size:15px;margin-bottom:10px;box-sizing:border-box;outline:none"><button data-sp-submit="1" style="display:block;width:100%;padding:17px;border-radius:12px;background:${grad};color:#fff;font-weight:900;font-size:17px;text-align:center;box-sizing:border-box;border:none;cursor:pointer">${label} &#8594;</button></div>`;
}
const _RED = 'linear-gradient(135deg,#e8203f,#c8102e)', _NAVY = 'linear-gradient(135deg,#1a44a8,#0a1f52)';
const STARTER_BATCH_1 = [
// 1 LEAD MAGNET (light)
{ id:'lead-magnet-guide', thumbnailGradient:'linear-gradient(135deg,#f6f2ea,#e6dcc8)', description:'Offer a free guide or download in exchange for an email.', name:'Free Guide Download', category:'Lead Capture', canvasBg:'#f6f2ea', els:[
  { id:tid('lm',1), type:'badge', x:400,y:80,w:300,h:34, txt:'&#128218; FREE GUIDE', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.1em',color:'#c8102e',textAlign:'center',background:'rgba(200,16,46,0.08)',borderRadius:'30px',border:'1px solid rgba(200,16,46,0.25)',padding:'8px 0'} },
  { id:tid('lm',2), type:'heading', x:150,y:140,w:800,h:150, txt:'The 5-step system to get more leads &mdash; without spending on ads.', s:{fontFamily:_I,fontWeight:'900',fontSize:'46px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.08',letterSpacing:'-1px'} },
  { id:tid('lm',3), type:'text', x:250,y:305,w:600,h:56, txt:'A free step-by-step guide you can put to work today. Enter your email and _I&rsquo;ll send it straight over.', s:{fontFamily:_I,fontSize:'18px',color:'#5a6478',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('lm',4), type:'text', x:360,y:390,w:380,h:120, txt:'&#10003;&nbsp; The exact daily routine that builds traffic<br>&#10003;&nbsp; A simple page that turns clicks into leads<br>&#10003;&nbsp; The follow-up that does the selling for you', s:{fontFamily:_I,fontSize:'16px',color:'#0d1a3a',textAlign:'left',lineHeight:'2',fontWeight:'600'} },
  { id:tid('lm',5), type:'form', x:340,y:530,w:420,h:135, txt:_spForm('Send me the free guide',_RED,false), _formRedirect:'__OWNER_REF__', s:{background:'transparent'} },
  { id:tid('lm',6), type:'text', x:300,y:685,w:500,h:24, txt:'Completely free &middot; No credit card &middot; Unsubscribe anytime', s:{fontFamily:_I,fontSize:'12px',color:'#8a94a6',textAlign:'center',fontWeight:'600'} },
]},
// 2 NEWSLETTER (clean minimal white)
{ id:'newsletter-signup', thumbnailGradient:'linear-gradient(135deg,#ffffff,#eef2f8)', description:'A clean, minimal signup for your weekly email.', name:'Newsletter Signup', category:'Lead Capture', canvasBg:'#ffffff', els:[
  { id:tid('nl',1), type:'heading', x:200,y:170,w:700,h:80, txt:'Marketing that actually works, every Tuesday.', s:{fontFamily:_I,fontWeight:'900',fontSize:'42px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.1',letterSpacing:'-1px'} },
  { id:tid('nl',2), type:'text', x:270,y:275,w:560,h:56, txt:'One short, practical email a week. No fluff, no spam &mdash; just one idea you can use.', s:{fontFamily:_I,fontSize:'18px',color:'#5a6478',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('nl',3), type:'form', x:340,y:365,w:420,h:135, txt:_spForm('Subscribe free',_NAVY,false), _formRedirect:'__OWNER_REF__', s:{background:'transparent'} },
  { id:tid('nl',4), type:'text', x:300,y:515,w:500,h:24, txt:'Join 2,000+ readers &middot; Unsubscribe anytime', s:{fontFamily:_I,fontSize:'13px',color:'#8a94a6',textAlign:'center',fontWeight:'600'} },
]},
// 3 WEBINAR (navy)
{ id:'webinar-registration', thumbnailGradient:'linear-gradient(135deg,#0a1f52,#12388f)', description:'Fill seats for a live workshop or webinar.', name:'Webinar Registration', category:'Registration', canvasBg:'#0a1f52', els:[
  { id:tid('wb',1), type:'badge', x:400,y:70,w:300,h:34, txt:'&#128250; FREE LIVE WORKSHOP', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#ff8a99',textAlign:'center',background:'rgba(255,39,67,0.14)',borderRadius:'30px',border:'1px solid rgba(255,138,153,0.4)',padding:'8px 0'} },
  { id:tid('wb',2), type:'heading', x:150,y:135,w:800,h:150, txt:'How to get your first 100 leads in 30 days &mdash; live, step by step.', s:{fontFamily:_I,fontWeight:'900',fontSize:'44px',color:'#ffffff',textAlign:'center',lineHeight:'1.1',letterSpacing:'-0.5px'} },
  { id:tid('wb',3), type:'text', x:275,y:300,w:550,h:30, txt:'&#128197;&nbsp; Thursday, 7:00 PM &nbsp;&middot;&nbsp; &#9201;&nbsp; 45 minutes + live Q&amp;A', s:{fontFamily:_I,fontSize:'16px',color:'#a9b8e0',textAlign:'center',fontWeight:'700'} },
  { id:tid('wb',4), type:'text', x:300,y:355,w:500,h:80, txt:'Hosted by <b style="color:#fff">Your Name</b> &mdash; and everyone who attends live gets the workbook free.', s:{fontFamily:_I,fontSize:'16px',color:'#c8d6f5',textAlign:'center',lineHeight:'1.55'} },
  { id:tid('wb',5), type:'form', x:340,y:455,w:420,h:135, txt:_spForm('Save my free seat',_RED,true), _formRedirect:'__OWNER_REF__', s:{background:'transparent'} },
  { id:tid('wb',6), type:'text', x:300,y:605,w:500,h:24, txt:'Seats are limited &middot; Replay not guaranteed', s:{fontFamily:_I,fontSize:'12px',color:'#7f90bd',textAlign:'center',fontWeight:'600'} },
]},
// 4 SALES OFFER (light, price)
{ id:'sales-offer', thumbnailGradient:'linear-gradient(135deg,#f6f2ea,#f3d9dd)', description:'Sell a product or kit &mdash; benefits, price and a clear CTA.', name:'Product Offer', category:'Sales', canvasBg:'#f6f2ea', els:[
  { id:tid('so',1), type:'badge', x:400,y:70,w:300,h:34, txt:'&#11088; LIMITED OFFER', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#c8102e',textAlign:'center',background:'rgba(200,16,46,0.08)',borderRadius:'30px',border:'1px solid rgba(200,16,46,0.25)',padding:'8px 0'} },
  { id:tid('so',2), type:'heading', x:150,y:130,w:800,h:150, txt:'Everything you need to launch your first funnel &mdash; in one kit.', s:{fontFamily:_I,fontWeight:'900',fontSize:'46px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.08',letterSpacing:'-1px'} },
  { id:tid('so',3), type:'text', x:340,y:295,w:420,h:150, txt:'&#10003;&nbsp; 30 proven page templates<br>&#10003;&nbsp; Email sequences written for you<br>&#10003;&nbsp; The traffic playbook, step by step<br>&#10003;&nbsp; Lifetime updates included', s:{fontFamily:_I,fontSize:'16px',color:'#0d1a3a',textAlign:'left',lineHeight:'2',fontWeight:'600'} },
  { id:tid('so',4), type:'text', x:350,y:470,w:400,h:44, txt:'<span style="text-decoration:line-through;color:#8a94a6;font-size:22px">$197</span> &nbsp; <b style="font-size:40px;color:#0d1a3a">$49</b>', s:{fontFamily:_I,textAlign:'center'} },
  { id:tid('so',5), type:'button', x:350,y:540,w:400,h:60, txt:'Get instant access &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'18px',color:'#fff',background:'linear-gradient(135deg,#e8203f,#c8102e)',borderRadius:'12px',textAlign:'center'} },
  { id:tid('so',6), type:'text', x:300,y:620,w:500,h:24, txt:'&#128179; Secure checkout &middot; 30-day money-back guarantee', s:{fontFamily:_I,fontSize:'12px',color:'#8a94a6',textAlign:'center',fontWeight:'600'} },
]},
// 5 LINK IN BIO (dark, buttons)
{ id:'link-in-bio', thumbnailGradient:'linear-gradient(135deg,#12103a,#2a1e5c)', description:'A simple link hub for your bio &mdash; all your links in one place.', name:'Link in Bio', category:'Personal', canvasBg:'#12103a', els:[
  { id:tid('lb',1), type:'image', x:490,y:80,w:120,h:120, txt:'', s:{borderRadius:'50%',background:'linear-gradient(135deg,#e8203f,#12388f)',border:'3px solid rgba(255,255,255,0.15)'} },
  { id:tid('lb',2), type:'heading', x:300,y:220,w:500,h:44, txt:'Your Name', s:{fontFamily:_I,fontWeight:'900',fontSize:'30px',color:'#ffffff',textAlign:'center'} },
  { id:tid('lb',3), type:'text', x:300,y:270,w:500,h:26, txt:'Marketer &middot; Creator &middot; Helping you grow', s:{fontFamily:_I,fontSize:'15px',color:'#b9c2e6',textAlign:'center',fontWeight:'500'} },
  { id:tid('lb',4), type:'button', x:360,y:330,w:380,h:56, txt:'&#127760;&nbsp; My website', url:'#', s:{fontFamily:_I,fontWeight:'800',fontSize:'16px',color:'#fff',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:'14px',textAlign:'center'} },
  { id:tid('lb',5), type:'button', x:360,y:400,w:380,h:56, txt:'&#128100;&nbsp; Free guide', url:'#', s:{fontFamily:_I,fontWeight:'800',fontSize:'16px',color:'#fff',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:'14px',textAlign:'center'} },
  { id:tid('lb',6), type:'button', x:360,y:470,w:380,h:56, txt:'&#128241;&nbsp; Follow me', url:'#', s:{fontFamily:_I,fontWeight:'800',fontSize:'16px',color:'#fff',background:'linear-gradient(135deg,#e8203f,#c8102e)',border:'none',borderRadius:'14px',textAlign:'center'} },
]},
// 6 COMING SOON (gradient, waitlist)
{ id:'coming-soon', thumbnailGradient:'linear-gradient(135deg,#0a1f52,#0e2a6e)', description:'Build a waitlist before you launch.', name:'Coming Soon', category:'Personal', canvasBg:'#0a1f52', els:[
  { id:tid('cs',1), type:'badge', x:415,y:150,w:270,h:34, txt:'&#128640; LAUNCHING SOON', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.1em',color:'#7fd6ff',textAlign:'center',background:'rgba(127,214,255,0.12)',borderRadius:'30px',border:'1px solid rgba(127,214,255,0.35)',padding:'8px 0'} },
  { id:tid('cs',2), type:'heading', x:150,y:215,w:800,h:120, txt:'Something new is on the way.', s:{fontFamily:_I,fontWeight:'900',fontSize:'54px',color:'#ffffff',textAlign:'center',lineHeight:'1.05',letterSpacing:'-1.5px'} },
  { id:tid('cs',3), type:'text', x:275,y:350,w:550,h:56, txt:'Be the first to know when we go live &mdash; and get early-access perks nobody else gets.', s:{fontFamily:_I,fontSize:'18px',color:'#c8d6f5',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('cs',4), type:'form', x:340,y:445,w:420,h:135, txt:_spForm('Join the waitlist',_RED,true), _formRedirect:'__OWNER_REF__', s:{background:'transparent'} },
]},
// 7 CONSULTATION BOOKING (light)
{ id:'consultation-booking', thumbnailGradient:'linear-gradient(135deg,#ffffff,#e7edf7)', description:'Book free strategy or discovery calls.', name:'Book a Consultation', category:'Registration', canvasBg:'#ffffff', els:[
  { id:tid('cb',1), type:'badge', x:410,y:80,w:280,h:34, txt:'&#128197; FREE 20-MIN CALL', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#12388f',textAlign:'center',background:'rgba(18,56,143,0.08)',borderRadius:'30px',border:'1px solid rgba(18,56,143,0.25)',padding:'8px 0'} },
  { id:tid('cb',2), type:'heading', x:150,y:145,w:800,h:120, txt:'Let&rsquo;s map out your next 90 days &mdash; free.', s:{fontFamily:_I,fontWeight:'900',fontSize:'46px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.1',letterSpacing:'-1px'} },
  { id:tid('cb',3), type:'text', x:250,y:280,w:600,h:80, txt:'A no-pressure strategy call. We&rsquo;ll look at where you are, where you want to be, and the fastest path between the two.', s:{fontFamily:_I,fontSize:'18px',color:'#5a6478',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('cb',4), type:'button', x:360,y:400,w:380,h:60, txt:'Book my free call &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'18px',color:'#fff',background:'linear-gradient(135deg,#1a44a8,#0a1f52)',borderRadius:'12px',textAlign:'center'} },
  { id:tid('cb',5), type:'text', x:300,y:485,w:500,h:24, txt:'No obligation &middot; Pick any time that suits you', s:{fontFamily:_I,fontSize:'12px',color:'#8a94a6',textAlign:'center',fontWeight:'600'} },
]},
// 8 THANK YOU (utility)
{ id:'thank-you', thumbnailGradient:'linear-gradient(135deg,#f6f2ea,#dff0e5)', description:'The confirmation page shown right after someone opts in.', name:'Thank You', category:'Utility', canvasBg:'#f6f2ea', els:[
  { id:tid('ty',1), type:'text', x:500,y:150,w:100,h:100, txt:'&#9989;', s:{fontFamily:_I,fontSize:'72px',textAlign:'center'} },
  { id:tid('ty',2), type:'heading', x:200,y:270,w:700,h:80, txt:'You&rsquo;re all set &mdash; check your inbox!', s:{fontFamily:_I,fontWeight:'900',fontSize:'44px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.1',letterSpacing:'-1px'} },
  { id:tid('ty',3), type:'text', x:250,y:370,w:600,h:80, txt:'Your download is on its way. It can take a minute or two &mdash; if you don&rsquo;t see it, check your spam or promotions tab.', s:{fontFamily:_I,fontSize:'18px',color:'#5a6478',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('ty',4), type:'button', x:390,y:490,w:320,h:56, txt:'&#8592; Back to the site', url:'#', s:{fontFamily:_I,fontWeight:'800',fontSize:'16px',color:'#0d1a3a',background:'#fff',border:'1.5px solid rgba(13,26,58,0.15)',borderRadius:'12px',textAlign:'center'} },
]},];

export const LABS_TEMPLATES = [
  AL_OPTIN_TOOLKIT,
  AL_OPTIN_HOWITWORKS,
  AL_OPTIN_GAME,
  AL_REVEAL,
  ...STARTER_BATCH_1,
];

// Category list — derived from templates, for filter pills in the
// gallery. Keep "All" as the first entry.
export const TEMPLATE_CATEGORIES = [
  { key: 'all',         label: 'All templates', colour: '#12388f' },
  { key: 'Conversion',  label: 'Conversion',    colour: '#c8102e' },
  { key: 'Lead Capture',label: 'Lead Capture',  colour: '#22c26b' },
  { key: 'Sales',       label: 'Sales',         colour: '#c8102e' },
  { key: 'Registration',label: 'Registration',  colour: '#12388f' },
  { key: 'Personal',    label: 'Personal',      colour: '#7c3aed' },
  { key: 'Utility',     label: 'Utility',       colour: '#5a6478' },
];
