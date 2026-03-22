import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';

export default function HowItWorks() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Platform Overview</div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, margin: '0 0 20px' }}>How SuperAdPro Works</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
            A video advertising platform where members earn commissions by building teams and participating in campaign grids.
          </p>
        </div>

        {/* Step by step */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, marginBottom: 32 }}>The journey</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Register for free', desc: 'Create your account in under 60 seconds. You get an affiliate link immediately — no payment needed to join.', color: '#38bdf8' },
              { n: '02', title: 'Activate membership', desc: 'Choose Basic ($20/mo) or Pro ($35/mo). This activates your earning ability and commissions start flowing when you refer others.', color: '#818cf8' },
              { n: '03', title: 'Share your link', desc: 'Every member gets a personalised join page at superadpro.com/join/yourusername — share it everywhere.', color: '#10b981' },
              { n: '04', title: 'Build your team', desc: 'When someone joins through your link, they\'re in your network. You earn 50% of their membership fee every month.', color: '#f59e0b' },
              { n: '05', title: 'Join campaign grids', desc: 'Each campaign tier has an 8×8 grid of 64 positions. Your team\'s activity fills positions and triggers completion bonuses.', color: '#ef4444' },
              { n: '06', title: 'Earn uni-level commissions', desc: 'Earn 6.25% across 8 levels of your network on all grid purchases — your team\'s activity earns you income automatically.', color: '#38bdf8' },
            ].map(function(s, i) {
              return (
                <div key={s.n} style={{ display: 'flex', gap: 24, paddingBottom: 36, borderLeft: i < 5 ? '2px dashed rgba(255,255,255,0.08)' : 'none', marginLeft: 21, paddingLeft: 36, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -22, top: 0, width: 44, height: 44, borderRadius: '50%', background: '#050d1a', border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: s.color, fontFamily: "'Sora',sans-serif" }}>
                    {s.n}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{s.title}</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560 }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commission breakdown */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>How commissions are split</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 32 }}>Every purchase on the platform distributes income across the network automatically.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {[
              { pct: '40%', label: 'Direct Sponsor', desc: 'The person who referred the buyer', color: '#38bdf8' },
              { pct: '50%', label: 'Uni-Level', desc: '8 levels deep at 6.25% each', color: '#818cf8' },
              { pct: '5%', label: 'Grid Pool', desc: 'Grid completion bonus pool', color: '#10b981' },
              { pct: '5%', label: 'Platform', desc: 'Running & development costs', color: '#f59e0b' },
            ].map(function(c) {
              return (
                <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}25`, borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: c.color, fontFamily: "'Sora',sans-serif", marginBottom: 6 }}>{c.pct}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crypto payments */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Payments &amp; withdrawals</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 32 }}>SuperAdPro uses stablecoins on Polygon — fast, secure, and costs less than 1 cent per transaction.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { icon: '🦊', title: 'Free wallet setup', desc: 'Create a MetaMask wallet in 5 minutes. Works worldwide, no bank needed.', color: '#38bdf8' },
              { icon: '💵', title: 'Pay in USDT or USDC', desc: 'Digital dollars on Polygon. Always worth $1. No currency conversion.', color: '#10b981' },
              { icon: '⚡', title: 'Instant commissions', desc: 'Earnings credit instantly when referrals pay. Withdraw USDT to your wallet anytime.', color: '#f59e0b' },
              { icon: '🔒', title: 'You control your money', desc: 'Self-custody wallet. No payment processor can freeze your funds.', color: '#818cf8' },
            ].map(function(c) {
              return (
                <div key={c.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center' }}>
            <a href="/wallet-guide" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(14,165,233,.3)', color: '#38bdf8', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Full Wallet Setup Guide →
            </a>
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 20, padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>Ready to get started?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>Join free. No credit card required.</p>
          <Link to="/register" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: "'Sora',sans-serif" }}>
            Create Free Account →
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
