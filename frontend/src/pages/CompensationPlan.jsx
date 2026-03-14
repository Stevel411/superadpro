import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge } from '../components/ui';
import { DollarSign, Users, Grid3X3, GraduationCap, Store } from 'lucide-react';

const STREAMS = [
  { icon: <Users className="w-6 h-6" />, title: 'Membership Commissions', badge: '50%', color: 'bg-emerald/10 text-emerald',
    desc: 'Earn 50% commission ($10 Basic, $15 Pro) on every member you personally refer. Paid instantly to your wallet.' },
  { icon: <Grid3X3 className="w-6 h-6" />, title: 'Income Grid (8×8)', badge: '40/50/5/5', color: 'bg-cyan/10 text-cyan',
    desc: '8 campaign tiers from $20 to $1,000. Each tier has a 64-position grid. Earn 40% direct, 50% uni-level, 5% bonus pool, 5% company.' },
  { icon: <GraduationCap className="w-6 h-6" />, title: 'Platform Course Sales', badge: '100%', color: 'bg-violet/10 text-violet',
    desc: 'Sell platform courses and earn 100% commission. First 2 sales pass up to your sponsor, then you keep everything.' },
  { icon: <Store className="w-6 h-6" />, title: 'Course Marketplace', badge: '50/25/25', color: 'bg-rose/10 text-rose',
    desc: 'Create your own courses: keep 50% of every sale. Your sponsor earns 25%. Platform takes 25%.' },
];

const GRID_TIERS = [
  { tier: 1, price: '$20' }, { tier: 2, price: '$50' }, { tier: 3, price: '$100' }, { tier: 4, price: '$200' },
  { tier: 5, price: '$300' }, { tier: 6, price: '$500' }, { tier: 7, price: '$750' }, { tier: 8, price: '$1,000' },
];

export default function CompensationPlan() {
  return (
    <AppLayout title="Compensation Plan" subtitle="How you earn with SuperAdPro">
      {/* Income Streams */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">4 Income Streams</h3>
      <div className="grid grid-cols-2 gap-5 mb-8">
        {STREAMS.map((s, i) => (
          <Card key={i} hover={false}>
            <CardBody className="flex gap-4">
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-800">{s.title}</h3>
                  <Badge color="cyan">{s.badge}</Badge>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Grid Tiers */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Campaign Tiers</h3>
      <Card hover={false} className="mb-8">
        <CardBody>
          <div className="grid grid-cols-8 gap-3">
            {GRID_TIERS.map(t => (
              <div key={t.tier} className="text-center py-3 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-400 mb-0.5">Tier {t.tier}</div>
                <div className="font-display text-lg font-black text-slate-800">{t.price}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
            <SplitRow label="Direct Commission" value="40%" color="text-cyan" />
            <SplitRow label="Uni-Level Pool" value="50%" color="text-emerald" />
            <SplitRow label="Bonus Pool" value="5%" color="text-amber" />
            <SplitRow label="Company" value="5%" color="text-slate-500" />
          </div>
        </CardBody>
      </Card>

      {/* Membership */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Membership Pricing</h3>
      <div className="grid grid-cols-2 gap-5">
        <Card hover={false}>
          <CardBody className="text-center py-6">
            <Badge color="slate" className="mb-3">Basic</Badge>
            <div className="font-display text-3xl font-black text-slate-800 mb-1">$20<span className="text-lg text-slate-400">/mo</span></div>
            <div className="text-sm text-slate-500 mb-3">Essential tools to get started</div>
            <div className="text-xs text-slate-400">Commission: <strong className="text-emerald">$10 per referral</strong></div>
          </CardBody>
        </Card>
        <Card hover={false} className="ring-2 ring-cyan/20">
          <CardBody className="text-center py-6">
            <Badge color="cyan" className="mb-3">Pro</Badge>
            <div className="font-display text-3xl font-black text-slate-800 mb-1">$30<span className="text-lg text-slate-400">/mo</span></div>
            <div className="text-sm text-slate-500 mb-3">Full access + AI tools + marketplace</div>
            <div className="text-xs text-slate-400">Commission: <strong className="text-emerald">$15 per referral</strong></div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

function SplitRow({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`font-display text-xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
