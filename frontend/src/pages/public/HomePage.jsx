import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';

var cyan = '#38bdf8';
var indigo = '#6366f1';

function HeroStat({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: cyan, fontFamily: "'Sora',sans-serif" }}>{value}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function IncomeCard({ tier, price, views, commission, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, borderRadius: 16, padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{tier}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: "'Sora',sans-serif", marginBottom: 4 }}>${price}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{views} views target</div>
      <div style={{ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color, fontWeight: 700 }}>
        ${commission} sponsor commission
      </div>
    </div>
  );
}

function StepCard({ number, title, desc }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, flexShrink: 0, fontFamily: "'Sora',sans-serif" }}>
        {number}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14,165,233,0.15) 0%, transparent 60%)' }}/>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 13, color: cyan, fontWeight: 700 }}>Now accepting founding members</span>
        </div>

        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 24px', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          Earn Recurring Income<br/>
          <span style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>While You Sleep</span>
        </h1>

        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 40px' }}>
          SuperAdPro members earn commissions from video advertising campaigns. Refer others, build your team, and let the grid generate income on autopilot.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <Link to="/register" style={{ padding: '16px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(14,165,233,0.4)', fontFamily: "'Sora',sans-serif" }}>
            Start Earning Free →
          </Link>
          <Link to="/how-it-works" style={{ padding: '16px 36px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            See How It Works
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 32, maxWidth: 600, margin: '0 auto', padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <HeroStat value="50%" label="Direct commission"/>
          <HeroStat value="8" label="Uni-level tiers"/>
          <HeroStat value="$3,200" label="Grid bonus potential"/>
          <HeroStat value="$0" label="To join"/>
        </div>
      </section>

      {/* ── 3 INCOME STREAMS ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Income Streams</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, margin: 0 }}>3 Ways to Earn</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
          {[
            { icon: '👥', title: 'Membership Commissions', color: cyan, desc: 'Earn 50% on every Basic or Pro membership you refer. $10 or $15 per month, every month they stay active — true recurring income.' },
            { icon: '⚡', title: 'Campaign Grid Bonuses', color: '#818cf8', desc: 'Join an 8×8 grid campaign. As 64 positions fill from team activity, you earn a completion bonus up to $3,200 — and grids can complete multiple times.' },
            { icon: '🎓', title: 'Course Pass-Up Sales', color: '#10b981', desc: 'Sell courses and earn direct commissions. Every 3rd sale passes up to your sponsor — building a powerful income chain through your network.' },
          ].map(function(s) {
            return (
              <div key={s.title} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}20`, borderRadius: 20, padding: 32 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: '#fff' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Get Started</div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 900, margin: '0 0 40px' }}>Up and running in minutes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <StepCard number="1" title="Create your free account" desc="Register in under 60 seconds. No credit card required. You're immediately set up with your own affiliate link."/>
              <StepCard number="2" title="Activate your membership" desc="Choose Basic ($20/mo) or Pro ($30/mo). Pro includes AI tools, SuperLeads CRM, and automated sales funnels."/>
              <StepCard number="3" title="Share and earn" desc="Share your link, build your team, and let the platform work for you. Your grid fills as your network grows."/>
            </div>
          </div>

          {/* Campaign tier preview */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Campaign Tiers</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <IncomeCard tier="Tier 1" price="20" views="500" commission="8" color={cyan}/>
              <IncomeCard tier="Tier 2" price="50" views="1,500" commission="20" color="#818cf8"/>
              <IncomeCard tier="Tier 3" price="100" views="3,000" commission="40" color="#10b981"/>
              <IncomeCard tier="Tier 4" price="200" views="7,500" commission="80" color="#f59e0b"/>
            </div>
            <Link to="/campaign-tiers" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: cyan, textDecoration: 'none', fontWeight: 600 }}>
              View all 8 tiers →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRO FEATURES ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#818cf8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Pro Tier</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900, margin: '0 0 16px' }}>Everything you need to scale</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Pro members get access to AI-powered tools that automate their marketing and supercharge earnings.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 36 }}>
            {['🤖 AI Co-Pilot', '📧 SuperLeads CRM', '🔥 SuperSeller AI', '🌐 SuperPages Builder', '📊 Lead Analytics', '✉️ Email Autoresponder'].map(function(f) {
              return (
                <div key={f} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                  {f}
                </div>
              );
            })}
          </div>
          <Link to="/register" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: "'Sora',sans-serif", boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
            Get Started with Pro
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '60px 24px' }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, margin: '0 0 16px' }}>
          Ready to build recurring income?
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 36 }}>
          Join free today. No credit card required.
        </p>
        <Link to="/register" style={{ display: 'inline-block', padding: '16px 48px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 17, textDecoration: 'none', boxShadow: '0 8px 32px rgba(14,165,233,0.4)', fontFamily: "'Sora',sans-serif" }}>
          Create Free Account →
        </Link>
      </section>
    </PublicLayout>
  );
}
