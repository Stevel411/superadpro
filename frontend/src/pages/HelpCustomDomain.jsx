/**
 * HelpCustomDomain — guided setup guide for Page Builder custom domains
 * ═══════════════════════════════════════════════════════════════════
 * Rebuilt 2 Jul 2026 in the BlogDomain.jsx / SendingDomains.jsx visual
 * language: three numbered step cards, "What's this?" expanders, the
 * Cloudflare grey-cloud warning, and a compact stuck-fixes card —
 * replacing the previous 6-step long-form guide.
 *
 * Static help page (no API calls). The live records + Copy buttons live
 * on /custom-domain — this page explains the journey and drives there.
 * Route: /help/custom-domain (React route + backend shell both exist).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import {
  Globe, ArrowLeft, ArrowRight, AlertTriangle, Clock, HelpCircle,
  ChevronDown, ChevronRight, ShieldCheck, Wrench, CheckCircle2,
} from 'lucide-react';

const WHAT_IS = {
  SUBDOMAIN: {
    title: 'Why a subdomain?',
    body: 'Your main website at www.yourbrand.com keeps working exactly as it is — a subdomain like pages.yourbrand.com sits alongside it without touching anything. If you bought a domain and nothing lives there yet, you can use www itself; otherwise, always pick a subdomain.',
  },
  CNAME: {
    title: 'CNAME record',
    body: 'This points your subdomain at our servers, so when someone visits it they land on your pages. It\u2019s the same kind of record you\u2019d add to connect a domain to Shopify, Webflow or Squarespace \u2014 if you\u2019ve done that before, this is identical.',
  },
  TXT: {
    title: 'TXT (certificate) record',
    body: 'A short code that proves the domain is yours and lets us issue your HTTPS security certificate (the padlock). Its name starts with _acme-challenge. It changes nothing else on your domain \u2014 it\u2019s a one-time ownership check.',
  },
};

export default function HelpCustomDomain() {
  const [expanded, setExpanded] = useState({});
  const toggle = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  const WhatsThis = ({ k }) => {
    const what = WHAT_IS[k];
    const open = !!expanded[k];
    return (
      <>
        <button onClick={() => toggle(k)} style={whatLink}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {open ? 'Hide explanation' : "What's this?"}
        </button>
        {open && (
          <div style={whatBox}>
            <div style={whatBoxTitle}><HelpCircle size={13} /> {what.title}</div>
            <div style={whatBoxBody}>{what.body}</div>
          </div>
        )}
      </>
    );
  };

  return (
    <AlShell active="ai-tools" back={{ to: '/pro/funnels', label: 'Page Builder' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0a1f52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Globe size={24} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
              Put your pages on your own domain
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>
              Serve your pages at <strong>pages.yourbrand.com</strong> instead of the AdvantageLife
              address. About 5 minutes &mdash; copy, paste, done. We issue the HTTPS certificate for you.
            </p>
            <Link to="/custom-domain" style={{ ...primaryBtnStyle, textDecoration: 'none', marginTop: 14 }}>
              Start setup <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Step 1 */}
        <div style={recCardStyle}>
          <div style={stepHead}>
            <div style={recNumStyle}>1</div>
            <div style={stepTitle}>Claim your domain on the setup page</div>
          </div>
          <p style={stepBody}>
            Open the <Link to="/custom-domain" style={inlineLink}>Custom Domain</Link> page, type the
            subdomain you want &mdash; like <span style={codeInline}>pages.yourbrand.com</span> &mdash; and
            tap <strong>Connect</strong>. We instantly generate the two records you&rsquo;ll need, with
            one-tap Copy buttons next to each.
          </p>
          <WhatsThis k="SUBDOMAIN" />
        </div>

        {/* Step 2 */}
        <div style={recCardStyle}>
          <div style={stepHead}>
            <div style={recNumStyle}>2</div>
            <div style={stepTitle}>Paste the 2 records at your domain provider</div>
            <span style={recTag}>CNAME</span>
            <span style={recTag}>TXT</span>
          </div>
          <p style={stepBody}>
            Log in wherever you bought your domain (GoDaddy, Namecheap, Cloudflare, Hover&hellip;) and find
            the section called <em>DNS</em>, <em>Manage DNS</em> or <em>Records</em>. Add the two records
            exactly as shown on the setup page: for each one, tap <strong>Copy</strong> there, paste into the
            matching box here. That&rsquo;s the whole job &mdash; copy, paste.
          </p>
          <WhatsThis k="CNAME" />
          <div style={{ height: 6 }} />
          <WhatsThis k="TXT" />
        </div>

        {/* Cloudflare warning */}
        <div style={{ ...helpStrip, marginTop: 0, marginBottom: 10 }}>
          <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>On Cloudflare? Grey cloud, not orange.</strong> After adding the CNAME, set its
            {' '}<em>proxy status</em> to <strong>DNS only</strong> (grey cloud), not Proxied (orange).
            The orange cloud breaks the HTTPS certificate. Not on Cloudflare? Ignore this.
          </div>
        </div>

        {/* Step 3 */}
        <div style={recCardStyle}>
          <div style={stepHead}>
            <div style={recNumStyle}>3</div>
            <div style={stepTitle}>Come back and tap &ldquo;Check now&rdquo;</div>
          </div>
          <p style={stepBody}>
            Back on the <Link to="/custom-domain" style={inlineLink}>Custom Domain</Link> page, tap
            {' '}<strong>Check now</strong>. We also re-check automatically every few minutes, so you can
            close the page. DNS can take up to an hour to propagate &mdash; when the badge flips to
            {' '}<strong style={{ color: '#15803d' }}>Verified &amp; live</strong>, your pages are on your
            domain with the padlock handled.
          </p>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} /> Typical wait: a few minutes. Up to an hour is still normal.
          </div>
        </div>

        {/* Stuck fixes */}
        <div style={{ ...cardStyle, marginTop: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Wrench size={16} color="#c8102e" />
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
              If it gets stuck
            </div>
          </div>
          <div style={fixRow}>
            <CheckCircle2 size={14} color="#c8102e" style={fixIcon} />
            <div style={fixText}>
              <strong>Status says Failed?</strong> The TXT record is usually missing or mistyped. Check its
              Name starts with <span style={codeInline}>_acme-challenge</span> and the value matches exactly,
              then tap <strong>Check now</strong> again.
            </div>
          </div>
          <div style={fixRow}>
            <CheckCircle2 size={14} color="#c8102e" style={fixIcon} />
            <div style={fixText}>
              <strong>Added an &ldquo;A record&rdquo; by mistake?</strong> Delete it and add a
              {' '}<strong>CNAME</strong> instead &mdash; the setup page shows exactly what to paste.
            </div>
          </div>
          <div style={fixRow}>
            <CheckCircle2 size={14} color="#c8102e" style={fixIcon} />
            <div style={fixText}>
              <strong>Loads but says &ldquo;Not Secure&rdquo;?</strong> DNS beat the certificate. Wait 10&ndash;15
              minutes and refresh; still not secure after 30, tap <strong>Check now</strong> to re-issue.
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.55, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            Still stuck? Send support a screenshot of your DNS records and the exact subdomain you&rsquo;re
            setting up &mdash; usually fixable in one reply.
          </div>
        </div>

        {/* Reassurance panel */}
        <div style={{ ...cardStyle, marginBottom: 24, background: 'linear-gradient(135deg,#0a1f52,#12388f)', border: 'none' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ShieldCheck size={22} color="#f5b8c2" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 5 }}>
                Secure, and fully your brand
              </div>
              <div style={{ fontSize: 13, color: '#bcd0f0', lineHeight: 1.6, marginBottom: 14 }}>
                Once it&rsquo;s live, your pages load on <strong style={{ color: '#f5b8c2' }}>your</strong> domain
                over HTTPS with a certificate we issue and renew automatically. Visitors never see a
                AdvantageLife URL &mdash; it&rsquo;s your site; we&rsquo;re just the engine behind it.
              </div>
              <Link to="/custom-domain" style={{ ...primaryBtnStyle, textDecoration: 'none' }}>
                Start setup <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AlShell>
  );
}

/* ── styles (mirrors BlogDomain.jsx / SendingDomains.jsx) ── */
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const backLinkStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: 16 };
const primaryBtnStyle = { padding: '11px 20px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#c8102e,#e8203f)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Sora', sans-serif", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const codeInline = { background: '#f1f5f9', color: '#0f172a', padding: '1px 6px', borderRadius: 4, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, fontWeight: 600 };
const inlineLink = { color: '#c8102e', fontWeight: 700, textDecoration: 'none' };
const recCardStyle = { border: '1px solid #e6ebf3', borderRadius: 12, padding: '14px 16px', marginBottom: 10, background: '#fbfdff' };
const recNumStyle = { width: 26, height: 26, borderRadius: '50%', background: '#c8102e', color: '#fff', fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const recTag = { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, fontWeight: 600, color: '#475569', background: '#eef2f8', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, flexShrink: 0 };
const stepHead = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, flexWrap: 'wrap' };
const stepTitle = { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14.5, color: '#0f172a', flex: 1, minWidth: 180 };
const stepBody = { fontSize: 13.5, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' };
const whatLink = { background: 'none', border: 'none', color: '#c8102e', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 0 0' };
const whatBox = { marginTop: 9, background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #12388f', borderRadius: 8, padding: '11px 13px' };
const whatBoxTitle = { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: '#12388f', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 };
const whatBoxBody = { fontSize: 12, color: '#475569', lineHeight: 1.6 };
const helpStrip = { display: 'flex', gap: 9, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#92400e', lineHeight: 1.5 };
const fixRow = { display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 9 };
const fixIcon = { flexShrink: 0, marginTop: 2 };
const fixText = { fontSize: 13, color: '#475569', lineHeight: 1.55 };
