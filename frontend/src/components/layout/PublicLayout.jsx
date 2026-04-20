import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import DisclaimerLink from '../DisclaimerLink';

export default function PublicLayout({ children }) {

  var { t } = useTranslation();
  var [menuOpen, setMenuOpen] = useState(false);
  var navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', fontFamily: "'DM Sans', sans-serif", color: '#fff' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5,13,26,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>S</span>
            </div>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900 }}>
              SuperAd<span style={{ color: '#38bdf8' }}>{t('common.pro')}</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
            {[
              ['How It Works', '/how-it-works'],
              ['For Advertisers', '/for-advertisers'],
              ['FAQ', '/faq'],
            ].map(function([label, path]) {
              return (
                <Link key={path} to={path} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'color .15s' }}
                  onMouseEnter={function(e){e.target.style.color='#fff';}}
                  onMouseLeave={function(e){e.target.style.color='rgba(255,255,255,0.65)';}}>
                  {label}
                </Link>
              );
            })}
            <a href="/explore" style={{ padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'color .15s' }}>{t('nav.explore')}</a>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/login" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', transition: 'all .15s' }}
              onMouseEnter={function(e){e.currentTarget.style.borderColor='rgba(255,255,255,0.25)';e.currentTarget.style.color='#fff';}}
              onMouseLeave={function(e){e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.color='rgba(255,255,255,0.7)';}}>
              Sign In
            </Link>
            <Link to="/register" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', boxShadow: '0 4px 12px rgba(14,165,233,0.35)' }}>
              Join Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main>{children}</main>

      <DisclaimerLink />

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px', marginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>

            {/* Brand */}
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                SuperAd<span style={{ color: '#38bdf8' }}>{t('common.pro')}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 200 }}>
                Earn while you advertise. Build recurring income through our affiliate network.
              </p>
            </div>

            {/* Platform */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{t('nav.platformFooter')}</div>
              {[['How It Works', '/how-it-works'], ['For Advertisers', '/for-advertisers'], ['Compensation Plan', '/compensation-plan'], ['Campaign Tiers', '/campaign-tiers']].map(function([l,h]){
                return <Link key={h} to={h} style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}
                  onMouseEnter={function(e){e.target.style.color='#fff';}} onMouseLeave={function(e){e.target.style.color='rgba(255,255,255,0.5)';}}>{l}</Link>;
              })}
              <a href="/explore" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}>{t('nav.explore')}</a>
            </div>

            {/* Account */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{t('nav.accountNav')}</div>
              {[['Sign In', '/login'], ['Create Account', '/register'], ['FAQ', '/faq'], ['Support', '/support']].map(function([l,h]){
                return <Link key={h} to={h} style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}
                  onMouseEnter={function(e){e.target.style.color='#fff';}} onMouseLeave={function(e){e.target.style.color='rgba(255,255,255,0.5)';}}>{l}</Link>;
              })}
            </div>

            {/* Legal */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{t('nav.legalNav')}</div>
              {[['Terms of Service', '/legal'], ['Privacy Policy', '/legal'], ['Earnings Disclaimer', '/legal']].map(function([l,h]){
                return <Link key={h} to={h} style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}
                  onMouseEnter={function(e){e.target.style.color='#fff';}} onMouseLeave={function(e){e.target.style.color='rgba(255,255,255,0.5)';}}>{l}</Link>;
              })}
            </div>

            {/* Free Tools */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{t('nav.freeTools')}</div>
              {[['Meme Generator', '/free/meme-generator'], ['QR Code Generator', '/free/qr-code-generator'], ['Banner & Profile Creator', '/free/banner-creator']].map(function([l,h]){
                return <Link key={h} to={h} style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}
                  onMouseEnter={function(e){e.target.style.color='#fff';}} onMouseLeave={function(e){e.target.style.color='rgba(255,255,255,0.5)';}}>{l}</Link>;
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              © 2026 SuperAdPro. All rights reserved.
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0, maxWidth: 500, textAlign: 'right' }}>
              Income examples are illustrative. Results depend on individual effort and market conditions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
