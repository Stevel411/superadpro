import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiPost } from '../utils/api';
import { Package, DollarSign, Tag, Image, Upload, Plus, Trash2, AlertTriangle, Shield, CheckCircle, FileText, Video, Link as LinkIcon } from 'lucide-react';

var CATEGORIES = [
  {key:'ebook',label:'eBooks & Guides'},{key:'template',label:'Templates'},
  {key:'software',label:'Software & Tools'},{key:'audio',label:'Audio & Music'},
  {key:'graphics',label:'Graphics & Design'},{key:'video',label:'Video Content'},
  {key:'swipefile',label:'Swipe Files'},{key:'plr',label:'PLR Products'},{key:'other',label:'Other'},
];

export default function SuperMarketCreate() {
  var [title, setTitle] = useState('');
  var [shortDesc, setShortDesc] = useState('');
  var [description, setDescription] = useState('');
  var [price, setPrice] = useState('');
  var [comparePrice, setComparePrice] = useState('');
  var [category, setCategory] = useState('other');
  var [tags, setTags] = useState('');
  var [videoUrl, setVideoUrl] = useState('');
  var [demoUrl, setDemoUrl] = useState('');
  var [bannerUrl, setBannerUrl] = useState('');
  var [features, setFeatures] = useState(['']);
  var [mainFile, setMainFile] = useState(null);
  var [mainFileName, setMainFileName] = useState('');
  var [bonusFile, setBonusFile] = useState(null);
  var [bonusFileName, setBonusFileName] = useState('');
  var [agreedTerms, setAgreedTerms] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();

  function handleBannerUpload(e) {
    var file=e.target.files[0]; if(!file) return;
    var reader=new FileReader();
    reader.onload=function(ev){setBannerUrl(ev.target.result);};
    reader.readAsDataURL(file);
  }

  function handleFileUpload(e, type) {
    var file=e.target.files[0]; if(!file) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      if(type==='main'){setMainFile({data:ev.target.result,name:file.name,size:file.size});setMainFileName(file.name);}
      else{setBonusFile({data:ev.target.result,name:file.name,size:file.size});setBonusFileName(file.name);}
    };
    reader.readAsDataURL(file);
  }

  function addFeature(){setFeatures(function(f){return f.concat(['']);});}
  function updateFeature(idx,val){setFeatures(function(f){return f.map(function(v,i){return i===idx?val:v;});});}
  function removeFeature(idx){setFeatures(function(f){return f.filter(function(v,i){return i!==idx;});});}

  function handleCreate() {
    if (!title.trim()||title.length<5){setError('Title must be at least 5 characters');return;}
    if (!description||description.length<50){setError('Description must be at least 50 characters');return;}
    var p=parseFloat(price);
    if (!p||p<5){setError('Minimum price is $5');return;}
    if (!mainFile){setError('Product file is required — upload the file your buyers will download');return;}
    if (!agreedTerms){setError('You must agree to the Seller Terms');return;}
    setSaving(true); setError('');

    apiPost('/api/supermarket/products', {
      title:title.trim(), short_description:shortDesc.trim(),
      description:description, price:p,
      compare_price:parseFloat(comparePrice)||null,
      category:category, tags:tags,
      video_url:videoUrl, demo_url:demoUrl,
      banner_url:bannerUrl,
      features:features.filter(function(f){return f.trim();}),
      agreed_terms:true,
    }).then(function(r) {
      if (!r.ok){setError(r.error||'Failed');setSaving(false);return;}
      // Upload files
      var productId = r.product_id;
      var uploads = [];
      if (mainFile) uploads.push(apiPost('/api/supermarket/products/'+productId+'/upload', {type:'main',data:mainFile.data,name:mainFile.name,size:mainFile.size}));
      if (bonusFile) uploads.push(apiPost('/api/supermarket/products/'+productId+'/upload', {type:'bonus',data:bonusFile.data,name:bonusFile.name,size:bonusFile.size}));
      Promise.all(uploads).then(function(){navigate('/marketplace');}).catch(function(){navigate('/marketplace');});
    }).catch(function(e){setError(e.message||'Failed');setSaving(false);});
  }

  var iStyle={width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'};

  return (
    <AppLayout title="Sell a Product" subtitle="List your digital product on SuperMarket">
      <div style={{maxWidth:800,margin:'0 auto'}}>

        {/* Hero */}
        <div style={{background:'linear-gradient(135deg,#042a36,#0a1e2a)',borderRadius:14,padding:'28px 32px',marginBottom:20,border:'1px solid rgba(14,165,233,.15)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <Package size={20} color="#38bdf8"/>
            <span style={{fontSize:12,fontWeight:800,letterSpacing:2,textTransform:'uppercase'}}><span style={{color:'#fff'}}>Super</span><span style={{color:'#38bdf8'}}>Market</span></span>
          </div>
          <h3 style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'#fff',margin:'0 0 8px'}}>Sell Your Digital Product</h3>
          <p style={{fontSize:14,color:'rgba(255,255,255,.5)',lineHeight:1.7,margin:0,maxWidth:500}}>
            Upload any downloadable digital product — eBooks, templates, software, graphics, audio. You earn 50% on every sale. Affiliates promote for 25%.
          </p>
        </div>

        {/* Review flow */}
        <div style={{display:'flex',gap:12,marginBottom:20}}>
          {[{icon:Upload,label:'Upload',desc:'Upload product file & banner',color:'#8b5cf6'},{icon:Shield,label:'Review',desc:'AI scan + admin approval',color:'#0ea5e9'},{icon:CheckCircle,label:'Live',desc:'Listed on SuperMarket',color:'#16a34a'}].map(function(s,i) {
            var Icon=s.icon;
            return <div key={i} style={{flex:1,background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px',textAlign:'center'}}><div style={{width:36,height:36,borderRadius:10,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><Icon size={18} color={s.color}/></div><div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{s.label}</div><div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.desc}</div></div>;
          })}
        </div>

        {/* Form */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'#0c1e4a',padding:'16px 24px',display:'flex',alignItems:'center',gap:8}}>
            <Package size={16} color="#38bdf8"/><div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Product Details</div>
          </div>
          <div style={{padding:'24px'}}>
            {error && <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca',marginBottom:16}}><AlertTriangle size={14} color="#dc2626"/><div style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>{error}</div></div>}

            {/* Title */}
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Product Title</label>
              <input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder="e.g. Social Media Template Pack" style={iStyle}/>
            </div>

            {/* Short description */}
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Short Description</label>
              <input value={shortDesc} onChange={function(e){setShortDesc(e.target.value);}} placeholder="One-line summary for marketplace cards" maxLength={200} style={iStyle}/>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>{shortDesc.length}/200</div>
            </div>

            {/* Sales page description — rich text */}
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Sales Page Description</label>
              <RichTextEditor content={description} onChange={setDescription} placeholder="Write a compelling sales page — what the product does, who it's for, why they need it..."/>
            </div>

            {/* Price + Category row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:18}}>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}><DollarSign size={11} style={{verticalAlign:'middle'}}/> Price (USD)</label>
                <input type="number" min="5" value={price} onChange={function(e){setPrice(e.target.value);}} placeholder="Min. $5" style={iStyle}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Compare Price (optional)</label>
                <input type="number" value={comparePrice} onChange={function(e){setComparePrice(e.target.value);}} placeholder='e.g. $97 "was" price' style={iStyle}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}><Tag size={11} style={{verticalAlign:'middle'}}/> Category</label>
                <select value={category} onChange={function(e){setCategory(e.target.value);}} style={Object.assign({},iStyle,{background:'#f8f9fb'})}>
                  {CATEGORIES.map(function(c){return <option key={c.key} value={c.key}>{c.label}</option>;})}
                </select>
              </div>
            </div>

            {/* Tags + Video + Demo */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:18}}>
              <div><label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Tags (comma separated)</label><input value={tags} onChange={function(e){setTags(e.target.value);}} placeholder="seo, marketing, template" style={iStyle}/></div>
              <div><label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}><Video size={11} style={{verticalAlign:'middle'}}/> Sales Video URL</label><input value={videoUrl} onChange={function(e){setVideoUrl(e.target.value);}} placeholder="YouTube/Vimeo URL" style={iStyle}/></div>
              <div><label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}><LinkIcon size={11} style={{verticalAlign:'middle'}}/> Demo/Preview URL</label><input value={demoUrl} onChange={function(e){setDemoUrl(e.target.value);}} placeholder="Link to preview" style={iStyle}/></div>
            </div>

            {/* Banner image */}
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}><Image size={11} style={{verticalAlign:'middle'}}/> Product Banner</label>
              {bannerUrl && <div style={{width:'100%',height:140,borderRadius:10,marginBottom:8,backgroundImage:'url('+bannerUrl+')',backgroundSize:'cover',backgroundPosition:'center',border:'1px solid #e2e8f0',position:'relative'}}><button onClick={function(){setBannerUrl('');}} style={{position:'absolute',top:4,right:4,width:24,height:24,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.6)',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div>}
              <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'20px',borderRadius:10,border:'2px dashed #d1d5db',background:'#f8f9fb',cursor:'pointer'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#0ea5e9';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';}}>
                <Image size={18} color="#94a3b8"/><span style={{fontSize:13,fontWeight:600,color:'#64748b'}}>{bannerUrl?'Change banner':'Upload banner image'}</span>
                <input type="file" accept="image/*" onChange={handleBannerUpload} style={{display:'none'}}/>
              </label>
            </div>

            {/* Product file upload */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Product File (required)</label>
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'20px',borderRadius:10,border:mainFile?'2px solid #16a34a':'2px dashed #d1d5db',background:mainFile?'#f0fdf4':'#f8f9fb',cursor:'pointer'}}>
                  <Upload size={18} color={mainFile?'#16a34a':'#94a3b8'}/>
                  <span style={{fontSize:12,fontWeight:600,color:mainFile?'#16a34a':'#64748b'}}>{mainFileName||'Upload product file'}</span>
                  <input type="file" onChange={function(e){handleFileUpload(e,'main');}} style={{display:'none'}}/>
                </label>
                {mainFile && <div style={{fontSize:10,color:'#16a34a',marginTop:4}}>✓ {mainFile.name} ({Math.round(mainFile.size/1024)}KB)</div>}
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Bonus File (optional)</label>
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'20px',borderRadius:10,border:bonusFile?'2px solid #8b5cf6':'2px dashed #d1d5db',background:bonusFile?'rgba(139,92,246,.04)':'#f8f9fb',cursor:'pointer'}}>
                  <Upload size={18} color={bonusFile?'#8b5cf6':'#94a3b8'}/>
                  <span style={{fontSize:12,fontWeight:600,color:bonusFile?'#8b5cf6':'#64748b'}}>{bonusFileName||'Upload bonus file'}</span>
                  <input type="file" onChange={function(e){handleFileUpload(e,'bonus');}} style={{display:'none'}}/>
                </label>
                {bonusFile && <div style={{fontSize:10,color:'#8b5cf6',marginTop:4}}>✓ {bonusFile.name}</div>}
              </div>
            </div>

            {/* Feature bullets */}
            <div style={{marginBottom:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5}}>Feature Bullets</label>
                <button onClick={addFeature} style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#0ea5e9',cursor:'pointer',fontFamily:'inherit'}}>+ Add</button>
              </div>
              {features.map(function(f,i){
                return <div key={i} style={{display:'flex',gap:6,marginBottom:4}}>
                  <span style={{color:'#16a34a',fontWeight:700,padding:'8px 0'}}>✓</span>
                  <input value={f} onChange={function(e){updateFeature(i,e.target.value);}} placeholder="e.g. 50+ ready-to-use templates" style={Object.assign({},iStyle,{flex:1})}/>
                  {features.length>1 && <button onClick={function(){removeFeature(i);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}><Trash2 size={14}/></button>}
                </div>;
              })}
            </div>

            {/* Legal terms */}
            <div style={{padding:'16px 18px',background:'#f8f9fb',borderRadius:10,border:'1px solid #e8ecf2',marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:8}}>⚖️ Seller Terms</div>
              <div style={{fontSize:11,color:'#475569',lineHeight:1.8,marginBottom:12}}>
                <div style={{marginBottom:4}}><strong>1.</strong> All products must be your own original work or properly licensed for resale.</div>
                <div style={{marginBottom:4}}><strong>2.</strong> No illegal, harmful, or misleading content.</div>
                <div style={{marginBottom:4}}><strong>3.</strong> You indemnify SuperAdPro from any claims arising from your product.</div>
                <div style={{marginBottom:4}}><strong>4.</strong> Products are reviewed before publishing. SuperAdPro may remove products that violate terms.</div>
                <div><strong>5.</strong> Refunds within 30 days — commission will be deducted from your balance.</div>
              </div>
              <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer'}}>
                <input type="checkbox" checked={agreedTerms} onChange={function(){setAgreedTerms(!agreedTerms);}} style={{marginTop:2,accentColor:'#0ea5e9',width:18,height:18}}/>
                <span style={{fontSize:12,fontWeight:700,color:'#0f172a',lineHeight:1.5}}>I confirm all content is original/licensed, I agree to the Seller Terms, and I understand my product will be reviewed before publishing.</span>
              </label>
            </div>

            <button onClick={handleCreate} disabled={saving||!agreedTerms}
              style={{display:'block',margin:'0 auto',padding:'14px 40px',borderRadius:10,border:'none',
                cursor:(saving||!agreedTerms)?'default':'pointer',fontFamily:'inherit',fontSize:15,fontWeight:800,
                background:(saving||!agreedTerms)?'#cbd5e1':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',
                boxShadow:(saving||!agreedTerms)?'none':'0 4px 14px rgba(14,165,233,.3)'}}>
              {saving ? 'Creating...' : 'List Product on SuperMarket'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
