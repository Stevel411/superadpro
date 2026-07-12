import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Copy, Trash2, ArrowRight, FileText } from 'lucide-react';
import {
  listSandboxPages,
  createSandboxPage,
  deleteSandboxPage,
  duplicateSandboxPage,
} from './sandboxStore';
import './LabsChrome.css';

// ═══════════════════════════════════════════════════════════════
// Sandbox pages list
// ═══════════════════════════════════════════════════════════════
//
// Browse, create, duplicate, delete sandbox pages. All operations
// hit localStorage only — never the production funnels table.
// Admin-gated like everything under /labs.

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export default function LabsSandboxList() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);

  // Admin gate
  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  // Load sandbox pages on mount
  useEffect(() => {
    setPages(listSandboxPages());
  }, []);

  if (authLoading) return null;
  if (!user || !user.is_admin) return null;

  const handleNew = () => {
    const page = createSandboxPage('Untitled sandbox');
    if (page) {
      navigate(`/labs/pagebuilder/sandbox/edit/${page.id}`);
    } else {
      alert('Could not create sandbox page — localStorage might be full or disabled.');
    }
  };

  const handleDuplicate = (id) => {
    const copy = duplicateSandboxPage(id);
    if (copy) {
      setPages(listSandboxPages());
    }
  };

  const handleDelete = (page) => {
    if (!confirm(`Delete "${page.name}"? This can't be undone.`)) return;
    deleteSandboxPage(page.id);
    setPages(listSandboxPages());
  };

  return (
    <AppLayout
      title="🧪 LABS · Sandbox Pages"
      subtitle="Build, test, break things · None of this touches the live platform"
    >
      <div className="labs-chrome" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px 40px',
        fontFamily: "'Manrope', 'Inter', sans-serif",
      }}>
        {/* Hero */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          border: '1px solid rgba(200,16,46,0.14)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
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
              marginBottom: 8,
            }}>🧪 Sandbox · localStorage-only</div>
            <h2 style={{
              margin: 0,
              fontFamily: 'Sora, sans-serif',
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: '-0.025em',
              color: '#0f172a',
            }}>{pages.length} sandbox {pages.length === 1 ? 'page' : 'pages'}</h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#475569',
              fontWeight: 500,
              maxWidth: 580,
              lineHeight: 1.5,
            }}>
              Sandbox pages live in your browser's local storage. Edits never touch the live funnels database.
              When a page is ready, use Export to production inside the editor.
            </p>
          </div>
          <button
            onClick={handleNew}
            style={{
              padding: '12px 22px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #c8102e, #e8203f)',
              color: '#fff',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 900,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(200,16,46,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Plus size={15}/> New sandbox page
          </button>
        </div>

        {/* Quick links */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <Link to="/labs/pagebuilder/preview-templates" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 9,
            background: 'rgba(18,56,143,0.08)',
            border: '1px solid rgba(18,56,143,0.25)',
            color: '#c8102e',
            textDecoration: 'none',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 12,
            fontWeight: 800,
          }}>✨ Browse template portfolio</Link>
          <Link to="/labs/pagebuilder" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 9,
            background: '#fff',
            border: '1px solid rgba(15,23,42,0.08)',
            color: '#475569',
            textDecoration: 'none',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 12,
            fontWeight: 800,
          }}>← Labs home</Link>
        </div>

        {/* Sandbox list */}
        {pages.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '2px dashed rgba(200,16,46,0.25)',
            borderRadius: 14,
            padding: '60px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🪴</div>
            <h3 style={{
              margin: '0 0 6px',
              fontFamily: 'Sora, sans-serif',
              fontSize: 18,
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}>No sandbox pages yet</h3>
            <p style={{
              margin: '0 0 18px',
              fontSize: 13,
              color: '#64748b',
              fontWeight: 500,
              maxWidth: 420,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5,
            }}>
              Create your first sandbox page to start experimenting with the Labs builder.
              Apply templates, drag blocks, test responsive overrides — all without touching the live platform.
            </p>
            <button
              onClick={handleNew}
              style={{
                padding: '11px 22px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #c8102e, #e8203f)',
                color: '#fff',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 900,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(200,16,46,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={15}/> Create your first sandbox
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {pages.map(page => (
              <div key={page.id} style={{
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.06)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(200,16,46,0.25)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(200,16,46,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(15,23,42,0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                {/* Type icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(200,16,46,0.1), rgba(18,56,143,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: '#0284c7',
                }}>
                  <FileText size={18} strokeWidth={2.2}/>
                </div>

                {/* Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/labs/pagebuilder/sandbox/edit/${page.id}`}
                    style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#0f172a',
                      textDecoration: 'none',
                      letterSpacing: '-0.01em',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >{page.name}</Link>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                    {page.els ? page.els.length : 0} blocks · edited {formatDate(page.updated_at)}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleDuplicate(page.id)}
                  title="Duplicate"
                  style={{
                    width: 32, height: 32, borderRadius: 7,
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,16,46,0.08)'; e.currentTarget.style.color = '#0284c7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <Copy size={14}/>
                </button>
                <button
                  onClick={() => handleDelete(page)}
                  title="Delete"
                  style={{
                    width: 32, height: 32, borderRadius: 7,
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <Trash2 size={14}/>
                </button>
                <Link
                  to={`/labs/pagebuilder/sandbox/edit/${page.id}`}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #c8102e, #e8203f)',
                    color: '#fff',
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 800,
                    fontSize: 12,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  Open <ArrowRight size={12}/>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
