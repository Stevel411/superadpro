import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Free QR Code Generator
   Browser-based, zero server cost. Supports URL, Text, WiFi,
   Email, Phone, SMS. Custom colours, size, error correction.
   ═══════════════════════════════════════════════════════════ */

const MODES = [
  { id: 'url', name: 'URL', placeholder: 'https://www.example.com' },
  { id: 'text', name: 'Text', placeholder: 'Enter any text...' },
  { id: 'wifi', name: 'WiFi', placeholder: '' },
  { id: 'email', name: 'Email', placeholder: 'hello@example.com' },
  { id: 'phone', name: 'Phone', placeholder: '+44 7700 900000' },
  { id: 'sms', name: 'SMS', placeholder: '+44 7700 900000' },
];

const EC_LEVELS = [
  { id: 'L', name: 'Low', desc: '7% recovery' },
  { id: 'M', name: 'Medium', desc: '15% recovery' },
  { id: 'Q', name: 'High', desc: '25% recovery' },
  { id: 'H', name: 'Best', desc: '30% recovery' },
];

const inp = { width: '100%', padding: '10px 14px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: '"DM Sans",sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' };

export default function QRCodeGenerator() {
  useEffect(() => {
    document.title = 'Free QR Code Generator — Create Custom QR Codes | SuperAdPro';
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Generate free QR codes for URLs, text, WiFi, email, phone, and SMS. Customise colours, size, and error correction. Download as PNG or SVG. No signup required.';
    if (!meta.parentNode) document.head.appendChild(meta);
    return () => { document.title = 'SuperAdPro'; };
  }, []);

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
  const canvasRef = useRef(null);

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

  // Generate QR code
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
    } catch (e) {
      console.error('QR generation error:', e);
    }
  }, [getContent, size, fgColor, bgColor, ecLevel]);

  useEffect(() => { generate(); }, [generate]);

  // Downloads
  const dlPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.download = 'qrcode-superadpro.png';
    a.href = qrDataUrl;
    a.click();
  };

  const dlSVG = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.download = 'qrcode-superadpro.svg';
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  const reset = () => {
    setMode('url'); setUrl('https://www.superadpro.com'); setText(''); setEmail('');
    setEmailSubject(''); setPhone(''); setSmsBody(''); setWifiName(''); setWifiPass('');
    setWifiType('WPA'); setFgColor('#000000'); setBgColor('#FFFFFF'); setSize(300); setEcLevel('M');
  };

  // Render mode-specific inputs
  const renderInputs = () => {
    switch (mode) {
      case 'url':
        return (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>URL</div>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.example.com" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
          </div>
        );
      case 'text':
        return (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Text</div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter any text..." rows={3}
              style={{ ...inp, resize: 'vertical', minHeight: 60 }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
          </div>
        );
      case 'wifi':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>WiFi details</div>
            <input type="text" value={wifiName} onChange={e => setWifiName(e.target.value)} placeholder="Network name (SSID)" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
            <input type="text" value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="Password" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
            <div style={{ display: 'flex', gap: 6 }}>
              {['WPA', 'WEP', 'nopass'].map(t => (
                <button key={t} onClick={() => setWifiType(t)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                    fontSize: 11, fontWeight: wifiType === t ? 700 : 600,
                    background: wifiType === t ? '#0ea5e9' : '#1b2030',
                    color: wifiType === t ? '#fff' : '#7b8594',
                    borderWidth: 1, borderStyle: 'solid', borderColor: wifiType === t ? '#0ea5e9' : '#2a3040',
                  }}>{t === 'nopass' ? 'None' : t}</button>
              ))}
            </div>
          </div>
        );
      case 'email':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject (optional)" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
          </div>
        );
      case 'phone':
        return (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Phone number</div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
          </div>
        );
      case 'sms':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>SMS</div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={inp}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
            <textarea value={smsBody} onChange={e => setSmsBody(e.target.value)} placeholder="Message (optional)" rows={2}
              style={{ ...inp, resize: 'vertical', minHeight: 48 }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>
      {/* Background image + overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img src="/static/images/explore-bg2.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(3,7,18,0.85) 0%,rgba(3,7,18,0.75) 30%,rgba(3,7,18,0.8) 60%,rgba(3,7,18,0.95) 100%)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ═══ NAV ═══ */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', height: 80, background: 'rgba(10,18,40,0.95)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)', flexShrink: 0, position: 'relative' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <svg style={{ width: 28, height: 28 }} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#0ea5e9"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>SuperAd<span style={{ color: '#38bdf8' }}>Pro</span></span>
        </Link>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>Free QR Code Generator</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.4)', borderRadius: 20, padding: '4px 14px', letterSpacing: 1.5 }}>FREE</span>
        </div>
        <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 15, fontWeight: 600, padding: '10px 24px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>Get started free</Link>
      </nav>

      {/* ═══ WORKSPACE — 50/50 ═══ */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* ═══ LEFT: QR Preview ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px 16px', borderRight: '1px solid rgba(0,180,216,0.06)', overflow: 'hidden' }}>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 310px)' }}>
            {qrDataUrl ? (
              <div style={{ background: bgColor, borderRadius: 12, padding: 20, display: 'inline-block' }}>
                <img src={qrDataUrl} alt="QR Code" style={{ width: Math.min(size, 320), height: Math.min(size, 320), display: 'block', imageRendering: 'pixelated' }} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(200,220,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>QR</div>
                <div style={{ fontSize: 14 }}>Enter content to generate</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '12px 0 10px', flexShrink: 0 }}>
            <button onClick={dlPNG} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>Download PNG</button>
            <button onClick={dlSVG} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'rgba(255,255,255,.05)', color: 'rgba(200,220,255,.6)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', fontFamily: 'inherit' }}>Download SVG</button>
            <button onClick={reset} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'rgba(255,255,255,.05)', color: 'rgba(200,220,255,.6)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
          </div>

          <div style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.1)', borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Start your online business today</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(200,220,255,.35)', lineHeight: 1.5, flex: 1 }}>AI creative tools, income opportunities, and everything you need to earn online — all in one platform.</span>
              <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Learn more</Link>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Controls ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0a1220', overflow: 'auto', padding: '20px 20px 16px' }}>

          {/* Content type tabs */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Content type</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: '"DM Sans",sans-serif', fontSize: 12,
                  fontWeight: mode === m.id ? 700 : 600,
                  background: mode === m.id ? '#0ea5e9' : '#1b2030',
                  color: mode === m.id ? '#fff' : '#7b8594',
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: mode === m.id ? '#0ea5e9' : '#2a3040',
                  transition: 'all .15s',
                }}>{m.name}</button>
            ))}
          </div>

          {/* Mode-specific inputs */}
          <div style={{ marginBottom: 16 }}>
            {renderInputs()}
          </div>

          {/* Customise */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Customise</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Foreground</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10 }}>
                <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }} />
                <span style={{ fontSize: 12, color: '#c5cad1', fontFamily: '"DM Sans",monospace' }}>{fgColor.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Background</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10 }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }} />
                <span style={{ fontSize: 12, color: '#c5cad1', fontFamily: '"DM Sans",monospace' }}>{bgColor.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Size slider */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#7b8594', fontWeight: 600 }}>Size</span>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{size}px</span>
            </div>
            <input type="range" min="100" max="600" step="50" value={size} onChange={e => setSize(+e.target.value)}
              style={{ width: '100%', accentColor: '#0ea5e9' }} />
          </div>

          {/* Error correction */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 6, fontWeight: 600 }}>Error correction</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {EC_LEVELS.map(ec => (
                <button key={ec.id} onClick={() => setEcLevel(ec.id)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: '"DM Sans",sans-serif', fontSize: 11,
                    fontWeight: ecLevel === ec.id ? 700 : 600,
                    background: ecLevel === ec.id ? '#0ea5e9' : '#1b2030',
                    color: ecLevel === ec.id ? '#fff' : '#7b8594',
                    borderWidth: 1, borderStyle: 'solid',
                    borderColor: ecLevel === ec.id ? '#0ea5e9' : '#2a3040',
                    transition: 'all .15s',
                  }}>{ec.name}</button>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: '10px 14px', background: 'rgba(14,165,233,0.03)', borderTop: '1px solid rgba(0,180,216,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1 }}>Earn money online with SuperAdPro</span>
            <Link to="/earn" style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none' }}>See how →</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
