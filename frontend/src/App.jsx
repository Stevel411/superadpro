import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';
import AppLayout from './components/layout/AppLayout';
import './i18n';
import { Component, Suspense } from 'react';

// ── Direct imports (core pages — instant navigation, no spinner) ──
import Dashboard from './pages/Dashboard';
import OnboardingWizard from './pages/OnboardingWizard';
import AnalyticsPage from './pages/Analytics';
import CreateCampaign from './pages/CreateCampaign';
import Wallet from './pages/Wallet';
import Account from './pages/Account';
import Courses from './pages/Courses';
import Leaderboard from './pages/Leaderboard';
import Affiliate from './pages/Affiliate';
import MarketingMaterials from './pages/MarketingMaterials';
import LeadFinder from './pages/LeadFinder';
import CampaignTiers from './pages/CampaignTiers';
import Watch from './pages/Watch';
import Analytics from './pages/Analytics';
import Support from './pages/Support';
import VideoLibrary from './pages/VideoLibrary';
import Upgrade from './pages/Upgrade';
import CompensationPlan from './pages/CompensationPlan';
import IncomeDisclaimer from './pages/IncomeDisclaimer';
import AiTool from './pages/AiTool';
import MyNetwork from './pages/MyNetwork';
import IncomeChains from './pages/IncomeChains';
import HowCommissionsWork from './pages/HowCommissionsWork';
import MyLeads from './pages/MyLeads';
import LinkTools from './pages/LinkTools';
import PaymentSuccess from './pages/PaymentSuccess';
import PassupVisualiser from './pages/PassupVisualiser';
import ProSeller from './pages/ProSeller';
// SuperSeller removed — replaced by individual AI tools
import AdminDashboard from './pages/AdminDashboard';
import Funnels from './pages/Funnels';
import LinkHubPage from './pages/LinkHub';
import ActivateTier from './pages/ActivateTier';
import PayItForward from './pages/PayItForward';
import ShareStory from './pages/ShareStory';
import GiftLanding from './pages/GiftLanding';
import TrainingCentre from './pages/TrainingCentre';
import CryptoGuide from './pages/CryptoGuide';
import PlatformTour from './pages/PlatformTour';
import TeamMessenger from './pages/TeamMessenger';
import QRGenerator from './pages/QRGenerator';
import SuperLinkPage from './pages/SuperLink';

// ── Lazy imports (heavy/rare pages only) ──
const SuperPagesEditor = React.lazy(() => import('./pages/superpages/SuperPagesEditor'));
const SuperDeckList = React.lazy(() => import('./pages/superdeck/SuperDeckList'));
const SuperDeckEditor = React.lazy(() => import('./pages/superdeck/SuperDeckEditor'));
const VideoCreator = React.lazy(() => import('./pages/VideoCreator'));
const CreditMatrix = React.lazy(() => import('./pages/CreditMatrix'));
const GridVisualiser = React.lazy(() => import('./pages/GridVisualiser'));
const GridCalculator = React.lazy(() => import('./pages/GridCalculator'));
const CreditMatrixVisualiser = React.lazy(() => import('./pages/CreditMatrixVisualiser'));
const CampaignAnalytics = React.lazy(() => import('./pages/CampaignAnalytics'));
const CreativeStudio = React.lazy(() => import('./pages/creative-studio/CreativeStudio'));
const ContentCreatorPage = React.lazy(() => import('./pages/content-creator/ContentCreatorPage'));
const IncomeGrid3DPage = React.lazy(() => import('./pages/IncomeGrid3DPage'));
const MemeGenerator = React.lazy(() => import('./pages/free/MemeGenerator'));
const QRCodeGen = React.lazy(() => import('./pages/free/QRCodeGen'));
const BannerCreator = React.lazy(() => import('./pages/free/BannerCreator'));

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
import ComingSoon from './pages/auth/ComingSoon';
import TwoFactorLogin from './pages/auth/TwoFactorLogin';
import TwoFactorSetup from './pages/auth/TwoFactorSetup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Public pages
import HomePage from './pages/public/HomePage';
import HowItWorks from './pages/public/HowItWorks';
import ExplorePage from './pages/public/ExplorePage';
import JoinFunnel from './pages/public/JoinFunnel';
import { FAQ, Legal } from './pages/public/PublicPages';
import ForAdvertisers from './pages/public/ForAdvertisers';
import AffiliatePlan from './pages/public/AffiliatePlan';
import Tools from './pages/public/Tools';
import CoursePlayer from './pages/CoursePlayer';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  );
  if (!user) {
    // Use replace to avoid back-button loops
    window.location.replace('/login');
    return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
  }
  return children;
}

function SmartHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <HomePage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Fully migrated pages */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/social-share" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
      <Route path="/marketing-materials" element={<ProtectedRoute><MarketingMaterials /></ProtectedRoute>} />
      <Route path="/lead-finder" element={<ProtectedRoute><LeadFinder /></ProtectedRoute>} />
      <Route path="/affiliate" element={<Navigate to="/social-share" replace />} />
      <Route path="/campaign-tiers" element={<ProtectedRoute><CampaignTiers /></ProtectedRoute>} />
      <Route path="/activate/:tierId" element={<ProtectedRoute><ActivateTier /></ProtectedRoute>} />
      <Route path="/pay-it-forward" element={<ProtectedRoute><PayItForward /></ProtectedRoute>} />
      <Route path="/share-story" element={<ProtectedRoute><ShareStory /></ProtectedRoute>} />
      <Route path="/gift/:code" element={<GiftLanding />} />
      <Route path="/watch" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/video-library" element={<ProtectedRoute><VideoLibrary /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><CreateCampaign /></ProtectedRoute>} />
      <Route path="/create-campaign" element={<ProtectedRoute><CreateCampaign /></ProtectedRoute>} />

      {/* AI Marketing Tools */}
      <Route path="/campaign-studio" element={<ProtectedRoute><AiTool title={'Campaign Studio'} subtitle={'AI-powered campaign generator'} apiEndpoint="/api/campaign-studio/generate"
        fields={[{key:'niche',label:'Your Niche',placeholder:'e.g. crypto trading, fitness, real estate'},{key:'audience',label:'Target Audience',placeholder:'e.g. beginners, professionals, women 25-45'},{key:'tone',label:'Tone',type:'select',options:['Professional','Casual','Urgent','Inspirational','Educational']},{key:'goal',label:'Campaign Goal',type:'select',options:['Lead Generation','Sales','Brand Awareness','Recruitment']}]}
        resultLabel="Your Campaign" /></ProtectedRoute>} />
      <Route path="/niche-finder" element={<ProtectedRoute><AiTool title={'Niche Finder'} subtitle={'Discover profitable niches'} apiEndpoint="/api/niche-finder/generate"
        fields={[{key:'interests',label:'Your Interests',placeholder:'e.g. health, technology, finance'},{key:'budget',label:'Budget Range',type:'select',options:['Under $500','$500-$2000','$2000-$5000','$5000+']},{key:'experience',label:'Experience Level',type:'select',options:['Beginner','Intermediate','Advanced']}]}
        resultLabel="Niche Recommendations" /></ProtectedRoute>} />
      <Route path="/social-post-generator" element={<ProtectedRoute><AiTool title={'Social Post Generator'} subtitle={'AI social media content'} apiEndpoint="/api/social-posts/generate"
        fields={[{key:'topic',label:'Topic',placeholder:'What do you want to post about?'},{key:'platform',label:'Platform',type:'select',options:['Facebook','Instagram','X / Twitter','LinkedIn','TikTok']},{key:'tone',label:'Tone',type:'select',options:['Professional','Casual','Funny','Inspirational','Educational']}]}
        resultLabel="Your Social Post" /></ProtectedRoute>} />
      <Route path="/video-script-generator" element={<ProtectedRoute><AiTool title={'Video Script Generator'} subtitle={'AI video scripts'} apiEndpoint="/api/video-scripts/generate"
        fields={[{key:'topic',label:'Video Topic',placeholder:'What is the video about?'},{key:'duration',label:'Target Duration',type:'select',options:['30 seconds','1 minute','2 minutes','5 minutes','10 minutes']},{key:'style',label:'Style',type:'select',options:['Tutorial','Testimonial','Sales Pitch','Educational','Story']}]}
        resultLabel="Your Video Script" /></ProtectedRoute>} />
      <Route path="/email-swipes" element={<ProtectedRoute><AiTool title={'Email Swipes'} subtitle={'AI email copy generator'} apiEndpoint="/api/swipe-file/generate"
        fields={[{key:'product',label:'Product/Service',placeholder:'What are you promoting?'},{key:'audience',label:'Target Audience',placeholder:'Who are you emailing?'},{key:'goal',label:'Email Goal',type:'select',options:['Welcome Sequence','Sales Email','Follow-Up','Re-engagement','Announcement']}]}
        resultLabel="Your Email" /></ProtectedRoute>} />

      {/* Info Pages */}
      <Route path="/compensation-plan" element={<ProtectedRoute><CompensationPlan /></ProtectedRoute>} />
      <Route path="/income-disclaimer" element={<ProtectedRoute><IncomeDisclaimer /></ProtectedRoute>} />
      <Route path="/income-grid-3d" element={<React.Suspense fallback={<div style={{background:'#050d1a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#38bdf8',fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:700}}>{'Loading 3D Grid...'}</div>}><IncomeGrid3DPage /></React.Suspense>} />
      <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />

      {/* Complex tools — full React pages */}
      <Route path="/linkhub" element={<ProtectedRoute><LinkHubPage /></ProtectedRoute>} />
      <Route path="/proseller" element={<ProtectedRoute><ProSeller /></ProtectedRoute>} />
      {/* SuperSeller removed */}
      <Route path="/training" element={<ProtectedRoute><TrainingCentre /></ProtectedRoute>} />
      <Route path="/crypto-guide" element={<ProtectedRoute><CryptoGuide /></ProtectedRoute>} />
      <Route path="/tour" element={<ProtectedRoute><PlatformTour /></ProtectedRoute>} />
      <Route path="/team-messenger" element={<ProtectedRoute><TeamMessenger /></ProtectedRoute>} />
      <Route path="/qr-generator" element={<ProtectedRoute><QRGenerator /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/pro/funnels" element={<ProtectedRoute><Funnels /></ProtectedRoute>} />
      <Route path="/funnels" element={<ProtectedRoute><Funnels /></ProtectedRoute>} />
      <Route path="/pro/funnel/:pageId/edit" element={<ProtectedRoute><SuperPagesEditor /></ProtectedRoute>} />
      <Route path="/superdeck" element={<ProtectedRoute><SuperDeckList /></ProtectedRoute>} />
      <Route path="/superdeck/edit/:deckId" element={<ProtectedRoute><SuperDeckEditor /></ProtectedRoute>} />
      <Route path="/video-creator" element={<ProtectedRoute><VideoCreator /></ProtectedRoute>} />
      <Route path="/credit-nexus" element={<ProtectedRoute><CreditMatrix /></ProtectedRoute>} />
      <Route path="/grid-visualiser" element={<ProtectedRoute><GridVisualiser /></ProtectedRoute>} />
      <Route path="/grid-calculator" element={<ProtectedRoute><GridCalculator /></ProtectedRoute>} />
      <Route path="/nexus-visualiser" element={<ProtectedRoute><CreditMatrixVisualiser /></ProtectedRoute>} />
      <Route path="/campaign-analytics" element={<ProtectedRoute><CampaignAnalytics /></ProtectedRoute>} />
      <Route path="/creative-studio" element={<ProtectedRoute><React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f1f5f9',color:'#8b5cf6',fontFamily:'DM Sans,sans-serif'}}>{'Loading Creative Studio…'}</div>}><CreativeStudio /></React.Suspense></ProtectedRoute>} />
      <Route path="/content-creator" element={<ProtectedRoute><React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f1f5f9',color:'#8b5cf6',fontFamily:'DM Sans,sans-serif'}}>{'Loading Content Creator…'}</div>}><ContentCreatorPage /></React.Suspense></ProtectedRoute>} />
      <Route path="/pro/leads" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
      <Route path="/link-tools" element={<ProtectedRoute><LinkTools /></ProtectedRoute>} />
      <Route path="/passup-visualiser" element={<ProtectedRoute><PassupVisualiser /></ProtectedRoute>} />
      <Route path="/network" element={<ProtectedRoute><MyNetwork /></ProtectedRoute>} />
      <Route path="/income-chains" element={<ProtectedRoute><IncomeChains /></ProtectedRoute>} />
      <Route path="/courses/commissions" element={<ProtectedRoute><MyNetwork /></ProtectedRoute>} />
      <Route path="/courses/how-it-works" element={<ProtectedRoute><HowCommissionsWork /></ProtectedRoute>} />

      {/* Public pages — no auth required, no sidebar */}
      <Route path="/" element={<SmartHome />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/for-advertisers" element={<ForAdvertisers />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/affiliates" element={<Navigate to="/register" replace />} />
      <Route path="/membership" element={<Navigate to="/register" replace />} />
      <Route path="/packages" element={<Navigate to="/register" replace />} />
      <Route path="/what-you-get" element={<HowItWorks />} />
      <Route path="/vip" element={<Navigate to="/register" replace />} />
      {/* /join/:username handled by SuperLinkPage below */}
      <Route path="/free/meme-generator" element={<Lazy><MemeGenerator /></Lazy>} />
      <Route path="/free/qr-code-generator" element={<Lazy><QRCodeGen /></Lazy>} />
      <Route path="/free/banner-creator" element={<Lazy><BannerCreator /></Lazy>} />
      <Route path="/earn" element={<AffiliatePlan />} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/join/:username" element={<SuperLinkPage />} />

      {/* Phase 4 member pages */}
      <Route path="/courses/learn/:courseId" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />

      {/* Auth pages — no sidebar, no auth required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<ComingSoon />} />
      <Route path="/register/:ref" element={<ComingSoon />} />
      <Route path="/login/2fa" element={<TwoFactorLogin />} />
      <Route path="/2fa-setup" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Catch-all */}
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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

export default function App() {
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
