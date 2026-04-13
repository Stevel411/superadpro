import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiPost } from '../utils/api';
import { Package, DollarSign, Tag, Image, Upload, Plus, Trash2, AlertTriangle, Shield, CheckCircle, Video, Link as LinkIcon, ChevronRight, ChevronLeft, Sparkles, Star, Eye } from 'lucide-react';
import { formatMoney } from '../utils/money';

var CATEGORIES = [
  {key:'ebook',label:'eBooks & Guides',icon:'📘'},
  {key:'template',label:'Templates',icon:'📋'},
  {key:'software',label:'Software & Tools',icon:'💻'},
  {key:'audio',label:'Audio & Music',icon:'🎵'},
  {key:'graphics',label:'Graphics & Design',icon:'🎨'},
  {key:'video',label:'Video Content',icon:'🎬'},
  {key:'swipefile',label:'Swipe Files',icon:'📝'},
  {key:'plr',label:'PLR Products',icon:'📦'},
  {key:'other',label:'Other',icon:'🔗'},
];

var STEPS = [{key:'basics',label:'Product',num:1},{key:'content',label:'Sales Page',num:2},{key:'files',label:'Files',num:3},{key:'review',label:'Submit',num:4}];

export default function SuperMarketCreate() {
  var { t } = useTranslation();
  var [step, setStep] = useState(0);
  var [title, setTitle] = useState('');
  var [shortDesc, setShortDesc] = useState('');
  var [description, setDescription] = useState('');
  var [price, setPrice] = useState('');
  var [comparePrice, setComparePrice] = useState('');
  var [category, setCategory] = useState('');
  var [tags, setTags] = useState('');
  var [videoUrl, setVideoUrl] = useState('');
  var [bannerUrl, setBannerUrl] = useState('');
  var [features, setFeatures] = useState(['','','']);
  var [mainFile, setMainFile] = useState(null);
  var [bonusFile, setBonusFile] = useState(null);
  var [agreedTerms, setAgreedTerms] = useState(false);
  var [saving, setSaving] = useState(false);
  var [success, setSuccess] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();

  function handleBanner(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){setBannerUrl(ev.target.result);};r.readAsDataURL(f);}
  function handleFile(e,t){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){if(t==='main')setMainFile({data:ev.target.result,name:f.name,size:f.size});else setBonusFile({data:ev.target.result,name:f.name,size:f.size});};r.readAsDataURL(f);}

  function nextStep(){
    setError('');
    if(step===0){if(!title.trim()||title.length<5){setError('Product title must be at least 5 characters');return;}if(!category){setError('Please select a category');return;}if(!parseFloat(price)||parseFloat(price)<5){setError('Minimum price is $5');return;}}
    if(step===1&&(!description||description.replace(/<[^>]+>/g,'').trim().length<50)){setError('Sales page needs at least 50 characters of content');return;}
    if(step===2&&!mainFile){setError('Upload the product file your buyers will download');return;}
    setStep(step+1);
  }

  function handleCreate(){
    if(!agreedTerms){setError('You must agree to the Seller Terms');return;}
    setSaving(true);setError('');
    apiPost('/api/supermarket/products',{title:title.trim(),short_description:shortDesc.trim(),description:description,price:parseFloat(price),compare_price:parseFloat(comparePrice)||null,category:category,tags:tags,video_url:videoUrl,features:features.filter(function(f){return f.trim();}),agreed_terms:true}).then(function(r){
      if(!r.ok){setError(r.error||'Failed');setSaving(false);return;}
      var pid=r.product_id;var ups=[];
      if(bannerUrl)ups.push(apiPost('/api/supermarket/products/'+pid+'/upload',{type:'banner',data:bannerUrl,name:'banner'}).catch(function(){}));
      if(mainFile)ups.push(apiPost('/api/supermarket/products/'+pid+'/upload',{type:'main',data:mainFile.data,name:mainFile.name,size:mainFile.size}).catch(function(){}));
      if(bonusFile)ups.push(apiPost('/api/supermarket/products/'+pid+'/upload',{type:'bonus',data:bonusFile.data,name:bonusFile.name,size:bonusFile.size}).catch(function(){}));
      Promise.all(ups).then(function(){
        apiPost('/api/supermarket/products/'+pid+'/submit',{}).then(function(sr){if(sr.ok)setSuccess(true);else setError('Product created! Submit failed: '+(sr.error||''));setSaving(false);}).catch(function(){setError('Product saved as draft. Submit from My Products later.');setSaving(false);});
      }).catch(function(){setSaving(false);});
    }).catch(function(e){setError(e.message||'Failed');setSaving(false);});
  }

  var catObj = CATEGORIES.find(function(c){return c.key===category;});
  var iS = {width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff',transition:'border .2s'};
  function focusStyle(e){e.target.style.borderColor='var(--sap-accent)';}
  function blurStyle(e){e.target.style.borderColor='var(--sap-border-light)';}

  if(success) return(
    <AppLayout title={t('superMarketCreate.title')} subtitle={t('superMarketCreate.productSubmitted')}>
      <div style={{maxWidth:600,margin:'40px auto',textAlign:'center'}}>
        <div style={{width:88,height:88,borderRadius:'50%',background:'linear-gradient(135deg,#dcfce7,#bbf7d0)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:40}}>🎉</div>
        <h2 style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'var(--sap-text-primary)',margin:'0 0 12px'}}>{t('superMarketCreate.productSubmitted')}</h2>
        <p style={{fontSize:15,color:'var(--sap-text-muted)',lineHeight:1.8,maxWidth:440,margin:'0 auto 28px'}}>{t("superMarketCreate.productReviewDesc")}</p>
        <div style={{background:'var(--sap-bg-input)',borderRadius:14,padding:'20px 24px',maxWidth:400,margin:'0 auto 28px',textAlign:'left'}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:10}}>{t('superMarketCreate.whatHappensNext')}</div>
          {['AI scans content for quality & compliance','Admin reviews your product listing','You get notified when it goes live','Affiliates start promoting your product'].map(function(s,i){
            return <div key={i} style={{display:'flex',gap:10,padding:'6px 0',fontSize:13,color:'var(--sap-text-secondary)'}}><div style={{width:22,height:22,borderRadius:'50%',background:'var(--sap-accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0}}>{i+1}</div>{s}</div>;
          })}
        </div>
        <button onClick={function(){navigate('/marketplace');}} style={{padding:'14px 36px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 20px rgba(14,165,233,.3)'}}>{t('superMarketCreate.goToSuperMarket')}</button>
      </div>
    </AppLayout>
  );

  return(
    <AppLayout title={t('superMarketCreate.sellProduct')} subtitle={t('superMarketCreate.listOnSuperMarket')}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24,maxWidth:1100,margin:'0 auto',alignItems:'start'}}>

        {/* LEFT — Form wizard */}
        <div>
          {/* Step indicator */}
          <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:28}}>
            {STEPS.map(function(s,i){
              var done=i<step;var on=i===step;
              return(<div key={s.key} style={{display:'flex',alignItems:'center',flex:1}}>
                <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,
                  background:done?'var(--sap-accent)':on?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'var(--sap-border-light)',
                  color:done||on?'#fff':'var(--sap-text-muted)',boxShadow:on?'0 4px 14px rgba(14,165,233,.3)':'none',transition:'all .3s'}}>
                  {done?'✓':s.num}
                </div>
                {i<STEPS.length-1&&<div style={{flex:1,height:2,background:done?'var(--sap-accent)':'var(--sap-border-light)',margin:'0 6px',transition:'all .3s'}}/>}
              </div>);
            })}
          </div>

          {error&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',background:'linear-gradient(135deg,#fef2f2,#fff1f2)',borderRadius:12,border:'1px solid #fecaca',marginBottom:20}}><AlertTriangle size={16} color="var(--sap-red)"/><div style={{fontSize:13,fontWeight:600,color:'var(--sap-red)'}}>{error}</div></div>}

          {/* STEP 1 */}
          {step===0&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('superMarketCreate.whatAreYouSelling')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t("superMarketCreate.startWithBasics")}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}><label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('superMarketCreate.productName')}</label><input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder={t("superMarketCreate.productNamePlaceholder")} style={iS} onFocus={focusStyle} onBlur={blurStyle}/></div>

                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('superMarketCreate.category')}</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {CATEGORIES.map(function(c){var on=category===c.key;return(
                      <button key={c.key} onClick={function(){setCategory(c.key);}} style={{padding:'12px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',textAlign:'center',border:on?'2px solid #0ea5e9':'2px solid #f1f3f7',background:on?'rgba(14,165,233,.04)':'#fafbfc',transition:'all .15s'}}>
                        <div style={{fontSize:20,marginBottom:2}}>{c.icon}</div>
                        <div style={{fontSize:11,fontWeight:on?800:600,color:on?'var(--sap-accent)':'var(--sap-text-muted)'}}>{c.label}</div>
                      </button>);
                    })}
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:22}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('superMarketCreate.priceLabel')}</label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:16,top:14,fontSize:18,fontWeight:800,color:'var(--sap-text-ghost)'}}>$</span><input type="number" min="5" value={price} onChange={function(e){setPrice(e.target.value);}} placeholder="27" style={Object.assign({},iS,{paddingLeft:34,fontSize:20,fontWeight:800,fontFamily:'Sora,sans-serif'})} onFocus={focusStyle} onBlur={blurStyle}/></div>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Compare Price <span style={{color:'var(--sap-text-ghost)',fontWeight:400}}>{t('superMarketCreate.optional')}</span></label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:16,top:14,fontSize:18,fontWeight:800,color:'var(--sap-text-ghost)'}}>$</span><input type="number" value={comparePrice} onChange={function(e){setComparePrice(e.target.value);}} placeholder="97" style={Object.assign({},iS,{paddingLeft:34,fontSize:20,fontWeight:800,fontFamily:'Sora,sans-serif'})} onFocus={focusStyle} onBlur={blurStyle}/></div>
                  </div>
                </div>

                <div style={{marginBottom:22}}><label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('superMarketCreate.oneLineSummary')}</label><input value={shortDesc} onChange={function(e){setShortDesc(e.target.value);}} maxLength={200} placeholder={t("superMarketCreate.hookPlaceholder")} style={iS} onFocus={focusStyle} onBlur={blurStyle}/><div style={{textAlign:'right',fontSize:10,color:'var(--sap-text-ghost)',marginTop:4}}>{shortDesc.length}/200</div></div>

                <div><label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Tags <span style={{color:'var(--sap-text-ghost)',fontWeight:400}}>{t('superMarketCreate.commaSeparated')}</span></label><input value={tags} onChange={function(e){setTags(e.target.value);}} placeholder={t('superMarketCreate.tagsPlaceholder')} style={iS} onFocus={focusStyle} onBlur={blurStyle}/></div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step===1&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('superMarketCreate.buildSalesPage')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t("superMarketCreate.convinceDesc")}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('superMarketCreate.productBanner')}</label>
                  {bannerUrl?(<div style={{width:'100%',height:180,borderRadius:12,backgroundImage:'url('+bannerUrl+')',backgroundSize:'cover',backgroundPosition:'center',position:'relative',marginBottom:8}}><button onClick={function(){setBannerUrl('');}} style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.6)',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div>):(
                    <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'36px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',transition:'all .2s'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-accent)';e.currentTarget.style.background='rgba(14,165,233,.02)';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='transparent';}}>
                      <Image size={28} color="var(--sap-accent)"/><div style={{fontSize:14,fontWeight:600,color:'var(--sap-text-secondary)'}}>{t('superMarketCreate.dropImageUpload')}</div><div style={{fontSize:11,color:'var(--sap-text-ghost)'}}>{t('superMarketCreate.recommendedSize')}</div><input type="file" accept="image/*" onChange={handleBanner} style={{display:'none'}}/>
                    </label>)}
                </div>
                <div style={{marginBottom:22}}><label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Sales Video <span style={{color:'var(--sap-text-ghost)',fontWeight:400}}>{t('superMarketCreate.optional')}</span></label><input value={videoUrl} onChange={function(e){setVideoUrl(e.target.value);}} placeholder={t('superMarketCreate.videoUrlPlaceholder')} style={iS} onFocus={focusStyle} onBlur={blurStyle}/></div>
                <div style={{marginBottom:22}}><label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>{t('superMarketCreate.productDescription')}</label><RichTextEditor content={description} onChange={setDescription} placeholder={t('superMarketCreate.descPlaceholderFull')}/></div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><label style={{fontSize:13,fontWeight:700,color:'#334155'}}>{t('superMarketCreate.features')}</label><button onClick={function(){setFeatures(features.concat(['']));}} style={{fontSize:11,fontWeight:700,padding:'5px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'var(--sap-accent)',cursor:'pointer',fontFamily:'inherit'}}>{t('superMarketCreate.addFeature')}</button></div>
                  {features.map(function(f,i){return(<div key={i} style={{display:'flex',gap:6,marginBottom:5}}><CheckCircle size={18} color="var(--sap-green-mid)" style={{marginTop:10,flexShrink:0}}/><input value={f} onChange={function(e){setFeatures(features.map(function(v,j){return j===i?e.target.value:v;}));}} placeholder={t('superMarketCreate.featurePlaceholderFull')} style={Object.assign({},iS,{flex:1})} onFocus={focusStyle} onBlur={blurStyle}/>{features.length>1&&<button onClick={function(){setFeatures(features.filter(function(v,j){return j!==i;}));}} style={{color:'var(--sap-red)',background:'none',border:'none',cursor:'pointer',marginTop:8}}><Trash2 size={14}/></button>}</div>);})}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step===2&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('superMarketCreate.uploadFiles')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t('superMarketCreate.deliveredInstantly')}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                <div style={{marginBottom:22}}>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Product File <span style={{color:'var(--sap-red)'}}>*</span></label>
                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'44px 20px',borderRadius:14,border:mainFile?'2px solid #10b981':'2px dashed #d1d5db',background:mainFile?'var(--sap-green-bg)':'#fafbfc',cursor:'pointer',transition:'all .2s'}}>
                    {mainFile?<CheckCircle size={32} color="var(--sap-green-mid)"/>:<Upload size={32} color="var(--sap-accent)"/>}
                    <div style={{fontSize:15,fontWeight:700,color:mainFile?'var(--sap-green-mid)':'var(--sap-text-secondary)'}}>{mainFile?mainFile.name:'Click to upload product file'}</div>
                    <div style={{fontSize:12,color:'var(--sap-text-muted)'}}>{mainFile?Math.round(mainFile.size/1024)+'KB':'PDF, ZIP, MP4, MP3 — any digital file up to 50MB'}</div>
                    <input type="file" onChange={function(e){handleFile(e,'main');}} style={{display:'none'}}/>
                  </label>
                </div>
                <div>
                  <label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>Bonus File <span style={{color:'var(--sap-text-ghost)',fontWeight:400}}>{t('superMarketCreate.optionalBonus')}</span></label>
                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'28px 20px',borderRadius:14,border:bonusFile?'2px solid #8b5cf6':'2px dashed #d1d5db',background:bonusFile?'rgba(139,92,246,.03)':'#fafbfc',cursor:'pointer'}}>
                    {bonusFile?<CheckCircle size={24} color="var(--sap-purple)"/>:<Sparkles size={24} color="var(--sap-purple)"/>}
                    <div style={{fontSize:13,fontWeight:600,color:bonusFile?'var(--sap-purple)':'var(--sap-text-secondary)'}}>{bonusFile?bonusFile.name:'Upload bonus file'}</div>
                    <input type="file" onChange={function(e){handleFile(e,'bonus');}} style={{display:'none'}}/>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step===3&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
              <div style={{padding:'28px 32px',borderBottom:'1px solid #f1f3f7'}}>
                <h3 style={{fontSize:20,fontWeight:800,color:'var(--sap-text-primary)',margin:'0 0 4px',fontFamily:'Sora,sans-serif'}}>{t('superMarketCreate.reviewSubmit')}</h3>
                <p style={{fontSize:13,color:'var(--sap-text-muted)',margin:0}}>{t('superMarketCreate.checkEverything')}</p>
              </div>
              <div style={{padding:'28px 32px'}}>
                {/* Checklist */}
                <div style={{marginBottom:20}}>
                  {[{ok:!!(title&&title.length>=5),l:'Product title'},{ok:!!category,l:'Category selected'},{ok:parseFloat(price)>=5,l:'Price set ($5+)'},{ok:description&&description.replace(/<[^>]+>/g,'').length>=50,l:'Sales description (50+ chars)'},{ok:!!mainFile,l:'Product file uploaded'},{ok:!!bannerUrl,l:'Banner image'}].map(function(c,i){
                    return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}><div style={{width:20,height:20,borderRadius:'50%',background:c.ok?'var(--sap-green-bg-mid)':'var(--sap-red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:c.ok?'var(--sap-green-mid)':'var(--sap-red)'}}>{c.ok?'✓':'✗'}</div><span style={{fontSize:13,color:c.ok?'#334155':'var(--sap-text-muted)',fontWeight:c.ok?600:400}}>{c.l}</span></div>;
                  })}
                </div>
                {/* Terms */}
                <div style={{background:'var(--sap-bg-input)',borderRadius:12,padding:'18px 20px',marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:8}}>{t('superMarketCreate.sellerTerms')}</div>
                  <div style={{fontSize:11,color:'var(--sap-text-muted)',lineHeight:1.9}}>
                    <div>{t('superMarketCreate.sellerTerm1')}</div>
                    <div>{t('superMarketCreate.sellerTerm2')}</div>
                    <div>{t('superMarketCreate.sellerTerm3')}</div>
                    <div>{t('superMarketCreate.sellerTerm4')}</div>
                    <div>{t('superMarketCreate.sellerTerm5')}</div>
                  </div>
                </div>
                <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',padding:'14px 16px',borderRadius:12,border:agreedTerms?'2px solid #0ea5e9':'2px solid #e8ecf2',background:agreedTerms?'rgba(14,165,233,.02)':'transparent',transition:'all .15s'}}>
                  <input type="checkbox" checked={agreedTerms} onChange={function(){setAgreedTerms(!agreedTerms);}} style={{marginTop:2,accentColor:'var(--sap-accent)',width:18,height:18}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--sap-text-primary)',lineHeight:1.6}}>{t('superMarketCreate.agreeTermsBody')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:20,paddingBottom:30}}>
            {step>0?<button onClick={function(){setError('');setStep(step-1);}} style={{display:'flex',alignItems:'center',gap:4,padding:'12px 24px',borderRadius:10,border:'2px solid #e8ecf2',background:'#fff',color:'var(--sap-text-muted)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><ChevronLeft size={16}/>{t('superMarketCreate.back')}</button>:<div/>}
            {step<3?<button onClick={nextStep} style={{display:'flex',alignItems:'center',gap:4,padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 14px rgba(14,165,233,.25)'}}>{t('superMarket.continue')}<ChevronRight size={16}/></button>:(
              <button onClick={handleCreate} disabled={saving||!agreedTerms} style={{display:'flex',alignItems:'center',gap:6,padding:'14px 32px',borderRadius:10,border:'none',cursor:(saving||!agreedTerms)?'default':'pointer',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,background:(saving||!agreedTerms)?'var(--sap-text-ghost)':'linear-gradient(135deg,#10b981,#34d399)',color:'#fff',boxShadow:(saving||!agreedTerms)?'none':'0 4px 16px rgba(16,185,129,.3)'}}>
                {saving?'Submitting...':<><Sparkles size={16}/>{t('superMarketCreate.listOnSuperMarket')}</>}
              </button>)}
          </div>
        </div>

        {/* RIGHT — Live Preview Card */}
        <div style={{position:'sticky',top:24}}>
          <div style={{fontSize:11,fontWeight:800,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{t('superMarketCreate.livePreview')}</div>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,.06)',transition:'all .3s'}}>
            <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
              {bannerUrl?<img src={bannerUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<div style={{fontSize:36,opacity:.15}}>{catObj?catObj.icon:'📦'}</div>}
              <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',borderRadius:8,padding:'4px 10px'}}>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff'}}>${parseFloat(price||0).toFixed(0)||'0'}</span>
                {comparePrice&&<span style={{fontSize:10,color:'rgba(255,255,255,.4)',textDecoration:'line-through',marginLeft:4}}>${parseFloat(comparePrice).toFixed(0)}</span>}
              </div>
              <div style={{position:'absolute',bottom:8,left:8,display:'flex',gap:3}}>
                <span style={{fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(22,163,74,.85)',color:'#fff'}}>{t('superMarketCreate.creatorSplit')}</span>
                <span style={{fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:3,background:'rgba(14,165,233,.85)',color:'#fff'}}>{t('superMarketCreate.affiliateSplit')}</span>
              </div>
            </div>
            <div style={{padding:'16px'}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:3,lineHeight:1.3}}>{title||'Your Product Name'}</div>
              <div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:6}}>{t('superMarketCreate.byYou')}</div>
              <div style={{fontSize:12,color:'var(--sap-text-secondary)',lineHeight:1.6,marginBottom:10}}>{shortDesc||'Your one-line summary appears here'}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                {catObj&&<span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'var(--sap-bg-page)',color:'var(--sap-text-muted)'}}>{catObj.icon} {catObj.label}</span>}
                {mainFile&&<span style={{fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:3,background:'var(--sap-green-bg-mid)',color:'var(--sap-green-mid)'}}>{t('superMarketCreate.fileReady')}</span>}
              </div>
            </div>
          </div>

          {/* Earnings preview */}
          <div style={{marginTop:12,background:'var(--sap-green-bg)',border:'1px solid #bbf7d0',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'var(--sap-green-mid)',marginBottom:6}}>{t('superMarketCreate.earningsPerSale')}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:900,color:'var(--sap-green-mid)'}}>${formatMoney((parseFloat(price)||0)*0.50)}</div>
            <div style={{fontSize:10,color:'var(--sap-text-muted)',marginTop:4}}>50% of ${parseFloat(price||0).toFixed(0)} · Affiliate gets ${formatMoney((parseFloat(price)||0)*0.25)}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
