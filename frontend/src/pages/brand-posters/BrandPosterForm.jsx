import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import AppLayout from '../../components/layout/AppLayout';
import { ArrowLeft, Sparkles, Upload, Image as ImageIcon, Loader } from 'lucide-react';

export default function BrandPosterForm() {
  var { slug } = useParams();
  var navigate = useNavigate();

  var [template, setTemplate] = useState(null);
  var [hasAccess, setHasAccess] = useState(false);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [inputs, setInputs] = useState({});
  var [referencePhotoUrl, setReferencePhotoUrl] = useState('');
  var [photoUploading, setPhotoUploading] = useState(false);
  var [generating, setGenerating] = useState(false);

  // Fetch template details
  useEffect(function() {
    apiGet('/api/posters/template/' + slug).then(function(res) {
      if (res && res.template) {
        setTemplate(res.template);
        setHasAccess(!!res.has_access);
        // Initialise inputs with defaults
        var initial = {};
        res.template.input_fields.forEach(function(f) {
          initial[f.key] = f.default || '';
        });
        setInputs(initial);
      } else {
        setError('Template not found.');
      }
      setLoading(false);
    }).catch(function() {
      setError('Network error.');
      setLoading(false);
    });
  }, [slug]);

  function updateInput(key, value) {
    setInputs(function(prev) {
      var copy = Object.assign({}, prev);
      copy[key] = value;
      return copy;
    });
  }

  async function handlePhotoUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10MB.');
      return;
    }
    setPhotoUploading(true);
    setError('');
    try {
      var formData = new FormData();
      formData.append('file', file);
      var resp = await fetch('/api/upload/reference-photo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      var data = await resp.json();
      if (data && data.url) {
        setReferencePhotoUrl(data.url);
      } else {
        setError(data.error || 'Photo upload failed.');
      }
    } catch (exc) {
      setError('Photo upload failed: ' + exc.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleGenerate() {
    if (!hasAccess) {
      navigate('/credit-matrix');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      var res = await apiPost('/api/posters/generate', {
        template_slug: slug,
        inputs: inputs,
        reference_photo_url: referencePhotoUrl || null,
      });
      if (res && res.success && res.generation_id) {
        navigate('/brand-posters/result/' + res.generation_id);
      } else {
        setError((res && res.detail) || (res && res.error) || 'Generation failed.');
        setGenerating(false);
      }
    } catch (exc) {
      setError('Generation failed: ' + exc.message);
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Loading template…">
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
          Loading…
        </div>
      </AppLayout>
    );
  }

  if (!template) {
    return (
      <AppLayout title="Template not found">
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ marginBottom: 16, color: 'var(--sap-text-muted)' }}>{error || 'Template not found.'}</div>
          <Link to="/brand-posters" style={{ color: 'var(--sap-accent)' }}>← Back to gallery</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={template.name} subtitle={template.description}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        <Link to="/brand-posters" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--sap-text-muted)',
          textDecoration: 'none',
          fontSize: 14,
          marginBottom: 20,
        }}>
          <ArrowLeft size={14} /> All templates
        </Link>

        {/* No-access banner */}
        {!hasAccess && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            color: '#92400e',
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            <strong>Preview mode.</strong> Activate any Credit Nexus pack to actually generate this poster.
          </div>
        )}

        {/* Input fields card */}
        <div style={{
          background: 'var(--sap-card-bg)',
          border: '1px solid var(--sap-border)',
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Customise your poster</div>
          <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginBottom: 12 }}>
            Fill in the text below. The defaults work well — tweak only if you want something specific.
          </div>
          {/* Tight one-liner reassuring members their referral link is handled
              automatically. Surfaces the viral-loop story without bloat. */}
          <div style={{
            fontSize: 12,
            color: 'var(--sap-accent)',
            marginBottom: 20,
            padding: '8px 12px',
            background: 'rgba(14, 165, 233, 0.08)',
            borderRadius: 8,
            borderLeft: '3px solid var(--sap-accent)',
          }}>
            🔗 <strong>Your referral link is automatically baked into every poster</strong> — no setup needed.
          </div>

          {template.input_fields.map(function(field) {
            return (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: 'var(--sap-text-primary)',
                }}>
                  {field.label}
                  {field.max_len && (
                    <span style={{ float: 'right', fontWeight: 400, color: 'var(--sap-text-muted)', fontSize: 12 }}>
                      {(inputs[field.key] || '').length}/{field.max_len}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={inputs[field.key] || ''}
                  onChange={function(e) { updateInput(field.key, e.target.value); }}
                  maxLength={field.max_len || 200}
                  placeholder={field.default || ''}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 14,
                    borderRadius: 8,
                    border: '1px solid var(--sap-border)',
                    background: 'var(--sap-input-bg, #f8fafc)',
                    color: 'var(--sap-text-primary)',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                {field.help && (
                  <div style={{ fontSize: 12, color: 'var(--sap-text-muted)', marginTop: 4 }}>
                    {field.help}
                  </div>
                )}
              </div>
            );
          })}

          {/* Reference photo (optional) */}
          {template.supports_photo && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--sap-border)' }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}>
                Reference photo (optional)
              </label>
              <div style={{ fontSize: 12, color: 'var(--sap-text-muted)', marginBottom: 12 }}>
                Upload a clear photo of yourself to feature as the subject. Square or portrait works best.
              </div>

              {referencePhotoUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img src={referencePhotoUrl} alt="Reference" style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 10,
                    border: '1px solid var(--sap-border)',
                  }}/>
                  <button onClick={function() { setReferencePhotoUrl(''); }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--sap-border)',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}>
                    Remove photo
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  border: '1px dashed var(--sap-border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--sap-text-primary)',
                }}>
                  <Upload size={16} />
                  {photoUploading ? 'Uploading…' : 'Upload photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload}
                    style={{ display: 'none' }} disabled={photoUploading} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: 14,
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 14,
          }}>{error}</div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || photoUploading}
          style={{
            width: '100%',
            background: hasAccess
              ? 'linear-gradient(135deg, var(--sap-accent) 0%, var(--sap-accent-light) 100%)'
              : '#94a3b8',
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: generating ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: generating ? 0.7 : 1,
          }}>
          {generating ? (
            <>
              <Loader size={18} className="spin" />
              Generating 4 candidates… (45-60 seconds)
            </>
          ) : hasAccess ? (
            <>
              <Sparkles size={18} />
              Generate poster
            </>
          ) : (
            <>Activate a Nexus pack to unlock →</>
          )}
        </button>

        <div style={{
          marginTop: 14,
          fontSize: 12,
          color: 'var(--sap-text-muted)',
          textAlign: 'center',
        }}>
          You'll get 4 candidate posters to pick from. Generation takes about a minute.
        </div>
      </div>

      <style>{'@keyframes _spin{to{transform:rotate(360deg)}}.spin{animation:_spin 0.8s linear infinite}'}</style>
    </AppLayout>
  );
}
