import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import CryptoCheckout from "../../components/CryptoCheckout";
import "./superscene.css";

// ── Constants ──────────────────────────────────────────────
// Quality tiers — users pick these instead of specific models
// Model definitions — real names, real descriptions, real costs
const MODELS = [
  // Sorted by price: Budget → Standard → Premium → Ultra
  // Prices are user-facing (100% markup on provider cost = 50% margin)
  { key: "wan26",      name: "WAN 2.6",          desc: "Budget-friendly, good quality",        badge: "CHEAPEST", cost: 1,  color: "#10b981", i2v: true,  audio: false, negPrompt: false, durations: [3,5,8],           resolutions: ["480p","720p"],          durationLabel: "3-8s",   pricePer10s: "$0.50",  tier: "budget" },
  { key: "hailuo23",   name: "Hailuo 2.3",       desc: "Fast drafts, quick iterations",        badge: "FAST",     cost: 1,  color: "#6366f1", i2v: true,  audio: false, negPrompt: false, durations: [6,10],            resolutions: ["768p","1080p"],         durationLabel: "6/10s",  pricePer10s: "$0.60",  tier: "budget" },
  { key: "seedance",   name: "Seedance 1.5 Pro", desc: "Great quality + native audio",         badge: "VALUE",    cost: 2,  color: "#fb923c", i2v: true,  audio: true,  negPrompt: false, durations: [4,5,8,10,12],     resolutions: ["480p","720p","1080p"],  durationLabel: "4-12s",  pricePer10s: "$1.00",  tier: "standard" },
  { key: "kling3",     name: "Kling 3.0",        desc: "Cinematic realism, smooth motion",     badge: "POPULAR",  cost: 3,  color: "#22d3ee", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15],     resolutions: ["720p","1080p"],         durationLabel: "3-15s",  pricePer10s: "$1.20",  tier: "standard" },
  { key: "grok-video", name: "Grok Imagine",     desc: "Creative with built-in audio",         badge: "AUDIO",    cost: 4,  color: "#ef4444", i2v: true,  audio: false, negPrompt: false, durations: [6,10],            resolutions: ["480p","720p"],          durationLabel: "6/10s",  pricePer10s: "$1.40",  tier: "standard" },
  { key: "veo31",      name: "VEO 3.1 Fast",     desc: "Google, fast + fine detail",           badge: "NEW",      cost: 3,  color: "#38bdf8", i2v: true,  audio: false, negPrompt: false, durations: [4,6,8],           resolutions: ["720p","1080p","4K"],    durationLabel: "4/6/8s", pricePer10s: "$1.60",  tier: "standard" },
  { key: "kling-o3",   name: "Kling O3",         desc: "Next-gen, exceptional detail",         badge: "BEST",     cost: 5,  color: "#8b5cf6", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15],     resolutions: ["720p","1080p"],         durationLabel: "3-15s",  pricePer10s: "$2.00",  tier: "premium" },
  { key: "sora2",      name: "Sora 2 Pro",       desc: "OpenAI flagship, photorealistic",      badge: "PREMIUM",  cost: 8,  color: "#a78bfa", i2v: true,  audio: false, negPrompt: false, durations: [4,8,12],          resolutions: ["720p","1080p"],         durationLabel: "4/8/12s",pricePer10s: "$3.00",  tier: "premium" },
  { key: "sora2-max",  name: "Sora 2 Max",       desc: "No watermark, premium OpenAI",         badge: "PRO",      cost: 10, color: "#c084fc", i2v: false, audio: false, negPrompt: false, durations: [10,15],           resolutions: ["720p","1080p"],         durationLabel: "10/15s", pricePer10s: "$4.00",  tier: "ultra" },
  { key: "veo31-pro",  name: "VEO 3.1 Pro 4K",   desc: "Maximum quality, 4K + audio",          badge: "4K",       cost: 15, color: "#f59e0b", i2v: true,  audio: true,  negPrompt: false, durations: [4,6,8],           resolutions: ["720p","1080p","4K"],    durationLabel: "4/6/8s", pricePer10s: "$8.00",  tier: "ultra" },
];

const PROMPT_SUGGESTIONS = [
  { cat: "Cinematic", text: "A cinematic aerial drone shot gliding over a misty mountain lake at golden hour, slow camera pan" },
  { cat: "Cinematic", text: "A lone astronaut standing on Mars, dust particles floating in orange light, photorealistic wide shot" },
  { cat: "Cinematic", text: "A samurai warrior in a bamboo forest, wind blowing his cloak, god rays through the canopy" },
  { cat: "Cinematic", text: "Underwater coral reef with tropical fish, volumetric light rays, BBC documentary style" },
  { cat: "Cinematic", text: "A lighthouse on a rocky cliff during a dramatic storm, crashing waves, dark clouds, lightning" },
  { cat: "Product", text: "Close-up of a barista pouring latte art, warm cafe lighting, shallow depth of field, 4K" },
  { cat: "Product", text: "A luxury watch rotating slowly on a dark marble surface, studio lighting, reflections" },
  { cat: "Product", text: "Wireless earbuds floating in mid-air, holographic light effects, minimalist dark background" },
  { cat: "Product", text: "A perfume bottle with golden liquid, slow motion splash, elegant studio lighting" },
  { cat: "Nature", text: "A golden retriever puppy running through autumn leaves, slow motion, warm afternoon light" },
  { cat: "Nature", text: "Time-lapse of a flower blooming, macro lens, studio lighting, black background" },
  { cat: "Nature", text: "Northern lights dancing over a frozen lake, slow camera movement, timelapse stars" },
  { cat: "Nature", text: "A hummingbird hovering at a flower, extreme close-up, 4K nature documentary" },
  { cat: "Urban", text: "A futuristic cyberpunk city at night, neon reflections on wet streets, camera dolly forward" },
  { cat: "Urban", text: "Busy Tokyo street crossing at sunset, cinematic slow motion, shallow depth of field" },
  { cat: "Urban", text: "Aerial flyover of New York City skyline at golden hour, smooth helicopter shot" },
  { cat: "Urban", text: "A neon-lit alleyway in Hong Kong, steam rising from vents, moody atmosphere" },
  { cat: "People", text: "A confident professional woman walking through a sunlit modern office, tracking shot" },
  { cat: "People", text: "A chef preparing sushi with precise movements, top-down camera, warm restaurant lighting" },
  { cat: "People", text: "A dancer performing contemporary dance in an empty warehouse, dramatic side lighting" },
  { cat: "People", text: "A musician playing piano in a grand concert hall, cinematic push-in, emotional lighting" },
  { cat: "Abstract", text: "Liquid gold flowing in slow motion, abstract macro, high-speed camera, black background" },
  { cat: "Abstract", text: "Colourful ink drops falling into water, swirling patterns, macro lens, studio lighting" },
  { cat: "Abstract", text: "Geometric shapes transforming in 3D space, smooth transitions, dark background, neon accents" },
  { cat: "Social", text: "A cute cartoon mouse running toward the camera with a big smile, Pixar-style 3D animation" },
  { cat: "Social", text: "Satisfying food preparation montage, bright colours, top-down shot, upbeat energy" },
  { cat: "Social", text: "A before-and-after home transformation, smooth transition reveal, bright natural light" },
  { cat: "Social", text: "Unboxing a premium product with close-up details, hands visible, clean white background" },
];

const VOICES = [
  { id: "en-US-GuyNeural",     name: "Guy",     gender: "Male",   accent: "US",  cat: "American", desc: "Warm, conversational narrator" },
  { id: "en-US-JennyNeural",   name: "Jenny",   gender: "Female", accent: "US",  cat: "American", desc: "Friendly, clear corporate voice" },
  { id: "en-US-AriaNeural",    name: "Aria",    gender: "Female", accent: "US",  cat: "American", desc: "Professional, smooth delivery" },
  { id: "en-US-DavisNeural",   name: "Davis",   gender: "Male",   accent: "US",  cat: "American", desc: "Deep, authoritative tone" },
  { id: "en-US-JaneNeural",    name: "Jane",    gender: "Female", accent: "US",  cat: "American", desc: "Calm, documentary style" },
  { id: "en-US-JasonNeural",   name: "Jason",   gender: "Male",   accent: "US",  cat: "American", desc: "Energetic, upbeat presenter" },
  { id: "en-GB-RyanNeural",    name: "Ryan",    gender: "Male",   accent: "UK",  cat: "British",  desc: "Polished, BBC-style narrator" },
  { id: "en-GB-SoniaNeural",   name: "Sonia",   gender: "Female", accent: "UK",  cat: "British",  desc: "Elegant, refined tone" },
  { id: "en-AU-WilliamNeural", name: "William", gender: "Male",   accent: "AU",  cat: "Australian", desc: "Relaxed, natural storyteller" },
  { id: "en-AU-NatashaNeural", name: "Natasha", gender: "Female", accent: "AU",  cat: "Australian", desc: "Bright, engaging presenter" },
];

const RATIOS = [
  { key: "16:9", label: "Landscape", desc: "YouTube / Widescreen" },
  { key: "9:16", label: "Portrait",  desc: "Reels / Shorts / TikTok" },
  { key: "1:1",  label: "Square",    desc: "Instagram / Socials" },
  { key: "4:3",  label: "Classic",   desc: "Presentations / Ads" },
];
const AUDIO_EXTRA_PER_5S = 1;

const CAMERA_MOTIONS = [
  { key: "zoom-in",   label: "Zoom In",       icon: "⊕", prompt: "slow cinematic zoom in" },
  { key: "zoom-out",  label: "Zoom Out",      icon: "⊖", prompt: "slow zoom out revealing the full scene" },
  { key: "pan-left",  label: "Pan Left",      icon: "←", prompt: "smooth camera pan to the left" },
  { key: "pan-right", label: "Pan Right",     icon: "→", prompt: "smooth camera pan to the right" },
  { key: "tilt-up",   label: "Tilt Up",       icon: "↑", prompt: "gentle camera tilt upward" },
  { key: "tilt-down", label: "Tilt Down",     icon: "↓", prompt: "gentle camera tilt downward" },
  { key: "orbit",     label: "Orbit",         icon: "◎", prompt: "slow orbital camera movement around subject" },
  { key: "dolly-in",  label: "Dolly In",      icon: "⟼", prompt: "steady dolly push toward subject" },
  { key: "tracking",  label: "Tracking",      icon: "⟿", prompt: "smooth tracking shot following motion" },
  { key: "crane-up",  label: "Crane Up",      icon: "⤴", prompt: "dramatic crane shot rising upward" },
  { key: "static",    label: "Static",        icon: "▪", prompt: "static camera, subtle ambient motion only" },
  { key: "handheld",  label: "Handheld",      icon: "≋", prompt: "slight handheld camera shake, natural feel" },
];

const PACKS = [
  { slug: "starter", label: "Starter", credits: 50,   price: 11  },
  { slug: "creator", label: "Creator", credits: 150,  price: 33, popular: true },
  { slug: "studio",  label: "Studio",  credits: 500,  price: 110 },
  { slug: "pro",     label: "Pro",     credits: 1200, price: 264 },
];

const PROMPT_TEMPLATES = [
  "A {style} aerial drone shot gliding over {subject}, bathed in {light}, camera {cam} to reveal sweeping depth and texture.",
  "A {style} tracking shot moving through {subject}, illuminated by {light}. {cam} — rich tones, natural motion, cinematic clarity.",
  "An immersive {style} sequence set in {subject}, lit by {light}. {cam} captures every detail with cinematic precision.",
  "A breathtaking {style} {cam} across {subject}, with {light} casting dramatic shadows and highlights throughout the scene.",
];

function calcCost(modelKey, dur, withAudio) {
  const m = MODELS.find(x => x.key === modelKey);
  if (!m) return 0;
  const segs = dur / 5;
  let c = m.cost * segs;
  if (withAudio && m.audio) c += AUDIO_EXTRA_PER_5S * segs;
  return c;
}

// ── Main Component ─────────────────────────────────────────
export default function SuperScenePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "create";
  const [tab, _setTab]          = useState(initialTab);
  const setTab = (t) => { _setTab(t); setSearchParams(t === "create" ? {} : { tab: t }, { replace: true }); };
  const [dark, setDark]         = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  // Create state
  const [mode, setMode]         = useState("text"); // text | image
  const [prompt, setPrompt]     = useState("");
  const [model, setModel]       = useState("kling3");
  const [duration, setDuration] = useState(10);
  const [ratio, setRatio]       = useState("16:9");
  const [resolution, setResolution] = useState("1080p");
  const [negPrompt, setNegPrompt] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const [promptDropOpen, setPromptDropOpen] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [genAudio, setGenAudio] = useState(false);

  // Image-to-Video enhancements
  const [motionPresets, setMotionPresets] = useState([]);
  const [seedLocked, setSeedLocked]   = useState(false);
  const [seedValue, setSeedValue]     = useState(null);
  const [dragging, setDragging]       = useState(false);

  // Frame picker for Extend Video
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [framePickerUrl, setFramePickerUrl]   = useState(null);
  const [framePickerTime, setFramePickerTime] = useState(0);
  const [framePickerDuration, setFramePickerDuration] = useState(0);
  const [framePickerPreview, setFramePickerPreview] = useState(null);
  const framePickerVideoRef = useRef(null);
  const framePickerCanvasRef = useRef(null);

  // Image upload
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [imageUrl, setImageUrl]       = useState(null);
  const fileRef = useRef(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId]         = useState(null);
  const [videoUrl, setVideoUrl]     = useState(null);
  const [genStatus, setGenStatus]   = useState(null);
  const [genProgress, setGenProgress] = useState(0);
  const pollRef = useRef(null);
  const fakeProgRef = useRef(null);

  // Credits & history
  const [credits, setCredits]   = useState(0);
  const [videos, setVideos]     = useState([]);
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [loadingCredits, setLoadingCredits] = useState(true);

  // AI Prompt Builder
  const [aiSubject, setAiSubject]   = useState("");
  const [aiStyle, setAiStyle]       = useState("");
  const [aiStyleOpen, setAiStyleOpen] = useState(false);
  const [aiCams, setAiCams]         = useState([]);
  const [aiLights, setAiLights]     = useState([]);
  const [aiResult, setAiResult]     = useState("");

  // Packs
  const [buyingPack, setBuyingPack] = useState(null);
  const [cryptoOrder, setCryptoOrder] = useState(null);

  // Style references
  const [styleRefs, setStyleRefs] = useState([]); // [{file, preview, url, uploading}]
  const styleRefInput = useRef(null);

  // Storyboard (extend from last frame)
  const [sbScenes, setSbScenes] = useState([]); // [{id, prompt, duration, model, status, videoUrl, taskId, progress, frameUrl}]
  const [sbGenerating, setSbGenerating] = useState(false);
  const [sbPrompt, setSbPrompt] = useState("");
  const [sbDuration, setSbDuration] = useState(5);
  const [sbModel, setSbModel] = useState("kling3");
  const sbPollRef = useRef(null);
  const sbProgRef = useRef(null);
  const sbCanvasRef = useRef(null);

  // Captions
  const [captions, setCaptions] = useState([]); // [{id, start, end, text}]
  const [captionStyle, setCaptionStyle] = useState("tiktok"); // tiktok | youtube | minimal | bold
  const [captionText, setCaptionText] = useState("");
  const [showCaptionOverlay, setShowCaptionOverlay] = useState(false);

  // Editor tools
  const [editorTool, setEditorTool] = useState("trim"); // trim | speed | resize | export
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [exportPreset, setExportPreset] = useState("original"); // original | tiktok | youtube | reels | shorts
  const [editorProcessing, setEditorProcessing] = useState(false);
  const [editorProgress, setEditorProgress] = useState("");
  const editorVideoRef = useRef(null);

  // Music
  const [musicModel, setMusicModel] = useState("suno-v4");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicCustom, setMusicCustom] = useState(false);
  const [musicStyle, setMusicStyle] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicInstrumental, setMusicInstrumental] = useState(false);
  const [musicGender, setMusicGender] = useState("");
  const [musicGenerating, setMusicGenerating] = useState(false);
  const [musicUrl, setMusicUrl] = useState(null);
  const [musicProgress, setMusicProgress] = useState(0);
  const [lyricsGenerating, setLyricsGenerating] = useState(false);
  const musicPollRef = useRef(null);
  const musicProgRef = useRef(null);

  // Voiceover
  const [voText, setVoText] = useState("");
  const [voVoice, setVoVoice] = useState("en-US-GuyNeural");
  const [voDropOpen, setVoDropOpen] = useState(false);
  const [voGenerating, setVoGenerating] = useState(false);
  const [voAudioUrl, setVoAudioUrl] = useState(null);
  const [voImageUrl, setVoImageUrl] = useState(null);
  const [voLipSyncing, setVoLipSyncing] = useState(false);
  const [voLipSyncUrl, setVoLipSyncUrl] = useState(null);
  const [voLipSyncProgress, setVoLipSyncProgress] = useState(0);
  const voLipPollRef = useRef(null);
  const voLipProgRef = useRef(null);
  const voImageInputRef = useRef(null);

  // Image Generator
  const [imgModel, setImgModel] = useState("nano-banana-2");
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgNegPrompt, setImgNegPrompt] = useState("");
  const [imgQuality, setImgQuality] = useState("1K");
  const [imgSize, setImgSize] = useState("1:1");
  const [imgBatch, setImgBatch] = useState(1);
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgResults, setImgResults] = useState([]);
  const [imgProgress, setImgProgress] = useState(0);
  const [imgPromptExpanded, setImgPromptExpanded] = useState(false);
  const imgProgRef = useRef(null);
  const imgPollRef = useRef(null);

  // Pipeline (Studio)
  const [pipeScript, setPipeScript] = useState("");
  const [pipeTitle, setPipeTitle] = useState("");
  const [pipeStyle, setPipeStyle] = useState("cinematic");
  const [pipeModel, setPipeModel] = useState("kling3");
  const [pipeVoice, setPipeVoice] = useState("en-US-GuyNeural");
  const [pipeRes, setPipeRes] = useState("1080p");
  const [pipeRatio, setPipeRatio] = useState("16:9");
  const [pipeScenes, setPipeScenes] = useState([]); // scene objects from analysis
  const [pipeId, setPipeId] = useState(null);
  const [pipeStatus, setPipeStatus] = useState(null); // null|draft|generating|assembling|completed|failed
  const [pipeAnalysing, setPipeAnalysing] = useState(false);
  const [pipeFinalUrl, setPipeFinalUrl] = useState(null);
  const [pipeError, setPipeError] = useState(null);
  const [pipeCompleted, setPipeCompleted] = useState(0);
  const pipePollRef = useRef(null);
  const [pipeModelOpen, setPipeModelOpen] = useState(false);
  const [pipeVoiceOpen, setPipeVoiceOpen] = useState(false);
  const [pipeVoicePlaying, setPipeVoicePlaying] = useState(null);
  const pipeVoiceAudioRef = useRef(null);
  const [studioGuideOpen, setStudioGuideOpen] = useState(false);
  const [scriptExpanded, setScriptExpanded] = useState(false);
  const [imgModelOpen, setImgModelOpen] = useState(false);

  const selectedModel = MODELS.find(m => m.key === model);
  const cost = calcCost(model, duration, genAudio);

  // ── Fetch credits on mount ─────────────────────────────
  useEffect(() => {
    fetch("/api/superscene/credits")
      .then(r => r.json())
      .then(d => { setCredits(d.balance || 0); setLoadingCredits(false); })
      .catch(() => setLoadingCredits(false));
    fetchVideos();
    const params = new URLSearchParams(window.location.search);
    if (params.get("pack_success")) {
      fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
      window.history.replaceState({}, "", "/superscene");
    }
  }, []);

  const fetchVideos = () => {
    fetch("/api/superscene/videos").then(r => r.json()).then(d => setVideos(d.videos || []));
  };

  // ── Polling ────────────────────────────────────────────
  const startPolling = useCallback((tid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/superscene/status/${tid}`);
        const data = await res.json();
        setGenStatus(data.status);
        if (data.status === "completed" && data.video_url) {
          setVideoUrl(data.video_url);
          setGenerating(false);
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
          setGenProgress(100);
          fetchVideos();
          fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
        } else if (data.status === "failed") {
          setGenerating(false);
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
        }
      } catch (e) { /* keep polling */ }
    }, 3000);
  }, []);

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearInterval(fakeProgRef.current);
  }, []);

  // ── Image upload handler ────────────────────────────────
  const processImageFile = async (file) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      alert("Only JPEG, PNG, and WebP images are accepted"); return;
    }
    if (file.size > 10 * 1024 * 1024) { alert("Image must be under 10MB"); return; }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/superscene/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.file_url) {
        setImageUrl(data.file_url);
      } else {
        alert(data.detail || "Upload failed");
        setImageFile(null); setImagePreview(null);
      }
    } catch (e) {
      alert("Upload error"); setImageFile(null); setImagePreview(null);
    } finally { setUploading(false); }
  };

  const handleImageSelect = (e) => processImageFile(e.target.files?.[0]);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); processImageFile(e.dataTransfer.files?.[0]); };

  const clearImage = () => {
    setImageFile(null); setImagePreview(null); setImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleMotion = (key) => {
    setMotionPresets(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleSeedLock = () => {
    if (!seedLocked) {
      setSeedValue(Math.floor(Math.random() * 2147483647));
      setSeedLocked(true);
    } else {
      setSeedLocked(false);
      setSeedValue(null);
    }
  };

  const refreshSeed = () => {
    setSeedValue(Math.floor(Math.random() * 2147483647));
  };

  // ── Frame Picker — Grok Imagine-style frame selection ──
  const openFramePicker = (sourceVideoUrl) => {
    setFramePickerUrl(sourceVideoUrl);
    setFramePickerTime(0);
    setFramePickerDuration(0);
    setFramePickerPreview(null);
    setFramePickerOpen(true);
  };

  const updateFramePreview = () => {
    const video = framePickerVideoRef.current;
    const canvas = framePickerCanvasRef.current;
    if (!video || !canvas) return;
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      setFramePickerPreview(canvas.toDataURL("image/png"));
    } catch (err) {
      // CORS tainted canvas — fallback: use video poster or capture without crossOrigin
      console.warn("Frame preview failed (CORS):", err);
    }
  };

  const confirmFrameExtend = async () => {
    if (!framePickerUrl) return;

    try {
      setFramePickerOpen(false);
      setTab("create");
      setMode("image");
      setUploading(true);
      setVideoUrl(null);
      setGenStatus(null);
      setGenProgress(0);
      setMotionPresets([]);
      setPrompt(prev => prev ? prev : "continues seamlessly from previous shot, smooth motion, consistent lighting");

      // Server-side frame extraction via FFmpeg — avoids CORS entirely
      const res = await fetch("/api/superscene/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: framePickerUrl, timestamp: framePickerTime }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.frame_url) {
        setImageUrl(data.frame_url);
        setImagePreview(data.frame_url);
      } else {
        alert(data.detail || "Frame extraction failed");
        setImagePreview(null);
      }
      setUploading(false);
    } catch (err) {
      console.error("Extend from frame error:", err);
      setUploading(false);
      alert("Could not extract frame. Please try again.");
    }
  };

  // ── Generate ───────────────────────────────────────────
  const generate = async () => {
    if (!prompt.trim() || generating || credits < cost) return;
    setGenerating(true);
    setVideoUrl(null);
    setGenStatus("pending");
    setGenProgress(0);

    fakeProgRef.current = setInterval(() => {
      setGenProgress(p => {
        if (p >= 85) { clearInterval(fakeProgRef.current); return p; }
        return p + Math.random() * 2 + 0.5;
      });
    }, 400);

    try {
      // Build final prompt — prepend camera motion presets if in I2V mode
      let finalPrompt = prompt;
      if (mode === "image" && motionPresets.length > 0) {
        const motionText = motionPresets.map(k => CAMERA_MOTIONS.find(m => m.key === k)?.prompt).filter(Boolean).join(", ");
        finalPrompt = motionText + ", " + prompt;
      }

      const payload = { model_key: model, prompt: finalPrompt, duration, ratio, resolution, generate_audio: genAudio };
      if (negPrompt.trim()) payload.negative_prompt = negPrompt.trim();
      if (mode === "image" && imageUrl) payload.image_urls = [imageUrl];
      if (styleRefs.length > 0) payload.style_refs = styleRefs.filter(r => r.url).map(r => r.url);
      if (seedLocked && seedValue !== null) payload.seed = seedValue;

      const res = await fetch("/api/superscene/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Generation failed");
        setGenerating(false); clearInterval(fakeProgRef.current); return;
      }
      setTaskId(data.task_id);
      setCredits(data.credits_remaining);
      startPolling(data.task_id);
    } catch (e) {
      alert("Network error — please try again");
      setGenerating(false); clearInterval(fakeProgRef.current);
    }
  };

  // ── AI Prompt Builder ──────────────────────────────────
  const buildPrompt = () => {
    const subj  = aiSubject.trim() || "a dramatic landscape";
    const style = aiStyle || "cinematic";
    const cam   = aiCams.length ? aiCams.join(" and ") : "smooth camera movement";
    const light = aiLights.length ? aiLights.join(" and ") : "natural light";
    const tmpl  = PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
    setAiResult(tmpl.replace("{subject}", subj).replace("{style}", style.toLowerCase())
      .replace("{light}", light.toLowerCase()).replace("{cam}", cam.toLowerCase()));
  };
  const useAiPrompt = () => { setPrompt(aiResult); setAiResult(""); setTab("create"); };

  // ── Buy credits ────────────────────────────────────────
  const buyNowPayments = async (slug) => {
    setBuyingPack(slug);
    try {
      const res = await fetch("/api/nowpayments/create-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ product_key: "superscene_" + slug }) });
      const data = await res.json();
      if (data.invoice_url) window.location.href = data.invoice_url; else alert(data.error || "Checkout failed");
    } finally { setBuyingPack(null); }
  };
  const openCryptoCheckout = (slug) => {
    const pack = PACKS.find(p => p.slug === slug);
    setCryptoOrder({ productKey: "superscene_" + slug, label: pack ? `SuperScene ${pack.label} — ${pack.credits} Credits` : slug });
  };

  // ── Style Reference Upload ──────────────────────────────
  const handleStyleRefUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) continue;
      if (file.size > 10 * 1024 * 1024) continue;
      const id = Date.now() + Math.random();
      const preview = URL.createObjectURL(file);
      setStyleRefs(prev => [...prev, { id, file, preview, url: null, uploading: true }]);
      const fd = new FormData(); fd.append("file", file);
      try {
        const res = await fetch("/api/superscene/upload-image", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success && data.file_url) {
          setStyleRefs(prev => prev.map(r => r.id === id ? { ...r, url: data.file_url, uploading: false } : r));
        } else {
          setStyleRefs(prev => prev.filter(r => r.id !== id));
        }
      } catch { setStyleRefs(prev => prev.filter(r => r.id !== id)); }
    }
    if (styleRefInput.current) styleRefInput.current.value = "";
  };
  const removeStyleRef = (id) => setStyleRefs(prev => prev.filter(r => r.id !== id));

  // ── Storyboard: Extend from Last Frame ──────────────────
  const extractLastFrame = (videoUrl) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.muted = true;
      video.onloadeddata = () => {
        video.currentTime = video.duration - 0.1;
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0);
          canvas.toBlob(async (blob) => {
            if (!blob) { reject("Failed to extract frame"); return; }
            // Upload to R2
            const fd = new FormData();
            fd.append("file", blob, "lastframe.jpg");
            try {
              const res = await fetch("/api/superscene/upload-image", { method: "POST", body: fd });
              const data = await res.json();
              if (data.success && data.file_url) resolve(data.file_url);
              else reject("Frame upload failed");
            } catch (e) { reject(e); }
          }, "image/jpeg", 0.92);
        } catch (e) { reject(e); }
      };
      video.onerror = () => reject("Video load failed");
      video.load();
    });
  };

  const sbGenerate = async () => {
    if (!sbPrompt.trim() || sbGenerating) return;
    const sceneCost = calcCost(sbModel, sbDuration, false);
    if (credits < sceneCost) { alert(`Need ${sceneCost} credits, have ${credits}`); return; }

    setSbGenerating(true);
    const sceneId = Date.now();
    const newScene = { id: sceneId, prompt: sbPrompt, duration: sbDuration, model: sbModel, status: "generating", videoUrl: null, taskId: null, progress: 0, frameUrl: null };
    setSbScenes(prev => [...prev, newScene]);

    // Fake progress
    if (sbProgRef.current) clearInterval(sbProgRef.current);
    sbProgRef.current = setInterval(() => {
      setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, progress: Math.min(s.progress + Math.random() * 2 + 0.5, 85) } : s));
    }, 400);

    try {
      // If there's a previous completed scene, extract its last frame
      const lastCompleted = [...sbScenes].reverse().find(s => s.status === "completed" && s.videoUrl);
      let imageUrls = [];
      if (lastCompleted) {
        try {
          const frameUrl = await extractLastFrame(lastCompleted.videoUrl);
          imageUrls = [frameUrl];
          setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, frameUrl } : s));
        } catch (e) {
          console.warn("Could not extract last frame, generating without:", e);
        }
      }

      const payload = { model_key: sbModel, prompt: sbPrompt, duration: sbDuration, ratio };
      if (imageUrls.length > 0) payload.image_urls = imageUrls;

      const res = await fetch("/api/superscene/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: "failed" } : s));
        clearInterval(sbProgRef.current); setSbGenerating(false);
        alert(data.detail || "Generation failed");
        return;
      }
      setCredits(data.credits_remaining);
      setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, taskId: data.task_id } : s));

      // Poll
      if (sbPollRef.current) clearInterval(sbPollRef.current);
      sbPollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/superscene/status/${data.task_id}`);
          const pd = await pr.json();
          if (pd.status === "completed" && pd.video_url) {
            setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: "completed", videoUrl: pd.video_url, progress: 100 } : s));
            clearInterval(sbPollRef.current); clearInterval(sbProgRef.current); setSbGenerating(false);
            setSbPrompt("");
            fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
          } else if (pd.status === "failed") {
            setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: "failed" } : s));
            clearInterval(sbPollRef.current); clearInterval(sbProgRef.current); setSbGenerating(false);
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setSbScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: "failed" } : s));
      clearInterval(sbProgRef.current); setSbGenerating(false);
    }
  };

  const sbRemoveScene = (id) => setSbScenes(prev => prev.filter(s => s.id !== id));

  // ── Captions Functions ─────────────────────────────────
  const addCaption = () => {
    if (!captionText.trim()) return;
    const id = Date.now();
    const lastEnd = captions.length > 0 ? captions[captions.length - 1].end : 0;
    setCaptions(prev => [...prev, { id, start: lastEnd, end: lastEnd + 2, text: captionText.trim() }]);
    setCaptionText("");
  };
  const updateCaption = (id, updates) => setCaptions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  const removeCaption = (id) => setCaptions(prev => prev.filter(c => c.id !== id));

  // ── Image Generator Functions ───────────────────────────
  const IMG_MODELS = [
    { key: "nano-banana-2",       name: "Nano Banana 2",  desc: "Best quality, text rendering", badge: "BEST" },
    { key: "nano-banana-pro",     name: "Nano Banana Pro", desc: "Photo-realistic, professional" },
    { key: "nano-banana-2-beta",  name: "NB2 Beta",       desc: "Web search grounding", badge: "NEW" },
    { key: "doubao-seedream-5.0-lite", name: "Seedream 5.0",   desc: "ByteDance, flexible sizes" },
    { key: "doubao-seedream-4.5", name: "Seedream 4.5",   desc: "Multi-image editing, 4K", badge: "NEW" },
    { key: "gpt-image-1",        name: "GPT Image",      desc: "OpenAI image generation" },
    { key: "gpt-image-1.5",      name: "GPT Image 1.5",  desc: "True-color precision", badge: "NEW" },
    { key: "grok-image",         name: "Grok Imagine",   desc: "xAI creative image gen", badge: "NEW" },
    { key: "z-image-turbo",      name: "Z Turbo",        desc: "Ultra-fast ~3 seconds", badge: "FAST" },
  ];
  const IMG_SIZES = ["1:1","16:9","9:16","4:3","3:4","3:2","2:3","4:5","5:4"];
  const IMG_QUALITIES = ["1K","2K","4K"];
  const IMG_CREDIT_MAP = {"1K": 1, "2K": 2, "4K": 4};

  const generateImage = async () => {
    if (!imgPrompt.trim() || imgGenerating) return;
    const cost = (IMG_CREDIT_MAP[imgQuality] || 2) * imgBatch;
    if (credits < cost) { alert(`Need ${cost} credits, have ${credits}`); return; }

    setImgGenerating(true);
    setImgResults([]);
    setImgProgress(0);

    imgProgRef.current = setInterval(() => {
      setImgProgress(p => Math.min(p + Math.random() * 4 + 2, 90));
    }, 300);

    try {
      const payload = { model: imgModel, prompt: imgPrompt, quality: imgQuality, size: imgSize, n: imgBatch };
      if (imgNegPrompt.trim()) payload.negative_prompt = imgNegPrompt.trim();
      if (seedLocked && seedValue !== null) payload.seed = seedValue;

      const res = await fetch("/api/superscene/image/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.detail || "Image generation failed"); setImgGenerating(false); clearInterval(imgProgRef.current); return; }
      setCredits(data.credits_remaining);

      // Check if sync (images returned) or async (task_id for polling)
      if (data.images && data.images.length > 0) {
        setImgResults(data.images);
        setImgGenerating(false);
        setImgProgress(100);
        clearInterval(imgProgRef.current);
      } else if (data.task_id) {
        // Poll for async
        if (imgPollRef.current) clearInterval(imgPollRef.current);
        imgPollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`/api/superscene/image/status/${data.task_id}`);
            const pd = await pr.json();
            if (pd.status === "completed" && pd.images?.length > 0) {
              setImgResults(pd.images);
              setImgGenerating(false);
              setImgProgress(100);
              clearInterval(imgPollRef.current);
              clearInterval(imgProgRef.current);
            } else if (pd.status === "failed") {
              setImgGenerating(false);
              clearInterval(imgPollRef.current);
              clearInterval(imgProgRef.current);
              alert("Image generation failed");
            }
          } catch {}
        }, 2000);
      }
    } catch { alert("Network error"); setImgGenerating(false); clearInterval(imgProgRef.current); }
  };

  // ── Voiceover Functions ─────────────────────────────────
  const VO_VOICES = [
    { id: "en-US-GuyNeural",     name: "Guy",     gender: "M", accent: "US" },
    { id: "en-US-JennyNeural",   name: "Jenny",   gender: "F", accent: "US" },
    { id: "en-US-AriaNeural",    name: "Aria",    gender: "F", accent: "US" },
    { id: "en-US-DavisNeural",   name: "Davis",   gender: "M", accent: "US" },
    { id: "en-US-JaneNeural",    name: "Jane",    gender: "F", accent: "US" },
    { id: "en-US-JasonNeural",   name: "Jason",   gender: "M", accent: "US" },
    { id: "en-GB-RyanNeural",    name: "Ryan",    gender: "M", accent: "UK" },
    { id: "en-GB-SoniaNeural",   name: "Sonia",   gender: "F", accent: "UK" },
    { id: "en-AU-WilliamNeural", name: "William", gender: "M", accent: "AU" },
    { id: "en-AU-NatashaNeural", name: "Natasha", gender: "F", accent: "AU" },
  ];

  const generateVoiceover = async () => {
    if (!voText.trim() || voGenerating) return;
    setVoGenerating(true);
    setVoAudioUrl(null);
    try {
      const res = await fetch("/api/superscene/voiceover/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voText, voice: voVoice }),
      });
      const data = await res.json();
      if (data.success && data.audio_url) {
        setVoAudioUrl(data.audio_url);
      } else {
        alert(data.detail || data.error || "Voiceover failed");
      }
    } catch { alert("Network error"); }
    setVoGenerating(false);
  };

  const handleVoImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/superscene/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.file_url) setVoImageUrl(data.file_url);
      else alert("Image upload failed");
    } catch { alert("Upload error"); }
  };

  const generateLipSync = async () => {
    if (!voAudioUrl || !voImageUrl || voLipSyncing) return;
    setVoLipSyncing(true);
    setVoLipSyncUrl(null);
    setVoLipSyncProgress(0);

    voLipProgRef.current = setInterval(() => {
      setVoLipSyncProgress(p => Math.min(p + Math.random() * 2 + 0.5, 85));
    }, 500);

    try {
      const res = await fetch("/api/superscene/lipsync/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: voImageUrl, audio_url: voAudioUrl }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.detail || "Lip sync failed"); setVoLipSyncing(false); clearInterval(voLipProgRef.current); return; }
      setCredits(data.credits_remaining);

      // Poll via /api/superscene/status/{task_id}
      if (voLipPollRef.current) clearInterval(voLipPollRef.current);
      voLipPollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/superscene/status/${data.task_id}`);
          const pd = await pr.json();
          if (pd.status === "completed" && pd.video_url) {
            setVoLipSyncUrl(pd.video_url);
            setVoLipSyncing(false);
            setVoLipSyncProgress(100);
            clearInterval(voLipPollRef.current);
            clearInterval(voLipProgRef.current);
            fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
          } else if (pd.status === "failed") {
            setVoLipSyncing(false);
            clearInterval(voLipPollRef.current);
            clearInterval(voLipProgRef.current);
            alert("Lip sync generation failed");
          }
        } catch {}
      }, 3000);
    } catch { alert("Network error"); setVoLipSyncing(false); clearInterval(voLipProgRef.current); }
  };

  // ── Music Generation ────────────────────────────────────
  const MUSIC_MODELS = [
    { key: "suno-v4",   name: "Suno V4",   cost: 1 },
    { key: "suno-v4.5", name: "Suno V4.5", cost: 2 },
    { key: "suno-v5",   name: "Suno V5",   cost: 3, badge: "BEST" },
  ];

  const generateLyrics = async () => {
    if (lyricsGenerating) return;
    const desc = musicPrompt.trim() || musicTitle.trim() || musicStyle.trim();
    if (!desc) { alert("Enter a description, title, or style first so AI knows what to write about"); return; }
    setLyricsGenerating(true);
    try {
      const res = await fetch("/api/superscene/music/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, style: musicStyle }),
      });
      const data = await res.json();
      if (data.success && data.lyrics) {
        setMusicPrompt(data.lyrics);
      } else {
        alert(data.error || data.detail || "Lyrics generation failed");
      }
    } catch { alert("Network error"); }
    setLyricsGenerating(false);
  };

  const generateMusic = async () => {
    if (!musicPrompt.trim() || musicGenerating) return;
    const mc = MUSIC_MODELS.find(m => m.key === musicModel)?.cost || 2;
    if (credits < mc) { alert(`Need ${mc} credits, have ${credits}`); return; }

    setMusicGenerating(true);
    setMusicUrl(null);
    setMusicProgress(0);

    musicProgRef.current = setInterval(() => {
      setMusicProgress(p => { if (p >= 85) { clearInterval(musicProgRef.current); return p; } return p + Math.random() * 3 + 1; });
    }, 500);

    try {
      const payload = { model: musicModel, prompt: musicPrompt, custom_mode: musicCustom, instrumental: musicInstrumental };
      if (musicCustom) { payload.style = musicStyle; payload.title = musicTitle; payload.vocal_gender = musicGender; }

      const res = await fetch("/api/superscene/music/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { alert(data.detail || "Music generation failed"); setMusicGenerating(false); clearInterval(musicProgRef.current); return; }
      setCredits(data.credits_remaining);

      // Poll
      if (musicPollRef.current) clearInterval(musicPollRef.current);
      musicPollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/superscene/music/status/${data.task_id}`);
          const pd = await pr.json();
          if (pd.status === "completed" && pd.audio_url) {
            setMusicUrl(pd.audio_url);
            setMusicGenerating(false);
            setMusicProgress(100);
            clearInterval(musicPollRef.current);
            clearInterval(musicProgRef.current);
            fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
          } else if (pd.status === "failed") {
            setMusicGenerating(false);
            clearInterval(musicPollRef.current);
            clearInterval(musicProgRef.current);
            alert("Music generation failed");
          }
        } catch {}
      }, 3000);
    } catch { alert("Network error"); setMusicGenerating(false); clearInterval(musicProgRef.current); }
  };

  // ── Editor Functions ────────────────────────────────────
  const EXPORT_PRESETS = {
    original: { label: "Original", ratio: null, maxDur: null },
    tiktok:   { label: "TikTok 9:16", ratio: "9:16", maxDur: 60 },
    youtube:  { label: "YouTube 16:9", ratio: "16:9", maxDur: null },
    reels:    { label: "Reels 9:16", ratio: "9:16", maxDur: 90 },
    shorts:   { label: "Shorts 9:16", ratio: "9:16", maxDur: 60 },
  };

  const applySpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (editorVideoRef.current) editorVideoRef.current.playbackRate = speed;
  };

  const handleEditorExport = async () => {
    if (!videoUrl) return;
    setEditorProcessing(true);
    setEditorProgress("Preparing export…");

    try {
      // For now, download the original video with settings noted
      // FFmpeg.wasm processing will be added when COOP/COEP headers are configured
      const preset = EXPORT_PRESETS[exportPreset];
      setEditorProgress(`Exporting as ${preset.label}…`);

      // Fetch the video blob
      const resp = await fetch(videoUrl);
      const blob = await resp.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = "mp4";
      const presetTag = exportPreset !== "original" ? `-${exportPreset}` : "";
      a.download = `superscene${presetTag}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setEditorProgress("Export complete!");
      setTimeout(() => setEditorProgress(""), 2000);
    } catch (e) {
      setEditorProgress("Export failed");
      setTimeout(() => setEditorProgress(""), 2000);
    } finally {
      setEditorProcessing(false);
    }
  };

  // Set trim end when video loads
  const onEditorVideoLoad = () => {
    if (editorVideoRef.current) {
      const dur = editorVideoRef.current.duration;
      if (dur && isFinite(dur)) setTrimEnd(Math.round(dur * 10) / 10);
    }
  };

  const toggleChip = (val, arr, setArr) => setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const cls = (...c) => c.filter(Boolean).join(" ");
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  // ── Download helper (cross-origin safe) ────────────────
  const downloadVideo = async (url, filename) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || `superscene-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  // ── Cancel generation ──────────────────────────────────
  const cancelGeneration = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (fakeProgRef.current) clearInterval(fakeProgRef.current);
    setGenerating(false);
    setGenStatus(null);
    setGenProgress(0);
    setVideoUrl(null);
  };

  // ── Stage content ──────────────────────────────────────
  const StageContent = () => {
    if (generating) return (
      <div className="gst">
        <div className="spin"><div className="r1"/><div className="r2"/></div>
        <div className="gst-title">Generating your video…</div>
        <div className="gst-sub">{selectedModel?.name} · {duration}s · {ratio}{genAudio ? " · Audio" : ""}</div>
        <div className="pt"><div className="pf" style={{ width: `${Math.min(genProgress, 100)}%` }}/></div>
        <div className="gst-pct">{Math.round(genProgress)}%</div>
        <button className="sc-cancel-btn" onClick={cancelGeneration}>✕ Cancel</button>
      </div>
    );
    if (videoUrl) return <div className="video-ready"><video src={videoUrl} controls autoPlay className="sc-video"/></div>;
    if (genStatus === "failed") return (
      <div className="s-empty"><div className="s-icon" style={{ color: "#f87171" }}>✕</div>
        <div className="s-title">Generation Failed</div><div className="s-sub">Something went wrong. Your credits have been refunded.</div></div>
    );
    // Preview images by tier
    return (
      <div className="s-empty">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" style={{ marginBottom: 16 }}>
          <rect x="2" y="4" width="20" height="14" rx="3"/>
          <polygon points="10,8 10,15 16,11.5"/>
        </svg>
        <div className="s-title">Your video will appear here</div>
        <div className="s-sub">Choose a model, write a prompt, and hit Generate</div>
      </div>
    );
  };

  return (
    <div className={cls("sc-root", dark ? "dark" : "light")}>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <div className="sc-topbar">
        <div className="sc-logo">
          <a href="/dashboard" className="sc-back-btn">← Dashboard</a>
          <div className="sc-topbar-divider"/>
          <div className="sc-logo-mark">✂</div>
          <div className="sc-logo-text"><span className="lw">Super</span><span className="lc">Scene</span></div>
          <div className="sc-logo-badge">BETA</div>
        </div>
        <div className="sc-tabs">
          {[{k:"create",l:"Create"},{k:"studio",l:"Studio"},{k:"images",l:"Images"},{k:"captions",l:"Captions"},{k:"music",l:"Music"},{k:"voiceover",l:"Voiceover"},{k:"editor",l:"Editor"},{k:"gallery",l:"Gallery"},{k:"packs",l:"Packs"},{k:"builder",l:"AI Builder"}].map(t => (
            <button key={t.k} className={cls("sc-tab", tab === t.k && "active")} onClick={() => setTab(t.k)}>
              <span className="tdot"/>{t.l}
            </button>
          ))}
        </div>
        <div className="sc-topbar-r">
          <div className="sc-cpill">
            <div className="sc-cicon">◈</div>
            <span className="sc-cnum">{loadingCredits ? "…" : credits}</span>
            <span className="sc-clbl">credits</span>
            <div className="sc-cadd" onClick={() => setTab("packs")}>+</div>
          </div>
          <button className="sc-ibt" onClick={() => setHelpOpen(!helpOpen)}>?</button>
          <button className="sc-ibt" onClick={() => setDark(!dark)}>{dark ? "☀" : "◑"}</button>
        </div>
      </div>

      {/* ── WORKSPACE ──────────────────────────────────── */}
      <div className="sc-ws">

        {/* ══ CREATE TAB — 2-panel Viddo layout ══ */}
        {tab === "create" && <>
          <div className="sc-create-studio">

            {/* ═══ LEFT PANEL — Controls ═══ */}
            <div className="sc-create-left">
              <div className="sc-create-left-scroll">

                {/* Mode Toggle */}
                <div className="sc-mode-toggle">
                  <button className={cls("sc-mode-btn", mode === "text" && "on")} onClick={() => setMode("text")}>Text to Video</button>
                  <button className={cls("sc-mode-btn", mode === "image" && "on")} onClick={() => setMode("image")}>Image to Video</button>
                </div>

                {/* Image Upload (when image mode) */}
                {mode === "image" && (
                  <div className="sc-section">
                    {imagePreview ? (
                      <div className="sc-img-preview">
                        <img src={imagePreview} alt="Preview" className="sc-img-thumb"/>
                        <div className="sc-img-overlay">
                          {uploading ? <span className="sc-img-status">Uploading…</span> : <span className="sc-img-status sc-img-ok">✓ Ready</span>}
                          <button className="sc-img-remove" onClick={clearImage}>✕ Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div className={cls("sc-img-dropzone", dragging && "dragging")}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        <div className="sc-img-dz-icon">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                        <div className="sc-img-dz-text">Click or drop an image</div>
                        <div className="sc-img-dz-sub">JPEG, PNG, WebP · Max 10MB</div>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageSelect}/>
                  </div>
                )}

                {/* Prompt */}
                <div className="sc-section">
                  <div className="sc-label">AI Prompt</div>
                  <div className={cls("sc-prompt-box", promptExpanded && "sc-prompt-expanded")}>
                    <textarea className="sc-prompt-ta" rows={promptExpanded ? 10 : 4}
                      placeholder={mode === "image"
                        ? "Describe how this image should move — e.g. slow zoom in, wind blowing through hair, camera orbits…"
                        : "A cinematic drone shot over a misty mountain valley at golden hour, warm light, slow push-in…"}
                      value={prompt} onChange={e => setPrompt(e.target.value.slice(0, 2000))}/>
                    <div className="sc-prompt-footer">
                      <span className="sc-prompt-ai" onClick={() => setTab("builder")}>✦ AI Builder</span>
                      <div className="sc-prompt-actions">
                        <span className="sc-prompt-count">{prompt.length}/2000</span>
                        <button className={cls("sc-prompt-action", promptExpanded && "sc-prompt-action-active")} onClick={() => setPromptExpanded(x => !x)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{promptExpanded ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></> : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>}</svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera Motion (Image mode only) */}
                {mode === "image" && (
                  <div className="sc-section">
                    <div className="sc-label">Camera Motion</div>
                    <div className="sc-motion-grid">
                      {CAMERA_MOTIONS.map(m => (
                        <button key={m.key} className={cls("sc-motion-card", motionPresets.includes(m.key) && "on")}
                          onClick={() => toggleMotion(m.key)}>
                          <span className="sc-motion-icon">{m.icon}</span>
                          <span className="sc-motion-label">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Selector — compact dropdown */}
                <div className="sc-section">
                  <div className="sc-create-row">
                    <div className="sc-create-sel" onClick={() => {
                      const el = document.querySelector('.sc-model-drop-v2');
                      if (el) el.classList.toggle('open');
                    }}>
                      <div className="sc-model-icon" style={{ background: `linear-gradient(135deg, ${selectedModel?.color}, ${selectedModel?.color}88)`, width: 24, height: 24, borderRadius: 6, fontSize: 10 }}>✦</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedModel?.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>~{selectedModel?.pricePer10s}/10s</span>
                      <span className="sc-model-chev">▼</span>
                    </div>
                    <div className="sc-create-sel" style={{ flex: '0 0 auto', minWidth: 70, justifyContent: 'center' }}>
                      <select style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}
                        value={resolution} onChange={e => setResolution(e.target.value)}>
                        {(selectedModel?.resolutions || ["720p","1080p"]).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="sc-create-sel" style={{ flex: '0 0 auto', minWidth: 60, justifyContent: 'center' }}>
                      <select style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}
                        value={duration} onChange={e => setDuration(Number(e.target.value))}>
                        {(selectedModel?.durations || [5,10]).map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="sc-model-drop-v2">
                    {MODELS.map(m => (
                      <button key={m.key} className={cls("sc-model-opt", model === m.key && "sel")}
                        onClick={() => {
                          setModel(m.key);
                          if (!m.audio) setGenAudio(false);
                          if (!m.durations.includes(duration)) setDuration(m.durations[Math.floor(m.durations.length / 2)]);
                          if (!m.resolutions.includes(resolution)) setResolution(m.resolutions[m.resolutions.length - 1]);
                          document.querySelector('.sc-model-drop-v2')?.classList.remove('open');
                        }}>
                        <div className="sc-model-icon" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`, width: 24, height: 24, borderRadius: 6, fontSize: 10 }}>✦</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.desc}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span className="sc-model-badge" style={{ background: `${m.color}22`, color: m.color, fontSize: 9, padding: '1px 6px' }}>{m.badge}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: m.tier === 'budget' ? '#10b981' : m.tier === 'ultra' ? '#f59e0b' : 'var(--muted)' }}>~{m.pricePer10s}/10s</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Negative Prompt */}
                {selectedModel?.negPrompt && (
                  <div className="sc-section">
                    <div className="sc-label" style={{ fontSize: 12 }}>Negative Prompt <span className="sc-label-badge">Optional</span></div>
                    <div className="sc-prompt-box" style={{ minHeight: 'auto', padding: 10 }}>
                      <textarea className="sc-prompt-ta" rows={2} style={{ minHeight: 36, fontSize: 12 }}
                        placeholder="blurry, low quality, text, watermark, distorted…"
                        value={negPrompt} onChange={e => setNegPrompt(e.target.value.slice(0, 500))}/>
                    </div>
                  </div>
                )}

                {/* Aspect Ratio — compact pills */}
                <div className="sc-section">
                  <div className="sc-label" style={{ fontSize: 12 }}>Aspect Ratio</div>
                  <div className="sc-pills" style={{ gap: 5 }}>
                    {RATIOS.map(r => (
                      <button key={r.key} className={cls("sc-pill", ratio === r.key && "on")} style={{ padding: '7px 0', fontSize: 12 }}
                        onClick={() => setRatio(r.key)}>{r.key}</button>
                    ))}
                  </div>
                </div>

                {/* Audio Toggle */}
                {selectedModel?.audio && (
                  <div className="sc-section">
                    <div className="sc-audio-toggle" onClick={() => setGenAudio(!genAudio)} style={{ padding: '10px 12px' }}>
                      <div className={cls("sc-toggle-track", genAudio && "on")} style={{ width: 34, height: 18 }}>
                        <div className="sc-toggle-thumb" style={{ width: 14, height: 14 }}/>
                      </div>
                      <div className="sc-audio-info">
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>AI Audio (+{AUDIO_EXTRA_PER_5S} cr/5s)</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Style References */}
                {(model === "seedance" || model === "veo31" || model === "veo31-pro") && (
                  <div className="sc-section">
                    <div className="sc-label" style={{ fontSize: 12 }}>Style References <span className="sc-label-badge">Optional</span></div>
                    <div className="sc-style-refs">
                      {styleRefs.map(ref => (
                        <div key={ref.id} className="sc-sref-item">
                          <img src={ref.preview} alt="" className="sc-sref-thumb"/>
                          {ref.uploading && <div className="sc-sref-loading">…</div>}
                          {!ref.uploading && <div className="sc-sref-ok">✓</div>}
                          <button className="sc-sref-remove" onClick={() => removeStyleRef(ref.id)}>✕</button>
                        </div>
                      ))}
                      {styleRefs.length < ((model === "veo31" || model === "veo31-pro") ? 3 : 9) && (
                        <div className="sc-sref-add" onClick={() => styleRefInput.current?.click()}><span>+</span></div>
                      )}
                    </div>
                    <input ref={styleRefInput} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }} onChange={handleStyleRefUpload}/>
                  </div>
                )}

                {/* Seed */}
                <div className="sc-section">
                  <div className="sc-seed-row" style={{ padding: '8px 12px' }}>
                    <button className={cls("sc-seed-toggle", seedLocked && "on")} onClick={toggleSeedLock} style={{ width: 28, height: 28, fontSize: 12 }}>
                      {seedLocked ? "🔒" : "🔓"}
                    </button>
                    <div className="sc-seed-info">
                      <span className="sc-seed-label" style={{ fontSize: 11 }}>Seed</span>
                      <span className="sc-seed-value">{seedLocked ? seedValue : "Random"}</span>
                    </div>
                    {seedLocked && <button className="sc-seed-refresh" onClick={refreshSeed} style={{ width: 24, height: 24, fontSize: 12 }}>↻</button>}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="sc-section">
                  <button className="sc-gen-btn" onClick={generate}
                    disabled={!prompt.trim() || generating || credits < cost || (mode === "image" && !imageUrl)}>
                    {generating ? "Generating…"
                      : !prompt.trim() ? "Enter a prompt"
                      : mode === "image" && !imageUrl ? "Upload an image"
                      : credits < cost ? "Not enough credits"
                      : `Create`}
                  </button>
                  <div className="sc-gen-meta">
                    <span>◈ {cost} credits{selectedModel?.pricePer10s ? ` (~${selectedModel.pricePer10s})` : ''}</span>
                    {credits < cost && <span className="sc-buymore" onClick={() => setTab("packs")}>Buy more →</span>}
                  </div>
                </div>

              </div>
            </div>

            {/* ═══ RIGHT PANEL — Preview + Gallery ═══ */}
            <div className="sc-create-right">
              <div className="sc-stage">
                <div className={`sc-stage-frame sc-ratio-${ratio.replace(":", "x")}`}>
                {generating || videoUrl || genStatus === "failed" ? (
                  <StageContent />
                ) : mode === "image" && imagePreview ? (
                  <div className="sc-stage-hero">
                    <img src={imagePreview} alt="Uploaded" className="sc-preview-img"/>
                    <div className="sc-stage-hero-overlay">
                      <div className="sc-stage-hero-title">Your image</div>
                      <div className="sc-stage-hero-sub">
                        {motionPresets.length > 0
                          ? `Motion: ${motionPresets.map(k => CAMERA_MOTIONS.find(m => m.key === k)?.label).join(", ")}`
                          : "Write a prompt and hit Create"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="s-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1">
                      <rect x="2" y="4" width="20" height="14" rx="3"/>
                      <polygon points="10,8 10,15 16,11.5"/>
                    </svg>
                    <div className="s-title">Your video will appear here</div>
                    <div className="s-sub">Choose a model, write a prompt, and hit Create</div>
                  </div>
                )}
                </div>
              </div>
              {videoUrl && (
                <div className="sc-stage-actions">
                  <button className="sc-sa-btn" onClick={() => openFramePicker(videoUrl)}>⟼ Extend</button>
                  <button className="sc-sa-btn" onClick={() => setTab("editor")}>✂ Edit</button>
                  <button className="sc-sa-btn" onClick={() => downloadVideo(videoUrl, `superscene-${Date.now()}.mp4`)}>⬇ Download</button>
                  <button className="sc-sa-btn" onClick={() => { setVideoUrl(null); setGenStatus(null); setGenProgress(0); }}>✕ Clear</button>
                </div>
              )}

              {/* Recent Gallery */}
              {videos.length > 0 && (
                <div className="sc-recent-strip">
                  <div className="sc-recent-label">Recent</div>
                  <div className="sc-recent-grid">
                    {videos.slice(0, 6).map(v => (
                      <div key={v.id} className="sc-recent-thumb" onClick={() => { setVideoUrl(v.video_url); setGenStatus("done"); }}>
                        {v.video_url ? <video src={v.video_url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div className="sc-recent-placeholder">▶</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </>}

        {/* ══ MUSIC TAB ══ */}
        {tab === "music" && (
          <div className="sc-music-view">
            <div className="sc-music-layout">
              {/* Left — Controls */}
              <div className="sc-music-controls">
                <div className="sc-studio-hero">
                  <div className="sc-studio-hero-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <div className="sc-studio-title">AI Music Generator</div>
                    <div className="sc-studio-desc">Generate royalty-free music with Suno AI. Describe your track or write custom lyrics.</div>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="sc-mode-toggle sc-mu-mode-toggle">
                  <button className={cls("sc-mode-btn", !musicCustom && "on")} onClick={() => setMusicCustom(false)}>Simple Mode</button>
                  <button className={cls("sc-mode-btn", musicCustom && "on")} onClick={() => setMusicCustom(true)}>Custom Mode</button>
                </div>

                {/* Model */}
                <div className="sc-section">
                  <div className="sc-label">Model</div>
                  <div className="sc-pills">
                    {MUSIC_MODELS.map(m => (
                      <button key={m.key} className={cls("sc-pill", musicModel === m.key && "on")} onClick={() => setMusicModel(m.key)}>
                        {m.name} {m.badge && <span className="sc-pill-credit">{m.badge}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt / Lyrics */}
                <div className="sc-section">
                  <div className="sc-label">{musicCustom ? "Lyrics" : "Describe your music"}</div>
                  <div className="sc-prompt-box">
                    <textarea className="sc-prompt-ta" rows={musicCustom ? 8 : 4}
                      placeholder={musicCustom ? "[Verse]\nWalking down the road...\n\n[Chorus]\nHere we go again..." : "Upbeat pop song for Instagram Reels, energetic and fun"}
                      value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)}/>
                    {musicCustom && (
                      <div className="sc-prompt-ai-row">
                        <button className="sc-prompt-ai-btn" onClick={generateLyrics} disabled={lyricsGenerating}>
                          {lyricsGenerating ? "Writing lyrics…" : "✦ SuperAdPro Lyrics Writer"}
                        </button>
                        <span className="sc-prompt-count">{musicPrompt.length}/3000</span>
                      </div>
                    )}
                    {musicCustom && <div className="sc-sub sc-mu-tip">Tip: Enter a song title or style first, then click SuperAdPro Lyrics Writer. You can edit the result before generating music.</div>}
                  </div>
                </div>

                {/* Custom mode fields */}
                {musicCustom && (
                  <>
                    <div className="sc-section">
                      <div className="sc-label">Style</div>
                      <input className="sc-music-input" placeholder="pop, rock, electronic, jazz, lo-fi, cinematic…" value={musicStyle} onChange={e => setMusicStyle(e.target.value)}/>
                    </div>
                    <div className="sc-section">
                      <div className="sc-label">Title</div>
                      <input className="sc-music-input" placeholder="Song title" value={musicTitle} onChange={e => setMusicTitle(e.target.value)}/>
                    </div>
                    <div className="sc-section">
                      <div className="sc-label">Vocal Gender</div>
                      <div className="sc-pills">
                        {["","m","f"].map(g => (
                          <button key={g} className={cls("sc-pill", musicGender === g && "on")} onClick={() => setMusicGender(g)}>
                            {g === "" ? "Auto" : g === "m" ? "Male" : "Female"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Instrumental toggle */}
                <div className="sc-section">
                  <div className="sc-audio-toggle" onClick={() => setMusicInstrumental(!musicInstrumental)}>
                    <div className={cls("sc-toggle-track", musicInstrumental && "on")}>
                      <div className="sc-toggle-thumb"/>
                    </div>
                    <div className="sc-audio-info">
                      <div className="sc-label sc-mu-toggle-label">Instrumental Only</div>
                      <div className="sc-sub sc-mu-toggle-sub">No vocals — background music only</div>
                    </div>
                  </div>
                </div>

                {/* Generate */}
                <div className="sc-section">
                  <div className="sc-credit-line">
                    <div className="sc-cl-icon">◈</div>
                    <span className="sc-cl-label">Cost:</span>
                    <span className="sc-cl-value">{MUSIC_MODELS.find(m => m.key === musicModel)?.cost || 2} credits</span>
                  </div>
                  <button className="sc-gen-btn" onClick={generateMusic} disabled={!musicPrompt.trim() || musicGenerating}>
                    {musicGenerating ? "Generating…" : !musicPrompt.trim() ? "Enter a description" : `♪ Generate Music`}
                  </button>
                </div>
              </div>

              {/* Right — Preview */}
              <div className="sc-music-preview">
                <div className="sc-preview-label">Music Preview</div>
                <div className="sc-music-stage">
                  {musicGenerating ? (
                    <div className="gst">
                      <div className="spin"><div className="r1"/><div className="r2"/></div>
                      <div className="gst-title">Generating your track…</div>
                      <div className="gst-sub">{MUSIC_MODELS.find(m => m.key === musicModel)?.name} · {musicInstrumental ? "Instrumental" : "Vocal"}</div>
                      <div className="pt"><div className="pf" style={{ width: `${Math.min(musicProgress, 100)}%` }}/></div>
                      <div className="gst-pct">{Math.round(musicProgress)}%</div>
                    </div>
                  ) : musicUrl ? (
                    <div className="sc-music-result">
                      <div className="sc-music-icon">♪</div>
                      <div className="sc-music-title">Your track is ready</div>
                      <audio src={musicUrl} controls className="sc-music-player"/>
                      <button className="sc-sa-btn sc-mu-download" onClick={() => downloadVideo(musicUrl, `superscene-music-${Date.now()}.mp3`)}>⬇ Download MP3</button>
                    </div>
                  ) : (
                    <div className="s-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                      <div className="s-title">Your music will appear here</div>
                      <div className="s-sub">Describe your track, choose a model, and hit Generate</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ VOICEOVER TAB ══ */}
        {tab === "voiceover" && (
          <div className="sc-music-view">
            <div className="sc-music-layout">
              {/* Left — Controls */}
              <div className="sc-music-controls">
                <div className="sc-studio-hero">
                  <div className="sc-studio-hero-icon" style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </div>
                  <div>
                    <div className="sc-studio-title">AI Voiceover</div>
                    <div className="sc-studio-desc">Generate professional voiceovers from text. Optionally create a lip-synced talking avatar.</div>
                  </div>
                </div>

                {/* Step 1: Script */}
                <div className="sc-section">
                  <div className="sc-label">① Script</div>
                  <div className="sc-prompt-box">
                    <textarea className="sc-prompt-ta" rows={6}
                      placeholder="Type your voiceover script here... e.g. Welcome to SuperAdPro, the platform where your creativity pays."
                      value={voText} onChange={e => setVoText(e.target.value)}/>
                    <div className="sc-prompt-footer">
                      <span/>
                      <span className="sc-prompt-count">{voText.length}/5000</span>
                    </div>
                  </div>
                </div>

                {/* Voice Selection — Custom Dropdown */}
                <div className="sc-section">
                  <div className="sc-label">② Voice</div>
                  <div className="sc-model-sel" onClick={() => setVoDropOpen(!voDropOpen)}>
                    <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #f472b6, #ec489988)' }}>🎙</div>
                    <div className="sc-model-info">
                      <div className="sc-model-name">{VO_VOICES.find(v => v.id === voVoice)?.name || "Select voice"}</div>
                      <div className="sc-model-desc">{VO_VOICES.find(v => v.id === voVoice)?.gender === "M" ? "Male" : "Female"} · {VO_VOICES.find(v => v.id === voVoice)?.accent}</div>
                    </div>
                    <span className={cls("sc-model-chev", voDropOpen && "open")}>▼</span>
                  </div>
                  {voDropOpen && (
                    <div className="sc-model-drop">
                      {["American", "British", "Australian"].map(cat => {
                        const voices = VO_VOICES.filter(v => v.accent === (cat === "American" ? "US" : cat === "British" ? "UK" : "AU"));
                        return voices.length ? <div key={cat}>
                          <div className="sc-voice-cat">{cat}</div>
                          {voices.map(v => (
                            <button key={v.id} className={cls("sc-model-opt", voVoice === v.id && "sel")}
                              onClick={() => { setVoVoice(v.id); setVoDropOpen(false); }}>
                              <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #f472b6, #ec489988)', fontSize: 14 }}>
                                {v.gender === "M" ? "♂" : "♀"}
                              </div>
                              <div className="sc-model-info">
                                <div className="sc-model-name">{v.name}</div>
                                <div className="sc-model-desc">{v.gender === "M" ? "Male" : "Female"} · {v.accent}</div>
                              </div>
                            </button>
                          ))}
                        </div> : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Generate Voiceover */}
                <div className="sc-section">
                  <button className="sc-gen-btn" onClick={generateVoiceover} disabled={!voText.trim() || voGenerating}>
                    {voGenerating ? "Generating voiceover…" : "🎙 Generate Voiceover"}
                  </button>
                  <div className="sc-sub sc-vo-free-note">Free — no credits required for voiceover</div>
                </div>

                {/* Step 3: Lip Sync (optional) */}
                {voAudioUrl && (
                  <>
                    <div className="sc-vo-divider"/>
                    <div className="sc-label">③ Lip Sync Avatar (Optional)</div>
                    <div className="sc-sub sc-vo-lipsync-desc">Upload a photo of a person and create a talking avatar video synced to your voiceover.</div>

                    <div className="sc-section">
                      <input type="file" ref={voImageInputRef} accept="image/jpeg,image/png,image/webp" className="sc-vo-file-input" onChange={handleVoImageUpload}/>
                      <button className="sc-vo-upload-btn" onClick={() => voImageInputRef.current?.click()}>
                        {voImageUrl ? "✓ Photo uploaded — Change" : "📷 Upload Person Photo"}
                      </button>
                    </div>

                    {voImageUrl && (
                      <div className="sc-section">
                        <img src={voImageUrl} alt="Avatar" className="sc-vo-avatar-preview"/>
                      </div>
                    )}

                    {voImageUrl && voAudioUrl && (
                      <div className="sc-section">
                        <div className="sc-credit-line">
                          <div className="sc-cl-icon">◈</div>
                          <span className="sc-cl-label">Cost:</span>
                          <span className="sc-cl-value">8 credits</span>
                        </div>
                        <button className="sc-gen-btn" onClick={generateLipSync} disabled={voLipSyncing}>
                          {voLipSyncing ? "Generating avatar…" : "🎬 Generate Talking Avatar"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right — Preview */}
              <div className="sc-music-preview">
                <div className="sc-preview-label">Preview</div>
                <div className="sc-music-stage">
                  {voLipSyncing ? (
                    <div className="gst">
                      <div className="spin"><div className="r1"/><div className="r2"/></div>
                      <div className="gst-title">Creating talking avatar…</div>
                      <div className="gst-sub">OmniHuman 1.5 · Lip Sync</div>
                      <div className="pt"><div className="pf" style={{ width: `${Math.min(voLipSyncProgress, 100)}%` }}/></div>
                      <div className="gst-pct">{Math.round(voLipSyncProgress)}%</div>
                    </div>
                  ) : voLipSyncUrl ? (
                    <div className="sc-music-result">
                      <div className="sc-music-title">Talking Avatar Ready</div>
                      <video src={voLipSyncUrl} controls className="sc-vo-result-video"/>
                      <button className="sc-sa-btn sc-vo-download-btn" onClick={() => downloadVideo(voLipSyncUrl, `superscene-avatar-${Date.now()}.mp4`)}>⬇ Download Video</button>
                    </div>
                  ) : voGenerating ? (
                    <div className="gst">
                      <div className="spin"><div className="r1"/><div className="r2"/></div>
                      <div className="gst-title">Generating voiceover…</div>
                    </div>
                  ) : voAudioUrl ? (
                    <div className="sc-music-result">
                      <div className="sc-music-icon">🎙</div>
                      <div className="sc-music-title">Voiceover Ready</div>
                      <audio src={voAudioUrl} controls className="sc-music-player"/>
                      <button className="sc-sa-btn sc-vo-download-btn" onClick={() => downloadVideo(voAudioUrl, `superscene-voiceover-${Date.now()}.mp3`)}>⬇ Download MP3</button>
                      <div className="sc-sub sc-vo-hint">Want a talking avatar? Upload a photo in Step ③ on the left.</div>
                    </div>
                  ) : (
                    <div className="s-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/>
                      </svg>
                      <div className="s-title">Your voiceover will appear here</div>
                      <div className="s-sub">Write a script, pick a voice, and generate your voiceover. Then optionally create a lip-synced avatar.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ EDITOR TAB — Smart Editor ══ */}
        {tab === "editor" && (
          <div className="sc-editor-outer">
            {videoUrl ? (
              <div className="sc-editor-layout">
                {/* Left — Tools Panel */}
                <div className="sc-ed-tools">
                  <div className="sc-ed-tool-tabs">
                    {[{k:"trim",l:"✂ Trim"},{k:"speed",l:"⟳ Speed"},{k:"resize",l:"⛶ Resize"},{k:"export",l:"▲ Export"}].map(t => (
                      <button key={t.k} className={cls("sc-ed-tool-tab", editorTool === t.k && "on")} onClick={() => setEditorTool(t.k)}>{t.l}</button>
                    ))}
                  </div>
                  <div className="sc-ed-tool-body">

                    {editorTool === "trim" && (
                      <div className="sc-ed-tool-content">
                        <div className="sc-label">Trim Video</div>
                        <div className="sc-sub sc-ed-desc">Set start and end points to cut your video.</div>
                        <div className="sc-ed-range-row">
                          <label className="sc-ed-range-label">Start
                            <input type="number" className="sc-ed-range-input" value={trimStart} min={0} max={trimEnd} step={0.1}
                              onChange={e => { const v = parseFloat(e.target.value) || 0; setTrimStart(v); if (editorVideoRef.current) editorVideoRef.current.currentTime = v; }}/>
                            <span className="sc-ed-range-unit">s</span>
                          </label>
                          <label className="sc-ed-range-label">End
                            <input type="number" className="sc-ed-range-input" value={trimEnd} min={trimStart} step={0.1}
                              onChange={e => setTrimEnd(parseFloat(e.target.value) || 0)}/>
                            <span className="sc-ed-range-unit">s</span>
                          </label>
                        </div>
                        <div className="sc-ed-trim-dur">Duration: {Math.max(0, (trimEnd - trimStart)).toFixed(1)}s</div>
                        <button className="sc-ed-apply-btn" onClick={() => { if (editorVideoRef.current) editorVideoRef.current.currentTime = trimStart; }}>Preview Trim Point</button>
                      </div>
                    )}

                    {editorTool === "speed" && (
                      <div className="sc-ed-tool-content">
                        <div className="sc-label">Playback Speed</div>
                        <div className="sc-sub sc-ed-desc">Adjust video speed. Preview plays at selected speed.</div>
                        <div className="sc-ed-speed-grid">
                          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(s => (
                            <button key={s} className={cls("sc-ed-speed-btn", playbackSpeed === s && "on")} onClick={() => applySpeed(s)}>
                              {s}x
                            </button>
                          ))}
                        </div>
                        <div className="sc-ed-speed-info">Current: {playbackSpeed}x {playbackSpeed === 1 ? "(normal)" : playbackSpeed < 1 ? "(slow motion)" : "(fast)"}</div>
                      </div>
                    )}

                    {editorTool === "resize" && (
                      <div className="sc-ed-tool-content">
                        <div className="sc-label">Resize for Platform</div>
                        <div className="sc-sub sc-ed-desc">Choose a platform preset to auto-resize your video.</div>
                        <div className="sc-ed-resize-grid">
                          {Object.entries(EXPORT_PRESETS).map(([k, v]) => (
                            <button key={k} className={cls("sc-ed-resize-btn", exportPreset === k && "on")} onClick={() => setExportPreset(k)}>
                              <div className="sc-ed-resize-name">{v.label}</div>
                              {v.ratio && <div className="sc-ed-resize-ratio">{v.ratio}</div>}
                              {v.maxDur && <div className="sc-ed-resize-max">Max {v.maxDur}s</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {editorTool === "export" && (
                      <div className="sc-ed-tool-content">
                        <div className="sc-label">Export Video</div>
                        <div className="sc-sub sc-ed-desc">Download your video with current settings applied.</div>
                        <div className="sc-ed-export-summary">
                          <div className="sc-ed-export-row"><span>Format:</span><span>MP4</span></div>
                          <div className="sc-ed-export-row"><span>Speed:</span><span>{playbackSpeed}x</span></div>
                          <div className="sc-ed-export-row"><span>Preset:</span><span>{EXPORT_PRESETS[exportPreset].label}</span></div>
                          <div className="sc-ed-export-row"><span>Trim:</span><span>{trimStart}s → {trimEnd}s ({Math.max(0, trimEnd - trimStart).toFixed(1)}s)</span></div>
                          {captions.length > 0 && <div className="sc-ed-export-row"><span>Captions:</span><span>{captions.length} subtitle(s)</span></div>}
                        </div>
                        <button className="sc-gen-btn sc-ed-export-btn" onClick={handleEditorExport} disabled={editorProcessing}>
                          {editorProcessing ? editorProgress : "▲ Export & Download"}
                        </button>
                        <div className="sc-sub sc-ed-export-note">Free — no credits required</div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right — Video Preview */}
                <div className="sc-ed-preview">
                  <div className="sc-preview-label">Editor Preview {EXPORT_PRESETS[exportPreset].ratio ? `· ${EXPORT_PRESETS[exportPreset].label}` : ""}</div>
                  <div className="sc-ed-video-stage">
                    <div className={cls("sc-ed-frame",
                      EXPORT_PRESETS[exportPreset].ratio === "9:16" && "sc-ed-frame-9x16",
                      EXPORT_PRESETS[exportPreset].ratio === "16:9" && "sc-ed-frame-16x9",
                      EXPORT_PRESETS[exportPreset].ratio === "1:1" && "sc-ed-frame-1x1",
                      EXPORT_PRESETS[exportPreset].ratio === "4:3" && "sc-ed-frame-4x3",
                      !EXPORT_PRESETS[exportPreset].ratio && "sc-ed-frame-full"
                    )}>
                      <video ref={editorVideoRef} src={videoUrl} controls className="sc-ed-video" onLoadedMetadata={onEditorVideoLoad}/>
                      {showCaptionOverlay && captions.length > 0 && (
                        <div className={cls("sc-cap-overlay", `sc-cap-${captionStyle}`)}>
                          {captions[0]?.text || "Caption preview"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sc-stage-actions">
                    <button className="sc-sa-btn" onClick={() => openFramePicker(videoUrl)}>⟼ Extend</button>
                    <button className="sc-sa-btn" onClick={() => downloadVideo(videoUrl, `superscene-${Date.now()}.mp4`)}>⬇ Download</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sc-editor-wrap">
                <div className="sc-eempty">
                  <div className="sc-eicon">✂</div>
                  <div className="sc-etitle">Video Editor</div>
                  <div className="sc-esub">Generate a video first, then open it here to trim, adjust speed, resize for platforms, and export — completely free.</div>
                  <button className="sc-ecta" onClick={() => setTab("create")}>← Go to Creator</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STUDIO TAB — Long-form Video Pipeline ══ */}
        {tab === "studio" && (
          <div className="sc-music-view">
            {!pipeStatus ? (
              /* ── STEP 1: Script Input ── */
              <div className="sc-music-layout">
                <div className="sc-music-controls">
                  <div className="sc-studio-hero">
                    <div className="sc-studio-hero-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="3"/><polygon points="10,7 10,14 16,10.5"/>
                        <path d="M7 21h10"/><path d="M12 17v4"/>
                      </svg>
                    </div>
                    <div>
                      <div className="sc-studio-title">Video Studio</div>
                      <div className="sc-studio-desc">
                        Paste your script and SuperScene will break it into scenes, generate voiceover,
                        create AI video for each scene, and assemble a complete long-form video.
                      </div>
                    </div>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Script</div>
                    <div className={cls("sc-prompt-box", scriptExpanded && "sc-prompt-expanded")}>
                      <textarea className="sc-prompt-ta" rows={scriptExpanded ? 16 : 10} placeholder={"Paste your script here. Each paragraph will become a scene.\n\nExample:\nThe sun rises over the mountain valley, casting golden light across the landscape.\n\nA lone hiker reaches the summit, looking out over the endless horizon.\n\nAs clouds roll in, the scene transforms into a dramatic display of nature's power."}
                        value={pipeScript} onChange={e => setPipeScript(e.target.value.slice(0, 20000))}/>
                      <div className="sc-prompt-footer">
                        <span className="sc-prompt-ai" onClick={() => setTab("builder")}>✦ Generate<br/><span className="sc-prompt-ai-sub">With AI</span></span>
                        <div className="sc-prompt-actions">
                          <button className="sc-prompt-action" title="Copy" onClick={() => { if (pipeScript) navigator.clipboard.writeText(pipeScript); }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </button>
                          <button className="sc-prompt-action" title="Clear" onClick={() => setPipeScript("")}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                          <button className="sc-prompt-action" title="Paste" onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t) setPipeScript(p => (p + t).slice(0, 20000)); } catch {} }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                          </button>
                          <button className={cls("sc-prompt-action", scriptExpanded && "sc-prompt-action-active")} title={scriptExpanded ? "Collapse" : "Expand"} onClick={() => setScriptExpanded(x => !x)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{scriptExpanded ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></> : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>}</svg>
                          </button>
                          <span className="sc-prompt-count">{pipeScript.length}/20,000</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Title <span className="sc-label-badge">Optional</span></div>
                    <input type="text" className="sc-studio-input"
                      placeholder="My Video Project"
                      value={pipeTitle} onChange={e => setPipeTitle(e.target.value.slice(0, 200))}/>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Visual Style</div>
                    <div className="sc-pills">
                      {["cinematic", "corporate", "documentary", "social media", "anime", "abstract"].map(s => (
                        <button key={s} className={cls("sc-pill", pipeStyle === s && "on")} onClick={() => setPipeStyle(s)}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Video Model</div>
                    <div className="sc-model-sel" onClick={() => setPipeModelOpen(!pipeModelOpen)}>
                      <div className="sc-model-icon" style={{ background: `linear-gradient(135deg, ${MODELS.find(m => m.key === pipeModel)?.color || '#22d3ee'}, ${MODELS.find(m => m.key === pipeModel)?.color || '#22d3ee'}88)` }}>✦</div>
                      <div className="sc-model-info">
                        <div className="sc-model-name">{MODELS.find(m => m.key === pipeModel)?.name || pipeModel}</div>
                        <div className="sc-model-desc">{MODELS.find(m => m.key === pipeModel)?.desc || ""}</div>
                      </div>
                      <div className="sc-model-meta">
                        <span className="sc-model-badge" style={{ background: `${MODELS.find(m => m.key === pipeModel)?.color || '#22d3ee'}22`, color: MODELS.find(m => m.key === pipeModel)?.color || '#22d3ee' }}>{MODELS.find(m => m.key === pipeModel)?.badge || ""}</span>
                        <span className="sc-model-cost">{MODELS.find(m => m.key === pipeModel)?.cost || 3} cr/5s</span>
                      </div>
                      <span className={cls("sc-model-chev", pipeModelOpen && "open")}>▼</span>
                    </div>
                    {pipeModelOpen && (
                      <div className="sc-model-drop">
                        {MODELS.map(m => (
                          <button key={m.key} className={cls("sc-model-opt", pipeModel === m.key && "sel")}
                            onClick={() => { setPipeModel(m.key); setPipeModelOpen(false); }}>
                            <div className="sc-model-icon" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)` }}>✦</div>
                            <div className="sc-model-info"><div className="sc-model-name">{m.name}</div><div className="sc-model-desc">{m.desc}</div></div>
                            <div className="sc-model-meta">
                              <span className="sc-model-badge" style={{ background: `${m.color}22`, color: m.color }}>{m.badge}</span>
                              <span className="sc-model-cost">{m.cost} cr/5s</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Voiceover</div>
                    <div className="sc-model-sel" onClick={() => setPipeVoiceOpen(!pipeVoiceOpen)}>
                      <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #a78bfa, #a78bfa88)' }}>🎙</div>
                      <div className="sc-model-info">
                        <div className="sc-model-name">{VOICES.find(v => v.id === pipeVoice)?.name || "Guy"} · {VOICES.find(v => v.id === pipeVoice)?.gender} · {VOICES.find(v => v.id === pipeVoice)?.cat}</div>
                        <div className="sc-model-desc">{VOICES.find(v => v.id === pipeVoice)?.desc || ""}</div>
                      </div>
                      {pipeVoicePlaying === pipeVoice && <span className="sc-voice-playing">Playing…</span>}
                      <span className={cls("sc-model-chev", pipeVoiceOpen && "open")}>▼</span>
                    </div>
                    {pipeVoiceOpen && (
                      <div className="sc-model-drop">
                        {["American", "British", "Australian"].map(cat => (
                          <div key={cat}>
                            <div className="sc-voice-cat">{cat}</div>
                            {VOICES.filter(v => v.cat === cat).map(v => (
                              <div key={v.id} className={cls("sc-model-opt", pipeVoice === v.id && "sel")}
                                onClick={() => { setPipeVoice(v.id); setPipeVoiceOpen(false); }}>
                                <div className="sc-model-info">
                                  <div className="sc-model-name">{v.name} · {v.gender}</div>
                                  <div className="sc-model-desc">{v.desc}</div>
                                </div>
                                <button className={cls("sc-voice-play", pipeVoicePlaying === v.id && "playing")}
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (pipeVoicePlaying === v.id && pipeVoiceAudioRef.current) {
                                      pipeVoiceAudioRef.current.pause(); pipeVoiceAudioRef.current = null; setPipeVoicePlaying(null);
                                    } else {
                                      if (pipeVoiceAudioRef.current) { pipeVoiceAudioRef.current.pause(); }
                                      const audio = new Audio(`/api/superscene/voiceover/preview/${v.id}`);
                                      pipeVoiceAudioRef.current = audio; setPipeVoicePlaying(v.id); audio.play();
                                      audio.onended = () => { setPipeVoicePlaying(null); pipeVoiceAudioRef.current = null; };
                                    }
                                  }} title={pipeVoicePlaying === v.id ? "Stop" : "Preview"}>
                                  {pipeVoicePlaying === v.id ? "■" : "▶"}
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Resolution</div>
                    <div className="sc-pills">
                      {["720p", "1080p"].map(r => (
                        <button key={r} className={cls("sc-pill", pipeRes === r && "on")} onClick={() => setPipeRes(r)}>{r}</button>
                      ))}
                    </div>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Aspect Ratio</div>
                    <div className="sc-ratio-grid">
                      {RATIOS.map(r => (
                        <button key={r.key} className={cls("sc-ratio-card", pipeRatio === r.key && "on")} onClick={() => setPipeRatio(r.key)}>
                          <span className="sc-ratio-value">{r.key}</span>
                          <span className="sc-ratio-label">{r.label}</span>
                          <span className="sc-ratio-desc">{r.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sc-section">
                    <button className="sc-gen-btn" onClick={async () => {
                      if (!pipeScript.trim() || pipeAnalysing) return;
                      setPipeAnalysing(true); setPipeError(null);
                      try {
                        const res = await fetch("/api/superscene/pipeline/analyse", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ script: pipeScript, style: pipeStyle, model_key: pipeModel, voice: pipeVoice, resolution: pipeRes, title: pipeTitle }),
                        });
                        const data = await res.json();
                        if (!res.ok) { setPipeError(data.detail || "Analysis failed"); setPipeAnalysing(false); return; }
                        setPipeId(data.pipeline_id); setPipeScenes(data.scenes); setPipeStatus("draft"); setCredits(data.credits_remaining);
                      } catch (e) { setPipeError("Network error — please try again"); }
                      setPipeAnalysing(false);
                    }} disabled={!pipeScript.trim() || pipeAnalysing}>
                      {pipeAnalysing ? "Analysing script…" : !pipeScript.trim() ? "Paste a script to get started" : "Analyse Script — 1 credit"}
                    </button>
                    {pipeError && <div className="sc-scene-error">{pipeError}</div>}
                  </div>
                </div>

                <div className="sc-music-preview">
                  <div className="sc-preview-label">Preview</div>
                  <div className="sc-music-stage">
                    <div className="s-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2">
                        <rect x="2" y="3" width="20" height="14" rx="3"/><path d="M8 21h8"/><path d="M12 17v4"/><polygon points="10,7 10,14 16,10.5"/>
                      </svg>
                      <div className="s-title">Your video will appear here</div>
                      <div className="s-sub">Paste a script, configure settings, and analyse to begin</div>
                      <button className="sc-ecta" onClick={() => setStudioGuideOpen(true)}>📖 How it works</button>
                    </div>
                  </div>
                </div>

                {/* Studio Guide Modal */}
                {studioGuideOpen && (
                  <>
                    <div className="sc-overlay" onClick={() => setStudioGuideOpen(false)}/>
                    <div className="sc-hdrawer">
                      <div className="sc-hhead">
                        <div className="sc-htitle">How Video Studio Works</div>
                        <button className="sc-hclose" onClick={() => setStudioGuideOpen(false)}>✕</button>
                      </div>
                      <div className="sc-hbody">
                        {[
                          { num: "1", title: "Paste your script", desc: "Write or paste the narration for your video. Each paragraph becomes a scene." },
                          { num: "2", title: "AI breaks it into scenes", desc: "Claude AI analyses your script and creates visual prompts for each scene." },
                          { num: "3", title: "Review and edit", desc: "Adjust the visual description for any scene before generating." },
                          { num: "4", title: "Generate", desc: "SuperScene generates voiceover + AI video for each scene automatically." },
                          { num: "5", title: "Final video", desc: "All scenes are assembled into one complete video with voiceover narration." },
                        ].map(step => (
                          <div key={step.num} className="sc-hitem">
                            <div className="sc-studio-step">
                              <div className="sc-studio-step-num">{step.num}</div>
                              <div>
                                <div className="sc-studio-step-title">{step.title}</div>
                                <div className="sc-studio-step-desc">{step.desc}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="sc-htip">
                          <div className="sc-httitle">Tips</div>
                          <div className="sc-hti">Keep paragraphs short — each becomes one scene</div>
                          <div className="sc-hti">Write narration as spoken word, not prose</div>
                          <div className="sc-hti">You can edit visual prompts after AI analysis</div>
                          <div className="sc-hti">Lower-cost models are great for drafts</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : pipeStatus === "draft" ? (
              /* ── STEP 2: Scene Review & Edit ── */
              <div className="sc-studio-page">
                <div className="sc-studio-header">
                  <div className="sc-studio-header-info">
                    <div className="sc-studio-title">{pipeTitle || "Scene Breakdown"}</div>
                    <div className="sc-sub">{pipeScenes.length} scenes · Review and edit before generating</div>
                  </div>
                  <div className="sc-studio-header-actions">
                    <button className="sc-ecta" onClick={() => { setPipeStatus(null); setPipeScenes([]); setPipeId(null); }}>← Back to Script</button>
                    <button className="sc-gen-btn" onClick={async () => {
                      setPipeError(null);
                      try {
                        const res = await fetch(`/api/superscene/pipeline/${pipeId}/generate`, {
                          method: "POST", headers: { "Content-Type": "application/json" },
                        });
                        const data = await res.json();
                        if (!res.ok) { setPipeError(data.detail || "Generation failed"); return; }
                        setPipeStatus("generating"); setPipeCompleted(0); setCredits(data.credits_remaining);
                        if (pipePollRef.current) clearInterval(pipePollRef.current);
                        pipePollRef.current = setInterval(async () => {
                          try {
                            const pr = await fetch(`/api/superscene/pipeline/${pipeId}/status`);
                            const pd = await pr.json();
                            setPipeStatus(pd.status); setPipeCompleted(pd.completed_scenes); setPipeScenes(pd.scenes);
                            if (pd.status === "completed") {
                              setPipeFinalUrl(pd.final_video_url); clearInterval(pipePollRef.current);
                              fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
                            } else if (pd.status === "failed") {
                              setPipeError(pd.error_message || "Pipeline failed"); clearInterval(pipePollRef.current);
                            }
                          } catch {}
                        }, 5000);
                      } catch (e) { setPipeError("Network error"); }
                    }}>Generate All Scenes</button>
                  </div>
                </div>
                {pipeError && <div className="sc-scene-error" style={{ marginBottom: 16 }}>{pipeError}</div>}
                <div className="sc-scene-list">
                  {pipeScenes.map((scene, i) => (
                    <div key={i} className="sc-sb-scene">
                      <div className="sc-sb-scene-head">
                        <span className="sc-sb-scene-num">Scene {scene.scene_number || i + 1}</span>
                        <span className="sc-sb-scene-meta">{scene.estimated_duration || scene.duration_seconds || 10}s · {scene.transition_type || "cut"}</span>
                      </div>
                      <div className="sc-scene-field">
                        <div className="sc-scene-label">Narration</div>
                        <textarea className="sc-prompt-ta sc-scene-textarea" rows={2}
                          value={scene.narration_text || ""} onChange={e => {
                            const updated = [...pipeScenes];
                            updated[i] = { ...updated[i], narration_text: e.target.value };
                            setPipeScenes(updated);
                          }}/>
                      </div>
                      <div className="sc-scene-field">
                        <div className="sc-scene-label">Visual Prompt</div>
                        <textarea className="sc-prompt-ta sc-scene-textarea" rows={2}
                          value={scene.visual_prompt || ""} onChange={e => {
                            const updated = [...pipeScenes];
                            updated[i] = { ...updated[i], visual_prompt: e.target.value };
                            setPipeScenes(updated);
                          }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── STEP 3: Generation Progress / Completed ── */
              <div className="sc-studio-page">
                <div className="sc-studio-header">
                  <div className="sc-studio-header-info">
                    <div className="sc-studio-title">{pipeTitle || "Video Production"}</div>
                    <div className="sc-sub">
                      {pipeStatus === "completed" ? "Video complete!" :
                       pipeStatus === "failed" ? "Production failed" :
                       pipeStatus === "assembling" ? "Assembling final video…" :
                       `Generating scenes… ${pipeCompleted} / ${pipeScenes.length} complete`}
                    </div>
                  </div>
                  {pipeStatus === "completed" && (
                    <button className="sc-ecta" onClick={() => { setPipeStatus(null); setPipeScenes([]); setPipeId(null); setPipeFinalUrl(null); }}>
                      Create New Video
                    </button>
                  )}
                  {pipeStatus === "failed" && (
                    <button className="sc-ecta" onClick={() => { setPipeStatus("draft"); setPipeError(null); }}>← Back to Scenes</button>
                  )}
                </div>

                {pipeStatus !== "completed" && pipeStatus !== "failed" && (
                  <div className="sc-studio-progress">
                    <div className="pt"><div className="pf" style={{ width: `${pipeScenes.length > 0 ? (pipeCompleted / pipeScenes.length) * 100 : 0}%` }}/></div>
                    <div className="sc-studio-progress-text">
                      {pipeStatus === "assembling" ? "Assembling video with FFmpeg…" : `Scene ${pipeCompleted + 1} of ${pipeScenes.length}`}
                    </div>
                  </div>
                )}

                {pipeError && <div className="sc-scene-error" style={{ marginBottom: 16 }}>{pipeError}</div>}

                {pipeStatus === "completed" && pipeFinalUrl && (
                  <div className="sc-studio-final">
                    <div className="sc-stage">
                      <video src={pipeFinalUrl} controls autoPlay className="sc-studio-final-vid"/>
                    </div>
                    <div className="sc-stage-actions">
                      <button className="sc-sa-btn" onClick={() => downloadVideo(pipeFinalUrl, `superscene-studio-${Date.now()}.mp4`)}>⬇ Download Video</button>
                    </div>
                  </div>
                )}

                <div className="sc-scene-list">
                  {pipeScenes.map((scene, i) => {
                    const badgeClass = scene.status === "completed" ? "sc-scene-badge-done"
                      : (scene.status === "generating") ? "sc-scene-badge-active"
                      : scene.status === "voiceover" ? "sc-scene-badge-vo"
                      : scene.status === "failed" ? "sc-scene-badge-fail"
                      : "sc-scene-badge-pending";
                    const badgeText = scene.status === "voiceover" ? "Voiceover"
                      : scene.status === "generating" ? "Generating"
                      : scene.status === "completed" ? "Done"
                      : scene.status === "failed" ? "Failed" : "Pending";
                    return (
                      <div key={i} className={cls("sc-sb-scene",
                        scene.status === "completed" && "done",
                        (scene.status === "generating" || scene.status === "voiceover") && "active",
                        scene.status === "failed" && "fail")}>
                        <div className="sc-sb-scene-head">
                          <span className="sc-sb-scene-num">Scene {scene.scene_number || i + 1}</span>
                          <div className="sc-studio-header-actions">
                            <span className="sc-sb-scene-meta">{scene.duration_seconds || 10}s</span>
                            <span className={cls("sc-scene-badge", badgeClass)}>{badgeText}</span>
                          </div>
                        </div>
                        <div className="sc-sb-prompt">{scene.narration_text}</div>
                        {scene.visual_prompt && <div className="sc-sub">Visual: {scene.visual_prompt.slice(0, 100)}…</div>}
                        {scene.error_message && <div className="sc-scene-error">{scene.error_message}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ GALLERY TAB ══ */}
        {tab === "gallery" && (
          <div className="sc-gallery-view">
            <div className="sc-gallery-header">
              <div className="sc-studio-hero">
                <div className="sc-studio-hero-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </div>
                <div>
                  <div className="sc-studio-title">Gallery</div>
                  <div className="sc-studio-desc">Your generated videos and creations. Click to play, extend, edit, or download.</div>
                </div>
              </div>
              <div className="sc-gallery-filters">
                {[
                  { key: "all", label: "All" },
                  { key: "completed", label: "Completed" },
                  { key: "pending", label: "Pending" },
                  { key: "failed", label: "Failed" },
                ].map(f => (
                  <button key={f.key} className={cls("sc-gallery-filter", galleryFilter === f.key && "on")}
                    onClick={() => setGalleryFilter(f.key)}>{f.label}</button>
                ))}
                <div className="sc-gallery-count">{videos.length} video{videos.length !== 1 ? "s" : ""}</div>
              </div>
            </div>

            {videos.length === 0 ? (
              <div className="sc-gallery-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <div className="s-title">No videos yet</div>
                <div className="s-sub">Generate your first video to see it here.</div>
                <button className="sc-ecta" onClick={() => setTab("create")}>← Go to Creator</button>
              </div>
            ) : (
              <div className="sc-gg">
                {videos
                  .filter(v => galleryFilter === "all" || v.status === galleryFilter)
                  .map(v => (
                  <div key={v.id} className="sc-gc">
                    <div className="sc-gct" onClick={() => { if (v.video_url) { setVideoUrl(v.video_url); setTab("create"); } }}>
                      {v.video_url ? (
                        <video src={v.video_url} className="sc-gvid" muted
                          onMouseEnter={e => e.target.play()}
                          onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}/>
                      ) : (
                        <div className="sc-gc-placeholder">▶</div>
                      )}
                      <div className="sc-gcd">{v.duration}s</div>
                      {v.status === "pending" && <div className="sc-gc-status sc-gc-status-pending">Pending</div>}
                      {v.status === "failed" && <div className="sc-gc-status sc-gc-status-failed">Failed</div>}
                    </div>
                    <div className="sc-gcb">
                      <div className="sc-gctitle">{v.prompt.length > 80 ? v.prompt.slice(0, 80) + "…" : v.prompt}</div>
                      <div className="sc-gcmod">{v.model_name} · {v.ratio} · {v.credits_used} cr</div>
                      <div className="sc-gcdate">{formatDate(v.created_at)}</div>
                      <div className="sc-gcas">
                        {v.video_url && <button className="sc-gca sc-gca-extend" onClick={() => openFramePicker(v.video_url)}>⟼ Extend</button>}
                        {v.video_url && <button className="sc-gca" onClick={() => { setVideoUrl(v.video_url); setTab("editor"); }}>Edit</button>}
                        {v.video_url && <button className="sc-gca" onClick={() => downloadVideo(v.video_url, `superscene-${v.model_name}-${v.id}.mp4`)}>Download</button>}
                        <button className="sc-gca sc-gca-del" onClick={async () => {
                          if (!confirm("Delete this video?")) return;
                          try {
                            const res = await fetch(`/api/superscene/videos/${v.id}`, { method: "DELETE" });
                            if (res.ok) fetchVideos();
                            else alert("Delete failed");
                          } catch { alert("Delete failed"); }
                        }}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="sc-gadd" onClick={() => setTab("create")}>
                  <span className="sc-gadd-icon">+</span>
                  <span>Generate new video</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PACKS TAB ══ */}
        {tab === "packs" && (
          <div className="sc-packs-view">
            <div className="sc-ph"><h2>Credit Packs</h2><p>Pay once, generate anytime. Credits never expire.</p>
              <div className="sc-payment-badges"><span className="sc-pay-badge">🌐 350+ Cryptos</span><span className="sc-pay-badge">🔷 USDT Direct</span></div>
            </div>
            <div className="sc-pgrid">
              {PACKS.map(pack => (
                <div key={pack.slug} className={cls("sc-pk", pack.popular && "pop")}>
                  {pack.popular && <div className="sc-pbdg">MOST POPULAR</div>}
                  <div className="sc-pname">{pack.label}</div>
                  <div className="sc-pcred">{pack.credits}</div>
                  <div className="sc-pcl">credits</div>
                  <div className="sc-ppr">${pack.price}</div>
                  <div className="sc-pper">{(pack.price / pack.credits * 100).toFixed(2)}¢ per credit</div>
                  <button className={cls("sc-pbtn sc-pbtn-buy", pack.popular ? "pop" : "n")} onClick={() => buyNowPayments(pack.slug)} disabled={buyingPack === pack.slug}>
                    {buyingPack === pack.slug ? "…" : "🌐 Pay with 350+ Cryptos"}</button>
                  <button className="sc-pbtn sc-pbtn-crypto" onClick={() => openCryptoCheckout(pack.slug)} disabled={buyingPack === pack.slug}>🔷 Pay with USDT</button>
                </div>
              ))}
            </div>
            <div className="sc-pfooter">🔒 350+ cryptos via NOWPayments · Direct USDT/Polygon · Credits never expire</div>
            {cryptoOrder && (
              <CryptoCheckout
                productKey={cryptoOrder.productKey}
                productLabel={cryptoOrder.label}
                onSuccess={() => { setCryptoOrder(null); fetch("/api/superscene/credits", { credentials: "include" }).then(r => r.json()).then(d => setCredits(d.balance || 0)); }}
                onCancel={() => setCryptoOrder(null)}
              />
            )}
          </div>
        )}

        {/* ══ AI PROMPT BUILDER TAB ══ */}
        {tab === "builder" && (
          <div className="sc-builder-view">
            <div className="sc-builder-inner">
              <div className="sc-builder-head"><span className="sc-builder-title">✦ AI Prompt Builder</span><span className="sc-aip-badge">AI</span></div>
              <div className="sc-builder-body">
                <div className="sc-af"><div className="sc-afl">Subject / Scene</div>
                  <input className="sc-ainp" placeholder="e.g. mountain valley, city at night, ocean at sunset…" value={aiSubject} onChange={e => setAiSubject(e.target.value)}/></div>
                <div className="sc-af"><div className="sc-afl">Style</div>
                  <div className="sc-section">
                    <div className="sc-model-sel" onClick={() => setAiStyleOpen(!aiStyleOpen)}>
                      <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf688)' }}>◆</div>
                      <div className="sc-model-info">
                        <div className="sc-model-name">{aiStyle || "Choose a style…"}</div>
                        <div className="sc-model-desc">{
                          aiStyle === "Cinematic" ? "Film-quality, dramatic framing and color" :
                          aiStyle === "Documentary" ? "Natural, observational, real-world feel" :
                          aiStyle === "Lo-fi / Dreamy" ? "Soft focus, muted tones, nostalgic" :
                          aiStyle === "Hyper-realistic" ? "Ultra-detailed, photographic precision" :
                          aiStyle === "Anime / Stylised" ? "Bold lines, vibrant, animated aesthetic" :
                          aiStyle === "Dark & Dramatic" ? "High contrast, moody shadows, tension" :
                          aiStyle === "Bright & Vibrant" ? "Saturated colours, energetic, upbeat" :
                          "Select a visual style for your prompt"
                        }</div>
                      </div>
                      <span className={cls("sc-model-chev", aiStyleOpen && "open")}>▼</span>
                    </div>
                    {aiStyleOpen && (
                      <div className="sc-model-drop">
                        {[
                          { key: "Cinematic",         desc: "Film-quality, dramatic framing and color",    icon: "🎬" },
                          { key: "Documentary",       desc: "Natural, observational, real-world feel",     icon: "📹" },
                          { key: "Lo-fi / Dreamy",    desc: "Soft focus, muted tones, nostalgic",          icon: "🌙" },
                          { key: "Hyper-realistic",   desc: "Ultra-detailed, photographic precision",      icon: "📷" },
                          { key: "Anime / Stylised",  desc: "Bold lines, vibrant, animated aesthetic",     icon: "✨" },
                          { key: "Dark & Dramatic",   desc: "High contrast, moody shadows, tension",       icon: "🖤" },
                          { key: "Bright & Vibrant",  desc: "Saturated colours, energetic, upbeat",         icon: "☀" },
                        ].map(s => (
                          <button key={s.key} className={cls("sc-model-opt", aiStyle === s.key && "sel")}
                            onClick={() => { setAiStyle(s.key); setAiStyleOpen(false); }}>
                            <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf688)', fontSize: 16 }}>{s.icon}</div>
                            <div className="sc-model-info">
                              <div className="sc-model-name">{s.key}</div>
                              <div className="sc-model-desc">{s.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="sc-af"><div className="sc-afl">Camera Movement</div>
                  <div className="sc-achips">
                    {["Slow push-in","Aerial pan","Tracking shot","Handheld","Crane shot","Static","Dolly zoom","Orbit"].map(c => (
                      <button key={c} className={cls("sc-achip", aiCams.includes(c) && "on")} onClick={() => toggleChip(c, aiCams, setAiCams)}>{c}</button>
                    ))}</div></div>
                <div className="sc-af"><div className="sc-afl">Lighting</div>
                  <div className="sc-achips">
                    {["Golden hour","Blue hour","Neon-lit","Overcast","Studio lit","Moonlit","Harsh midday","Foggy"].map(l => (
                      <button key={l} className={cls("sc-achip", aiLights.includes(l) && "on")} onClick={() => toggleChip(l, aiLights, setAiLights)}>{l}</button>
                    ))}</div></div>
                <div className="sc-af"><div className="sc-afl">Mood / Atmosphere (optional)</div>
                  <div className="sc-achips">
                    {["Epic","Serene","Tense","Mysterious","Joyful","Melancholic"].map(m => (
                      <button key={m} className="sc-achip">{m}</button>
                    ))}</div></div>
                <button className="sc-abtn" onClick={buildPrompt}>✦ Build My Prompt</button>
                {aiResult && (
                  <div className="sc-ares">
                    <div className="sc-ares-text">{aiResult}</div>
                    <div className="sc-ares-acts">
                      <button className="sc-ara sc-ara-use" onClick={useAiPrompt}>↑ Use this prompt</button>
                      <button className="sc-ara sc-ara-reg" onClick={buildPrompt}>↺ Regenerate</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ IMAGES TAB — AI Image Generator ══ */}
        {tab === "images" && (
          <div className="sc-music-view">
            <div className="sc-music-layout">
              {/* Left — Controls */}
              <div className="sc-music-controls">
                <div className="sc-studio-hero">
                  <div className="sc-studio-hero-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                  <div>
                    <div className="sc-studio-title">AI Image Generator</div>
                    <div className="sc-studio-desc">Create stunning images from text descriptions. Product photos, thumbnails, social graphics, and more.</div>
                  </div>
                </div>

                {/* Model */}
                <div className="sc-section">
                  <div className="sc-label">Model</div>
                  <div className="sc-model-sel" onClick={() => setImgModelOpen(!imgModelOpen)}>
                    <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #8b5cf688)' }}>✦</div>
                    <div className="sc-model-info">
                      <div className="sc-model-name">{IMG_MODELS.find(m => m.key === imgModel)?.name || imgModel}</div>
                      <div className="sc-model-desc">{IMG_MODELS.find(m => m.key === imgModel)?.desc || ""}</div>
                    </div>
                    {IMG_MODELS.find(m => m.key === imgModel)?.badge && (
                      <div className="sc-model-meta">
                        <span className="sc-model-badge" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{IMG_MODELS.find(m => m.key === imgModel)?.badge}</span>
                      </div>
                    )}
                    <span className={cls("sc-model-chev", imgModelOpen && "open")}>▼</span>
                  </div>
                  {imgModelOpen && (
                    <div className="sc-model-drop">
                      {IMG_MODELS.map(m => (
                        <button key={m.key} className={cls("sc-model-opt", imgModel === m.key && "sel")}
                          onClick={() => { setImgModel(m.key); setImgModelOpen(false); }}>
                          <div className="sc-model-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #8b5cf688)' }}>✦</div>
                          <div className="sc-model-info"><div className="sc-model-name">{m.name}</div><div className="sc-model-desc">{m.desc}</div></div>
                          {m.badge && (
                            <div className="sc-model-meta">
                              <span className="sc-model-badge" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{m.badge}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prompt — enhanced with action buttons */}
                <div className="sc-section">
                  <div className="sc-label">Prompt</div>
                  <div className={cls("sc-prompt-box", imgPromptExpanded && "sc-prompt-expanded")}>
                    <textarea className="sc-prompt-ta" rows={imgPromptExpanded ? 12 : 5}
                      placeholder="A professional product photo of wireless earbuds on a marble surface, soft studio lighting, shallow depth of field, 8K, photorealistic"
                      value={imgPrompt} onChange={e => setImgPrompt(e.target.value.slice(0, 2000))}/>
                    <div className="sc-prompt-footer">
                      <span className="sc-prompt-ai" onClick={() => setTab("builder")}>✦ Generate<br/><span className="sc-prompt-ai-sub">With AI</span></span>
                      <div className="sc-prompt-actions">
                        <button className="sc-prompt-action" title="Copy" onClick={() => { if (imgPrompt) navigator.clipboard.writeText(imgPrompt); }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        <button className="sc-prompt-action" title="Clear" onClick={() => setImgPrompt("")}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                        <button className="sc-prompt-action" title="Paste" onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t) setImgPrompt(p => (p + t).slice(0, 2000)); } catch {} }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        </button>
                        <button className={cls("sc-prompt-action", imgPromptExpanded && "sc-prompt-action-active")} title={imgPromptExpanded ? "Collapse" : "Expand"} onClick={() => setImgPromptExpanded(x => !x)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{imgPromptExpanded ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></> : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>}</svg>
                        </button>
                        <span className="sc-prompt-count">{imgPrompt.length}/2000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Negative Prompt */}
                <div className="sc-section">
                  <div className="sc-label">Negative Prompt <span className="sc-label-badge">Optional</span></div>
                  <div className="sc-prompt-box">
                    <textarea className="sc-prompt-ta sc-scene-textarea" rows={2}
                      placeholder="Things to exclude: blurry, low quality, watermark, text, distorted, cropped…"
                      value={imgNegPrompt} onChange={e => setImgNegPrompt(e.target.value.slice(0, 500))}/>
                  </div>
                </div>

                {/* Aspect Ratio — labelled cards */}
                <div className="sc-section">
                  <div className="sc-label">Aspect Ratio</div>
                  <div className="sc-ratio-grid">
                    {[
                      { key: "1:1",  label: "Square",    desc: "Instagram / Social" },
                      { key: "16:9", label: "Landscape", desc: "YouTube / Banner" },
                      { key: "9:16", label: "Portrait",  desc: "Stories / Reels" },
                      { key: "4:3",  label: "Classic",   desc: "Presentations" },
                    ].map(r => (
                      <button key={r.key} className={cls("sc-ratio-card", imgSize === r.key && "on")} onClick={() => setImgSize(r.key)}>
                        <span className="sc-ratio-value">{r.key}</span>
                        <span className="sc-ratio-label">{r.label}</span>
                        <span className="sc-ratio-desc">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div className="sc-section">
                  <div className="sc-label">Quality</div>
                  <div className="sc-pills">
                    {IMG_QUALITIES.map(q => (
                      <button key={q} className={cls("sc-pill", imgQuality === q && "on")} onClick={() => setImgQuality(q)}>
                        {q} <span className="sc-pill-credit">{IMG_CREDIT_MAP[q]}cr</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch Count */}
                <div className="sc-section">
                  <div className="sc-label">Number of Images</div>
                  <div className="sc-pills">
                    {[1, 2, 4].map(n => (
                      <button key={n} className={cls("sc-pill", imgBatch === n && "on")} onClick={() => setImgBatch(n)}>
                        {n} {n === 1 ? "image" : "images"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed Control */}
                <div className="sc-section">
                  <div className="sc-seed-row">
                    <button className={cls("sc-seed-toggle", seedLocked && "on")} onClick={toggleSeedLock} title={seedLocked ? "Unlock seed" : "Lock seed"}>
                      {seedLocked ? "🔒" : "🔓"}
                    </button>
                    <div className="sc-seed-info">
                      <span className="sc-seed-label">Seed</span>
                      <span className="sc-seed-value">{seedLocked ? seedValue : "Random"}</span>
                    </div>
                    {seedLocked && (
                      <button className="sc-seed-refresh" onClick={refreshSeed} title="New seed">↻</button>
                    )}
                  </div>
                </div>

                {/* Generate */}
                <div className="sc-section">
                  <div className="sc-credit-line">
                    <div className="sc-cl-icon">◈</div>
                    <span className="sc-cl-label">Cost:</span>
                    <span className="sc-cl-value">{(IMG_CREDIT_MAP[imgQuality] || 2) * imgBatch} credits</span>
                  </div>
                  <button className="sc-gen-btn" onClick={generateImage} disabled={!imgPrompt.trim() || imgGenerating}>
                    {imgGenerating ? "Generating…" : !imgPrompt.trim() ? "Enter a prompt" : `🖼 Generate ${imgBatch > 1 ? imgBatch + " Images" : "Image"} — ${(IMG_CREDIT_MAP[imgQuality] || 2) * imgBatch} credits`}
                  </button>
                </div>
              </div>

              {/* Right — Preview */}
              <div className="sc-music-preview">
                <div className="sc-preview-label">Generated Image</div>
                <div className="sc-music-stage">
                  {imgGenerating ? (
                    <div className="gst">
                      <div className="spin"><div className="r1"/><div className="r2"/></div>
                      <div className="gst-title">Generating {imgBatch > 1 ? `${imgBatch} images` : "image"}…</div>
                      <div className="gst-sub">{IMG_MODELS.find(m => m.key === imgModel)?.name} · {imgQuality} · {imgSize}</div>
                      <div className="pt"><div className="pf" style={{ width: `${Math.min(imgProgress, 100)}%` }}/></div>
                      <div className="gst-pct">{Math.round(imgProgress)}%</div>
                    </div>
                  ) : imgResults.length > 0 ? (
                    <div className={cls("sc-img-results", imgResults.length >= 2 && "sc-img-grid-2")}>
                      {imgResults.map((url, i) => (
                        <div key={i} className="sc-img-result-item">
                          <img src={url} alt={`Generated ${i+1}`} className="sc-img-result-img"/>
                          <div className="sc-img-result-actions">
                            <button className="sc-sa-btn" onClick={() => downloadVideo(url, `superscene-image-${Date.now()}.png`)}>⬇ Download</button>
                            <button className="sc-sa-btn" onClick={() => { navigator.clipboard.writeText(url); }}>📋 Copy URL</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="s-empty">
                      <svg className="sc-img-empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5a5a62" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <div className="s-title">Your image will appear here</div>
                      <div className="s-sub">Choose a model, describe what you want, and generate</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ CAPTIONS TAB ══ */}
        {tab === "captions" && (
          <div className="sc-captions-view">
            <div className="sc-cap-layout">
              {/* Left — Caption Editor */}
              <div className="sc-cap-editor">
                <div className="sc-label">Add Captions</div>
                <div className="sc-sub sc-ed-desc">Add styled subtitles to your generated video. Type captions manually or use auto-transcribe.</div>

                {/* Caption Style Selector */}
                <div className="sc-cap-styles">
                  {[{k:"tiktok",l:"TikTok",color:"#fff",bg:"rgba(0,0,0,.7)"},{k:"youtube",l:"YouTube",color:"#fff",bg:"rgba(0,0,0,.85)"},{k:"minimal",l:"Minimal",color:"#fff",bg:"rgba(0,0,0,.45)"},{k:"bold",l:"Bold Pop",color:"#ff0",bg:"rgba(0,0,0,.6)"}].map(s => (
                    <button key={s.k} className={cls("sc-cap-style-btn", captionStyle === s.k && "on")} onClick={() => setCaptionStyle(s.k)}>
                      <div className="sc-cap-style-preview" style={{ color: s.color, background: s.bg }}>{s.l}</div>
                    </button>
                  ))}
                </div>

                {/* Add Caption */}
                <div className="sc-cap-add-row">
                  <input className="sc-cap-input" placeholder="Type caption text…" value={captionText} onChange={e => setCaptionText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCaption(); }}/>
                  <button className="sc-cap-add-btn" onClick={addCaption} disabled={!captionText.trim()}>+ Add</button>
                </div>

                {/* Caption List */}
                <div className="sc-cap-list">
                  {captions.length === 0 ? (
                    <div className="sc-cap-empty">No captions yet. Type text above and click Add.</div>
                  ) : captions.map((cap, idx) => (
                    <div key={cap.id} className="sc-cap-item">
                      <div className="sc-cap-item-num">{idx + 1}</div>
                      <div className="sc-cap-item-body">
                        <input className="sc-cap-item-text" value={cap.text} onChange={e => updateCaption(cap.id, { text: e.target.value })}/>
                        <div className="sc-cap-timing">
                          <label>Start: <input type="number" className="sc-cap-time-input" value={cap.start} min={0} step={0.5}
                            onChange={e => updateCaption(cap.id, { start: parseFloat(e.target.value) || 0 })}/> s</label>
                          <label>End: <input type="number" className="sc-cap-time-input" value={cap.end} min={0} step={0.5}
                            onChange={e => updateCaption(cap.id, { end: parseFloat(e.target.value) || 0 })}/> s</label>
                        </div>
                      </div>
                      <button className="sc-cap-item-remove" onClick={() => removeCaption(cap.id)}>✕</button>
                    </div>
                  ))}
                </div>

                {captions.length > 0 && (
                  <button className="sc-cap-preview-btn" onClick={() => setShowCaptionOverlay(!showCaptionOverlay)}>
                    {showCaptionOverlay ? "Hide Preview" : "Preview with Captions"}
                  </button>
                )}
              </div>

              {/* Right — Preview */}
              <div className="sc-cap-preview">
                <div className="sc-preview-label">Caption Preview</div>
                <div className="sc-cap-stage">
                  {videoUrl ? (
                    <div className="sc-cap-video-wrap">
                      <video src={videoUrl} controls className="sc-cap-video" id="cap-preview-video"/>
                      {showCaptionOverlay && captions.length > 0 && (
                        <div className={cls("sc-cap-overlay", `sc-cap-${captionStyle}`)}>
                          {captions[0]?.text || "Caption preview"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="s-empty">
                      <div className="s-icon">T</div>
                      <div className="s-title">No video to caption</div>
                      <div className="s-sub">Generate a video first in the Create tab, then come here to add captions.</div>
                      <button className="sc-ecta" onClick={() => setTab("create")}>← Go to Creator</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>{/* /ws */}

      {/* ── HELP DRAWER ──────────────────────────────────── */}
      {helpOpen && (
        <div className="sc-hdrawer">
          <div className="sc-hhead"><span className="sc-htitle">SuperScene Guide</span>
            <button className="sc-hclose" onClick={() => setHelpOpen(false)}>×</button></div>
          <div className="sc-hbody">

            <div className="sc-hitem"><div className="sc-hititle" style={{ fontSize: 15, marginBottom: 12 }}>Quality Tiers Explained</div>
              <div className="sc-hibody">SuperScene automatically selects the best AI model for your chosen quality level. Here's what each tier delivers:</div>
            </div>

            {[
              { tier: "Quick", cr: "1-2", speed: "~30 seconds", models: "Hailuo 2.3 · WAN 2.6", 
                desc: "Fast drafts for iteration. Great for testing ideas and concepts before committing to higher quality. Good motion, solid output.",
                best: "Social media drafts, quick concepts, storyboard testing",
                img: "https://cdn.evolink.ai/2026/01/9950e1e6404479f6bfdb01c1f564f003.webp" },
              { tier: "Standard", cr: "2-3", speed: "~1-2 minutes", models: "Kling 3.0 · Seedance 1.5 Pro",
                desc: "Best balance of quality and cost. Cinematic motion, smooth transitions. Seedance includes AI-generated audio. Most popular choice.",
                best: "Marketing videos, product demos, social content, videos with audio",
                img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764733217.webp" },
              { tier: "Premium", cr: "5-8", speed: "~2-4 minutes", models: "Kling O3 · Sora 2 Pro",
                desc: "Top-tier quality from the latest AI models. Kling O3 is the next generation with exceptional detail. Sora 2 Pro delivers photorealistic output.",
                best: "Professional ads, brand content, hero videos, high-stakes projects",
                img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764734126.webp" },
              { tier: "Ultra", cr: "15-25", speed: "~3-5 minutes", models: "VEO 3.1 Pro (4K)",
                desc: "Maximum quality at 4K resolution. Google's most advanced video model with stunning cinematic detail, native audio, and reference image support.",
                best: "Film-quality content, 4K production, cinematic storytelling",
                img: "https://media.nanobananaproapi.com/2025/11/c909eb7af0b71ba4c65a84943bbe7faa.webp" },
            ].map(t => (
              <div key={t.tier} className="sc-hitem" style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 14 }}>
                <div className="sc-hititle">{t.tier} — {t.cr} credits/5s</div>
                <div className="sc-hibody" style={{ marginBottom: 6 }}>{t.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Models: {t.models}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Speed: {t.speed} · Best for: {t.best}</div>
                <img src={t.img} alt={`${t.tier} example`} style={{ width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'cover', opacity: 0.85 }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
            ))}

            <div className="sc-hitem" style={{ marginTop: 8 }}><div className="sc-hititle" style={{ fontSize: 15, marginBottom: 12 }}>Image Models</div>
              <div className="sc-hibody">
                {[
                  { n: "Z Turbo", d: "Ultra-fast (~3 seconds). Great for quick iterations." },
                  { n: "Nano Banana 2", d: "Best all-round quality with text rendering support." },
                  { n: "NB2 Beta", d: "Web search grounding — generates images based on real-world references." },
                  { n: "Seedream 5.0", d: "ByteDance model with flexible sizes and batch support." },
                  { n: "Seedream 4.5", d: "Multi-image editing, up to 4K resolution." },
                  { n: "GPT Image", d: "OpenAI's image generation model." },
                  { n: "GPT Image 1.5", d: "Enhanced true-color precision, structured visual outputs." },
                  { n: "Nano Banana Pro", d: "Photo-realistic, professional quality. Premium option." },
                ].map(m => (
                  <div key={m.n} style={{ marginBottom: 8 }}><span style={{ fontWeight: 700, color: 'var(--text)' }}>{m.n}</span> — {m.d}</div>
                ))}
              </div>
            </div>

            <div className="sc-hitem"><div className="sc-hititle" style={{ fontSize: 15, marginBottom: 12 }}>How It Works</div></div>
            {[["1 · Write your prompt", "Describe your scene — camera movement, lighting, mood. Or use the AI Prompt Builder."],
              ["2 · Choose a quality tier", "Quick for drafts, Standard for most content, Premium for important work, Ultra for 4K cinematic."],
              ["3 · Upload an image (optional)", "Switch to Image-to-Video mode to animate a reference image. All tiers support it."],
              ["4 · Style References", "Upload reference images to guide visual style. Seedance supports up to 9 refs, Veo up to 3."],
              ["5 · Storyboard", "Build multi-scene videos. Each scene extends from the last frame of the previous one."],
              ["6 · AI Audio", "Standard and Ultra tiers include AI-generated sound effects, music, and dialogue."],
              ["7 · Captions", "Add styled subtitles: TikTok, YouTube, Minimal, or Bold Pop styles."],
            ].map(([t, b]) => (
              <div key={t} className="sc-hitem"><div className="sc-hititle">{t}</div><div className="sc-hibody">{b}</div></div>
            ))}

            <div className="sc-htip">
              <div className="sc-httitle">Pro tips</div>
              {["Quick tier is perfect for testing prompts before upgrading to Premium",
                "Standard tier with Seedance generates video + audio together",
                "Use Image-to-Video to animate product shots or artwork",
                "Add camera moves: 'slow push-in', 'aerial pan', 'dolly zoom'",
                "9:16 ratio for TikTok/Reels, 16:9 for YouTube",
                "Credits never expire — buy once, use whenever",
              ].map(t => (
                <div key={t} className="sc-hti">{t}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ FRAME PICKER MODAL ══ */}
      {framePickerOpen && (
        <>
          <div className="sc-fp-overlay" onClick={() => setFramePickerOpen(false)}/>
          <div className="sc-fp-modal">
            <div className="sc-fp-header">
              <div className="sc-studio-title">Select Frame to Extend</div>
              <button className="sc-hclose" onClick={() => setFramePickerOpen(false)}>✕</button>
            </div>
            <div className="sc-fp-body">
              <div className="sc-fp-video-wrap">
                <video
                  ref={framePickerVideoRef}
                  src={framePickerUrl}
                  muted
                  playsInline
                  className="sc-fp-video"
                  onLoadedMetadata={(e) => {
                    setFramePickerDuration(e.target.duration);
                    e.target.currentTime = 0;
                  }}
                  onSeeked={updateFramePreview}
                  onTimeUpdate={() => setFramePickerTime(framePickerVideoRef.current?.currentTime || 0)}
                  onError={() => {
                    alert("Could not load video for frame selection. The video URL may have expired.");
                    setFramePickerOpen(false);
                  }}
                />
              </div>
              <div className="sc-fp-controls">
                <div className="sc-fp-time">{framePickerTime.toFixed(2)}s / {framePickerDuration.toFixed(2)}s</div>
                <input
                  type="range"
                  className="sc-fp-slider"
                  min={0}
                  max={framePickerDuration || 1}
                  step={0.01}
                  value={framePickerTime}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setFramePickerTime(t);
                    if (framePickerVideoRef.current) framePickerVideoRef.current.currentTime = t;
                  }}
                />
                <div className="sc-fp-hint">Drag the slider to select the frame you want to extend from</div>
              </div>
              {framePickerPreview && (
                <div className="sc-fp-preview-section">
                  <div className="sc-scene-label">Selected Frame</div>
                  <img src={framePickerPreview} alt="Selected frame" className="sc-fp-preview-img"/>
                </div>
              )}
              <canvas ref={framePickerCanvasRef} style={{ display: 'none' }}/>
              <div className="sc-fp-actions">
                <button className="sc-ecta" onClick={() => setFramePickerOpen(false)}>Cancel</button>
                <button className="sc-gen-btn" onClick={confirmFrameExtend}>
                  ⟼ Use This Frame & Extend
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
