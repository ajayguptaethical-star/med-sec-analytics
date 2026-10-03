import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'DARK' | 'LIGHT' | 'ANIMATION' | 'VFX' | 'SYSTEM';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'DARK',
  setTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('medpulse_theme') as ThemeMode;
      return saved || 'DARK';
    }
    return 'DARK';
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('medpulse_theme', mode);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-animation', 'theme-vfx');

    if (theme === 'LIGHT') {
      root.classList.add('theme-light');
      document.body.style.background = '#f8fafc';
      document.body.style.color = '#0f172a';
    } else {
      document.body.style.background = 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090d16 100%)';
      document.body.style.color = '#f8fafc';
      if (theme === 'ANIMATION') root.classList.add('theme-animation');
      if (theme === 'VFX') root.classList.add('theme-vfx');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {theme === 'VFX' && <VFXMedicalParticleCanvas />}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// VFX Floating Medical Emojis Particle Canvas
const VFXMedicalParticleCanvas: React.FC = () => {
  const emojis = ['⚕️', '💊', '🩸', '🏥', '🔬', '🧪', '🩺', '⚡'];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-xl opacity-20 animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${3 + Math.random() * 4}s`,
            transform: `scale(${0.8 + Math.random() * 0.6})`
          }}
        >
          {emojis[i % emojis.length]}
        </div>
      ))}
    </div>
  );
};
