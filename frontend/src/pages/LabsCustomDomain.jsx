/**
 * LabsCustomDomain.jsx — Custom Domain settings panel
 * ═════════════════════════════════════════════════════════════════════
 * Lives at /labs/pagebuilder/custom-domain.
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
} from 'lucide-react';

const STATUS_META = {
  verified: { label: 'Verified', color: '#15803d', bg: '#dcfce7', Icon: CheckCircle2 },
  pending:  { label: 'Pending',  color: '#92400e', bg: '#fef3c7', Icon: Clock },
  failed:   { label: 'Failed',   color: '#b91c1c', bg: '#fee2e2', Icon: AlertTriangle },
};

export default function LabsCustomDomain() {
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

        {/* Setup instructions */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionTitle}>Setup steps</h2>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.7 }}>
            <li>
              At your DNS provider (Cloudflare, Namecheap, etc), add a <strong>CNAME</strong> record:
              <div style={dnsBoxStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, fontSize: 13 }}>
                  <div style={dnsLabel}>Type</div>
                  <div style={dnsValue}>CNAME</div>
                  <div style={dnsLabel}>Name</div>
                  <div style={dnsValue}><span style={{ color: '#0ea5e9' }}>pages</span> <span style={{ color: '#94a3b8', fontSize: 12 }}>(or whatever subdomain you prefer)</span></div>
                  <div style={dnsLabel}>Target</div>
                  <div style={{ ...dnsValue, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ ...codeInline, padding: '2px 8px', fontSize: 13 }}>{cnameTarget || 'superadpro-production.up.railway.app'}</code>
                    <button onClick={copyTarget} style={copyBtnStyle} title="Copy">
                      <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={dnsLabel}>Proxy</div>
                  <div style={dnsValue}>Enable Cloudflare proxy (orange cloud) for free HTTPS</div>
                </div>
              </div>
            </li>
            <li>Wait 2-10 minutes for DNS to propagate.</li>
            <li>Enter your domain below (e.g. <code style={codeInline}>pages.yourbrand.com</code>) and click <strong>Claim</strong>. We'll verify it and switch the routing on.</li>
            <li>Your pages are now live at <code style={codeInline}>https://pages.yourbrand.com/your-page-slug</code></li>
          </ol>
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#f1f5f9', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              HTTPS is handled by Cloudflare's free SSL when you enable proxy mode on your CNAME (orange cloud). Without it, the domain still works over HTTP but browsers will warn visitors.
            </div>
          </div>
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
