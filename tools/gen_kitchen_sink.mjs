// Generates the "kitchen sink" SuperPages test page HTML using the REAL
// exportHTML.js — one of every interactive element, so the published page
// can be smoke-tested for elements that break once published. NOT hand-rolled
// element HTML: this is the exact exporter output a member's save would emit.
// Run via esbuild bundle (extensionless imports need resolving):
//   ./frontend/node_modules/.bin/esbuild tools/gen_kitchen_sink.mjs --bundle \
//     --platform=node --format=esm --outfile=/tmp/ks.mjs && node /tmp/ks.mjs
import exportHTML from '../frontend/src/pages/labs-superpages/exportHTML.js';
import { ELEMENT_TYPES } from '../frontend/src/pages/labs-superpages/elementDefaults.js';

let y = 40;
const mk = (type, extra = {}) => {
  const d = ELEMENT_TYPES[type] || {};
  const w = extra.w || d.w || 600;
  const h = extra.h || d.h || 80;
  const el = { ...d, ...extra, id: 'ks_' + type, type, x: 250, y, w, h, s: { ...(d.s || {}), ...(extra.s || {}) } };
  y += h + 50;
  return el;
};

// Countdown target — placeholder; the admin endpoint refreshes this to
// now+Ndays at generation time so the page is always live. We still set a
// real future value here so the standalone fixture is testable on its own.
const f = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const p = (n) => String(n).padStart(2, '0');
const td = `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(f.getHours())}:${p(f.getMinutes())}`;

const els = [
  mk('heading', { txt: 'Kitchen Sink — Element Test Page', h: 60 }),
  mk('announcement', { dismissible: true }),       // dismiss uses inline onclick — sanitizer test
  mk('countdown', { _targetDate: td }),            // ticker test (the bug we just fixed)
  mk('form'),                                      // submit-handler wiring test
  mk('faq'),                                       // accordion (class-driven) test
  mk('progress'),                                  // static
  mk('socialicons', { _links: { youtube: 'https://youtube.com', instagram: 'https://instagram.com', x: 'https://x.com' } }),
  mk('audio', { txt: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }),
  mk('video', { txt: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
];

const html = exportHTML(els, '#0b1020', '', {}, '');
process.stdout.write(html);
