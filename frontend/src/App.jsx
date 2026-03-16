import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';
import AppLayout from './components/layout/AppLayout';
import './i18n';

// Pages
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Account from './pages/Account';
import Courses from './pages/Courses';
import Leaderboard from './pages/Leaderboard';
import Affiliate from './pages/Affiliate';
import CampaignTiers from './pages/CampaignTiers';
import Marketplace from './pages/Marketplace';
import MyCourses from './pages/MyCourses';
import Watch from './pages/Watch';
import Analytics from './pages/Analytics';
import Support from './pages/Support';
import Achievements from './pages/Achievements';
import VideoLibrary from './pages/VideoLibrary';
import Upgrade from './pages/Upgrade';
import CompensationPlan from './pages/CompensationPlan';
import AiTool from './pages/AiTool';
import MyNetwork from './pages/MyNetwork';
import HowCommissionsWork from './pages/HowCommissionsWork';
import MyLeads from './pages/MyLeads';
import LinkTools from './pages/LinkTools';
import AdBoard from './pages/AdBoard';
import PassupVisualiser from './pages/PassupVisualiser';
import ProSeller from './pages/ProSeller';
import Funnels from './pages/Funnels';
import CourseCreate from './pages/CourseCreate';
import LinkHubPage from './pages/LinkHub';
import SuperPagesEditor from './pages/superpages/SuperPagesEditor';
import ActivateTier from './pages/ActivateTier';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  );
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Fully migrated pages */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
      <Route path="/campaign-tiers" element={<ProtectedRoute><CampaignTiers /></ProtectedRoute>} />
      <Route path="/activate/:tierId" element={<ProtectedRoute><ActivateTier /></ProtectedRoute>} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/courses/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
      <Route path="/watch" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
      <Route path="/video-library" element={<ProtectedRoute><VideoLibrary /></ProtectedRoute>} />

      {/* AI Marketing Tools */}
      <Route path="/campaign-studio" element={<ProtectedRoute><AiTool title="Campaign Studio" subtitle="AI-powered campaign generator" apiEndpoint="/api/campaign-studio/generate"
        fields={[{key:'niche',label:'Your Niche',placeholder:'e.g. crypto trading, fitness, real estate'},{key:'audience',label:'Target Audience',placeholder:'e.g. beginners, professionals, women 25-45'},{key:'tone',label:'Tone',type:'select',options:['Professional','Casual','Urgent','Inspirational','Educational']},{key:'goal',label:'Campaign Goal',type:'select',options:['Lead Generation','Sales','Brand Awareness','Recruitment']}]}
        resultLabel="Your Campaign" /></ProtectedRoute>} />
      <Route path="/niche-finder" element={<ProtectedRoute><AiTool title="Niche Finder" subtitle="Discover profitable niches" apiEndpoint="/api/niche-finder/generate"
        fields={[{key:'interests',label:'Your Interests',placeholder:'e.g. health, technology, finance'},{key:'budget',label:'Budget Range',type:'select',options:['Under $500','$500-$2000','$2000-$5000','$5000+']},{key:'experience',label:'Experience Level',type:'select',options:['Beginner','Intermediate','Advanced']}]}
        resultLabel="Niche Recommendations" /></ProtectedRoute>} />
      <Route path="/social-post-generator" element={<ProtectedRoute><AiTool title="Social Post Generator" subtitle="AI social media content" apiEndpoint="/api/social-posts/generate"
        fields={[{key:'topic',label:'Topic',placeholder:'What do you want to post about?'},{key:'platform',label:'Platform',type:'select',options:['Facebook','Instagram','X / Twitter','LinkedIn','TikTok']},{key:'tone',label:'Tone',type:'select',options:['Professional','Casual','Funny','Inspirational','Educational']}]}
        resultLabel="Your Social Post" /></ProtectedRoute>} />
      <Route path="/video-script-generator" element={<ProtectedRoute><AiTool title="Video Script Generator" subtitle="AI video scripts" apiEndpoint="/api/video-scripts/generate"
        fields={[{key:'topic',label:'Video Topic',placeholder:'What is the video about?'},{key:'duration',label:'Target Duration',type:'select',options:['30 seconds','1 minute','2 minutes','5 minutes','10 minutes']},{key:'style',label:'Style',type:'select',options:['Tutorial','Testimonial','Sales Pitch','Educational','Story']}]}
        resultLabel="Your Video Script" /></ProtectedRoute>} />
      <Route path="/email-swipes" element={<ProtectedRoute><AiTool title="Email Swipes" subtitle="AI email copy generator" apiEndpoint="/api/swipe-file/generate"
        fields={[{key:'product',label:'Product/Service',placeholder:'What are you promoting?'},{key:'audience',label:'Target Audience',placeholder:'Who are you emailing?'},{key:'goal',label:'Email Goal',type:'select',options:['Welcome Sequence','Sales Email','Follow-Up','Re-engagement','Announcement']}]}
        resultLabel="Your Email" /></ProtectedRoute>} />

      {/* Info Pages */}
      <Route path="/compensation-plan" element={<ProtectedRoute><CompensationPlan /></ProtectedRoute>} />
      <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />

      {/* Complex tools — full React pages */}
      <Route path="/courses/create" element={<ProtectedRoute><CourseCreate /></ProtectedRoute>} />
      <Route path="/linkhub" element={<ProtectedRoute><LinkHubPage /></ProtectedRoute>} />
      <Route path="/proseller" element={<ProtectedRoute><ProSeller /></ProtectedRoute>} />
      <Route path="/pro/funnels" element={<ProtectedRoute><Funnels /></ProtectedRoute>} />
      <Route path="/funnels" element={<ProtectedRoute><Funnels /></ProtectedRoute>} />
      <Route path="/pro/funnel/:pageId/edit" element={<ProtectedRoute><SuperPagesEditor /></ProtectedRoute>} />
      <Route path="/pro/leads" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
      <Route path="/link-tools" element={<ProtectedRoute><LinkTools /></ProtectedRoute>} />
      <Route path="/passup-visualiser" element={<ProtectedRoute><PassupVisualiser /></ProtectedRoute>} />
      <Route path="/network" element={<ProtectedRoute><MyNetwork /></ProtectedRoute>} />
      <Route path="/courses/commissions" element={<ProtectedRoute><MyNetwork /></ProtectedRoute>} />
      <Route path="/courses/how-it-works" element={<ProtectedRoute><HowCommissionsWork /></ProtectedRoute>} />
      <Route path="/ad-board" element={<ProtectedRoute><AdBoard /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function PlaceholderPage({ title }) {
  return (
    <AppLayout title={title} subtitle="Migrating to React — coming shortly">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="font-display text-xl font-extrabold text-slate-800 mb-2">{title}</h2>
        <p className="text-sm text-slate-500">This page is being migrated to the new interface.</p>
      </div>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
