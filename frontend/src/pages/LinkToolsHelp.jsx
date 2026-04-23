import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';

var HELP_SECTIONS = [
  {
    category: 'Getting Started',
    color: 'var(--sap-accent)',
    items: [
      { title: 'What are Link Tools?', desc: 'Link Tools is your all-in-one URL management toolkit. Create short links that are easy to share, split-test traffic with rotators, track every click with detailed analytics, generate QR codes, and build UTM-tagged campaign URLs — all from one page.' },
      { title: 'Creating a Short Link', desc: 'Click the blue "New Short Link" button. Paste your destination URL, optionally set a custom slug (e.g. /go/my-offer), add a title for your reference, and hit Create. Your shortened link is ready to copy and share immediately.' },
      { title: 'Where Do Links Redirect?', desc: 'All short links use the format yoursite.com/go/slug. When someone clicks the link, they\'re instantly redirected to your destination URL. Every click is tracked with source, device, country, and browser data.' },
      { title: 'Link Cards Explained', desc: 'Each link card shows: the short URL (cyan text), the destination URL underneath, click count on the right, and an action bar with Copy, Analytics, Edit, QR, Tags, Open, and Delete buttons. Tags appear as coloured chips below the destination URL.' },
    ],
  },
  {
    category: 'Short Links',
    color: 'var(--sap-accent)',
    items: [
      { title: 'Custom Slugs', desc: 'When creating a link, enter a custom slug like "spring-sale" to get yoursite.com/go/spring-sale instead of a random code. Slugs must be at least 2 characters, use letters, numbers, and hyphens only. Each slug must be unique across all links and rotators.' },
      { title: 'Editing a Link', desc: 'Click the Edit button on any link card to change the destination URL, title, expiration date, click cap, or password. The short URL slug stays the same — only the destination changes. This is useful when campaigns end and you want to redirect traffic elsewhere.' },
      { title: 'Deleting a Link', desc: 'Click the trash icon on a link card. You\'ll see an inline "Delete?" confirmation with Yes/No buttons — no browser popups. Deleting removes the link and all its click data permanently.' },
      { title: 'Copy & Share', desc: 'Click the Copy button to copy the full short URL to your clipboard. Use this in social media posts, emails, ads, or anywhere you share links. The "Open" button opens the redirect in a new tab so you can test it.' },
    ],
  },
  {
    category: 'Link Rotators',
    color: 'var(--sap-purple)',
    items: [
      { title: 'What is a Rotator?', desc: 'A rotator sends traffic to multiple destination URLs from a single short link. Use it to split-test landing pages, distribute traffic across offers, or cycle through different promotions automatically.' },
      { title: 'Rotation Modes', desc: 'Equal Split sends traffic evenly across all URLs. Weighted lets you set percentages (e.g. 70% to page A, 30% to page B). Sequential sends visitors to URLs in order — first visitor gets URL 1, second gets URL 2, and so on.' },
      { title: 'Creating a Rotator', desc: 'Click "New Rotator" (visible when on the Rotators tab). Give it a name and optional custom slug, choose your rotation mode, and add at least 2 destination URLs. For weighted mode, set the percentage weight for each URL.' },
      { title: 'Testing Split Results', desc: 'Create a rotator, share the single link, then use Analytics on each rotator to see total clicks. Compare conversion rates between your different landing pages to find the winner.' },
    ],
  },
  {
    category: 'QR Codes',
    color: 'var(--sap-green-mid)',
    items: [
      { title: 'Generating a QR Code', desc: 'Click the QR button on any link card to open the QR Code generator. A scannable QR code is instantly generated for that link\'s short URL. Scanning the code takes visitors to your redirect, so all clicks are still tracked.' },
      { title: 'Customising Your QR Code', desc: 'Change the size (128px to 1024px) for different uses — small for business cards, large for posters. Pick custom foreground and background colours to match your brand. The QR code updates in real-time as you change settings.' },
      { title: 'Downloading', desc: 'Click "Download PNG" to save the QR code as a high-quality PNG image. The file is named qr-[slug].png automatically. Use it in print materials, flyers, product packaging, presentations, or digital media.' },
      { title: 'Best Practices', desc: 'Use high contrast colours (dark on light) for best scanning reliability. Avoid very small sizes for print — 256px minimum recommended. Test your QR code with your phone camera before distributing. The QR code links to your short URL, so you can change the destination anytime via Edit without reprinting.' },
    ],
  },
  {
    category: 'UTM Builder',
    color: 'var(--sap-amber)',
    items: [
      { title: 'What are UTM Tags?', desc: 'UTM parameters are tags added to the end of a URL that tell analytics tools (Google Analytics, etc.) exactly where traffic came from. They track which campaigns, platforms, and content are driving your clicks and conversions.' },
      { title: 'Using the UTM Builder', desc: 'Click the "UTM Builder" button in the tab bar. Paste your base URL, fill in Source (required), Medium, Campaign, Term, and Content fields. The generated URL appears live below with all parameters appended. Copy it or click "Shorten This" to create a tracked short link.' },
      { title: 'UTM Fields Explained', desc: 'Source: where traffic comes from (facebook, google, newsletter). Medium: the marketing channel (cpc, email, social, banner). Campaign: the specific promotion (spring_sale, product_launch). Term: paid keyword (optional). Content: differentiates similar links (banner_ad vs text_link).' },
      { title: 'Quick Presets', desc: 'Six one-click presets fill in Source, Medium, and Campaign automatically: Facebook Ad, Instagram, Email, Google Ad, YouTube, and TikTok. Click a preset, then adjust the Campaign name to match your actual campaign.' },
      { title: 'Shorten This Button', desc: 'After building your UTM URL, click "Shorten This" to pipe it directly into the Create Short Link modal with the UTM URL pre-filled. This gives you a clean short link that carries all UTM tracking when clicked.' },
    ],
  },
  {
    category: 'Password Protection',
    color: 'var(--sap-red)',
    items: [
      { title: 'Adding a Password', desc: 'When creating a link, expand "Advanced Options" and enter a password. Or click Edit on an existing link and set one there. The password is securely hashed — nobody (including admins) can see the original password.' },
      { title: 'How It Works', desc: 'When someone clicks a password-protected link, instead of redirecting immediately, they see a dark-themed gate page asking for the password. After entering the correct password, they\'re redirected to the destination. Protected links show a lock icon on the card.' },
      { title: 'Removing a Password', desc: 'Open the Edit modal for a protected link. You\'ll see "(currently set)" next to the Password label. Click "Remove password protection" to make the link open freely again. Or enter a new password to change it.' },
      { title: 'Use Cases', desc: 'Protect exclusive content, member-only resources, premium downloads, private event pages, or beta access links. Share the password separately via email, DM, or during a webinar to control who gets access.' },
    ],
  },
  {
    category: 'Expiration & Click Caps',
    color: '#f97316',
    items: [
      { title: 'Setting an Expiration', desc: 'In the Create or Edit modal, use the date/time picker to set when the link should stop working. After the expiry time, visitors see a "This link has expired" message instead of being redirected. Expired links show a red EXPIRED badge and fade to 50% opacity on your dashboard.' },
      { title: 'Click Caps', desc: 'Set a maximum number of clicks in the Create or Edit modal. Once the link reaches that many clicks, it deactivates automatically. Useful for limited offers, giveaways, or controlling access to a specific number of people.' },
      { title: 'Upcoming Expiry', desc: 'Links with a future expiration date show a yellow "EXPIRES [date]" badge on the card so you can see at a glance which links are time-limited. Once expired, the badge turns red.' },
      { title: 'Removing Limits', desc: 'Edit the link and clear the expiration date or click cap field to remove the limit. The link will immediately start working again (unless it was also password-protected or had other restrictions).' },
    ],
  },
  {
    category: 'Tags & Organisation',
    color: 'var(--sap-purple)',
    items: [
      { title: 'Adding Tags', desc: 'Click the Tags button on any link card. Type a tag name and click Add (or press Enter). Choose from 8 colour presets before adding — Blue, Green, Purple, Orange, Pink, Cyan, Red, or Yellow. Tags appear as coloured chips on the link card.' },
      { title: 'Removing Tags', desc: 'In the tag editor, click the X on any tag to remove it. Click Save Tags to confirm your changes.' },
      { title: 'Organisation Tips', desc: 'Use tags to group links by campaign (e.g. "Spring Sale"), platform (e.g. "Facebook", "Email"), client name, or status (e.g. "Active", "Testing"). Consistent tagging makes it easy to visually scan your links and find what you need.' },
    ],
  },
  {
    category: 'Analytics',
    color: 'var(--sap-green-mid)',
    items: [
      { title: 'Viewing Analytics', desc: 'Click the Analytics button on any link or rotator card. A modal opens with full click data: total clicks, mobile vs desktop breakdown, 30-day click timeline chart, traffic source breakdown, and top countries.' },
      { title: 'Traffic Sources', desc: 'Shows where your clicks come from — Facebook, Google, Instagram, X/Twitter, LinkedIn, Reddit, TikTok, YouTube, WhatsApp, email, direct, and other. Sources are detected from the referrer header and UTM parameters.' },
      { title: 'Device Breakdown', desc: 'See how many clicks came from mobile, desktop, and tablet devices. Useful for ensuring your destination pages are mobile-friendly if most traffic is from phones.' },
      { title: 'Click Timeline', desc: 'A 30-day bar chart showing clicks per day. Hover over any bar to see the exact date and click count. Helps you spot traffic spikes, see campaign performance over time, and identify your best-performing days.' },
      { title: 'Country Data', desc: 'See which countries your clicks come from, ranked by volume. Powered by GeoIP lookup on each click. Useful for understanding your audience geography and planning geo-targeted campaigns.' },
    ],
  },
  {
    category: 'Stats Dashboard',
    color: 'var(--sap-text-muted)',
    items: [
      { title: 'Stat Cards', desc: 'The four cards at the top show: total Short Links created, total Rotators, combined Total Clicks across all links and rotators, and number of Password-Protected links. These update every time the page loads.' },
      { title: 'Tips for Growing Clicks', desc: 'Share your short links on social media with compelling calls to action. Use QR codes on physical materials. A/B test landing pages with rotators. Track which UTM campaigns perform best and double down on winners. Use tags to stay organised as your link count grows.' },
    ],
  },
];

export default function LinkToolsHelp({ visible, onClose }) {

  var { t } = useTranslation();
  var _a = useState(''), search = _a[0], setSearch = _a[1];
  var _b = useState({}), expanded = _b[0], setExpanded = _b[1];

  useEffect(function() {
    if (visible) { setExpanded({}); setSearch(''); }
  }, [visible]);

  if (!visible) return null;

  var toggle = function(idx) {
    setExpanded(function(prev) {
      var next = Object.assign({}, prev);
      next[idx] = !next[idx];
      return next;
    });
  };

  var q = search.toLowerCase().trim();
  var filtered = HELP_SECTIONS.map(function(section) {
    return {
      category: section.category,
      color: section.color,
      items: section.items.filter(function(item) {
        return !q || item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      }),
    };
  }).filter(function(section) { return section.items.length > 0; });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      <div style={{
        position: 'relative', width: 420, maxWidth: '90vw', height: '100vh',
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'ltHelpSlide 0.25s ease-out',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{t('linkTools.linkToolsHelp')}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--sap-text-faint)' }}>{t('linkTools.helpDesc')}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'var(--sap-bg-page)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--sap-text-muted)" />
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--sap-text-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={function(e) { setSearch(e.target.value); }}
              placeholder={t('linkTools.searchHelpTopics')}
              style={{ width: '100%', padding: '10px 12px 10px 34px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.map(function(section, si) {
            return (
              <div key={si}>
                <div
                  onClick={function() { toggle(si); }}
                  style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
                >
                  {expanded[si] || q ? <ChevronDown size={14} color={section.color} /> : <ChevronRight size={14} color={section.color} />}
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: section.color }}>{section.category}</span>
                  <span style={{ fontSize: 13, color: 'var(--sap-text-ghost)', fontWeight: 600 }}>({section.items.length})</span>
                </div>
                {(expanded[si] || q) && section.items.map(function(item, ii) {
                  return (
                    <div key={ii} style={{ padding: '10px 20px 10px 40px', borderBottom: '1px solid #f8f9fb' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--sap-text-muted)', lineHeight: 1.7 }}>{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-text-faint)', fontSize: 13 }}>
              No results for "{search}"
            </div>
          )}
        </div>
      </div>

      <style>{'@keyframes ltHelpSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }'}</style>
    </div>
  );
}
