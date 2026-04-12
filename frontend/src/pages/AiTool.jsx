import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { Bot, Sparkles, Copy, Check, RefreshCw, Wand2 } from 'lucide-react';

export default function AiTool({ title, subtitle, apiEndpoint, fields, resultLabel }) {
  var { t } = useTranslation();
  var [values, setValues] = useState({});
  var [result, setResult] = useState('');
  var [loading, setLoading] = useState(false);
  var [copied, setCopied] = useState(false);
  var [error, setError] = useState('');

  function set(key, val) { setValues(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); }

  function generate() {
    setLoading(true);
    setResult('');
    setError('');
    apiPost(apiEndpoint, values).then(function(data) {
      setResult(data.result || data.content || data.output || JSON.stringify(data, null, 2));
      setLoading(false);
    }).catch(function(e) {
      setError(e.message || 'Generation failed');
      setLoading(false);
    });
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'stretch'}}>

        {/* LEFT — Input Form */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)',display:'flex',flexDirection:'column'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'16px 20px',display:'flex',alignItems:'center',gap:8}}>
            <Bot size={16} color="var(--sap-accent-light)"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{title}</div>
          </div>
          <div style={{padding:'20px',flex:1,display:'flex',flexDirection:'column'}}>
            {(fields || []).map(function(f, i) {
              return (
                <div key={i} style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:11,fontWeight:800,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={values[f.key] || ''} onChange={function(e) { set(f.key, e.target.value); }}
                      placeholder={f.placeholder} rows={f.rows || 3}
                      style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',background:'var(--sap-bg-input)'}}/>
                  ) : f.type === 'select' ? (
                    <select value={values[f.key] || ''} onChange={function(e) { set(f.key, e.target.value); }}
                      style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'var(--sap-bg-input)',color:values[f.key]?'var(--sap-text-primary)':'var(--sap-text-muted)'}}>
                      <option value="">Select...</option>
                      {(f.options || []).map(function(o) { return <option key={o} value={o}>{o}</option>; })}
                    </select>
                  ) : (
                    <input value={values[f.key] || ''} onChange={function(e) { set(f.key, e.target.value); }}
                      placeholder={f.placeholder}
                      style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'var(--sap-bg-input)'}}/>
                  )}
                </div>
              );
            })}

            <div style={{marginTop:'auto'}}>
              <button onClick={generate} disabled={loading}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px 20px',borderRadius:10,border:'none',
                  cursor:loading?'default':'pointer',fontFamily:'inherit',fontSize:14,fontWeight:800,
                  background:loading?'var(--sap-text-muted)':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',
                  boxShadow:loading?'none':'0 4px 14px rgba(14,165,233,.3)',transition:'all .2s',
                  opacity:loading?0.7:1}}>
                {loading ? (
                  <><RefreshCw size={16} style={{animation:'spin .8s linear infinite'}}/> {t('common.generating')}</>
                ) : (
                  <><Wand2 size={16}/> {t('common.generate')}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Result */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)',display:'flex',flexDirection:'column'}}>
          <div style={{background:'var(--sap-cobalt-deep)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Sparkles size={16} color="var(--sap-purple-light)"/>
              <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>{resultLabel || 'Result'}</div>
            </div>
            {result && (
              <button onClick={copy}
                style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',
                  background:copied?'rgba(22,163,74,.2)':'rgba(255,255,255,.1)',color:copied?'#4ade80':'rgba(255,255,255,.6)',
                  fontSize:11,fontWeight:700,fontFamily:'inherit',transition:'all .2s'}}>
                {copied ? <><Check size={12}/> {t('common.copied')}</> : <><Copy size={12}/> {t('common.copy')}</>}
              </button>
            )}
          </div>
          <div style={{padding:'20px',flex:1,overflowY:'auto',maxHeight:'calc(100vh - 280px)'}}>
            {error && (
              <div style={{padding:'12px 16px',background:'var(--sap-red-bg)',borderRadius:10,border:'1px solid #fecaca',marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--sap-red)'}}>{error}</div>
              </div>
            )}
            {result ? (
              <div style={{fontSize:13,color:'#334155',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'inherit'}}>
                {result}
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <div style={{width:48,height:48,borderRadius:14,background:'var(--sap-bg-input)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                  <Bot size={24} color="var(--sap-text-ghost)"/>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:4}}>{t('marketing.readyToGenerate')}</div>
                <div style={{fontSize:12,color:'var(--sap-text-muted)'}}>{t('marketing.fillInForm')}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </AppLayout>
  );
}
