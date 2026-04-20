import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { changeLanguage, LANGUAGES } from '../../i18n';

function formatMoney(n) {
  var v = Math.max(0, Math.floor(Number(n) || 0));
  return '$' + v.toLocaleString('en-US');
}

function formatTimeAgo(mins) {
  if (!mins || mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return mins + ' min ago';
}

export default function ExplorePage(props) {
  var tr = useTranslation();
  var t = tr.t;
  var i18n = tr.i18n;

  // ── Language pill state ──
  var _langOpen = useState(false);
  var langOpen = _langOpen[0];
  var setLangOpen = _langOpen[1];
  var langRef = useRef(null);
  useEffect(function() {
    function onClick(e) { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); }
    document.addEventListener('mousedown', onClick);
    return function() { document.removeEventListener('mousedown', onClick); };
  }, []);
  var currentLang = LANGUAGES.find(function(l) { return l.code === i18n.language; }) || LANGUAGES[0];

  // ── Tab state ──
  // When rendered from /explore/live, /explore/stories, /explore/showcase,
  // the parent passes defaultTab to force that tab on mount, and hideTabs=true
  // to suppress the top-level tab bar (since each page is now its own URL).
  var _activeTab = useState(props.defaultTab || 'activity');
  var activeTab = _activeTab[0];
  var setActiveTab = _activeTab[1];
  var hideTabs = props.hideTabs === true;

  // Scroll to top on mount and whenever navigating between /explore/live,
  // /explore/stories, /explore/showcase — previously each subpage opened
  // mid-scroll because browser preserved scroll position across SPA routes.
  useEffect(function() { window.scrollTo(0, 0); }, [props.defaultTab]);

  // ── Stats + activity feed (real data) ──
  var _stats = useState(null);
  var stats = _stats[0];
  var setStats = _stats[1];

  var _feed = useState([]);
  var feed = _feed[0];
  var setFeed = _feed[1];

  var _loaded = useState(false);
  var loaded = _loaded[0];
  var setLoaded = _loaded[1];

  // ── Phase 2: Member stories (lazy-loaded when Stories tab first activates) ──
  var _stories = useState([]);
  var stories = _stories[0];
  var setStories = _stories[1];
  var _storiesLoaded = useState(false);
  var storiesLoaded = _storiesLoaded[0];
  var setStoriesLoaded = _storiesLoaded[1];

  // ── Phase 3: Member showcase (lazy-loaded when Showcase tab first activates) ──
  var _showcase = useState([]);
  var showcase = _showcase[0];
  var setShowcase = _showcase[1];
  var _showcaseFilter = useState('all');
  var showcaseFilter = _showcaseFilter[0];
  var setShowcaseFilter = _showcaseFilter[1];
  var _showcaseLoaded = useState(false);
  var showcaseLoaded = _showcaseLoaded[0];
  var setShowcaseLoaded = _showcaseLoaded[1];

  // Fetch on mount, re-fetch every 30s
  useEffect(function() {
    var mounted = true;
    function load() {
      Promise.all([
        fetch('/api/public/explore-stats').then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
        fetch('/api/public/activity-feed').then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; }),
      ]).then(function(results) {
        if (!mounted) return;
        if (results[0]) setStats(results[0]);
        if (Array.isArray(results[1])) setFeed(results[1]);
        setLoaded(true);
      });
    }
    load();
    var timer = setInterval(load, 30000);
    return function() { mounted = false; clearInterval(timer); };
  }, []);

  // Load stories when Stories tab first activates; poll every 60s while active
  useEffect(function() {
    if (activeTab !== 'stories') return undefined;
    var mounted = true;
    function loadStories() {
      fetch('/api/public/member-stories')
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(data) {
          if (!mounted) return;
          if (Array.isArray(data)) setStories(data);
          setStoriesLoaded(true);
        })
        .catch(function() { if (mounted) setStoriesLoaded(true); });
    }
    loadStories();
    var timer = setInterval(loadStories, 60000);
    return function() { mounted = false; clearInterval(timer); };
  }, [activeTab]);

  // Load showcase when Showcase tab activates OR filter changes; poll every 60s
  useEffect(function() {
    if (activeTab !== 'showcase') return undefined;
    var mounted = true;
    function loadShowcase() {
      fetch('/api/public/member-showcase?filter=' + encodeURIComponent(showcaseFilter))
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(data) {
          if (!mounted) return;
          if (Array.isArray(data)) setShowcase(data);
          setShowcaseLoaded(true);
        })
        .catch(function() { if (mounted) setShowcaseLoaded(true); });
    }
    loadShowcase();
    var timer = setInterval(loadShowcase, 60000);
    return function() { mounted = false; clearInterval(timer); };
  }, [activeTab, showcaseFilter]);

  // ── Derived display values ──
  var hourPaid = stats ? stats.hour_paid : 0;
  var todayPaid = stats ? stats.today_paid : 0;
  var monthPaid = stats ? stats.month_paid : 0;
  var activeMembers = stats ? stats.active_members : 0;
  var tabCounts = stats ? stats.tab_counts : { activity: 0, stories: 0, showcase: 0 };

  // Hero badge: hide if hour_paid is $0 (Q5 decision)
  var showHeroBadge = hourPaid > 0;

  // Footer headline: "Be one of the first." when active_members < 10, else "{N} members already earning."
  var footerHeadlineText = activeMembers < 10
    ? t('explore.footerHeadlineLaunch')
    : t('explore.footerHeadlineActive', { count: activeMembers.toLocaleString('en-US') });

  return (
    <>
      <style>{CSS_EXPLORE}</style>
      <div className="explore-page">
        <div className="page-bg"></div>
        <div className="page-bg-overlay"></div>

        {/* Floating brand */}
        <Link to="/" className="float-brand">
          <div className="float-brand-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="9,5 9,19 20,12" fill="#fff"/>
            </svg>
          </div>
          <span className="float-brand-text">SuperAd<em>Pro</em></span>
        </Link>

        {/* Floating nav */}
        <div className="float-nav">
          <Link to="/" className="float-nav-link">{t('explore.navHome')}</Link>
          <Link to="/explore" className="float-nav-link">{t('explore.navExplore', { defaultValue: 'Explore' })}</Link>

          {/* Language pill */}
          <div ref={langRef} className="float-lang-wrap">
            <button type="button" className="float-lang-pill" onClick={function() { setLangOpen(!langOpen); }}>
              <span className="float-lang-flag">{currentLang.flag}</span>
              <span className="float-lang-code">{currentLang.code.toUpperCase()}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.6}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {langOpen && (
              <div className="float-lang-dropdown">
                {LANGUAGES.map(function(lang) {
                  var active = lang.code === i18n.language;
                  return (
                    <button key={lang.code} type="button" className={'float-lang-item' + (active ? ' active' : '')}
                      onClick={function() { changeLanguage(lang.code); setLangOpen(false); }}>
                      <span className="float-lang-item-flag">{lang.flag}</span>
                      <span className="float-lang-item-name">{lang.name}</span>
                      {active && <span className="float-lang-item-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/login" className="float-nav-link">{t('explore.navSignin')}</Link>
          <Link to="/register" className="float-nav-cta">{t('explore.navCta')}</Link>
        </div>

        <section className="page-section">

          {/* Hero badge — only render when hour_paid > 0 (Q5 decision) */}
          {showHeroBadge && (
            <div className="hero-badge">
              <div className="hero-badge-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                </svg>
              </div>
              <div className="hero-badge-body">
                <div className="hero-badge-label">{t('explore.heroBadgeLabel')}</div>
                <div className="hero-badge-value">{formatMoney(hourPaid)} <span className="accent">{t('explore.heroBadgeSuffix')}</span></div>
              </div>
            </div>
          )}

          <div className="section-tag">{t('explore.sectionTag')}</div>
          <h2 className="section-h2">
            {t('explore.headlineLine1')}<br/>
            <span className="accent">{t('explore.headlineLine2')}</span>
          </h2>

          {/* Tab bar — hidden on /explore/{live,stories,showcase}; each is its own URL now */}
          {!hideTabs && (
          <div className="tab-bar" role="tablist">
            <button className={'tab' + (activeTab === 'activity' ? ' active' : '')} onClick={function() { setActiveTab('activity'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>
              {t('explore.tabActivity')}
              <span className="tab-count">{tabCounts.activity}</span>
            </button>
            <button className={'tab' + (activeTab === 'stories' ? ' active' : '')} onClick={function() { setActiveTab('stories'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {t('explore.tabStories')}
              <span className="tab-count">{tabCounts.stories}</span>
            </button>
            <button className={'tab' + (activeTab === 'showcase' ? ' active' : '')} onClick={function() { setActiveTab('showcase'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              {t('explore.tabShowcase')}
              <span className="tab-count">{tabCounts.showcase}</span>
            </button>
          </div>
          )}

          {/* ============ TAB 1: LIVE ACTIVITY ============ */}
          <div className={'tab-panel' + (activeTab === 'activity' ? ' active' : '')}>
            <div className="activity-layout">
              <div className="activity-feed">
                <div className="af-head">
                  <div className="af-head-left">
                    <span className="af-live-dot"></span>
                    {t('explore.afHead')}
                  </div>
                  <div className="af-head-count">{t('explore.afHeadSub')}</div>
                </div>

                <div className="af-list">
                  {feed.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                        </svg>
                      </div>
                      <div className="empty-state-title">{t('explore.activityEmptyTitle')}</div>
                      <div className="empty-state-body">{t('explore.activityEmptyBody')}</div>
                    </div>
                  ) : (
                    feed.map(function(item, idx) {
                      var name = (item.name || 'M').trim();
                      var initials = (name.charAt(0) || 'M').toUpperCase();
                      if (name.length > 1) initials += (name.charAt(1) || '').toUpperCase();
                      return (
                        <div key={idx} className="af-item">
                          <div className={'af-avatar ' + (item.color || 'c1')}>{initials}</div>
                          <div className="af-body">
                            <div className="af-row1">
                              <span className="af-name">{item.name}</span>
                              {item.location && <span className="af-loc">{item.location}</span>}
                            </div>
                            <div className="af-reason">{item.reason}</div>
                          </div>
                          <div className="af-time">{formatTimeAgo(item.minutes_ago)}</div>
                          <div className="af-amount">+{formatMoney(item.amount)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="af-side">
                <div className="af-stat" data-c="green">
                  <div className="af-stat-label">{t('explore.afStatHourLabel')}</div>
                  <div className="af-stat-val"><span className="g">{formatMoney(hourPaid)}</span></div>
                  <div className="af-stat-sub">{t('explore.afStatHourSub')}</div>
                </div>
                <div className="af-stat" data-c="sky">
                  <div className="af-stat-label">{t('explore.afStatTodayLabel')}</div>
                  <div className="af-stat-val"><span className="g">{formatMoney(todayPaid)}</span></div>
                  <div className="af-stat-sub">{t('explore.afStatTodaySub', { count: activeMembers })}</div>
                </div>
                <div className="af-stat" data-c="amber">
                  <div className="af-stat-label">{t('explore.afStatMonthLabel')}</div>
                  <div className="af-stat-val"><span className="g">{formatMoney(monthPaid)}</span></div>
                  <div className="af-stat-sub">{t('explore.afStatMonthSub')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ============ TAB 2: STORIES (Phase 2 — live data + opt-in submissions) ============ */}
          <div className={'tab-panel' + (activeTab === 'stories' ? ' active' : '')}>
            {stories && stories.length > 0 ? (
              <div className="timeline-grid">
                {stories.map(function(s) {
                  var colour = s.milestone_color || 'green';
                  var nameLine = s.display_country ? (s.display_initials + ' · ' + s.display_country) : s.display_initials;
                  return (
                    <div key={s.id} className="tl-card" data-c={colour}>
                      <div className="tl-header">
                        <div className="tl-avatar" style={{ background: 'var(--accent)' }}>
                          {s.display_initials || 'SA'}
                        </div>
                        <div className="tl-header-body">
                          <div className="tl-name">{nameLine}</div>
                          <div className="tl-niche">{s.niche}</div>
                        </div>
                      </div>
                      {s.days_to_milestone !== null && s.days_to_milestone !== undefined && (
                        <div className="tl-days">
                          <div className="tl-days-val">{s.days_to_milestone}</div>
                          <div className="tl-days-lbl">
                            {s.days_to_milestone === 1 ? t('explore.daysDay', { defaultValue: 'day to' }) : t('explore.daysTo', { defaultValue: 'days to' })}
                            <strong>{s.milestone_label}</strong>
                          </div>
                        </div>
                      )}
                      {s.story_text && (
                        <div className="tl-story">{s.story_text}</div>
                      )}
                      {s.now_monthly_amount !== null && s.now_monthly_amount !== undefined && s.now_monthly_amount > 0 && (
                        <div className="tl-now">
                          <div className="tl-now-label">{t('explore.earningNow', { defaultValue: 'Earning now' })}</div>
                          <div className="tl-now-val">{formatMoney(s.now_monthly_amount)}/mo</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{minHeight:'360px'}}>
                <div className="empty-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="empty-state-title">{t('explore.storiesEmptyTitle')}</div>
                <div className="empty-state-body">{t('explore.storiesEmptyBody')}</div>
                <Link to="/register" className="empty-state-cta">{t('explore.storiesEmptyCta')}</Link>
              </div>
            )}
          </div>

          {/* ============ TAB 3: SHOWCASE (Phase 3 — live data + filters) ============ */}
          <div className={'tab-panel' + (activeTab === 'showcase' ? ' active' : '')}>
            {/* Filter chips — shown whenever there's at least one approved showcase row in any filter */}
            {(tabCounts.showcase > 0 || showcase.length > 0) && (
              <div className="showcase-filters">
                {[
                  { key: 'all',          label: t('explore.showcaseFilterAll', { defaultValue: 'All' }) },
                  { key: 'bio-link',     label: t('explore.showcaseFilterBio', { defaultValue: 'Bio Links' }) },
                  { key: 'landing-page', label: t('explore.showcaseFilterLanding', { defaultValue: 'Landing Pages' }) },
                  { key: 'campaign',     label: t('explore.showcaseFilterCampaign', { defaultValue: 'Campaigns' }) },
                ].map(function(f) {
                  return (
                    <button
                      key={f.key}
                      className={'sc-filter' + (showcaseFilter === f.key ? ' active' : '')}
                      onClick={function() { setShowcaseFilter(f.key); }}
                    >{f.label}</button>
                  );
                })}
              </div>
            )}

            {showcase && showcase.length > 0 ? (
              <div className="showcase-grid">
                {showcase.map(function(s, idx) {
                  var colour = s.accent_color || 'sky';
                  var art = s.artifact || {};
                  var cnum = ((idx % 6) + 1);
                  var typeBadge = s.artifact_type === 'bio-link' ? t('explore.showcaseTypeBio', { defaultValue: 'Bio Link' })
                                : s.artifact_type === 'landing-page' ? t('explore.showcaseTypeLanding', { defaultValue: 'Landing Page' })
                                : t('explore.showcaseTypeCampaign', { defaultValue: 'Campaign' });
                  // External links (artifact URLs) may be /linkhub/... (internal) or http... (campaign videos)
                  var href = art.url || null;
                  var isExternal = href && /^https?:\/\//i.test(href);
                  return (
                    <div key={s.id} className="sc-card" data-c={colour}>
                      <div className="sc-preview">
                        <div className="sc-type-badge">{typeBadge}</div>
                        {/* If a real thumbnail exists (campaign YouTube, page og:image), use it as background */}
                        {art.banner_url && (
                          <div style={{
                            position:'absolute', inset:0,
                            backgroundImage: 'url(' + art.banner_url + ')',
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            opacity: 0.5,
                          }}/>
                        )}
                        {/* Abstract mini-preview (matches mockup when no thumbnail) */}
                        {!art.banner_url && (
                          <div className="sc-preview-inner">
                            <div className="sc-mini-avatar"/>
                            <div className="sc-mini-h"/>
                            <div className="sc-mini-p"/>
                            {s.artifact_type === 'bio-link' ? (
                              <div className="sc-mini-btns">
                                <div/><div/><div/>
                              </div>
                            ) : (
                              <div className="sc-mini-btn"/>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="sc-body">
                        <div className="sc-owner">
                          <div className={'sc-owner-av c' + cnum}>{(s.display_niche || '?').charAt(0).toUpperCase()}</div>
                          <div style={{minWidth:0, flex:1}}>
                            <div className="sc-owner-name">{art.title || s.display_title}</div>
                            <div className="sc-owner-niche">{s.display_niche}</div>
                          </div>
                        </div>
                        <div className="sc-title">{s.display_title}</div>
                        {s.metric_label && s.metric_value && (
                          <div className="sc-metric">
                            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',color:'var(--ink-50)',letterSpacing:'.1em',textTransform:'uppercase'}}>{s.metric_label}</span>
                            <span style={{fontFamily:"'Sora',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--accent)',letterSpacing:'-.02em'}}>{s.metric_value}</span>
                          </div>
                        )}
                        {href && (
                          <a
                            href={href}
                            target={isExternal ? '_blank' : undefined}
                            rel={isExternal ? 'noopener noreferrer' : undefined}
                            style={{
                              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
                              padding:'8px 14px', borderRadius:10,
                              background:'rgba(var(--accent-rgb),.15)', border:'1px solid rgba(var(--accent-rgb),.35)',
                              color:'var(--accent)', fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:12,
                              textDecoration:'none', textAlign:'center', marginTop:6,
                            }}
                          >
                            {t('explore.showcaseVisit', { defaultValue: 'Visit' })} →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{minHeight:'360px'}}>
                <div className="empty-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div className="empty-state-title">{t('explore.showcaseEmptyTitle')}</div>
                <div className="empty-state-body">{t('explore.showcaseEmptyBody')}</div>
                <Link to="/register" className="empty-state-cta">{t('explore.showcaseEmptyCta')}</Link>
              </div>
            )}
          </div>

          <div className="footer-banner">
            <div className="footer-banner-text">
              {footerHeadlineText}<br/>
              <span className="emph">{t('explore.footerSub')}</span>
            </div>
            <Link to="/register" className="footer-cta">
              {t('explore.footerCta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

        </section>
      </div>
    </>
  );
}

// Scoped CSS — selectors prefixed with .explore-page, keyframes prefixed with "xp"
var CSS_EXPLORE = `.explore-page {
--cobalt-deepest: #0b1230;
--cobalt-deep: #172554;
--sky: #0ea5e9;
--sky-bright: #38bdf8;
--sky-pale: #7dd3fc;
--indigo: #6366f1;
--indigo-soft: #818cf8;
--purple: #a855f7;
--purple-soft: #c084fc;
--amber: #fbbf24;
--amber-bright: #fcd34d;
--amber-soft: #fde68a;
--green: #34d399;
--green-bright: #6ee7b7;
--pink: #ec4899;
--pink-soft: #f9a8d4;
--ink: #fafbff;
--ink-70: rgba(250, 251, 255, 0.7);
--ink-60: rgba(250, 251, 255, 0.6);
--ink-50: rgba(250, 251, 255, 0.5);
--ink-40: rgba(250, 251, 255, 0.4);
--ink-20: rgba(250, 251, 255, 0.2);
--ink-10: rgba(250, 251, 255, 0.1);
--ink-05: rgba(250, 251, 255, 0.05);
}
.explore-page {box-sizing:border-box;margin:0;padding:0}
.explore-page, .explore-page {background:transparent;color:var(--ink);font-family:'DM Sans',sans-serif;overflow-x:hidden;min-height:100vh}
.explore-page .page-bg {position:fixed;inset:0;z-index:-2;background-image: url("/static/images/explore-hero-bg.jpg");background-size:cover;background-position:right center;background-repeat:no-repeat;background-attachment:fixed}
.explore-page .page-bg-overlay {position:fixed;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(11,18,48,.3),rgba(11,18,48,.5) 50%,rgba(11,18,48,.82));pointer-events:none}
.explore-page::before {content:'';position:fixed;inset:0;pointer-events:none;z-index:500;opacity:.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");mix-blend-mode:overlay}
.explore-page .float-nav {position:fixed;top:28px;right:32px;z-index:100;display:flex;align-items:center;gap:10px}
.explore-page .float-nav-link {padding:10px 18px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:600;color:var(--ink);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.explore-page .float-nav-link:hover {background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.explore-page .float-nav-cta {padding:10px 20px;border-radius:100px;background:var(--ink);color:var(--cobalt-deepest);font-family:'Sora',sans-serif;font-size:13px;font-weight:700;text-decoration:none;transition:all .25s;box-shadow:0 8px 32px rgba(250,251,255,.25)}
.explore-page .float-nav-cta:hover {transform:translateY(-2px);box-shadow:0 10px 40px rgba(250,251,255,.4)}
.explore-page .float-brand {position:fixed;top:28px;left:32px;z-index:100;display:flex;align-items:center;gap:12px;padding:10px 20px 10px 12px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);text-decoration:none;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.explore-page .float-brand:hover {background:rgba(11,18,48,.7);transform:translateY(-2px)}
.explore-page .float-brand-mark {width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--sky),var(--indigo));display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(14,165,233,.45);position:relative}
.explore-page .float-brand-mark::before {content:'';position:absolute;inset:-2px;border-radius:10px;background:linear-gradient(135deg,var(--sky),var(--amber),var(--indigo));z-index:-1;opacity:.4;filter:blur(4px)}
.explore-page .float-brand-text {font-family:'Sora',sans-serif;font-size:15px;font-weight:900;letter-spacing:-.03em;color:var(--ink)}
.explore-page .float-brand-text em {color:var(--sky-bright);font-style:normal}
.explore-page .page-section {padding:140px 48px 100px;max-width:1320px;margin:0 auto;position:relative}
.explore-page .section-tag {display:flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;color:var(--ink-40);letter-spacing:.15em;text-transform:uppercase;margin-bottom:20px}
.explore-page .section-tag::before {content:'';width:32px;height:1px;background:var(--sky-bright)}
.explore-page .section-h2 {font-family:'Sora',sans-serif;font-size:clamp(40px,5.2vw,76px);font-weight:900;line-height:.95;letter-spacing:-.045em;margin-bottom:20px}
.explore-page .section-h2 .accent {display:block;font-weight:300;letter-spacing:-.035em;color:var(--ink);opacity:.75;line-height:1.1;padding-bottom:.08em}
.explore-page .hero-badge {position:absolute;top:180px;right:48px;z-index:50;display:flex;align-items:center;gap:18px;padding:20px 26px;border-radius:24px;background:linear-gradient(90deg,rgba(11,18,48,.92),rgba(23,37,84,.88));border:1px solid rgba(52,211,153,.4);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 20px 60px rgba(0,0,0,.4),0 0 60px rgba(52,211,153,.22);min-width:360px}
.explore-page .hero-badge-icon {width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--green),var(--green-bright));display:flex;align-items:center;justify-content:center;color:var(--cobalt-deepest);flex-shrink:0;box-shadow:0 0 16px rgba(52,211,153,.55);position:relative}
.explore-page .hero-badge-icon::before {content:'';position:absolute;inset:-4px;border-radius:16px;border:2px solid var(--green);opacity:0;animation:xpPulseBadge 2s ease-out infinite}
@keyframes xpPulseBadge{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}
.explore-page .hero-badge-body {flex:1}
.explore-page .hero-badge-label {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-60);letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
.explore-page .hero-badge-value {font-family:'Sora',sans-serif;font-weight:900;font-size:22px;color:var(--ink);line-height:1.1;letter-spacing:-.02em}
.explore-page .hero-badge-value .accent {color:var(--green-bright);filter:drop-shadow(0 0 8px rgba(52,211,153,.4))}
.explore-page .tab-bar {
margin-top:88px;
display:flex;gap:6px;padding:6px;
background:rgba(11,18,48,.65);
border:1px solid var(--ink-10);border-radius:100px;
backdrop-filter:blur(16px);
box-shadow:0 10px 40px rgba(0,0,0,.3);
width:fit-content;max-width:100%;overflow-x:auto;
-webkit-overflow-scrolling:touch;
}
.explore-page .tab {
flex-shrink:0;
padding:12px 22px;border-radius:100px;
background:transparent;border:none;cursor:pointer;
font-family:'Sora',sans-serif;font-size:14px;font-weight:700;
color:var(--ink-60);letter-spacing:-.01em;
transition:all .25s;
display:inline-flex;align-items:center;gap:10px;
white-space:nowrap;
}
.explore-page .tab:hover {color:var(--ink)}
.explore-page .tab.active {
background:linear-gradient(135deg,rgba(56,189,248,.25),rgba(99,102,241,.15));
color:var(--ink);
border:1px solid rgba(56,189,248,.4);
box-shadow:0 0 20px rgba(56,189,248,.2);
}
.explore-page .tab-count {
padding:2px 8px;border-radius:100px;
background:rgba(250,251,255,.08);
font-family:'JetBrains Mono',monospace;font-size:10px;
color:var(--ink-50);letter-spacing:.1em;font-weight:600;
}
.explore-page .tab.active .tab-count {background:rgba(56,189,248,.25);color:var(--sky-bright)}
.explore-page .tab-panel {display:none;margin-top:40px;animation:xpTabFade .45s cubic-bezier(.2,.8,.2,1)}
.explore-page .tab-panel.active {display:block}
@keyframes xpTabFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.explore-page .activity-layout {display:grid;grid-template-columns:2fr 1fr;gap:24px}
.explore-page .activity-feed {
background:linear-gradient(180deg,rgba(11,18,48,.85),rgba(11,18,48,.72));
border:1px solid var(--ink-10);border-radius:20px;
backdrop-filter:blur(16px);
box-shadow:0 10px 40px rgba(0,0,0,.3);
overflow:hidden;
}
.explore-page .af-head {
display:flex;align-items:center;justify-content:space-between;
padding:22px 28px;border-bottom:1px solid var(--ink-05);
background:rgba(11,18,48,.4);
}
.explore-page .af-head-left {display:flex;align-items:center;gap:10px;font-family:'Sora',sans-serif;font-weight:800;font-size:16px;color:var(--ink)}
.explore-page .af-live-dot {width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:xpLivePulse 1.5s ease-in-out infinite}
@keyframes xpLivePulse{0%,100%{opacity:1}50%{opacity:.4}}
.explore-page .af-head-count {font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-50);letter-spacing:.1em;text-transform:uppercase}
.explore-page .af-list {max-height:380px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--ink-20) transparent}
.explore-page .af-list::-webkit-scrollbar {width:6px}
.explore-page .af-list::-webkit-scrollbar-thumb {background:var(--ink-20);border-radius:3px}
.explore-page .af-item {
display:grid;grid-template-columns:44px 1fr auto auto;gap:14px;align-items:center;
padding:14px 28px;border-bottom:1px solid var(--ink-05);
transition:background .2s;
}
.explore-page .af-item:hover {background:rgba(250,251,255,.02)}
.explore-page .af-item.new {animation:xpAfSlideIn .5s cubic-bezier(.2,.8,.2,1)}
@keyframes xpAfSlideIn{from{opacity:0;transform:translateY(-8px);background:rgba(52,211,153,.08)}to{opacity:1;transform:translateY(0);background:transparent}}
.explore-page .af-avatar {
width:44px;height:44px;border-radius:50%;
display:flex;align-items:center;justify-content:center;
font-family:'Sora',sans-serif;font-weight:800;font-size:14px;color:var(--cobalt-deepest);
flex-shrink:0;
}
.explore-page .af-avatar.c1 {background:linear-gradient(135deg,#ec4899,#f43f5e)}
.explore-page .af-avatar.c2 {background:linear-gradient(135deg,#14b8a6,#06b6d4)}
.explore-page .af-avatar.c3 {background:linear-gradient(135deg,#f97316,#eab308)}
.explore-page .af-avatar.c4 {background:linear-gradient(135deg,#8b5cf6,#6366f1)}
.explore-page .af-avatar.c5 {background:linear-gradient(135deg,#84cc16,#22c55e)}
.explore-page .af-avatar.c6 {background:linear-gradient(135deg,#38bdf8,#6366f1)}
.explore-page .af-avatar.c7 {background:linear-gradient(135deg,#fbbf24,#f59e0b)}
.explore-page .af-avatar.c8 {background:linear-gradient(135deg,#a855f7,#ec4899)}
.explore-page .af-body {min-width:0}
.explore-page .af-row1 {display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.explore-page .af-name {font-family:'Sora',sans-serif;font-weight:700;font-size:14px;color:var(--ink)}
.explore-page .af-loc {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-50);letter-spacing:.05em}
.explore-page .af-reason {font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-60);letter-spacing:.03em;margin-top:2px}
.explore-page .af-time {font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-40);white-space:nowrap}
.explore-page .af-amount {
font-family:'Sora',sans-serif;font-weight:900;font-size:18px;
color:var(--green-bright);letter-spacing:-.02em;white-space:nowrap;
filter:drop-shadow(0 0 6px rgba(52,211,153,.3));
}
.explore-page .af-side {display:flex;flex-direction:column;gap:16px}
.explore-page .af-stat {
padding:20px 24px;border-radius:16px;
background:linear-gradient(180deg,rgba(11,18,48,.85),rgba(11,18,48,.72));
border:1px solid var(--ink-10);
backdrop-filter:blur(16px);
position:relative;overflow:hidden;
}
.explore-page .af-stat::before {content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),transparent)}
.explore-page .af-stat[data-c="green"] {--accent:var(--green);--accent-rgb:52,211,153}
.explore-page .af-stat[data-c="sky"] {--accent:var(--sky-bright);--accent-rgb:56,189,248}
.explore-page .af-stat[data-c="amber"] {--accent:var(--amber);--accent-rgb:251,191,36}
.explore-page .af-stat-label {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-50);letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px}
.explore-page .af-stat-val {font-family:'Sora',sans-serif;font-weight:900;font-size:32px;color:var(--ink);letter-spacing:-.03em;line-height:1;margin-bottom:6px}
.explore-page .af-stat-val .g {color:var(--accent);filter:drop-shadow(0 0 8px rgba(var(--accent-rgb),.4))}
.explore-page .af-stat-sub {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-50);letter-spacing:.05em}
.explore-page .af-stat-sub .up {color:var(--green)}
.explore-page .timeline-grid {display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.explore-page .tl-card {
display:grid;grid-template-columns:1fr;gap:16px;
padding:28px;border-radius:20px;
background:linear-gradient(180deg,rgba(11,18,48,.85),rgba(11,18,48,.72));
border:1px solid var(--ink-10);
backdrop-filter:blur(16px);
box-shadow:0 10px 40px rgba(0,0,0,.3);
position:relative;overflow:hidden;
transition:transform .3s,border-color .3s,box-shadow .3s;
}
.explore-page .tl-card:hover {transform:translateY(-3px);border-color:var(--accent);box-shadow:0 16px 50px rgba(0,0,0,.4),0 0 60px rgba(var(--accent-rgb),.15)}
.explore-page .tl-card::before {content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),transparent)}
.explore-page .tl-card[data-c="green"] {--accent:var(--green);--accent-rgb:52,211,153}
.explore-page .tl-card[data-c="sky"] {--accent:var(--sky-bright);--accent-rgb:56,189,248}
.explore-page .tl-card[data-c="amber"] {--accent:var(--amber);--accent-rgb:251,191,36}
.explore-page .tl-card[data-c="pink"] {--accent:var(--pink);--accent-rgb:236,72,153}
.explore-page .tl-card[data-c="indigo"] {--accent:var(--indigo-soft);--accent-rgb:129,140,248}
.explore-page .tl-header {display:flex;align-items:center;gap:14px}
.explore-page .tl-avatar {
width:56px;height:56px;border-radius:50%;
display:flex;align-items:center;justify-content:center;
font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:var(--cobalt-deepest);
flex-shrink:0;box-shadow:0 0 16px rgba(var(--accent-rgb),.3);
}
.explore-page .tl-header-body {flex:1;min-width:0}
.explore-page .tl-name {font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:var(--ink);letter-spacing:-.01em}
.explore-page .tl-niche {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-50);letter-spacing:.12em;text-transform:uppercase;margin-top:2px}
.explore-page .tl-days {
padding:14px 18px;border-radius:12px;
background:linear-gradient(135deg,rgba(var(--accent-rgb),.2),rgba(var(--accent-rgb),.08));
border:1px solid rgba(var(--accent-rgb),.35);
display:flex;align-items:baseline;justify-content:space-between;
}
.explore-page .tl-days-val {font-family:'Sora',sans-serif;font-weight:900;font-size:42px;color:var(--accent);letter-spacing:-.04em;line-height:1;filter:drop-shadow(0 0 10px rgba(var(--accent-rgb),.4))}
.explore-page .tl-days-lbl {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-60);letter-spacing:.12em;text-transform:uppercase;text-align:right}
.explore-page .tl-days-lbl strong {display:block;color:var(--ink);font-weight:700;margin-top:2px;font-family:'Sora',sans-serif;letter-spacing:-.01em;font-size:13px;text-transform:none}
.explore-page .tl-story {
font-size:14px;line-height:1.55;color:var(--ink-70);
padding-left:12px;border-left:2px solid rgba(var(--accent-rgb),.35);
}
.explore-page .tl-story strong {color:var(--ink);font-weight:600}
.explore-page .tl-now {
display:flex;align-items:center;justify-content:space-between;
padding-top:14px;border-top:1px solid var(--ink-05);
}
.explore-page .tl-now-label {font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-50);letter-spacing:.12em;text-transform:uppercase}
.explore-page .tl-now-val {font-family:'Sora',sans-serif;font-weight:900;font-size:22px;color:var(--green-bright);letter-spacing:-.02em;filter:drop-shadow(0 0 6px rgba(52,211,153,.3))}
.explore-page .tl-now-val::before {content:'now →  ';color:var(--ink-40);font-weight:500;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.explore-page .showcase-filters {display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.explore-page .sc-filter {
padding:8px 16px;border-radius:100px;
background:rgba(11,18,48,.5);border:1px solid var(--ink-10);
font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
color:var(--ink-60);letter-spacing:.05em;text-transform:uppercase;
cursor:pointer;transition:all .2s;
}
.explore-page .sc-filter.active, .explore-page .sc-filter:hover {background:rgba(56,189,248,.18);border-color:rgba(56,189,248,.45);color:var(--sky-bright)}
.explore-page .showcase-grid {display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.explore-page .sc-card {
border-radius:18px;overflow:hidden;
background:linear-gradient(180deg,rgba(11,18,48,.85),rgba(11,18,48,.72));
border:1px solid var(--ink-10);
backdrop-filter:blur(16px);
box-shadow:0 10px 40px rgba(0,0,0,.3);
position:relative;
transition:transform .3s,border-color .3s,box-shadow .3s;
display:flex;flex-direction:column;min-height:340px;
}
.explore-page .sc-card:hover {transform:translateY(-4px);border-color:var(--accent);box-shadow:0 16px 50px rgba(0,0,0,.4),0 0 60px rgba(var(--accent-rgb),.12)}
.explore-page .sc-card[data-c="sky"] {--accent:var(--sky-bright);--accent-rgb:56,189,248}
.explore-page .sc-card[data-c="indigo"] {--accent:var(--indigo-soft);--accent-rgb:129,140,248}
.explore-page .sc-card[data-c="amber"] {--accent:var(--amber);--accent-rgb:251,191,36}
.explore-page .sc-card[data-c="green"] {--accent:var(--green);--accent-rgb:52,211,153}
.explore-page .sc-card[data-c="pink"] {--accent:var(--pink);--accent-rgb:236,72,153}
.explore-page .sc-card[data-c="purple"] {--accent:var(--purple-soft);--accent-rgb:192,132,252}
.explore-page .sc-preview {
height:160px;position:relative;overflow:hidden;
background:linear-gradient(135deg,rgba(var(--accent-rgb),.22),rgba(var(--accent-rgb),.05)),
radial-gradient(circle at 70% 30%,rgba(var(--accent-rgb),.35),transparent 60%),
var(--cobalt-deep);
display:flex;align-items:center;justify-content:center;
}
.explore-page .sc-type-badge {
position:absolute;top:12px;left:12px;
padding:4px 10px;border-radius:100px;
background:rgba(11,18,48,.75);backdrop-filter:blur(8px);
border:1px solid var(--ink-10);
font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
color:var(--accent);letter-spacing:.1em;text-transform:uppercase;
}
.explore-page .sc-preview-inner {
width:72%;padding:12px;border-radius:10px;
background:rgba(11,18,48,.6);border:1px solid rgba(var(--accent-rgb),.3);
backdrop-filter:blur(8px);
display:flex;flex-direction:column;gap:5px;align-items:center;
transform:scale(.95);
}
.explore-page .sc-mini-avatar {
width:22px;height:22px;border-radius:50%;
background:linear-gradient(135deg,var(--accent),rgba(var(--accent-rgb),.5));
box-shadow:0 0 10px rgba(var(--accent-rgb),.5);
}
.explore-page .sc-mini-h {height:5px;width:60%;background:var(--ink);border-radius:2px}
.explore-page .sc-mini-p {height:3px;width:75%;background:var(--ink-40);border-radius:1px}
.explore-page .sc-mini-btn {height:8px;width:50%;background:var(--accent);border-radius:3px;margin-top:2px}
.explore-page .sc-mini-btns {display:flex;flex-direction:column;gap:3px;width:100%;margin-top:3px}
.explore-page .sc-mini-btns > div {height:6px;background:rgba(var(--accent-rgb),.25);border:1px solid rgba(var(--accent-rgb),.35);border-radius:2px}
.explore-page .sc-mini-btns > div:first-child {background:rgba(var(--accent-rgb),.45);border-color:var(--accent)}
.explore-page .sc-body {
flex:1;padding:20px;display:flex;flex-direction:column;gap:10px;
}
.explore-page .sc-owner {display:flex;align-items:center;gap:10px}
.explore-page .sc-owner-av {
width:28px;height:28px;border-radius:50%;
display:flex;align-items:center;justify-content:center;
font-family:'Sora',sans-serif;font-weight:800;font-size:11px;color:var(--cobalt-deepest);
}
.explore-page .sc-owner-av.c1 {background:linear-gradient(135deg,#ec4899,#f43f5e)}
.explore-page .sc-owner-av.c2 {background:linear-gradient(135deg,#14b8a6,#06b6d4)}
.explore-page .sc-owner-av.c3 {background:linear-gradient(135deg,#f97316,#eab308)}
.explore-page .sc-owner-av.c4 {background:linear-gradient(135deg,#8b5cf6,#6366f1)}
.explore-page .sc-owner-av.c5 {background:linear-gradient(135deg,#84cc16,#22c55e)}
.explore-page .sc-owner-av.c6 {background:linear-gradient(135deg,#38bdf8,#6366f1)}
.explore-page .sc-owner-name {font-family:'Sora',sans-serif;font-weight:600;font-size:12px;color:var(--ink-70)}
.explore-page .sc-owner-niche {font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-50);letter-spacing:.1em;text-transform:uppercase}
.explore-page .sc-title {font-family:'Sora',sans-serif;font-weight:800;font-size:16px;color:var(--ink);letter-spacing:-.015em;line-height:1.25}
.explore-page .sc-metric {
margin-top:auto;display:flex;align-items:center;justify-content:space-between;
padding-top:10px;border-top:1px solid var(--ink-05);
}
.explore-page .sc-metric-label {font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-50);letter-spacing:.1em;text-transform:uppercase}
.explore-page .sc-metric-val {font-family:'Sora',sans-serif;font-weight:800;font-size:14px;color:var(--accent)}
.explore-page .footer-banner {margin-top:80px;padding:48px;border-radius:24px;background:linear-gradient(135deg,rgba(11,18,48,.85),rgba(0,0,0,.7)),#050816;border:1px solid rgba(56,189,248,.4);display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center;position:relative;overflow:hidden;backdrop-filter:blur(16px)}
.explore-page .footer-banner::before {content:'';position:absolute;top:-50%;left:20%;width:600px;height:600px;background:radial-gradient(circle,rgba(56,189,248,.35),transparent 55%);filter:blur(50px);pointer-events:none}
.explore-page .footer-banner-text {position:relative;z-index:2;font-family:'Sora',sans-serif;font-weight:300;font-size:clamp(22px,2.4vw,30px);color:var(--ink-70);line-height:1.3;max-width:540px;letter-spacing:-.02em}
.explore-page .footer-banner-text .emph {color:var(--sky-bright);font-weight:700;text-shadow:0 0 20px rgba(56,189,248,.6)}
.explore-page .footer-cta {position:relative;z-index:2;display:inline-flex;align-items:center;gap:12px;padding:20px 36px;border-radius:14px;background:linear-gradient(135deg,var(--amber-bright),var(--amber));color:var(--cobalt-deepest);font-family:'Sora',sans-serif;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-.01em;transition:transform .3s,box-shadow .3s;box-shadow:0 12px 40px rgba(251,191,36,.4);white-space:nowrap}
.explore-page .footer-cta:hover {transform:translateY(-3px) scale(1.02);box-shadow:0 16px 50px rgba(251,191,36,.6)}
@media(max-width:1100px){
.explore-page .showcase-grid {grid-template-columns:repeat(2,1fr)}
}
@media(max-width:900px){
.explore-page .page-section {padding:120px 20px 80px}
.explore-page .hero-badge {position:static;margin-top:24px;min-width:0;width:100%}
.explore-page .activity-layout {grid-template-columns:1fr}
.explore-page .timeline-grid, .explore-page .showcase-grid {grid-template-columns:1fr}
.explore-page .footer-banner {grid-template-columns:1fr;gap:24px;padding:32px;text-align:center}
.explore-page .footer-cta {justify-self:center}
}
.explore-page .mock-label {position:fixed;bottom:16px;right:16px;z-index:1000;padding:8px 14px;background:rgba(11,18,48,.95);border:1px solid var(--ink-10);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--ink-60);letter-spacing:.15em;text-transform:uppercase;backdrop-filter:blur(12px)}
/* Language pill — product-standard addition not in mockup */
.explore-page .float-lang-wrap{position:relative}
.explore-page .float-lang-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid var(--ink-10);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--ink);cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.explore-page .float-lang-pill:hover{background:rgba(11,18,48,.7);border-color:var(--ink-20);transform:translateY(-2px)}
.explore-page .float-lang-flag{font-size:15px;line-height:1}
.explore-page .float-lang-code{letter-spacing:.05em}
.explore-page .float-lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:200px;max-height:360px;overflow-y:auto;background:rgba(11,18,48,.95);border:1px solid var(--ink-10);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);backdrop-filter:blur(20px);padding:4px;z-index:200}
.explore-page .float-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:transparent;color:var(--ink-60);text-align:left;transition:all .15s}
.explore-page .float-lang-item:hover{background:rgba(255,255,255,.05);color:var(--ink)}
.explore-page .float-lang-item.active{background:rgba(56,189,248,.12);color:var(--sky-bright);font-weight:700}
.explore-page .float-lang-item-flag{font-size:16px;line-height:1}
.explore-page .float-lang-item-name{flex:1}
.explore-page .float-lang-item-check{margin-left:auto;font-size:11px;color:var(--sky-bright)}
/* Unified Create-account CTA — dark glass with cyan accent (product standard) */
.explore-page .float-nav-cta{padding:10px 20px;border-radius:100px;background:rgba(11,18,48,.5);border:1px solid rgba(56,189,248,.35);backdrop-filter:blur(18px) saturate(180%);font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:var(--sky-bright);text-decoration:none;letter-spacing:-.005em;transition:all .25s;box-shadow:0 4px 20px rgba(0,0,0,.3),0 0 24px rgba(56,189,248,.18)}
.explore-page .float-nav-cta:hover{background:rgba(11,18,48,.7);border-color:rgba(56,189,248,.6);transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,0,0,.4),0 0 40px rgba(56,189,248,.35)}
/* Empty-state placeholders (not in mockup — Phase 1 honest launch) */
.explore-page .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 32px;text-align:center;color:var(--ink-50)}
.explore-page .empty-state-icon{width:56px;height:56px;border-radius:50%;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);display:flex;align-items:center;justify-content:center;color:var(--sky-bright);margin-bottom:20px;animation:xpLivePulse 2.4s ease-in-out infinite}
.explore-page .empty-state-title{font-family:'Sora',sans-serif;font-size:17px;font-weight:700;color:var(--ink);margin-bottom:8px;letter-spacing:-.01em}
.explore-page .empty-state-body{font-size:14px;line-height:1.6;color:var(--ink-60);max-width:420px}
.explore-page .empty-state-cta{margin-top:18px;color:var(--sky-bright);font-size:13px;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(56,189,248,.3);padding-bottom:2px}
.explore-page .empty-state-cta:hover{border-bottom-color:var(--sky-bright)}
`;
