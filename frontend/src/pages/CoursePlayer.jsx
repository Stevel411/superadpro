import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';

function getYouTubeId(url) {
  if (!url) return null;
  var match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

function getVimeoId(url) {
  if (!url) return null;
  var match = url.match(/vimeo\.com\/([0-9]+)/);
  return match ? match[1] : null;
}

function VideoPlayer({ url }) {
  var ytId = getYouTubeId(url);
  var vmId = getVimeoId(url);

  if (ytId) return (
    <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen/>
    </div>
  );

  if (vmId) return (
    <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <iframe src={`https://player.vimeo.com/video/${vmId}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen/>
    </div>
  );

  return (
    <div style={{ background: '#111', borderRadius: 12, padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
      <p>Video URL not supported. <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sap-accent-light)' }}>{t('courses.openDirectly')}</a></p>
    </div>
  );
}

export default function CoursePlayer() {
  var { t } = useTranslation();
  var { courseId } = useParams();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [activeLesson, setActiveLesson] = useState(null);
  var [completing, setCompleting] = useState(false);
  var navigate = useNavigate();

  useEffect(function() {
    apiGet('/api/courses/learn/' + courseId)
      .then(function(d) {
        if (d.error) { navigate('/courses'); return; }
        setData(d);
        // Auto-select first incomplete lesson
        var allLessons = [];
        (d.chapters || []).forEach(function(ch) { allLessons = allLessons.concat(ch.lessons || []); });
        allLessons = allLessons.concat(d.uncategorised || []);
        var first = allLessons.find(function(l) { return !l.completed; }) || allLessons[0];
        if (first) setActiveLesson(first);
        setLoading(false);
      })
      .catch(function() { navigate('/courses'); });
  }, [courseId]);

  function markComplete(lesson) {
    if (lesson.completed || completing) return;
    setCompleting(true);
    apiPost('/api/courses/learn/' + courseId + '/complete/' + lesson.id, {})
      .then(function() {
        setCompleting(false);
        setData(function(prev) {
          // Update completed state in data
          var updated = JSON.parse(JSON.stringify(prev));
          updated.completed_count = (updated.completed_count || 0) + 1;
          updated.chapters = (updated.chapters || []).map(function(ch) {
            return Object.assign({}, ch, { lessons: (ch.lessons || []).map(function(l) {
              return l.id === lesson.id ? Object.assign({}, l, { completed: true }) : l;
            })});
          });
          return updated;
        });
        setActiveLesson(function(prev) { return Object.assign({}, prev, { completed: true }); });
      })
      .catch(function() { setCompleting(false); });
  }

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--sap-text-faint)' }}>{t('courses.loadingCourse')}</div>
      </div>
    </AppLayout>
  );

  if (!data) return null;

  var allLessons = [];
  (data.chapters || []).forEach(function(ch) { allLessons = allLessons.concat(ch.lessons || []); });
  allLessons = allLessons.concat(data.uncategorised || []);
  var progress = data.total_lessons > 0 ? Math.round((data.completed_count / data.total_lessons) * 100) : 0;

  return (
    <AppLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, minHeight: 'calc(100vh - 72px)' }}>

        {/* Main content */}
        <div style={{ padding: 24, borderRight: '1px solid #e8ecf2' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--sap-text-faint)' }}>
            <Link to="/courses" style={{ color: 'var(--sap-accent)', textDecoration: 'none' }}>{t('courses.coursesNav')}</Link>
            <span>›</span>
            <span style={{ color: 'var(--sap-text-primary)', fontWeight: 600 }}>{data.course.title}</span>
          </div>

          {/* Video player */}
          {activeLesson ? (
            <>
              <VideoPlayer url={activeLesson.video_url}/>

              <div style={{ marginTop: 20 }}>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)', margin: '0 0 8px' }}>
                  {activeLesson.title}
                </h2>
                {activeLesson.duration_mins > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--sap-text-faint)' }}>⏱ {activeLesson.duration_mins} min</span>
                )}

                {/* Mark complete button */}
                <div style={{ marginTop: 20 }}>
                  {activeLesson.completed ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--sap-green-bg-mid)', borderRadius: 10, padding: '10px 18px' }}>
                      <span style={{ color: 'var(--sap-green)', fontWeight: 700, fontSize: 14 }}>{t('courses.completed')}</span>
                    </div>
                  ) : (
                    <button onClick={function(){markComplete(activeLesson);}} disabled={completing} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: completing ? 'var(--sap-text-faint)' : 'linear-gradient(135deg,#10b981,#34d399)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: completing ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                      {completing ? 'Saving...' : '✓ Mark as Complete'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--sap-text-faint)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
              <p>{t('courses.selectLesson')}</p>
            </div>
          )}
        </div>

        {/* Sidebar — lesson list */}
        <div style={{ background: 'var(--sap-bg-elevated)', overflowY: 'auto', maxHeight: 'calc(100vh - 72px)' }}>
          {/* Progress */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8ecf2', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6 }}>
              <span>{t('courses.courseProgress')}</span>
              <span style={{ color: 'var(--sap-green-mid)' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--sap-border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width .3s' }}/>
            </div>
            <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', marginTop: 4 }}>{data.completed_count} / {data.total_lessons} lessons</div>
          </div>

          {/* Chapters and lessons */}
          <div style={{ padding: '12px 0' }}>
            {(data.chapters || []).map(function(chapter) {
              return (
                <div key={chapter.id}>
                  <div style={{ padding: '10px 20px 6px', fontSize: 11, fontWeight: 800, color: 'var(--sap-text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {chapter.title}
                  </div>
                  {(chapter.lessons || []).map(function(lesson) {
                    var isActive = activeLesson && activeLesson.id === lesson.id;
                    return (
                      <button key={lesson.id} onClick={function(){setActiveLesson(lesson);}} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', border: 'none', background: isActive ? 'rgba(14,165,233,0.08)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderLeft: isActive ? '3px solid #0ea5e9' : '3px solid transparent' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: lesson.completed ? 'var(--sap-green-bg-mid)' : isActive ? 'rgba(14,165,233,0.15)' : 'var(--sap-border)', border: lesson.completed ? '2px solid #16a34a' : isActive ? '2px solid #0ea5e9' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                          {lesson.completed ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--sap-accent)' : 'var(--sap-text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lesson.title}
                          </div>
                          {lesson.duration_mins > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>{lesson.duration_mins}m</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Uncategorised lessons */}
            {(data.uncategorised || []).length > 0 && (
              <div>
                {(data.uncategorised || []).map(function(lesson) {
                  var isActive = activeLesson && activeLesson.id === lesson.id;
                  return (
                    <button key={lesson.id} onClick={function(){setActiveLesson(lesson);}} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', border: 'none', background: isActive ? 'rgba(14,165,233,0.08)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderLeft: isActive ? '3px solid #0ea5e9' : '3px solid transparent' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: lesson.completed ? 'var(--sap-green-bg-mid)' : 'var(--sap-border)', border: lesson.completed ? '2px solid #16a34a' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                        {lesson.completed ? '✓' : ''}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--sap-accent)' : 'var(--sap-text-primary)', lineHeight: 1.3 }}>
                        {lesson.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
