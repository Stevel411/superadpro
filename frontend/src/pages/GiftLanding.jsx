import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Gift, Heart, Check, ArrowRight } from 'lucide-react';

export default function GiftLanding() {
  var { t } = useTranslation();
  var { code } = useParams();
  var { user } = useAuth();
  var navigate = useNavigate();
  var [gift, setGift] = useState(null);
  var [loading, setLoading] = useState(true);
  var [claiming, setClaiming] = useState(false);
  var [claimed, setClaimed] = useState(false);
  var [error, setError] = useState('');
  var [giftError, setGiftError] = useState('');

  useEffect(function() {
    fetch('/api/gift/' + code).then(function(r) { return r.json(); }).then(function(d) {
      if (d.valid) {
        setGift(d);
      } else {
        setGiftError(d.error || 'Invalid gift voucher');
      }
      setLoading(false);
    }).catch(function() {
      setGiftError('Could not load gift information');
      setLoading(false);
    });
  }, [code]);

  function claimGift() {
    if (claiming) return;
    setClaiming(true);
    setError('');
    apiPost('/api/gift/' + code + '/claim', {}).then(function(r) {
      if (r.success) {
        setClaimed(true);
      } else {
        setError(r.error || 'Could not claim gift');
      }
      setClaiming(false);
    }).catch(function(e) {
      setError(e.message || 'Could not claim gift');
      setClaiming(false);
    });
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--sap-cobalt-deep)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,.1)', borderTopColor:'var(--sap-pink)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (giftError) return (
    <div style={{ minHeight:'100vh', background:'var(--sap-cobalt-deep)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'rgba(239,68,68,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Gift size={28} color="var(--sap-red-bright)"/>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#fff', marginBottom:8 }}>{giftError}</div>
        <Link to="/" style={{ fontSize:14, color:'var(--sap-accent-light)', textDecoration:'none' }}>Go to SuperAdPro →</Link>
      </div>
    </div>
  );

  if (claimed) return (
    <div style={{ minHeight:'100vh', background:'var(--sap-cobalt-deep)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:440 }}>
        <div style={{ width:72, height:72, borderRadius:18, background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <Check size={36} color="#fff"/>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:800, color:'#fff', marginBottom:8 }}>Welcome to SuperAdPro!</div>
        <div style={{ fontSize:15, color:'rgba(255,255,255,.6)', lineHeight:1.7, marginBottom:24 }}>
          Your membership has been activated. {gift.gifter_name} believed in you — now go build something amazing.
        </div>
        <div style={{ padding:'14px 20px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, marginBottom:24 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:4 }}>Remember</div>
          <div style={{ fontSize:14, color:'var(--sap-amber-bright)', fontWeight:700 }}>When you earn $20+, pay it forward and gift a membership to someone else.</div>
        </div>
        <button onClick={function() { navigate('/dashboard'); }}
          style={{ padding:'14px 28px', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:15, fontWeight:800, color:'#fff', background:'linear-gradient(135deg,#0ea5e9,#38bdf8)', display:'inline-flex', alignItems:'center', gap:8 }}>
          Go to Dashboard <ArrowRight size={16}/>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--sap-cobalt-deep)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ maxWidth:480, width:'100%' }}>

        {/* Gift card */}
        <div style={{
          background:'linear-gradient(135deg,#831843,#be185d,#ec4899)',
          borderRadius:24, padding:'40px 36px', textAlign:'center',
          position:'relative', overflow:'hidden', marginBottom:24,
        }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-40, left:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

          <div style={{ position:'relative' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <Gift size={32} color="#fff"/>
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', fontWeight:600, marginBottom:8 }}>You've been gifted a free membership by</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#fff', marginBottom:16 }}>{gift.gifter_name}</div>

            {gift.personal_message && (
              <div style={{ padding:'16px 20px', background:'rgba(255,255,255,.1)', borderRadius:12, marginBottom:16, maxWidth:360, margin:'0 auto 16px' }}>
                <div style={{ fontSize:15, color:'#fff', fontStyle:'italic', lineHeight:1.6 }}>"{gift.personal_message}"</div>
              </div>
            )}

            {gift.recipient_name && (
              <div style={{ fontSize:16, color:'rgba(255,255,255,.8)', fontWeight:700, marginBottom:8 }}>
                For you, {gift.recipient_name}
              </div>
            )}

            <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:4 }}>
              Free Basic Membership · Value: ${gift.gift_value}
            </div>
            {gift.chain_depth > 1 && (
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>
                This gift is part of a pay-it-forward chain — generation {gift.chain_depth}
              </div>
            )}
          </div>
        </div>

        {/* Claim section */}
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:'24px 28px', textAlign:'center' }}>

          {error && <div style={{ padding:'10px 14px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, marginBottom:16, fontSize:13, fontWeight:600, color:'var(--sap-red-bright)' }}>{error}</div>}

          {user ? (
            <div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', marginBottom:16 }}>
                Logged in as <strong style={{ color:'#fff' }}>{user.username}</strong>
              </div>
              <button onClick={claimGift} disabled={claiming}
                style={{
                  width:'100%', padding:16, borderRadius:12, border:'none', cursor: claiming ? 'wait' : 'pointer',
                  fontFamily:'inherit', fontSize:16, fontWeight:800, color:'#fff',
                  background:'linear-gradient(135deg,#10b981,#059669)',
                  boxShadow:'0 4px 16px rgba(16,185,129,.3)',
                }}>
                {claiming ? 'Activating...' : 'Claim My Free Membership'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', marginBottom:16, lineHeight:1.7 }}>
                Create a free account or log in to claim your gifted membership.
              </div>
              <div style={{ display:'flex', gap:10, flexDirection:'column' }}>
                <Link to={'/register?ref=' + (gift.gifter_username || '') + '&gift=' + code}
                  style={{
                    display:'block', textAlign:'center', padding:16, borderRadius:12, textDecoration:'none',
                    fontSize:16, fontWeight:800, color:'#fff',
                    background:'linear-gradient(135deg,#10b981,#059669)',
                    boxShadow:'0 4px 16px rgba(16,185,129,.3)',
                  }}>
                  Create Free Account
                </Link>
                <Link to={'/login?gift=' + code}
                  style={{
                    display:'block', textAlign:'center', padding:14, borderRadius:12, textDecoration:'none',
                    fontSize:14, fontWeight:700, color:'rgba(255,255,255,.6)',
                    border:'1px solid rgba(255,255,255,.1)',
                  }}>
                  Already have an account? Log in
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* What is SuperAdPro */}
        <div style={{ textAlign:'center', marginTop:24 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.3)' }}>
            SuperAdPro is a video advertising and AI marketing platform. Earn commissions by building your network.
          </div>
        </div>

      </div>
    </div>
  );
}
