import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Button, Badge, PageLoading, EmptyState } from '../components/ui';
import { apiGet, apiPost } from '../utils/api';
import { Eye, Play, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Watch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(null);

  useEffect(() => {
    apiGet('/api/watch').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const startWatch = async (videoId) => {
    setWatching(videoId);
  };

  const completeWatch = async (videoId) => {
    try {
      await apiPost('/api/watch/complete', { video_id: videoId });
      setWatching(null);
      const d = await apiGet('/api/watch');
      setData(d);
    } catch (e) { alert(e.message); setWatching(null); }
  };

  if (loading) return <AppLayout title="Watch to Earn"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Watch to Earn"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  return (
    <AppLayout title="Watch to Earn" subtitle="Watch videos and earn rewards">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Eye className="w-5 h-5 text-cyan" />} label="Videos Watched Today"
          value={`${data.watched_today || 0} / ${data.daily_limit || 10}`} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-emerald" />} label="Earned Today"
          value={`$${(data.earned_today || 0).toFixed(2)}`} valueColor="text-emerald" className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<Clock className="w-5 h-5 text-violet" />} label="Total Watch Time"
          value={`${data.total_minutes || 0} min`} className="[--icon-bg:#ede9fe]" />
        <StatCard icon={<CheckCircle className="w-5 h-5 text-amber" />} label="All-Time Earnings"
          value={`$${(data.total_watch_earnings || 0).toFixed(2)}`} className="[--icon-bg:#fef3c7]" />
      </div>

      {data.quota_reached && (
        <Card hover={false} className="mb-5 bg-amber/5 border-amber/20">
          <CardBody className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber">Daily limit reached</div>
              <div className="text-xs text-slate-500">You've watched your maximum videos for today. Come back tomorrow!</div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Video Grid */}
      {(!data.videos || data.videos.length === 0) ? (
        <EmptyState icon="🎬" title="No videos available right now" description="Check back soon — new videos are added regularly." />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {data.videos.map(v => (
            <Card key={v.id} className="overflow-hidden">
              <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
                {watching === v.id ? (
                  <iframe src={v.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Play className="w-14 h-14 text-white/80" />
                  </>
                )}
                {v.is_watched && (
                  <Badge color="green" className="absolute top-3 right-3">Watched ✓</Badge>
                )}
              </div>
              <CardBody>
                <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{v.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span>{v.platform || 'Video'}</span>
                  <span>·</span>
                  <span>{v.category || 'General'}</span>
                </div>
                {v.is_watched ? (
                  <Badge color="green" className="w-full justify-center py-1.5">Completed</Badge>
                ) : watching === v.id ? (
                  <Button onClick={() => completeWatch(v.id)} variant="primary" size="sm" className="w-full">
                    Mark as Watched
                  </Button>
                ) : (
                  <Button onClick={() => startWatch(v.id)} variant="secondary" size="sm" className="w-full"
                    disabled={data.quota_reached}>
                    <Play className="w-3.5 h-3.5" /> Watch Now
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
