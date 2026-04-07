import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost, apiGet } from '../utils/api';
import { Film, Sparkles, Download, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Upload, X, Mic, ImagePlus, ChevronDown, Layers, Timer, HelpCircle, Monitor } from 'lucide-react';

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

var ASPECTS = [
  { value: 'landscape', label: '16:9', desc: 'YouTube, websites', color: '#64748b' },
  { value: 'portrait', label: '9:16', desc: 'TikTok, Reels, Shorts', color: '#64748b' },
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

/* ── Compact dropdown (white card style, for use on dark bg) ── */
function CompactDropdown({ label, icon, iconColor, items, value, onChange, initialCount, openUp }) {
  var [open, setOpen] = useState(false);
  var [showAll, setShowAll] = useState(false);
  var [hovered, setHovered] = useState(false);
  var ref = useRef(null);
  var selected = items.find(function(it) { return it.value === value; }) || items[0];
  var visible = initialCount && !showAll ? items.slice(0, initialCount) : items;
  var hasMore = initialCount && items.length > initialCount && !showAll;

  useEffect(function() {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowAll(false); } }
    document.addEventListener('mousedown', h);
    return function() { document.removeEventListener('mousedown', h); };
  }, []);

  var isActive = open || hovered;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={function() { setOpen(!open); }}
        onMouseEnter={function() { setHovered(true); }}
        onMouseLeave={function() { setHovered(false); }}
        style={{ background: isActive ? '#ede9fe' : '#fff', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: '2px solid ' + (isActive ? '#8b5cf6' : 'transparent'), transition: 'all 0.15s ease', transform: hovered && !open ? 'translateY(-2px)' : 'none', boxShadow: hovered && !open ? '0 8px 24px rgba(0,0,0,0.2)' : 'none' }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: selected.color || iconColor || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon === 'layers' && <Layers size={14} color="#fff" />}
            {icon === 'timer' && <Timer size={14} color="#fff" />}
            {icon === 'mic' && <Mic size={14} color="#fff" />}
            {icon === 'aspect' && (
              selected.value === 'portrait'
                ? <svg width="10" height="14" viewBox="0 0 14 22" fill="none"><rect x="1" y="1" width="12" height="20" rx="2" stroke="#fff" strokeWidth="1.5"/></svg>
                : <svg width="14" height="10" viewBox="0 0 22 14" fill="none"><rect x="1" y="1" width="20" height="12" rx="2" stroke="#fff" strokeWidth="1.5"/></svg>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selected.label}</div>
          <ChevronDown size={14} color="#94a3b8" style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>
      {open && (
        <div style={{ position: 'absolute', ...(openUp ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }), left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {visible.map(function(item) {
              var isSel = item.value === value;
              return (
                <div key={item.value} onClick={function() { onChange(item.value); setOpen(false); setShowAll(false); }}
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                    background: isSel ? 'rgba(139,92,246,0.04)' : 'transparent', borderLeft: isSel ? '3px solid #8b5cf6' : '3px solid transparent', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: 'linear-gradient(135deg, ' + (item.color || '#6366f1') + ', ' + (item.color || '#6366f1') + 'cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon === 'layers' && <Layers size={14} color="#fff" />}
                      {icon === 'timer' && <Timer size={14} color="#fff" />}
                      {icon === 'mic' && <Mic size={14} color="#fff" />}
                      {icon === 'aspect' && (
                        item.value === 'portrait'
                          ? <svg width="8" height="12" viewBox="0 0 14 22" fill="none"><rect x="1" y="1" width="12" height="20" rx="2" stroke="#fff" strokeWidth="1.5"/></svg>
                          : <svg width="12" height="8" viewBox="0 0 22 14" fill="none"><rect x="1" y="1" width="20" height="12" rx="2" stroke="#fff" strokeWidth="1.5"/></svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.label}</div>
                      {item.desc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</div>}
                    </div>
                  </div>
                  {item.tag && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: (item.tagColor || item.color) + '18', color: item.tagColor || item.color, whiteSpace: 'nowrap' }}>{item.tag}</span>}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div onClick={function(e) { e.stopPropagation(); setShowAll(true); }}
              style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
              <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>Show {items.length - initialCount} more</span>
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
      var fd = new FormData(); fd.append('file', file);
      return fetch('/api/upload-image', { method: 'POST', credentials: 'include', body: fd })
        .then(function(r) { return r.json(); }).then(function(d) { return d.url ? { url: d.url, name: file.name } : null; }).catch(function() { return null; });
    });
    Promise.all(promises).then(function(r) { setUploadedImages(function(p) { return p.concat(r.filter(Boolean)); }); setUploading(false); });
  }
  function removeImage(i) { setUploadedImages(function(p) { return p.filter(function(_, idx) { return idx !== i; }); }); }

  function generate() {
    if (!prompt.trim()) return;
    setGenerating(true); setError(null); setVideoUrl(null); setProgress(0);
    setStatus('Generating script and assets...'); setSteps([]); setScript(null);
    apiPost('/api/video-creator/generate', {
      prompt: prompt.trim(), aspect: aspect, duration: duration, style: style, voice: voice, music: true, video_mode: videoMode,
      uploaded_images: uploadedImages.map(function(img) { return img.url; }),
    }).then(function(r) {
      if (r.success && r.render_job_id) { setJobId(r.render_job_id); setSteps(r.steps || []); setScript(r.script || null); setStatus('Rendering video...'); startPolling(r.render_job_id); }
      else if (r.success && !r.render_job_id) { setSteps(r.steps || []); setScript(r.script || null); setError('Pipeline completed but render failed to start. Steps: ' + JSON.stringify(r.steps || [])); setGenerating(false); }
      else { setError(r.error || r.detail || JSON.stringify(r)); setGenerating(false); }
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

      {/* Cobalt blue container — header + form seamless */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 20 }}>
        <div style={{ background: 'linear-gradient(180deg, #172554, #1e3a8a)', borderRadius: 14, padding: '24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={24} color="#a78bfa" />
            </div>
            <div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>Turn any idea into a marketing video</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Just describe what you want — AI handles everything in minutes</div>
            </div>
          </div>

          {/* Prompt — white card */}
          <div
            onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.boxShadow = 'none'; }}
            style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 14, transition: 'all 0.15s ease' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>What's your video about?</label>
            <textarea value={prompt} onChange={function(e) { setPrompt(e.target.value); }}
              placeholder="e.g. Create a 60-second video promoting my online fitness coaching business..."
              rows={3} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: '#0f172a', background: '#f8fafc' }} />
          </div>

          {/* Video mode — hero cards */}
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Choose your video style</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {/* Motion Video */}
            <div onClick={function() { setVideoMode('motion'); }}
              onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = videoMode === 'motion' ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none'; e.currentTarget.style.borderColor = videoMode === 'motion' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'; }}
              style={{ flex: 1, padding: '18px 18px 14px', borderRadius: 12, background: '#fff', cursor: 'pointer', position: 'relative',
                border: videoMode === 'motion' ? '2px solid #8b5cf6' : '2px solid rgba(255,255,255,0.1)',
                boxShadow: videoMode === 'motion' ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
                transition: 'all 0.2s ease' }}>
              <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', letterSpacing: '0.04em' }}>PRO</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: videoMode === 'motion' ? '#f3f0ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={videoMode === 'motion' ? '#8b5cf6' : '#94a3b8'} strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3V9z" fill={videoMode === 'motion' ? '#8b5cf6' : '#cbd5e1'} stroke="none"/><path d="M2 8h2M20 8h2M2 16h2M20 16h2" strokeWidth="1.5"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Motion video</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Real AI-generated cinematic clips</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>5-sec clips per scene via Kling AI</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#8b5cf6' }}>~{Math.ceil(duration / 8) * 3} credits</div>
              </div>
            </div>
            {/* Standard */}
            <div onClick={function() { setVideoMode('images'); }}
              onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = videoMode === 'images' ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none'; e.currentTarget.style.borderColor = videoMode === 'images' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'; }}
              style={{ flex: 1, padding: '18px 18px 14px', borderRadius: 12, background: '#fff', cursor: 'pointer',
                border: videoMode === 'images' ? '2px solid #8b5cf6' : '2px solid rgba(255,255,255,0.1)',
                boxShadow: videoMode === 'images' ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
                transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: videoMode === 'images' ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={videoMode === 'images' ? '#22c55e' : '#94a3b8'} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill={videoMode === 'images' ? '#22c55e' : '#cbd5e1'} stroke="none"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Standard</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>AI images with Ken Burns motion</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Smooth zoom and pan effects</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>~{Math.ceil(duration / 8)} credits</div>
              </div>
            </div>
          </div>

          {/* Settings row — 3 col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <CompactDropdown label="Style" icon="layers" items={STYLES} value={style} onChange={setStyle} />
            <CompactDropdown label="Duration" icon="timer" items={DURATIONS} value={duration} onChange={setDuration} />
            <CompactDropdown label="Aspect ratio" icon="aspect" items={ASPECTS} value={aspect} onChange={setAspect} />
          </div>

          {/* Voiceover */}
          <CompactDropdown label="Voiceover" icon="mic" items={VOICES} value={voice} onChange={setVoice} initialCount={6} openUp={true} />

          {/* Image upload */}
          <div style={{ marginTop: 12 }}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
            <div onClick={function() { if (!uploading) fileInputRef.current.click(); }}
              onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '14px 16px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', transition: 'all 0.15s ease' }}>
              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Loader2 size={16} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Uploading...</span>
                </div>
              ) : (
                <div><Upload size={20} color="#94a3b8" style={{ marginBottom: 2 }} /><div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Upload your own images (optional)</div><div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>JPG, PNG, WebP</div></div>
              )}
            </div>
            {uploadedImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {uploadedImages.map(function(img, i) {
                  return <div key={i} style={{ position: 'relative', width: 56, height: 56, borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={function() { removeImage(i); }} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={10} /></button>
                  </div>;
                })}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button onClick={generate} disabled={generating || !prompt.trim()}
            onMouseEnter={function(e) { if (!generating && prompt.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,0.45)'; } }}
            onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = generating ? 'none' : '0 2px 12px rgba(139,92,246,0.35)'; }}
            style={{ width: '100%', marginTop: 16, padding: '14px', borderRadius: 10, border: 'none',
              background: generating ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: generating ? 'none' : '0 2px 12px rgba(139,92,246,0.35)', transition: 'all 0.2s ease' }}>
            {generating ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={18} /> Generate video</>}
          </button>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            Estimated: ~{videoMode === 'motion' ? Math.ceil(duration / 8) * 3 : Math.ceil(duration / 8)} credits
          </div>
        </div>

        {/* Right panel — video preview + help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'start' }}>

          {/* Video preview card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px', minHeight: 280 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Monitor size={14} color="#8b5cf6" /> Video Preview
            </div>

            {!generating && !videoUrl && !error && (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Film size={32} color="#e2e8f0" />
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Your video will appear here</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Enter a prompt and click Generate</div>
              </div>
            )}
            {generating && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{status}</div>
                <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, marginBottom: 16 }}>
                  <div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{progress}% complete</div>
                {steps.map(function(s, i) {
                  var stepLabels = { script: 'Writing script', images: 'Generating visuals', voiceover: 'Recording voiceover', render: 'Composing video', video_clips: 'Creating motion clips' };
                  var statusLabels = { ok: 'Done', queued: 'In progress', failed: 'Failed' };
                  var stepLabel = stepLabels[s.step] || s.step;
                  var statusLabel = statusLabels[s.status] || s.status;
                  if (s.step === 'images' && s.generated !== undefined) statusLabel = s.generated + '/' + s.total + ' done';
                  var ic = s.status === 'ok' || s.status === 'queued' ? <CheckCircle size={14} color="#22c55e" /> : <Clock size={14} color="#94a3b8" />;
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
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} color="#22c55e" /> Video ready!</div>
                <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 12 }}><video src={videoUrl} controls style={{ width: '100%', display: 'block' }} /></div>
                <a href={videoUrl} download target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}><Download size={16} /> Download MP4</a>
                <button onClick={function() { setVideoUrl(null); setPrompt(''); setError(null); setJobId(null); setSteps([]); setScript(null); setUploadedImages([]); }} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Create another video</button>
              </div>
            )}
            {script && (
              <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Script: {script.title}</div>
                {(script.scenes || []).slice(0, 4).map(function(s, i) { return <div key={i} style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}><strong>Scene {s.scene_num}:</strong> {(s.narration || '').slice(0, 80)}...</div>; })}
                {(script.scenes || []).length > 4 && <div style={{ fontSize: 12, color: '#94a3b8' }}>+ {script.scenes.length - 4} more scenes</div>}
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={14} color="#0ea5e9" /> How it works
            </div>
            {[
              { num: '1', title: 'Describe your video', desc: 'Tell us what you want — your business, product, or message. Be as specific as you like.' },
              { num: '2', title: 'Choose your style', desc: 'Pick Motion for cinematic AI clips or Standard for smooth Ken Burns image transitions.' },
              { num: '3', title: 'AI creates everything', desc: 'Script, visuals, voiceover, and editing — all generated automatically in minutes.' },
              { num: '4', title: 'Download & share', desc: 'Get your finished MP4 video ready to post on social media, your website, or ads.' },
            ].map(function(step) {
              return (
                <div key={step.num} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="#f59e0b" /> Pro tips
            </div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              Be specific about your audience and goal. "60-second video for my fitness coaching business targeting women aged 25-40 who want to lose weight" works much better than "make a fitness video". Include your unique selling point for best results.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
