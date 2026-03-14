import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge, PageLoading, EmptyState, Button } from '../components/ui';
import { apiGet } from '../utils/api';
import { Store, BookOpen, Clock, User, Search } from 'lucide-react';

const CATEGORIES = ['all', 'marketing', 'business', 'crypto', 'fitness', 'tech', 'lifestyle', 'creative'];

export default function Marketplace() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet('/api/marketplace/browse').then(d => { setCourses(d.courses || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    if (filter !== 'all' && c.category !== filter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <AppLayout title="Marketplace"><PageLoading /></AppLayout>;

  return (
    <AppLayout title="Course Marketplace" subtitle="Courses created by the SuperAdPro community">

      {/* Search + Filters */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border
                ${filter === cat
                  ? 'bg-cyan/10 text-cyan border-cyan/20'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon="🏪" title={courses.length === 0 ? 'Marketplace coming soon' : 'No courses match your filters'}
          description={courses.length === 0 ? 'Courses from the community will appear here once published.' : 'Try a different category or search term.'}
          action={<Link to="/courses/create"><Button>Create a Course</Button></Link>} />
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map(c => (
            <Card key={c.id} className="flex flex-col">
              <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center relative overflow-hidden">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-10 h-10 text-slate-300" />
                )}
                <Badge color="cyan" className="absolute top-3 left-3">{c.category || 'Other'}</Badge>
              </div>
              <CardBody className="flex-1 flex flex-col">
                <h3 className="text-base font-bold text-slate-800 mb-1 line-clamp-2">{c.title}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2 flex-1">{c.short_description || c.description || ''}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{c.lesson_count || 0} lessons</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.total_duration_mins || 0}m</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{c.creator_name || 'Member'}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="font-display text-xl font-black text-emerald">${Math.round(c.price)}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-emerald/10 text-emerald font-bold">50%</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan/10 text-cyan font-bold">25%</span>
                    <span className="px-1.5 py-0.5 rounded bg-violet/10 text-violet font-bold">25%</span>
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
