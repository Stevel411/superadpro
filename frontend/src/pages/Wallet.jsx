import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Button, Badge, PageLoading, EmptyState } from '../components/ui';
import { apiGet, apiPost } from '../utils/api';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Send, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function Wallet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('commissions');

  useEffect(() => {
    apiGet('/api/wallet').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Wallet"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Wallet"><div className="text-center py-20 text-slate-400">Unable to load wallet</div></AppLayout>;

  const statusIcon = (s) => {
    if (s === 'completed' || s === 'approved') return <CheckCircle className="w-4 h-4 text-emerald" />;
    if (s === 'pending') return <Clock className="w-4 h-4 text-amber" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <AppLayout title="Wallet" subtitle={`${data.membership_tier?.charAt(0).toUpperCase() + data.membership_tier?.slice(1)} Membership`}>

      {/* Balance Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <Card hover={false} className="bg-gradient-to-br from-slate-900 to-navy border-cyan/10">
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <WalletIcon className="w-5 h-5 text-cyan" />
                <span className="text-xs font-bold text-cyan/60 uppercase tracking-wider">Available Balance</span>
              </div>
              <div className="font-display text-3xl font-black text-white">${data.balance.toFixed(2)}</div>
              <div className="flex gap-2 mt-4">
                <Button variant="primary" size="sm" className="flex-1">Withdraw</Button>
                <Button variant="outline" size="sm" className="flex-1">Transfer</Button>
              </div>
            </CardBody>
          </Card>
        </div>
        <StatCard icon={<ArrowDownCircle className="w-5 h-5 text-emerald" />} label="Total Earned"
          value={`$${Math.round(data.total_earned)}`} valueColor="text-emerald"
          className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<ArrowUpCircle className="w-5 h-5 text-violet" />} label="Total Withdrawn"
          value={`$${Math.round(data.total_withdrawn)}`}
          className="[--icon-bg:#ede9fe]" />
        <StatCard icon={<Send className="w-5 h-5 text-cyan" />} label="Grid Earnings"
          value={`$${Math.round(data.grid_earnings)}`}
          className="[--icon-bg:#e0f2fe]" />
      </div>

      {/* Earnings Breakdown */}
      <Card hover={false} className="mb-6">
        <CardBody>
          <h3 className="text-sm font-bold text-slate-700 mb-4">Earnings Breakdown</h3>
          <div className="grid grid-cols-4 gap-4">
            <EarningsBar label="Grid" amount={data.grid_earnings} color="bg-cyan" total={data.total_earned} />
            <EarningsBar label="Courses" amount={data.course_earnings} color="bg-violet" total={data.total_earned} />
            <EarningsBar label="Marketplace" amount={data.marketplace_earnings} color="bg-rose" total={data.total_earned} />
            <EarningsBar label="Other" amount={Math.max(0, data.total_earned - data.grid_earnings - data.course_earnings - data.marketplace_earnings)} color="bg-amber" total={data.total_earned} />
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
        {['commissions', 'withdrawals', 'transfers'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all cursor-pointer border-none
              ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'commissions' && (
        <Card hover={false}>
          <CardBody className="p-0">
            {(data.commissions || []).length === 0 ? (
              <EmptyState icon="💰" title="No commissions yet" description="Start referring members to earn commissions" />
            ) : (
              <div className="divide-y divide-slate-50">
                {data.commissions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base">{c.icon || '💰'}</span>
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
      )}

      {tab === 'withdrawals' && (
        <Card hover={false}>
          <CardBody className="p-0">
            {(data.withdrawals || []).length === 0 ? (
              <EmptyState icon="📤" title="No withdrawals yet" description="Withdraw your earnings to your wallet" />
            ) : (
              <div className="divide-y divide-slate-50">
                {data.withdrawals.map((w, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-3">
                      {statusIcon(w.status)}
                      <div>
                        <div className="text-sm font-semibold text-slate-800">${w.amount.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">{w.requested_at ? new Date(w.requested_at).toLocaleDateString() : ''}</div>
                      </div>
                    </div>
                    <Badge color={w.status === 'completed' ? 'green' : w.status === 'pending' ? 'amber' : 'red'}>
                      {w.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'transfers' && (
        <Card hover={false}>
          <CardBody className="p-0">
            {(data.p2p_history || []).length === 0 ? (
              <EmptyState icon="🔄" title="No transfers yet" description="Send funds to other members using P2P transfer" />
            ) : (
              <div className="divide-y divide-slate-50">
                {data.p2p_history.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-3">
                      <Send className="w-4 h-4 text-cyan" />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{t.direction === 'sent' ? `To ${t.other_user}` : `From ${t.other_user}`}</div>
                        <div className="text-xs text-slate-400">{t.created_at || ''}</div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${t.direction === 'sent' ? 'text-red-500' : 'text-emerald'}`}>
                      {t.direction === 'sent' ? '-' : '+'}${(t.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </AppLayout>
  );
}

function EarningsBar({ label, amount, color, total }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-800">${Math.round(amount)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-slate-400 mt-1">{pct}%</div>
    </div>
  );
}
