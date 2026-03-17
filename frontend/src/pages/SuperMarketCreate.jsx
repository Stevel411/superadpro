import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiPost } from '../utils/api';
import { Package, DollarSign, Tag, Image, Upload, Plus, Trash2, AlertTriangle, Shield, CheckCircle, FileText, Video, Link as LinkIcon, ChevronRight, ChevronLeft, Sparkles, Star, ArrowRight } from 'lucide-react';

var CATEGORIES = [
  {key:'ebook',label:'eBooks & Guides',icon:'📘',desc:'PDF guides, ebooks, reports'},
  {key:'template',label:'Templates',icon:'📋',desc:'Canva, Notion, spreadsheets'},
  {key:'software',label:'Software & Tools',icon:'💻',desc:'Apps, plugins, scripts'},
  {key:'audio',label:'Audio & Music',icon:'🎵',desc:'Beats, sound effects, podcasts'},
  {key:'graphics',label:'Graphics & Design',icon:'🎨',desc:'Logos, mockups, assets'},
  {key:'video',label:'Video Content',icon:'🎬',desc:'Tutorials, stock footage'},
  {key:'swipefile',label:'Swipe Files',icon:'📝',desc:'Email copy, ad templates'},
  {key:'plr',label:'PLR Products',icon:'📦',desc:'Resellable content packs'},
  {key:'other',label:'Other',icon:'🔗',desc:'Anything digital'},
];

var STEPS = [
  {key:'basics',label:'Product Info',num:1},
  {key:'content',label:'Sales Page',num:2},
  {key:'files',label:'Upload Files',num:3},
  {key:'review',label:'Review & Submit',num:4},
];

export default function SuperMarketCreate() {
  var [step, setStep] = useState(0);
  var [title, setTitle] = useState('');
  var [shortDesc, setShortDesc] = useState('');
  var [description, setDescription] = useState('');
  var [price, setPrice] = useState('');
  var [comparePrice, setComparePrice] = useState('');
  var [category, setCategory] = useState('');
  var [tags, setTags] = useState('');
  var [videoUrl, setVideoUrl] = useState('');
  var [demoUrl, setDemoUrl] = useState('');
  var [bannerUrl, setBannerUrl] = useState('');
  var [features, setFeatures] = useState(['','','']);
  var [mainFile, setMainFile] = useState(null);
  var [bonusFile, setBonusFile] = useState(null);
  var [agreedTerms, setAgreedTerms] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();

  function handleBannerUpload(e) { var f=e.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(ev){setBannerUrl(ev.target.result);}; r.readAsDataURL(f); }
  function handleFileUpload(e, type) { var f=e.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(ev){ if(type==='main') setMainFile({data:ev.target.result,name:f.name,size:f.size}); else setBonusFile({data:ev.target.result,name:f.name,size:f.size}); }; r.readAsDataURL(f); }
  function addFeature(){setFeatures(function(f){return f.concat(['']);});}
  function updateFeature(idx,val){setFeatures(function(f){return f.map(function(v,i){return i===idx?val:v;});});}
  function removeFeature(idx){setFeatures(function(f){return f.filter(function(v,i){return i!==idx;});});}

  function nextStep() {
    setError('');
    if (step===0) {
      if (!title.trim()||title.length<5){setError('Product title must be at least 5 characters');return;}
      if (!category){setError('Please select a category');return;}
      var p=parseFloat(price); if(!p||p<5){setError('Minimum price is $5');return;}
    }
    if (step===1 && (!description||description.length<50)){setError('Sales page description must be at least 50 characters');return;}
    if (step===2 && !mainFile){setError('Product file is required — this is what buyers download');return;}
    setStep(step+1);
  }
  function prevStep(){setError('');setStep(step-1);}

  function handleCreate() {
    if (!agreedTerms){setError('You must agree to the Seller Terms');return;}
    setSaving(true); setError('');
    apiPost('/api/supermarket/products', {
      title:title.trim(), short_description:shortDesc.trim(), description:description,
      price:parseFloat(price), compare_price:parseFloat(comparePrice)||null,
      category:category, tags:tags, video_url:videoUrl, demo_url:demoUrl, banner_url:bannerUrl,
      features:features.filter(function(f){return f.trim();}), agreed_terms:true,
    }).then(function(r) {
      if (!r.ok){setError(r.error||'Failed');setSaving(false);return;}
      var pid = r.product_id;
      var uploads = [];
      if (mainFile) uploads.push(apiPost('/api/supermarket/products/'+pid+'/upload', {type:'main',data:mainFile.data,name:mainFile.name,size:mainFile.size}));
      if (bonusFile) uploads.push(apiPost('/api/supermarket/products/'+pid+'/upload', {type:'bonus',data:bonusFile.data,name:bonusFile.name,size:bonusFile.size}));
      Promise.all(uploads).then(function(){
        // Auto-submit for review
        apiPost('/api/supermarket/products/'+pid+'/submit',{}).then(function(){navigate('/marketplace');}).catch(function(){navigate('/marketplace');});
      }).catch(function(){navigate('/marketplace');});
    }).catch(function(e){setError(e.message||'Failed');setSaving(false);});
  }

  var currentStep = STEPS[step];
  var progress = ((step+1)/STEPS.length)*100;

  return (
    <AppLayout title="Sell a Product" subtitle="List your digital product on SuperMarket">
      <div style={{maxWidth:780,margin:'0 auto'}}>

        {/* Progress bar */}
        <div style={{marginBottom:32}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            {STEPS.map(function(s,i) {
              var done=i<step; var active=i===step;
              return (
                <div key={s.key} style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                  <div style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:14,fontWeight:800,fontFamily:'Sora,sans-serif',flexShrink:0,transition:'all .3s',
                    background:done?'#0ea5e9':active?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'#e8ecf2',
                    color:done||active?'#fff':'#94a3b8',boxShadow:active?'0 4px 16px rgba(14,165,233,.35)':'none'}}>
                    {done?'✓':s.num}
                  </div>
                  <div style={{display:i===STEPS.length-1?'none':'block',flex:1,height:3,borderRadius:2,background:done?'#0ea5e9':'#e8ecf2',transition:'all .3s'}}/>
                </div>
              );
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            {STEPS.map(function(s,i) {
              var active=i===step;
              return <span key={s.key} style={{fontSize:11,fontWeight:active?800:500,color:active?'#0ea5e9':'#94a3b8',flex:1,textAlign:i===0?'left':i===STEPS.length-1?'right':'center'}}>{s.label}</span>;
            })}
          </div>
        </div>

        {error && <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',background:'#fef2f2',borderRadius:10,border:'1px solid #fecaca',marginBottom:20}}><AlertTriangle size={16} color="#dc2626"/><div style={{fontSize:13,fontWeight:700,color:'#dc2626'}}>{error}</div></div>}

        {/* STEP 1: Product basics */}
        {step===0 && (
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.06)'}}>
            <div style={{background:'linear-gradient(135deg,#042a36,#0c1e4a)',padding:'24px 32px'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:'Sora,sans-serif'}}>What are you selling?</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:4}}>Tell us about your digital product</div>
            </div>
            <div style={{padding:'32px'}}>
              {/* Title */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Product Title</label>
                <input value={title} onChange={function(e){setTitle(e.target.value);}}
                  placeholder="e.g. Social Media Template Pack Pro"
                  style={{width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box',transition:'border .2s'}}
                  onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
              </div>

              {/* Category grid */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Category</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {CATEGORIES.map(function(cat) {
                    var on=category===cat.key;
                    return (
                      <button key={cat.key} onClick={function(){setCategory(cat.key);}}
                        style={{padding:'14px 12px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',textAlign:'left',
                          border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',
                          background:on?'rgba(14,165,233,.04)':'#fff',transition:'all .15s'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:22}}>{cat.icon}</span>
                          <div>
                            <div style={{fontSize:13,fontWeight:on?800:600,color:on?'#0ea5e9':'#0f172a'}}>{cat.label}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{cat.desc}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Price</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:16,top:14,fontSize:16,fontWeight:800,color:'#94a3b8'}}>$</span>
                    <input type="number" min="5" value={price} onChange={function(e){setPrice(e.target.value);}}
                      placeholder="27"
                      style={{width:'100%',padding:'14px 18px 14px 32px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:18,fontWeight:800,fontFamily:'Sora,sans-serif',outline:'none',boxSizing:'border-box'}}
                      onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
                  </div>
                  <div style={{fontSize:11,color:'#16a34a',fontWeight:700,marginTop:6}}>You earn 50% = ${((parseFloat(price)||0)*0.5).toFixed(2)} per sale</div>
                </div>
                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Compare Price <span style={{fontWeight:400,color:'#94a3b8'}}>(optional)</span></label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:16,top:14,fontSize:16,fontWeight:800,color:'#94a3b8'}}>$</span>
                    <input type="number" value={comparePrice} onChange={function(e){setComparePrice(e.target.value);}}
                      placeholder="97"
                      style={{width:'100%',padding:'14px 18px 14px 32px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:18,fontWeight:800,fontFamily:'Sora,sans-serif',outline:'none',boxSizing:'border-box'}}
                      onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
                  </div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:6}}>Shows "Was $97" on the product page</div>
                </div>
              </div>

              {/* Short description */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Short Description</label>
                <input value={shortDesc} onChange={function(e){setShortDesc(e.target.value);}} maxLength={200}
                  placeholder="One line that makes people click — shown on product cards"
                  style={{width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                  onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textAlign:'right'}}>{shortDesc.length}/200</div>
              </div>

              {/* Tags */}
              <div>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Tags <span style={{fontWeight:400,color:'#94a3b8'}}>(comma separated)</span></label>
                <input value={tags} onChange={function(e){setTags(e.target.value);}}
                  placeholder="marketing, templates, social media, canva"
                  style={{width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                  onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Sales page content */}
        {step===1 && (
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.06)'}}>
            <div style={{background:'linear-gradient(135deg,#042a36,#0c1e4a)',padding:'24px 32px'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:'Sora,sans-serif'}}>Create Your Sales Page</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:4}}>This is what buyers see — make it compelling</div>
            </div>
            <div style={{padding:'32px'}}>

              {/* Banner */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Product Banner</label>
                {bannerUrl ? (
                  <div style={{width:'100%',height:200,borderRadius:14,marginBottom:8,backgroundImage:'url('+bannerUrl+')',backgroundSize:'cover',backgroundPosition:'center',position:'relative',border:'2px solid #e8ecf2'}}>
                    <button onClick={function(){setBannerUrl('');}} style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.7)',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                  </div>
                ) : (
                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'40px',borderRadius:14,border:'2px dashed #d1d5db',background:'#fafbfc',cursor:'pointer',transition:'all .2s'}}
                    onMouseEnter={function(e){e.currentTarget.style.borderColor='#0ea5e9';e.currentTarget.style.background='rgba(14,165,233,.02)';}}
                    onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='#fafbfc';}}>
                    <div style={{width:48,height:48,borderRadius:12,background:'rgba(14,165,233,.08)',display:'flex',alignItems:'center',justifyContent:'center'}}><Image size={24} color="#0ea5e9"/></div>
                    <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Upload product banner</div>
                    <div style={{fontSize:12,color:'#94a3b8'}}>1280×720px recommended · JPG, PNG, or WebP</div>
                    <input type="file" accept="image/*" onChange={handleBannerUpload} style={{display:'none'}}/>
                  </label>
                )}
              </div>

              {/* Sales video */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Sales Video <span style={{fontWeight:400,color:'#94a3b8'}}>(optional — highly recommended)</span></label>
                <input value={videoUrl} onChange={function(e){setVideoUrl(e.target.value);}}
                  placeholder="https://youtube.com/watch?v=... or Vimeo URL"
                  style={{width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                  onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
              </div>

              {/* Rich text sales page */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Product Description</label>
                <RichTextEditor content={description} onChange={setDescription} placeholder="Describe your product in detail — what's included, who it's for, what problem it solves. Use headings, bullet points, and images to make it compelling..."/>
              </div>

              {/* Feature bullets */}
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Key Features</label>
                  <button onClick={addFeature} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:700,padding:'6px 12px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',color:'#0ea5e9',cursor:'pointer',fontFamily:'inherit'}}><Plus size={12}/> Add</button>
                </div>
                {features.map(function(f,i) {
                  return (
                    <div key={i} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                      <div style={{width:24,height:24,borderRadius:6,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><CheckCircle size={14} color="#16a34a"/></div>
                      <input value={f} onChange={function(e){updateFeature(i,e.target.value);}}
                        placeholder="e.g. 50+ ready-to-use templates"
                        style={{flex:1,padding:'12px 16px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                        onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
                      {features.length>1 && <button onClick={function(){removeFeature(i);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:4}}><Trash2 size={16}/></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Upload files */}
        {step===2 && (
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.06)'}}>
            <div style={{background:'linear-gradient(135deg,#042a36,#0c1e4a)',padding:'24px 32px'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:'Sora,sans-serif'}}>Upload Your Product Files</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:4}}>These are delivered instantly after purchase</div>
            </div>
            <div style={{padding:'32px'}}>
              {/* Main file */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Main Product File <span style={{color:'#dc2626'}}>*</span></label>
                <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'48px 24px',borderRadius:14,
                  border:mainFile?'2px solid #16a34a':'2px dashed #d1d5db',
                  background:mainFile?'#f0fdf4':'#fafbfc',cursor:'pointer',transition:'all .2s'}}
                  onMouseEnter={function(e){if(!mainFile)e.currentTarget.style.borderColor='#0ea5e9';}}
                  onMouseLeave={function(e){if(!mainFile)e.currentTarget.style.borderColor='#d1d5db';}}>
                  <div style={{width:56,height:56,borderRadius:14,background:mainFile?'rgba(22,163,74,.1)':'rgba(14,165,233,.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {mainFile ? <CheckCircle size={28} color="#16a34a"/> : <Upload size={28} color="#0ea5e9"/>}
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:15,fontWeight:700,color:mainFile?'#16a34a':'#0f172a'}}>{mainFile?mainFile.name:'Click to upload your product file'}</div>
                    <div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>{mainFile?Math.round(mainFile.size/1024)+'KB · Click to change':'PDF, ZIP, MP4, MP3, or any digital file'}</div>
                  </div>
                  <input type="file" onChange={function(e){handleFileUpload(e,'main');}} style={{display:'none'}}/>
                </label>
              </div>

              {/* Bonus file */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Bonus File <span style={{fontWeight:400,color:'#94a3b8'}}>(optional — increases perceived value)</span></label>
                <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'32px 24px',borderRadius:14,
                  border:bonusFile?'2px solid #8b5cf6':'2px dashed #d1d5db',
                  background:bonusFile?'rgba(139,92,246,.04)':'#fafbfc',cursor:'pointer'}}
                  onMouseEnter={function(e){if(!bonusFile)e.currentTarget.style.borderColor='#8b5cf6';}}
                  onMouseLeave={function(e){if(!bonusFile)e.currentTarget.style.borderColor='#d1d5db';}}>
                  <div style={{width:44,height:44,borderRadius:12,background:bonusFile?'rgba(139,92,246,.1)':'rgba(139,92,246,.06)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {bonusFile ? <CheckCircle size={22} color="#8b5cf6"/> : <Sparkles size={22} color="#8b5cf6"/>}
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:14,fontWeight:700,color:bonusFile?'#8b5cf6':'#0f172a'}}>{bonusFile?bonusFile.name:'Upload a bonus file'}</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{bonusFile?Math.round(bonusFile.size/1024)+'KB':'Checklists, cheat sheets, extra resources'}</div>
                  </div>
                  <input type="file" onChange={function(e){handleFileUpload(e,'bonus');}} style={{display:'none'}}/>
                </label>
              </div>

              {/* Demo link */}
              <div>
                <label style={{fontSize:13,fontWeight:700,color:'#0f172a',display:'block',marginBottom:8}}>Demo / Preview Link <span style={{fontWeight:400,color:'#94a3b8'}}>(optional)</span></label>
                <input value={demoUrl} onChange={function(e){setDemoUrl(e.target.value);}}
                  placeholder="Link where buyers can preview your product"
                  style={{width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
                  onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step===3 && (
          <div>
            {/* Summary card */}
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.06)',marginBottom:20}}>
              <div style={{background:'linear-gradient(135deg,#042a36,#0c1e4a)',padding:'24px 32px'}}>
                <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:'Sora,sans-serif'}}>Review Your Product</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:4}}>Check everything looks good before submitting</div>
              </div>
              <div style={{padding:'32px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                  <div>
                    {bannerUrl && <div style={{width:'100%',height:140,borderRadius:10,marginBottom:16,backgroundImage:'url('+bannerUrl+')',backgroundSize:'cover',backgroundPosition:'center'}}/>}
                    <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:4}}>{title}</div>
                    <div style={{fontSize:13,color:'#94a3b8',marginBottom:8}}>{shortDesc}</div>
                    <div style={{display:'flex',gap:6}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'#f1f5f9',color:'#64748b'}}>{category}</span>
                      {mainFile && <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'#dcfce7',color:'#16a34a'}}>✓ File uploaded</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{background:'#f8f9fb',borderRadius:12,padding:20}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                        <span style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:900,color:'#0f172a'}}>${parseFloat(price||0).toFixed(0)}</span>
                        {comparePrice && <span style={{fontSize:16,color:'#94a3b8',textDecoration:'line-through'}}>${parseFloat(comparePrice).toFixed(0)}</span>}
                      </div>
                      <div style={{fontSize:12,color:'#475569',lineHeight:1.8}}>
                        <div>Creator earnings: <strong style={{color:'#16a34a'}}>${((parseFloat(price)||0)*0.5).toFixed(2)}</strong> (50%)</div>
                        <div>Affiliate earnings: <strong style={{color:'#0ea5e9'}}>${((parseFloat(price)||0)*0.25).toFixed(2)}</strong> (25%)</div>
                        <div>Platform: <strong>${((parseFloat(price)||0)*0.25).toFixed(2)}</strong> (25%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.06)'}}>
              <div style={{padding:'24px 32px'}}>
                <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚖️ Seller Terms & Agreement</div>
                <div style={{fontSize:12,color:'#475569',lineHeight:1.9,marginBottom:16,padding:'16px 20px',background:'#f8f9fb',borderRadius:10}}>
                  <div style={{marginBottom:6}}><strong>1. Original Content:</strong> Your product must be original or properly licensed for resale.</div>
                  <div style={{marginBottom:6}}><strong>2. No Prohibited Content:</strong> No illegal, harmful, or misleading material.</div>
                  <div style={{marginBottom:6}}><strong>3. Indemnification:</strong> You indemnify SuperAdPro from claims arising from your product.</div>
                  <div style={{marginBottom:6}}><strong>4. Review Process:</strong> Products undergo AI scan + admin review before publishing.</div>
                  <div><strong>5. Refund Policy:</strong> 30-day refunds — commissions deducted from your balance.</div>
                </div>
                <label style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',padding:'14px 16px',borderRadius:10,border:agreedTerms?'2px solid #0ea5e9':'2px solid #e8ecf2',background:agreedTerms?'rgba(14,165,233,.03)':'transparent',transition:'all .2s'}}>
                  <input type="checkbox" checked={agreedTerms} onChange={function(){setAgreedTerms(!agreedTerms);}} style={{marginTop:2,accentColor:'#0ea5e9',width:20,height:20}}/>
                  <span style={{fontSize:13,fontWeight:700,color:'#0f172a',lineHeight:1.6}}>I confirm all content is original/licensed, I agree to the Seller Terms, and I understand my product will be reviewed before publishing.</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:24,paddingBottom:40}}>
          {step > 0 ? (
            <button onClick={prevStep} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 24px',borderRadius:10,border:'2px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              <ChevronLeft size={16}/> Back
            </button>
          ) : <div/>}
          {step < 3 ? (
            <button onClick={nextStep} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 32px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(14,165,233,.3)'}}>
              Continue <ChevronRight size={16}/>
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving||!agreedTerms}
              style={{display:'flex',alignItems:'center',gap:8,padding:'14px 36px',borderRadius:10,border:'none',
                cursor:(saving||!agreedTerms)?'default':'pointer',fontFamily:'inherit',fontSize:15,fontWeight:800,
                background:(saving||!agreedTerms)?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',
                boxShadow:(saving||!agreedTerms)?'none':'0 4px 16px rgba(22,163,74,.3)'}}>
              {saving ? 'Publishing...' : <><Sparkles size={16}/> List on SuperMarket</>}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
