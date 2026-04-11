import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { QrCode, Download, Copy, Check, Link, ExternalLink } from 'lucide-react';

export default function QRGenerator() {
  var [url, setUrl] = useState('');
  var [qrData, setQrData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [copied, setCopied] = useState(false);
  var [presets, setPresets] = useState([]);

  useEffect(function() {
    // Load user's key URLs as presets
    apiGet('/api/dashboard').then(function(r) {
      var base = 'https://www.superadpro.com';
      var username = r.username || '';
      var items = [];
      if (username) items.push({ label: 'Referral Link', url: base + '/join/' + username, emoji: '🔗' });
      items.push({ label: 'LinkHub Page', url: base + '/link/' + username, emoji: '📱' });
      items.push({ label: 'Public Profile', url: base + '/@' + username, emoji: '👤' });
      setPresets(items);
      if (!url && username) setUrl(base + '/join/' + username);
    }).catch(function() {});
  }, []);

  function generateQR() {
    if (!url.trim()) return;
    setLoading(true);
    apiGet('/api/qr-code?url=' + encodeURIComponent(url.trim())).then(function(r) {
      setQrData(r);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  function downloadQR() {
    if (!url.trim()) return;
    window.open('/api/qr-code/download?url=' + encodeURIComponent(url.trim()), '_blank');
  }

  function copyUrl() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  return (
    <AppLayout title="QR Code Generator" subtitle="Generate QR codes for any link — referrals, funnels, LinkHub">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
        {/* Input panel */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'24px',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <Link size={16} color="#8b5cf6"/> Enter URL
          </div>

          <div style={{marginBottom:16}}>
            <input value={url} onChange={function(e){setUrl(e.target.value);setQrData(null);}}
              onKeyDown={function(e){if(e.key==='Enter')generateQR();}}
              placeholder="https://www.superadpro.com/join/yourname"
              style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#f8fafc',
                fontSize:13,fontFamily:'inherit',outline:'none',color:'#0f172a',boxSizing:'border-box'}}/>
          </div>

          <div style={{display:'flex',gap:8,marginBottom:20}}>
            <button onClick={generateQR} disabled={loading || !url.trim()}
              style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:url.trim()?'linear-gradient(135deg,#8b5cf6,#a78bfa)':'#e2e8f0',
                color:'#fff',fontSize:13,fontWeight:800,cursor:url.trim()?'pointer':'default',fontFamily:'inherit',
                display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <QrCode size={15}/> {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
            <button onClick={copyUrl} disabled={!url.trim()}
              style={{padding:'12px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',
                color:'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
              {copied ? <><Check size={13} color="#16a34a"/> Copied</> : <><Copy size={13}/> Copy</>}
            </button>
          </div>

          {/* Quick presets */}
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Quick Links</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {presets.map(function(p) {
              return (
                <button key={p.label} onClick={function(){setUrl(p.url);setQrData(null);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:9,
                    border:url===p.url?'1.5px solid #8b5cf6':'1px solid #e8ecf2',
                    background:url===p.url?'rgba(139,92,246,.04)':'#fff',cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
                  <span style={{fontSize:18}}>{p.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.label}</div>
                    <div style={{fontSize:10,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.url}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* QR display */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'24px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',textAlign:'center'}}>
          {qrData ? (
            <div>
              <div style={{marginBottom:16}}>
                <img src={'data:image/png;base64,' + qrData.qr_base64} alt="QR Code"
                  style={{width:280,height:280,borderRadius:12,border:'1px solid #f1f5f9'}}/>
              </div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:16,fontFamily:'monospace',wordBreak:'break-all',maxWidth:300,margin:'0 auto 16px'}}>
                {qrData.url}
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button onClick={downloadQR}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,border:'none',
                    background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:13,fontWeight:700,
                    cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(14,165,233,.3)'}}>
                  <Download size={14}/> Download PNG
                </button>
                <a href={qrData.url} target="_blank" rel="noopener noreferrer"
                  style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:10,
                    border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:12,fontWeight:700,textDecoration:'none'}}>
                  <ExternalLink size={13}/> Open Link
                </a>
              </div>
              <div style={{marginTop:20,padding:'14px',background:'#f8fafc',borderRadius:10,border:'1px solid #e8ecf2'}}>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6}}>Usage Tips</div>
                <div style={{fontSize:12,color:'#64748b',lineHeight:1.7}}>
                  Print on business cards, flyers, or stickers. Share in WhatsApp groups. Display at events and meetups. Perfect for bridging offline to online.
                </div>
              </div>
            </div>
          ) : (
            <div style={{padding:'60px 20px'}}>
              <QrCode size={56} color="#e2e8f0" style={{marginBottom:16}}/>
              <div style={{fontSize:15,fontWeight:700,color:'#64748b',marginBottom:6}}>Your QR Code</div>
              <div style={{fontSize:12,color:'#cbd5e1'}}>Enter a URL and click Generate to create your QR code</div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
