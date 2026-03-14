import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Badge, Button, PageLoading, EmptyState } from '../components/ui';
import { apiGet, apiPost } from '../utils/api';
import { Link2, ExternalLink, Copy, Check, BarChart3, Shuffle } from 'lucide-react';

export default function LinkTools() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('links');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    apiGet('/api/link-tools').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <AppLayout title="Link Tools"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Link Tools"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  const links = data.short_links || [];
  const rotators = data.rotators || [];
  const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0) + rotators.reduce((s, r) => s + (r.click_count || 0), 0);

  return (
    <AppLayout title="Link Tools" subtitle="Short links, rotators, and click tracking">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Link2 className="w-5 h-5 text-cyan" />} label="Short Links"
          value={links.length} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<Shuffle className="w-5 h-5 text-violet" />} label="Rotators"
          value={rotators.length} className="[--icon-bg:#ede9fe]" />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-emerald" />} label="Total Clicks"
          value={totalClicks} className="[--icon-bg:#dcfce7]" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab('links')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all cursor-pointer border-none
            ${tab === 'links' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'}`}>
          Short Links ({links.length})
        </button>
        <button onClick={() => setTab('rotators')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all cursor-pointer border-none
            ${tab === 'rotators' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'}`}>
          Rotators ({rotators.length})
        </button>
      </div>

      {tab === 'links' && (
        <Card hover={false}>
          <CardBody className="p-0">
            {links.length === 0 ? (
              <EmptyState icon="🔗" title="No short links yet" description="Create short links to track clicks on your promotional URLs." />
            ) : (
              <div className="divide-y divide-slate-50">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-cyan truncate">superadpro.com/go/{l.short_code}</div>
                      <div className="text-xs text-slate-400 truncate">{l.destination_url}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">{l.click_count}</div>
                        <div className="text-[10px] text-slate-400">clicks</div>
                      </div>
                      <button onClick={() => copyLink(`https://superadpro.com/go/${l.short_code}`, l.id)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-cyan/10 flex items-center justify-center cursor-pointer border-none transition-all">
                        {copied === l.id ? <Check className="w-3.5 h-3.5 text-emerald" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'rotators' && (
        <Card hover={false}>
          <CardBody className="p-0">
            {rotators.length === 0 ? (
              <EmptyState icon="🔄" title="No rotators yet" description="Link rotators distribute traffic across multiple URLs." />
            ) : (
              <div className="divide-y divide-slate-50">
                {rotators.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{r.name}</div>
                      <div className="text-xs text-violet truncate">superadpro.com/r/{r.short_code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">{r.click_count}</div>
                      <div className="text-[10px] text-slate-400">total clicks</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </AppLayout>
  );
}
