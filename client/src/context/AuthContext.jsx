import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from '../api/index.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ultimatum_auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // Вхід: приймає відповідь сервера { token, user } з /auth/login або /auth/register
  const login = ({ token, user: u }) => {
    setToken(token);
    setUser({ login: u.login, role: u.role, name: u.name, clientId: u.clientId ?? null, masterId: u.masterId ?? null });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // Оновлення даних поточного користувача (напр. після редагування профілю)
  const updateUser = (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev));

  // Токен прострочився — розлогінюємо
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, []);

  // Сесію зі старої версії (без токена) скидаємо
  useEffect(() => {
    if (user && !localStorage.getItem('ultimatum_token')) logout();
    else if (user) api.me().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth має використовуватись всередині <AuthProvider>');
  return ctx;
}
