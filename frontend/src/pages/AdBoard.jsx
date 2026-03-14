import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge, PageLoading, EmptyState, Button } from '../components/ui';
import { apiGet } from '../utils/api';
import { ExternalLink, Search } from 'lucide-react';

const CATEGORIES = ['all', 'business', 'marketing', 'crypto', 'health', 'education', 'services', 'other'];

export default function AdBoard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet('/api/ad-board').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Ad Board"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="Ad Board"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  const ads = (data.ads || []).filter(a => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout title="Ad Board" subtitle="Community marketplace — post and discover ads">
      {/* Search + Filters */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ads..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border
                ${filter === cat ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Ads Grid */}
      {ads.length === 0 ? (
        <EmptyState icon="📢" title={data.ads?.length === 0 ? 'No ads posted yet' : 'No ads match your search'}
          description="The Ad Board is a community marketplace where members can post and discover ads." />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {ads.map(a => (
            <Card key={a.id}>
              <CardBody className="text-center">
                <div className="text-3xl mb-2">{a.icon}</div>
                <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{a.title}</h3>
                <p className="text-[11px] text-slate-400 mb-3 line-clamp-3 leading-relaxed">{a.description}</p>
                <Badge color="slate" className="mb-3">{a.category}</Badge>
                {a.link_url && (
                  <a href={a.link_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-cyan hover:text-cyan-dark no-underline transition-all">
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
