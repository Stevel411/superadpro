// ─── SuperPages template registry ────────────────────────────────────
// Shared metadata for the 9 templates available on /pro/funnels/new
// (3×3 grid + Blank Canvas). Both Funnels.jsx (dashboard) and
// FunnelsNew.jsx (create page) import this so the list stays in
// one place — adding a template means editing only this file.
//
// Coaching Program was removed from the create-page UI on 18 May 2026
// (too niche-specific). The backend builder still supports it for
// backward compatibility with any existing pages built from it.
//
// Each template defines:
//   key        — the niche string passed to /api/funnels/from-template
//   title      — display name (English; i18n key derived as `tpl.<key>`
//                if needed later)
//   desc       — one-line description shown beneath the title
//   icon       — Lucide icon component to render in the tile preview
//   gradient   — CSS background string for the tile cover (all use
//                shades inside the cobalt-to-cyan brand spectrum:
//                cobalt #0a1438, royal #1e3a8a, sky #0ea5e9, cyan
//                #06b6d4, electric #22d3ee, teal #0e7490)
//   listName   — pre-filled suggestion in the campaign-setup modal's
//                auto-create list input

import {
  Mail, PlayCircle, ShoppingBag, Radio, Briefcase,
  Download, Link2, CheckCircle2, Plus,
} from 'lucide-react';
import LeadMagnetPreview from '../components/templatePreviews/LeadMagnetPreview';

export const TEMPLATES = [
  {
    key: 'lead-capture',
    title: 'Lead capture',
    desc: 'Opt-in page with email form and value hook',
    icon: Mail,
    gradient: 'linear-gradient(135deg,#22d3ee 0%,#06b6d4 100%)',
    listName: 'Lead capture leads',
  },
  {
    key: 'lead-magnet',
    title: 'Lead magnet',
    desc: 'Polished free-guide opt-in — workhorse for any niche',
    icon: Download,
    gradient: 'linear-gradient(135deg,#0a1438 0%,#0ea5e9 100%)',
    listName: 'Lead magnet subscribers',
    preview: LeadMagnetPreview,  // visual preview component (28 May 2026)
  },
  {
    key: 'video-sales',
    title: 'Video sales letter',
    desc: 'Long-form video with CTA below',
    icon: PlayCircle,
    gradient: 'linear-gradient(135deg,#1e3a8a 0%,#0a1438 100%)',
    listName: 'Video sales leads',
  },
  {
    key: 'product-offer',
    title: 'Product offer',
    desc: 'Direct-response page with offer + scarcity',
    icon: ShoppingBag,
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#1e3a8a 100%)',
    listName: 'Product offer leads',
  },
  {
    key: 'webinar-registration',
    title: 'Webinar signup',
    desc: 'Event registration with urgency',
    icon: Radio,
    gradient: 'linear-gradient(135deg,#0e7490 0%,#1e3a8a 100%)',
    listName: 'Webinar registrants',
  },
  {
    key: 'network-opportunity',
    title: 'Business opportunity',
    desc: 'Bridge page for MLM / affiliate income offers',
    icon: Briefcase,
    gradient: 'linear-gradient(135deg,#0a1438 0%,#06b6d4 100%)',
    listName: 'Business opportunity leads',
  },
  {
    key: 'digital-product',
    title: 'Digital product',
    desc: 'eBook, course, or download landing page',
    icon: Download,
    gradient: 'linear-gradient(135deg,#06b6d4 0%,#0a1438 100%)',
    listName: 'Digital product leads',
  },
  {
    key: 'affiliate-income',
    title: 'Affiliate funnel',
    desc: 'Pre-sell page that bridges to an offer',
    icon: Link2,
    gradient: 'linear-gradient(135deg,#1e3a8a 0%,#22d3ee 100%)',
    listName: 'Affiliate funnel leads',
  },
  {
    key: 'thank-you',
    title: 'Thank you page',
    desc: 'Post-signup confirmation with next step',
    icon: CheckCircle2,
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#22d3ee 100%)',
    listName: 'Thank you leads',
  },
];

// The Blank Canvas tile is special — dashed border, no gradient, sits
// in the 9th slot of the 3×3 grid as the "start from scratch" option.
export const BLANK_CANVAS = {
  key: 'blank',
  title: 'Blank canvas',
  desc: 'Start from scratch — full control',
  icon: Plus,
  listName: 'New page leads',
};
