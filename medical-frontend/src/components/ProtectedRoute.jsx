import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Route guard used around authenticated routes.
 *
 * Renders children only when an access token exists in AuthContext;
 * otherwise redirects the visitor to `/login` with history replacement so
 * the guarded URL never lands in the back stack.
 *
 * @param {{children: import('react').ReactNode}} props - Subtree to protect.
 * @returns {JSX.Element} Children, or a redirect element when unauthenticated.
 */
const ProtectedRoute = ({ children }) => {
  const { token } = useContext(AuthContext);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;