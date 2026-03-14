import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge, PageLoading } from '../components/ui';
import { apiGet } from '../utils/api';
import { ArrowUp, ArrowDown, Crown, User, Users } from 'lucide-react';

export default function PassupVisualiser() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/passup-visualiser').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Pass-Up Visualiser"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Pass-Up Visualiser"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  return (
    <AppLayout title="Pass-Up Visualiser" subtitle="Your position in the network hierarchy">
      <div className="max-w-2xl mx-auto">

        {/* Upline Chain */}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ArrowUp className="w-3.5 h-3.5" /> Your Upline (who earns from your sales)
        </h3>
        <div className="flex flex-col items-center gap-2 mb-6">
          {(data.upline_chain || []).reverse().map((u, i) => (
            <div key={i} className="w-full">
              <Card hover={false} className={i === 0 ? 'ring-2 ring-amber/20' : ''}>
                <CardBody className="flex items-center gap-4 py-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.is_admin ? 'bg-amber/10 text-amber' : 'bg-slate-100 text-slate-500'}`}>
                    {u.is_admin ? <Crown className="w-5 h-5" /> : (u.first_name || u.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{u.first_name || u.username} {u.is_admin ? '(Master)' : ''}</div>
                    <div className="text-xs text-slate-400">@{u.username} · Level {u.level} above you</div>
                  </div>
                  <Badge color={u.is_admin ? 'amber' : 'slate'}>L{u.level}</Badge>
                </CardBody>
              </Card>
              <div className="flex justify-center py-1">
                <div className="w-px h-4 bg-slate-200" />
              </div>
            </div>
          ))}
        </div>

        {/* YOU */}
        <Card hover={false} className="ring-2 ring-cyan/30 mb-6">
          <CardBody className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-cyan/10 flex items-center justify-center text-lg font-bold text-cyan shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-base font-display font-extrabold text-slate-800">
                {data.user?.first_name || data.user?.username} <Badge color="cyan">YOU</Badge>
              </div>
              <div className="text-xs text-slate-400">@{data.user?.username}</div>
            </div>
          </CardBody>
        </Card>

        {/* Downline */}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ArrowDown className="w-3.5 h-3.5" /> Your Direct Downline ({(data.direct_downline || []).length})
        </h3>
        {(data.direct_downline || []).length === 0 ? (
          <Card hover={false}>
            <CardBody className="text-center py-8">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No direct referrals yet</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(data.direct_downline || []).map((d, i) => (
              <Card key={i} hover={false}>
                <CardBody className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-emerald/10 flex items-center justify-center text-sm font-bold text-emerald shrink-0">
                    {(d.first_name || d.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{d.first_name || d.username}</div>
                    <div className="text-xs text-slate-400">{d.personal_referrals || 0} referrals</div>
                  </div>
                  <Badge color={d.is_active ? 'green' : 'slate'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
