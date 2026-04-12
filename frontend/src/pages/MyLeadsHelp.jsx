import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';

var HELP_SECTIONS = [
  {
    category: 'Getting Started',
    color: 'var(--sap-indigo)',
    items: [
      { title: 'What is SuperLeads?', desc: 'SuperLeads is your built-in CRM and email autoresponder. It lets you capture leads from your SuperPages funnels, organise them into lists, send automatic email sequences, and broadcast one-off emails — all without needing a separate email marketing tool.' },
      { title: 'How do leads get into my CRM?', desc: 'Leads are added automatically when someone fills out a form on any of your SuperPages. Their name and email are captured instantly and appear in your Leads tab. You can also import leads manually using a CSV file via the Import tab.' },
      { title: 'Who can use SuperLeads?', desc: 'SuperLeads is a Pro member feature. You get up to 5,000 leads included with your Pro membership. Need more capacity? You can expand at any time from your account settings.' },
      { title: 'What happens when a lead comes in?', desc: 'When a lead fills out your funnel form, they are added to your CRM, assigned to your most recent active email sequence, and the first email in that sequence is sent immediately via Brevo. Everything is automatic — no manual steps needed.' },
    ],
  },
  {
    category: 'Leads Tab',
    color: 'var(--sap-indigo)',
    items: [
      { title: 'What does the Leads tab show?', desc: 'The Leads tab is your main contact list. It shows every lead you have captured or imported, including their name, email, which list they belong to, their current status, how many emails they have received and opened, and which sequence they are assigned to.' },
      { title: 'Lead Statuses Explained', desc: 'New — just added, no interaction yet. Nurturing — in an active email sequence. Hot — automatically flagged when a lead opens 2+ emails or clicks any link. Converted — manually mark a lead as converted once they have taken the action you wanted (purchased, signed up, etc.).' },
      { title: 'What is a Hot Lead?', desc: 'A Hot Lead is someone showing real interest — they have opened multiple emails or clicked a link. These are your warmest prospects and worth prioritising. Hot leads are automatically flagged with a 🔥 icon and appear when you click the Hot filter.' },
      { title: 'Filtering your leads', desc: 'Use the coloured filter buttons to view leads by status: All, New, Nurturing, Hot, or Converted. Use the "All Lists" dropdown on the right to filter by a specific list. Combine both filters — for example, view only Hot leads from your Facebook list.' },
      { title: 'Assigning a sequence to a lead', desc: 'In the Sequence column next to each lead, use the dropdown to assign or change which email sequence they are in. The next time you click Send Next on that sequence, it will include this lead.' },
      { title: 'Deleting a lead', desc: 'Click the red trash icon on the right of any lead row to delete them. This removes the lead and all their email history permanently. Use with care — this cannot be undone.' },
    ],
  },
  {
    category: 'Lists',
    color: 'var(--sap-accent)',
    items: [
      { title: 'What are Lists?', desc: 'Lists let you organise your leads into groups. For example: "Facebook Leads", "YouTube Traffic", "Webinar Signups", or "VIP Customers". Each list has its own colour so you can spot them instantly in your leads table.' },
      { title: 'Creating a List', desc: 'Click "New List", give it a name, an optional description, choose a colour, and optionally assign a default email sequence. Any lead imported into or captured for this list will automatically be enrolled in that sequence.' },
      { title: 'Default Sequence on a List', desc: 'When you set a default sequence on a list, every new lead added to that list (via form capture or CSV import) is automatically enrolled in that sequence. This saves you from manually assigning sequences to every new lead.' },
      { title: 'What happens if I delete a List?', desc: 'If you delete a list, all leads that were in it are moved to Unsorted rather than being deleted. You can filter for Unsorted leads and reassign them to a new list at any time.' },
      { title: 'Lead count on List cards', desc: 'Each list card shows a lead count so you can see at a glance how many contacts are in each group. The coloured bar at the top of each card matches the colour you chose for that list.' },
    ],
  },
  {
    category: 'Sequences',
    color: 'var(--sap-purple)',
    items: [
      { title: 'What is an Email Sequence?', desc: 'A sequence is a series of emails sent automatically over time. You write them once, set the delay between each email, and the system sends them to your leads on autopilot. Perfect for welcome series, nurture campaigns, or onboarding flows.' },
      { title: 'Creating a Sequence', desc: 'Click "Create Sequence", give it a name, and add your emails. Each email needs a subject line, a body (written with the rich text editor), and a send delay in days. Day 0 sends immediately. Day 3 sends 3 days after the previous email.' },
      { title: 'What does "Send Next" do?', desc: 'Clicking Send Next on a sequence sends the next pending email to every lead assigned to that sequence. The system tracks which email each lead is up to, so each person gets the right email at the right step — nobody gets the same email twice.' },
      { title: 'Send delay explained', desc: 'The delay on each email is the number of days after the previous email was sent. Email 1 at 0 days sends immediately. Email 2 at 2 days sends 2 days after Email 1. Email 3 at 5 days sends 5 days after Email 2. Leads who are not yet due for their next email are skipped.' },
      { title: 'Editing a Sequence', desc: 'Click Edit on any sequence card to change the name, add or remove emails, update subjects and bodies, or adjust delays. Changes apply to future sends — leads who have already received an email will not receive it again.' },
      { title: 'Rich Text Editor', desc: 'The email body editor supports bold, italic, underline, bullet lists, numbered lists, headings, and links. Write your email as you want it to appear. Emails are sent as HTML so formatting is preserved in the inbox.' },
    ],
  },
  {
    category: 'Broadcast',
    color: 'var(--sap-green)',
    items: [
      { title: 'What is a Broadcast?', desc: 'A broadcast is a one-off email sent to all or a filtered group of your leads right now. Unlike sequences (which drip over time), a broadcast goes out immediately to everyone matching your filter. Use it for announcements, promotions, or time-sensitive news.' },
      { title: 'Filtering your broadcast recipients', desc: 'Before sending, choose a List and/or a Status filter. The recipient count updates live so you know exactly how many people will receive the email before you hit Send. For example: send only to Hot leads on your Facebook list.' },
      { title: 'Recipient count', desc: 'The number shown next to the filters is the live count of leads who match your selection and are not unsubscribed. This is the exact number of emails that will be sent when you click Send.' },
      { title: 'Unsubscribed leads', desc: 'Leads who have unsubscribed are automatically excluded from all broadcasts and sequence sends. You do not need to filter them out manually — the system handles this for you to keep you compliant.' },
      { title: 'Broadcast vs Sequence', desc: 'Use a Sequence for planned, evergreen email series (welcome flows, follow-ups). Use a Broadcast for one-time sends to your whole list or a segment — flash sales, webinar invites, product launches, or important updates.' },
    ],
  },
  {
    category: 'Import',
    color: 'var(--sap-amber)',
    items: [
      { title: 'Importing leads via CSV', desc: 'Go to the Import tab, upload a CSV file or paste CSV text directly. Your CSV should have columns for email and optionally name. Click Preview to check the data before importing, then click Import to add the leads to your CRM.' },
      { title: 'CSV format', desc: 'The simplest format is two columns: email and name. For example: email,name on the first row, then john@example.com,John Smith on each subsequent row. The importer is flexible — it will detect the email column automatically even if your headers are different.' },
      { title: 'Assigning to a List on import', desc: 'Before importing, select which list you want to import leads into using the "Into List" dropdown. Choosing a list means all imported leads are immediately organised and can benefit from that list\'s default sequence.' },
      { title: 'Preview before importing', desc: 'Click Preview to see how many leads were detected in your CSV and check for any formatting issues. The count shown is how many leads will actually be imported. Only click Import once you are happy with the preview.' },
      { title: 'Lead limit', desc: 'Your current lead count and limit are shown at the top of the Import tab. Pro members can hold up to 5,000 leads. If you are approaching your limit, purchase an Email Boost pack or contact support to discuss expanding your plan.' },
      { title: 'Duplicate handling', desc: 'If an email address already exists in your CRM, the import will skip that lead rather than creating a duplicate. Your existing lead data (status, sequence assignment, email history) is preserved.' },
    ],
  },
  {
    category: 'Email Boost',
    color: 'var(--sap-red-bright)',
    items: [
      { title: 'What is Email Boost?', desc: 'Email Boost lets you send more emails than your daily free allowance. Every Pro member gets 200 free emails per day. If you need to send more — for a big broadcast or a large sequence — you can purchase Boost Packs that give you extra credits on top of your daily allowance.' },
      { title: 'How the daily limit works', desc: 'You get 200 free emails every day. The counter resets at midnight UTC. If you send a broadcast to 150 leads and have 3 sequences going, your free 200 emails are used up first. Once they run out, Boost credits kick in automatically.' },
      { title: 'Boost Packs available', desc: '🚀 1,000 emails — $5. ⚡ 5,000 emails — $19. 🔥 10,000 emails — $29. 💎 50,000 emails — $99. Boost credits never expire — they roll over indefinitely until used.' },
      { title: 'How credits are deducted', desc: 'Free daily credits are always used first. Once your 200 free emails for the day are spent, each additional email automatically deducts one Boost credit. You never need to switch between them manually — it all happens in the background.' },
      { title: 'Purchasing a Boost Pack', desc: 'Click Buy on any Boost Pack card. The cost is deducted from your SuperAdPro wallet balance. Credits are added instantly — you can use them straight away. Make sure your wallet has enough funds before purchasing.' },
      { title: 'Checking your usage', desc: 'The progress bar at the top of the SuperLeads page shows your daily email usage (e.g. Daily: 45/200). The Credits counter in the top-right of the hero shows your current Boost credit balance. Both update in real time.' },
      { title: 'When do I need Boost credits?', desc: 'If your list is small (under 200 leads) and you are sending one broadcast per day, you will rarely need Boost credits. They become useful when you have large lists, run multiple sequences simultaneously, or want to send several broadcasts in a single day.' },
    ],
  },
];

export default function MyLeadsHelp({ visible, onClose }) {
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
        position: 'relative', width: 440, maxWidth: '90vw', height: '100vh',
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'mlHelpSlide 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'linear-gradient(135deg,#172554,#172554)' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: '#fff' }}>
              Super<span style={{ color: '#818cf8' }}>{t('myLeads.helpTitle')}</span> Help
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{t('myLeads.helpDesc')}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--sap-text-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={function(e) { setSearch(e.target.value); }}
              placeholder={t('myLeads.searchHelp')}
              style={{ width: '100%', padding: '10px 12px 10px 34px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.map(function(section, si) {
            return (
              <div key={si}>
                <div
                  onClick={function() { toggle(si); }}
                  style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none', background: expanded[si] || q ? section.color + '08' : 'transparent' }}
                >
                  {expanded[si] || q ? <ChevronDown size={14} color={section.color} /> : <ChevronRight size={14} color={section.color} />}
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: section.color }}>{section.category}</span>
                  <span style={{ fontSize: 10, color: 'var(--sap-text-ghost)', fontWeight: 600 }}>({section.items.length})</span>
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

      <style>{'@keyframes mlHelpSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }'}</style>
    </div>
  );
}
