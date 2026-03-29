import { useState, useEffect, useRef, useCallback } from "react";
import "./superscene.css";

// ── Constants ──────────────────────────────────────────────
// Quality tiers — users pick these instead of specific models
// Model definitions — real names, real descriptions, real costs
const MODELS = [
  { key: "kling3",     name: "Kling 3.0",        desc: "Cinematic realism, smooth motion",  badge: "POPULAR", cost: 3,  color: "#22d3ee", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15],     resolutions: ["720p","1080p"],         durationLabel: "3-15s" },
  { key: "kling-o3",   name: "Kling O3",         desc: "Next-gen, exceptional detail",       badge: "BEST",    cost: 5,  color: "#8b5cf6", i2v: true,  audio: true,  negPrompt: true,  durations: [3,5,8,10,15],     resolutions: ["720p","1080p"],         durationLabel: "3-15s" },
  { key: "seedance",   name: "Seedance 1.5 Pro", desc: "Fast generation, native audio",      badge: "AUDIO",   cost: 2,  color: "#fb923c", i2v: true,  audio: true,  negPrompt: false, durations: [4,5,8,10,12],     resolutions: ["480p","720p","1080p"],  durationLabel: "4-12s" },
  { key: "sora2",      name: "Sora 2 Pro",       desc: "OpenAI flagship, photorealistic",    badge: "PREMIUM", cost: 8,  color: "#a78bfa", i2v: true,  audio: false, negPrompt: false, durations: [4,8,12],          resolutions: ["720p","1080p"],         durationLabel: "4/8/12s" },
  { key: "veo31",      name: "VEO 3.1 Fast",     desc: "Google, audio + fine detail",        badge: "NEW",     cost: 3,  color: "#38bdf8", i2v: true,  audio: true,  negPrompt: false, durations: [4,6,8],           resolutions: ["720p","1080p","4K"],    durationLabel: "4/6/8s" },
  { key: "veo31-pro",  name: "VEO 3.1 Pro 4K",   desc: "Maximum quality, 4K resolution",     badge: "4K",      cost: 15, color: "#f59e0b", i2v: true,  audio: true,  negPrompt: false, durations: [4,6,8],           resolutions: ["720p","1080p","4K"],    durationLabel: "4/6/8s" },
  { key: "hailuo23",   name: "Hailuo 2.3",       desc: "Budget-friendly, fast drafts",        badge: "FAST",    cost: 1,  color: "#10b981", i2v: true,  audio: false, negPrompt: false, durations: [6,10],            resolutions: ["768p","1080p"],         durationLabel: "6/10s" },
  { key: "grok-video", name: "Grok Imagine",     desc: "Creative, fun/normal/spicy modes",    badge: "FUN",     cost: 4,  color: "#ef4444", i2v: true,  audio: false, negPrompt: false, durations: [6,10],            resolutions: ["480p","720p"],          durationLabel: "6/10s" },
];

const PROMPT_SUGGESTIONS = [
  "A cinematic aerial drone shot gliding over a misty mountain lake at golden hour, slow camera pan",
  "A lone astronaut standing on Mars, dust particles floating in orange light, photorealistic",
  "Close-up of a barista pouring latte art, warm cafe lighting, shallow depth of field, 4K",
  "A golden retriever puppy running through autumn leaves, slow motion, warm afternoon light",
  "Underwater coral reef scene with tropical fish, volumetric light rays, BBC documentary style",
  "A futuristic cyberpunk city at night, neon reflections on wet streets, camera dolly forward",
  "Time-lapse of a flower blooming, macro lens, studio lighting, black background",
  "A samurai warrior in a bamboo forest, wind blowing, cinematic god rays, Japanese aesthetic",
];

const RATIOS    = ["16:9", "9:16", "1:1", "4:3"];
const AUDIO_EXTRA_PER_5S = 1;

const PACKS = [
  { slug: "starter", label: "Starter", credits: 50,   price: 8  },
  { slug: "creator", label: "Creator", credits: 150,  price: 20, popular: true },
  { slug: "studio",  label: "Studio",  credits: 500,  price: 50 },
  { slug: "pro",     label: "Pro",     credits: 1200, price: 99 },
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
  const [tab, setTab]           = useState("create");
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
  const [genAudio, setGenAudio] = useState(false);

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
  const [loadingCredits, setLoadingCredits] = useState(true);

  // AI Prompt Builder
  const [aiSubject, setAiSubject]   = useState("");
  const [aiStyle, setAiStyle]       = useState("");
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
  const [imgQuality, setImgQuality] = useState("1K");
  const [imgSize, setImgSize] = useState("1:1");
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgResults, setImgResults] = useState([]);
  const [imgProgress, setImgProgress] = useState(0);
  const imgProgRef = useRef(null);
  const imgPollRef = useRef(null);

  // Pipeline (Studio)
  const [pipeScript, setPipeScript] = useState("");
  const [pipeTitle, setPipeTitle] = useState("");
  const [pipeStyle, setPipeStyle] = useState("cinematic");
  const [pipeModel, setPipeModel] = useState("kling3");
  const [pipeVoice, setPipeVoice] = useState("en-US-GuyNeural");
  const [pipeRes, setPipeRes] = useState("1080p");
  const [pipeScenes, setPipeScenes] = useState([]); // scene objects from analysis
  const [pipeId, setPipeId] = useState(null);
  const [pipeStatus, setPipeStatus] = useState(null); // null|draft|generating|assembling|completed|failed
  const [pipeAnalysing, setPipeAnalysing] = useState(false);
  const [pipeFinalUrl, setPipeFinalUrl] = useState(null);
  const [pipeError, setPipeError] = useState(null);
  const [pipeCompleted, setPipeCompleted] = useState(0);
  const pipePollRef = useRef(null);
  const [pipeModelOpen, setPipeModelOpen] = useState(false);
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
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
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

  const clearImage = () => {
    setImageFile(null); setImagePreview(null); setImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
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
      const payload = { model_key: model, prompt, duration, ratio, resolution, generate_audio: genAudio };
      if (negPrompt.trim()) payload.negative_prompt = negPrompt.trim();
      if (mode === "image" && imageUrl) payload.image_urls = [imageUrl];
      if (styleRefs.length > 0) payload.style_refs = styleRefs.filter(r => r.url).map(r => r.url);

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
  const buyStripe = async (slug) => {
    setBuyingPack(slug);
    try {
      const res = await fetch("/api/superscene/buy/stripe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack_slug: slug }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url; else alert(data.detail || "Checkout failed");
    } finally { setBuyingPack(null); }
  };
  const buyCrypto = async (slug) => {
    setBuyingPack(slug);
    try {
      const res = await fetch("/api/superscene/buy/crypto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack_slug: slug }) });
      const data = await res.json();
      if (data.success) setCryptoOrder({ ...data, slug }); else alert(data.detail || "Crypto order failed");
    } finally { setBuyingPack(null); }
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
    { key: "z-image-turbo",      name: "Z Turbo",        desc: "Ultra-fast ~3 seconds", badge: "FAST" },
  ];
  const IMG_SIZES = ["1:1","16:9","9:16","4:3","3:4","3:2","2:3","4:5","5:4"];
  const IMG_QUALITIES = ["1K","2K","4K"];
  const IMG_CREDIT_MAP = {"1K": 1, "2K": 2, "4K": 4};

  const generateImage = async () => {
    if (!imgPrompt.trim() || imgGenerating) return;
    const cost = IMG_CREDIT_MAP[imgQuality] || 2;
    if (credits < cost) { alert(`Need ${cost} credits, have ${credits}`); return; }

    setImgGenerating(true);
    setImgResults([]);
    setImgProgress(0);

    imgProgRef.current = setInterval(() => {
      setImgProgress(p => Math.min(p + Math.random() * 4 + 2, 90));
    }, 300);

    try {
      const res = await fetch("/api/superscene/image/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: imgModel, prompt: imgPrompt, quality: imgQuality, size: imgSize, n: 1 }),
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

  // ── Stage content ──────────────────────────────────────
  const StageContent = () => {
    if (generating) return (
      <div className="gst">
        <div className="spin"><div className="r1"/><div className="r2"/></div>
        <div className="gst-title">Generating your video…</div>
        <div className="gst-sub">{selectedModel?.name} · {duration}s · {ratio}{genAudio ? " · Audio" : ""}</div>
        <div className="pt"><div className="pf" style={{ width: `${Math.min(genProgress, 100)}%` }}/></div>
        <div className="gst-pct">{Math.round(genProgress)}%</div>
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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" style={{ marginBottom: 14 }}>
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
          {[{k:"create",l:"Create"},{k:"studio",l:"Studio"},{k:"images",l:"Images"},{k:"storyboard",l:"Storyboard"},{k:"captions",l:"Captions"},{k:"music",l:"Music"},{k:"voiceover",l:"Voiceover"},{k:"editor",l:"Editor"},{k:"gallery",l:"Gallery"},{k:"packs",l:"Packs"},{k:"builder",l:"AI Builder"}].map(t => (
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
          <div className="sc-ws-panels">
          <div className="sc-lp">
            <div className="sc-lp-scroll">

              {/* Mode toggle: Text / Image */}
              <div className="sc-mode-toggle">
                <button className={cls("sc-mode-btn", mode === "text" && "on")} onClick={() => setMode("text")}>Text to Video</button>
                <button className={cls("sc-mode-btn", mode === "image" && "on")} onClick={() => setMode("image")}>Image to Video</button>
              </div>

              {/* Model Selector */}
              <div className="sc-section">
                <div className="sc-model-sel" onClick={() => setDropOpen(!dropOpen)}>
                  <div className="sc-model-icon" style={{ background: `linear-gradient(135deg, ${selectedModel?.color}, ${selectedModel?.color}88)` }}>✦</div>
                  <div className="sc-model-info">
                    <div className="sc-model-name">{selectedModel?.name}</div>
                    <div className="sc-model-desc">{selectedModel?.desc}</div>
                  </div>
                  <div className="sc-model-meta">
                    <span className="sc-model-badge" style={{ background: `${selectedModel?.color}22`, color: selectedModel?.color }}>{selectedModel?.badge}</span>
                    <span className="sc-model-cost">{selectedModel?.cost} cr/5s</span>
                  </div>
                  <span className={cls("sc-model-chev", dropOpen && "open")}>▼</span>
                </div>
                {dropOpen && (
                  <div className="sc-model-drop">
                    {MODELS.map(m => (
                      <button key={m.key} className={cls("sc-model-opt", model === m.key && "sel")}
                        onClick={() => {
                          setModel(m.key);
                          setDropOpen(false);
                          if (!m.audio) setGenAudio(false);
                          // Auto-correct duration if not valid for new model
                          if (!m.durations.includes(duration)) setDuration(m.durations[Math.floor(m.durations.length / 2)]);
                          // Auto-correct resolution if not valid for new model
                          if (!m.resolutions.includes(resolution)) setResolution(m.resolutions[m.resolutions.length - 1]);
                        }}>
                        <div className="sc-model-icon" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)` }}>✦</div>
                        <div className="sc-model-info"><div className="sc-model-name">{m.name}</div><div className="sc-model-desc">{m.desc}</div></div>
                        <div className="sc-model-meta">
                          <span className="sc-model-badge" style={{ background: `${m.color}22`, color: m.color }}>{m.badge}</span>
                          {m.i2v && <span className="sc-feat-tag">I2V</span>}
                          {m.audio && <span className="sc-feat-tag sc-feat-audio">Audio</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Upload (when image mode) */}
              {mode === "image" && (
                <div className="sc-section">
                  <div className="sc-label">Upload Image</div>
                  <div className="sc-sub">Accepted types: JPEG, PNG, WebP; Max size: 10MB</div>
                  {imagePreview ? (
                    <div className="sc-img-preview">
                      <img src={imagePreview} alt="Preview" className="sc-img-thumb"/>
                      <div className="sc-img-overlay">
                        {uploading ? <span className="sc-img-status">Uploading…</span> : <span className="sc-img-status sc-img-ok">✓ Ready</span>}
                        <button className="sc-img-remove" onClick={clearImage}>✕ Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="sc-img-dropzone" onClick={() => fileRef.current?.click()}>
                      <div className="sc-img-dz-icon">⬆</div>
                      <div className="sc-img-dz-text"><strong>Select Image</strong></div>
                      <div className="sc-img-dz-sub">Drag or click to upload your image</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageSelect}/>
                </div>
              )}

              {/* Prompt */}
              <div className="sc-section">
                <div className="sc-label">Prompt</div>
                <div className="sc-prompt-box">
                  <textarea className="sc-prompt-ta" rows={5}
                    placeholder="A cinematic drone shot over a misty mountain valley at golden hour, warm light, slow push-in…"
                    value={prompt} onChange={e => setPrompt(e.target.value.slice(0, 2000))}/>
                  <div className="sc-prompt-footer">
                    <span className="sc-prompt-ai" onClick={() => setTab("builder")}>✦ Generate With AI</span>
                    <span className="sc-prompt-count">{prompt.length}/2000</span>
                  </div>
                </div>
                <div className="sc-sub">If you're not satisfied, you can generate again or enter a prompt of your own.</div>

                {/* Prompt suggestions */}
                {!prompt.trim() && (
                  <div className="sc-section" style={{ marginTop: 8, marginBottom: 0 }}>
                    <div className="sc-sub" style={{ marginTop: 0, marginBottom: 6 }}>Try one of these:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {PROMPT_SUGGESTIONS.slice(0, 4).map((s, i) => (
                        <button key={i} className="sc-chip" onClick={() => setPrompt(s)} style={{ fontSize: 12, padding: '4px 10px' }}>
                          {s.slice(0, 40)}…
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Negative Prompt (models that support it) */}
              {selectedModel?.negPrompt && (
                <div className="sc-section">
                  <div className="sc-label">Negative Prompt <span className="sc-label-badge">Optional</span></div>
                  <div className="sc-prompt-box" style={{ minHeight: 'auto' }}>
                    <textarea className="sc-prompt-ta" rows={2} style={{ minHeight: 40 }}
                      placeholder="Things to avoid: blurry, low quality, text, watermark, distorted faces..."
                      value={negPrompt} onChange={e => setNegPrompt(e.target.value.slice(0, 500))}/>
                  </div>
                </div>
              )}

              {/* Duration — model-aware options */}
              <div className="sc-section">
                <div className="sc-label">Duration <span className="sc-label-badge">{selectedModel?.durationLabel}</span></div>
                <div className="sc-pills" style={{ flexWrap: 'wrap' }}>
                  {(selectedModel?.durations || [5,10]).map(d => (
                    <button key={d} className={cls("sc-pill", duration === d && "on")}
                      onClick={() => setDuration(d)}>{d}s</button>
                  ))}
                </div>
              </div>

              {/* Resolution — model-aware options */}
              <div className="sc-section">
                <div className="sc-label">Resolution</div>
                <div className="sc-pills">
                  {(selectedModel?.resolutions || ["720p","1080p"]).map(r => (
                    <button key={r} className={cls("sc-pill", resolution === r && "on")}
                      onClick={() => setResolution(r)}>{r}</button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="sc-section">
                <div className="sc-label">Aspect Ratio</div>
                <div className="sc-pills">
                  {RATIOS.map(r => <button key={r} className={cls("sc-pill", ratio === r && "on")} onClick={() => setRatio(r)}>{r}</button>)}
                </div>
              </div>

              {/* AI Audio Toggle */}
              {selectedModel?.audio && (
                <div className="sc-section">
                  <div className="sc-audio-toggle" onClick={() => setGenAudio(!genAudio)}>
                    <div className={cls("sc-toggle-track", genAudio && "on")}>
                      <div className="sc-toggle-thumb"/>
                    </div>
                    <div className="sc-audio-info">
                      <div className="sc-label" style={{ marginBottom: 0 }}>AI Audio</div>
                      <div className="sc-sub" style={{ marginTop: 2 }}>Generate sound effects, music & dialogue (+{AUDIO_EXTRA_PER_5S} cr/5s)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Style References (Seedance & VEO models support refs) */}
              {(model === "seedance" || model === "veo31" || model === "veo31-pro") && (
                <div className="sc-section">
                  <div className="sc-label">Style References <span className="sc-label-badge">Optional</span></div>
                  <div className="sc-sub" style={{ marginTop: 0, marginBottom: 8 }}>
                    Upload images to guide the visual style. {(model === "veo31" || model === "veo31-pro") ? "Up to 3" : "Up to 9"} reference images.
                  </div>
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
                      <div className="sc-sref-add" onClick={() => styleRefInput.current?.click()}>
                        <span>+</span>
                      </div>
                    )}
                  </div>
                  <input ref={styleRefInput} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }} onChange={handleStyleRefUpload}/>
                </div>
              )}

              {/* Credit + Generate */}
              <div className="sc-section">
                <div className="sc-credit-line">
                  <div className="sc-cl-icon">◈</div>
                  <span className="sc-cl-label">Required credits:</span>
                  <span className="sc-cl-value">{cost}</span>
                </div>
                <button className="sc-gen-btn" onClick={generate}
                  disabled={!prompt.trim() || generating || credits < cost || (mode === "image" && !imageUrl)}>
                  {generating ? "Generating…"
                    : !prompt.trim() ? "Enter a prompt first"
                    : mode === "image" && !imageUrl ? "Upload an image first"
                    : credits < cost ? "Not enough credits"
                    : `Generate — ${cost} credits`}
                </button>
                {credits < cost && <button className="sc-buymore" onClick={() => setTab("packs")}>Buy more credits →</button>}
              </div>

            </div>
          </div>

          {/* ═══ RIGHT PANEL — Preview ═══ */}
          <div className="sc-rp">
            <div className="sc-preview-label">Preview</div>
            <div className="sc-stage">
              {generating || videoUrl || genStatus === "failed" ? (
                <StageContent />
              ) : (
                <div className="sc-preview-examples">
                  <div className="sc-preview-grid">
                    {[
                      { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764734126.webp", prompt: "A lone astronaut on Mars, cinematic wide shot, dust particles in orange light", model: "Kling O3" },
                      { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764733217.webp", prompt: "Aerial drone over misty mountain lake at golden hour, slow pan", model: "Kling 3.0" },
                      { img: "https://media.nanobananaproapi.com/2025/11/c909eb7af0b71ba4c65a84943bbe7faa.webp", prompt: "4K neon cyberpunk city flyover at night, rain reflections", model: "VEO 3.1 Pro" },
                      { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764734176.webp", prompt: "Professional woman in sunlit modern office, tracking shot", model: "Seedance" },
                    ].map((ex, i) => (
                      <div key={i} className="sc-preview-card" onClick={() => setPrompt(ex.prompt)}>
                        <img src={ex.img} alt="" onError={e => { e.target.style.opacity = '0.1'; }} />
                        <div className="sc-preview-card-overlay">
                          <div className="sc-preview-card-prompt">{ex.prompt.length > 55 ? ex.prompt.slice(0, 55) + '…' : ex.prompt}</div>
                          <span className="sc-preview-card-badge">{ex.model}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sc-preview-hint">Click any example to use its prompt</div>
                </div>
              )}
            </div>
            {videoUrl && (
              <div className="sc-stage-actions">
                <button className="sc-sa-btn" onClick={() => setTab("editor")}>✂ Edit</button>
                <button className="sc-sa-btn" onClick={() => downloadVideo(videoUrl, `superscene-${Date.now()}.mp4`)}>⬇ Download</button>
              </div>
            )}
            <div className="sc-playbar">
              <span className="sc-pb-play">▶</span>
              <span className="sc-pb-time">0:00 / 0:00</span>
              <div className="sc-pb-track"/>
              <span className="sc-pb-icon">🔊</span>
              <span className="sc-pb-icon">⛶</span>
            </div>
          </div>
          </div>{/* close sc-ws-panels */}
        </>}

        {/* ── Community Showcase — BELOW workspace, full width ── */}
        {tab === "create" && (
          <div className="sc-showcase">
            <div className="sc-showcase-head">
              <div>
                <div className="sc-showcase-title">Community Showcase</div>
                <div className="sc-showcase-sub">Click any creation to use its prompt</div>
              </div>
            </div>
            <div className="sc-showcase-grid">
              {[
                { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764734126.webp", prompt: "A lone astronaut standing on the surface of Mars, cinematic wide shot, dust particles floating in orange light, photorealistic", model: "Kling O3", dur: "10s" },
                { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764733217.webp", prompt: "Cinematic aerial drone shot gliding over a misty mountain lake at golden hour, slow camera pan revealing snow-capped peaks", model: "Kling 3.0", dur: "5s" },
                { img: "https://media.nanobananaproapi.com/2025/11/c909eb7af0b71ba4c65a84943bbe7faa.webp", prompt: "Epic 4K cinematic flyover of a neon-lit futuristic cyberpunk city at night, rain-soaked streets, volumetric fog", model: "VEO 3.1 Pro", dur: "8s" },
                { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764734176.webp", prompt: "A confident professional woman walking through a sunlit modern glass office, tracking shot, natural bokeh, warm tones", model: "Seedance", dur: "10s" },
                { img: "https://cdn.evolink.ai/2026/01/9950e1e6404479f6bfdb01c1f564f003.webp", prompt: "A cute cartoon mouse running toward the camera with a big smile, Pixar-style 3D animation, soft studio lighting", model: "Hailuo 2.3", dur: "6s" },
                { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764733309.webp", prompt: "Macro close-up of a monarch butterfly landing on a wildflower, shallow depth of field, morning dew drops, nature documentary", model: "Sora 2 Pro", dur: "10s" },
                { img: "https://media.nanobananaproapi.com/uploads/2025/12/03/20251203-1764734126.webp", prompt: "A samurai warrior standing in a bamboo forest, wind blowing his cloak, cinematic lighting with god rays, Japanese aesthetic", model: "Kling O3", dur: "15s" },
                { img: "https://media.nanobananaproapi.com/2025/11/c909eb7af0b71ba4c65a84943bbe7faa.webp", prompt: "Underwater scene of a coral reef with tropical fish, volumetric light rays penetrating clear blue water, documentary style", model: "VEO 3.1", dur: "8s" },
              ].map((item, i) => (
                <div key={i} className="sc-showcase-card"
                  onClick={() => { setPrompt(item.prompt); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <img src={item.img} alt="" className="sc-showcase-img"
                    onError={e => { e.target.parentElement.style.background = 'var(--surface2)'; }} />
                  <div className="sc-showcase-overlay">
                    <div className="sc-showcase-prompt">
                      {item.prompt.length > 75 ? item.prompt.slice(0, 75) + '…' : item.prompt}
                    </div>
                    <div className="sc-showcase-meta">
                      <span className="sc-showcase-badge">{item.model}</span>
                      <span className="sc-showcase-dur">{item.dur}</span>
                    </div>
                  </div>
                  <div className="sc-showcase-cta">Create similar</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ MUSIC TAB ══ */}
        {tab === "music" && (
          <div className="sc-music-view">
            <div className="sc-music-layout">
              {/* Left — Controls */}
              <div className="sc-music-controls">
                <div className="sc-label">AI Music Generator</div>
                <div className="sc-sub" style={{ marginTop: 0, marginBottom: 20 }}>Generate royalty-free music with Suno AI. Describe your track or write custom lyrics.</div>

                {/* Mode toggle */}
                <div className="sc-mode-toggle" style={{ marginBottom: 20 }}>
                  <button className={cls("sc-mode-btn", !musicCustom && "on")} onClick={() => setMusicCustom(false)}>Simple Mode</button>
                  <button className={cls("sc-mode-btn", musicCustom && "on")} onClick={() => setMusicCustom(true)}>Custom Mode</button>
                </div>

                {/* Model */}
                <div className="sc-section">
                  <div className="sc-label">Model</div>
                  <div className="sc-pills">
                    {MUSIC_MODELS.map(m => (
                      <button key={m.key} className={cls("sc-pill", musicModel === m.key && "on")} onClick={() => setMusicModel(m.key)}>
                        {m.name} {m.badge && <span style={{ fontSize: 8, marginLeft: 4, color: "#22d3ee" }}>{m.badge}</span>}
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
                        <span className="sc-prompt-counter">{musicPrompt.length}/3000</span>
                      </div>
                    )}
                    {musicCustom && <div className="sc-sub" style={{ marginTop: 4, fontSize: 11 }}>Tip: Enter a song title or style first, then click SuperAdPro Lyrics Writer. You can edit the result before generating music.</div>}
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
                      <div className="sc-label" style={{ marginBottom: 0 }}>Instrumental Only</div>
                      <div className="sc-sub" style={{ marginTop: 2 }}>No vocals — background music only</div>
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
                      <button className="sc-sa-btn" onClick={() => downloadVideo(musicUrl, `superscene-music-${Date.now()}.mp3`)} style={{ marginTop: 12 }}>⬇ Download MP3</button>
                    </div>
                  ) : (
                    <div className="s-empty">
                      <div className="s-icon">♪</div>
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
                <div className="sc-label">AI Voiceover</div>
                <div className="sc-sub" style={{ marginTop: 0, marginBottom: 20 }}>Generate professional voiceovers from text. Optionally create a lip-synced talking avatar.</div>

                {/* Step 1: Script */}
                <div className="sc-section">
                  <div className="sc-label">① Script</div>
                  <div className="sc-prompt-box">
                    <textarea className="sc-prompt-ta" rows={6}
                      placeholder="Type your voiceover script here... e.g. Welcome to SuperAdPro, the platform where your creativity pays."
                      value={voText} onChange={e => setVoText(e.target.value)}/>
                    <span className="sc-prompt-counter">{voText.length}/5000</span>
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="sc-section">
                  <div className="sc-label">② Voice</div>
                  <select className="sc-music-input" value={voVoice} onChange={e => setVoVoice(e.target.value)} style={{ cursor: "pointer" }}>
                    {VO_VOICES.map(v => <option key={v.id} value={v.id}>{v.name} ({v.gender === "M" ? "Male" : "Female"} · {v.accent})</option>)}
                  </select>
                </div>

                {/* Generate Voiceover */}
                <div className="sc-section">
                  <button className="sc-gen-btn" onClick={generateVoiceover} disabled={!voText.trim() || voGenerating}>
                    {voGenerating ? "Generating voiceover…" : "🎙 Generate Voiceover"}
                  </button>
                  <div className="sc-sub" style={{ marginTop: 6, fontSize: 11 }}>Free — no credits required for voiceover</div>
                </div>

                {/* Step 3: Lip Sync (optional) */}
                {voAudioUrl && (
                  <>
                    <div style={{ borderTop: "1px solid var(--border)", margin: "20px 0" }}/>
                    <div className="sc-label">③ Lip Sync Avatar (Optional)</div>
                    <div className="sc-sub" style={{ marginTop: 0, marginBottom: 12 }}>Upload a photo of a person and create a talking avatar video synced to your voiceover.</div>

                    <div className="sc-section">
                      <input type="file" ref={voImageInputRef} accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleVoImageUpload}/>
                      <button className="sc-sa-btn" onClick={() => voImageInputRef.current?.click()} style={{ width: "100%" }}>
                        {voImageUrl ? "✓ Photo uploaded — Change" : "📷 Upload Person Photo"}
                      </button>
                    </div>

                    {voImageUrl && (
                      <div className="sc-section">
                        <img src={voImageUrl} alt="Avatar" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}/>
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
                      <video src={voLipSyncUrl} controls className="sc-sb-video" style={{ maxWidth: "100%", borderRadius: 10 }}/>
                      <button className="sc-sa-btn" onClick={() => downloadVideo(voLipSyncUrl, `superscene-avatar-${Date.now()}.mp4`)} style={{ marginTop: 12 }}>⬇ Download Video</button>
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
                      <button className="sc-sa-btn" onClick={() => downloadVideo(voAudioUrl, `superscene-voiceover-${Date.now()}.mp3`)} style={{ marginTop: 12 }}>⬇ Download MP3</button>
                      <div className="sc-sub" style={{ marginTop: 16 }}>Want a talking avatar? Upload a photo in Step ③ on the left.</div>
                    </div>
                  ) : (
                    <div className="s-empty">
                      <div className="s-icon">🎙</div>
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
                        <div className="sc-sub" style={{ marginTop: 0, marginBottom: 16 }}>Set start and end points to cut your video.</div>
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
                        <div className="sc-sub" style={{ marginTop: 0, marginBottom: 16 }}>Adjust video speed. Preview plays at selected speed.</div>
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
                        <div className="sc-sub" style={{ marginTop: 0, marginBottom: 16 }}>Choose a platform preset to auto-resize your video.</div>
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
                        <div className="sc-sub" style={{ marginTop: 0, marginBottom: 16 }}>Download your video with current settings applied.</div>
                        <div className="sc-ed-export-summary">
                          <div className="sc-ed-export-row"><span>Format:</span><span>MP4</span></div>
                          <div className="sc-ed-export-row"><span>Speed:</span><span>{playbackSpeed}x</span></div>
                          <div className="sc-ed-export-row"><span>Preset:</span><span>{EXPORT_PRESETS[exportPreset].label}</span></div>
                          <div className="sc-ed-export-row"><span>Trim:</span><span>{trimStart}s → {trimEnd}s ({Math.max(0, trimEnd - trimStart).toFixed(1)}s)</span></div>
                          {captions.length > 0 && <div className="sc-ed-export-row"><span>Captions:</span><span>{captions.length} subtitle(s)</span></div>}
                        </div>
                        <button className="sc-gen-btn" onClick={handleEditorExport} disabled={editorProcessing} style={{ marginTop: 16 }}>
                          {editorProcessing ? editorProgress : "▲ Export & Download"}
                        </button>
                        <div className="sc-sub" style={{ marginTop: 8, textAlign: "center" }}>Free — no credits required</div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right — Video Preview */}
                <div className="sc-ed-preview">
                  <div className="sc-preview-label">Editor Preview</div>
                  <div className="sc-ed-video-stage">
                    <video ref={editorVideoRef} src={videoUrl} controls className="sc-ed-video" onLoadedMetadata={onEditorVideoLoad}/>
                    {showCaptionOverlay && captions.length > 0 && (
                      <div className={cls("sc-cap-overlay", `sc-cap-${captionStyle}`)}>
                        {captions[0]?.text || "Caption preview"}
                      </div>
                    )}
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
                  <div className="sc-label" style={{ fontSize: 18 }}>Video Studio</div>
                  <div className="sc-sub" style={{ marginTop: 0, marginBottom: 20 }}>
                    Paste your script and SuperScene will break it into scenes, generate voiceover,
                    create AI video for each scene, and assemble a complete long-form video.
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Script</div>
                    <div className="sc-prompt-box">
                      <textarea className="sc-prompt-ta" rows={10} style={{ minHeight: 180 }}
                        placeholder={"Paste your script here. Each paragraph will become a scene.\n\nExample:\nThe sun rises over the mountain valley, casting golden light across the landscape.\n\nA lone hiker reaches the summit, looking out over the endless horizon.\n\nAs clouds roll in, the scene transforms into a dramatic display of nature's power."}
                        value={pipeScript} onChange={e => setPipeScript(e.target.value.slice(0, 20000))}/>
                      <div className="sc-prompt-footer">
                        <span className="sc-prompt-count">{pipeScript.length} / 20,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Title <span className="sc-label-badge">Optional</span></div>
                    <input type="text" className="sc-prompt-ta" style={{ minHeight: 'auto', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, width: '100%', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
                      placeholder="My Video Project"
                      value={pipeTitle} onChange={e => setPipeTitle(e.target.value.slice(0, 200))}/>
                  </div>

                  <div className="sc-section">
                    <div className="sc-label">Visual Style</div>
                    <div className="sc-pills" style={{ flexWrap: 'wrap' }}>
                      {["cinematic", "corporate", "documentary", "social media", "anime", "abstract"].map(s => (
                        <button key={s} className={cls("sc-pill", pipeStyle === s && "on")} onClick={() => setPipeStyle(s)}
                          style={{ textTransform: 'capitalize' }}>{s}</button>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { id: "en-US-GuyNeural", name: "Guy", gender: "Male", accent: "US" },
                        { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", accent: "US" },
                        { id: "en-US-AriaNeural", name: "Aria", gender: "Female", accent: "US" },
                        { id: "en-US-DavisNeural", name: "Davis", gender: "Male", accent: "US" },
                        { id: "en-GB-RyanNeural", name: "Ryan", gender: "Male", accent: "UK" },
                        { id: "en-GB-SoniaNeural", name: "Sonia", gender: "Female", accent: "UK" },
                        { id: "en-AU-WilliamNeural", name: "William", gender: "Male", accent: "AU" },
                        { id: "en-AU-NatashaNeural", name: "Natasha", gender: "Female", accent: "AU" },
                      ].map(v => (
                        <div key={v.id} className={cls("sc-model-opt")} style={{
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${pipeVoice === v.id ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                          background: pipeVoice === v.id ? 'var(--accent-dim)' : 'var(--surface2)',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }} onClick={() => setPipeVoice(v.id)}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.gender} · {v.accent}</div>
                          </div>
                          <button style={{
                            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
                            background: 'var(--surface3)', color: 'var(--text)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
                          }} onClick={e => {
                            e.stopPropagation();
                            const audio = new Audio(`/api/superscene/voiceover/preview/${v.id}`);
                            audio.play();
                          }} title="Preview voice">▶</button>
                        </div>
                      ))}
                    </div>
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
                    <button className="sc-gen-btn" onClick={async () => {
                      if (!pipeScript.trim() || pipeAnalysing) return;
                      setPipeAnalysing(true);
                      setPipeError(null);
                      try {
                        const res = await fetch("/api/superscene/pipeline/analyse", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ script: pipeScript, style: pipeStyle, model_key: pipeModel, voice: pipeVoice, resolution: pipeRes, title: pipeTitle }),
                        });
                        const data = await res.json();
                        if (!res.ok) { setPipeError(data.detail || "Analysis failed"); setPipeAnalysing(false); return; }
                        setPipeId(data.pipeline_id);
                        setPipeScenes(data.scenes);
                        setPipeStatus("draft");
                        setCredits(data.credits_remaining);
                      } catch (e) { setPipeError("Network error — please try again"); }
                      setPipeAnalysing(false);
                    }} disabled={!pipeScript.trim() || pipeAnalysing}>
                      {pipeAnalysing ? "Analysing script…" : !pipeScript.trim() ? "Paste a script to get started" : "Analyse Script — 1 credit"}
                    </button>
                    {pipeError && <div className="sc-sub" style={{ color: '#f87171', marginTop: 8 }}>{pipeError}</div>}
                  </div>
                </div>

                <div className="sc-music-preview">
                  <div className="sc-preview-label">How it works</div>
                  <div className="sc-music-stage" style={{ flexDirection: 'column', padding: 32, alignItems: 'flex-start', justifyContent: 'flex-start', gap: 20 }}>
                    {[
                      { num: "1", title: "Paste your script", desc: "Write or paste the narration for your video. Each paragraph becomes a scene." },
                      { num: "2", title: "AI breaks it into scenes", desc: "Claude AI analyses your script and creates visual prompts for each scene." },
                      { num: "3", title: "Review and edit", desc: "Adjust the visual description for any scene before generating." },
                      { num: "4", title: "Generate", desc: "SuperScene generates voiceover + AI video for each scene automatically." },
                      { num: "5", title: "Final video", desc: "All scenes are assembled into one complete video with voiceover narration." },
                    ].map(step => (
                      <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>{step.num}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{step.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{step.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : pipeStatus === "draft" ? (
              /* ── STEP 2: Scene Review & Edit ── */
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div className="sc-label" style={{ fontSize: 18, marginBottom: 4 }}>{pipeTitle || "Scene Breakdown"}</div>
                    <div className="sc-sub" style={{ marginTop: 0 }}>{pipeScenes.length} scenes · Review and edit before generating</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="sc-ecta" onClick={() => { setPipeStatus(null); setPipeScenes([]); setPipeId(null); }}>← Back to Script</button>
                    <button className="sc-gen-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={async () => {
                      setPipeError(null);
                      try {
                        const res = await fetch(`/api/superscene/pipeline/${pipeId}/generate`, {
                          method: "POST", headers: { "Content-Type": "application/json" },
                        });
                        const data = await res.json();
                        if (!res.ok) { setPipeError(data.detail || "Generation failed"); return; }
                        setPipeStatus("generating");
                        setPipeCompleted(0);
                        setCredits(data.credits_remaining);
                        // Start polling
                        if (pipePollRef.current) clearInterval(pipePollRef.current);
                        pipePollRef.current = setInterval(async () => {
                          try {
                            const pr = await fetch(`/api/superscene/pipeline/${pipeId}/status`);
                            const pd = await pr.json();
                            setPipeStatus(pd.status);
                            setPipeCompleted(pd.completed_scenes);
                            setPipeScenes(pd.scenes);
                            if (pd.status === "completed") {
                              setPipeFinalUrl(pd.final_video_url);
                              clearInterval(pipePollRef.current);
                              fetch("/api/superscene/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
                            } else if (pd.status === "failed") {
                              setPipeError(pd.error_message || "Pipeline failed");
                              clearInterval(pipePollRef.current);
                            }
                          } catch {}
                        }, 5000);
                      } catch (e) { setPipeError("Network error"); }
                    }}>Generate All Scenes</button>
                  </div>
                </div>
                {pipeError && <div className="sc-sub" style={{ color: '#f87171', marginBottom: 16 }}>{pipeError}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pipeScenes.map((scene, i) => (
                    <div key={i} className="sc-sb-scene">
                      <div className="sc-sb-scene-head">
                        <span className="sc-sb-scene-num">Scene {scene.scene_number || i + 1}</span>
                        <span className="sc-sb-scene-meta">{scene.estimated_duration || scene.duration_seconds || 10}s · {scene.transition_type || "cut"}</span>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Narration</div>
                        <textarea className="sc-prompt-ta" rows={2} style={{ minHeight: 40, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, width: '100%' }}
                          value={scene.narration_text || ""} onChange={e => {
                            const updated = [...pipeScenes];
                            updated[i] = { ...updated[i], narration_text: e.target.value };
                            setPipeScenes(updated);
                          }}/>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Visual Prompt</div>
                        <textarea className="sc-prompt-ta" rows={2} style={{ minHeight: 40, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, width: '100%' }}
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
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div className="sc-label" style={{ fontSize: 18, marginBottom: 4 }}>{pipeTitle || "Video Production"}</div>
                    <div className="sc-sub" style={{ marginTop: 0 }}>
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
                    <button className="sc-ecta" onClick={() => { setPipeStatus("draft"); setPipeError(null); }}>
                      ← Back to Scenes
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {pipeStatus !== "completed" && pipeStatus !== "failed" && (
                  <div style={{ marginBottom: 24 }}>
                    <div className="pt" style={{ width: '100%', height: 6 }}>
                      <div className="pf" style={{ width: `${pipeScenes.length > 0 ? (pipeCompleted / pipeScenes.length) * 100 : 0}%` }}/>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                      {pipeStatus === "assembling" ? "Assembling video with FFmpeg…" : `Scene ${pipeCompleted + 1} of ${pipeScenes.length}`}
                    </div>
                  </div>
                )}

                {pipeError && <div className="sc-sub" style={{ color: '#f87171', marginBottom: 16 }}>{pipeError}</div>}

                {/* Final video player */}
                {pipeStatus === "completed" && pipeFinalUrl && (
                  <div style={{ marginBottom: 24 }}>
                    <div className="sc-stage" style={{ minHeight: 400 }}>
                      <video src={pipeFinalUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }}/>
                    </div>
                    <div className="sc-stage-actions" style={{ marginTop: 12 }}>
                      <button className="sc-sa-btn" onClick={() => downloadVideo(pipeFinalUrl, `superscene-studio-${Date.now()}.mp4`)}>⬇ Download Video</button>
                    </div>
                  </div>
                )}

                {/* Scene status cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pipeScenes.map((scene, i) => (
                    <div key={i} className={cls("sc-sb-scene",
                      scene.status === "completed" && "done",
                      (scene.status === "generating" || scene.status === "voiceover") && "active",
                      scene.status === "failed" && "fail")}>
                      <div className="sc-sb-scene-head">
                        <span className="sc-sb-scene-num">Scene {scene.scene_number || i + 1}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="sc-sb-scene-meta">{scene.duration_seconds || 10}s</span>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                            background: scene.status === "completed" ? 'rgba(34,197,94,0.1)' :
                                       scene.status === "failed" ? 'rgba(248,113,113,0.1)' :
                                       scene.status === "generating" ? 'rgba(34,211,238,0.1)' :
                                       scene.status === "voiceover" ? 'rgba(251,146,60,0.1)' : 'var(--surface2)',
                            color: scene.status === "completed" ? '#22c55e' :
                                  scene.status === "failed" ? '#f87171' :
                                  scene.status === "generating" ? '#22d3ee' :
                                  scene.status === "voiceover" ? '#fb923c' : 'var(--muted)',
                          }}>{scene.status === "voiceover" ? "Voiceover" : scene.status === "generating" ? "Generating" : scene.status === "completed" ? "Done" : scene.status === "failed" ? "Failed" : "Pending"}</span>
                        </div>
                      </div>
                      <div className="sc-sb-prompt">{scene.narration_text}</div>
                      {scene.visual_prompt && <div className="sc-sub" style={{ marginTop: 0, fontSize: 12 }}>Visual: {scene.visual_prompt.slice(0, 100)}…</div>}
                      {scene.error_message && <div className="sc-sub" style={{ color: '#f87171', marginTop: 4 }}>{scene.error_message}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ GALLERY TAB ══ */}
        {tab === "gallery" && (
          <div className="sc-gallery-view">
            {videos.length === 0 ? (
              <div className="sc-gallery-empty">
                <div className="s-icon">◫</div><div className="s-title">No videos yet</div>
                <div className="s-sub">Generate your first video to see it here.</div>
                <button className="sc-ecta" onClick={() => setTab("create")}>← Go to Creator</button>
              </div>
            ) : (
              <div className="sc-gg">
                {videos.map(v => (
                  <div key={v.id} className="sc-gc">
                    <div className="sc-gct">{v.video_url ? <video src={v.video_url} className="sc-gvid"/> : "▶"}<div className="sc-gcd">{v.duration}s</div></div>
                    <div className="sc-gcb">
                      <div className="sc-gctitle">{v.prompt.slice(0, 40)}…</div>
                      <div className="sc-gcmod">{v.model_name} · {v.ratio}</div>
                      <div className="sc-gcas">
                        <button className="sc-gca" onClick={() => { setVideoUrl(v.video_url); setTab("editor"); }}>Edit</button>
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
                <div className="sc-gadd" onClick={() => setTab("create")}><span style={{ fontSize: 22 }}>+</span><span>Generate new video</span></div>
              </div>
            )}
          </div>
        )}

        {/* ══ PACKS TAB ══ */}
        {tab === "packs" && (
          <div className="sc-packs-view">
            <div className="sc-ph"><h2>Credit Packs</h2><p>Pay once, generate anytime. Credits never expire.</p>
              <div className="sc-payment-badges"><span className="sc-pay-badge">💳 Stripe</span><span className="sc-pay-badge">🔷 USDT Crypto</span></div>
            </div>
            <div className="sc-pgrid">
              {PACKS.map(pack => (
                <div key={pack.slug} className={cls("sc-pk", pack.popular && "pop")}>
                  {pack.popular && <div className="sc-pbdg">MOST POPULAR</div>}
                  <div className="sc-pname">{pack.label}</div>
                  <div className="sc-pcred">{pack.credits}</div>
                  <div className="sc-pcl">credits</div>
                  <div className="sc-ppr">${pack.price}</div>
                  <div className="sc-pper">{(pack.price / pack.credits * 100).toFixed(1)}¢ per credit</div>
                  <button className={cls("sc-pbtn sc-pbtn-stripe", pack.popular ? "pop" : "n")} onClick={() => buyStripe(pack.slug)} disabled={buyingPack === pack.slug}>
                    {buyingPack === pack.slug ? "…" : "💳 Pay with Card"}</button>
                  <button className="sc-pbtn sc-pbtn-crypto" onClick={() => buyCrypto(pack.slug)} disabled={buyingPack === pack.slug}>🔷 Pay with USDT</button>
                </div>
              ))}
            </div>
            <div className="sc-pfooter">🔒 Card payments via Stripe · Crypto via USDT/Polygon · Credits never expire</div>
            {cryptoOrder && (
              <div className="sc-modal-overlay" onClick={() => setCryptoOrder(null)}>
                <div className="sc-modal" onClick={e => e.stopPropagation()}>
                  <div className="sc-modal-title">🔷 USDT Payment</div>
                  <div className="sc-modal-body">
                    <p>Send exactly <strong>{cryptoOrder.amount_usdt} USDT</strong> on Polygon network to:</p>
                    <div className="sc-wallet">{cryptoOrder.pay_address}</div>
                    <p className="sc-modal-note">Your {PACKS.find(p => p.slug === cryptoOrder.slug)?.credits} credits will be added automatically once confirmed on-chain.</p>
                    <p className="sc-modal-expire">⏱ Order expires in 30 minutes</p>
                  </div>
                  <button className="sc-modal-close" onClick={() => setCryptoOrder(null)}>Close</button>
                </div>
              </div>
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
                  <select className="sc-asel" value={aiStyle} onChange={e => setAiStyle(e.target.value)}>
                    <option value="">Choose a style…</option>
                    {["Cinematic","Documentary","Lo-fi / Dreamy","Hyper-realistic","Anime / Stylised","Dark & Dramatic","Bright & Vibrant"].map(s => <option key={s}>{s}</option>)}
                  </select></div>
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
                <div className="sc-label">AI Image Generator</div>
                <div className="sc-sub" style={{ marginTop: 0, marginBottom: 20 }}>Create stunning images from text descriptions. Product photos, thumbnails, social graphics, and more.</div>

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
                        <span className="sc-model-badge" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>{IMG_MODELS.find(m => m.key === imgModel)?.badge}</span>
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
                              <span className="sc-model-badge" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>{m.badge}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prompt */}
                <div className="sc-section">
                  <div className="sc-label">Prompt</div>
                  <div className="sc-prompt-box">
                    <textarea className="sc-prompt-ta" rows={5}
                      placeholder="A professional product photo of wireless earbuds on a marble surface, soft studio lighting, shallow depth of field, 8K, photorealistic"
                      value={imgPrompt} onChange={e => setImgPrompt(e.target.value)}/>
                    <span className="sc-prompt-counter">{imgPrompt.length}/2000</span>
                  </div>
                </div>

                {/* Size */}
                <div className="sc-section">
                  <div className="sc-label">Aspect Ratio</div>
                  <div className="sc-pills" style={{ flexWrap: "wrap" }}>
                    {IMG_SIZES.map(s => (
                      <button key={s} className={cls("sc-pill", imgSize === s && "on")} onClick={() => setImgSize(s)}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div className="sc-section">
                  <div className="sc-label">Quality</div>
                  <div className="sc-pills">
                    {IMG_QUALITIES.map(q => (
                      <button key={q} className={cls("sc-pill", imgQuality === q && "on")} onClick={() => setImgQuality(q)}>
                        {q} <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>{IMG_CREDIT_MAP[q]}cr</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate */}
                <div className="sc-section">
                  <div className="sc-credit-line">
                    <div className="sc-cl-icon">◈</div>
                    <span className="sc-cl-label">Cost:</span>
                    <span className="sc-cl-value">{IMG_CREDIT_MAP[imgQuality] || 2} credits</span>
                  </div>
                  <button className="sc-gen-btn" onClick={generateImage} disabled={!imgPrompt.trim() || imgGenerating}>
                    {imgGenerating ? "Generating…" : !imgPrompt.trim() ? "Enter a prompt" : "🖼 Generate Image"}
                  </button>
                </div>
              </div>

              {/* Right — Preview */}
              <div className="sc-music-preview">
                <div className="sc-preview-label">Generated Image</div>
                <div className="sc-music-stage" style={{ padding: 20 }}>
                  {imgGenerating ? (
                    <div className="gst">
                      <div className="spin"><div className="r1"/><div className="r2"/></div>
                      <div className="gst-title">Generating image…</div>
                      <div className="gst-sub">{IMG_MODELS.find(m => m.key === imgModel)?.name} · {imgQuality} · {imgSize}</div>
                      <div className="pt"><div className="pf" style={{ width: `${Math.min(imgProgress, 100)}%` }}/></div>
                      <div className="gst-pct">{Math.round(imgProgress)}%</div>
                    </div>
                  ) : imgResults.length > 0 ? (
                    <div className="sc-img-results">
                      {imgResults.map((url, i) => (
                        <div key={i} className="sc-img-result-item">
                          <img src={url} alt={`Generated ${i+1}`} className="sc-img-result-img"/>
                          <div className="sc-img-result-actions">
                            <button className="sc-sa-btn" onClick={() => downloadVideo(url, `superscene-image-${Date.now()}.png`)}>⬇ Download</button>
                            <button className="sc-sa-btn" onClick={() => { navigator.clipboard.writeText(url); alert("Image URL copied!"); }}>📋 Copy URL</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="s-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5a5a62" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}>
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

        {/* ══ STORYBOARD TAB — Extend from Last Frame ══ */}
        {tab === "storyboard" && (
          <div className="sc-storyboard-view">
            <div className="sc-sb-header">
              <div>
                <div className="sc-label" style={{ marginBottom: 4 }}>Storyboard</div>
                <div className="sc-sub" style={{ marginTop: 0 }}>Extend your video scene by scene. Each new scene starts from the last frame of the previous one for visual continuity.</div>
              </div>
            </div>

            {/* Timeline of completed + generating scenes */}
            {sbScenes.length > 0 && (
              <div className="sc-sb-timeline">
                {sbScenes.map((scene, idx) => (
                  <div key={scene.id} className={cls("sc-sb-scene", scene.status === "completed" && "done", scene.status === "generating" && "active", scene.status === "failed" && "fail")}>
                    <div className="sc-sb-scene-head">
                      <span className="sc-sb-scene-num">Scene {idx + 1}</span>
                      <div className="sc-sb-scene-controls">
                        <span className="sc-sb-scene-meta">{MODELS.find(m => m.key === scene.model)?.name} · {scene.duration}s</span>
                        {scene.status !== "generating" && <button className="sc-sb-remove" onClick={() => sbRemoveScene(scene.id)} title="Remove">✕</button>}
                      </div>
                    </div>
                    <div className="sc-sb-prompt-display">{scene.prompt}</div>

                    {scene.status === "generating" && (
                      <div className="sc-sb-progress">
                        <div className="sc-sb-prog-bar"><div className="sc-sb-prog-fill" style={{ width: `${scene.progress}%` }}/></div>
                        <span className="sc-sb-prog-pct">{Math.round(scene.progress)}%</span>
                      </div>
                    )}

                    {scene.status === "completed" && scene.videoUrl && (
                      <div className="sc-sb-scene-preview">
                        <video src={scene.videoUrl} className="sc-sb-video" controls/>
                        <div className="sc-sb-done-actions">
                          <span className="sc-sb-done-check">✓ Done</span>
                          <button className="sc-sa-btn" onClick={() => downloadVideo(scene.videoUrl, `superscene-scene-${idx+1}.mp4`)}>⬇ Download</button>
                        </div>
                      </div>
                    )}

                    {scene.status === "failed" && (
                      <div className="sc-sb-fail">
                        <span style={{ color: "#f87171" }}>✕ Generation failed</span>
                      </div>
                    )}

                    {/* Connector arrow between scenes */}
                    {idx < sbScenes.length - 1 && scene.status === "completed" && (
                      <div className="sc-sb-connector">
                        <div className="sc-sb-connector-line"/>
                        <div className="sc-sb-connector-label">Last frame → Next scene</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {sbScenes.length === 0 && !sbGenerating && (
              <div className="sc-sb-empty">
                <div className="s-icon">🎬</div>
                <div className="s-title">Start your storyboard</div>
                <div className="s-sub">Write a prompt for your first scene below. Each new scene will extend from the last frame of the previous one.</div>
              </div>
            )}

            {/* Input for next scene */}
            <div className="sc-sb-input-area">
              <div className="sc-sb-input-header">
                <div className="sc-label" style={{ marginBottom: 0 }}>
                  {sbScenes.length === 0 ? "Scene 1 — First Scene" : `Scene ${sbScenes.length + 1} — Extend from Scene ${sbScenes.length}`}
                </div>
                {sbScenes.length > 0 && sbScenes[sbScenes.length - 1]?.status === "completed" && (
                  <div className="sc-sb-chain-badge">🔗 Chaining from last frame</div>
                )}
              </div>

              <textarea className="sc-sb-prompt-input" rows={5}
                placeholder={sbScenes.length === 0
                  ? "Describe your first scene… e.g. A cinematic sunset over the ocean, golden light, slow camera pan"
                  : "Describe what happens next… The camera continues to the same characters now walking along the beach"}
                value={sbPrompt} onChange={e => setSbPrompt(e.target.value)}
                disabled={sbGenerating}/>

              <div className="sc-sb-input-controls">
                <div className="sc-sb-input-settings">
                  <select className="sc-sb-model-sel" value={sbModel} onChange={e => setSbModel(e.target.value)} disabled={sbGenerating}>
                    {MODELS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
                  </select>
                  <select className="sc-sb-dur-sel" value={sbDuration} onChange={e => setSbDuration(parseInt(e.target.value))} disabled={sbGenerating}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                  </select>
                  <span className="sc-sb-cost-label">{calcCost(sbModel, sbDuration, false)} credits</span>
                </div>
                <button className="sc-gen-btn" style={{ maxWidth: 220 }} onClick={sbGenerate}
                  disabled={!sbPrompt.trim() || sbGenerating}>
                  {sbGenerating ? "Generating…" : sbScenes.length === 0 ? "▶ Generate First Scene" : "▶ Extend Scene"}
                </button>
              </div>
            </div>

            {/* Total summary */}
            {sbScenes.length > 0 && (
              <div className="sc-sb-footer-info">
                <div className="sc-sub">Total: {sbScenes.filter(s => s.status === "completed").length}/{sbScenes.length} scenes · {sbScenes.filter(s => s.status === "completed").reduce((a, s) => a + s.duration, 0)}s of video</div>
              </div>
            )}
          </div>
        )}

        {/* ══ CAPTIONS TAB ══ */}
        {tab === "captions" && (
          <div className="sc-captions-view">
            <div className="sc-cap-layout">
              {/* Left — Caption Editor */}
              <div className="sc-cap-editor">
                <div className="sc-label">Add Captions</div>
                <div className="sc-sub" style={{ marginTop: 0, marginBottom: 16 }}>Add styled subtitles to your generated video. Type captions manually or use auto-transcribe.</div>

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

      {dropOpen && <div className="sc-overlay" onClick={() => setDropOpen(false)}/>}
    </div>
  );
}
