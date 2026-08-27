import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Theme context exposing `{ theme, toggleTheme }`.
 * Defaults exist so consumers render safely even without a provider.
 */
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

/** localStorage key persisting the user's explicit choice ('light' | 'dark'). */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Resolves the initial theme with clear precedence:
 * stored user choice → OS color-scheme preference → `'light'`.
 * All storage access is guarded so private-mode / blocked storage falls back cleanly.
 *
 * @returns {'light'|'dark'} Theme to bootstrap with.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Pure helper intentionally co-located with the theme provider (single-source theme logic).
export const resolveInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    return 'light';
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

/**
 * Applies a theme value to the document root via the `data-theme` attribute,
 * which drives every CSS variable in `theme.css`.
 *
 * @param {'light'|'dark'} theme - Theme to activate.
 * @returns {void}
 */
// eslint-disable-next-line react-refresh/only-export-components -- DOM side-effect helper kept next to its provider on purpose.
export const applyThemeToDocument = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

/**
 * Owns the active theme state.
 *
 * Initialized lazily through {@link resolveInitialTheme}; an effect keeps the
 * `data-theme` attribute in sync and persists each change back to localStorage,
 * ignoring write failures (quota, privacy mode) so theming never crashes UX.
 *
 * @param {{children: import('react').ReactNode}} props - Wrapped subtree.
 * @returns {JSX.Element} Context provider element.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  /** Flips between light/dark using a functional updater to avoid stale state. */
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Shortcut hook exposing `{ theme, toggleTheme }` from {@link ThemeContext}.
 *
 * @returns {{theme: 'light'|'dark', toggleTheme: Function}} Theme state and toggle action.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Custom hook exported alongside the provider it reads from.
export const useTheme = () => useContext(ThemeContext);
