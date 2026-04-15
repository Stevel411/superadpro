import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

export default function VoiceGuide() {

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
          <div style={{ textAlign: 'center', color: 'var(--sap-text-muted)', fontSize: 14, lineHeight: 1.6, padding: '6px 0' }}>
            Ask me anything about SuperAdPro — features, compensation plan, how to get started.
          </div>
        )}

        {transcript && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>You asked</div>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-violet)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Answer</div>
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
            placeholder="Ask a question..."
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
