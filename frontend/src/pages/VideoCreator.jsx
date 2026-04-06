import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost, apiGet } from '../utils/api';
import { Film, Sparkles, Download, Clock, CheckCircle, AlertCircle, Loader2, Play, RefreshCw } from 'lucide-react';

var STYLES = [
  { value: 'professional', label: 'Professional' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'playful', label: 'Playful' },
];

var DURATIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 90, label: '90 seconds' },
  { value: 120, label: '2 minutes' },
];

export default function VideoCreator() {
  var [prompt, setPrompt] = useState('');
  var [style, setStyle] = useState('professional');
  var [duration, setDuration] = useState(60);
  var [aspect, setAspect] = useState('landscape');
  var [generating, setGenerating] = useState(false);
  var [jobId, setJobId] = useState(null);
  var [progress, setProgress] = useState(0);
  var [status, setStatus] = useState(null);
  var [steps, setSteps] = useState([]);
  var [videoUrl, setVideoUrl] = useState(null);
  var [error, setError] = useState(null);
  var [script, setScript] = useState(null);
  var pollRef = useRef(null);

  function generate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setProgress(0);
    setStatus('Generating script and assets...');
    setSteps([]);
    setScript(null);

    apiPost('/api/video-creator/generate', {
      prompt: prompt.trim(),
      aspect: aspect,
      duration: duration,
      style: style,
      music: true,
    }).then(function(r) {
      if (r.success && r.render_job_id) {
        setJobId(r.render_job_id);
        setSteps(r.steps || []);
        setScript(r.script || null);
        setStatus('Rendering video...');
        startPolling(r.render_job_id);
      } else if (r.success && !r.render_job_id) {
        setSteps(r.steps || []);
        setScript(r.script || null);
        setError('Pipeline completed but render failed to start. Steps: ' + JSON.stringify(r.steps || []));
        setGenerating(false);
      } else {
        setError(r.error || r.detail || JSON.stringify(r));
        setGenerating(false);
      }
    }).catch(function(e) {
      setError(e.message || 'Failed to generate video');
      setGenerating(false);
    });
  }

  function startPolling(jid) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      apiGet('/api/video-creator/status/' + jid).then(function(r) {
        if (r.progress !== undefined) setProgress(r.progress);
        if (r.status === 'completed') {
          clearInterval(pollRef.current);
          setStatus('Downloading video...');
          downloadVideo(jid);
        } else if (r.status === 'failed') {
          clearInterval(pollRef.current);
          setError('Render failed: ' + (r.error || 'Unknown error'));
          setGenerating(false);
        }
      }).catch(function() {});
    }, 3000);
  }

  function downloadVideo(jid) {
    apiGet('/api/video-creator/download/' + jid).then(function(r) {
      if (r.success && r.url) {
        setVideoUrl(r.url);
        setStatus('Complete!');
        setProgress(100);
        setGenerating(false);
      } else {
        setError(r.error || 'Failed to download video');
        setGenerating(false);
      }
    }).catch(function(e) {
      setError(e.message || 'Failed to download');
      setGenerating(false);
    });
  }

  useEffect(function() {
    return function() { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <AppLayout title="AI Video Creator" subtitle="One-click marketing videos">

      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={24} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800, color: '#0f172a' }}>AI Video Creator</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Describe your video and AI produces it — script, visuals, voiceover, music, and final MP4</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>

        {/* Left: Input */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px' }}>
          <label style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 8 }}>What's your video about?</label>
          <textarea value={prompt} onChange={function(e) { setPrompt(e.target.value); }}
            placeholder="e.g. Create a 60-second video promoting my online fitness coaching business. Highlight the benefits of personal training, show transformation results, and include a call to action to book a free consultation."
            rows={5}
            style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: '#0f172a' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Style</label>
              <select value={style} onChange={function(e) { setStyle(e.target.value); }}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc' }}>
                {STYLES.map(function(s) { return <option key={s.value} value={s.value}>{s.label}</option>; })}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Duration</label>
              <select value={duration} onChange={function(e) { setDuration(parseInt(e.target.value)); }}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc' }}>
                {DURATIONS.map(function(d) { return <option key={d.value} value={d.value}>{d.label}</option>; })}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Aspect ratio</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function() { setAspect('landscape'); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: aspect === 'landscape' ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: aspect === 'landscape' ? '#f3f0ff' : '#fff', color: '#0f172a', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                16:9 YouTube
              </button>
              <button onClick={function() { setAspect('portrait'); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: aspect === 'portrait' ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: aspect === 'portrait' ? '#f3f0ff' : '#fff', color: '#0f172a', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                9:16 TikTok / Reels
              </button>
            </div>
          </div>

          <button onClick={generate} disabled={generating || !prompt.trim()}
            style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 10, border: 'none', background: generating ? '#94a3b8' : '#8b5cf6', color: '#fff', fontSize: 16, fontWeight: 700, cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {generating ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={18} /> Generate video</>}
          </button>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

          {/* Cost estimate */}
          <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            Estimated cost: ~{Math.ceil(duration / 8)} credits ({Math.ceil(duration / 8) * 0.19 < 1 ? '< $1' : '~$' + (Math.ceil(duration / 8) * 0.19).toFixed(2)})
          </div>
        </div>

        {/* Right: Progress / Result */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px' }}>
          {!generating && !videoUrl && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Film size={48} color="#e2e8f0" />
              <div style={{ fontSize: 15, color: '#94a3b8', marginTop: 12 }}>Your video will appear here</div>
            </div>
          )}

          {/* Progress */}
          {generating && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{status}</div>
              <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, marginBottom: 16 }}>
                <div style={{ width: progress + '%', height: '100%', background: '#8b5cf6', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{progress}% complete</div>

              {steps.map(function(s, i) {
                var icon = s.status === 'ok' || s.status === 'queued' ? <CheckCircle size={14} color="#22c55e" /> : <Clock size={14} color="#94a3b8" />;
                return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  {icon} {s.step}: {s.status} {s.provider ? '(' + s.provider + ')' : ''}
                </div>;
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                <AlertCircle size={16} /> Error
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d' }}>{error}</div>
              <button onClick={function() { setError(null); setGenerating(false); }}
                style={{ marginTop: 10, padding: '6px 14px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          )}

          {/* Result */}
          {videoUrl && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={18} color="#22c55e" /> Video ready!
              </div>
              <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
                <video src={videoUrl} controls style={{ width: '100%', display: 'block' }} />
              </div>
              <a href={videoUrl} download target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
                <Download size={16} /> Download MP4
              </a>
              <button onClick={function() { setVideoUrl(null); setPrompt(''); setError(null); setJobId(null); setSteps([]); setScript(null); }}
                style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Create another video
              </button>
            </div>
          )}

          {/* Script preview */}
          {script && (
            <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Script: {script.title}</div>
              {(script.scenes || []).slice(0, 4).map(function(s, i) {
                return <div key={i} style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  <strong>Scene {s.scene_num}:</strong> {(s.narration || '').slice(0, 80)}...
                </div>;
              })}
              {(script.scenes || []).length > 4 && <div style={{ fontSize: 12, color: '#94a3b8' }}>+ {script.scenes.length - 4} more scenes</div>}
            </div>
          )}
        </div>
      </div>

    </AppLayout>
  );
}
