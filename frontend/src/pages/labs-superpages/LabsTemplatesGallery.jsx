import { useState, useEffect } from 'react';
import { LABS_TEMPLATES, TEMPLATE_CATEGORIES } from './labsTemplates';
import {
  loadCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  encodeTemplateForShare,
  importTemplateFromCode,
} from './customTemplates';

// ═══════════════════════════════════════════════════════════════
// LabsTemplatesGallery — modal template picker
// ═══════════════════════════════════════════════════════════════
//
// Shown when the member clicks "Templates" in the editor topbar.
// Adapted from frontend/src/pages/brand-posters/BrandPostersGallery.jsx
// so SuperAdPro's template-picker UX feels consistent across surfaces.
//
// UX flow:
//   1. Click "Templates" in topbar → modal opens
//   2. Member browses cards, filtered by category pills
//   3. Click a card → "Apply" confirms (since this overwrites the
//      current canvas — important to confirm if there are existing
//      elements)
//   4. onApply(template) fires; editor loads els + canvasBg from
//      the template and closes the modal
//
// Props:
//   open      — bool, whether the modal is visible
//   onClose   — close without applying
//   onApply   — (template) => void; called when member confirms apply
//   hasContent — bool, whether the current canvas has elements (for
//                the confirm-overwrite warning)

export default function LabsTemplatesGallery({ open, onClose, onApply, hasContent, currentEls, currentBg, currentBgImage }) {
  const [filter, setFilter] = useState('all');
  const [confirmTpl, setConfirmTpl] = useState(null);
  const [customTpls, setCustomTpls] = useState([]);
  const [mode, setMode] = useState('browse'); // 'browse' | 'save' | 'import' | 'share'
  const [saveName, setSaveName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [shareForTpl, setShareForTpl] = useState(null);
  const [toast, setToast] = useState('');

  // Load custom templates on open + refresh whenever modal opens.
  useEffect(() => {
    if (open) {
      setCustomTpls(loadCustomTemplates());
      setMode('browse');
    }
  }, [open]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  if (!open) return null;

  // Merge built-ins with personal library; personal shows in "My templates"
  const allTemplates = [...customTpls, ...LABS_TEMPLATES];

  const visible = filter === 'all'
    ? allTemplates
    : allTemplates.filter(t => t.category === filter);

  const handleSaveCurrent = () => {
    if (!currentEls || currentEls.length === 0) {
      setToast('Nothing on the canvas to save');
      return;
    }
    const tpl = saveCustomTemplate(saveName, currentEls, currentBg, currentBgImage);
    if (tpl) {
      setCustomTpls(loadCustomTemplates());
      setSaveName('');
      setMode('browse');
      setFilter('My templates');
      setToast('✓ Saved to your templates');
    } else {
      setToast('Could not save — storage may be full');
    }
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    const imported = importTemplateFromCode(importCode);
    if (imported) {
      setCustomTpls(loadCustomTemplates());
      setImportCode('');
      setMode('browse');
      setFilter('My templates');
      setToast(`✓ Imported "${imported.name}"`);
    } else {
      setToast('Invalid template code');
    }
  };

  const handleDelete = (tpl) => {
    if (!confirm(`Delete "${tpl.name}" from your templates?`)) return;
    deleteCustomTemplate(tpl.id);
    setCustomTpls(loadCustomTemplates());
    setToast('Deleted');
  };

  const handleShare = (tpl) => {
    setShareForTpl(tpl);
    setMode('share');
  };

  const handleCardClick = (tpl) => {
    // If canvas is empty, apply immediately — no confirm needed.
    // If there's existing content, surface the overwrite warning.
    if (!hasContent) {
      onApply(tpl);
    } else {
      setConfirmTpl(tpl);
    }
  };

  const confirmApply = () => {
    if (confirmTpl) onApply(confirmTpl);
    setConfirmTpl(null);
  };

  return (
    <div
      // Modal backdrop. Click-outside closes (unless inside confirm).
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 18, 40, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 24px 24px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 1200,
          padding: '32px 36px 40px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3), 0 8px 24px rgba(168,85,247,0.15)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 12px',
              borderRadius: 99,
              background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(168,85,247,0.1))',
              border: '1px solid rgba(14,165,233,0.25)',
              fontFamily: 'Sora, sans-serif',
              fontSize: 10,
              fontWeight: 900,
              color: '#0284c7',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              ✨ Page Templates
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: 'Sora, sans-serif',
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: '-0.025em',
              color: '#0f172a',
            }}>
              Start from a template
            </h2>
            <p style={{
              margin: '6px 0 0',
              fontSize: 14,
              color: '#64748b',
              maxWidth: 580,
              lineHeight: 1.5,
            }}>
              Pick a starting point. Every template is built with the same blocks you can edit — drop in your copy, swap the colours, ship.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'rgba(15,23,42,0.04)',
              border: '1px solid rgba(15,23,42,0.06)',
              color: '#475569',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Personal-template actions toolbar */}
        {mode === 'browse' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
            <button onClick={() => setMode('save')} style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(14,165,233,0.3)',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(168,85,247,0.06))',
              color: '#0284c7',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>💾 Save current as template</button>
            <button onClick={() => setMode('import')} style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(168,85,247,0.3)',
              background: 'rgba(168,85,247,0.06)',
              color: '#7c3aed',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>📥 Import a SAP code</button>
            <div style={{ flex: 1 }}/>
            {customTpls.length > 0 && (
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                {customTpls.length} personal · {LABS_TEMPLATES.length} built-in
              </div>
            )}
          </div>
        )}

        {/* Save mode — name your current page, then save */}
        {mode === 'save' && (
          <div style={{ marginBottom: 18, padding: '16px 18px', background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 14 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.015em' }}>Save current page as a template</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
              Your template will be saved to this browser. Use the share button on any saved template to copy a SAP code others can import.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCurrent(); if (e.key === 'Escape') setMode('browse'); }}
                placeholder="Name your template (e.g. My course funnel v2)"
                autoFocus
                maxLength={60}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 9,
                  border: '1px solid rgba(15,23,42,0.1)', background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#0f172a',
                  fontFamily: 'Manrope,sans-serif', outline: 'none',
                }}
              />
              <button onClick={handleSaveCurrent} style={{
                padding: '10px 18px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#0ea5e9,#a855f7)', color: '#fff',
                fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 12,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
              }}>Save</button>
              <button onClick={() => setMode('browse')} style={{
                padding: '10px 14px', borderRadius: 9,
                border: '1px solid rgba(15,23,42,0.1)', background: '#fff',
                fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 12,
                color: '#475569', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Import mode — paste a SAP code */}
        {mode === 'import' && (
          <div style={{ marginBottom: 18, padding: '16px 18px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 14 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.015em' }}>Import a template code</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
              Paste the full code (including the SAP-XXXX-XXXX prefix and the long payload after the double colon).
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="SAP-XXXX-XXXX::eyJuYW1lIjoi..."
                rows={3}
                autoFocus
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 9,
                  border: '1px solid rgba(15,23,42,0.1)', background: '#fff',
                  fontSize: 12, fontWeight: 500, color: '#0f172a',
                  fontFamily: 'monospace', outline: 'none', resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleImport} style={{
                  padding: '10px 18px', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg,#a855f7,#ec4899)', color: '#fff',
                  fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 12,
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                }}>Import</button>
                <button onClick={() => setMode('browse')} style={{
                  padding: '10px 14px', borderRadius: 9,
                  border: '1px solid rgba(15,23,42,0.1)', background: '#fff',
                  fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 12,
                  color: '#475569', cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Share mode — show the SAP code for a selected template */}
        {mode === 'share' && shareForTpl && (() => {
          const fullCode = encodeTemplateForShare(shareForTpl);
          return (
            <div style={{ marginBottom: 18, padding: '16px 18px', background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.06))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.015em' }}>Share <span style={{ color: '#7c3aed' }}>{shareForTpl.name}</span></div>
                <button onClick={() => { setMode('browse'); setShareForTpl(null); }} style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(15,23,42,0.1)',
                  background: '#fff', color: '#475569', fontFamily: 'Manrope,sans-serif',
                  fontWeight: 800, fontSize: 11, cursor: 'pointer',
                }}>Done</button>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                Anyone with this code can paste it into the Import dialog to recreate your template. The short SAP prefix is the recognisable part — copy the entire thing including the long payload.
              </div>
              <textarea
                readOnly
                value={fullCode || ''}
                rows={3}
                onClick={(e) => e.currentTarget.select()}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  border: '1px solid rgba(15,23,42,0.1)', background: '#fff',
                  fontSize: 11, fontWeight: 500, color: '#0f172a',
                  fontFamily: 'monospace', outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <button onClick={() => {
                if (fullCode) {
                  navigator.clipboard.writeText(fullCode).then(
                    () => setToast('Copied to clipboard'),
                    () => setToast('Could not copy — please select and copy manually')
                  );
                }
              }} style={{
                marginTop: 8, padding: '8px 16px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#a855f7,#ec4899)', color: '#fff',
                fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 12,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
              }}>📋 Copy code</button>
            </div>
          );
        })()}

        {/* Category filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {[
            ...(customTpls.length > 0 ? [{ key: 'My templates', label: '⭐ My templates', colour: '#f59e0b' }] : []),
            ...TEMPLATE_CATEGORIES,
          ].map((cat) => {
            const active = filter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 99,
                  border: active
                    ? `1px solid ${cat.colour}`
                    : '1px solid rgba(15,23,42,0.08)',
                  background: active
                    ? `${cat.colour}15`
                    : '#ffffff',
                  color: active ? cat.colour : '#475569',
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s',
                }}
              >{cat.label}</button>
            );
          })}
        </div>

        {/* Template grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}>
          {visible.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleCardClick(tpl)}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(14,165,233,0.14)',
                borderRadius: 16,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'inherit',
                transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s cubic-bezier(0.4,0,0.2,1), border-color 0.18s ease',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.9), ' +
                  '0 4px 12px rgba(14,165,233,0.12), ' +
                  '0 8px 20px rgba(168,85,247,0.10)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)';
                e.currentTarget.style.boxShadow =
                  'inset 0 1px 0 rgba(255,255,255,1), ' +
                  '0 8px 20px rgba(14,165,233,0.22), ' +
                  '0 14px 36px rgba(168,85,247,0.22), ' +
                  '0 0 0 1px rgba(168,85,247,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.borderColor = 'rgba(14,165,233,0.14)';
                e.currentTarget.style.boxShadow =
                  'inset 0 1px 0 rgba(255,255,255,0.9), ' +
                  '0 4px 12px rgba(14,165,233,0.12), ' +
                  '0 8px 20px rgba(168,85,247,0.10)';
              }}
            >
              {/* Thumbnail — gradient placeholder representing the template's
                  canvas background + accent colour. Real screenshots can
                  replace this later. */}
              <div style={{
                aspectRatio: '16 / 10',
                background: tpl.thumbnailGradient,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative blocks suggesting the layout */}
                <div style={{
                  position: 'absolute',
                  top: '15%', left: '10%', right: '10%', height: '12%',
                  background: 'rgba(255,255,255,0.18)',
                  borderRadius: 4,
                }} />
                <div style={{
                  position: 'absolute',
                  top: '32%', left: '20%', right: '20%', height: '6%',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 3,
                }} />
                <div style={{
                  position: 'absolute',
                  top: '46%', left: '30%', right: '30%', height: '10%',
                  background: tpl.accent,
                  borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '15%', left: '15%', right: '15%', height: '20%',
                  background: 'rgba(255,255,255,0.10)',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)',
                }} />
              </div>

              {/* Card body */}
              <div style={{ padding: '16px 18px 18px' }}>
                <div style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: tpl.accent,
                  marginBottom: 6,
                }}>{tpl.category}</div>
                <div style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 16,
                  fontWeight: 900,
                  letterSpacing: '-0.015em',
                  color: '#0f172a',
                  marginBottom: 6,
                }}>{tpl.name}</div>
                <div style={{
                  fontSize: 12,
                  color: '#64748b',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}>{tpl.description}</div>
                <div style={{
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  color: tpl.accent,
                  fontFamily: 'Sora, sans-serif',
                }}>Use this template →</div>

                {/* Custom-template actions — only shown on personal saves */}
                {tpl._custom && (
                  <div style={{
                    display: 'flex', gap: 6, marginTop: 12,
                    paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.06)',
                  }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={(e) => { e.stopPropagation(); handleShare(tpl); }}
                      style={{
                        padding: '5px 10px', borderRadius: 6,
                        background: 'rgba(168,85,247,0.08)',
                        border: '1px solid rgba(168,85,247,0.25)',
                        color: '#7c3aed', cursor: 'pointer',
                        fontSize: 11, fontWeight: 800,
                        fontFamily: 'Manrope,sans-serif',
                      }}>🔗 Share</button>
                    <div style={{ flex: 1 }}/>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(tpl); }}
                      title="Delete this template"
                      style={{
                        padding: '5px 10px', borderRadius: 6,
                        background: 'rgba(220,38,38,0.06)',
                        border: '1px solid rgba(220,38,38,0.2)',
                        color: '#dc2626', cursor: 'pointer',
                        fontSize: 11, fontWeight: 800,
                        fontFamily: 'Manrope,sans-serif',
                      }}>🗑</button>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Toast — for save/import/delete confirmations */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 18px', borderRadius: 10,
            background: '#0f172a', color: '#fff',
            fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 13,
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            zIndex: 10001,
          }}>{toast}</div>
        )}

        {/* Confirm-overwrite dialog */}
        {confirmTpl && (
          <div
            onClick={() => setConfirmTpl(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(10, 18, 40, 0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '28px 32px',
                maxWidth: 440,
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 18,
                fontWeight: 900,
                color: '#0f172a',
                marginBottom: 8,
                letterSpacing: '-0.015em',
              }}>Replace current page?</div>
              <div style={{
                fontSize: 13,
                color: '#64748b',
                lineHeight: 1.6,
                marginBottom: 20,
              }}>
                Applying <strong style={{ color: '#0f172a' }}>{confirmTpl.name}</strong> will replace everything currently on the canvas. This can be undone with Ctrl+Z.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmTpl(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={confirmApply}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #0ea5e9, #a855f7)',
                    border: 'none',
                    color: '#fff',
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
                  }}
                >Apply template</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
