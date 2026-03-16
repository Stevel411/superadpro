import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, LANGUAGES } from '../../i18n';
import { Globe } from 'lucide-react';

export default function LanguageSelector({ compact }) {
  var { i18n } = useTranslation();
  var [open, setOpen] = useState(false);
  var ref = useRef(null);

  var current = LANGUAGES.find(function(l) { return l.code === i18n.language; }) || LANGUAGES[0];

  useEffect(function() {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  function select(code) {
    changeLanguage(code);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={function() { setOpen(!open); }}
        style={{display:'flex',alignItems:'center',gap:6,padding:compact?'6px 10px':'8px 14px',borderRadius:8,
          border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',cursor:'pointer',
          color:'rgba(255,255,255,.6)',fontSize:compact?11:12,fontWeight:700,fontFamily:'inherit',transition:'all .15s'}}>
        <Globe size={compact?12:14}/>
        <span>{current.flag}</span>
        {!compact && <span>{current.name}</span>}
      </button>

      {open && (
        <div style={{position:'absolute',bottom:compact?'100%':'auto',top:compact?'auto':'100%',
          left:0,marginTop:4,marginBottom:4,width:200,maxHeight:320,overflowY:'auto',
          background:'#1c223d',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,
          boxShadow:'0 12px 40px rgba(0,0,0,.4)',zIndex:999,padding:4}}>
          {LANGUAGES.map(function(lang) {
            var isActive = lang.code === i18n.language;
            return (
              <button key={lang.code} onClick={function() { select(lang.code); }}
                style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 12px',borderRadius:6,
                  border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:isActive?800:500,
                  background:isActive?'rgba(14,165,233,.12)':'transparent',
                  color:isActive?'#38bdf8':'rgba(255,255,255,.6)',transition:'all .1s',textAlign:'left'}}>
                <span style={{fontSize:16}}>{lang.flag}</span>
                <span>{lang.name}</span>
                {isActive && <span style={{marginLeft:'auto',fontSize:10,color:'#38bdf8'}}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
