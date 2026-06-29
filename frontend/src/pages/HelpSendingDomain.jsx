/**
 * HelpSendingDomain.jsx — Step-by-step DNS setup guide for sending domains
 * ═════════════════════════════════════════════════════════════════════
 * Lives at /help/sending-domain. The make-or-break guidance: gets a
 * non-technical member from "I have a domain" to "records added" without
 * giving up. Per-provider collapsible walkthroughs. Linked from the
 * provider chips on /sending-domains.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle2, HelpCircle, Mail,
} from 'lucide-react';

const PROVIDERS = [
  {
    name: 'GoDaddy',
    steps: [
      'Sign in at godaddy.com and go to "My Products".',
      'Find your domain and click the three dots → "Manage DNS".',
      'Scroll to "DNS Records" and click "Add New Record".',
      'Choose the Type (CNAME or TXT) shown on your SuperAdPro setup page.',
      'Paste the "Name" value into the Name/Host box, and the "Value" into the Value box.',
      'Leave TTL as default (1 hour). Click Save. Repeat for each record.',
    ],
  },
  {
    name: 'Namecheap',
    steps: [
      'Sign in at namecheap.com and go to "Domain List".',
      'Click "Manage" next to your domain, then the "Advanced DNS" tab.',
      'Under "Host Records", click "Add New Record".',
      'Pick the Type (CNAME or TXT), paste the Name into "Host" and the Value into "Value".',
      'Set TTL to Automatic. Click the green tick to save. Repeat for each record.',
    ],
  },
  {
    name: 'Cloudflare',
    steps: [
      'Sign in at cloudflare.com and select your domain.',
      'Click the "DNS" tab in the left menu, then "Add record".',
      'Choose the Type, paste Name and Value from your SuperAdPro setup page.',
      'IMPORTANT: set Proxy status to "DNS only" (grey cloud, not orange) for these records.',
      'Click Save. Repeat for each record.',
    ],
  },
  {
    name: 'Google Domains / Squarespace',
    steps: [
      'Google Domains moved to Squarespace — sign in at account.squarespace.com.',
      'Open your domain → "DNS" / "DNS Settings".',
      'Find "Custom records" and click "Add record".',
      'Choose Type, paste Name (Host) and Value (Data). Save. Repeat for each.',
    ],
  },
  {
    name: '123-Reg',
    steps: [
      'Sign in at 123-reg.co.uk and go to "Control Panel" → your domain.',
      'Click "Manage DNS" / "Advanced DNS".',
      'Add a new record, choose the Type, paste Name (Hostname) and Value.',
      'Save changes. Repeat for each record.',
    ],
  },
  {
    name: 'Somewhere else / not sure',
    steps: [
      'Log in to wherever you bought your domain (your "domain registrar").',
      'Look for "DNS", "DNS settings", "Manage DNS", or "Advanced DNS".',
      'Find the option to "Add record".',
      'For each record on your SuperAdPro setup page: pick the Type (CNAME or TXT), paste the Name, paste the Value, and save.',
      'If you genuinely can\u2019t find DNS settings, search "[your provider] add CNAME record" \u2014 every provider has a help article.',
    ],
  },
];

export default function HelpSendingDomain() {
  const [open, setOpen] = useState('GoDaddy');
  return (
    <AppLayout title="DNS Setup Guide" subtitle="Adding your records, step by step">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        <Link to="/sending-domains" style={backLinkStyle}>
          <ArrowLeft size={14} /> Back to Sending Domain
        </Link>

        {/* Intro */}
        <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Adding your DNS records
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#475569', lineHeight: 1.6 }}>
              On your <Link to="/sending-domains" style={{ color: '#0ea5e9', fontWeight: 600 }}>Sending Domain</Link> page
              we show you a few records to copy. This guide shows exactly where to paste them, depending on
              where you bought your domain. Pick yours below.
            </p>
          </div>
        </div>

        {/* Don't have a domain yet? */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionTitle}>Don&rsquo;t have a domain yet?</h2>
          <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
            No problem &mdash; you can get one in about 5 minutes. A domain is just your own web
            address (like <code style={codeInline}>janesmith.com</code>). You buy it once a year, usually
            around <strong>$10&ndash;15</strong>, from a &ldquo;domain registrar&rdquo;. Here&rsquo;s the whole thing:
            <ol style={{ margin: '12px 0 0', paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}>
                Go to a registrar &mdash; <strong>Namecheap</strong>, <strong>GoDaddy</strong>, or
                <strong> Cloudflare</strong> are all reputable. (Namecheap is often the cheapest and simplest.)
              </li>
              <li style={{ marginBottom: 6 }}>
                Type the name you want in their search box. If <code style={codeInline}>yourname.com</code> is
                taken, try a variation, or a different ending like <code style={codeInline}>.co</code> or
                <code style={codeInline}> .net</code>. A <code style={codeInline}>.com</code> is best if it&rsquo;s available.
              </li>
              <li style={{ marginBottom: 6 }}>
                Add it to your basket and check out. That&rsquo;s it &mdash; you own the domain.
              </li>
              <li>
                Come back here. You don&rsquo;t need to build a website &mdash; you only need the domain so your
                emails can send from it. Use a subdomain like <code style={codeInline}>mail.yourname.com</code>
                (you create that for free in the next step, just by adding the DNS records we show you).
              </li>
            </ol>
            <div style={{ marginTop: 12, padding: '10px 13px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, fontSize: 13, color: '#166534', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>One domain is all you need &mdash; it powers your emails, and you can use it for your pages and links too. It&rsquo;s the one thing that&rsquo;s truly <strong>yours</strong>.</span>
            </div>
          </div>
        </div>

        {/* The simple idea */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionTitle}>The whole job, in plain English</h2>
          <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
            For each record we show you, you&rsquo;ll do the same three things at your domain company:
            <ol style={{ margin: '10px 0 0', paddingLeft: 20 }}>
              <li>Pick the <strong>Type</strong> (it says CNAME or TXT on each one).</li>
              <li>Copy the <strong>Name</strong> from SuperAdPro, paste it into the Name/Host box.</li>
              <li>Copy the <strong>Value</strong>, paste it into the Value box, and save.</li>
            </ol>
            <div style={{ marginTop: 12, padding: '10px 13px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, fontSize: 13, color: '#0c4a6e' }}>
              That&rsquo;s it. Repeat for each record, then go back to SuperAdPro and tap
              <strong> &ldquo;I&rsquo;ve added them &mdash; check now&rdquo;</strong>. DNS can take up to an hour,
              so don&rsquo;t worry if it&rsquo;s not instant &mdash; we keep checking for you.
            </div>
          </div>
        </div>

        {/* Per-provider accordion */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionTitle}>Find your domain company</h2>
          {PROVIDERS.map((p) => {
            const isOpen = open === p.name;
            return (
              <div key={p.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setOpen(isOpen ? '' : p.name)} style={accordionHead}>
                  {isOpen ? <ChevronDown size={16} color="#0ea5e9" /> : <ChevronRight size={16} color="#94a3b8" />}
                  <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.name}</span>
                </button>
                {isOpen && (
                  <ol style={{ margin: '0 0 14px', paddingLeft: 40, color: '#334155', fontSize: 13.5, lineHeight: 1.7 }}>
                    {p.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                  </ol>
                )}
              </div>
            );
          })}
        </div>

        {/* Troubleshooting */}
        <details style={{ ...cardStyle, marginBottom: 24, cursor: 'pointer' }}>
          <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', outline: 'none' }}>
            <HelpCircle size={18} color="#0ea5e9" /> Common questions
            <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </summary>
          <div style={{ paddingTop: 14, fontSize: 13.5, color: '#334155', lineHeight: 1.65 }}>
            <div style={qBlock}><div style={qStyle}>It still says &ldquo;Waiting for DNS&rdquo; after I added everything.</div>
              DNS changes can take anywhere from a few minutes to an hour to spread across the internet. That&rsquo;s
              completely normal. You can close the page &mdash; we keep checking and email you the moment it&rsquo;s live.</div>
            <div style={qBlock}><div style={qStyle}>Do I have to understand DKIM, SPF and DMARC?</div>
              No. Just copy and paste each record. The technical names are there for anyone who wants them (tap
              &ldquo;What&rsquo;s this?&rdquo; on any record), but you don&rsquo;t need to know what they mean to use them.</div>
            <div style={qBlock}><div style={qStyle}>I&rsquo;ve done this on Mailchimp/AWeber before.</div>
              Then you&rsquo;ll recognise it &mdash; it&rsquo;s the same DKIM/SPF/DMARC setup, just pointing at our mail
              service instead of theirs.</div>
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#64748b' }}>
              Still stuck? Take a screenshot of your DNS records and the SuperAdPro setup page, and contact support.
            </div>
          </div>
        </details>

      </div>
    </AppLayout>
  );
}

const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const sectionTitle = { margin: '0 0 14px', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' };
const codeInline = { background: '#f1f5f9', color: '#0f172a', padding: '1px 6px', borderRadius: 4, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, fontWeight: 600 };
const backLinkStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: 16 };
const accordionHead = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', padding: '13px 0', cursor: 'pointer', textAlign: 'left' };
const qBlock = { padding: '12px 0', borderTop: '1px solid #f1f5f9' };
const qStyle = { fontWeight: 700, color: '#0f172a', marginBottom: 4 };
