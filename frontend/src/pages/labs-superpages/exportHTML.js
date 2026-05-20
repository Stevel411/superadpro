import { SOCIAL_SVGS } from './elementDefaults';

export default function exportHTML(els, canvasBg, canvasBgImage) {
  let bgStyle = `background:${canvasBg};`;
  if (canvasBgImage) bgStyle += `background-image:url(${canvasBgImage});background-size:cover;background-position:center;background-repeat:no-repeat;`;

  // Sort elements for desktop position rendering AND mobile reflow order.
  //
  // Mobile note (fixed 14 May 2026): the responsive @media query at the
  // bottom of this file converts absolutely-positioned elements to a
  // relative-positioned vertical stack. The stacking order comes from
  // the DOM order, which is set here. Previously this was a plain
  // y-then-x sort, so a primary CTA at y=600 and a secondary nudge-bar
  // at y=598 would mobile-stack with the nudge-bar above the CTA — even
  // though visually on desktop they were near-overlapping at the same
  // band.
  //
  // Fix: band y to the nearest 40px before sorting, so visual rows on
  // desktop become predictable mobile-stack rows. Within a band, sort
  // by x left-to-right.
  const Y_BAND = 40;
  const sorted = [...els].sort((a, b) => {
    const bandA = Math.floor((a.y || 0) / Y_BAND);
    const bandB = Math.floor((b.y || 0) / Y_BAND);
    if (bandA !== bandB) return bandA - bandB;
    return (a.x || 0) - (b.x || 0);
  });
  const maxY = els.length > 0 ? Math.max(...els.map(e => e.y + e.h)) + 80 : 900;

  let h = `<div style="${bgStyle}position:relative;min-height:100vh;width:100%;overflow-x:hidden;font-family:'Outfit',sans-serif">`;
  h += `<div class="sp-page" style="position:relative;width:1100px;max-width:100%;margin:0 auto;min-height:${Math.max(900, maxY)}px">`;

  sorted.forEach(el => {
    // Hidden elements (set via layer panel) are excluded from rendering
    // on both the editor preview iframe and the published page.
    if (el.hidden) return;
    const allStyles = { position: 'absolute', left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', boxSizing: 'border-box', ...(el.s || {}) };
    // Filter out null/undefined values which would serialise as "undefined" /
    // "null" strings and break the style attribute parsing. Defensive guard
    // added 20 May 2026 while diagnosing 'Subscribe button renders as naked
    // text in preview' bug — if a commit ever produces a null style value
    // this guarantees it doesn't corrupt the output.
    const st = Object.entries(allStyles)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v)
      .join(';');
    // Diagnostic — runs once per render. Logged to browser console so Steve
    // can grab the output during preview testing. Remove once we've found
    // and fixed the preview-vs-canvas discrepancy.
    if (typeof console !== 'undefined' && (el.type === 'button' || el.type === 'announcement')) {
      try {
        console.log('[exportHTML]', el.type, el.id, { txt: el.txt, url: el.url, s: el.s, generated_style: st });
      } catch (e) {}
    }
    const elClass = `sp-el sp-${el.type}`;
    // Element id used as a CSS hook for per-device override rules at the
    // bottom of this file. Element ids in the editor look like
    // `e1m2n3...` (uid()), safe for CSS selectors.
    const elAttrs = `class="${elClass}" id="${el.id}"`;

    if (el.type === 'video' && el.txt) {
      const isMP4 = el._isMP4 || /\.(mp4|webm|ogg)/.test(el.txt) || el.txt.includes('funnel-videos');
      if (isMP4) {
        h += `<video ${elAttrs} src="${el.txt}" style="${st};border-radius:12px;object-fit:cover" autoplay muted loop playsinline></video>`;
      } else {
        let embedUrl = el.txt;
        const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
        const vmMatch = embedUrl.match(/(?:vimeo\.com\/)(\d+)/);
        if (vmMatch && !embedUrl.includes('player.vimeo.com')) embedUrl = `https://player.vimeo.com/video/${vmMatch[1]}`;
        
        if (embedUrl.includes('youtube.com/embed/') && !embedUrl.includes('modestbranding')) {
          embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'modestbranding=1&rel=0&showinfo=0&color=white&iv_load_policy=3';
        } else if (embedUrl.includes('player.vimeo.com/') && !embedUrl.includes('byline=0')) {
          embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'byline=0&portrait=0&title=0';
        }
        h += `<iframe ${elAttrs} src="${embedUrl}" style="${st};border:none;border-radius:12px" allowfullscreen></iframe>`;
      }
    } else if (el.type === 'video' && !el.txt?.trim()) {
      // Skip empty video placeholders
    } else if (el.type === 'image' && el.txt) {
      h += `<img ${elAttrs} src="${el.txt}" style="${st};object-fit:cover">`;
    } else if (el.type === 'image' && !el.txt?.trim()) {
      // Skip empty image placeholders
    } else if (['spacer', 'divider', 'box'].includes(el.type) && !el.txt) {
      h += `<div ${elAttrs} style="${st}"></div>`;
    } else if ((el.type === 'button' || el.type === 'announcement') && el.url) {
      // URL sanitisation (audit B-7, 20 May 2026):
      //   - Block dangerous schemes (javascript:, data:, vbscript:) — XSS guard
      //   - For absolute http(s) URLs, add target="_blank" + rel="noopener noreferrer"
      //     so external links open in a new tab and can't reach back via window.opener
      //   - Anchor links (#section) and relative paths render without target/rel
      //     since they're same-page or same-origin
      const raw = String(el.url).trim();
      const lower = raw.toLowerCase();
      const blocked = lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:');
      const safeUrl = blocked ? '#' : raw;
      const isExternal = /^https?:\/\//i.test(safeUrl);
      const extraAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      // Phase 2B (banner only): sticky banners pin to top of viewport
      // via position:fixed override. Inline-style override is appended
      // AFTER `st` so it wins specificity for the sticky case.
      const stickyOverride = (el.type === 'announcement' && el.sticky)
        ? ';position:fixed;top:0;left:0;right:0;width:100%;z-index:9999'
        : '';
      // Banner full-bleed fix (20 May 2026):
      // Non-sticky banners default to width:1100px (canvas width), which
      // leaves an empty strip on either side on viewports >1100px because
      // .sp-page is `width:1100px;max-width:100%;margin:0 auto`. The
      // banner gradient ended at .sp-page's edge, not the viewport's.
      //
      // Fix: for non-sticky banners (banners ARE conceptually full-bleed
      // — they ARE the page-wide ribbon), override width to 100vw and
      // pull left to -50vw from .sp-page-center via left:50% +
      // margin-left:-50vw. .sp-page's overflow-x:hidden was moved up to
      // the outer wrapper so this break-out actually shows.
      // Sticky banners keep their own override (above) so we don't
      // double-apply.
      const fullBleedOverride = (el.type === 'announcement' && !el.sticky)
        ? ';left:50%;margin-left:-50vw;width:100vw'
        : '';
      // Phase 2B (banner only): dismissible adds a data attribute the
      // page-level script (emitted at the foot of the body) looks for,
      // plus an inline × control. The dismiss state persists per-visitor
      // via localStorage keyed on the page slug + element id.
      const dismissibleData = (el.type === 'announcement' && el.dismissible) ? ' data-sap-dismissible="1"' : '';
      h += `<a ${elAttrs}${dismissibleData} href="${safeUrl}"${extraAttrs} style="${st};text-decoration:none;display:flex;align-items:center;justify-content:center${stickyOverride}${fullBleedOverride}">${el.txt || ''}${(el.type === 'announcement' && el.dismissible) ? '<span class="sap-banner-close" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:18px;line-height:1;opacity:0.7;padding:4px 8px" onclick="event.preventDefault();event.stopPropagation();this.closest(\'a,div\').style.display=\'none\';try{localStorage.setItem(\'sap-bn-\'+this.closest(\'[id]\').id,\'1\');}catch(e){}">×</span>' : ''}</a>`;
    } else if ((el.type === 'button' || el.type === 'announcement') && !el.url) {
      // Same banner sticky + dismissible handling for unlinked banners.
      // Banner without a URL is rare but valid (e.g. plain info ribbon).
      const stickyOverride = (el.type === 'announcement' && el.sticky)
        ? ';position:fixed;top:0;left:0;right:0;width:100%;z-index:9999'
        : '';
      // Full-bleed override for non-sticky banners — see explanatory
      // comment in the with-URL branch above. Identical mechanism.
      const fullBleedOverride = (el.type === 'announcement' && !el.sticky)
        ? ';left:50%;margin-left:-50vw;width:100vw'
        : '';
      const dismissibleData = (el.type === 'announcement' && el.dismissible) ? ' data-sap-dismissible="1"' : '';
      h += `<div ${elAttrs}${dismissibleData} style="${st};display:flex;align-items:center;justify-content:center;position:${(el.type === 'announcement' && el.sticky) ? 'fixed' : 'absolute'}${stickyOverride}${fullBleedOverride}">${el.txt || ''}${(el.type === 'announcement' && el.dismissible) ? '<span class="sap-banner-close" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:18px;line-height:1;opacity:0.7;padding:4px 8px" onclick="event.stopPropagation();this.closest(\'[id]\').style.display=\'none\';try{localStorage.setItem(\'sap-bn-\'+this.closest(\'[id]\').id,\'1\');}catch(e){}">×</span>' : ''}</div>`;
    } else if (el.type === 'audio' && el._audioUrl) {
      h += `<audio ${elAttrs} src="${el._audioUrl}" style="${st};border-radius:12px" controls></audio>`;
    } else if (el.type === 'embed' && el._embedCode) {
      h += `<div ${elAttrs} style="${st};overflow:hidden">${el._embedCode}</div>`;
    } else if (el.type === 'countdown') {
      const td = el._targetDate || '';
      const cdId = 'cd_' + el.id;
      h += `<div ${elAttrs} style="${st}"><div id="${cdId}" data-target="${td}" style="display:flex;gap:12px;justify-content:center;align-items:center;width:100%;height:100%">${['Days', 'Hrs', 'Min', 'Sec'].map((l, i) => `<div style="text-align:center"><div class="cdv" style="font-family:Sora,sans-serif;font-size:28px;font-weight:900;color:#fff;background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 14px;min-width:50px;border:1px solid rgba(255,255,255,0.08)">00</div><div style="font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px">${l}</div></div>`).join('')}</div></div>`;
    } else if (el.type === 'progress') {
      const pct = el._percent || 75, lbl = el._label || 'Progress', clr = el._color || '#0ea5e9';
      h += `<div ${elAttrs} style="${st}"><div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;font-weight:600;color:#e2e8f0">${lbl}</span><span style="font-size:13px;font-weight:700;color:${clr}">${pct}%</span></div><div style="width:100%;height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${clr};border-radius:5px"></div></div></div></div>`;
    } else if (el.type === 'socialicons') {
      const links = el._links || {};
      h += `<div ${elAttrs} style="${st};display:flex;gap:14px;justify-content:center;align-items:center">${Object.entries(SOCIAL_SVGS).map(([k, d]) => {
        const url = links[k] || '#';
        const tag = url && url !== '#' && url !== '' ? 'a' : 'span';
        const href = tag === 'a' ? ` href="${url}" target="_blank"` : '';
        return `<${tag}${href} style="display:inline-flex"><svg viewBox="0 0 24 24" width="22" height="22" fill="#94a3b8"><path d="${d}"/></svg></${tag}>`;
      }).join('')}</div>`;
    } else if (el.type === 'form') {
      // Build the form body in two passes to support both the new
      // (post-18-May-2026) buildHTML output that emits <button
      // data-sp-submit="1"> directly, AND any existing pages still
      // using the legacy styled-<div> button pattern. Same logic as
      // production superpages exportHTML.js.
      let formHtml = el.txt || '';

      // PASS 1 (new) — promote our hook button to type="submit".
      formHtml = formHtml.replace(
        /<button data-sp-submit="1"([^>]*)>/gi,
        '<button type="submit"$1>'
      );

      // PASS 2 (legacy) — historical pages have a styled <div>.
      formHtml = formHtml.replace(
        /<div([^>]*?)style="([^"]*?)"([^>]*)>(Get Access|Submit|Sign Up|Join|Download|Get Started|Subscribe|Claim|Register|Save My Seat|Reserve)[^<]*<\/div>/gi,
        '<button type="submit" style="$2;border:none;cursor:pointer;font-family:inherit">$4</button>'
      );

      formHtml = formHtml.replace(
        /placeholder="([^"]*?name[^"]*?)"/gi,
        'placeholder="$1" name="name"'
      ).replace(
        /placeholder="([^"]*?email[^"]*?)"/gi,
        'placeholder="$1" name="email" type="email"'
      ).replace(
        /placeholder="([^"]*?phone[^"]*?)"/gi,
        'placeholder="$1" name="phone" type="tel"'
      );
      // Behaviour attributes — _formRedirect maps to data-redirect
      // (existing, makes the form navigate on success), and
      // _formSuccessMsg maps to data-success-message (Phase 2B, used
      // when no redirect is set — renders an inline thank-you instead
      // of just toggling the submit button text). The funnel-render
      // template JS reads both, preferring redirect.
      const redir = el._formRedirect ? ` data-redirect="${(el._formRedirect || '').replace(/"/g, '&quot;')}"` : '';
      const successMsg = (el._formSuccessMsg && !el._formRedirect)
        ? ` data-success-message="${String(el._formSuccessMsg).replace(/"/g, '&quot;')}"`
        : '';
      h += `<form ${elAttrs} style="${st}" onsubmit="return true"${redir}${successMsg}>${formHtml}</form>`;
    } else {
      h += `<div ${elAttrs} style="${st}">${el.txt || ''}</div>`;
    }
  });

  // ── Dismissed-banner restoration script (Phase 2B, 20 May 2026) ──
  // For banners marked dismissible, the inline × button stores
  // "sap-bn-<elid>=1" in localStorage when clicked. This script runs
  // on page load and re-applies that hidden state so dismissed banners
  // don't reappear to repeat visitors.
  //
  // Plain DOM, no dependencies — works in the published HTML where
  // there's no React. Try/catch around localStorage in case the browser
  // is in private mode or storage is full (otherwise the rest of the
  // page wouldn't execute either).
  h += `<script>(function(){try{var els=document.querySelectorAll('[data-sap-dismissible="1"]');for(var i=0;i<els.length;i++){var el=els[i];if(el.id&&localStorage.getItem('sap-bn-'+el.id)==='1'){el.style.display='none';}}}catch(e){}})();</script>`;

  h += '</div></div>';

  // ── Responsive CSS ──
  //
  // Strategy (refreshed 15 May 2026 with per-device overrides):
  //
  //   1. The blanket "@media (max-width: 768px) stack everything" rule
  //      stays as a SAFE FALLBACK for elements with no explicit overrides.
  //      Pages built before the per-device feature still render sensibly.
  //
  //   2. Each element with an el.tablet or el.mobile override gets a
  //      per-id rule that wins over the blanket because it's emitted
  //      after, has higher specificity (#id), and uses !important.
  //
  //   3. Override rules use raw left/top/width/height — NOT the relative
  //      stack — so members get pixel-precision control over per-device
  //      layouts when they want it.
  let overrideTablet = '';
  let overrideMobile = '';
  els.forEach(el => {
    if (el.hidden) return;
    if (el.tablet) {
      const t = el.tablet;
      const parts = [];
      if (t.x != null) parts.push(`left:${t.x}px!important`);
      if (t.y != null) parts.push(`top:${t.y}px!important`);
      if (t.w != null) parts.push(`width:${t.w}px!important;max-width:${t.w}px!important`);
      if (t.h != null) parts.push(`height:${t.h}px!important;min-height:0!important`);
      if (t.hidden) parts.push('display:none!important');
      // Position absolute overrides the blanket "position:relative" stack
      parts.push('position:absolute!important', 'margin:0!important');
      if (parts.length) overrideTablet += `#${el.id}{${parts.join(';')}}\n`;
    }
    if (el.mobile) {
      const m = el.mobile;
      const parts = [];
      if (m.x != null) parts.push(`left:${m.x}px!important`);
      if (m.y != null) parts.push(`top:${m.y}px!important`);
      if (m.w != null) parts.push(`width:${m.w}px!important;max-width:${m.w}px!important`);
      if (m.h != null) parts.push(`height:${m.h}px!important;min-height:0!important`);
      if (m.hidden) parts.push('display:none!important');
      parts.push('position:absolute!important', 'margin:0!important');
      if (parts.length) overrideMobile += `#${el.id}{${parts.join(';')}}\n`;
    }
  });

  // Track which elements have per-device overrides at each breakpoint —
  // their parent .sp-page needs `position:relative` and a min-height to
  // accommodate them, not the default stacked flex.
  const hasTabletOverrides = els.some(el => el.tablet && !el.hidden);
  const hasMobileOverrides = els.some(el => el.mobile && !el.hidden);

  // For pages with per-device overrides, compute the override max-y so
  // .sp-page reserves enough height for the laid-out elements.
  const tabletMaxY = els.reduce((max, el) => {
    if (!el.tablet) return max;
    const y = el.tablet.y != null ? el.tablet.y : el.y;
    const hh = el.tablet.h != null ? el.tablet.h : el.h;
    return Math.max(max, y + hh);
  }, 0);
  const mobileMaxY = els.reduce((max, el) => {
    if (!el.mobile) return max;
    const y = el.mobile.y != null ? el.mobile.y : (el.tablet?.y != null ? el.tablet.y : el.y);
    const hh = el.mobile.h != null ? el.mobile.h : (el.tablet?.h != null ? el.tablet.h : el.h);
    return Math.max(max, y + hh);
  }, 0);

  h += `<style>
@media(max-width:768px){
  .sp-page{width:100%!important;min-height:${hasMobileOverrides ? mobileMaxY + 40 : 'auto'}!important;height:auto!important;${hasMobileOverrides ? 'position:relative!important' : 'display:flex;flex-direction:column;align-items:center;padding:20px 16px!important'}}
  .sp-el{${hasMobileOverrides ? '' : 'position:relative!important;left:auto!important;top:auto!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:40px;margin-bottom:12px'}}
  .sp-heading{font-size:clamp(22px,5vw,36px)!important}
  .sp-heading *{font-size:inherit!important}
  .sp-text{font-size:14px!important}
  .sp-text *{font-size:inherit!important}
  ${hasMobileOverrides ? '' : `.sp-button,.sp-announcement{width:100%!important;max-width:400px!important;height:50px!important}
  .sp-form{width:100%!important;max-width:450px!important;height:auto!important;min-height:200px}
  .sp-form input{width:100%!important;box-sizing:border-box!important}
  .sp-video,.sp-video iframe,.sp-video video{width:100%!important;height:auto!important;min-height:200px;aspect-ratio:16/9}
  .sp-image,.sp-image img{width:100%!important;height:auto!important}
  .sp-stat{width:45%!important;display:inline-flex;text-align:center;justify-content:center}
  .sp-countdown{width:100%!important;max-width:400px!important;height:auto!important;min-height:70px}
  .sp-review,.sp-testimonial{width:100%!important;height:auto!important;min-height:80px}
  .sp-icontext{width:100%!important;height:auto!important;min-height:60px}
  .sp-divider{width:90%!important;height:2px!important}
  .sp-spacer{height:20px!important;width:100%!important}
  .sp-box{width:100%!important;height:auto!important;min-height:100px}
  .sp-label,.sp-badge{width:auto!important;max-width:280px!important;height:auto!important;min-height:28px}
  .sp-socialicons{width:100%!important;height:auto!important;min-height:30px}
  .sp-progress{width:100%!important;max-width:400px!important;height:auto!important;min-height:40px}
  .sp-embed{width:100%!important;height:auto!important;min-height:150px}
  .sp-audio{width:100%!important;height:auto!important;min-height:50px}
  .sp-logostrip{width:100%!important;height:auto!important;min-height:30px}
  .sp-separator{width:90%!important;height:auto!important;min-height:20px}
  .sp-faq{width:100%!important;height:auto!important;min-height:80px}`}
  ${overrideMobile}
}
@media(min-width:769px) and (max-width:1023px){
  .sp-page{width:100%!important;${hasTabletOverrides ? `min-height:${tabletMaxY + 40}px!important;position:relative!important;padding:0!important` : 'padding:20px!important'}}
  ${hasTabletOverrides ? '' : '.sp-el{transform-origin:top left;scale:calc(100vw / 1100)}'}
  ${overrideTablet}
}
@media(min-width:1024px) and (max-width:1100px){
  .sp-page{width:100%!important;padding:20px!important}
  .sp-el{transform-origin:top left;scale:calc(100vw / 1100)}
}
</style>`;

  return h;
}
