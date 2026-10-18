import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import HomePage from './Pages/HomePage';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Dashboard from './Pages/Dashboard';
import TestsPage from './Pages/TestsPage';
import HealthCardPage from './Pages/HealthCardPage';
import EmergencyPassView from './Pages/EmergencyPassView';
import ProtectedRoute from './components/ProtectedRoute';

import PrescriptionList from './components/PrescriptionList';
import PrescriptionNewPage from './Pages/PrescriptionNewPage';
import PrescriptionDetailPage from './Pages/PrescriptionDetailPage';
import AccessManagementPage from './Pages/AccessManagementPage';
import RemindersPage from './Pages/RemindersPage';
import TestNewPage from './Pages/TestNewPage';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';

import './theme.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Root application shell.
 *
 * Wraps the router tree in ThemeProvider and AuthProvider, mounts the global
 * RTL toast container, and declares routes:
 * - Public: `/`, `/login`, `/register`, `/pass/:token` (emergency pass view)
 * - Authenticated:
 *   - `/dashboard` (Executive Health Overview)
 *   - `/tests` (Dedicated Lab Tests Dashboard)
 *   - `/tests/new` (Add New Test form)
 *   - `/prescriptions/*` (Prescriptions list, create, detail)
 *   - `/health-card` (Dedicated Smart Health Card & Profile)
 *   - `/access` (Access Management)
 *   - `/reminders` (Health Reminders & Calendar)
 *
 * @module App
 * @returns {JSX.Element} Provider-wrapped route table.
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer 
            position="bottom-right" 
            autoClose={3000} 
            rtl={true} 
            theme="colored" 
            style={{ fontFamily: 'var(--font-sans)' }}
          />

          <ErrorBoundary>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pass/:token" element={<EmergencyPassView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tests"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TestsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tests/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TestNewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/prescriptions"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PrescriptionList />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/prescriptions/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PrescriptionNewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/prescriptions/:uuid"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PrescriptionDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/health-card"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <HealthCardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/access"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AccessManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reminders"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RemindersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;