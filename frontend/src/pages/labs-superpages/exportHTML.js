import { SOCIAL_SVGS } from './elementDefaults';
import sanitizeEmbed from './sanitizeEmbed';

// HTML-escape user-supplied text values that go into structured-content
// element renders (Phase 3 Inspector refactor, audit C-X-4). These
// fields are typed as plain strings by the member via Inspector form
// inputs, but get embedded into the published HTML so a stray '<' or
// '&' could corrupt the output. We escape on the render side rather
// than on input so the underlying data stays clean.
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function exportHTML(els, canvasBg, canvasBgImage, typography, scripts) {
  // typography: { heading, body, baseSize, headingScale } from pageSettings.
  // scripts: { ga4, metaPixel, gtm, tiktokPixel, clarity, customHead,
  //            customBody, advancedEnabled } from pageSettings.
  // Built 22 May 2026. Drives:
  //   1. A <style> block at the top that emits CSS variables + a Google
  //      Fonts @import for the chosen heading + body fonts. Existing
  //      published pages without typography get nothing here — render
  //      unchanged.
  //   2. Heading elements without explicit fontFamily inherit the
  //      heading font via the var.
  //   3. Body text inherits via the sp-page wrapper's font-family.
  //   4. Analytics & tracking snippets (GA4 / Meta / GTM / TikTok /
  //      Clarity) injected near the top of the document so they fire
  //      early. Advanced raw scripts (head + body) appended at the
  //      configured positions when advancedEnabled.
  const typo = typography || {};
  const sc = scripts || {};
  let fontImports = '';
  let fontVars = '';
  if (typo.heading || typo.body) {
    const families = [];
    if (typo.heading) families.push(typo.heading.replace(/\s+/g, '+') + ':wght@400;700;900');
    if (typo.body && typo.body !== typo.heading) families.push(typo.body.replace(/\s+/g, '+') + ':wght@400;500;700');
    if (families.length) {
      fontImports = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${families.join('&family=')}&display=swap" rel="stylesheet">`;
    }
  }
  const scaleMap = { compact: 0.9, normal: 1, large: 1.15 };
  const headingScale = scaleMap[typo.headingScale] || 1;
  const headingStack = typo.heading ? `"${typo.heading}", "Sora", sans-serif` : `"Sora", sans-serif`;
  const bodyStack = typo.body ? `"${typo.body}", "DM Sans", sans-serif` : `"Outfit", "DM Sans", sans-serif`;
  fontVars = `<style>
    .sp-page { --page-font-heading: ${headingStack}; --page-font-body: ${bodyStack}; --page-heading-scale: ${headingScale}; --page-font-base-size: ${typo.baseSize || 16}px; font-family: var(--page-font-body); font-size: var(--page-font-base-size); }
    .sp-page [data-el-type="heading"]:not([data-has-font="1"]) { font-family: var(--page-font-heading); font-size: calc(var(--page-h-base, 36px) * var(--page-heading-scale)); }
    /* 25 May 2026: page-level Body Font applies to every text-bearing
       element type that hasn't been explicitly customised. Without these
       rules, baked-in inline font-family on button/banner/badge/label
       would block inheritance from .sp-page. The :not([data-has-font="1"])
       guard means member's explicit Inspector picks still win. */
    .sp-page [data-el-type="text"]:not([data-has-font="1"]),
    .sp-page [data-el-type="button"]:not([data-has-font="1"]),
    .sp-page [data-el-type="announcement"]:not([data-has-font="1"]),
    .sp-page [data-el-type="badge"]:not([data-has-font="1"]),
    .sp-page [data-el-type="label"]:not([data-has-font="1"]),
    .sp-page [data-el-type="form"]:not([data-has-font="1"]),
    .sp-page [data-el-type="review"]:not([data-has-font="1"]),
    .sp-page [data-el-type="testimonial"]:not([data-has-font="1"]),
    .sp-page [data-el-type="stat"]:not([data-has-font="1"]),
    .sp-page [data-el-type="icontext"]:not([data-has-font="1"]),
    .sp-page [data-el-type="faq"]:not([data-has-font="1"]),
    .sp-page [data-el-type="progress"]:not([data-has-font="1"]),
    .sp-page [data-el-type="logostrip"]:not([data-has-font="1"]),
    .sp-page [data-el-type="separator"]:not([data-has-font="1"]) { font-family: var(--page-font-body); }
    /* Body Size: text elements without explicit per-element size inherit
       the page-level base size. .sp-page already sets the base on the
       wrapper, but text elements with their own font-size: in inline
       style would override it. By scoping this rule to data-has-font="0"
       — which doubles as "this element has no explicit text styling" in
       practice for elements that survived migration — we let the slider
       actually drive text size. Headings keep their own size system
       (the calc(... * --page-heading-scale) rule above). */
    .sp-page [data-el-type="text"]:not([data-has-font="1"]) { font-size: var(--page-font-base-size); }
    /* 25 May 2026: Tiptap may bake <span style="font-family: X"> into
       saved heading HTML during inline editing. Force all heading
       descendants to inherit so the wrapper's var(--page-font-heading)
       propagates correctly. Same logic on member's explicit Inspector
       picks (which set the wrapper's font directly). */
    .sp-page [data-el-type="heading"] * { font-family: inherit; }
  </style>`;

  // ─── Analytics & tracking snippets ───
  // Each provider's official install snippet, generated from the
  // member-supplied ID. These go in <head> so they fire before page
  // render — critical for accurate pageview tracking.
  let trackingHead = '';
  const ga4Id = (sc.ga4 || '').trim();
  if (ga4Id) {
    trackingHead += `\n<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');</script>`;
  }
  const metaPixelId = (sc.metaPixel || '').trim();
  if (metaPixelId) {
    trackingHead += `\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');</script>\n<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1"/></noscript>`;
  }
  const gtmId = (sc.gtm || '').trim();
  let gtmBodyNoscript = '';
  if (gtmId) {
    trackingHead += `\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>`;
    gtmBodyNoscript = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
  }
  const tiktokId = (sc.tiktokPixel || '').trim();
  if (tiktokId) {
    trackingHead += `\n<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=i+"?sdkid="+e+"&lib=ttq";e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${tiktokId}');ttq.page();}(window,document,'ttq');</script>`;
  }
  const clarityId = (sc.clarity || '').trim();
  if (clarityId) {
    trackingHead += `\n<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");</script>`;
  }
  // Advanced raw custom scripts (only when explicitly enabled by member)
  let customHead = '';
  let customBody = '';
  if (sc.advancedEnabled) {
    if (sc.customHead) customHead = '\n' + sc.customHead;
    if (sc.customBody) customBody = '\n' + sc.customBody;
  }

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

  let h = fontImports + fontVars + trackingHead + customHead + `<div style="${bgStyle}position:relative;min-height:100vh;width:100%;overflow-x:hidden;font-family:'Outfit',sans-serif">`;
  // GTM noscript fallback recommended placement is right after <body>.
  // Our export doesn't emit a body tag (template wraps it), so we put
  // it as the first child of the page wrapper. That's the closest we
  // can get to GTM's "immediately after body" rule.
  if (gtmBodyNoscript) h += gtmBodyNoscript;
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
    const elClass = `sp-el sp-${el.type}`;
    // Element id used as a CSS hook for per-device override rules at the
    // bottom of this file. Element ids in the editor look like
    // `e1m2n3...` (uid()), safe for CSS selectors.
    // data-el-type / data-has-font added 22 May 2026 for the typography
    // system: published-page CSS rules target [data-el-type="..."]
    // to apply var(--page-font-heading) / var(--page-font-body) only on
    // elements that don't have an explicit fontFamily of their own
    // (data-has-font="0").
    //
    // 25 May 2026: _fontExplicit flag is the canonical source of "did
    // the member deliberately pick a font for this element". Set by the
    // Inspector's FontPicker. We treat missing-flag-but-fontFamily-set
    // as legacy explicit too, since the migration only strips known
    // historical defaults — anything else still on el.s.fontFamily is
    // a deliberate choice that predates the flag system.
    const hasExplicitFont = !!(el.s?._fontExplicit || el.s?.fontFamily);
    const elAttrs = `class="${elClass}" id="${el.id}" data-el-type="${el.type}" data-has-font="${hasExplicitFont ? '1' : '0'}"`;

    if (el.type === 'video' && el.txt) {
      const isMP4 = el._isMP4 || /\.(mp4|webm|ogg)/.test(el.txt) || el.txt.includes('funnel-videos');
      if (isMP4) {
        // Per-element playback flags (added Phase 2C, 20 May 2026).
        // Existing pages stay on the historical "autoplay muted loop"
        // defaults because !== false means missing flags also count as
        // on. New default for controls is OFF (autoplaying loops look
        // cleaner without UI).
        const vAutoplay = el._videoAutoplay !== false;
        const vLoop = el._videoLoop !== false;
        const vMuted = el._videoMuted !== false;
        const vControls = !!el._videoControls;
        const attrs = [
          vAutoplay && 'autoplay',
          vLoop && 'loop',
          vMuted && 'muted',
          vControls && 'controls',
          'playsinline',
        ].filter(Boolean).join(' ');
        h += `<video ${elAttrs} src="${el.txt}" style="${st};border-radius:12px;object-fit:cover" ${attrs}></video>`;
      } else {
        let embedUrl = el.txt;
        const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : null;
        if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
        const vmMatch = embedUrl.match(/(?:vimeo\.com\/)(\d+)/);
        if (vmMatch && !embedUrl.includes('player.vimeo.com')) embedUrl = `https://player.vimeo.com/video/${vmMatch[1]}`;

        // YouTube facade mode (20 May 2026). When _ytFacade is on,
        // emit the bare thumbnail + custom play button instead of the
        // YouTube embed. On click, JS swaps in the real iframe with
        // autoplay=1 so the experience continues normally. Visitors
        // see NO YouTube branding until they hit play (and even then
        // we apply the modest+rel=0 flags), and the initial page is
        // ~600KB lighter — the YouTube embed isn't loaded at all
        // unless engaged.
        if (ytId && el._ytFacade) {
          // Facade thumbnail: try maxresdefault.jpg first, fall back to
          // hqdefault.jpg on error. maxres 404s for ~5% of videos
          // (those uploaded before YouTube generated max-res thumbs).
          // Audit C-M-4 (21 May 2026). Using an <img> tag rather than
          // CSS background lets us catch the load error in onerror.
          const thumb = `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`;
          const fallbackThumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
          // Build the modest-branding query the facade will apply on
          // click. Reuses the same toggles as the standard embed.
          const ytParams = [];
          if (el._ytModestBranding !== false) ytParams.push('modestbranding=1');
          if (el._ytHideRelated !== false) ytParams.push('rel=0');
          if (el._ytHideControls) ytParams.push('controls=0');
          ytParams.push('showinfo=0');
          ytParams.push('autoplay=1'); // facade always autoplays on click
          const facadeSrc = `https://www.youtube.com/embed/${ytId}?${ytParams.join('&')}`;
          h += `<div ${elAttrs} data-sp-facade="${facadeSrc}" style="${st};border-radius:12px;position:relative;cursor:pointer;overflow:hidden">
  <img src="${thumb}" onerror="this.onerror=null;this.src='${fallbackThumb}'" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(0,0,0,0.18),rgba(0,0,0,0.32))">
    <div style="width:78px;height:78px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,0.35),0 2px 6px rgba(0,0,0,0.25)">
      <div style="width:0;height:0;border-left:24px solid #0a1438;border-top:15px solid transparent;border-bottom:15px solid transparent;margin-left:6px"></div>
    </div>
  </div>
</div>`;
        } else {
          // Standard iframe path. Apply per-element YouTube branding
          // flags (modest/rel/controls). Defaults preserved as
          // !== false so existing pages get the modest+rel polish
          // automatically.
          if (embedUrl.includes('youtube.com/embed/') && !embedUrl.includes('?')) {
            const ytParams = [];
            if (el._ytModestBranding !== false) ytParams.push('modestbranding=1');
            if (el._ytHideRelated !== false) ytParams.push('rel=0');
            if (el._ytHideControls) ytParams.push('controls=0');
            ytParams.push('showinfo=0');
            ytParams.push('iv_load_policy=3'); // hide video annotations
            ytParams.push('color=white');      // progress bar colour
            embedUrl += '?' + ytParams.join('&');
          } else if (embedUrl.includes('player.vimeo.com/') && !embedUrl.includes('byline=0')) {
            embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'byline=0&portrait=0&title=0';
          }
          h += `<iframe ${elAttrs} src="${embedUrl}" style="${st};border:none;border-radius:12px" allowfullscreen></iframe>`;
        }
      }
    } else if (el.type === 'video' && !el.txt?.trim()) {
      // Skip empty video placeholders
    } else if (el.type === 'image' && el.txt) {
      // _imageAlt + _imageFit added Phase 2C. Both have safe defaults
      // for older images (empty alt, cover fit) so retro-compat is
      // intact without a backfill. Alt text is escaped via attribute-
      // quoting; we deliberately don't HTML-encode here because the
      // browser handles attribute quoting and double-encoding would
      // turn an "&" in alt text into "&amp;amp;".
      // loading="lazy" added 21 May 2026 (audit C-M-2) — improves
      // perceived load time on long pages with multiple images.
      const altText = (el._imageAlt || '').replace(/"/g, '&quot;');
      const fit = el._imageFit || 'cover';
      h += `<img ${elAttrs} src="${el.txt}" alt="${altText}" loading="lazy" style="${st};object-fit:${fit}">`;
    } else if (el.type === 'image' && !el.txt?.trim()) {
      // Skip empty image placeholders
    } else if (el.type === 'divider' && !el.txt) {
      // Style-aware divider (audit C-L-5, 21 May 2026): solid uses
      // background-color on the wrapper (legacy behaviour preserved
      // for any existing dividers); dashed/dotted swap to a border-top
      // since "dashed background" isn't a CSS thing.
      const dStyle = el._dividerStyle || 'solid';
      if (dStyle === 'dashed' || dStyle === 'dotted') {
        const lineColor = el.s?.background || '#334155';
        const lineThickness = Math.max(2, el.h || 2);
        h += `<div ${elAttrs} style="${st};background:transparent!important;border-top:${lineThickness}px ${dStyle} ${lineColor}"></div>`;
      } else {
        h += `<div ${elAttrs} style="${st}"></div>`;
      }
    } else if (['spacer', 'box'].includes(el.type) && !el.txt) {
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
    } else if (el.type === 'audio' && (el.txt || el._audioUrl)) {
      // Audio URL: canonical key is `txt` (matches image + video).
      // _audioUrl is the legacy key kept readable for any older saved
      // pages — see audit C-M-5 (21 May 2026). New audio elements write
      // to `txt` via elementDefaults; this fallback handles read-only
      // legacy data until pages get re-saved.
      const audioSrc = el.txt || el._audioUrl;
      h += `<audio ${elAttrs} src="${audioSrc}" style="${st};border-radius:12px" controls></audio>`;
    } else if (el.type === 'embed' && el._embedCode) {
      // Sanitise before serialising into the published HTML. This is
      // the actual attack surface — anyone visiting a member's page
      // would otherwise execute whatever HTML/JS they pasted. Audit C-L-6.
      h += `<div ${elAttrs} style="${st};overflow:hidden">${sanitizeEmbed(el._embedCode)}</div>`;
    } else if (el.type === 'countdown') {
      // 22 May 2026 — countdown styling controls (digit/label colour
      // + size, card style, font). Defaults preserve pre-change look
      // for unedited countdowns so already-published pages stay the same.
      // Label-size default: pre-change export was 10px while canvas was
      // 13px — they disagreed. We default to 10px on export to preserve
      // existing published pages; canvas defaults to 13 to match what
      // the editor was always showing. Members touching the inspector
      // pick an explicit value and both sides align.
      const td = el._targetDate || '';
      const cdId = 'cd_' + el.id;
      const digCol = el._cdDigitColor || '#fff';
      const digSize = el._cdDigitSize || 28;
      const lblCol = el._cdLabelColor || '#64748b';
      const lblSize = el._cdLabelSize !== undefined ? el._cdLabelSize : 10;
      const cdStyle = el._cdCardStyle || 'card';
      const fontFam = (el._cdFontFamily || 'Sora,sans-serif').replace(/"/g, '');
      const cardCss = cdStyle === 'minimal'
        ? 'background:transparent;border:none;padding:0 4px'
        : 'background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 14px;border:1px solid rgba(255,255,255,0.08)';
      h += `<div ${elAttrs} style="${st}"><div id="${cdId}" data-target="${td}" style="display:flex;gap:12px;justify-content:center;align-items:center;width:100%;height:100%">${['Days', 'Hrs', 'Min', 'Sec'].map((l) => `<div style="text-align:center"><div class="cdv" style="font-family:${fontFam};font-size:${digSize}px;font-weight:900;color:${digCol};min-width:50px;${cardCss}">00</div><div style="font-size:${lblSize}px;color:${lblCol};margin-top:4px;text-transform:uppercase;letter-spacing:.5px">${l}</div></div>`).join('')}</div></div>`;
    } else if (el.type === 'progress') {
      // _trackColor (Phase 2D, 20 May 2026) — was hardcoded
      // rgba(255,255,255,0.08) which was invisible on light pages.
      // Default preserved for pre-2D progress elements.
      // _labelColor (22 May 2026) — completes the light-theme story.
      // Old hardcoded #e2e8f0 was a light slate, invisible on white.
      const pct = el._percent || 75, lbl = el._label || 'Progress', clr = el._color || '#0ea5e9';
      const trackClr = el._trackColor || 'rgba(255,255,255,0.08)';
      const lblCol = el._labelColor || '#e2e8f0';
      h += `<div ${elAttrs} style="${st}"><div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;font-weight:600;color:${lblCol}">${lbl}</span><span style="font-size:13px;font-weight:700;color:${clr}">${pct}%</span></div><div style="width:100%;height:10px;background:${trackClr};border-radius:5px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${clr};border-radius:5px"></div></div></div></div>`;
    } else if (el.type === 'socialicons') {
      // _iconColor (Phase 2E, 20 May 2026) — was hardcoded #94a3b8
      // which was invisible against the dark default page bg only
      // by coincidence (it matched the slate-400 muted text colour).
      // On light pages the icons disappeared. Default preserved
      // for pre-2E socialicons.
      const links = el._links || {};
      const iconFill = el._iconColor || '#94a3b8';
      // _iconOpacity (22 May 2026) — exposed as a member control because
      // the editor was previously baking 0.7 inline (washed-out look on
      // white pages) while export had no opacity (crisp on published).
      // Default here is 1.0 to PRESERVE existing published behaviour
      // for pre-change socialicons — members who didn't set the field
      // get the same fully-opaque rendering they had before.
      const iconOpacity = el._iconOpacity !== undefined ? el._iconOpacity : 1.0;
      const opacityCss = iconOpacity < 1 ? `;opacity:${iconOpacity}` : '';
      // _iconSize (22 May 2026 follow-up) — was hardcoded 22px.
      const iconSize = el._iconSize || 22;
      h += `<div ${elAttrs} style="${st};display:flex;gap:14px;justify-content:center;align-items:center">${Object.entries(SOCIAL_SVGS).map(([k, d]) => {
        const url = links[k] || '#';
        const tag = url && url !== '#' && url !== '' ? 'a' : 'span';
        const href = tag === 'a' ? ` href="${url}" target="_blank"` : '';
        return `<${tag}${href} style="display:inline-flex${opacityCss}"><svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" fill="${iconFill}"><path d="${d}"/></svg></${tag}>`;
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
      // Honeypot spam protection (audit C-A-5, 21 May 2026). Hidden
      // input that real users never see or interact with. Position
      // absolute + left:-9999px hides it visually without using
      // display:none (some bots skip display:none fields). aria-hidden
      // + tabindex=-1 keep screen readers and keyboard users from
      // hitting it accidentally. autocomplete=off so password managers
      // don't autofill it for an unlucky user. The funnel-render JS
      // checks the value on submit — if non-empty, the submission is
      // silently dropped (no error to the bot, which discourages retry).
      const honeypot = '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />';
      h += `<form ${elAttrs} style="${st}" onsubmit="return true"${redir}${successMsg}>${honeypot}${formHtml}</form>`;
    } else if (el.type === 'stat' && (el._statValue !== undefined || el._statLabel !== undefined)) {
      // Structured stat (Phase 3 of inspector refactor, audit C-X-4
      // 21 May 2026). Value, label, and accent colour live on the
      // element directly instead of being baked into el.txt. exportHTML
      // renders the HTML from these fields. Legacy stats with content
      // in el.txt fall through to the default branch below and continue
      // to render correctly until re-edited.
      // 22 May 2026 — _statSize, _statLabelColor, _statLabelSize added.
      const sv = esc(el._statValue);
      const sl = esc(el._statLabel);
      const sc = el._statColor || '#0ea5e9';
      const ss = el._statSize || 36;
      const slc = el._statLabelColor || '#64748b';
      const sls = el._statLabelSize || 12;
      h += `<div ${elAttrs} style="${st};display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-family:var(--page-font-heading,Sora,sans-serif);font-size:${ss}px;font-weight:900;color:${sc};line-height:1.1">${sv}</div><div style="font-size:${sls}px;color:${slc};margin-top:4px">${sl}</div></div>`;
    } else if (el.type === 'separator' && (el._separatorSymbol !== undefined)) {
      // Structured separator (Phase 3 inspector refactor, audit C-X-4).
      // The centred symbol and the line colour are first-class fields
      // now; the surrounding lines are pure decoration generated here.
      // 22 May 2026 — _separatorSize and _separatorSymbolColor exposed.
      const sym = esc(el._separatorSymbol);
      const lineCol = el._separatorColor || 'rgba(255,255,255,0.1)';
      const symSize = el._separatorSize || 12;
      const symCol = el._separatorSymbolColor || '#64748b';
      h += `<div ${elAttrs} style="${st};display:flex;align-items:center;gap:16px"><div style="flex:1;height:1px;background:${lineCol}"></div><span style="font-size:${symSize}px;color:${symCol};font-weight:600;white-space:nowrap;line-height:1">${sym}</span><div style="flex:1;height:1px;background:${lineCol}"></div></div>`;
    } else if (el.type === 'icontext' && (el._icon !== undefined || el._iconHeading !== undefined)) {
      // Structured icontext (Phase 3 inspector refactor, audit C-X-4).
      // Icon (typically an emoji), heading, and description are three
      // first-class fields; published HTML is generated from them.
      // 22 May 2026 — _iconSize, _iconHeadingColor, _iconDescColor.
      const ic = esc(el._icon);
      const ih = esc(el._iconHeading);
      const idd = esc(el._iconDescription);
      const iconSize = el._iconSize || 28;
      const hCol = el._iconHeadingColor || '#fff';
      const dCol = el._iconDescColor || '#94a3b8';
      const iconBoxW = Math.max(40, iconSize + 12);
      h += `<div ${elAttrs} style="${st};display:flex;gap:16px;align-items:flex-start"><div style="font-size:${iconSize}px;flex-shrink:0;width:${iconBoxW}px;text-align:center;line-height:1">${ic}</div><div style="flex:1;min-width:0"><div style="font-family:var(--page-font-heading,Sora,sans-serif);font-weight:700;font-size:15px;color:${hCol};margin-bottom:4px">${ih}</div><div style="font-size:13px;color:${dCol};line-height:1.6">${idd}</div></div></div>`;
    } else if (el.type === 'logostrip' && Array.isArray(el._logos)) {
      // Structured logostrip (Phase 3 inspector refactor, audit C-X-4
      // and C-L-2). Header label + array of {text, img} entries.
      // For each logo: if img is set, render an <img>; otherwise
      // render the text. Members can mix-and-match — some logos as
      // text, some as image — to handle "still designing my partner's
      // logo" cases gracefully.
      // 22 May 2026 — _logoStyle ('mono' | 'colour'), _logoHeaderColor,
      // _logoTextColor. Default 'mono' keeps the pre-change greyscale
      // + 0.6 opacity look.
      const header = esc(el._logoHeader);
      const headerCol = el._logoHeaderColor || '#475569';
      const textCol = el._logoTextColor || '#64748b';
      const lstyle = el._logoStyle || 'mono';
      const imgCss = lstyle === 'colour'
        ? 'opacity:1;filter:none'
        : 'opacity:.6;filter:grayscale(1)';
      const textOpacity = lstyle === 'colour' ? 1 : 0.6;
      const headerHtml = header
        ? `<span style="font-size:11px;color:${headerCol};font-weight:700;text-transform:uppercase;letter-spacing:1px">${header}</span>`
        : '';
      const logosHtml = el._logos.map(l => {
        if (l && l.img) {
          // Allow only http(s):// or relative URLs as logo image sources.
          // Reject javascript:/data: URIs to keep this consistent with
          // the embed sanitiser policy (audit C-L-6).
          const safe = /^(https?:\/\/|\/)/i.test(String(l.img || ''));
          if (safe) {
            const alt = esc(l.text || 'Logo');
            return `<img src="${esc(l.img)}" alt="${alt}" loading="lazy" style="height:24px;max-width:120px;width:auto;object-fit:contain;${imgCss}" />`;
          }
        }
        // Fallback: text label
        const t = esc(l && l.text);
        return t ? `<span style="font-size:14px;color:${textCol};font-weight:600;opacity:${textOpacity}">${t}</span>` : '';
      }).filter(Boolean).join('');
      h += `<div ${elAttrs} style="${st};display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap">${headerHtml}${logosHtml}</div>`;
    } else if (el.type === 'faq' && (el._faqQuestion !== undefined || el._faqAnswer !== undefined)) {
      // Structured FAQ (Phase 3 inspector refactor, audit C-X-4).
      // Question and answer are separate fields; HTML is generated
      // with the same class hooks (.sp-faq-item, .sp-faq-q, .sp-faq-a,
      // .sp-faq-toggle) so the click-to-expand JS from audit C-C-3
      // continues to work without modification.
      // 22 May 2026 — _faqQColor, _faqAColor, _faqCardStyle added.
      const q = esc(el._faqQuestion);
      const a = esc(el._faqAnswer);
      const qCol = el._faqQColor || '#fff';
      const aCol = el._faqAColor || '#94a3b8';
      const cardStyle = el._faqCardStyle || 'dark';
      const cardCss = cardStyle === 'light'
        ? 'background:#f8fafc;border:1px solid #e2e8f0'
        : cardStyle === 'minimal'
          ? 'background:transparent;border:none'
          : 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)';
      h += `<div ${elAttrs} style="${st}"><div class="sp-faq-item"><div class="sp-faq-q" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;${cardCss};border-radius:12px;cursor:pointer;user-select:none"><span style="font-family:var(--page-font-heading,Sora,sans-serif);font-weight:700;font-size:15px;color:${qCol}">${q}</span><span class="sp-faq-toggle" style="color:#64748b;font-size:22px;line-height:1;transition:transform .2s">+</span></div><div class="sp-faq-a" style="padding:12px 18px;font-size:14px;color:${aCol};line-height:1.7;margin-top:4px">${a}</div></div></div>`;
    } else if ((el.type === 'review' || el.type === 'testimonial') && (el._rating !== undefined || el._quote !== undefined || el._author !== undefined)) {
      // Structured review/testimonial (Phase 3 inspector refactor,
      // audit C-X-4 + C-C-1). Three fields: rating (1-5), quote, author.
      // Star characters are generated from the rating number — members
      // never have to type ★ by hand.
      // Both review and testimonial share the render; they differ only
      // in their default container styles which are already in el.s.
      // 22 May 2026 — _starColor, _starSize, _quoteColor, _authorColor.
      const r = Math.max(1, Math.min(5, parseInt(el._rating, 10) || 5));
      const stars = '★'.repeat(r) + '☆'.repeat(5 - r);
      const q = esc(el._quote);
      const a = esc(el._author);
      const starCol = el._starColor || '#fbbf24';
      const starSize = el._starSize || 16;
      const qCol = el._quoteColor || '#e2e8f0';
      const aCol = el._authorColor || '#64748b';
      h += `<div ${elAttrs} style="${st}"><div style="margin-bottom:8px"><span style="color:${starCol};letter-spacing:2px;font-size:${starSize}px;line-height:1">${stars}</span></div><div style="font-size:15px;color:${qCol};line-height:1.7;font-style:italic">${q ? '&ldquo;' + q + '&rdquo;' : ''}</div>${a ? `<div style="font-size:13px;color:${aCol};font-weight:600;margin-top:8px">&mdash; ${a}</div>` : ''}</div>`;
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

  // ── YouTube facade click-to-play (20 May 2026) ──
  // When _ytFacade is on, the exporter emits a <div data-sp-facade="<embed-url>">
  // instead of an iframe. This script wires the click that swaps it for
  // the real iframe with autoplay. The visitor sees no YouTube branding
  // until they engage; the iframe (and ~600KB of YouTube player JS) is
  // never loaded otherwise.
  //
  // Plain DOM, no dependencies — matches the dismissible-banner pattern.
  h += `<script>(function(){try{var els=document.querySelectorAll('[data-sp-facade]');for(var i=0;i<els.length;i++){(function(el){el.addEventListener('click',function(){var src=el.getAttribute('data-sp-facade');if(!src)return;var ifr=document.createElement('iframe');ifr.src=src;ifr.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');ifr.setAttribute('allowfullscreen','');ifr.style.cssText='width:100%;height:100%;border:none;border-radius:12px;position:absolute;inset:0';el.innerHTML='';el.style.cursor='default';el.appendChild(ifr);});})(els[i]);}}catch(e){}})();</script>`;

  // ── FAQ click-to-expand (21 May 2026, audit C-C-3) ──
  // Default FAQ markup carries an .sp-faq-q row and an .sp-faq-a answer
  // block. We start answers collapsed (height 0, overflow hidden), wire
  // a click on the question row to toggle, and swap the +/− indicator.
  // Same plain-DOM, no-deps pattern as the facade and banner scripts.
  // Lives in a single conditional script + style block so the cost is
  // ~400 bytes on pages with no FAQ — acceptable always-on tax for the
  // simplicity of not having to detect FAQ presence at build time.
  h += `<style>.sp-faq-a{max-height:0;overflow:hidden;opacity:0;transition:max-height .35s ease,opacity .25s ease,margin-top .25s ease;margin-top:0!important}.sp-faq-item.sp-faq-open .sp-faq-a{max-height:600px;opacity:1;margin-top:4px!important}.sp-faq-item.sp-faq-open .sp-faq-toggle{transform:rotate(45deg)}</style>`;
  h += `<script>(function(){try{var rows=document.querySelectorAll('.sp-faq .sp-faq-q,.sp-faq-q');for(var i=0;i<rows.length;i++){(function(r){r.addEventListener('click',function(){var item=r.closest('.sp-faq-item')||r.parentNode;if(!item)return;item.classList.toggle('sp-faq-open');});})(rows[i]);}}catch(e){}})();</script>`;

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

  // Custom body script — runs at the end of the page, after all
  // elements + responsive CSS are emitted. Industry-standard
  // position for chat widgets, lazy-loaded scripts, etc.
  if (customBody) h += customBody;

  return h;
}
