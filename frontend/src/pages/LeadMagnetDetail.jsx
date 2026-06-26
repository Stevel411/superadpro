import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import {
  Copy, Check, ExternalLink, FileText, Users, ArrowRight, Info, Lock,
} from 'lucide-react';

// Per-magnet detail / share page. Reached from the Lead Magnets library via
// "Manage". Shows the member's shareable opt-in link, how the magnet works,
// the asset to preview, and their live captured-lead count.

const card = { background: 'var(--sap-bg-card)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-xl)', boxShadow: 'var(--sap-shadow-md)', padding: '20px 22px' };
const btn = { fontFamily: 'var(--sap-font-body)', fontWeight: 600, fontSize: 13, padding: '10px 15px', borderRadius: 'var(--sap-radius-md)', border: '1px solid var(--sap-border-light)', background: 'var(--sap-bg-card)', color: 'var(--sap-text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' };
const btnPri = { ...btn, background: 'var(--sap-accent)', color: '#fff', borderColor: 'var(--sap-accent)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' };

export default function LeadMagnetDetail() {
  const { key } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    apiGet('/api/lead-magnets').then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function showToast(msg) { setToast(msg); window.clearTimeout(window.__lmdT); window.__lmdT = window.setTimeout(() => setToast(''), 2200); }

  const m = ((data && data.magnets) || []).find((x) => x.key === key);
  const url = (m && m.share_url) || '';
  const display = url.replace(/^https?:\/\//, '');

  function copyLink() {
    const done = () => { setCopied(true); showToast('Link copied to clipboard'); window.setTimeout(() => setCopied(false), 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(done); else done();
  }
  const open = (u) => window.open(u, '_blank', 'noopener');
  const shareWhatsApp = () => open('https://wa.me/?text=' + encodeURIComponent('Free: ' + (m ? m.title : 'course') + ' → ' + url));
  const shareFacebook = () => open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url));
  const shareX = () => open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Free: ' + (m ? m.title : 'course')) + '&url=' + encodeURIComponent(url));
  const shareEmail = () => { window.location.href = 'mailto:?subject=' + encodeURIComponent('A free course for you') + '&body=' + encodeURIComponent('Grab it free here: ' + url); };

  if (loading) {
    return <AppLayout categoryBack={{ to: '/my-marketing/lead-magnets', label: 'Lead Magnets' }} title="Lead magnet"><div style={{ padding: '40px', textAlign: 'center', color: 'var(--sap-text-secondary)' }}>Loading…</div></AppLayout>;
  }
  if (!m || m.status !== 'live') {
    return (
      <AppLayout categoryBack={{ to: '/my-marketing/lead-magnets', label: 'Lead Magnets' }} title="Lead magnet">
        <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', color: 'var(--sap-text-secondary)' }}>
          <Lock size={28} style={{ color: 'var(--sap-text-faint)', marginBottom: 10 }} />
          <p>This lead magnet isn’t available yet.</p>
        </div>
      </AppLayout>
    );
  }

  const steps = [
    { t: 'Share your link', d: 'Post it anywhere — social, email, your link-in-bio.' },
    { t: 'They get the free course', d: 'Visitors enter their email and the PDF lands in their inbox instantly.' },
    { t: 'They join your list', d: 'Every lead lands in your list, and your follow-up sequence nurtures them for you.' },
  ];

  return (
    <AppLayout categoryBack={{ to: '/my-marketing/lead-magnets', label: 'Lead Magnets' }}
               title={m.title} subtitle="Share your link — every signup joins your list automatically">
      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'var(--sap-text-primary)', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 999, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--sap-shadow-md)' }}>
          <Check size={15} style={{ color: 'var(--sap-accent-light, #38bdf8)' }} /> {toast}
        </div>
      ) : null}

      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        <div style={{ ...card, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <div style={{ width: 100, height: 132, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(160deg,#0a1438 0%,#15346b 55%,#0ea5e9 130%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 22px rgba(10,20,56,0.28)' }}>
            <span style={{ fontFamily: 'var(--sap-font-mono)', fontSize: 8, letterSpacing: '0.1em', color: '#9ff0ff', border: '1px solid rgba(125,211,238,0.4)', padding: '2px 6px', borderRadius: 999, alignSelf: 'flex-start', marginBottom: 7 }}>{m.badge}</span>
            <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 800, fontSize: 17, lineHeight: 1.04 }}>{m.cover_title}</div>
          </div>
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: 17 }}>{m.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--sap-text-secondary)', margin: '3px 0 16px' }}>{m.desc}</div>
            <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your shareable page</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ flex: 1, minWidth: 210, background: 'var(--sap-bg-elevated)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-md)', padding: '11px 13px', fontFamily: 'var(--sap-font-mono)', fontSize: 13, color: 'var(--sap-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
              <button style={btnPri} onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied!' : 'Copy link'}</button>
              <button style={btn} onClick={() => open(url)}><ExternalLink size={15} /> Open</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
              <button style={{ ...btn, color: 'var(--sap-text-secondary)' }} onClick={shareWhatsApp}>WhatsApp</button>
              <button style={{ ...btn, color: 'var(--sap-text-secondary)' }} onClick={shareFacebook}>Facebook</button>
              <button style={{ ...btn, color: 'var(--sap-text-secondary)' }} onClick={shareX}>X</button>
              <button style={{ ...btn, color: 'var(--sap-text-secondary)' }} onClick={shareEmail}>Email</button>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Info size={16} style={{ color: 'var(--sap-accent)' }} /> How it works</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ flex: 1, minWidth: 160 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sap-accent-bg, #e8f6fe)', color: 'var(--sap-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: 13, marginBottom: 9 }}>{i + 1}</div>
                <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>{s.t}</div>
                <div style={{ fontSize: 12.5, color: 'var(--sap-text-secondary)', lineHeight: 1.45 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginTop: 14 }}>
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 14 }}>See what you’re giving away</div>
              <div style={{ fontSize: 12.5, color: 'var(--sap-text-secondary)', marginTop: 2 }}>Preview or download the course PDF.</div>
            </div>
            <button style={btn} onClick={() => open(m.pdf_url)}><FileText size={15} /> View</button>
          </div>
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--sap-accent-bg, #e8f6fe)', color: 'var(--sap-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={20} /></span>
              <div>
                <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 14 }}>Your captured leads</div>
                <div style={{ fontSize: 12.5, color: 'var(--sap-text-secondary)', marginTop: 2 }}><b style={{ color: 'var(--sap-green)', fontFamily: 'var(--sap-font-heading)' }}>{(m.lead_count || 0).toLocaleString()} leads</b> in this list so far.</div>
              </div>
            </div>
            <button style={btn} onClick={() => window.location.assign('/pro/leads')}><ArrowRight size={15} /> Open</button>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--sap-text-faint)', textAlign: 'center' }}>
          Your link automatically tags every lead to you. Powered by SuperAdPro.
        </div>
      </div>
    </AppLayout>
  );
}
