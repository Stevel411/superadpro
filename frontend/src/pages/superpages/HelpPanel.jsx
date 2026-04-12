import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';

const HELP_SECTIONS = [
  {
    category: 'Getting Started',
    color: 'var(--sap-accent)',
    items: [
      { title: 'How the Editor Works', desc: 'SuperPages is a free-form drag-and-drop page builder. Click any block from the right panel to add it to your canvas, then drag to position it anywhere. Double-click text elements to edit inline. Use the floating toolbar to format text, change fonts, colours and alignment.' },
      { title: 'Selecting & Moving', desc: 'Click any element once to select it — you\'ll see a blue outline and resize handles appear. Click and drag to reposition. Hold Shift + Arrow keys to nudge by 10px, or Arrow keys alone for 1px precision.' },
      { title: 'Resizing', desc: 'Selected elements show 8 cyan resize handles — on all four corners and four edges. Drag any handle to resize. Corner handles resize in both directions simultaneously. Minimum size is 40px wide by 20px tall.' },
      { title: 'Saving & Publishing', desc: 'Click Save to save your work (auto-saves every 30 seconds). Click Publish to make your page live on the web. Your live URL appears in Settings. Toggle back to Draft to unpublish.' },
      { title: 'Keyboard Shortcuts', desc: 'Ctrl+S: Save | Ctrl+Z: Undo | Ctrl+Y: Redo | Delete/Backspace: Remove selected element | Arrow keys: Nudge 1px | Shift+Arrows: Nudge 10px | Escape: Deselect' },
    ],
  },
  {
    category: 'Text Elements',
    color: 'var(--sap-accent)',
    items: [
      { title: 'Heading', desc: 'Large, bold text for page titles and section headers. Default is 36px Sora font in white. Double-click to edit text. Use the floating toolbar to change font family, size, colour, bold, italic, underline, and alignment.' },
      { title: 'Text', desc: 'Body text for paragraphs and descriptions. Default is 15px Outfit font in grey with 1.8 line height for readability. Double-click to edit. Supports all inline formatting from the floating toolbar.' },
      { title: 'Label', desc: 'Small badge-style text perfect for tags like "PREMIUM", "NEW", or "LIMITED OFFER". Comes with a rounded pill background and border. Double-click to change the label text.' },
    ],
  },
  {
    category: 'Media Elements',
    color: 'var(--sap-purple)',
    items: [
      { title: 'Image', desc: 'Add images to your page. Click the ✎ IMAGE button in the element toolbar to enter an image URL or upload a file (max 5MB). Supports JPG, PNG, GIF and WebP. Images are stored on Cloudflare R2 for fast global delivery.' },
      { title: 'Video', desc: 'Embed videos from YouTube, Vimeo, or upload your own MP4/WebM files (max 50MB). Click ✎ VIDEO to add. YouTube and Vimeo watch URLs are automatically converted to embed format. Uploaded videos are hosted on Cloudflare R2.' },
      { title: 'Audio', desc: 'Add audio players to your page. Click ✎ AUDIO to enter an audio URL or upload MP3/WAV/OGG files (max 20MB). Great for podcasts, music samples, or audio testimonials.' },
    ],
  },
  {
    category: 'Action Elements',
    color: 'var(--sap-green-mid)',
    items: [
      { title: 'Button', desc: 'Clickable button with gradient background. Click ✎ LINK to set the destination URL. Double-click to change the button text. Perfect for "Join Now", "Buy Now", or "Learn More" calls to action.' },
      { title: 'Opt-In Form', desc: 'Email capture form with name field, email field, and submit button. Pre-styled with a dark glass background. Click ✎ FORM to customise the HTML. Connected to your My Leads dashboard for lead collection.' },
      { title: 'CTA (Call to Action)', desc: 'Similar to Button but styled specifically for primary conversion actions. Click ✎ LINK to set the destination URL. Double-click to edit the text. Use for your main page action like "Get Started Now →".' },
    ],
  },
  {
    category: 'Content Elements',
    color: 'var(--sap-amber)',
    items: [
      { title: 'Review', desc: 'Customer review block with star rating, quote text, and attribution. Styled with a dark card background and cyan left border. Double-click to edit the review content, stars, and customer name.' },
      { title: 'Badge', desc: 'Small decorative badge identical to Label — useful for "BEST VALUE", "MOST POPULAR", or "FEATURED" tags. Has a gold pill style by default.' },
      { title: 'Testimonial', desc: 'Extended testimonial block with stars, longer quote, and author credit. Features a gold left border to distinguish from reviews. Double-click to customise the testimonial text and attribution.' },
      { title: 'FAQ', desc: 'Question and answer block styled with a subtle bordered header. Double-click to edit the question and answer text. Stack multiple FAQ elements to build a full FAQ section.' },
      { title: 'Stat', desc: 'Large statistic display — shows a big number (like "95%") with a label underneath. Perfect for social proof: "10,000+ Members", "95% Payout Rate", "$1M+ Paid Out". Double-click to edit.' },
      { title: 'Progress', desc: 'Animated progress bar with label and percentage. Click ✎ SET to configure the label text, percentage (0-100), and bar colour. Great for showing course completion, funding goals, or limited availability.' },
    ],
  },
  {
    category: 'Layout Elements',
    color: 'var(--sap-pink)',
    items: [
      { title: 'Countdown', desc: 'Live countdown timer that ticks down to a target date and time. Click ✎ SET to choose the target date. Displays days, hours, minutes and seconds. Creates urgency for launches, sales deadlines, or event dates.' },
      { title: 'Socials', desc: 'Row of social media icons — YouTube, Instagram, TikTok, Facebook, X/Twitter, and LinkedIn. Click ✎ LINKS to add your profile URLs for each platform. Icons link to your social profiles on the published page.' },
      { title: 'Icon + Text', desc: 'Feature block combining an emoji/icon with a heading and description text. Perfect for listing benefits, features, or steps. Double-click to edit the emoji, heading, and description.' },
      { title: 'Separator', desc: 'Decorative divider line with optional centre text (default: ★ ★ ★). Double-click to change the separator text. Use between sections to create visual breaks.' },
      { title: 'Logos', desc: '"As seen in" logo strip — displays brand names in a horizontal row. Double-click to edit the brand names. Use to show media mentions, partner logos, or trust signals.' },
      { title: 'Spacer', desc: 'Invisible spacing element. Drag to position and resize to control the gap between other elements. Has no visual appearance on the published page — purely for layout control.' },
      { title: 'Box', desc: 'Empty container with a subtle border and rounded corners. Use as a background card behind other elements to create grouped sections. Resize and layer behind text, images, or forms.' },
      { title: 'Divider', desc: 'Simple horizontal line. Use to separate sections on your page. Resize the width to control how far it spans across the canvas.' },
      { title: 'Embed', desc: 'Raw HTML/code embed block. Click ✎ CODE to paste any HTML, including iframes, custom widgets, tracking pixels, or third-party embed codes. The code renders on the published page.' },
    ],
  },
  {
    category: 'Settings & Publishing',
    color: 'var(--sap-green)',
    items: [
      { title: 'Page Title', desc: 'The name of your page — appears in the browser tab, search engine results, and your SuperPages listing. Choose something descriptive and compelling for SEO.' },
      { title: 'Page URL Slug', desc: 'Customise the web address of your published page. Open Settings, find the Page URL Slug field, and type your preferred name using lowercase letters, numbers, and hyphens only. For example, type "free-marketing-tools" to get a URL like superadpro.com/p/yourname/free-marketing-tools. Click Save Settings to apply the change. Each slug must be unique — you cannot use one that is already taken by another page.' },
      { title: 'Meta Description', desc: 'The description that appears below your page title in Google search results. Write 150-160 characters that tell visitors what your page offers. Important for click-through rates from search.' },
      { title: 'Social Share Image (OG Image)', desc: 'When someone shares your published page on Facebook, Twitter, LinkedIn, or WhatsApp, this image appears as the preview thumbnail. Upload or enter the URL of a 1200×630px image for best results.' },
      { title: 'Page Status', desc: 'Draft pages are only visible to you. Published pages are live on the web at your Live URL. Toggle between Draft and Published at any time. Unpublishing a page makes it immediately inaccessible to visitors.' },
      { title: 'Canvas Background', desc: 'Change the page background using the colour picker or image upload in the top-right of the Blocks panel. Supports solid colours, gradients, and full-page background images uploaded to Cloudflare R2.' },
    ],
  },
  {
    category: 'AI Assistant',
    color: 'var(--sap-indigo)',
    items: [
      { title: 'AI Chat', desc: 'Click "✨ AI Assistant" at the bottom of the Blocks panel to open the AI chat. Tell it what you want: "add a heading", "change background to navy", "write sales copy for a fitness product". The AI can modify your page style and generate content suggestions.' },
    ],
  },
];

export default function HelpPanel({ visible, onClose }) {
  var { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  // Reset everything when panel opens
  useEffect(() => {
    if (visible) { setExpanded({}); setSearch(''); }
  }, [visible]);

  if (!visible) return null;

  const toggle = (idx) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const q = search.toLowerCase().trim();
  const filtered = HELP_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      !q || item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    ),
  })).filter(section => section.items.length > 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: 420, maxWidth: '90vw', height: '100vh',
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{t('superPagesEditor.knowledgeBase')}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--sap-text-faint)' }}>{t('superPagesEditor.learnElements')}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'var(--sap-bg-page)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--sap-text-muted)" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--sap-text-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('superPagesEditor.searchPlaceholder')}
              style={{ width: '100%', padding: '10px 12px 10px 34px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.map((section, si) => (
            <div key={si}>
              <div
                onClick={() => toggle(si)}
                style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
              >
                {expanded[si] || q ? <ChevronDown size={14} color={section.color} /> : <ChevronRight size={14} color={section.color} />}
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: section.color }}>{section.category}</span>
                <span style={{ fontSize: 10, color: 'var(--sap-text-ghost)', fontWeight: 600 }}>({section.items.length})</span>
              </div>
              {(expanded[si] || q) && section.items.map((item, ii) => (
                <div key={ii} style={{ padding: '10px 20px 10px 40px', borderBottom: '1px solid #f8f9fb' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--sap-text-muted)', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-text-faint)', fontSize: 13 }}>
              No results for "{search}"
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
