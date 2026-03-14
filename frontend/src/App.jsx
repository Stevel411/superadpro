import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';
import AppLayout from './components/layout/AppLayout';

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
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/courses/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />

      {/* Placeholder pages — next migration batch */}
      <Route path="/courses/create" element={<ProtectedRoute><PlaceholderPage title="Create Course" /></ProtectedRoute>} />
      <Route path="/campaign-studio" element={<ProtectedRoute><PlaceholderPage title="Campaign Studio" /></ProtectedRoute>} />
      <Route path="/linkhub" element={<ProtectedRoute><PlaceholderPage title="LinkHub Editor" /></ProtectedRoute>} />
      <Route path="/watch" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/video-library" element={<ProtectedRoute><VideoLibrary /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
      <Route path="/proseller" element={<ProtectedRoute><PlaceholderPage title="ProSeller AI" /></ProtectedRoute>} />
      <Route path="/pro/funnels" element={<ProtectedRoute><PlaceholderPage title="SuperPages" /></ProtectedRoute>} />
      <Route path="/pro/leads" element={<ProtectedRoute><PlaceholderPage title="My Leads" /></ProtectedRoute>} />
      <Route path="/link-tools" element={<ProtectedRoute><PlaceholderPage title="Link Tools" /></ProtectedRoute>} />
      <Route path="/niche-finder" element={<ProtectedRoute><PlaceholderPage title="Niche Finder" /></ProtectedRoute>} />
      <Route path="/social-post-generator" element={<ProtectedRoute><PlaceholderPage title="Social Posts" /></ProtectedRoute>} />
      <Route path="/video-script-generator" element={<ProtectedRoute><PlaceholderPage title="Video Scripts" /></ProtectedRoute>} />
      <Route path="/email-swipes" element={<ProtectedRoute><PlaceholderPage title="Email Swipes" /></ProtectedRoute>} />
      <Route path="/passup-visualiser" element={<ProtectedRoute><PlaceholderPage title="Pass-Up Visualiser" /></ProtectedRoute>} />
      <Route path="/courses/commissions" element={<ProtectedRoute><PlaceholderPage title="My Network" /></ProtectedRoute>} />
      <Route path="/courses/how-it-works" element={<ProtectedRoute><PlaceholderPage title="How Commissions Work" /></ProtectedRoute>} />
      <Route path="/compensation-plan" element={<ProtectedRoute><PlaceholderPage title="Compensation Plan" /></ProtectedRoute>} />
      <Route path="/ad-board" element={<ProtectedRoute><PlaceholderPage title="Ad Board" /></ProtectedRoute>} />

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
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
