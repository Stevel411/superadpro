import React, { useEffect, useRef, useState } from 'react';

// Drop-in network banner slot. Fetches one banner of the given size from the
// member banner network and renders it subtly (small "Sponsored" label, a
// house "advertise here" fallback when empty, 1s-view impression tracking,
// click-through + report control). Mobile-safe.
//   <NetworkAd size="728x90" />              full-size, centred (page gaps)
//   <NetworkAd size="300x250" fluid />       scales to its container, no crop (sidebar/narrow)

function ReportBtn({ id }) {
  const [done, setDone] = useState(false);
  if (done) return <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(10,31,82,.75)', borderRadius: 5, padding: '2px 6px', zIndex: 3 }}>Reported ✓</div>;
  return (
    <button title="Report this banner" onClick={function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!window.confirm('Report this banner as inappropriate?')) return;
      fetch('/api/al/banner/' + id + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'user report' }) }).then(function () { setDone(true); }).catch(function () { setDone(true); });
    }} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 5, border: 'none', background: 'rgba(10,31,82,.5)', color: '#fff', fontSize: 10, lineHeight: '18px', cursor: 'pointer', padding: 0, opacity: 0.6, zIndex: 3 }}>⚠</button>
  );
}

export default function NetworkAd({ size = '728x90', sticky = false, fluid = false, hideWhenEmpty = false, labelColor = '#9aa6c0', style = {} }) {
  const parts = String(size).toLowerCase().split('x');
  const w = parseInt(parts[0], 10) || 728;
  const h = parseInt(parts[1], 10) || 90;

  const [slot, setSlot] = useState(undefined); // undefined=loading, null=empty, obj=ad
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/al/network-ads?req=' + encodeURIComponent(size + ':1'))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!alive) return; const arr = d && d.slots && d.slots[size]; setSlot((arr && arr[0]) || null); })
      .catch(function () { if (alive) setSlot(null); });
    return function () { alive = false; };
  }, [size]);

  useEffect(() => {
    if (!slot || !slot.id || seen || !ref.current) return;
    let timer = null;
    const io = new IntersectionObserver(function (entries) {
      const e = entries[0];
      if (e && e.isIntersecting && e.intersectionRatio >= 0.5) {
        timer = setTimeout(function () { fetch('/api/al/banner/' + slot.id + '/impression', { method: 'POST' }).catch(function () {}); setSeen(true); }, 1000);
      } else if (timer) { clearTimeout(timer); timer = null; }
    }, { threshold: [0, 0.5, 1] });
    io.observe(ref.current);
    return function () { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [slot, seen]);

  if (slot === undefined) return null;
  if (slot === null && hideWhenEmpty) return null;

  const wrap = { width: '100%', margin: '10px auto', textAlign: 'center', position: sticky ? 'sticky' : 'static', top: sticky ? 78 : 'auto', ...style };
  const box = fluid
    ? { width: '100%', borderRadius: 12, overflow: 'hidden', margin: '0 auto', position: 'relative' }
    : { width: '100%', maxWidth: w, height: h, borderRadius: 12, overflow: 'hidden', margin: '0 auto', boxSizing: 'border-box', position: 'relative' };
  const label = <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: labelColor, marginBottom: 5 }}>Sponsored</div>;

  if (!slot) {
    const houseBox = fluid ? { ...box, aspectRatio: w + '/' + h } : box;
    return (
      <div style={wrap} className="netad">
        {label}
        <a href="/my-banners" ref={ref} style={{ ...houseBox, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textDecoration: 'none', background: 'repeating-linear-gradient(45deg,#eef2fb,#eef2fb 12px,#e6ecf5 12px,#e6ecf5 24px)', border: '2px dashed #c3d0ea', fontWeight: 800, fontSize: 13, textAlign: 'center', padding: 12 }}>
          <span style={{ color: '#5a6584' }}>📢 Advertise here →</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8b97b4' }}>{w} × {h} — create a banner</span>
        </a>
      </div>
    );
  }

  const imgStyle = fluid ? { width: '100%', height: 'auto', display: 'block' } : { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
  const htmlWrap = fluid ? { width: '100%', aspectRatio: w + '/' + h } : { width: '100%', height: '100%' };
  return (
    <div style={wrap} className="netad">
      {label}
      <div ref={ref} style={box}>
        {slot.mode === 'html'
          ? <div style={htmlWrap} dangerouslySetInnerHTML={{ __html: slot.html_code || '' }} />
          : <a href={slot.click_url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%' }}><img src={slot.image_url} alt={slot.title || 'Advertisement'} style={imgStyle} /></a>}
        <ReportBtn id={slot.id} />
      </div>
    </div>
  );
}
