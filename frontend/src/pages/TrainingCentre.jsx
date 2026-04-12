import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { BookOpen, ChevronDown, ChevronRight, Clock, CheckCircle } from 'lucide-react';

export default function TrainingCentre() {
  var { t } = useTranslation();
  var [modules, setModules] = useState([]);
  var [loading, setLoading] = useState(true);
  var [openModule, setOpenModule] = useState(null);
  var [openLesson, setOpenLesson] = useState(null);
  var [completed, setCompleted] = useState({});

  useEffect(function() {
    apiGet('/api/training').then(function(r) {
      setModules(r.modules || []);
      setLoading(false);
      if (r.modules && r.modules.length > 0) setOpenModule(r.modules[0].id);
    }).catch(function() { setLoading(false); });
    try {
      var saved = JSON.parse(localStorage.getItem('sap_training_done') || '{}');
      setCompleted(saved);
    } catch(e) {}
  }, []);

  function markDone(lessonId) {
    var next = Object.assign({}, completed);
    next[lessonId] = true;
    setCompleted(next);
    try { localStorage.setItem('sap_training_done', JSON.stringify(next)); } catch(e) {}
  }

  var totalLessons = modules.reduce(function(a, m) { return a + m.lessons.length; }, 0);
  var doneLessons = Object.keys(completed).length;

  if (loading) return <AppLayout title="Training Centre"><div style={{padding:40,textAlign:'center',color:'#64748b'}}>Loading...</div></AppLayout>;

  return (
    <AppLayout title={t("training.title")} subtitle={t("training.subtitle")}>
      {/* Progress bar */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'20px 24px',marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>Your Progress</div>
          <div style={{fontSize:13,fontWeight:700,color:'#0ea5e9'}}>{doneLessons}/{totalLessons} lessons</div>
        </div>
        <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:(totalLessons>0?doneLessons/totalLessons*100:0)+'%',background:'linear-gradient(90deg,#0ea5e9,#38bdf8)',borderRadius:4,transition:'width .5s ease'}}/>
        </div>
      </div>

      {/* Modules */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {modules.map(function(mod) {
          var isOpen = openModule === mod.id;
          var modDone = mod.lessons.filter(function(l) { return completed[l.id]; }).length;
          return (
            <div key={mod.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
              <div onClick={function(){setOpenModule(isOpen?null:mod.id);setOpenLesson(null);}}
                style={{padding:'18px 22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:isOpen?'linear-gradient(135deg,'+mod.color+'10,'+mod.color+'05)':'#fff',transition:'background .2s'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:24}}>{mod.emoji}</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{mod.title}</div>
                    <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>{modDone}/{mod.lessons.length} completed</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {modDone === mod.lessons.length && mod.lessons.length > 0 && (
                    <span style={{fontSize:10,fontWeight:800,padding:'3px 8px',borderRadius:4,background:'#dcfce7',color:'#16a34a'}}>COMPLETE</span>
                  )}
                  {isOpen ? <ChevronDown size={18} color="#64748b"/> : <ChevronRight size={18} color="#64748b"/>}
                </div>
              </div>

              {isOpen && (
                <div style={{borderTop:'1px solid #f1f5f9'}}>
                  {mod.lessons.map(function(lesson) {
                    var lessonOpen = openLesson === lesson.id;
                    var isDone = completed[lesson.id];
                    return (
                      <div key={lesson.id}>
                        <div onClick={function(){setOpenLesson(lessonOpen?null:lesson.id);}}
                          style={{padding:'14px 22px 14px 46px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',
                            borderBottom:'1px solid #f8f9fb',background:lessonOpen?'#f8fafc':'#fff',transition:'background .15s'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            {isDone ? <CheckCircle size={16} color="#16a34a"/> : <BookOpen size={16} color="#94a3b8"/>}
                            <span style={{fontSize:13,fontWeight:700,color:isDone?'#16a34a':'#334155'}}>{lesson.title}</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:3}}>
                              <Clock size={11}/> {lesson.duration}
                            </span>
                            {lessonOpen ? <ChevronDown size={14} color="#64748b"/> : <ChevronRight size={14} color="#64748b"/>}
                          </div>
                        </div>
                        {lessonOpen && (
                          <div style={{padding:'20px 22px 20px 46px',background:'#fafbfd',borderBottom:'1px solid #f1f5f9'}}>
                            <div style={{fontSize:13,color:'#475569',lineHeight:1.8,marginBottom:16,maxWidth:680}}>
                              {lesson.content}
                            </div>
                            {!isDone && (
                              <button onClick={function(e){e.stopPropagation();markDone(lesson.id);}}
                                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:8,border:'none',
                                  background:'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:12,fontWeight:700,
                                  cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
                                <CheckCircle size={13}/> Mark as Complete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
