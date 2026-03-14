import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge, PageLoading } from '../components/ui';
import { apiGet } from '../utils/api';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('earners');

  useEffect(() => {
    apiGet('/api/leaderboard').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Leaderboard"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Leaderboard"><div className="text-center py-20 text-slate-400">Unable to load leaderboard</div></AppLayout>;

  const tabs = [
    { key: 'earners', label: 'Top Earners', data: data.top_earners || [] },
    { key: 'recruiters', label: 'Top Recruiters', data: data.top_recruiters || [] },
    { key: 'teams', label: 'Biggest Teams', data: data.top_teams || [] },
  ];
  const current = tabs.find(t => t.key === tab) || tabs[0];

  const rankIcon = (i) => {
    if (i === 0) return <Crown className="w-5 h-5 text-amber" />;
    if (i === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (i === 2) return <Medal className="w-5 h-5 text-amber/60" />;
    return <span className="w-5 text-center text-sm font-bold text-slate-400">#{i + 1}</span>;
  };

  return (
    <AppLayout title="Leaderboard" subtitle="Top performers across the platform">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all cursor-pointer border-none
              ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {current.data.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[1, 0, 2].map(pos => {
            const entry = current.data[pos];
            if (!entry) return null;
            const isFirst = pos === 0;
            return (
              <Card key={pos} hover={false} className={isFirst ? 'ring-2 ring-amber/30' : ''}>
                <CardBody className="text-center py-6">
                  <div className="mb-2">{rankIcon(pos)}</div>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center mx-auto mb-3 text-xl font-bold text-slate-700">
                    {(entry.name || entry.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="font-bold text-slate-800 text-sm mb-0.5">{entry.name || entry.username}</div>
                  <div className="font-display text-xl font-black text-emerald">
                    {tab === 'earners' ? `$${Math.round(entry.value || 0)}` :
                     tab === 'recruiters' ? `${entry.value || 0} referrals` :
                     `${entry.value || 0} members`}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full List */}
      <Card hover={false}>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-50">
            {current.data.map((entry, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all ${i < 3 ? 'bg-amber/3' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">{rankIcon(i)}</div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                    {(entry.name || entry.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{entry.name || entry.username}</div>
                    <div className="text-xs text-slate-400">@{entry.username}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">
                    {tab === 'earners' ? `$${Math.round(entry.value || 0)}` :
                     `${entry.value || 0}`}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tab === 'earners' ? 'earned' : tab === 'recruiters' ? 'referrals' : 'team size'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </AppLayout>
  );
}
