import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, Button } from '../components/ui';
import { apiPost } from '../utils/api';
import { Bot, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';

export default function AiTool({ title, subtitle, apiEndpoint, fields, resultLabel = 'Result' }) {
  const [values, setValues] = useState({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult('');
    try {
      const data = await apiPost(apiEndpoint, values);
      setResult(data.result || data.content || data.output || JSON.stringify(data));
    } catch (e) { setResult(`Error: ${e.message}`); }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-6">
        {/* Input Form */}
        <Card hover={false}>
          <CardBody>
            <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan" /> {title}
            </h3>
            {fields.map((f, i) => (
              <div key={i} className="mb-4">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder} rows={f.rows || 3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all resize-vertical" />
                ) : f.type === 'select' ? (
                  <select value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all">
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/10 transition-all" />
                )}
              </div>
            ))}
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
            </Button>
          </CardBody>
        </Card>

        {/* Result */}
        <Card hover={false}>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet" /> {resultLabel}
              </h3>
              {result && (
                <button onClick={copy}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan cursor-pointer border-none bg-transparent transition-all">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              )}
            </div>
            {result ? (
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                {result}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Fill in the form and click Generate</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
