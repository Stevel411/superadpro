/**
 * blogBlocks.js — custom TipTap nodes that take the blog editor from "rich text"
 * to Ghost-grade content blocks: Callout (info/tip/warning/success), VideoEmbed
 * (YouTube / Vimeo, privacy-friendly nocookie), and CtaButton.
 *
 * Each node round-trips cleanly: renderHTML emits the exact class-tagged markup
 * the server renderer styles (.bn-callout / .bn-embed / .bn-btn), and parseHTML
 * recognises it on reload so saved posts re-open with their blocks intact. The
 * server sanitiser (blog_render.sanitize_html) allowlists this same markup and
 * domain-restricts iframes, so nothing here can smuggle script through.
 */
import { Node, mergeAttributes } from '@tiptap/core';

const CALLOUT_TYPES = ['info', 'tip', 'warning', 'success'];

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (el) => {
          const t = el.getAttribute('data-type') || 'info';
          return CALLOUT_TYPES.includes(t) ? t : 'info';
        },
        renderHTML: (attrs) => ({ 'data-type': attrs.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.bn-callout' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'bn-callout' }), 0];
  },

  addCommands() {
    return {
      toggleCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.toggleWrap('callout', attrs),
      setCalloutType:
        (type) =>
        ({ commands }) =>
          commands.updateAttributes('callout', { type }),
    };
  },
});

/** Map a pasted YouTube/Vimeo URL to a safe embeddable iframe src, or null. */
export function toEmbedUrl(raw) {
  const u = (raw || '').trim();
  if (!u) return null;
  let m = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      // Size preset (normal/wide/full) + alignment (left/center/right), stored
      // as data-w / data-align on the wrapper div so the SAME CSS lays the video
      // out identically in the editor, the live preview, and the public post.
      // 'normal'/'center' render nothing extra, keeping existing embeds clean.
      dataW: {
        default: 'normal',
        parseHTML: (el) => el.getAttribute('data-w') || 'normal',
        renderHTML: (attrs) => (attrs.dataW && attrs.dataW !== 'normal') ? { 'data-w': attrs.dataW } : {},
      },
      dataAlign: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => (attrs.dataAlign && attrs.dataAlign !== 'center') ? { 'data-align': attrs.dataAlign } : {},
      },
      dataScale: {
        default: 'md',
        parseHTML: (el) => el.getAttribute('data-scale') || 'md',
        renderHTML: (attrs) => (attrs.dataScale && attrs.dataScale !== 'md') ? { 'data-scale': attrs.dataScale } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.bn-embed',
        getAttrs: (el) => {
          const ifr = el.querySelector('iframe');
          return { src: ifr ? ifr.getAttribute('src') : null };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const wrap = { class: 'bn-embed' };
    const w = node.attrs.dataW, a = node.attrs.dataAlign, s = node.attrs.dataScale;
    if (w && w !== 'normal') wrap['data-w'] = w;
    if (a && a !== 'center') wrap['data-align'] = a;
    if (s && s !== 'md') wrap['data-scale'] = s;
    return [
      'div',
      wrap,
      [
        'iframe',
        {
          src: node.attrs.src || '',
          frameborder: '0',
          allowfullscreen: 'true',
          loading: 'lazy',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (src) =>
        ({ commands }) =>
          commands.insertContent({ type: 'videoEmbed', attrs: { src } }),
    };
  },
});

export const CtaButton = Node.create({
  name: 'ctaButton',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: '#' },
      label: { default: 'Learn more' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.bn-btn-wrap',
        getAttrs: (el) => {
          const a = el.querySelector('a');
          return {
            href: a ? a.getAttribute('href') : '#',
            label: a ? (a.textContent || 'Learn more') : 'Learn more',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'bn-btn-wrap' },
      [
        'a',
        {
          class: 'bn-btn',
          href: HTMLAttributes.href || '#',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        HTMLAttributes.label || 'Learn more',
      ],
    ];
  },

  addCommands() {
    return {
      setCtaButton:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: 'ctaButton', attrs }),
    };
  },
});
