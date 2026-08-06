import React, { useState, useEffect } from 'react';
import AlShell from '../components/layout/AlShell';

// AdvantageLife — Daily Sales Post. A fresh, ready-to-post marketing message
// every day, personalised with the member's Test Drive link (which renders a
// rich OG preview when posted). Same share experience as Daily Wisdom: mobile
// fires the native sheet, desktop opens a social chooser. Lives in My Marketing.

const CSS = `
.al .dsp{max-width:760px;margin:0 auto;padding:4px 2px 40px}
.al .dsp .hero{margin-bottom:22px}
.al .dsp .eyebrow{font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#c8102e;margin-bottom:10px}
.al .dsp h1{font-weight:900;font-size:clamp(28px,4vw,40px);letter-spacing:-1.3px;line-height:1.05;color:#0a1f52;margin:0 0 8px}
.al .dsp .hp{font-size:15px;font-weight:600;color:#5a6584;line-height:1.55;max-width:560px}
.al .dsp .tcard{background:#fff;border-radius:22px;box-shadow:0 20px 46px -24px rgba(200,16,46,.32);border:1.5px solid #f7c1cb;padding:24px;margin-bottom:30px}
.al .dsp .th{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.al .dsp .theme{font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#12388f;background:#eef1fb;padding:6px 12px;border-radius:20px}
.al .dsp .tag{margin-left:auto;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:#c8102e;padding:5px 11px;border-radius:20px}
.al .dsp .ptext{font-size:16.5px;font-weight:600;color:#0a1f52;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.al .dsp .btns{display:flex;gap:10px;margin-top:20px}
.al .dsp .shareb{flex:1;background:#c8102e;color:#fff;border:none;border-radius:12px;padding:15px;font-weight:900;font-size:15px;cursor:pointer;transition:.16s;box-shadow:0 12px 26px -12px rgba(200,16,46,.6);display:flex;align-items:center;justify-content:center;gap:9px}
.al .dsp .shareb:hover{background:#b00d27}
.al .dsp .shareb svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.al .dsp .cpq{background:#0a1f52;color:#fff;border:none;border-radius:12px;padding:15px 20px;font-weight:900;font-size:15px;cursor:pointer;transition:.16s}
.al .dsp .cpq:hover{background:#0e2a6e}
.al .dsp .mh{font-size:13px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#8a97b8;margin:0 2px 14px}
.al .dsp .mcard{background:#fff;border-radius:16px;border:1.5px solid #eef1f8;padding:18px 20px;margin-bottom:12px;display:flex;align-items:flex-start;gap:16px}
.al .dsp .mcard .mbody{flex:1;min-width:0}
.al .dsp .mtheme{font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#12388f;margin-bottom:6px}
.al .dsp .mtext{font-size:14px;font-weight:600;color:#3a4667;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.al .dsp .msh{flex:none;background:#c8102e;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:900;font-size:13px;cursor:pointer;transition:.16s;display:flex;align-items:center;gap:7px}
.al .dsp .msh:hover{background:#b00d27}
.al .dsp .msh svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.al .dsp .tip{font-size:12px;font-weight:600;color:#8a97b8;margin:22px 2px 4px;line-height:1.55}
@media(max-width:560px){.al .dsp .mcard{flex-direction:column;gap:12px}.al .dsp .msh{align-self:flex-start}}
`;

const ShareIcon = <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.7" x2="15.4" y2="6.3"/><line x1="8.6" y1="13.3" x2="15.4" y2="17.7"/></svg>;

export default function DailySalesPost() {
  const [today, setToday] = useState(null);
  const [lib, setLib] = useState([]);
  const [tryLink, setTryLink] = useState('');
  const [shareFor, setShareFor] = useState(null);   // desktop chooser: {text, url}
  const [toast, setToast] = useState('');

  useEffect(function () {
    fetch('/api/al/sales-post/today').then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) { setToday(d); if (d.try_link) setTryLink(d.try_link); } }).catch(function () {});
    fetch('/api/al/sales-post/library').then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) { setLib(d.posts || []); if (d.try_link) setTryLink(d.try_link); } }).catch(function () {});
  }, []);

  function flash(msg) { setToast(msg); setTimeout(function () { setToast(''); }, 2500); }

  // Mobile: native share sheet (Instagram/WhatsApp/Messages/X appear). Desktop:
  // the native sheet is useless for social, so open a social chooser instead —
  // it posts the /try link, which previews the image automatically.
  function openShare(text) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isMobile && navigator.share) {
      navigator.share({ text: text }).catch(function () {});
    } else {
      if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(function () {}); }
      setShareFor({ text: text, url: tryLink });
    }
  }

  return (
    <AlShell active="marketing">
      <style>{CSS}</style>

      {shareFor && (
        <div onClick={function () { setShareFor(null); }}
             style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,56,.5)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={function (e) { e.stopPropagation(); }}
               style={{ background: '#fff', borderRadius: 16, maxWidth: 400, width: '100%', padding: '26px 26px 22px', boxShadow: '0 24px 60px rgba(10,20,56,.3)' }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#0a1f52', marginBottom: 6 }}>Share this post</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 18 }}>
              We copied the post for you. Pick where to share &mdash; the link shows a preview image, and anyone who joins comes back to you.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <a href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareFor.url)} target="_blank" rel="noopener noreferrer"
                 onClick={function () { setShareFor(null); }}
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', borderRadius: 10, background: '#1877f2', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 13.5 }}>Facebook</a>
              <a href={'https://wa.me/?text=' + encodeURIComponent(shareFor.text)} target="_blank" rel="noopener noreferrer"
                 onClick={function () { setShareFor(null); }}
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', borderRadius: 10, background: '#25d366', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 13.5 }}>WhatsApp</a>
              <a href={'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareFor.text)} target="_blank" rel="noopener noreferrer"
                 onClick={function () { setShareFor(null); }}
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', borderRadius: 10, background: '#0a1f52', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 13.5 }}>Post to X</a>
              <button onClick={function () { if (navigator.clipboard) { navigator.clipboard.writeText(shareFor.text); } setShareFor(null); flash('Post copied \u2014 paste it anywhere'); }}
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', borderRadius: 10, background: '#f1f5f9', color: '#0a1f52', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13.5, fontFamily: 'inherit' }}>Copy post</button>
            </div>
            <button onClick={function () { setShareFor(null); }}
               style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 9, background: 'none', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Done</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: '#0a1f52', color: '#fff', padding: '12px 20px', borderRadius: 11, fontSize: 13.5, fontWeight: 700, boxShadow: '0 14px 34px -12px rgba(10,31,82,.55)', zIndex: 80, maxWidth: '90vw', textAlign: 'center' }}>{toast}</div>
      )}

      <div className="dsp">
        <div className="hero">
          <div className="eyebrow">My Marketing · Daily Sales Post</div>
          <h1>Today&rsquo;s post is ready.</h1>
          <p className="hp">A fresh message every day, with your Test Drive link already built in &mdash; and it shows a preview image when you post it. Tap share, pick where. That&rsquo;s the whole job.</p>
        </div>

        {today && (
          <div className="tcard">
            <div className="th"><span className="theme">{today.theme}</span><span className="tag">Today</span></div>
            <div className="ptext">{today.text}</div>
            <div className="btns">
              <button className="shareb" onClick={function () { openShare(today.text); }}>{ShareIcon} Share this post</button>
              <button className="cpq" onClick={function () { if (navigator.clipboard) { navigator.clipboard.writeText(today.text); } flash('Post copied \u2014 paste it anywhere'); }}>Copy</button>
            </div>
          </div>
        )}

        {lib.filter(function (p) { return !p.is_today; }).length > 0 && (
          <div>
            <div className="mh">More you can post any time</div>
            {lib.filter(function (p) { return !p.is_today; }).map(function (p) {
              return (
                <div className="mcard" key={p.index}>
                  <div className="mbody">
                    <div className="mtheme">{p.theme}</div>
                    <div className="mtext">{p.text}</div>
                  </div>
                  <button className="msh" onClick={function () { openShare(p.text); }}>{ShareIcon} Share</button>
                </div>
              );
            })}
            <div className="tip">A new post lands here every day. Share whichever you like &mdash; sending real people to try it is what grows your team.</div>
          </div>
        )}
      </div>
    </AlShell>
  );
}
