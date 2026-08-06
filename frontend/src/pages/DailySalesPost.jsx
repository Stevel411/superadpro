import React, { useState, useEffect } from 'react';
import AlShell from '../components/layout/AlShell';

// AdvantageLife — Daily Sales Post. A fresh, ready-to-post marketing message
// every day, personalised with the member's Test Drive link (which renders a
// rich preview when posted). Tap → copy/share → post. Lives in My Marketing.

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
.al .dsp .cp{flex:1;background:#c8102e;color:#fff;border:none;border-radius:12px;padding:15px;font-weight:900;font-size:15px;cursor:pointer;transition:.16s;box-shadow:0 12px 26px -12px rgba(200,16,46,.6)}
.al .dsp .cp:hover{background:#b00d27}
.al .dsp .sh{background:#0a1f52;color:#fff;border:none;border-radius:12px;padding:15px 22px;font-weight:900;font-size:15px;cursor:pointer;transition:.16s}
.al .dsp .sh:hover{background:#0e2a6e}
.al .dsp .mh{font-size:13px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#8a97b8;margin:0 2px 14px}
.al .dsp .mcard{background:#fff;border-radius:16px;border:1.5px solid #eef1f8;padding:18px 20px;margin-bottom:12px;display:flex;align-items:flex-start;gap:16px}
.al .dsp .mcard .mbody{flex:1;min-width:0}
.al .dsp .mtheme{font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#12388f;margin-bottom:6px}
.al .dsp .mtext{font-size:14px;font-weight:600;color:#3a4667;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.al .dsp .mcp{flex:none;background:#f3f5fb;color:#0a1f52;border:1.5px solid #e0e6f1;border-radius:10px;padding:10px 16px;font-weight:900;font-size:13px;cursor:pointer;transition:.16s}
.al .dsp .mcp:hover{background:#0a1f52;color:#fff;border-color:#0a1f52}
.al .dsp .tip{font-size:12px;font-weight:600;color:#8a97b8;margin:22px 2px 4px;line-height:1.55}
@media(max-width:560px){.al .dsp .mcard{flex-direction:column;gap:12px}.al .dsp .mcp{align-self:flex-start}}
`;

export default function DailySalesPost() {
  const [today, setToday] = useState(null);
  const [lib, setLib] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetch('/api/al/sales-post/today').then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) setToday(d); }).catch(function () {});
    fetch('/api/al/sales-post/library').then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) setLib(d.posts || []); }).catch(function () {});
  }, []);

  function copy(text, id) {
    try {
      navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(function () { setCopied(null); }, 1800);
    } catch (e) {}
  }

  function share(text) {
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); }
    else { copy(text, 'today'); }
  }

  return (
    <AlShell active="marketing">
      <style>{CSS}</style>
      <div className="dsp">
        <div className="hero">
          <div className="eyebrow">My Marketing · Daily Sales Post</div>
          <h1>Today&rsquo;s post is ready.</h1>
          <p className="hp">A fresh message every day, with your Test Drive link already built in &mdash; and it shows a preview image when you post it. Tap copy, paste it wherever you like. That&rsquo;s the whole job.</p>
        </div>

        {today && (
          <div className="tcard">
            <div className="th"><span className="theme">{today.theme}</span><span className="tag">Today</span></div>
            <div className="ptext">{today.text}</div>
            <div className="btns">
              <button className="cp" onClick={function () { copy(today.text, 'today'); }}>{copied === 'today' ? 'Copied \u2713' : 'Copy post'}</button>
              <button className="sh" onClick={function () { share(today.text); }}>Share &rarr;</button>
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
                  <button className="mcp" onClick={function () { copy(p.text, p.index); }}>{copied === p.index ? 'Copied \u2713' : 'Copy'}</button>
                </div>
              );
            })}
            <div className="tip">A new post lands here every day. Post whichever you like &mdash; and remember, sending real people to try it is what grows your team.</div>
          </div>
        )}
      </div>
    </AlShell>
  );
}
