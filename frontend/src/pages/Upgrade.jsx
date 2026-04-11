import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { Coins, Globe, Check, Zap, Wrench, Users, Mail, BookOpen, Headphones } from 'lucide-react';
import CryptoCheckout from '../components/CryptoCheckout';
import WalletGuideCard from '../components/WalletGuideCard';

var css = `
  .up-card{border-radius:20px;overflow:hidden;position:relative;background:#fff;transition:transform .25s,box-shadow .25s}
  .up-card:hover{transform:translateY(-6px)}
  .up-card-basic{border:1px solid #e2e8f0;box-shadow:0 4px 6px rgba(0,0,0,.04),0 10px 24px rgba(0,0,0,.06),0 20px 48px rgba(0,0,0,.04)}
  .up-card-basic:hover{box-shadow:0 8px 16px rgba(0,0,0,.06),0 20px 40px rgba(0,0,0,.1),0 32px 64px rgba(0,0,0,.06)}
  .up-card-pro{border:2px solid rgba(239,68,68,.4);box-shadow:0 4px 6px rgba(239,68,68,.06),0 10px 24px rgba(239,68,68,.08),0 20px 48px rgba(239,68,68,.06)}
  .up-card-pro:hover{box-shadow:0 8px 16px rgba(239,68,68,.08),0 20px 40px rgba(239,68,68,.12),0 32px 64px rgba(239,68,68,.08)}
  .up-toggle-track{width:48px;height:26px;border-radius:13px;position:relative;cursor:pointer;transition:background .3s;background:#cbd5e1}
  .up-toggle-track.on{background:linear-gradient(90deg,#172554,#1e3a8a)}
  .up-toggle-thumb{width:20px;height:20px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:transform .3s;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .up-toggle-track.on .up-toggle-thumb{transform:translateX(22px)}
  .up-feat{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid #f1f5f9}
  .up-feat:first-child{border-top:none}
`;

export default function Upgrade() {
  var { user, refreshUser } = useAuth();

  // Admin preview mode: add ?preview=1 to URL to see page as a new user
  var urlParams = new URLSearchParams(window.location.search);
  var previewMode = user?.is_admin && urlParams.get('preview') === '1';

  var isPro = previewMode ? false : user?.membership_tier === 'pro';
  var isActive = previewMode ? false : user?.is_active;
  var [loading, setLoading] = useState('');
  var [error, setError] = useState('');
  var [cryptoCheckout, setCryptoCheckout] = useState(null);
  var [billing, setBilling] = useState('monthly');

  var isAnnual = billing === 'annual';
  var isBasicActive = isActive && !isPro;

  function nowPaymentsCheckout(tier) {
    setLoading(tier + '_np');
    setError('');
    var productKey = isAnnual ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    apiPost('/api/nowpayments/create-invoice', { product_key: productKey })
      .then(function(d) {
        setLoading('');
        if (d.invoice_url) { window.location.href = d.invoice_url; }
        else { setError(d.error || 'Could not start checkout. Please try again.'); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || 'Checkout failed.'); });
  }

  function openCryptoCheckout(tier) {
    var label = isAnnual
      ? (tier === 'pro' ? 'Pro Annual \u2014 $350/year' : 'Basic Annual \u2014 $200/year')
      : (tier === 'pro' ? 'Pro Membership \u2014 $35/mo' : 'Basic Membership \u2014 $20/mo');
    var productKey = isAnnual ? 'membership_' + tier + '_annual' : 'membership_' + tier;
    setCryptoCheckout({ productKey: productKey, label: label });
  }

  function handleUpgradeToPro() {
    setLoading('upgrade');
    setError('');
    apiPost('/api/upgrade-to-pro', {})
      .then(function(d) {
        setLoading('');
        if (d.message) { if (refreshUser) refreshUser(); }
        else { setError(d.error || 'Upgrade failed.'); }
      })
      .catch(function(e) { setLoading(''); setError(e.message || 'Upgrade failed.'); });
  }

  function FeatureRow({ icon, text, bold, color }) {
    var bg = color === 'red' ? '#fef2f2' : '#eff6ff';
    var stroke = color === 'red' ? '#dc2626' : '#2563eb';
    return (
      <div className="up-feat">
        <div style={{ width:30, height:30, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {icon || <Check size={14} color={stroke} strokeWidth={2.5} />}
        </div>
        <span style={{ fontSize:14, color: bold ? '#0f172a' : '#475569', fontWeight: bold ? 700 : 400, lineHeight:1.5 }}>{text}</span>
      </div>
    );
  }

  function PayButtons({ tier }) {
    var isCurrent = (tier === 'basic' && isBasicActive) || (tier === 'pro' && isPro);
    var isUpgrade = tier === 'pro' && isBasicActive;
    var btnGrad = tier === 'pro'
      ? 'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)'
      : 'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)';
    var btnShadow = tier === 'pro'
      ? '0 4px 16px rgba(239,68,68,.2)'
      : '0 4px 16px rgba(37,99,235,.2)';
    var price = isAnnual
      ? (tier === 'pro' ? '$350' : '$200')
      : (tier === 'pro' ? '$35' : '$20');

    if (isCurrent) {
      return (
        <div style={{ padding:14, borderRadius:14, fontSize:14, fontWeight:700, textAlign:'center', background:'linear-gradient(135deg,#dcfce7,#bbf7d0)', color:'#059669', border:'1px solid #86efac' }}>
          {"\u2713"} Current Plan
        </div>
      );
    }

    if (isUpgrade) {
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={handleUpgradeToPro} disabled={loading === 'upgrade'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:16, borderRadius:14, fontSize:15, fontWeight:700, border:'none', cursor: loading === 'upgrade' ? 'default' : 'pointer', fontFamily:'inherit', background: loading === 'upgrade' ? '#94a3b8' : btnGrad, color:'#fff', boxShadow: loading === 'upgrade' ? 'none' : btnShadow }}>
            {loading === 'upgrade' ? 'Upgrading...' : '\u26A1 Upgrade to Pro \u2014 $15'}
          </button>
          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center' }}>Pay the $15 difference now. $35/mo from next renewal.</div>
        </div>
      );
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={function(){ openCryptoCheckout(tier); }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:16, borderRadius:14, fontSize:15, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', background:btnGrad, color:'#fff', boxShadow:btnShadow, transition:'all .2s' }}>
          <Coins size={17} /> Pay with Crypto (USDT / USDC)
        </button>
        <button onClick={function(){ nowPaymentsCheckout(tier); }} disabled={loading === tier + '_np'}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:14, borderRadius:14, fontSize:14, fontWeight:700, border:'1.5px solid #e2e8f0', cursor: loading === tier + '_np' ? 'default' : 'pointer', fontFamily:'inherit', background:'#fff', color:'#64748b', transition:'all .2s' }}
          onMouseOver={function(e){e.currentTarget.style.borderColor='#0ea5e9';e.currentTarget.style.color='#0ea5e9'}}
          onMouseOut={function(e){e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b'}}>
          <Globe size={16} />
          {loading === tier + '_np' ? 'Loading...' : 'Pay with 350+ Cryptos \u2014 ' + price}
        </button>
        <div style={{ textAlign:'center', fontSize:10, color:'#94a3b8' }}>{"\uD83D\uDD12"} Secure payment \u00B7 Instant activation</div>
      </div>
    );
  }

  return (
    <AppLayout title={"\u26A1 Upgrade"} subtitle="Choose your plan">
      <style>{css}</style>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:14, color:'#dc2626', textAlign:'center' }}>
            {error}
          </div>
        )}

        {/* Toggle */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:14, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:50, padding:'8px 24px' }}>
            <span onClick={function(){setBilling('monthly')}} style={{ fontSize:14, fontWeight:600, color: !isAnnual ? '#0f172a' : '#94a3b8', cursor:'pointer', userSelect:'none', transition:'color .2s' }}>Monthly</span>
            <div className={'up-toggle-track' + (isAnnual ? ' on' : '')} onClick={function(){setBilling(isAnnual ? 'monthly' : 'annual')}}>
              <div className="up-toggle-thumb"/>
            </div>
            <span onClick={function(){setBilling('annual')}} style={{ fontSize:14, fontWeight:600, color: isAnnual ? '#0f172a' : '#94a3b8', cursor:'pointer', userSelect:'none', transition:'color .2s' }}>Annual</span>
            <span style={{ fontSize:11, fontWeight:700, color:'#16a34a', background:'#f0fdf4', border:'1px solid #dcfce7', padding:'3px 10px', borderRadius:20 }}>Save 17%</span>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'stretch', marginBottom:32 }}>

          {/* BASIC */}
          <div className="up-card up-card-basic" style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'44px 32px 40px', background:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', bottom:-30, left:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Basic</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                  {isAnnual ? '$200' : '$20'}<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:8 }}>
                  {isAnnual ? '$16.67/month effective' : 'Billed monthly'}
                </div>
                {isAnnual && (
                  <div style={{ fontSize:18, fontWeight:800, color:'#4ade80', marginTop:12, textShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                    Save $40/year — 2 months free
                  </div>
                )}
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:16, lineHeight:1.6 }}>
                  Everything you need to start marketing and earning with AI tools.
                </div>
              </div>
            </div>
            <div style={{ padding:'24px 32px 32px', flex:1, display:'flex', flexDirection:'column' }}>
              <div style={{ marginBottom:20 }}>
                <FeatureRow text="Creative Studio — AI video, images, music & voiceover" bold color="blue" />
                <FeatureRow text="LinkHub — your personal bio link page" color="blue" />
                <FeatureRow text="Link Tools — short links, rotators, tracking" color="blue" />
                <FeatureRow text="Content Creator — social posts, ad copy, video scripts" color="blue" />
                <FeatureRow text="Campaign Grid — 8-tier video advertising" color="blue" />
                <FeatureRow text="50% referral commissions — on every signup" color="blue" />
                <FeatureRow text="Profit Nexus — earn from credit pack referrals" color="blue" />
              </div>
              <div style={{ flex:1 }}/>
              <PayButtons tier="basic" />
            </div>
          </div>

          {/* PRO */}
          <div className="up-card up-card-pro" style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ position:'absolute', top:16, right:16, fontSize:10, fontWeight:700, color:'#fff', background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', padding:'5px 14px', borderRadius:6, zIndex:3, textTransform:'uppercase', letterSpacing:.5 }}>Most Popular</div>
            <div style={{ padding:'44px 32px 40px', background:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', bottom:-30, left:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Pro</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:900, color:'#fff', lineHeight:1 }}>
                  {isBasicActive ? '$15' : isAnnual ? '$350' : '$35'}<span style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,.7)' }}>/{isBasicActive ? 'upgrade' : isAnnual ? 'yr' : 'mo'}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:8 }}>
                  {isBasicActive ? 'then $35/mo from next month' : isAnnual ? '$29.17/month effective' : 'Billed monthly'}
                </div>
                {isAnnual && !isBasicActive && (
                  <div style={{ fontSize:18, fontWeight:800, color:'#4ade80', marginTop:12, textShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                    Save $70/year — 2 months free
                  </div>
                )}
                <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.7)', marginTop:16, lineHeight:1.6 }}>
                  Full suite of AI marketing tools plus advanced automation and leads.
                </div>
              </div>
            </div>
            <div style={{ padding:'24px 32px 32px', flex:1, display:'flex', flexDirection:'column' }}>
              <div style={{ marginBottom:20 }}>
                <FeatureRow text="Everything in Basic plus:" bold color="red" />
                <FeatureRow text="SuperPages — AI-powered landing pages and funnels" color="red" icon={<Zap size={14} color="#dc2626" />} />
                <FeatureRow text="SuperSeller AI — automated sales campaigns" color="red" icon={<Wrench size={14} color="#dc2626" />} />
                <FeatureRow text="My Leads CRM — capture, track and nurture leads" color="red" icon={<Users size={14} color="#dc2626" />} />
                <FeatureRow text="Email Autoresponder — automated sequences" color="red" icon={<Mail size={14} color="#dc2626" />} />
                <FeatureRow text="Course Creator — build and sell courses (coming soon)" color="red" icon={<BookOpen size={14} color="#dc2626" />} />
                <FeatureRow text="Priority support — faster response times" color="red" icon={<Headphones size={14} color="#dc2626" />} />
              </div>
              <div style={{ flex:1 }}/>
              <PayButtons tier="pro" />
            </div>
          </div>

        </div>

        {/* Sponsor section */}
        <div style={{ background:'#f8fafc', borderRadius:20, border:'1px solid #e2e8f0', padding:'28px 32px', textAlign:'center', marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,.03)' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Earn while you grow</div>
          <div style={{ fontSize:14, color:'#64748b', lineHeight:1.7 }}>Refer a member and earn 50% commission — every month they stay active, or one big payout on annual billing.</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:14, padding:'10px 20px', background:'#f0fdf4', border:'1px solid #dcfce7', borderRadius:12, fontSize:14, fontWeight:700, color:'#16a34a' }}>
            Annual Pro referral = $175 instant commission
          </div>
        </div>

        <div style={{ marginTop:24 }}>
          <WalletGuideCard compact />
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:16 }}>
          Secure payment via USDT/USDC on Polygon or 350+ cryptos via NOWPayments · All sales are final
        </p>
      </div>

      {cryptoCheckout && (
        <CryptoCheckout
          productKey={cryptoCheckout.productKey}
          productLabel={cryptoCheckout.label}
          onSuccess={function(){ setCryptoCheckout(null); if (refreshUser) refreshUser(); }}
          onCancel={function(){ setCryptoCheckout(null); }}
        />
      )}
    </AppLayout>
  );
}
