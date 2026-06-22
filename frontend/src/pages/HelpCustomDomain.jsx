/**
 * HelpCustomDomain — 6-step setup guide
 *
 * Member-facing help page. Linked from Funnels (SuperPages) page and from
 * the Custom Domain page itself. Standalone deep-link so it can also be
 * shared in support replies, training emails, etc.
 *
 * Brand: white cards on light cobalt/grey background, cobalt headings,
 * cyan accents. Sora display + DM Sans body via inherited tokens.
 *
 * Content: 6 numbered steps, the Cloudflare orange-cloud warning, the
 * three most common "stuck" fixes, and a primary CTA to /custom-domain.
 */
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import {
  Globe, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  Lightbulb, Copy, Clock, Info
} from 'lucide-react';

export default function HelpCustomDomain() {
  // Re-usable styles tied to the design token system
  const cardStyle = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 24,
    boxShadow: '0 1px 3px rgba(15,23,42,.04)',
  };

  const codeInline = {
    background: '#f1f5f9',
    color: '#0a1438',
    padding: '2px 7px',
    borderRadius: 5,
    fontSize: '0.92em',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontWeight: 600,
    border: '1px solid #e2e8f0',
  };

  return (
    <AppLayout>
      {/* Back link to Funnels (SuperPages). Explicit destination rather
          than browser-history back, so it works correctly when the page
          was opened from a support reply, a new tab, or a bookmark. */}
      <div style={{ marginBottom: 18 }}>
        <Link
          to="/funnels"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#475569', fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}>
          <ArrowLeft size={14} /> Back to SuperPages
        </Link>
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Globe size={26} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{
            margin: 0, fontFamily: "'Sora', sans-serif",
            fontSize: 26, fontWeight: 800, color: '#0a1438', lineHeight: 1.1,
          }}>
            Custom Domain Setup
          </h1>
          <p style={{
            margin: '6px 0 0', fontSize: 14, color: '#475569',
            lineHeight: 1.55,
          }}>
            Connect your own domain (like <code style={codeInline}>pages.yourbrand.com</code>) in 6 steps.
            Takes about 10 minutes of work, then up to an hour for DNS to propagate.
          </p>
        </div>
      </div>

      {/* Start panel — action first. Lets the user begin immediately and
          anchors the whole page on the primary task. */}
      <div style={{
        ...cardStyle, marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#0a1438' }}>
            Ready in 6 short steps
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            About 10 minutes of setup, then up to an hour for DNS to update.
          </div>
        </div>
        <Link to="/custom-domain" style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '13px 24px', borderRadius: 11,
          background: 'linear-gradient(135deg,#0a1438,#1e3a8a)',
          color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap',
          fontFamily: "'Sora', sans-serif", fontSize: 14.5, fontWeight: 700,
          boxShadow: '0 6px 16px rgba(10,20,56,.18)',
        }}>
          Open the Custom Domain page <ArrowRight size={17} />
        </Link>
      </div>

      {/* The 6 steps — at a glance. Numbered titles + where each step happens,
          so the user sees the whole (short) journey before diving in. Each row
          anchors to its full step below. */}
      <div style={{ ...cardStyle, marginBottom: 18, paddingTop: 18, paddingBottom: 14 }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 800,
          letterSpacing: '.06em', textTransform: 'uppercase', color: '#64748b',
          marginBottom: 12,
        }}>
          The 6 steps
        </div>
        {[
          { n: 1, t: 'Pick a subdomain', w: 'you' },
          { n: 2, t: 'Claim it on SuperAdPro', w: 'superadpro' },
          { n: 3, t: 'Open your DNS settings', w: 'registrar' },
          { n: 4, t: 'Add the 2 DNS records', w: 'registrar' },
          { n: 5, t: 'Cloudflare? Use the grey cloud', w: 'if it applies' },
          { n: 6, t: 'Come back & click Check now', w: 'go live' },
        ].map((st, i, arr) => (
          <a key={st.n} href={`#step-${st.n}`} style={{
            display: 'flex', alignItems: 'center', gap: 13,
            padding: '9px 0', textDecoration: 'none',
            borderBottom: i < arr.length - 1 ? '1px solid #f4f7fb' : 'none',
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: '#eef4ff', color: '#1e3a8a',
              fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{st.n}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0a1438' }}>{st.t}</span>
            <span style={{
              marginLeft: 'auto', fontSize: 11, color: '#94a3b8',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            }}>{st.w}</span>
          </a>
        ))}
        <div style={{
          marginTop: 6, paddingTop: 13, borderTop: '1px solid #f1f5f9',
          fontSize: 13, color: '#475569',
        }}>
          Already have a live website on this domain?{' '}
          <a href="#special-situations" style={{ color: '#0369a1', fontWeight: 700, textDecoration: 'none' }}>
            Read special situations first ↓
          </a>
        </div>
      </div>

      {/* Steps */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Step 1 */}
          <StepBlock id="step-1" num={1} title="Pick a subdomain">
            <p style={{ margin: 0 }}>
              Decide what subdomain you want to use. Format is always{' '}
              <code style={codeInline}>yoursubdomain.yourbrand.com</code> — a short prefix you
              pick, sitting in front of the domain you already own:
            </p>
            <SubdomainAnatomyDiagram />
            <p style={{ margin: 0 }}>Popular prefixes:</p>
            <ul style={ulStyle}>
              <li><code style={codeInline}>pages.yourbrand.com</code> — neutral, works for anything</li>
              <li><code style={codeInline}>go.yourbrand.com</code> — feels like a launch destination</li>
              <li><code style={codeInline}>join.yourbrand.com</code> — natural for signup pages</li>
              <li><code style={codeInline}>links.yourbrand.com</code> — perfect for LinkHub</li>
            </ul>
            <Callout tone="warn" icon={<AlertTriangle size={16} />}>
              <strong>Use a subdomain, not your root domain.</strong> Root domains
              (like <code style={codeInline}>yourbrand.com</code> with no prefix) don't support
              CNAME records cleanly. Always use a subdomain.
            </Callout>
          </StepBlock>

          {/* Step 2 */}
          <StepBlock id="step-2" num={2} title="Claim it on SuperAdPro first">
            <p style={{ margin: 0 }}>
              On the <Link to="/custom-domain" style={linkStyle}>Custom Domain page</Link>,
              type your full subdomain (e.g. <code style={codeInline}>pages.yourbrand.com</code>) into the box
              and click <strong>Claim</strong>. The page will then show you the <strong>2 DNS records</strong> you
              need to add at your domain provider.
            </p>
            <Callout tone="tip" icon={<Lightbulb size={16} />}>
              Keep the SuperAdPro page open in one tab. Open your domain provider in a
              second tab — you'll be copy-pasting between the two.
            </Callout>
          </StepBlock>

          {/* Step 3 */}
          <StepBlock id="step-3" num={3} title="Log in to your domain provider">
            <p style={{ margin: 0 }}>
              Go to wherever you bought your domain — GoDaddy, Namecheap, Cloudflare, Hover,
              IONOS, etc. — and find the <strong>DNS settings</strong> for your domain. It's
              usually a tab called <em>DNS</em>, <em>DNS Records</em>, <em>Zone File</em>,
              or <em>Domain Management</em>.
            </p>
          </StepBlock>

          {/* Step 4 */}
          <StepBlock id="step-4" num={4} title="Add the 2 DNS records">
            <p style={{ margin: 0 }}>
              Add both records using the exact values shown on the SuperAdPro Custom Domain page.
              The diagram below shows where each value goes:
            </p>

            <DnsMappingDiagram />

            <Callout tone="warn" icon={<AlertTriangle size={16} />}>
              <strong>For the Name (Host) field, enter just the subdomain part</strong> —
              e.g. <code style={codeInline}>pages</code>, not the full{' '}
              <code style={codeInline}>pages.yourbrand.com</code>. Most providers add
              the rest automatically. If yours asks for the full domain, then type the full domain.
            </Callout>
          </StepBlock>

          {/* Step 5 — special Cloudflare warning */}
          <StepBlock id="step-5" num={5} title="If you use Cloudflare: grey cloud, not orange">
            <p style={{ margin: 0 }}>
              Cloudflare users only: after adding the CNAME record, make sure the{' '}
              <strong>proxy status</strong> is set to <strong>DNS only</strong> (grey cloud icon),
              not Proxied (orange cloud). Orange cloud breaks HTTPS because Cloudflare and Railway both
              try to handle the SSL certificate.
            </p>
            <CloudflareCompareDiagram />
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
              Not on Cloudflare? Skip this step.
            </p>
          </StepBlock>

          {/* Step 6 */}
          <StepBlock id="step-6" num={6} title="Come back and click Check now">
            <p style={{ margin: 0 }}>
              Head back to the <Link to="/custom-domain" style={linkStyle}>Custom Domain page</Link> and
              click <strong>Check now</strong> next to your domain. You'll see the status pass through these stages:
            </p>
            <StatusTimelineDiagram />
            <Callout tone="info" icon={<Clock size={16} />}>
              Most domains go live within 10-15 minutes. If you're still on Pending after
              60 minutes, check the troubleshooting section below.
            </Callout>
          </StepBlock>

        </div>
      </div>

      {/* CTA to start */}
      <div style={{
        marginTop: 22,
        display: 'flex', justifyContent: 'center',
      }}>
        <Link
          to="/custom-domain"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg,#0a1438,#1e3a8a)',
            color: '#fff', textDecoration: 'none',
            fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700,
            boxShadow: '0 6px 16px rgba(10,20,56,.18)',
          }}>
          Set up my custom domain <ArrowRight size={18} />
        </Link>
      </div>

      {/* Special situations — the A/B/C setups, demoted below the steps so
          they're reference material rather than a wall of text before Step 1.
          Slim pointer in the step rail above links down here. */}
      <div id="special-situations" style={{ ...cardStyle, marginTop: 28, scrollMarginTop: 84 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Info size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{
              margin: 0, fontFamily: "'Sora', sans-serif",
              fontSize: 18, fontWeight: 700, color: '#0a1438', lineHeight: 1.25,
            }}>
              Special situations
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
              Already have a website at this domain, or want <code style={codeInline}>www</code> or
              the bare root? Read the matching setup before you touch DNS — it'll save you from
              accidentally taking an existing site offline.
            </p>
          </div>
        </div>

        <FaqScenario
          label="A"
          tone="ok"
          title={<>You want <code style={codeInline}>pages.yourbrand.com</code> alongside your existing site</>}
          summary="The standard setup. Recommended for almost everyone.">
          <p style={{ margin: 0 }}>
            Your main website at <code style={codeInline}>www.yourbrand.com</code> keeps working
            exactly as it is. You add a <strong>new subdomain</strong> like{' '}
            <code style={codeInline}>pages.yourbrand.com</code> that points at SuperAdPro. The
            two coexist — main site untouched, email untouched, just a new branded URL for your
            SuperPages.
          </p>
          <p style={{ margin: '6px 0 0' }}>
            <strong>Follow the 6 steps below as written.</strong> This is what the guide is for.
          </p>
        </FaqScenario>

        <FaqScenario
          label="B"
          tone="check"
          title={<>You want <code style={codeInline}>www.yourbrand.com</code> itself to be your SuperPages</>}
          summary="Only works if you don't already have a site at that URL.">
          <p style={{ margin: 0 }}>
            <strong>If nothing's there yet</strong> (you bought the domain but never built a
            site), this works fine. <code style={codeInline}>www</code> is just another subdomain,
            so the standard flow applies — type{' '}
            <code style={codeInline}>www.yourbrand.com</code> in Step 2 instead of{' '}
            <code style={codeInline}>pages.yourbrand.com</code>, and follow the rest of the guide
            as normal.
          </p>
          <p style={{ margin: '8px 0 0' }}>
            <strong>If you already have a site there</strong> (WordPress, Wix, Squarespace,
            anything), pointing the domain at SuperAdPro will take your existing site offline.
            You have three options:
          </p>
          <ul style={ulStyle}>
            <li>
              <strong>Keep both</strong> — leave your main site alone, use{' '}
              <code style={codeInline}>pages.yourbrand.com</code> for SuperAdPro (Scenario A).
              The safest choice.
            </li>
            <li>
              <strong>Replace your existing site</strong> with SuperPages — bigger decision,
              involves migrating your content over.
            </li>
            <li>
              <strong>Funnel visitors</strong> from your existing site to SuperAdPro with a
              "Join here →" button linking to <code style={codeInline}>pages.yourbrand.com</code>.
              Best of both: keep your main site, drive sign-ups through SuperAdPro.
            </li>
          </ul>
        </FaqScenario>

        <FaqScenario
          label="C"
          tone="warn"
          title={<>You want the bare root <code style={codeInline}>yourbrand.com</code> (no <code style={codeInline}>www</code>)</>}
          summary="Technically possible at some registrars, but discouraged.">
          <p style={{ margin: 0 }}>
            Root domains don't support CNAME records cleanly — you'd need a special{' '}
            <code style={codeInline}>ALIAS</code> or <code style={codeInline}>ANAME</code> record
            that not every DNS provider offers. The setup is fragile and varies by provider.
          </p>
          <p style={{ margin: '6px 0 0' }}>
            <strong>Better approach:</strong> use{' '}
            <code style={codeInline}>pages.yourbrand.com</code> or{' '}
            <code style={codeInline}>www.yourbrand.com</code> for SuperAdPro, then set up a{' '}
            <strong>forwarding rule</strong> at your registrar so{' '}
            <code style={codeInline}>yourbrand.com</code> → redirects to your branded URL. Every
            major registrar supports domain forwarding in a couple of clicks.
          </p>
        </FaqScenario>
      </div>

      {/* Troubleshooting */}
      <div style={{ ...cardStyle, marginTop: 28 }}>
        <h2 style={{
          margin: '0 0 16px', fontFamily: "'Sora', sans-serif",
          fontSize: 18, fontWeight: 700, color: '#0a1438',
        }}>
          Common fixes if you're stuck
        </h2>

        <FixBlock title="Status stuck on Pending after an hour">
          The CNAME value is almost certainly off by a character. Open your DNS provider
          and compare it side-by-side with what SuperAdPro shows. Trailing dots, capitalisation,
          and stray spaces are the usual culprits.
        </FixBlock>

        <FixBlock title='Error says "no DNS records found"'>
          Either DNS hasn't propagated yet (wait 5-10 mins and retry), or you added the
          records at a different provider than the one your domain actually uses for DNS. If
          you've ever changed nameservers, that can be a different host from where you bought the domain.
        </FixBlock>

        <FixBlock title="Status went straight to Failed">
          Usually the TXT record is missing, incorrect, or hasn't propagated. Double-check
          that the Name field is <code style={codeInline}>_acme-challenge.yoursubdomain</code> and the value matches
          exactly. Click <strong>Check now</strong> to retry after fixing.
        </FixBlock>

        <FixBlock title='You added an "A record" instead of a CNAME'>
          A records and CNAME records are different. Delete the A record and add a CNAME
          instead. Routing on the internet needs CNAME, not A, for our setup.
        </FixBlock>

        <FixBlock title="Domain loads but browser shows 'Not Secure'">
          DNS propagated faster than the SSL certificate. Wait 10-15 more minutes and refresh.
          If still not secure after 30 minutes, click <strong>Check now</strong> on the Custom Domain
          page to force a re-issuance.
        </FixBlock>
      </div>

      {/* Final help line */}
      <div style={{
        marginTop: 22, marginBottom: 12, padding: 18,
        background: '#f1f5f9', borderRadius: 10,
        fontSize: 13, color: '#475569', textAlign: 'center',
      }}>
        Still stuck? Send support a screenshot of your DNS records, a screenshot of this page,
        and the exact subdomain you're trying to set up — usually fixable in one reply.
      </div>
    </AppLayout>
  );
}

// ─── Building-block components ─────────────────────────────────────────

function StepBlock({ num, title, children, id }) {
  return (
    <div id={id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', scrollMarginTop: 84 }}>
      <div style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 800,
      }}>
        {num}
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <h3 style={{
          margin: '0 0 10px', fontFamily: "'Sora', sans-serif",
          fontSize: 16, fontWeight: 700, color: '#0a1438', lineHeight: 1.3,
        }}>
          {title}
        </h3>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          fontSize: 14, color: '#334155', lineHeight: 1.65,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Callout({ tone, icon, children }) {
  const tones = {
    warn: { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
    tip:  { bg: '#eff6ff', border: '#0ea5e9', text: '#075985' },
    info: { bg: '#f0f9ff', border: '#06b6d4', text: '#155e75' },
  };
  const t = tones[tone] || tones.tip;
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 8,
      background: t.bg, borderLeft: `4px solid ${t.border}`,
      color: t.text, fontSize: 13, lineHeight: 1.55,
    }}>
      <div style={{ flexShrink: 0, marginTop: 1, color: t.border }}>{icon}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function FixBlock({ title, children }) {
  return (
    <div style={{
      borderTop: '1px solid #f1f5f9', paddingTop: 14, paddingBottom: 14,
    }}>
      <div style={{
        fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700,
        color: '#0a1438', marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

// ─── FAQ Scenario card ─────────────────────────────────────────────────
// Three of these render in the "already have a website" FAQ section.
// Colour-coded down the left edge by tone: ok (green) / check (cyan) /
// warn (amber). Title is a React node so the embedded <code> spans
// render correctly inline.

function FaqScenario({ label, tone, title, summary, children }) {
  const tones = {
    ok:    { edge: '#10b981', bg: '#ecfdf5', badgeBg: '#d1fae5', badgeText: '#065f46' },
    check: { edge: '#06b6d4', bg: '#ecfeff', badgeBg: '#cffafe', badgeText: '#0e7490' },
    warn:  { edge: '#f59e0b', bg: '#fffbeb', badgeBg: '#fef3c7', badgeText: '#92400e' },
  };
  const t = tones[tone] || tones.check;
  return (
    <div style={{
      position: 'relative',
      background: t.bg,
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${t.edge}`,
      borderRadius: 10,
      padding: '14px 16px 14px 18px',
      marginTop: 12,
      fontSize: 13.5,
      color: '#334155',
      lineHeight: 1.65,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{
          flexShrink: 0,
          width: 26, height: 26, borderRadius: 7,
          background: t.badgeBg, color: t.badgeText,
          fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {label}
        </div>
        <div style={{ flex: 1, paddingTop: 1 }}>
          <div style={{
            fontFamily: "'Sora', sans-serif", fontSize: 14.5, fontWeight: 700,
            color: '#0a1438', lineHeight: 1.35,
          }}>
            {title}
          </div>
          {summary && (
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>
              {summary}
            </div>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Inline SVG diagrams ───────────────────────────────────────────────
// All diagrams use cobalt + cyan + white brand palette. Sora for headings,
// JetBrains Mono for DNS values + timing chips, DM Sans for body. viewBox
// preserveAspectRatio + width:100% so they scale cleanly inside cards on
// any screen width. Each diagram is wrapped in a wrapper div with
// overflow:hidden + neutral background so it sits cleanly inside the
// step's column. Outer cards on the parent give them their card framing
// where needed; the HeroFlow is rendered inside its own card directly.

function HeroFlowDiagram() {
  return (
    <div style={{ background: '#f1f5f9', padding: '4px 8px' }}>
      <svg width="100%" viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="End-to-end custom domain setup flow: you pick a subdomain, claim it on SuperAdPro, paste DNS records at your provider, Railway issues the SSL cert, and your domain goes live with HTTPS.">
        <defs>
          <marker id="hero-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#1e3a8a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </defs>
        <text x="340" y="36" fontSize="15" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', 'DM Sans', sans-serif" fontWeight="700">
          How a custom domain goes live
        </text>
        <text x="340" y="54" fontSize="12" fill="#64748b" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">
          Five stages · about 10 minutes of work · 10–15 minutes of waiting
        </text>

        {/* Stage 1: You */}
        <circle cx="68" cy="130" r="32" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        <g transform="translate(56,118)" stroke="#0a1438" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="5"/>
          <path d="M2 22 a10 10 0 0 1 20 0"/>
        </g>
        <text x="68" y="186" fontSize="12" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', 'DM Sans', sans-serif" fontWeight="700">You</text>
        <text x="68" y="202" fontSize="11" fill="#64748b" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">Pick a subdomain</text>

        <line x1="100" y1="130" x2="166" y2="130" stroke="#1e3a8a" strokeWidth="1.6" markerEnd="url(#hero-arr)"/>

        {/* Stage 2: SuperAdPro */}
        <rect x="170" y="98" width="84" height="64" rx="12" fill="#0a1438"/>
        <text x="212" y="124" fontSize="11" fill="#ffffff" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">SUPER</text>
        <text x="212" y="142" fontSize="11" fill="#22d3ee" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">ADPRO</text>
        <text x="212" y="156" fontSize="9" fill="#94a3b8" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">claim domain</text>
        <text x="212" y="186" fontSize="12" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', 'DM Sans', sans-serif" fontWeight="700">SuperAdPro</text>
        <text x="212" y="202" fontSize="11" fill="#64748b" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">Generates DNS values</text>

        <line x1="254" y1="130" x2="320" y2="130" stroke="#1e3a8a" strokeWidth="1.6" markerEnd="url(#hero-arr)"/>
        <text x="287" y="120" fontSize="10" fill="#0284c7" textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace">~2 min</text>

        {/* Stage 3: Your DNS */}
        <rect x="324" y="98" width="84" height="64" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        <g transform="translate(348,114)" stroke="#0a1438" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="0" y="0" width="36" height="10" rx="2"/>
          <rect x="0" y="14" width="36" height="10" rx="2"/>
          <circle cx="6" cy="5" r="1.2" fill="#0a1438"/>
          <circle cx="6" cy="19" r="1.2" fill="#0a1438"/>
          <path d="M14 5h16M14 19h16" stroke="#94a3b8"/>
        </g>
        <text x="366" y="186" fontSize="12" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', 'DM Sans', sans-serif" fontWeight="700">Your DNS</text>
        <text x="366" y="202" fontSize="11" fill="#64748b" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">Paste 2 records</text>

        <line x1="408" y1="130" x2="474" y2="130" stroke="#1e3a8a" strokeWidth="1.6" markerEnd="url(#hero-arr)"/>
        <text x="441" y="120" fontSize="10" fill="#0284c7" textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace">~5 min</text>

        {/* Stage 4: Railway */}
        <rect x="478" y="98" width="84" height="64" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        <g transform="translate(503,112)" stroke="#0a1438" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="13" rx="2"/>
          <path d="M7 11 V7 a5 5 0 0 1 10 0 V11"/>
        </g>
        <text x="520" y="186" fontSize="12" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', 'DM Sans', sans-serif" fontWeight="700">Railway</text>
        <text x="520" y="202" fontSize="11" fill="#64748b" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">Issues SSL cert</text>

        <line x1="562" y1="130" x2="612" y2="130" stroke="#1e3a8a" strokeWidth="1.6" markerEnd="url(#hero-arr)"/>
        <text x="587" y="120" fontSize="10" fill="#0284c7" textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace">~2 min</text>

        {/* Stage 5: Live */}
        <circle cx="644" cy="130" r="32" fill="#06b6d4"/>
        <g transform="translate(630,114)" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="13"/>
          <path d="M1 14 h26"/>
          <path d="M14 1 a18 13 0 0 1 0 26 a18 13 0 0 1 0 -26"/>
        </g>
        <text x="644" y="186" fontSize="12" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', 'DM Sans', sans-serif" fontWeight="700">Live</text>
        <text x="644" y="202" fontSize="11" fill="#0284c7" textAnchor="middle"
              fontFamily="'DM Sans', sans-serif">HTTPS active</text>

        <line x1="40" y1="240" x2="640" y2="240" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3"/>
        <text x="40" y="262" fontSize="11" fill="#64748b" fontFamily="'DM Sans', sans-serif">Your work</text>
        <text x="640" y="262" fontSize="11" fill="#64748b" textAnchor="end" fontFamily="'DM Sans', sans-serif">Automatic</text>
      </svg>
    </div>
  );
}

function SubdomainAnatomyDiagram() {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '10px 8px',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      <svg width="100%" viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="Anatomy of a subdomain: the prefix you pick (like 'pages') sits in front of the domain you already own.">
        <text x="340" y="32" fontSize="15" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">
          Anatomy of a custom subdomain
        </text>

        <rect x="40" y="60" width="600" height="80" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        <text x="120" y="116" fontSize="36" fill="#06b6d4" fontFamily="'JetBrains Mono', monospace" fontWeight="700">pages</text>
        <text x="240" y="116" fontSize="36" fill="#64748b" fontFamily="'JetBrains Mono', monospace">.</text>
        <text x="260" y="116" fontSize="36" fill="#0a1438" fontFamily="'JetBrains Mono', monospace" fontWeight="700">yourbrand.com</text>

        <path d="M 120 132 Q 120 142 120 152 L 200 152" fill="none" stroke="#06b6d4" strokeWidth="1.6"/>
        <path d="M 380 132 Q 380 142 380 152 L 460 152" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>

        <rect x="56" y="168" width="240" height="84" rx="12" fill="#ecfeff" stroke="#06b6d4" strokeWidth="1.5"/>
        <rect x="56" y="168" width="4" height="84" rx="2" fill="#06b6d4"/>
        <text x="76" y="194" fontSize="13" fill="#0e7490" fontFamily="'Sora', sans-serif" fontWeight="700">YOU PICK THIS</text>
        <text x="76" y="216" fontSize="12" fill="#0a1438" fontFamily="'DM Sans', sans-serif">A short prefix — pages, go,</text>
        <text x="76" y="234" fontSize="12" fill="#0a1438" fontFamily="'DM Sans', sans-serif">join, links, offers, hub</text>

        <rect x="384" y="168" width="240" height="84" rx="12" fill="#ffffff" stroke="#1e3a8a" strokeWidth="1.5"/>
        <rect x="384" y="168" width="4" height="84" rx="2" fill="#1e3a8a"/>
        <text x="404" y="194" fontSize="13" fill="#1e3a8a" fontFamily="'Sora', sans-serif" fontWeight="700">YOU ALREADY OWN THIS</text>
        <text x="404" y="216" fontSize="12" fill="#0a1438" fontFamily="'DM Sans', sans-serif">The domain you bought at</text>
        <text x="404" y="234" fontSize="12" fill="#0a1438" fontFamily="'DM Sans', sans-serif">GoDaddy, Namecheap, etc.</text>

        <text x="340" y="282" fontSize="12" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Other popular prefixes:</text>

        <rect x="116" y="294" width="100" height="22" rx="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="166" y="310" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">go</text>

        <rect x="228" y="294" width="100" height="22" rx="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="278" y="310" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">join</text>

        <rect x="340" y="294" width="100" height="22" rx="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="390" y="310" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">links</text>

        <rect x="452" y="294" width="100" height="22" rx="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="502" y="310" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">offers</text>
      </svg>
    </div>
  );
}

function DnsMappingDiagram() {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '10px 8px',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      <svg width="100%" viewBox="0 0 680 600" xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="DNS mapping: the CNAME target and TXT verification value shown on SuperAdPro copy into the matching Name and Value fields at your domain provider. Watch the Name field — enter just the subdomain part.">
        <defs>
          <marker id="dns-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#06b6d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </defs>

        <text x="40" y="32" fontSize="13" fill="#0a1438" fontFamily="'Sora', sans-serif" fontWeight="700">FROM SUPERADPRO</text>
        <text x="40" y="50" fontSize="11" fill="#64748b" fontFamily="'DM Sans', sans-serif">Custom Domain page</text>

        <text x="640" y="32" fontSize="13" fill="#0a1438" textAnchor="end" fontFamily="'Sora', sans-serif" fontWeight="700">AT YOUR DOMAIN PROVIDER</text>
        <text x="640" y="50" fontSize="11" fill="#64748b" textAnchor="end" fontFamily="'DM Sans', sans-serif">GoDaddy, Namecheap, Cloudflare</text>

        {/* CNAME source card */}
        <rect x="40" y="72" width="260" height="140" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
        <rect x="40" y="72" width="4" height="140" rx="2" fill="#0ea5e9"/>
        <text x="60" y="100" fontSize="15" fill="#0a1438" fontFamily="'Sora', sans-serif" fontWeight="700">CNAME record</text>
        <text x="60" y="126" fontSize="12" fill="#475569" fontFamily="'DM Sans', sans-serif">Target value</text>
        <rect x="60" y="134" width="220" height="34" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="74" y="156" fontSize="12" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">superadpro.up.railway.app</text>
        <text x="60" y="194" fontSize="11" fill="#0284c7" fontFamily="'DM Sans', sans-serif">Copy this →</text>

        {/* TXT source card */}
        <rect x="40" y="228" width="260" height="140" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
        <rect x="40" y="228" width="4" height="140" rx="2" fill="#1e3a8a"/>
        <text x="60" y="256" fontSize="15" fill="#0a1438" fontFamily="'Sora', sans-serif" fontWeight="700">TXT record</text>
        <text x="60" y="282" fontSize="12" fill="#475569" fontFamily="'DM Sans', sans-serif">Verification value</text>
        <rect x="60" y="290" width="220" height="34" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="74" y="312" fontSize="12" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">acme-verify-9f3c2a...</text>
        <text x="60" y="350" fontSize="11" fill="#0284c7" fontFamily="'DM Sans', sans-serif">Copy this →</text>

        {/* Provider form card */}
        <rect x="400" y="72" width="240" height="296" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
        <text x="420" y="100" fontSize="15" fill="#0a1438" fontFamily="'Sora', sans-serif" fontWeight="700">Add DNS record</text>

        <text x="420" y="124" fontSize="10" fill="#64748b" fontFamily="'DM Sans', sans-serif">TYPE</text>
        <rect x="420" y="130" width="200" height="28" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="434" y="148" fontSize="12" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">CNAME</text>

        <text x="420" y="178" fontSize="10" fill="#64748b" fontFamily="'DM Sans', sans-serif">NAME (HOST)</text>
        <rect x="420" y="184" width="200" height="28" rx="6" fill="#ecfeff" stroke="#06b6d4" strokeWidth="1"/>
        <text x="434" y="202" fontSize="12" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">pages</text>

        <text x="420" y="232" fontSize="10" fill="#64748b" fontFamily="'DM Sans', sans-serif">VALUE (TARGET)</text>
        <rect x="420" y="238" width="200" height="28" rx="6" fill="#ecfeff" stroke="#06b6d4" strokeWidth="1"/>
        <text x="434" y="256" fontSize="11" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">superadpro.up.railway.app</text>

        <text x="420" y="286" fontSize="10" fill="#64748b" fontFamily="'DM Sans', sans-serif">TTL</text>
        <rect x="420" y="292" width="200" height="28" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5"/>
        <text x="434" y="310" fontSize="12" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">Automatic</text>

        {/* Source-to-destination arrow */}
        <path d="M 300 151 C 350 151, 360 252, 400 252" fill="none" stroke="#06b6d4" strokeWidth="1.6" strokeDasharray="5 3" markerEnd="url(#dns-arr)" opacity="0.85"/>

        {/* Gotcha callout */}
        <rect x="40" y="396" width="600" height="106" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1"/>
        <rect x="40" y="396" width="4" height="106" rx="2" fill="#f59e0b"/>
        <text x="60" y="424" fontSize="14" fill="#78350f" fontFamily="'Sora', sans-serif" fontWeight="700">⚠  Watch the Name field</text>
        <text x="60" y="450" fontSize="13" fill="#92400e" fontFamily="'DM Sans', sans-serif">Enter just the subdomain part — e.g. </text>
        <text x="305" y="450" fontSize="12" fill="#78350f" fontFamily="'JetBrains Mono', monospace">pages</text>
        <text x="335" y="450" fontSize="13" fill="#92400e" fontFamily="'DM Sans', sans-serif"> — not the full</text>
        <text x="60" y="470" fontSize="12" fill="#78350f" fontFamily="'JetBrains Mono', monospace">pages.yourbrand.com</text>
        <text x="60" y="492" fontSize="12" fill="#92400e" fontFamily="'DM Sans', sans-serif">Most providers add the rest automatically. If yours asks for the full domain, type the full domain.</text>

        {/* Repeat-for-TXT note */}
        <rect x="40" y="518" width="600" height="74" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
        <text x="60" y="544" fontSize="13" fill="#0a1438" fontFamily="'Sora', sans-serif" fontWeight="700">Repeat the same pattern for the TXT record:</text>
        <text x="60" y="566" fontSize="12" fill="#475569" fontFamily="'DM Sans', sans-serif">Type = </text>
        <text x="100" y="566" fontSize="11" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">TXT</text>
        <text x="125" y="566" fontSize="12" fill="#475569" fontFamily="'DM Sans', sans-serif">,  Name = </text>
        <text x="180" y="566" fontSize="11" fill="#0a1438" fontFamily="'JetBrains Mono', monospace">_acme-challenge.pages</text>
        <text x="60" y="584" fontSize="11" fill="#94a3b8" fontFamily="'DM Sans', sans-serif" fontStyle="italic">"_acme-challenge" is a standard Let's Encrypt prefix — it goes in front of your subdomain.</text>
      </svg>
    </div>
  );
}

function CloudflareCompareDiagram() {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '10px 8px',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      <svg width="100%" viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="Cloudflare proxy comparison: grey cloud (DNS only) works correctly; orange cloud (Proxied) breaks HTTPS on your custom domain.">

        <text x="340" y="32" fontSize="14" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">
          Cloudflare proxy setting — DNS only, not Proxied
        </text>
        <text x="340" y="50" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">
          Click the cloud icon next to your CNAME record until it shows grey
        </text>

        {/* DO THIS card */}
        <rect x="40" y="76" width="280" height="220" rx="14" fill="#ffffff" stroke="#10b981" strokeWidth="2"/>
        <rect x="40" y="76" width="280" height="44" rx="14" fill="#ecfdf5"/>
        <rect x="40" y="102" width="280" height="18" fill="#ecfdf5"/>
        <circle cx="64" cy="98" r="9" fill="#10b981"/>
        <path d="M59 98 L62.5 101.5 L70 94" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="80" y="102" fontSize="13" fill="#065f46" fontFamily="'Sora', sans-serif" fontWeight="700">DO THIS</text>

        <g transform="translate(140,136)">
          <path d="M40 30 a18 18 0 0 1 0 -34 a14 14 0 0 1 26 -2 a16 14 0 0 1 12 36 z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1"/>
        </g>

        <text x="180" y="212" fontSize="14" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">DNS only</text>
        <text x="180" y="232" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">(grey cloud)</text>

        <line x1="76" y1="252" x2="284" y2="252" stroke="#e2e8f0" strokeWidth="0.5"/>
        <text x="180" y="274" fontSize="11" fill="#475569" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Cloudflare forwards traffic</text>
        <text x="180" y="290" fontSize="11" fill="#475569" textAnchor="middle" fontFamily="'DM Sans', sans-serif">SuperAdPro handles HTTPS</text>

        {/* DO NOT card */}
        <rect x="360" y="76" width="280" height="220" rx="14" fill="#ffffff" stroke="#dc2626" strokeWidth="2"/>
        <rect x="360" y="76" width="280" height="44" rx="14" fill="#fef2f2"/>
        <rect x="360" y="102" width="280" height="18" fill="#fef2f2"/>
        <circle cx="384" cy="98" r="9" fill="#dc2626"/>
        <path d="M380 94 L388 102 M388 94 L380 102" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
        <text x="400" y="102" fontSize="13" fill="#991b1b" fontFamily="'Sora', sans-serif" fontWeight="700">DO NOT</text>

        <g transform="translate(460,136)">
          <path d="M40 30 a18 18 0 0 1 0 -34 a14 14 0 0 1 26 -2 a16 14 0 0 1 12 36 z" fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
        </g>

        <text x="500" y="212" fontSize="14" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">Proxied</text>
        <text x="500" y="232" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">(orange cloud)</text>

        <line x1="396" y1="252" x2="604" y2="252" stroke="#e2e8f0" strokeWidth="0.5"/>
        <text x="500" y="274" fontSize="11" fill="#475569" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Cloudflare tries to handle HTTPS</text>
        <text x="500" y="290" fontSize="11" fill="#dc2626" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Breaks your custom domain</text>
      </svg>
    </div>
  );
}

function StatusTimelineDiagram() {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '10px 8px',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      <svg width="100%" viewBox="0 0 680 260" xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="Verification status timeline: Pending DNS (0 to 5 minutes), Verifying (around 3 minutes), Issuing certificate (1 to 2 minutes), then Verified — live with HTTPS.">

        <text x="340" y="32" fontSize="14" fill="#0a1438" textAnchor="middle"
              fontFamily="'Sora', sans-serif" fontWeight="700">
          What you'll see when you click Check now
        </text>
        <text x="340" y="50" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">
          Most domains reach Verified within 15 minutes
        </text>

        <line x1="92" y1="140" x2="588" y2="140" stroke="#cbd5e1" strokeWidth="2"/>
        <line x1="92" y1="140" x2="588" y2="140" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 4" opacity="0.5"/>

        {/* Pending */}
        <circle cx="92" cy="140" r="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2"/>
        <g transform="translate(80,128)" stroke="#64748b" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7 v5 l3 3"/>
        </g>
        <text x="92" y="92" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'Sora', sans-serif" fontWeight="700">Pending DNS</text>
        <text x="92" y="190" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">DNS not propagated</text>
        <text x="92" y="208" fontSize="11" fill="#0284c7" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">0–5 min</text>

        {/* Verifying */}
        <circle cx="240" cy="140" r="22" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2"/>
        <g transform="translate(228,128)" stroke="#0ea5e9" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="6"/>
          <path d="M15.5 15.5 l5 5"/>
        </g>
        <text x="240" y="92" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'Sora', sans-serif" fontWeight="700">Verifying</text>
        <text x="240" y="190" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Records found, checking</text>
        <text x="240" y="208" fontSize="11" fill="#0284c7" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">~3 min</text>

        {/* Issuing */}
        <circle cx="388" cy="140" r="22" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2"/>
        <g transform="translate(376,126)" stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="13" rx="2"/>
          <path d="M7 11 V7 a5 5 0 0 1 10 0 V11"/>
        </g>
        <text x="388" y="92" fontSize="12" fill="#0a1438" textAnchor="middle" fontFamily="'Sora', sans-serif" fontWeight="700">Issuing cert</text>
        <text x="388" y="190" fontSize="11" fill="#64748b" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Let's Encrypt working</text>
        <text x="388" y="208" fontSize="11" fill="#0284c7" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">1–2 min</text>

        {/* Verified */}
        <circle cx="536" cy="140" r="22" fill="#06b6d4" stroke="#0e7490" strokeWidth="2"/>
        <g transform="translate(525,130)" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11 l6 6 l12 -13"/>
        </g>
        <text x="536" y="92" fontSize="12" fill="#0e7490" textAnchor="middle" fontFamily="'Sora', sans-serif" fontWeight="700">Verified</text>
        <text x="536" y="190" fontSize="11" fill="#0284c7" textAnchor="middle" fontFamily="'DM Sans', sans-serif">Live with HTTPS</text>
        <text x="536" y="208" fontSize="11" fill="#0e7490" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">Done</text>

        <text x="340" y="244" fontSize="11" fill="#94a3b8" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontStyle="italic">
          If you're still on Pending after 60 minutes, see the troubleshooting section below
        </text>
      </svg>
    </div>
  );
}

// ─── Inline style tokens ───────────────────────────────────────────────

const ulStyle = {
  margin: '4px 0 0', paddingLeft: 22,
  fontSize: 13.5, color: '#475569', lineHeight: 1.75,
};

const linkStyle = {
  color: '#0284c7', fontWeight: 600, textDecoration: 'none',
  borderBottom: '1px solid #bae6fd',
};

const thStyle = {
  padding: '10px 14px', textAlign: 'left',
  fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12,
  letterSpacing: 0.5, textTransform: 'uppercase',
};

const tdStyle = {
  padding: '10px 14px', borderTop: '1px solid #e2e8f0',
  color: '#334155',
};
