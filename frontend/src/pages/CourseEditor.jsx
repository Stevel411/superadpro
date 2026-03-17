import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Plus, Trash2, ChevronDown, ChevronRight, Save, Send, BookOpen, Video, FileText, Eye, EyeOff, Clock, GripVertical } from 'lucide-react';
import RichTextEditor from '../components/editor/RichTextEditor';

export default function CourseEditor() {
  var params = useParams();
  var courseId = params.id;
  var [course, setCourse] = useState(null);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [submitResult, setSubmitResult] = useState(null);
  var [toast, setToast] = useState(null);
  var [openChapter, setOpenChapter] = useState(null);
  var [editingLesson, setEditingLesson] = useState(null);

  function showToast(msg, type) { setToast({msg,type}); setTimeout(function(){setToast(null);},3000); }

  function loadCourse() {
    apiGet('/api/marketplace/courses/' + courseId).then(function(d) {
      setCourse(d);
      setLoading(false);
      if (d.chapters && d.chapters.length > 0 && openChapter === null) setOpenChapter(d.chapters[0].id);
    }).catch(function() { setLoading(false); });
  }
  useEffect(loadCourse, [courseId]);

  // Chapter CRUD
  function addChapter() {
    setSaving('chapter');
    apiPost('/api/marketplace/courses/' + courseId + '/chapters', {title:'New Chapter'}).then(function() { loadCourse(); setSaving(''); }).catch(function() { setSaving(''); });
  }
  function updateChapter(chId, title) {
    apiPut('/api/marketplace/chapters/' + chId, {title:title});
  }
  function deleteChapter(chId) {
    if (!confirm('Delete this chapter and all its lessons?')) return;
    apiDelete('/api/marketplace/chapters/' + chId).then(loadCourse);
  }

  // Lesson CRUD
  function addLesson(chId) {
    setSaving('lesson');
    apiPost('/api/marketplace/chapters/' + chId + '/lessons', {title:'New Lesson',content_type:'text'}).then(function() { loadCourse(); setSaving(''); }).catch(function() { setSaving(''); });
  }
  function updateLesson(lessonId, data) {
    apiPut('/api/marketplace/lessons/' + lessonId, data).then(function() { showToast('Saved','ok'); }).catch(function(e) { showToast(e.message||'Failed','err'); });
  }
  function deleteLesson(lessonId) {
    if (!confirm('Delete this lesson?')) return;
    apiDelete('/api/marketplace/lessons/' + lessonId).then(loadCourse);
  }

  // Submit for review
  function submitForReview() {
    setSubmitting(true);
    setSubmitResult(null);
    apiPost('/api/marketplace/courses/' + courseId + '/submit', {}).then(function(r) {
      setSubmitting(false);
      if (r.ok || r.success) { showToast('Submitted for review!','ok'); loadCourse(); }
      else { setSubmitResult({error:r.error,issues:r.issues||[]}); }
    }).catch(function(e) {
      setSubmitting(false);
      try { var d = JSON.parse(e.message); setSubmitResult({error:d.error||e.message,issues:d.issues||[]}); }
      catch(x) { setSubmitResult({error:e.message,issues:[]}); }
    });
  }

  if (loading) return <AppLayout title="Course Editor"><Spin/></AppLayout>;
  if (!course) return <AppLayout title="Course Editor"><div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>Course not found</div></AppLayout>;

  var totalLessons = 0;
  var totalDuration = 0;
  (course.chapters||[]).forEach(function(ch) { (ch.lessons||[]).forEach(function(l) { totalLessons++; totalDuration += l.duration_minutes||0; }); });

  return (
    <AppLayout title={course.title} subtitle={'$' + course.price + ' · ' + course.status}>
      <Link to="/marketplace" style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'#94a3b8',textDecoration:'none',marginBottom:14}}>← Back to SuperMarket</Link>

      {toast && <div style={{padding:'8px 14px',borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700,background:toast.type==='ok'?'#dcfce7':'#fef2f2',color:toast.type==='ok'?'#16a34a':'#dc2626'}}>{toast.msg}</div>}

      {/* Stats bar */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[
          {label:'Status',value:course.status,color:course.status==='published'?'#16a34a':course.status==='pending_review'?'#f59e0b':'#94a3b8'},
          {label:'Chapters',value:(course.chapters||[]).length,color:'#0ea5e9'},
          {label:'Lessons',value:totalLessons,color:'#8b5cf6'},
          {label:'Duration',value:totalDuration+'min',color:'#f59e0b'},
          {label:'Sales',value:course.total_sales||0,color:'#16a34a'},
        ].map(function(s,i) {
          return (
            <div key={i} style={{flex:1,background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
        {/* LEFT — Chapters & Lessons */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>Chapters & Lessons</h3>
            <button onClick={addChapter} disabled={saving==='chapter'}
              style={{display:'flex',alignItems:'center',gap:4,padding:'8px 16px',borderRadius:8,border:'none',background:'#8b5cf6',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              <Plus size={14}/> Add Chapter
            </button>
          </div>

          {(course.chapters||[]).length === 0 ? (
            <div style={{textAlign:'center',padding:'50px 20px',background:'#fff',borderRadius:12,border:'1px solid #e8ecf2'}}>
              <div style={{fontSize:36,marginBottom:8,opacity:.3}}>📚</div>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No chapters yet</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Click "Add Chapter" to start building your course</div>
            </div>
          ) : (course.chapters||[]).map(function(ch) {
            var isOpen = openChapter === ch.id;
            return (
              <div key={ch.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,marginBottom:10,overflow:'hidden'}}>
                {/* Chapter header */}
                <div onClick={function(){setOpenChapter(isOpen?null:ch.id);}}
                  style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',cursor:'pointer',background:isOpen?'#f8f9fb':'#fff'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {isOpen ? <ChevronDown size={14} color="#64748b"/> : <ChevronRight size={14} color="#64748b"/>}
                    <input value={ch.title} onClick={function(e){e.stopPropagation();}}
                      onChange={function(e){
                        var val=e.target.value;
                        setCourse(function(prev){return Object.assign({},prev,{chapters:prev.chapters.map(function(c){return c.id===ch.id?Object.assign({},c,{title:val}):c;})});});
                      }}
                      onBlur={function(e){updateChapter(ch.id,e.target.value);}}
                      style={{fontSize:14,fontWeight:700,color:'#0f172a',border:'none',background:'transparent',outline:'none',fontFamily:'inherit',width:300}}/>
                    <span style={{fontSize:10,color:'#94a3b8'}}>{(ch.lessons||[]).length} lessons</span>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={function(e){e.stopPropagation();addLesson(ch.id);}} style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#8b5cf6',cursor:'pointer',fontFamily:'inherit'}}>+ Lesson</button>
                    <button onClick={function(e){e.stopPropagation();deleteChapter(ch.id);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={14}/></button>
                  </div>
                </div>

                {/* Lessons */}
                {isOpen && (
                  <div style={{borderTop:'1px solid #e8ecf2'}}>
                    {(ch.lessons||[]).length === 0 ? (
                      <div style={{padding:'20px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No lessons yet. Click "+ Lesson" to add one.</div>
                    ) : (ch.lessons||[]).map(function(lesson) {
                      var isEditing = editingLesson === lesson.id;
                      return (
                        <div key={lesson.id} style={{borderBottom:'1px solid #f5f6f8'}}>
                          {/* Lesson row */}
                          <div onClick={function(){setEditingLesson(isEditing?null:lesson.id);}}
                            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px 10px 36px',cursor:'pointer',background:isEditing?'rgba(139,92,246,.02)':'transparent'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              {lesson.content_type==='video' ? <Video size={14} color="#0ea5e9"/> : <FileText size={14} color="#8b5cf6"/>}
                              <span style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{lesson.title}</span>
                              {lesson.is_preview && <span style={{fontSize:8,fontWeight:700,padding:'2px 5px',borderRadius:3,background:'#dcfce7',color:'#16a34a'}}>PREVIEW</span>}
                              {lesson.duration_minutes > 0 && <span style={{fontSize:10,color:'#94a3b8'}}>{lesson.duration_minutes}min</span>}
                            </div>
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={function(e){e.stopPropagation();deleteLesson(lesson.id);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={12}/></button>
                            </div>
                          </div>

                          {/* Lesson editor */}
                          {isEditing && <LessonEditor lesson={lesson} onSave={function(data){updateLesson(lesson.id,data);}} onReload={loadCourse}/>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT — Actions & Submit */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Submit card */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,overflow:'hidden'}}>
            <div style={{background:'#1c223d',padding:'14px 18px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Publish Your Course</div>
            </div>
            <div style={{padding:'16px 18px'}}>
              <div style={{fontSize:12,color:'#475569',lineHeight:1.7,marginBottom:14}}>
                When ready, submit for review. Your course will be scanned for quality and copyright, then reviewed by an admin.
              </div>

              {/* Requirements checklist */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Requirements</div>
                {[
                  {ok:totalLessons>=3,label:'At least 3 lessons'},
                  {ok:totalDuration>=10,label:'10+ minutes total duration'},
                  {ok:(course.chapters||[]).some(function(ch){return (ch.lessons||[]).some(function(l){return l.is_preview;});}),label:'At least 1 free preview lesson'},
                  {ok:!!(course.thumbnail_url),label:'Banner image uploaded'},
                  {ok:(course.description||'').length>=100,label:'Description 100+ characters'},
                ].map(function(r,i) {
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0'}}>
                      <div style={{width:16,height:16,borderRadius:'50%',background:r.ok?'#dcfce7':'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:r.ok?'#16a34a':'#dc2626'}}>{r.ok?'✓':'✗'}</div>
                      <span style={{fontSize:11,color:r.ok?'#16a34a':'#94a3b8',fontWeight:r.ok?600:400}}>{r.label}</span>
                    </div>
                  );
                })}
              </div>

              {submitResult && (
                <div style={{padding:'10px 12px',borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#dc2626',marginBottom:4}}>{submitResult.error}</div>
                  {submitResult.issues.map(function(iss,i){return <div key={i} style={{fontSize:10,color:'#dc2626'}}>• {iss}</div>;})}
                </div>
              )}

              {course.status === 'published' ? (
                <div style={{textAlign:'center',padding:'10px',fontSize:13,fontWeight:700,color:'#16a34a'}}>✅ Published & Live</div>
              ) : course.status === 'pending_review' ? (
                <div style={{textAlign:'center',padding:'10px',fontSize:13,fontWeight:700,color:'#f59e0b'}}>⏳ Under Review</div>
              ) : (
                <button onClick={submitForReview} disabled={submitting}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'12px',borderRadius:10,border:'none',
                    cursor:submitting?'default':'pointer',fontSize:13,fontWeight:800,fontFamily:'inherit',
                    background:submitting?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',
                    boxShadow:submitting?'none':'0 4px 14px rgba(22,163,74,.3)'}}>
                  <Send size={14}/> {submitting?'Scanning...':'Submit for Review'}
                </button>
              )}
            </div>
          </div>

          {/* Commission reminder */}
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#16a34a',marginBottom:4}}>💰 100% Commissions</div>
            <div style={{fontSize:11,color:'#475569',lineHeight:1.6}}>
              You earn ${course.price} on every kept sale. No platform fees.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function LessonEditor({ lesson, onSave, onReload }) {
  var [title, setTitle] = useState(lesson.title);
  var [contentType, setContentType] = useState(lesson.content_type||'text');
  var [videoUrl, setVideoUrl] = useState(lesson.video_url||'');
  var [textContent, setTextContent] = useState(lesson.text_content||'');
  var [pdfUrl, setPdfUrl] = useState(lesson.pdf_url||'');
  var [duration, setDuration] = useState(lesson.duration_minutes||0);
  var [isPreview, setIsPreview] = useState(lesson.is_preview||false);
  var [saved, setSaved] = useState(false);

  function save() {
    onSave({title:title,content_type:contentType,video_url:videoUrl,text_content:textContent,pdf_url:pdfUrl,duration_minutes:parseInt(duration)||0,is_preview:isPreview});
    setSaved(true); setTimeout(function(){setSaved(false);},2000);
    onReload();
  }

  return (
    <div style={{padding:'18px 20px 18px 36px',background:'#f8f9fb',borderTop:'1px solid #e8ecf2'}}>
      {/* Row 1: Title + Type + Duration */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,marginBottom:14}}>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Lesson Title</label>
          <input value={title} onChange={function(e){setTitle(e.target.value);}} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}/>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Content Type</label>
          <select value={contentType} onChange={function(e){setContentType(e.target.value);}} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff'}}>
            <option value="text">Rich Text</option>
            <option value="video">Video + Text</option>
            <option value="pdf">PDF + Text</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Duration (min)</label>
          <input type="number" min="0" value={duration} onChange={function(e){setDuration(e.target.value);}} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}/>
        </div>
      </div>

      {/* Video URL */}
      {(contentType === 'video') && (
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Video URL (YouTube, Vimeo, Loom, etc.)</label>
          <input value={videoUrl} onChange={function(e){setVideoUrl(e.target.value);}} placeholder="https://youtube.com/watch?v=..."
            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}/>
          {videoUrl && videoUrl.includes('youtu') && (
            <div style={{marginTop:8,borderRadius:8,overflow:'hidden',aspectRatio:'16/9',maxWidth:400}}>
              <iframe src={'https://www.youtube.com/embed/' + (videoUrl.split('v=')[1]||videoUrl.split('/').pop()||'').split('&')[0]}
                style={{width:'100%',height:'100%',border:'none'}} allowFullScreen/>
            </div>
          )}
        </div>
      )}

      {/* PDF URL */}
      {(contentType === 'pdf') && (
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>PDF URL or Upload</label>
          <div style={{display:'flex',gap:6}}>
            <label style={{display:'flex',alignItems:'center',gap:4,padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'#64748b',whiteSpace:'nowrap'}}>
              📁 Upload PDF
              <input type="file" accept=".pdf" onChange={function(e){
                var file=e.target.files[0]; if(!file) return;
                var reader=new FileReader();
                reader.onload=function(ev){setPdfUrl(ev.target.result);};
                reader.readAsDataURL(file);
              }} style={{display:'none'}}/>
            </label>
            <input value={pdfUrl} onChange={function(e){setPdfUrl(e.target.value);}} placeholder="or paste PDF URL..."
              style={{flex:1,padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:11,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}/>
          </div>
        </div>
      )}

      {/* Rich Text Content */}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>
          {contentType === 'video' ? 'Lesson Notes & Supplementary Content' : contentType === 'pdf' ? 'Description & Context' : 'Lesson Content'}
        </label>
        <RichTextEditor content={textContent} onChange={function(html){setTextContent(html);}} placeholder="Write your lesson content here... Use the toolbar for formatting, images, and links."/>
      </div>

      {/* Bottom bar: preview toggle + save */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,fontWeight:600,color:isPreview?'#16a34a':'#94a3b8',padding:'6px 12px',borderRadius:8,border:isPreview?'1px solid #bbf7d0':'1px solid #e2e8f0',background:isPreview?'#f0fdf4':'transparent'}}>
          <input type="checkbox" checked={isPreview} onChange={function(){setIsPreview(!isPreview);}} style={{accentColor:'#16a34a'}}/>
          {isPreview ? <Eye size={13}/> : <EyeOff size={13}/>}
          {isPreview ? 'Free Preview — visible to everyone' : 'Premium — requires purchase'}
        </label>
        <button onClick={save}
          style={{display:'flex',alignItems:'center',gap:5,padding:'10px 24px',borderRadius:8,border:'none',
            background:saved?'#16a34a':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
            boxShadow:'0 2px 10px rgba(139,92,246,.2)',transition:'all .2s'}}>
          <Save size={13}/> {saved ? '✓ Saved!' : 'Save Lesson'}
        </button>
      </div>
    </div>
  );
}

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
