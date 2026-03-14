import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Button, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { Crown, Check, Sparkles, Target, Mail, LayoutGrid, Bot, Globe } from 'lucide-react';

const PRO_FEATURES = [
  { icon: <Bot className="w-5 h-5" />, title: 'ProSeller AI', desc: 'AI-powered sales assistant that helps you close more deals' },
  { icon: <Sparkles className="w-5 h-5" />, title: 'AI Funnel Generator', desc: 'Generate complete landing pages and email sequences with AI' },
  { icon: <Mail className="w-5 h-5" />, title: 'Email Autoresponder', desc: 'Automated email sequences that nurture your leads' },
  { icon: <Target className="w-5 h-5" />, title: 'Lead Dashboard', desc: 'Track and manage all your leads in one place' },
  { icon: <Globe className="w-5 h-5" />, title: 'SuperPages', desc: 'Build unlimited landing pages with the visual editor' },
  { icon: <LayoutGrid className="w-5 h-5" />, title: 'Course Marketplace', desc: 'Create and sell your own courses, keep 50% of every sale' },
];

export default function Upgrade() {
  const { user } = useAuth();

  if (user?.membership_tier === 'pro') {
    return (
      <AppLayout title="Upgrade" subtitle="Membership">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-emerald/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-emerald" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-800 mb-2">You're already Pro!</h2>
          <p className="text-sm text-slate-500">You have full access to all SuperAdPro features.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Upgrade to Pro" subtitle="Unlock the full power of SuperAdPro">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <Card hover={false} className="mb-6 bg-gradient-to-br from-slate-900 to-navy border-cyan/10 text-center">
          <CardBody className="py-10">
            <Crown className="w-12 h-12 text-cyan mx-auto mb-4" />
            <h2 className="font-display text-3xl font-extrabold text-white mb-2">Go Pro</h2>
            <p className="text-white/40 mb-4 max-w-md mx-auto">Unlock AI tools, course marketplace, email autoresponder, and advanced marketing features.</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-sm text-white/40 line-through">$20/mo</div>
                <div className="text-xs text-white/30">Basic</div>
              </div>
              <div className="text-center">
                <div className="font-display text-4xl font-black text-cyan">$30</div>
                <div className="text-xs text-cyan/60">per month</div>
              </div>
            </div>
            <Button variant="primary" size="lg">Upgrade Now</Button>
          </CardBody>
        </Card>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          <Card hover={false}>
            <CardBody>
              <Badge color="slate" className="mb-3">Basic — $20/mo</Badge>
              <div className="flex flex-col gap-2.5">
                <Feature text="Watch to Earn" included />
                <Feature text="Video Campaigns" included />
                <Feature text="Income Grid Access" included />
                <Feature text="Ad Board" included />
                <Feature text="LinkHub" included />
                <Feature text="50% Membership Commission" included />
                <Feature text="ProSeller AI" />
                <Feature text="AI Funnel Generator" />
                <Feature text="Email Autoresponder" />
                <Feature text="Lead Dashboard" />
                <Feature text="Course Marketplace" />
              </div>
            </CardBody>
          </Card>
          <Card hover={false} className="ring-2 ring-cyan/20">
            <CardBody>
              <Badge color="cyan" className="mb-3">Pro — $30/mo</Badge>
              <div className="flex flex-col gap-2.5">
                <Feature text="Everything in Basic" included />
                <Feature text="ProSeller AI" included pro />
                <Feature text="AI Funnel Generator" included pro />
                <Feature text="Email Autoresponder" included pro />
                <Feature text="Lead Dashboard" included pro />
                <Feature text="Course Marketplace" included pro />
                <Feature text="SuperPages Editor" included pro />
                <Feature text="AI Image Generator" included pro />
                <Feature text="Priority Support" included pro />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Pro Features Detail */}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pro Features</h3>
        <div className="grid grid-cols-3 gap-4">
          {PRO_FEATURES.map((f, i) => (
            <Card key={i} hover={false}>
              <CardBody className="text-center py-5">
                <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center mx-auto mb-3 text-cyan">
                  {f.icon}
                </div>
                <div className="text-sm font-bold text-slate-800 mb-0.5">{f.title}</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{f.desc}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Feature({ text, included, pro }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {included ? (
        <Check className={`w-4 h-4 shrink-0 ${pro ? 'text-cyan' : 'text-emerald'}`} />
      ) : (
        <div className="w-4 h-4 shrink-0 rounded-full border border-slate-200" />
      )}
      <span className={included ? 'text-slate-700' : 'text-slate-400'}>{text}</span>
      {pro && <Badge color="cyan" className="text-[9px] px-1.5 py-0">PRO</Badge>}
    </div>
  );
}
