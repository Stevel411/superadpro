import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5', GREEN = '#22c26b';

const inp = { width: '100%', padding: '9px 11px', border: '1.5px solid #b3c4e0', borderRadius: 8, fontSize: 13, color: '#0d1230', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' };
const lbl = { fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4, marginTop: 10 };
const btn = { background: NAVY, color: '#fff', border: 0, borderRadius: 9, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
const card = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, marginBottom: 16 };

function qs(obj) {
  return Object.entries(obj).filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
}

export default function AcademyAdmin() {
  const [courses, setCourses] = useState([]);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [lessonsByCourse, setLessons] = useState({});
  const [nc, setNc] = useState({ slug: '', title: '', category: 'Getting Started', level: 'Beginner', cover_color: '#0a1f52', cover_color2: '#12388f', description: '' });
  const [nl, setNl] = useState({ url: '', title: '', takeaway: '', source: '', module: 'Lessons', module_order: 0 });

  const loadCourses = () => apiGet('/api/al/academy').then(d => setCourses(d.courses || [])).catch(() => {});
  useEffect(() => { loadCourses(); }, []);

  async function addCourse() {
    setMsg('Adding course…');
    try {
      const r = await apiGet('/admin/api/al/academy/add-course?' + qs(nc));
      setMsg(r.created ? '✓ Course added: ' + r.slug : ('⚠ ' + JSON.stringify(r)));
      if (r.created) { setNc({ ...nc, slug: '', title: '', description: '' }); loadCourses(); }
    } catch (e) { setMsg('⚠ ' + (e.message || 'failed')); }
  }

  async function loadLessons(slug) {
    if (expanded === slug) { setExpanded(null); return; }
    setExpanded(slug);
    try { const d = await apiGet('/api/al/academy/course/' + slug); setLessons({ ...lessonsByCourse, [slug]: d.modules || [] }); } catch (e) {}
  }

  async function addLesson(slug) {
    setMsg('Adding lesson…');
    try {
      const r = await apiGet('/admin/api/al/academy/add-lesson?' + qs({ course_slug: slug, ...nl }));
      setMsg(r.created ? '✓ Lesson added' : ('⚠ ' + JSON.stringify(r)));
      if (r.created) { setNl({ ...nl, url: '', title: '', takeaway: '' }); const d = await apiGet('/api/al/academy/course/' + slug); setLessons({ ...lessonsByCourse, [slug]: d.modules || [] }); loadCourses(); }
    } catch (e) { setMsg('⚠ ' + (e.message || 'failed')); }
  }

  async function health() {
    setMsg('Checking all videos…');
    try { const r = await apiGet('/admin/api/al/academy/verify-videos'); setMsg('Health: ' + r.ok + ' ok · broken: ' + JSON.stringify(r.broken)); } catch (e) { setMsg('⚠ ' + (e.message || 'failed')); }
  }

  return (
    <AlShell>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 4px 50px', fontFamily: 'Inter,system-ui,sans-serif', color: '#0d1230' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: NAVY, letterSpacing: '-.5px', margin: '4px 0 2px' }}>Academy Admin</h1>
        <p style={{ color: MUTED, fontSize: 13, fontWeight: 500, margin: '0 0 6px' }}>Add courses and lessons — paste a YouTube URL and it builds the embed. Videos are checked, so if one won't embed you'll see it in the health check.</p>
        <button style={{ ...btn, background: GREEN }} onClick={health}>Health-check all videos</button>
        {msg ? <div style={{ marginTop: 12, padding: '10px 12px', background: '#f6f8fd', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12.5, color: NAVY, fontWeight: 600, wordBreak: 'break-word' }}>{msg}</div> : null}

        <div style={{ ...card, marginTop: 18 }}>
          <b style={{ fontSize: 15, color: NAVY }}>➕ New course</b>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Title</label><input style={inp} value={nc.title} onChange={e => setNc({ ...nc, title: e.target.value })} placeholder="e.g. TikTok Traffic" /></div>
            <div><label style={lbl}>Slug (url)</label><input style={inp} value={nc.slug} onChange={e => setNc({ ...nc, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="tiktok-traffic" /></div>
            <div><label style={lbl}>Category</label><input style={inp} value={nc.category} onChange={e => setNc({ ...nc, category: e.target.value })} /></div>
            <div><label style={lbl}>Level</label><input style={inp} value={nc.level} onChange={e => setNc({ ...nc, level: e.target.value })} /></div>
            <div><label style={lbl}>Cover colour</label><input style={inp} type="text" value={nc.cover_color} onChange={e => setNc({ ...nc, cover_color: e.target.value })} /></div>
            <div><label style={lbl}>Cover colour 2</label><input style={inp} type="text" value={nc.cover_color2} onChange={e => setNc({ ...nc, cover_color2: e.target.value })} /></div>
          </div>
          <label style={lbl}>Description</label><input style={inp} value={nc.description} onChange={e => setNc({ ...nc, description: e.target.value })} />
          <button style={{ ...btn, marginTop: 12 }} onClick={addCourse}>Add course</button>
        </div>

        <b style={{ fontSize: 15, color: NAVY }}>Courses ({courses.length})</b>
        {courses.map(c => (
          <div key={c.slug} style={{ ...card, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => loadLessons(c.slug)}>
              <div><b style={{ color: NAVY, fontSize: 15 }}>{c.title}</b> <span style={{ color: MUTED, fontSize: 12 }}>· {c.category} · {c.lessons} lessons</span></div>
              <span style={{ color: RED, fontWeight: 800, fontSize: 13 }}>{expanded === c.slug ? 'Close' : 'Add lessons'}</span>
            </div>
            {expanded === c.slug ? (
              <div style={{ marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                {(lessonsByCourse[c.slug] || []).map((m, mi) => (
                  <div key={mi} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: NAVY, textTransform: 'uppercase' }}>{m.title}</div>
                    {m.lessons.map(l => <div key={l.id} style={{ fontSize: 12.5, color: MUTED, padding: '3px 0' }}>• {l.title} <span style={{ color: '#8a97b8' }}>({l.source_creator})</span></div>)}
                  </div>
                ))}
                <div style={{ background: '#f6f8fd', borderRadius: 10, padding: 12, marginTop: 8 }}>
                  <b style={{ fontSize: 13, color: NAVY }}>➕ Add a lesson</b>
                  <label style={lbl}>YouTube URL</label><input style={inp} value={nl.url} onChange={e => setNl({ ...nl, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={lbl}>Lesson title</label><input style={inp} value={nl.title} onChange={e => setNl({ ...nl, title: e.target.value })} /></div>
                    <div><label style={lbl}>Source / creator</label><input style={inp} value={nl.source} onChange={e => setNl({ ...nl, source: e.target.value })} /></div>
                    <div><label style={lbl}>Takeaway (one line)</label><input style={inp} value={nl.takeaway} onChange={e => setNl({ ...nl, takeaway: e.target.value })} /></div>
                    <div><label style={lbl}>Module</label><input style={inp} value={nl.module} onChange={e => setNl({ ...nl, module: e.target.value })} /></div>
                  </div>
                  <button style={{ ...btn, marginTop: 12 }} onClick={() => addLesson(c.slug)}>Add lesson to {c.title}</button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </AlShell>
  );
}
