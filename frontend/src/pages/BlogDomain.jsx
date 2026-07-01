/**
 * BlogDomain.jsx — Guided custom-domain setup for a member's blog
 * ═════════════════════════════════════════════════════════════════════
 * Lives at /my-site/domain. Sibling of SendingDomains.jsx — same layered,
 * copy-paste-with-guidance UX, but for putting a member's BLOG on their own
 * domain (CNAME + verification TXT), with automatic HTTPS via Railway.
 *
 * Design: simple by default (copy, paste), real record names always visible
 * as tags, a "What's this?" expander for the curious.
 *
 * Backend API (app/main.py) — already live:
 *   GET    /api/blog/domain          { domain: {...} | null }
 *   POST   /api/blog/domain          { domain }
 *   POST   /api/blog/domain/verify   {}
 *   DELETE /api/blog/domain
 * Engine: app/custom_domains.py + app/railway_api.py (Railway auto-TLS).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import {
  Globe, CheckCircle2, AlertTriangle, Clock, Loader2, Trash2, ExternalLink,
  Copy, RefreshCw, ArrowLeft, Lock, HelpCircle, ChevronDown, ChevronRight,
  ShieldCheck, PartyPopper,
} from 'lucide-react';

// Plain-English "what's this?" copy, keyed by DNS record type.
const WHAT_IS = {
  CNAME: {
    title: 'CNAME record',
    body: 'This points your domain at our servers, so when someone visits it they land on your blog. It\u2019s the same kind of record you\u2019d add to connect a domain to Shopify, Webflow or Squarespace \u2014 if you\u2019ve done that before, this is identical.',
  },
  TXT: {
    title: 'TXT (ownership) record',
    body: 'This is a short code that proves the domain is really yours and lets us issue your HTTPS security certificate (the padlock). It doesn\u2019t change anything else on your domain \u2014 it\u2019s just a one-time ownership check.',
  },
  A: {
    title: 'A record',
    body: 'This points your domain at our server by its numeric address, so visitors reach your blog.',
  },
};

function recType(r) { return (r.type || r.record_type || 'CNAME').toUpperCase(); }
function recName(r) { return r.name || r.host || '@'; }
function recValue(r) { return r.value || r.data || r.target || ''; }

export default function BlogDomain() {
  const [domain, setDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    try {
      const r = await apiGet('/api/blog/domain');
      setDomain(r?.domain || null);
    } catch (e) {
      // empty state on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-poll while the domain isn't verified yet, so the status flips to
  // "live" on its own once DNS propagates and the cert is issued.
  useEffect(() => {
    if (!domain || domain.verification_status === 'verified') return;
    const t = setInterval(() => { load(); }, 30000);
    return () => clearInterval(t);
  }, [domain]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    setSubmitting(true); setError(''); setUpgradeRequired(false);
    try {
      const r = await apiPost('/api/blog/domain', { domain: val });
      if (r?.error) {
        setError(r.error);
        if (/partner|founder|membership/i.test(r.error)) setUpgradeRequired(true);
      } else {
        setInput('');
        setDomain(r?.domain || null);
      }
    } catch (err) {
      const msg = err?.message || 'Could not connect the domain. Try again in a moment.';
      setError(msg);
      if (/partner|founder|membership/i.test(msg)) setUpgradeRequired(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true); setError('');
    try {
      const r = await apiPost('/api/blog/domain/verify', {});
      setDomain(r?.domain || domain);
    } catch (err) {
      setError(err?.message || 'Could not check right now.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!domain) return;
    if (!window.confirm(`Disconnect ${domain.domain}? Your blog will go back to its SuperAdPro address until you add it again.`)) return;
    try {
      await apiDelete('/api/blog/domain');
      setDomain(null); setError('');
    } catch (err) {
      setError(err?.message || 'Could not disconnect.');
    }
  };

  const copyVal = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };
  const toggleWhat = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const isVerified = domain && domain.verification_status === 'verified';
  const records = (domain && domain.dns_records) || [];

  return (
    <AppLayout title="Custom Domain" subtitle="Put your blog on your own domain">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        <Link to="/my-site" style={backLinkStyle}>
          <ArrowLeft size={14} /> Back to my site
        </Link>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0a1438', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Globe size={24} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
              Put your blog on your own domain
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>
              Serve your blog at <strong>blog.yourbrand.com</strong> instead of the SuperAdPro address.
              Takes about 5 minutes &mdash; we guide every step, and we issue the HTTPS certificate for you.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ ...cardStyle, padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Loader2 size={16} className="spin" style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Loading&hellip;
          </div>
        ) : (
          <>
            {/* Upgrade gate */}
            {upgradeRequired && (
              <div style={{ ...cardStyle, marginBottom: 16, borderColor: '#fde68a', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Lock size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#78350f', fontSize: 15, marginBottom: 4 }}>
                      Custom domains are a Partner feature
                    </div>
                    <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.55, marginBottom: 10 }}>
                      Upgrade to Partner or Founder to serve your blog on your own domain under your brand.
                    </div>
                    <Link to="/pay-membership" style={{ ...primaryBtnStyle, textDecoration: 'none' }}>
                      Upgrade my account &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* No domain yet — add one */}
            {!domain && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={sectionTitle}>Add your domain</div>
                <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '0 0 12px' }}>
                  Type the domain (or subdomain) you want your blog to live on. A subdomain like
                  {' '}<span style={codeInline}>blog.yourbrand.com</span> is the easiest and most common choice.
                </p>
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(''); }}
                    placeholder="blog.yourbrand.com"
                    style={{ ...inputFull, flex: 1, minWidth: 180 }}
                  />
                  <button type="submit" disabled={submitting || !input.trim()} style={{ ...primaryBtnStyle, opacity: (submitting || !input.trim()) ? 0.6 : 1 }}>
                    {submitting ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
                    {submitting ? 'Connecting\u2026' : 'Connect'}
                  </button>
                </form>
                {error && !upgradeRequired && (
                  <div style={errorBoxStyle}><AlertTriangle size={14} /> {error}</div>
                )}
              </div>
            )}

            {/* Domain attached */}
            {domain && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 15, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {domain.domain}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: isVerified ? '#dcfce7' : '#fef3c7', color: isVerified ? '#15803d' : '#92400e' }}>
                    {isVerified ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                    {isVerified ? 'Verified & live' : 'Waiting for DNS'}
                  </span>
                </div>

                {/* VERIFIED */}
                {isVerified && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 10px' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PartyPopper size={22} color="#16a34a" />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: '#15803d' }}>You&rsquo;re live!</div>
                        <div style={{ fontSize: 13, color: '#475569' }}>Your blog now loads on your own domain over HTTPS.</div>
                      </div>
                    </div>
                    <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
                       style={{ ...primaryBtnStyle, textDecoration: 'none', justifyContent: 'center', width: '100%', marginTop: 4, boxSizing: 'border-box' }}>
                      Visit my blog <ExternalLink size={14} />
                    </a>
                    <button onClick={handleRemove} style={{ ...linkDangerStyle, marginTop: 12 }}>
                      <Trash2 size={12} /> Disconnect this domain
                    </button>
                  </div>
                )}

                {/* PENDING */}
                {!isVerified && (
                  <div>
                    <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '10px 0 14px' }}>
                      Add {records.length === 1 ? 'this record' : `these ${records.length || ''} records`} at the company where you
                      bought your domain (GoDaddy, Namecheap, Cloudflare&hellip;). For each one: tap <strong>Copy</strong>,
                      then paste it in the matching box. That&rsquo;s the whole job &mdash; copy, paste.
                    </p>

                    {records.length === 0 && (
                      <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '1px dashed #cbd5e1', borderRadius: 10, marginBottom: 12 }}>
                        <Loader2 size={16} className="spin" style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        Generating your records&hellip; (give it a few seconds, then tap &ldquo;check now&rdquo;)
                      </div>
                    )}

                    {records.map((rec, idx) => {
                      const t = recType(rec);
                      const nm = recName(rec);
                      const vl = recValue(rec);
                      const whatKey = `rec-${idx}`;
                      const isOpen = !!expanded[whatKey];
                      const what = WHAT_IS[t] || WHAT_IS.CNAME;
                      return (
                        <div key={idx} style={recCardStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                            <div style={recNumStyle}>{idx + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                                {what.title}
                              </div>
                            </div>
                            <span style={recTag}>{t}</span>
                          </div>

                          <div style={pasteHint}>
                            Add a record of type <strong>{t}</strong>, then paste these:
                          </div>

                          <div style={recRow}>
                            <div style={recKey}>Paste in &ldquo;Name&rdquo;</div>
                            <code style={recVal} title={nm}>{nm}</code>
                            <button onClick={() => copyVal(`${whatKey}-n`, nm)} style={copyBtn}>
                              <Copy size={11} /> {copiedKey === `${whatKey}-n` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <div style={recRow}>
                            <div style={recKey}>Paste in &ldquo;Value&rdquo;</div>
                            <code style={recVal} title={vl}>{vl}</code>
                            <button onClick={() => copyVal(`${whatKey}-v`, vl)} style={copyBtn}>
                              <Copy size={11} /> {copiedKey === `${whatKey}-v` ? 'Copied' : 'Copy'}
                            </button>
                          </div>

                          <button onClick={() => toggleWhat(whatKey)} style={whatLink}>
                            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            {isOpen ? 'Hide explanation' : "What's this?"}
                          </button>
                          {isOpen && (
                            <div style={whatBox}>
                              <div style={whatBoxTitle}><HelpCircle size={13} /> {what.title}</div>
                              <div style={whatBoxBody}>{what.body}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Provider help */}
                    <div style={helpStrip}>
                      <HelpCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <strong>Not sure where these go?</strong> These are &ldquo;DNS records&rdquo;, and you add them
                        wherever you bought your domain &mdash; look for a section called <em>DNS</em>, <em>Manage DNS</em>
                        {' '}or <em>Records</em>. Add each one exactly as shown above.
                      </div>
                    </div>

                    {/* Last error / reassurance */}
                    {domain.last_error ? (
                      <div style={{ ...errorBoxStyle, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                        <AlertTriangle size={14} /> {domain.last_error}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} /> We check automatically every few minutes. DNS can take up to an hour &mdash; you can close this page, we&rsquo;ll email you when it&rsquo;s live.
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button onClick={handleVerify} disabled={verifying} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center', opacity: verifying ? 0.7 : 1 }}>
                        {verifying ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                        {verifying ? 'Checking\u2026' : "I've added them \u2014 check now"}
                      </button>
                      <button onClick={handleRemove} style={dangerBtnStyle} title="Disconnect domain">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {error && (<div style={errorBoxStyle}><AlertTriangle size={14} /> {error}</div>)}
                  </div>
                )}
              </div>
            )}

            {/* Why-your-own-domain / secure panel */}
            <div style={{ ...cardStyle, marginTop: 4, marginBottom: 24, background: 'linear-gradient(135deg,#0a1438,#1e3a8a)', border: 'none' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ShieldCheck size={22} color="#67e8f9" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 5 }}>
                    Secure, and fully your brand
                  </div>
                  <div style={{ fontSize: 13, color: '#bcd0f0', lineHeight: 1.6 }}>
                    Once it&rsquo;s live, your blog loads on <strong style={{ color: '#67e8f9' }}>your</strong> domain over
                    HTTPS with a certificate we issue and renew automatically &mdash; the padlock is handled for you.
                    Visitors never see a SuperAdPro URL. It&rsquo;s your site; we&rsquo;re just the engine behind it.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </AppLayout>
  );
}

/* ── styles (mirrors SendingDomains.jsx) ── */
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const sectionTitle = { margin: '0 0 12px', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' };
const codeInline = { background: '#f1f5f9', color: '#0f172a', padding: '1px 6px', borderRadius: 4, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, fontWeight: 600 };
const backLinkStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: 16 };
const inputFull = { width: '100%', padding: '11px 13px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const primaryBtnStyle = { padding: '11px 20px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Sora', sans-serif", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const dangerBtnStyle = { padding: '10px 12px', border: '1px solid #fecaca', borderRadius: 9, background: '#fff', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 };
const linkDangerStyle = { background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 };
const errorBoxStyle = { marginTop: 12, padding: '8px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 };
const recCardStyle = { border: '1px solid #e6ebf3', borderRadius: 12, padding: '13px 14px', marginBottom: 10, background: '#fbfdff' };
const recNumStyle = { width: 26, height: 26, borderRadius: '50%', background: '#0ea5e9', color: '#fff', fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const recTag = { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, fontWeight: 600, color: '#475569', background: '#eef2f8', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, flexShrink: 0 };
const pasteHint = { fontSize: 12, color: '#0c4a6e', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '7px 10px', margin: '0 0 10px', lineHeight: 1.5 };
const recRow = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 };
const recKey = { fontSize: 10.5, fontWeight: 700, color: '#475569', width: 96, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em' };
const recVal = { flex: 1, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, color: '#0f172a', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const copyBtn = { flexShrink: 0, background: '#0a1438', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 };
const whatLink = { background: 'none', border: 'none', color: '#0ea5e9', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 0 0', marginTop: 3 };
const whatBox = { marginTop: 9, background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #6366f1', borderRadius: 8, padding: '11px 13px' };
const whatBoxTitle = { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: '#6366f1', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 };
const whatBoxBody = { fontSize: 12, color: '#475569', lineHeight: 1.6 };
const helpStrip = { display: 'flex', gap: 9, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginTop: 13, fontSize: 12.5, color: '#92400e', lineHeight: 1.5 };
