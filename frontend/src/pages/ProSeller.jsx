import { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Button } from '../components/ui';
import { apiPost } from '../utils/api';
import { Bot, Send, User, Sparkles, RefreshCw } from 'lucide-react';

export default function ProSeller() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm ProSeller AI, your personal sales assistant. I can help you craft pitches, handle objections, write follow-ups, and close more sales. What would you like to work on?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const data = await apiPost('/api/proseller/chat', {
        message: userMsg,
        history: messages.slice(-10),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.result || 'No response' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <AppLayout title="ProSeller AI" subtitle="Your AI-powered sales assistant">
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 72px - 48px - 48px)' }}>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-cyan/10' : 'bg-violet/10'}`}>
                {m.role === 'user' ? <User className="w-4 h-4 text-cyan" /> : <Bot className="w-4 h-4 text-violet" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${m.role === 'user' ? 'bg-cyan text-white rounded-br-md' : 'bg-slate-100 text-slate-700 rounded-bl-md'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-violet animate-spin" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-400">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {['Help me write a pitch for my affiliate link', 'How do I handle the "it\'s a pyramid scheme" objection?',
              'Write a follow-up message for a cold lead', 'Create a DM sequence for Instagram'].map(p => (
              <button key={p} onClick={() => { setInput(p); }}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 hover:border-cyan hover:text-cyan cursor-pointer transition-all">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask ProSeller anything about sales..." rows={2}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all resize-none" />
          <Button onClick={send} disabled={loading || !input.trim()} className="h-12">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
