import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Button, Badge, PageLoading } from '../components/ui';
import { apiGet } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Zap, Check, Lock, TrendingUp, DollarSign } from 'lucide-react';

const TIERS = [
  { tier: 1, name: 'Campaign 1', price: 20, color: 'from-cyan/10 to-cyan/5', accent: 'text-cyan', border: 'border-cyan/20' },
  { tier: 2, name: 'Campaign 2', price: 50, color: 'from-emerald/10 to-emerald/5', accent: 'text-emerald', border: 'border-emerald/20' },
  { tier: 3, name: 'Campaign 3', price: 100, color: 'from-violet/10 to-violet/5', accent: 'text-violet', border: 'border-violet/20' },
  { tier: 4, name: 'Campaign 4', price: 200, color: 'from-amber/10 to-amber/5', accent: 'text-amber', border: 'border-amber/20' },
  { tier: 5, name: 'Campaign 5', price: 300, color: 'from-rose/10 to-rose/5', accent: 'text-rose', border: 'border-rose/20' },
  { tier: 6, name: 'Campaign 6', price: 500, color: 'from-cyan/10 to-violet/5', accent: 'text-cyan', border: 'border-cyan/20' },
  { tier: 7, name: 'Campaign 7', price: 750, color: 'from-emerald/10 to-amber/5', accent: 'text-emerald', border: 'border-emerald/20' },
  { tier: 8, name: 'Campaign 8', price: 1000, color: 'from-violet/10 to-rose/5', accent: 'text-violet', border: 'border-violet/20' },
];

export default function CampaignTiers() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/campaign-tiers').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Campaign Tiers"><PageLoading /></AppLayout>;

  const activeTiers = data?.active_tiers || [];

  return (
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to unlock the earning engine">

      {/* Hero */}
      <Card hover={false} className="mb-6 bg-gradient-to-br from-slate-900 to-navy border-cyan/10">
        <CardBody className="text-center py-8">
          <Zap className="w-10 h-10 text-cyan mx-auto mb-3" />
          <h2 className="font-display text-2xl font-extrabold text-white mb-2">Campaign Tiers</h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto">
            Each tier you activate places you in a new 8×8 income grid. Earn 40% direct commission,
            50% uni-level, 5% bonus pool, and 5% company share on every position filled beneath you.
          </p>
        </CardBody>
      </Card>

      {/* Tier Grid */}
      <div className="grid grid-cols-4 gap-4">
        {TIERS.map(t => {
          const isActive = activeTiers.includes(t.tier);
          return (
            <Card key={t.tier} hover={!isActive} className={`${isActive ? 'ring-2 ring-emerald/30' : ''}`}>
              <div className={`h-2 bg-gradient-to-r ${t.color}`} />
              <CardBody className="text-center">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center mx-auto mb-3`}>
                  {isActive ? <Check className={`w-6 h-6 ${t.accent}`} /> : <Lock className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="font-display text-lg font-extrabold text-slate-800 mb-0.5">{t.name}</div>
                <div className={`font-display text-2xl font-black ${t.accent} mb-3`}>${t.price}</div>

                <div className="flex flex-col gap-1.5 mb-4 text-left">
                  <TierDetail label="Direct" value="40%" />
                  <TierDetail label="Uni-level" value="50%" />
                  <TierDetail label="Bonus Pool" value="5%" />
                  <TierDetail label="Grid Size" value="8×8 (64)" />
                </div>

                {isActive ? (
                  <Badge color="green" className="w-full justify-center py-1.5">Active</Badge>
                ) : (
                  <Button variant="primary" size="sm" className="w-full">Activate</Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}

function TierDetail({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}
