import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { PenLine, Save, BookOpen, DollarSign, FileText, Lock, Shield, CheckCircle, AlertTriangle, Tag, Image } from 'lucide-react';

var CATEGORIES = [
  {key:'marketing',label:'Marketing & Advertising'},
  {key:'business',label:'Business & Entrepreneurship'},
  {key:'crypto',label:'Crypto & Trading'},
  {key:'fitness',label:'Health & Fitness'},
  {key:'tech',label:'Software & Technology'},
  {key:'creative',label:'Creative & Design'},
  {key:'lifestyle',label:'Lifestyle & Personal Development'},
  {key:'education',label:'Education & Training'},
  {key:'other',label:'Other'},
];

export default function CourseCreate() {
  var { t } = useTranslation();
  var [title, setTitle] = useState('');
  var [description, setDescription] = useState('');
  var [shortDesc, setShortDesc] = useState('');
  var [price, setPrice] = useState('');
  var [category, setCategory] = useState('other');
  var [difficulty, setDifficulty] = useState('beginner');
  var [thumbnailUrl, setThumbnailUrl] = useState('');
  var [agreedTerms, setAgreedTerms] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();

  function handleSave() {
    if (!title.trim() || title.trim().length < 10) { setError('Course title must be at least 10 characters'); return; }
    if (!description.trim() || description.trim().length < 100) { setError('Description must be at least 100 characters'); return; }
    var p = parseFloat(price);
    if (!p || p < 20) { setError('Minimum course price is $20'); return; }
    if (!agreedTerms) { setError('You must agree to the Creator Terms before creating a course'); return; }
    setSaving(true);
    setError('');
    apiPost('/api/marketplace/courses', {
      title: title.trim(),
      description: description.trim(),
      short_description: shortDesc.trim(),
      price: p,
      category: category,
      difficulty_level: difficulty,
      thumbnail_url: thumbnailUrl.trim(),
      agreed_terms: true,
    }).then(function(r) {
      if (r.ok) { navigate('/marketplace'); }
      else { setError(r.error || 'Failed to create course'); setSaving(false); }
    }).catch(function(e) { setError(e.message || 'Failed to create course'); setSaving(false); });
  }

  return (
    <AppLayout title="Create a Course" subtitle="Build, price, and sell your own course — earn 100% commissions">
      <div style={{maxWidth:760,margin:'0 auto'}}>

        {/* Hero — 100% commissions highlight */}
        <div style={{background:'linear-gradient(135deg,#1c223d,#0f172a)',borderRadius:14,padding:'28px 32px',marginBottom:20,position:'relative',overflow:'hidden',border:'1px solid rgba(139,92,246,.15)'}}>
          <div style={{position:'absolute',top:-30,right:-30,width:160,height:160,borderRadius:'50%',background:'rgba(139,92,246,.06)'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <DollarSign size={20} color="#a78bfa"/>
              <span style={{fontSize:12,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#a78bfa'}}>100% Commissions</span>
            </div>
            <h3 style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'#fff',margin:'0 0 8px'}}>Set Your Own Price. Keep Every Dollar.</h3>
            <p style={{fontSize:14,color:'rgba(255,255,255,.55)',lineHeight:1.7,margin:0,maxWidth:520}}>
              Price your course at any amount from $20 upwards. You earn 100% commission on every sale through the pass-up system. No platform fees, no hidden cuts.
            </p>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              {['$20+','$50','$100','$200','$500','Any Price'].map(function(p) {
                return <span key={p} style={{padding:'4px 10px',borderRadius:5,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',fontSize:11,fontWeight:700,color:'#a78bfa'}}>{p}</span>;
              })}
            </div>
          </div>
        </div>

        {/* Review process info */}
        <div style={{display:'flex',gap:12,marginBottom:20}}>
          {[
            {icon:PenLine,label:'Create',desc:'Build your course with lessons and content',color:'#8b5cf6'},
            {icon:Shield,label:'AI Review',desc:'Content scanned for quality and copyright',color:'#0ea5e9'},
            {icon:CheckCircle,label:'Approval',desc:'Admin reviews before publishing',color:'#16a34a'},
          ].map(function(s,i) {
            var Icon = s.icon;
            return (
              <div key={i} style={{flex:1,background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px',textAlign:'center'}}>
                <div style={{width:36,height:36,borderRadius:10,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><Icon size={18} color={s.color}/></div>
                <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{s.label}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'#1c223d',padding:'16px 24px',display:'flex',alignItems:'center',gap:8}}>
            <PenLine size={16} color="#a78bfa"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Course Details</div>
          </div>
          <div style={{padding:'24px'}}>
            {error && (
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca',marginBottom:16}}>
                <AlertTriangle size={14} color="#dc2626"/>
                <div style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>{error}</div>
              </div>
            )}

            {/* Title */}
            <div style={{marginBottom:18}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                <BookOpen size={12}/> Course Title
              </label>
              <input value={title} onChange={function(e){setTitle(e.target.value);}}
                placeholder="e.g. Digital Marketing Mastery for Beginners"
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'}}/>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Minimum 10 characters</div>
            </div>

            {/* Short description */}
            <div style={{marginBottom:18}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                Short Description
              </label>
              <input value={shortDesc} onChange={function(e){setShortDesc(e.target.value);}}
                placeholder="One-line summary shown in marketplace cards"
                maxLength={160}
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'}}/>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>{shortDesc.length}/160 characters</div>
            </div>

            {/* Description */}
            <div style={{marginBottom:18}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                <FileText size={12}/> Full Description
              </label>
              <textarea value={description} onChange={function(e){setDescription(e.target.value);}}
                placeholder="What will students learn? What makes this course unique? Who is it for?"
                rows={5}
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',background:'#f8f9fb'}}/>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Minimum 100 characters · {description.length} written</div>
            </div>

            {/* Price + Category + Difficulty row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:18}}>
              <div>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                  <DollarSign size={12}/> Price (USD)
                </label>
                <input type="number" min="20" step="1" value={price} onChange={function(e){setPrice(e.target.value);}}
                  placeholder="Min. $20"
                  style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'}}/>
                <div style={{fontSize:10,color:'#16a34a',fontWeight:700,marginTop:4}}>You earn 100% on every kept sale</div>
              </div>
              <div>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                  <Tag size={12}/> Category
                </label>
                <select value={category} onChange={function(e){setCategory(e.target.value);}}
                  style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'}}>
                  {CATEGORIES.map(function(c){return <option key={c.key} value={c.key}>{c.label}</option>;})}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Difficulty</label>
                <div style={{display:'flex',gap:4}}>
                  {['beginner','intermediate','advanced'].map(function(d) {
                    var on = difficulty === d;
                    return (
                      <button key={d} onClick={function(){setDifficulty(d);}}
                        style={{flex:1,padding:'10px 4px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:10,fontWeight:on?800:600,textTransform:'capitalize',
                          border:on?'2px solid #8b5cf6':'2px solid #e8ecf2',background:on?'rgba(139,92,246,.06)':'#f8f9fb',color:on?'#8b5cf6':'#94a3b8'}}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Thumbnail */}
            <div style={{marginBottom:18}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                <Image size={12}/> Course Banner Image
              </label>
              {thumbnailUrl && (
                <div style={{width:'100%',height:140,borderRadius:10,marginBottom:8,backgroundImage:'url('+thumbnailUrl+')',backgroundSize:'cover',backgroundPosition:'center',border:'1px solid #e2e8f0',position:'relative'}}>
                  <button onClick={function(){setThumbnailUrl('');}} style={{position:'absolute',top:6,right:6,width:24,height:24,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.6)',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                </div>
              )}
              <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'20px',borderRadius:10,border:'2px dashed #d1d5db',background:'#f8f9fb',cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.background='rgba(139,92,246,.03)';}}
                onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='#f8f9fb';}}>
                <Image size={18} color="#94a3b8"/>
                <span style={{fontSize:13,fontWeight:600,color:'#64748b'}}>{thumbnailUrl ? 'Change banner' : 'Upload banner image'}</span>
                <input type="file" accept="image/*" onChange={function(e){
                  var file=e.target.files[0]; if(!file) return;
                  var reader=new FileReader();
                  reader.onload=function(ev){setThumbnailUrl(ev.target.result);};
                  reader.readAsDataURL(file);
                }} style={{display:'none'}}/>
              </label>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Recommended: 1280×720px (16:9). This displays at the top of your course card in the marketplace.</div>
            </div>

            {/* Commission explainer */}
            <div style={{padding:'16px 18px',background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)',borderRadius:10,border:'1px solid #bbf7d0',marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:800,color:'#16a34a',marginBottom:6}}>💰 How You Earn — 100% Pass-Up System</div>
              <div style={{fontSize:12,color:'#475569',lineHeight:1.7}}>
                You keep 100% of the full course price on your 1st, 3rd, 5th sale (odd numbers). Your 2nd, 4th, 6th, 8th sales (even numbers) pass up 100% to your direct sponsor. Pass-ups cascade — when your sponsor receives a pass-up, it counts in their own odd/even pattern. No platform fees. No caps.
              </div>
            </div>

            {/* Legal disclaimers & terms */}
            <div style={{padding:'16px 18px',background:'#f8f9fb',borderRadius:10,border:'1px solid #e8ecf2',marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:8}}>⚖️ Creator Terms & Legal Agreement</div>
              <div style={{fontSize:11,color:'#64748b',lineHeight:1.8,marginBottom:12}}>
                By creating a course on SuperAdPro, you agree to the following:
              </div>
              <div style={{fontSize:11,color:'#475569',lineHeight:1.8}}>
                <div style={{marginBottom:6}}>
                  <strong>1. Original Content:</strong> All course material must be your own original work. You must not upload content that infringes on any third party's copyright, trademark, or intellectual property rights.
                </div>
                <div style={{marginBottom:6}}>
                  <strong>2. No Prohibited Content:</strong> Courses must not contain hate speech, violence, illegal activity guidance, adult content, misleading health/financial claims, or any content that violates applicable laws.
                </div>
                <div style={{marginBottom:6}}>
                  <strong>3. Income Disclaimer:</strong> If your course relates to earning money, trading, investing, or business, you must include appropriate disclaimers. No guaranteed income promises.
                </div>
                <div style={{marginBottom:6}}>
                  <strong>4. Indemnification:</strong> You agree to indemnify and hold SuperAdPro harmless from any claims, damages, or expenses arising from your course content.
                </div>
                <div style={{marginBottom:6}}>
                  <strong>5. Review Process:</strong> All courses undergo AI-powered content scanning and manual admin review before publishing. SuperAdPro reserves the right to reject or remove courses that violate these terms.
                </div>
                <div>
                  <strong>6. Refund Policy:</strong> SuperAdPro may process refunds within 30 days of purchase. Refunded commissions will be deducted from your balance.
                </div>
              </div>
              <label style={{display:'flex',alignItems:'flex-start',gap:10,marginTop:14,cursor:'pointer'}}>
                <input type="checkbox" checked={agreedTerms} onChange={function(){setAgreedTerms(!agreedTerms);}}
                  style={{marginTop:2,accentColor:'#8b5cf6',width:18,height:18}}/>
                <span style={{fontSize:12,fontWeight:700,color:'#0f172a',lineHeight:1.5}}>
                  I confirm that all content is my original work, I have read and agree to the Creator Terms above, and I understand my course will be reviewed before publishing.
                </span>
              </label>
            </div>

            {/* Create button */}
            <button onClick={handleSave} disabled={saving || !agreedTerms}
              style={{display:'block',margin:'0 auto',padding:'14px 40px',borderRadius:10,border:'none',
                cursor:(saving||!agreedTerms)?'default':'pointer',fontFamily:'inherit',fontSize:15,fontWeight:800,
                background:(saving||!agreedTerms)?'#cbd5e1':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',
                boxShadow:(saving||!agreedTerms)?'none':'0 4px 14px rgba(139,92,246,.3)',transition:'all .2s'}}>
              {saving ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
