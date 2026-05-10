import { createContext, useContext, useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    var done = false;
    console.log('[Auth] Checking /api/me...');
    fetch('/api/me', { credentials: 'include' })
      .then(function(res) {
        console.log('[Auth] /api/me status:', res.status);
        if (!res.ok) { if (!done) { done=true; console.log('[Auth] Not authenticated, status:', res.status); setUser(null); setLoading(false); } return null; }
        return res.json();
      })
      .then(function(data) {
        if (done) return;
        done = true;
        console.log('[Auth] User data:', data ? 'id='+data.id+' active='+data.is_active : 'null');
        if (data && data.id) { setUser(data); } else { setUser(null); }
        setLoading(false);
      })
      .catch(function(e) { console.error('[Auth] Error:', e); if (!done) { done=true; setUser(null); setLoading(false); } });
  }, []);

  const logout = async () => {
    await fetch('/logout', { credentials: 'include' });
    setUser(null);
    // Redirect to public homepage, not login. Logout shouldn't push the
    // member toward re-authentication — they should land on the marketing
    // homepage where they can browse, share with others, or simply leave.
    // The backend /logout already redirects to / for direct browser hits;
    // this matches that behaviour for the React-fetch case. (Steve flagged
    // this as a sales funnel leak on launch day, 10 May 2026.)
    window.location.href = '/';
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.ok) { const data = await res.json(); if (data && data.id) setUser(data); else setUser(null); }
      else setUser(null);
    } catch { setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
