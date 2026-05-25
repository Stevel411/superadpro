/**
 * CustomDomain.jsx — Custom Domain settings panel
 * ═════════════════════════════════════════════════════════════════════
 * Lives at /custom-domain. Promoted from /labs/pagebuilder/custom-domain
 * on 25 May 2026 — the feature is production-grade, not sandbox/labs,
 * and the path needed to reflect that. Old labs path redirects here.
 *
 * Per-user CNAME mapping for SuperPages. Member claims e.g.
 * pages.theirbrand.com, CNAMEs it at our Railway host, and once
 * verified, all their published pages serve from that hostname.
 *
 * v1 ships free for paid members only. Free-tier sees the feature
 * exists but gets a clear upgrade prompt instead of "no access".
 *
 * Backend API:
 *   GET    /api/custom-domains              list + cname_target
 *   POST   /api/custom-domains              { domain }
 *   POST   /api/custom-domains/{id}/verify  manual re-check
 *   DELETE /api/custom-domains/{id}
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import {
  Globe, CheckCircle2, AlertTriangle, Clock, Loader2, Trash2,
  Copy, RefreshCw, ArrowLeft, Info, ExternalLink, Lock,
  HelpCircle, ChevronDown,
} from 'lucide-react';

const STATUS_META = {
  verified: { label: 'Verified', color: '#15803d', bg: '#dcfce7', Icon: CheckCircle2 },
  pending:  { label: 'Pending',  color: '#92400e', bg: '#fef3c7', Icon: Clock },
  failed:   { label: 'Failed',   color: '#b91c1c', bg: '#fee2e2', Icon: AlertTriangle },
};

// Human-readable labels for Railway certificateStatus values. The raw
// strings (CERTIFICATE_STATUS_TYPE_*) are useful for logs but a bit
// clinical for members — translate them to plain English.
function formatTlsStatus(raw) {
  if (!raw) return 'Unknown';
  const map = {
    CERTIFICATE_STATUS_TYPE_PENDING:             'Pending DNS',
    CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP:'Validating ownership',
    CERTIFICATE_STATUS_TYPE_ISSUING:             'Issuing certificate',
    CERTIFICATE_STATUS_TYPE_ISSUED:              'Live with HTTPS',
    CERTIFICATE_STATUS_TYPE_RENEWING:            'Renewing certificate',
    CERTIFICATE_STATUS_TYPE_ERRORED:             'Error',
  };
  return map[raw] || raw.replace('CERTIFICATE_STATUS_TYPE_', '').replace(/_/g, ' ').toLowerCase();
}

export default function CustomDomain() {
  const [domains, setDomains] = useState([]);
  const [cnameTarget, setCnameTarget] = useState('');
  const [canClaim, setCanClaim] = useState(true);
  const [maxDomains, setMaxDomains] = useState(3);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const res = await apiGet('/api/custom-domains');
      setDomains(res.domains || []);
      setCnameTarget(res.cname_target || '');
      setCanClaim(res.can_claim !== false);
      setMaxDomains(res.max_domains_per_user || 3);
    } catch (e) {
      // Network/auth error — UI will show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiPost('/api/custom-domains', { domain: newDomain.trim() });
      if (res.error) {
        setSubmitError(res.error);
      } else {
        setNewDomain('');
        await load();
      }
    } catch (e) {
      setSubmitError(e?.message || 'Could not claim domain. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      await apiPost(`/api/custom-domains/${id}/verify`, {});
      await load();
    } catch (e) {
      // Error shown via reloaded last_error column on the row
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id, domain) => {
    if (!window.confirm(`Release ${domain}? Your pages will still work at superadpro.com/p/... — only this custom domain mapping is removed.`)) return;
    try {
      await apiDelete(`/api/custom-domains/${id}`);
      await load();
    } catch (e) {
      // ignore — reload below would reflect actual state
    }
  };

  const copyTarget = () => {
    navigator.clipboard.writeText(cnameTarget);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppLayout title="Custom Domain" subtitle="Bring your own domain to your SuperPages">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 16px' }}>

        {/* Back link */}
        <Link to="/labs/pagebuilder" style={backLinkStyle}>
          <ArrowLeft size={14} /> Back to Page Builder
        </Link>

        {/* Header card */}
        <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Globe size={24} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
              Use your own domain
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>
              Point a domain you own (like <code style={codeInline}>pages.yourbrand.com</code>) at SuperAdPro
              and serve all your published pages from there. One DNS setup, unlimited pages.
            </p>
          </div>
        </div>

        {/* Free-tier paywall */}
        {!canClaim && (
          <div style={{ ...cardStyle, marginBottom: 16, borderColor: '#fde68a', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Lock size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#78350f', fontSize: 15, marginBottom: 4 }}>
                  Custom domains are for active members
                </div>
                <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.55 }}>
                  Activate your membership to claim a domain and start serving your SuperPages from your own URL.
                  Your free pages remain accessible at <code style={codeInline}>superadpro.com/p/yourname/...</code> as always.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New-user help link — direct people to the standalone walkthrough.
            Helpful for first-timers who land cold; verified members will
            naturally ignore it. Always visible (no role gating) since the
            help page itself has no gating either. Added 25 May 2026. */}
        <Link
          to="/help/custom-domain"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', marginBottom: 16,
            background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
            border: '1px solid #bfdbfe', borderRadius: 10,
            color: '#1e3a8a', textDecoration: 'none',
            fontSize: 13.5, lineHeight: 1.5,
          }}>
          <HelpCircle size={18} style={{ flexShrink: 0, color: '#0ea5e9' }} />
          <span style={{ flex: 1 }}>
            <strong>New here?</strong> Read the 6-step setup guide before you start —
            walks you through the whole process and the most common DNS providers.
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: '#0284c7', whiteSpace: 'nowrap',
          }}>
            Open guide →
          </span>
        </Link>

        {/* Setup instructions */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionTitle}>How it works</h2>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.7 }}>
            <li>
              <strong>Claim your domain below.</strong> Type the hostname you want to use
              (e.g. <code style={codeInline}>pages.yourbrand.com</code>) and click Add.
            </li>
            <li>
              <strong>We'll show you 2 DNS records to add.</strong> One CNAME (routes traffic
              to us), one TXT (proves you own the domain). Add both at your domain provider.
            </li>
            <li>
              <strong>Your domain goes live with HTTPS automatically.</strong> No Cloudflare needed.
              We handle the TLS certificate via Let's Encrypt — usually under 10 minutes after DNS
              propagates. Click <strong>Check now</strong> on your domain to see live progress.
            </li>
          </ol>
        </div>

        {/* Claim form */}
        {canClaim && domains.length < maxDomains && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h2 style={sectionTitle}>Claim a domain</h2>
            <form onSubmit={handleClaim} style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="pages.yourbrand.com"
                disabled={submitting}
                style={inputStyle}
                autoComplete="off"
              />
              <button type="submit" disabled={submitting || !newDomain.trim()} style={primaryBtnStyle}>
                {submitting ? <Loader2 size={14} className="spin" /> : null}
                {submitting ? 'Verifying...' : 'Claim'}
              </button>
            </form>
            {submitError && (
              <div style={errorBoxStyle}>
                <AlertTriangle size={14} /> {submitError}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              {domains.length} of {maxDomains} domains claimed
            </div>
          </div>
        )}

        {/* Domain list */}
        <div style={{ ...cardStyle }}>
          <h2 style={sectionTitle}>Your domains</h2>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              <Loader2 size={18} className="spin" style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Loading...
            </div>
          )}
          {!loading && domains.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, border: '1px dashed #cbd5e1', borderRadius: 10 }}>
              No custom domains claimed yet.
            </div>
          )}
          {!loading && domains.map((d) => {
            const meta = STATUS_META[d.verification_status] || STATUS_META.pending;
            const StatusIcon = meta.Icon;
            const isVerifying = verifyingId === d.id;
            return (
              <div key={d.id} style={domainRowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      {d.domain}
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 99,
                      background: meta.bg, color: meta.color,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                    }}>
                      <StatusIcon size={11} /> {meta.label}
                    </span>
                  </div>
                  {d.verification_status === 'verified' ? (
                    <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0ea5e9', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Open <ExternalLink size={11} />
                    </a>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                      {d.last_error || 'DNS propagation can take a few minutes. We re-check automatically.'}
                    </div>
                  )}

                  {/* v2 (25 May 2026): per-domain DNS records from Railway.
                      Only shown when we have records (i.e. Railway-registered
                      domains, which is everything new). Also shows TLS status
                      progression so the member can see exactly where in the
                      issuing flow they are. */}
                  {d.dns_records && d.dns_records.length > 0 && d.verification_status !== 'verified' && (
                    <div style={{ marginTop: 10, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Add these records at your domain provider
                      </div>
                      {d.dns_records.map((rec, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr auto', gap: 8, padding: '6px 0', borderTop: idx > 0 ? '1px dashed #e2e8f0' : 'none', fontSize: 12, alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{rec.recordType}</div>
                          <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0f172a', background: '#fff', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.hostlabel || '@'}</code>
                          <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0f172a', background: '#fff', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.requiredValue}>{rec.requiredValue}</code>
                          <button onClick={() => { navigator.clipboard.writeText(rec.requiredValue); }} style={{ ...copyBtnStyle, fontSize: 11, padding: '3px 8px' }} title="Copy">
                            <Copy size={11} />
                          </button>
                        </div>
                      ))}
                      {d.tls_status && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0', fontSize: 11, color: '#64748b' }}>
                          TLS status: <strong style={{ color: '#0f172a' }}>{formatTlsStatus(d.tls_status)}</strong>
                          {d.tls_status === 'CERTIFICATE_STATUS_TYPE_ISSUING' && ' · Cert being issued, usually under 5 min'}
                          {d.tls_status === 'CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP' && ' · Verifying DNS records, usually under 5 min'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {d.verification_status !== 'verified' && (
                    <button onClick={() => handleVerify(d.id)} disabled={isVerifying} style={secondaryBtnStyle} title="Re-check DNS now">
                      {isVerifying ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                      {isVerifying ? 'Checking' : 'Check now'}
                    </button>
                  )}
                  <button onClick={() => handleDelete(d.id, d.domain)} style={dangerBtnStyle} title="Release domain">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Help & troubleshooting — collapsible to keep the page tidy */}
        <details style={{ ...cardStyle, marginTop: 16, cursor: 'pointer' }}>
          <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', outline: 'none' }}>
            <HelpCircle size={18} color="#0ea5e9" />
            Help &amp; troubleshooting
            <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </summary>

          <div style={{ paddingTop: 16, fontSize: 13.5, color: '#334155', lineHeight: 1.65 }}>

            {/* Common errors */}
            <h3 style={helpH3}>Common errors</h3>

            <div style={helpBlock}>
              <div style={helpQ}>"CNAME points to X but should point to Y"</div>
              <div>The CNAME record is set but pointing to the wrong target. In your DNS provider, edit your CNAME and make sure the target is exactly:</div>
              <code style={{ ...codeInline, display: 'inline-block', marginTop: 6, padding: '4px 10px' }}>{cnameTarget || 'superadpro-production.up.railway.app'}</code>
              <div style={{ marginTop: 6 }}>No <code style={codeInline}>https://</code>, no trailing slash, no extra spaces. Save, wait a minute, click <strong>Check now</strong>.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>"No DNS records found for [your domain]"</div>
              <ul style={helpList}>
                <li>You haven't added the CNAME record yet — go to your DNS provider and add it.</li>
                <li>You added it but DNS hasn't propagated — wait 2-5 minutes and click <strong>Check now</strong>.</li>
                <li>You added it at the wrong provider — make sure the DNS you're editing is for the domain you're claiming.</li>
              </ul>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>"[Your domain] has an A record but no CNAME"</div>
              <div>You created an <strong>A record</strong> instead of a <strong>CNAME</strong> record. A records point at fixed IP addresses, which can change. Delete the A record and replace it with a CNAME pointing at our host above.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Status stuck on "Pending" for 30+ minutes</div>
              <div>DNS propagation usually takes 2-10 minutes but can occasionally take longer. Click <strong>Check now</strong> to re-verify on demand. If still pending after an hour, double-check your CNAME record matches the example exactly.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Visitors see a "not secure" warning</div>
              <div>You probably set up your CNAME without enabling proxy mode. In Cloudflare, edit your CNAME and click the cloud icon until it's <strong>orange (Proxied)</strong>, not grey (DNS only). The orange cloud is what gives you free HTTPS.</div>
            </div>

            {/* FAQ */}
            <h3 style={helpH3}>Frequently asked</h3>

            <div style={helpBlock}>
              <div style={helpQ}>Can I use more than one custom domain?</div>
              <div>Yes — up to 3 per account. Each one serves all your published pages.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Will my existing <code style={codeInline}>superadpro.com/p/...</code> URLs still work?</div>
              <div>Yes. Your custom domain is in <em>addition</em> to the platform URL, not a replacement. Any old links you've shared continue to work — no broken links.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Can two members claim the same domain?</div>
              <div>No. Once claimed, no one else can claim that exact domain. If you release it, it becomes available again.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Can I use my root domain (e.g. <code style={codeInline}>yourbrand.com</code>) instead of a subdomain?</div>
              <div>Technically yes, but we recommend a subdomain like <code style={codeInline}>pages.yourbrand.com</code>. Root domains don't support CNAME records cleanly (they need ALIAS or ANAME records, which not all providers offer). A subdomain is much smoother.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Does this affect my email or main website?</div>
              <div>No. The CNAME only affects the subdomain you chose (e.g. <code style={codeInline}>pages.yourbrand.com</code>). Email at <code style={codeInline}>yourname@yourbrand.com</code> and your main site at <code style={codeInline}>yourbrand.com</code> are untouched.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Do my custom domain visits show in analytics?</div>
              <div>Yes — SuperPages analytics counts every visit regardless of which URL it came from. Custom domain traffic appears in the same dashboard.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>How do I change my domain later?</div>
              <div>Click the trash icon next to your domain above to release it, then claim a new one. Your pages stay accessible at <code style={codeInline}>superadpro.com/p/...</code> the whole time — no downtime.</div>
            </div>

            <div style={helpBlock}>
              <div style={helpQ}>Is there a cost?</div>
              <div>The Custom Domain feature is free for active members. You only pay your own domain registrar (~$10/year). Cloudflare's free plan is enough for HTTPS — no paid plan needed.</div>
            </div>

            <div style={{ marginTop: 18, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
              Still stuck? Take a screenshot of your CNAME record in your DNS provider and a screenshot of this page showing the error, then contact support.
            </div>

          </div>
        </details>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </AppLayout>
  );
}

const cardStyle = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
  padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
const sectionTitle = {
  margin: '0 0 14px', fontSize: 14, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b',
};
const codeInline = {
  background: '#f1f5f9', color: '#0f172a', padding: '1px 6px',
  borderRadius: 4, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  fontSize: 12, fontWeight: 600,
};
const dnsBoxStyle = {
  marginTop: 10, marginBottom: 14, padding: 14,
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
};
const dnsLabel = {
  fontSize: 11, fontWeight: 700, color: '#64748b',
  letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 4,
};
const dnsValue = { fontSize: 13, color: '#0f172a' };
const inputStyle = {
  flex: 1, minWidth: 200,
  padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
};
const primaryBtnStyle = {
  padding: '10px 20px', border: 'none', borderRadius: 8,
  background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
  color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};
const secondaryBtnStyle = {
  padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
  background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
};
const dangerBtnStyle = {
  padding: '8px', border: '1px solid #fecaca', borderRadius: 8,
  background: '#fff', color: '#b91c1c', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center',
};
const copyBtnStyle = {
  padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6,
  background: '#fff', color: '#475569', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
};
const errorBoxStyle = {
  marginTop: 10, padding: '8px 12px',
  background: '#fee2e2', color: '#991b1b',
  border: '1px solid #fecaca', borderRadius: 8,
  fontSize: 13, fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: 6,
};
const domainRowStyle = {
  display: 'flex', gap: 12, alignItems: 'center',
  padding: '14px 0', borderTop: '1px solid #f1f5f9',
};
const backLinkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 12, color: '#64748b', textDecoration: 'none',
  fontWeight: 600, marginBottom: 16,
};
const helpH3 = {
  margin: '4px 0 10px',
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#64748b',
};
const helpBlock = {
  padding: '12px 0',
  borderTop: '1px solid #f1f5f9',
};
const helpQ = {
  fontWeight: 700, color: '#0f172a',
  marginBottom: 4,
};
const helpList = {
  margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7,
};
