import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../utils/api';
import AppLayout from '../components/layout/AppLayout';
import { Gift, Copy, Check, Heart, ExternalLink, ChevronRight } from 'lucide-react';

export default function PayItForward() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [creating, setCreating] = useState(false);
  var [showForm, setShowForm] = useState(false);
  var [recipientName, setRecipientName] = useState('');
  var [message, setMessage] = useState('');
  var [newLink, setNewLink] = useState('');
  var [copied, setCopied] = useState('');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');

  function loadData() {
    apiGet('/api/pay-it-forward/dashboard').then(function(d) {
      setData(d);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadData(); }, []);

  function createVoucher(method) {
    if (creating) return;
    setCreating(true);
    setError('');
    setSuccess('');
    apiPost('/api/pay-it-forward/create', {
      recipient_name: recipientName,
      personal_message: message,
      pay_method: method || 'wallet',
    }).then(function(r) {
      if (r.checkout_url) {
        // Crypto — redirect to payment page
        window.location.href = r.checkout_url;
        return;
      }
      if (r.success) {
        setNewLink(r.link);
        setSuccess(t('payItForward.giftCreated'));
        setShowForm(false);
        setRecipientName('');
        setMessage('');
        loadData();
      } else {
        setError(r.error || t('payItForward.createFailed'));
      }
      setCreating(false);
    }).catch(function(e) {
      setError(e.message || t('payItForward.createFailed'));
      setCreating(false);
    });
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(function() { setCopied(''); }, 2000);
  }

  if (loading) return (
    <AppLayout title="Pay It Forward">
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'#ec4899', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  var stats = data ? data.stats : {};
  var vouchers = data ? data.vouchers : [];
  var canPayFromWallet = data ? data.can_pay_from_wallet : false;

  return (
    <AppLayout title={t("payItForward.title")} subtitle={t("payItForward.subtitle")}>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}} .pif-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)!important}'}</style>

      {/* Hero Banner */}
      <div style={{
        background:'linear-gradient(135deg,#831843,#be185d,#ec4899)',
        borderRadius:18, padding:'32px 36px', marginBottom:24,
        textAlign:'center', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=75)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.12, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:-40, right:-40, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ width:68, height:68, borderRadius:18, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Heart size={34} color="#fff"/>
          </div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, color:'#fff', marginBottom:6 }}>Pay It Forward</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, color:'#fbbf24', marginBottom:14 }}>Change Someone's Life Today</div>
          <div style={{ fontSize:16, color:'rgba(255,255,255,.85)', lineHeight:1.7, maxWidth:500, margin:'0 auto' }}>
            Gift a free membership to someone who needs it. When they succeed, they'll do the same for someone else. One act of generosity creates a chain of success.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:34, fontWeight:800, color:'#ec4899' }}>{stats.total_gifted || 0}</div>
          <div style={{ fontSize:14, color:'#64748b', marginTop:6 }}>Gifts given</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:34, fontWeight:800, color:'#10b981' }}>{stats.total_claimed || 0}</div>
          <div style={{ fontSize:14, color:'#64748b', marginTop:6 }}>Lives changed</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:34, fontWeight:800, color:'#8b5cf6' }}>{stats.max_chain_depth || 0}</div>
          <div style={{ fontSize:14, color:'#64748b', marginTop:6 }}>Chain depth</div>
        </div>
      </div>

      {/* Received gift notice */}
      {data && data.received_gift && data.received_gift.gifter_name && (
        <div style={{ background:'#fdf4ff', border:'1px solid #f0abfc', borderRadius:12, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <Gift size={20} color="#a855f7"/>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Your membership was gifted by {data.received_gift.gifter_name}</div>
            {data.received_gift.message && <div style={{ fontSize:12, color:'#64748b', marginTop:2, fontStyle:'italic' }}>"{data.received_gift.message}"</div>}
            <div style={{ fontSize:12, color:'#a855f7', marginTop:4, fontWeight:600 }}>Pay it forward when you're ready — gift a membership to someone who needs it.</div>
          </div>
        </div>
      )}

      {/* Error / Success */}
      {error && <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600, color:'#dc2626' }}>{error}</div>}
      {success && (
        <div style={{ padding:'16px 20px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#059669', marginBottom:8 }}>{success}</div>
          {newLink && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input value={newLink} readOnly style={{ flex:1, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'#fff' }}/>
              <button onClick={function() { copyLink(newLink); }}
                style={{ padding:'10px 16px', borderRadius:8, border:'none', background: copied === newLink ? '#10b981' : '#8b5cf6', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                {copied === newLink ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Gift Button / Form */}
      {!showForm ? (
        <button onClick={function() { setShowForm(true); setError(''); setSuccess(''); setNewLink(''); }}
          style={{
            padding:'14px 28px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:16, fontWeight:800, color:'#fff',
            background:'linear-gradient(135deg,#ec4899,#db2777)',
            boxShadow:'0 4px 0 #9d174d, 0 6px 16px rgba(236,72,153,.3)',
            marginBottom:24, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            margin:'0 auto 24px', transition:'all .1s',
          }}
          onMouseDown={function(e) { e.currentTarget.style.boxShadow='0 1px 0 #9d174d, 0 2px 8px rgba(236,72,153,.2)'; e.currentTarget.style.transform='translateY(3px)'; }}
          onMouseUp={function(e) { e.currentTarget.style.boxShadow='0 4px 0 #9d174d, 0 6px 16px rgba(236,72,153,.3)'; e.currentTarget.style.transform='translateY(0)'; }}
          onMouseLeave={function(e) { e.currentTarget.style.boxShadow='0 4px 0 #9d174d, 0 6px 16px rgba(236,72,153,.3)'; e.currentTarget.style.transform='translateY(0)'; }}
        >
          <Gift size={18}/> Gift a Membership — $20
        </button>
      ) : (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:24, marginBottom:24 }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:16 }}>Gift a Membership</div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:4 }}>Recipient's name (optional)</label>
            <input value={recipientName} onChange={function(e) { setRecipientName(e.target.value); }}
              placeholder="Who is this gift for?"
              style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:4 }}>Personal message (optional)</label>
            <textarea value={message} onChange={function(e) { setMessage(e.target.value); }}
              placeholder="I believe in you..."
              rows={3}
              style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', resize:'vertical' }}/>
          </div>

          <div style={{ padding:'12px 16px', background:'#f8fafc', borderRadius:8, border:'1px solid #f1f5f9', marginBottom:16, fontSize:14, color:'#64748b' }}>
            Choose how to pay — <strong style={{ color:'#0f172a' }}>$20.00</strong> per gift voucher
            {data && <span> · Wallet balance: <strong style={{ color:'#10b981' }}>${data.wallet_balance.toFixed(2)}</strong></span>}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
            <button onClick={function() { createVoucher('wallet'); }} disabled={creating || !canPayFromWallet}
              style={{
                width:'100%', padding:14, borderRadius:10, border:'none', cursor: creating || !canPayFromWallet ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', fontSize:15, fontWeight:800, color:'#fff',
                background: canPayFromWallet ? 'linear-gradient(135deg,#ec4899,#db2777)' : '#cbd5e1',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {creating ? t('payItForward.creating') : canPayFromWallet ? t('payItForward.payWallet') : t('payItForward.insufficientBalance')}
            </button>
            <button onClick={function() { createVoucher('crypto'); }} disabled={creating}
              style={{
                width:'100%', padding:14, borderRadius:10, border:'1.5px solid #e2e8f0', cursor: creating ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', fontSize:15, fontWeight:700, color:'#475569', background:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {creating ? t('payItForward.creating') : t('payItForward.payCrypto')}
            </button>
          </div>

          <div style={{ display:'flex', justifyContent:'center' }}>
            <button onClick={function() { setShowForm(false); }}
              style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'#64748b' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Vouchers */}
      {vouchers.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', marginBottom:24 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a' }}>Your Gift Vouchers</div>
          </div>
          {vouchers.map(function(v) {
            var isClaimed = v.status === 'claimed';
            return (
              <div key={v.id} style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                    background: isClaimed ? '#f0fdf4' : '#fdf4ff',
                    border: '1px solid ' + (isClaimed ? '#bbf7d0' : '#f0abfc'),
                  }}>
                    {isClaimed ? <Check size={16} color="#10b981"/> : <Gift size={16} color="#a855f7"/>}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>
                      {v.recipient_name || 'Open gift'}
                      {isClaimed && v.claimed_by && <span style={{ fontWeight:400, color:'#64748b' }}> — claimed by {v.claimed_by.first_name || v.claimed_by.username}</span>}
                    </div>
                    <div style={{ fontSize:13, color:'#64748b' }}>
                      {v.code} · {isClaimed ? 'Claimed' : 'Available'} · Chain depth {v.chain_depth}
                    </div>
                  </div>
                </div>
                {!isClaimed && (
                  <button onClick={function() { copyLink(v.link); }}
                    style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:700, color:'#64748b', display:'flex', alignItems:'center', gap:4 }}>
                    {copied === v.link ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy link</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 24px' }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:16 }}>How Pay It Forward works</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { n:'1', color:'#ec4899', bg:'#fce7f3', title:'You gift a membership', desc:'Pay $20 from your wallet or with crypto to create a gift voucher with a unique shareable link.' },
            { n:'2', color:'#8b5cf6', bg:'#ede9fe', title:'Someone joins for free', desc:'Your recipient clicks the link, creates an account, and their membership activates instantly — no cost to them.' },
            { n:'3', color:'#10b981', bg:'#f0fdf4', title:'They pay it forward', desc:"When they earn $20+ in commissions, they're prompted to gift a membership to someone else. The chain continues." },
          ].map(function(s) {
            return (
              <div key={s.n} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:s.color, flexShrink:0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>{s.title}</div>
                  <div style={{ fontSize:14, color:'#64748b', lineHeight:1.7 }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </AppLayout>
  );
}
