import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Map, Share2, DollarSign, Link2, Users, Zap, Eye, Sparkles, Wallet, Heart, Play, ArrowRight, ChevronLeft, ChevronRight, Mic, MicOff, Volume2, X } from 'lucide-react';

var SECTIONS = [
  {
    id: 'dashboard', num: '1', title: 'Your Dashboard', shortTitle: 'Dashboard',
    desc: 'This is your home base. Every time you log in, you land here. You can see your earnings, your network size, and your referral link. The 6 Quick Action cards guide you to the most important areas of the platform.',
    tips: [
      'Your referral link is always visible at the top — copy and share it anytime',
      'The 3 income cards show your earnings across Membership, Grid, and Campaigns',
      'Quick Action cards change based on your membership level',
    ],
    link: '/dashboard', linkLabel: 'Go to Dashboard',
    Icon: Map, color: '#6366f1', bg: '#eef2ff',
  },
  {
    id: 'referral', num: '2', title: 'Your Referral Link', shortTitle: 'Referral Link',
    desc: 'Your referral link is how you earn. When someone signs up through your link, you earn 50% of their membership fee every month. Share it on social media, in messages, on your LinkHub page — everywhere.',
    tips: [
      'Your link looks like: www.superadpro.com/ref/YourUsername',
      'You earn $10 per Basic referral and $17.50 per Pro referral — every month',
      'Use the Social Share tool to generate AI-written posts with your link embedded',
    ],
    link: '/affiliate', linkLabel: 'Go to Social Share',
    Icon: Share2, color: '#0ea5e9', bg: '#e0f2fe',
  },
  {
    id: 'compplan', num: '3', title: 'Compensation Plan', shortTitle: 'Comp Plan',
    desc: 'SuperAdPro has 5 income streams and pays out 95% of all revenue to members. The Compensation Plan page breaks down exactly how each stream works, with interactive calculators so you can project your earnings.',
    tips: [
      'Membership referrals — 50% recurring commission',
      '8x8 Campaign Grid — 40% direct + 6.25% across 8 levels + completion bonus',
      'SuperScene sponsor earnings — $0.025 per credit your referrals use',
      'Course marketplace and Pay It Forward complete the 5 streams',
    ],
    link: '/compensation-plan', linkLabel: 'View Comp Plan',
    Icon: DollarSign, color: '#16a34a', bg: '#dcfce7',
  },
  {
    id: 'linkhub', num: '4', title: 'LinkHub — Your Branded Page', shortTitle: 'LinkHub',
    desc: 'LinkHub is your personal link-in-bio page, similar to Linktree or Stan Store. Add your photo, bio, social links, and custom buttons. Share one link that sends people to everything you offer. It works as a mini website for your personal brand.',
    tips: [
      'Add your photo and a compelling bio',
      'Add links to your social profiles, products, or any URL',
      'Drag and drop to reorder your links',
      'Choose from multiple themes to match your brand',
    ],
    link: '/linkhub', linkLabel: 'Build Your LinkHub',
    Icon: Link2, color: '#8b5cf6', bg: '#ede9fe',
  },
  {
    id: 'socialshare', num: '5', title: 'Social Share', shortTitle: 'Social Share',
    desc: 'The AI Social Share tool generates platform-specific posts for Facebook, X, Instagram, LinkedIn, TikTok, YouTube, WhatsApp, Telegram, and more. Choose a platform, pick a tone, and the AI writes a ready-to-post message with your referral link embedded.',
    tips: [
      'Choose from 12 social platforms',
      '5 tone options: Professional, Casual, Hype, Story, Educational',
      'Add your niche for more targeted content',
      'One-click copy or share directly to the platform',
    ],
    link: '/affiliate', linkLabel: 'Generate Posts',
    Icon: Users, color: '#ec4899', bg: '#fce7f3',
  },
  {
    id: 'tiers', num: '6', title: 'Campaign Tiers', shortTitle: 'Tiers',
    desc: 'Campaign Tiers are how you unlock the 8x8 Income Grid — the biggest earning potential on the platform. Choose a tier from T1 ($20) to T8 ($1,000). Each tier activates a grid that fills with members from your network. Higher tiers mean bigger commissions and completion bonuses.',
    tips: [
      '8 tiers from $20 to $1,000',
      'Each tier creates an 8x8 grid (64 positions)',
      'You earn 40% direct, 6.25% from 8 levels, plus a completion bonus',
      'Grid commissions go to your Campaign Wallet',
    ],
    link: '/campaign-tiers', linkLabel: 'View Campaign Tiers',
    Icon: Zap, color: '#f59e0b', bg: '#fef3c7', pro: true,
  },
  {
    id: 'watch', num: '7', title: 'Watch to Earn', shortTitle: 'Watch',
    desc: 'Watch to Earn is the engine that keeps the platform running. Members watch short campaign videos daily to maintain their commission qualification. This delivers real views to advertisers while keeping your earning status active. Think of it as your daily check-in.',
    tips: [
      'Watch your daily quota of videos to stay qualified',
      'Missing your quota pauses Campaign Wallet withdrawals',
      'Videos are short — usually 30-60 seconds each',
      'Your watch progress is tracked on the dashboard',
    ],
    link: '/watch', linkLabel: 'Start Watching',
    Icon: Eye, color: '#7c3aed', bg: '#f5f3ff', pro: true,
  },
  {
    id: 'superscene', num: '8', title: 'SuperScene — AI Studio', shortTitle: 'SuperScene',
    desc: 'SuperScene is your all-in-one AI content creation studio. Generate professional videos, images, music, voiceovers, and captions — all powered by the latest AI models. Use it to create marketing content, social media posts, pitch videos, and more. No design skills needed.',
    tips: [
      '10 tabs: Create, Studio, Images, Captions, Music, Voiceover, Editor, Gallery, Packs, AI Builder',
      'Video models include Kling 3.0, Sora 2 Pro, Veo 3.1, and more',
      'Credits never expire — buy packs from $8 to $99',
      'Your sponsor earns $0.025 per credit you use — passive income for them',
    ],
    link: '/superscene', linkLabel: 'Open SuperScene',
    Icon: Sparkles, color: '#0891b2', bg: '#ecfeff',
  },
  {
    id: 'wallet', num: '9', title: 'Your Wallet', shortTitle: 'Wallet',
    desc: 'You have two wallets. Your Affiliate Wallet holds membership referral commissions and SuperScene sponsor earnings — you can withdraw these anytime. Your Campaign Wallet holds grid commissions — these require an active tier and daily watch quota to withdraw.',
    tips: [
      'Affiliate Wallet — always withdrawable, no conditions',
      'Campaign Wallet — requires active tier + daily watch quota',
      'View your complete transaction history in one place',
      'Set up your crypto wallet in the Crypto Guide (under Account)',
    ],
    link: '/wallet', linkLabel: 'View Your Wallet',
    Icon: Wallet, color: '#059669', bg: '#d1fae5',
  },
  {
    id: 'pif', num: '10', title: 'Pay It Forward', shortTitle: 'Pay It Forward',
    desc: 'Pay It Forward lets you gift a Basic membership to someone for $20 from your wallet or with crypto. You become their sponsor and earn commissions on everything they do. When they earn $20 or more, they are prompted to pay it forward to someone else — creating an organic growth chain.',
    tips: [
      'Gift costs $20 — pay from wallet or with crypto',
      'You become the sponsor of the gifted member',
      'You earn referral commissions on their activity',
      'Creates a viral growth loop — they gift someone, who gifts someone...',
    ],
    link: '/pay-it-forward', linkLabel: 'Gift a Membership',
    Icon: Heart, color: '#db2777', bg: '#fce7f3',
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
            <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Step {s.num} of 10</div>
          </div>
        </div>

        {/* Image/video placeholder */}
        <div style={{ margin: '24px 28px 0', background: s.bg, borderRadius: 14, aspectRatio: '16/7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed ' + s.color + '30' }}>
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
