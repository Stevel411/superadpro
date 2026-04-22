import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

var TIER_PRICES = [20, 50, 100, 200, 400, 600, 800, 1000];
var TIER_NAME_KEYS = ['starter','builder','pro','advanced','elite','premium','executive','ultimate'];
var TIER_COLORS = {
  1: '#34d399', 2: '#60a5fa', 3: '#a78bfa', 4: '#f472b6',
  5: '#2dd4bf', 6: '#d1d5db', 7: '#fbbf24', 8: '#f87171'
};

export default function GridStreamPage() {
  var { t } = useTranslation();
  var [currentTier, setCurrentTier] = useState(3);
  var [refs, setRefs] = useState(7);
  var [cycles, setCycles] = useState(4);
  var [heroMaxValue, setHeroMaxValue] = useState(0);
  var [gridCells, setGridCells] = useState(function() {
    return Array.from({length: 64}, function() { return ''; });
  });
  var [caption, setCaption] = useState('');
  var [captionShown, setCaptionShown] = useState(false);
  var [tipsShown, setTipsShown] = useState({tip1: false, tip2: false, tip3: false});
  var [statsRevealed, setStatsRevealed] = useState(false);

  var gridWrapRef = useRef(null);
  var animationTimeoutsRef = useRef([]);
  var hasPlayedRef = useRef(false);

  useEffect(function() { window.scrollTo(0, 0); }, []);

  // ═════════ Hero animated counter ═════════
  useEffect(function() {
    var startTime = null;
    var target = 103976;
    var duration = 2400;
    var rafId = null;
    var startDelay = setTimeout(function() {
      function tick(now) {
        if (startTime === null) startTime = now;
        var t = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        setHeroMaxValue(Math.round(target * eased));
        if (t < 1) rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }, 2200);
    return function() {
      clearTimeout(startDelay);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // ═════════ Grid animation sequence ═════════
  var setCaptionAnimated = useCallback(function(text) {
    setCaptionShown(false);
    var t1 = setTimeout(function() {
      setCaption(text);
      setCaptionShown(true);
    }, 220);
    animationTimeoutsRef.current.push(t1);
  }, []);

  var resetGrid = useCallback(function() {
    animationTimeoutsRef.current.forEach(function(id) { clearTimeout(id); });
    animationTimeoutsRef.current = [];
    setGridCells(Array.from({length: 64}, function() { return ''; }));
    setTipsShown({tip1: false, tip2: false, tip3: false});
    setCaptionAnimated(t('gridStream.caption.start'));
  }, [setCaptionAnimated, t]);

  var playGridSequence = useCallback(function() {
    // Clear previous timeouts
    animationTimeoutsRef.current.forEach(function(id) { clearTimeout(id); });
    animationTimeoutsRef.current = [];

    setGridCells(Array.from({length: 64}, function() { return ''; }));
    setTipsShown({tip1: false, tip2: false, tip3: false});
    setStatsRevealed(false);

    var schedule = function(fn, delay) {
      var id = setTimeout(fn, delay);
      animationTimeoutsRef.current.push(id);
    };

    schedule(function() { setStatsRevealed(true); }, 800);

    schedule(function() {
      setGridCells(function(prev) {
        var next = prev.slice();
        next[0] = 'you filled';
        next[27] = 'you filled';
        return next;
      });
      setCaptionAnimated('› ' + t('gridStream.caption.you'));
    }, 400);

    schedule(function() {
      setCaptionAnimated('› ' + t('gridStream.caption.directs'));
      for (var i = 1; i <= 7; i++) {
        (function(idx) {
          schedule(function() {
            setGridCells(function(prev) {
              var next = prev.slice();
              next[idx] = 'row-1 filled';
              return next;
            });
          }, (idx - 1) * 180);
        })(i);
      }
      schedule(function() { setTipsShown(function(p) { return Object.assign({}, p, {tip1: true}); }); }, 700);
    }, 2000);

    schedule(function() {
      setCaptionAnimated('› ' + t('gridStream.caption.spillover'));
      for (var i = 8; i < 24; i++) {
        (function(idx) {
          schedule(function() {
            setGridCells(function(prev) {
              var next = prev.slice();
              next[idx] = 'spillover-a filled';
              return next;
            });
          }, (idx - 8) * 60);
        })(i);
      }
      schedule(function() { setTipsShown(function(p) { return Object.assign({}, p, {tip2: true}); }); }, 800);
    }, 5000);

    schedule(function() {
      setCaptionAnimated('› ' + t('gridStream.caption.fills'));
      for (var i = 24; i < 63; i++) {
        (function(idx) {
          schedule(function() {
            setGridCells(function(prev) {
              var next = prev.slice();
              next[idx] = 'spillover-b filled';
              return next;
            });
          }, (idx - 24) * 40);
        })(i);
      }
    }, 7500);

    schedule(function() {
      setCaptionAnimated('★ ' + t('gridStream.caption.complete'));
      setGridCells(function(prev) {
        var next = prev.slice();
        next[63] = 'completion filled';
        return next;
      });
      setTipsShown(function(p) { return Object.assign({}, p, {tip3: true}); });
    }, 10000);
  }, [setCaptionAnimated, t]);

  // Initial caption
  useEffect(function() {
    setCaption(t('gridStream.caption.start'));
    setCaptionShown(true);
  }, [t]);

  // Auto-play when grid scrolls into view
  useEffect(function() {
    if (!gridWrapRef.current) return;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting && !hasPlayedRef.current) {
          hasPlayedRef.current = true;
          setTimeout(playGridSequence, 500);
        }
      });
    }, { threshold: 0.35 });
    observer.observe(gridWrapRef.current);
    return function() { observer.disconnect(); };
  }, [playGridSequence]);

  // Cleanup on unmount
  useEffect(function() {
    return function() {
      animationTimeoutsRef.current.forEach(function(id) { clearTimeout(id); });
    };
  }, []);

  // ═════════ Calculator math ═════════
  var tierPrice = TIER_PRICES[currentTier - 1];
  var directCount = Math.min(refs, 63);
  var spilloverCount = Math.max(0, 63 - directCount);
  var directEarn = directCount * tierPrice * 0.40;
  var uniEarn = spilloverCount * tierPrice * 0.0625;
  var rCycle = Math.round(directEarn + uniEarn);
  var rBonus = Math.round(tierPrice * 3.2);
  var rYear = (rCycle + rBonus) * cycles;

  var activeColor = TIER_COLORS[currentTier];
  var activeTierName = t('gridStream.tier.' + TIER_NAME_KEYS[currentTier - 1]);

  var personSvg = (
    <svg viewBox="0 0 48 64">
      <circle cx="24" cy="16" r="10" fill="currentColor"/>
      <path d="M8 56 C 8 40, 40 40, 40 56 L 40 64 L 8 64 Z" fill="currentColor"/>
    </svg>
  );

  return (
    <div className="grid-stream-page">
      <style>{gridStreamStyles}</style>

      <div className="ambient-bg"></div>
      <div className="ambient-stars"></div>

      {/* TOP — minimal back link */}
      <nav className="stream-nav">
        <div className="stream-nav-inner">
          <Link to="/explore/compensation" className="stream-back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('gridStream.backLink')}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1" fill="#fff"/>
            <rect x="13" y="4" width="7" height="7" rx="1" fill="#fff" opacity=".8"/>
            <rect x="4" y="13" width="7" height="7" rx="1" fill="#fff" opacity=".8"/>
            <rect x="13" y="13" width="7" height="7" rx="1" fill="#fff" opacity=".6"/>
          </svg>
        </div>
        <div className="hero-tag">{t('gridStream.hero.tag')}</div>
        <h1 className="hero-h">
          <span className="word w1">{t('gridStream.hero.word1')}</span>{' '}
          <span className="word w2">{t('gridStream.hero.word2')}</span>{' '}
          <span className="word w3">{t('gridStream.hero.word3')}</span>
          <span className="line2">
            <span className="word w4">{t('gridStream.hero.word4')}</span>{' '}
            <span className="word w5">{t('gridStream.hero.word5')}</span>
          </span>
        </h1>
        <div className="hero-promise">
          <div className="hero-promise-label">{t('gridStream.hero.promiseLabel')}</div>
          <span className="hero-promise-val">${heroMaxValue.toLocaleString()}</span>
          <div className="hero-promise-sub">{t('gridStream.hero.promiseSub')}</div>
        </div>
        <p className="hero-sub">{t('gridStream.hero.sub')}</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">64</span>
            <div className="hero-stat-label">{t('gridStream.hero.stat1Label')}</div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">8</span>
            <div className="hero-stat-label">{t('gridStream.hero.stat2Label')}</div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">∞</span>
            <div className="hero-stat-label">{t('gridStream.hero.stat3Label')}</div>
          </div>
        </div>
        <div className="hero-scroll">{t('gridStream.hero.scroll')}</div>
      </section>

      {/* SECTION 1 — THE GRID IN ACTION */}
      <section className="grid-action-section">
        <div className="grid-action-intro">
          <div className="grid-action-tag">{t('gridStream.section1.tag')}</div>
          <h2 className="grid-action-h">
            {t('gridStream.section1.title')}
            <span className="accent">{t('gridStream.section1.titleAccent')}</span>
          </h2>
          <p className="grid-action-sub">{t('gridStream.section1.sub')}</p>
        </div>

        <div className="grid-stage">
          <div className="grid-wrap" ref={gridWrapRef}>
            <div className="grid-caption-wrap">
              <div className={'grid-caption' + (captionShown ? ' show' : '')}>{caption}</div>
            </div>
            <div className="iso-stage">
              <div className="iso-grid">
                {gridCells.map(function(cls, i) {
                  return (
                    <div key={i} className={'iso-cell ' + cls}>
                      {personSvg}
                    </div>
                  );
                })}
              </div>
              <div id="tip-1" className={'grid-tip t-amber' + (tipsShown.tip1 ? ' show' : '')}>
                <div className="grid-tip-label">{t('gridStream.tip.directLabel')}</div>
                <div className="grid-tip-val">+$160</div>
              </div>
              <div id="tip-2" className={'grid-tip t-sky' + (tipsShown.tip2 ? ' show' : '')}>
                <div className="grid-tip-label">{t('gridStream.tip.uniLabel')}</div>
                <div className="grid-tip-val">+$20</div>
              </div>
              <div id="tip-3" className={'grid-tip t-purple' + (tipsShown.tip3 ? ' show' : '')}>
                <div className="grid-tip-label">{t('gridStream.tip.bonusLabel')}</div>
                <div className="grid-tip-val">+$1,280</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-stats">
          <div className={'grid-stat' + (statsRevealed ? ' in' : '')}>
            <span className="grid-stat-num">64</span>
            <div className="grid-stat-label">{t('gridStream.gridStat.seats')}</div>
          </div>
          <div className={'grid-stat' + (statsRevealed ? ' in' : '')}>
            <span className="grid-stat-num">40%</span>
            <div className="grid-stat-label">{t('gridStream.gridStat.direct')}</div>
          </div>
          <div className={'grid-stat' + (statsRevealed ? ' in' : '')}>
            <span className="grid-stat-num">50%</span>
            <div className="grid-stat-label">{t('gridStream.gridStat.uni')}</div>
          </div>
          <div className={'grid-stat' + (statsRevealed ? ' in' : '')}>
            <span className="grid-stat-num">5%</span>
            <div className="grid-stat-label">{t('gridStream.gridStat.bonus')}</div>
          </div>
        </div>

        <div className="grid-controls">
          <button className="grid-btn" onClick={resetGrid}>{t('gridStream.btn.reset')}</button>
          <button className="grid-btn primary" onClick={playGridSequence}>{t('gridStream.btn.play')}</button>
        </div>
      </section>

      {/* SECTION 2 — THE MECHANIC */}
      <section className="section">
        <div className="section-tag">{t('gridStream.section2.tag')}</div>
        <h2 className="section-h">
          {t('gridStream.section2.title')}
          <span className="accent">{t('gridStream.section2.titleAccent')}</span>
        </h2>
        <p className="section-sub">{t('gridStream.section2.sub')}</p>

        <div className="mechanic-wrap">
          <MechanicCard
            stepNum="01"
            stepData={1}
            title={t('gridStream.mechanic.step1Title')}
            desc={t('gridStream.mechanic.step1Desc')}
            cells={mechanicGridConfig.step1}
          />
          <MechanicCard
            stepNum="02"
            stepData={2}
            title={t('gridStream.mechanic.step2Title')}
            descNode={
              <>
                {t('gridStream.mechanic.step2DescPre')}{' '}
                <Term label={t('gridStream.term.spillover')}
                      title={t('gridStream.term.spilloverTitle')}
                      definition={t('gridStream.term.spilloverDef')} />
                {t('gridStream.mechanic.step2DescPost')}
              </>
            }
            cells={mechanicGridConfig.step2}
          />
          <MechanicCard
            stepNum="03"
            stepData={3}
            title={t('gridStream.mechanic.step3Title')}
            desc={t('gridStream.mechanic.step3Desc')}
            cells={mechanicGridConfig.step3}
          />
        </div>
      </section>

      {/* SECTION 3 — EARNINGS CALCULATOR */}
      <section className="calc-section">
        <div className="calc-wrap">
          <div className="calc-tag">{t('gridStream.section3.tag')}</div>
          <h2 className="calc-h">
            {t('gridStream.section3.title')}
            <span className="accent">{t('gridStream.section3.titleAccent')}</span>
          </h2>
          <p className="calc-sub">{t('gridStream.section3.sub')}</p>

          <div className="calc-stage">
            {/* LEFT: Controls */}
            <div className="calc-controls">
              <div className="calc-row">
                <label style={{marginBottom: 4}}>
                  {t('gridStream.calc.tierLabel')}
                  <span className="v" style={{color: activeColor, textShadow: '0 0 16px ' + activeColor + '55'}}>
                    {currentTier} — {activeTierName}
                  </span>
                </label>
                <div className="calc-tier-buttons">
                  {[1,2,3,4,5,6,7,8].map(function(n) {
                    var isActive = currentTier === n;
                    return (
                      <button
                        key={n}
                        className={'tier-btn' + (isActive ? ' active' : '')}
                        data-tier={n}
                        onClick={function() { setCurrentTier(n); }}
                      >
                        <div className="t-num">0{n}</div>
                        <div className="t-name">{t('gridStream.tier.' + TIER_NAME_KEYS[n-1])}</div>
                        <div className="t-price">${TIER_PRICES[n-1].toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="calc-row">
                <label>
                  {t('gridStream.calc.refsLabel')}
                  <span className="v">{refs}</span>
                </label>
                <input
                  type="range" min="0" max="64" value={refs}
                  className="calc-slider"
                  onChange={function(e) { setRefs(parseInt(e.target.value)); }}
                />
                <div className="calc-slider-marks">
                  <span>0</span><span>16</span><span>32</span><span>48</span><span>64</span>
                </div>
              </div>
              <div className="calc-row">
                <label>
                  {t('gridStream.calc.cyclesLabel')}
                  <span className="v">{cycles}</span>
                </label>
                <input
                  type="range" min="0" max="12" value={cycles}
                  className="calc-slider"
                  onChange={function(e) { setCycles(parseInt(e.target.value)); }}
                />
                <div className="calc-slider-marks">
                  <span>0</span><span>3</span><span>6</span><span>9</span><span>12</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Hero result */}
            <div className="calc-hero-result">
              <div className="calc-hero-label">{t('gridStream.calc.annualLabel')}</div>
              <div className="calc-hero-num-wrap">
                <span className="calc-hero-num">${rYear.toLocaleString()}</span>
              </div>
              <div className="calc-hero-sub">{t('gridStream.calc.annualSub')}</div>
              <div className="calc-hero-divider"></div>
              <div className="calc-hero-stats">
                <div className="calc-hero-stat">
                  <div className="calc-hero-stat-label">{t('gridStream.calc.cycleLabel')}</div>
                  <div className="calc-hero-stat-num">${rCycle.toLocaleString()}</div>
                  <div className="calc-hero-stat-sub">
                    {t('gridStream.calc.cycleSubPre')}{' '}
                    <Term label={t('gridStream.term.unilevel')}
                          title={t('gridStream.term.unilevelTitle')}
                          definition={t('gridStream.term.unilevelDef')} />
                    {t('gridStream.calc.cycleSubPost')}
                  </div>
                </div>
                <div className="calc-hero-stat is-bonus">
                  <div className="calc-hero-stat-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 21 12 16.51 5.82 21l2.36-7.15L2 9.36h7.61z"/>
                    </svg>
                    {t('gridStream.calc.bonusBadge')}
                  </div>
                  <div className="calc-hero-stat-label">{t('gridStream.calc.bonusLabel')}</div>
                  <div className="calc-hero-stat-num">${rBonus.toLocaleString()}</div>
                  <div className="calc-hero-stat-sub">{t('gridStream.calc.bonusSub')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — HONEST MOMENT */}
      <section className="honest">
        <div className="honest-card">
          <div className="honest-quote-mark">"</div>
          <div className="honest-content">
            <div className="honest-tag">{t('gridStream.section4.tag')}</div>
            <h2 className="honest-h">
              {t('gridStream.section4.title')}
              <span className="accent">{t('gridStream.section4.titleAccent')}</span>
            </h2>
            <p dangerouslySetInnerHTML={{__html: t('gridStream.section4.p1')}}></p>
            <p dangerouslySetInnerHTML={{__html: t('gridStream.section4.p2')}}></p>
            <div className="honest-key">
              <div className="honest-key-label">{t('gridStream.section4.keyLabel')}</div>
              <div className="honest-key-text">{t('gridStream.section4.keyText')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — CTA */}
      <section className="cta">
        <div className="cta-h">
          {t('gridStream.cta.title')}
          <span className="emph">{t('gridStream.cta.titleAccent')}</span>
        </div>
        <Link to="/register" className="cta-btn">
          {t('gridStream.cta.button')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </section>
    </div>
  );
}

// ═════════ Sub-components ═════════
function MechanicCard(props) {
  return (
    <div className="mechanic-step" data-step={props.stepData}>
      <div className="mechanic-illus">
        <div className="mini-grid">
          {Array.from({length: 64}).map(function(_, i) {
            var cls = 'mini-cell';
            if (props.cells.you && props.cells.you.indexOf(i) >= 0) cls += ' you';
            if (props.cells.row1 && props.cells.row1.indexOf(i) >= 0) cls += ' row1';
            if (props.cells.spill && props.cells.spill.indexOf(i) >= 0) cls += ' spill';
            if (props.cells.done && props.cells.done.indexOf(i) >= 0) cls += ' done';
            return <div key={i} className={cls}></div>;
          })}
        </div>
      </div>
      <div className="mechanic-text">
        <div className="mechanic-num">{props.stepNum}</div>
        <div className="mechanic-title">{props.title}</div>
        <div className="mechanic-desc">{props.descNode || props.desc}</div>
      </div>
    </div>
  );
}

function Term(props) {
  return (
    <span className="term">
      {props.label}
      <span className="term-def">
        <strong>{props.title}</strong>
        {props.definition}
      </span>
    </span>
  );
}

// ═════════ Mechanic mini-grid configs ═════════
var mechanicGridConfig = {
  step1: { you: [0], row1: [1,2,3] },
  step2: {
    you: [0],
    row1: [1,2,3],
    spill: [4,5,6,7].concat(Array.from({length: 48}, function(_, i) { return i + 8; }))
  },
  step3: {
    you: [0],
    row1: [1,2,3],
    spill: [4,5,6,7].concat(Array.from({length: 55}, function(_, i) { return i + 8; })),
    done: [63]
  }
};

// ═════════ Inline styles (copied verbatim from mockup) ═════════
var gridStreamStyles = `
:root{
  --cobalt-deepest:#020617;
  --cobalt-deep:#050a1f;
  --cobalt:#0b1230;
  --cobalt-mid:#1a2558;
  --sky:#0ea5e9;
  --sky-bright:#38bdf8;
  --sky-pale:#7dd3fc;
  --indigo:#4f46e5;
  --indigo-soft:#818cf8;
  --indigo-deep:#3730a3;
  --purple:#9333ea;
  --purple-soft:#c084fc;
  --purple-bright:#d8b4fe;
  --amber:#fbbf24;
  --amber-bright:#fcd34d;
  --amber-deep:#f59e0b;
  --green:#10b981;
  --green-bright:#34d399;
  --green-pale:#6ee7b7;
  --pink:#ec4899;
  --ink:#fafbff;
  --ink-80:rgba(250,251,255,.8);
  --ink-70:rgba(250,251,255,.7);
  --ink-60:rgba(250,251,255,.6);
  --ink-50:rgba(250,251,255,.5);
  --ink-40:rgba(250,251,255,.4);
  --ink-30:rgba(250,251,255,.3);
  --ink-20:rgba(250,251,255,.2);
  --ink-10:rgba(250,251,255,.1);
  --ink-05:rgba(250,251,255,.05);
}
.grid-stream-page,.grid-stream-page *{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
.grid-stream-page{background:#0b1230;color:var(--ink);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.5;overflow-x:hidden;min-height:100vh}

/* ════════════════════════════════════════
   AMBIENT BACKGROUND — calmer treatment matching Nexus (sky/indigo-tinted)
   ════════════════════════════════════════ */
.ambient-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:
  radial-gradient(ellipse 70% 50% at 50% 0%,rgba(56,189,248,.16),transparent 60%),
  radial-gradient(ellipse 60% 40% at 10% 100%,rgba(79,70,229,.14),transparent 60%),
  radial-gradient(ellipse 60% 40% at 90% 100%,rgba(147,51,234,.12),transparent 60%);
}
.ambient-stars{position:fixed;inset:0;z-index:0;pointer-events:none;
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

/* ════════════════════════════════════════
   MOCKUP BANNER
   ════════════════════════════════════════ */


/* ════════════════════════════════════════
   TOP NAV — minimal back link only
   ════════════════════════════════════════ */
.stream-nav{position:absolute;top:0;left:0;right:0;z-index:100;padding:24px 0;pointer-events:none}
.stream-nav-inner{max-width:1320px;margin:0 auto;padding:0 48px;pointer-events:none}
.stream-back{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:12px;background:rgba(11,18,48,.5);backdrop-filter:blur(16px);border:1px solid var(--ink-10);color:var(--ink-60);text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;transition:all .3s cubic-bezier(.2,.9,.3,1);opacity:0;animation:backFade .8s ease-out .3s forwards}
.stream-back:hover{color:var(--ink);border-color:rgba(56,189,248,.4);background:rgba(11,18,48,.7);transform:translateX(-2px)}
.stream-back svg{width:14px;height:14px;transition:transform .3s}
.stream-back:hover svg{transform:translateX(-2px)}
@keyframes backFade{to{opacity:1}}

/* ════════════════════════════════════════
   COMMON
   ════════════════════════════════════════ */
.section{position:relative;z-index:2;padding:70px 48px;max-width:1320px;margin:0 auto}
.section-tag{display:inline-flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--sky-bright);letter-spacing:.22em;text-transform:uppercase;margin-bottom:22px}
.section-tag::before{content:'';width:40px;height:1px;background:var(--sky-bright);opacity:.6}
.section-h{font-family:'Sora',sans-serif;font-size:clamp(36px,4.6vw,64px);font-weight:900;line-height:.98;letter-spacing:-.04em;margin-bottom:20px}
.section-h .accent{display:block;font-weight:300;letter-spacing:-.025em;color:var(--ink);opacity:.7;line-height:1.1;font-size:.62em;margin-top:6px}
.section-sub{font-size:18px;line-height:1.6;color:var(--ink-60);max-width:680px}

.reveal{opacity:0;transform:translateY(40px);transition:opacity 1.1s cubic-bezier(.2,.9,.3,1),transform 1.1s cubic-bezier(.2,.9,.3,1)}
.reveal.visible{opacity:1;transform:translateY(0)}

/* ════════════════════════════════════════
   HERO — cinematic with earning promise
   ════════════════════════════════════════ */
.hero{position:relative;min-height:auto;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:90px 48px 70px;z-index:2;overflow:hidden}

.hero-mark{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,var(--sky),var(--indigo) 60%,var(--purple));display:flex;align-items:center;justify-content:center;margin-bottom:28px;position:relative;animation:heroMarkRise 1.6s cubic-bezier(.2,.9,.3,1) both;box-shadow:0 0 80px rgba(14,165,233,.65),0 0 160px rgba(79,70,229,.35)}
.hero-mark::before{content:'';position:absolute;inset:-4px;border-radius:28px;background:linear-gradient(135deg,var(--sky),var(--sky-pale),var(--purple));z-index:-1;opacity:.5;filter:blur(14px);animation:markPulse 4s ease-in-out infinite}
.hero-mark::after{content:'';position:absolute;inset:-18px;border-radius:44px;border:1px solid rgba(56,189,248,.25);animation:markRing 6s ease-in-out infinite}
.hero-mark svg{width:40px;height:40px;color:#fff}
@keyframes heroMarkRise{0%{opacity:0;transform:translateY(-20px) scale(.8)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes markPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.75;transform:scale(1.04)}}
@keyframes markRing{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.08);opacity:.15}}

.hero-tag{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--sky-bright);letter-spacing:.24em;text-transform:uppercase;margin-bottom:22px;opacity:0;animation:heroFade .9s ease-out .6s forwards;display:inline-flex;align-items:center;gap:14px}
.hero-tag::before,.hero-tag::after{content:'';width:36px;height:1px;background:var(--sky-bright);opacity:.6}

.hero-h{font-family:'Sora',sans-serif;font-size:clamp(42px,6vw,88px);font-weight:900;line-height:.92;letter-spacing:-.05em;margin-bottom:16px;max-width:1200px}
.hero-h .word{display:inline-block;opacity:0;transform:translateY(20px)}
.hero-h .word.w1{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) .85s forwards}
.hero-h .word.w2{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) 1.0s forwards}
.hero-h .word.w3{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) 1.15s forwards}
.hero-h .line2{display:block;font-weight:300;letter-spacing:-.03em;color:var(--sky-pale);opacity:.85;margin-top:8px;font-size:.62em}
.hero-h .line2 .word.w4{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.55s forwards}
.hero-h .line2 .word.w5{animation:wordRise .8s cubic-bezier(.2,.9,.3,1) 1.7s forwards}
@keyframes wordRise{from{opacity:0;transform:translateY(24px)}to{opacity:.85;transform:translateY(0)}}
@keyframes wordRiseBright{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

/* Giant earnings promise — the "up to" number */
.hero-promise{margin:32px 0 20px;opacity:0;animation:heroFade 1s ease-out 2.0s forwards;position:relative}
.hero-promise-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-40);font-weight:700;margin-bottom:8px}
.hero-promise-val{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(56px,7.5vw,104px);letter-spacing:-.055em;line-height:.9;background:linear-gradient(180deg,#fef3c7 0%,var(--amber-bright) 40%,var(--amber) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 60px rgba(251,191,36,.5));display:inline-block}
.hero-promise-sub{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-50);font-weight:600;margin-top:8px}

.hero-sub{font-size:19px;line-height:1.55;color:var(--ink-60);max-width:620px;margin:20px auto 48px;opacity:0;animation:heroFade 1s ease-out 2.3s forwards}

.hero-stats{display:flex;gap:56px;margin-bottom:56px;opacity:0;animation:heroFade 1s ease-out 2.6s forwards}
.hero-stat{text-align:left}
.hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.03em;color:var(--sky-bright);line-height:1;text-shadow:0 0 32px rgba(56,189,248,.35);display:block;margin-bottom:6px}
.hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-40);font-weight:600}

.hero-scroll{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-40);letter-spacing:.22em;text-transform:uppercase;opacity:0;animation:heroFade 1s ease-out 3.0s forwards,scrollNudge 2.6s ease-in-out 3.8s infinite}
.hero-scroll::before{content:'';display:inline-block;width:1px;height:32px;background:linear-gradient(180deg,transparent,var(--ink-40));margin-right:10px;vertical-align:middle}
@keyframes heroFade{to{opacity:1}}
@keyframes scrollNudge{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(8px);opacity:.95}}

/* ════════════════════════════════════════
   SECTION 1 — THE MECHANIC (3-STEP EXPLAINER)
   Grid illustration FIRST (on top), text BELOW
   ════════════════════════════════════════ */
.mechanic-wrap{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:60px}
.mechanic-step{padding:0;border-radius:24px;background:linear-gradient(180deg,rgba(23,37,84,.72),rgba(11,18,48,.52));border:1px solid var(--ink-10);position:relative;overflow:hidden;transition:transform .5s,border-color .4s;backdrop-filter:blur(14px);display:flex;flex-direction:column}
.mechanic-step::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--step-accent);z-index:2}
.mechanic-step:hover{transform:translateY(-4px);border-color:var(--step-accent)}
.mechanic-step[data-step="1"]{--step-accent:var(--amber);--step-accent-rgb:251,191,36}
.mechanic-step[data-step="2"]{--step-accent:var(--indigo-soft);--step-accent-rgb:129,140,248}
.mechanic-step[data-step="3"]{--step-accent:var(--purple-soft);--step-accent-rgb:192,132,252}

/* Grid illustration — on TOP, featured */
.mechanic-illus{padding:44px 28px 36px;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(var(--step-accent-rgb),.1),transparent 70%);border-bottom:1px solid var(--ink-10);min-height:300px}

/* Text block — BELOW */
.mechanic-text{padding:32px 32px 36px;flex-shrink:0}
.mechanic-num{font-family:'JetBrains Mono',monospace;font-size:38px;font-weight:900;color:var(--step-accent);letter-spacing:-.05em;line-height:1;margin-bottom:12px;opacity:.9}
.mechanic-title{font-family:'Sora',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;margin-bottom:12px;line-height:1.2}
.mechanic-desc{font-size:14px;line-height:1.65;color:var(--ink-60)}

/* Bigger mini-grids — 260px wide, proper visual presence */
.mini-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;width:260px}
.mini-cell{aspect-ratio:1;border-radius:5px;background:rgba(255,255,255,.04);transition:all .4s}
.mini-cell.you{background:linear-gradient(135deg,#fef3c7,#fde68a);box-shadow:0 0 10px rgba(251,191,36,.6),inset 0 1px 0 rgba(255,255,255,.5)}
.mini-cell.row1{background:linear-gradient(135deg,var(--amber-deep),var(--amber-bright));box-shadow:0 0 6px rgba(251,191,36,.4)}
.mini-cell.spill{background:linear-gradient(135deg,var(--indigo),var(--indigo-soft));box-shadow:0 0 4px rgba(79,70,229,.3)}
.mini-cell.done{background:linear-gradient(135deg,var(--purple),var(--purple-soft));box-shadow:0 0 14px rgba(168,85,247,.8);animation:miniPulse 1.6s ease-in-out infinite}
@keyframes miniPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}

/* ════════════════════════════════════════
   SECTION 2 — THE GRID IN ACTION (HERO VIZ)
   ════════════════════════════════════════ */
.grid-action-section{position:relative;padding:70px 0 80px;z-index:2;overflow:hidden}
.grid-action-intro{max-width:1100px;margin:0 auto 60px;padding:0 48px;text-align:center}
.grid-action-tag{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--sky-bright);letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:22px;display:inline-flex;align-items:center;gap:14px}
.grid-action-tag::before,.grid-action-tag::after{content:'';width:48px;height:1px;background:var(--sky-bright);opacity:.6}
.grid-action-h{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(36px,4.6vw,64px);line-height:.98;letter-spacing:-.045em;margin-bottom:22px}
.grid-action-h .accent{display:block;font-weight:300;color:var(--sky-pale);opacity:.85;font-size:.62em;margin-top:6px}
.grid-action-sub{font-size:18px;color:var(--ink-60);max-width:620px;margin:0 auto;line-height:1.6}

.grid-stage{position:relative;max-width:1240px;margin:0 auto;padding:0 48px}

/* Floating grid — no containment panel, just ambient glow on the page */
.grid-wrap{position:relative;padding:40px 0 80px;min-height:820px;overflow:visible}

/* Ambient glow that sits behind the grid on the page itself */
.grid-wrap::before{content:'';position:absolute;top:10%;left:50%;transform:translateX(-50%);width:min(900px,90vw);height:700px;background:
  radial-gradient(ellipse at center,rgba(56,189,248,.3) 0%,rgba(56,189,248,.12) 35%,transparent 65%);
  filter:blur(60px);pointer-events:none;z-index:0;animation:gridAmbientA 14s ease-in-out infinite}
.grid-wrap::after{content:'';position:absolute;bottom:5%;left:50%;transform:translateX(-50%);width:min(700px,80vw);height:400px;background:
  radial-gradient(ellipse at center,rgba(147,51,234,.22) 0%,rgba(147,51,234,.08) 40%,transparent 70%);
  filter:blur(60px);pointer-events:none;z-index:0;animation:gridAmbientB 16s ease-in-out infinite}
@keyframes gridAmbientA{0%,100%{transform:translate(-50%,0)}50%{transform:translate(calc(-50% + 30px),20px)}}
@keyframes gridAmbientB{0%,100%{transform:translate(-50%,0)}50%{transform:translate(calc(-50% - 25px),-20px)}}

/* Caption above the grid */
.grid-caption-wrap{min-height:60px;margin-bottom:40px;display:flex;align-items:center;justify-content:center;position:relative;z-index:5}.grid-caption{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--sky-bright);text-align:center;opacity:0;transform:translateY(8px);transition:all .5s cubic-bezier(.2,.9,.3,1);padding:14px 32px;border-radius:100px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);backdrop-filter:blur(10px);font-weight:700}
.grid-caption.show{opacity:1;transform:translateY(0)}

/* Isometric grid — bigger than v3 */
.iso-stage{position:relative;width:100%;height:620px;display:flex;align-items:center;justify-content:center;perspective:1400px;perspective-origin:50% 40%;z-index:2}
.iso-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:9px;width:640px;height:640px;transform:rotateX(56deg) rotateZ(-45deg);transform-style:preserve-3d;transform-origin:center center}
.iso-cell{aspect-ratio:1;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;position:relative;transition:all .7s cubic-bezier(.34,1.56,.64,1);
  /* Base depth — simulated tile thickness via stacked shadows */
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,.1),
    inset 0 -2px 4px rgba(0,0,0,.3),
    0 2px 0 rgba(0,0,0,.25),
    0 4px 0 rgba(0,0,0,.2),
    0 6px 0 rgba(0,0,0,.15),
    0 8px 12px rgba(0,0,0,.4)}
.iso-cell svg{width:62%;height:62%;opacity:0;transition:opacity .5s}
.iso-cell.filled svg{opacity:.95;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}

/* YOU — tallest tile, brightest */
.iso-cell.you{background:linear-gradient(135deg,#fef3c7 0%,#fde68a 60%,#fbbf24 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,.8),
    inset 0 -3px 6px rgba(146,64,14,.3),
    0 2px 0 rgba(146,64,14,.4),
    0 4px 0 rgba(146,64,14,.35),
    0 6px 0 rgba(146,64,14,.3),
    0 8px 0 rgba(146,64,14,.25),
    0 10px 0 rgba(146,64,14,.2),
    0 0 32px rgba(251,191,36,.7),
    0 14px 28px rgba(0,0,0,.5);
  z-index:10;transform:translateZ(20px)}
.iso-cell.you svg{color:var(--cobalt-deep);opacity:1}

/* Row 1 directs — amber, tall tile */
.iso-cell.row-1{background:linear-gradient(135deg,var(--amber-bright) 0%,var(--amber) 55%,var(--amber-deep) 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,.5),
    inset 0 -3px 5px rgba(146,64,14,.35),
    0 2px 0 rgba(146,64,14,.5),
    0 4px 0 rgba(146,64,14,.4),
    0 6px 0 rgba(146,64,14,.3),
    0 8px 0 rgba(146,64,14,.22),
    0 0 22px rgba(251,191,36,.5),
    0 10px 20px rgba(0,0,0,.45);
  transform:translateZ(14px)}
.iso-cell.row-1 svg{color:var(--cobalt-deep);opacity:1}

/* Spillover A — indigo, medium tile */
.iso-cell.spillover-a{background:linear-gradient(135deg,var(--indigo-soft) 0%,var(--indigo) 55%,var(--indigo-deep) 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,.3),
    inset 0 -3px 5px rgba(30,27,75,.5),
    0 2px 0 rgba(30,27,75,.6),
    0 4px 0 rgba(30,27,75,.5),
    0 6px 0 rgba(30,27,75,.4),
    0 0 18px rgba(79,70,229,.4),
    0 8px 18px rgba(0,0,0,.45);
  transform:translateZ(10px)}
.iso-cell.spillover-a svg{color:#fff;opacity:.95}

/* Spillover B — sky, shorter tile */
.iso-cell.spillover-b{background:linear-gradient(135deg,var(--sky-bright) 0%,var(--sky) 55%,#0369a1 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,.3),
    inset 0 -3px 5px rgba(7,89,133,.5),
    0 2px 0 rgba(7,89,133,.6),
    0 4px 0 rgba(7,89,133,.5),
    0 6px 0 rgba(7,89,133,.35),
    0 0 18px rgba(14,165,233,.4),
    0 8px 18px rgba(0,0,0,.45);
  transform:translateZ(7px)}
.iso-cell.spillover-b svg{color:#fff;opacity:.95}

.iso-cell.filled{animation:cellPopIn .7s cubic-bezier(.34,1.56,.64,1) both}
@keyframes cellPopIn{from{transform:translateZ(0) scale(0);opacity:0}60%{transform:translateZ(12px) scale(1.12)}to{opacity:1}}

/* Completion — tallest, most dramatic */
.iso-cell.completion{background:linear-gradient(135deg,var(--purple-bright) 0%,var(--purple) 55%,#6b21a8 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,.6),
    inset 0 -4px 8px rgba(88,28,135,.5),
    0 2px 0 rgba(88,28,135,.6),
    0 4px 0 rgba(88,28,135,.55),
    0 6px 0 rgba(88,28,135,.5),
    0 8px 0 rgba(88,28,135,.4),
    0 10px 0 rgba(88,28,135,.3),
    0 12px 0 rgba(88,28,135,.2),
    0 0 56px rgba(168,85,247,.95),
    0 16px 32px rgba(0,0,0,.5);
  z-index:8;animation:completionGlow 1.4s ease-in-out infinite}
@keyframes completionGlow{0%,100%{transform:translateZ(24px);filter:brightness(1)}50%{transform:translateZ(36px);filter:brightness(1.15)}}
.iso-cell.completion svg{color:#fff;opacity:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}

/* Floating tooltip labels — positioned in safe zones, never clip */
.grid-tip{position:absolute;padding:14px 18px;border-radius:14px;background:linear-gradient(180deg,rgba(15,23,50,.97),rgba(15,23,50,.92));backdrop-filter:blur(16px);border:1px solid var(--tip-color,var(--sky-bright));box-shadow:0 16px 40px rgba(0,0,0,.6),0 0 32px rgba(var(--tip-rgb,56,189,248),.35);z-index:20;opacity:0;transform:translateY(6px) scale(.95);transition:all .6s cubic-bezier(.2,.9,.3,1);min-width:160px;pointer-events:none}
.grid-tip.show{opacity:1;transform:translateY(0) scale(1)}
.grid-tip-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--tip-color,var(--sky-bright));font-weight:700;margin-bottom:6px}
.grid-tip-val{font-family:'Sora',sans-serif;font-weight:900;font-size:28px;color:#fff;letter-spacing:-.02em;line-height:1}
.grid-tip.t-amber{--tip-color:var(--amber-bright);--tip-rgb:251,191,36}
.grid-tip.t-sky{--tip-color:var(--sky-bright);--tip-rgb:56,189,248}
.grid-tip.t-purple{--tip-color:var(--purple-soft);--tip-rgb:192,132,252}

/* Fixed tooltip positions within the stage — no clipping possible */
.grid-tip#tip-1{top:28%;right:8%}
.grid-tip#tip-2{top:52%;left:8%}
.grid-tip#tip-3{bottom:10%;right:12%}

/* Grid stats after */
.grid-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin:50px auto 0;max-width:880px;padding:0 48px;position:relative;z-index:2}
.grid-stat{padding:22px 18px;border-radius:16px;background:linear-gradient(180deg,rgba(11,18,48,.7),rgba(5,10,31,.5));border:1px solid var(--ink-10);text-align:center;opacity:0;transform:translateY(20px);transition:all .6s cubic-bezier(.2,.9,.3,1)}
.grid-stat.in{opacity:1;transform:translateY(0)}
.grid-stat:nth-child(1){transition-delay:.1s}.grid-stat:nth-child(2){transition-delay:.2s}.grid-stat:nth-child(3){transition-delay:.3s}.grid-stat:nth-child(4){transition-delay:.4s}
.grid-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.025em;color:var(--sky-bright);margin-bottom:4px;display:block}
.grid-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-40)}

.grid-controls{display:flex;justify-content:center;gap:14px;margin-top:40px}
.grid-btn{padding:14px 28px;border-radius:12px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.4);color:var(--sky-bright);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:all .25s;backdrop-filter:blur(10px)}
.grid-btn:hover{background:rgba(56,189,248,.22);transform:translateY(-2px);box-shadow:0 8px 30px rgba(56,189,248,.3)}
.grid-btn.primary{background:linear-gradient(135deg,var(--sky),var(--sky-bright));color:var(--cobalt-deepest);border:none}


/* ════════════════════════════════════════
   SECTION 4 — CALCULATOR · Floating, no panel
   ════════════════════════════════════════ */
.calc-section{padding:80px 48px;max-width:1320px;margin:0 auto;position:relative;z-index:2}

/* Floating calculator — no containment panel, ambient glow on page */
.calc-wrap{position:relative;padding:40px 0;overflow:visible}

/* Ambient glow behind calculator — matches grid treatment */
.calc-wrap::before{content:'';position:absolute;top:0;right:8%;width:min(700px,50vw);height:600px;background:
  radial-gradient(ellipse at center,rgba(56,189,248,.28) 0%,rgba(56,189,248,.1) 40%,transparent 70%);
  filter:blur(70px);pointer-events:none;z-index:0;animation:calcAmbientA 16s ease-in-out infinite}
.calc-wrap::after{content:'';position:absolute;bottom:0;left:8%;width:min(600px,45vw);height:500px;background:
  radial-gradient(ellipse at center,rgba(147,51,234,.2) 0%,rgba(147,51,234,.06) 40%,transparent 70%);
  filter:blur(70px);pointer-events:none;z-index:0;animation:calcAmbientB 18s ease-in-out infinite}
@keyframes calcAmbientA{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,20px)}}
@keyframes calcAmbientB{0%,100%{transform:translate(0,0)}50%{transform:translate(25px,-15px)}}

.calc-tag{display:flex;align-items:center;justify-content:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--sky-bright);letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:18px;position:relative;z-index:2}
.calc-tag::before,.calc-tag::after{content:'';width:40px;height:1px;background:var(--sky-bright);opacity:.5}
.calc-h{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(36px,4.2vw,56px);letter-spacing:-.035em;line-height:1.02;margin-bottom:18px;text-align:center;position:relative;z-index:2}
.calc-h .accent{display:block;font-weight:300;color:var(--ink);opacity:.7;font-size:.62em;letter-spacing:-.025em;margin-top:6px}
.calc-sub{text-align:center;font-size:16px;color:var(--ink-60);max-width:600px;margin:0 auto 60px;position:relative;z-index:2;line-height:1.6}

.calc-stage{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;position:relative;z-index:2;padding-top:20px}
.calc-controls{display:flex;flex-direction:column;gap:42px}

/* Tier buttons - each one carries its own platform tier colour */
.calc-tier-buttons{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-top:10px;padding:10px;border-radius:14px;background:linear-gradient(180deg,rgba(56,189,248,.04),rgba(11,18,48,.4));border:1px solid var(--ink-10)}

/* Per-tier colour assignments — match the platform's CampaignTiers page exactly */
.tier-btn[data-tier="1"]{--tcolor:#10b981;--tcolor-bright:#34d399;--tcolor-rgb:16,185,129}
.tier-btn[data-tier="2"]{--tcolor:#3b82f6;--tcolor-bright:#60a5fa;--tcolor-rgb:59,130,246}
.tier-btn[data-tier="3"]{--tcolor:#8b5cf6;--tcolor-bright:#a78bfa;--tcolor-rgb:139,92,246}
.tier-btn[data-tier="4"]{--tcolor:#ec4899;--tcolor-bright:#f472b6;--tcolor-rgb:236,72,153}
.tier-btn[data-tier="5"]{--tcolor:#14b8a6;--tcolor-bright:#2dd4bf;--tcolor-rgb:20,184,166}
.tier-btn[data-tier="6"]{--tcolor:#9ca3af;--tcolor-bright:#d1d5db;--tcolor-rgb:156,163,175}
.tier-btn[data-tier="7"]{--tcolor:#f59e0b;--tcolor-bright:#fbbf24;--tcolor-rgb:245,158,11}
.tier-btn[data-tier="8"]{--tcolor:#ef4444;--tcolor-bright:#f87171;--tcolor-rgb:239,68,68}

.tier-btn{padding:12px 2px;border-radius:10px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);color:var(--ink-60);font-family:'DM Sans',sans-serif;cursor:pointer;transition:background .25s,border-color .25s,box-shadow .25s,color .25s;display:flex;flex-direction:column;align-items:center;gap:3px;backdrop-filter:blur(10px);width:100%;min-width:0;box-sizing:border-box;overflow:hidden}
.tier-btn:hover{background:rgba(var(--tcolor-rgb),.1);border-color:rgba(var(--tcolor-rgb),.5)}
.tier-btn .t-num{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.06em;color:var(--ink-40);text-transform:uppercase;transition:color .25s}
.tier-btn .t-name{font-family:'Sora',sans-serif;font-weight:700;font-size:11px;letter-spacing:-.005em;color:var(--ink-70);line-height:1.05;white-space:nowrap;text-overflow:ellipsis;max-width:100%;overflow:hidden;transition:color .25s}
.tier-btn .t-price{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-40);margin-top:2px;font-weight:500;transition:color .25s}
.tier-btn:hover .t-num{color:var(--tcolor-bright)}
.tier-btn.active{background:linear-gradient(180deg,rgba(var(--tcolor-rgb),.32),rgba(var(--tcolor-rgb),.14));border-color:var(--tcolor-bright);box-shadow:0 0 32px rgba(var(--tcolor-rgb),.55),inset 0 1px 0 rgba(255,255,255,.18)}
.tier-btn.active .t-num{color:var(--tcolor-bright)}
.tier-btn.active .t-name{color:#fff}
.tier-btn.active .t-price{color:rgba(255,255,255,.75)}

/* Slider rows */
.calc-row label{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-40)}
.calc-row label .v{font-family:'Sora',sans-serif;font-weight:800;font-size:28px;color:var(--sky-bright);letter-spacing:-.02em;text-transform:none;transition:transform .2s;display:inline-block;text-shadow:0 0 16px rgba(56,189,248,.3)}
.calc-row label .v.bump{animation:vBump .35s cubic-bezier(.2,.9,.3,1)}
@keyframes vBump{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}

/* Richer slider with glow track */
.calc-slider{width:100%;height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(56,189,248,.25),rgba(255,255,255,.05));outline:none;-webkit-appearance:none;cursor:pointer;position:relative;border:1px solid var(--ink-10)}
.calc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,var(--sky-bright) 50%,var(--sky) 100%);cursor:pointer;box-shadow:0 0 28px rgba(56,189,248,.7),0 4px 12px rgba(0,0,0,.4);transition:transform .18s;border:2px solid rgba(255,255,255,.3)}
.calc-slider::-webkit-slider-thumb:hover{transform:scale(1.18);box-shadow:0 0 40px rgba(56,189,248,.9)}
.calc-slider::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,var(--sky-bright) 50%,var(--sky) 100%);cursor:pointer;box-shadow:0 0 28px rgba(56,189,248,.7),0 4px 12px rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.3)}

/* Slider value markers below */
.calc-slider-marks{display:flex;justify-content:space-between;margin-top:12px;padding:0 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-50);font-weight:600;letter-spacing:.06em}

/* ════════════════════════════════════════
   HERO RESULT — floating, no panel
   ════════════════════════════════════════ */
.calc-hero-result{display:flex;flex-direction:column;align-items:flex-start;gap:0;position:relative}
.calc-hero-result::before{content:'';position:absolute;top:-15%;left:-15%;right:-15%;bottom:-15%;background:radial-gradient(ellipse at center,rgba(56,189,248,.15),transparent 65%);filter:blur(50px);pointer-events:none;z-index:-1}

.calc-hero-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--sky-bright);font-weight:700;margin-bottom:18px;display:flex;align-items:center;gap:14px}
.calc-hero-label::before{content:'';width:32px;height:1px;background:var(--sky-bright);opacity:.7}

.calc-hero-num-wrap{position:relative;line-height:.85;margin-bottom:18px}
.calc-hero-num{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(52px,6.5vw,88px);letter-spacing:-.045em;line-height:.95;background:linear-gradient(180deg,#fff 0%,var(--sky-bright) 50%,var(--sky) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 40px rgba(56,189,248,.45));display:inline-block;transition:transform .3s cubic-bezier(.2,.9,.3,1)}
.calc-hero-num.pulse{animation:heroResultPulse .6s cubic-bezier(.2,.9,.3,1)}
@keyframes heroResultPulse{0%{transform:scale(1)}40%{transform:scale(1.04)}100%{transform:scale(1)}}

.calc-hero-sub{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--ink-50);font-weight:600;margin-bottom:36px;line-height:1.5}

.calc-hero-divider{width:80px;height:1px;background:linear-gradient(90deg,var(--sky-bright),transparent);margin-bottom:32px}

.calc-hero-stats{display:flex;align-items:stretch;gap:32px;width:100%}
.calc-hero-stat{flex:1;min-width:0;position:relative}
.calc-hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-40);margin-bottom:10px;font-weight:600}
.calc-hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:32px;letter-spacing:-.025em;color:var(--ink);line-height:1;margin-bottom:8px;transition:transform .3s}
.calc-hero-stat-num.pulse{animation:heroResultPulse .6s cubic-bezier(.2,.9,.3,1)}
.calc-hero-stat-sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-40);letter-spacing:.04em;line-height:1.4}
.calc-hero-stat-divider{width:1px;background:linear-gradient(180deg,transparent,var(--ink-10) 30%,var(--ink-10) 70%,transparent);flex-shrink:0}

/* SPECIAL — completion bonus stat treatment (the reward moment) */
.calc-hero-stat.is-bonus{padding:18px 22px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(251,191,36,.1),rgba(245,158,11,.04));border:1px solid rgba(251,191,36,.32);position:relative;overflow:hidden}
.calc-hero-stat.is-bonus::before{content:'';position:absolute;inset:-30%;background:radial-gradient(ellipse at center,rgba(251,191,36,.18),transparent 65%);filter:blur(20px);pointer-events:none;animation:bonusGlow 3.5s ease-in-out infinite;z-index:0}
@keyframes bonusGlow{0%,100%{opacity:.55}50%{opacity:1}}
.calc-hero-stat.is-bonus > *{position:relative;z-index:1}
.calc-hero-stat-badge{display:inline-flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--cobalt-deepest);background:linear-gradient(135deg,var(--amber-bright),var(--amber-deep));padding:3px 8px;border-radius:6px;margin-bottom:10px;box-shadow:0 2px 12px rgba(251,191,36,.4)}
.calc-hero-stat-badge svg{width:10px;height:10px}
.calc-hero-stat.is-bonus .calc-hero-stat-label{color:rgba(251,191,36,.85)}
.calc-hero-stat.is-bonus .calc-hero-stat-num{background:linear-gradient(180deg,#fef3c7 0%,var(--amber-bright) 50%,var(--amber-deep) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 18px rgba(251,191,36,.45))}
.calc-hero-stat.is-bonus .calc-hero-stat-sub{color:rgba(251,191,36,.55)}

/* Burst particles for calc changes */
.calc-burst{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--sky-bright);pointer-events:none;opacity:0;box-shadow:0 0 12px var(--sky-bright)}

/* ════════════════════════════════════════
   SECTION 5 — HONEST MOMENT (composed, deliberate)
   ════════════════════════════════════════ */
.honest{padding:80px 48px 70px;max-width:1100px;margin:0 auto;position:relative;z-index:2}
.honest-card{position:relative;padding:80px 80px 72px;border-radius:32px;background:
  linear-gradient(180deg,rgba(16,185,129,.06) 0%,rgba(23,37,84,.5) 50%,rgba(11,18,48,.55) 100%);
  border:1px solid rgba(16,185,129,.2);
  backdrop-filter:blur(16px);
  overflow:hidden;
  box-shadow:0 30px 80px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05)}
.honest-card::before{content:'';position:absolute;top:-30%;left:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(16,185,129,.12),transparent 65%);filter:blur(60px);pointer-events:none}
.honest-card::after{content:'';position:absolute;bottom:-30%;right:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(56,189,248,.1),transparent 65%);filter:blur(60px);pointer-events:none}

/* Giant decorative quote mark */
.honest-quote-mark{position:absolute;top:24px;left:48px;font-family:'Sora',sans-serif;font-weight:900;font-size:160px;line-height:1;color:var(--green-bright);opacity:.1;pointer-events:none;letter-spacing:-.05em}

.honest-content{position:relative;z-index:2;max-width:780px;margin:0 auto;text-align:center}
.honest-tag{display:inline-flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green-pale);letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:26px}
.honest-tag::before,.honest-tag::after{content:'';width:32px;height:1px;background:var(--green-pale);opacity:.5}
.honest-h{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(32px,4vw,48px);letter-spacing:-.03em;line-height:1.1;margin-bottom:36px}
.honest-h .accent{color:var(--green-pale);opacity:.85;font-weight:300;display:block;margin-top:6px;font-size:.62em}
.honest p{font-size:17px;line-height:1.75;color:var(--ink-70);margin-bottom:22px;max-width:680px;margin-left:auto;margin-right:auto}
.honest p:last-of-type{margin-bottom:0}
.honest p strong{color:var(--ink);font-weight:700}

/* Emphasised key statement */
.honest-key{margin:36px auto;padding:28px 36px;border-left:3px solid var(--green-bright);background:linear-gradient(90deg,rgba(16,185,129,.1),transparent 80%);border-radius:0 14px 14px 0;text-align:left;max-width:680px}
.honest-key-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--green-bright);letter-spacing:.18em;text-transform:uppercase;font-weight:700;margin-bottom:8px}
.honest-key-text{font-family:'Sora',sans-serif;font-weight:700;font-size:22px;letter-spacing:-.015em;line-height:1.3;color:#fff}

/* ════════════════════════════════════════
   SECTION 6 — CTA
   ════════════════════════════════════════ */
.cta{padding:40px 48px 100px;max-width:1100px;margin:0 auto;text-align:center;position:relative;z-index:2}
.cta-h{font-family:'Sora',sans-serif;font-weight:300;font-size:clamp(34px,4.2vw,52px);letter-spacing:-.03em;line-height:1.2;margin-bottom:44px;color:var(--ink-70)}
.cta-h .emph{display:block;font-weight:800;color:var(--sky-bright);text-shadow:0 0 30px rgba(56,189,248,.5);margin-top:10px}
.cta-btn{display:inline-flex;align-items:center;gap:14px;padding:26px 52px;border-radius:18px;background:linear-gradient(135deg,var(--sky-bright),var(--sky));color:#fff;font-family:'Sora',sans-serif;font-size:18px;font-weight:800;text-decoration:none;letter-spacing:-.01em;transition:transform .3s cubic-bezier(.2,.9,.3,1),box-shadow .3s;box-shadow:0 18px 60px rgba(56,189,248,.5)}
.cta-btn:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 28px 80px rgba(56,189,248,.65)}

/* Inline term-definition tooltips for technical terms like "uni-level" and "spillover" */
.term{position:relative;display:inline;cursor:help;color:var(--sky-pale);border-bottom:1px dotted rgba(125,211,252,.5);transition:color .2s}
.term:hover{color:var(--sky-bright);border-bottom-color:var(--sky-bright)}
.term-def{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%) translateY(8px);width:280px;padding:14px 16px;border-radius:10px;background:linear-gradient(180deg,rgba(15,23,50,.98),rgba(15,23,50,.92));backdrop-filter:blur(16px);border:1px solid rgba(56,189,248,.4);box-shadow:0 16px 40px rgba(0,0,0,.6),0 0 24px rgba(56,189,248,.25);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.5;color:var(--ink-80);text-align:left;font-weight:400;letter-spacing:0;text-transform:none;opacity:0;visibility:hidden;transition:all .25s cubic-bezier(.2,.9,.3,1);pointer-events:none;z-index:50}
.term-def::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:rgba(56,189,248,.4)}
.term:hover .term-def{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}
.term-def strong{color:var(--sky-bright);font-weight:700;display:block;margin-bottom:4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}

/* ════════════════════════════════════════
   MOBILE FALLBACK — graceful degradation below 900px
   The primary audience is desktop/tablet, but a visitor arriving
   on mobile should see a readable page, not a broken layout.
   ════════════════════════════════════════ */
@media (max-width: 900px) {
  /* Section padding compressed */
  .section,.stream-section,.calc-section{padding:60px 20px}
  .hero{padding:90px 20px 60px;min-height:auto}
  .grid-action-section{padding:60px 0 80px}
  .honest{padding:60px 20px 40px}
  .cta{padding:40px 20px 80px}

  /* Top nav — minimal back link, stays floating */
  .stream-nav{position:absolute;padding:16px 0}
  .stream-nav-inner{padding:0 16px}
  .stream-back{padding:8px 12px;font-size:10px;letter-spacing:.12em}
  .stream-back svg{width:12px;height:12px}

  /* Hero — compress */
  .hero-mark{width:72px;height:72px;margin-bottom:24px}
  .hero-mark svg{width:30px;height:30px}
  .hero-tag::before,.hero-tag::after{width:20px}
  .hero-h{font-size:clamp(38px,10vw,56px);margin-bottom:10px}
  .hero-promise{margin:20px 0 14px}
  .hero-promise-val{font-size:clamp(48px,14vw,72px)}
  .hero-sub{font-size:15px;margin:14px auto 32px}
  .hero-stats{gap:28px;margin-bottom:36px;flex-wrap:wrap;justify-content:center}
  .hero-stat{text-align:center}
  .hero-stat-num{font-size:26px}

  /* Mechanic cards — single column */
  .mechanic-wrap{grid-template-columns:1fr;gap:14px}
  .mechanic-illus{padding:28px 20px;min-height:auto}
  .mini-grid{width:200px}
  .mechanic-text{padding:22px 20px 24px}
  .mechanic-num{font-size:32px;margin-bottom:8px}
  .mechanic-title{font-size:19px}

  /* Section headings */
  .section-h,.grid-action-h{font-size:clamp(32px,7vw,44px);margin-bottom:14px}
  .section-sub,.grid-action-sub{font-size:15px;margin-bottom:32px}

  /* THE GRID — replace isometric with flat 2D below mobile */
  .grid-hero-intro{padding:0 20px;margin-bottom:40px}
  .grid-stage{padding:0 20px}
  .grid-wrap{padding:30px 0 50px;min-height:auto}
  .grid-wrap::before,.grid-wrap::after{width:80%;height:300px}
  .grid-caption{font-size:11px;padding:10px 20px}
  .iso-stage{height:auto;perspective:none}
  .iso-grid{width:min(340px,86vw);height:auto;aspect-ratio:1;gap:6px;transform:none !important;transform-style:flat}
  .iso-cell{transform:none !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08) !important}
  .iso-cell.you{box-shadow:0 0 16px rgba(251,191,36,.6),inset 0 1px 0 rgba(255,255,255,.6) !important}
  .iso-cell.row-1{box-shadow:0 0 10px rgba(251,191,36,.5) !important}
  .iso-cell.spillover-a{box-shadow:0 0 8px rgba(79,70,229,.4) !important}
  .iso-cell.spillover-b{box-shadow:0 0 8px rgba(14,165,233,.4) !important}
  .iso-cell.completion{box-shadow:0 0 24px rgba(147,51,234,.7) !important;animation:none !important}
  .iso-cell svg{width:55%;height:55%}

  /* Tooltips — stack along sides, smaller */
  .grid-tip{padding:10px 12px;min-width:auto}
  .grid-tip-label{font-size:9px}
  .grid-tip-val{font-size:20px}
  .grid-tip#tip-1{top:10%;right:4%}
  .grid-tip#tip-2{top:45%;left:4%}
  .grid-tip#tip-3{bottom:8%;right:4%}

  .grid-stats{grid-template-columns:repeat(2,1fr);gap:10px;padding:0 20px;max-width:500px}
  .grid-stat{padding:16px 12px}
  .grid-stat-num{font-size:28px}
  .grid-controls{flex-direction:column;gap:10px;padding:0 20px}
  .grid-btn{width:100%}

  /* Calculator — stack controls and hero result */
  .calc-stage{grid-template-columns:1fr;gap:50px;align-items:start;padding-top:0}
  .calc-h{font-size:clamp(32px,6vw,44px)}
  .calc-sub{font-size:14px;margin-bottom:40px}
  .calc-tier-buttons{grid-template-columns:repeat(4,1fr);gap:6px}
  .tier-btn{padding:10px 2px}
  .tier-btn .t-name{font-size:11px}
  .calc-row label{font-size:10px}
  .calc-row label .v{font-size:20px}
  .calc-hero-num{font-size:clamp(54px,15vw,84px)}
  .calc-hero-stats{flex-direction:column;gap:24px}
  .calc-hero-stat-divider{width:100%;height:1px;background:linear-gradient(90deg,transparent,var(--ink-10) 30%,var(--ink-10) 70%,transparent)}
  .calc-hero-stat-num{font-size:28px}

  /* Honest moment */
  .honest-card{padding:44px 28px 36px}
  .honest-quote-mark{font-size:100px;top:14px;left:24px}
  .honest-h{font-size:clamp(28px,6vw,38px);margin-bottom:24px}
  .honest p{font-size:15px}
  .honest-key{padding:20px 24px;margin:28px auto}
  .honest-key-text{font-size:17px}

  /* CTA */
  .cta-h{font-size:clamp(26px,5vw,36px);margin-bottom:30px}
  .cta-btn{padding:20px 32px;font-size:15px;width:100%;max-width:360px;justify-content:center}
}

/* Smaller phones */
@media (max-width: 540px) {
  .iso-grid{width:min(300px,90vw);gap:4px}
  .iso-cell{border-radius:6px}
  .iso-cell svg{width:50%;height:50%}
  .hero-stats{gap:18px}
}
`;
