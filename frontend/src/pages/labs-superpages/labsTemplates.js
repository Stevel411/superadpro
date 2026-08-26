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


// -- Professional starter templates (batch 2, verified 25 Aug 2026) --
function _spCard(t, s, c) {
  return `<div style="background:${c || '#fff'};border-radius:14px;padding:18px 20px;box-shadow:0 2px 12px rgba(13,26,58,0.06);height:100%;box-sizing:border-box"><div style="color:#f0a52a;font-size:15px;margin-bottom:6px">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style="font-size:14px;color:#0d1a3a;line-height:1.5;font-weight:500">${t}</div><div style="font-size:12px;color:#8a94a6;margin-top:10px;font-weight:700">&mdash; ${s}</div></div>`;
}
const STARTER_BATCH_2 = [
// 9 VSL
{ id:'vsl-sales', thumbnailGradient:'linear-gradient(135deg,#0b1020,#1a2440)', description:'Let a short video do the selling, with one clear CTA.', name:'Video Sales Page', category:'Sales', canvasBg:'#0b1020', els:[
  { id:tid('v',1), type:'badge', x:400,y:60,w:300,h:34, txt:'&#9654; WATCH THIS FIRST', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#ff8a99',textAlign:'center',background:'rgba(255,39,67,0.14)',borderRadius:'30px',border:'1px solid rgba(255,138,153,0.4)',padding:'8px 0'} },
  { id:tid('v',2), type:'heading', x:150,y:120,w:800,h:100, txt:'The fastest way to turn your traffic into sales.', s:{fontFamily:_I,fontWeight:'900',fontSize:'42px',color:'#fff',textAlign:'center',lineHeight:'1.1',letterSpacing:'-0.5px'} },
  { id:tid('v',3), type:'video', x:270,y:250,w:560,h:315, txt:'', s:{background:'rgba(255,255,255,0.05)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.12)'} },
  { id:tid('v',4), type:'button', x:370,y:600,w:360,h:60, txt:'Yes &mdash; _I want in &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'18px',color:'#fff',background:'linear-gradient(135deg,#e8203f,#c8102e)',borderRadius:'12px',textAlign:'center'} },
  { id:tid('v',5), type:'text', x:300,y:685,w:500,h:24, txt:'30-day guarantee &middot; Cancel anytime', s:{fontFamily:_I,fontSize:'12px',color:'#7f90bd',textAlign:'center',fontWeight:'600'} },
]},
// 10 QUIZ
{ id:'quiz-optin', thumbnailGradient:'linear-gradient(135deg,#1a1035,#3a1e6c)', description:'Capture leads with an interactive quiz or survey.', name:'Quiz / Survey', category:'Lead Capture', canvasBg:'#1a1035', els:[
  { id:tid('q',1), type:'badge', x:410,y:120,w:280,h:34, txt:'&#129504; 60-SECOND QUIZ', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#c7a3ff',textAlign:'center',background:'rgba(199,163,255,0.14)',borderRadius:'30px',border:'1px solid rgba(199,163,255,0.4)',padding:'8px 0'} },
  { id:tid('q',2), type:'heading', x:150,y:185,w:800,h:130, txt:'What&rsquo;s really holding your traffic back?', s:{fontFamily:_I,fontWeight:'900',fontSize:'50px',color:'#fff',textAlign:'center',lineHeight:'1.08',letterSpacing:'-1px'} },
  { id:tid('q',3), type:'text', x:250,y:330,w:600,h:56, txt:'Answer 5 quick questions and get a personalised action plan &mdash; free, instant, no fluff.', s:{fontFamily:_I,fontSize:'18px',color:'#cfc3f0',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('q',4), type:'button', x:360,y:430,w:380,h:62, txt:'Start the quiz &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'18px',color:'#1a1035',background:'linear-gradient(135deg,#fff,#e9dcff)',borderRadius:'14px',textAlign:'center'} },
  { id:tid('q',5), type:'text', x:300,y:520,w:500,h:24, txt:'Takes under a minute &middot; Free result', s:{fontFamily:_I,fontSize:'12px',color:'#9d8fc4',textAlign:'center',fontWeight:'600'} },
]},
// 11 EVENT
{ id:'event-registration', thumbnailGradient:'linear-gradient(135deg,#f6f2ea,#f3d9dd)', description:'Drive sign-ups for an event, summit or live session.', name:'Event Registration', category:'Registration', canvasBg:'#f6f2ea', els:[
  { id:tid('e',1), type:'badge', x:400,y:70,w:300,h:34, txt:'&#127881; YOU&rsquo;RE INVITED', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#c8102e',textAlign:'center',background:'rgba(200,16,46,0.08)',borderRadius:'30px',border:'1px solid rgba(200,16,46,0.25)',padding:'8px 0'} },
  { id:tid('e',2), type:'heading', x:150,y:130,w:800,h:120, txt:'The 2026 Growth Summit &mdash; join us live.', s:{fontFamily:_I,fontWeight:'900',fontSize:'46px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.08',letterSpacing:'-1px'} },
  { id:tid('e',3), type:'text', x:250,y:270,w:600,h:30, txt:'&#128197;&nbsp; Sat 14 June, 10am &nbsp;&middot;&nbsp; &#128205;&nbsp; Online &amp; free', s:{fontFamily:_I,fontSize:'16px',color:'#12388f',textAlign:'center',fontWeight:'800'} },
  { id:tid('e',4), type:'text', x:270,y:320,w:560,h:60, txt:'A half-day of practical sessions from people actually growing right now. Replays for everyone who registers.', s:{fontFamily:_I,fontSize:'17px',color:'#5a6478',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('e',5), type:'form', x:340,y:415,w:420,h:135, txt:_spForm('Reserve my free spot',_RED,false), _formRedirect:'__OWNER_REF__', s:{background:'transparent'} },
  { id:tid('e',6), type:'text', x:300,y:565,w:500,h:24, txt:'Free to attend &middot; Replays included', s:{fontFamily:_I,fontSize:'12px',color:'#8a94a6',textAlign:'center',fontWeight:'600'} },
]},
// 12 TESTIMONIAL / PROOF
{ id:'social-proof', thumbnailGradient:'linear-gradient(135deg,#ffffff,#eef2f8)', description:'Let testimonials and star ratings do the convincing.', name:'Testimonials / Proof', category:'Conversion', canvasBg:'#ffffff', els:[
  { id:tid('t',1), type:'heading', x:150,y:90,w:800,h:80, txt:'Don&rsquo;t take our word for it.', s:{fontFamily:_I,fontWeight:'900',fontSize:'44px',color:'#0d1a3a',textAlign:'center',lineHeight:'1.1',letterSpacing:'-1px'} },
  { id:tid('t',2), type:'text', x:250,y:185,w:600,h:40, txt:'Real results from real members using this exact system.', s:{fontFamily:_I,fontSize:'17px',color:'#5a6478',textAlign:'center',fontWeight:'500'} },
  { id:tid('t',3), type:'text', x:80,y:260,w:300,h:170, txt:_spCard('&ldquo;_I went from zero to a full pipeline of leads in six weeks. This just works.&rdquo;','Sarah K.'), s:{background:'transparent'} },
  { id:tid('t',4), type:'text', x:400,y:260,w:300,h:170, txt:_spCard('&ldquo;Finally a builder _I don&rsquo;t need a designer for. My pages look professional.&rdquo;','James R.'), s:{background:'transparent'} },
  { id:tid('t',5), type:'text', x:720,y:260,w:300,h:170, txt:_spCard('&ldquo;The templates alone saved me weeks. _I launched in a single afternoon.&rdquo;','Maria L.'), s:{background:'transparent'} },
  { id:tid('t',6), type:'button', x:370,y:470,w:360,h:58, txt:'Start free today &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'18px',color:'#fff',background:'linear-gradient(135deg,#e8203f,#c8102e)',borderRadius:'12px',textAlign:'center'} },
]},
// 13 ABOUT / BIO
{ id:'about-bio', thumbnailGradient:'linear-gradient(135deg,#f6f2ea,#e3e9f5)', description:'Introduce yourself and invite people to work with you.', name:'About / Bio', category:'Personal', canvasBg:'#f6f2ea', els:[
  { id:tid('ab',1), type:'image', x:490,y:70,w:120,h:120, txt:'', s:{borderRadius:'50%',background:'linear-gradient(135deg,#12388f,#0a1f52)',border:'3px solid #fff',boxShadow:'0 6px 18px rgba(13,26,58,0.15)'} },
  { id:tid('ab',2), type:'heading', x:250,y:210,w:600,h:60, txt:'Hi, _I&rsquo;m Your Name', s:{fontFamily:_I,fontWeight:'900',fontSize:'40px',color:'#0d1a3a',textAlign:'center',letterSpacing:'-1px'} },
  { id:tid('ab',3), type:'text', x:250,y:285,w:600,h:120, txt:'_I help everyday marketers get more leads without the overwhelm. Over the last few years _I&rsquo;ve helped hundreds of people build pages that actually convert &mdash; and _I&rsquo;d love to help you next.', s:{fontFamily:_I,fontSize:'18px',color:'#5a6478',textAlign:'center',lineHeight:'1.6',fontWeight:'500'} },
  { id:tid('ab',4), type:'button', x:390,y:440,w:320,h:56, txt:'Work with me &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'17px',color:'#fff',background:'linear-gradient(135deg,#1a44a8,#0a1f52)',borderRadius:'12px',textAlign:'center'} },
]},
// 14 DISCOUNT OFFER
{ id:'discount-offer', thumbnailGradient:'linear-gradient(135deg,#c8102e,#8f0b20)', description:'A bold, time-limited discount with a promo code.', name:'Discount Offer', category:'Sales', canvasBg:'#c8102e', els:[
  { id:tid('d',1), type:'badge', x:400,y:90,w:300,h:36, txt:'&#9200; LIMITED TIME', s:{fontFamily:_I,fontWeight:'900',fontSize:'12px',letterSpacing:'.1em',color:'#fff',textAlign:'center',background:'rgba(255,255,255,0.15)',borderRadius:'30px',border:'1px solid rgba(255,255,255,0.4)',padding:'8px 0'} },
  { id:tid('d',2), type:'heading', x:150,y:155,w:800,h:150, txt:'Save 40% today only.', s:{fontFamily:_I,fontWeight:'900',fontSize:'64px',color:'#fff',textAlign:'center',lineHeight:'1',letterSpacing:'-2px'} },
  { id:tid('d',3), type:'text', x:250,y:325,w:600,h:40, txt:'Use code <b style="color:#fff;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:8px;letter-spacing:2px">SAVE40</b> at checkout.', s:{fontFamily:_I,fontSize:'20px',color:'#ffd7dd',textAlign:'center',fontWeight:'600'} },
  { id:tid('d',4), type:'button', x:360,y:420,w:380,h:64, txt:'Claim my 40% off &#8594;', url:'#', s:{fontFamily:_I,fontWeight:'900',fontSize:'19px',color:'#c8102e',background:'#fff',borderRadius:'14px',textAlign:'center'} },
  { id:tid('d',5), type:'text', x:300,y:510,w:500,h:24, txt:'Offer ends at midnight &middot; No code needed after checkout', s:{fontFamily:_I,fontSize:'12px',color:'#ffc2ca',textAlign:'center',fontWeight:'600'} },
]},
// 15 APP DOWNLOAD
{ id:'app-download', thumbnailGradient:'linear-gradient(135deg,#0b1020,#12233f)', description:'Promote an app with store buttons and ratings.', name:'App Download', category:'Sales', canvasBg:'#0b1020', els:[
  { id:tid('ap',1), type:'heading', x:150,y:150,w:800,h:130, txt:'Your goals, in your pocket.', s:{fontFamily:_I,fontWeight:'900',fontSize:'52px',color:'#fff',textAlign:'center',lineHeight:'1.05',letterSpacing:'-1.5px'} },
  { id:tid('ap',2), type:'text', x:275,y:295,w:550,h:56, txt:'Track progress, stay on habit, and never miss a day &mdash; free to download.', s:{fontFamily:_I,fontSize:'18px',color:'#a9b8e0',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('ap',3), type:'button', x:300,y:395,w:230,h:58, txt:'&#63743;&nbsp; App Store', url:'#', s:{fontFamily:_I,fontWeight:'800',fontSize:'16px',color:'#fff',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'12px',textAlign:'center'} },
  { id:tid('ap',4), type:'button', x:570,y:395,w:230,h:58, txt:'&#9654;&nbsp; Google Play', url:'#', s:{fontFamily:_I,fontWeight:'800',fontSize:'16px',color:'#fff',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'12px',textAlign:'center'} },
  { id:tid('ap',5), type:'text', x:300,y:485,w:500,h:24, txt:'&#11088; 4.9 rating &middot; 50,000+ downloads', s:{fontFamily:_I,fontSize:'13px',color:'#7f90bd',textAlign:'center',fontWeight:'700'} },
]},
// 16 AFFILIATE PROMO (AL)
{ id:'al-affiliate-promo', thumbnailGradient:'linear-gradient(135deg,#0a1f52,#0e6b3a)', description:'Promote AdvantageLife and earn as people join.', name:'Affiliate Promo', category:'Conversion', canvasBg:'#0a1f52', els:[
  { id:tid('af',1), type:'badge', x:400,y:70,w:300,h:34, txt:'&#128184; GET PAID TO SHARE', s:{fontFamily:_I,fontWeight:'800',fontSize:'12px',letterSpacing:'.08em',color:'#22c26b',textAlign:'center',background:'rgba(34,194,107,0.12)',borderRadius:'30px',border:'1px solid rgba(34,194,107,0.4)',padding:'8px 0'} },
  { id:tid('af',2), type:'heading', x:150,y:135,w:800,h:150, txt:'Advertising that pays you back.', s:{fontFamily:_I,fontWeight:'900',fontSize:'48px',color:'#fff',textAlign:'center',lineHeight:'1.05',letterSpacing:'-1px'} },
  { id:tid('af',3), type:'text', x:250,y:300,w:600,h:80, txt:'Run video ads watched by real people, and earn as you share. Free to join &mdash; full access from day one.', s:{fontFamily:_I,fontSize:'18px',color:'#c8d6f5',textAlign:'center',lineHeight:'1.55',fontWeight:'500'} },
  { id:tid('af',4), type:'button', x:370,y:420,w:360,h:60, txt:'Join free today &#8594;', url:'/register', s:{fontFamily:_I,fontWeight:'900',fontSize:'18px',color:'#fff',background:'linear-gradient(135deg,#e8203f,#c8102e)',borderRadius:'12px',textAlign:'center'} },
  { id:tid('af',5), type:'text', x:300,y:505,w:500,h:24, txt:'No card &middot; No fees to join &middot; Start earning day one', s:{fontFamily:_I,fontSize:'12px',color:'#7f90bd',textAlign:'center',fontWeight:'600'} },
]},];


// -- VSL variations (batch 3, verified 25 Aug 2026) --
const STARTER_BATCH_3 = [
{
  "id": "vsl-masterclass",
  "name": "VSL — Free Masterclass",
  "category": "Sales",
  "canvasBg": "#0a1f52",
  "els": [
   {
    "id": "t_m_1",
    "type": "badge",
    "x": 400,
    "y": 56,
    "w": 300,
    "h": 34,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "800",
     "fontSize": "12px",
     "letterSpacing": ".08em",
     "color": "#7fd6ff",
     "textAlign": "center",
     "background": "rgba(127,214,255,0.12)",
     "borderRadius": "30px",
     "border": "1px solid #7fd6ff66",
     "padding": "8px 0"
    },
    "txt": "&#127916; FREE MASTERCLASS"
   },
   {
    "id": "t_m_2",
    "type": "heading",
    "x": 130,
    "y": 112,
    "w": 840,
    "h": 96,
    "txt": "The free training that shows you exactly how it&rsquo;s done.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "40px",
     "color": "#fff",
     "textAlign": "center",
     "lineHeight": "1.12",
     "letterSpacing": "-0.5px"
    }
   },
   {
    "id": "t_m_3",
    "type": "video",
    "x": 290,
    "y": 230,
    "w": 520,
    "h": 293,
    "txt": "",
    "s": {
     "background": "rgba(255,255,255,0.05)",
     "borderRadius": "16px",
     "border": "1px solid rgba(255,255,255,0.12)",
     "boxShadow": "0 10px 40px rgba(10,20,56,0.25)"
    }
   },
   {
    "id": "t_m_4",
    "type": "text",
    "x": 300,
    "y": 545,
    "w": 500,
    "h": 80,
    "txt": "&#10003;&nbsp; The 3-step system, start to finish<br>&#10003;&nbsp; The one mistake that kills most pages<br>&#10003;&nbsp; How to see results inside a week",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "15px",
     "color": "#c8d6f5",
     "textAlign": "left",
     "lineHeight": "1.9",
     "fontWeight": "600"
    }
   },
   {
    "id": "t_m_5",
    "type": "button",
    "x": 370,
    "y": 640,
    "w": 360,
    "h": 58,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "18px",
     "color": "#fff",
     "background": "linear-gradient(135deg,#e8203f,#c8102e)",
     "borderRadius": "12px",
     "textAlign": "center"
    },
    "txt": "Watch the free training &#8594;",
    "url": "#"
   },
   {
    "id": "t_m_6",
    "type": "text",
    "x": 300,
    "y": 712,
    "w": 500,
    "h": 22,
    "txt": "Free &middot; No signup to watch &middot; 18 minutes",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "12px",
     "color": "#7f90bd",
     "textAlign": "center",
     "fontWeight": "600"
    }
   }
  ],
  "thumbnailGradient": "linear-gradient(135deg,#0a1f52,#12388f)",
  "description": "Free-masterclass framing &mdash; video, key takeaways, one CTA."
 },
 {
  "id": "vsl-light",
  "name": "VSL — Clean Light",
  "category": "Sales",
  "canvasBg": "#f6f2ea",
  "els": [
   {
    "id": "t_l_1",
    "type": "badge",
    "x": 410,
    "y": 60,
    "w": 280,
    "h": 34,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "800",
     "fontSize": "12px",
     "letterSpacing": ".08em",
     "color": "#c8102e",
     "textAlign": "center",
     "background": "rgba(200,16,46,0.08)",
     "borderRadius": "30px",
     "border": "1px solid #c8102e66",
     "padding": "8px 0"
    },
    "txt": "&#9654; WATCH THE DEMO"
   },
   {
    "id": "t_l_2",
    "type": "heading",
    "x": 150,
    "y": 116,
    "w": 800,
    "h": 90,
    "txt": "See exactly how it works &mdash; in 3 minutes.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "42px",
     "color": "#0d1a3a",
     "textAlign": "center",
     "lineHeight": "1.1",
     "letterSpacing": "-1px"
    }
   },
   {
    "id": "t_l_3",
    "type": "video",
    "x": 290,
    "y": 225,
    "w": 520,
    "h": 293,
    "txt": "",
    "s": {
     "background": "#0d1a3a",
     "borderRadius": "16px",
     "border": "1px solid rgba(13,26,58,0.1)",
     "boxShadow": "0 10px 40px rgba(10,20,56,0.25)"
    }
   },
   {
    "id": "t_l_4",
    "type": "text",
    "x": 275,
    "y": 545,
    "w": 550,
    "h": 44,
    "txt": "No jargon, no fluff &mdash; just a quick look at how it comes together, and how it can work for you.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "17px",
     "color": "#5a6478",
     "textAlign": "center",
     "lineHeight": "1.5",
     "fontWeight": "500"
    }
   },
   {
    "id": "t_l_5",
    "type": "button",
    "x": 370,
    "y": 615,
    "w": 360,
    "h": 60,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "18px",
     "color": "#fff",
     "background": "linear-gradient(135deg,#e8203f,#c8102e)",
     "borderRadius": "12px",
     "textAlign": "center"
    },
    "txt": "Get started free &#8594;",
    "url": "#"
   },
   {
    "id": "t_l_6",
    "type": "text",
    "x": 300,
    "y": 695,
    "w": 500,
    "h": 22,
    "txt": "Free to start &middot; No card required",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "12px",
     "color": "#8a94a6",
     "textAlign": "center",
     "fontWeight": "600"
    }
   }
  ],
  "thumbnailGradient": "linear-gradient(135deg,#f6f2ea,#e6dcc8)",
  "description": "A clean, bright video sales page for a quick demo."
 },
 {
  "id": "vsl-urgency",
  "name": "VSL — Urgency",
  "category": "Sales",
  "canvasBg": "#12060a",
  "els": [
   {
    "id": "t_u_1",
    "type": "badge",
    "x": 390,
    "y": 56,
    "w": 320,
    "h": 34,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "800",
     "fontSize": "12px",
     "letterSpacing": ".08em",
     "color": "#ff8a99",
     "textAlign": "center",
     "background": "rgba(255,39,67,0.16)",
     "borderRadius": "30px",
     "border": "1px solid #ff8a9966",
     "padding": "8px 0"
    },
    "txt": "&#9200; DOORS CLOSE FRIDAY"
   },
   {
    "id": "t_u_2",
    "type": "heading",
    "x": 150,
    "y": 112,
    "w": 800,
    "h": 96,
    "txt": "This closes Friday &mdash; watch before it&rsquo;s gone.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "42px",
     "color": "#fff",
     "textAlign": "center",
     "lineHeight": "1.1",
     "letterSpacing": "-0.5px"
    }
   },
   {
    "id": "t_u_3",
    "type": "video",
    "x": 290,
    "y": 225,
    "w": 520,
    "h": 293,
    "txt": "",
    "s": {
     "background": "rgba(255,255,255,0.05)",
     "borderRadius": "16px",
     "border": "1px solid rgba(255,255,255,0.12)",
     "boxShadow": "0 10px 40px rgba(10,20,56,0.25)"
    }
   },
   {
    "id": "t_u_4",
    "type": "text",
    "x": 300,
    "y": 545,
    "w": 500,
    "h": 30,
    "txt": "&#128293; Only a handful of spots left at this price.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "16px",
     "color": "#ffb3bd",
     "textAlign": "center",
     "fontWeight": "700"
    }
   },
   {
    "id": "t_u_5",
    "type": "button",
    "x": 360,
    "y": 595,
    "w": 380,
    "h": 64,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "18px",
     "color": "#fff",
     "background": "linear-gradient(135deg,#e8203f,#c8102e)",
     "borderRadius": "12px",
     "textAlign": "center"
    },
    "txt": "Claim my spot now &#8594;",
    "url": "#"
   },
   {
    "id": "t_u_6",
    "type": "text",
    "x": 300,
    "y": 680,
    "w": 500,
    "h": 22,
    "txt": "Price goes up when the timer hits zero",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "12px",
     "color": "#a06b72",
     "textAlign": "center",
     "fontWeight": "600"
    }
   }
  ],
  "thumbnailGradient": "linear-gradient(135deg,#12060a,#3a0f18)",
  "description": "Scarcity-driven VSL &mdash; deadline, video, strong CTA."
 },
 {
  "id": "vsl-proof",
  "name": "VSL — Video + Proof",
  "category": "Sales",
  "canvasBg": "#ffffff",
  "els": [
   {
    "id": "t_p_1",
    "type": "heading",
    "x": 150,
    "y": 70,
    "w": 800,
    "h": 80,
    "txt": "Watch this, then hear from people just like you.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "38px",
     "color": "#0d1a3a",
     "textAlign": "center",
     "lineHeight": "1.12",
     "letterSpacing": "-0.5px"
    }
   },
   {
    "id": "t_p_2",
    "type": "video",
    "x": 290,
    "y": 175,
    "w": 520,
    "h": 293,
    "txt": "",
    "s": {
     "background": "#0d1a3a",
     "borderRadius": "16px",
     "border": "1px solid rgba(13,26,58,0.1)",
     "boxShadow": "0 10px 40px rgba(10,20,56,0.25)"
    }
   },
   {
    "id": "t_p_3",
    "type": "text",
    "x": 110,
    "y": 500,
    "w": 280,
    "h": 110,
    "txt": "<div style=\"background:#f6f2ea;border-radius:12px;padding:16px;height:100%;box-sizing:border-box\"><div style=\"color:#f0a52a\">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style=\"font-size:13px;color:#0d1a3a;margin-top:6px;line-height:1.5\">&ldquo;Watched the video, signed up, and had my page live the same day.&rdquo;</div></div>",
    "s": {
     "background": "transparent"
    }
   },
   {
    "id": "t_p_4",
    "type": "text",
    "x": 410,
    "y": 500,
    "w": 280,
    "h": 110,
    "txt": "<div style=\"background:#f6f2ea;border-radius:12px;padding:16px;height:100%;box-sizing:border-box\"><div style=\"color:#f0a52a\">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style=\"font-size:13px;color:#0d1a3a;margin-top:6px;line-height:1.5\">&ldquo;Everything he shows in the video actually works. No fluff.&rdquo;</div></div>",
    "s": {
     "background": "transparent"
    }
   },
   {
    "id": "t_p_5",
    "type": "text",
    "x": 710,
    "y": 500,
    "w": 280,
    "h": 110,
    "txt": "<div style=\"background:#f6f2ea;border-radius:12px;padding:16px;height:100%;box-sizing:border-box\"><div style=\"color:#f0a52a\">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style=\"font-size:13px;color:#0d1a3a;margin-top:6px;line-height:1.5\">&ldquo;Best 5 minutes I&rsquo;ve spent. Wish I&rsquo;d found this sooner.&rdquo;</div></div>",
    "s": {
     "background": "transparent"
    }
   },
   {
    "id": "t_p_6",
    "type": "button",
    "x": 370,
    "y": 645,
    "w": 360,
    "h": 58,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "18px",
     "color": "#fff",
     "background": "linear-gradient(135deg,#e8203f,#c8102e)",
     "borderRadius": "12px",
     "textAlign": "center"
    },
    "txt": "Start free today &#8594;",
    "url": "#"
   }
  ],
  "thumbnailGradient": "linear-gradient(135deg,#ffffff,#eef2f8)",
  "description": "Video with three testimonials right underneath it."
 },
 {
  "id": "vsl-longform",
  "name": "VSL — Long-form Sales",
  "category": "Sales",
  "canvasBg": "#f6f2ea",
  "els": [
   {
    "id": "t_lf_1",
    "type": "badge",
    "x": 400,
    "y": 50,
    "w": 300,
    "h": 34,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "800",
     "fontSize": "12px",
     "letterSpacing": ".08em",
     "color": "#c8102e",
     "textAlign": "center",
     "background": "rgba(200,16,46,0.08)",
     "borderRadius": "30px",
     "border": "1px solid #c8102e66",
     "padding": "8px 0"
    },
    "txt": "&#11088; NEW TRAINING"
   },
   {
    "id": "t_lf_2",
    "type": "heading",
    "x": 130,
    "y": 104,
    "w": 840,
    "h": 96,
    "txt": "Everything you need to get leads &mdash; explained in one video.",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "40px",
     "color": "#0d1a3a",
     "textAlign": "center",
     "lineHeight": "1.1",
     "letterSpacing": "-1px"
    }
   },
   {
    "id": "t_lf_3",
    "type": "video",
    "x": 290,
    "y": 220,
    "w": 520,
    "h": 293,
    "txt": "",
    "s": {
     "background": "#0d1a3a",
     "borderRadius": "16px",
     "border": "1px solid rgba(13,26,58,0.1)",
     "boxShadow": "0 10px 40px rgba(10,20,56,0.25)"
    }
   },
   {
    "id": "t_lf_4",
    "type": "text",
    "x": 340,
    "y": 540,
    "w": 420,
    "h": 130,
    "txt": "&#10003;&nbsp; The full system, nothing held back<br>&#10003;&nbsp; Templates &amp; scripts you can copy<br>&#10003;&nbsp; A clear plan for your first 30 days<br>&#10003;&nbsp; Lifetime access &amp; updates",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "16px",
     "color": "#0d1a3a",
     "textAlign": "left",
     "lineHeight": "2",
     "fontWeight": "600"
    }
   },
   {
    "id": "t_lf_5",
    "type": "text",
    "x": 350,
    "y": 685,
    "w": 400,
    "h": 44,
    "txt": "<span style=\"text-decoration:line-through;color:#8a94a6;font-size:20px\">$149</span> &nbsp; <b style=\"font-size:38px;color:#0d1a3a\">$39</b>",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "textAlign": "center"
    }
   },
   {
    "id": "t_lf_6",
    "type": "button",
    "x": 350,
    "y": 750,
    "w": 400,
    "h": 62,
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontWeight": "900",
     "fontSize": "18px",
     "color": "#fff",
     "background": "linear-gradient(135deg,#e8203f,#c8102e)",
     "borderRadius": "12px",
     "textAlign": "center"
    },
    "txt": "Get instant access &#8594;",
    "url": "#"
   },
   {
    "id": "t_lf_7",
    "type": "text",
    "x": 300,
    "y": 832,
    "w": 500,
    "h": 22,
    "txt": "&#128179; Secure checkout &middot; 30-day money-back guarantee",
    "s": {
     "fontFamily": "Inter,sans-serif",
     "fontSize": "12px",
     "color": "#8a94a6",
     "textAlign": "center",
     "fontWeight": "600"
    }
   }
  ],
  "thumbnailGradient": "linear-gradient(135deg,#f6f2ea,#f3d9dd)",
  "description": "Long-form sales page &mdash; video, benefits, price, guarantee."
 }
];

export const LABS_TEMPLATES = [
  AL_OPTIN_TOOLKIT,
  AL_OPTIN_HOWITWORKS,
  AL_OPTIN_GAME,
  AL_REVEAL,
  ...STARTER_BATCH_1,
  ...STARTER_BATCH_2,
  ...STARTER_BATCH_3,
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
