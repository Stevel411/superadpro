import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, PageLoading } from '../components/ui';
import { apiGet } from '../utils/api';
import { BarChart3, TrendingUp, Users, Eye, MousePointer, DollarSign } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/analytics').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Analytics"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Analytics"><div className="text-center py-20 text-slate-400">Unable to load analytics</div></AppLayout>;

  return (
    <AppLayout title="Analytics" subtitle="Track your performance across the platform">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Eye className="w-5 h-5 text-cyan" />} label="Total Views"
          value={data.total_views || 0} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<MousePointer className="w-5 h-5 text-violet" />} label="Total Clicks"
          value={data.total_clicks || 0} className="[--icon-bg:#ede9fe]" />
        <StatCard icon={<Users className="w-5 h-5 text-emerald" />} label="Conversions"
          value={data.conversions || 0} className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-amber" />} label="Revenue"
          value={`$${Math.round(data.revenue || 0)}`} className="[--icon-bg:#fef3c7]" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Campaign Performance */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" /> Campaign Performance
            </h3>
            {(!data.campaigns || data.campaigns.length === 0) ? (
              <div className="text-center py-8 text-sm text-slate-400">No active campaigns</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.campaigns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{c.title}</div>
                      <div className="text-xs text-slate-400">{c.platform} · {c.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">{c.views_delivered || 0} views</div>
                      <div className="text-xs text-slate-400">of {c.views_target || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Referral Sources */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> Top Sources
            </h3>
            {(!data.sources || data.sources.length === 0) ? (
              <div className="text-center py-8 text-sm text-slate-400">No tracking data yet</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.sources.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <span className="text-sm text-slate-700">{s.source}</span>
                    <span className="text-sm font-bold text-slate-800">{s.count} clicks</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
