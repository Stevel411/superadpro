import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge } from '../components/ui';
import { DollarSign, ArrowRight, Users, GraduationCap, Grid3X3, Store } from 'lucide-react';

const FLOW_STEPS = [
  { step: '1', title: 'You refer a new member', desc: 'Share your unique referral link. When someone signs up through it, they become your direct referral.' },
  { step: '2', title: 'They activate their membership', desc: 'Basic ($20/mo) or Pro ($30/mo). You earn 50% commission — $10 or $15 — credited instantly to your wallet.' },
  { step: '3', title: 'They activate campaign tiers', desc: 'Each tier they activate places them in your income grid. You earn 40% direct + uni-level commissions as the grid fills.' },
  { step: '4', title: 'They buy or sell courses', desc: 'Platform courses: you earn 100% (first 2 pass up). Marketplace courses they create: you earn 25% sponsor commission.' },
  { step: '5', title: 'Their referrals activate', desc: 'As your downline grows, uni-level commissions flow up through the grid. Your team activity generates passive income.' },
];

export default function HowCommissionsWork() {
  return (
    <AppLayout title="How Commissions Work" subtitle="Understand every way you earn on SuperAdPro">

      {/* Commission Flow */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">The earning flow</h3>
      <div className="flex flex-col gap-3 mb-8">
        {FLOW_STEPS.map((s, i) => (
          <Card key={i} hover={false}>
            <CardBody className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center font-display font-black text-cyan text-lg shrink-0">
                {s.step}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Commission Types */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Commission types</h3>
      <div className="grid grid-cols-2 gap-5 mb-8">
        <CommissionCard icon={<Users className="w-6 h-6" />} title="Membership" rate="50%"
          color="bg-emerald/10 text-emerald"
          details={['$10 per Basic referral ($20/mo)', '$15 per Pro referral ($30/mo)', 'Paid instantly to wallet', 'Recurring monthly as long as they stay active']} />
        <CommissionCard icon={<Grid3X3 className="w-6 h-6" />} title="Income Grid" rate="40/50/5/5"
          color="bg-cyan/10 text-cyan"
          details={['40% direct commission on each position', '50% distributed across uni-level pool', '5% goes to grid completion bonus pool', '5% company share', '8 tiers from $20 to $1,000']} />
        <CommissionCard icon={<GraduationCap className="w-6 h-6" />} title="Platform Courses" rate="100%"
          color="bg-violet/10 text-violet"
          details={['Sell platform courses, keep 100%', 'First 2 sales pass up to your sponsor', 'After that, every sale is yours', 'Courses range from $25-$500']} />
        <CommissionCard icon={<Store className="w-6 h-6" />} title="Course Marketplace" rate="50/25/25"
          color="bg-rose/10 text-rose"
          details={['Create your own course: keep 50%', 'Your sponsor earns 25%', 'Platform takes 25%', 'Set your own price ($25 minimum)']} />
      </div>

      {/* Pass-Up System */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">The pass-up system</h3>
      <Card hover={false}>
        <CardBody>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            For platform course sales, the first 2 sales you make pass up to your sponsor. This means your sponsor
            earns the commission on your first 2 sales. After that, you keep 100% of every sale. This creates a
            powerful incentive: your sponsor wants you to succeed because they benefit from your early sales. Once
            you've passed up 2 sales, they no longer receive anything from your course sales — it's all yours.
          </p>
          <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
            <Step label="Sale 1" desc="→ Goes to sponsor" color="text-amber" />
            <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
            <Step label="Sale 2" desc="→ Goes to sponsor" color="text-amber" />
            <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
            <Step label="Sale 3+" desc="→ 100% YOURS" color="text-emerald" />
          </div>
        </CardBody>
      </Card>
    </AppLayout>
  );
}

function CommissionCard({ icon, title, rate, color, details }) {
  return (
    <Card hover={false}>
      <CardBody>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <Badge color="cyan">{rate}</Badge>
          </div>
        </div>
        <ul className="space-y-1.5">
          {details.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
              <DollarSign className="w-3 h-3 text-emerald shrink-0 mt-0.5" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function Step({ label, desc, color }) {
  return (
    <div className="text-center flex-1">
      <div className={`text-sm font-bold ${color}`}>{label}</div>
      <div className="text-[11px] text-slate-400">{desc}</div>
    </div>
  );
}
