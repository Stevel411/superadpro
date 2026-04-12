import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { CreditMatrixContent } from '../CreditMatrix';
import { VideoCreatorContent } from '../VideoCreator';
import './creative-studio.css';

// ── Video Models ──────────────────────────────────────
const MODELS = [
  { key: "wan26",      name: "WAN 2.6",          desc: "Budget-friendly, good quality",    badge: "CHEAPEST", cost: 1,  color: "#10b981", i2v: true,  audio: false, negPrompt: false, durations: [3,5,8],       resolutions: ["480p","720p"],        durationLabel: "3-8s",   pricePer10s: "$0.50",  tier: "budget" },
  { key: "seedance",   name: "Seedance 1.5 Pro", desc: "Great quality + native audio",     badge: "VALUE",    cost: 2,  color: "#fb923c", i2v: true,  audio: true,  negPrompt: false, durations: [4,5,8,10,12], resolutions: ["480p","720p","1080p"],durationLabel: "4-12s",  pricePer10s: "$1.00",  tier: "standard" },
  { key: "kling3",     name: "Kling 3.0",        desc: "Cinematic realism, smooth motion",  badge: "POPULAR",  cost: 3,  color: "#22d3ee", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15], resolutions: ["720p","1080p"],      durationLabel: "3-15s",  pricePer10s: "$1.20",  tier: "standard" },
  { key: "grok-video", name: "Grok Imagine",     desc: "Creative with built-in audio",      badge: "AUDIO",    cost: 4,  color: "#ef4444", i2v: true,  audio: false, negPrompt: false, durations: [6,10],        resolutions: ["480p","720p"],        durationLabel: "6/10s",  pricePer10s: "$1.40",  tier: "standard" },
  { key: "veo31",      name: "VEO 3.1 Fast",     desc: "Google, fast + fine detail",        badge: "NEW",      cost: 4,  color: "#38bdf8", i2v: true,  audio: false, negPrompt: false, durations: [4,6,8],       resolutions: ["720p","1080p","4K"],  durationLabel: "4/6/8s", pricePer10s: "$1.60",  tier: "standard" },
  { key: "kling-o3",   name: "Kling O3",         desc: "Next-gen, exceptional detail",      badge: "BEST",     cost: 5,  color: "#8b5cf6", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15], resolutions: ["720p","1080p"],      durationLabel: "3-15s",  pricePer10s: "$2.00",  tier: "premium" },
  { key: "sora2",      name: "Sora 2 Pro",       desc: "OpenAI flagship, photorealistic",   badge: "PREMIUM",  cost: 8,  color: "#a78bfa", i2v: true,  audio: false, negPrompt: false, durations: [4,8,12],      resolutions: ["720p","1080p"],      durationLabel: "4/8/12s",pricePer10s: "$3.00",  tier: "premium" },
  { key: "sora2-max",  name: "Sora 2 Max",       desc: "No watermark, premium OpenAI",      badge: "PRO",      cost: 10, color: "#c084fc", i2v: false, audio: false, negPrompt: false, durations: [10,15],       resolutions: ["720p","1080p"],      durationLabel: "10/15s", pricePer10s: "$4.00",  tier: "ultra" },
  { key: "veo31-pro",  name: "VEO 3.1 Pro 4K",   desc: "Maximum quality, 4K + audio",       badge: "4K",       cost: 16, color: "#f59e0b", i2v: true,  audio: true,  negPrompt: false, durations: [4,6,8],       resolutions: ["720p","1080p","4K"],  durationLabel: "4/6/8s", pricePer10s: "$8.50",  tier: "ultra" },
];

const RATIOS = [
  { key: "16:9", label: "Landscape" },
  { key: "9:16", label: "Portrait" },
  { key: "1:1",  label: "Square" },
  { key: "4:3",  label: "Classic" },
];

const CAMERA_MOTIONS = [
  { key: "zoom-in",   label: "Zoom In",   icon: "⊕", prompt: "slow cinematic zoom in" },
  { key: "zoom-out",  label: "Zoom Out",  icon: "⊖", prompt: "slow zoom out revealing the full scene" },
  { key: "pan-left",  label: "Pan Left",  icon: "←", prompt: "smooth camera pan to the left" },
  { key: "pan-right", label: "Pan Right", icon: "→", prompt: "smooth camera pan to the right" },
  { key: "tilt-up",   label: "Tilt Up",   icon: "↑", prompt: "gentle camera tilt upward" },
  { key: "tilt-down", label: "Tilt Down", icon: "↓", prompt: "gentle camera tilt downward" },
  { key: "orbit",     label: "Orbit",     icon: "◎", prompt: "slow orbital camera movement around subject" },
  { key: "dolly-in",  label: "Dolly In",  icon: "⟼", prompt: "steady dolly push toward subject" },
  { key: "tracking",  label: "Tracking",  icon: "⟿", prompt: "smooth tracking shot following motion" },
  { key: "crane-up",  label: "Crane Up",  icon: "⤴", prompt: "dramatic crane shot rising upward" },
  { key: "static",    label: "Static",    icon: "▪", prompt: "static camera, subtle ambient motion only" },
  { key: "handheld",  label: "Handheld",  icon: "≋", prompt: "slight handheld camera shake, natural feel" },
];

const AUDIO_EXTRA_PER_5S = 1;

function calcCost(modelKey, dur, withAudio) {
  var m = MODELS.find(function(x) { return x.key === modelKey; });
  if (!m) return 0;
  var segs = dur / 5;
  var c = m.cost * segs;
  if (withAudio && m.audio) c += AUDIO_EXTRA_PER_5S * segs;
  return c;
}

// ── Tab definitions ──
var TABS = [
  { key: 'video-clips', label: 'Video Clips', icon: 'video' },
  { key: 'full-video',  label: 'Full Video',  icon: 'film' },
  { key: 'images',      label: 'Images',      icon: 'image' },
  { key: 'music',       label: 'Music',       icon: 'music' },
  { key: 'voiceover',   label: 'Voiceover',   icon: 'mic' },
  { key: 'lip-sync',    label: 'Lip Sync',    icon: 'edit' },
  { key: 'gallery',     label: 'Gallery',     icon: 'grid' },
  { key: 'credits',     label: 'Credits',     icon: 'clock' },
];

function TabIcon({ type }) {
  var s = { width: 15, height: 15 };
  if (type === 'video') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
  if (type === 'film') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20"/></svg>;
  if (type === 'image') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
  if (type === 'music') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  if (type === 'mic') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>;
  if (type === 'edit') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
  if (type === 'grid') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  if (type === 'clock') return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
  return null;
}

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function CreativeStudio() {
  var { t } = useTranslation();
  var [searchParams, setSearchParams] = useSearchParams();
  var initialTab = searchParams.get('tab') || 'video-clips';
  var [tab, setTab] = useState(initialTab);


  function switchTab(t) {
    setTab(t);
    setSearchParams(t === 'video-clips' ? {} : { tab: t }, { replace: true });
  }

  // ── Video Clips state ──
  var [mode, setMode] = useState('text');
  var [prompt, setPrompt] = useState('');
  var [model, setModel] = useState('kling3');
  var [duration, setDuration] = useState(10);
  var [ratio, setRatio] = useState('16:9');
  var [resolution, setResolution] = useState('1080p');
  var [negPrompt, setNegPrompt] = useState('');
  var [genAudio, setGenAudio] = useState(false);
  var [motionPresets, setMotionPresets] = useState([]);
  var [seedLocked, setSeedLocked] = useState(false);
  var [seedValue, setSeedValue] = useState(null);

  // Image upload
  var [imageFile, setImageFile] = useState(null);
  var [imagePreview, setImagePreview] = useState(null);
  var [uploading, setUploading] = useState(false);
  var [imageUrl, setImageUrl] = useState(null);
  var fileRef = useRef(null);

  // Generation
  var [generating, setGenerating] = useState(false);
  var [taskId, setTaskId] = useState(null);
  var [videoUrl, setVideoUrl] = useState(null);
  var [genStatus, setGenStatus] = useState(null);
  var [genProgress, setGenProgress] = useState(0);
  var pollRef = useRef(null);
  var fakeProgRef = useRef(null);

  // Credits & gallery
  var [credits, setCredits] = useState(0);
  var [videos, setVideos] = useState([]);

  // ── Images tab state ──
  var [imgModel, setImgModel] = useState('gemini-free');
  var [imgPrompt, setImgPrompt] = useState('');
  var [imgNegPrompt, setImgNegPrompt] = useState('');
  var [imgQuality, setImgQuality] = useState('1K');
  var [imgSize, setImgSize] = useState('1:1');
  var [imgBatch, setImgBatch] = useState(1);
  var [imgGenerating, setImgGenerating] = useState(false);
  var [imgResults, setImgResults] = useState([]);
  var [imgProgress, setImgProgress] = useState(0);
  var imgProgRef = useRef(null);
  var imgPollRef = useRef(null);

  var IMG_MODELS = [
    { key: 'gemini-free',          name: 'Gemini AI',       desc: 'Fast AI image generation, 1K quality',  badge: 'NEW',  color: '#0ea5e9' },
    { key: 'nano-banana-2',       name: 'Nano Banana 2',   desc: 'Best quality, text rendering',          badge: 'BEST', color: '#8b5cf6' },
    { key: 'nano-banana-pro',     name: 'Nano Banana Pro',  desc: 'Photo-realistic, professional',        badge: '',     color: '#a78bfa' },
    { key: 'nano-banana-2-beta',  name: 'NB2 Beta',        desc: 'Web search grounding',                  badge: 'NEW',  color: '#6366f1' },
    { key: 'doubao-seedream-5.0-lite', name: 'Seedream 5.0', desc: 'ByteDance, flexible sizes',           badge: '',     color: '#f59e0b' },
    { key: 'doubao-seedream-4.5', name: 'Seedream 4.5',    desc: 'Multi-image editing, 4K',               badge: 'NEW',  color: '#fb923c' },
    { key: 'gpt-image-1',        name: 'GPT Image',       desc: 'OpenAI image generation',               badge: '',     color: '#22c55e' },
    { key: 'gpt-image-1.5',      name: 'GPT Image 1.5',   desc: 'True-color precision',                  badge: 'NEW',  color: '#10b981' },
    { key: 'grok-image',         name: 'Grok Imagine',    desc: 'Fast AI image generation',              badge: 'NEW',  color: '#ef4444' },
    { key: 'grok-image-pro',     name: 'Grok Imagine Pro', desc: 'Premium quality images',               badge: 'PRO',  color: '#dc2626' },
    { key: 'z-image-turbo',      name: 'Z Turbo',         desc: 'Ultra-fast ~3 seconds',                 badge: 'FAST', color: '#38bdf8' },
  ];
  var IMG_QUALITIES = ['1K', '2K', '4K'];
  var IMG_CREDIT_MAP = { '1K': 1, '2K': 2, '4K': 4 };
  var imgCost = (IMG_CREDIT_MAP[imgQuality] || 2) * imgBatch;
  var selectedImgModel = IMG_MODELS.find(function(m) { return m.key === imgModel; }) || IMG_MODELS[0];

  function generateImage() {
    if (!imgPrompt.trim() || imgGenerating) return;
    if (credits < imgCost) { alert('Need ' + imgCost + ' credits, have ' + credits); return; }
    setImgGenerating(true); setImgResults([]); setImgProgress(0);
    imgProgRef.current = setInterval(function() { setImgProgress(function(p) { return Math.min(p + Math.random() * 4 + 2, 90); }); }, 300);
    var payload = { model: imgModel, prompt: imgPrompt, quality: imgQuality, size: imgSize, n: imgBatch };
    if (imgNegPrompt.trim()) payload.negative_prompt = imgNegPrompt.trim();
    if (seedLocked && seedValue !== null) payload.seed = seedValue;
    fetch('/api/superscene/image/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function(r) { return r.json(); }).then(function(data) {
        if (data.credits_remaining !== undefined) setCredits(data.credits_remaining);
        if (data.images && data.images.length > 0) {
          setImgResults(data.images); setImgGenerating(false); setImgProgress(100); clearInterval(imgProgRef.current);
        } else if (data.task_id) {
          if (imgPollRef.current) clearInterval(imgPollRef.current);
          imgPollRef.current = setInterval(function() {
            fetch('/api/superscene/image/status/' + data.task_id).then(function(r) { return r.json(); }).then(function(pd) {
              if (pd.status === 'completed' && pd.images && pd.images.length > 0) {
                setImgResults(pd.images); setImgGenerating(false); setImgProgress(100); clearInterval(imgPollRef.current); clearInterval(imgProgRef.current);
              } else if (pd.status === 'failed') {
                setImgGenerating(false); clearInterval(imgPollRef.current); clearInterval(imgProgRef.current); alert('Image generation failed');
              }
            }).catch(function() {});
          }, 2000);
        } else {
          alert(data.detail || data.error || 'Image generation failed'); setImgGenerating(false); clearInterval(imgProgRef.current);
        }
      }).catch(function(e) { alert(e.message || 'Network error'); setImgGenerating(false); clearInterval(imgProgRef.current); });
  }

  // ── Music tab state ──
  var MUSIC_MODELS = [
    { key: 'suno-v4',   name: 'Suno V4',   cost: 1, color: '#f59e0b' },
    { key: 'suno-v4.5', name: 'Suno V4.5', cost: 2, color: '#fb923c' },
    { key: 'suno-v5',   name: 'Suno V5',   cost: 3, color: '#ef4444', badge: 'BEST' },
  ];
  var [musicModel, setMusicModel] = useState('suno-v4');
  var [musicPrompt, setMusicPrompt] = useState('');
  var [musicCustom, setMusicCustom] = useState(false);
  var [musicStyle, setMusicStyle] = useState('');
  var [musicTitle, setMusicTitle] = useState('');
  var [musicInstrumental, setMusicInstrumental] = useState(false);
  var [musicGender, setMusicGender] = useState('');
  var [musicGenerating, setMusicGenerating] = useState(false);
  var [musicUrl, setMusicUrl] = useState(null);
  var [musicProgress, setMusicProgress] = useState(0);
  var [lyricsGenerating, setLyricsGenerating] = useState(false);
  var musicPollRef = useRef(null);
  var musicProgRef = useRef(null);
  var musicCost = (MUSIC_MODELS.find(function(m) { return m.key === musicModel; }) || {}).cost || 2;

  function generateLyrics() {
    if (lyricsGenerating) return;
    var desc = musicPrompt.trim() || musicTitle.trim() || musicStyle.trim();
    if (!desc) { alert('Enter a description, title, or style first'); return; }
    setLyricsGenerating(true);
    fetch('/api/superscene/music/generate-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: desc, style: musicStyle }) })
      .then(function(r) { return r.json(); }).then(function(data) { if (data.success && data.lyrics) setMusicPrompt(data.lyrics); else alert(data.error || 'Lyrics failed'); setLyricsGenerating(false); })
      .catch(function() { alert('Network error'); setLyricsGenerating(false); });
  }

  function generateMusic() {
    if (!musicPrompt.trim() || musicGenerating) return;
    if (credits < musicCost) { alert('Need ' + musicCost + ' credits'); return; }
    setMusicGenerating(true); setMusicUrl(null); setMusicProgress(0);
    musicProgRef.current = setInterval(function() { setMusicProgress(function(p) { if (p >= 85) { clearInterval(musicProgRef.current); return p; } return p + Math.random() * 3 + 1; }); }, 500);
    var payload = { model: musicModel, prompt: musicPrompt, custom_mode: musicCustom, instrumental: musicInstrumental };
    if (musicCustom) { payload.style = musicStyle; payload.title = musicTitle; payload.vocal_gender = musicGender; }
    fetch('/api/superscene/music/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function(r) { return r.json(); }).then(function(data) {
        if (data.error || data.detail) { alert(data.detail || data.error); setMusicGenerating(false); clearInterval(musicProgRef.current); return; }
        setCredits(data.credits_remaining);
        if (musicPollRef.current) clearInterval(musicPollRef.current);
        musicPollRef.current = setInterval(function() {
          fetch('/api/superscene/music/status/' + data.task_id).then(function(r) { return r.json(); }).then(function(pd) {
            if (pd.status === 'completed' && pd.audio_url) { setMusicUrl(pd.audio_url); setMusicGenerating(false); setMusicProgress(100); clearInterval(musicPollRef.current); clearInterval(musicProgRef.current); fetch('/api/superscene/credits').then(function(r) { return r.json(); }).then(function(d) { setCredits(d.balance || 0); }); }
            else if (pd.status === 'failed') { setMusicGenerating(false); clearInterval(musicPollRef.current); clearInterval(musicProgRef.current); alert('Music generation failed'); }
          }).catch(function() {});
        }, 3000);
      }).catch(function() { alert('Network error'); setMusicGenerating(false); clearInterval(musicProgRef.current); });
  }

  // ── Voiceover + Lip Sync tab state ──
  var VO_VOICES = [
    // American
    { id: 'en-US-GuyNeural', name: 'Guy', gender: 'M', accent: 'US', cat: 'American', desc: 'Warm, conversational narrator' },
    { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'F', accent: 'US', cat: 'American', desc: 'Friendly, clear corporate voice' },
    { id: 'en-US-AriaNeural', name: 'Aria', gender: 'F', accent: 'US', cat: 'American', desc: 'Professional, smooth delivery' },
    { id: 'en-US-DavisNeural', name: 'Davis', gender: 'M', accent: 'US', cat: 'American', desc: 'Deep, authoritative tone' },
    { id: 'en-US-JaneNeural', name: 'Jane', gender: 'F', accent: 'US', cat: 'American', desc: 'Calm, documentary style' },
    { id: 'en-US-JasonNeural', name: 'Jason', gender: 'M', accent: 'US', cat: 'American', desc: 'Energetic, upbeat presenter' },
    { id: 'en-US-TonyNeural', name: 'Tony', gender: 'M', accent: 'US', cat: 'American', desc: 'Casual, friendly guy-next-door' },
    { id: 'en-US-NancyNeural', name: 'Nancy', gender: 'F', accent: 'US', cat: 'American', desc: 'Warm, mature professional' },
    { id: 'en-US-SaraNeural', name: 'Sara', gender: 'F', accent: 'US', cat: 'American', desc: 'Young, cheerful — lifestyle' },
    { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'M', accent: 'US', cat: 'American', desc: 'Confident, polished — corporate' },
    { id: 'en-US-EmmaNeural', name: 'Emma', gender: 'F', accent: 'US', cat: 'American', desc: 'Natural, versatile — any content' },
    { id: 'en-US-BrianNeural', name: 'Brian', gender: 'M', accent: 'US', cat: 'American', desc: 'Strong, cinematic narrator' },
    { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'F', accent: 'US', cat: 'American', desc: 'Engaging, warm storyteller' },
    { id: 'en-US-RogerNeural', name: 'Roger', gender: 'M', accent: 'US', cat: 'American', desc: 'Mature, commanding — leadership' },
    { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'M', accent: 'US', cat: 'American', desc: 'Modern, approachable — podcasts' },
    { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'M', accent: 'US', cat: 'American', desc: 'Reliable, steady news anchor' },
    { id: 'en-US-EricNeural', name: 'Eric', gender: 'M', accent: 'US', cat: 'American', desc: 'Clear, precise — tutorials' },
    // British
    { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'M', accent: 'UK', cat: 'British', desc: 'Polished, BBC-style narrator' },
    { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'F', accent: 'UK', cat: 'British', desc: 'Elegant, refined — luxury' },
    { id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'M', accent: 'UK', cat: 'British', desc: 'Articulate, distinguished' },
    { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'F', accent: 'UK', cat: 'British', desc: 'Young, bright — modern British' },
    { id: 'en-GB-MaisieNeural', name: 'Maisie', gender: 'F', accent: 'UK', cat: 'British', desc: 'Soft, gentle — audiobooks' },
    // Australian
    { id: 'en-AU-WilliamNeural', name: 'William', gender: 'M', accent: 'AU', cat: 'Australian', desc: 'Relaxed, natural storyteller' },
    { id: 'en-AU-NatashaNeural', name: 'Natasha', gender: 'F', accent: 'AU', cat: 'Australian', desc: 'Bright, engaging presenter' },
    // Indian
    { id: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'F', accent: 'IN', cat: 'Indian', desc: 'Clear, professional — tech' },
    { id: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'M', accent: 'IN', cat: 'Indian', desc: 'Articulate, formal — corporate' },
    // Irish
    { id: 'en-IE-ConnorNeural', name: 'Connor', gender: 'M', accent: 'IE', cat: 'Irish', desc: 'Warm Irish charm — storytelling' },
    { id: 'en-IE-EmilyNeural', name: 'Emily', gender: 'F', accent: 'IE', cat: 'Irish', desc: 'Friendly, approachable Irish' },
    // South African
    { id: 'en-ZA-LeahNeural', name: 'Leah', gender: 'F', accent: 'ZA', cat: 'S. African', desc: 'Distinctive, clear SA tone' },
    { id: 'en-ZA-LukeNeural', name: 'Luke', gender: 'M', accent: 'ZA', cat: 'S. African', desc: 'Strong, confident SA voice' },
    // Canadian
    { id: 'en-CA-ClaraNeural', name: 'Clara', gender: 'F', accent: 'CA', cat: 'Canadian', desc: 'Neutral, crisp — clean read' },
    { id: 'en-CA-LiamNeural', name: 'Liam', gender: 'M', accent: 'CA', cat: 'Canadian', desc: 'Friendly, approachable' },
  ];
  var VO_CATEGORIES = ['American', 'British', 'Australian', 'Indian', 'Irish', 'S. African', 'Canadian'];
  var [voText, setVoText] = useState('');
  var [voVoice, setVoVoice] = useState('en-US-GuyNeural');
  var [voGenerating, setVoGenerating] = useState(false);
  var [voAudioUrl, setVoAudioUrl] = useState(null);
  var [voImageUrl, setVoImageUrl] = useState(null);
  var [voLipSyncing, setVoLipSyncing] = useState(false);
  var [voLipSyncUrl, setVoLipSyncUrl] = useState(null);
  var [voLipSyncProgress, setVoLipSyncProgress] = useState(0);
  var [voPreviewPlaying, setVoPreviewPlaying] = useState(null);
  var voPreviewRef = useRef(null);
  var voImageInputRef = useRef(null);
  var voLipPollRef = useRef(null);
  var voLipProgRef = useRef(null);
  var selectedVoice = VO_VOICES.find(function(v) { return v.id === voVoice; }) || VO_VOICES[0];

  function previewVoice(voiceId) {
    if (voPreviewPlaying === voiceId && voPreviewRef.current) {
      voPreviewRef.current.pause(); voPreviewRef.current = null; setVoPreviewPlaying(null); return;
    }
    if (voPreviewRef.current) voPreviewRef.current.pause();
    var a = new Audio('/api/superscene/voiceover/preview/' + voiceId);
    a.onended = function() { setVoPreviewPlaying(null); };
    a.play(); voPreviewRef.current = a; setVoPreviewPlaying(voiceId);
  }

  function generateVoiceover() {
    if (!voText.trim() || voGenerating) return;
    setVoGenerating(true); setVoAudioUrl(null);
    fetch('/api/superscene/voiceover/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: voText, voice: voVoice }) })
      .then(function(r) { return r.json(); }).then(function(data) {
        if (data.success && data.audio_url) setVoAudioUrl(data.audio_url); else alert(data.detail || data.error || 'Voiceover failed');
        setVoGenerating(false);
      }).catch(function() { alert('Network error'); setVoGenerating(false); });
  }

  function handleVoImageUpload(e) {
    var file = e.target.files && e.target.files[0]; if (!file) return;
    var fd = new FormData(); fd.append('file', file);
    fetch('/api/superscene/upload-image', { method: 'POST', body: fd })
      .then(function(r) { return r.json(); }).then(function(data) { if (data.success && data.file_url) setVoImageUrl(data.file_url); else alert('Upload failed'); })
      .catch(function() { alert('Upload error'); });
  }

  function generateLipSync() {
    if (!voAudioUrl || !voImageUrl || voLipSyncing) return;
    setVoLipSyncing(true); setVoLipSyncUrl(null); setVoLipSyncProgress(0);
    voLipProgRef.current = setInterval(function() { setVoLipSyncProgress(function(p) { return Math.min(p + Math.random() * 2 + 0.5, 85); }); }, 500);
    fetch('/api/superscene/lipsync/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: voImageUrl, audio_url: voAudioUrl }) })
      .then(function(r) { return r.json(); }).then(function(data) {
        if (data.error || data.detail) { alert(data.detail || data.error); setVoLipSyncing(false); clearInterval(voLipProgRef.current); return; }
        if (data.credits_remaining !== undefined) setCredits(data.credits_remaining);
        if (voLipPollRef.current) clearInterval(voLipPollRef.current);
        voLipPollRef.current = setInterval(function() {
          fetch('/api/superscene/status/' + data.task_id).then(function(r) { return r.json(); }).then(function(pd) {
            if (pd.status === 'completed' && pd.video_url) { setVoLipSyncUrl(pd.video_url); setVoLipSyncing(false); setVoLipSyncProgress(100); clearInterval(voLipPollRef.current); clearInterval(voLipProgRef.current); fetch('/api/superscene/credits').then(function(r) { return r.json(); }).then(function(d) { setCredits(d.balance || 0); }); }
            else if (pd.status === 'failed') { setVoLipSyncing(false); clearInterval(voLipPollRef.current); clearInterval(voLipProgRef.current); alert('Lip sync failed'); }
          }).catch(function() {});
        }, 3000);
      }).catch(function() { alert('Network error'); setVoLipSyncing(false); clearInterval(voLipProgRef.current); });
  }

  var selectedModel = MODELS.find(function(m) { return m.key === model; }) || MODELS[2];
  var cost = calcCost(model, duration, genAudio);

  // ── Load credits + videos on mount ──
  useEffect(function() {
    fetch('/api/superscene/credits').then(function(r) { return r.json(); }).then(function(d) { setCredits(d.balance || 0); });
    fetch('/api/superscene/videos').then(function(r) { return r.json(); }).then(function(d) { setVideos(d.videos || []); });
    // Prefetch Credit Matrix data so Credits tab loads instantly
    fetch('/api/credit-matrix/packs').catch(function() {});
    fetch('/api/credit-matrix/my-matrix').catch(function() {});
    fetch('/api/credit-matrix/stats').catch(function() {});
    fetch('/api/credit-matrix/commissions').catch(function() {});
    fetch('/api/credit-matrix/team-activity').catch(function() {});
  }, []);

  // ── Polling ──
  var startPolling = useCallback(function(tid) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      fetch('/api/superscene/status/' + tid).then(function(r) { return r.json(); }).then(function(data) {
        if (data.status === 'completed' && data.video_url) {
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
          setVideoUrl(data.video_url);
          setGenStatus('done');
          setGenProgress(100);
          setGenerating(false);
          fetch('/api/superscene/credits').then(function(r) { return r.json(); }).then(function(d) { setCredits(d.balance || 0); });
          fetch('/api/superscene/videos').then(function(r) { return r.json(); }).then(function(d) { setVideos(d.videos || []); });
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
          setGenStatus('failed');
          setGenerating(false);
          alert('Generation failed: ' + (data.error || 'Unknown error'));
        }
      });
    }, 3000);
  }, []);

  useEffect(function() { return function() { [pollRef, fakeProgRef, imgProgRef, imgPollRef, musicPollRef, musicProgRef, voLipPollRef, voLipProgRef].forEach(function(r) { if (r.current) clearInterval(r.current); }); }; }, []);

  // ── Image upload ──
  function handleImageSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    var fd = new FormData();
    fd.append('file', file);
    fetch('/api/superscene/upload-image', { method: 'POST', body: fd })
      .then(function(r) { return r.json(); })
      .then(function(d) { setImageUrl(d.url || d.image_url); setUploading(false); })
      .catch(function() { setUploading(false); alert('Upload failed'); });
  }

  function clearImage() {
    setImageFile(null); setImagePreview(null); setImageUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function toggleMotion(key) {
    setMotionPresets(function(prev) {
      return prev.includes(key) ? prev.filter(function(k) { return k !== key; }) : prev.concat([key]);
    });
  }

  function toggleSeedLock() {
    if (seedLocked) { setSeedLocked(false); setSeedValue(null); }
    else { setSeedLocked(true); setSeedValue(Math.floor(Math.random() * 999999)); }
  }

  // ── Generate ──
  function generate() {
    if (!prompt.trim() || generating || credits < cost) return;
    if (mode === 'image' && !imageUrl) return;
    setGenerating(true);
    setVideoUrl(null);
    setGenStatus('pending');
    setGenProgress(0);

    fakeProgRef.current = setInterval(function() {
      setGenProgress(function(p) {
        if (p >= 85) { clearInterval(fakeProgRef.current); return p; }
        return p + Math.random() * 2 + 0.5;
      });
    }, 400);

    var finalPrompt = prompt;
    if (mode === 'image' && motionPresets.length > 0) {
      var motionText = motionPresets.map(function(k) { var m = CAMERA_MOTIONS.find(function(cm) { return cm.key === k; }); return m ? m.prompt : ''; }).filter(Boolean).join(', ');
      finalPrompt = motionText + ', ' + prompt;
    }

    var payload = { model_key: model, prompt: finalPrompt, duration: duration, ratio: ratio, resolution: resolution, generate_audio: genAudio };
    if (negPrompt.trim()) payload.negative_prompt = negPrompt.trim();
    if (mode === 'image' && imageUrl) payload.image_urls = [imageUrl];
    if (seedLocked && seedValue !== null) payload.seed = seedValue;

    fetch('/api/superscene/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.task_id) {
        setTaskId(data.task_id);
        setCredits(data.credits_remaining);
        startPolling(data.task_id);
      } else {
        alert(data.detail || data.error || 'Generation failed');
        setGenerating(false);
        clearInterval(fakeProgRef.current);
      }
    }).catch(function() {
      alert('Network error — please try again');
      setGenerating(false);
      clearInterval(fakeProgRef.current);
    });
  }

  // ── Download helper ──
  function downloadVideo(url, filename) {
    var fname = filename || 'creative-studio-' + Date.now() + '.mp4';
    fetch(url).then(function(r) { return r.blob(); }).then(function(blob) {
      var blobUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }).catch(function() {
      // Fallback — open in new tab
      window.open(url, '_blank');
    });
  }

  // ── Model change handler ──
  function changeModel(key) {
    setModel(key);
    var m = MODELS.find(function(x) { return x.key === key; });
    if (m) {
      if (!m.audio) setGenAudio(false);
      if (!m.durations.includes(duration)) setDuration(m.durations[Math.floor(m.durations.length / 2)]);
      if (!m.resolutions.includes(resolution)) setResolution(m.resolutions[m.resolutions.length - 1]);
    }
  }

  // ── Stage: fixed height container, inner canvas adapts to selected ratio ──

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════
  return (
    <AppLayout title={t("creativeStudio.title")} subtitle={t("creativeStudio.subtitle")}>

      <div className="cs-page">

        {/* ── Tab Bar + Credits (Platform Tour style — directly under AppLayout) ── */}
        <div className="cs-tab-bar">
          <div className="cs-tabs">
            {TABS.map(function(t) {
              return <button key={t.key} className={'cs-tab' + (tab === t.key ? ' active' : '')} onClick={function() { switchTab(t.key); }}>
                <TabIcon type={t.icon}/> {t.label}
              </button>;
            })}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingLeft: 16 }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: '#4ade80' }}>{credits}</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>credits</span>
            <button className="cs-credits-buy" onClick={function() { switchTab('credits'); }}>+ Buy</button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="cs-main">

          {/* ═══ VIDEO CLIPS TAB ═══ */}
          {tab === 'video-clips' && <>

            {/* Video Stage — fixed height, inner canvas adapts to ratio */}
            <div className="cs-stage">
              <div className={'cs-stage-inner r-' + ratio.replace(':', 'x')}>
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop/>
              ) : generating ? (
                <div className="cs-stage-empty">
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
                  <p style={{ color: 'rgba(255,255,255,.5)' }}>Generating your video...</p>
                  <small style={{ color: 'rgba(255,255,255,.25)' }}>{Math.round(genProgress)}% — please wait</small>
                </div>
              ) : mode === 'image' && imagePreview ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img src={imagePreview} alt="Preview"/>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '48px 24px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,.85))' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Your image</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                      {motionPresets.length > 0 ? 'Motion: ' + motionPresets.map(function(k) { var m = CAMERA_MOTIONS.find(function(cm) { return cm.key === k; }); return m ? m.label : ''; }).join(', ') : 'Write a prompt and hit Create'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cs-stage-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><rect x="2" y="4" width="20" height="14" rx="3"/><polygon points="10,8 10,15 16,11.5"/></svg>
                  <p>{t('creativeStudio.videoWillAppear')}</p>
                  <small>Write a prompt, choose a model, and hit Create</small>
                </div>
              )}
              </div>
            </div>

            {/* Progress bar (when generating) */}
            {generating && <div className="cs-progress-wrap">
              <div className="cs-progress"><div className="cs-progress-bar" style={{ width: genProgress + '%' }}/></div>
              <div className="cs-progress-status">Generating... {Math.round(genProgress)}%</div>
            </div>}

            {/* Stage actions (when video ready) */}
            {videoUrl && <div className="cs-stage-actions">
              <button className="cs-sa-btn" onClick={function() { downloadVideo(videoUrl); }}>⬇ Download</button>
              <button className="cs-sa-btn" onClick={function() { setVideoUrl(null); setGenStatus(null); setGenProgress(0); }}>✕ Clear</button>
            </div>}

            {/* ── Controls ── */}
            <div className="cs-controls">

              {/* Mode toggle */}
              <div className="cs-mode">
                <button className={mode === 'text' ? 'on' : ''} onClick={function() { setMode('text'); }}>{t('creativeStudio.textToVideo')}</button>
                <button className={mode === 'image' ? 'on' : ''} onClick={function() { setMode('image'); }}>{t('creativeStudio.imageToVideo')}</button>
              </div>

              {/* Row 1: Prompt + Model */}
              <div className="cs-row">
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.prompt")}</div>
                  <textarea className="cs-ta" rows={3} value={prompt} onChange={function(e) { setPrompt(e.target.value.slice(0, 2000)); }}
                    placeholder={mode === 'image' ? 'Describe how this image should move — e.g. slow zoom in, camera orbits...' : 'A cinematic drone shot over a misty mountain valley at golden hour...'}/>
                  <div className="cs-ta-foot">
                    <span className="cs-ta-ai">✦ AI Builder</span>
                    <span className="cs-ta-ct">{prompt.length}/2000</span>
                  </div>
                </div>

                <div className="cs-card">
                  <div className="cs-lbl">AI Model</div>
                  <div className="cs-model-list">
                    {MODELS.map(function(m) {
                      var isSel = model === m.key;
                      return <div key={m.key} className={'cs-model' + (isSel ? ' sel' : '')} onClick={function() { changeModel(m.key); }}>
                        <div className="cs-model-dot" style={{ background: 'linear-gradient(135deg,' + m.color + ',' + m.color + '88)' }}>✦</div>
                        <div style={{ flex: 1 }}>
                          <div className="cs-model-name">{m.name}</div>
                          <div className="cs-model-desc">{m.desc}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="cs-model-badge" style={{ background: m.color + '22', color: m.color }}>{m.badge}</span>
                          <div className="cs-model-price">{m.cost} cr/5s</div>
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              </div>

              {/* Camera Motion (Image mode only) */}
              {mode === 'image' && <div className="cs-card" style={{ marginBottom: 16 }}>
                <div className="cs-lbl">{t("creativeStudio.cameraMotion")}</div>
                <div className="cs-motion-grid">
                  {CAMERA_MOTIONS.map(function(m) {
                    var isOn = motionPresets.includes(m.key);
                    return <button key={m.key} className={'cs-motion-card' + (isOn ? ' on' : '')} onClick={function() { toggleMotion(m.key); }}>
                      <span className="cs-motion-icon">{m.icon}</span>
                      <span className="cs-motion-label">{m.label}</span>
                    </button>;
                  })}
                </div>
              </div>}

              {/* Row 2: Ratio + Duration/Resolution + Image Upload */}
              <div className="cs-row-3">
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.aspectRatio")}</div>
                  <div className="cs-pills">
                    {RATIOS.map(function(r) {
                      return <button key={r.key} className={'cs-pill' + (ratio === r.key ? ' on' : '')} onClick={function() { setRatio(r.key); }}>{r.key}</button>;
                    })}
                  </div>
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.durationResolution")}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="cs-sel" style={{ flex: 1 }} value={duration} onChange={function(e) { setDuration(Number(e.target.value)); }}>
                      {selectedModel.durations.map(function(d) { return <option key={d} value={d}>{d} seconds</option>; })}
                    </select>
                    <select className="cs-sel" style={{ flex: 1 }} value={resolution} onChange={function(e) { setResolution(e.target.value); }}>
                      {selectedModel.resolutions.map(function(r) { return <option key={r} value={r}>{r}</option>; })}
                    </select>
                  </div>
                  {/* Audio toggle */}
                  {selectedModel.audio && <div className="cs-audio-toggle" style={{ marginTop: 10 }} onClick={function() { setGenAudio(!genAudio); }}>
                    <div className={'cs-toggle-track' + (genAudio ? ' on' : '')}><div className="cs-toggle-thumb"/></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>AI Audio (+{AUDIO_EXTRA_PER_5S} cr/5s)</div>
                  </div>}
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.referenceImage")} <span className="cs-lbl-badge">{t('creativeStudio.optional')}</span></div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect}/>
                  {imagePreview ? (
                    <div className="cs-img-preview">
                      <img src={imagePreview} alt="Preview" className="cs-img-thumb"/>
                      <div className="cs-img-overlay">
                        {uploading ? <span className="cs-img-status">Uploading…</span> : <span className="cs-img-status cs-img-ok">✓ Ready</span>}
                        <button className="cs-img-remove" onClick={clearImage}>✕ Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="cs-upload" onClick={function() { if (fileRef.current) fileRef.current.click(); }}>
                      <div className="cs-upload-plus">+</div>
                      <div className="cs-upload-text">{t('creativeStudio.dropImage')}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Negative prompt + Seed */}
              <div className="cs-row">
                {selectedModel.negPrompt && <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.negativePrompt")} <span className="cs-lbl-badge">{t('creativeStudio.optional')}</span></div>
                  <textarea className="cs-neg-ta" rows={2} value={negPrompt} onChange={function(e) { setNegPrompt(e.target.value.slice(0, 500)); }}
                    placeholder={t("creativeStudio.negativePromptPlaceholder")}/>
                </div>}
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.seed")}</div>
                  <div className="cs-seed">
                    <div className={'cs-seed-lock' + (seedLocked ? ' on' : '')} onClick={toggleSeedLock}>{seedLocked ? '🔒' : '🔓'}</div>
                    <div>
                      <div className="cs-seed-lbl">{t("creativeStudio.seed")}</div>
                      <div className="cs-seed-val">{seedLocked ? seedValue : 'Random'}</div>
                    </div>
                    {seedLocked && <button className="cs-seed-refresh" onClick={function() { setSeedValue(Math.floor(Math.random() * 999999)); }}>↻</button>}
                  </div>
                </div>
              </div>

            </div>

            {/* Generate Button */}
            <div className="cs-gen-row">
              <button className="cs-gen-btn" onClick={generate}
                disabled={!prompt.trim() || generating || credits < cost || (mode === 'image' && !imageUrl)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                {generating ? 'Generating...' : !prompt.trim() ? 'Enter a prompt' : mode === 'image' && !imageUrl ? 'Upload an image' : credits < cost ? 'Not enough credits' : 'Create Video'}
              </button>
              <div className="cs-gen-info">
                <b>{cost} credits</b>
                {credits} remaining
              </div>
            </div>

            {/* Recent Gallery */}
            {videos.filter(function(v) { return v.status === 'completed' && v.video_url; }).length > 0 && <div className="cs-recent">
              <div className="cs-recent-label">{t('creativeStudio.recent')}</div>
              <div className="cs-recent-grid">
                {videos.filter(function(v) { return v.status === 'completed' && v.video_url; }).slice(0, 10).map(function(v) {
                  return <div key={v.id} className="cs-recent-thumb" onClick={function() { setVideoUrl(v.video_url); setGenStatus('done'); }}>
                    <video src={v.video_url} muted preload="metadata"/>
                  </div>;
                })}
              </div>
            </div>}

            {/* Profit Nexus Earnings Banner */}
            <div className="cs-matrix-banner">
              <div className="cs-matrix-banner-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#8b5cf6"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#a78bfa"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#a78bfa"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#8b5cf6"/>
                </svg>
              </div>
              <div className="cs-matrix-banner-text">
                <div className="cs-matrix-banner-title">{t('creativeStudio.nexusBannerTitle')}</div>
                <div className="cs-matrix-banner-desc">{t('creativeStudio.nexusBannerDesc')}</div>
              </div>
              <a href="/credit-matrix" className="cs-matrix-banner-link">{t('creativeStudio.viewNexus')}</a>
            </div>

          </>}

          {/* ═══ PLACEHOLDER TABS ═══ */}
          {/* ═══ FULL VIDEO TAB — embedded Video Creator ═══ */}
          {tab === 'full-video' && <VideoCreatorContent />}

          {/* ═══ IMAGES TAB ═══ */}
          {tab === 'images' && <>

            {/* Image Preview Stage */}
            <div className="cs-stage" style={{ background: imgResults.length > 0 ? 'transparent' : '#0a0f1e' }}>
              {imgGenerating ? (
                <div className="cs-stage-empty">
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
                  <p style={{ color: 'rgba(255,255,255,.5)' }}>Generating {imgBatch > 1 ? imgBatch + ' images' : 'image'}...</p>
                  <small style={{ color: 'rgba(255,255,255,.25)' }}>{selectedImgModel.name} · {imgQuality} · {imgSize}</small>
                </div>
              ) : imgResults.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, padding: 12, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {imgResults.map(function(url, i) {
                    return <div key={i} style={{ flex: imgResults.length === 1 ? '1' : '0 0 48%', maxHeight: '100%', position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                      <img src={url} alt={'Generated ' + (i+1)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: 10 }}/>
                    </div>;
                  })}
                </div>
              ) : (
                <div className="cs-stage-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <p>{t('creativeStudio.imageWillAppear')}</p>
                  <small>Choose a model, describe what you want, and generate</small>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {imgGenerating && <div className="cs-progress-wrap">
              <div className="cs-progress"><div className="cs-progress-bar" style={{ width: imgProgress + '%' }}/></div>
              <div className="cs-progress-status">Generating... {Math.round(imgProgress)}%</div>
            </div>}

            {/* Image actions */}
            {imgResults.length > 0 && !imgGenerating && <div className="cs-stage-actions">
              {imgResults.map(function(url, i) {
                return <button key={i} className="cs-sa-btn" onClick={function() { downloadVideo(url, 'creative-studio-image-' + Date.now() + '.png'); }}>⬇ {imgResults.length > 1 ? 'Image ' + (i+1) : 'Download'}</button>;
              })}
              <button className="cs-sa-btn" onClick={function() { setImgResults([]); }}>✕ Clear</button>
            </div>}

            {/* Controls */}
            <div className="cs-controls">
              <div className="cs-row">
                {/* Prompt */}
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.prompt")}</div>
                  <textarea className="cs-ta" rows={4} value={imgPrompt} onChange={function(e) { setImgPrompt(e.target.value.slice(0, 2000)); }}
                    placeholder="A professional product photo of wireless earbuds on a marble surface, soft studio lighting, shallow depth of field, 8K, photorealistic"/>
                  <div className="cs-ta-foot">
                    <span className="cs-ta-ai">✦ AI Builder</span>
                    <span className="cs-ta-ct">{imgPrompt.length}/2000</span>
                  </div>
                </div>

                {/* Model */}
                <div className="cs-card">
                  <div className="cs-lbl">AI Model</div>
                  <div className="cs-model-list">
                    {IMG_MODELS.map(function(m) {
                      var isSel = imgModel === m.key;
                      return <div key={m.key} className={'cs-model' + (isSel ? ' sel' : '')} onClick={function() { setImgModel(m.key); }}>
                        <div className="cs-model-dot" style={{ background: 'linear-gradient(135deg,' + m.color + ',' + m.color + '88)' }}>✦</div>
                        <div style={{ flex: 1 }}>
                          <div className="cs-model-name">{m.name}</div>
                          <div className="cs-model-desc">{m.desc}</div>
                        </div>
                        {m.badge && <span className="cs-model-badge" style={{ background: m.color + '22', color: m.color }}>{m.badge}</span>}
                      </div>;
                    })}
                  </div>
                </div>
              </div>

              <div className="cs-row-3">
                {/* Aspect Ratio */}
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.aspectRatio")}</div>
                  <div className="cs-pills">
                    {['1:1', '16:9', '9:16', '4:3'].map(function(r) {
                      return <button key={r} className={'cs-pill' + (imgSize === r ? ' on' : '')} onClick={function() { setImgSize(r); }}>{r}</button>;
                    })}
                  </div>
                </div>

                {/* Quality + Batch */}
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.quality")}</div>
                  <div className="cs-pills" style={{ marginBottom: 10 }}>
                    {IMG_QUALITIES.map(function(q) {
                      return <button key={q} className={'cs-pill' + (imgQuality === q ? ' on' : '')} onClick={function() { setImgQuality(q); }}>
                        {q} <span style={{ fontSize: 10, opacity: .6, marginLeft: 4 }}>{IMG_CREDIT_MAP[q]}cr</span>
                      </button>;
                    })}
                  </div>
                  <div className="cs-lbl">{t("creativeStudio.numberOfImages")}</div>
                  <div className="cs-pills">
                    {[1, 2, 4].map(function(n) {
                      return <button key={n} className={'cs-pill' + (imgBatch === n ? ' on' : '')} onClick={function() { setImgBatch(n); }}>
                        {n} {n === 1 ? 'image' : 'images'}
                      </button>;
                    })}
                  </div>
                </div>

                {/* Negative Prompt + Seed */}
                <div className="cs-card">
                  <div className="cs-lbl">{t("creativeStudio.negativePrompt")} <span className="cs-lbl-badge">{t('creativeStudio.optional')}</span></div>
                  <textarea className="cs-neg-ta" rows={2} value={imgNegPrompt} onChange={function(e) { setImgNegPrompt(e.target.value.slice(0, 500)); }}
                    placeholder={t("creativeStudio.negativePromptPlaceholder")}/>
                  <div className="cs-lbl" style={{ marginTop: 10 }}>{t("creativeStudio.seed")}</div>
                  <div className="cs-seed">
                    <div className={'cs-seed-lock' + (seedLocked ? ' on' : '')} onClick={toggleSeedLock}>{seedLocked ? '🔒' : '🔓'}</div>
                    <div>
                      <div className="cs-seed-lbl">{t("creativeStudio.seed")}</div>
                      <div className="cs-seed-val">{seedLocked ? seedValue : 'Random'}</div>
                    </div>
                    {seedLocked && <button className="cs-seed-refresh" onClick={function() { setSeedValue(Math.floor(Math.random() * 999999)); }}>↻</button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate */}
            <div className="cs-gen-row">
              <button className="cs-gen-btn" onClick={generateImage}
                disabled={!imgPrompt.trim() || imgGenerating || credits < imgCost}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                {imgGenerating ? 'Generating...' : !imgPrompt.trim() ? 'Enter a prompt' : credits < imgCost ? 'Not enough credits' : 'Generate ' + (imgBatch > 1 ? imgBatch + ' Images' : 'Image')}
              </button>
              <div className="cs-gen-info">
                <b>{imgCost} credits</b>
                {credits} remaining
              </div>
            </div>
          </>}

          {/* ═══ MUSIC TAB ═══ */}
          {tab === 'music' && <>
            <div className="cs-stage" style={{ background: '#0a0f1e' }}>
              {musicGenerating ? (
                <div className="cs-stage-empty">
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
                  <p style={{ color: 'rgba(255,255,255,.5)' }}>Generating your track...</p>
                  <small style={{ color: 'rgba(255,255,255,.25)' }}>{(MUSIC_MODELS.find(function(m) { return m.key === musicModel; }) || {}).name} · {musicInstrumental ? 'Instrumental' : 'Vocal'}</small>
                </div>
              ) : musicUrl ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>♪</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Your track is ready</div>
                  <audio src={musicUrl} controls style={{ width: '100%', maxWidth: 500 }}/>
                </div>
              ) : (
                <div className="cs-stage-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <p>{t('creativeStudio.musicWillAppear')}</p>
                  <small>{t('creativeStudio.musicDesc')}</small>
                </div>
              )}
            </div>
            {musicGenerating && <div className="cs-progress-wrap"><div className="cs-progress"><div className="cs-progress-bar" style={{ width: musicProgress + '%' }}/></div><div className="cs-progress-status">Generating... {Math.round(musicProgress)}%</div></div>}
            {musicUrl && !musicGenerating && <div className="cs-stage-actions">
              <button className="cs-sa-btn" onClick={function() { downloadVideo(musicUrl, 'creative-studio-music-' + Date.now() + '.mp3'); }}>⬇ Download MP3</button>
              <button className="cs-sa-btn" onClick={function() { setMusicUrl(null); }}>✕ Clear</button>
            </div>}
            <div className="cs-controls">
              <div className="cs-mode" style={{ maxWidth: 280 }}>
                <button className={musicCustom ? '' : 'on'} onClick={function() { setMusicCustom(false); }}>{t('creativeStudio.simpleMode')}</button>
                <button className={musicCustom ? 'on' : ''} onClick={function() { setMusicCustom(true); }}>{t('creativeStudio.customMode')}</button>
              </div>
              <div className="cs-row">
                <div className="cs-card">
                  <div className="cs-lbl">{musicCustom ? 'Lyrics' : 'Describe your music'}</div>
                  <textarea className="cs-ta" rows={musicCustom ? 8 : 4} value={musicPrompt} onChange={function(e) { setMusicPrompt(e.target.value); }}
                    placeholder={musicCustom ? '[Verse]\nWalking down the road...\n\n[Chorus]\nHere we go again...' : 'Upbeat pop song for Instagram Reels, energetic and fun'}/>
                  {musicCustom && <div className="cs-ta-foot">
                    <button style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', border: '1px solid #e9e5ff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }} onClick={generateLyrics} disabled={lyricsGenerating}>{lyricsGenerating ? 'Writing...' : '✦ AI Lyrics Writer'}</button>
                    <span className="cs-ta-ct">{musicPrompt.length}/3000</span>
                  </div>}
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">Model</div>
                  <div className="cs-pills" style={{ marginBottom: 12 }}>
                    {MUSIC_MODELS.map(function(m) { return <button key={m.key} className={'cs-pill' + (musicModel === m.key ? ' on' : '')} onClick={function() { setMusicModel(m.key); }}>{m.name} {m.badge ? '· ' + m.badge : ''} <span style={{ fontSize: 10, opacity: .6, marginLeft: 4 }}>{m.cost}cr</span></button>; })}
                  </div>
                  {musicCustom && <>
                    <div className="cs-lbl">Style</div>
                    <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }} placeholder="pop, rock, electronic, jazz..." value={musicStyle} onChange={function(e) { setMusicStyle(e.target.value); }}/>
                    <div className="cs-lbl">Title</div>
                    <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }} placeholder="Song title" value={musicTitle} onChange={function(e) { setMusicTitle(e.target.value); }}/>
                    <div className="cs-lbl">Vocal Gender</div>
                    <div className="cs-pills">
                      {[['', 'Auto'], ['m', 'Male'], ['f', 'Female']].map(function(g) { return <button key={g[0]} className={'cs-pill' + (musicGender === g[0] ? ' on' : '')} onClick={function() { setMusicGender(g[0]); }}>{g[1]}</button>; })}
                    </div>
                  </>}
                  <div style={{ marginTop: 12 }}>
                    <div className="cs-lbl">Instrumental</div>
                    <div className="cs-audio-toggle" onClick={function() { setMusicInstrumental(!musicInstrumental); }}>
                      <div className={'cs-toggle-track' + (musicInstrumental ? ' on' : '')}><div className="cs-toggle-thumb"/></div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>No vocals — background music only</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="cs-gen-row">
              <button className="cs-gen-btn" onClick={generateMusic} disabled={!musicPrompt.trim() || musicGenerating || credits < musicCost}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                {musicGenerating ? 'Generating...' : !musicPrompt.trim() ? 'Enter a description' : credits < musicCost ? 'Not enough credits' : '♪ Generate Music'}
              </button>
              <div className="cs-gen-info"><b>{musicCost} credits</b>{credits} remaining</div>
            </div>
          </>}

          {/* ═══ VOICEOVER TAB ═══ */}
          {tab === 'voiceover' && <>
            <div className="cs-stage" style={{ background: '#0a0f1e' }}>
              {voGenerating ? (
                <div className="cs-stage-empty">
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#ec4899', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
                  <p style={{ color: 'rgba(255,255,255,.5)' }}>Generating voiceover...</p>
                </div>
              ) : voAudioUrl ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎙</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Voiceover Ready</div>
                  <audio src={voAudioUrl} controls style={{ width: '100%', maxWidth: 500 }}/>
                </div>
              ) : (
                <div className="cs-stage-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  <p>Your voiceover will appear here</p>
                  <small>Write a script, pick a voice, and generate</small>
                </div>
              )}
            </div>
            {voAudioUrl && !voGenerating && <div className="cs-stage-actions">
              <button className="cs-sa-btn" onClick={function() { downloadVideo(voAudioUrl, 'creative-studio-voiceover-' + Date.now() + '.mp3'); }}>⬇ Download MP3</button>
              <button className="cs-sa-btn" onClick={function() { setVoAudioUrl(null); setVoLipSyncUrl(null); }}>✕ Clear</button>
            </div>}
            <div className="cs-controls">
              <div className="cs-row">
                <div className="cs-card">
                  <div className="cs-lbl">① Script</div>
                  <textarea className="cs-ta" rows={6} value={voText} onChange={function(e) { setVoText(e.target.value); }}
                    placeholder="Type your voiceover script here... e.g. Welcome to SuperAdPro, the platform where your creativity pays."/>
                  <div className="cs-ta-foot"><span/><span className="cs-ta-ct">{voText.length}/5000</span></div>
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">② Voice <span className="cs-lbl-badge">{VO_VOICES.length} voices</span></div>
                  <div className="cs-model-list" style={{ maxHeight: 340 }}>
                    {VO_CATEGORIES.map(function(cat) {
                      var catVoices = VO_VOICES.filter(function(v) { return v.cat === cat; });
                      if (!catVoices.length) return null;
                      return <div key={cat}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px', padding: '8px 0 4px', borderTop: cat !== 'American' ? '1px solid #f1f5f9' : 'none', marginTop: cat !== 'American' ? 4 : 0 }}>{cat}</div>
                        {catVoices.map(function(v) {
                          var isSel = voVoice === v.id;
                          var isPlaying = voPreviewPlaying === v.id;
                          return <div key={v.id} className={'cs-model' + (isSel ? ' sel' : '')} onClick={function() { setVoVoice(v.id); }}>
                            <div className="cs-model-dot" style={{ background: v.gender === 'M' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'linear-gradient(135deg,#f472b6,#ec4899)' }}>{v.gender === 'M' ? '♂' : '♀'}</div>
                            <div style={{ flex: 1 }}>
                              <div className="cs-model-name">{v.name}</div>
                              <div className="cs-model-desc">{v.desc}</div>
                            </div>
                            <div onClick={function(e) { e.stopPropagation(); previewVoice(v.id); }}
                              style={{ width: 28, height: 28, borderRadius: 7, background: isPlaying ? '#ede9fe' : '#f8fafc', border: '1px solid ' + (isPlaying ? '#8b5cf6' : '#e2e8f0'), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: isPlaying ? '#8b5cf6' : '#94a3b8', flexShrink: 0 }}
                              title={isPlaying ? 'Stop preview' : 'Preview voice'}>{isPlaying ? '■' : '▶'}</div>
                          </div>;
                        })}
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="cs-gen-row">
              <button className="cs-gen-btn" onClick={generateVoiceover} disabled={!voText.trim() || voGenerating}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                {voGenerating ? 'Generating...' : !voText.trim() ? 'Enter a script' : '🎙 Generate Voiceover'}
              </button>
              <div className="cs-gen-info"><b>Free</b>No credits required</div>
            </div>
          </>}

          {/* ═══ LIP SYNC TAB ═══ */}
          {tab === 'lip-sync' && <>
            <div className="cs-stage" style={{ background: '#0a0f1e' }}>
              {voLipSyncing ? (
                <div className="cs-stage-empty">
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
                  <p style={{ color: 'rgba(255,255,255,.5)' }}>Creating talking avatar...</p>
                  <small style={{ color: 'rgba(255,255,255,.25)' }}>{Math.round(voLipSyncProgress)}%</small>
                </div>
              ) : voLipSyncUrl ? (
                <div className="cs-stage-inner r-16x9"><video src={voLipSyncUrl} controls autoPlay loop/></div>
              ) : (
                <div className="cs-stage-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  <p>Your talking avatar will appear here</p>
                  <small>Upload a photo, provide audio, and generate</small>
                </div>
              )}
            </div>
            {voLipSyncing && <div className="cs-progress-wrap"><div className="cs-progress"><div className="cs-progress-bar" style={{ width: voLipSyncProgress + '%' }}/></div><div className="cs-progress-status">Generating... {Math.round(voLipSyncProgress)}%</div></div>}
            {voLipSyncUrl && !voLipSyncing && <div className="cs-stage-actions">
              <button className="cs-sa-btn" onClick={function() { downloadVideo(voLipSyncUrl, 'creative-studio-avatar-' + Date.now() + '.mp4'); }}>⬇ Download Video</button>
              <button className="cs-sa-btn" onClick={function() { setVoLipSyncUrl(null); }}>✕ Clear</button>
            </div>}
            <div className="cs-controls">
              <div className="cs-row-3">
                <div className="cs-card">
                  <div className="cs-lbl">① Person Photo</div>
                  <input ref={voImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleVoImageUpload}/>
                  {voImageUrl ? (
                    <div className="cs-img-preview">
                      <img src={voImageUrl} alt="Avatar" className="cs-img-thumb"/>
                      <div className="cs-img-overlay">
                        <span className="cs-img-status cs-img-ok">✓ Ready</span>
                        <button className="cs-img-remove" onClick={function() { setVoImageUrl(null); }}>✕ Change</button>
                      </div>
                    </div>
                  ) : (
                    <div className="cs-upload" onClick={function() { if (voImageInputRef.current) voImageInputRef.current.click(); }}>
                      <div className="cs-upload-plus">📷</div>
                      <div className="cs-upload-text">Upload a photo of a person</div>
                    </div>
                  )}
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">② Audio Source</div>
                  {voAudioUrl ? (
                    <div>
                      <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>✓ Voiceover ready</div>
                      <audio src={voAudioUrl} controls style={{ width: '100%' }}/>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Generated from the Voiceover tab</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
                      <div style={{ marginBottom: 8 }}>No audio yet</div>
                      <button style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', border: '1px solid #e9e5ff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }} onClick={function() { switchTab('voiceover'); }}>Go to Voiceover tab →</button>
                    </div>
                  )}
                </div>
                <div className="cs-card">
                  <div className="cs-lbl">③ Generate</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>Upload a person photo and create a voiceover first. Then generate a talking avatar video synced to the audio.</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Cost: <b style={{ color: '#0f172a' }}>8 credits</b></div>
                </div>
              </div>
            </div>
            <div className="cs-gen-row">
              <button className="cs-gen-btn" onClick={generateLipSync} disabled={!voAudioUrl || !voImageUrl || voLipSyncing}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                {voLipSyncing ? 'Generating...' : !voImageUrl ? 'Upload a photo first' : !voAudioUrl ? 'Create a voiceover first' : '🎬 Generate Talking Avatar'}
              </button>
              <div className="cs-gen-info"><b>8 credits</b>{credits} remaining</div>
            </div>
          </>}

          {/* ═══ GALLERY TAB ═══ */}
          {tab === 'gallery' && <>
            <div className="cs-controls">
              <div className="cs-lbl" style={{ marginBottom: 16 }}>Recent Video Clips</div>
              {videos.filter(function(v) { return v.status === 'completed' && v.video_url; }).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {videos.filter(function(v) { return v.status === 'completed' && v.video_url; }).map(function(v) {
                    return <div key={v.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                      <video src={v.video_url} muted preload="metadata" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', cursor: 'pointer' }} onClick={function() { switchTab('video-clips'); setVideoUrl(v.video_url); setGenStatus('done'); }}/>
                      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{v.model || 'Video'}</span>
                        <button className="cs-sa-btn" style={{ padding: '4px 8px', fontSize: 10 }} onClick={function() { downloadVideo(v.video_url); }}>⬇</button>
                      </div>
                    </div>;
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: .3 }}>📁</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>No content yet</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Start creating videos, images, and music to see them here</div>
                </div>
              )}
            </div>
          </>}

          {/* ═══ CREDITS TAB — embedded Profit Nexus ═══ */}
          {tab === 'credits' && <CreditMatrixContent />}

        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  );
}
