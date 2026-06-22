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
              Add both records at your registrar, using the exact values shown on your
              Custom Domain page:
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

// ─── Compact step visuals ──────────────────────────────────────────────
// Big illustrative SVGs replaced (Jun 2026) with the convention every major
// builder uses — a plain Type/Name/Value record table plus small inline cues.
// Same names as before so the step render is untouched.

function SubdomainAnatomyDiagram() {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: '14px 16px' }}>
      <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 21, fontWeight: 700, letterSpacing: '-.5px' }}>
        <span style={{ color: '#06b6d4' }}>pages</span>
        <span style={{ color: '#94a3b8' }}>.</span>
        <span style={{ color: '#0a1438' }}>yourbrand.com</span>
      </div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: 11, fontWeight: 600 }}>
        <span style={{ color: '#0e7490', width: 96 }}>↑ you pick this</span>
        <span style={{ color: '#1e3a8a' }}>↑ you already own this</span>
      </div>
    </div>
  );
}

function DnsMappingDiagram() {
  const th = {
    textAlign: 'left', padding: '9px 12px', background: '#f8fafc',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10.5,
    letterSpacing: '.05em', textTransform: 'uppercase', color: '#64748b',
    fontWeight: 700, borderBottom: '1px solid #e2e8f0',
  };
  const td = {
    padding: '11px 12px', borderBottom: '1px solid #f1f5f9',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12.5,
    fontWeight: 600, color: '#0a1438', verticalAlign: 'middle',
  };
  const typeChip = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 700, fontSize: 11,
    background: '#0a1438', color: '#fff', padding: '3px 8px', borderRadius: 5,
  };
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
        <thead>
          <tr><th style={th}>Type</th><th style={th}>Name (Host)</th><th style={th}>Value</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...td, fontFamily: 'inherit' }}><span style={typeChip}>CNAME</span></td>
            <td style={td}>pages</td>
            <td style={{ ...td, color: '#475569' }}>superadpro.up.railway.app</td>
          </tr>
          <tr>
            <td style={{ ...td, borderBottom: 'none', fontFamily: 'inherit' }}><span style={typeChip}>TXT</span></td>
            <td style={{ ...td, borderBottom: 'none' }}>_acme-challenge.pages</td>
            <td style={{ ...td, borderBottom: 'none', color: '#475569' }}>acme-verify-9f3c2a…</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CloudflareCompareDiagram() {
  const Row = ({ ok, cloud, label, sub }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px',
      borderRadius: 9, fontSize: 13.5,
      border: '1px solid ' + (ok ? '#a7f3d0' : '#fecaca'),
      background: ok ? '#ecfdf5' : '#fef2f2',
    }}>
      <span style={{ width: 22, height: 16, borderRadius: 9, flexShrink: 0, background: cloud }} />
      <strong style={{ color: ok ? '#065f46' : '#991b1b' }}>{label}</strong>
      <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12.5 }}>{sub}</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row ok cloud="#cbd5e1" label="Grey cloud — DNS only" sub="correct ✓" />
      <Row cloud="#f59e0b" label="Orange cloud — Proxied" sub="breaks HTTPS ✗" />
    </div>
  );
}

function StatusTimelineDiagram() {
  const chip = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12, fontWeight: 600,
    padding: '6px 12px', borderRadius: 7, background: '#f1f5f9', color: '#475569',
  };
  const arr = { color: '#cbd5e1', fontSize: 14 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={chip}>Pending</span><span style={arr}>→</span>
      <span style={chip}>Verifying</span><span style={arr}>→</span>
      <span style={chip}>Issuing SSL</span><span style={arr}>→</span>
      <span style={{ ...chip, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>● Live</span>
    </div>
  );
}

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
