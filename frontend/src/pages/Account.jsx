import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Button, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { User, Mail, Shield, Key, Crown, Calendar } from 'lucide-react';

export default function Account() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');

  const save = async () => {
    setSaving(true);
    try {
      await apiPost('/api/account/update', { first_name: firstName, last_name: lastName, email });
      await refreshUser();
      setSaving(false);
    } catch (e) {
      alert(e.message);
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout title="My Profile" subtitle={`@${user.username}`}>
      <div className="max-w-2xl">

        {/* Membership Badge */}
        <Card hover={false} className="mb-5 bg-gradient-to-r from-navy to-slate-900 border-cyan/10">
          <CardBody className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan/10 flex items-center justify-center">
                <Crown className="w-7 h-7 text-cyan" />
              </div>
              <div>
                <div className="text-lg font-display font-extrabold text-white">
                  {user.membership_tier === 'pro' ? 'Pro Member' : 'Basic Member'}
                </div>
                <div className="text-sm text-white/40">
                  {user.membership_tier === 'pro' ? '$30/month — full access to all features' : '$20/month — upgrade for Pro features'}
                </div>
              </div>
            </div>
            {user.membership_tier !== 'pro' && (
              <Button variant="primary">Upgrade to Pro</Button>
            )}
          </CardBody>
        </Card>

        {/* Profile Form */}
        <Card hover={false} className="mb-5">
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">First Name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Username</label>
              <input value={user.username} readOnly
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500" />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardBody>
        </Card>

        {/* Security */}
        <Card hover={false} className="mb-5">
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" /> Security
            </h3>
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <Key className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-700">Two-Factor Authentication</div>
                  <div className="text-xs text-slate-400">Google Authenticator</div>
                </div>
              </div>
              <Badge color={user.totp_enabled ? 'green' : 'red'}>
                {user.totp_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-700">KYC Verification</div>
                  <div className="text-xs text-slate-400">Identity verification for withdrawals</div>
                </div>
              </div>
              <Badge color={user.kyc_status === 'approved' ? 'green' : user.kyc_status === 'pending' ? 'amber' : 'slate'}>
                {user.kyc_status || 'Not started'}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Account Info */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Account Details
            </h3>
            <div className="flex flex-col gap-2">
              <InfoRow label="Member ID" value={`#${String(user.id).padStart(6, '0')}`} />
              <InfoRow label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
              <InfoRow label="Sponsor" value={user.sponsor_id ? `#${String(user.sponsor_id).padStart(6, '0')}` : 'Master Affiliate'} />
              <InfoRow label="Network Size" value={user.total_team || 0} />
              <InfoRow label="Personal Referrals" value={user.personal_referrals || 0} />
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}
