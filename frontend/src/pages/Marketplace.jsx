import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Store, Search, Users, DollarSign, TrendingUp, Copy, Check, ShoppingCart, Eye, Clock, Award, ChevronRight } from 'lucide-react';

var CATEGORIES = [
  {key:'all',label:'All Products',icon:'🏪'},
  {key:'marketing',label:'Marketing',icon:'📢'},
  {key:'business',label:'Business',icon:'💼'},
  {key:'crypto',label:'Crypto & Trading',icon:'📈'},
  {key:'fitness',label:'Health & Fitness',icon:'💪'},
  {key:'tech',label:'Software & Tech',icon:'💻'},
  {key:'creative',label:'Creative & Design',icon:'🎨'},
  {key:'lifestyle',label:'Lifestyle',icon:'🌟'},
  {key:'education',label:'Education',icon:'📚'},
  {key:'other',label:'Other',icon:'📦'},
];

export default function SuperMarket() {
  var { t } = useTranslation();
  var [view, setView] = useState('browse');
  var [courses, setCourses] = useState([]);
  var [myCourses, setMyCourses] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState('');
  var [category, setCategory] = useState('all');
  var [sortBy, setSortBy] = useState('newest');
  var [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(function() {
    apiGet('/api/marketplace/browse').then(function(d) {
      setCourses(d.courses || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  function openDetail(course) { setSelectedCourse(course); setView('detail'); }
  function loadMyCourses() {
    apiGet('/api/marketplace/my-courses').then(function(d) { setMyCourses(d.courses || []); });
    setView('my-products');
  }

  var filtered = courses.filter(function(c) {
    if (search && !(c.title || '').toLowerCase().includes(search.toLowerCase()) && !(c.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && c.category !== category) return false;
    return true;
  });
  if (sortBy === 'popular') filtered.sort(function(a,b) { return (b.total_sales||0) - (a.total_sales||0); });
  else if (sortBy === 'price-low') filtered.sort(function(a,b) { return (a.price||0) - (b.price||0); });
  else if (sortBy === 'price-high') filtered.sort(function(a,b) { return (b.price||0) - (a.price||0); });

  if (loading) return <AppLayout title="SuperMarket"><Spin/></AppLayout>;

  return (
    <AppLayout title="SuperMarket" subtitle="Digital Product Marketplace — Create, Sell & Promote">
      {view === 'browse' && <BrowseView courses={filtered} allCourses={courses} search={search} setSearch={setSearch} category={category} setCategory={setCategory} sortBy={sortBy} setSortBy={setSortBy} onOpen={openDetail} onMyProducts={loadMyCourses}/>}
      {view === 'detail' && selectedCourse && <ProductDetail course={selectedCourse} onBack={function() { setView('browse'); }}/>}
      {view === 'my-products' && <MyProducts courses={myCourses} onBack={function() { setView('browse'); }}/>}
    </AppLayout>
  );
}

function BrowseView({ courses, allCourses, search, setSearch, category, setCategory, sortBy, setSortBy, onOpen, onMyProducts }) {
  return (
    <div>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#1c223d,#0f172a)',borderRadius:16,padding:'28px 32px',marginBottom:24,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-30,right:-30,width:160,height:160,borderRadius:'50%',background:'rgba(16,185,129,.05)'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <Store size={20} color="#10b981"/>
              <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#10b981'}}>SuperMarket</span>
            </div>
            <h2 style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#fff',margin:'0 0 6px'}}>Digital Product Marketplace</h2>
            <p style={{fontSize:13,color:'rgba(255,255,255,.45)',margin:0}}>Browse products, promote with your affiliate link, earn 25% on every sale</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <StatBox value={allCourses.length} label="Products" color="#10b981"/>
            <StatBox value="25%" label="Commission" color="#0ea5e9"/>
            <button onClick={onMyProducts} style={{padding:'12px 20px',borderRadius:10,border:'1px solid rgba(139,92,246,.3)',background:'rgba(139,92,246,.08)',color:'#a78bfa',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>My Products</button>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:240,position:'relative'}}>
          <Search size={16} style={{position:'absolute',left:14,top:12,color:'#94a3b8'}}/>
          <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search products..." style={{width:'100%',padding:'10px 14px 10px 38px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}/>
        </div>
        <select value={sortBy} onChange={function(e) { setSortBy(e.target.value); }} style={{padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',background:'#fff',color:'#0f172a'}}>
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
          <option value="price-low">Price: Low → High</option>
          <option value="price-high">Price: High → Low</option>
        </select>
      </div>

      {/* Categories */}
      <div style={{display:'flex',gap:6,marginBottom:24,flexWrap:'wrap'}}>
        {CATEGORIES.map(function(cat) {
          var on = category === cat.key;
          return (
            <button key={cat.key} onClick={function() { setCategory(cat.key); }}
              style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:20,border:on?'2px solid #10b981':'2px solid #e8ecf2',background:on?'rgba(16,185,129,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:on?800:500,color:on?'#10b981':'#64748b',transition:'all .15s'}}>
              <span style={{fontSize:14}}>{cat.icon}</span>{cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {courses.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'stretch'}}>
          {courses.map(function(c) { return <ProductCard key={c.id} course={c} onOpen={function() { onOpen(c); }}/>; })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'80px 20px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}>
          <div style={{fontSize:48,marginBottom:12,opacity:.3}}>🏪</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No products found</div>
          <div style={{fontSize:13,color:'#94a3b8'}}>Try different search terms or browse all categories</div>
        </div>
      )}

      {/* Commission explainer */}
      <div style={{marginTop:32,background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'#1c223d',padding:'16px 24px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>How SuperMarket Commissions Work</div>
        </div>
        <div style={{padding:'24px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {[
            {pct:'50%',label:'Product Creator',desc:'Creates the product, earns 50% of every sale',color:'#16a34a',icon:Award},
            {pct:'25%',label:'Promoting Affiliate',desc:'Promotes with affiliate link, earns 25% commission',color:'#0ea5e9',icon:Users},
            {pct:'25%',label:'Platform',desc:'Maintains the marketplace and payment processing',color:'#8b5cf6',icon:Store},
          ].map(function(s, i) {
            var Icon = s.icon;
            return (
              <div key={i} style={{textAlign:'center',padding:20,borderRadius:12,background:'#f8f9fb',border:'1px solid #e8ecf2'}}>
                <div style={{width:44,height:44,borderRadius:12,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}><Icon size={20} color={s.color}/></div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.pct}</div>
                <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginTop:4}}>{s.label}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:4,lineHeight:1.5}}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ course, onOpen }) {
  var c = course;
  var catObj = CATEGORIES.find(function(x) { return x.key === c.category; }) || CATEGORIES[CATEGORIES.length-1];
  return (
    <div onClick={onOpen} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'all .2s',display:'flex',flexDirection:'column',boxShadow:'0 2px 12px rgba(0,0,0,.04)'}}
      onMouseEnter={function(e) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.12)'; }}
      onMouseLeave={function(e) { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.04)'; }}>
      <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        {c.thumbnail_url ? <img src={c.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:40,opacity:.3}}>{catObj.icon}</div>}
        <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',borderRadius:8,padding:'5px 12px'}}>
          <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff'}}>${Math.round(c.price || 0)}</span>
        </div>
        <div style={{position:'absolute',bottom:10,left:10,display:'flex',gap:3}}>
          <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'rgba(22,163,74,.85)',color:'#fff'}}>50% Creator</span>
          <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'rgba(14,165,233,.85)',color:'#fff'}}>25% You</span>
        </div>
        {(c.total_sales || 0) > 10 && <div style={{position:'absolute',top:10,left:10,display:'flex',alignItems:'center',gap:3,background:'rgba(245,158,11,.9)',borderRadius:4,padding:'2px 6px'}}><TrendingUp size={10} color="#fff"/><span style={{fontSize:8,fontWeight:800,color:'#fff'}}>HOT</span></div>}
      </div>
      <div style={{padding:'16px 18px',flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4,lineHeight:1.3}}>{c.title}</div>
        <div style={{fontSize:11,color:'#94a3b8',marginBottom:6}}>by {c.creator_name || 'Creator'}</div>
        <div style={{fontSize:12,color:'#475569',lineHeight:1.6,marginBottom:12,flex:1}}>{(c.short_description || c.description || '').slice(0, 100)}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'#f1f5f9',color:'#64748b'}}>{catObj.icon} {c.category}</span>
          {c.total_sales > 0 && <span style={{fontSize:9,fontWeight:600,color:'#94a3b8'}}>{c.total_sales} sold</span>}
        </div>
      </div>
    </div>
  );
}

function ProductDetail({ course, onBack }) {
  var [copied, setCopied] = useState(false);
  var [purchasing, setPurchasing] = useState(false);
  var [message, setMessage] = useState('');
  var c = course;
  var affLink = window.location.origin + '/marketplace/course/' + c.id;
  var earnPerSale = ((c.price || 0) * 0.25).toFixed(2);

  function copyLink() { navigator.clipboard.writeText(affLink); setCopied(true); setTimeout(function() { setCopied(false); }, 2000); }
  function purchase() {
    setPurchasing(true);
    apiPost('/api/marketplace/purchase/' + c.id, {}).then(function(r) {
      setMessage(r.success ? 'Purchase successful! Check your course library.' : (r.error || 'Purchase failed'));
      setPurchasing(false);
    }).catch(function(e) { setMessage(e.message || 'Purchase failed'); setPurchasing(false); });
  }

  return (
    <div>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:16}}>← Back to marketplace</button>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,alignItems:'start'}}>
        <div>
          <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240)',borderRadius:14,overflow:'hidden',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {c.thumbnail_url ? <img src={c.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:64,opacity:.2}}>📦</div>}
          </div>
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'#1c223d',padding:'14px 20px'}}><div style={{fontSize:14,fontWeight:800,color:'#fff'}}>About This Product</div></div>
            <div style={{padding:'20px',fontSize:13,color:'#334155',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{c.description || 'No description provided.'}</div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Buy card */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#1c223d,#0f172a)',padding:'20px'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:6}}>{c.title}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>by {c.creator_name || 'Creator'}</div>
            </div>
            <div style={{padding:'20px'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800,color:'#0f172a',marginBottom:4}}>${Math.round(c.price || 0)}</div>
              <div style={{display:'flex',gap:10,marginBottom:16}}>
                {c.lesson_count > 0 && <span style={{fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center',gap:3}}><Eye size={12}/> {c.lesson_count} lessons</span>}
                {c.total_duration_mins > 0 && <span style={{fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center',gap:3}}><Clock size={12}/> {c.total_duration_mins}min</span>}
                {c.total_sales > 0 && <span style={{fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center',gap:3}}><ShoppingCart size={12}/> {c.total_sales} sold</span>}
              </div>
              {message && <div style={{padding:'10px 14px',borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700,background:message.includes('success')?'#dcfce7':'#fef2f2',color:message.includes('success')?'#16a34a':'#dc2626'}}>{message}</div>}
              <button onClick={purchase} disabled={purchasing} style={{width:'100%',padding:'14px',borderRadius:10,border:'none',cursor:purchasing?'default':'pointer',background:'#16a34a',color:'#fff',fontSize:15,fontWeight:800,fontFamily:'inherit',marginBottom:10,opacity:purchasing?0.6:1}}>
                {purchasing ? 'Processing...' : 'Buy Now — $' + Math.round(c.price || 0)}
              </button>
            </div>
          </div>
          {/* Promote card */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#0c1e4a,#1c223d)',padding:'16px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}><DollarSign size={14} color="#10b981"/><span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Promote & Earn</span></div>
            </div>
            <div style={{padding:'20px'}}>
              <div style={{textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5}}>You Earn Per Sale</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#10b981'}}>${earnPerSale}</div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6}}>Your Affiliate Link</div>
              <div style={{display:'flex',gap:6}}>
                <input value={affLink} readOnly style={{flex:1,padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:10,fontFamily:'monospace',color:'#64748b',background:'#f8f9fb',outline:'none'}}/>
                <button onClick={copyLink} style={{display:'flex',alignItems:'center',gap:3,padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',background:copied?'#16a34a':'#0ea5e9',color:'#fff',fontSize:11,fontWeight:700,fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                </button>
              </div>
              <div style={{marginTop:14,padding:12,background:'#f0fdf4',borderRadius:8,border:'1px solid #dcfce7'}}>
                <div style={{fontSize:11,color:'#475569',lineHeight:1.6}}>Share your link on social media, email, or your website. When someone buys, you earn ${earnPerSale} instantly.</div>
              </div>
            </div>
          </div>
          {/* Split */}
          <div style={{background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:12,padding:16}}>
            <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Commission Split</div>
            {[
              {label:'Product Creator',pct:'50%',amount:((c.price||0)*0.5).toFixed(2),color:'#16a34a'},
              {label:'You (Affiliate)',pct:'25%',amount:earnPerSale,color:'#0ea5e9'},
              {label:'Platform',pct:'25%',amount:((c.price||0)*0.25).toFixed(2),color:'#8b5cf6'},
            ].map(function(s,i) {
              return (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid #e8ecf2':'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/><span style={{fontSize:12,fontWeight:600,color:'#475569'}}>{s.label}</span></div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,fontWeight:700,color:s.color}}>{s.pct}</span><span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>${s.amount}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyProducts({ courses, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:16}}>← Back to marketplace</button>
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'#1c223d',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>My Products</div>
          <a href="/app/courses/create" style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:8,background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,textDecoration:'none',fontFamily:'inherit'}}>+ Create Product</a>
        </div>
        {courses.length > 0 ? courses.map(function(c, i) {
          var sc = {published:{bg:'#dcfce7',color:'#16a34a'},draft:{bg:'#f1f5f9',color:'#94a3b8'},pending_review:{bg:'#fef3c7',color:'#f59e0b'}}[c.status] || {bg:'#f1f5f9',color:'#94a3b8'};
          return (
            <div key={c.id} style={{padding:'16px 24px',borderBottom:i<courses.length-1?'1px solid #f5f6f8':'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:50,height:50,borderRadius:8,background:'linear-gradient(135deg,#0b1729,#132240)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {c.thumbnail_url ? <img src={c.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} alt=""/> : <span style={{fontSize:20,opacity:.3}}>📦</span>}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{c.title}</div>
                  <div style={{display:'flex',gap:8,marginTop:3}}>
                    <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>${Math.round(c.price || 0)}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:3,background:sc.bg,color:sc.color,textTransform:'capitalize'}}>{c.status}</span>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:'#0ea5e9'}}>{c.total_sales || 0}</div><div style={{fontSize:9,color:'#94a3b8'}}>Sales</div></div>
                <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:'#16a34a'}}>${Math.round(c.total_revenue || 0)}</div><div style={{fontSize:9,color:'#94a3b8'}}>Revenue</div></div>
              </div>
            </div>
          );
        }) : (
          <div style={{padding:'60px 20px',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.3}}>📦</div>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>No products yet</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Create your first digital product and start earning</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ value, label, color }) {
  return (
    <div style={{textAlign:'center',padding:'12px 20px',background:'rgba(255,255,255,.04)',borderRadius:10,border:'1px solid rgba(255,255,255,.06)'}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:color}}>{value}</div>
      <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase'}}>{label}</div>
    </div>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#10b981',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
