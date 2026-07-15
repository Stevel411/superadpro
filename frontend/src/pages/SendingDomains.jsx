/**
 * SendingDomains.jsx — Per-member email sending domain setup
 * ═════════════════════════════════════════════════════════════════════
 * Lives at /sending-domains. Members verify their OWN domain inside our
 * SES account so their autoresponder emails send from their own brand —
 * subscribers see them, never AdvantageLife, and each domain carries its own
 * reputation (full per-member isolation).
 *
 * Design: layered. Simple by default (an 11-year-old can follow "copy,
 * paste, three times"), with the real technical names always visible as
 * tags and a "What's this?" expander for the curious/experienced.
 *
 * Backend API (app/main.py):
 *   GET    /api/sending-domains              list + records + status + ses_ready
 *   POST   /api/sending-domains              { domain, from_name?, from_local? }
 *   POST   /api/sending-domains/{id}/verify  manual "Check now"
 *   DELETE /api/sending-domains/{id}
 * Engine: app/sending_domains.py (SES VerifyDomainDkim / GetIdentityDkimAttributes)
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import {
  Mail, CheckCircle2, AlertTriangle, Clock, Loader2, Trash2,
  Copy, RefreshCw, ArrowLeft, Lock, HelpCircle, ChevronDown, ChevronRight,
  ShieldCheck, Sparkles, PartyPopper,
} from 'lucide-react';

const STATUS_META = {
  verified: { label: 'Verified & sending', color: '#15803d', bg: '#dcfce7', Icon: CheckCircle2 },
  pending:  { label: 'Waiting for DNS',    color: '#92400e', bg: '#fef3c7', Icon: Clock },
  failed:   { label: 'Needs attention',    color: '#b91c1c', bg: '#fee2e2', Icon: AlertTriangle },
};

// The plain-English "what's this?" copy for each record kind. Hidden by
// default; revealed on tap. Honest, accurate, reassuring for migrators.
const WHAT_IS = {
  DKIM: {
    title: 'DKIM (CNAME record)',
    body: 'This adds a hidden digital signature to every email you send, so Gmail, Outlook and the rest can confirm the message genuinely came from your domain and wasn\u2019t faked. The CNAME type just points a name at our mail servers. If you\u2019ve set this up on Mailchimp or AWeber before, this is the same thing.',
  },
  SPF: {
    title: 'SPF (TXT record)',
    body: 'This tells the inbox providers that AdvantageLife is allowed to send email on behalf of your domain. Without it, your messages can be blocked or marked as spam.',
  },
  DMARC: {
    title: 'DMARC (TXT record)',
    body: 'This protects your domain from being spoofed \u2014 it stops scammers pretending to be you. We start with a safe "monitor only" policy that never blocks your own mail.',
  },
};

export default function SendingDomains() {
  const [domains, setDomains] = useState([]);
  const [sesReady, setSesReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromLocal, setFromLocal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [expanded, setExpanded] = useState({}); // { "domId-recIdx": true }

  const load = async () => {
    try {
      const res = await apiGet('/api/sending-domains');
      setDomains(res.domains || []);
      setSesReady(res.ses_ready !== false);
    } catch (e) {
      // empty state on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-poll while any domain is still pending — so the "verifying" state
  // updates itself without the member having to refresh or keep tapping.
  useEffect(() => {
    const anyPending = domains.some((d) => d.status === 'pending');
    if (!anyPending) return;
    const t = setInterval(() => { load(); }, 30000); // every 30s
    return () => clearInterval(t);
  }, [domains]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    setUpgradeRequired(false);
    try {
      const res = await apiPost('/api/sending-domains', {
        domain: newDomain.trim(),
        from_name: fromName.trim(),
        from_local: fromLocal.trim(),
      });
      if (res.error) {
        setSubmitError(res.error);
        if (res.upgrade_required) setUpgradeRequired(true);
      } else {
        setNewDomain(''); setFromName(''); setFromLocal('');
        await load();
      }
    } catch (e) {
      setSubmitError(e?.message || 'Could not add domain. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      await apiPost(`/api/sending-domains/${id}/verify`, {});
      await load();
    } catch (e) {
      // last_error reflected on reload
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id, domain) => {
    if (!window.confirm(`Remove ${domain}? You'll stop being able to send from this domain until you add it again.`)) return;
    try {
      await apiDelete(`/api/sending-domains/${id}`);
      await load();
    } catch (e) {}
  };

  const copyVal = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };

  const toggleWhat = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  return (
    <AlShell active="ai-tools" back={{ to: '/pro/leads', label: 'Email Marketing' }}>
      <div style={{background:'#0a1f52',borderRadius:22,color:'#fff',padding:'24px 28px',boxShadow:'0 24px 50px -28px rgba(10,31,82,.55)',marginBottom:16,display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:54,height:54,borderRadius:15,background:'linear-gradient(120deg,#c8102e,#e8203f)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:24,letterSpacing:-.7}}>Sending Domain</div>
          <div style={{fontSize:14,color:'#c9d6f7',fontWeight:600,marginTop:3}}>Send emails from your own brand.</div>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        <Link to="/funnels" style={backLinkStyle}>
          <ArrowLeft size={14} /> Back to tools
        </Link>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg,#c8102e,#e8203f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Mail size={24} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
              Send from your own brand
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>
              Connect a domain you own so every email comes from <strong>you</strong> &mdash; your
              subscribers see your name, never AdvantageLife. Takes about 5 minutes, and we guide every step.
            </p>
          </div>
        </div>

        {/* SES-not-ready notice (admin-side config missing) — shouldn't show
            to members in normal operation, but degrades honestly if it does. */}
        {!sesReady && (
          <div style={{ ...cardStyle, marginBottom: 16, borderColor: '#fde68a', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.55 }}>
                Email sending is being switched on. Please check back shortly &mdash; you can still add your
                domain now and we&rsquo;ll generate your records as soon as it&rsquo;s ready.
              </div>
            </div>
          </div>
        )}

        {/* Free-tier gate */}
        {upgradeRequired && (
          <div style={{ ...cardStyle, marginBottom: 16, borderColor: '#fde68a', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Lock size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#78350f', fontSize: 15, marginBottom: 4 }}>
                  Sending domains are for active members
                </div>
                <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.55, marginBottom: 10 }}>
                  Activate your membership to send from your own brand and reach your list at a flat monthly price.
                </div>
                <Link to="/pay-membership" style={{ ...primaryBtnStyle, textDecoration: 'none' }}>
                  Activate my account &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Add-domain form — only when no domain yet, or to add another */}
        {domains.length < 3 && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h2 style={sectionTitle}>Add your sending domain</h2>

            <div style={tipBox}>
              <Sparkles size={15} color="#a00d24" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Tip:</strong> use a <strong>subdomain</strong> like <code style={codeInline}>mail.yourbrand.com</code> rather
                than your main domain. It keeps your website email and your marketing email separate, which protects
                your reputation.{' '}
                <Link to="/help/sending-domain" style={{ color: '#a00d24', fontWeight: 700 }}>
                  Don&rsquo;t have a domain? Get one in 5 minutes &rarr;
                </Link>
              </div>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={fieldLabel}>Your sending domain</label>
                <input
                  type="text" value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="mail.yourbrand.com"
                  disabled={submitting} style={inputFull} autoComplete="off"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={fieldLabel}>From name (optional)</label>
                  <input
                    type="text" value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Jane Smith"
                    disabled={submitting} style={inputFull} autoComplete="off"
                  />
                </div>
                <div>
                  <label style={fieldLabel}>From address (optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <input
                      type="text" value={fromLocal}
                      onChange={(e) => setFromLocal(e.target.value)}
                      placeholder="hello"
                      disabled={submitting}
                      style={{ ...inputFull, borderTopRightRadius: 0, borderBottomRightRadius: 0, textAlign: 'right' }}
                      autoComplete="off"
                    />
                    <span style={atSuffix}>@{newDomain.trim() || 'yourbrand.com'}</span>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={submitting || !newDomain.trim()} style={{ ...primaryBtnStyle, justifyContent: 'center', width: '100%' }}>
                {submitting ? <Loader2 size={15} className="spin" /> : null}
                {submitting ? 'Setting up\u2026' : 'Continue \u2192'}
              </button>
            </form>
            {submitError && !upgradeRequired && (
              <div style={errorBoxStyle}><AlertTriangle size={14} /> {submitError}</div>
            )}
          </div>
        )}

        {/* Domains */}
        {loading && (
          <div style={{ ...cardStyle, padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Loader2 size={18} className="spin" style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Loading&hellip;
          </div>
        )}

        {!loading && domains.map((d) => {
          const meta = STATUS_META[d.status] || STATUS_META.pending;
          const StatusIcon = meta.Icon;
          const isVerifying = verifyingId === d.id;
          const records = d.dns_records || [];

          return (
            <div key={d.id} style={{ ...cardStyle, marginBottom: 16 }}>
              {/* Domain header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {d.domain}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 99,
                  background: meta.bg, color: meta.color, fontSize: 11.5, fontWeight: 700,
                }}>
                  <StatusIcon size={12} /> {meta.label}
                </span>
              </div>

              {/* ── VERIFIED STATE ── */}
              {d.status === 'verified' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 10px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PartyPopper size={22} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: '#15803d' }}>
                        You&rsquo;re verified!
                      </div>
                      <div style={{ fontSize: 13, color: '#475569' }}>
                        Your emails now send from your own brand.
                      </div>
                    </div>
                  </div>
                  <div style={fromLineStyle}>
                    From: {d.from_name || 'You'} &lt;{d.from_address}&gt;
                  </div>
                  <Link to="/pro/leads" style={{ ...primaryBtnStyle, textDecoration: 'none', justifyContent: 'center', width: '100%', marginTop: 4 }}>
                    Go to my lists &rarr;
                  </Link>
                </div>
              )}

              {/* ── PENDING / VERIFYING STATE ── */}
              {d.status !== 'verified' && (
                <div>
                  <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '6px 0 14px' }}>
                    Add these {records.length} record{records.length === 1 ? '' : 's'} at the company where you bought
                    your domain. For each one: tap <strong>Copy</strong>, then paste it in the matching box.
                    That&rsquo;s the whole job &mdash; copy, paste.
                  </p>

                  {records.length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '1px dashed #cbd5e1', borderRadius: 10, marginBottom: 12 }}>
                      <Loader2 size={16} className="spin" style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Generating your records&hellip;
                    </div>
                  )}

                  {records.map((rec, idx) => {
                    const whatKey = `${d.id}-${idx}`;
                    const isOpen = !!expanded[whatKey];
                    const what = WHAT_IS[rec.kind];
                    const recVerified = (rec.status || '').toUpperCase() === 'VERIFIED';
                    return (
                      <div key={idx} style={recCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                          <div style={recNumStyle}>{idx + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                              {rec.label || rec.kind}
                            </div>
                          </div>
                          {recVerified
                            ? <span style={recTagOk}><CheckCircle2 size={11} /> Found</span>
                            : <span style={recTag}>{rec.recordType} &middot; {rec.kind}</span>}
                        </div>

                        <div style={pasteHint}>
                          Add a record of type <strong>{rec.recordType}</strong>, then paste these:
                        </div>

                        <div style={recRow}>
                          <div style={recKey}>Paste in &ldquo;Name&rdquo;</div>
                          <code style={recVal} title={rec.name}>{rec.name}</code>
                          <button onClick={() => copyVal(`${whatKey}-n`, rec.name)} style={copyBtn}>
                            <Copy size={11} /> {copiedKey === `${whatKey}-n` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div style={recRow}>
                          <div style={recKey}>Paste in &ldquo;Value&rdquo;</div>
                          <code style={recVal} title={rec.value}>{rec.value}</code>
                          <button onClick={() => copyVal(`${whatKey}-v`, rec.value)} style={copyBtn}>
                            <Copy size={11} /> {copiedKey === `${whatKey}-v` ? 'Copied' : 'Copy'}
                          </button>
                        </div>

                        {what && (
                          <>
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
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Provider help */}
                  <div style={helpStrip}>
                    <HelpCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Not sure where these go?</strong> Pick where you bought your domain &mdash; we&rsquo;ll
                      show you exactly where to click.
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                        {['GoDaddy', 'Namecheap', 'Cloudflare', 'Google Domains', '123-Reg', 'Somewhere else'].map((p) => (
                          <Link key={p} to="/help/sending-domain" style={providerChip}>{p}</Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Last error / reassurance */}
                  {d.last_error ? (
                    <div style={{ ...errorBoxStyle, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                      <AlertTriangle size={14} /> {d.last_error}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} /> We check automatically every few minutes. DNS can take up to an hour &mdash; you can close this page, we&rsquo;ll email you when it&rsquo;s live.
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => handleVerify(d.id)} disabled={isVerifying} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>
                      {isVerifying ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                      {isVerifying ? 'Checking\u2026' : "I've added them \u2014 check now"}
                    </button>
                    <button onClick={() => handleDelete(d.id, d.domain)} style={dangerBtnStyle} title="Remove domain">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Why-your-own-domain panel */}
        <div style={{ ...cardStyle, marginTop: 4, marginBottom: 24, background: 'linear-gradient(135deg,#0a1438,#12388f)', border: 'none' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ShieldCheck size={22} color="#f5b8c2" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 5 }}>
                Why your own domain?
              </div>
              <div style={{ fontSize: 13, color: '#bcd0f0', lineHeight: 1.6 }}>
                Every email you send shows <strong style={{ color: '#f5b8c2' }}>your</strong> name and domain &mdash;
                your subscribers see you, never AdvantageLife. Your domain builds its own reputation, so the more you
                send well, the better your inbox placement gets. It&rsquo;s your list, your brand, your reputation
                &mdash; we&rsquo;re just the engine behind it.
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </AlShell>
  );
}

/* ── styles ── */
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const sectionTitle = { margin: '0 0 14px', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' };
const codeInline = { background: '#f1f5f9', color: '#0f172a', padding: '1px 6px', borderRadius: 4, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, fontWeight: 600 };
const backLinkStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: 16 };
const tipBox = { display: 'flex', gap: 9, alignItems: 'flex-start', background: '#f3f5fb', border: '1px solid #dbe4f5', borderRadius: 11, padding: '12px 14px', fontSize: 12.5, color: '#0a1f52', lineHeight: 1.55, marginBottom: 16 };
const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 };
const inputFull = { width: '100%', padding: '11px 13px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const atSuffix = { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', borderLeft: 'none', borderTopRightRadius: 9, borderBottomRightRadius: 9, padding: '11px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' };
const primaryBtnStyle = { padding: '11px 20px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#c8102e,#e8203f)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Sora', sans-serif", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const dangerBtnStyle = { padding: '10px 12px', border: '1px solid #fecaca', borderRadius: 9, background: '#fff', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 };
const errorBoxStyle = { marginTop: 12, padding: '8px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 };
const recCardStyle = { border: '1px solid #e6ebf3', borderRadius: 12, padding: '13px 14px', marginBottom: 10, background: '#fbfdff' };
const recNumStyle = { width: 26, height: 26, borderRadius: '50%', background: '#c8102e', color: '#fff', fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const recTag = { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, fontWeight: 600, color: '#475569', background: '#eef2f8', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, flexShrink: 0 };
const recTagOk = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 6, flexShrink: 0 };
const pasteHint = { fontSize: 12, color: '#0a1f52', background: '#f3f5fb', border: '1px solid #dbe4f5', borderRadius: 8, padding: '7px 10px', margin: '0 0 10px', lineHeight: 1.5 };
const recRow = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 };
const recKey = { fontSize: 10.5, fontWeight: 700, color: '#475569', width: 96, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em' };
const recVal = { flex: 1, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, color: '#0f172a', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const copyBtn = { flexShrink: 0, background: '#0a1438', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 };
const whatLink = { background: 'none', border: 'none', color: '#c8102e', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 0 0', marginTop: 3 };
const whatBox = { marginTop: 9, background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #12388f', borderRadius: 8, padding: '11px 13px' };
const whatBoxTitle = { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: '#12388f', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 };
const whatBoxBody = { fontSize: 12, color: '#475569', lineHeight: 1.6 };
const helpStrip = { display: 'flex', gap: 9, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginTop: 13, fontSize: 12.5, color: '#92400e', lineHeight: 1.5 };
const providerChip = { fontSize: 11, color: '#c8102e', border: '1px solid #cfe8f7', background: '#f3f5fb', borderRadius: 6, padding: '4px 9px', fontWeight: 600, textDecoration: 'none' };
const fromLineStyle = { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12.5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', margin: '6px 0 12px', color: '#0f172a' };
