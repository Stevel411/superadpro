import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiPost } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Gift, Check, ArrowRight, VolumeX } from 'lucide-react';

/**
 * GiftLanding — recipient-facing landing page for a gift voucher.
 *
 * Visual structure:
 *   - Hero (bokeh background + small gifter pill + headline)
 *     fades into white below the fold
 *   - Video block (autoplay muted with click-to-unmute)
 *   - CTA + trust signals + reassurance
 *   - Optional personal message from gifter (only renders if present)
 *
 * Logic preserved from previous version:
 *   - Loads gift via /api/gift/{code} and validates
 *   - Loading / error / claimed states
 *   - Logged-in path: button calls /api/gift/{code}/claim
 *   - Logged-out path: routes to /register or /login with the gift code
 *   - Claimed state auto-redirects to /dashboard?just_claimed=1 after 2s
 */
export default function GiftLanding() {
  var { t } = useTranslation();
  var { code } = useParams();
  var { user } = useAuth();
  var [gift, setGift] = useState(null);
  var [loading, setLoading] = useState(true);
  var [claiming, setClaiming] = useState(false);
  var [claimed, setClaimed] = useState(false);
  var [error, setError] = useState('');
  var [giftError, setGiftError] = useState('');
  var [muted, setMuted] = useState(true);
  var videoRef = useRef(null);

  // Preview mode — visiting /gift/anything?preview=1 renders the page with
  // mock data so the layout can be reviewed without minting a real voucher.
  // Claim button is disabled in this mode (see render block below).
  // Remove this block once design review is complete.
  var isPreview = (typeof window !== 'undefined') &&
    new URLSearchParams(window.location.search).get('preview') === '1';

  useEffect(function() {
    if (isPreview) {
      setGift({
        valid: true,
        gifter_name: 'Demo Gifter',
        gifter_username: 'demo',
        gift_value: 20,
        personal_message: null,
        recipient_name: null,
        chain_depth: 1,
      });
      setLoading(false);
      return;
    }
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
  }, [code, isPreview]);

  function toggleMute() {
    if (!videoRef.current) return;
    var next = !muted;
    videoRef.current.muted = next;
    if (!next && videoRef.current.paused) {
      // Unmuting an autoplay-paused video — start it playing too.
      videoRef.current.play().catch(function() {});
    }
    setMuted(next);
  }

  function claimGift() {
    if (claiming) return;
    setClaiming(true);
    setError('');
    apiPost('/api/gift/' + code + '/claim', {}).then(function(r) {
      if (r.success) {
        setClaimed(true);
        // 2-second pause so user sees the success state, then auto-redirect.
        setTimeout(function() {
          var fromParam = r.gifter_name ? '&from=' + encodeURIComponent(r.gifter_name) : '';
          window.location.href = '/dashboard?just_claimed=1' + fromParam;
        }, 2000);
      } else {
        setError(r.error || 'Could not claim gift');
      }
      setClaiming(false);
    }).catch(function(e) {
      setError(e.message || 'Could not claim gift');
      setClaiming(false);
    });
  }

  // ─── Loading state ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#fdf2f1', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, border:'3px solid rgba(153,53,86,.15)', borderTopColor:'#993556', borderRadius:'50%', animation:'gift-spin .8s linear infinite' }}/>
      <style>{'@keyframes gift-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  // ─── Error state (invalid / expired / already-claimed code) ────
  if (giftError) return (
    <div style={{ minHeight:'100vh', background:'#fdf2f1', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'rgba(153,53,86,.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Gift size={28} color="#993556"/>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#4B1528', marginBottom:8 }}>{giftError}</div>
        <Link to="/" style={{ fontSize:14, color:'#993556', textDecoration:'none', fontWeight:600 }}>{t('giftLanding.goToSuperAdPro')}</Link>
      </div>
    </div>
  );

  // ─── Claimed (success) state ───────────────────────────────────
  if (claimed) return (
    <div style={{ minHeight:'100vh', background:'#fdf2f1', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:440 }}>
        <div style={{ width:72, height:72, borderRadius:18, background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <Check size={36} color="#fff"/>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:800, color:'#4B1528', marginBottom:8 }}>{t('giftLanding.welcomeTitle')}</div>
        <div style={{ fontSize:15, color:'#712B13', lineHeight:1.7, marginBottom:24 }}>
          Your membership has been activated. {gift.gifter_name} believed in you — now go build something amazing.
        </div>
        <div style={{ padding:'14px 20px', background:'rgba(255,255,255,.8)', border:'1px solid rgba(153,53,86,.15)', borderRadius:12, marginBottom:24 }}>
          <div style={{ fontSize:12, color:'#993556', marginBottom:4, fontWeight:600 }}>{t('giftLanding.remember')}</div>
          <div style={{ fontSize:14, color:'#4B1528', fontWeight:700 }}>{t('giftLanding.payForwardFull')}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, color:'#712B13', fontSize:13 }}>
            <div style={{ width:14, height:14, border:'2px solid rgba(153,53,86,.2)', borderTopColor:'#993556', borderRadius:'50%', animation:'gift-spin .8s linear infinite' }}/>
            <span>Taking you to your dashboard…</span>
          </div>
          <button onClick={function() {
              var fromParam = gift && gift.gifter_name ? '&from=' + encodeURIComponent(gift.gifter_name) : '';
              window.location.href = '/dashboard?just_claimed=1' + fromParam;
            }}
            style={{ padding:'10px 20px', borderRadius:8, border:'1px solid rgba(153,53,86,.25)', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'#993556' }}>
            Go now <ArrowRight size={13} style={{ verticalAlign:'middle', marginLeft:4 }}/>
          </button>
        </div>
        <style>{'@keyframes gift-spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </div>
  );

  // ─── Main landing page ─────────────────────────────────────────
  // Layout: bokeh hero up top, soft fade-to-white below the fold for
  // the video and CTA — keeps the emotional first impression but stops
  // the busy background from competing with the video.
  return (
    <div style={{ minHeight:'100vh', background:'#fff', position:'relative' }}>

      {/* Hero band — compact strip with just the SuperAdPro logo + the
          gifter pill on the bokeh background. Headline and subhead now
          live below the video so they don't sit on the bokeh-to-white
          transition (which was making the boundary line conspicuous). */}
      <div style={{
        position:'relative',
        backgroundImage:'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(255,255,255,1) 100%), url(/static/images/gift-hero.jpg)',
        backgroundSize:'cover',
        backgroundPosition:'center',
        backgroundRepeat:'no-repeat',
        paddingTop:'clamp(28px, 5vw, 50px)',
        paddingBottom:'clamp(28px, 5vw, 50px)',
        paddingLeft:20,
        paddingRight:20,
      }}>
        <div style={{ maxWidth:560, margin:'0 auto', textAlign:'center' }}>

          {/* SuperAdPro logo — pink mark + white wordmark with pink Pro
              accent. Non-clickable on this page so a curious recipient
              doesn't accidentally navigate away from the gift. */}
          <div style={{ marginBottom:'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:12,
            }}>
              <div style={{
                width:36, height:36, borderRadius:9,
                background:'linear-gradient(135deg,#ED93B1,#993556)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 0 20px rgba(212,83,126,.35)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polygon points="9,5 9,19 20,12" fill="#fff"/>
                </svg>
              </div>
              <span style={{
                fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800,
                letterSpacing:'-0.03em', color:'#fff',
                textShadow:'0 1px 4px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.35)',
              }}>
                SuperAd<em style={{ color:'#F4C0D1', fontStyle:'normal' }}>Pro</em>
              </span>
            </div>
          </div>

          {/* Gifter pill on its own line — sole text content remaining
              in the hero. Sets the emotional frame ("this is a gift")
              before the video plays. */}
          <div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,.95)', padding:'8px 16px',
              borderRadius:24,
              boxShadow:'0 2px 12px rgba(0,0,0,.1)',
            }}>
              <Gift size={14} color="#993556"/>
              <span style={{ fontSize:13, color:'#993556', fontWeight:600 }}>
                A gift from {gift.gifter_name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video + CTA section — sits on white, lifted slightly into the
          hero with a negative margin so it visually overlaps the fade.
          Wider max-width here than the hero text block so the video
          gets visual prominence. */}
      <div style={{
        maxWidth:820, margin:'0 auto', padding:'0 20px',
        marginTop:'clamp(-40px, -6vw, -60px)',
        position:'relative', zIndex:2,
      }}>

        {/* Video frame — white border lifts it off whatever is behind.
            Inner background is dark grey rather than pure black so any
            tiny aspect mismatch is less noticeable. object-fit:cover on
            the video itself fills the frame edge-to-edge (the file is
            1264×720, slightly wider than 16:9 so a few pixels of width
            get cropped — invisible on a talking-head shot). */}
        <div style={{
          background:'#1a1a1a', borderRadius:14, overflow:'hidden',
          position:'relative', aspectRatio:'16/9',
          border:'5px solid #fff',
          boxShadow:'0 10px 40px rgba(0,0,0,.18)',
          marginBottom:24,
        }}>
          <video
            ref={videoRef}
            src="/static/video/gift-recipient.mp4"
            poster="/static/images/gift-hero.jpg"
            autoPlay
            muted
            playsInline
            controls
            preload="metadata"
            style={{ width:'100%', height:'100%', display:'block', objectFit:'cover' }}
          />
          {/* Custom unmute prompt overlay — only visible while muted. */}
          {muted && (
            <button onClick={toggleMute} style={{
              position:'absolute', top:10, right:10,
              padding:'6px 12px', borderRadius:20, border:'none',
              background:'rgba(0,0,0,.6)', color:'#fff',
              fontSize:12, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
              backdropFilter:'blur(6px)',
            }}>
              <VolumeX size={14}/> Click to unmute
            </button>
          )}
        </div>

        {/* Headline + subhead — moved below the video so they sit on
            white rather than on the bokeh transition. Smaller than
            before (since the video is now the primary visual anchor)
            and with a dark drop-shadow so they read as crisp and
            intentional rather than flat-on-white. */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{
            fontFamily:'Sora,sans-serif',
            fontSize:'clamp(22px, 3.8vw, 30px)',
            fontWeight:800, color:'#1a0a13',
            margin:'0 0 10px', lineHeight:1.25,
            letterSpacing:'-0.01em',
            textShadow:'0 2px 6px rgba(75,21,40,.18), 0 1px 2px rgba(0,0,0,.08)',
          }}>
            {gift.gifter_name} sent you a free month of SuperAdPro
          </h1>
          <p style={{
            fontSize:'clamp(13px, 2.2vw, 15px)',
            color:'#4B1528',
            margin:0, lineHeight:1.55,
            fontWeight:500,
          }}>
            They paid ${gift.gift_value || 20} so you could try it.
          </p>
        </div>

        {/* Optional personal message from gifter — sits below the
            headline as a quote about the gift. Only renders if the
            gifter included one at purchase time. */}
        {gift.personal_message && (
          <div style={{
            padding:'16px 22px',
            background:'#fff',
            border:'1px solid rgba(153,53,86,.15)',
            borderRadius:14,
            marginBottom:28,
            maxWidth:480,
            margin:'0 auto 28px',
            boxShadow:'0 4px 16px rgba(75,21,40,.08)',
          }}>
            <div style={{ fontSize:14, color:'#4B1528', fontStyle:'italic', lineHeight:1.55 }}>
              "{gift.personal_message}"
            </div>
            {gift.recipient_name && (
              <div style={{ fontSize:12, color:'#993556', marginTop:8, fontWeight:600 }}>
                — for {gift.recipient_name}
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div style={{ padding:'12px 16px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600, color:'#991b1b', textAlign:'center' }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign:'center' }}>
          {isPreview && (
            <div style={{ padding:'10px 14px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, marginBottom:16, fontSize:12, fontWeight:600, color:'#78350f', textAlign:'center' }}>
              Preview mode — claim button doesn't actually fire (but shows real styling)
            </div>
          )}
          {user ? (
            <div>
              <div style={{ fontSize:13, color:'#666', marginBottom:14 }}>
                Logged in as <strong style={{ color:'#222' }}>{user.username}</strong>
              </div>
              <button onClick={isPreview ? function(){} : claimGift} disabled={claiming}
                style={{
                  width:'100%', maxWidth:360, padding:'16px 32px',
                  borderRadius:12, border:'none',
                  cursor: claiming ? 'wait' : 'pointer',
                  fontFamily:'inherit', fontSize:16, fontWeight:700, color:'#fff',
                  background:'linear-gradient(135deg,#10b981,#059669)',
                  boxShadow:'0 4px 16px rgba(16,185,129,.3)',
                }}>
                {claiming ? 'Activating…' : 'Claim your free month →'}
              </button>
            </div>
          ) : (
            <div>
              {isPreview ? (
                <div style={{
                  display:'inline-block', textAlign:'center', padding:'16px 32px',
                  borderRadius:12, minWidth:280,
                  fontSize:16, fontWeight:700, color:'#fff',
                  background:'linear-gradient(135deg,#10b981,#059669)',
                  boxShadow:'0 4px 16px rgba(16,185,129,.3)',
                  marginBottom:12, cursor:'not-allowed',
                }}>
                  Claim your free month →
                </div>
              ) : (
                <Link to={'/register?ref=' + (gift.gifter_username || '') + '&gift=' + code}
                  style={{
                    display:'inline-block', textAlign:'center', padding:'16px 32px',
                    borderRadius:12, textDecoration:'none', minWidth:280,
                    fontSize:16, fontWeight:700, color:'#fff',
                    background:'linear-gradient(135deg,#10b981,#059669)',
                    boxShadow:'0 4px 16px rgba(16,185,129,.3)',
                    marginBottom:12,
                  }}>
                  Claim your free month →
                </Link>
              )}
              <div>
                <Link to={'/login?gift=' + code}
                  style={{ fontSize:13, color:'#666', textDecoration:'none', fontWeight:500 }}>
                  Already have an account? Log in
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Trust signals */}
        <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap', margin:'28px 0 20px' }}>
          {['Free month', 'No card required', 'Full access'].map(function(label) {
            return (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#555' }}>
                <Check size={14} color="#10b981"/>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer reassurance */}
        <p style={{ fontSize:12, color:'#888', textAlign:'center', maxWidth:380, margin:'0 auto', lineHeight:1.6, paddingBottom:40 }}>
          Your friend already paid. There's nothing to buy. If it's not for you, walk away — no harm done.
        </p>

        {gift.chain_depth > 1 && (
          <div style={{ textAlign:'center', fontSize:11, color:'#aaa', paddingBottom:24 }}>
            This gift is part of a pay-it-forward chain — generation {gift.chain_depth}
          </div>
        )}
      </div>
    </div>
  );
}
