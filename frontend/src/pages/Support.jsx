import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Button } from '../components/ui';
import { apiPost } from '../utils/api';
import { Headphones, Send, MessageCircle, BookOpen, HelpCircle } from 'lucide-react';

export default function Support() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return alert('Please fill in both fields');
    setSending(true);
    try {
      await apiPost('/api/support/ticket', { subject, message });
      setSent(true);
      setSubject('');
      setMessage('');
    } catch (e) { alert(e.message); }
    setSending(false);
  };

  return (
    <AppLayout title="Support" subtitle="We're here to help">
      <div className="max-w-2xl">
        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <a href="/faq" target="_blank" className="no-underline">
            <Card className="h-full">
              <CardBody className="text-center py-5">
                <HelpCircle className="w-8 h-8 text-cyan mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800">FAQ</div>
                <div className="text-xs text-slate-400">Common questions</div>
              </CardBody>
            </Card>
          </a>
          <a href="/courses/how-it-works" className="no-underline">
            <Card className="h-full">
              <CardBody className="text-center py-5">
                <BookOpen className="w-8 h-8 text-violet mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800">How It Works</div>
                <div className="text-xs text-slate-400">Commission guides</div>
              </CardBody>
            </Card>
          </a>
          <a href="/compensation-plan" className="no-underline">
            <Card className="h-full">
              <CardBody className="text-center py-5">
                <MessageCircle className="w-8 h-8 text-emerald mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800">Comp Plan</div>
                <div className="text-xs text-slate-400">Full details</div>
              </CardBody>
            </Card>
          </a>
        </div>

        {/* Contact Form */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-slate-400" /> Contact Support
            </h3>
            {sent ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-display text-lg font-extrabold text-slate-800 mb-2">Message Sent!</h3>
                <p className="text-sm text-slate-500 mb-4">We'll get back to you as soon as possible.</p>
                <Button onClick={() => setSent(false)} variant="secondary" size="sm">Send Another</Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Subject</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="What do you need help with?"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={6}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all resize-vertical" />
                </div>
                <Button onClick={submit} disabled={sending}>
                  <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
