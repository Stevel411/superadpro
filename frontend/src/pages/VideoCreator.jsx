import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost, apiGet } from '../utils/api';
import { Film, Sparkles, Download, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Upload, X, Mic, ImagePlus, ChevronDown, Layers, Timer } from 'lucide-react';

var STYLES = [
  { value: 'professional', label: 'Professional', desc: 'Clean, polished, business-ready', color: '#6366f1' },
  { value: 'energetic', label: 'Energetic', desc: 'Fast-paced, dynamic, high-energy', color: '#f97316' },
  { value: 'cinematic', label: 'Cinematic', desc: 'Dramatic, filmic, storytelling', color: '#0ea5e9' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple, clean, understated', color: '#64748b' },
  { value: 'playful', label: 'Playful', desc: 'Fun, colourful, lighthearted', color: '#ec4899' },
];

var DURATIONS = [
  { value: 30, label: '30 seconds', desc: '~4 scenes, ~4 credits', color: '#0ea5e9' },
  { value: 60, label: '1 minute', desc: '~8 scenes, ~8 credits', color: '#0ea5e9' },
  { value: 90, label: '90 seconds', desc: '~11 scenes, ~11 credits', color: '#0ea5e9' },
  { value: 120, label: '2 minutes', desc: '~15 scenes, ~15 credits', color: '#0ea5e9' },
];

var VOICES = [
  { value: 'en-GB-SoniaNeural', label: 'Sonia', desc: 'British female — warm, professional', color: '#7c3aed', tag: 'DEFAULT', tagColor: '#7c3aed' },
  { value: 'en-GB-RyanNeural', label: 'Ryan', desc: 'British male — confident, authoritative', color: '#2563eb', tag: 'POPULAR', tagColor: '#0ea5e9' },
  { value: 'en-US-JennyNeural', label: 'Jenny', desc: 'American female — friendly, conversational', color: '#ec4899' },
  { value: 'en-US-GuyNeural', label: 'Guy', desc: 'American male — smooth, versatile', color: '#059669' },
  { value: 'en-US-AriaNeural', label: 'Aria', desc: 'American female — expressive, narration', color: '#dc2626', tag: 'NARRATOR', tagColor: '#059669' },
  { value: 'en-US-DavisNeural', label: 'Davis', desc: 'American male — deep, energetic', color: '#f97316', tag: 'ENERGETIC', tagColor: '#ca8a04' },
  { value: 'en-US-JaneNeural', label: 'Jane', desc: 'American female — clear, polished', color: '#8b5cf6' },
  { value: 'en-US-JasonNeural', label: 'Jason', desc: 'American male — natural, engaging', color: '#0284c7' },
  { value: 'en-AU-NatashaNeural', label: 'Natasha', desc: 'Australian female — bright, upbeat', color: '#ea580c' },
  { value: 'en-AU-WilliamNeural', label: 'William', desc: 'Australian male — warm, relaxed', color: '#16a34a' },
  { value: 'en-IN-NeerjaNeural', label: 'Neerja', desc: 'Indian female — articulate, clear', color: '#d946ef' },
  { value: 'en-IN-PrabhatNeural', label: 'Prabhat', desc: 'Indian male — measured, professional', color: '#0891b2' },
  { value: 'en-ZA-LeahNeural', label: 'Leah', desc: 'South African female — distinctive', color: '#e11d48' },
  { value: 'en-IE-EmilyNeural', label: 'Emily', desc: 'Irish female — soft, melodic', color: '#4f46e5' },
  { value: 'en-CA-ClaraNeural', label: 'Clara', desc: 'Canadian female — neutral, crisp', color: '#0d9488' },
];

function DropdownSelector({ label, icon, items, value, onChange, initialCount }) {
  var [open, setOpen] = useState(false);
  var [showAll, setShowAll] = useState(false);
  var ref = useRef(null);
  var selected = items.find(function(item) { return item.value === value; }) || items[0];
  var visibleItems = initialCount && !showAll ? items.slice(0, initialCount) : items;
  var hasMore = initialCount && items.length > initialCount && !showAll;

  useEffect(function() {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowAll(false); } }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 14 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>{label}</label>}
      <div onClick={function() { setOpen(!open); }}
        style={{ background: '#fff', border: '1px solid ' + (open ? '#8b5cf6' : '#e2e8f0'), borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, ' + (selected.color || '#6366f1') + ', ' + (selected.color || '#6366f1') + 'cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon === 'mic' && <Mic size={15} color="#fff" />}
            {icon === 'layers' && <Layers size={15} color="#fff" />}
            {icon === 'timer' && <Timer size={15} color="#fff" />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{selected.label}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{selected.desc}</div>
          </div>
        </div>
        <ChevronDown size={16} color="#94a3b8" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {visibleItems.map(function(item) {
              var isSelected = item.value === value;
              return (
                <div key={item.value}
                  onClick={function() { onChange(item.value); setOpen(false); setShowAll(false); }}
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: isSelected ? 'rgba(139,92,246,0.04)' : 'transparent', borderLeft: isSelected ? '3px solid #8b5cf6' : '3px solid transparent', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, ' + (item.color || '#6366f1') + ', ' + (item.color || '#6366f1') + 'cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon === 'mic' && <Mic size={14} color="#fff" />}
                      {icon === 'layers' && <Layers size={14} color="#fff" />}
                      {icon === 'timer' && <Timer size={14} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.desc}</div>
                    </div>
                  </div>
                  {item.tag && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: (item.tagColor || item.color) + '18', color: item.tagColor || item.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{item.tag}</span>}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div onClick={function(e) { e.stopPropagation(); setShowAll(true); }}
              style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
              <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>Show {items.length - initialCount} more voices</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoCreator() {
  var [prompt, setPrompt] = useState('');
  var [style, setStyle] = useState('professional');
  var [duration, setDuration] = useState(60);
  var [aspect, setAspect] = useState('landscape');
  var [voice, setVoice] = useState('en-GB-SoniaNeural');
  var [videoMode, setVideoMode] = useState('images');
  var [generating, setGenerating] = useState(false);
  var [jobId, setJobId] = useState(null);
  var [progress, setProgress] = useState(0);
  var [status, setStatus] = useState(null);
  var [steps, setSteps] = useState([]);
  var [videoUrl, setVideoUrl] = useState(null);
  var [error, setError] = useState(null);
  var [script, setScript] = useState(null);
  var [uploadedImages, setUploadedImages] = useState([]);
  var [uploading, setUploading] = useState(false);
  var pollRef = useRef(null);
  var fileInputRef = useRef(null);

  function handleImageUpload(e) {
    var files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    var promises = files.map(function(file) {
      var formData = new FormData();
      formData.append('file', file);
      return fetch('/api/upload-image', { method: 'POST', credentials: 'include', body: formData })
        .then(function(r) { return r.json(); })
        .then(function(data) { if (data.url) return { url: data.url, name: file.name }; return null; })
        .catch(function() { return null; });
    });
    Promise.all(promises).then(function(results) {
      var valid = results.filter(function(r) { return r !== null; });
      setUploadedImages(function(prev) { return prev.concat(valid); });
      setUploading(false);
    });
  }

  function removeImage(index) {
    setUploadedImages(function(prev) { return prev.filter(function(_, i) { return i !== index; }); });
  }

  function generate() {
    if (!prompt.trim()) return;
    setGenerating(true); setError(null); setVideoUrl(null); setProgress(0);
    setStatus('Generating script and assets...'); setSteps([]); setScript(null);
    apiPost('/api/video-creator/generate', {
      prompt: prompt.trim(), aspect: aspect, duration: duration, style: style, voice: voice, music: true,
      video_mode: videoMode,
      uploaded_images: uploadedImages.map(function(img) { return img.url; }),
    }).then(function(r) {
      if (r.success && r.render_job_id) {
        setJobId(r.render_job_id); setSteps(r.steps || []); setScript(r.script || null);
        setStatus('Rendering video...'); startPolling(r.render_job_id);
      } else if (r.success && !r.render_job_id) {
        setSteps(r.steps || []); setScript(r.script || null);
        setError('Pipeline completed but render failed to start. Steps: ' + JSON.stringify(r.steps || [])); setGenerating(false);
      } else { setError(r.error || r.detail || JSON.stringify(r)); setGenerating(false); }
    }).catch(function(e) { setError(e.message || 'Failed to generate video'); setGenerating(false); });
  }

  function startPolling(jid) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      apiGet('/api/video-creator/status/' + jid).then(function(r) {
        if (r.progress !== undefined) setProgress(r.progress);
        if (r.status === 'completed') { clearInterval(pollRef.current); setStatus('Downloading video...'); downloadVideo(jid); }
        else if (r.status === 'failed') { clearInterval(pollRef.current); setError('Render failed: ' + (r.error || 'Unknown error')); setGenerating(false); }
      }).catch(function() {});
    }, 3000);
  }

  function downloadVideo(jid) {
    apiGet('/api/video-creator/download/' + jid).then(function(r) {
      if (r.success && r.url) { setVideoUrl(r.url); setStatus('Complete!'); setProgress(100); setGenerating(false); }
      else { setError(r.error || 'Failed to download video'); setGenerating(false); }
    }).catch(function(e) { setError(e.message || 'Failed to download'); setGenerating(false); });
  }

  useEffect(function() { return function() { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  return (
    <AppLayout title="AI Video Creator" subtitle="One-click marketing videos">
      <div style={{ background: 'linear-gradient(135deg, #0c1222, #1c223d, #2d3561)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={24} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800, color: '#fff' }}>Turn any idea into a marketing video</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Just describe what you want — AI handles the script, visuals, voiceover, and final MP4 in minutes</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>What's your video about?</label>
          <textarea value={prompt} onChange={function(e) { setPrompt(e.target.value); }}
            placeholder="e.g. Create a 60-second video promoting my online fitness coaching business..."
            rows={4} style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: '#0f172a' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
            <DropdownSelector label="Style" icon="layers" items={STYLES} value={style} onChange={setStyle} />
            <DropdownSelector label="Duration" icon="timer" items={DURATIONS} value={duration} onChange={setDuration} />
          </div>

          <DropdownSelector label="Voiceover" icon="mic" items={VOICES} value={voice} onChange={setVoice} initialCount={6} />

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>Aspect ratio</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['landscape','16:9 YouTube','Widescreen for YouTube, websites'],['portrait','9:16 TikTok / Reels','Vertical for TikTok, Reels, Shorts']].map(function(a) {
                var active = aspect === a[0];
                return <div key={a[0]} onClick={function(){setAspect(a[0]);}}
                  style={{ flex:1, padding:'14px 16px', borderRadius:12, cursor:'pointer',
                    background: active ? 'linear-gradient(135deg, #1e3a5f, #2563eb, #60a5fa)' : 'linear-gradient(135deg, #1e3a5f55, #2563eb44, #60a5fa33)',
                    border: active ? '2px solid #60a5fa' : '2px solid transparent',
                    boxShadow: active ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.2s' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{a[1]}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{a[2]}</div>
                </div>;
              })}
            </div>
          </div>

          {/* Video mode */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>Video mode</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Motion Video - LEFT */}
              <div onClick={function(){setVideoMode('motion');}}
                style={{ flex: 1, padding: '16px 16px 14px', borderRadius: 12, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  background: videoMode === 'motion' ? 'linear-gradient(135deg, #1e3a5f, #2563eb, #60a5fa)' : 'linear-gradient(135deg, #1e3a5f55, #2563eb44, #60a5fa33)',
                  border: videoMode === 'motion' ? '2px solid #60a5fa' : '2px solid transparent',
                  boxShadow: videoMode === 'motion' ? '0 4px 15px rgba(37,99,235,0.3)' : 'none',
                  transition: 'all 0.2s' }}>
                <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', letterSpacing: '0.04em' }}>PRO</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Motion Video</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>AI-generated video clips with real cinematic movement</div>
                <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, marginTop: 8 }}>~{Math.ceil(duration / 8) * 3} credits</div>
              </div>
              {/* Standard - RIGHT */}
              <div onClick={function(){setVideoMode('images');}}
                style={{ flex: 1, padding: '16px 16px 14px', borderRadius: 12, cursor: 'pointer',
                  background: videoMode === 'images' ? 'linear-gradient(135deg, #1e3a5f, #2563eb, #60a5fa)' : 'linear-gradient(135deg, #1e3a5f55, #2563eb44, #60a5fa33)',
                  border: videoMode === 'images' ? '2px solid #60a5fa' : '2px solid transparent',
                  boxShadow: videoMode === 'images' ? '0 4px 15px rgba(37,99,235,0.3)' : 'none',
                  transition: 'all 0.2s' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Standard</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>AI images with smooth Ken Burns motion effects</div>
                <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, marginTop: 8 }}>~{Math.ceil(duration / 8)} credits</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <ImagePlus size={13} /> Your images <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Upload your own images instead of AI-generated ones</div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
            <div onClick={function() { if (!uploading) fileInputRef.current.click(); }}
              style={{ border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '18px 20px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: '#fafbfc' }}>
              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Loader2 size={16} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Uploading...</span>
                </div>
              ) : (
                <div><Upload size={22} color="#94a3b8" style={{ marginBottom: 4 }} /><div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Click to upload images</div><div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>JPG, PNG, WebP — max 10MB each</div></div>
              )}
            </div>
            {uploadedImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {uploadedImages.map(function(img, i) {
                  return <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={function() { removeImage(i); }} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={10} /></button>
                  </div>;
                })}
              </div>
            )}
          </div>

          <button onClick={generate} disabled={generating || !prompt.trim()}
            style={{ width: '100%', marginTop: 6, padding: '14px', borderRadius: 10, border: 'none', background: generating ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: generating ? 'none' : '0 2px 8px rgba(139,92,246,0.3)' }}>
            {generating ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={18} /> Generate video</>}
          </button>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          <div style={{ marginTop: 10, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            Estimated cost: ~{videoMode === 'motion' ? Math.ceil(duration / 8) * 3 : Math.ceil(duration / 8)} credits ({(videoMode === 'motion' ? Math.ceil(duration / 8) * 3 : Math.ceil(duration / 8)) * 0.19 < 1 ? '< $1' : '~$' + ((videoMode === 'motion' ? Math.ceil(duration / 8) * 3 : Math.ceil(duration / 8)) * 0.19).toFixed(2)})
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px' }}>
          {!generating && !videoUrl && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><Film size={48} color="#e2e8f0" /><div style={{ fontSize: 15, color: '#94a3b8', marginTop: 12 }}>Your video will appear here</div></div>
          )}
          {generating && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{status}</div>
              <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, marginBottom: 16 }}><div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 4, transition: 'width 0.5s' }} /></div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{progress}% complete</div>
              {steps.map(function(s, i) {
                var ic = s.status === 'ok' || s.status === 'queued' ? <CheckCircle size={14} color="#22c55e" /> : <Clock size={14} color="#94a3b8" />;
                var stepLabels = { script: 'Writing script', images: 'Generating visuals', voiceover: 'Recording voiceover', render: 'Composing video', video_clips: 'Creating motion clips' };
                var statusLabels = { ok: 'Done', queued: 'In progress', failed: 'Failed' };
                var stepLabel = stepLabels[s.step] || s.step;
                var statusLabel = statusLabels[s.status] || s.status;
                if (s.step === 'images' && s.generated !== undefined) statusLabel = s.generated + '/' + s.total + ' done';
                return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 4 }}>{ic} {stepLabel}: {statusLabel}</div>;
              })}
            </div>
          )}
          {error && (
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 14, fontWeight: 600, marginBottom: 4 }}><AlertCircle size={16} /> Error</div>
              <div style={{ fontSize: 13, color: '#7f1d1d', wordBreak: 'break-word' }}>{error}</div>
              <button onClick={function() { setError(null); setGenerating(false); }} style={{ marginTop: 10, padding: '6px 14px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> Try again</button>
            </div>
          )}
          {videoUrl && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={18} color="#22c55e" /> Video ready!</div>
              <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 16 }}><video src={videoUrl} controls style={{ width: '100%', display: 'block' }} /></div>
              <a href={videoUrl} download target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}><Download size={16} /> Download MP4</a>
              <button onClick={function() { setVideoUrl(null); setPrompt(''); setError(null); setJobId(null); setSteps([]); setScript(null); setUploadedImages([]); }} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Create another video</button>
            </div>
          )}
          {script && (
            <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Script: {script.title}</div>
              {(script.scenes || []).slice(0, 4).map(function(s, i) { return <div key={i} style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}><strong>Scene {s.scene_num}:</strong> {(s.narration || '').slice(0, 80)}...</div>; })}
              {(script.scenes || []).length > 4 && <div style={{ fontSize: 12, color: '#94a3b8' }}>+ {script.scenes.length - 4} more scenes</div>}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
