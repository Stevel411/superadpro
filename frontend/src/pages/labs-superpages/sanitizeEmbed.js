/**
 * sanitizeEmbed.js — small embed HTML sanitiser for SuperPages
 * ═════════════════════════════════════════════════════════════════════
 *
 * Members paste arbitrary HTML into the "Embed" element (`_embedCode`).
 * Without sanitisation, anyone visiting the published page would
 * execute whatever script the author pasted — a real XSS risk once
 * we have many members + ad traffic landing on their pages.
 *
 * Audit item C-L-6 (21 May 2026 element audit).
 *
 * Approach: strict allow-list, not deny-list. We KNOW the common
 * legitimate embeds (YouTube/Vimeo iframes, Calendly, Twitter widget,
 * Substack signup, basic structural HTML). Anything outside that
 * surface gets stripped.
 *
 * Decisions:
 *   • Drop ALL <script> blocks. Period. Almost every legitimate embed
 *     can be expressed as an <iframe>; scripts are the high-risk
 *     element and the rare scripts that ARE legit (third-party
 *     widget loaders) we'd want to ship as a built-in widget anyway,
 *     not paste-driven.
 *   • Keep <iframe> only when src points to a known provider domain.
 *   • Keep structural tags (div, p, span, h1-h6, ul/ol/li, a, img, br)
 *     with safe attributes.
 *   • Strip event handlers (onclick, onerror, onload, onmouseover, etc).
 *   • Strip dangerous URL schemes (javascript:, data:, vbscript:) on
 *     href / src.
 *   • Run on Canvas preview AND on exportHTML, so both editor and
 *     published page are protected.
 *
 * Not using DOMPurify: too heavy for the limited surface we cover,
 * and adds a third-party dep we'd then need to track. ~80 lines of
 * focused code is cheaper than 60 KB of generic library.
 */

// Iframe src must match one of these host patterns. Anything else
// gets the iframe stripped. Add new providers as members ask.
const ALLOWED_IFRAME_HOSTS = [
  /^https?:\/\/(www\.)?youtube(-nocookie)?\.com\//i,
  /^https?:\/\/(www\.)?youtu\.be\//i,
  /^https?:\/\/(www\.)?vimeo\.com\//i,
  /^https?:\/\/player\.vimeo\.com\//i,
  /^https?:\/\/(www\.)?calendly\.com\//i,
  /^https?:\/\/calendar\.google\.com\//i,
  /^https?:\/\/(platform|publish)\.twitter\.com\//i,
  /^https?:\/\/(www\.)?facebook\.com\/plugins\//i,
  /^https?:\/\/(www\.)?instagram\.com\/p\//i,
  /^https?:\/\/(www\.)?tiktok\.com\/embed\//i,
  /^https?:\/\/(www\.)?spotify\.com\/embed\//i,
  /^https?:\/\/open\.spotify\.com\/embed\//i,
  /^https?:\/\/(www\.)?soundcloud\.com\/player\//i,
  /^https?:\/\/w\.soundcloud\.com\//i,
  /^https?:\/\/[a-z0-9-]+\.substack\.com\/embed/i,
  /^https?:\/\/(www\.)?typeform\.com\/to\//i,
  /^https?:\/\/[a-z0-9-]+\.typeform\.com\/to\//i,
  /^https?:\/\/docs\.google\.com\/(forms|presentation|document|spreadsheets)\//i,
  /^https?:\/\/[a-z0-9-]+\.airtable\.com\/embed\//i,
];

// Tags we keep. Anything not in this list gets removed (including its
// inner content for risky tags, but inner-text-only for structural).
const SAFE_TAGS = new Set([
  'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u',
  'a', 'img', 'iframe',
  'blockquote', 'code', 'pre',
]);

// Attributes we keep PER TAG. Everything else stripped silently.
const SAFE_ATTRS = {
  '*':       ['class', 'style', 'id'],
  'a':       ['href', 'target', 'rel'],
  'img':     ['src', 'alt', 'width', 'height', 'loading'],
  'iframe':  ['src', 'width', 'height', 'allowfullscreen', 'allow', 'frameborder', 'title'],
};

// URL schemes we allow on href / src. Anything else replaced with '#'.
const SAFE_URL_RE = /^(https?:\/\/|mailto:|tel:|#|\/)/i;

// Hard-block URL schemes — explicit deny on top of the allow-list
// so any sneaky encoding still gets caught.
const BLOCKED_URL_RE = /^\s*(javascript|data|vbscript|file):/i;

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (BLOCKED_URL_RE.test(trimmed)) return '#';
  if (!SAFE_URL_RE.test(trimmed)) return '#';
  return trimmed;
}

function isIframeSrcAllowed(src) {
  if (!src) return false;
  const trimmed = String(src).trim();
  if (BLOCKED_URL_RE.test(trimmed)) return false;
  return ALLOWED_IFRAME_HOSTS.some((re) => re.test(trimmed));
}

/**
 * Walk a DOM node tree, sanitise in place, return the modified root.
 * Operates on a document fragment so we don't pollute the host document.
 */
function sanitizeNode(node) {
  // Element: check tag, then attrs, then recurse children
  if (node.nodeType === 1) { // ELEMENT_NODE
    const tag = node.tagName.toLowerCase();

    // Tag not in safe list — strip the element but keep its text content
    // (so legitimate copy inside a stripped tag isn't lost).
    if (!SAFE_TAGS.has(tag)) {
      const parent = node.parentNode;
      if (!parent) return;
      // For high-risk tags, drop entire subtree
      if (['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta'].includes(tag)) {
        parent.removeChild(node);
        return;
      }
      // For unknown/safe-ish tags, unwrap: move children up to parent
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      parent.removeChild(node);
      return;
    }

    // Iframe needs its src checked against the host allow-list
    if (tag === 'iframe') {
      const src = node.getAttribute('src') || '';
      if (!isIframeSrcAllowed(src)) {
        node.parentNode && node.parentNode.removeChild(node);
        return;
      }
    }

    // Attribute pass — strip everything not in SAFE_ATTRS for this tag
    const allowedForTag = SAFE_ATTRS[tag] || [];
    const universal = SAFE_ATTRS['*'] || [];
    const allowed = new Set([...allowedForTag, ...universal]);

    // Iterate a static copy because removeAttribute mutates the live list
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();

      // Always strip on* event handlers, regardless of tag
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        continue;
      }

      // Strip anything not whitelisted for this tag
      if (!allowed.has(name)) {
        node.removeAttribute(attr.name);
        continue;
      }

      // For URL-bearing attrs, sanitise the URL
      if (name === 'href' || name === 'src') {
        const original = attr.value;
        if (name === 'src' && tag === 'iframe') {
          // iframe src already checked via isIframeSrcAllowed above
          continue;
        }
        const safe = sanitizeUrl(original);
        if (safe !== original) {
          node.setAttribute(attr.name, safe);
        }
      }

      // For style attribute, strip any url(...) refs and expression(...)
      // to prevent CSS-based exfil / IE-style script execution
      if (name === 'style') {
        const cleaned = String(attr.value)
          .replace(/expression\s*\(/gi, '')
          .replace(/url\s*\(\s*['"]?\s*(javascript|data|vbscript):/gi, 'url(#:')
          .replace(/@import/gi, '');
        if (cleaned !== attr.value) {
          node.setAttribute('style', cleaned);
        }
      }
    }

    // Recurse children (work on a snapshot — sanitiseNode mutates)
    const kids = Array.from(node.childNodes);
    for (const kid of kids) sanitizeNode(kid);
  }
  // Comments — strip them (could contain conditional IE scripts etc)
  else if (node.nodeType === 8) { // COMMENT_NODE
    node.parentNode && node.parentNode.removeChild(node);
  }
  // Text nodes pass through unchanged
}

/**
 * Sanitise an embed-HTML string. Returns a safe string ready to render
 * via dangerouslySetInnerHTML or inline in exported HTML.
 *
 * If anything goes wrong, returns empty string — fail closed.
 */
export default function sanitizeEmbed(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  // SSR safety — no DOMParser available server-side. Skip sanitisation
  // there and rely on the next client render to clean it up before
  // anyone actually sees the page.
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return '';
  }
  try {
    // Parse as document fragment so we get proper DOM but no full document
    const parser = new DOMParser();
    // Wrap in a div so we can extract sanitised innerHTML afterwards
    const doc = parser.parseFromString('<div id="__sanitize_root__">' + rawHtml + '</div>', 'text/html');
    const root = doc.getElementById('__sanitize_root__');
    if (!root) return '';
    // Recurse and sanitise
    const kids = Array.from(root.childNodes);
    for (const kid of kids) sanitizeNode(kid);
    return root.innerHTML;
  } catch (e) {
    // Parse failed — fail closed
    return '';
  }
}
