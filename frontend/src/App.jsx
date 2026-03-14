import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Account from './pages/Account';
import Courses from './pages/Courses';
import AppLayout from './components/layout/AppLayout';

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
      {/* Protected internal pages */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
      <Route path="/courses/my-courses" element={<ProtectedRoute><PlaceholderPage title="My Courses" /></ProtectedRoute>} />
      <Route path="/courses/create" element={<ProtectedRoute><PlaceholderPage title="Create Course" /></ProtectedRoute>} />
      <Route path="/marketplace" element={<PlaceholderPage title="Marketplace" />} />
      <Route path="/campaign-tiers" element={<ProtectedRoute><PlaceholderPage title="Campaign Tiers" /></ProtectedRoute>} />
      <Route path="/campaign-studio" element={<ProtectedRoute><PlaceholderPage title="Campaign Studio" /></ProtectedRoute>} />
      <Route path="/affiliate" element={<ProtectedRoute><PlaceholderPage title="Social Share" /></ProtectedRoute>} />
      <Route path="/linkhub" element={<ProtectedRoute><PlaceholderPage title="LinkHub Editor" /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><PlaceholderPage title="Analytics" /></ProtectedRoute>} />
      <Route path="/video-library" element={<ProtectedRoute><PlaceholderPage title="My Campaigns" /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><PlaceholderPage title="Leaderboard" /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><PlaceholderPage title="Achievements" /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><PlaceholderPage title="Support" /></ProtectedRoute>} />

      {/* Catch-all — redirect to dashboard for authenticated users */}
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
