import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Globe, Coins } from 'lucide-react';
import CryptoCheckout from '../components/CryptoCheckout';

const TIERS = {
  1: { name:'Starter',     price:20,   views:'5,000',     monthly:'500',    bonus:64,   grad:'linear-gradient(135deg,#064e3b,#047857,#10b981)' },
  2: { name:'Builder',     price:50,   views:'15,000',    monthly:'1,500',  bonus:160,  grad:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)' },
  3: { name:'Pro',         price:100,  views:'35,000',    monthly:'5,000',  bonus:320,  grad:'linear-gradient(135deg,#172554,#4c1d95,#8b5cf6)' },
  4: { name:'Advanced',    price:200,  views:'80,000',    monthly:'10,000', bonus:640,  grad:'linear-gradient(135deg,#831843,#be185d,#ec4899)' },
  5: { name:'Elite',       price:400,  views:'150,000',   monthly:'20,000', bonus:1280, grad:'linear-gradient(135deg,#134e4a,#0d9488,#2dd4bf)' },
  6: { name:'Premium',     price:600,  views:'250,000',   monthly:'30,000', bonus:1920, grad:'linear-gradient(135deg,#6b7280,#9ca3af,#d1d5db)' },
  7: { name:'Executive',   price:800,  views:'400,000',   monthly:'40,000', bonus:2560, grad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)' },
  8: { name:'Ultimate',    price:1000, views:'600,000',   monthly:'50,000', bonus:3200, grad:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)' },
};

export default function ActivateTier() {
  var { t } = useTranslation();
  const { tierId } = useParams();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [cryptoCheckout, setCryptoCheckout] = useState(false);

  const n = parseInt(tierId);
  const tier = TIERS[n];

  if (!t) return <AppLayout title="Campaign Tier"><div style={{textAlign:'center',padding:80,color:'var(--sap-text-muted)'}}>Invalid tier</div></AppLayout>;

  const handleNowPayments = async () => {
    if (paying) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/nowpayments/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_key: 'grid_' + n }),
      });
      const data = await res.json();
      if (data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        setError(data.error || 'Payment service unavailable. Please try again.');
        setPaying(false);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
      setPaying(false);
    }
  };

  return (
    <AppLayout title={`Activate ${tier.name}`} subtitle="Review your campaign tier before purchase">
      <div style={{maxWidth:700,margin:'0 auto'}}>

        {/* Tier hero — dark theme with animations */}
        <div style={{
          background:tier.grad,
          borderRadius:8, padding:'32px 36px', marginBottom:20,
          position:'relative', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.08)',pointerEvents:'none'}}/>

          <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
            <div style={{fontSize:12,fontWeight:700,color:n===6?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Campaign Tier</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:n===6?'#1f2937':'#fff',marginBottom:4}}>{tier.name}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:900,color:n===6?'#1f2937':'#fff',lineHeight:1,marginBottom:8}}>${tier.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:n===6?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.5)'}}>One-time activation · Up to {t.views} views</div>
          </div>
        </div>

        {/* PAY BUTTONS */}
        {error && (
          <div style={{padding:'12px 16px',background:'var(--sap-red-bg)',border:'1px solid #fecaca',borderRadius:10,marginBottom:12,fontSize:13,fontWeight:600,color:'var(--sap-red)'}}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {/* Crypto button FIRST — bright purple */}
          <button onClick={function(){ setCryptoCheckout(true); }} style={{
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            width:'100%', padding:16, borderRadius:12,
            fontSize:16, fontWeight:800, border:'none', cursor:'pointer',
            fontFamily:'inherit',
            background:'linear-gradient(135deg,#8b5cf6,#7c3aed,#6d28d9)',
            color:'#fff',
            boxShadow:'0 4px 0 #5b21b6,0 6px 20px rgba(124,58,237,.3)',
            letterSpacing:0.3, transition:'all 0.2s',
          }}>
            <Coins size={18} />
            {"\u26A1"} Pay with Crypto (USDT / USDC)
          </button>

          {/* 350+ Cryptos button SECOND — outline style */}
          <button onClick={handleNowPayments} disabled={paying} style={{
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            width:'100%', padding:15, borderRadius:12,
            fontSize:15, fontWeight:700, cursor:paying?'wait':'pointer',
            fontFamily:'inherit',
            background:'#fff', color:'var(--sap-text-muted)',
            border:'1.5px solid #e2e8f0',
            transition:'all 0.2s',
          }}
            onMouseOver={function(e){ e.currentTarget.style.borderColor='var(--sap-accent)'; e.currentTarget.style.color='var(--sap-accent)'; }}
            onMouseOut={function(e){ e.currentTarget.style.borderColor='var(--sap-border)'; e.currentTarget.style.color='var(--sap-text-muted)'; }}
          >
            <Globe size={17} />
            {paying ? 'Creating payment...' : `\uD83C\uDF10 Pay with 350+ Cryptos — $${tier.price.toLocaleString()}`}
          </button>

          <div style={{textAlign:'center',fontSize:10,color:'var(--sap-text-muted)'}}>{"\uD83D\uDD12"} Secure payment · Instant activation · {"\uD83D\uDCB3"} Card payments coming soon</div>
        </div>

        <div style={{padding:'10px 14px',background:'var(--sap-red-bg)',border:'1px solid #fecaca',borderRadius:10,marginBottom:24,fontSize:12,color:'#991b1b',lineHeight:1.5,textAlign:'center'}}>
          <strong>All sales are final.</strong> Campaign tier purchases are non-refundable. Commissions are paid instantly upon purchase and cannot be reversed.
        </div>

        {cryptoCheckout && (
          <CryptoCheckout
            productKey={'grid_' + n}
            productLabel={tier.name + ' Campaign — $' + tier.price.toLocaleString()}
            onSuccess={function(){ setCryptoCheckout(false); window.location.href='/app/campaign-tiers'; }}
            onCancel={function(){ setCryptoCheckout(false); }}
          />
        )}

        <div style={{textAlign:'center',marginBottom:16}}>
          <Link to="/campaign-tiers" style={{fontSize:13,color:'var(--sap-text-muted)',textDecoration:'none'}}>← Back to Campaign Tiers</Link>
        </div>
      </div>
    </AppLayout>
  );
}
