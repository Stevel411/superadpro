import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { StreamCard, Card, CardBody, PageLoading, Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import {
  GraduationCap, Zap, Bot, Eye, Share2, Wallet,
  Users, Grid3X3, BookOpen, Rocket, Store
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/dashboard')
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Dashboard"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Dashboard"><div className="text-center py-20 text-slate-400">Unable to load dashboard</div></AppLayout>;

  const d = data;

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome back, ${d.display_name || user?.first_name || user?.username || ''}`}>

      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 to-navy rounded-2xl p-7 mb-5 overflow-hidden border border-cyan/10">
        <div className="absolute -top-20 -right-10 w-60 h-60 bg-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-violet/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-white mb-1">Welcome back</h2>
            <p className="text-3xl font-display font-black text-white">{d.display_name || user?.username}</p>
            <p className="text-sm text-white/40 mt-2">
              You have {d.total_team || 0} members in your network
              {(d.total_earned || 0) > 0 && ` and earned $${Math.round(d.total_earned)} across all income streams`}.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/affiliate">
              <Button variant="primary" size="md">
                <Share2 className="w-4 h-4" /> Share & Earn
              </Button>
            </Link>
            <Link to="/wallet">
              <Button variant="outline" size="md">
                <Wallet className="w-4 h-4" /> Withdraw
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Income Streams */}
      <div className="grid grid-cols-5 gap-3.5 mb-5">
        <StreamCard
          icon="👥" label="Membership" badge="$10/referral" color="green"
          value={`$${Math.round(d.membership_earned || 0)}`}
          detail={`${d.personal_referrals || 0} personal referrals`}
        />
        <StreamCard
          icon="🔲" label="Income Grid" badge="40% + uni-level" color="cyan"
          value={`$${Math.round(d.grid_earnings || 0)}`}
          detail={`${d.grid_stats?.completed_advances || 0} advances completed`}
        />
        <StreamCard
          icon="🎓" label="Course Sales" badge="100% commission" color="violet"
          value={`$${Math.round(d.course_earnings || 0)}`}
          detail={`${d.course_sale_count || 0} sale${d.course_sale_count !== 1 ? 's' : ''} made`}
        />
        <StreamCard
          icon="🚀" label="Campaigns" badge="tier bonus" color="amber"
          value={`$${Math.round(d.boost_earned || 0)}`}
          detail="Video campaign earnings"
        />
        <StreamCard
          icon="🏪" label="Marketplace" badge="50/25/25" color="rose"
          value={`$${Math.round(d.marketplace_earnings || 0)}`}
          detail={`${d.marketplace_sales || 0} sale${d.marketplace_sales !== 1 ? 's' : ''} · ${d.marketplace_courses || 0} course${d.marketplace_courses !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Quick Actions */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
      <div className="grid grid-cols-5 gap-3.5 mb-5">
        <QuickAction to="/courses" icon={<GraduationCap className="w-5 h-5" />} label="Browse Courses" desc="Learn skills & earn commissions" color="bg-emerald-light" />
        <QuickAction to="/courses/create" icon={<Store className="w-5 h-5" />} label="Create Course" desc="Build & sell on the marketplace" color="bg-cyan-light" />
        <QuickAction to="/campaign-tiers" icon={<Zap className="w-5 h-5" />} label="Campaign Tiers" desc="Activate the earning engine" color="bg-violet-light" />
        <QuickAction to="/campaign-studio" icon={<Bot className="w-5 h-5" />} label="AI Marketing" desc="Generate campaigns & scripts" color="bg-amber-light" />
        <QuickAction to="/watch" icon={<Eye className="w-5 h-5" />} label="Watch to Earn" desc="Daily videos for bonus earnings" color="bg-rose-light" />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Recent Activity</h3>
            {(d.recent_activity || []).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No recent activity</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(d.recent_activity || []).slice(0, 6).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{a.icon || '💰'}</span>
                      <span className="text-sm text-slate-600 truncate">{a.description}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald shrink-0">${a.amount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Account Summary */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Account Summary</h3>
            <div className="flex flex-col gap-2">
              <SummaryRow label="Balance" value={`$${(d.balance || 0).toFixed(2)}`} color="text-emerald" />
              <SummaryRow label="Total Earned" value={`$${Math.round(d.total_earned || 0)}`} />
              <SummaryRow label="Total Withdrawn" value={`$${Math.round(d.total_withdrawn || 0)}`} />
              <SummaryRow label="Membership" value={(d.membership_tier || 'basic').charAt(0).toUpperCase() + (d.membership_tier || 'basic').slice(1)} />
              <SummaryRow label="Personal Referrals" value={d.personal_referrals || 0} />
              <SummaryRow label="Network Size" value={d.total_team || 0} />
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

function QuickAction({ to, icon, label, desc, color }) {
  return (
    <Link to={to} className="no-underline">
      <Card className="h-full">
        <CardBody className="flex flex-col items-start gap-2">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-slate-700`}>
            {icon}
          </div>
          <div className="text-sm font-bold text-slate-800">{label}</div>
          <div className="text-[11px] text-slate-400 leading-snug">{desc}</div>
        </CardBody>
      </Card>
    </Link>
  );
}

function SummaryRow({ label, value, color = 'text-slate-800' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
