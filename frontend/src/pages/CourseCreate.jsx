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
  function foc(e){e.target.style.borderColor='#8b5cf6';}
  function blu(e){e.target.style.borderColor='#e8ecf2';}

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
    <AppLayout title="Create a Course" subtitle="Build and sell your own course — 100% commissions">
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24,maxWidth:1100,margin:'0 auto',alignItems:'start'}}>

        {/* LEFT — Wizard */}
        <div>
          {/* Steps */}
          <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:28}}>
            {STEPS.map(function(s,i){
              var done=i<step;var on=i===step;
              return(<div key={s.key} style={{display:'flex',alignItems:'center',flex:1}}>
                <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,
                  background:done?'#8b5cf6':on?'linear-gradient(135deg,#8b5cf6,#a78bfa)':'#e8ecf2',
                  color:done||on?'#fff':'#64748b',boxShadow:on?'0 4px 14px rgba(139,92,246,.3)':'none',transition:'all .3s'}}>
                  {done?'✓':s.num}
                </div>
                {i<STEPS.length-1&&<div style={{flex:1,height:2,background:done?'#8b5cf6':'#e8ecf2',margin:'0 6px',transition:'all .3s'}}/>}
              </div>);
            })}
          </div>

          {error&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',background:'linear-gradient(135deg,#fef2f2,#fff1f2)',borderRadius:12,border:'1px solid #fecaca',marginBottom:20}}><AlertTriangle size={16} color="#dc2626"/><div style={{fontSize:13,fontWeight:600,color:'#dc2626'}}>{error}</div></div>}

          {/* STEP 1 — Course basics */}
          {step===0&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>What's your course about?</h3>
                <p style={{fontSize:13,color:'#64748b',margin:0}}>The basics — you can always change these later</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Course Title</label>
                  <input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder="e.g. Digital Marketing Mastery for Beginners" style={iS} onFocus={foc} onBlur={blu}/>
                  <div style={{fontSize:10,color:'#cbd5e1',marginTop:4}}>Minimum 10 characters</div>
                </div>

                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Category</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {CATEGORIES.map(function(c){var on=category===c.key;return(
                      <button key={c.key} onClick={function(){setCategory(c.key);}} style={{padding:'12px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',textAlign:'center',border:on?'2px solid #8b5cf6':'2px solid #f1f3f7',background:on?'rgba(139,92,246,.04)':'#fafbfc',transition:'all .15s'}}>
                        <div style={{fontSize:20,marginBottom:2}}>{c.icon}</div>
                        <div style={{fontSize:11,fontWeight:on?800:600,color:on?'#8b5cf6':'#64748b'}}>{c.label}</div>
                      </button>);
                    })}
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:22}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Price</label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:16,top:14,fontSize:18,fontWeight:800,color:'#cbd5e1'}}>$</span><input type="number" min="20" value={price} onChange={function(e){setPrice(e.target.value);}} placeholder="49" style={Object.assign({},iS,{paddingLeft:34,fontSize:20,fontWeight:800,fontFamily:'Sora,sans-serif'})} onFocus={foc} onBlur={blu}/></div>
                    <div style={{fontSize:11,color:'#16a34a',fontWeight:700,marginTop:6}}>You keep 100% = ${parseFloat(price||0).toFixed(0)} per kept sale</div>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Difficulty</label>
                    <div style={{display:'flex',gap:4,marginTop:4}}>
                      {[{k:'beginner',l:'Beginner',icon:'🟢'},{k:'intermediate',l:'Intermediate',icon:'🟡'},{k:'advanced',l:'Advanced',icon:'🔴'}].map(function(d){
                        var on=difficulty===d.k;
                        return <button key={d.k} onClick={function(){setDifficulty(d.k);}} style={{flex:1,padding:'12px 8px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',textAlign:'center',border:on?'2px solid #8b5cf6':'2px solid #f1f3f7',background:on?'rgba(139,92,246,.04)':'#fafbfc'}}>
                          <div style={{fontSize:14}}>{d.icon}</div>
                          <div style={{fontSize:10,fontWeight:on?800:600,color:on?'#8b5cf6':'#64748b',marginTop:2}}>{d.l}</div>
                        </button>;
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Short Summary</label>
                  <input value={shortDesc} onChange={function(e){setShortDesc(e.target.value);}} maxLength={160} placeholder="One line that sells your course" style={iS} onFocus={foc} onBlur={blu}/>
                  <div style={{textAlign:'right',fontSize:10,color:'#cbd5e1',marginTop:4}}>{shortDesc.length}/160</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Description & Banner */}
          {step===1&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>Describe Your Course</h3>
                <p style={{fontSize:13,color:'#64748b',margin:0}}>Help students understand what they'll learn</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Course Banner</label>
                  {bannerUrl?(<div style={{width:'100%',height:180,borderRadius:12,backgroundImage:'url('+bannerUrl+')',backgroundSize:'cover',backgroundPosition:'center',position:'relative',marginBottom:8}}><button onClick={function(){setBannerUrl('');}} style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.6)',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div>):(
                    <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'36px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',transition:'all .2s'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.background='rgba(139,92,246,.02)';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='transparent';}}>
                      <Image size={28} color="#8b5cf6"/><div style={{fontSize:14,fontWeight:600,color:'#475569'}}>Drop image or click to upload</div><div style={{fontSize:11,color:'#cbd5e1'}}>1280×720 recommended</div><input type="file" accept="image/*" onChange={handleBanner} style={{display:'none'}}/>
                    </label>)}
                </div>

                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Full Description</label>
                  <textarea value={description} onChange={function(e){setDescription(e.target.value);}} rows={8} placeholder="What will students learn? What makes this course unique? Who is it for? What's included?"
                    style={Object.assign({},iS,{resize:'vertical',lineHeight:1.7})} onFocus={foc} onBlur={blu}/>
                  <div style={{fontSize:10,color:description.length>=100?'#10b981':'#cbd5e1',marginTop:4}}>{description.length}/100 minimum</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Terms & Create */}
          {step===2&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>Review & Create</h3>
                <p style={{fontSize:13,color:'#64748b',margin:0}}>After creating, you'll add chapters and lessons in the editor</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                {/* Checklist */}
                <div style={{marginBottom:20}}>
                  {[{ok:title.length>=10,l:'Course title (10+ chars)'},{ok:!!category,l:'Category selected'},{ok:parseFloat(price)>=20,l:'Price set ($20+)'},{ok:description.length>=100,l:'Description (100+ chars)'},{ok:!!difficulty,l:'Difficulty level'}].map(function(c,i){
                    return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}><div style={{width:20,height:20,borderRadius:'50%',background:c.ok?'#dcfce7':'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:c.ok?'#10b981':'#dc2626'}}>{c.ok?'✓':'✗'}</div><span style={{fontSize:13,color:c.ok?'#334155':'#64748b',fontWeight:c.ok?600:400}}>{c.l}</span></div>;
                  })}
                </div>

                {/* What happens next */}
                <div style={{background:'rgba(139,92,246,.03)',border:'1px solid rgba(139,92,246,.1)',borderRadius:12,padding:'16px 20px',marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#8b5cf6',marginBottom:8}}>What happens after you create:</div>
                  <div style={{fontSize:12,color:'#475569',lineHeight:1.9}}>
                    <div>1. You'll land in the <strong>Course Editor</strong> to add chapters & lessons</div>
                    <div>2. Use the rich text editor, videos, and PDFs</div>
                    <div>3. When ready, click <strong>Submit for Review</strong></div>
                    <div>4. AI scans for quality & copyright, then admin approves</div>
                  </div>
                </div>

                {/* Terms */}
                <div style={{background:'#f8f9fb',borderRadius:12,padding:'18px 20px',marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:8}}>Creator Terms</div>
                  <div style={{fontSize:11,color:'#64748b',lineHeight:1.9}}>
                    <div>1. All content must be your own original work</div>
                    <div>2. No hate speech, illegal, or misleading content</div>
                    <div>3. Income/business courses require appropriate disclaimers</div>
                    <div>4. You indemnify SuperAdPro from content claims</div>
                    <div>5. Courses undergo AI scan + admin review before publishing</div>
                    <div>6. All sales are final — no refunds</div>
                  </div>
                </div>

                <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',padding:'14px 16px',borderRadius:12,border:agreedTerms?'2px solid #8b5cf6':'2px solid #e8ecf2',background:agreedTerms?'rgba(139,92,246,.02)':'transparent',transition:'all .15s'}}>
                  <input type="checkbox" checked={agreedTerms} onChange={function(){setAgreedTerms(!agreedTerms);}} style={{marginTop:2,accentColor:'#8b5cf6',width:18,height:18}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'#0f172a',lineHeight:1.6}}>I agree to the Creator Terms and confirm my content is original</span>
                </label>
              </div>
            </div>
          )}

          {/* Nav */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:20,paddingBottom:30}}>
            {step>0?<button onClick={function(){setError('');setStep(step-1);}} style={{display:'flex',alignItems:'center',gap:4,padding:'12px 24px',borderRadius:10,border:'2px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><ChevronLeft size={16}/>Back</button>:<div/>}
            {step<2?<button onClick={nextStep} style={{display:'flex',alignItems:'center',gap:4,padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 14px rgba(139,92,246,.25)'}}>Continue<ChevronRight size={16}/></button>:(
              <button onClick={handleCreate} disabled={saving||!agreedTerms} style={{display:'flex',alignItems:'center',gap:6,padding:'14px 32px',borderRadius:10,border:'none',cursor:(saving||!agreedTerms)?'default':'pointer',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,background:(saving||!agreedTerms)?'#cbd5e1':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',boxShadow:(saving||!agreedTerms)?'none':'0 4px 16px rgba(139,92,246,.3)'}}>
                {saving?'Creating...':<><Sparkles size={16}/>Create Course</>}
              </button>)}
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div style={{position:'sticky',top:24}}>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Live Preview</div>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.06)'}}>
            <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#172554,#172554)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
              {bannerUrl?<img src={bannerUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<div style={{fontSize:36,opacity:.15}}>{catObj?catObj.icon:'🎓'}</div>}
              <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',borderRadius:8,padding:'4px 10px'}}>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff'}}>${parseFloat(price||0).toFixed(0)||'0'}</span>
              </div>
              <div style={{position:'absolute',bottom:8,left:8,display:'flex',gap:3}}>
                <span style={{fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(139,92,246,.85)',color:'#fff'}}>100% Commission</span>
                {difficulty&&<span style={{fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(255,255,255,.2)',color:'#fff',textTransform:'capitalize'}}>{difficulty}</span>}
              </div>
            </div>
            <div style={{padding:'16px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:3,lineHeight:1.3}}>{title||'Your Course Title'}</div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>by You</div>
              <div style={{fontSize:12,color:'#475569',lineHeight:1.6,marginBottom:10}}>{shortDesc||'Your one-line summary appears here'}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                {catObj&&<span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'#f1f5f9',color:'#64748b'}}>{catObj.icon} {catObj.label}</span>}
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div style={{marginTop:12,background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #ddd6fe',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#8b5cf6',marginBottom:6}}>💰 100% Pass-Up System</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:900,color:'#8b5cf6'}}>${parseFloat(price||0).toFixed(0)}</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:4,lineHeight:1.6}}>per kept sale (1st, 3rd, 5th...). Even sales pass up to your sponsor. No platform fees.</div>
          </div>

          {/* What's next */}
          <div style={{marginTop:12,background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#334155',marginBottom:8}}>After Creating:</div>
            {['Add chapters & lessons','Rich text + video content','Submit for AI review','Admin approves → live'].map(function(s,i){
              return <div key={i} style={{display:'flex',gap:6,padding:'3px 0',fontSize:11,color:'#64748b'}}><span style={{color:'#8b5cf6',fontWeight:800}}>{i+1}.</span>{s}</div>;
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
