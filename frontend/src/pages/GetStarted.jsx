import { useState, useRef, useEffect } from 'react';
import AlShell from '../components/layout/AlShell';

const CSS = `
.gs{max-width:840px}
.gs-h1{font-size:clamp(26px,4vw,36px);font-weight:900;letter-spacing:-.03em;color:#0a1f52;margin:2px 0 4px}
.gs-sub{font-size:15px;color:#5a6584;font-weight:600;margin:0 0 22px;line-height:1.5}
.gs-hero{display:flex;align-items:center;gap:16px;background:#0a1f52;border-radius:18px;padding:18px 22px;margin-bottom:20px;cursor:pointer;box-shadow:0 20px 44px -26px rgba(10,31,82,.6)}
.gs-ic{width:58px;height:58px;border-radius:50%;background:linear-gradient(120deg,#c8102e,#ff2743);display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 10px 22px -10px rgba(200,16,46,.7)}
.gs-t{flex:1;min-width:0}
.gs-t b{display:block;color:#fff;font-size:16px;font-weight:900}
.gs-t span{display:block;color:#aebcf0;font-size:13px;font-weight:600;margin-top:2px}
.gs-lang{font-size:12.5px;font-weight:800;color:#c9d6f7;background:rgba(255,255,255,.1);border-radius:9px;padding:8px 12px;flex:none}
.gs-step{background:#fff;border:1px solid #e6ecf5;border-radius:16px;padding:18px 22px;margin-bottom:12px;display:flex;gap:18px;align-items:center;box-shadow:0 12px 30px -24px rgba(10,31,82,.4)}
.gs-num{width:38px;height:38px;border-radius:10px;background:rgba(18,56,143,.1);color:#12388f;font-weight:900;font-size:17px;display:flex;align-items:center;justify-content:center;flex:none}
.gs-sc{flex:1;min-width:0}
.gs-sc h3{margin:0 0 3px;font-size:17px;font-weight:900;color:#0d1230;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.gs-sc p{margin:0;font-size:14px;color:#5a6584;font-weight:600;line-height:1.45}
.gs-actions{flex:none;display:flex;gap:9px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
@media(max-width:640px){.gs-step{flex-wrap:wrap}.gs-actions{width:100%;justify-content:flex-start;margin-top:4px}}
.gs-listen{display:inline-flex;align-items:center;gap:7px;background:#eef2fb;border:1px solid #dbe3f4;border-radius:10px;padding:10px 15px;font-size:13.5px;font-weight:800;color:#0a1f52;cursor:pointer}
.gs-listen.on{background:#0a1f52;color:#fff;border-color:#0a1f52}
.gs-do{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(120deg,#c8102e,#ff2743);border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:900;text-decoration:none;box-shadow:0 8px 18px -8px rgba(200,16,46,.5)}
.al a.gs-do,.al a.gs-do:hover{color:#fff}
.gs-power{display:inline-flex;align-items:center;gap:4px;background:#c8102e;color:#fff;font-size:9.5px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;padding:3px 8px;border-radius:6px}
.gs-step.power{border:2px solid #c8102e;background:linear-gradient(180deg,#fff,#fff6f7)}
.gs-step.power .gs-num{background:linear-gradient(120deg,#c8102e,#ff2743);color:#fff}
.gs-foot{margin-top:18px;font-size:12px;color:#5a6584;text-align:center;line-height:1.5}
.gs-wave,.gs-lwave{display:flex;align-items:center;gap:3px;height:22px}
.gs-lwave{height:15px;gap:2.5px}
.gs-wave i{width:3px;background:#fff;border-radius:2px;animation:gsb 1s ease-in-out infinite}
.gs-lwave i{width:2.5px;background:#7fb0ff;border-radius:2px;animation:gsb 1s ease-in-out infinite}
.gs-wave i:nth-child(2){height:18px;animation-delay:.1s}.gs-wave i:nth-child(3){height:11px;animation-delay:.2s}.gs-wave i:nth-child(4){height:21px;animation-delay:.3s}.gs-wave i:nth-child(5){height:9px;animation-delay:.15s}.gs-wave i:nth-child(1){height:8px}
.gs-lwave i:nth-child(2){height:12px;animation-delay:.1s}.gs-lwave i:nth-child(3){height:8px;animation-delay:.2s}.gs-lwave i:nth-child(4){height:14px;animation-delay:.3s}.gs-lwave i:nth-child(1){height:6px}
@keyframes gsb{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
`;

const STEPS = [
  { key: 'receiving', num: 1, title: 'Add your receiving method', desc: 'Choose how you\u2019d like to get paid \u2014 there are several ways, from crypto to popular payment apps.', link: '/payout-methods', cta: 'Add method' },
  { key: 'ad', num: 2, title: 'Create your ad', desc: 'Add the video you want people to watch \u2014 this becomes your advert on the platform.', link: '/create-campaign', cta: 'Create ad' },
  { key: 'package', num: 3, title: 'Purchase your package', desc: 'This turns your ad into a live campaign and qualifies you to start earning.', link: '/packs', cta: 'Package' },
  { key: 'watch', num: 4, title: 'Do your daily Watch to Earn', desc: 'Watch your videos each day to stay qualified to earn and withdraw.', link: '/watch', cta: 'Watch now' },
  { key: 'share', num: 5, title: 'Share your Showcase & Banner pages', desc: 'The weekly engine. Share publicly \u2014 your videos rotate so one post stays fresh all week, sending real viewers to your offer.', link: '/dashboard', cta: 'Share now', power: true },
];

const PlayIcon = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>);
const SpeakerIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" /><path d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
const Wave = ({ cls }) => (<span className={cls}><i /><i /><i /><i /><i /></span>);

export default function GetStarted() {
  const [manifest, setManifest] = useState({});
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const a = new Audio();
    audioRef.current = a;
    const onEnd = () => setPlaying(null);
    a.addEventListener('ended', onEnd);
    return () => { a.pause(); a.removeEventListener('ended', onEnd); };
  }, []);

  useEffect(() => {
    const lang = (new URLSearchParams(window.location.search).get('lang')) || 'en';
    fetch('/api/al/voice-manifest?lang=' + encodeURIComponent(lang))
      .then(function (r) { return r.json(); })
      .then(function (j) { setManifest((j && j.voices) || {}); })
      .catch(function () { });
  }, []);

  function play(key) {
    const a = audioRef.current;
    if (!a) return;
    if (playing === key) { a.pause(); setPlaying(null); return; }
    const url = manifest[key];
    if (!url) return;
    a.src = url;
    a.play().catch(function () { });
    setPlaying(key);
  }

  return (
    <AlShell active="start">
      <style>{CSS}</style>
      <div className="gs">
        <h1 className="gs-h1">Get started</h1>
        <p className="gs-sub">A few steps to your first result. Not sure what to do? Tap <b>Listen</b> on any step and we'll walk you through it.</p>

        <div className="gs-hero" onClick={function () { play('overview'); }}>
          <span className="gs-ic">{playing === 'overview' ? <Wave cls="gs-wave" /> : <PlayIcon />}</span>
          <div className="gs-t"><b>Hear how this works</b><span>A 60-second overview — press play</span></div>
          <span className="gs-lang">🇬🇧 English</span>
        </div>

        {STEPS.map(function (s) {
          return (
            <div key={s.key} className={'gs-step' + (s.power ? ' power' : '')}>
              <div className="gs-num">{s.num}</div>
              <div className="gs-sc">
                <h3>{s.title}{s.power && <span className="gs-power">⚡ Most powerful</span>}</h3>
                <p>{s.desc}</p>
              </div>
              <div className="gs-actions">
                <button className={'gs-listen' + (playing === s.key ? ' on' : '')} onClick={function () { play(s.key); }}>
                  {playing === s.key ? <Wave cls="gs-lwave" /> : <SpeakerIcon />} Listen
                </button>
                <a className="gs-do" href={s.link}>{s.cta} →</a>
              </div>
            </div>
          );
        })}

        <p className="gs-foot">There are no guarantees and no income is promised — what you get depends on the work you put in.</p>
      </div>
    </AlShell>
  );
}
