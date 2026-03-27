import { useState, useEffect, useRef, useCallback } from "react";
import "./supercut.css";

// ── Constants ──────────────────────────────────────────────
const MODELS = [
  { key: "kling3",    name: "Kling 3.0",    desc: "Cinematic realism, smooth motion",  badge: "POPULAR", cost: 3, color: "#22d3ee" },
  { key: "seedance2", name: "Seedance 2.0", desc: "Fast generation, vibrant style",     badge: "FAST",    cost: 2, color: "#fb923c" },
  { key: "sora2",     name: "Sora 2 Pro",   desc: "OpenAI flagship, photorealistic",    badge: "HD",      cost: 4, color: "#a78bfa" },
  { key: "veo31",     name: "Veo 3.1",      desc: "Google latest, ultra detail",        badge: "NEW",     cost: 5, color: "#38bdf8" },
];

const DURATIONS = [5, 10, 15, 30];
const RATIOS    = ["16:9", "9:16", "1:1", "4:3"];

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

const RATIO_CLASS = { "16:9": "s169", "9:16": "s916", "1:1": "s11", "4:3": "s43" };

function calcCost(modelKey, duration) {
  const m = MODELS.find(x => x.key === modelKey);
  return m ? m.cost * (duration / 5) : 0;
}

// ── Main Component ─────────────────────────────────────────
export default function SuperCutPage() {
  const [tab, setTab]           = useState("create");
  const [dark, setDark]         = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  // Create state
  const [prompt, setPrompt]     = useState("");
  const [model, setModel]       = useState("kling3");
  const [duration, setDuration] = useState(10);
  const [ratio, setRatio]       = useState("16:9");
  const [dropOpen, setDropOpen] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId]         = useState(null);
  const [videoUrl, setVideoUrl]     = useState(null);
  const [genStatus, setGenStatus]   = useState(null); // pending|processing|completed|failed
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
  const cost = calcCost(model, duration);

  // ── Fetch credits on mount ─────────────────────────────
  useEffect(() => {
    fetch("/api/supercut/credits")
      .then(r => r.json())
      .then(d => { setCredits(d.balance || 0); setLoadingCredits(false); })
      .catch(() => setLoadingCredits(false));
    fetchVideos();

    // Check for Stripe success redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("pack_success")) {
      fetch("/api/supercut/credits").then(r => r.json()).then(d => setCredits(d.balance || 0));
      window.history.replaceState({}, "", "/supercut");
    }
  }, []);

  const fetchVideos = () => {
    fetch("/api/supercut/videos")
      .then(r => r.json())
      .then(d => setVideos(d.videos || []));
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

  // ── Generate ───────────────────────────────────────────
  const generate = async () => {
    if (!prompt.trim() || generating || credits < cost) return;
    setGenerating(true);
    setVideoUrl(null);
    setGenStatus("pending");
    setGenProgress(0);

    // Fake progress while waiting for EvoLink
    fakeProgRef.current = setInterval(() => {
      setGenProgress(p => {
        if (p >= 85) { clearInterval(fakeProgRef.current); return p; }
        return p + Math.random() * 2 + 0.5;
      });
    }, 400);

    try {
      const res = await fetch("/api/supercut/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_key: model, prompt, duration, ratio }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Generation failed");
        setGenerating(false);
        clearInterval(fakeProgRef.current);
        return;
      }
      setTaskId(data.task_id);
      setCredits(data.credits_remaining);
      startPolling(data.task_id);
    } catch (e) {
      alert("Network error — please try again");
      setGenerating(false);
      clearInterval(fakeProgRef.current);
    }
  };

  // ── AI Prompt Builder ──────────────────────────────────
  const buildPrompt = () => {
    const subj  = aiSubject.trim() || "a dramatic landscape";
    const style = aiStyle || "cinematic";
    const cam   = aiCams.length  ? aiCams.join(" and ")  : "smooth camera movement";
    const light = aiLights.length? aiLights.join(" and "): "natural light";
    const tmpl  = PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
    const result = tmpl
      .replace("{subject}", subj).replace("{style}", style.toLowerCase())
      .replace("{light}", light.toLowerCase()).replace("{cam}", cam.toLowerCase());
    setAiResult(result);
  };

  const useAiPrompt = () => {
    setPrompt(aiResult);
    setAiResult("");
    setTab("create");
    document.getElementById("prompt-ta")?.focus();
  };

  // ── Buy credits ────────────────────────────────────────
  const buyStripe = async (slug) => {
    setBuyingPack(slug);
    try {
      const res = await fetch("/api/supercut/buy/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_slug: slug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.detail || "Checkout failed");
    } finally { setBuyingPack(null); }
  };

  const buyCrypto = async (slug) => {
    setBuyingPack(slug);
    try {
      const res = await fetch("/api/supercut/buy/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_slug: slug }),
      });
      const data = await res.json();
      if (data.success) setCryptoOrder({ ...data, slug });
      else alert(data.detail || "Crypto order failed");
    } finally { setBuyingPack(null); }
  };

  const toggleChip = (val, arr, setArr) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  // ── Render helpers ─────────────────────────────────────
  const cls = (...c) => c.filter(Boolean).join(" ");

  const StageContent = () => {
    if (generating) return (
      <div className="gst">
        <div className="spin"><div className="r1"/><div className="r2"/></div>
        <div className="gst-title">Generating your video…</div>
        <div className="gst-sub">{selectedModel?.name} · {duration}s · {ratio}</div>
        <div className="pt"><div className="pf" style={{ width: `${Math.min(genProgress, 100)}%` }}/></div>
        <div className="gst-pct">{Math.round(genProgress)}%</div>
      </div>
    );
    if (videoUrl) return (
      <div className="video-ready">
        <video src={videoUrl} controls autoPlay className="sc-video"/>
      </div>
    );
    if (genStatus === "failed") return (
      <div className="s-empty">
        <div className="s-icon" style={{ color: "#f87171" }}>✕</div>
        <div className="s-title">Generation Failed</div>
        <div className="s-sub">Something went wrong. Your credits have been refunded.</div>
      </div>
    );
    return (
      <div className="s-empty">
        <div className="s-icon">▶</div>
        <div className="s-title">Your video will appear here</div>
        <div className="s-sub">Fill in your prompt, choose a model and settings, then hit Generate</div>
      </div>
    );
  };

  return (
    <div className={cls("sc-root", dark ? "dark" : "light")}>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <div className="sc-topbar">
        <div className="sc-logo">
          <a href="/dashboard" className="sc-back-btn" title="Back to dashboard">
            ← Dashboard
          </a>
          <div className="sc-topbar-divider"/>
          <div className="sc-logo-mark">✂</div>
          <div className="sc-logo-text">
            <span className="lw">Super</span><span className="lc">Cut</span>
          </div>
          <div className="sc-logo-badge">BETA</div>
        </div>

        <div className="sc-tabs">
          {["create","editor","gallery","packs"].map(t => (
            <button key={t} className={cls("sc-tab", tab === t && "active")} onClick={() => setTab(t)}>
              <span className="tdot"/>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="sc-topbar-r">
          <div className="sc-cpill">
            <div className="sc-cicon">◈</div>
            <span className="sc-cnum">{loadingCredits ? "…" : credits}</span>
            <span className="sc-clbl">credits</span>
            <div className="sc-cadd" onClick={() => setTab("packs")} title="Buy credits">+</div>
          </div>
          <button className="sc-ibt" onClick={() => setHelpOpen(!helpOpen)}>?</button>
          <button className="sc-ibt" onClick={() => setDark(!dark)}>{dark ? "☀" : "◑"}</button>
        </div>
      </div>

      {/* ── WORKSPACE ──────────────────────────────────── */}
      <div className="sc-ws">

        {/* ══ CREATE TAB ══ */}
        {tab === "create" && <>

          {/* LEFT PANEL */}
          <div className="sc-lp">
            <div className="sc-lp-scroll">

              {/* Step 1: Prompt */}
              <div className="sc-sblock">
                <div className="sc-sh"><div className="sc-snum">1</div><div className="sc-slbl">Describe your video</div><div className="sc-sdiv"/></div>
                <textarea
                  id="prompt-ta"
                  rows={6}
                  placeholder="A cinematic drone shot over a misty mountain valley at golden hour, warm light, slow push-in…"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value.slice(0, 500))}
                  className="sc-ta"
                />
                <div className="sc-pfoot">
                  <span className="sc-pcount">{prompt.length} / 500</span>
                </div>
                <button className="sc-ai-btn" onClick={() => setTab("builder")}>✦ Generate Prompt with AI</button>
              </div>

              {/* Step 2: Model */}
              <div className="sc-sblock">
                <div className="sc-sh"><div className="sc-snum">2</div><div className="sc-slbl">Choose model</div><div className="sc-sdiv"/></div>
                <div className="sc-mwrap" onClick={e => e.stopPropagation()}>
                  <button className={cls("sc-mtrig", dropOpen && "open")} onClick={() => setDropOpen(!dropOpen)}>
                    <div className="sc-mdot" style={{ background: selectedModel?.color, boxShadow: `0 0 6px ${selectedModel?.color}55` }}/>
                    <div className="sc-minfo">
                      <div className="sc-mname">{selectedModel?.name}</div>
                      <div className="sc-mdesc">{selectedModel?.desc}</div>
                    </div>
                    <div className="sc-mmeta">
                      <span className="sc-mbadge" style={{ background: `${selectedModel?.color}22`, color: selectedModel?.color }}>{selectedModel?.badge}</span>
                      <span className="sc-mcost">{selectedModel?.cost} cr/5s</span>
                    </div>
                    <span className={cls("sc-mchev", dropOpen && "open")}>▼</span>
                  </button>
                  {dropOpen && (
                    <div className="sc-mdrop">
                      {MODELS.map(m => (
                        <button key={m.key} className={cls("sc-mopt", model === m.key && "sel")}
                          onClick={() => { setModel(m.key); setDropOpen(false); }}>
                          <div className="sc-mdot" style={{ background: m.color }}/>
                          <div className="sc-minfo"><div className="sc-mname">{m.name}</div><div className="sc-mdesc">{m.desc}</div></div>
                          <div className="sc-mmeta">
                            <span className="sc-mbadge" style={{ background: `${m.color}22`, color: m.color }}>{m.badge}</span>
                            <span className="sc-mcost">{m.cost} cr/5s</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Settings */}
              <div className="sc-sblock">
                <div className="sc-sh"><div className="sc-snum">3</div><div className="sc-slbl">Settings</div><div className="sc-sdiv"/></div>
                <div className="sc-setting-row">
                  <div className="sc-setting-lbl">Duration</div>
                  <div className="sc-pills">
                    {DURATIONS.map(d => (
                      <button key={d} className={cls("sc-pill", duration === d && "on")} onClick={() => setDuration(d)}>{d}s</button>
                    ))}
                  </div>
                </div>
                <div className="sc-setting-row">
                  <div className="sc-setting-lbl">Aspect Ratio</div>
                  <div className="sc-pills">
                    {RATIOS.map(r => (
                      <button key={r} className={cls("sc-pill", ratio === r && "on")} onClick={() => setRatio(r)}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 4: Generate */}
              <div className="sc-sblock">
                <div className="sc-sh"><div className="sc-snum">4</div><div className="sc-slbl">Generate</div><div className="sc-sdiv"/></div>
                <div className="sc-csum">
                  <div className="sc-crow">
                    <div>
                      <div className="sc-clabel">Video cost</div>
                      <div><span className="sc-cbig">{cost}</span><span className="sc-cunit"> credits</span></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="sc-blabel">Your balance</div>
                      <div className="sc-bval" style={{ color: credits >= cost ? "var(--text)" : "#f87171" }}>{credits}</div>
                    </div>
                  </div>
                  <div className="sc-ctags">
                    <span className="sc-ct">{selectedModel?.name}</span>
                    <span className="sc-ct">{duration}s</span>
                    <span className="sc-ct">{ratio}</span>
                  </div>
                  <button
                    className="sc-gbtn"
                    onClick={generate}
                    disabled={!prompt.trim() || generating || credits < cost}
                  >
                    {generating ? "Generating…"
                      : !prompt.trim() ? "Enter a prompt first"
                      : credits < cost ? "Not enough credits"
                      : `✦ Generate — ${cost} credits`}
                  </button>
                  {credits < cost && (
                    <button className="sc-buymore" onClick={() => setTab("packs")}>Buy more credits →</button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* MAIN CANVAS */}
          <div className="sc-canvas">
            <div className="sc-stage">
              <div className={cls("sc-sbox", RATIO_CLASS[ratio])}>
                <StageContent/>
                {videoUrl && (
                  <div className="sc-sov">
                    <button className="sc-sovb" onClick={() => setTab("editor")}>✂ Edit</button>
                    <a href={videoUrl} download className="sc-sovb">⬇ Download</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="sc-rp">
            <div className="sc-rp-scroll">

              {/* Stats */}
              <div className="sc-rsec">
                <div className="sc-rlbl">Stats</div>
                <div className="sc-sgrid">
                  <div className="sc-sc"><div className="sc-sv">{videos.length}</div><div className="sc-sl">Generated</div></div>
                  <div className="sc-sc"><div className="sc-sv">{credits}</div><div className="sc-sl">Credits</div></div>
                  <div className="sc-sc"><div className="sc-sv">4</div><div className="sc-sl">Models</div></div>
                  <div className="sc-sc"><div className="sc-sv sc-sv-cyan">Free</div><div className="sc-sl">Editor</div></div>
                </div>
              </div>

              {/* Recent */}
              {videos.length > 0 && (
                <div className="sc-rsec">
                  <div className="sc-rlbl">Recent videos</div>
                  {videos.slice(0, 3).map(v => (
                    <div key={v.id} className="sc-hi" onClick={() => v.video_url && setVideoUrl(v.video_url)}>
                      <div className="sc-hth">
                        {v.video_url ? <video src={v.video_url} className="sc-hthumb"/> : "▶"}
                        <div className="sc-hd">{v.duration}s</div>
                        <div className={cls("sc-hstatus", v.status)}>{v.status}</div>
                      </div>
                      <div className="sc-hm">
                        <span className="sc-ht">{v.prompt.slice(0, 30)}…</span>
                        <span className="sc-hmod">{v.model_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Prompt tips */}
              <div className="sc-rsec">
                <div className="sc-rlbl">Prompt tips</div>
                {[
                  ["camera movement", '"slow push-in", "aerial pan", "tracking shot"'],
                  ["lighting",        '"golden hour", "blue hour", "neon-lit"'],
                  ["mood",            '"cinematic", "documentary", "lo-fi"'],
                  ["9:16 ratio",      "for TikTok & Instagram Reels"],
                ].map(([k, v]) => (
                  <div key={k} className="sc-tip">Describe <strong>{k}</strong> — {v}</div>
                ))}
              </div>

            </div>
          </div>

        </>}

        {/* ══ AI PROMPT BUILDER TAB ══ */}
        {tab === "builder" && (
          <div className="sc-builder-view">
            <div className="sc-builder-inner">
              <div className="sc-builder-head">
                <span className="sc-builder-title">✦ AI Prompt Builder</span>
                <span className="sc-aip-badge">AI</span>
              </div>
              <div className="sc-builder-body">
                <div className="sc-af">
                  <div className="sc-afl">Subject / Scene</div>
                  <input className="sc-ainp" placeholder="e.g. mountain valley, city at night, ocean at sunset…" value={aiSubject} onChange={e => setAiSubject(e.target.value)}/>
                </div>
                <div className="sc-af">
                  <div className="sc-afl">Style</div>
                  <select className="sc-asel" value={aiStyle} onChange={e => setAiStyle(e.target.value)}>
                    <option value="">Choose a style…</option>
                    {["Cinematic","Documentary","Lo-fi / Dreamy","Hyper-realistic","Anime / Stylised","Dark & Dramatic","Bright & Vibrant"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sc-af">
                  <div className="sc-afl">Camera Movement</div>
                  <div className="sc-achips">
                    {["Slow push-in","Aerial pan","Tracking shot","Handheld","Crane shot","Static","Dolly zoom","Orbit"].map(c => (
                      <button key={c} className={cls("sc-achip", aiCams.includes(c) && "on")} onClick={() => toggleChip(c, aiCams, setAiCams)}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="sc-af">
                  <div className="sc-afl">Lighting</div>
                  <div className="sc-achips">
                    {["Golden hour","Blue hour","Neon-lit","Overcast","Studio lit","Moonlit","Harsh midday","Foggy"].map(l => (
                      <button key={l} className={cls("sc-achip", aiLights.includes(l) && "on")} onClick={() => toggleChip(l, aiLights, setAiLights)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="sc-af">
                  <div className="sc-afl">Mood / Atmosphere (optional)</div>
                  <div className="sc-achips">
                    {["Epic","Serene","Tense","Mysterious","Joyful","Melancholic"].map(m => (
                      <button key={m} className="sc-achip">{m}</button>
                    ))}
                  </div>
                </div>
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
                  <div className="sc-timeline-placeholder">
                    <div className="sc-timeline-label">Timeline editor coming in Phase 2</div>
                  </div>
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
                <div className="s-icon">◫</div>
                <div className="s-title">No videos yet</div>
                <div className="s-sub">Generate your first video to see it here.</div>
                <button className="sc-ecta" onClick={() => setTab("create")}>← Go to Creator</button>
              </div>
            ) : (
              <div className="sc-gg">
                {videos.map(v => (
                  <div key={v.id} className="sc-gc">
                    <div className="sc-gct">
                      {v.video_url ? <video src={v.video_url} className="sc-gvid"/> : "▶"}
                      <div className="sc-gcd">{v.duration}s</div>
                    </div>
                    <div className="sc-gcb">
                      <div className="sc-gctitle">{v.prompt.slice(0, 40)}…</div>
                      <div className="sc-gcmod">{v.model_name} · {v.ratio}</div>
                      <div className="sc-gcas">
                        <button className="sc-gca sc-gca-e" onClick={() => { setVideoUrl(v.video_url); setTab("editor"); }}>Edit</button>
                        {v.video_url && <a href={v.video_url} download className="sc-gca sc-gca-d">Download</a>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="sc-gadd" onClick={() => setTab("create")}>
                  <span style={{ fontSize: 22 }}>+</span>
                  <span>Generate new video</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PACKS TAB ══ */}
        {tab === "packs" && (
          <div className="sc-packs-view">
            <div className="sc-ph">
              <h2>Credit Packs</h2>
              <p>Pay once, generate anytime. Credits never expire.</p>
              <div className="sc-payment-badges">
                <span className="sc-pay-badge">💳 Stripe</span>
                <span className="sc-pay-badge">🔷 USDT Crypto</span>
              </div>
            </div>
            <div className="sc-pgrid">
              {PACKS.map(pack => (
                <div key={pack.slug} className={cls("sc-pk", pack.popular && "pop")}>
                  {pack.popular && <div className="sc-pbdg">MOST POPULAR</div>}
                  <div className="sc-pname">{pack.label}</div>
                  <div className={cls("sc-pcred", pack.popular && "pop")}>{pack.credits}</div>
                  <div className="sc-pcl">credits</div>
                  <div className="sc-ppr">${pack.price}</div>
                  <div className="sc-pper">{(pack.price / pack.credits * 100).toFixed(1)}¢ per credit</div>
                  <button
                    className={cls("sc-pbtn sc-pbtn-stripe", pack.popular ? "pop" : "n")}
                    onClick={() => buyStripe(pack.slug)}
                    disabled={buyingPack === pack.slug}
                  >
                    {buyingPack === pack.slug ? "…" : "💳 Pay with Card"}
                  </button>
                  <button
                    className="sc-pbtn sc-pbtn-crypto"
                    onClick={() => buyCrypto(pack.slug)}
                    disabled={buyingPack === pack.slug}
                  >
                    🔷 Pay with USDT
                  </button>
                </div>
              ))}
            </div>
            <div className="sc-pfooter">🔒 Card payments via Stripe &nbsp;·&nbsp; Crypto via USDT/Polygon &nbsp;·&nbsp; Credits never expire</div>

            {/* Crypto order modal */}
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

      </div>{/* /ws */}

      {/* ── HELP DRAWER ──────────────────────────────────── */}
      {helpOpen && (
        <div className="sc-hdrawer">
          <div className="sc-hhead">
            <span className="sc-htitle">How SuperCut Works</span>
            <button className="sc-hclose" onClick={() => setHelpOpen(false)}>×</button>
          </div>
          <div className="sc-hbody">
            {[
              ["1 · Write your prompt", "Describe your scene — camera movement, lighting, mood. Or use the AI Prompt Builder tab to craft the perfect prompt automatically."],
              ["2 · Choose a model",    "Kling excels at cinematic realism. Seedance is fastest. Sora 2 is photorealistic. Veo 3.1 delivers Google's finest detail."],
              ["3 · Pick settings",     "Set duration (5–30s) and aspect ratio. Use 9:16 for TikTok/Reels, 16:9 for YouTube/ads."],
              ["4 · Generate & edit",   "Credits deducted only on success. Open the free Editor to trim, caption, add music and export."],
            ].map(([t, b]) => (
              <div key={t} className="sc-hitem">
                <div className="sc-hititle">{t}</div>
                <div className="sc-hibody">{b}</div>
              </div>
            ))}
            <div className="sc-htip">
              <div className="sc-httitle">💡 Pro tips</div>
              {["Use AI Prompt Builder for best results","Add camera moves: 'slow push-in', 'aerial pan'","Lighting: 'golden hour', 'blue hour'","9:16 ratio for TikTok and Instagram Reels"].map(t => (
                <div key={t} className="sc-hti">{t}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {dropOpen && <div className="sc-overlay" onClick={() => setDropOpen(false)}/>}

    </div>
  );
}
