import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Badge, PageLoading, EmptyState } from '../components/ui';
import { apiGet } from '../utils/api';
import { Users, DollarSign, Grid3X3, Store, TrendingUp } from 'lucide-react';

export default function MyNetwork() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/network').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="My Network & Earnings"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="My Network & Earnings"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  return (
    <AppLayout title="My Network & Earnings" subtitle="Track your team and commission history">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard icon={<Users className="w-5 h-5 text-cyan" />} label="Personal Referrals"
          value={data.personal_referrals} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<Users className="w-5 h-5 text-violet" />} label="Total Network"
          value={data.total_team} className="[--icon-bg:#ede9fe]" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-emerald" />} label="Total Earned"
          value={`$${Math.round(data.total_earned)}`} valueColor="text-emerald" className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<Grid3X3 className="w-5 h-5 text-cyan" />} label="Grid Earnings"
          value={`$${Math.round(data.grid_earnings)}`} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<Store className="w-5 h-5 text-rose" />} label="Marketplace"
          value={`$${Math.round(data.marketplace_earnings)}`} className="[--icon-bg:#ffe4e6]" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Referral List */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-4">Your Direct Referrals ({data.referrals?.length || 0})</h3>
            {(!data.referrals || data.referrals.length === 0) ? (
              <EmptyState icon="👥" title="No referrals yet" description="Share your link to build your network" />
            ) : (
              <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                {data.referrals.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-cyan/10 flex items-center justify-center text-sm font-bold text-cyan shrink-0">
                        {(r.first_name || r.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{r.first_name || r.username}</div>
                        <div className="text-xs text-slate-400">@{r.username} · {r.personal_referrals} referrals</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge color={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                      <div className="text-xs text-emerald font-bold mt-1">${Math.round(r.total_earned)} earned</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Commission History */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-4">Recent Commissions</h3>
            {(!data.commissions || data.commissions.length === 0) ? (
              <EmptyState icon="💰" title="No commissions yet" description="Earnings will appear here as your network grows" />
            ) : (
              <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                {data.commissions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{c.icon || '💰'}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{c.description || c.commission_type || 'Commission'}</div>
                        <div className="text-xs text-slate-400">{c.date || ''}</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald shrink-0">+${(c.amount || 0).toFixed(2)}</span>
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
