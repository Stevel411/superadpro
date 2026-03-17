import { createContext, useContext, useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) { setUser(null); setLoading(false); return null; }
        return res.json();
      })
      .then(data => { if (data && !data.error) { setUser(data); } setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  }, []);

  const logout = async () => {
    await fetch('/logout', { credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const data = await apiGet('/api/me');
      setUser(data);
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
