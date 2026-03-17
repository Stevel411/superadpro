import { createContext, useContext, useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    var done = false;
    fetch('/api/me', { credentials: 'include' })
      .then(function(res) {
        if (!res.ok) { if (!done) { done=true; setUser(null); setLoading(false); } return null; }
        return res.json();
      })
      .then(function(data) {
        if (done) return;
        done = true;
        if (data && data.id) { setUser(data); } else { setUser(null); }
        setLoading(false);
      })
      .catch(function() { if (!done) { done=true; setUser(null); setLoading(false); } });
  }, []);

  const logout = async () => {
    await fetch('/logout', { credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
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
