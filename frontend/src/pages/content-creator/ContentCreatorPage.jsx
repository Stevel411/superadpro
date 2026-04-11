import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../../components/layout/AppLayout";
import "./content-creator.css";

const TOOLS = [
  { key: "social",        label: "socialPosts",    icon: "📱" },
  { key: "video_scripts", label: "videoScripts",   icon: "🎬" },
  { key: "email",         label: "emailCopy",      icon: "📧" },
  { key: "ad_copy",       label: "adCopy",         icon: "📢" },
  { key: "niche",         label: "nicheFinder",    icon: "💡" },
  { key: "qr",            label: "qrCode",         icon: "📷" },
  { key: "chat",          label: "aiSalesChat",   icon: "💬" },
];

const PLATFORMS = [
  { key: "Facebook",  color: "#1877F2", svg: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>' },
  { key: "Instagram", color: "#E4405F", svg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>' },
  { key: "X",         color: "#000000", svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>' },
  { key: "TikTok",    color: "#000000", svg: '<path d="M448 209.9a210.1 210.1 0 01-122.8-39.3v178.8A162.6 162.6 0 11185 188.3v89.9a74.6 74.6 0 1052.2 71.2V0h88a121 121 0 00122.8 121v88.9z"/>', vb: "0 0 448 512" },
  { key: "YouTube",   color: "#FF0000", svg: '<path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6C14.9 167 14.9 256 14.9 256s0 89 11.4 131.9c6.3 23.7 24.8 42.3 48.3 48.6C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.9 48.3-48.6 11.4-42.9 11.4-131.9 11.4-131.9s0-89-11.4-131.9zM232.2 337.6V174.4L374.9 256l-142.7 81.6z"/>', vb: "0 0 576 512" },
  { key: "Telegram",  color: "#26A5E4", svg: '<path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z"/>', vb: "0 0 496 512" },
];

const TONES = ["Professional", "Casual", "Funny", "Bold", "Inspirational"];
const COUNTS = [1, 3, 5, 10];
const VIDEO_FORMATS = ["Short-form (30-60s)", "Long-form (2-5 min)", "YouTube Intro", "Ad Script (15-30s)", "Tutorial"];

const TOOL_CONFIG = {
  social:        { title: "Social Post Generator",   desc: "Create scroll-stopping posts tailored to each platform.", showPlatform: true, showTone: true, showCount: true, placeholder: "What product, service, or opportunity are you promoting?" },
  video_scripts: { title: "Video Script Generator",  desc: "Write compelling scripts for any video format.", showTone: true, showFormat: true, placeholder: "What is the video about? What message do you want to deliver?" },
  email:         { title: "Email Copy Generator",     desc: "Write high-converting email sequences and swipes.", showTone: true, showCount: true, placeholder: "What product or opportunity are you emailing about?" },
  ad_copy:       { title: "Ad Copy Generator",        desc: "Create compelling ad headlines, copy, and CTAs.", showTone: true, showCount: true, placeholder: "What are you advertising? Who is your target audience?" },
  niche:         { title: "Niche Finder",             desc: "Research profitable niches with audience insights and monetisation strategies.", placeholder: "Enter a niche, topic, or industry to analyse..." },
  qr:            { title: "QR Code Generator",        desc: "Generate QR codes for your referral links and landing pages.", isQR: true, placeholder: "Enter the URL for your QR code..." },
  chat:          { title: "AI Sales Chat",            desc: "Your AI sales assistant for pitches, objections, and closing.", isChat: true },
};

export default function ContentCreatorPage() {
  const { t } = useTranslation();
  const [tool, setTool] = useState("social");
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("Facebook");
  const [tone, setTone] = useState("Professional");
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState("Short-form (30-60s)");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const config = TOOL_CONFIG[tool];

  const generate = async () => {
    if (tool === "qr") { if (!prompt.trim()) return; setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(prompt)}`); return; }
    if (!prompt.trim() || generating) return;
    setGenerating(true); setOutput("");
    try {
      const res = await fetch("/api/content-creator/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool, prompt, platform, tone, count, format }) });
      const data = await res.json();
      if (data.success && data.content) setOutput(data.content);
      else setOutput("Error: " + (data.detail || data.error || "Generation failed"));
    } catch { setOutput("Error: Network error."); }
    setGenerating(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/proseller/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, history: chatMessages }) });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response || "Sorry, something went wrong." }]);
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Network error." }]); }
    setChatLoading(false);
  };

  const switchTool = (key) => { setTool(key); setOutput(""); setQrUrl(""); };

  return (
    <AppLayout title={t("contentCreator.title")}>
    <div className="cc-root">
      <div className="cc-header">
        <div className="cc-header-inner">
          <div><div className="cc-subtitle">{t("contentCreator.subtitle")}</div></div>
        </div>
      </div>
      <div className="cc-tools">
        {TOOLS.map(tl => (
          <div key={tl.key} className={`cc-tool-card ${tool === tl.key ? "active" : ""}`} onClick={() => switchTool(tl.key)}>
            <div className="cc-tool-icon">{tl.icon}</div>
            <div className="cc-tool-label">{t(`contentCreator.${tl.label}`)}</div>
          </div>
        ))}
      </div>

      {tool === "chat" ? (
        <div className="cc-chat-workspace">
          <div className="cc-chat-container">
            <div className="cc-chat-messages">
              {chatMessages.length === 0 && (
                <div className="cc-chat-welcome">
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                  <div className="cc-chat-welcome-title">{t("contentCreator.aiAssistant")}</div>
                  <div className="cc-chat-welcome-sub">{t("contentCreator.aiAssistantDesc")}</div>
                  <div className="cc-chat-suggestions">
                    {[t("contentCreator.suggestion1"), t("contentCreator.suggestion2"), t("contentCreator.suggestion3"), t("contentCreator.suggestion4")].map((s, i) => (
                      <button key={i} className="cc-chat-suggestion" onClick={() => setChatInput(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`cc-chat-msg ${m.role}`}>
                  <div className={`cc-chat-bubble ${m.role}`}>
                    <pre className="cc-chat-msg-text">{m.content}</pre>
                    {m.role === "assistant" && <button className="cc-chat-copy" onClick={() => { navigator.clipboard.writeText(m.content); }}>📋</button>}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="cc-chat-msg assistant"><div className="cc-chat-bubble assistant"><div className="cc-chat-typing">{t("contentCreator.thinking")}</div></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="cc-chat-input-bar">
              <input className="cc-chat-input" placeholder={t("contentCreator.chatPlaceholder")} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} disabled={chatLoading} />
              <button className="cc-chat-send" onClick={sendChat} disabled={!chatInput.trim() || chatLoading}>{t("contentCreator.send")}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="cc-workspace">
          <div className="cc-panel-left">
            <div className="cc-tool-title">{t("contentCreator." + tool + "Title")}</div>
            <div className="cc-tool-desc">{t("contentCreator." + (tool === "video_scripts" ? "video" : tool === "ad_copy" ? "ad" : tool) + "Desc")}</div>
            {config.showPlatform && (<div className="cc-section"><div className="cc-label">{t("contentCreator.platform")}</div><div className="cc-platform-grid">{PLATFORMS.map(p => (<div key={p.key} className={`cc-platform-pill ${platform === p.key ? "on" : ""}`} style={platform === p.key ? { borderColor: p.color, background: `${p.color}10` } : {}} onClick={() => setPlatform(p.key)}><svg width="16" height="16" viewBox={p.vb || "0 0 24 24"} fill={platform === p.key ? p.color : "#94a3b8"} dangerouslySetInnerHTML={{ __html: p.svg }} /><span className="cc-plat-name" style={platform === p.key ? { color: p.color } : {}}>{p.key}</span></div>))}</div></div>)}
            <div className="cc-section"><div className="cc-label">{tool === "qr" ? t("contentCreator.url") : t("contentCreator.describeTopic")}</div><textarea className="cc-textarea" rows={tool === "niche" ? 3 : 5} placeholder={config.placeholder} value={prompt} onChange={e => setPrompt(e.target.value)} /></div>
            {config.showTone && (<div className="cc-section"><div className="cc-label">{t("contentCreator.tone")}</div><div className="cc-pills">{TONES.map(t => (<button key={t} className={`cc-pill ${tone === t ? "on" : ""}`} onClick={() => setTone(t)}>{t}</button>))}</div></div>)}
            {config.showFormat && (<div className="cc-section"><div className="cc-label">{t("contentCreator.format")}</div><div className="cc-pills">{VIDEO_FORMATS.map(f => (<button key={f} className={`cc-pill ${format === f ? "on" : ""}`} onClick={() => setFormat(f)}>{f}</button>))}</div></div>)}
            {config.showCount && (<div className="cc-section"><div className="cc-label">{t("contentCreator.numberToGenerate")}</div><div className="cc-pills">{COUNTS.map(c => (<button key={c} className={`cc-pill ${count === c ? "on" : ""}`} onClick={() => setCount(c)}>{c}</button>))}</div></div>)}
            <div className="cc-section" style={{ marginTop: 24 }}><button className="cc-gen-btn" onClick={generate} disabled={!prompt.trim() || generating}>{generating ? t("contentCreator.generating") : !prompt.trim() ? t("contentCreator.enterTopic") : tool === "qr" ? t("contentCreator.generateQR") : t("contentCreator.generateContent")}</button></div>
          </div>
          <div className="cc-panel-right">
            <div className="cc-output-label">{t("contentCreator.generatedContent")}</div>
            <div className="cc-output-box">
              {generating ? (<div className="cc-generating"><div><div className="cc-gen-spinner" /><div className="cc-gen-text">{t("contentCreator.generating")}</div></div></div>
              ) : output ? (<><div className="cc-output-content"><pre>{output}</pre></div><div className="cc-output-actions"><button className="cc-action-btn" onClick={() => { navigator.clipboard.writeText(output); alert(t("contentCreator.copied")); }}>{t("contentCreator.copyAll")}</button><button className="cc-action-btn" onClick={() => setOutput("")}>{t("contentCreator.clear")}</button><button className="cc-action-btn primary" onClick={generate}>{t("contentCreator.regenerate")}</button></div></>
              ) : tool === "qr" && qrUrl ? (<div className="cc-output-empty"><div className="cc-output-empty-inner"><img src={qrUrl} alt="QR" style={{ width: 250, height: 250, borderRadius: 12 }} /><div style={{ marginTop: 16 }}><a href={qrUrl} download="superadpro-qr.png" className="cc-action-btn" style={{ textDecoration: "none", display: "inline-block" }}>{t("contentCreator.downloadQR")}</a></div></div></div>
              ) : (<div className="cc-output-empty"><div className="cc-output-empty-inner"><div className="cc-output-icon">✦</div><div className="cc-output-title">{t("contentCreator.contentHere")}</div><div className="cc-output-sub">{t("contentCreator.contentHereDesc")}</div></div></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
}
