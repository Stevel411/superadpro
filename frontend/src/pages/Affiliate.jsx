import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Button, Badge, PageLoading } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { Share2, Copy, Check, Users, DollarSign, Link2, Facebook, Twitter, Mail, MessageCircle } from 'lucide-react';

export default function Affiliate() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiGet('/api/affiliate').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const refLink = `https://superadpro.com/ref/${user?.username}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = encodeURIComponent(refLink);
  const shareText = encodeURIComponent('Join SuperAdPro — earn passive income with video advertising, courses, and affiliate marketing!');

  if (loading) return <AppLayout title="Social Share"><PageLoading /></AppLayout>;

  return (
    <AppLayout title="Social Share" subtitle="Share your link and earn commissions">

      {/* Referral Link */}
      <Card hover={false} className="mb-5 bg-gradient-to-br from-slate-900 to-navy border-cyan/10">
        <CardBody className="py-6">
          <div className="text-center mb-4">
            <h2 className="font-display text-xl font-extrabold text-white mb-1">Your Referral Link</h2>
            <p className="text-sm text-white/40">Share this link to earn 50% commission on every referral</p>
          </div>
          <div className="flex items-center gap-3 max-w-xl mx-auto">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-cyan font-mono truncate">
              {refLink}
            </div>
            <Button onClick={copyLink} variant={copied ? 'secondary' : 'primary'} size="md">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
          </div>
          {/* Share Buttons */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <ShareButton href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} color="bg-[#1877f2]" icon={<Facebook className="w-4 h-4" />} label="Facebook" />
            <ShareButton href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`} color="bg-black" icon={<Twitter className="w-4 h-4" />} label="X / Twitter" />
            <ShareButton href={`https://wa.me/?text=${shareText}%20${shareUrl}`} color="bg-[#25d366]" icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" />
            <ShareButton href={`mailto:?subject=Join%20SuperAdPro&body=${shareText}%20${shareUrl}`} color="bg-slate-600" icon={<Mail className="w-4 h-4" />} label="Email" />
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard icon={<Users className="w-5 h-5 text-cyan" />} label="Personal Referrals"
          value={data?.personal_referrals || user?.personal_referrals || 0} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<Users className="w-5 h-5 text-violet" />} label="Total Network"
          value={data?.total_team || user?.total_team || 0} className="[--icon-bg:#ede9fe]" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-emerald" />} label="Total Earned"
          value={`$${Math.round(data?.total_earned || user?.total_earned || 0)}`} className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<Link2 className="w-5 h-5 text-amber" />} label="LinkHub Views"
          value={data?.linkhub_views || 0} className="[--icon-bg:#fef3c7]" />
      </div>

      {/* Direct Referrals List */}
      <Card hover={false}>
        <CardBody>
          <h3 className="text-sm font-bold text-slate-700 mb-4">Your Direct Referrals</h3>
          {(!data?.referrals || data.referrals.length === 0) ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm text-slate-500 mb-3">No referrals yet. Share your link to start building your team!</p>
              <Button onClick={copyLink} size="sm">Copy Referral Link</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3 hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan/10 flex items-center justify-center text-sm font-bold text-cyan">
                      {(r.first_name || r.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{r.first_name || r.username}</div>
                      <div className="text-xs text-slate-400">@{r.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={r.is_active ? 'green' : 'slate'}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge color="cyan">{r.membership_tier || 'Basic'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </AppLayout>
  );
}

function ShareButton({ href, color, icon, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`${color} text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold no-underline hover:opacity-90 transition-all`}>
      {icon} {label}
    </a>
  );
}
