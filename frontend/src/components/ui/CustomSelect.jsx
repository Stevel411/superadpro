import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect — professional dropdown replacement for native <select>.
 * Props:
 *   value       — current selected value
 *   onChange     — function(value) called on selection
 *   options      — [{value:'', label:'All'}, ...]
 *   placeholder  — shown when no value selected
 *   style        — optional container style overrides
 *   small        — if true, renders compact version
 */
export default function CustomSelect({ value, onChange, options, placeholder, style, small }) {
  var [open, setOpen] = useState(false);
  var ref = useRef(null);

  // Close on outside click
  useEffect(function() {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  var selected = options.find(function(o) { return o.value === value; });
  var label = selected ? selected.label : (placeholder || 'Select...');
  var pad = small ? '8px 32px 8px 12px' : '10px 36px 10px 14px';
  var fs = small ? 11 : 13;

  return (
    <div ref={ref} style={Object.assign({ position:'relative', width:'100%' }, style || {})}>
      {/* Trigger */}
      <div onClick={function() { setOpen(!open); }}
        style={{
          padding:pad, borderRadius:10,
          border: open ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
          background:'#fff', color:'#0f172a', fontSize:fs, fontWeight:500,
          fontFamily:'inherit', cursor:'pointer', userSelect:'none',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,.1)' : 'none',
          transition:'border-color .15s, box-shadow .15s',
        }}
        onMouseEnter={function(e) { if (!open) e.currentTarget.style.borderColor = '#a5b4fc'; }}
        onMouseLeave={function(e) { if (!open) e.currentTarget.style.borderColor = '#e2e8f0'; }}
      >
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: selected ? '#0f172a' : '#94a3b8' }}>{label}</span>
        <ChevronDown size={small ? 13 : 15} color="#64748b" style={{ flexShrink:0, transition:'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, marginTop:4,
          background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)',
          zIndex:999, maxHeight:220, overflowY:'auto',
          animation:'slDropIn .15s ease-out',
        }}>
          <style>{`@keyframes slDropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {options.map(function(o) {
            var isSelected = o.value === value;
            return (
              <div key={o.value}
                onClick={function() { onChange(o.value); setOpen(false); }}
                style={{
                  padding: small ? '8px 12px' : '10px 14px',
                  fontSize:fs, fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#6366f1' : '#0f172a',
                  background: isSelected ? '#eef2ff' : 'transparent',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between',
                  transition:'background .1s',
                  borderBottom: '1px solid #f8fafc',
                }}
                onMouseEnter={function(e) { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={function(e) { if (!isSelected) e.currentTarget.style.background = isSelected ? '#eef2ff' : 'transparent'; }}
              >
                <span>{o.label}</span>
                {isSelected && <Check size={14} color="#6366f1"/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
