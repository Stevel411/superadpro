import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Button, PageLoading } from '../components/ui';
import { apiGet } from '../utils/api';
import { LayoutGrid, Eye, MousePointer, ExternalLink, PenLine } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LinkHubPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/linkhub-stats').then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="LinkHub"><PageLoading /></AppLayout>;

  return (
    <AppLayout title="LinkHub" subtitle={`superadpro.com/l/${user?.username}`}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Eye className="w-5 h-5 text-cyan" />} label="Total Views"
          value={stats?.views || 0} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<MousePointer className="w-5 h-5 text-emerald" />} label="Total Clicks"
          value={stats?.clicks || 0} className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<LayoutGrid className="w-5 h-5 text-violet" />} label="Active Links"
          value={stats?.links || 0} className="[--icon-bg:#ede9fe]" />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardBody className="text-center py-8">
            <PenLine className="w-10 h-10 text-cyan mx-auto mb-4" />
            <h3 className="font-display text-lg font-extrabold text-slate-800 mb-2">Edit Your LinkHub</h3>
            <p className="text-sm text-slate-500 mb-5">Customise your profile, links, colours, and social icons with the visual editor.</p>
            <a href="/linkhub" className="no-underline">
              <Button size="md"><PenLine className="w-4 h-4" /> Open Editor</Button>
            </a>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-8">
            <ExternalLink className="w-10 h-10 text-emerald mx-auto mb-4" />
            <h3 className="font-display text-lg font-extrabold text-slate-800 mb-2">View Your Page</h3>
            <p className="text-sm text-slate-500 mb-5">See what your LinkHub looks like to visitors. Share this link everywhere.</p>
            <a href={`/l/${user?.username}`} target="_blank" rel="noopener noreferrer" className="no-underline">
              <Button variant="secondary" size="md"><ExternalLink className="w-4 h-4" /> View Live Page</Button>
            </a>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
