// Folio client section renderers — mirror app/folio_render.py, with inline-edit hooks.
// Editable leaves carry data-e="sid|field"; the editor reads innerText on blur.
const AV = 'https://i.pravatar.cc/';

function esc(v, d) {
  if (v === undefined || v === null || v === '') v = (d !== undefined ? d : '');
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function g(p, k, d) { return (p && p[k] !== undefined && p[k] !== '') ? p[k] : d; }
function E(sid, f) { return 'contenteditable="true" spellcheck="false" data-e="' + sid + '|' + f + '"'; }
function B(sid, f) { return 'data-btn="' + sid + '|' + f + '"'; }  // linkable button/link (text + destination via popover)
function IU(p, f, d) { var u = (p && typeof p[f] === 'string' && p[f].trim()) ? p[f].trim() : d; return u.replace(/["'()\\ \n]/g, ''); }
function IMG(sid, f) { return 'data-img="' + sid + '|' + f + '"'; }

function _col(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())) ? v.trim() : ''; }
const _PAD = { sm: '12px', md: '28px', lg: '52px' };
function renderBlockPreview(b) {
  if (!b || typeof b !== 'object') return '';
  const t = b.type;
  const al = (['left', 'center', 'right'].indexOf(b.align) >= 0) ? b.align : 'left';
  let ws = 'text-align:' + al;
  const pad = _PAD[b.pad] || '';
  if (pad) ws += ';padding-top:' + pad + ';padding-bottom:' + pad;
  const bg = _col(b.bg);
  if (bg) ws += ';background:' + bg + ';border-radius:var(--fo-radius)' + (pad ? '' : ';padding:22px');
  const col = _col(b.color); const cstyle = col ? ';color:' + col : '';
  if (t === 'heading') { const lvl = (['h1', 'h2', 'h3'].indexOf(b.level) >= 0) ? b.level : 'h2'; return '<' + lvl + ' class="fb-h" style="' + ws + cstyle + '">' + esc(b.text, 'Your heading') + '</' + lvl + '>'; }
  if (t === 'text') return '<div class="fb-t" style="' + ws + cstyle + '">' + esc(b.text, 'Add your text here.').replace(/\n/g, '<br>') + '</div>';
  if (t === 'image') { const u = IU(b, 'url', ''); const inner = u ? '<img class="fb-img" src="' + u + '"/>' : '<div class="fb-img-ph">Tap to upload an image</div>'; return '<div class="fb-imgwrap" style="' + ws + '">' + inner + '</div>'; }
  if (t === 'button') { const v = b.variant === 'ghost' ? ' fo-btn--ghost' : ''; let bs = ''; const bb = _col(b.btnbg), bf = _col(b.btnfg); if (bb) bs += 'background:' + bb + ';border-color:' + bb + ';'; if (bf) bs += 'color:' + bf + ';'; const sa = bs ? ' style="' + bs + '"' : ''; return '<div style="' + ws + '"><a class="fo-btn' + v + '"' + sa + '>' + esc(b.text, 'Button') + '</a></div>'; }
  if (t === 'video') { const has = b.url && String(b.url).trim(); return '<div style="' + ws + '"><div class="fb-video-ph">' + (has ? '\u25b6 Video ready \u00b7 tap to change link' : '\u25b6 Tap to add a YouTube or Vimeo link') + '</div></div>'; }
  if (t === 'divider') return '<div style="' + ws + '"><hr class="fb-div"/></div>';
  if (t === 'spacer') { let h = parseInt(b.height, 10) || 32; h = Math.max(4, Math.min(200, h)); return '<div class="fb-spacer" style="height:' + h + 'px">' + h + 'px space</div>'; }
  return '';
}

const R = {
  nav: (p, s) => '<div class="s-nav"><div class="fo-wr in">'
    + '<div class="fo-logo"><span class="m">\u2726</span> <span ' + E(s, 'brand') + '>' + esc(g(p, 'brand', 'YourBrand')) + '</span></div>'
    + '<div class="links"><a ' + B(s, 'l1') + '>' + esc(g(p, 'l1', 'Features')) + '</a><a ' + B(s, 'l2') + '>' + esc(g(p, 'l2', 'Pricing')) + '</a>'
    + '<a class="fo-btn" ' + B(s, 'cta') + '>' + esc(g(p, 'cta', 'Get started')) + '</a></div></div></div>',

  hero: (p, s) => '<div class="s s-hero"><div class="fo-wr g"><div>'
    + '<div class="fo-eyebrow" ' + E(s, 'eyebrow') + '>' + esc(g(p, 'eyebrow', 'Free download \u00b7 2026')) + '</div>'
    + '<h1><span ' + E(s, 'headline') + '>' + esc(g(p, 'headline', '27 free traffic sources')) + '</span> <span class="u" ' + E(s, 'headline_accent') + '>' + esc(g(p, 'headline_accent', 'most marketers never touch.')) + '</span></h1>'
    + '<p class="fo-lede" ' + E(s, 'lede') + '>' + esc(g(p, 'lede', 'Find buyers without paying for ads \u2014 with a simple daily routine you can start today.')) + '</p>'
    + '<div class="fo-form" style="margin-top:22px"><input class="fo-input" placeholder="Your best email" disabled/><button class="fo-btn" ' + E(s, 'button') + '>' + esc(g(p, 'button', 'Send the playbook')) + '</button></div>'
    + '<div class="rea"><div class="avs"><span style="background-image:url(' + AV + '56?img=12)"></span><span style="background-image:url(' + AV + '56?img=32)"></span><span style="background-image:url(' + AV + '56?img=45)"></span></div>'
    + '<div class="t"><span class="stars">\u2605\u2605\u2605\u2605\u2605</span><br><span ' + E(s, 'proof') + '>' + esc(g(p, 'proof', '9,400+ downloads')) + '</span></div></div>'
    + '</div><div class="cover-stage"><div class="cover"><div class="seal"><b>FREE</b><span>Guide</span></div>'
    + '<div class="kk" ' + E(s, 'coverKk') + '>' + esc(g(p, 'coverKk', 'The Playbook')) + '</div>'
    + '<div class="ct" ' + E(s, 'coverTitle') + '>' + esc(g(p, 'coverTitle', '27 Free Traffic Sources')) + '</div>'
    + '<div class="cs" ' + E(s, 'coverSub') + '>' + esc(g(p, 'coverSub', 'Where to find buyers without spending a penny.')) + '</div></div></div></div></div>',

  heroCenter: (p, s) => '<div class="s s-herocenter"><div class="fo-wr">'
    + '<span class="badge" ' + E(s, 'badge') + '>' + esc(g(p, 'badge', '\u2605 Loved by 9,400 marketers')) + '</span>'
    + '<h1 class="fo-disp" ' + E(s, 'headline') + '>' + esc(g(p, 'headline', "The last traffic course you'll ever need to buy.")) + '</h1>'
    + '<p class="fo-lede" ' + E(s, 'lede') + '>' + esc(g(p, 'lede', 'Everything that actually works, in one place \u2014 no fluff, no theory, no monthly fees.')) + '</p>'
    + '<div class="btns"><a class="fo-btn" ' + B(s, 'button') + '>' + esc(g(p, 'button', 'Get instant access')) + '</a>'
    + '<a class="fo-btn fo-btn--ghost" ' + B(s, 'button2') + '>' + esc(g(p, 'button2', 'Watch the trailer')) + '</a></div></div></div>',

  stats: (p, s) => {
    const c = (k, dn, dl) => '<div><div class="n" ' + E(s, k + 'n') + '>' + esc(g(p, k + 'n', dn)) + '</div><div class="l" ' + E(s, k + 'l') + '>' + esc(g(p, k + 'l', dl)) + '</div></div>';
    return '<div class="s-stats"><div class="fo-wr g">' + c('a', '27', 'Free sources') + c('b', '0', 'Ad spend') + c('c', '9.4k', 'Downloads') + c('d', '4.9', 'Rating') + '</div></div>';
  },

  features: (p, s) => {
    const card = (k, di, dt, dp) => '<div class="card"><div class="ic">' + di + '</div><h3 ' + E(s, k + 't') + '>' + esc(g(p, k + 't', dt)) + '</h3><p ' + E(s, k + 'p') + '>' + esc(g(p, k + 'p', dp)) + '</p></div>';
    return '<div class="s s-features"><div class="fo-wr">'
      + '<div class="fo-eyebrow" ' + E(s, 'eyebrow') + '>' + esc(g(p, 'eyebrow', 'Inside')) + '</div>'
      + '<h2 class="fo-disp" ' + E(s, 'heading') + '>' + esc(g(p, 'heading', 'Everything you need to start this week.')) + '</h2>'
      + '<p class="sub" ' + E(s, 'sub') + '>' + esc(g(p, 'sub', 'No fluff \u2014 just the sources, the scripts, and the routine.')) + '</p><div class="cards">'
      + card('c1', '\u25ce', 'The 27 sources', "Ranked by speed and effort so you start where it's easiest.")
      + card('c2', '\u270e', 'Copy-paste scripts', 'The exact posts and hooks that get clicks \u2014 swipe them.')
      + card('c3', '\u21bb', 'The daily routine', 'A 30-minute checklist that keeps visitors coming.')
      + '</div></div></div>';
  },

  featRow: (p, s) => '<div class="s s-featrow"><div class="fo-wr g"><div>'
    + '<div class="fo-eyebrow" ' + E(s, 'eyebrow') + '>' + esc(g(p, 'eyebrow', 'Built for speed')) + '</div>'
    + '<h2 class="fo-disp" ' + E(s, 'heading') + '>' + esc(g(p, 'heading', 'Set it up once. Watch it work every day.')) + '</h2>'
    + '<p class="fo-lede" ' + E(s, 'lede') + '>' + esc(g(p, 'lede', "You don't need a following or a budget \u2014 just a plan you'll stick to.")) + '</p>'
    + '<ul class="chk"><li ' + E(s, 'k1') + '>' + esc(g(p, 'k1', 'A ranked list so you start easy')) + '</li><li ' + E(s, 'k2') + '>' + esc(g(p, 'k2', 'Ready-made copy for every platform')) + '</li><li ' + E(s, 'k3') + '>' + esc(g(p, 'k3', 'A simple daily checklist')) + '</li></ul>'
    + '</div>' + (IU(p, 'shot', '') ? '<div class="shot shot-img" ' + IMG(s, 'shot') + ' style="background-image:url(' + IU(p, 'shot', '') + ');background-size:cover;background-position:center"></div>' : '<div class="shot" ' + IMG(s, 'shot') + '></div>') + '</div></div>',

  steps: (p, s) => {
    const st = (k, dn, dt, dp) => '<div class="step"><div class="num">' + dn + '</div><h3 ' + E(s, k + 't') + '>' + esc(g(p, k + 't', dt)) + '</h3><p ' + E(s, k + 'p') + '>' + esc(g(p, k + 'p', dp)) + '</p></div>';
    return '<div class="s s-steps"><div class="fo-wr"><div class="head">'
      + '<div class="fo-eyebrow" style="text-align:center" ' + E(s, 'eyebrow') + '>' + esc(g(p, 'eyebrow', 'Three steps')) + '</div>'
      + '<h2 class="fo-disp" ' + E(s, 'heading') + '>' + esc(g(p, 'heading', 'Up and running in an afternoon.')) + '</h2></div><div class="g">'
      + st('s1', '1', 'Grab it', 'Drop your email and it lands in seconds. Free, no card.')
      + st('s2', '2', 'Pick sources', 'Start with the three easiest using the ready-made scripts.')
      + st('s3', '3', 'Run the routine', 'Thirty minutes a day and the visitors show up.')
      + '</div></div></div>';
  },

  quote: (p, s) => '<div class="s s-quote"><div class="fo-wr"><p class="q fo-disp">\u201c<span ' + E(s, 'quote') + '>' + esc(g(p, 'quote', 'I stopped burning money on ads and doubled my leads in a month.')) + '</span>\u201d</p>'
    + '<div class="qby"><div class="a" ' + IMG(s, 'avatar') + ' style="background-image:url(' + IU(p, 'avatar', AV + '96?img=47') + ')"></div><div class="n"><b ' + E(s, 'name') + '>' + esc(g(p, 'name', 'Dana Reyes')) + '</b><span ' + E(s, 'role') + '>' + esc(g(p, 'role', 'Affiliate marketer')) + '</span></div></div></div></div>',

  pricing: (p, s) => {
    const plan = (k, dn, dpr, feat, tag, items) => '<div class="plan' + (feat ? ' feat' : '') + '">' + (tag ? '<div class="tag">' + tag + '</div>' : '')
      + '<div class="pn" ' + E(s, k + 'n') + '>' + esc(g(p, k + 'n', dn)) + '</div>'
      + '<div class="pr"><span ' + E(s, k + 'pr') + '>' + esc(g(p, k + 'pr', dpr)) + '</span><span>/mo</span></div>'
      + '<ul>' + items.map(x => '<li>' + x + '</li>').join('') + '</ul>'
      + '<a class="fo-btn' + (feat ? '' : ' fo-btn--ghost') + '" ' + B(s, k + 'b') + '>' + esc(g(p, k + 'b', 'Choose')) + '</a></div>';
    return '<div class="s s-pricing"><div class="fo-wr"><div class="head">'
      + '<div class="fo-eyebrow" style="text-align:center" ' + E(s, 'eyebrow') + '>' + esc(g(p, 'eyebrow', 'Pricing')) + '</div>'
      + '<h2 class="fo-disp" ' + E(s, 'heading') + '>' + esc(g(p, 'heading', 'Start free. Upgrade when it pays.')) + '</h2></div><div class="g">'
      + plan('p1', 'Starter', '$0', false, null, ['Core playbook', '5 sources', 'Email support'])
      + plan('p2', 'Pro', '$29', true, 'Popular', ['All 27 sources', 'Script vault', 'Routine tracker', 'Priority support'])
      + plan('p3', 'Team', '$79', false, null, ['Everything in Pro', '5 seats', 'Shared library'])
      + '</div></div></div>';
  },

  faq: (p, s) => {
    const qa = (k, dq, da) => '<div class="qa"><div class="qq"><span ' + E(s, k + 'q') + '>' + esc(g(p, k + 'q', dq)) + '</span> <span class="ic">+</span></div><div class="a" ' + E(s, k + 'a') + '>' + esc(g(p, k + 'a', da)) + '</div></div>';
    return '<div class="s s-faq"><div class="fo-wr g"><h2 class="fo-disp" ' + E(s, 'heading') + '>' + esc(g(p, 'heading', 'Questions, answered.')) + '</h2>'
      + qa('q1', 'Is it really free?', "Yes \u2014 the core playbook costs nothing and there's no card required.")
      + qa('q2', 'Do I need an audience?', 'No. The point is finding traffic from scratch.')
      + qa('q3', 'How fast are results?', 'It depends on your offer and effort \u2014 no guarantees, but most sources start within a week.')
      + '</div></div>';
  },

  cta: (p, s) => '<div class="s s-cta"><div class="fo-wr">'
    + '<h2 class="fo-disp" ' + E(s, 'heading') + '>' + esc(g(p, 'heading', 'Get 27 free traffic sources \u2014 free.')) + '</h2>'
    + '<p ' + E(s, 'sub') + '>' + esc(g(p, 'sub', 'Drop your email and it lands in your inbox in seconds.')) + '</p>'
    + '<div class="fo-form"><input class="fo-input" placeholder="Your best email" disabled/><button class="fo-btn fo-btn--light" ' + E(s, 'button') + '>' + esc(g(p, 'button', 'Send it to me')) + '</button></div>'
    + '<div class="fine" ' + E(s, 'fine') + '>' + esc(g(p, 'fine', 'No spam. Unsubscribe anytime.')) + '</div></div></div>',

  footer: (p, s) => '<div class="s-footer"><div class="fo-wr"><div class="g">'
    + '<div><div class="fo-logo" style="color:#fff"><span class="m">\u2726</span> <span ' + E(s, 'brand') + '>' + esc(g(p, 'brand', 'YourBrand')) + '</span></div>'
    + '<p class="about" ' + E(s, 'about') + '>' + esc(g(p, 'about', 'The free playbook and tools smart marketers use to get traffic without ads.')) + '</p></div>'
    + '<div><h4>Product</h4><a>Features</a><a>Pricing</a></div><div><h4>Company</h4><a>About</a><a>Contact</a></div></div>'
    + '<div class="bot"><span ' + E(s, 'copy') + '>' + esc(g(p, 'copy', '\u00a9 2026 YourBrand')) + '</span><span>Built with Folio</span></div></div></div>',

  bio: (p, s) => {
    const lk = (k, d, pri) => '<a class="lk' + (pri ? ' pri' : '') + '" ' + B(s, k) + '>' + esc(g(p, k, d)) + '</a>';
    return '<div class="s-bio"><div class="av" ' + IMG(s, 'avatar') + ' style="background-image:url(' + IU(p, 'avatar', AV + '160?img=25') + ')"></div>'
      + '<h1 ' + E(s, 'name') + '>' + esc(g(p, 'name', 'Alex Rivers')) + '</h1>'
      + '<div class="h" ' + E(s, 'bio') + '>' + esc(g(p, 'bio', 'Marketer & creator. Helping you get traffic without the guesswork.')) + '</div>'
      + '<div class="links">' + lk('l1', '\uD83D\uDCD5 Get my free Traffic Playbook', true) + lk('l2', '\uD83C\uDFA5 Watch my latest video') + lk('l3', '\uD83D\uDCAC Join the free community') + lk('l4', '\uD83D\uDEE0 The tools I actually use') + '</div>'
      + '<div class="soc"><i>ig</i><i>yt</i><i>x</i><i>in</i></div></div>';
  },

  webinar: (p, s) => '<div class="s-web"><div class="fo-wr g"><div>'
    + '<span class="date">\u25f7 <span ' + E(s, 'date') + '>' + esc(g(p, 'date', 'Thu \u00b7 2:00 PM EST \u00b7 Free')) + '</span></span>'
    + '<h1 class="fo-disp" ' + E(s, 'headline') + '>' + esc(g(p, 'headline', 'The 3-step system for free traffic that converts.')) + '</h1>'
    + '<p class="fo-lede" ' + E(s, 'lede') + '>' + esc(g(p, 'lede', 'A live 45-minute training where I walk through the exact routine.')) + '</p>'
    + '<ul class="learn"><li ' + E(s, 'w1') + '>' + esc(g(p, 'w1', 'Where to find buyers without paying for ads')) + '</li><li ' + E(s, 'w2') + '>' + esc(g(p, 'w2', 'The daily routine that keeps them coming')) + '</li><li ' + E(s, 'w3') + '>' + esc(g(p, 'w3', 'How to turn free traffic into real sales')) + '</li></ul></div>'
    + '<div class="card"><h4 ' + E(s, 'formTitle') + '>' + esc(g(p, 'formTitle', 'Save your free seat')) + '</h4>'
    + '<input class="fo-input" placeholder="First name" disabled/><input class="fo-input" placeholder="Your best email" disabled/>'
    + '<button class="fo-btn" ' + E(s, 'button') + '>' + esc(g(p, 'button', 'Reserve my seat \u2192')) + '</button></div></div></div>',

  comingSoon: (p, s) => '<div class="s-coming"><div class="fo-wr"><div class="fo-logo"><span class="m">\u2726</span> <span ' + E(s, 'brand') + '>' + esc(g(p, 'brand', 'YourBrand')) + '</span></div>'
    + '<h1 class="fo-disp"><span ' + E(s, 'headline') + '>' + esc(g(p, 'headline', 'Something worth')) + '</span> <span class="u" ' + E(s, 'headline_accent') + '>' + esc(g(p, 'headline_accent', 'waiting for.')) + '</span></h1>'
    + '<p ' + E(s, 'lede') + '>' + esc(g(p, 'lede', "We're putting the finishing touches on it. Drop your email and be first through the door.")) + '</p>'
    + '<div class="fo-form"><input class="fo-input" placeholder="Your best email" disabled/><button class="fo-btn" ' + E(s, 'button') + '>' + esc(g(p, 'button', 'Notify me')) + '</button></div>'
    + '<div class="soon" ' + E(s, 'soon') + '>' + esc(g(p, 'soon', 'Launching Spring 2026')) + '</div></div></div>',

  blocks: (p, s) => {
    const bl = Array.isArray(p.blocks) ? p.blocks : [];
    const inner = bl.map((b, i) => '<div class="fblk" data-blk="' + s + '|' + i + '">' + renderBlockPreview(b) + '</div>').join('');
    return '<div class="s s-blocks"><div class="fo-wr fb-wrap">' + (inner || '<div class="fb-empty">No blocks yet — add one below</div>') + '<button class="fb-add" data-addblk="' + s + '">+ Add block</button></div></div>';
  },
  thankYou: (p, s) => '<div class="s s-thanks"><div class="fo-wr"><div class="tick">\u2713</div>'
    + '<h1 class="fo-disp" ' + E(s, 'headline') + '>' + esc(g(p, 'headline', "You're in! Check your inbox.")) + '</h1>'
    + '<p class="fo-lede" ' + E(s, 'lede') + '>' + esc(g(p, 'lede', 'Your playbook is on its way. While you wait \u2014 watch this 2-minute intro.')) + '</p>'
    + '<div class="vid"><div class="play">\u25b6</div></div>'
    + '<div style="margin-top:30px"><a class="fo-btn" ' + B(s, 'button') + '>' + esc(g(p, 'button', 'Get started now \u2192')) + '</a></div></div></div>',
};

export function renderSection(type, props, sid) {
  const fn = R[type];
  return fn ? fn(props || {}, sid) : '';
}

export const BLOCK_LIB = [
  { type: 'heading', label: 'Heading' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'button', label: 'Button' },
  { type: 'video', label: 'Video' },
  { type: 'divider', label: 'Divider' },
  { type: 'spacer', label: 'Spacer' },
];
export function newBlock(type) {
  const d = { heading: { text: 'Your heading', level: 'h2', align: 'left' }, text: { text: 'Add your text here.', align: 'left' }, image: { url: '', align: 'center' }, button: { text: 'Click here', href: '', align: 'center', variant: 'solid' }, video: { url: '' }, divider: {}, spacer: { height: 32 } };
  return Object.assign({ type: type }, d[type] || {});
}

export const SECTION_LIB = [
  { type: 'blocks', label: 'Content blocks', cat: 'Build your own' },
  { type: 'nav', label: 'Navigation', cat: 'Structure' },
  { type: 'hero', label: 'Hero + opt-in', cat: 'Headers' },
  { type: 'heroCenter', label: 'Hero centered', cat: 'Headers' },
  { type: 'stats', label: 'Stats strip', cat: 'Proof' },
  { type: 'features', label: 'Features (cards)', cat: 'Body' },
  { type: 'featRow', label: 'Feature row', cat: 'Body' },
  { type: 'steps', label: 'How it works', cat: 'Body' },
  { type: 'quote', label: 'Testimonial', cat: 'Proof' },
  { type: 'pricing', label: 'Pricing', cat: 'Body' },
  { type: 'faq', label: 'FAQ', cat: 'Body' },
  { type: 'cta', label: 'Call to action', cat: 'Body' },
  { type: 'footer', label: 'Footer', cat: 'Structure' },
  { type: 'bio', label: 'Link in bio', cat: 'Standalone' },
  { type: 'webinar', label: 'Webinar signup', cat: 'Standalone' },
  { type: 'comingSoon', label: 'Coming soon', cat: 'Standalone' },
  { type: 'thankYou', label: 'Thank you', cat: 'Standalone' },
];
