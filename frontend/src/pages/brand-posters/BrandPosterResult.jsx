import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import AppLayout from '../../components/layout/AppLayout';
import { ArrowLeft, Check, Download, Share2, RefreshCw, Clock } from 'lucide-react';

export default function BrandPosterResult() {
  var { generationId } = useParams();
  var [generation, setGeneration] = useState(null);
  var [candidates, setCandidates] = useState([]);
  var [selectedIndex, setSelectedIndex] = useState(null);
  var [loading, setLoading] = useState(true);
  var [choosing, setChoosing] = useState(false);
  var [justSaved, setJustSaved] = useState(false);
  var [error, setError] = useState('');
  // Track per-candidate image load failures so we can show a graceful
  // "expired — please regenerate" message instead of the browser's
  // broken-image icon. xAI URLs expire after 24-48h; once expired
  // the proxy endpoint returns 410 Gone and the <img> onError fires.
  var [failedIndexes, setFailedIndexes] = useState({});

  // Generation now runs asynchronously: the form POSTs and is redirected here
  // with status 'generating'; we poll this detail endpoint until the render
  // finishes ('ready') or fails ('failed'). See the async refactor in
  // bpg_generate / _bpg_run_generation.
  var [pollCount, setPollCount] = useState(0);

  function loadGeneration() {
    return apiGet('/api/posters/generation/' + generationId).then(function(res) {
      if (res && res.id) {
        setGeneration(res);
        setCandidates(res.candidates || []);
        if (res.chosen_index !== null && res.chosen_index !== undefined) {
          setSelectedIndex(res.chosen_index);
        }
        if (res.status === 'failed') {
          setError(res.error_message || 'Generation failed — please try again.');
        }
      } else {
        setError((res && res.detail) || 'Generation not found.');
      }
      setLoading(false);
    }).catch(function(e) {
      setError('Could not load generation.');
      setLoading(false);
    });
  }

  useEffect(function() {
    loadGeneration();
  }, [generationId]);

  // Poll while the render is still in progress. Stops automatically once the
  // status is terminal (candidates arrive, or 'failed' sets error). The cap
  // (~6 min) is a safety net; the backend self-heals a stuck row to 'failed'
  // at 5 min, so the poll will receive that and stop well before the cap.
  useEffect(function() {
    if (!generation) return undefined;
    var st = generation.status;
    if ((st === 'generating' || st === 'pending') && pollCount < 120) {
      var t = setTimeout(function() {
        setPollCount(function(c) { return c + 1; });
        loadGeneration();
      }, 3000);
      return function() { clearTimeout(t); };
    }
    return undefined;
  }, [generation, pollCount]);

  async function handleChoose() {
    if (selectedIndex === null) return;
    setChoosing(true);
    try {
      var res = await apiPost('/api/posters/generation/' + generationId + '/choose', {
        chosen_index: selectedIndex,
      });
      if (res && res.success) {
        // Soft-refresh the generation data so the chosen state shows,
        // and surface a toast pointing the member at their poster
        // history. Avoid window.location.reload() — it wipes toast
        // state instantly and feels jarring after a slow generation.
        setJustSaved(true);
        await loadGeneration();
      } else {
        setError((res && res.detail) || 'Could not save selection.');
      }
    } catch (exc) {
      setError('Save failed: ' + exc.message);
    } finally {
      setChoosing(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Loading your posters…">
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
          Loading…
        </div>
      </AppLayout>
    );
  }

  // Render still in progress — show progress and keep polling (the effect above
  // re-checks every 3s). Generation runs server-side, so leaving this page does
  // not cancel it; the finished set lands in History either way.
  var genStatus = generation && generation.status;
  if ((genStatus === 'generating' || genStatus === 'pending') && !error) {
    return (
      <AppLayout title="Creating your posters…" subtitle="This usually takes 45–60 seconds">
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
          <Clock size={28} style={{ marginBottom: 16, opacity: 0.7 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sap-text)' }}>
            Generating 4 candidate posters…
          </div>
          <div style={{ fontSize: 13, marginTop: 10, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Hang tight — this takes around a minute. You can safely leave this page;
            your finished posters will be waiting in your History.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Your generated posters" subtitle="Pick your favourite from the 4 candidates">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>

        {/* Secondary nav: back to gallery OR jump to your saved posters.
            "My posters" exposes the history page that was previously
            only reachable from the gallery card. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          <Link to="/brand-posters" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--sap-text-muted)',
            textDecoration: 'none',
            fontSize: 14,
          }}>
            <ArrowLeft size={14} /> All templates
          </Link>

          <Link to="/brand-posters/history" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--sap-accent)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}>
            <Clock size={14} /> My posters
          </Link>
        </div>

        {/* Save-success toast — appears after Save my choice completes.
            Persistent (not auto-dismissed) so the link remains tappable. */}
        {justSaved && (
          <div style={{
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#fff',
            padding: '14px 18px',
            borderRadius: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            boxShadow: '0 4px 12px rgba(22,163,74,.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Check size={20} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Saved.</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>This poster is now in your library — download anytime.</div>
              </div>
            </div>
            <Link to="/brand-posters/history" style={{
              background: 'rgba(255,255,255,.18)',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              View in My Posters <Clock size={13} />
            </Link>
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
          }}>{error}</div>
        )}

        {candidates.length === 0 && !loading && !error && (
          <div style={{
            textAlign: 'center',
            padding: 40,
            background: 'var(--sap-card-bg)',
            border: '1px solid var(--sap-border)',
            borderRadius: 12,
            color: 'var(--sap-text-muted)',
          }}>
            <div style={{ marginBottom: 16 }}>
              Candidates are loading. If this takes more than a minute, try refreshing.
            </div>
            <button onClick={function() { window.location.reload(); }} style={{
              background: 'var(--sap-accent)',
              color: 'white',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <RefreshCw size={14} /> Reload
            </button>
          </div>
        )}

        {candidates.length > 0 && (
          <>
            {/* If every candidate failed to load, show an explanatory
                banner above the grid with a direct link to regenerate. */}
            {Object.keys(failedIndexes).length === candidates.length && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '1px solid #f59e0b',
                color: '#78350f',
                padding: 16,
                borderRadius: 10,
                marginBottom: 20,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <Clock size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>This poster set has expired</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
                    AI-generated poster candidates are kept for 24–48 hours. After that, you'll need to generate a fresh set. Your saved final poster (if you chose one) is unaffected and lives permanently in your library.
                  </div>
                  {generation && generation.template_slug && (
                    <Link
                      to={'/brand-posters/' + generation.template_slug}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#f59e0b',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <RefreshCw size={14} /> Regenerate this poster
                    </Link>
                  )}
                </div>
              </div>
            )}
            {/* 2x2 grid of candidates */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}>
              {candidates.map(function(url, idx) {
                var selected = selectedIndex === idx;
                var isFailed = !!failedIndexes[idx];
                return (
                  <div
                    key={idx}
                    onClick={function() {
                      // Don't allow selecting an expired candidate
                      if (isFailed) return;
                      setSelectedIndex(idx);
                    }}
                    style={{
                      position: 'relative',
                      borderRadius: 14,
                      overflow: 'hidden',
                      cursor: isFailed ? 'not-allowed' : 'pointer',
                      border: selected ? '3px solid var(--sap-accent)' : '3px solid transparent',
                      transition: 'all 0.15s',
                      aspectRatio: '3/4',
                      background: '#1e293b',
                      opacity: isFailed ? 0.6 : 1,
                    }}>
                    {isFailed ? (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 20,
                        color: '#cbd5e1',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}>
                        <Clock size={32} style={{ marginBottom: 12, opacity: 0.7 }} />
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>This image expired</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          AI poster previews are available for 24–48 hours. Please regenerate this poster set to see candidates.
                        </div>
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={'Candidate ' + (idx + 1)}
                        onError={function() {
                          setFailedIndexes(function(prev) {
                            var next = Object.assign({}, prev);
                            next[idx] = true;
                            return next;
                          });
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )}
                    {selected && (
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'var(--sap-accent)',
                        color: 'white',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Check size={18} />
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      Option {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleChoose}
                disabled={selectedIndex === null || choosing}
                style={{
                  background: selectedIndex !== null
                    ? 'linear-gradient(135deg, var(--sap-accent), var(--sap-accent-light))'
                    : '#94a3b8',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: selectedIndex !== null ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: choosing ? 0.7 : 1,
                }}>
                <Check size={16} />
                {choosing ? 'Saving…' : 'Save my choice'}
              </button>

              {selectedIndex !== null && (
                <a
                  href={'/api/posters/generation/' + generationId + '/download?index=' + selectedIndex}
                  style={{
                    background: 'var(--sap-card-bg)',
                    color: 'var(--sap-text-primary)',
                    border: '1px solid var(--sap-border)',
                    padding: '14px 24px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                  <Download size={16} /> Download
                </a>
              )}
            </div>

            <div style={{
              marginTop: 24,
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--sap-text-muted)',
              lineHeight: 1.6,
            }}>
              Not quite right? <Link to="/brand-posters" style={{ color: 'var(--sap-accent)' }}>Try another template</Link> or
              {' '}<Link to="#" onClick={function(e){ e.preventDefault(); window.history.back(); }} style={{ color: 'var(--sap-accent)' }}>tweak inputs and regenerate</Link>.
              <br/>
              Looking for something you made before? <Link to="/brand-posters/history" style={{ color: 'var(--sap-accent)', fontWeight: 600 }}>View all my posters</Link>.
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
