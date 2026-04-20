import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { BarChart3, Eye, Users, Clock, TrendingUp, ChevronDown, ChevronUp, Loader2, Play, Calendar, Target, Globe, Zap } from 'lucide-react';

export default function CampaignAnalytics() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [selectedCampaign, setSelectedCampaign] = useState(null);
  var [dailyData, setDailyData] = useState(null);
  var [loadingDaily, setLoadingDaily] = useState(false);

  useEffect(function() {
    apiGet('/api/campaign-analytics/overview').then(function(r) {
      if (r.success) setData(r);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  function loadDaily(campaignId) {
    if (selectedCampaign === campaignId) {
      setSelectedCampaign(null);
      setDailyData(null);
      return;
    }
    setSelectedCampaign(campaignId);
    setLoadingDaily(true);
    apiGet('/api/campaign-analytics/' + campaignId + '/daily').then(function(r) {
      if (r.success) setDailyData(r);
      setLoadingDaily(false);
    }).catch(function() { setLoadingDaily(false); });
  }

  if (loading) {
    return (
      <AppLayout title={t("campaignAnalytics.title")} subtitle={t("campaignAnalytics.subtitle")}>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Loader2 size={32} color="var(--sap-purple)" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 12, color: 'var(--sap-text-muted)' }}>{t('campaignAnalytics.loading')}</div>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </AppLayout>
    );
  }

  var totals = data && data.totals ? data.totals : {};
  var campaigns = data && data.campaigns ? data.campaigns : [];

  // Calculate max views for the daily chart scale
  var maxDaily = 1;
  if (dailyData && dailyData.daily) {
    maxDaily = Math.max(1, ...dailyData.daily.map(function(d) { return d.views; }));
  }

  return (
    <AppLayout title={t("campaignAnalytics.title")} subtitle={t("campaignAnalytics.subtitle")}>

      {/* Cobalt blue header */}
      <div style={{ background: 'linear-gradient(180deg, #172554, #1e3a8a)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={24} color="var(--sap-accent-light)" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('campaignAnalytics.heroTitle')}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('campaignAnalytics.heroDesc')}</div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Total Views', value: (totals.total_views || 0).toLocaleString(), icon: Eye, color: 'var(--sap-green-bright)' },
            { label: 'Views Today', value: (totals.views_today || 0).toLocaleString(), icon: TrendingUp, color: 'var(--sap-accent)' },
            { label: 'This Week', value: (totals.views_this_week || 0).toLocaleString(), icon: Calendar, color: 'var(--sap-purple)' },
            { label: 'Unique Viewers', value: (totals.unique_viewers || 0).toLocaleString(), icon: Users, color: 'var(--sap-amber)' },
            { label: 'Avg Duration', value: (totals.avg_watch_duration || 30) + 's', icon: Clock, color: 'var(--sap-pink)' },
          ].map(function(card, i) {
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <card.icon size={16} color={card.color} />
                  <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>{card.label}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{card.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NEW: Country breakdown + hourly heatmap — only shown if there's data */}
      {campaigns.length > 0 && data && (data.top_countries || data.hourly_heatmap) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 20 }}>

          {/* Country breakdown card */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Globe size={16} color="var(--sap-accent)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{t('campaignAnalytics.topCountries', { defaultValue: 'Where your viewers are' })}</div>
            </div>
            {data.top_countries && data.top_countries.length > 0 ? (
              data.top_countries.map(function(row, i) {
                var maxViewers = data.top_countries[0].viewers || 1;
                var pct = Math.round((row.viewers / maxViewers) * 100);
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--sap-text-primary)' }}>{row.country}</span>
                      <span style={{ color: 'var(--sap-text-faint)' }}>{row.viewers.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--sap-border)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--sap-accent), var(--sap-accent-light))', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: 12, color: 'var(--sap-text-faint)', textAlign: 'center', padding: '20px 0' }}>
                {t('campaignAnalytics.noCountryData', { defaultValue: 'Geographic data will appear as your viewers watch.' })}
              </div>
            )}
          </div>

          {/* Hourly heatmap card (7 days × 24 hours) */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Clock size={16} color="var(--sap-purple)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{t('campaignAnalytics.whenViewersWatch', { defaultValue: 'When your viewers watch' })}</div>
              <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', marginLeft: 'auto' }}>{t('campaignAnalytics.heatmapSub', { defaultValue: 'Day × hour — darker = more views' })}</div>
            </div>
            {data.hourly_heatmap && (
              <HourlyHeatmap matrix={data.hourly_heatmap} />
            )}
          </div>

        </div>
      )}

      {/* No campaigns */}
      {campaigns.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px 24px', textAlign: 'center' }}>
          <Play size={48} color="var(--sap-border)" />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 12 }}>{t('campaignAnalytics.noCampaigns')}</div>
          <div style={{ fontSize: 14, color: 'var(--sap-text-faint)', marginTop: 4 }}>{t('campaignAnalytics.noCampaignsDesc')}</div>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.map(function(c) {
        var isOpen = selectedCampaign === c.id;
        var tierColors = ['', 'var(--sap-green-mid)', '#3b82f6', 'var(--sap-purple)', 'var(--sap-pink)', '#2dd4bf', '#d1d5db', 'var(--sap-amber-bright)', 'var(--sap-red-bright)'];

        return (
          <div key={c.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden',
            transition: 'all 0.15s ease' }}>

            {/* Campaign header row */}
            <div onClick={function() { loadDaily(c.id); }}
              onMouseEnter={function(e) { e.currentTarget.style.background = '#fafbfc'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = '#fff'; }}
              style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, background: '#fff', transition: 'background 0.15s' }}>

              {/* Tier badge */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: tierColors[c.tier] || 'var(--sap-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>T{c.tier}</span>
              </div>

              {/* Title & info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                <div style={{ fontSize: 12, color: 'var(--sap-text-faint)', marginTop: 2 }}>
                  {c.platform} · {c.category}
                  {c.status !== 'active' && <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 6, background: c.status === 'completed' ? 'var(--sap-green-bg)' : 'var(--sap-red-bg)', color: c.status === 'completed' ? 'var(--sap-green)' : 'var(--sap-red)', fontSize: 11, fontWeight: 600 }}>{c.status}</span>}
                </div>
              </div>

              {/* View stats */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{(c.views_delivered || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>of {(c.views_target || 0).toLocaleString()} target</div>
              </div>

              {/* Progress bar */}
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ height: 6, background: 'var(--sap-border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: Math.min(c.completion_pct, 100) + '%', background: c.completion_pct >= 100 ? 'var(--sap-green-bright)' : 'var(--sap-purple)', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--sap-text-faint)', textAlign: 'center', marginTop: 2 }}>{c.completion_pct}%</div>
              </div>

              {/* Today's views */}
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 60 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-green-bright)' }}>+{c.views_today}</div>
                <div style={{ fontSize: 10, color: 'var(--sap-text-faint)' }}>{t('campaignAnalytics.today')}</div>
              </div>

              {/* Unique viewers */}
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 60 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-accent)' }}>{c.unique_viewers}</div>
                <div style={{ fontSize: 10, color: 'var(--sap-text-faint)' }}>{t('campaignAnalytics.unique')}</div>
              </div>

              {/* Velocity — daily rate + days to complete */}
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 74 }}>
                {c.daily_rate > 0 ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <Zap size={13} color="var(--sap-purple)" />
                      {c.daily_rate}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--sap-text-faint)' }}>
                      {c.days_to_complete === 0
                        ? t('campaignAnalytics.completePace', { defaultValue: 'complete' })
                        : c.days_to_complete
                          ? t('campaignAnalytics.daysToGo', { defaultValue: '~{{d}}d to go', d: c.days_to_complete })
                          : t('campaignAnalytics.viewsPerDay', { defaultValue: 'views/day' })
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text-faint)' }}>—</div>
                    <div style={{ fontSize: 10, color: 'var(--sap-text-faint)' }}>{t('campaignAnalytics.pace', { defaultValue: 'pace' })}</div>
                  </>
                )}
              </div>

              {isOpen ? <ChevronUp size={18} color="var(--sap-text-faint)" /> : <ChevronDown size={18} color="var(--sap-text-faint)" />}
            </div>

            {/* Expanded daily chart */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px' }}>
                {loadingDaily && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Loader2 size={24} color="var(--sap-purple)" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}

                {!loadingDaily && dailyData && (
                  <div>
                    {/* Daily views chart - last 30 days */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('campaignAnalytics.dailyViews')}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, marginBottom: 16, padding: '0 2px' }}>
                      {dailyData.daily.map(function(day, i) {
                        var barHeight = maxDaily > 0 ? Math.max(2, (day.views / maxDaily) * 100) : 2;
                        var isToday = i === dailyData.daily.length - 1;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <div style={{ fontSize: 9, color: 'var(--sap-text-faint)', minHeight: 12 }}>
                              {day.views > 0 ? day.views : ''}
                            </div>
                            <div
                              title={day.date + ': ' + day.views + ' views'}
                              style={{
                                width: '100%', maxWidth: 18, borderRadius: '3px 3px 0 0',
                                height: barHeight + '%', minHeight: 2,
                                background: isToday ? 'var(--sap-green-bright)' : day.views > 0 ? 'var(--sap-purple)' : 'var(--sap-border)',
                                transition: 'height 0.3s',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--sap-text-faint)', marginBottom: 20 }}>
                      <span>{dailyData.daily[0] ? dailyData.daily[0].date : ''}</span>
                      <span style={{ color: 'var(--sap-green-bright)', fontWeight: 600 }}>{t('campaignAnalytics.today')}</span>
                    </div>

                    {/* Per-campaign country breakdown + heatmap */}
                    {((dailyData.top_countries && dailyData.top_countries.length > 0) || dailyData.hourly_heatmap) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
                        {dailyData.top_countries && dailyData.top_countries.length > 0 && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 10 }}>
                              <Globe size={14} color="var(--sap-accent)" />
                              {t('campaignAnalytics.viewersBy', { defaultValue: 'Viewers by country' })}
                            </div>
                            {dailyData.top_countries.map(function(row, i) {
                              var maxV = dailyData.top_countries[0].viewers || 1;
                              var pct = Math.round((row.viewers / maxV) * 100);
                              return (
                                <div key={i} style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--sap-text-primary)' }}>{row.country}</span>
                                    <span style={{ color: 'var(--sap-text-faint)' }}>{row.viewers}</span>
                                  </div>
                                  <div style={{ height: 4, background: 'var(--sap-border)', borderRadius: 2 }}>
                                    <div style={{ height: '100%', width: pct + '%', background: 'var(--sap-accent)', borderRadius: 2 }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {dailyData.hourly_heatmap && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 10 }}>
                              <Clock size={14} color="var(--sap-purple)" />
                              {t('campaignAnalytics.whenWatched', { defaultValue: 'When viewers watched' })}
                            </div>
                            <HourlyHeatmap matrix={dailyData.hourly_heatmap} small={true} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recent watch log */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('campaignAnalytics.recentWatches')}</div>
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {dailyData.recent_watches && dailyData.recent_watches.length > 0 ? (
                        dailyData.recent_watches.map(function(w, i) {
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                              borderBottom: i < dailyData.recent_watches.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: 'var(--sap-purple)' }}>{w.viewer.slice(0, 1).toUpperCase()}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{w.viewer}</div>
                                <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>{w.date}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} color="var(--sap-green-bright)" />
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-green-bright)' }}>{w.duration}s watched</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>
                                {w.watched_at ? new Date(w.watched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--sap-text-faint)', textAlign: 'center', padding: '20px 0' }}>{t('campaignAnalytics.noWatches')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Verification note */}
      {campaigns.length > 0 && (
        <div style={{ background: 'var(--sap-green-bg)', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Target size={18} color="var(--sap-green)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 4 }}>{t('campaignAnalytics.verifiedTitle')}</div>
            <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.6 }}>{t('campaignAnalytics.verifiedDesc')}</div>
          </div>
        </div>
      )}

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </AppLayout>
  );
}

/**
 * HourlyHeatmap — renders a 7×24 matrix of view counts as a colour-graded grid.
 * matrix is an array of 7 arrays of 24 ints. Row 0 = Sunday, column 0 = 00:00.
 * Colour intensity scales to the max value in the matrix.
 */
function HourlyHeatmap(props) {
  var matrix = props.matrix || [];
  var small = props.small === true;
  var maxVal = 0;
  for (var r = 0; r < matrix.length; r++) {
    for (var c = 0; c < (matrix[r] || []).length; c++) {
      if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
    }
  }

  var dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var cellSize = small ? 10 : 14;
  var gap = small ? 2 : 2;
  var fontSize = small ? 9 : 10;

  function cellColour(val) {
    if (!val || maxVal === 0) return '#f1f5f9';
    var pct = val / maxVal;
    // Purple gradient — light for low, saturated for high
    if (pct < 0.2) return '#ede9fe';
    if (pct < 0.4) return '#c4b5fd';
    if (pct < 0.6) return '#a78bfa';
    if (pct < 0.8) return '#8b5cf6';
    return '#7c3aed';
  }

  if (maxVal === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--sap-text-faint)', textAlign: 'center', padding: '30px 0' }}>
        Activity data will appear as your viewers watch.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap, paddingTop: fontSize + 4 }}>
        {dayLabels.map(function(d, i) {
          return <div key={i} style={{ height: cellSize, fontSize: fontSize, color: 'var(--sap-text-faint)', display: 'flex', alignItems: 'center' }}>{d}</div>;
        })}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: fontSize > 9 ? 2 : 1, marginBottom: 3, fontSize: fontSize, color: 'var(--sap-text-faint)', textAlign: 'center' }}>
          {[0,3,6,9,12,15,18,21].map(function(h) {
            return <div key={h} style={{ gridColumn: 'span 3' }}>{h}</div>;
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, ' + cellSize + 'px)', gap: gap }}>
          {matrix.map(function(row, ri) {
            return (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: gap }}>
                {row.map(function(v, ci) {
                  return (
                    <div key={ci}
                      title={dayLabels[ri] + ' ' + (ci < 10 ? '0' + ci : ci) + ':00 — ' + v + ' views'}
                      style={{ background: cellColour(v), borderRadius: 2, height: cellSize, cursor: v > 0 ? 'pointer' : 'default' }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
