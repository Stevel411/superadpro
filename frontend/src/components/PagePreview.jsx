import { useRef, useState, useEffect } from 'react';

// PagePreview — renders a REAL, scaled-down live preview of a page from its
// exported HTML. The page renders at full canvas width (1100px) inside an
// isolated iframe, then CSS-scaled to fit the container width, so the
// thumbnail is the actual page rather than a placeholder icon.
//
// Notes:
//  - srcDoc (not src) means it never hits the live /p/{slug} URL, so rendering
//    a thumbnail can't inflate page-view analytics.
//  - pointerEvents:none lets clicks fall through to the surrounding card.
//  - ResizeObserver keeps the scale correct as the grid/card resizes.
export default function PagePreview({ html, height = 150, canvasWidth = 1100 }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.32);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => { if (el.clientWidth) setScale(el.clientWidth / canvasWidth); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasWidth]);

  return (
    <div ref={ref} style={{ height, overflow: 'hidden', position: 'relative', background: '#fff', pointerEvents: 'none' }}>
      {html ? (
        <iframe
          title="page preview"
          srcDoc={html}
          scrolling="no"
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          style={{
            width: canvasWidth,
            height: Math.ceil(height / (scale || 0.32)),
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
          }}
        />
      ) : (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, fontFamily: 'DM Sans,sans-serif' }}>
          No preview yet
        </div>
      )}
    </div>
  );
}
