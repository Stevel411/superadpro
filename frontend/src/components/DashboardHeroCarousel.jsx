import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, Gift, Layers, Rocket, TrendingUp } from 'lucide-react';

/*
 * DashboardHeroCarousel
 * ----------------------
 * A 60-second auto-rotating hero banner shown at the top of the Dashboard.
 *
 * Design intent (per Steve, 12 May 2026):
 *   The Dashboard top banner is a rotating display board for SuperAdPro's
 *   products and income streams. It treats the Dashboard as a storefront
 *   rather than a stats screen — members log in and immediately see
 *   what they can earn from and what they can buy.
 *
 * V1 (Friday launch): 3 hardcoded slides, no admin tool, no analytics.
 *   - Slide 1: Credit Nexus packs (headline — highest revenue lever)
 *   - Slide 2: Brand Poster Generator (new feature, drives BPG demand
 *              which in turn drives Nexus pack purchases)
 *   - Slide 3: Pay It Forward (generosity-led recruiting)
 *
 * V2 (Week 2): full Revenue Dashboard rebuild — admin-managed slides,
 *   slide click analytics, income stream cards, scheduled rotations.
 *
 * UX behaviour:
 *   - Auto-rotates every 60 seconds (member-respectful, not flashy)
 *   - Pauses on hover so members aren't fighting the carousel
 *   - Manual prev/next arrows always visible
 *   - Dot indicators at the bottom for jumping to a specific slide
 *   - Mobile: swipeable with horizontal touch gestures
 *   - Each slide is a clickable link to the relevant feature
 */

var SLIDES = [
  {
    key: 'nexus',
    title: 'Creator Credits',
    eyebrow: 'EARN COMMISSIONS',
    headline: 'Earn 20% on every credit pack your referrals buy.',
    body: 'Power your AI tools with Creator Credits — packs from $20 to $1,000. Refer anyone and earn a flat 20% on every pack they buy, first one and every one after.',
    cta: 'See Creator Credits',
    href: '/my-credits',
    accent: '#0ea5e9',
    accentLight: '#38bdf8',
    bgFrom: '#0a1438',
    bgTo: '#172554',
    icon: 'layers',
  },
  {
    key: 'membership',
    title: 'SuperAdPro Membership',
    eyebrow: 'BECOME A PARTNER',
    headline: 'The full marketing toolkit — $20/month.',
    body: 'One simple plan: $20/month unlocks the entire SuperAdPro platform — Creative Studio, the Brand Poster Generator, MyLeads CRM, the affiliate platform, AI-powered tools, the lot. Run your business, and share in the upside when you grow your team. Cancel anytime.',
    cta: 'Become a Partner',
    href: '/upgrade',
    accent: '#2563eb',
    accentLight: '#60a5fa',
    bgFrom: '#0f172a',
    bgTo: '#1e3a8a',
    icon: 'rocket',
  },
  {
    key: 'grid',
    title: 'Profit Grid',
    eyebrow: '100% TO AFFILIATES',
    headline: 'Activate a campaign tier. Build your 6×6 grid.',
    body: 'Each Profit Grid pays out as your network fills the positions below you. Tiers from $20 to $1,000. 100% of every Profit Grid commission goes to affiliates — we don\'t take a cent.',
    cta: 'See campaign tiers',
    href: '/campaign-tiers',
    accent: '#10b981',
    accentLight: '#34d399',
    bgFrom: '#022c22',
    bgTo: '#065f46',
    icon: 'trendingUp',
  },
  {
    key: 'bpg',
    title: 'Brand Poster Generator',
    eyebrow: 'NEW IN CREATIVE STUDIO',
    headline: 'Make branded marketing posters in 60 seconds.',
    body: 'Pick a template, fill in a few words, upload your photo — AI does the rest. Six professional poster styles, all branded SuperAdPro and ready to post. Your referral link is baked into every poster automatically.',
    cta: 'Generate your first poster',
    href: '/brand-posters',
    accent: '#fbbf24',
    accentLight: '#fde047',
    bgFrom: '#1e1b4b',
    bgTo: '#3730a3',
    icon: 'sparkles',
  },
  {
    key: 'pif',
    title: 'Pay It Forward',
    eyebrow: 'RECRUIT THROUGH GENEROSITY',
    headline: 'Gift a free membership. Change a life.',
    body: 'Every member can gift a $20 membership to someone who needs it. When they earn, they\'re invited to pay it forward. Build your team through kindness.',
    cta: 'Gift a membership',
    href: '/pay-it-forward',
    accent: '#ec4899',
    accentLight: '#f9a8d4',
    bgFrom: '#831843',
    bgTo: '#be185d',
    icon: 'gift',
  },
];

var ROTATION_MS = 60000;

function SlideIcon({ name }) {
  var size = 36;
  if (name === 'sparkles') return <Sparkles size={size} />;
  if (name === 'gift') return <Gift size={size} />;
  if (name === 'rocket') return <Rocket size={size} />;
  if (name === 'trendingUp') return <TrendingUp size={size} />;
  return <Layers size={size} />;
}

export default function DashboardHeroCarousel() {
  var [activeIndex, setActiveIndex] = useState(0);
  var [paused, setPaused] = useState(false);
  var touchStartX = useRef(null);
  var rotationRef = useRef(null);

  // Auto-rotation effect — pauses when hovered
  useEffect(function() {
    if (paused) return;
    rotationRef.current = setInterval(function() {
      setActiveIndex(function(prev) { return (prev + 1) % SLIDES.length; });
    }, ROTATION_MS);
    return function() { clearInterval(rotationRef.current); };
  }, [paused]);

  function goToSlide(i) {
    setActiveIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }

  function nextSlide() { goToSlide(activeIndex + 1); }
  function prevSlide() { goToSlide(activeIndex - 1); }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    var delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) nextSlide(); else prevSlide();
    }
    touchStartX.current = null;
  }

  var slide = SLIDES[activeIndex];

  return (
    <div
      onMouseEnter={function() { setPaused(true); }}
      onMouseLeave={function() { setPaused(false); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        background: 'linear-gradient(135deg, ' + slide.bgFrom + ' 0%, ' + slide.bgTo + ' 100%)',
        transition: 'background 0.6s ease',
        minHeight: 240,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      }}>

      {/* Decorative glow accent in top-right */}
      <div style={{
        position: 'absolute',
        top: -80,
        right: -80,
        width: 280,
        height: 280,
        borderRadius: '50%',
        background: 'radial-gradient(circle, ' + slide.accent + '40 0%, transparent 70%)',
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }}/>

      {/* Main slide content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        minHeight: 240,
        flexWrap: 'wrap',
      }}>
        {/* Icon column */}
        <div style={{
          flexShrink: 0,
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'linear-gradient(135deg, ' + slide.accent + ' 0%, ' + slide.accentLight + ' 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 8px 24px ' + slide.accent + '60',
          transition: 'background 0.6s ease',
        }}>
          <SlideIcon name={slide.icon} />
        </div>

        {/* Text column */}
        <div style={{ flex: 1, minWidth: 280, color: 'white' }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            color: slide.accentLight,
            marginBottom: 8,
            transition: 'color 0.6s ease',
          }}>{slide.eyebrow}</div>

          <div style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 10,
          }}>{slide.headline}</div>

          <div style={{
            fontSize: 14,
            opacity: 0.85,
            lineHeight: 1.5,
            marginBottom: 16,
            maxWidth: 520,
          }}>{slide.body}</div>

          <Link to={slide.href} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: slide.accent,
            color: 'white',
            padding: '10px 20px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 4px 12px ' + slide.accent + '60',
            transition: 'background 0.2s, transform 0.2s',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={function(e) { e.currentTarget.style.transform = ''; }}>
            {slide.cta} →
          </Link>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button onClick={prevSlide} aria-label="Previous slide" style={arrowStyle('left')}>
        <ChevronLeft size={20} color="white" />
      </button>
      <button onClick={nextSlide} aria-label="Next slide" style={arrowStyle('right')}>
        <ChevronRight size={20} color="white" />
      </button>

      {/* Dot indicators */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        zIndex: 3,
      }}>
        {SLIDES.map(function(s, i) {
          var active = i === activeIndex;
          return (
            <button
              key={s.key}
              onClick={function() { goToSlide(i); }}
              aria-label={'Go to slide ' + (i + 1)}
              style={{
                width: active ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: active ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function arrowStyle(side) {
  return {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [side]: 12,
    background: 'rgba(0,0,0,0.3)',
    border: 'none',
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 3,
    transition: 'background 0.2s',
  };
}
