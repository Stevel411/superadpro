import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Plus, Trash2, ChevronDown, ChevronRight, Save, Send, Video, FileText, Eye, EyeOff, Clock, GripVertical, BookOpen, Upload, File, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Play, Download } from 'lucide-react';

export default function CourseEditor() {
  var { t } = useTranslation();
  var params = useParams();
  var courseId = params.id;
  var [course, setCourse] = useState(null);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [submitResult, setSubmitResult] = useState(null);
  var [toast, setToast] = useState(null);
  var [expandedSection, setExpandedSection] = useState(null);
  var [expandedLesson, setExpandedLesson] = useState(null);

  function showToast(msg,type){setToast({msg,type});setTimeout(function(){setToast(null);},3000);}

  function loadCourse(){
    apiGet('/api/marketplace/courses/'+courseId).then(function(d){
      setCourse(d);setLoading(false);
      if(d.chapters&&d.chapters.length>0&&expandedSection===null)setExpandedSection(d.chapters[0].id);
    }).catch(function(){setLoading(false);});
  }
  useEffect(loadCourse,[courseId]);

  function addSection(){
    setSaving('section');
    apiPost('/api/marketplace/courses/'+courseId+'/chapters',{title:'New Section'}).then(function(){loadCourse();setSaving('');}).catch(function(){setSaving('');});
  }
  function updateSection(id,title){apiPut('/api/marketplace/chapters/'+id,{title:title});}
  function deleteSection(id){if(!confirm('Delete this section and all its lectures?'))return;apiDelete('/api/marketplace/chapters/'+id).then(loadCourse);}

  function addLecture(sectionId){
    setSaving('lecture');
    apiPost('/api/marketplace/chapters/'+sectionId+'/lessons',{title:'New Lecture',content_type:'video'}).then(function(){loadCourse();setSaving('');}).catch(function(){setSaving('');});
  }
  function updateLecture(id,data){
    return apiPut('/api/marketplace/lessons/'+id,data).then(function(){showToast('Saved','ok');}).catch(function(e){showToast(e.message||'Failed','err');});
  }
  function deleteLecture(id){if(!confirm('Delete this lecture?'))return;apiDelete('/api/marketplace/lessons/'+id).then(loadCourse);}

  function submitForReview(){
    setSubmitting(true);setSubmitResult(null);
    apiPost('/api/marketplace/courses/'+courseId+'/submit',{}).then(function(r){
      setSubmitting(false);
      if(r.ok||r.success){showToast('Submitted for review!','ok');loadCourse();}
      else{setSubmitResult({error:r.error,issues:r.issues||[]});}
    }).catch(function(e){
      setSubmitting(false);
      try{var d=JSON.parse(e.message);setSubmitResult({error:d.error||e.message,issues:d.issues||[]});}
      catch(x){setSubmitResult({error:e.message,issues:[]});}
    });
  }

  if(loading)return <AppLayout title={t('courseEditor.title')}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-purple)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;
  if(!course)return <AppLayout title={t('courseEditor.title')}><div style={{textAlign:'center',padding:60,color:'var(--sap-text-muted)'}}>{t('courseEditor.courseNotFound')}</div></AppLayout>;

  var totalLectures=0;var totalDuration=0;var hasPreview=false;
  (course.chapters||[]).forEach(function(ch){(ch.lessons||[]).forEach(function(l){totalLectures++;totalDuration+=l.duration_minutes||0;if(l.is_preview)hasPreview=true;});});

  return(
    <AppLayout title={course.title} subtitle={'$'+course.price+' · '+course.status}>
      <Link to="/courses" style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'var(--sap-text-muted)',textDecoration:'none',marginBottom:16}}>{t('courseEditor.backToCourses')}</Link>

      {toast&&<div style={{padding:'10px 16px',borderRadius:10,marginBottom:14,fontSize:13,fontWeight:700,background:toast.type==='ok'?'var(--sap-green-bg-mid)':'var(--sap-red-bg)',color:toast.type==='ok'?'var(--sap-green)':'var(--sap-red)',display:'flex',alignItems:'center',gap:6}}>{toast.type==='ok'?<CheckCircle size={14}/>:<AlertTriangle size={14}/>}{toast.msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20,alignItems:'start'}}>
        {/* LEFT — Curriculum builder */}
        <div>
          {/* Stats row */}
          <div style={{display:'flex',gap:10,marginBottom:20}}>
            {[
              {label:'Status',value:course.status.replace('_',' '),color:course.status==='published'?'var(--sap-green)':course.status==='pending_review'?'var(--sap-amber)':'var(--sap-text-muted)'},
              {label:'Sections',value:(course.chapters||[]).length,color:'var(--sap-purple)'},
              {label:'Lectures',value:totalLectures,color:'var(--sap-accent)'},
              {label:'Duration',value:totalDuration+'m',color:'var(--sap-amber)'},
            ].map(function(s,i){
              return <div key={i} style={{flex:1,background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:'Sora,sans-serif'}}>{s.value}</div>
                <div style={{fontSize:9,fontWeight:700,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:.5}}>{s.label}</div>
              </div>;
            })}
          </div>

          {/* Section header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:18,fontWeight:800,color:'var(--sap-text-primary)',margin:0,fontFamily:'Sora,sans-serif'}}>{t('courseEditor.curriculum')}</h3>
            <button onClick={addSection} disabled={saving==='section'}
              style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(139,92,246,.2)'}}>
              <Plus size={14}/> Add Section
            </button>
          </div>

          {/* Sections */}
          {(course.chapters||[]).length===0?(
            <div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}>
              <div style={{fontSize:48,marginBottom:10,opacity:.2}}>📚</div>
              <div style={{fontSize:16,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:4}}>{t('courseEditor.noSections')}</div>
              <div style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:16}}>{t('courseEditor.startBuilding')}</div>
              <button onClick={addSection} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'var(--sap-purple)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('courseEditor.addFirstSection')}</button>
            </div>
          ):(course.chapters||[]).map(function(section,sIdx){
            var isOpen=expandedSection===section.id;
            var sectionLectures=section.lessons||[];
            var sectionDuration=sectionLectures.reduce(function(a,l){return a+(l.duration_minutes||0);},0);
            return(
              <div key={section.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,marginBottom:10,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.02)'}}>
                {/* Section header */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',cursor:'pointer',background:isOpen?'#faf8ff':'#fff',borderBottom:isOpen?'1px solid #f1f3f7':'none'}}
                  onClick={function(){setExpandedSection(isOpen?null:section.id);setExpandedLesson(null);}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
                    {isOpen?<ChevronDown size={16} color="var(--sap-purple)"/>:<ChevronRight size={16} color="var(--sap-text-muted)"/>}
                    <div style={{fontSize:11,fontWeight:800,color:'var(--sap-purple)',minWidth:60}}>Section {sIdx+1}</div>
                    <input value={section.title} onClick={function(e){e.stopPropagation();}}
                      onChange={function(e){var val=e.target.value;setCourse(function(prev){return Object.assign({},prev,{chapters:prev.chapters.map(function(c){return c.id===section.id?Object.assign({},c,{title:val}):c;})});});}}
                      onBlur={function(e){updateSection(section.id,e.target.value);}}
                      style={{fontSize:15,fontWeight:700,color:'var(--sap-text-primary)',border:'none',background:'transparent',outline:'none',fontFamily:'inherit',flex:1}}/>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:10,color:'var(--sap-text-muted)'}}>{sectionLectures.length} lecture{sectionLectures.length!==1?'s':''} · {sectionDuration}m</span>
                    <button onClick={function(e){e.stopPropagation();deleteSection(section.id);}} style={{color:'var(--sap-red)',background:'none',border:'none',cursor:'pointer',padding:4,opacity:.5}} onMouseEnter={function(e){e.currentTarget.style.opacity=1;}} onMouseLeave={function(e){e.currentTarget.style.opacity=.5;}}><Trash2 size={14}/></button>
                  </div>
                </div>

                {/* Lectures */}
                {isOpen&&(
                  <div>
                    {sectionLectures.length===0?(
                      <div style={{padding:'28px 18px',textAlign:'center',color:'var(--sap-text-muted)',fontSize:13}}>
                        No lectures yet. Add your first lecture to this section.
                      </div>
                    ):sectionLectures.map(function(lecture,lIdx){
                      var isExpanded=expandedLesson===lecture.id;
                      var typeIcon=lecture.content_type==='video'?<Play size={14} color="var(--sap-accent)"/>:lecture.content_type==='pdf'?<File size={14} color="var(--sap-amber)"/>:<FileText size={14} color="var(--sap-purple)"/>;
                      return(
                        <div key={lecture.id}>
                          {/* Lecture row */}
                          <div onClick={function(){setExpandedLesson(isExpanded?null:lecture.id);}}
                            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px 10px 48px',cursor:'pointer',
                              background:isExpanded?'rgba(139,92,246,.02)':'transparent',borderBottom:'1px solid #f5f6f8',transition:'background .1s'}}
                            onMouseEnter={function(e){if(!isExpanded)e.currentTarget.style.background='#fafbfc';}}
                            onMouseLeave={function(e){if(!isExpanded)e.currentTarget.style.background='transparent';}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div style={{width:28,height:28,borderRadius:6,background:lecture.content_type==='video'?'rgba(14,165,233,.08)':lecture.content_type==='pdf'?'rgba(245,158,11,.08)':'rgba(139,92,246,.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>{typeIcon}</div>
                              <div>
                                <div style={{fontSize:13,fontWeight:600,color:'var(--sap-text-primary)'}}>{lecture.title}</div>
                                <div style={{display:'flex',gap:6,marginTop:2}}>
                                  <span style={{fontSize:9,color:'var(--sap-text-muted)',textTransform:'capitalize'}}>{lecture.content_type}</span>
                                  {lecture.duration_minutes>0&&<span style={{fontSize:9,color:'var(--sap-text-muted)'}}>· {lecture.duration_minutes}m</span>}
                                  {lecture.video_url&&<span style={{fontSize:9,color:'var(--sap-accent)'}}>{t('courseEditor.videoLinked')}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              {lecture.is_preview&&<span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'var(--sap-green-bg-mid)',color:'var(--sap-green)'}}>{t('courseEditor.freePreview')}</span>}
                              <button onClick={function(e){e.stopPropagation();deleteLecture(lecture.id);}} style={{color:'var(--sap-red)',background:'none',border:'none',cursor:'pointer',padding:2,opacity:.4}} onMouseEnter={function(e){e.currentTarget.style.opacity=1;}} onMouseLeave={function(e){e.currentTarget.style.opacity=.4;}}><Trash2 size={12}/></button>
                            </div>
                          </div>

                          {/* Expanded lecture editor */}
                          {isExpanded&&<LectureEditor lecture={lecture} onSave={function(data){return updateLecture(lecture.id,data);}} onReload={loadCourse}/>}
                        </div>
                      );
                    })}

                    {/* Add lecture buttons */}
                    <div style={{padding:'12px 18px 14px 48px',display:'flex',gap:6,borderTop:sectionLectures.length>0?'1px solid #f1f3f7':'none'}}>
                      {[{type:'video',label:'Video Lecture',icon:Play,color:'var(--sap-accent)'},{type:'text',label:'Article',icon:FileText,color:'var(--sap-purple)'},{type:'pdf',label:'PDF Resource',icon:File,color:'var(--sap-amber)'}].map(function(t){
                        var Icon=t.icon;
                        return <button key={t.type} onClick={function(){
                          setSaving('lecture');
                          apiPost('/api/marketplace/chapters/'+section.id+'/lessons',{title:'New '+t.label,content_type:t.type}).then(function(){loadCourse();setSaving('');}).catch(function(){setSaving('');});
                        }} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 12px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:t.color,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
                          onMouseEnter={function(e){e.currentTarget.style.borderColor=t.color;e.currentTarget.style.background=t.color+'08';}}
                          onMouseLeave={function(e){e.currentTarget.style.borderColor='var(--sap-border-light)';e.currentTarget.style.background='#fff';}}>
                          <Icon size={12}/> + {t.label}
                        </button>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT — Publish panel */}
        <div style={{position:'sticky',top:24,display:'flex',flexDirection:'column',gap:14}}>
          {/* Submit card */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#172554,#172554)',padding:'16px 20px'}}>
              <div style={{fontSize:15,fontWeight:800,color:'#fff',fontFamily:'Sora,sans-serif'}}>{t('courseEditor.publishCourse')}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{t('courseEditor.completeRequirements')}</div>
            </div>
            <div style={{padding:'18px 20px'}}>
              <div style={{marginBottom:14}}>
                {[
                  {ok:totalLectures>=1,l:'At least 1 lecture'},
                  {ok:totalDuration>=10,l:'10+ minutes total'},
                  {ok:hasPreview,l:'1+ free preview lecture'},
                  {ok:!!(course.thumbnail_url),l:'Course banner uploaded'},
                  {ok:(course.description||'').length>=100,l:'Description (100+ chars)'},
                ].map(function(r,i){
                  return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
                    <div style={{width:18,height:18,borderRadius:'50%',background:r.ok?'var(--sap-green-bg-mid)':'var(--sap-red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:r.ok?'var(--sap-green)':'var(--sap-red)',flexShrink:0}}>{r.ok?'✓':'✗'}</div>
                    <span style={{fontSize:12,color:r.ok?'#334155':'var(--sap-text-muted)',fontWeight:r.ok?600:400}}>{r.l}</span>
                  </div>;
                })}
              </div>

              {submitResult&&(
                <div style={{padding:'10px 12px',borderRadius:8,background:'var(--sap-red-bg)',border:'1px solid #fecaca',marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--sap-red)',marginBottom:4}}>{submitResult.error}</div>
                  {submitResult.issues.map(function(iss,i){return <div key={i} style={{fontSize:10,color:'var(--sap-red)'}}>• {iss}</div>;})}
                </div>
              )}

              {course.status==='published'?(
                <div style={{textAlign:'center',padding:'12px',borderRadius:10,background:'var(--sap-green-bg-mid)'}}><span style={{fontSize:14,fontWeight:800,color:'var(--sap-green)'}}>{t('courseEditor.publishedLive')}</span></div>
              ):course.status==='pending_review'?(
                <div style={{textAlign:'center',padding:'12px',borderRadius:10,background:'var(--sap-amber-bg)'}}><span style={{fontSize:14,fontWeight:800,color:'var(--sap-amber)'}}>{t('courseEditor.underReview')}</span></div>
              ):(
                <button onClick={submitForReview} disabled={submitting}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'13px',borderRadius:10,border:'none',
                    cursor:submitting?'default':'pointer',fontSize:14,fontWeight:800,fontFamily:'Sora,sans-serif',
                    background:submitting?'var(--sap-text-ghost)':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',
                    boxShadow:submitting?'none':'0 4px 14px rgba(22,163,74,.25)'}}>
                  <Send size={14}/> {submitting?'Scanning...':'Submit for Review'}
                </button>
              )}
            </div>
          </div>

          {/* Earnings */}
          <div style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #ddd6fe',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'var(--sap-purple)',marginBottom:4}}>{t('courseEditor.fullCommissions')}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'var(--sap-purple)'}}>${parseFloat(course.price||0).toFixed(0)}</div>
            <div style={{fontSize:10,color:'var(--sap-text-muted)',marginTop:2}}>{t('courseEditor.perKeptSale')}</div>
          </div>

          {/* Tips */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#334155',marginBottom:8}}>{t('courseEditor.tipsTitle')}</div>
            {['Start with a compelling intro video','Mix video, text, and resources','Keep lectures under 15 minutes each','Mark your best lecture as Free Preview','Add at least 5 lectures for depth'].map(function(t,i){
              return <div key={i} style={{display:'flex',gap:6,padding:'3px 0',fontSize:11,color:'var(--sap-text-muted)'}}><span style={{color:'var(--sap-purple)'}}>•</span>{t}</div>;
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}


// ═══════════════════════════════════════════════════════════════
// LECTURE EDITOR — Udemy-style content editor per lecture
// ═══════════════════════════════════════════════════════════════

function LectureEditor({lecture, onSave, onReload}){
  var [title, setTitle] = useState(lecture.title);
  var [contentType, setContentType] = useState(lecture.content_type||'video');
  var [videoUrl, setVideoUrl] = useState(lecture.video_url||'');
  var [textContent, setTextContent] = useState(lecture.text_content||'');
  var [pdfUrl, setPdfUrl] = useState(lecture.pdf_url||'');
  var [duration, setDuration] = useState(lecture.duration_minutes||0);
  var [isPreview, setIsPreview] = useState(lecture.is_preview||false);
  var [saved, setSaved] = useState(false);
  var [saving, setSaving] = useState(false);

  function save(){
    setSaving(true);
    onSave({title:title,content_type:contentType,video_url:videoUrl,text_content:textContent,pdf_url:pdfUrl,duration_minutes:parseInt(duration)||0,is_preview:isPreview}).then(function(){
      setSaved(true);setSaving(false);setTimeout(function(){setSaved(false);},2000);onReload();
    }).catch(function(){setSaving(false);});
  }

  // Extract YouTube embed URL
  var embedUrl='';
  if(videoUrl){
    if(videoUrl.includes('youtu.be/'))embedUrl='https://www.youtube.com/embed/'+videoUrl.split('youtu.be/')[1].split('?')[0];
    else if(videoUrl.includes('youtube.com/watch'))embedUrl='https://www.youtube.com/embed/'+(videoUrl.split('v=')[1]||'').split('&')[0];
    else if(videoUrl.includes('vimeo.com/'))embedUrl='https://player.vimeo.com/video/'+videoUrl.split('vimeo.com/')[1].split('?')[0];
    else if(videoUrl.includes('loom.com/'))embedUrl=videoUrl.replace('/share/','/embed/');
  }

  return(
    <div style={{padding:'20px 18px 20px 48px',background:'#fafbfc',borderTop:'1px solid #f1f3f7'}}>
      {/* Title + meta row */}
      <div style={{display:'grid',gridTemplateColumns:'2fr auto auto',gap:12,marginBottom:16,alignItems:'end'}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('courseEditor.lectureTitle')}</label>
          <input value={title} onChange={function(e){setTitle(e.target.value);}}
            style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontWeight:600,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}
            onFocus={function(e){e.target.style.borderColor='var(--sap-purple)';}} onBlur={function(e){e.target.style.borderColor='var(--sap-border-light)';}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('courseEditor.duration')}</label>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <input type="number" min="0" value={duration} onChange={function(e){setDuration(e.target.value);}}
              style={{width:60,padding:'10px 8px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontWeight:700,fontFamily:'Sora,sans-serif',outline:'none',textAlign:'center',background:'#fff'}}/>
            <span style={{fontSize:11,color:'var(--sap-text-muted)'}}>{t('courseEditor.minLabel')}</span>
          </div>
        </div>
        <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,fontWeight:600,padding:'10px 14px',borderRadius:10,
          color:isPreview?'var(--sap-green)':'var(--sap-text-muted)',border:isPreview?'2px solid #bbf7d0':'2px solid #e8ecf2',background:isPreview?'var(--sap-green-bg)':'#fff',transition:'all .15s'}}>
          <input type="checkbox" checked={isPreview} onChange={function(){setIsPreview(!isPreview);}} style={{accentColor:'var(--sap-green)',width:14,height:14}}/>
          {isPreview?<Eye size={13}/>:<EyeOff size={13}/>}
          {isPreview?'Free Preview':'Paid'}
        </label>
      </div>

      {/* Content type tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16}}>
        {[{t:'video',l:'Video',icon:Play,c:'var(--sap-accent)'},{t:'text',l:'Article',icon:FileText,c:'var(--sap-purple)'},{t:'pdf',l:'PDF',icon:File,c:'var(--sap-amber)'}].map(function(tab){
          var on=contentType===tab.t;var Icon=tab.icon;
          return <button key={tab.t} onClick={function(){setContentType(tab.t);}}
            style={{display:'flex',alignItems:'center',gap:4,padding:'8px 16px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:on?800:600,
              border:on?'2px solid '+tab.c:'2px solid #e8ecf2',background:on?tab.c+'08':'#fff',color:on?tab.c:'var(--sap-text-muted)',transition:'all .15s'}}>
            <Icon size={13}/>{tab.l}
          </button>;
        })}
      </div>

      {/* VIDEO content */}
      {contentType==='video'&&(
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('courseEditor.videoUrlLabel')}</label>
          <input value={videoUrl} onChange={function(e){setVideoUrl(e.target.value);}} placeholder={t("courseEditor.videoUrlPlaceholder")}
            style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}
            onFocus={function(e){e.target.style.borderColor='var(--sap-accent)';}} onBlur={function(e){e.target.style.borderColor='var(--sap-border-light)';}}/>
          {embedUrl&&(
            <div style={{marginTop:10,borderRadius:10,overflow:'hidden',aspectRatio:'16/9',maxWidth:480,border:'1px solid #e8ecf2'}}>
              <iframe src={embedUrl} style={{width:'100%',height:'100%',border:'none'}} allowFullScreen allow="autoplay; encrypted-media"/>
            </div>
          )}
        </div>
      )}

      {/* PDF content */}
      {contentType==='pdf'&&(
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('courseEditor.pdfFile')}</label>
          <div style={{display:'flex',gap:8}}>
            <label style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:10,border:'2px solid #e8ecf2',background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--sap-text-muted)'}}
              onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-amber)';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='var(--sap-border-light)';}}>
              <Upload size={14}/> Upload PDF
              <input type="file" accept=".pdf" onChange={function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){setPdfUrl(ev.target.result);};r.readAsDataURL(f);}} style={{display:'none'}}/>
            </label>
            {pdfUrl&&<span style={{fontSize:11,color:'var(--sap-amber)',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><CheckCircle size={12}/>{t('courseEditor.pdfAttached')}</span>}
          </div>
        </div>
      )}

      {/* Rich text content — shown for ALL types as supplementary notes */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>
          {contentType==='video'?'Lecture Notes & Resources':contentType==='pdf'?'Description':'Lecture Content'}
        </label>
        <RichTextEditor content={textContent} onChange={function(html){setTextContent(html);}}
          placeholder={contentType==='video'?'Add notes, links, and supplementary content for this video lecture...':contentType==='pdf'?'Describe what this resource covers...':'Write your article content here — use headings, lists, images, and formatting...'}/>
      </div>

      {/* Save bar */}
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={save} disabled={saving}
          style={{display:'flex',alignItems:'center',gap:6,padding:'10px 28px',borderRadius:10,border:'none',
            background:saved?'var(--sap-green)':saving?'var(--sap-text-ghost)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',
            fontSize:13,fontWeight:800,cursor:saving?'default':'pointer',fontFamily:'Sora,sans-serif',
            boxShadow:saved||saving?'none':'0 2px 12px rgba(139,92,246,.2)',transition:'all .2s'}}>
          <Save size={14}/> {saved?'✓ Saved!':saving?'Saving...':'Save Lecture'}
        </button>
      </div>
    </div>
  );
}
