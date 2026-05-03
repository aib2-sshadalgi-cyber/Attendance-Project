import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { api, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'attendance_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      setAuthToken(null);
      return;
    }
    let cancelled = false;
    setAuthToken(token);
    (async () => {
      try {
        const { data } = await api.get('/api/auth/me');
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          setToken(null);
          localStorage.removeItem(STORAGE_KEY);
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setAuthToken(data.token);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      isStudent: user?.role === 'student',
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
