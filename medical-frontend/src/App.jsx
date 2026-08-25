import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import HomePage from './Pages/HomePage';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Dashboard from './Pages/Dashboard';
import EmergencyPassView from './Pages/EmergencyPassView';
import ProtectedRoute from './components/ProtectedRoute';

import './theme.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
            style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
          />

          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pass/:token" element={<EmergencyPassView />} />
          <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;