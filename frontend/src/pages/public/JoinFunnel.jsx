import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { apiGet } from '../../utils/api';

export default function JoinFunnel() {
  var { username } = useParams();
  var [sponsor, setSponsor] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    if (!username) return;
    apiGet('/api/join/' + username)
      .then(function(d) { setSponsor(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [username]);

  var firstName = sponsor ? sponsor.first_name : username;
  var totalMembers = sponsor ? sponsor.total_members : null;

  return (
    <PublicLayout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px' }}>

        {/* Sponsor block */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          {!loading && sponsor && (
            <>
              {sponsor.avatar_url ? (
                <img src={sponsor.avatar_url} alt={firstName} style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(14,165,233,0.4)', marginBottom: 16, objectFit: 'cover' }}/>
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, marginBottom: 16, color: '#fff', fontFamily: "'Sora',sans-serif" }}>
                  {firstName[0].toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                <strong style={{ color: '#38bdf8' }}>{firstName}</strong> invited you to join
              </div>
            </>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 24, marginTop: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}/>
            <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>
              {totalMembers ? `${totalMembers.toLocaleString()} active members` : 'Now accepting new members'}
            </span>
          </div>

          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(32px,5vw,58px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px' }}>
            Join SuperAdPro.<br/>
            <span style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Start Earning Today.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Earn 50% commissions, build a grid income team, and access AI-powered marketing tools — all from one platform.
          </p>

          <Link to={`/register?ref=${username}`} style={{
            display: 'inline-block', padding: '18px 48px', borderRadius: 14,
            background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
            color: '#fff', fontWeight: 900, fontSize: 18, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(14,165,233,0.45)', fontFamily: "'Sora',sans-serif",
          }}>
            Create Free Account →
          </Link>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>No credit card required · Free to join</div>
        </div>

        {/* 3 income streams */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginBottom: 48 }}>
          {[
            { icon: '💰', title: '50% Membership Commission', desc: 'Earn $10–$17.50/month for every member you refer, as long as they stay active.' },
            { icon: '⚡', title: 'Grid Completion Bonuses', desc: 'Campaign grids pay $64–$3,200 when 64 positions fill. Teams make this happen fast.' },
            { icon: '🎓', title: 'Course Sales Pass-Up', desc: 'Sell courses and earn direct commissions with a powerful pass-up chain.' },
          ].map(function(s) {
            return (
              <div key={s.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Social proof */}
        <div style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 16, padding: '32px', textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚀</div>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, margin: '0 0 12px' }}>
            {firstName ? `${firstName} is building their team` : 'Join a growing network'}
          </h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.7 }}>
            When you register through this link, you join {firstName ? `${firstName}'s` : 'their'} network directly. Their success depends on helping you succeed.
          </p>
          <Link to={`/register?ref=${username}`} style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: "'Sora',sans-serif" }}>
            Join {firstName ? `${firstName}'s` : 'the'} Network →
          </Link>
        </div>

        {/* FAQ mini */}
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, marginBottom: 20, textAlign: 'center' }}>Quick answers</h3>
          {[
            ['Is it free to join?', 'Yes — creating an account is completely free. You activate membership ($20/mo Basic or $35/mo Pro) to start earning commissions.'],
            ['When do I get paid?', 'Commissions are credited instantly to your platform wallet. Withdraw anytime to your crypto wallet.'],
            ['Do I need to recruit to earn?', 'No. You can earn from campaign grid completions driven by your whole team\'s activity, not just people you personally referred.'],
          ].map(function([q, a]) {
            return (
              <div key={q} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{q}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{a}</div>
              </div>
            );
          })}
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link to={`/register?ref=${username}`} style={{ display: 'inline-block', padding: '16px 48px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', fontFamily: "'Sora',sans-serif", boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}>
            Create Free Account →
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
