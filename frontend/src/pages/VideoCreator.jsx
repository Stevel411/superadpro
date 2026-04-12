import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost, apiGet } from '../utils/api';
import { Film, Sparkles, Download, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Upload, X, Mic, ImagePlus, ChevronDown, Layers, Timer, HelpCircle, Monitor } from 'lucide-react';

var STYLES = [
  { value: 'professional', label: 'Professional', desc: 'Clean, polished, business-ready', color: 'var(--sap-indigo)' },
  { value: 'energetic', label: 'Energetic', desc: 'Fast-paced, dynamic, high-energy', color: '#f97316' },
  { value: 'cinematic', label: 'Cinematic', desc: 'Dramatic, filmic, storytelling', color: 'var(--sap-accent)' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple, clean, understated', color: 'var(--sap-text-muted)' },
  { value: 'playful', label: 'Playful', desc: 'Fun, colourful, lighthearted', color: 'var(--sap-pink)' },
];

var DURATIONS = [
  { value: 30, label: '30 seconds', desc: '~4 scenes, ~4 credits', color: 'var(--sap-accent)' },
  { value: 60, label: '1 minute', desc: '~8 scenes, ~8 credits', color: 'var(--sap-accent)' },
  { value: 90, label: '90 seconds', desc: '~11 scenes, ~11 credits', color: 'var(--sap-accent)' },
  { value: 120, label: '2 minutes', desc: '~15 scenes, ~15 credits', color: 'var(--sap-accent)' },
];

var ASPECTS = [
  { value: 'landscape', label: '16:9', desc: 'YouTube, websites', color: 'var(--sap-text-muted)' },
  { value: 'portrait', label: '9:16', desc: 'TikTok, Reels, Shorts', color: 'var(--sap-text-muted)' },
];

var VOICES = [
  { value: 'en-GB-SoniaNeural', label: 'Sonia', desc: 'British female — warm, professional', color: 'var(--sap-purple-light)', tag: 'DEFAULT', tagColor: 'var(--sap-purple-light)' },
  { value: 'en-GB-RyanNeural', label: 'Ryan', desc: 'British male — confident, authoritative', color: '#2563eb', tag: 'POPULAR', tagColor: 'var(--sap-accent)' },
  { value: 'en-US-JennyNeural', label: 'Jenny', desc: 'American female — friendly, conversational', color: 'var(--sap-pink)' },
  { value: 'en-US-GuyNeural', label: 'Guy', desc: 'American male — smooth, versatile', color: 'var(--sap-green-dark)' },
  { value: 'en-US-AriaNeural', label: 'Aria', desc: 'American female — expressive, narration', color: 'var(--sap-red)', tag: 'NARRATOR', tagColor: 'var(--sap-green-dark)' },
  { value: 'en-US-DavisNeural', label: 'Davis', desc: 'American male — deep, energetic', color: '#f97316', tag: 'ENERGETIC', tagColor: '#ca8a04' },
  { value: 'en-US-JaneNeural', label: 'Jane', desc: 'American female — clear, polished', color: 'var(--sap-purple)' },
  { value: 'en-US-JasonNeural', label: 'Jason', desc: 'American male — natural, engaging', color: '#0284c7' },
  { value: 'en-AU-NatashaNeural', label: 'Natasha', desc: 'Australian female — bright, upbeat', color: '#ea580c' },
  { value: 'en-AU-WilliamNeural', label: 'William', desc: 'Australian male — warm, relaxed', color: 'var(--sap-green)' },
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
        style={{ background: isActive ? 'var(--sap-cobalt-mid)' : '#fff', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: '2px solid ' + (isActive ? 'var(--sap-cobalt-mid)' : 'transparent'), transition: 'all 0.15s ease', transform: hovered && !open ? 'translateY(-2px)' : 'none', boxShadow: hovered && !open ? '0 8px 24px rgba(0,0,0,0.2)' : 'none' }}>
        <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--sap-text-faint)', marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: selected.color || iconColor || 'var(--sap-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon === 'layers' && <Layers size={14} color="#fff" />}
            {icon === 'timer' && <Timer size={14} color="#fff" />}
            {icon === 'mic' && <Mic size={14} color="#fff" />}
            {icon === 'aspect' && (
              selected.value === 'portrait'
                ? <svg width="10" height="14" viewBox="0 0 14 22" fill="none"><rect x="1" y="1" width="12" height="20" rx="2" stroke="#fff" strokeWidth="1.5"/></svg>
                : <svg width="14" height="10" viewBox="0 0 22 14" fill="none"><rect x="1" y="1" width="20" height="12" rx="2" stroke="#fff" strokeWidth="1.5"/></svg>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : 'var(--sap-text-primary)' }}>{selected.label}</div>
          <ChevronDown size={14} color={isActive ? 'rgba(255,255,255,0.6)' : 'var(--sap-text-faint)'} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: 'linear-gradient(135deg, ' + (item.color || 'var(--sap-indigo)') + ', ' + (item.color || 'var(--sap-indigo)') + 'cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{item.label}</div>
                      {item.desc && <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>{item.desc}</div>}
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
              <span style={{ fontSize: 12, color: 'var(--sap-purple)', fontWeight: 600 }}>Show {items.length - initialCount} more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Styled Select (custom dropdown for Platform Tour layout) ── */
function StyledSelect({ label, items, value, onChange, renderLabel, renderDesc, colorKey }) {
  var [open, setOpen] = useState(false);
  var ref = useRef(null);
  var selected = items.find(function(it) { return it.value === value; }) || items[0];

  useEffect(function() {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return function() { document.removeEventListener('mousedown', h); };
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="cs-lbl">{label}</div>
      <div onClick={function() { setOpen(!open); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid ' + (open ? 'var(--sap-purple)' : 'var(--sap-border)'), background: open ? '#faf5ff' : '#fff', cursor: 'pointer', transition: 'all .15s' }}>
        {colorKey && selected[colorKey] && <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected[colorKey], flexShrink: 0 }}/>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{renderLabel(selected)}</div>
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--sap-text-faint)" strokeWidth="2.5" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 50, maxHeight: 260, overflowY: 'auto', padding: 4 }}>
          {items.map(function(item) {
            var isSel = item.value === value;
            return (
              <div key={item.value} onClick={function() { onChange(item.value); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: isSel ? '#f5f3ff' : 'transparent', transition: 'background .1s' }}
                onMouseEnter={function(e) { if (!isSel) e.currentTarget.style.background = 'var(--sap-bg-elevated)'; }}
                onMouseLeave={function(e) { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                {colorKey && item[colorKey] && <div style={{ width: 8, height: 8, borderRadius: '50%', background: item[colorKey], flexShrink: 0 }}/>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSel ? 'var(--sap-purple)' : 'var(--sap-text-primary)' }}>{renderLabel(item)}</div>
                  {renderDesc && <div style={{ fontSize: 10, color: 'var(--sap-text-faint)', marginTop: 1 }}>{renderDesc(item)}</div>}
                </div>
                {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sap-purple)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VideoCreator() {
  var { t } = useTranslation();
  return (
    <AppLayout title="AI Video Creator" subtitle="One-click marketing videos">
      <VideoCreatorContent />
    </AppLayout>
  );
}

export function VideoCreatorContent() {
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
      else if (r.success && !r.render_job_id) { setSteps(r.steps || []); setScript(r.script || null); setError('Pipeline completed but render failed to start.'); setGenerating(false); }
      else { setError(r.error || r.detail || JSON.stringify(r)); setGenerating(false); }
    }).catch(function(e) { setError(e.message || 'Failed to generate video'); setGenerating(false); });
  }

  function startPolling(jid) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      apiGet('/api/video-creator/status/' + jid).then(function(r) {
        if (r.progress !== undefined) setProgress(r.progress);
        if (r.status === 'completed') { clearInterval(pollRef.current); setStatus('Downloading video...'); fetchVideo(jid); }
        else if (r.status === 'failed') { clearInterval(pollRef.current); setError('Render failed: ' + (r.error || 'Unknown error')); setGenerating(false); }
      }).catch(function() {});
    }, 3000);
  }

  function fetchVideo(jid) {
    apiGet('/api/video-creator/download/' + jid).then(function(r) {
      if (r.success && r.url) { setVideoUrl(r.url); setStatus('Complete!'); setProgress(100); setGenerating(false); }
      else { setError(r.error || 'Failed to download video'); setGenerating(false); }
    }).catch(function(e) { setError(e.message || 'Failed to download'); setGenerating(false); });
  }

  function dlVideo(url, filename) {
    fetch(url).then(function(r) { return r.blob(); }).then(function(blob) {
      var blobUrl = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = blobUrl; a.download = filename || 'full-video-' + Date.now() + '.mp4';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
    }).catch(function() { window.open(url, '_blank'); });
  }

  useEffect(function() { return function() { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  var estCredits = videoMode === 'motion' ? Math.ceil(duration / 8) * 3 : Math.ceil(duration / 8);

  return (
    <>
      {/* Hero Video Stage */}
      <div className="cs-stage" style={{ background: '#0a0f1e', maxWidth: 900, margin: '0 auto 20px' }}>
        {videoUrl ? (
          <div className="cs-stage-inner r-16x9"><video src={videoUrl} controls autoPlay loop/></div>
        ) : generating ? (
          <div className="cs-stage-empty">
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: 'var(--sap-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
            <p style={{ color: 'rgba(255,255,255,.5)' }}>{status || 'Generating...'}</p>
            <small style={{ color: 'rgba(255,255,255,.25)' }}>{progress}% complete</small>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#9888;&#65039;</div>
            <p style={{ fontSize: 14, color: '#f87171', fontWeight: 600, marginBottom: 8 }}>Error</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', maxWidth: 400, margin: '0 auto', wordBreak: 'break-word' }}>{error}</p>
            <button onClick={function() { setError(null); setGenerating(false); }} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
          </div>
        ) : (
          <div className="cs-stage-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 2v20M17 2v20M2 12h20"/></svg>
            <p>Your full video will appear here</p>
            <small>Describe what you want \u2014 AI handles script, visuals, voiceover, and editing</small>
          </div>
        )}
      </div>

      {generating && <div className="cs-progress-wrap" style={{ maxWidth: 900, margin: '-10px auto 20px' }}>
        <div className="cs-progress"><div className="cs-progress-bar" style={{ width: progress + '%' }}/></div>
        <div className="cs-progress-status">{status || 'Generating...'} \u2014 {progress}%</div>
        {steps.length > 0 && <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {steps.map(function(s, i) { var labels = { script: 'Script', images: 'Visuals', voiceover: 'Voiceover', render: 'Composing', video_clips: 'Motion clips' }; var done = s.status === 'ok'; return <span key={i} style={{ fontSize: 11, color: done ? 'var(--sap-green-bright)' : 'var(--sap-text-faint)', fontWeight: 600 }}>{done ? '\u2713' : '\u25CB'} {labels[s.step] || s.step}</span>; })}
        </div>}
      </div>}

      {videoUrl && <div className="cs-stage-actions" style={{ justifyContent: 'center', marginBottom: 24 }}>
        <button className="cs-sa-btn" onClick={function() { dlVideo(videoUrl); }}>\u2B07 Download MP4</button>
        <button className="cs-sa-btn" onClick={function() { setVideoUrl(null); setPrompt(''); setError(null); setSteps([]); setScript(null); setUploadedImages([]); }}>\u2715 Create another</button>
      </div>}

      <div className="cs-controls" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="cs-row">
          <div className="cs-card">
            <div className="cs-lbl">What's your video about?</div>
            <textarea className="cs-ta" rows={4} value={prompt} onChange={function(e) { setPrompt(e.target.value); }}
              placeholder="e.g. Create a 60-second video promoting my online fitness coaching business targeting women aged 25-40..."/>
            <div className="cs-ta-foot">
              <span className="cs-ta-ai">✦ Be specific for best results</span>
              <span className="cs-ta-ct">{prompt.length}</span>
            </div>
          </div>
          <div className="cs-card">
            <div className="cs-lbl">Video Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className={'cs-model' + (videoMode === 'motion' ? ' sel' : '')} onClick={function() { setVideoMode('motion'); }}>
                <div className="cs-model-dot" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>\u25B6</div>
                <div style={{ flex: 1 }}><div className="cs-model-name">Motion Video</div><div className="cs-model-desc">Real AI cinematic clips per scene</div></div>
                <div style={{ textAlign: 'right' }}><span className="cs-model-badge" style={{ background: 'var(--sap-amber-bg)', color: '#92400e' }}>PRO</span><div className="cs-model-price">~{Math.ceil(duration / 8) * 3} credits</div></div>
              </div>
              <div className={'cs-model' + (videoMode === 'images' ? ' sel' : '')} onClick={function() { setVideoMode('images'); }}>
                <div className="cs-model-dot" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>\u25CE</div>
                <div style={{ flex: 1 }}><div className="cs-model-name">Standard</div><div className="cs-model-desc">AI images with Ken Burns motion</div></div>
                <div className="cs-model-price">~{Math.ceil(duration / 8)} credits</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="cs-lbl">Your Images <span className="cs-lbl-badge">Optional</span></div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }}/>
              <div className="cs-upload" style={{ padding: 14 }} onClick={function() { if (!uploading && fileInputRef.current) fileInputRef.current.click(); }}>
                <div className="cs-upload-text">{uploading ? 'Uploading...' : uploadedImages.length > 0 ? uploadedImages.length + ' images uploaded \u2014 click to add more' : '+ Upload your own images (optional)'}</div>
              </div>
              {uploadedImages.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {uploadedImages.map(function(img, i) {
                  return <div key={i} style={{ position: 'relative', width: 48, height: 48, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    <div onClick={function() { removeImage(i); }} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>\u2715</div>
                  </div>;
                })}
              </div>}
            </div>
          </div>
        </div>

        <div className="cs-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <StyledSelect label="Style" items={STYLES} value={style} onChange={setStyle} renderLabel={function(s) { return s.label; }} renderDesc={function(s) { return s.desc; }} colorKey="color"/>
            <StyledSelect label="Duration" items={DURATIONS} value={duration} onChange={setDuration} renderLabel={function(d) { return d.label; }} renderDesc={function(d) { return d.desc; }}/>
            <StyledSelect label="Aspect Ratio" items={ASPECTS} value={aspect} onChange={setAspect} renderLabel={function(a) { return a.label; }} renderDesc={function(a) { return a.desc; }}/>
            <StyledSelect label="Voiceover" items={VOICES} value={voice} onChange={setVoice} renderLabel={function(v) { return v.label; }} renderDesc={function(v) { return v.desc.split(' — ')[0]; }} colorKey="color"/>
          </div>
        </div>
      </div>

      <div className="cs-gen-row" style={{ maxWidth: 900, margin: '8px auto 0' }}>
        <button className="cs-gen-btn" onClick={generate} disabled={!prompt.trim() || generating}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
          {generating ? 'Generating...' : !prompt.trim() ? 'Enter a prompt' : '🎬 Generate Full Video'}
        </button>
        <div className="cs-gen-info"><b>~{estCredits} credits</b>{videoMode === 'motion' ? 'Motion mode' : 'Standard mode'}</div>
      </div>

      {script && <div style={{ maxWidth: 900, margin: '16px auto 0' }}>
        <div className="cs-card">
          <div className="cs-lbl">Generated Script: {script.title}</div>
          {(script.scenes || []).slice(0, 4).map(function(s, i) { return <div key={i} style={{ fontSize: 12, color: 'var(--sap-text-muted)', marginBottom: 4 }}><strong>Scene {s.scene_num}:</strong> {(s.narration || '').slice(0, 100)}...</div>; })}
          {(script.scenes || []).length > 4 && <div style={{ fontSize: 12, color: 'var(--sap-text-faint)' }}>+ {script.scenes.length - 4} more scenes</div>}
        </div>
      </div>}

      {/* Bottom spacer — gives dropdowns room to open without clipping */}
      <div style={{ height: 200 }}/>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </>
  );
}
