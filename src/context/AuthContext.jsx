import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token') || null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  const login = useCallback((userData, token) => {
    setUser(userData);
    setAccessToken(token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    localStorage.setItem('access_token', token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
  }, []);

  // Client-side Idle Inactivity Auto-logout (10 minutes for Admin & Doctor)
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'doctor')) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert('Idle Timeout: You have been logged out due to 10 minutes of inactivity.');
        logout();
      }, 10 * 60 * 1000); // 10 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      login,
      logout,
      emergencyAlert,
      setEmergencyAlert
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
