import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';

var PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', svg: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>' },
  { key: 'x',         label: 'X',         color: '#000000', svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', svg: '<path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>' },
  { key: 'instagram', label: 'Instagram', color: '#E4405F', svg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>' },
  { key: 'tiktok',    label: 'TikTok',    color: '#010101', svg: '<path d="M448 209.9a210.1 210.1 0 01-122.8-39.3v178.8A162.6 162.6 0 11185 188.3v89.9a74.6 74.6 0 1052.2 71.2V0h88a121 121 0 00122.8 121v88.9z"/>', vb: '0 0 448 512' },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000', svg: '<path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6C14.9 167 14.9 256 14.9 256s0 89 11.4 131.9c6.3 23.7 24.8 42.3 48.3 48.6C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.9 48.3-48.6 11.4-42.9 11.4-131.9 11.4-131.9s0-89-11.4-131.9zM232.2 337.6V174.4L374.9 256l-142.7 81.6z"/>', vb: '0 0 576 512' },
  { key: 'whatsapp',  label: 'WhatsApp',  color: '#25D366', svg: '<path d="M12.04 2a9.94 9.94 0 00-8.48 15.18L2 22l4.97-1.31A9.94 9.94 0 1012.04 2z"/>' },
  { key: 'telegram',  label: 'Telegram',  color: '#26A5E4', svg: '<path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z"/>', vb: '0 0 496 512' },
  { key: 'reddit',    label: 'Reddit',    color: '#FF4500', svg: '<path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM8.5 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7-1.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12 18c-2 0-3.5-.8-4-2h8c-.5 1.2-2 2-4 2z"/>' },
  { key: 'pinterest', label: 'Pinterest', color: '#E60023', svg: '<path d="M12 2a10 10 0 00-3.64 19.33c-.1-.85-.18-2.16.04-3.09l.59-2.52s-.44-.88-.44-2.18c0-2.04 1.18-3.57 2.66-3.57 1.25 0 1.86.94 1.86 2.07 0 1.26-.8 3.14-1.22 4.89-.35 1.47.74 2.66 2.18 2.66 2.62 0 4.63-2.76 4.63-6.74 0-3.52-2.53-5.99-6.14-5.99z"/>' },
  { key: 'email',     label: 'Email',     color: '#6366f1', svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>', isStroke: true },
  { key: 'snapchat',  label: 'Snapchat',  color: '#FFFC00', svg: '<path d="M12 2C6.48 2 4 5 4 8c0 1.5.5 2.5 1 3-.5.3-1.5.5-1.5 1s1 1 2 1.2c-.2.8-.5 1.5-1.2 2.3.8.2 1.5.3 2.2-.2.5 1 1.5 2 3.5 2.2-.3.5-.5 1.2-.5 1.5h5c0-.3-.2-1-.5-1.5 2-.2 3-1.2 3.5-2.2.7.5 1.4.4 2.2.2-.7-.8-1-1.5-1.2-2.3 1-.2 2-.2 2-1.2s-1-.7-1.5-1c.5-.5 1-1.5 1-3 0-3-2.48-6-8-6z"/>', dark: true },
];

var TONES = ['Professional', 'Casual', 'Hype', 'Story', 'Educational'];

var SHARE_URLS = {
  facebook: function(link, text) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link) + '&quote=' + encodeURIComponent(text); },
  x: function(link, text) { return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text); },
  linkedin: function(link) { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link); },
  whatsapp: function(link, text) { return 'https://wa.me/?text=' + encodeURIComponent(text); },
  telegram: function(link, text) { return 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text); },
  reddit: function(link) { return 'https://www.reddit.com/submit?url=' + encodeURIComponent(link) + '&title=' + encodeURIComponent('SuperAdPro — Earn from Video Advertising'); },
  email: function(link, text) { return 'mailto:?subject=' + encodeURIComponent('Check out SuperAdPro') + '&body=' + encodeURIComponent(text); },
  pinterest: function(link, text) { return 'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(link) + '&description=' + encodeURIComponent(text); },
};

export default function Affiliate() {
  var { user } = useAuth();
  var [platform, setPlatform] = useState('facebook');
  var [tone, setTone] = useState('Professional');
  var [niche, setNiche] = useState('');
  var [generating, setGenerating] = useState(false);
  var [post, setPost] = useState('');
  var [copied, setCopied] = useState(false);
  var [postCopied, setPostCopied] = useState(false);

  var refLink = 'https://www.superadpro.com/ref/' + (user ? user.username : '');
  var selected = PLATFORMS.find(function(p) { return p.key === platform; }) || PLATFORMS[0];

  function copyRef() { navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(function() { setCopied(false); }, 2000); }

  function generate() {
    setGenerating(true); setPost('');
    apiPost('/api/social-posts/generate', {
      topic: 'SuperAdPro — earn by watching video ads and building an affiliate network',
      platform: platform, tone: tone.toLowerCase(), niche: niche || 'affiliate marketing',
      link: refLink, goal: 'drive signups through referral link'
    }).then(function(r) { setPost(r.posts || r.result || r.content || ''); setGenerating(false); })
      .catch(function(e) { setPost('Error: ' + (e.message || 'Generation failed')); setGenerating(false); });
  }

  function shareNow() {
    var text = post || 'Check out SuperAdPro — earn real income from video advertising! ' + refLink;
    var fn = SHARE_URLS[platform];
    if (fn) { window.open(fn(refLink, text), '_blank'); }
    else { navigator.clipboard.writeText(text); setPostCopied(true); setTimeout(function() { setPostCopied(false); }, 2000); }
  }

  return (
    <AppLayout title="Social Share">
    <div style={{ fontFamily: "'DM Sans','Rethink Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a103d, #2d1b69)', padding: '20px 24px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: "'Sora','Rethink Sans',sans-serif" }}>Social Share</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>Generate AI posts and share your referral link across social media</div>
      </div>
      {/* Referral link bar */}
      <div style={{ background: 'linear-gradient(180deg, #2d1b69, #1a103d)', padding: '0 24px 14px' }}>
        <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>Your link</span>
          <span style={{ flex: 1, fontSize: 12, color: '#22d3ee', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{refLink}</span>
          <button onClick={copyRef} style={{ background: 'rgba(34,211,238,.15)', color: '#22d3ee', padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>

      {/* Workspace */}
      <div style={{ display: 'flex', minHeight: 500, background: '#f1f5f9' }}>
        {/* Left panel */}
        <div style={{ width: 380, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0', padding: 22, overflowY: 'auto' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Generate a post</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>AI creates platform-optimised posts with your referral link.</div>

          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Platform</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 18 }}>
            {PLATFORMS.map(function(p) {
              var on = platform === p.key;
              return (
                <div key={p.key} onClick={function() { setPlatform(p.key); setPost(''); }}
                  style={{ padding: '14px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer', transition: 'all .15s',
                    border: on ? '2px solid ' + p.color : '1.5px solid #e2e8f0',
                    background: on ? p.color + (p.dark ? '20' : '') : '#fff',
                    boxShadow: on ? '0 4px 12px ' + p.color + '30' : 'none',
                    transform: on ? 'scale(1.04)' : 'scale(1)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, margin: '0 auto 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: on ? 'rgba(255,255,255,.2)' : p.color + '12' }}>
                    <svg width="22" height="22" viewBox={p.vb || '0 0 24 24'}
                      fill={p.isStroke ? 'none' : (on ? '#fff' : p.color)}
                      stroke={p.isStroke ? (on ? '#fff' : p.color) : 'none'} strokeWidth={p.isStroke ? '2' : '0'}
                      style={{ display: 'block' }}
                      dangerouslySetInnerHTML={{ __html: p.svg }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: on ? 700 : 500, color: on ? (p.dark ? '#0f172a' : '#fff') : '#475569' }}>{p.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Tone</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {TONES.map(function(t) {
              var on = tone === t;
              return <button key={t} onClick={function() { setTone(t); }} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: on ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', border: on ? '1px solid #93c5fd' : '1px solid #e2e8f0', background: on ? '#eff6ff' : '#f8fafc', color: on ? '#2563eb' : '#64748b', transition: 'all .15s' }}>{t}</button>;
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Your niche (optional)</div>
          <input value={niche} onChange={function(e) { setNiche(e.target.value); }}
            placeholder="e.g. fitness, crypto, travel..."
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 12px', fontSize: 13, fontFamily: 'inherit', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', color: '#1e293b' }} />

          <button onClick={generate} disabled={generating}
            style={{ width: '100%', marginTop: 20, padding: 13, background: generating ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', opacity: generating ? 0.7 : 1, transition: 'all .2s' }}>
            {generating ? 'Generating...' : 'Generate for ' + selected.label}
          </button>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Generated post</div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {generating ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'ssspin .8s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 13, color: '#64748b' }}>Writing your {selected.label} post...</div>
                </div>
              </div>
            ) : post ? (
              <>
                <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: "'DM Sans',sans-serif", fontSize: 13, lineHeight: 1.7, color: '#334155', margin: 0 }}>{post}</pre>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
                  <button onClick={function() { navigator.clipboard.writeText(post); setPostCopied(true); setTimeout(function() { setPostCopied(false); }, 2000); }}
                    style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid #e2e8f0', background: postCopied ? '#dcfce7' : '#f8fafc', color: postCopied ? '#16a34a' : '#475569', fontFamily: 'inherit' }}>
                    {postCopied ? 'Copied!' : '📋 Copy Post'}
                  </button>
                  <button onClick={generate} disabled={generating}
                    style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontFamily: 'inherit' }}>
                    ↻ Regenerate
                  </button>
                  <button onClick={shareNow}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: selected.color, color: selected.dark ? '#333' : '#fff', fontFamily: 'inherit', transition: 'all .15s' }}>
                    Share to {selected.label}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>Your post will appear here</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, maxWidth: 280 }}>Pick a platform, choose a tone, and generate. Then copy or share directly.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{'@keyframes ssspin{to{transform:rotate(360deg)}}'}</style>
    </div>
    </AppLayout>
  );
}
