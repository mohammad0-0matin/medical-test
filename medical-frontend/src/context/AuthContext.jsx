import { createContext, useState } from 'react';

/**
 * Authentication context exposing `{ token, login, logout }`.
 *
 * The `token` value mirrors the persisted access token; consumers treat a
 * falsy value as "signed out" (see ProtectedRoute).
 */

// eslint-disable-next-line react-refresh/only-export-components -- Context object must live beside its provider; consumers import both from here.
export const AuthContext = createContext();

/**
 * Provides JWT-backed authentication state to the whole app.
 *
 * State is seeded lazily from localStorage so sessions survive reloads.
 * Token persistence here is deliberately local-only — refresh handling is
 * delegated to callers that issue API requests.
 *
 * @param {{children: import('react').ReactNode}} props - Wrapped subtree.
 * @returns {JSX.Element} Context provider element.
 */
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('access_token'));

  /**
   * Persists both JWTs locally and publishes the new access token.
   * Local-only persistence by design — refresh handling belongs to callers.
   *
   * @param {string} access - Fresh access JWT.
   * @param {string} refresh - Matching refresh JWT.
   * @returns {void}
   */
  const login = (access, refresh) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setToken(access);
  };

  /** Clears both stored JWTs and resets the context to signed-out state.
   * @returns {void}
   */
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};