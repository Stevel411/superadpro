import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Badge, Button, PageLoading, EmptyState } from '../components/ui';
import { apiGet, apiDelete } from '../utils/api';
import { Package, DollarSign, ShoppingCart, BookOpen, PenLine, Trash2, Eye } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'slate', pending_review: 'amber', ai_rejected: 'red',
  approved: 'green', published: 'green', suspended: 'red',
};

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/marketplace/my-courses').then(d => { setCourses(d.courses || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try {
      await apiDelete(`/api/marketplace/courses/${id}`);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <AppLayout title="My Courses"><PageLoading /></AppLayout>;

  const totalRevenue = courses.reduce((s, c) => s + (c.total_revenue || 0), 0);
  const totalSales = courses.reduce((s, c) => s + (c.total_sales || 0), 0);
  const published = courses.filter(c => c.status === 'published').length;

  return (
    <AppLayout title="My Courses" subtitle="Create, manage, and track your course sales"
      topbarActions={<Link to="/courses/create"><Button size="sm">+ Create Course</Button></Link>}>

      {courses.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatCard icon={<Package className="w-5 h-5 text-cyan" />} label="Total Courses"
            value={courses.length} className="[--icon-bg:#e0f2fe]" />
          <StatCard icon={<BookOpen className="w-5 h-5 text-emerald" />} label="Published"
            value={published} className="[--icon-bg:#dcfce7]" />
          <StatCard icon={<DollarSign className="w-5 h-5 text-emerald" />} label="Total Revenue"
            value={`$${Math.round(totalRevenue)}`} valueColor="text-emerald" className="[--icon-bg:#dcfce7]" />
          <StatCard icon={<ShoppingCart className="w-5 h-5 text-violet" />} label="Total Sales"
            value={totalSales} className="[--icon-bg:#ede9fe]" />
        </div>
      )}

      {courses.length === 0 ? (
        <EmptyState icon="🎓" title="No courses yet"
          description="Create your first course and start earning 50% of every sale on the marketplace."
          action={<Link to="/courses/create"><Button>Create Your First Course</Button></Link>} />
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {courses.map(c => (
            <Card key={c.id} className="flex flex-col">
              <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center relative overflow-hidden">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🎓</span>
                )}
                <Badge color={STATUS_COLORS[c.status] || 'slate'} className="absolute top-3 right-3">
                  {(c.status || 'draft').replace('_', ' ')}
                </Badge>
              </div>
              <CardBody className="flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{c.title}</h3>
                <div className="text-xs text-slate-400 mb-3">
                  {c.lesson_count || 0} lessons · {c.total_duration_mins || 0} min · {c.category || 'Other'}
                </div>
                <div className="font-display text-lg font-black text-emerald mb-3">${Math.round(c.price)}</div>
                <div className="flex gap-2 mt-auto">
                  <Link to={`/courses/edit/${c.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full"><PenLine className="w-3.5 h-3.5" /> Edit</Button>
                  </Link>
                  {c.status === 'published' && (
                    <Link to={`/marketplace/${c.slug}`}>
                      <Button variant="ghost" size="sm"><Eye className="w-3.5 h-3.5" /></Button>
                    </Link>
                  )}
                  <Button variant="danger" size="sm" onClick={() => deleteCourse(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
