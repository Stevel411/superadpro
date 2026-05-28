// ─── LeadMagnetPreview ─ full-page miniature of the Lead Magnet template ───
// Real-screenshot vibe: a complete faithful miniature of what loads in the
// editor when you click the tile. Shows ALL the sections — badge, headline,
// subhead, form card, trust pills, "Inside this guide" heading, three
// benefit cards, CTA, disclaimer.
//
// 28 May 2026 — v2: previous version only showed the top of the page; Steve
// rightly flagged that wasn't really "a mini version of the page".

export default function LeadMagnetPreview() {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '4 / 3',
      background: '#f8fafc',
      padding: '12px 14px',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxSizing: 'border-box',
      gap: 4,
    }}>
      {/* 1. badge */}
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em',
        color: '#0e7490', background: 'rgba(6,182,212,0.10)',
        border: '0.5px solid rgba(6,182,212,0.25)', borderRadius: 99,
        padding: '2px 8px', marginBottom: 2,
      }}>★ FREE DOWNLOAD</div>

      {/* 2. headline */}
      <div style={{
        fontFamily: "'Sora',sans-serif", fontWeight: 900,
        fontSize: '0.85rem', color: '#0a1438',
        textAlign: 'center', lineHeight: 1.1, letterSpacing: -0.3,
        padding: '0 6px',
      }}>Get the free guide that shows you how.</div>

      {/* 3. subhead */}
      <div style={{
        fontSize: '0.5rem', color: '#64748b',
        textAlign: 'center', lineHeight: 1.3,
        padding: '0 14px',
      }}>Enter your email and we'll send the guide right away.</div>

      {/* 4. form card */}
      <div style={{
        marginTop: 4, width: '80%',
        background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 5,
        padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 3,
        boxShadow: '0 2px 6px rgba(10,20,56,0.06)',
      }}>
        <div style={{
          fontFamily: "'Sora',sans-serif", fontWeight: 800,
          fontSize: '0.55rem', color: '#0a1438', textAlign: 'center',
        }}>Send me the free guide</div>
        <div style={{
          background: '#f1f5f9', border: '0.5px solid #e2e8f0',
          borderRadius: 2, height: 8,
        }}/>
        <div style={{
          background: 'linear-gradient(135deg,#0a1438,#0ea5e9)',
          borderRadius: 2, height: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: "'Sora',sans-serif",
          fontWeight: 800, fontSize: '0.5rem',
        }}>Get the guide →</div>
      </div>

      {/* 5. trust strip */}
      <div style={{
        marginTop: 5, display: 'flex', gap: 8, justifyContent: 'center',
        fontSize: '0.45rem', color: '#475569', fontWeight: 600,
        flexWrap: 'wrap',
      }}>
        <span>✓ No spam</span>
        <span>✓ Instant</span>
        <span>✓ Unsub anytime</span>
      </div>

      {/* 6. "Inside this guide" heading */}
      <div style={{
        marginTop: 6,
        fontFamily: "'Sora',sans-serif", fontWeight: 800,
        fontSize: '0.6rem', color: '#0a1438', textAlign: 'center',
      }}>Inside this free guide</div>

      {/* 7. three benefit cards */}
      <div style={{
        marginTop: 3, width: '92%',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
      }}>
        {['1', '2', '3'].map((n, i) => (
          <div key={n} style={{
            background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 4,
            padding: '5px 5px 4px', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2.5,
              background: 'linear-gradient(135deg,#0a1438,#0ea5e9)',
              color: '#fff', fontFamily: "'Sora',sans-serif", fontWeight: 900,
              fontSize: '0.45rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{n}</div>
            <div style={{
              fontFamily: "'Sora',sans-serif", fontWeight: 700,
              fontSize: '0.45rem', color: '#0a1438',
            }}>{['First step', 'Avoid this', 'How to grow'][i]}</div>
            <div style={{
              fontSize: '0.38rem', color: '#64748b', lineHeight: 1.25,
            }}>{[
              'What to do first, plain language.',
              'Common mistakes to sidestep.',
              'Framework for steady growth.',
            ][i]}</div>
          </div>
        ))}
      </div>

      {/* 8. CTA + disclaimer */}
      <div style={{
        marginTop: 5,
        fontFamily: "'Sora',sans-serif", fontWeight: 800,
        fontSize: '0.55rem', color: '#0a1438', textAlign: 'center',
      }}>Get the guide — free.</div>
      <div style={{
        fontSize: '0.38rem', color: '#94a3b8',
        textAlign: 'center', lineHeight: 1.3, marginTop: 1,
        padding: '0 14px',
      }}>Results vary. We respect your privacy.</div>
    </div>
  );
}
