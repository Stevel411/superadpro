import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

var SLOTS = [
  {idx:0,level:1,user:"sarah_m",init:"SM",av:"pink",rel:"direct",phase:1},
  {idx:1,level:1,user:"mike_r",init:"MR",av:"cyan",rel:"direct",phase:1},
  {idx:2,level:1,user:"jess_k",init:"JK",av:"amber",rel:"direct",phase:1},
  {idx:3,level:2,user:"ben_t",init:"BT",av:"green",rel:"spillover",phase:2},
  {idx:4,level:2,user:"alex_n",init:"AN",av:"purple",rel:"spillover",phase:2},
  {idx:5,level:2,user:"dani_r",init:"DR",av:"rose",rel:"spillover",phase:2},
  {idx:6,level:2,user:"luca_s",init:"LS",av:"teal",rel:"spillover",phase:2},
  {idx:7,level:2,user:"emma_p",init:"EP",av:"orange",rel:"spillover",phase:2},
  {idx:8,level:2,user:"noah_c",init:"NC",av:"indigo",rel:"spillover",phase:2},
  {idx:9,level:2,user:"tara_v",init:"TV",av:"pink",rel:"spillover",phase:2},
  {idx:10,level:2,user:"sam_o",init:"SO",av:"cyan",rel:"spillover",phase:2},
  {idx:11,level:2,user:"ryan_f",init:"RF",av:"violet",rel:"spillover",phase:2},
  {idx:12,level:3,user:"maya_b",init:"MB",av:"amber",rel:"direct",phase:3},
  {idx:13,level:3,user:"kai_l",init:"KL",av:"emerald",rel:"spillover",phase:4},
  {idx:14,level:3,user:"zoe_h",init:"ZH",av:"purple",rel:"spillover",phase:4},
  {idx:15,level:3,user:"ollie_w",init:"OW",av:"orange",rel:"spillover",phase:4},
  {idx:16,level:3,user:"priya_r",init:"PR",av:"magenta",rel:"spillover",phase:4},
  {idx:17,level:3,user:"tom_a",init:"TA",av:"cyan",rel:"spillover",phase:4},
  {idx:18,level:3,user:"nina_g",init:"NG",av:"rose",rel:"spillover",phase:4},
  {idx:19,level:3,user:"josh_m",init:"JM",av:"green",rel:"spillover",phase:4},
  {idx:20,level:3,user:"leo_d",init:"LD",av:"violet",rel:"spillover",phase:4},
  {idx:21,level:3,user:"amelia_k",init:"AK",av:"amber",rel:"spillover",phase:4},
  {idx:22,level:3,user:"finn_p",init:"FP",av:"cyan",rel:"direct",phase:4},
  {idx:23,level:3,user:"iris_n",init:"IN",av:"rose",rel:"spillover",phase:4},
  {idx:24,level:3,user:"theo_c",init:"TC",av:"indigo",rel:"spillover",phase:4},
  {idx:25,level:3,user:"remi_b",init:"RB",av:"teal",rel:"spillover",phase:4},
  {idx:26,level:3,user:"cleo_s",init:"CS",av:"magenta",rel:"spillover",phase:4},
  {idx:27,level:3,user:"otis_h",init:"OH",av:"amber",rel:"spillover",phase:4},
  {idx:28,level:3,user:"rosa_m",init:"RM",av:"pink",rel:"spillover",phase:4},
  {idx:29,level:3,user:"dax_r",init:"DR",av:"green",rel:"spillover",phase:4},
  {idx:30,level:3,user:"hana_k",init:"HK",av:"teal",rel:"spillover",phase:4},
  {idx:31,level:3,user:"milo_p",init:"MP",av:"violet",rel:"spillover",phase:4},
  {idx:32,level:3,user:"evie_s",init:"ES",av:"orange",rel:"spillover",phase:4},
  {idx:33,level:3,user:"kian_w",init:"KW",av:"cyan",rel:"spillover",phase:4},
  {idx:34,level:3,user:"luna_j",init:"LJ",av:"purple",rel:"spillover",phase:4},
  {idx:35,level:3,user:"aria_f",init:"AF",av:"rose",rel:"spillover",phase:4},
  {idx:36,level:3,user:"zane_b",init:"ZB",av:"emerald",rel:"spillover",phase:4},
  {idx:37,level:3,user:"nyla_d",init:"ND",av:"magenta",rel:"spillover",phase:4},
  {idx:38,level:3,user:"caleb_g",init:"CG",av:"indigo",rel:"spillover",phase:4},
];

var PACKS = [
  {tier:"starter",   name:"Starter",   price:"20",    credits:"100"},
  {tier:"builder",   name:"Builder",   price:"50",    credits:"250"},
  {tier:"pro",       name:"Pro",       price:"100",   credits:"500"},
  {tier:"advanced",  name:"Advanced",  price:"200",   credits:"1,000"},
  {tier:"elite",     name:"Elite",     price:"400",   credits:"2,000"},
  {tier:"premium",   name:"Premium",   price:"600",   credits:"3,000"},
  {tier:"executive", name:"Executive", price:"800",   credits:"4,000"},
  {tier:"ultimate",  name:"Ultimate",  price:"1,000", credits:"5,000"},
];

export default function NexusStreamPage() {
  var { t } = useTranslation();

  // Animation state — one entry per slot. Each is either null (empty) or {av, init, user, rel}.
  var _filled = useState(function() { return new Array(39).fill(null); });
  var filled = _filled[0];
  var setFilled = _filled[1];

  var _caption = useState('');
  var caption = _caption[0];
  var setCaption = _caption[1];

  var _captionState = useState(''); // '' | 'active' | 'complete'
  var captionState = _captionState[0];
  var setCaptionState = _captionState[1];

  var _replayDisabled = useState(true);
  var replayDisabled = _replayDisabled[0];
  var setReplayDisabled = _replayDisabled[1];

  var _justFilled = useState({}); // {idx: true} for slots that just popped in
  var justFilled = _justFilled[0];
  var setJustFilled = _justFilled[1];

  var boxesRef = useRef(null);
  var hasPlayedRef = useRef(false);
  var timeoutsRef = useRef([]);

  useEffect(function() { window.scrollTo(0, 0); }, []);

  var clearAll = useCallback(function() {
    timeoutsRef.current.forEach(function(id) { clearTimeout(id); });
    timeoutsRef.current = [];
  }, []);

  var schedule = useCallback(function(fn, delay) {
    var id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  }, []);

  var fillSlot = useCallback(function(idx) {
    var slot = SLOTS[idx];
    if (!slot) return;
    setFilled(function(prev) {
      var next = prev.slice();
      next[idx] = { av: slot.av, init: slot.init, user: slot.user, rel: slot.rel };
      return next;
    });
    setJustFilled(function(prev) {
      var next = Object.assign({}, prev);
      next[idx] = true;
      return next;
    });
    // Remove just-filled flag after animation completes
    schedule(function() {
      setJustFilled(function(prev) {
        var next = Object.assign({}, prev);
        delete next[idx];
        return next;
      });
    }, 650);
  }, [schedule]);

  var playSequence = useCallback(function() {
    clearAll();
    setFilled(new Array(39).fill(null));
    setJustFilled({});
    setCaption(t('nexusStream.section1.captionStart'));
    setCaptionState('');
    setReplayDisabled(true);

    // Phase 1 — You recruit your first 3 (L1: idx 0,1,2)
    schedule(function() {
      setCaption(t('nexusStream.section1.captionPhase1'));
      setCaptionState('active');
    }, 900);
    [0, 1, 2].forEach(function(idx, i) {
      schedule(function() { fillSlot(idx); }, 1400 + i * 450);
    });

    // Phase 2 — Team starts recruiting (L2: idx 3-11)
    schedule(function() {
      setCaption(t('nexusStream.section1.captionPhase2'));
      setCaptionState('active');
    }, 3200);
    for (var i = 0; i < 9; i++) {
      (function(pos) {
        schedule(function() { fillSlot(3 + pos); }, 3700 + pos * 160);
      })(i);
    }

    // Phase 3 — 4th direct spills to L3 (idx 12 = first L3 slot, rel='direct')
    schedule(function() {
      setCaption(t('nexusStream.section1.captionPhase3'));
      setCaptionState('active');
    }, 5400);
    schedule(function() { fillSlot(12); }, 5900);

    // Phase 4 — Rest of L3 fills (idx 13-38)
    schedule(function() {
      setCaption(t('nexusStream.section1.captionPhase4'));
      setCaptionState('active');
    }, 6800);
    for (var j = 0; j < 26; j++) {
      (function(pos) {
        schedule(function() { fillSlot(13 + pos); }, 7300 + pos * 70);
      })(j);
    }

    // Complete
    schedule(function() {
      setCaption(t('nexusStream.section1.captionComplete'));
      setCaptionState('complete');
      setReplayDisabled(false);
    }, 9400);
  }, [clearAll, schedule, fillSlot, t]);

  // Scroll-triggered autoplay
  useEffect(function() {
    if (!boxesRef.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      schedule(playSequence, 400);
      return undefined;
    }
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !hasPlayedRef.current) {
          hasPlayedRef.current = true;
          schedule(playSequence, 400);
          observer.disconnect();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(boxesRef.current);
    return function() { observer.disconnect(); clearAll(); };
  }, [playSequence, schedule, clearAll]);

  // Helper: render one slot (empty or filled)
  function renderSlot(slot) {
    var fill = filled[slot.idx];
    var popClass = justFilled[slot.idx] ? ' just-filled' : '';
    if (!fill) {
      return (
        <div key={slot.idx} className={'matrix-slot' + popClass} data-idx={slot.idx} data-level={slot.level}>
          <div className="slot-av slot-av-empty"></div>
        </div>
      );
    }
    return (
      <div
        key={slot.idx}
        className={'matrix-slot filled' + popClass}
        data-idx={slot.idx}
        data-level={slot.level}
        data-av={fill.av}
        data-rel={fill.rel}
      >
        <div className="slot-av"><span>{fill.init}</span></div>
        <div className="slot-user">@{fill.user}</div>
      </div>
    );
  }

  var l1Slots = SLOTS.filter(function(s) { return s.level === 1; });
  var l2Slots = SLOTS.filter(function(s) { return s.level === 2; });
  var l3Slots = SLOTS.filter(function(s) { return s.level === 3; });

  return (
    <div className="nexus-stream-page">
      <style>{nexusStyles}</style>

      <div className="ambient-bg"></div>
      <div className="ambient-stars"></div>

      {/* Back nav */}
      <nav className="stream-nav">
        <div className="stream-nav-inner">
          <Link to="/explore/compensation" className="stream-back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('nexusStream.backLink')}
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="4" rx="1" stroke="#fff" strokeWidth="1.8" fill="rgba(255,255,255,.15)"/>
            <rect x="4" y="10" width="16" height="4" rx="1" stroke="#fff" strokeWidth="1.8" fill="rgba(255,255,255,.25)"/>
            <rect x="4" y="16" width="16" height="4" rx="1" stroke="#fff" strokeWidth="1.8" fill="rgba(255,255,255,.35)"/>
          </svg>
        </div>
        <div className="hero-tag">{t('nexusStream.hero.tag')}</div>
        <h1 className="hero-h">
          <span className="word w1">{t('nexusStream.hero.word1')}</span>{' '}
          <span className="word w2">{t('nexusStream.hero.word2')}</span>{' '}
          <span className="word w3">{t('nexusStream.hero.word3')}</span>
          <span className="line2">
            <span className="word w4">{t('nexusStream.hero.line2word1')}</span>{' '}
            <span className="word w5">{t('nexusStream.hero.line2word2')}</span>{' '}
            <span className="word w6">{t('nexusStream.hero.line2word3')}</span>
          </span>
        </h1>
        <p className="hero-sub" dangerouslySetInnerHTML={{ __html: t('nexusStream.hero.sub') }}></p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">{t('nexusStream.hero.stat1Num')}</span>
            <div className="hero-stat-label">{t('nexusStream.hero.stat1Label')}</div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{t('nexusStream.hero.stat2Num')}</span>
            <div className="hero-stat-label">{t('nexusStream.hero.stat2Label')}</div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{t('nexusStream.hero.stat3Num')}</span>
            <div className="hero-stat-label">{t('nexusStream.hero.stat3Label')}</div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 01 — STRUCTURE ═══ */}
      <section className="section">
        <div className="section-tag">{t('nexusStream.section1.tag')}</div>
        <h2 className="section-h">
          <span className="accent">{t('nexusStream.section1.headline1')}</span>{' '}
          <span dangerouslySetInnerHTML={{ __html: t('nexusStream.section1.headline2') }}></span>
          <span className="line-break">{t('nexusStream.section1.headlineBreak')}</span>
        </h2>
        <p className="section-sub" dangerouslySetInnerHTML={{ __html: t('nexusStream.section1.sub') }}></p>

        {/* Commission legend */}
        <div className="commission-legend">
          <div className="legend-item" data-type="direct">
            <div className="legend-badge-wrap">
              <div className="legend-badge">{t('nexusStream.section1.legendDirectBadge')}</div>
              <div className="legend-pulse"></div>
            </div>
            <div className="legend-body">
              <div className="legend-rate">{t('nexusStream.section1.legendDirectRate')}</div>
              <div className="legend-label">{t('nexusStream.section1.legendDirectLabel')}</div>
              <div className="legend-desc" dangerouslySetInnerHTML={{ __html: t('nexusStream.section1.legendDirectDesc') }}></div>
            </div>
          </div>
          <div className="legend-divider"></div>
          <div className="legend-item" data-type="spillover">
            <div className="legend-badge-wrap">
              <div className="legend-badge">{t('nexusStream.section1.legendSpilloverBadge')}</div>
            </div>
            <div className="legend-body">
              <div className="legend-rate">{t('nexusStream.section1.legendSpilloverRate')}</div>
              <div className="legend-label">{t('nexusStream.section1.legendSpilloverLabel')}</div>
              <div className="legend-desc" dangerouslySetInnerHTML={{ __html: t('nexusStream.section1.legendSpilloverDesc') }}></div>
            </div>
          </div>
        </div>

        {/* Animation controls */}
        <div className="nexus-controls">
          <div className={'nexus-caption ' + captionState}>{caption || t('nexusStream.section1.captionStart')}</div>
          <button
            type="button"
            className="nexus-replay"
            disabled={replayDisabled}
            onClick={function() { playSequence(); }}
            aria-label={t('nexusStream.section1.replay')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>{t('nexusStream.section1.replay')}</span>
          </button>
        </div>

        <div className="boxes-wrap" ref={boxesRef}>
          {/* Box 1 — L1 */}
          <div className="matrix-box" data-level="1">
            <div className="matrix-box-head">
              <div className="matrix-box-label">
                <div className="matrix-box-num">{t('nexusStream.section1.box1Num')}</div>
                <div className="matrix-box-name">{t('nexusStream.section1.box1Name')}</div>
                <div className="matrix-box-desc">{t('nexusStream.section1.box1Desc')}</div>
              </div>
            </div>
            <div className="matrix-slots">
              {l1Slots.map(renderSlot)}
            </div>
          </div>

          {/* Box 2 — L2 */}
          <div className="matrix-box" data-level="2">
            <div className="matrix-box-head">
              <div className="matrix-box-label">
                <div className="matrix-box-num">{t('nexusStream.section1.box2Num')}</div>
                <div className="matrix-box-name">{t('nexusStream.section1.box2Name')}</div>
                <div className="matrix-box-desc">{t('nexusStream.section1.box2Desc')}</div>
              </div>
            </div>
            <div className="matrix-slots">
              {l2Slots.map(renderSlot)}
            </div>
          </div>

          {/* Box 3 — L3 */}
          <div className="matrix-box" data-level="3">
            <div className="matrix-box-head">
              <div className="matrix-box-label">
                <div className="matrix-box-num">{t('nexusStream.section1.box3Num')}</div>
                <div className="matrix-box-name">{t('nexusStream.section1.box3Name')}</div>
                <div className="matrix-box-desc">{t('nexusStream.section1.box3Desc')}</div>
              </div>
            </div>
            <div className="matrix-slots">
              {l3Slots.map(renderSlot)}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="matrix-summary">
          <div className="matrix-summary-text" dangerouslySetInnerHTML={{ __html: t('nexusStream.section1.summaryText') }}></div>
          <div className="matrix-summary-stat">
            <div className="matrix-summary-num">{t('nexusStream.section1.summaryNum')}</div>
            <div className="matrix-summary-label">{t('nexusStream.section1.summaryLabel')}</div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 02 — THE 8 PACKS ═══ */}
      <section className="section">
        <div className="section-tag">{t('nexusStream.section2.tag')}</div>
        <h2 className="section-h">
          <span className="accent">{t('nexusStream.section2.headline1')}</span>{' '}
          {t('nexusStream.section2.headline2')}
          <span className="line-break">{t('nexusStream.section2.headlineBreak')}</span>
        </h2>
        <p className="section-sub">{t('nexusStream.section2.sub')}</p>

        <div className="packs-row">
          {PACKS.map(function(p) {
            return (
              <div key={p.tier} className="pack-card" data-tier={p.tier}>
                <div className="pack-card-name">{p.name}</div>
                <div className="pack-card-price">
                  <span className="pack-price-currency">$</span>{p.price}
                </div>
                <div className="pack-card-credits">{p.credits} {t('nexusStream.section2.credits')}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ SECTION 03 — THE HONEST MOMENT ═══ */}
      <section className="section honest-section">
        <div className="section-tag">{t('nexusStream.section3.tag', { defaultValue: '§ 03 · The honest moment' })}</div>
        <h2 className="section-h">
          <span className="accent">{t('nexusStream.section3.headline1', { defaultValue: 'Not every Nexus fills.' })}</span>{' '}
          {t('nexusStream.section3.headline2', { defaultValue: 'Here' + String.fromCharCode(8217) + 's what that means.' })}
        </h2>
        <p className="section-sub">{t('nexusStream.section3.sub', { defaultValue: 'Every Nexus starts the same way — you buy the pack, you earn 15% on everyone you personally bring in, and 10% on anyone they bring in. The question is how far the structure fills.' })}</p>

        <div className="scenarios">
          <div className="scenario-card" data-stage="partial">
            <div className="scenario-label">{t('nexusStream.section3.partial.label', { defaultValue: 'Partial fill' })}</div>
            <div className="scenario-num">{t('nexusStream.section3.partial.num', { defaultValue: '3 + 9' })}</div>
            <div className="scenario-desc">{t('nexusStream.section3.partial.desc', { defaultValue: '3 directs, 9 spillover. You' + String.fromCharCode(8217) + 've earned 15% on every direct, plus 10% on every spillover — paid in credits you can use or withdraw.' })}</div>
          </div>
          <div className="scenario-card" data-stage="mid">
            <div className="scenario-label">{t('nexusStream.section3.mid.label', { defaultValue: 'Mid fill' })}</div>
            <div className="scenario-num">{t('nexusStream.section3.mid.num', { defaultValue: '12+' })}</div>
            <div className="scenario-desc">{t('nexusStream.section3.mid.desc', { defaultValue: 'Twelve positions filled across Levels 1 and 2. At this point, credits earned typically cover the pack price several times over.' })}</div>
          </div>
          <div className="scenario-card" data-stage="full">
            <div className="scenario-label">{t('nexusStream.section3.full.label', { defaultValue: 'Full cycle' })}</div>
            <div className="scenario-num">{t('nexusStream.section3.full.num', { defaultValue: '39 / 39' })}</div>
            <div className="scenario-desc">{t('nexusStream.section3.full.desc', { defaultValue: 'All 39 positions filled. Your 35% share materialises as credits to withdraw, plus a 10% completion bonus paid on the full Nexus value.' })}</div>
          </div>
        </div>

        <p className="honest-close">{t('nexusStream.section3.close', { defaultValue: 'The structure rewards activity, not enrolment. If you bring people in and they bring people in, your Nexus fills. If no one moves, nothing moves. That' + String.fromCharCode(8217) + 's the trade.' })}</p>
      </section>

      {/* ═══ SECTION 04 — CTA ═══ */}
      <section className="section cta-section">
        <div className="cta-card">
          <div className="section-tag">{t('nexusStream.section4.tag', { defaultValue: '§ 04 · Start a Nexus' })}</div>
          <h2 className="cta-h">{t('nexusStream.section4.headline', { defaultValue: 'Ready when you are.' })}</h2>
          <p className="cta-sub">{t('nexusStream.section4.sub', { defaultValue: 'Pick a pack. Share it. Let the structure work.' })}</p>
          <div className="cta-actions">
            <Link to="/register" className="cta-primary">
              {t('nexusStream.section4.primary', { defaultValue: 'Create an account' })}
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link to="/explore/compensation" className="cta-secondary">
              <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t('nexusStream.section4.secondary', { defaultValue: 'Back to compensation overview' })}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═════════ Inline styles (from the v6 mockup) ═════════
var nexusStyles = `

/* ═══════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════ */
:root{
  --cobalt-deepest:#020617;
  --cobalt-deep:#050a1f;
  --cobalt:#0b1230;
  --cobalt-mid:#1a2558;

  /* Primary: purple. Secondary: indigo. */
  --purple:#9333ea;
  --purple-bright:#c084fc;
  --purple-pale:#e9d5ff;
  --purple-deep:#6b21a8;
  --purple-rgb:192,132,252;

  --indigo:#4f46e5;
  --indigo-soft:#818cf8;
  --indigo-rgb:129,140,248;

  --sky:#0ea5e9;
  --sky-bright:#38bdf8;
  --amber:#fbbf24;

  --ink:#f8fafc;
  --ink-60:rgba(248,250,252,.72);
  --ink-50:rgba(248,250,252,.6);
  --ink-40:rgba(248,250,252,.48);
  --ink-20:rgba(248,250,252,.22);
  --ink-10:rgba(248,250,252,.10);
  --ink-5:rgba(248,250,252,.05);
}

*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  font-family:'DM Sans',sans-serif;
  background:var(--cobalt-deepest);
  color:var(--ink);
  min-height:100vh;
  overflow-x:hidden;
}

.mock-banner{position:fixed;top:0;left:0;right:0;z-index:1000;padding:8px;background:#9333ea;color:#fff;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}

/* ═══════════════════════════════════════════
   AMBIENT BACKGROUND
   ═══════════════════════════════════════════ */
.ambient-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:
  radial-gradient(ellipse 70% 50% at 50% 0%,rgba(147,51,234,.16),transparent 60%),
  radial-gradient(ellipse 60% 40% at 10% 100%,rgba(79,70,229,.14),transparent 60%),
  radial-gradient(ellipse 60% 40% at 90% 100%,rgba(192,132,252,.12),transparent 60%);
}
.ambient-stars{position:absolute;inset:0;
  background-image:
    radial-gradient(1px 1px at 20% 30%,#fff 0,transparent 50%),
    radial-gradient(1px 1px at 75% 70%,#fff 0,transparent 50%),
    radial-gradient(1px 1px at 10% 80%,#fff 0,transparent 50%),
    radial-gradient(1px 1px at 50% 50%,#fff 0,transparent 50%),
    radial-gradient(1px 1px at 90% 20%,#fff 0,transparent 50%);
  background-size:900px 900px,700px 700px,1100px 1100px,800px 800px,600px 600px;
  opacity:.35;
  animation:starDrift 280s linear infinite;
}
@keyframes starDrift{to{transform:translateY(-900px)}}

/* ═══════════════════════════════════════════
   NAV / BACK LINK
   ═══════════════════════════════════════════ */
.stream-nav{position:absolute;top:0;left:0;right:0;z-index:100;padding:68px 0 24px;pointer-events:none}
.stream-nav-inner{max-width:1320px;margin:0 auto;padding:0 48px;pointer-events:none}
.stream-back{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:12px;background:rgba(11,18,48,.5);backdrop-filter:blur(16px);border:1px solid var(--ink-10);color:var(--ink-60);text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;transition:all .3s cubic-bezier(.2,.9,.3,1);opacity:0;animation:backFade .8s ease-out .3s forwards}
.stream-back:hover{color:var(--ink);border-color:rgba(192,132,252,.4);background:rgba(11,18,48,.7);transform:translateX(-2px)}
.stream-back svg{width:14px;height:14px;transition:transform .3s}
.stream-back:hover svg{transform:translateX(-2px)}
@keyframes backFade{to{opacity:1}}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
.hero{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:140px 48px 40px;text-align:center;opacity:0;animation:heroShellFade .5s ease-out .1s forwards}
@keyframes heroShellFade{to{opacity:1}}

/* Hold sections below hero until the hero cascade settles (stats land ~2.6s) */
.hero ~ .section{opacity:0;animation:sectionReveal .9s ease-out forwards}
.hero ~ .section:nth-of-type(2){animation-delay:2.8s}
.hero ~ .section:nth-of-type(3){animation-delay:3.0s}
.hero ~ .section:nth-of-type(4){animation-delay:3.2s}
.hero ~ .section:nth-of-type(5){animation-delay:3.4s}
@keyframes sectionReveal{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

.hero-mark{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,var(--purple-bright),var(--purple-deep) 60%,var(--indigo));display:flex;align-items:center;justify-content:center;margin-bottom:28px;position:relative;animation:heroMarkRise 1.6s cubic-bezier(.2,.9,.3,1) both;box-shadow:0 0 80px rgba(147,51,234,.55),0 0 160px rgba(79,70,229,.3)}
.hero-mark::before{content:'';position:absolute;inset:-4px;border-radius:28px;background:linear-gradient(135deg,var(--purple-bright),var(--indigo-soft),var(--purple));z-index:-1;opacity:.5;filter:blur(14px);animation:markPulse 4s ease-in-out infinite}
.hero-mark::after{content:'';position:absolute;inset:-18px;border-radius:44px;border:1px solid rgba(192,132,252,.25);animation:markRing 6s ease-in-out infinite}
.hero-mark svg{width:40px;height:40px;color:#fff}
@keyframes heroMarkRise{0%{opacity:0;transform:translateY(-20px) scale(.8)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes markPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.75;transform:scale(1.04)}}
@keyframes markRing{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.08);opacity:.15}}

.hero-tag{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--purple-bright);letter-spacing:.24em;text-transform:uppercase;margin-bottom:22px;opacity:0;animation:heroFade .9s ease-out .6s forwards;display:inline-flex;align-items:center;gap:14px}
.hero-tag::before,.hero-tag::after{content:'';width:36px;height:1px;background:var(--purple-bright);opacity:.6}
@keyframes heroFade{to{opacity:1}}

.hero-h{font-family:'Sora',sans-serif;font-size:clamp(42px,6vw,88px);font-weight:900;line-height:.92;letter-spacing:-.05em;margin:0 0 16px;max-width:1200px}
.hero-h .word{display:inline-block;opacity:0;transform:translateY(20px)}
.hero-h .word.w1{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) .85s forwards}
.hero-h .word.w2{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.0s forwards}
.hero-h .word.w3{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.15s forwards}
.hero-h .line2{display:block;font-weight:300;letter-spacing:-.03em;color:var(--purple-pale);opacity:.88;margin-top:8px;font-size:.58em}
.hero-h .line2 .word.w4{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.55s forwards}
.hero-h .line2 .word.w5{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.7s forwards}
.hero-h .line2 .word.w6{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.85s forwards}
@keyframes wordRise{to{opacity:1;transform:translateY(0)}}

.hero-sub{font-size:19px;line-height:1.55;color:var(--ink-60);max-width:680px;margin:20px auto 48px;opacity:0;animation:heroFade 1s ease-out 2.3s forwards}
.hero-sub strong{color:var(--purple-bright);font-weight:700}

/* ═══════════════════════════════════════════
   STATS ROW
   ═══════════════════════════════════════════ */
.hero-stats{display:flex;gap:56px;margin-bottom:56px;opacity:0;animation:heroFade 1s ease-out 2.6s forwards;flex-wrap:wrap;justify-content:center}
.hero-stat{text-align:center}
.hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.03em;color:var(--purple-bright);line-height:1;text-shadow:0 0 32px rgba(192,132,252,.35);display:block;margin-bottom:6px}
.hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-40);font-weight:600}

.hero-scroll{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-40);letter-spacing:.22em;text-transform:uppercase;opacity:0;animation:heroFade 1s ease-out 3.0s forwards,scrollNudge 2.6s ease-in-out 3.8s infinite}
.hero-scroll::before{content:'';display:inline-block;width:1px;height:32px;background:linear-gradient(180deg,transparent,var(--ink-40));margin-right:10px;vertical-align:middle}
@keyframes scrollNudge{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}

/* ═══════════════════════════════════════════
   SECTION — THE 3-BOX MATRIX
   ═══════════════════════════════════════════ */
.section{position:relative;z-index:2;padding:40px 48px 120px;max-width:1320px;margin:0 auto}

.section-tag{display:inline-flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--purple-bright);letter-spacing:.22em;text-transform:uppercase;margin-bottom:22px}
.section-tag::before{content:'';width:40px;height:1px;background:var(--purple-bright);opacity:.6}

.section-h{font-family:'Sora',sans-serif;font-size:clamp(32px,4.2vw,56px);font-weight:800;letter-spacing:-.035em;line-height:1.05;margin:0 0 18px;color:var(--ink);max-width:900px}
.section-h .accent{color:var(--purple-bright)}
.section-h .line-break{display:block;font-weight:300;color:var(--ink-60);margin-top:6px;font-size:.68em}

.section-sub{font-size:17px;color:var(--ink-60);line-height:1.6;max-width:720px;margin:0 0 64px}

/* ═══════ The Three Boxes (Levels 1-3 of one matrix) ═══════ */
.boxes-wrap{display:flex;flex-direction:column;gap:24px;max-width:1100px;margin:0 auto;position:relative}

.matrix-box{
  position:relative;
  padding:32px 36px;
  border-radius:22px;
  background:linear-gradient(180deg,rgba(11,18,48,.72),rgba(11,18,48,.42));
  backdrop-filter:blur(18px);
  border:1px solid rgba(var(--c-rgb),.28);
  box-shadow:0 20px 60px rgba(0,0,0,.35),0 0 0 1px rgba(var(--c-rgb),.04),0 0 50px rgba(var(--c-rgb),.15);
  overflow:hidden;
  opacity:0;
  transform:translateY(24px);
  animation:boxRise 1s cubic-bezier(.2,.9,.3,1) forwards;
}
.matrix-box::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,transparent,var(--c-accent),transparent);
  opacity:.8;
}

/* Box 1: level 1 — brightest purple (15%) */
.matrix-box[data-level="1"]{--c-accent:#c084fc;--c-rgb:192,132,252;--c-deep:#9333ea;animation-delay:.2s}
/* Box 2: level 2 — indigo (10%) */
.matrix-box[data-level="2"]{--c-accent:#818cf8;--c-rgb:129,140,248;--c-deep:#4f46e5;animation-delay:.5s}
/* Box 3: level 3 — soft indigo/purple blend (10%) */
.matrix-box[data-level="3"]{--c-accent:#a78bfa;--c-rgb:167,139,250;--c-deep:#6d28d9;animation-delay:.8s}

@keyframes boxRise{to{opacity:1;transform:translateY(0)}}

.matrix-box-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px;flex-wrap:wrap}

.matrix-box-label{display:flex;flex-direction:column;gap:8px;min-width:0}
.matrix-box-num{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--c-accent);opacity:.85;font-weight:700}
.matrix-box-name{font-family:'Sora',sans-serif;font-weight:900;font-size:32px;letter-spacing:-.025em;color:var(--c-accent);line-height:1;text-shadow:0 0 36px rgba(var(--c-rgb),.35)}
.matrix-box-desc{font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;color:var(--ink-60);line-height:1.5;margin-top:2px;max-width:520px}

.matrix-box-rate{flex-shrink:0;padding:14px 24px;border-radius:14px;background:linear-gradient(135deg,rgba(var(--c-rgb),.18),rgba(var(--c-rgb),.06));border:1px solid rgba(var(--c-rgb),.32);display:flex;flex-direction:column;align-items:center;gap:4px;min-width:140px}
.matrix-box-rate-pct{font-family:'Sora',sans-serif;font-weight:900;font-size:40px;letter-spacing:-.03em;color:var(--c-accent);line-height:1}
.matrix-box-rate-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-60);font-weight:700;text-align:center}

/* Slot grid — inside each box */
.matrix-slots{display:grid;gap:10px}
.matrix-box[data-level="1"] .matrix-slots{grid-template-columns:repeat(3,1fr)}
.matrix-box[data-level="2"] .matrix-slots{grid-template-columns:repeat(9,1fr)}
.matrix-box[data-level="3"] .matrix-slots{grid-template-columns:repeat(9,1fr);gap:7px}

.matrix-slot{
  aspect-ratio:1;
  border-radius:8px;
  background:rgba(var(--c-rgb),.04);
  border:1px solid rgba(var(--c-rgb),.18);
  display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
  color:rgba(var(--c-rgb),.35);
  transition:all .4s cubic-bezier(.2,.9,.3,1);
  position:relative;
}
.matrix-box[data-level="1"] .matrix-slot{font-size:14px;border-radius:12px}
.matrix-box[data-level="2"] .matrix-slot{font-size:11px;border-radius:9px}

/* Filled state — demonstrates the fill animation */
.matrix-slot.filled{
  background:linear-gradient(135deg,rgba(var(--c-rgb),.28),rgba(var(--c-rgb),.12));
  border-color:rgba(var(--c-rgb),.55);
  color:var(--c-accent);
  box-shadow:0 0 16px rgba(var(--c-rgb),.25),inset 0 0 8px rgba(var(--c-rgb),.15);
}
.matrix-box[data-level="1"] .matrix-slot.filled{box-shadow:0 0 24px rgba(var(--c-rgb),.35),inset 0 0 12px rgba(var(--c-rgb),.2)}

/* ═══════ Slot contents: stylised avatar + username ═══════ */
.matrix-slot{padding:8px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden}
.matrix-box[data-level="1"] .matrix-slot{padding:16px 10px;gap:10px;aspect-ratio:auto;min-height:110px}
.matrix-box[data-level="2"] .matrix-slot{padding:10px 4px;gap:5px;aspect-ratio:auto;min-height:78px}
.matrix-box[data-level="3"] .matrix-slot{padding:10px 4px;gap:0;aspect-ratio:auto;min-height:72px}

.slot-av{
  width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'Sora',sans-serif;font-weight:800;font-size:14px;
  color:#fff;letter-spacing:-.02em;
  background:linear-gradient(135deg,var(--av-from,#64748b),var(--av-to,#475569));
  box-shadow:0 4px 12px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15);
  flex-shrink:0;
}
.matrix-box[data-level="1"] .slot-av{width:48px;height:48px;font-size:17px}
.matrix-box[data-level="2"] .slot-av{width:34px;height:34px;font-size:13px}
.matrix-box[data-level="3"] .slot-av{width:36px;height:36px;font-size:12px;box-shadow:0 3px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}

.slot-av-empty{
  background:transparent;
  border:1.5px dashed rgba(var(--c-rgb),.3);
  box-shadow:none;
}

.slot-user{
  font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
  color:var(--c-accent);opacity:.82;
  white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;
  letter-spacing:-.005em;
}
.matrix-box[data-level="1"] .slot-user{font-size:13px;font-weight:700}
.matrix-box[data-level="2"] .slot-user{font-size:10px}
.matrix-box[data-level="3"] .slot-user{display:none}  /* too cramped — just show avatar */

/* Per-avatar colour variants (data-av attribute) */
.matrix-slot[data-av="pink"]    .slot-av{--av-from:#f472b6;--av-to:#be185d}
.matrix-slot[data-av="cyan"]    .slot-av{--av-from:#22d3ee;--av-to:#0891b2}
.matrix-slot[data-av="amber"]   .slot-av{--av-from:#fbbf24;--av-to:#b45309}
.matrix-slot[data-av="green"]   .slot-av{--av-from:#34d399;--av-to:#047857}
.matrix-slot[data-av="purple"]  .slot-av{--av-from:#c084fc;--av-to:#7e22ce}
.matrix-slot[data-av="rose"]    .slot-av{--av-from:#fb7185;--av-to:#be123c}
.matrix-slot[data-av="teal"]    .slot-av{--av-from:#2dd4bf;--av-to:#0f766e}
.matrix-slot[data-av="orange"]  .slot-av{--av-from:#fb923c;--av-to:#c2410c}
.matrix-slot[data-av="indigo"]  .slot-av{--av-from:#818cf8;--av-to:#3730a3}
.matrix-slot[data-av="violet"]  .slot-av{--av-from:#a78bfa;--av-to:#6d28d9}
.matrix-slot[data-av="emerald"] .slot-av{--av-from:#6ee7b7;--av-to:#047857}
.matrix-slot[data-av="magenta"] .slot-av{--av-from:#e879f9;--av-to:#a21caf}

/* ═══════ ANIMATION CONTROL BAR ═══════ */
.nexus-controls{
  display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;
  max-width:1100px;margin:0 auto 32px;
  padding:16px 24px;
  border-radius:16px;
  background:linear-gradient(135deg,rgba(11,18,48,.6),rgba(11,18,48,.35));
  border:1px solid var(--ink-10);
  backdrop-filter:blur(16px);
}
.nexus-caption{
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;
  color:var(--ink-60);letter-spacing:.02em;line-height:1.4;
  transition:color .35s ease-out;
  min-height:1.4em;
}
.nexus-caption.active{color:var(--purple-bright)}
.nexus-caption.complete{color:var(--purple-bright);font-weight:700}

.nexus-replay{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 18px;border-radius:100px;
  background:rgba(192,132,252,.12);
  border:1px solid rgba(192,132,252,.35);
  color:var(--purple-bright);
  font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;font-weight:700;
  cursor:pointer;
  transition:all .25s cubic-bezier(.2,.9,.3,1);
  white-space:nowrap;
}
.nexus-replay:hover{background:rgba(192,132,252,.22);border-color:var(--purple-bright);transform:translateY(-1px);box-shadow:0 6px 20px rgba(192,132,252,.25)}
.nexus-replay:active{transform:translateY(0)}
.nexus-replay svg{transition:transform .4s cubic-bezier(.2,.9,.3,1)}
.nexus-replay:hover svg{transform:rotate(-90deg)}
.nexus-replay[disabled]{opacity:.5;cursor:not-allowed}
.nexus-replay[disabled]:hover{transform:none;box-shadow:none;background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.35)}

/* Slot state during animation: freshly-filled slot does a pop */
.matrix-slot.just-filled{animation:slotPop .6s cubic-bezier(.2,1.3,.4,1)}
@keyframes slotPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}

@media (max-width:900px){
  .nexus-controls{grid-template-columns:1fr;gap:14px;padding:14px 18px;text-align:center}
  .nexus-replay{justify-self:center}
}

/* ═══════ COMMISSION LEGEND — the real rule ═══════ */
.commission-legend{
  display:grid;grid-template-columns:1fr auto 1fr;
  gap:40px;align-items:stretch;
  max-width:1100px;margin:0 auto 48px;
  padding:28px 36px;
  border-radius:22px;
  background:linear-gradient(135deg,rgba(11,18,48,.62),rgba(11,18,48,.35));
  border:1px solid rgba(192,132,252,.24);
  backdrop-filter:blur(18px);
}
.legend-item{display:flex;gap:20px;align-items:center}
.legend-item[data-type="direct"]{--lg-accent:#c084fc;--lg-rgb:192,132,252}
.legend-item[data-type="spillover"]{--lg-accent:#818cf8;--lg-rgb:129,140,248}
.legend-badge-wrap{position:relative;flex-shrink:0}
.legend-badge{
  width:58px;height:58px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  font-family:'Sora',sans-serif;font-weight:900;font-size:24px;
  color:#fff;letter-spacing:-.02em;
  background:linear-gradient(135deg,var(--lg-accent),rgba(var(--lg-rgb),.7));
  box-shadow:0 8px 24px rgba(var(--lg-rgb),.4),inset 0 1px 0 rgba(255,255,255,.2);
  position:relative;z-index:2;
}
.legend-pulse{
  position:absolute;inset:-6px;border-radius:22px;
  border:2px solid rgba(var(--lg-rgb),.4);
  animation:legendPulse 2.4s ease-in-out infinite;
}
@keyframes legendPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.2;transform:scale(1.08)}}
.legend-body{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.legend-rate{font-family:'Sora',sans-serif;font-weight:900;font-size:32px;color:var(--lg-accent);line-height:1;letter-spacing:-.03em;text-shadow:0 0 28px rgba(var(--lg-rgb),.35)}
.legend-label{font-family:'Sora',sans-serif;font-weight:700;font-size:16px;color:var(--ink);line-height:1.2;margin-top:2px;letter-spacing:-.02em}
.legend-desc{font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink-60);line-height:1.45;margin-top:6px;letter-spacing:-.005em}
.legend-desc strong{color:var(--lg-accent);font-weight:700}
.legend-divider{width:1px;background:linear-gradient(180deg,transparent,rgba(192,132,252,.3),transparent)}

/* Per-avatar relationship badges */
.slot-av{position:relative}  /* ensure ::after anchors correctly */
.matrix-slot[data-rel="direct"] .slot-av::after{
  content:'D';position:absolute;bottom:-4px;right:-4px;
  width:18px;height:18px;border-radius:50%;
  background:linear-gradient(135deg,#c084fc,#7e22ce);
  color:#fff;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:10px;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 8px rgba(192,132,252,.6),0 0 0 2px var(--cobalt-deepest);
}
.matrix-slot[data-rel="spillover"] .slot-av::after{
  content:'S';position:absolute;bottom:-4px;right:-4px;
  width:18px;height:18px;border-radius:50%;
  background:linear-gradient(135deg,#818cf8,#3730a3);
  color:#fff;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:10px;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 8px rgba(129,140,248,.6),0 0 0 2px var(--cobalt-deepest);
}
.matrix-box[data-level="3"] .matrix-slot[data-rel] .slot-av::after{width:14px;height:14px;font-size:8px;bottom:-3px;right:-3px}

/* Aura glow behind filled slots based on relationship */
.matrix-slot[data-rel="direct"].filled{box-shadow:0 0 24px rgba(192,132,252,.35),inset 0 0 12px rgba(192,132,252,.15) !important;border-color:rgba(192,132,252,.55) !important}
.matrix-slot[data-rel="spillover"].filled{box-shadow:0 0 20px rgba(129,140,248,.3),inset 0 0 10px rgba(129,140,248,.12) !important;border-color:rgba(129,140,248,.5) !important}

/* Mobile */
@media (max-width:900px){
  .commission-legend{grid-template-columns:1fr;gap:24px;padding:22px 22px}
  .legend-divider{height:1px;width:100%;background:linear-gradient(90deg,transparent,rgba(192,132,252,.3),transparent)}
  .legend-item{gap:14px}
  .legend-badge{width:48px;height:48px;font-size:20px;border-radius:12px}
  .legend-rate{font-size:26px}
}

/* ═══════ Matrix summary footer ═══════ */
.matrix-summary{
  margin-top:48px;
  padding:32px 40px;
  border-radius:20px;
  background:linear-gradient(135deg,rgba(192,132,252,.12),rgba(129,140,248,.08));
  border:1px solid rgba(192,132,252,.3);
  display:grid;
  grid-template-columns:1fr auto;
  gap:40px;
  align-items:center;
}
.matrix-summary-text{font-family:'Sora',sans-serif;font-size:20px;font-weight:600;line-height:1.35;color:var(--ink);letter-spacing:-.015em}
.matrix-summary-text .emph{color:var(--purple-bright);font-weight:800}
.matrix-summary-stat{text-align:center;padding:16px 28px;border-radius:14px;background:rgba(11,18,48,.5);border:1px solid rgba(192,132,252,.3)}
.matrix-summary-num{font-family:'Sora',sans-serif;font-weight:900;font-size:42px;letter-spacing:-.03em;color:var(--purple-bright);line-height:1;text-shadow:0 0 32px rgba(192,132,252,.5)}
.matrix-summary-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-60);font-weight:700;margin-top:6px}

/* ═══════════════════════════════════════════
   SECTION 02 — THE 8 PACKS
   ═══════════════════════════════════════════ */
.packs-row{
  display:grid;grid-template-columns:repeat(8,1fr);gap:10px;
  max-width:1200px;margin:48px auto 0;
}

.pack-card{
  position:relative;
  padding:22px 12px 18px;border-radius:16px;
  background:linear-gradient(180deg,rgba(11,18,48,.7),rgba(11,18,48,.4));
  backdrop-filter:blur(16px);
  border:1px solid rgba(var(--pk-rgb),.22);
  box-shadow:0 14px 40px rgba(0,0,0,.3),0 0 0 1px rgba(var(--pk-rgb),.04),0 0 24px rgba(var(--pk-rgb),.1);
  display:flex;flex-direction:column;align-items:center;gap:6px;
  transition:transform .35s cubic-bezier(.2,.9,.3,1),border-color .35s,box-shadow .35s;
  overflow:hidden;
}
.pack-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--pk-accent),transparent);
  opacity:.85;
}
.pack-card:hover{
  transform:translateY(-4px);
  border-color:rgba(var(--pk-rgb),.55);
  box-shadow:0 20px 50px rgba(0,0,0,.4),0 0 0 1px rgba(var(--pk-rgb),.2),0 0 40px rgba(var(--pk-rgb),.22);
}

/* Per-tier colour progression */
.pack-card[data-tier="starter"]    {--pk-accent:#ddd6fe;--pk-rgb:221,214,254}
.pack-card[data-tier="builder"]    {--pk-accent:#c4b5fd;--pk-rgb:196,181,253}
.pack-card[data-tier="pro"]        {--pk-accent:#a78bfa;--pk-rgb:167,139,250}
.pack-card[data-tier="advanced"]   {--pk-accent:#8b5cf6;--pk-rgb:139,92,246}
.pack-card[data-tier="elite"]      {--pk-accent:#7c3aed;--pk-rgb:124,58,237}
.pack-card[data-tier="premium"]    {--pk-accent:#c084fc;--pk-rgb:192,132,252}
.pack-card[data-tier="executive"]  {--pk-accent:#a855f7;--pk-rgb:168,85,247}
.pack-card[data-tier="ultimate"]   {--pk-accent:#d8b4fe;--pk-rgb:216,180,254;border-color:rgba(216,180,254,.45);box-shadow:0 14px 40px rgba(0,0,0,.35),0 0 0 1px rgba(216,180,254,.1),0 0 32px rgba(216,180,254,.2)}

.pack-card-name{
  font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--pk-accent);opacity:.9;
  text-align:center;white-space:nowrap;
}
.pack-card-price{
  font-family:'Sora',sans-serif;font-weight:900;font-size:32px;
  letter-spacing:-.04em;color:var(--ink);line-height:1;
  text-shadow:0 0 28px rgba(var(--pk-rgb),.3);
  display:inline-flex;align-items:baseline;
}
.pack-price-currency{font-size:.58em;font-weight:700;opacity:.7;margin-right:1px}
.pack-card-credits{
  font-family:'DM Sans',sans-serif;font-weight:600;font-size:12px;
  color:var(--ink-60);letter-spacing:-.005em;margin-top:2px;text-align:center;
}

@media (max-width:1100px){
  .packs-row{grid-template-columns:repeat(4,1fr);gap:12px}
  .pack-card{padding:26px 14px 22px}
  .pack-card-price{font-size:36px}
}
@media (max-width:640px){
  .packs-row{grid-template-columns:repeat(2,1fr);gap:10px}
  .pack-card-price{font-size:32px}
}

/* ═══════════════════════════════════════════
   SECTION 03 — HONEST MOMENT
   ═══════════════════════════════════════════ */
.honest-section{padding-top:40px}

.scenarios{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:48px 0 36px}

.scenario-card{
  position:relative;
  padding:32px 28px;border-radius:16px;
  background:linear-gradient(180deg,rgba(11,18,48,.7),rgba(11,18,48,.4));
  backdrop-filter:blur(16px);
  border:1px solid rgba(var(--purple-rgb),.18);
  box-shadow:0 14px 40px rgba(0,0,0,.3),0 0 0 1px rgba(var(--purple-rgb),.04);
  display:flex;flex-direction:column;gap:14px;
  overflow:hidden;
  transition:transform .35s cubic-bezier(.2,.9,.3,1),border-color .35s,box-shadow .35s;
}
.scenario-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--purple-bright),transparent);
  opacity:.7;
}
.scenario-card:hover{
  transform:translateY(-3px);
  border-color:rgba(var(--purple-rgb),.4);
  box-shadow:0 20px 50px rgba(0,0,0,.4),0 0 0 1px rgba(var(--purple-rgb),.18),0 0 30px rgba(var(--purple-rgb),.12);
}

.scenario-card[data-stage="partial"]{--stage-accent:var(--indigo-soft)}
.scenario-card[data-stage="mid"]    {--stage-accent:var(--purple-bright)}
.scenario-card[data-stage="full"]   {--stage-accent:var(--amber)}

.scenario-label{
  font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;
  letter-spacing:.2em;text-transform:uppercase;
  color:var(--stage-accent);
}
.scenario-num{
  font-family:'Sora',sans-serif;font-size:48px;font-weight:900;
  letter-spacing:-.04em;line-height:.95;color:var(--ink);
}
.scenario-desc{
  font-size:15px;line-height:1.55;color:var(--ink-60);
}

.honest-close{
  font-size:17px;line-height:1.6;color:var(--ink-60);
  max-width:720px;margin:36px 0 0;
  padding:22px 26px;border-left:2px solid var(--purple-bright);
  background:rgba(147,51,234,.05);border-radius:0 12px 12px 0;
  font-style:italic;
}

/* ═══════════════════════════════════════════
   SECTION 04 — CTA
   ═══════════════════════════════════════════ */
.cta-section{padding-top:40px;padding-bottom:140px}

.cta-card{
  position:relative;
  padding:64px 48px;border-radius:24px;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%,rgba(147,51,234,.18),transparent 70%),
    linear-gradient(180deg,rgba(11,18,48,.75),rgba(11,18,48,.5));
  backdrop-filter:blur(20px);
  border:1px solid rgba(var(--purple-rgb),.22);
  box-shadow:
    0 30px 80px rgba(0,0,0,.4),
    0 0 0 1px rgba(var(--purple-rgb),.06),
    0 0 80px rgba(147,51,234,.12);
  text-align:center;
  overflow:hidden;
}
.cta-card::before{
  content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:60%;height:2px;
  background:linear-gradient(90deg,transparent,var(--purple-bright),transparent);
  opacity:.8;
}

.cta-card .section-tag{justify-content:center;display:flex;margin-bottom:22px}
.cta-card .section-tag::before{display:none}

.cta-h{
  font-family:'Sora',sans-serif;font-size:clamp(36px,4.4vw,58px);font-weight:900;
  letter-spacing:-.04em;line-height:1;margin:0 0 16px;color:var(--ink);
}
.cta-sub{
  font-size:18px;line-height:1.6;color:var(--ink-60);
  max-width:540px;margin:0 auto 40px;
}

.cta-actions{
  display:flex;gap:16px;flex-wrap:wrap;
  align-items:center;justify-content:center;
}

.cta-primary{
  display:inline-flex;align-items:center;gap:12px;
  padding:16px 28px;border-radius:12px;
  background:linear-gradient(135deg,var(--purple-bright),var(--purple-deep) 60%,var(--indigo));
  color:#fff;text-decoration:none;
  font-family:'Sora',sans-serif;font-size:15px;font-weight:700;
  letter-spacing:-.01em;
  box-shadow:0 14px 40px rgba(147,51,234,.35),0 0 0 1px rgba(255,255,255,.08) inset;
  transition:transform .3s cubic-bezier(.2,.9,.3,1),box-shadow .3s,filter .3s;
}
.cta-primary svg{width:16px;height:16px;transition:transform .3s}
.cta-primary:hover{
  transform:translateY(-2px);
  filter:brightness(1.08);
  box-shadow:0 20px 50px rgba(147,51,234,.5),0 0 0 1px rgba(255,255,255,.12) inset,0 0 30px rgba(192,132,252,.3);
}
.cta-primary:hover svg{transform:translateX(3px)}

.cta-secondary{
  display:inline-flex;align-items:center;gap:10px;
  padding:16px 22px;border-radius:12px;
  background:transparent;color:var(--ink-60);text-decoration:none;
  font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;
  transition:color .3s,transform .3s;
}
.cta-secondary svg{width:14px;height:14px;transition:transform .3s}
.cta-secondary:hover{color:var(--ink);transform:translateX(-2px)}
.cta-secondary:hover svg{transform:translateX(-2px)}


@media (max-width:900px){
  .hero{padding:100px 20px 60px}
  .hero-stats{gap:28px}
  .section{padding:80px 20px}
  .matrix-box{padding:22px 22px}
  .matrix-box-head{gap:16px}
  .matrix-box-name{font-size:24px}
  .matrix-box-rate{min-width:110px;padding:10px 16px}
  .matrix-box-rate-pct{font-size:30px}
  .matrix-box[data-level="3"] .matrix-slots{grid-template-columns:repeat(9,1fr);gap:4px}
  .matrix-slot{font-size:9px}
  .matrix-summary{grid-template-columns:1fr;text-align:center}
  .scenarios{grid-template-columns:1fr;gap:16px}
  .scenario-card{padding:26px 22px}
  .scenario-num{font-size:38px}
  .honest-close{padding:18px 20px;font-size:15px}
  .cta-card{padding:44px 24px;border-radius:20px}
  .cta-section{padding-bottom:100px}
  .cta-actions{flex-direction:column;gap:12px;width:100%}
  .cta-primary,.cta-secondary{width:100%;justify-content:center}
}
`;
