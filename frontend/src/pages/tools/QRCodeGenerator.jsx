import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import AppLayout from '../../components/layout/AppLayout';
import { Download, RefreshCw, Link as LinkIcon, Type, Wifi, Mail, Phone, MessageSquare } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Internal QR Code Generator
   Light theme, AppLayout chrome, congruent with platform.
   Same engine as /free/qr-code-generator (browser-based qrcode lib).
   ═══════════════════════════════════════════════════════════ */

const MODES = [
  { id: 'url', name: 'URL', icon: LinkIcon },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'wifi', name: 'WiFi', icon: Wifi },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'phone', name: 'Phone', icon: Phone },
  { id: 'sms', name: 'SMS', icon: MessageSquare },
];

const EC_LEVELS = [
  { id: 'L', name: 'Low', desc: '7%' },
  { id: 'M', name: 'Medium', desc: '15%' },
  { id: 'Q', name: 'High', desc: '25%' },
  { id: 'H', name: 'Best', desc: '30%' },
];

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#fff', border: '1.5px solid var(--sap-border)', borderRadius: 10,
  fontSize: 14, color: 'var(--sap-text-primary)', fontFamily: '"DM Sans",sans-serif',
  boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s',
};
const labelStyle = {
  display:'block', fontSize:12, fontWeight:700,
  color:'var(--sap-text-muted)', marginBottom:6,
  textTransform:'uppercase', letterSpacing:0.5,
};

export default function QRCodeGeneratorInternal() {
  const { t } = useTranslation();

  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('https://www.superadpro.com');
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [phone, setPhone] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [wifiName, setWifiName] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiType, setWifiType] = useState('WPA');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [size, setSize] = useState(300);
  const [ecLevel, setEcLevel] = useState('M');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');

  // Build the QR content string based on mode
  const getContent = useCallback(() => {
    switch (mode) {
      case 'url': return url || 'https://www.superadpro.com';
      case 'text': return text || 'Hello from SuperAdPro!';
      case 'email': return `mailto:${email}${emailSubject ? '?subject=' + encodeURIComponent(emailSubject) : ''}`;
      case 'phone': return `tel:${phone}`;
      case 'sms': return `sms:${phone}${smsBody ? '?body=' + encodeURIComponent(smsBody) : ''}`;
      case 'wifi': return `WIFI:T:${wifiType};S:${wifiName};P:${wifiPass};;`;
      default: return url || 'https://www.superadpro.com';
    }
  }, [mode, url, text, email, emailSubject, phone, smsBody, wifiName, wifiPass, wifiType]);

  const generate = useCallback(async () => {
    const content = getContent();
    try {
      const dataUrl = await QRCode.toDataURL(content, {
        width: size, margin: 2, color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: ecLevel,
      });
      setQrDataUrl(dataUrl);
      const svgStr = await QRCode.toString(content, {
        type: 'svg', margin: 2, color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: ecLevel,
      });
      setQrSvg(svgStr);
    } catch (e) { console.error('QR generation error:', e); }
  }, [getContent, size, fgColor, bgColor, ecLevel]);

  useEffect(() => { generate(); }, [generate]);

  const dlPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.download = 'qrcode-superadpro.png';
    a.href = qrDataUrl; a.click();
  };
  const dlSVG = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.download = 'qrcode-superadpro.svg';
    a.href = URL.createObjectURL(blob); a.click();
  };
  const reset = () => {
    setMode('url'); setUrl('https://www.superadpro.com'); setText(''); setEmail('');
    setEmailSubject(''); setPhone(''); setSmsBody(''); setWifiName(''); setWifiPass('');
    setWifiType('WPA'); setFgColor('#000000'); setBgColor('#FFFFFF'); setSize(300); setEcLevel('M');
  };

  const renderInputs = () => {
    switch (mode) {
      case 'url':
        return (
          <div>
            <label style={labelStyle}>URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.example.com" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
          </div>
        );
      case 'text':
        return (
          <div>
            <label style={labelStyle}>Text</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('qrTool.textPlaceholder')} rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
              onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
          </div>
        );
      case 'wifi':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('qrTool.wifiNetwork')}</label>
              <input type="text" value={wifiName} onChange={e => setWifiName(e.target.value)} placeholder={t('qrTool.wifiNetworkPlaceholder')} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="text" value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder={t('qrTool.wifiPassword')} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
            <div>
              <label style={labelStyle}>{t('qrTool.encryption')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['WPA', 'WEP', 'nopass'].map(opt => (
                  <button key={opt} onClick={() => setWifiType(opt)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8,
                      border: wifiType === opt ? '1.5px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                      cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                      fontSize: 13, fontWeight: 700,
                      color: wifiType === opt ? '#fff' : 'var(--sap-text-muted)',
                      background: wifiType === opt ? 'var(--sap-accent)' : '#fff',
                      transition: 'all .15s',
                    }}>{opt === 'nopass' ? 'None' : opt}</button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'email':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('qrTool.emailAddress')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
            <div>
              <label style={labelStyle}>Subject (optional)</label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={t('qrTool.subjectPlaceholder')} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
          </div>
        );
      case 'phone':
        return (
          <div>
            <label style={labelStyle}>{t('qrTool.phoneNumber')}</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
          </div>
        );
      case 'sms':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('qrTool.phoneNumber')}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
            <div>
              <label style={labelStyle}>{t('qrTool.messageOptional')}</label>
              <textarea value={smsBody} onChange={e => setSmsBody(e.target.value)} placeholder={t('qrTool.smsTextPlaceholder')} rows={2}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <AppLayout title={t('qrTool.pageTitle')} subtitle={t('qrTool.pageSubtitle')}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT: configuration — independently scrollable so the QR preview on the right stays in view */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 24,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          position: 'sticky', top: 20,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}>
          {/* Mode tabs */}
          <label style={{ ...labelStyle, marginBottom: 10 }}>QR Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
            {MODES.map(m => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '12px 8px', borderRadius: 10,
                    border: active ? '1.5px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                    background: active ? 'rgba(14,165,233,0.08)' : '#fff',
                    color: active ? 'var(--sap-accent)' : 'var(--sap-text-muted)',
                    cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                    fontSize: 12, fontWeight: 700, transition: 'all .15s',
                  }}>
                  <Icon size={18} />
                  {m.name}
                </button>
              );
            })}
          </div>

          {/* Mode-specific inputs */}
          {renderInputs()}

          {/* Style options */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--sap-border)' }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>{t('qrTool.customisation')}</label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{t('qrTool.foreground')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)}
                    style={{ width: 40, height: 36, padding: 0, borderRadius: 8, border: '1px solid var(--sap-border)', cursor: 'pointer' }} />
                  <input type="text" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} />
                </div>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{t('qrTool.background')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                    style={{ width: 40, height: 36, padding: 0, borderRadius: 8, border: '1px solid var(--sap-border)', cursor: 'pointer' }} />
                  <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Size: {size}px</label>
              <input type="range" min={150} max={600} step={10} value={size} onChange={e => setSize(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--sap-accent)' }} />
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{t('qrTool.errorCorrection')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {EC_LEVELS.map(l => (
                  <button key={l.id} onClick={() => setEcLevel(l.id)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8,
                      border: ecLevel === l.id ? '1.5px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                      background: ecLevel === l.id ? 'rgba(14,165,233,0.08)' : '#fff',
                      color: ecLevel === l.id ? 'var(--sap-accent)' : 'var(--sap-text-muted)',
                      cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                      fontSize: 12, fontWeight: 700, transition: 'all .15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                    <span>{l.name}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={reset}
            style={{
              marginTop: 20, width: '100%', padding: '10px 16px', borderRadius: 10,
              border: '1.5px solid var(--sap-border)', background: '#fff', color: 'var(--sap-text-muted)',
              cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--sap-accent)'; e.currentTarget.style.color = 'var(--sap-accent)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--sap-border)'; e.currentTarget.style.color = 'var(--sap-text-muted)'; }}>
            <RefreshCw size={14} /> Reset to defaults
          </button>
        </div>

        {/* RIGHT: preview + downloads */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', position: 'sticky', top: 20 }}>
          <label style={{ ...labelStyle, marginBottom: 16 }}>Preview</label>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--sap-bg-elevated)', borderRadius: 12,
            padding: 32, marginBottom: 16, minHeight: 320,
            border: '1px dashed var(--sap-border)',
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={t('qrTool.alt')}
                style={{ maxWidth: '100%', maxHeight: 280, display: 'block' }} />
            ) : (
              <div style={{ color: 'var(--sap-text-faint)', fontSize: 13 }}>Generating…</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={dlPNG}
              style={{
                padding: '12px 16px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, var(--sap-accent), var(--sap-accent-light))',
                color: '#fff', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                fontSize: 14, fontWeight: 700, transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(14,165,233,0.25)',
              }}>
              <Download size={16} /> Download PNG
            </button>
            <button onClick={dlSVG}
              style={{
                padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid var(--sap-accent)', background: '#fff', color: 'var(--sap-accent)',
                cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                fontSize: 14, fontWeight: 700, transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Download size={16} /> Download SVG
            </button>
          </div>

          <div style={{
            marginTop: 16, padding: 12,
            background: 'var(--sap-bg-elevated)', borderRadius: 8,
            fontSize: 12, color: 'var(--sap-text-muted)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--sap-text-primary)' }}>Tip:</strong> SVG scales perfectly for print and signage. PNG is best for web and social media. Keep the background white and the foreground dark for maximum scan reliability.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
