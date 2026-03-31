import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — How It Works
   Comprehensive page explaining the platform, tools, income,
   free tools, and membership pricing.
   ═══════════════════════════════════════════════════════════ */

function Section({ children, bg }) {
  return (
    <section style={{ padding: '80px 24px', background: bg || 'transparent' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

function SectionHeader({ tag, tagColor, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: tagColor || '#38bdf8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{tag}</div>
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.1 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>{subtitle}</p>}
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>{icon}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function VideoPlaceholder({ label, aspect, borderColor }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${borderColor || 'rgba(14,165,233,0.15)'}`, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', background: '#0a0e1a', aspectRatio: aspect || '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 6px 24px rgba(14,165,233,0.3)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="9,5 9,19 20,12" fill="#fff"/></svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{label || 'Video coming soon'}</div>
      </div>
    </div>
  );
}

function ToolMiniCard({ name, desc, color }) {
  return (
    <div style={{ background: `${color}08`, border: `1px solid ${color}15`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#fff' }}>{name}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
    </div>
  );
}

function IncomeCard({ title, amount, sub, desc, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderTop: `3px solid ${color}`, borderRadius: 16, padding: '28px 24px' }}>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 900, color, marginBottom: 4 }}>{amount}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{sub}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function FreeToolCard({ icon, title, desc, href }) {
  return (
    <Link to={href} style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', textAlign: 'center', display: 'block', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 14 }}>{desc}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#22d3ee' }}>Try it free →</div>
    </Link>
  );
}

export default function HowItWorks() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img src="/static/images/explore-bg2.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(3,7,18,0.8) 0%,rgba(3,7,18,0.7) 20%,rgba(3,7,18,0.85) 50%,rgba(3,7,18,0.95) 100%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* NAV */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', height: 72, background: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="10,4 10,20 21,12" fill="#fff"/></svg>
            </div>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900 }}>SuperAd<span style={{ color: '#38bdf8' }}>Pro</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link to="/explore" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Explore</Link>
            <Link to="/earn" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Earn</Link>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Sign In</Link>
            <Link to="/register" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Join Free</Link>
          </div>
        </nav>

        {/* ═══ HERO ═══ */}
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 99, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 28, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
              How It Works
            </div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(36px,6vw,56px)', fontWeight: 900, lineHeight: 0.95, marginBottom: 24, letterSpacing: -2 }}>
              Your Complete<br/><span style={{ color: '#38bdf8' }}>Business-in-a-Box</span>
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
              SuperAdPro combines AI creative tools, advertising, income opportunities, and marketing automation — everything you need to build and grow an online business.
            </p>

            {/* Hero video placeholder */}
            <div style={{ maxWidth: 640, margin: '0 auto 40px' }}>
              <VideoPlaceholder label="Watch the overview video" aspect="16/9" />
            </div>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" style={{ padding: '16px 44px', borderRadius: 14, fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, textDecoration: 'none', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', boxShadow: '0 4px 24px rgba(14,165,233,0.25)' }}>Get Started Free →</Link>
              <Link to="/earn" style={{ padding: '16px 44px', borderRadius: 14, fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.2)', color: '#fff', backdropFilter: 'blur(4px)' }}>See the Earnings Plan</Link>
            </div>
          </div>
        </section>

        {/* ═══ WHAT IS SUPERADPRO ═══ */}
        <Section>
          <SectionHeader tag="The Platform" title="What is SuperAdPro?" subtitle="SuperAdPro is an all-in-one platform that gives you the tools, the training, and the income opportunity to build a real online business — even if you're starting from zero." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            <FeatureCard icon="🎬" title="AI Creative Studio" desc="Generate videos, images, music, voiceovers, and captions using 10+ AI models. Create professional content in minutes." color="#0ea5e9" />
            <FeatureCard icon="💰" title="Multiple Income Streams" desc="Earn through affiliate commissions, the 8×8 income grid, course sales, and the SuperMarket. Four ways to make money." color="#fbbf24" />
            <FeatureCard icon="📢" title="Advertising Platform" desc="Promote your business with video campaigns watched by real, engaged members. Guaranteed views from motivated entrepreneurs." color="#10b981" />
          </div>
        </Section>

        {/* ═══ SUPERSCENE ═══ */}
        <Section bg="linear-gradient(180deg,transparent,rgba(14,165,233,0.03),transparent)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#22d3ee', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>SuperScene</div>
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 16 }}>AI Creative Studio</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 24 }}>
                Create professional videos, images, music, voiceovers, and more — all powered by the latest AI models from Kling, Sora, Seedance, and others.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['🎥', 'AI Video Generation', 'Text-to-video and image-to-video with 10+ models'],
                  ['🖼️', 'AI Image Generation', 'Create stunning visuals from text prompts'],
                  ['🎵', 'AI Music & Voiceover', 'Custom music tracks and professional narration'],
                  ['✂️', 'Editor & Captions', 'Trim, caption, and polish your content'],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</div>
                    <div><span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span> <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>— {desc}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <VideoPlaceholder label="SuperScene demo" borderColor="rgba(34,211,238,0.15)" />
          </div>
        </Section>

        {/* ═══ MARKETING TOOLS ═══ */}
        <Section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <VideoPlaceholder label="Marketing tools preview" borderColor="rgba(139,92,246,0.15)" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Marketing Suite</div>
              <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Everything You Need to Market</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 24 }}>
                From landing pages to email automation, SuperAdPro gives you professional marketing tools without the professional price tag.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ToolMiniCard name="SuperPages" desc="Drag-and-drop landing pages" color="#a78bfa" />
                <ToolMiniCard name="SuperSeller" desc="AI sales autopilot + chatbot" color="#a78bfa" />
                <ToolMiniCard name="LinkHub" desc="Your bio link page" color="#a78bfa" />
                <ToolMiniCard name="Email Autoresponder" desc="Automated follow-up sequences" color="#a78bfa" />
                <ToolMiniCard name="SuperLeads CRM" desc="Lead management + email blasts" color="#a78bfa" />
                <ToolMiniCard name="ProSeller AI" desc="AI content generation" color="#a78bfa" />
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ FOUR WAYS TO EARN ═══ */}
        <Section bg="linear-gradient(180deg,transparent,rgba(251,191,36,0.03),transparent)">
          <SectionHeader tag="Income" tagColor="#fbbf24" title="Four Ways to Earn" subtitle="Each income stream works independently. Together they compound into serious earnings." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            <IncomeCard title="Membership Commissions" amount="50%" sub="Recurring monthly" desc="$10 per Basic member, $17.50 per Pro member — every single month they stay active." color="#10b981" />
            <IncomeCard title="8×8 Income Grid" amount="$7,200+" sub="Per grid cycle" desc="Eight tiers from $20 to $1,000. Each grid has 64 positions that auto-renew when complete." color="#6366f1" />
            <IncomeCard title="Course Marketplace" amount="100%" sub="Commissions" desc="Keep every sale. Sales 2, 4, 6, 8 pass up to your sponsor — creating an infinite depth chain." color="#fbbf24" />
            <IncomeCard title="Watch & Earn" amount="Daily" sub="Commission qualification" desc="Watch campaign videos daily to keep your commissions active and your campaigns running." color="#0ea5e9" />
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/earn" style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#fbbf24', textDecoration: 'none', borderBottom: '2px solid #fbbf24', paddingBottom: 4 }}>See the full compensation plan →</Link>
          </div>
        </Section>

        {/* ═══ FREE TOOLS ═══ */}
        <Section>
          <SectionHeader tag="Free Tools" tagColor="#22d3ee" title="Try Before You Join" subtitle="Use our free tools right now — no signup, no credit card, no catch." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            <FreeToolCard icon="😂" title="Meme Generator" desc="100+ templates, custom fonts and colours, instant download." href="/free/meme-generator" />
            <FreeToolCard icon="📱" title="QR Code Generator" desc="URLs, WiFi, email, phone, SMS. Custom colours, PNG & SVG export." href="/free/qr-code-generator" />
            <FreeToolCard icon="🎨" title="Banner & Profile Creator" desc="YouTube, Instagram, Facebook, TikTok, LinkedIn, Pinterest — exact dimensions." href="/free/banner-creator" />
          </div>
        </Section>

        {/* ═══ MEMBERSHIP PRICING ═══ */}
        <Section bg="linear-gradient(180deg,transparent,rgba(14,165,233,0.03),transparent)">
          <SectionHeader tag="Membership" tagColor="#38bdf8" title="Simple, Affordable Pricing" subtitle="Two plans. No hidden fees. Cancel anytime." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800, margin: '0 auto' }}>
            {/* Basic */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 28px' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#38bdf8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Basic</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 40, fontWeight: 900 }}>$20</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>/month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {['Full affiliate commissions', '8×8 income grid access', 'Campaign video advertising', 'LinkHub bio page', 'Marketing suite tools', 'SuperScene credit packs'].map(f => (
                  <div key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>✓ {f}</div>
                ))}
              </div>
              <Link to="/register" style={{ display: 'block', textAlign: 'center', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Get Started</Link>
            </div>
            {/* Pro */}
            <div style={{ background: 'rgba(14,165,233,0.05)', border: '2px solid rgba(14,165,233,0.2)', borderRadius: 20, padding: '36px 28px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, right: 20, padding: '4px 16px', borderRadius: 20, background: '#0ea5e9', fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>RECOMMENDED</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#38bdf8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 40, fontWeight: 900 }}>$35</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>/month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>✓ Everything in Basic</div>
                {['SuperSeller AI autopilot', 'ProSeller AI content', 'SuperPages builder', 'SuperLeads CRM', 'Email autoresponder'].map(f => (
                  <div key={f} style={{ fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>+ {f}</div>
                ))}
              </div>
              <Link to="/register" style={{ display: 'block', textAlign: 'center', padding: 12, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 16px rgba(14,165,233,0.25)' }}>Get Pro</Link>
            </div>
          </div>
        </Section>

        {/* ═══ FINAL CTA ═══ */}
        <section style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(30px,5vw,42px)', fontWeight: 900, marginBottom: 16, lineHeight: 1 }}>
              Ready to start<br/><span style={{ color: '#38bdf8' }}>building?</span>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>Free to join. No credit card. Set up in 60 seconds.</p>
            <Link to="/register" style={{ display: 'inline-block', padding: '20px 56px', borderRadius: 14, fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, textDecoration: 'none', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', boxShadow: '0 4px 24px rgba(14,165,233,0.25)' }}>Create Your Free Account →</Link>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ textAlign: 'center', padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
            <Link to="/free/meme-generator" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Free Meme Generator</Link>
            <Link to="/free/qr-code-generator" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Free QR Code Generator</Link>
            <Link to="/free/banner-creator" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Free Banner Creator</Link>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', lineHeight: 1.7 }}>
            SuperAdPro · <Link to="/legal" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Terms</Link> · <Link to="/legal" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Privacy</Link> · <Link to="/support" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Support</Link>
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.1)', marginTop: 6 }}>Income figures represent the compensation plan structure. Results depend on individual effort.</p>
        </footer>
      </div>
    </div>
  );
}
