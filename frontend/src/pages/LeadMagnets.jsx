import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import { apiGet } from '../utils/api';
import { Copy, Check, SlidersHorizontal, Lock, Library } from 'lucide-react';

// Lead Magnets library — the member's home for free done-for-you giveaways.
// Each live magnet (from /api/lead-magnets) auto-provisions a personal opt-in
// page + leads list + nurture sequence. Reached from the Marketing Hub.

function Cover({ m, height }) {
  if (m.cover_title) {
    const email = m.cover === 'email';
    const attraction = m.cover === 'attraction';
    const grad = attraction
      ? 'linear-gradient(150deg,#0a1f52 0%,#2d1b69 52%,#0e2a6e 145%)'
      : email
      ? 'linear-gradient(150deg,#0a1f52 0%,#163a66 52%,#16a34a 145%)'
      : 'linear-gradient(150deg,#0a1f52 0%,#15346b 55%,#c8102e 135%)';
    const blob = attraction ? 'rgba(167,139,250,0.20)' : email ? 'rgba(232,32,63,0.18)' : 'rgba(125,211,238,0.16)';
    return (
      <div style={{ height, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 14, color: '#fff', background: grad }}>
        <div style={{ position: 'absolute', top: -34, right: -30, width: 110, height: 110, borderRadius: '50%', background: blob }} />
        {m.badge && <span style={{ position: 'absolute', top: 12, left: 14, fontFamily: 'var(--sap-font-mono)', fontSize: 9, letterSpacing: '0.08em', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', padding: '3px 9px', borderRadius: 999 }}>{m.badge}</span>}
        <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 800, fontSize: 21, lineHeight: 1.03, position: 'relative', zIndex: 1 }}>{m.cover_title}</div>
      </div>
    );
  }
  return <div style={{ height, background: 'var(--sap-bg-hover)' }} />;
}

function Stat({ value, label, money }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: 'var(--sap-bg-card)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-lg)', padding: '14px 16px', boxShadow: 'var(--sap-shadow-sm)' }}>
      <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: money ? 'var(--sap-green)' : 'var(--sap-text-primary)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--sap-text-secondary)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

const btn = (variant) => ({
  flex: 1, fontFamily: 'var(--sap-font-body)', fontWeight: 600, fontSize: 13, padding: '10px 12px',
  borderRadius: 'var(--sap-radius-md)', cursor: variant === 'soon' ? 'default' : 'pointer',
  border: '1px solid var(--sap-border-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  background: variant === 'pri' ? 'var(--sap-accent)' : (variant === 'soon' ? 'transparent' : 'var(--sap-bg-card)'),
  color: variant === 'pri' ? '#fff' : (variant === 'soon' ? 'var(--sap-text-faint)' : 'var(--sap-text-primary)'),
  borderColor: variant === 'pri' ? 'var(--sap-accent)' : 'var(--sap-border-light)',
  boxShadow: variant === 'pri' ? '0 2px 8px rgba(200,16,46,0.3)' : 'none',
});

export default function LeadMagnets() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    apiGet('/api/lead-magnets').then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__lmToast);
    window.__lmToast = window.setTimeout(() => setToast(''), 2200);
  }
  function copyLink(m) {
    const url = m.share_url || '';
    const done = () => { setCopiedKey(m.key); showToast('Link copied to clipboard'); window.setTimeout(() => setCopiedKey(null), 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(done);
    else done();
  }

  const magnets = (data && data.magnets) || [];
  const live = magnets.filter((m) => m.status === 'live');
  const totalLeads = live.reduce((s, m) => s + (m.lead_count || 0), 0);

  const comingSoon = [0];

  return (
    <AlShell active="marketing" back={{ to: '/my-marketing', label: 'My Marketing' }}>
      <div style={{background:'#0a1f52',borderRadius:20,color:'#fff',padding:'22px 26px',boxShadow:'0 24px 50px -28px rgba(10,31,82,.55)',marginBottom:18,display:'flex',alignItems:'center',gap:15}}>
        <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(120deg,#c8102e,#e8203f)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/><path d="M12 8S9.5 3 7 4.5 9 8 12 8zM12 8s2.5-5 5-3.5S15 8 12 8z"/></svg>
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:23,letterSpacing:-.6}}>Lead Magnets</div>
          <div style={{fontSize:13.5,color:'#c9d6f7',fontWeight:600,marginTop:2}}>Free done-for-you giveaways you can share to grow your list.</div>
        </div>
      </div>
      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'var(--sap-text-primary)', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 999, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--sap-shadow-md)' }}>
          <Check size={15} style={{ color: 'var(--sap-accent-light, #e8203f)' }} /> {toast}
        </div>
      ) : null}

      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--sap-font-mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--sap-accent)', background: 'var(--sap-accent-bg, #e8f6fe)', border: '1px solid var(--sap-border-light)', padding: '5px 11px', borderRadius: 999, marginBottom: 12 }}>
            <Library size={13} /> Your library · grows over time
          </span>
          <p style={{ fontSize: 14, color: 'var(--sap-text-secondary)', maxWidth: 600 }}>
            Pick a magnet, share your link, and every signup joins your list — and your follow-up sequence — automatically.
          </p>
        </div>

        {!loading && (
          <div style={{ display: 'flex', gap: 12, margin: '0 0 18px', flexWrap: 'wrap' }}>
            <Stat value={live.length} label="Lead magnets live" />
            <Stat value={totalLeads.toLocaleString()} label="Leads captured" money />
            <Stat value={live.length} label="Auto follow-up sequences" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {live.map((m) => (
            <div key={m.key} style={{ background: 'var(--sap-bg-card)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-xl)', boxShadow: 'var(--sap-shadow-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Cover m={m} height={128} />
              <div style={{ padding: '16px 17px 17px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: 16 }}>{m.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--sap-text-secondary)', margin: '4px 0 12px', lineHeight: 1.45, flex: 1 }}>{m.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--sap-text-secondary)', marginBottom: 14 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sap-green)' }} />
                  <b style={{ color: 'var(--sap-text-primary)', fontFamily: 'var(--sap-font-heading)', fontWeight: 700 }}>{(m.lead_count || 0).toLocaleString()}</b> leads captured · <span style={{ color: 'var(--sap-accent)' }}>Live</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn('pri')} onClick={() => copyLink(m)}>
                    {copiedKey === m.key ? <Check size={15} /> : <Copy size={15} />} {copiedKey === m.key ? 'Copied!' : 'Copy link'}
                  </button>
                  <button style={btn()} onClick={() => navigate(m.manage_path)}>
                    <SlidersHorizontal size={15} /> Manage
                  </button>
                </div>
              </div>
            </div>
          ))}

          {comingSoon.map((i) => (
            <div key={'soon' + i} style={{ background: '#f7faff', border: '1.5px dashed #cdd9ea', borderRadius: 'var(--sap-radius-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 128, background: 'var(--sap-bg-page, #eef3fb)', color: 'var(--sap-text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1.5px dashed #dde6f2' }}>
                <Lock size={30} />
              </div>
              <div style={{ padding: '16px 17px 17px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--sap-text-secondary)' }}>New lead magnet</div>
                <div style={{ fontSize: 12.5, color: 'var(--sap-text-faint)', margin: '4px 0 12px', lineHeight: 1.45, flex: 1 }}>More free done-for-you giveaways are on the way — each one a ready-to-share page that builds your list.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--sap-text-faint)', marginBottom: 14 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sap-text-faint)' }} /> Coming soon
                </div>
                <div style={{ display: 'flex', gap: 8 }}><button style={btn('soon')} disabled>Coming soon</button></div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 12.5, color: 'var(--sap-text-faint)', textAlign: 'center' }}>
          Every lead magnet tags signups to you automatically and feeds your own list.
        </div>
      </div>
    </AlShell>
  );
}
