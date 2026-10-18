import { useContext } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './AppLayout.css';

/**
 * Prominent Architectural Door & Exit Arrow Icon.
 */
const ExitDoorIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="app-logout-icon"
    aria-hidden="true"
  >
    {/* Door Frame & Threshold */}
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
    {/* Open Door Leaf in Perspective */}
    <path d="M14 5l-6 2v12l6 2V5z" />
    {/* Door Knob */}
    <circle cx="10" cy="13" r="1" fill="currentColor" />
    {/* Directional Exit Arrow */}
    <path d="M18 10l3 3-3 3" />
    <path d="M14 13h7" />
  </svg>
);

/**
 * Unified Authenticated App Layout.
 *
 * Provides a consistent shell for all authenticated views:
 * - Brand header with logo and Salamat-Yar title
 * - Global navigation tabs:
 *   - پیشخوان (Dashboard overview)
 *   - آزمایش‌ها (Dedicated lab tests dashboard)
 *   - نسخه‌های پزشک (Dedicated prescriptions dashboard)
 *   - کارت سلامت هوشیار (Digital health identity & emergency card)
 *   - دسترسی‌ها (Doctor and family access management)
 *   - تقویم و یادآورها (Checkups & pill reminders)
 * - Dark/Light Theme toggle
 * - User status and logout button
 * - Mobile bottom tab bar for thumb-friendly navigation
 */
const AppLayout = ({ children }) => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  const username = user?.username || 'کاربر';

  return (
    <div className="app-shell" dir="rtl">
      {/* Top Header */}
      <header className="app-header" role="banner">
        <div className="app-header-inner">
          {/* Logo & Brand */}
          <Link to="/dashboard" className="app-brand" aria-label="سلامت‌یار - پیشخوان اصلی">
            <div className="app-brand-icon" aria-hidden="true">
              🩺
            </div>
            <span>سلامت‌یار</span>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="app-nav-tabs" aria-label="ناوبری اصلی سامانه">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `app-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden="true">📊</span>
              <span>پیشخوان</span>
            </NavLink>
            <NavLink
              to="/tests"
              className={({ isActive }) => `app-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden="true">🧪</span>
              <span>آزمایش‌ها</span>
            </NavLink>
            <NavLink
              to="/prescriptions"
              className={({ isActive }) => `app-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden="true">💊</span>
              <span>نسخه‌های پزشک</span>
            </NavLink>
            <NavLink
              to="/health-card"
              className={({ isActive }) => `app-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden="true">🪪</span>
              <span>کارت سلامت</span>
            </NavLink>
            <NavLink
              to="/access"
              className={({ isActive }) => `app-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden="true">👥</span>
              <span>دسترسی‌ها</span>
            </NavLink>
            <NavLink
              to="/reminders"
              className={({ isActive }) => `app-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden="true">📅</span>
              <span>تقویم</span>
            </NavLink>
          </nav>

          {/* Right Actions: Theme Toggle & Logout */}
          <div className="app-header-actions">
            <ThemeToggle />
            <button
              type="button"
              className="app-logout-btn"
              onClick={handleLogout}
              title={`خروج از حساب (${username})`}
              aria-label="خروج از حساب کاربری"
            >
              <ExitDoorIcon />
              <span className="app-logout-text">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main" role="main">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="app-mobile-nav" aria-label="ناوبری موبایل">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `app-mobile-tab ${isActive ? 'active' : ''}`}
        >
          <span className="app-mobile-tab-icon" aria-hidden="true">📊</span>
          <span>پیشخوان</span>
        </NavLink>
        <NavLink
          to="/tests"
          className={({ isActive }) => `app-mobile-tab ${isActive ? 'active' : ''}`}
        >
          <span className="app-mobile-tab-icon" aria-hidden="true">🧪</span>
          <span>آزمایش‌ها</span>
        </NavLink>
        <NavLink
          to="/prescriptions"
          className={({ isActive }) => `app-mobile-tab ${isActive ? 'active' : ''}`}
        >
          <span className="app-mobile-tab-icon" aria-hidden="true">💊</span>
          <span>نسخه‌ها</span>
        </NavLink>
        <NavLink
          to="/health-card"
          className={({ isActive }) => `app-mobile-tab ${isActive ? 'active' : ''}`}
        >
          <span className="app-mobile-tab-icon" aria-hidden="true">🪪</span>
          <span>کارت سلامت</span>
        </NavLink>
        <NavLink
          to="/access"
          className={({ isActive }) => `app-mobile-tab ${isActive ? 'active' : ''}`}
        >
          <span className="app-mobile-tab-icon" aria-hidden="true">👥</span>
          <span>دسترسی‌ها</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default AppLayout;
