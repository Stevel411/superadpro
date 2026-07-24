import React from 'react';
if (typeof window !== 'undefined') { window.__SAP_BUILD__ = '2026-06-01a'; }
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';
import AppLayout from './components/layout/AppLayout';
import './i18n';
import { Component, Suspense } from 'react';

// ── Direct imports (truly hot pages — Dashboard is post-login landing,
// Wallet + Account are most-visited internal pages, kept eager so they
// feel instant. Everything else is lazy-loaded to keep main bundle small.) ──
import Dashboard from './pages/Dashboard';
import NewDashboard from './pages/NewDashboard';
import AIToolsHub from './pages/AIToolsHub';
import TeamPage from './pages/TeamPage';
import Wallet from './pages/Wallet';
import Account from './pages/Account';

// ── Lazy imports — every non-hot page splits into its own chunk.
// Result: visitors only download code for pages they actually visit.
// Saves ~1MB+ from initial bundle. ──
const Wisdom = React.lazy(() => import('./pages/Wisdom'));
const CommandCentre = React.lazy(() => import('./pages/CommandCentre'));
const BucketList = React.lazy(() => import('./pages/BucketList'));
const MyTeam = React.lazy(() => import('./pages/MyTeam'));
const OnboardingWizard = React.lazy(() => import('./pages/OnboardingWizard'));
const AnalyticsPage = React.lazy(() => import('./pages/Analytics'));
const CreateCampaign = React.lazy(() => import('./pages/CreateCampaign'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const SharePage = React.lazy(() => import('./pages/SharePage'));
const AdminAL = React.lazy(() => import('./pages/AdminAL'));
const Affiliate = React.lazy(() => import('./pages/Affiliate'));
const MyMarketing = React.lazy(() => import('./pages/MyMarketing'));
const EmailSwipes = React.lazy(() => import('./pages/EmailSwipes'));
const LeadMagnets = React.lazy(() => import('./pages/LeadMagnets'));
const MarketingMaterials = React.lazy(() => import('./pages/MarketingMaterials'));
const LeadMagnetDetail = React.lazy(() => import('./pages/LeadMagnetDetail'));
const LeadFinder = React.lazy(() => import('./pages/LeadFinder'));
const Watch = React.lazy(() => import('./pages/Watch'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Support = React.lazy(() => import('./pages/Support'));
const VideoLibrary = React.lazy(() => import('./pages/VideoLibrary'));
const Videos = React.lazy(() => import('./pages/Videos'));
const VideoDetail = React.lazy(() => import('./pages/VideoDetail'));
const AdminVideos = React.lazy(() => import('./pages/AdminVideos'));
const LabsPageBuilder = React.lazy(() => import('./pages/LabsPageBuilder'));
const CustomDomain = React.lazy(() => import('./pages/CustomDomain'));
const HelpCustomDomain = React.lazy(() => import('./pages/HelpCustomDomain'));
const SendingDomains = React.lazy(() => import('./pages/SendingDomains'));
const HelpSendingDomain = React.lazy(() => import('./pages/HelpSendingDomain'));
const LabsSuperPagesEditor = React.lazy(() => import('./pages/labs-superpages/SuperPagesEditor'));
const LabsTemplatesPreview = React.lazy(() => import('./pages/labs-superpages/LabsTemplatesPreview'));
const LabsSandboxList = React.lazy(() => import('./pages/labs-superpages/LabsSandboxList'));
const UpgradeCheckout = React.lazy(() => import('./pages/UpgradeCheckout'));
const IncomeDisclaimer = React.lazy(() => import('./pages/IncomeDisclaimer'));
const AiTool = React.lazy(() => import('./pages/AiTool'));
const ToolsPage = React.lazy(() => import('./pages/ToolsPage'));
const LearnPage = React.lazy(() => import('./pages/LearnPage'));
const EducationPage = React.lazy(() => import('./pages/EducationPage'));
const AssetsPage = React.lazy(() => import('./pages/AssetsPage'));
const MyLeads = React.lazy(() => import('./pages/MyLeads'));
const LinkTools = React.lazy(() => import('./pages/LinkTools'));
const PaymentSuccess = React.lazy(() => import('./pages/PaymentSuccess'));
const ProSeller = React.lazy(() => import('./pages/ProSeller'));
const MySite = React.lazy(() => import('./pages/MySite'));
const BlogEditor = React.lazy(() => import('./pages/BlogEditor'));
const BlogDomain = React.lazy(() => import('./pages/BlogDomain'));
const AdminNetworkTree = React.lazy(() => import('./pages/AdminNetworkTree'));
const AdminRotatorState = React.lazy(() => import('./pages/admin/AdminRotatorState'));
const AdminEmailBroadcast = React.lazy(() => import('./pages/AdminEmailBroadcast'));
const AdminStories = React.lazy(() => import('./pages/AdminStories'));
const AdminShowcase = React.lazy(() => import('./pages/AdminShowcase'));
const AdminOrphans = React.lazy(() => import('./pages/AdminOrphans'));
const Funnels = React.lazy(() => import('./pages/Funnels'));
const LinkHubPage = React.lazy(() => import('./pages/LinkHub'));
const GiftLanding = React.lazy(() => import('./pages/GiftLanding'));
const TeamGiftAccept = React.lazy(() => import('./pages/TeamGiftAccept'));
const TrainingCentre = React.lazy(() => import('./pages/TrainingCentre'));
const CryptoGuide = React.lazy(() => import('./pages/CryptoGuide'));
const PlatformTour = React.lazy(() => import('./pages/PlatformTour'));
const SuperLinkPage = React.lazy(() => import('./pages/SuperLink'));
const ReferralVideo = React.lazy(() => import('./pages/ReferralVideo'));

// AdvantageLife compensation plan — internal, logged-in only. The backend route
// @app.get("/compensation-plan") already serves the SPA shell behind
// get_current_user, so this needs no new server route. (24 Jul 2026)
const CompensationPlan = React.lazy(() => import('./pages/CompensationPlan'));

// Brand Poster Generator (May 2026)
const BrandPostersGallery = React.lazy(() => import('./pages/brand-posters/BrandPostersGallery'));
const BrandPosterForm = React.lazy(() => import('./pages/brand-posters/BrandPosterForm'));
const BrandPosterResult = React.lazy(() => import('./pages/brand-posters/BrandPosterResult'));
const BrandPosterHistory = React.lazy(() => import('./pages/brand-posters/BrandPosterHistory'));

// ── Heavy/rare pages (already lazy from before) ──
const SuperPagesEditor = React.lazy(() => import('./pages/superpages/SuperPagesEditor'));
const CampaignAnalytics = React.lazy(() => import('./pages/CampaignAnalytics'));
const StudioShell = React.lazy(() => import('./pages/studio/StudioShell'));

// ── Background-preload all lazy chunks after first paint ──────────────────
// Without this, every route navigation triggers a fresh network fetch for
// that page's chunk, showing a spinner each time. With this, the chunks load
// silently in the background once the user is on the dashboard, so subsequent
// navigations resolve Suspense instantly. Staggered to avoid network thrash;
const PRELOAD_IMPORTS = [
  () => import('./pages/CommandCentre'),
  () => import('./pages/BucketList'),
  () => import('./pages/Analytics'),
  () => import('./pages/CreateCampaign'),
  () => import('./pages/Leaderboard'),
  () => import('./pages/Affiliate'),
  () => import('./pages/LeadFinder'),
  () => import('./pages/Watch'),
  () => import('./pages/Support'),
  () => import('./pages/VideoLibrary'),
  () => import('./pages/UpgradeCheckout'),
  () => import('./pages/IncomeDisclaimer'),
  () => import('./pages/AiTool'),
  () => import('./pages/ToolsPage'),
  () => import('./pages/LearnPage'),
  () => import('./pages/EducationPage'),
  () => import('./pages/AssetsPage'),
  () => import('./pages/CommunityPage'),
  () => import('./pages/MyLeads'),
  () => import('./pages/LinkTools'),
  () => import('./pages/ProSeller'),
  () => import('./pages/Funnels'),
  () => import('./pages/LinkHub'),
  () => import('./pages/TrainingCentre'),
  () => import('./pages/CryptoGuide'),
  () => import('./pages/PlatformTour'),
  () => import('./pages/SuperLink'),
  () => import('./pages/CampaignAnalytics'),
];

let preloadStarted = false;
function preloadRouteChunks() {
  if (preloadStarted) return;
  preloadStarted = true;
  const idle = window.requestIdleCallback || function(cb) { return setTimeout(cb, 1); };
  PRELOAD_IMPORTS.forEach(function(fn, i) {
    // Stagger by 100ms each so we don't flood the network with 50 parallel requests.
    // The browser will queue + cache them. By the time the user clicks a sidebar
    // link (typically 5-30s after landing), the chunk is in the cache.
    setTimeout(function() {
      idle(function() { fn().catch(function(){}); });
    }, 1000 + i * 100);
  });
}

// Suspense wrapper for remaining lazy routes
function Lazy({ children }) { return <Suspense fallback={<div style={{minHeight:'60vh'}}/>}>{children}</Suspense>; }


// Error boundary to catch crashes
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('React crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:40,textAlign:'center',fontFamily:'DM Sans,sans-serif'}}>
          <h2 style={{color:'#dc2626'}}>{'Something went wrong'}</h2>
          <p style={{color:'#64748b',marginBottom:16}}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={function(){window.location.reload();}} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#0ea5e9',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>{'Reload Page'}</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import TwoFactorLogin from './pages/auth/TwoFactorLogin';
import TwoFactorSetup from './pages/auth/TwoFactorSetup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Public pages
import HomePage from './pages/public/HomePage';
import ExploreHub from './pages/public/ExploreHub';
import { FAQ, Legal } from './pages/public/PublicPages';
import InternalFAQ from './pages/FAQ';
import PublicIncomeDisclosure from './pages/public/PublicIncomeDisclosure';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  );
  if (!user) {
    // Send unauthenticated users to the public homepage, not /login.
    // Using replace() to avoid back-button loops. Originally redirected
    // to /login which (a) created a sales-funnel leak on logout (page
    // briefly re-rendered with user=null while navigating, this guard
    // would race window.location.replace('/login') and win, regardless
    // of where logout itself was sending them) and (b) is a worse UX
    // for direct visitors who shared a /dashboard URL — they should
    // see the marketing site, not a login form. The homepage has a
    // Sign In nav link for users who genuinely want to log in.
    window.location.replace('/');
    return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
  }
  return children;
}

// ────────────────────────────────────────────────────────────────────
// RequireTier — client-side tier gate.
//
// Under flat partner pricing (15 May 2026), every paid member has full
// platform access. Legacy `tier="basic"` and `tier="pro"` checks both
// collapse to a single check: is the user an active paying partner
// (any of partner/founding/legacy basic/pro)?
//
// - Free members hitting any gated route → redirect to /upgrade (the
//   activation page; will become the new Partner Payment window in Sprint 2d)
// - Admin always passes
//
// The legacy `tier="pro"` distinction is no longer meaningful but the
// parameter is kept for backward compatibility with existing call sites.
// A future cleanup sprint will replace all <RequireTier tier="..."> with
// a simpler <RequireActive> component.
function RequireTier({ tier, children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  );
  if (!user) {
    // Same as ProtectedRoute — send unauth'd users to homepage, not /login.
    // See ProtectedRoute comment for rationale.
    window.location.replace('/');
    return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
  }
  // Admin always passes
  if (user.is_admin) return children;

  const isActive = !!user.is_active;

  // Under flat pricing every is_active member sees every gated feature.
  // The `tier` parameter is preserved for backward compatibility but no
  // longer differentiates access. Inactive users redirect to /upgrade
  // (the activation page), regardless of which tier was originally requested.
  if (!isActive) return <HardRedirect to="/join" />;
  return children;
}

function SmartHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const preview = new URLSearchParams(window.location.search).has('preview');
  if (user && !preview) return <Navigate to="/dashboard" replace />;
  return <HomePage />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>}>
    <Routes>
      {/* Fully migrated pages */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><NewDashboard /></ProtectedRoute>} />
      <Route path="/wisdom" element={<ProtectedRoute><Wisdom /></ProtectedRoute>} />
      <Route path="/compensation-plan" element={<ProtectedRoute><CompensationPlan /></ProtectedRoute>} />
      {/* AL server-rendered pages — hard navigation out of the SPA */}
      {/* Server-rendered AL pages — HardRedirect so in-app <Link>s reach them
          instead of hitting the catch-all and bouncing to the homepage. */}
      <Route path="/join" element={<HardRedirect to="/join" />} />
      <Route path="/packs" element={<HardRedirect to="/packs" />} />
      <Route path="/my-sales" element={<HardRedirect to="/my-sales" />} />
      <Route path="/payout-methods" element={<HardRedirect to="/payout-methods" />} />
      <Route path="/plan" element={<HardRedirect to="/plan" />} />
      <Route path="/compensation-plan" element={<HardRedirect to="/plan" />} />
      <Route path="/campaign-tiers" element={<HardRedirect to="/packs" />} />
      <Route path="/home-preview" element={<Navigate to="/dashboard" replace />} />
      <Route path="/ai-tools" element={<ProtectedRoute><AIToolsHub /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><RequireTier tier="basic"><VideoLibrary /></RequireTier></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
      <Route path="/command-centre" element={<ProtectedRoute><CommandCentre /></ProtectedRoute>} />
      <Route path="/command-centre/directs/active" element={<ProtectedRoute><BucketList bucketKey="directs-active" /></ProtectedRoute>} />
      <Route path="/command-centre/directs/lapsed" element={<ProtectedRoute><BucketList bucketKey="directs-lapsed" /></ProtectedRoute>} />
      <Route path="/command-centre/directs/never-paid" element={<ProtectedRoute><BucketList bucketKey="directs-never-paid" /></ProtectedRoute>} />
      <Route path="/command-centre/nexus-team" element={<ProtectedRoute><BucketList bucketKey="nexus-team" /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><RequireTier tier="basic"><Wallet /></RequireTier></ProtectedRoute>} />
      <Route path="/w/:token" element={<SharePage />} />
      <Route path="/my-team" element={<ProtectedRoute><MyTeam /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/account/purchases" element={<Navigate to="/account?tab=billing" replace />} />
      <Route path="/account/faq" element={<ProtectedRoute><InternalFAQ /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/social-share" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
      <Route path="/my-marketing" element={<ProtectedRoute><MyMarketing /></ProtectedRoute>} />
      <Route path="/my-marketing/lead-magnets" element={<ProtectedRoute><LeadMagnets /></ProtectedRoute>} />
      <Route path="/my-marketing/lead-magnets/:key" element={<ProtectedRoute><LeadMagnetDetail /></ProtectedRoute>} />
      <Route path="/marketing-materials" element={<ProtectedRoute><MarketingMaterials /></ProtectedRoute>} />
      <Route path="/campaign-videos" element={<HardRedirect to="/campaigns" />} />
      <Route path="/lead-finder" element={<ProtectedRoute><RequireTier tier="pro"><LeadFinder /></RequireTier></ProtectedRoute>} />
      <Route path="/affiliate" element={<Navigate to="/social-share" replace />} />
      <Route path="/pay-it-forward" element={<HardRedirect to="/dashboard" />} />
      {/* Brand Poster Generator — gallery is open to all members (preview), generation gated by Nexus pack ownership in the backend */}
      <Route path="/brand-posters" element={<ProtectedRoute><RequireTier tier="basic"><BrandPostersGallery /></RequireTier></ProtectedRoute>} />
      <Route path="/brand-posters/template/:slug" element={<ProtectedRoute><RequireTier tier="basic"><BrandPosterForm /></RequireTier></ProtectedRoute>} />
      <Route path="/brand-posters/result/:generationId" element={<ProtectedRoute><RequireTier tier="basic"><BrandPosterResult /></RequireTier></ProtectedRoute>} />
      <Route path="/brand-posters/history" element={<ProtectedRoute><RequireTier tier="basic"><BrandPosterHistory /></RequireTier></ProtectedRoute>} />
      <Route path="/gift/team/:code" element={<ProtectedRoute><TeamGiftAccept /></ProtectedRoute>} />
      <Route path="/gift/:code" element={<GiftLanding />} />
      <Route path="/watch" element={<ProtectedRoute><RequireTier tier="basic"><Watch /></RequireTier></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><RequireTier tier="basic"><AnalyticsPage /></RequireTier></ProtectedRoute>} />
      <Route path="/video-library" element={<HardRedirect to="/campaigns" />} />
      <Route path="/upload" element={<ProtectedRoute><RequireTier tier="basic"><CreateCampaign /></RequireTier></ProtectedRoute>} />
      <Route path="/create-campaign" element={<ProtectedRoute><RequireTier tier="basic"><CreateCampaign /></RequireTier></ProtectedRoute>} />

      {/* AI Marketing Tools — Pro-tier per Tools page spec */}
      <Route path="/campaign-studio" element={<ProtectedRoute><RequireTier tier="basic"><AiTool categoryBack={{ to: '/toolkit', label: 'Tool Kit' }} title={'Campaign Studio'} subtitle={'AI-powered campaign generator'} apiEndpoint="/api/campaign-studio/generate"
        fields={[{key:'niche',label:'Your Niche',placeholder:'e.g. crypto trading, fitness, real estate'},{key:'audience',label:'Target Audience',placeholder:'e.g. beginners, professionals, women 25-45'},{key:'tone',label:'Tone',type:'select',options:['Professional','Casual','Urgent','Inspirational','Educational']},{key:'goal',label:'Campaign Goal',type:'select',options:['Lead Generation','Sales','Brand Awareness','Recruitment']}]}
        resultLabel="Your Campaign" /></RequireTier></ProtectedRoute>} />
      <Route path="/niche-finder" element={<Navigate to="/tools" replace />} />
      <Route path="/social-post-generator" element={<ProtectedRoute><RequireTier tier="basic"><AiTool title={'Social Post Generator'} subtitle={'AI social media content'} apiEndpoint="/api/social-posts/generate"
        fields={[{key:'topic',label:'Topic',placeholder:'What do you want to post about?'},{key:'platform',label:'Platform',type:'select',options:['Facebook','Instagram','X / Twitter','LinkedIn','TikTok']},{key:'tone',label:'Tone',type:'select',options:['Professional','Casual','Funny','Inspirational','Educational']}]}
        resultLabel="Your Social Post" /></RequireTier></ProtectedRoute>} />
      <Route path="/video-script-generator" element={<ProtectedRoute><RequireTier tier="basic"><AiTool title={'Video Script Generator'} subtitle={'AI video scripts'} apiEndpoint="/api/video-scripts/generate"
        fields={[{key:'topic',label:'Video Topic',placeholder:'What is the video about?'},{key:'duration',label:'Target Duration',type:'select',options:['30 seconds','1 minute','2 minutes','5 minutes','10 minutes']},{key:'style',label:'Style',type:'select',options:['Tutorial','Testimonial','Sales Pitch','Educational','Story']}]}
        resultLabel="Your Video Script" /></RequireTier></ProtectedRoute>} />
      <Route path="/email-swipes" element={<ProtectedRoute><EmailSwipes /></ProtectedRoute>} />
      <Route path="/email-swipes/generator" element={<ProtectedRoute><AiTool categoryBack={{ to: '/email-swipes', label: 'Email Swipes' }} title={'Email Swipes'} subtitle={'AI email copy generator'} apiEndpoint="/api/swipe-file/generate"
        fields={[{key:'product',label:'Product/Service',placeholder:'What are you promoting?'},{key:'audience',label:'Target Audience',placeholder:'Who are you emailing?'},{key:'goal',label:'Email Goal',type:'select',options:['Welcome Sequence','Sales Email','Follow-Up','Re-engagement','Announcement']}]}
        resultLabel="Your Email" /></ProtectedRoute>} />

      {/* Info Pages */}
      <Route path="/income-disclaimer" element={<ProtectedRoute><IncomeDisclaimer /></ProtectedRoute>} />
      {/* /upgrade serves the new Partner Payment window (Sprint 2d, 15 May 2026).
          Legacy Upgrade.jsx kept in codebase as dead code; will be removed in a
          future cleanup once we're confident the new page handles every case.
          /upgrade/checkout still routes to legacy UpgradeCheckout for any in-flight
          checkout sessions that haven't completed yet — that page now short-circuits
          the deprecated pro-upgrade path with a clear message. */}
      {/* /upgrade retired — PartnerPayment sold the SuperAdPro $15/$20-a-month
          membership. AL has no monthly tier; the $100 lifetime join lives at /join. */}
      <Route path="/upgrade" element={<HardRedirect to="/join" />} />
      <Route path="/upgrade/checkout" element={<ProtectedRoute><UpgradeCheckout /></ProtectedRoute>} />

      {/* Complex tools — full React pages */}
      <Route path="/linkhub" element={<ProtectedRoute><RequireTier tier="basic"><LinkHubPage /></RequireTier></ProtectedRoute>} />
      <Route path="/proseller" element={<ProtectedRoute><RequireTier tier="pro"><ProSeller /></RequireTier></ProtectedRoute>} />
      <Route path="/my-site" element={<ProtectedRoute><MySite /></ProtectedRoute>} />
      <Route path="/my-site/domain" element={<ProtectedRoute><BlogDomain /></ProtectedRoute>} />
      <Route path="/my-site/new" element={<ProtectedRoute><BlogEditor /></ProtectedRoute>} />
      <Route path="/my-site/edit/:id" element={<ProtectedRoute><BlogEditor /></ProtectedRoute>} />
      <Route path="/my-site/pages/new" element={<ProtectedRoute><BlogEditor kind="page" /></ProtectedRoute>} />
      <Route path="/my-site/pages/edit/:id" element={<ProtectedRoute><BlogEditor kind="page" /></ProtectedRoute>} />
      {/* SuperSeller removed */}
      <Route path="/training" element={<ProtectedRoute><TrainingCentre /></ProtectedRoute>} />
      <Route path="/videos" element={<ProtectedRoute><Videos /></ProtectedRoute>} />
      <Route path="/videos/:slug" element={<ProtectedRoute><VideoDetail /></ProtectedRoute>} />
      <Route path="/admin/videos" element={<ProtectedRoute><AdminVideos /></ProtectedRoute>} />
      <Route path="/labs/pagebuilder" element={<ProtectedRoute><LabsPageBuilder /></ProtectedRoute>} />
      <Route path="/custom-domain" element={<ProtectedRoute><CustomDomain /></ProtectedRoute>} />
      <Route path="/labs/pagebuilder/custom-domain" element={<Navigate to="/custom-domain" replace />} />
      <Route path="/help/custom-domain" element={<ProtectedRoute><HelpCustomDomain /></ProtectedRoute>} />
      <Route path="/sending-domains" element={<ProtectedRoute><SendingDomains /></ProtectedRoute>} />
      <Route path="/help/sending-domain" element={<ProtectedRoute><HelpSendingDomain /></ProtectedRoute>} />
      <Route path="/labs/pagebuilder/preview-templates" element={<ProtectedRoute><LabsTemplatesPreview /></ProtectedRoute>} />
      <Route path="/labs/pagebuilder/sandbox" element={<ProtectedRoute><LabsSandboxList /></ProtectedRoute>} />
      <Route path="/labs/pagebuilder/sandbox/edit/:sandboxId" element={<ProtectedRoute><LabsSuperPagesEditor /></ProtectedRoute>} />
      <Route path="/labs/pagebuilder/edit/:pageId" element={<ProtectedRoute><LabsSuperPagesEditor /></ProtectedRoute>} />
      <Route path="/crypto-guide" element={<ProtectedRoute><CryptoGuide /></ProtectedRoute>} />
      <Route path="/tour" element={<ProtectedRoute><PlatformTour /></ProtectedRoute>} />
      <Route path="/team-messenger" element={<HardRedirect to="/dashboard" />} />
      <Route path="/qr-generator" element={<Navigate to="/tools" replace />} />
      <Route path="/admin/al" element={<ProtectedRoute><AdminAL /></ProtectedRoute>} />
      <Route path="/admin/network-tree" element={<ProtectedRoute><AdminNetworkTree /></ProtectedRoute>} />
      <Route path="/admin/rotator" element={<ProtectedRoute><Lazy><AdminRotatorState /></Lazy></ProtectedRoute>} />
      <Route path="/admin/stories" element={<ProtectedRoute><AdminStories /></ProtectedRoute>} />
      <Route path="/admin/showcase" element={<ProtectedRoute><AdminShowcase /></ProtectedRoute>} />
      <Route path="/admin/orphans" element={<ProtectedRoute><AdminOrphans /></ProtectedRoute>} />
      <Route path="/admin/email-broadcast" element={<ProtectedRoute><React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f8fafc',color:'#0ea5e9',fontFamily:'DM Sans,sans-serif'}}>{'Loading Email Broadcast…'}</div>}><AdminEmailBroadcast /></React.Suspense></ProtectedRoute>} />
      <Route path="/pro/funnels" element={<ProtectedRoute><RequireTier tier="pro"><Funnels /></RequireTier></ProtectedRoute>} />
      <Route path="/funnels" element={<ProtectedRoute><RequireTier tier="pro"><Funnels /></RequireTier></ProtectedRoute>} />
      <Route path="/pro/funnel/:pageId/edit" element={<ProtectedRoute><RequireTier tier="pro"><LabsSuperPagesEditor /></RequireTier></ProtectedRoute>} />
      <Route path="/superdeck" element={<Navigate to="/tools" replace />} />
      <Route path="/my-credits" element={<HardRedirect to="/tools" />} />
      <Route path="/credit-nexus" element={<HardRedirect to="/tools" />} />
      <Route path="/campaign-analytics" element={<ProtectedRoute><RequireTier tier="basic"><CampaignAnalytics /></RequireTier></ProtectedRoute>} />
      <Route path="/creative-studio" element={<HardRedirect to="/tools" />} />
      <Route path="/studio" element={<ProtectedRoute><RequireTier tier="basic"><React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#081034',color:'#2ad4ee',fontFamily:'DM Sans,sans-serif'}}>{'Loading Studio…'}</div>}><StudioShell /></React.Suspense></RequireTier></ProtectedRoute>} />
      <Route path="/pro/leads" element={<ProtectedRoute><RequireTier tier="pro"><MyLeads /></RequireTier></ProtectedRoute>} />
      <Route path="/link-tools" element={<ProtectedRoute><RequireTier tier="basic"><LinkTools /></RequireTier></ProtectedRoute>} />
      <Route path="/passup-visualiser" element={<Navigate to="/campaign-tiers" replace />} />
      <Route path="/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
      {/* Legacy routes — redirect to the new structure. Free + Basic AI tools
          live under AI Content; Basic builder tools + Pro tools live under Builder. */}
      <Route path="/tools/free" element={<Navigate to="/tools/ai-content" replace />} />
      <Route path="/tools/basic" element={<Navigate to="/tools/ai-content" replace />} />
      <Route path="/tools/pro" element={<Navigate to="/tools/builder" replace />} />
      <Route path="/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
      <Route path="/learn/education" element={<ProtectedRoute><EducationPage /></ProtectedRoute>} />
      <Route path="/learn/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
      <Route path="/learn/community" element={<HardRedirect to="/learn" />} />

      {/* Public pages — no auth required, no sidebar */}
      <Route path="/" element={<SmartHome />} />

      {/* Explore hub + sub-pages (new) */}
      <Route path="/explore" element={<ExploreHub />} />
      <Route path="/explore/live" element={<Navigate to="/explore" replace />} />
      <Route path="/explore/stories" element={<Navigate to="/explore" replace />} />
      <Route path="/explore/showcase" element={<Navigate to="/explore" replace />} />
      <Route path="/explore/free-tools" element={<Navigate to="/explore" replace />} />
      <Route path="/explore/watch-to-earn" element={<HardRedirect to="/plan" />} />

      {/* Old public pages — replaced by /explore hub. Redirect preserves any
          search-engine rank + honours any existing bookmarks/shared links. */}
      <Route path="/how-it-works" element={<Navigate to="/explore" replace />} />
      <Route path="/what-you-get" element={<Navigate to="/explore" replace />} />
      <Route path="/earn" element={<Navigate to="/explore" replace />} />

      <Route path="/for-advertisers" element={<HardRedirect to="/plan" />} />
      <Route path="/membership" element={<Navigate to="/explore" replace />} />
      <Route path="/explore/compensation" element={<HardRedirect to="/plan" />} />
      <Route path="/compensation" element={<HardRedirect to="/plan" />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/legal/income-disclosure" element={<PublicIncomeDisclosure />} />
      <Route path="/affiliates" element={<Navigate to="/register" replace />} />
      <Route path="/packages" element={<Navigate to="/register" replace />} />
      <Route path="/vip" element={<Navigate to="/register" replace />} />
      {/* /join/:username handled by SuperLinkPage below */}
      {/* Internal tool versions — same engine, light theme + AppLayout, login required */}
      <Route path="/tools/qr-code-generator" element={<Navigate to="/tools" replace />} />
      <Route path="/join/:username" element={<SuperLinkPage />} />
      <Route path="/ref/:username/video" element={<ReferralVideo />} />

      {/* Phase 4 member pages */}

      {/* Auth pages — no sidebar, no auth required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/:ref" element={<Register />} />
      <Route path="/login/2fa" element={<TwoFactorLogin />} />
      <Route path="/2fa-setup" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Catch-all */}
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

function PlaceholderPage({ title }) {
  return (
    <AppLayout title={title} subtitle={'Migrating to React — coming shortly'}>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="font-display text-xl font-extrabold text-slate-800 mb-2">{title}</h2>
        <p className="text-sm text-slate-500">{'This page is being migrated to the new interface.'}</p>
      </div>
    </AppLayout>
  );
}

// Strip /app prefix so both /dashboard and /app/dashboard work
function AppPrefixRedirect() {
  const loc = window.location;
  if (loc.pathname.startsWith('/app/') || loc.pathname === '/app') {
    const clean = loc.pathname.replace(/^\/app/, '') || '/';
    window.history.replaceState(null, '', clean + loc.search + loc.hash);
  }
  return null;
}

function HardRedirect({ to }) {
  // Server-rendered AL pages live outside the SPA — a full navigation is
  // required (react-router would render nothing for these paths).
  React.useEffect(function () { window.location.replace(to); }, [to]);
  return null;
}

export default function App() {
  React.useEffect(function() { preloadRouteChunks(); }, []);
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AppPrefixRedirect />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
