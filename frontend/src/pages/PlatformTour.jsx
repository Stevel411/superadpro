import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Map, Share2, DollarSign, Link2, Users, Zap, Eye, Sparkles, Wallet, Heart, Play, ArrowRight, ChevronLeft, ChevronRight, Mic, MicOff, Volume2, X, Wrench, Lock } from 'lucide-react';

var SECTIONS = [
  {
    id: 'dashboard', num: '1', title: 'Your Dashboard', shortTitle: 'Dashboard',
    desc: 'This is your home base. Every time you log in, you land here. You can see your earnings across all income streams, your network size, and your referral link. The Quick Action cards guide you to the most important areas of the platform.',
    tips: [
      'Your referral link is always visible at the top — copy and share it anywhere',
      'The 3 income cards show Membership, Creative Studio, and Campaign earnings',
      'Quick Action cards give you fast access to the most important tools',
      'Your balance is shown at the top right — click it to go to your Wallet',
    ],
    link: '/dashboard', linkLabel: 'Go to Dashboard',
    Icon: Map, color: '#6366f1', bg: '#eef2ff',
  },
  {
    id: 'howyouearn', num: '2', title: 'How You Earn', shortTitle: 'How You Earn',
    desc: 'SuperAdPro has multiple income streams designed to reward you for building a team and using the platform. Everything flows through a simple principle: refer members, build your network, and earn commissions on their activity. The more active your team, the more you earn.',
    tips: [
      'Membership Referrals — earn 50% recurring ($10 per Basic, $17.50 per Pro) every month your referrals stay active',
      'Campaign Tiers — activate a tier ($20\u2013$1,000) to unlock the 8\xd78 Income Grid with 40% direct + uni-level commissions across 8 levels',
      'Profit Nexus — your referrals buy Creative Studio credit packs, they enter your 3\xd73 nexus. Earn level commissions + completion bonuses on every cycle',
      'Course Marketplace (coming soon) — sell digital courses with 100% commission and a pass-up system that creates infinite-depth earning',
      'Visit the Comp Plan page for interactive calculators and the AI assistant that can answer any earnings question',
    ],
    link: '/compensation-plan', linkLabel: 'View Comp Plan',
    Icon: DollarSign, color: '#16a34a', bg: '#dcfce7',
  },
  {
    id: 'watchearn', num: '3', title: 'Watch To Earn', shortTitle: 'Watch To Earn',
    desc: 'Watch To Earn is the engine that powers the entire campaign system. Members with active Campaign Tiers watch short video campaigns daily. This delivers real views to campaign holders while keeping your commission qualification active. Think of it as your daily check-in — a few minutes of watching keeps your earning machine running.',
    tips: [
      'Activate a Campaign Tier first ($20\u2013$1,000) to enter the 8\xd78 Income Grid',
      'Watch your daily video quota to stay qualified for Campaign Wallet withdrawals',
      'Higher tiers unlock more daily views and bigger grid completion bonuses',
      'Your grid fills with members from your network — when all 64 positions fill, you earn a bonus and a new grid starts',
      'Missing your daily quota pauses Campaign Wallet withdrawals (not your Affiliate Wallet)',
    ],
    link: '/watch', linkLabel: 'Start Watching',
    Icon: Eye, color: '#f59e0b', bg: '#fef3c7',
  },
  {
    id: 'basictools', num: '4', title: 'Your Basic Tools', shortTitle: 'Basic Tools',
    desc: 'Every member gets access to a powerful suite of tools included with their membership. These tools work for any business or niche — not just SuperAdPro promotion. Use them to grow your personal brand, create content, track your marketing, and generate AI-powered creative assets.',
    tips: [
      'LinkHub — your personal link-in-bio page (like Linktree). Add your photo, bio, social links, and custom buttons. Share one link everywhere',
      'Link Tools — track clicks on any URL, create link rotators, generate QR codes, and view detailed analytics on all your links',
      'Content Creator — AI-powered writing tool that generates social media posts, captions, hashtags, and marketing copy for any platform',
      'Creative Studio — the full AI creative suite: Video Clips (9 AI models), Full Video production, Images (11 models), Music (Suno AI), Voiceover (32 voices), Lip Sync, Gallery, and Credit Packs',
    ],
    link: '/creative-studio', linkLabel: 'Open Creative Studio',
    Icon: Wrench, color: '#0ea5e9', bg: '#e0f2fe',
  },
  {
    id: 'protools', num: '5', title: 'Pro Tools', shortTitle: 'Pro Tools',
    desc: 'Upgrade to Pro ($35/month) to unlock the advanced tools designed for serious marketers. These give you a complete business-in-a-box: build landing pages, create presentations, automate email follow-ups, and let AI build your entire sales pipeline. Pro members also earn higher referral commissions ($17.50 vs $10 per referral).',
    tips: [
      'SuperPages — drag-and-drop landing page builder with 24 block types, gradient builder, responsive preview, and 8 pre-built niche templates',
      'SuperDeck — AI presentation builder. Create professional slide decks with shapes, text, images, and custom styling',
      'AutoResponder (MyLeads) — CRM with up to 5,000 leads, automated email sequences via Brevo, visual timeline, and Pay It Forward integration',
      'SuperSeller — AI Sales Autopilot that generates your entire marketing campaign: landing page, 30 social posts, 5-email autoresponder, 3 video scripts, ad copy, and strategy doc',
    ],
    link: '/upgrade', linkLabel: 'Upgrade to Pro',
    Icon: Lock, color: '#8b5cf6', bg: '#ede9fe',
    pro: true,
  },
  {
    id: 'wallet', num: '6', title: 'Your Wallet & Pay It Forward', shortTitle: 'Wallet',
    desc: 'You have two wallets. Your Affiliate Wallet holds membership referral commissions and Creative Studio Profit Nexus earnings — withdraw these anytime with no conditions. Your Campaign Wallet holds grid and watch commissions — these require an active Campaign Tier and daily watch quota. Pay It Forward lets you gift memberships to grow your team organically.',
    tips: [
      'Affiliate Wallet — always withdrawable, no conditions attached',
      'Campaign Wallet — requires active Campaign Tier + daily watch quota to withdraw',
      'Minimum withdrawal is $10 with a $1 fee — paid in USDT cryptocurrency',
      'Set up MetaMask or Coinbase Wallet using the Crypto Guide (under Account)',
      'Pay It Forward — gift a $20 Basic membership to anyone. You become their sponsor and earn commissions on everything they do. When they earn $20+, they are prompted to gift someone else — creating a viral growth chain',
    ],
    link: '/wallet', linkLabel: 'View Your Wallet',
    Icon: Wallet, color: '#059669', bg: '#d1fae5',
  },
];

export default function PlatformTour() {
  var [activeIdx, setActiveIdx] = useState(0);
  var s = SECTIONS[activeIdx];

  return (
    <AppLayout title="Platform Tour" subtitle="Your complete guide to SuperAdPro">

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
        {SECTIONS.map(function(sec, i) {
          var isActive = i === activeIdx;
          return <button key={sec.id} onClick={function() { setActiveIdx(i); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10,
              border: isActive ? '1.5px solid ' + sec.color : '1px solid #e2e8f0',
              background: isActive ? sec.bg : '#fff',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? sec.color : '#64748b', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all .15s',
            }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? sec.color : sec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <sec.Icon size={12} color={isActive ? '#fff' : sec.color}/>
            </div>
            {sec.shortTitle}
          </button>;
        })}
      </div>

      {/* Active section content */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>

        {/* Section header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <s.Icon size={26} color={s.color}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{s.title}</span>
              {s.pro && <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,.1)', fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>Pro</span>}
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Step {s.num} of 6</div>
          </div>
        </div>

        {/* Image/video placeholder — 16:9 for standard YouTube */}
        <div style={{ margin: '24px 28px 0', background: s.bg, borderRadius: 14, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed ' + s.color + '30' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <Play size={24} color={s.color}/>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>Screenshot or video coming soon</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>A visual walkthrough of {s.shortTitle} will appear here</div>
        </div>

        {/* Description */}
        <div style={{ padding: '20px 28px 0' }}>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, margin: 0 }}>{s.desc}</p>
        </div>

        {/* Tips */}
        <div style={{ margin: '20px 28px 0' }}>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Key things to know</div>
            {s.tips.map(function(tip, ti) {
              return <div key={ti} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: ti < s.tips.length - 1 ? 10 : 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 8, flexShrink: 0 }}/>
                <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.7 }}>{tip}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Navigation + action */}
        <div style={{ padding: '20px 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeIdx > 0 && (
              <button onClick={function() { setActiveIdx(activeIdx - 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                <ChevronLeft size={16}/> Previous
              </button>
            )}
            {activeIdx < SECTIONS.length - 1 && (
              <button onClick={function() { setActiveIdx(activeIdx + 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                Next <ChevronRight size={16}/>
              </button>
            )}
          </div>
          <Link to={s.link} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
            background: s.color, color: '#fff', fontSize: 14, fontWeight: 700,
            boxShadow: '0 3px 0 ' + s.color + '90, 0 5px 12px ' + s.color + '30',
          }}>
            {s.linkLabel} <ArrowRight size={15}/>
          </Link>
        </div>
      </div>

      {/* Voice Guide Widget */}
      <VoiceGuide />

    </AppLayout>
  );
}

function VoiceGuide() {
  var [open, setOpen] = useState(false);
  var [listening, setListening] = useState(false);
  var [thinking, setThinking] = useState(false);
  var [speaking, setSpeaking] = useState(false);
  var [transcript, setTranscript] = useState('');
  var [answer, setAnswer] = useState('');
  var [error, setError] = useState('');
  var [textInput, setTextInput] = useState('');
  var recognitionRef = useRef(null);
  var audioRef = useRef(null);

  function startListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in your browser. Please use Chrome.');
      return;
    }
    setError('');
    setAnswer('');
    setTranscript('');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = function(e) {
      var text = '';
      for (var i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onend = function() {
      setListening(false);
      if (transcript || recognitionRef.current?._lastTranscript) {
        askGuide(recognitionRef.current?._lastTranscript || transcript);
      }
    };

    recognition.onerror = function(e) {
      setListening(false);
      if (e.error !== 'no-speech') setError('Could not hear you. Please try again.');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  // Track transcript changes for onend
  useEffect(function() {
    if (recognitionRef.current) recognitionRef.current._lastTranscript = transcript;
  }, [transcript]);

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  }

  async function askGuide(question) {
    if (!question || !question.trim()) return;
    setThinking(true);
    setAnswer('');
    try {
      var res = await fetch('/api/voice-guide/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question }),
      });
      var data = await res.json();
      if (data.success && data.answer) {
        setAnswer(data.answer);
        setThinking(false);
        speakAnswer(data.answer);
      } else {
        setError(data.error || 'Could not get an answer.');
        setThinking(false);
      }
    } catch (e) {
      setError('Network error. Please try again.');
      setThinking(false);
    }
  }

  function speakAnswer(text) {
    setSpeaking(true);
    fetch('/api/voice-guide/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text }),
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.success && data.audio) {
        var audio = new Audio('data:audio/mp3;base64,' + data.audio);
        audioRef.current = audio;
        audio.onended = function() { setSpeaking(false); audioRef.current = null; };
        audio.onerror = function() { setSpeaking(false); audioRef.current = null; };
        audio.play().catch(function() { setSpeaking(false); });
      } else {
        setSpeaking(false);
      }
    }).catch(function() { setSpeaking(false); });
  }

  function stopSpeaking() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false);
  }

  if (!open) {
    return (
      <button onClick={function() { setOpen(true); }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          boxShadow: '0 4px 0 #5b21b6, 0 6px 20px rgba(124,58,237,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .1s',
        }}
        onMouseDown={function(e) { e.currentTarget.style.transform = 'translateY(2px)'; }}
        onMouseUp={function(e) { e.currentTarget.style.transform = 'translateY(0)'; }}
        onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <Mic size={24} color="#fff"/>
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      width: 340, background: '#fff', borderRadius: 18,
      boxShadow: '0 8px 32px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Volume2 size={18} color="#fff"/>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Platform Guide</span>
        </div>
        <button onClick={function() { setOpen(false); stopSpeaking(); stopListening(); }}
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: 4, cursor: 'pointer', display: 'flex' }}>
          <X size={16} color="#fff"/>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', minHeight: 100, maxHeight: 280, overflowY: 'auto' }}>
        {!transcript && !answer && !thinking && !listening && !error && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, lineHeight: 1.6, padding: '6px 0' }}>
            Ask me anything about SuperAdPro — features, compensation plan, how to get started.
          </div>
        )}

        {transcript && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>You asked</div>
            <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5 }}>{transcript}</div>
          </div>
        )}

        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', fontSize: 14, fontWeight: 600 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
            Thinking...
          </div>
        )}

        {answer && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Answer</div>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>{answer}</div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 14, color: '#dc2626', textAlign: 'center', padding: '8px 0' }}>{error}</div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: '0 16px 14px' }}>
        {speaking && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <button onClick={stopSpeaking}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>
              <MicOff size={14}/> Stop Speaking
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={textInput}
            onChange={function(e) { setTextInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter' && textInput.trim() && !thinking) { setTranscript(textInput.trim()); askGuide(textInput.trim()); setTextInput(''); } }}
            placeholder="Type your question..."
            disabled={thinking || listening}
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          />
          <button onClick={function() { if (textInput.trim() && !thinking) { setTranscript(textInput.trim()); askGuide(textInput.trim()); setTextInput(''); } }}
            disabled={!textInput.trim() || thinking}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: !textInput.trim() || thinking ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: !textInput.trim() || thinking ? '#e2e8f0' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}>
            Ask
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
