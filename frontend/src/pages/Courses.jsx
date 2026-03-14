import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Badge, PageLoading, EmptyState, Button } from '../components/ui';
import { apiGet } from '../utils/api';
import { GraduationCap, Clock, BookOpen, Play } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/courses').then(d => { setCourses(d.courses || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Course Library"><PageLoading /></AppLayout>;

  return (
    <AppLayout title="Course Library" subtitle="Learn skills that earn you commissions">
      {courses.length === 0 ? (
        <EmptyState icon="🎓" title="No courses available yet"
          description="Courses will appear here as they are added to the platform."
          action={<Link to="/courses/create"><Button>Create a Course</Button></Link>} />
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {courses.map(c => (
            <Link key={c.id} to={`/courses/${c.id}`} className="no-underline">
              <Card className="h-full flex flex-col">
                <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center relative">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-10 h-10 text-slate-300" />
                  )}
                  <Badge color="cyan" className="absolute top-3 left-3">{c.category || 'Course'}</Badge>
                </div>
                <CardBody className="flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-slate-800 mb-1 line-clamp-2">{c.title}</h3>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2 flex-1">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{c.chapter_count || 0} chapters</span>
                    <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5" />{c.lesson_count || 0} lessons</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.total_duration || 0}m</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-display text-lg font-black text-emerald">${c.price}</span>
                    <Badge color="green">100% commission</Badge>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
