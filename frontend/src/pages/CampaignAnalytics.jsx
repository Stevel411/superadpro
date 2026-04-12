import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { BarChart3, Eye, Users, Clock, TrendingUp, ChevronDown, ChevronUp, Loader2, Play, Calendar, Target } from 'lucide-react';

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
                <div style={{ fontSize: 10, color: 'var(--sap-text-faint)' }}>today</div>
              </div>

              {/* Unique viewers */}
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 60 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-accent)' }}>{c.unique_viewers}</div>
                <div style={{ fontSize: 10, color: 'var(--sap-text-faint)' }}>unique</div>
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
