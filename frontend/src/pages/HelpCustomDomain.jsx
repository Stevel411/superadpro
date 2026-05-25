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
 * three most common "stuck" fixes, and a primary CTA to /labs/pagebuilder/custom-domain.
 */
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import {
  Globe, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  Lightbulb, Copy, Clock
} from 'lucide-react';

export default function HelpCustomDomain() {
  const navigate = useNavigate();

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
      {/* Back link */}
      <div style={{ marginBottom: 18 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#475569', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', padding: 0,
          }}>
          <ArrowLeft size={14} /> Back
        </button>
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

      {/* Steps */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Step 1 */}
          <StepBlock num={1} title="Pick a subdomain">
            <p style={{ margin: 0 }}>
              Decide what subdomain you want to use. Format is always{' '}
              <code style={codeInline}>yoursubdomain.yourbrand.com</code>.
              Popular choices:
            </p>
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
          <StepBlock num={2} title="Claim it on SuperAdPro first">
            <p style={{ margin: 0 }}>
              On the <Link to="/labs/pagebuilder/custom-domain" style={linkStyle}>Custom Domain page</Link>,
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
          <StepBlock num={3} title="Log in to your domain provider">
            <p style={{ margin: 0 }}>
              Go to wherever you bought your domain — GoDaddy, Namecheap, Cloudflare, Hover,
              IONOS, etc. — and find the <strong>DNS settings</strong> for your domain. It's
              usually a tab called <em>DNS</em>, <em>DNS Records</em>, <em>Zone File</em>,
              or <em>Domain Management</em>.
            </p>
          </StepBlock>

          {/* Step 4 */}
          <StepBlock num={4} title="Add the 2 DNS records">
            <p style={{ margin: 0 }}>
              Add both records using the exact values shown on the SuperAdPro Custom Domain page.
              Here's the universal layout:
            </p>

            {/* DNS records table */}
            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 10,
              overflow: 'hidden', marginTop: 4,
            }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              }}>
                <thead>
                  <tr style={{ background: '#0a1438', color: '#fff' }}>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Name (Host)</th>
                    <th style={thStyle}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={tdStyle}><code style={codeInline}>CNAME</code></td>
                    <td style={tdStyle}><code style={codeInline}>pages</code></td>
                    <td style={tdStyle}>(copy from SuperAdPro)</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td style={tdStyle}><code style={codeInline}>TXT</code></td>
                    <td style={tdStyle}><code style={codeInline}>_acme-challenge.pages</code></td>
                    <td style={tdStyle}>(copy from SuperAdPro)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Callout tone="warn" icon={<AlertTriangle size={16} />}>
              <strong>For the Name (Host) field, enter just the subdomain part</strong> —
              e.g. <code style={codeInline}>pages</code>, not the full{' '}
              <code style={codeInline}>pages.yourbrand.com</code>. Most providers add
              the rest automatically. If yours asks for the full domain, then type the full domain.
            </Callout>
          </StepBlock>

          {/* Step 5 — special Cloudflare warning */}
          <StepBlock num={5} title="If you use Cloudflare: grey cloud, not orange">
            <p style={{ margin: 0 }}>
              Cloudflare users only: after adding the CNAME record, make sure the{' '}
              <strong>proxy status</strong> is set to <strong>DNS only</strong> (grey cloud icon),
              not Proxied (orange cloud). Orange cloud breaks HTTPS because Cloudflare and Railway both
              try to handle the SSL certificate.
            </p>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
              Not on Cloudflare? Skip this step.
            </p>
          </StepBlock>

          {/* Step 6 */}
          <StepBlock num={6} title="Come back and click Check now">
            <p style={{ margin: 0 }}>
              Head back to the <Link to="/labs/pagebuilder/custom-domain" style={linkStyle}>Custom Domain page</Link> and
              click <strong>Check now</strong> next to your domain. You'll see the status update through these stages:
            </p>
            <ul style={ulStyle}>
              <li><strong>Pending DNS</strong> — records haven't propagated yet (wait a few mins)</li>
              <li><strong>Verifying DNS records</strong> — we can see the records, validating</li>
              <li><strong>Issuing certificate</strong> — Let's Encrypt is generating your SSL cert</li>
              <li><strong style={{ color: '#059669' }}>Verified</strong> — done! Open your domain in a browser</li>
            </ul>
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
          to="/labs/pagebuilder/custom-domain"
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

function StepBlock({ num, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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
