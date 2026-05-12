import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../utils/api';
import { Sparkles, ArrowRight } from 'lucide-react';

/*
 * BpgNexusShowcase
 * -----------------
 * Sales banner shown INSIDE the Credit Nexus page (/credit-nexus).
 *
 * Strategic intent (Steve, 12 May 2026 evening):
 *   Brand Poster Generator is the strongest sales attractor for Nexus
 *   packs. Most affiliate platforms have to argue "buy this pack
 *   because you'll earn commissions" — abstract. We can say "buy a
 *   Nexus pack and unlock the AI poster generator that makes branded
 *   marketing assets in 60 seconds." Concrete, visceral, immediately
 *   valuable.
 *
 * This component sits between the ProductExplainer and the pack grid
 * on /credit-nexus. Members see what they unlock BEFORE they see the
 * pricing, which is the right emotional order for a buying decision.
 *
 * For Nexus pack owners (member already has access), this component
 * still shows but with a "Continue to your gallery" CTA instead of
 * "Activate a pack to unlock". Useful for members who got the feature
 * via gifted access — they still see the showcase as confirmation.
 */
export default function BpgNexusShowcase() {
  var [templates, setTemplates] = useState([]);
  var [hasAccess, setHasAccess] = useState(false);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    // Fetch templates AND access status in parallel for speed
    Promise.all([
      apiGet('/api/posters/templates'),
      apiGet('/api/posters/access-check'),
    ]).then(function(results) {
      var templatesData = results[0];
      var accessData = results[1];

      if (templatesData && templatesData.templates) {
        // Only show templates that have a preview image — no point
        // including placeholder cards in the sales pitch
        var withPreviews = templatesData.templates.filter(function(t) {
          return t.preview_image_url;
        });
        setTemplates(withPreviews);
      }
      if (accessData && accessData.has_access) {
        setHasAccess(true);
      }
      setLoading(false);
    }).catch(function() {
      setLoading(false);
    });
  }, []);

  // Hide entirely if no templates have been seeded yet — better to
  // show nothing than show an empty "look at what you'll get!" pitch
  if (loading || templates.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
      borderRadius: 16,
      padding: '32px 28px',
      marginBottom: 24,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decorative glow */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 320,
        height: 320,
        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #fbbf24, #fde047)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(251, 191, 36, 0.4)',
          }}>
            <Sparkles size={26} color="#1e1b4b" />
          </div>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: '#fde047',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}>
              {hasAccess ? 'You have access' : 'Unlock with any Nexus pack'}
            </div>
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 22,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.2,
            }}>
              {hasAccess
                ? 'Brand Poster Generator — Ready when you are'
                : 'Activate a pack. Unlock the Brand Poster Generator.'}
            </div>
            <div style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              marginTop: 6,
              maxWidth: 580,
              lineHeight: 1.5,
            }}>
              {hasAccess
                ? 'Six AI poster templates with your referral link baked in. Pick a template, fill in a few words, get four candidate posters in 60 seconds.'
                : 'Make branded marketing posters in 60 seconds. Six AI templates. Your referral link baked in automatically. Free for Nexus pack owners.'}
            </div>
          </div>
        </div>

        <Link
          to="/brand-posters"
          style={{
            background: hasAccess
              ? 'linear-gradient(135deg, #10b981, #34d399)'
              : 'linear-gradient(135deg, #fbbf24, #fde047)',
            color: hasAccess ? '#fff' : '#1e1b4b',
            padding: '12px 22px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: hasAccess
              ? '0 6px 16px rgba(16, 185, 129, 0.4)'
              : '0 6px 16px rgba(251, 191, 36, 0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {hasAccess ? 'Go to gallery' : 'See examples'}
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Horizontal scrolling gallery of preview images.
          Touch-scrollable on mobile, scrollbar on desktop. */}
      <div style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 8,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.3) transparent',
        position: 'relative',
        zIndex: 1,
      }}>
        {templates.map(function(t) {
          return (
            <Link
              key={t.slug}
              to={'/brand-posters/template/' + t.slug}
              style={{
                flex: '0 0 auto',
                width: 180,
                borderRadius: 12,
                overflow: 'hidden',
                textDecoration: 'none',
                border: '2px solid rgba(255,255,255,0.1)',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
                background: '#0a1438',
              }}
              onMouseEnter={function(e) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.7)';
              }}
              onMouseLeave={function(e) {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <div style={{
                aspectRatio: '3/4',
                background: '#0a1438',
                overflow: 'hidden',
              }}>
                <img
                  src={t.preview_image_url}
                  alt={t.name}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
              <div style={{
                padding: '10px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(0, 0, 0, 0.4)',
              }}>
                {t.name}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom value pills */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginTop: 18,
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1,
      }}>
        {[
          { label: '60-second generation', icon: '⚡' },
          { label: '6 professional templates', icon: '🎨' },
          { label: 'Your referral link built in', icon: '🔗' },
          { label: 'Unlimited for pack owners', icon: '♾️' },
        ].map(function(pill, i) {
          return (
            <div key={i} style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>{pill.icon}</span>
              {pill.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
