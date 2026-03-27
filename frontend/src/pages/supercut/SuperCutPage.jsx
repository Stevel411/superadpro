import { useState, useEffect, useRef, useCallback } from "react";
import "./supercut.css";

// ── Constants ──────────────────────────────────────────────
const MODELS = [
  { key: "kling3",    name: "Kling 3.0",    desc: "Cinematic realism, smooth motion",  badge: "POPULAR", cost: 3, color: "#22d3ee", i2v: true,  audio: false },
  { key: "seedance2", name: "Seedance 2.0", desc: "Fast generation, native audio",     badge: "AUDIO",   cost: 2, color: "#fb923c", i2v: true,  audio: true  },
  { key: "sora2",     name: "Sora 2 Pro",   desc: "OpenAI flagship, photorealistic",   badge: "HD",      cost: 4, color: "#a78bfa", i2v: true,  audio: false },
  { key: "veo31",     name: "Veo 3.1",      desc: "Google latest, audio + detail",     badge: "NEW",     cost: 5, color: "#38bdf8", i2v: true,  audio: true  },
];

const DURATIONS = [5, 10, 15, 30];
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
export default function SuperCutPage() {
  const [tab, setTab]           = useState("create");
  const [dark, setDark]         = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  // Create state
  const [mode, setMode]         = useState("text"); // text | image
  const [prompt, setPrompt]     = useState("");
  const [model, setModel]       = useState("kling3");
  const [duration, setDuration] = useState(10);
  const [ratio, setRatio]       = useState("16:9");
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

  const selectedModel = MODELS.find(m => m.key === model);
  const cost = calcCost(model, duration, genAudio);

  // ── Fetch credits on mount ─────────────────────────────
  useEffect(() => {
    fetch("/api/supercut/credits")
      .then(r => r.json())
      .then(d => { setCredits(d.balance || 0); setLoadingCredits(false); })
      .catch(() => setLoadingCredits(false));
    fetchVideos();
    const params = new URLSearchParams(window.location.search);
    if (params.get("pack_success")) {
      fetch("/api/supercut/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
      window.history.replaceState({}, "", "/supercut");
    }
  }, []);

  const fetchVideos = () => {
    fetch("/api/supercut/videos").then(r => r.json()).then(d => setVideos(d.videos || []));
  };

  // ── Polling ────────────────────────────────────────────
  const startPolling = useCallback((tid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/supercut/status/${tid}`);
        const data = await res.json();
        setGenStatus(data.status);
        if (data.status === "completed" && data.video_url) {
          setVideoUrl(data.video_url);
          setGenerating(false);
          clearInterval(pollRef.current);
          clearInterval(fakeProgRef.current);
          setGenProgress(100);
          fetchVideos();
          fetch("/api/supercut/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
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
      const res = await fetch("/api/supercut/upload-image", { method: "POST", body: fd });
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
      const payload = { model_key: model, prompt, duration, ratio, generate_audio: genAudio };
      if (mode === "image" && imageUrl) payload.image_urls = [imageUrl];

      const res = await fetch("/api/supercut/generate", {
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
      const res = await fetch("/api/supercut/buy/stripe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack_slug: slug }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url; else alert(data.detail || "Checkout failed");
    } finally { setBuyingPack(null); }
  };
  const buyCrypto = async (slug) => {
    setBuyingPack(slug);
    try {
      const res = await fetch("/api/supercut/buy/crypto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack_slug: slug }) });
      const data = await res.json();
      if (data.success) setCryptoOrder({ ...data, slug }); else alert(data.detail || "Crypto order failed");
    } finally { setBuyingPack(null); }
  };

  const toggleChip = (val, arr, setArr) => setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const cls = (...c) => c.filter(Boolean).join(" ");

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
    return (
      <div className="s-empty"><div className="s-icon">▶</div>
        <div className="s-title">Your video will appear here</div>
        <div className="s-sub">Fill in your prompt, choose a model and settings, then hit Generate</div></div>
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
          <div className="sc-logo-text"><span className="lw">Super</span><span className="lc">Cut</span></div>
          <div className="sc-logo-badge">BETA</div>
        </div>
        <div className="sc-tabs">
          {["create","editor","gallery","packs","builder"].map(t => (
            <button key={t} className={cls("sc-tab", tab === t && "active")} onClick={() => setTab(t)}>
              <span className="tdot"/>{t === "builder" ? "AI Builder" : t.charAt(0).toUpperCase() + t.slice(1)}
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
                        onClick={() => { setModel(m.key); setDropOpen(false); if (!m.audio) setGenAudio(false); }}>
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
                    value={prompt} onChange={e => setPrompt(e.target.value.slice(0, 500))}/>
                  <div className="sc-prompt-footer">
                    <span className="sc-prompt-ai" onClick={() => setTab("builder")}>✦ Generate With AI</span>
                    <span className="sc-prompt-count">{prompt.length}/500</span>
                  </div>
                </div>
                <div className="sc-sub">If you're not satisfied, you can generate again or enter a prompt of your own.</div>
              </div>

              {/* Duration */}
              <div className="sc-section">
                <div className="sc-label">Duration</div>
                <div className="sc-pills">
                  {DURATIONS.map(d => <button key={d} className={cls("sc-pill", duration === d && "on")} onClick={() => setDuration(d)}>{d}s</button>)}
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

          {/* RIGHT — Preview */}
          <div className="sc-rp">
            <div className="sc-preview-label">Preview</div>
            <div className="sc-stage"><StageContent/></div>
            {videoUrl && (
              <div className="sc-stage-actions">
                <button className="sc-sa-btn" onClick={() => setTab("editor")}>✂ Edit</button>
                <a href={videoUrl} download className="sc-sa-btn">⬇ Download</a>
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
        </>}

        {/* ══ EDITOR TAB ══ */}
        {tab === "editor" && (
          <div className="sc-editor-outer">
            <div className="sc-editor-wrap">
              <div className="sc-ebar">
                <span className="sc-elbl">Free Editor</span>
                {["✂ Trim","T Caption","♪ Music","⟳ Speed","▲ Export"].map(t => (
                  <button key={t} className="sc-ebt">{t}</button>
                ))}
              </div>
              {videoUrl ? (
                <div className="sc-editor-player">
                  <video src={videoUrl} controls className="sc-editor-video"/>
                  <div className="sc-timeline-placeholder"><div className="sc-timeline-label">Timeline editor coming in Phase 2</div></div>
                </div>
              ) : (
                <div className="sc-eempty">
                  <div className="sc-eicon">✂</div>
                  <div className="sc-etitle">Video Editor</div>
                  <div className="sc-esub">Generate a video first, then open it here to trim, add captions, music and more — completely free.</div>
                  <button className="sc-ecta" onClick={() => setTab("create")}>← Go to Creator</button>
                </div>
              )}
            </div>
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
                        {v.video_url && <a href={v.video_url} download className="sc-gca">Download</a>}
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

      </div>{/* /ws */}

      {/* ── HELP DRAWER ──────────────────────────────────── */}
      {helpOpen && (
        <div className="sc-hdrawer">
          <div className="sc-hhead"><span className="sc-htitle">How SuperCut Works</span>
            <button className="sc-hclose" onClick={() => setHelpOpen(false)}>×</button></div>
          <div className="sc-hbody">
            {[["1 · Write your prompt", "Describe your scene — camera movement, lighting, mood. Or use the AI Prompt Builder tab."],
              ["2 · Choose a model", "Kling excels at cinematic realism. Seedance has native audio. Sora 2 is photorealistic. Veo 3.1 delivers Google's finest detail + audio."],
              ["3 · Upload an image (optional)", "Switch to Image-to-Video mode to animate a reference image. All models support it."],
              ["4 · Enable AI Audio", "Seedance 2.0 and Veo 3.1 can generate sound effects, music and dialogue with your video."],
              ["5 · Generate & edit", "Credits deducted only on success. Open the free Editor to trim, caption, add music and export."],
            ].map(([t, b]) => (
              <div key={t} className="sc-hitem"><div className="sc-hititle">{t}</div><div className="sc-hibody">{b}</div></div>
            ))}
            <div className="sc-htip">
              <div className="sc-httitle">💡 Pro tips</div>
              {["Use Image-to-Video to animate product shots","Enable AI Audio on Seedance for full soundscapes","Add camera moves: 'slow push-in', 'aerial pan'","9:16 ratio for TikTok and Instagram Reels"].map(t => (
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
