import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem('app_lang') || 'hi');
  const [theme, setThemeState] = useState(() => localStorage.getItem('app_theme') || 'cyber');
  const [vfx, setVfxState] = useState(() => {
    const val = localStorage.getItem('app_vfx');
    return val === null ? true : val === 'true';
  });

  const setLanguage = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const setVfx = (newVfx) => {
    setVfxState(newVfx);
    localStorage.setItem('app_vfx', String(newVfx));
  };

  useEffect(() => {
    // Apply theme class to root body element
    document.body.classList.remove('theme-cyber', 'theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);

    // Apply VFX animation toggle class
    if (!vfx) {
      document.body.classList.add('disable-vfx');
    } else {
      document.body.classList.remove('disable-vfx');
    }
  }, [theme, vfx]);

  return (
    <SettingsContext.Provider value={{ lang, setLanguage, theme, setTheme, vfx, setVfx }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
