import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { PenLine, Save, BookOpen, DollarSign, FileText, Lock } from 'lucide-react';

export default function CourseCreate() {
  var [title, setTitle] = useState('');
  var [description, setDescription] = useState('');
  var [price, setPrice] = useState('');
  var [tier, setTier] = useState(1);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();

  function handleSave() {
    if (!title.trim()) { setError('Course title is required'); return; }
    if (!price || parseFloat(price) <= 0) { setError('Valid price is required'); return; }
    setSaving(true);
    setError('');
    apiPost('/api/courses/create', {
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      tier: tier,
    }).then(function(r) {
      if (r.success) { navigate('/courses/my-courses'); }
      else { setError(r.error || 'Failed to create course'); setSaving(false); }
    }).catch(function(e) { setError(e.message || 'Failed to create course'); setSaving(false); });
  }

  return (
    <AppLayout title="Create Course" subtitle="Build and sell your own course on the marketplace">
      <div style={{maxWidth:700,margin:'0 auto'}}>

        {/* Pro badge */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,padding:'12px 16px',background:'rgba(139,92,246,.04)',borderRadius:10,border:'1px solid rgba(139,92,246,.1)'}}>
          <Lock size={14} color="#8b5cf6"/>
          <span style={{fontSize:12,fontWeight:700,color:'#8b5cf6'}}>Pro Feature</span>
          <span style={{fontSize:12,color:'#64748b'}}>— Course creation is available to Pro members ($30/mo)</span>
        </div>

        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
          <div style={{background:'#1c223d',padding:'16px 24px',display:'flex',alignItems:'center',gap:8}}>
            <PenLine size={16} color="#a78bfa"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Course Details</div>
          </div>
          <div style={{padding:'24px'}}>
            {error && (
              <div style={{padding:'10px 14px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca',marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>{error}</div>
              </div>
            )}

            {/* Title */}
            <div style={{marginBottom:18}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                <BookOpen size={12}/> Course Title
              </label>
              <input value={title} onChange={function(e) { setTitle(e.target.value); }}
                placeholder="e.g. Digital Marketing Mastery"
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'}}/>
            </div>

            {/* Description */}
            <div style={{marginBottom:18}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                <FileText size={12}/> Description
              </label>
              <textarea value={description} onChange={function(e) { setDescription(e.target.value); }}
                placeholder="What will students learn? What makes this course unique?"
                rows={5}
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',background:'#f8f9fb'}}/>
            </div>

            {/* Price + Tier row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
              <div>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
                  <DollarSign size={12}/> Price (USD)
                </label>
                <input type="number" value={price} onChange={function(e) { setPrice(e.target.value); }}
                  placeholder="e.g. 100"
                  style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#f8f9fb'}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,display:'block'}}>Course Tier</label>
                <div style={{display:'flex',gap:6}}>
                  {[{t:1,name:'Starter',price:'$100',color:'#16a34a'},{t:2,name:'Advanced',price:'$300',color:'#0ea5e9'},{t:3,name:'Elite',price:'$500',color:'#8b5cf6'}].map(function(o) {
                    var on = tier === o.t;
                    return (
                      <button key={o.t} onClick={function() { setTier(o.t); }}
                        style={{flex:1,padding:'10px 8px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',
                          border:on?'2px solid '+o.color:'2px solid #e8ecf2',
                          background:on?o.color+'10':'#f8f9fb',transition:'all .15s'}}>
                        <div style={{fontSize:12,fontWeight:800,color:on?o.color:'#94a3b8'}}>{o.name}</div>
                        <div style={{fontSize:10,color:on?o.color:'#cbd5e1'}}>{o.price}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Commission info */}
            <div style={{padding:'14px 16px',background:'#f8f9fb',borderRadius:10,border:'1px solid #e8ecf2',marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Commission Structure</div>
              <div style={{fontSize:12,color:'#475569',lineHeight:1.7}}>
                When your course sells: you keep 100% on odd sales (1st, 3rd, 5th...) and pass up even sales (2nd, 4th, 6th, 8th) to your sponsor. Your sponsor must own the same tier to receive the pass-up.
              </div>
            </div>

            {/* Save button */}
            <button onClick={handleSave} disabled={saving}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 20px',borderRadius:10,border:'none',
                cursor:saving?'default':'pointer',fontFamily:'inherit',fontSize:14,fontWeight:800,
                background:saving?'#94a3b8':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',
                boxShadow:saving?'none':'0 4px 14px rgba(139,92,246,.3)',transition:'all .2s'}}>
              <Save size={16}/> {saving ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
