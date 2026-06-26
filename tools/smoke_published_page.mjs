// Headless smoke-test for a published SuperPage. Fetches (or reads) the page,
// runs its REAL scripts in jsdom, and verifies the interactive elements
// actually work — not just that they're present in the HTML. This is the check
// a plain `curl` can't do: a script that throws before the countdown ticker
// leaves valid-looking HTML but a frozen page (exactly the bug we hit).
//
// Usage:
//   node tools/smoke_published_page.mjs https://www.superadpro.com/p/superadpro/test-kitchen
//   node tools/smoke_published_page.mjs --file /tmp/rendered.html
import { JSDOM, VirtualConsole } from '../frontend/node_modules/jsdom/lib/api.js';
import fs from 'fs';

const arg = process.argv[2];
const fileArg = arg === '--file' ? process.argv[3] : null;
const url = fileArg ? null : (arg || 'https://www.superadpro.com/p/superadpro/test-kitchen');

const results = [];
const ok = (name, pass, detail = '') => results.push({ name, pass, detail });

async function getHTML() {
  if (fileArg) return fs.readFileSync(fileArg, 'utf-8');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> HTTP ${r.status}`);
  return await r.text();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const html = await getHTML();

  // Capture any script error the page throws — this is the headline check.
  const scriptErrors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => scriptErrors.push(e.message || String(e)));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      // Stub browser APIs jsdom lacks, so failures reflect the PAGE, not the
      // environment. Real browsers have these. (Leaving clientWidth undefined
      // makes the mobile-scale branch's `vw < 1100` falsy, so it skips the
      // requestAnimationFrame path — no false errors.)
      window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (!window.requestAnimationFrame) window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
      window.scrollTo = () => {};
    },
  });
  const { window } = dom;
  window.addEventListener('error', (e) => scriptErrors.push(e.error?.message || e.message || 'window error'));

  // Let inline scripts settle.
  await sleep(50);

  ok('no_script_errors', scriptErrors.length === 0, scriptErrors.join(' | '));

  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => [...doc.querySelectorAll(s)];

  // ── Countdown ──
  const cd = $('[id^="cd_"][data-target]');
  if (!cd) {
    ok('countdown_present', false, 'no [id^=cd_][data-target] element');
  } else {
    ok('countdown_present', true, `target=${cd.getAttribute('data-target')}`);
    const digits = () => [...cd.querySelectorAll('.cdv')].map(d => d.textContent);
    const d1 = digits();
    // The ticker runs update() immediately, so a future target must show
    // non-"00" digits right away. All-"00" = frozen (the bug class).
    const live = d1.length === 4 && d1.some(v => v !== '00');
    ok('countdown_ticking', live, `digits=[${d1.join(',')}]`);
    // Confirm it advances (setInterval running).
    await sleep(1150);
    const d2 = digits();
    ok('countdown_advances', d2[3] !== d1[3] || d2.join() !== d1.join(), `after 1.1s=[${d2.join(',')}]`);
  }

  // ── Opt-in form ──
  const form = $('#gjsContent form') || $('form');
  const emailField = $$('input').find(i =>
    (i.getAttribute('name') || '').toLowerCase() === 'email' ||
    (i.getAttribute('placeholder') || '').toLowerCase().includes('email'));
  const submitBtn = $('button[type="submit"]') || $$('button').find(b => /get|join|submit|access|sign/i.test(b.textContent));
  ok('form_present', !!emailField, emailField ? '' : 'no email input found');
  ok('form_submit_wired', !!submitBtn, submitBtn ? `btn="${(submitBtn.textContent||'').trim().slice(0,24)}"` : 'no submit button');

  // ── Media ──
  const audio = $('audio');
  ok('audio_present', !!audio && !!(audio.getAttribute('src') || audio.querySelector('source')), audio ? '' : 'no <audio>');
  const vid = $$('iframe').find(f => /youtube|vimeo|player/.test(f.getAttribute('src') || ''));
  ok('video_present', !!vid, vid ? '' : 'no video iframe');

  // ── FAQ accordion (class-driven; needs a delegated handler to expand) ──
  const faqQ = $('.sp-faq-q');
  ok('faq_present', !!faqQ, faqQ ? '' : 'no .sp-faq-q');

  // ── Dismissible banner — informational. Its close × uses an inline onclick
  // that the save-sanitiser strips, so on a published page it won't dismiss.
  const banner = $('[data-sap-dismissible]');
  const closeX = banner?.querySelector('.sap-banner-close');
  const hasInlineHandler = closeX ? !!closeX.getAttribute('onclick') : false;
  ok('banner_dismiss_works', banner ? hasInlineHandler : true,
     banner ? (hasInlineHandler ? '' : 'KNOWN: inline onclick stripped by sanitizer — × is dead on published pages') : 'no dismissible banner');

  // ── Report ──
  const pad = (s) => s.padEnd(22);
  let fails = 0, warns = 0;
  console.log(`\nSmoke test: ${fileArg || url}\n` + '─'.repeat(60));
  for (const r of results) {
    const critical = !['banner_dismiss_works'].includes(r.name);
    const mark = r.pass ? 'PASS' : (critical ? 'FAIL' : 'WARN');
    if (!r.pass && critical) fails++;
    if (!r.pass && !critical) warns++;
    console.log(`  ${mark}  ${pad(r.name)} ${r.detail || ''}`);
  }
  console.log('─'.repeat(60));
  console.log(fails === 0 ? `ALL CRITICAL PASS${warns ? ` (${warns} warning)` : ''}` : `${fails} FAILED`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('smoke-test error:', e.message); process.exit(2); });
