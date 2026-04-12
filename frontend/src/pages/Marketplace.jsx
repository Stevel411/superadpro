import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { Store, Search, Users, DollarSign, TrendingUp, Copy, Check, ShoppingCart, Star, Tag, Download, Plus, Eye, Package, Award, ExternalLink } from 'lucide-react';
import { formatMoney } from '../utils/money';

var CATEGORIES = [
  {key:'all',label:'All Products',icon:'🏪'},
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

export default function SuperMarket() {
  var [view, setView] = useState('browse');
  var [products, setProducts] = useState([]);
  var [myProducts, setMyProducts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState('');
  var [category, setCategory] = useState('all');
  var [sortBy, setSortBy] = useState('newest');
  var [selectedProduct, setSelectedProduct] = useState(null);
  var navigate = useNavigate();
  var auth = useAuth();
  var currentUserId = auth.user ? auth.user.id : null;

  useEffect(function() {
    apiGet('/api/supermarket/browse').then(function(d) { setProducts(d.products || []); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  function openDetail(p) { setSelectedProduct(p); setView('detail'); }
  function loadMyProducts() {
    apiGet('/api/supermarket/my-products').then(function(d) { setMyProducts(d.products || []); });
    setView('my-products');
  }

  var filtered = products.filter(function(p) {
    if (search && !(p.title||'').toLowerCase().includes(search.toLowerCase()) && !(p.short_description||'').toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && p.category !== category) return false;
    return true;
  });
  if (sortBy === 'popular') filtered.sort(function(a,b) { return (b.total_sales||0)-(a.total_sales||0); });
  else if (sortBy === 'price-low') filtered.sort(function(a,b) { return (a.price||0)-(b.price||0); });
  else if (sortBy === 'price-high') filtered.sort(function(a,b) { return (b.price||0)-(a.price||0); });
  else if (sortBy === 'rating') filtered.sort(function(a,b) { return (b.avg_rating||0)-(a.avg_rating||0); });

  if (loading) return <AppLayout title="SuperMarket"><Spin/></AppLayout>;

  return (
    <AppLayout title="SuperMarket" subtitle="Digital Product Marketplace — Sell & Promote Downloads">
      {view === 'browse' && <BrowseView products={filtered} allProducts={products} search={search} setSearch={setSearch} category={category} setCategory={setCategory} sortBy={sortBy} setSortBy={setSortBy} onOpen={openDetail} onMyProducts={loadMyProducts} onCreate={function(){navigate('/supermarket/create');}}/>}
      {view === 'detail' && selectedProduct && <ProductDetail product={selectedProduct} onBack={function(){setView('browse');}} currentUserId={currentUserId}/>}
      {view === 'my-products' && <MyProducts products={myProducts} onBack={function(){setView('browse');}} onCreate={function(){navigate('/supermarket/create');}} onReload={loadMyProducts}/>}
    </AppLayout>
  );
}

function BrowseView({ products, allProducts, search, setSearch, category, setCategory, sortBy, setSortBy, onOpen, onMyProducts, onCreate }) {
  return (
    <div>
      {/* Hero — Cyan Theme */}
      <div style={{background:'linear-gradient(135deg,#042a36,#0a1e2a,#0d2530)',borderRadius:16,padding:'40px 44px',marginBottom:24,position:'relative',overflow:'hidden',border:'1px solid rgba(14,165,233,.15)'}}>
        <div style={{position:'absolute',top:-50,right:-50,width:240,height:240,borderRadius:'50%',background:'rgba(14,165,233,.06)'}}/>
        {/* Floating icons */}
        {[
          {left:'70%',icon:'📦',size:20,delay:0,dur:6.5,opacity:.07},
          {left:'82%',icon:'💰',size:16,delay:1.5,dur:7,opacity:.06},
          {left:'60%',icon:'📘',size:24,delay:3,dur:8,opacity:.07},
          {left:'90%',icon:'💎',size:14,delay:0.5,dur:5.5,opacity:.05},
          {left:'75%',icon:'🎨',size:18,delay:4,dur:7.5,opacity:.08},
          {left:'85%',icon:'💻',size:22,delay:2,dur:6,opacity:.06},
        ].map(function(d,i) { return <div key={i} style={{position:'absolute',bottom:-30,left:d.left,fontSize:d.size,opacity:d.opacity,animation:'smFloat '+d.dur+'s ease-in-out '+d.delay+'s infinite',pointerEvents:'none',zIndex:0}}>{d.icon}</div>; })}
        <style>{`@keyframes smFloat{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-240px);opacity:0}}`}</style>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{width:32,height:32,borderRadius:8,background:'rgba(14,165,233,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><Store size={18} color="var(--sap-accent-light)"/></div>
              <span style={{fontSize:12,fontWeight:800,letterSpacing:2.5,textTransform:'uppercase'}}><span style={{color:'#fff'}}>Super</span><span style={{color:'var(--sap-accent-light)'}}>Market</span></span>
            </div>
            <h2 style={{fontFamily:'Sora,sans-serif',fontSize:30,fontWeight:900,color:'#fff',margin:'0 0 10px'}}>Digital Product Marketplace</h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,.6)',margin:'0 0 14px',fontWeight:500,maxWidth:480,lineHeight:1.7}}>Sell downloadable digital products — eBooks, templates, software, graphics, audio. Affiliates earn 25% promoting your products.</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {['Instant Download','50% Creator','25% Affiliate','25% Platform','Buyer Reviews'].map(function(item) {
                return <span key={item} style={{padding:'5px 12px',borderRadius:6,background:'rgba(14,165,233,.1)',border:'1px solid rgba(14,165,233,.2)',fontSize:11,fontWeight:700,color:'var(--sap-accent-light)'}}>{item}</span>;
              })}
            </div>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <StatBox value={allProducts.length} label="Products" color="var(--sap-accent-light)"/>
            <StatBox value="25%" label="Commission" color="var(--sap-accent)"/>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <button onClick={onMyProducts} style={{padding:'10px 18px',borderRadius:8,border:'1px solid rgba(14,165,233,.3)',background:'rgba(14,165,233,.08)',color:'var(--sap-accent-light)',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>My Products</button>
              <button onClick={onCreate} style={{padding:'10px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(14,165,233,.3)'}}>+ Sell Product</button>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:240,position:'relative'}}>
          <Search size={16} style={{position:'absolute',left:14,top:12,color:'var(--sap-text-muted)'}}/>
          <input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Search products..." style={{width:'100%',padding:'10px 14px 10px 38px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#fff'}}/>
        </div>
        <select value={sortBy} onChange={function(e){setSortBy(e.target.value);}} style={{padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',background:'#fff',color:'var(--sap-text-primary)'}}>
          <option value="newest">Newest</option>
          <option value="popular">Best Sellers</option>
          <option value="rating">Highest Rated</option>
          <option value="price-low">Price: Low → High</option>
          <option value="price-high">Price: High → Low</option>
        </select>
      </div>

      {/* Categories */}
      <div style={{display:'flex',gap:6,marginBottom:24,flexWrap:'wrap'}}>
        {CATEGORIES.map(function(cat) {
          var on=category===cat.key;
          return <button key={cat.key} onClick={function(){setCategory(cat.key);}} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:20,border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',background:on?'rgba(14,165,233,.06)':'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:on?800:500,color:on?'var(--sap-accent)':'var(--sap-text-muted)'}}><span style={{fontSize:14}}>{cat.icon}</span>{cat.label}</button>;
        })}
      </div>

      {/* Grid */}
      {products.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'stretch'}}>
          {products.map(function(p) { return <ProductCard key={p.id} product={p} onOpen={function(){onOpen(p);}}/>; })}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'80px 20px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}>
          <div style={{fontSize:48,marginBottom:12,opacity:.3}}>📦</div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:4}}>No products found</div>
          <div style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:16}}>Be the first to list a product!</div>
          <button onClick={onCreate} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'var(--sap-accent)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ Sell a Product</button>
        </div>
      )}

      {/* Commission explainer */}
      <div style={{marginTop:32,background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'#0c1e4a',padding:'16px 24px'}}><div style={{fontSize:14,fontWeight:800,color:'#fff'}}>How SuperMarket Works</div></div>
        <div style={{padding:'24px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
          {[
            {icon:Package,label:'Upload',desc:'Upload your digital product file',color:'var(--sap-purple)'},
            {icon:Eye,label:'List',desc:'Set price, write sales page, submit for review',color:'var(--sap-accent)'},
            {icon:Users,label:'Promote',desc:'Affiliates share your product link',color:'var(--sap-amber)'},
            {icon:DollarSign,label:'Earn',desc:'50% to you, 25% to affiliate, 25% platform',color:'var(--sap-green)'},
          ].map(function(s,i) {
            var Icon=s.icon;
            return (
              <div key={i} style={{textAlign:'center',padding:16}}>
                <div style={{width:40,height:40,borderRadius:10,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><Icon size={20} color={s.color}/></div>
                <div style={{fontSize:13,fontWeight:800,color:'var(--sap-text-primary)'}}>{s.label}</div>
                <div style={{fontSize:10,color:'var(--sap-text-muted)',marginTop:4,lineHeight:1.5}}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onOpen }) {
  var p=product;
  var catObj=CATEGORIES.find(function(x){return x.key===p.category;})||CATEGORIES[CATEGORIES.length-1];
  return (
    <div onClick={onOpen} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'all .2s',display:'flex',flexDirection:'column',boxShadow:'0 2px 12px rgba(0,0,0,.04)'}}
      onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.12)';}}
      onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.04)';}}>
      <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        {p.banner_url ? <img src={p.banner_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:40,opacity:.3}}>{catObj.icon}</div>}
        <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',borderRadius:8,padding:'5px 12px'}}>
          <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff'}}>${Math.round(p.price||0)}</span>
          {p.compare_price && <span style={{fontSize:10,color:'rgba(255,255,255,.4)',textDecoration:'line-through',marginLeft:4}}>${Math.round(p.compare_price)}</span>}
        </div>
        <div style={{position:'absolute',bottom:10,left:10,display:'flex',gap:3}}>
          <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'rgba(22,163,74,.85)',color:'#fff'}}>50% Creator</span>
          <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'rgba(14,165,233,.85)',color:'#fff'}}>25% You</span>
        </div>
        {(p.total_sales||0)>5 && <div style={{position:'absolute',top:10,left:10,display:'flex',alignItems:'center',gap:3,background:'rgba(245,158,11,.9)',borderRadius:4,padding:'2px 6px'}}><TrendingUp size={10} color="#fff"/><span style={{fontSize:8,fontWeight:800,color:'#fff'}}>HOT</span></div>}
      </div>
      <div style={{padding:'16px 18px',flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:4,lineHeight:1.3}}>{p.title}</div>
        <div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:6}}>by {p.creator_name||'Seller'}</div>
        <div style={{fontSize:12,color:'var(--sap-text-secondary)',lineHeight:1.6,marginBottom:12,flex:1}}>{(p.short_description||'').slice(0,100)}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5,background:'var(--sap-bg-page)',color:'var(--sap-text-muted)'}}>{catObj.icon} {p.category}</span>
            {p.avg_rating > 0 && <span style={{fontSize:10,color:'var(--sap-amber)',display:'flex',alignItems:'center',gap:2}}><Star size={10}/>{p.avg_rating}</span>}
          </div>
          {p.total_sales > 0 && <span style={{fontSize:9,fontWeight:600,color:'var(--sap-text-muted)'}}>{p.total_sales} sold</span>}
        </div>
      </div>
    </div>
  );
}

function ProductDetail({ product, onBack, currentUserId }) {
  var [copied, setCopied] = useState(false);
  var p = product;
  var isOwner = currentUserId && p.creator_id === currentUserId;
  var earnPerSale = formatMoney((p.price||0)*0.25);
  var affLink = window.location.origin + '/supermarket/product/' + p.id;

  function copyLink() { navigator.clipboard.writeText(affLink); setCopied(true); setTimeout(function(){setCopied(false);},2000); }

  return (
    <div>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'var(--sap-text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:16}}>← Back to SuperMarket</button>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,alignItems:'start'}}>
        <div>
          <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240)',borderRadius:14,overflow:'hidden',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {p.banner_url ? <img src={p.banner_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:64,opacity:.2}}>📦</div>}
          </div>
          {p.video_url && (
            <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',aspectRatio:'16/9'}}>
              <iframe src={p.video_url.includes('youtu')?'https://www.youtube.com/embed/'+(p.video_url.split('v=')[1]||p.video_url.split('/').pop()||'').split('&')[0]:p.video_url} style={{width:'100%',height:'100%',border:'none'}} allowFullScreen/>
            </div>
          )}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'#0c1e4a',padding:'14px 20px'}}><div style={{fontSize:14,fontWeight:800,color:'#fff'}}>About This Product</div></div>
            <div style={{padding:'20px',fontSize:13,color:'#334155',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{(p.description||'No description provided.').replace(/<[^>]*>/g, '')}</div>
          </div>
          {Array.isArray(p.features) && p.features.length > 0 && (
            <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginTop:14}}>
              <div style={{background:'#0c1e4a',padding:'14px 20px'}}><div style={{fontSize:14,fontWeight:800,color:'#fff'}}>What You Get</div></div>
              <div style={{padding:'16px 20px'}}>
                {p.features.map(function(f,i){return <div key={i} style={{display:'flex',gap:8,padding:'6px 0',fontSize:13,color:'#334155'}}><span style={{color:'var(--sap-green)'}}>✓</span>{f}</div>;})}
              </div>
            </div>
          )}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Buy card */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#0c1e4a,#172554)',padding:'20px'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:6}}>{p.title}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>by {p.creator_name||'Seller'} · {p.file_name||'Digital Download'}</div>
            </div>
            <div style={{padding:'20px'}}>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:800,color:'var(--sap-text-primary)'}}>${Math.round(p.price||0)}</span>
                {p.compare_price && <span style={{fontSize:16,color:'var(--sap-text-muted)',textDecoration:'line-through'}}>${Math.round(p.compare_price)}</span>}
              </div>
              {p.avg_rating > 0 && <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:12}}>{[1,2,3,4,5].map(function(s){return <Star key={s} size={14} color={s<=Math.round(p.avg_rating)?'var(--sap-amber)':'var(--sap-border)'} fill={s<=Math.round(p.avg_rating)?'var(--sap-amber)':'none'}/>;})}<span style={{fontSize:11,color:'var(--sap-text-muted)'}}>({p.review_count} reviews)</span></div>}
              {isOwner ? (
                <div style={{textAlign:'center',padding:'14px',borderRadius:10,background:'linear-gradient(135deg,rgba(139,92,246,.06),rgba(139,92,246,.02))',border:'1px solid rgba(139,92,246,.15)',marginBottom:8}}>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--sap-purple)'}}>Your Product</div>
                  <div style={{fontSize:11,color:'var(--sap-text-muted)',marginTop:2}}>This is your listing — {p.total_sales||0} sales so far</div>
                </div>
              ) : (
                <button style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',borderRadius:10,border:'none',cursor:'pointer',background:'var(--sap-green)',color:'#fff',fontSize:15,fontWeight:800,fontFamily:'inherit',marginBottom:8,boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
                  <Download size={16}/> Buy & Download — ${Math.round(p.price||0)}
                </button>
              )}
              <div style={{fontSize:10,color:'var(--sap-text-muted)',textAlign:'center'}}>{isOwner?'Manage from My Products':'Instant download after purchase'}</div>
            </div>
          </div>
          {/* Promote card */}
          <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#0c1e4a,#172554)',padding:'16px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}><DollarSign size={14} color="var(--sap-accent-light)"/><span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Promote & Earn 25%</span></div>
            </div>
            <div style={{padding:'20px'}}>
              <div style={{textAlign:'center',marginBottom:14}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'var(--sap-accent)'}}>${earnPerSale}</div>
                <div style={{fontSize:10,color:'var(--sap-text-muted)'}}>per sale</div>
              </div>
              <div style={{display:'flex',gap:6,marginBottom:10}}>
                <input value={affLink} readOnly style={{flex:1,padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:9,fontFamily:'monospace',color:'var(--sap-text-muted)',background:'var(--sap-bg-input)',outline:'none'}}/>
                <button onClick={copyLink} style={{display:'flex',alignItems:'center',gap:3,padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',background:copied?'var(--sap-green)':'var(--sap-accent)',color:'#fff',fontSize:11,fontWeight:700,fontFamily:'inherit'}}>
                  {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                </button>
              </div>
            </div>
          </div>
          {/* Split */}
          <div style={{background:'var(--sap-bg-input)',border:'1px solid #e8ecf2',borderRadius:12,padding:16}}>
            <div style={{fontSize:11,fontWeight:800,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Commission Split</div>
            {[
              {label:'Product Creator',pct:'50%',amount:formatMoney((p.price||0)*0.5),color:'var(--sap-green)'},
              {label:'You (Affiliate)',pct:'25%',amount:earnPerSale,color:'var(--sap-accent)'},
              {label:'Platform',pct:'25%',amount:formatMoney((p.price||0)*0.25),color:'var(--sap-purple)'},
            ].map(function(s,i){
              return <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid #e8ecf2':'none'}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/><span style={{fontSize:12,fontWeight:600,color:'var(--sap-text-secondary)'}}>{s.label}</span></div><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,fontWeight:700,color:s.color}}>{s.pct}</span><span style={{fontSize:12,fontWeight:800,color:'var(--sap-text-primary)'}}>${s.amount}</span></div></div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyProducts({ products, onBack, onCreate, onReload }) {
  var [deleting, setDeleting] = useState('');

  function handleDelete(id, title, hasSales) {
    if (hasSales) {
      if (!confirm('This product has sales. Deleting will remove it from the marketplace. Are you sure?')) return;
    } else {
      if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
    }
    setDeleting(id);
    apiDelete('/api/supermarket/products/' + id).then(function() { setDeleting(''); if (onReload) onReload(); }).catch(function(e) { alert(e.message || 'Failed to delete'); setDeleting(''); });
  }

  return (
    <div>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'var(--sap-text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:16}}>← Back to SuperMarket</button>
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
        <div style={{background:'#0c1e4a',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>My Digital Products</div>
          <button onClick={onCreate} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:8,background:'var(--sap-accent)',color:'#fff',fontSize:11,fontWeight:700,textDecoration:'none',fontFamily:'inherit',border:'none',cursor:'pointer'}}>+ New Product</button>
        </div>
        {products.length > 0 ? products.map(function(p,i) {
          var sc = {published:{bg:'var(--sap-green-bg-mid)',color:'var(--sap-green)'},draft:{bg:'var(--sap-bg-page)',color:'var(--sap-text-muted)'},pending_review:{bg:'var(--sap-amber-bg)',color:'var(--sap-amber)'}}[p.status]||{bg:'var(--sap-bg-page)',color:'var(--sap-text-muted)'};
          return (
            <div key={p.id} style={{padding:'16px 24px',borderBottom:i<products.length-1?'1px solid #f5f6f8':'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:50,height:50,borderRadius:8,background:'linear-gradient(135deg,#0b1729,#132240)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                  {p.banner_url ? <img src={p.banner_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <span style={{fontSize:20,opacity:.3}}>📦</span>}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)'}}>{p.title}</div>
                  <div style={{display:'flex',gap:8,marginTop:3}}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--sap-text-primary)'}}>${Math.round(p.price||0)}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:3,background:sc.bg,color:sc.color,textTransform:'capitalize'}}>{p.status.replace('_',' ')}</span>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:'var(--sap-accent)'}}>{p.total_sales||0}</div><div style={{fontSize:9,color:'var(--sap-text-muted)'}}>Sales</div></div>
                <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:'var(--sap-green)'}}>${Math.round(p.total_revenue||0)}</div><div style={{fontSize:9,color:'var(--sap-text-muted)'}}>Revenue</div></div>
                <button onClick={function(){handleDelete(p.id,p.title,(p.total_sales||0)>0);}} disabled={deleting===p.id}
                  style={{padding:'6px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:deleting===p.id?0.5:1}}>
                  {deleting===p.id?'...':'Delete'}
                </button>
              </div>
            </div>
          );
        }) : (
          <div style={{padding:'60px 20px',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.3}}>📦</div>
            <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:4}}>No products yet</div>
            <div style={{fontSize:12,color:'var(--sap-text-muted)',marginBottom:16}}>List your first digital product and start earning</div>
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

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
