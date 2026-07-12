import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import { LABS_TEMPLATES } from './labsTemplates';
import exportHTML from './exportHTML';
import './LabsChrome.css';

// ═══════════════════════════════════════════════════════════════
// Labs Templates — Portfolio Preview
// ═══════════════════════════════════════════════════════════════
//
// Standalone /labs/pagebuilder/preview-templates page that renders
// every built-in template at full size in its own iframe. Read-only.
// No database, no save, no apply — just see what's been built.
//
// Each template renders into an isolated iframe so its CSS (font
// imports, @media queries, custom backgrounds) can't bleed into the
// chrome around it. Same approach as the editor's Preview button.
//
// Admin-gated for now since /labs/* is admin-only.

export default function LabsTemplatesPreview() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [zoom, setZoom] = useState(0.6); // 60% scale by default — fits more on screen

  // Admin gate — same belt-and-braces as the Labs editor.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  if (authLoading) return null;
  if (!user || !user.is_admin) return null;

  return (
    <AppLayout
      title="🧪 LABS · Template Portfolio"
      subtitle="Preview all 6 built-in templates · Read-only · Doesn't touch live data"
      fullHeight
      bgStyle={{ padding: 0, background: '#f1f5fb', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowY: 'hidden' }}
    >
      <div className="labs-chrome" style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, minHeight: 0,
        fontFamily: "'Manrope', 'Inter', sans-serif",
        overflow: 'auto',
      }}>
        {/* Header strip — explains what this is, plus zoom control */}
        <div style={{
          padding: '20px 32px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid rgba(15,23,42,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 99,
              background: 'linear-gradient(135deg, rgba(200,16,46,0.1), rgba(18,56,143,0.1))',
              border: '1px solid rgba(200,16,46,0.25)',
              fontFamily: 'Sora, sans-serif',
              fontSize: 10, fontWeight: 900,
              color: '#0284c7',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>✨ Portfolio · Read-only</div>
            <h2 style={{
              margin: 0,
              fontFamily: 'Sora, sans-serif',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.025em',
              color: '#0f172a',
            }}>{LABS_TEMPLATES.length} starter templates</h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#475569',
              fontWeight: 500,
              maxWidth: 640,
            }}>
              Each template renders below at the configured zoom. None of this affects the live platform or your funnel database.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Zoom</span>
            <input
              type="range"
              min="0.3" max="1" step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ width: 120, accentColor: '#c8102e', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', minWidth: 36, fontFamily: 'monospace' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Template grid — each template gets its own card with an iframe */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(680px, 1fr))',
          gap: 28,
          padding: '28px 32px 60px',
          maxWidth: 1900,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {LABS_TEMPLATES.map((tpl) => {
            // Compute the iframe height from the template's element bounds —
            // matches exportHTML's height calculation so we don't get scrollbars
            // or wasted whitespace inside the preview frame.
            const maxY = tpl.els.length > 0
              ? Math.max(...tpl.els.map(e => (e.y || 0) + (e.h || 0))) + 80
              : 900;
            const renderH = Math.max(900, maxY);
            // Outer card height adjusts to the scaled iframe so cards
            // visually represent the template's true proportions.
            const cardH = renderH * zoom + 24;

            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=1100"><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;600;700;800&family=Space+Grotesk:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&family=Montserrat:wght@400;600;700;800&family=Raleway:wght@400;600;700;800&family=Playfair+Display:wght@400;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Manrope','DM Sans',sans-serif;background:${tpl.canvasBg};${tpl.canvasBgImage ? `background-image:url(${tpl.canvasBgImage});background-size:cover;background-position:center;background-repeat:no-repeat;` : ''}min-height:100vh;width:1100px;overflow-x:hidden}img{max-width:100%;height:auto}</style></head><body>${exportHTML(tpl.els, tpl.canvasBg, tpl.canvasBgImage)}</body></html>`;

            return (
              <div key={tpl.id} style={{
                background: '#ffffff',
                borderRadius: 18,
                border: '1px solid rgba(200,16,46,0.14)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.9), ' +
                  '0 4px 12px rgba(200,16,46,0.12), ' +
                  '0 8px 20px rgba(18,56,143,0.10)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Card header */}
                <div style={{
                  padding: '16px 22px',
                  borderBottom: '1px solid rgba(15,23,42,0.06)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: tpl.accent,
                      marginBottom: 4,
                    }}>{tpl.category}</div>
                    <div style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: 17,
                      fontWeight: 900,
                      letterSpacing: '-0.015em',
                      color: '#0f172a',
                      marginBottom: 4,
                    }}>{tpl.name}</div>
                    <div style={{
                      fontSize: 12,
                      color: '#64748b',
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}>{tpl.description}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: '#94a3b8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}>{tpl.els.length} blocks</span>
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: '#94a3b8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}>{Math.round(maxY)}px tall</span>
                  </div>
                </div>

                {/* Rendered iframe — exactly what the published page would show */}
                <div style={{
                  height: cardH,
                  background: tpl.canvasBg,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: 1100,
                    height: renderH,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 12,
                    left: 12,
                  }}>
                    <iframe
                      srcDoc={html}
                      title={tpl.name}
                      sandbox="allow-same-origin"
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
