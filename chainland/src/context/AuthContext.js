'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import socket from '@/lib/socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user?.lin || user?.id) {
      const identifier = user.lin || user.id;
      const room = `user_${identifier}`;
      socket.emit('join', room);
      
      // Fetch initial notifications
      fetch(`http://localhost:5001/api/notifications?userLin=${identifier}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setNotifications(data.data);
          }
        })
        .catch(console.error);
      
      const handleNotification = (notif) => {
        setNotifications(prev => [notif, ...prev]);
      };

      socket.on('new_notification', handleNotification);
      return () => {
        socket.off('new_notification', handleNotification);
      };
    }
  }, [user]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('chainland_user') : null;
    if (saved) setUser(JSON.parse(saved));
    const savedLang = typeof window !== 'undefined' ? localStorage.getItem('chainland_lang') : null;
    if (savedLang) setLang(savedLang);
    setLoading(false);
  }, []);

  const loginOfficer = async (id, password) => {
    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password, type: 'officer' })
      });
      const data = await res.json();
      if (data.success) {
        const u = { ...data.user, role: 'officer' };
        setUser(u);
        localStorage.setItem('chainland_user', JSON.stringify(u));
        return true;
      }
    } catch (e) {
      console.error('Login error', e);
    }
    return false;
  };

  const loginCitizen = async (lin, password) => {
    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lin, password, type: 'citizen' })
      });
      const data = await res.json();
      if (data.success) {
        const u = { ...data.user, role: 'citizen' };
        setUser(u);
        localStorage.setItem('chainland_user', JSON.stringify(u));
        return true;
      }
    } catch (e) {
      console.error('Login error', e);
    }
    return false;
  };

  const logout = () => { setUser(null); localStorage.removeItem('chainland_user'); };
  const toggleLang = () => { const n = lang === 'en' ? 'np' : 'en'; setLang(n); localStorage.setItem('chainland_lang', n); };
  const t = (en, np) => lang === 'np' ? np : en;

  return (
    <AuthContext.Provider value={{ 
      user, lang, loading, notifications, 
      setNotifications, loginOfficer, loginCitizen, logout, toggleLang, t 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
