import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Map, Share2, DollarSign, Link2, Users, Zap, Eye, Sparkles, Wallet, Heart, Play, ArrowRight, ChevronLeft, ChevronRight, Mic, MicOff, Volume2, X, Wrench, Lock } from 'lucide-react';

function getSections(t) { return [
  {
    id: 'dashboard', num: '1', title: t('platformTour.s1_title'), shortTitle: t('platformTour.s1_short'),
    desc: t('platformTour.s1_desc'),
    tips: [t('platformTour.s1_tip1'), t('platformTour.s1_tip2'), t('platformTour.s1_tip3'), t('platformTour.s1_tip4')],
    link: '/dashboard', linkLabel: t('platformTour.s1_link'),
    Icon: Map, color: 'var(--sap-indigo)', bg: '#eef2ff',
  },
  {
    id: 'howyouearn', num: '2', title: t('platformTour.s2_title'), shortTitle: t('platformTour.s2_short'),
    desc: t('platformTour.s2_desc'),
    tips: [t('platformTour.s2_tip1'), t('platformTour.s2_tip2'), t('platformTour.s2_tip3'), t('platformTour.s2_tip4'), t('platformTour.s2_tip5')],
    link: '/compensation-plan', linkLabel: t('platformTour.s2_link'),
    Icon: DollarSign, color: 'var(--sap-green)', bg: 'var(--sap-green-bg-mid)',
  },
  {
    id: 'watchearn', num: '3', title: t('platformTour.s3_title'), shortTitle: t('platformTour.s3_short'),
    desc: t('platformTour.s3_desc'),
    tips: [t('platformTour.s3_tip1'), t('platformTour.s3_tip2'), t('platformTour.s3_tip3'), t('platformTour.s3_tip4'), t('platformTour.s3_tip5')],
    link: '/watch', linkLabel: t('platformTour.s3_link'),
    Icon: Eye, color: 'var(--sap-amber)', bg: 'var(--sap-amber-bg)',
  },
  {
    id: 'basictools', num: '4', title: t('platformTour.s4_title'), shortTitle: t('platformTour.s4_short'),
    desc: t('platformTour.s4_desc'),
    tips: [t('platformTour.s4_tip1'), t('platformTour.s4_tip2'), t('platformTour.s4_tip3'), t('platformTour.s4_tip4')],
    link: '/creative-studio', linkLabel: t('platformTour.s4_link'),
    Icon: Wrench, color: 'var(--sap-accent)', bg: '#e0f2fe',
  },
  {
    id: 'protools', num: '5', title: t('platformTour.s5_title'), shortTitle: t('platformTour.s5_short'),
    desc: t('platformTour.s5_desc'),
    tips: [t('platformTour.s5_tip1'), t('platformTour.s5_tip2'), t('platformTour.s5_tip3'), t('platformTour.s5_tip4')],
    link: '/upgrade', linkLabel: t('platformTour.s5_link'),
    Icon: Lock, color: 'var(--sap-purple)', bg: 'var(--sap-purple-pale)',
    pro: true,
  },
  {
    id: 'wallet', num: '6', title: t('platformTour.s6_title'), shortTitle: t('platformTour.s6_short'),
    desc: t('platformTour.s6_desc'),
    tips: [t('platformTour.s6_tip1'), t('platformTour.s6_tip2'), t('platformTour.s6_tip3'), t('platformTour.s6_tip4'), t('platformTour.s6_tip5')],
    link: '/wallet', linkLabel: t('platformTour.s6_link'),
    Icon: Wallet, color: 'var(--sap-green-dark)', bg: '#d1fae5',
  },
];}

export default function PlatformTour() {
  var { t } = useTranslation();
  var [activeIdx, setActiveIdx] = useState(0);
  var SECTIONS = getSections(t);
  var s = SECTIONS[activeIdx];

  return (
    <AppLayout title={t("platformTour.title")} subtitle={t("platformTour.subtitle")}>

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
              color: isActive ? sec.color : 'var(--sap-text-muted)', whiteSpace: 'nowrap', flexShrink: 0,
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
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{s.title}</span>
              {s.pro && <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,.1)', fontSize: 12, fontWeight: 700, color: 'var(--sap-violet)' }}>{t('platformTour.proLabel')}</span>}
            </div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', marginTop: 2 }}>Step {s.num} of 6</div>
          </div>
        </div>

        {/* Image/video placeholder — 16:9 for standard YouTube */}
        <div style={{ margin: '24px 28px 0', background: s.bg, borderRadius: 14, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed ' + s.color + '30' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <Play size={24} color={s.color}/>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{t('platformTour.screenshotComingSoon')}</div>
          <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginTop: 4 }}>A visual walkthrough of {s.shortTitle} will appear here</div>
        </div>

        {/* Description */}
        <div style={{ padding: '20px 28px 0' }}>
          <p style={{ fontSize: 16, color: 'var(--sap-text-secondary)', lineHeight: 1.8, margin: 0 }}>{s.desc}</p>
        </div>

        {/* Tips */}
        <div style={{ margin: '20px 28px 0' }}>
          <div style={{ background: 'var(--sap-bg-elevated)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 10 }}>{t('platformTour.keyThings')}</div>
            {s.tips.map(function(tip, ti) {
              return <div key={ti} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: ti < s.tips.length - 1 ? 10 : 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 8, flexShrink: 0 }}/>
                <div style={{ fontSize: 15, color: 'var(--sap-text-secondary)', lineHeight: 1.7 }}>{tip}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Navigation + action */}
        <div style={{ padding: '20px 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeIdx > 0 && (
              <button onClick={function() { setActiveIdx(activeIdx - 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--sap-text-muted)' }}>
                <ChevronLeft size={16}/> Previous
              </button>
            )}
            {activeIdx < SECTIONS.length - 1 && (
              <button onClick={function() { setActiveIdx(activeIdx + 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--sap-text-muted)' }}>
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

  var { t } = useTranslation();
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
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('platformTour.platformGuide')}</span>
        </div>
        <button onClick={function() { setOpen(false); stopSpeaking(); stopListening(); }}
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: 4, cursor: 'pointer', display: 'flex' }}>
          <X size={16} color="#fff"/>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', minHeight: 100, maxHeight: 280, overflowY: 'auto' }}>
        {!transcript && !answer && !thinking && !listening && !error && (
          <div style={{ textAlign: 'center', color: 'var(--sap-text-muted)', fontSize: 14, lineHeight: 1.6, padding: '6px 0' }}>
            Ask me anything about SuperAdPro — features, compensation plan, how to get started.
          </div>
        )}

        {transcript && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{t('platformTour.youAsked')}</div>
            <div style={{ fontSize: 14, color: 'var(--sap-text-primary)', lineHeight: 1.5 }}>{transcript}</div>
          </div>
        )}

        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sap-violet)', fontSize: 14, fontWeight: 600 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
            Thinking...
          </div>
        )}

        {answer && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-violet)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{t('platformTour.answer')}</div>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>{answer}</div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 14, color: 'var(--sap-red)', textAlign: 'center', padding: '8px 0' }}>{error}</div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: '0 16px 14px' }}>
        {speaking && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <button onClick={stopSpeaking}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: 'var(--sap-red-bg)', color: 'var(--sap-red)' }}>
              <MicOff size={14}/> Stop Speaking
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={textInput}
            onChange={function(e) { setTextInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter' && textInput.trim() && !thinking) { setTranscript(textInput.trim()); askGuide(textInput.trim()); setTextInput(''); } }}
            placeholder={t("platformTour.questionPlaceholder")}
            disabled={thinking || listening}
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          />
          <button onClick={function() { if (textInput.trim() && !thinking) { setTranscript(textInput.trim()); askGuide(textInput.trim()); setTextInput(''); } }}
            disabled={!textInput.trim() || thinking}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: !textInput.trim() || thinking ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: !textInput.trim() || thinking ? 'var(--sap-border)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}>
            Ask
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
