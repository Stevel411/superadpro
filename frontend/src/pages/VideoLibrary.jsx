import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Badge, Button, PageLoading, EmptyState } from '../components/ui';
import { apiGet } from '../utils/api';
import { Film, Eye, TrendingUp, Plus, Play, BarChart3 } from 'lucide-react';

export default function VideoLibrary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/video-library').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="My Campaigns"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="My Campaigns"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  return (
    <AppLayout title="My Campaigns" subtitle="Manage your video advertising campaigns"
      topbarActions={<a href="/upload-video"><Button size="sm"><Plus className="w-3.5 h-3.5" /> Upload Video</Button></a>}>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Film className="w-5 h-5 text-cyan" />} label="Total Campaigns"
          value={data.total_campaigns || 0} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<Eye className="w-5 h-5 text-emerald" />} label="Total Views"
          value={data.total_views || 0} className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-violet" />} label="Active Now"
          value={data.active_campaigns || 0} className="[--icon-bg:#ede9fe]" />
      </div>

      {(!data.campaigns || data.campaigns.length === 0) ? (
        <EmptyState icon="🎬" title="No campaigns yet"
          description="Upload a video to start your first campaign and get views from the SuperAdPro community."
          action={<a href="/upload-video"><Button>Upload Your First Video</Button></a>} />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {data.campaigns.map(c => (
            <Card key={c.id}>
              <div className="aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden">
                {c.embed_url ? (
                  <iframe src={c.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen />
                ) : (
                  <Play className="w-10 h-10 text-white/40" />
                )}
                <Badge color={c.status === 'active' ? 'green' : 'slate'} className="absolute top-3 right-3">
                  {c.status}
                </Badge>
              </div>
              <CardBody>
                <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{c.title}</h3>
                <div className="text-xs text-slate-400 mb-3">{c.platform} · {c.category || 'General'}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800">{c.views_delivered || 0}</span>
                    <span className="text-slate-400">/ {c.views_target || 0}</span>
                  </div>
                  <div className="h-1.5 flex-1 mx-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan rounded-full transition-all"
                      style={{ width: `${c.views_target ? Math.min(100, (c.views_delivered / c.views_target) * 100) : 0}%` }} />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
