import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export const THEME_STORAGE_KEY = 'theme';

export const resolveInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (e) {
    return 'light';
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const applyThemeToDocument = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
