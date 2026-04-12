import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiPost, apiPut } from '../utils/api';
import { GraduationCap, DollarSign, Tag, Image, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Sparkles, BookOpen, Users, BarChart3 } from 'lucide-react';

var CATEGORIES = [
  {key:'marketing',label:'Marketing & Ads',icon:'📣'},
  {key:'business',label:'Business',icon:'💼'},
  {key:'crypto',label:'Crypto & Trading',icon:'📈'},
  {key:'fitness',label:'Health & Fitness',icon:'💪'},
  {key:'tech',label:'Software & Tech',icon:'💻'},
  {key:'creative',label:'Creative & Design',icon:'🎨'},
  {key:'lifestyle',label:'Lifestyle',icon:'🌱'},
  {key:'education',label:'Education',icon:'🎓'},
  {key:'other',label:'Other',icon:'📦'},
];

var STEPS = [{key:'basics',label:'Course Info',num:1},{key:'details',label:'Description & Banner',num:2},{key:'review',label:'Terms & Create',num:3}];

export default function CourseCreate() {
  var { t } = useTranslation();
  var [step, setStep] = useState(0);
  var [title, setTitle] = useState('');
  var [shortDesc, setShortDesc] = useState('');
  var [description, setDescription] = useState('');
  var [price, setPrice] = useState('');
  var [category, setCategory] = useState('');
  var [difficulty, setDifficulty] = useState('beginner');
  var [bannerUrl, setBannerUrl] = useState('');
  var [agreedTerms, setAgreedTerms] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();

  function handleBanner(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){setBannerUrl(ev.target.result);};r.readAsDataURL(f);}

  var iS={width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',transition:'border .2s'};
  function foc(e){e.target.style.borderColor='var(--sap-purple)';}
  function blu(e){e.target.style.borderColor='var(--sap-border-light)';}

  function nextStep(){
    setError('');
    if(step===0){
      if(!title.trim()||title.length<10){setError('Course title must be at least 10 characters');return;}
      if(!category){setError('Please select a category');return;}
      if(!parseFloat(price)||parseFloat(price)<20){setError('Minimum course price is $20');return;}
    }
    if(step===1&&(!description||description.trim().length<100)){setError('Description must be at least 100 characters');return;}
    setStep(step+1);
  }

  function handleCreate(){
    if(!agreedTerms){setError('You must agree to the Creator Terms');return;}
    setSaving(true);setError('');
    apiPost('/api/marketplace/courses',{
      title:title.trim(),description:description.trim(),short_description:shortDesc.trim(),
      price:parseFloat(price),category:category,difficulty_level:difficulty,
      agreed_terms:true,
    }).then(function(r){
      if(r.ok){
        // Upload banner separately if present
        if(bannerUrl){
          apiPut('/api/marketplace/courses/'+r.course_id,{thumbnail_url:bannerUrl}).then(function(){
            navigate('/courses/edit/'+r.course_id);
          }).catch(function(){
            navigate('/courses/edit/'+r.course_id);
          });
        } else {
          navigate('/courses/edit/'+r.course_id);
        }
      }
      else{setError(r.error||'Failed');setSaving(false);}
    }).catch(function(e){setError(e.message||'Failed');setSaving(false);});
  }

  var catObj=CATEGORIES.find(function(c){return c.key===category;});

  return(
    <AppLayout title={t('courseCreate.createCourseTitle')} subtitle={t('courseCreate.createCourseSubtitle')}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24,maxWidth:1100,margin:'0 auto',alignItems:'start'}}>

        {/* LEFT — Wizard */}
        <div>
          {/* Steps */}
          <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:28}}>
            {STEPS.map(function(s,i){
              var done=i<step;var on=i===step;
              return(<div key={s.key} style={{display:'flex',alignItems:'center',flex:1}}>
                <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,
                  background:done?'var(--sap-purple)':on?'linear-gradient(135deg,#8b5cf6,#a78bfa)':'var(--sap-border-light)',
                  color:done||on?'#fff':'var(--sap-text-muted)',boxShadow:on?'0 4px 14px rgba(139,92,246,.3)':'none',transition:'all .3s'}}>
                  {done?'✓':s.num}
                </div>
                {i<STEPS.length-1&&<div style={{flex:1,height:2,background:done?'var(--sap-purple)':'var(--sap-border-light)',margin:'0 6px',transition:'all .3s'}}/>}
              </div>);
            })}
          </div>

          {error&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',background:'linear-gradient(135deg,#fef2f2,#fff1f2)',borderRadius:12,border:'1px solid #fecaca',marginBottom:20}}><AlertTriangle size={16} color="var(--sap-red)"/><div style={{fontSize:13,fontWeight:600,color:'var(--sap-red)'}}>{error}</div></div>}

          {/* STEP 1 — Course basics */}
          {step===0&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('courseCreate.whatsYourCourse')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t('courseCreate.theBasics')}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.courseTitle')}</label>
                  <input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder={t("courseCreate.courseTitlePlaceholder")} style={iS} onFocus={foc} onBlur={blu}/>
                  <div style={{fontSize:10,color:'var(--sap-text-ghost)',marginTop:4}}>{t('courseCreate.minChars')}</div>
                </div>

                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.category')}</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {CATEGORIES.map(function(c){var on=category===c.key;return(
                      <button key={c.key} onClick={function(){setCategory(c.key);}} style={{padding:'12px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',textAlign:'center',border:on?'2px solid #8b5cf6':'2px solid #f1f3f7',background:on?'rgba(139,92,246,.04)':'#fafbfc',transition:'all .15s'}}>
                        <div style={{fontSize:20,marginBottom:2}}>{c.icon}</div>
                        <div style={{fontSize:11,fontWeight:on?800:600,color:on?'var(--sap-purple)':'var(--sap-text-muted)'}}>{c.label}</div>
                      </button>);
                    })}
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:22}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.price')}</label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:16,top:14,fontSize:18,fontWeight:800,color:'var(--sap-text-ghost)'}}>$</span><input type="number" min="20" value={price} onChange={function(e){setPrice(e.target.value);}} placeholder="49" style={Object.assign({},iS,{paddingLeft:34,fontSize:20,fontWeight:800,fontFamily:'Sora,sans-serif'})} onFocus={foc} onBlur={blu}/></div>
                    <div style={{fontSize:11,color:'var(--sap-green)',fontWeight:700,marginTop:6}}>You keep 100% = ${parseFloat(price||0).toFixed(0)} per kept sale</div>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.difficulty')}</label>
                    <div style={{display:'flex',gap:4,marginTop:4}}>
                      {[{k:'beginner',l:'Beginner',icon:'🟢'},{k:'intermediate',l:'Intermediate',icon:'🟡'},{k:'advanced',l:'Advanced',icon:'🔴'}].map(function(d){
                        var on=difficulty===d.k;
                        return <button key={d.k} onClick={function(){setDifficulty(d.k);}} style={{flex:1,padding:'12px 8px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',textAlign:'center',border:on?'2px solid #8b5cf6':'2px solid #f1f3f7',background:on?'rgba(139,92,246,.04)':'#fafbfc'}}>
                          <div style={{fontSize:14}}>{d.icon}</div>
                          <div style={{fontSize:10,fontWeight:on?800:600,color:on?'var(--sap-purple)':'var(--sap-text-muted)',marginTop:2}}>{d.l}</div>
                        </button>;
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.shortSummary')}</label>
                  <input value={shortDesc} onChange={function(e){setShortDesc(e.target.value);}} maxLength={160} placeholder={t("courseCreate.summaryPlaceholder")} style={iS} onFocus={foc} onBlur={blu}/>
                  <div style={{textAlign:'right',fontSize:10,color:'var(--sap-text-ghost)',marginTop:4}}>{shortDesc.length}/160</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Description & Banner */}
          {step===1&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('courseCreate.describeYourCourse')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t('courseCreate.helpStudents')}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.courseBanner')}</label>
                  {bannerUrl?(<div style={{width:'100%',height:180,borderRadius:12,backgroundImage:'url('+bannerUrl+')',backgroundSize:'cover',backgroundPosition:'center',position:'relative',marginBottom:8}}><button onClick={function(){setBannerUrl('');}} style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.6)',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div>):(
                    <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'36px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',transition:'all .2s'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-purple)';e.currentTarget.style.background='rgba(139,92,246,.02)';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='transparent';}}>
                      <Image size={28} color="var(--sap-purple)"/><div style={{fontSize:14,fontWeight:600,color:'var(--sap-text-secondary)'}}>{t('courseCreate.dropImage')}</div><div style={{fontSize:11,color:'var(--sap-text-ghost)'}}>{t('courseCreate.recommendedSize')}</div><input type="file" accept="image/*" onChange={handleBanner} style={{display:'none'}}/>
                    </label>)}
                </div>

                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('courseCreate.fullDescription')}</label>
                  <textarea value={description} onChange={function(e){setDescription(e.target.value);}} rows={8} placeholder={t('courseCreate.descPlaceholderFull')}
                    style={Object.assign({},iS,{resize:'vertical',lineHeight:1.7})} onFocus={foc} onBlur={blu}/>
                  <div style={{fontSize:10,color:description.length>=100?'var(--sap-green-mid)':'var(--sap-text-ghost)',marginTop:4}}>{description.length}/100 minimum</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Terms & Create */}
          {step===2&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('courseCreate.reviewCreate')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t('courseCreate.afterCreating')}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                {/* Checklist */}
                <div style={{marginBottom:20}}>
                  {[{ok:title.length>=10,l:'Course title (10+ chars)'},{ok:!!category,l:'Category selected'},{ok:parseFloat(price)>=20,l:'Price set ($20+)'},{ok:description.length>=100,l:'Description (100+ chars)'},{ok:!!difficulty,l:'Difficulty level'}].map(function(c,i){
                    return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}><div style={{width:20,height:20,borderRadius:'50%',background:c.ok?'var(--sap-green-bg-mid)':'var(--sap-red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:c.ok?'var(--sap-green-mid)':'var(--sap-red)'}}>{c.ok?'✓':'✗'}</div><span style={{fontSize:13,color:c.ok?'#334155':'var(--sap-text-muted)',fontWeight:c.ok?600:400}}>{c.l}</span></div>;
                  })}
                </div>

                {/* What happens next */}
                <div style={{background:'rgba(139,92,246,.03)',border:'1px solid rgba(139,92,246,.1)',borderRadius:12,padding:'16px 20px',marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--sap-purple)',marginBottom:8}}>{t('courseCreate.whatHappens')}</div>
                  <div style={{fontSize:12,color:'var(--sap-text-secondary)',lineHeight:1.9}}>
                    <div>1. You'll land in the <strong>{t('courseCreate.courseEditor')}</strong> {t('courseCreate.step1Suffix')}</div>
                    <div>{t('courseCreate.step2Full')}</div>
                    <div>3. When ready, click <strong>{t('courseCreate.submitReview')}</strong></div>
                    <div>{t('courseCreate.step4Full')}</div>
                  </div>
                </div>

                {/* Terms */}
                <div style={{background:'var(--sap-bg-input)',borderRadius:12,padding:'18px 20px',marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:8}}>{t('courseCreate.creatorTerms')}</div>
                  <div style={{fontSize:11,color:'var(--sap-text-muted)',lineHeight:1.9}}>
                    <div>{t('courseCreate.creatorTerm1')}</div>
                    <div>{t('courseCreate.creatorTerm2')}</div>
                    <div>{t('courseCreate.creatorTerm3')}</div>
                    <div>{t('courseCreate.creatorTerm4')}</div>
                    <div>{t('courseCreate.creatorTerm5')}</div>
                    <div>{t('courseCreate.creatorTerm6')}</div>
                  </div>
                </div>

                <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',padding:'14px 16px',borderRadius:12,border:agreedTerms?'2px solid #8b5cf6':'2px solid #e8ecf2',background:agreedTerms?'rgba(139,92,246,.02)':'transparent',transition:'all .15s'}}>
                  <input type="checkbox" checked={agreedTerms} onChange={function(){setAgreedTerms(!agreedTerms);}} style={{marginTop:2,accentColor:'var(--sap-purple)',width:18,height:18}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--sap-text-primary)',lineHeight:1.6}}>{t('courseCreate.agreeBody')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Nav */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:20,paddingBottom:30}}>
            {step>0?<button onClick={function(){setError('');setStep(step-1);}} style={{display:'flex',alignItems:'center',gap:4,padding:'12px 24px',borderRadius:10,border:'2px solid #e8ecf2',background:'#fff',color:'var(--sap-text-muted)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><ChevronLeft size={16}/>{t('courseCreate.back')}</button>:<div/>}
            {step<2?<button onClick={nextStep} style={{display:'flex',alignItems:'center',gap:4,padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 14px rgba(139,92,246,.25)'}}>Continue<ChevronRight size={16}/></button>:(
              <button onClick={handleCreate} disabled={saving||!agreedTerms} style={{display:'flex',alignItems:'center',gap:6,padding:'14px 32px',borderRadius:10,border:'none',cursor:(saving||!agreedTerms)?'default':'pointer',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,background:(saving||!agreedTerms)?'var(--sap-text-ghost)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',boxShadow:(saving||!agreedTerms)?'none':'0 4px 16px rgba(139,92,246,.3)'}}>
                {saving?'Creating...':<><Sparkles size={16}/>{t('courseCreate.createCourse')}</>}
              </button>)}
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div style={{position:'sticky',top:24}}>
          <div style={{fontSize:11,fontWeight:800,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{t('courseCreate.livePreview')}</div>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.06)'}}>
            <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#172554,#172554)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
              {bannerUrl?<img src={bannerUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<div style={{fontSize:36,opacity:.15}}>{catObj?catObj.icon:'🎓'}</div>}
              <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',borderRadius:8,padding:'4px 10px'}}>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff'}}>${parseFloat(price||0).toFixed(0)||'0'}</span>
              </div>
              <div style={{position:'absolute',bottom:8,left:8,display:'flex',gap:3}}>
                <span style={{fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(139,92,246,.85)',color:'#fff'}}>{t('courseCreate.fullCommission')}</span>
                {difficulty&&<span style={{fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(255,255,255,.2)',color:'#fff',textTransform:'capitalize'}}>{difficulty}</span>}
              </div>
            </div>
            <div style={{padding:'16px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:3,lineHeight:1.3}}>{title||'Your Course Title'}</div>
              <div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:6}}>{t('courseCreate.byYou')}</div>
              <div style={{fontSize:12,color:'var(--sap-text-secondary)',lineHeight:1.6,marginBottom:10}}>{shortDesc||'Your one-line summary appears here'}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                {catObj&&<span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'var(--sap-bg-page)',color:'var(--sap-text-muted)'}}>{catObj.icon} {catObj.label}</span>}
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div style={{marginTop:12,background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #ddd6fe',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'var(--sap-purple)',marginBottom:6}}>{t('courseCreate.passUpSystem')}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:900,color:'var(--sap-purple)'}}>${parseFloat(price||0).toFixed(0)}</div>
            <div style={{fontSize:10,color:'var(--sap-text-muted)',marginTop:4,lineHeight:1.6}}>{t('courseCreate.passUpBody')}</div>
          </div>

          {/* What's next */}
          <div style={{marginTop:12,background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#334155',marginBottom:8}}>{t('courseCreate.afterCreatingLabel')}</div>
            {['Add chapters & lessons','Rich text + video content','Submit for AI review','Admin approves → live'].map(function(s,i){
              return <div key={i} style={{display:'flex',gap:6,padding:'3px 0',fontSize:11,color:'var(--sap-text-muted)'}}><span style={{color:'var(--sap-purple)',fontWeight:800}}>{i+1}.</span>{s}</div>;
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
