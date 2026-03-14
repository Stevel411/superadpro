import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, PageLoading } from '../components/ui';
import { apiGet } from '../utils/api';
import { Award, Lock } from 'lucide-react';

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/achievements').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Achievements"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Achievements"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  const earned = data.earned || [];
  const available = data.available || [];

  return (
    <AppLayout title="Achievements" subtitle={`${earned.length} of ${earned.length + available.length} unlocked`}>
      {/* Earned */}
      {earned.length > 0 && (
        <>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Unlocked</h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {earned.map((a, i) => (
              <Card key={i} hover={false} className="ring-2 ring-amber/20">
                <CardBody className="text-center py-5">
                  <div className="text-3xl mb-2">{a.icon || '🏅'}</div>
                  <div className="text-sm font-bold text-slate-800 mb-0.5">{a.title}</div>
                  <div className="text-[11px] text-slate-400">{a.description}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Available */}
      {available.length > 0 && (
        <>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Locked</h3>
          <div className="grid grid-cols-4 gap-4">
            {available.map((a, i) => (
              <Card key={i} hover={false} className="opacity-50">
                <CardBody className="text-center py-5">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-600 mb-0.5">{a.title}</div>
                  <div className="text-[11px] text-slate-400">{a.description}</div>
                  {a.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan rounded-full" style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{a.progress} / {a.target}</div>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}
