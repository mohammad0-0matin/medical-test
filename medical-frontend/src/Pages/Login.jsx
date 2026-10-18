import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import ThemeToggle from '../components/ThemeToggle';
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, ChevronRightIcon, PulseIcon } from '../components/AuthBrand';
import './Auth.css';

/**
 * Centered, friendly, and accessible login screen for Salamat Yar.
 *
 * Implements DESIGN.md Patient Surface guidelines:
 * - Serene, distraction-free single centered card layout.
 * - 44px (h-11) touch targets for inputs and buttons.
 * - Single primary teal accent token and WCAG AA contrast.
 * - Accessible form labels, aria-describedby for errors, and clear password toggle.
 *
 * @returns {JSX.Element} Login page shell.
 */
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  /**
   * Requests JWT pair from `/token/`, stores it in AuthContext, and redirects to dashboard.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await API.post('token/', {
        username: username.trim(),
        password: password.trim(),
      });

      login(response.data.access, response.data.refresh);
      navigate('/dashboard');
    } catch {
      setError('نام کاربری یا رمز عبور اشتباه است. لطفاً دوباره بررسی کنید.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Top utility row: Return to home + Theme switch */}
        <div className="auth-topbar">
          <Link to="/" className="auth-back" aria-label="بازگشت به صفحه اصلی">
            <span className="auth-back-icon">
              <ChevronRightIcon />
            </span>
            <span>بازگشت به صفحه اصلی</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Centered Medical Card */}
        <main className="auth-card">
          <div className="auth-brand-badge">
            <Link to="/" className="auth-brand-logo-link" aria-label="سلامت‌یار — صفحه اصلی">
              <span className="auth-logo">
                <PulseIcon />
              </span>
              <span className="auth-brand-text">سلامت‌یار</span>
            </Link>
          </div>

          <header className="auth-head">
            <h2>ورود به پرونده سلامت</h2>
            <p className="auth-sub">
              برای مشاهده آزمایش‌ها و نسخه‌های خود، وارد حساب کاربری شوید.
            </p>
          </header>

          {error && (
            <div className="auth-error" role="alert" id="login-error-msg" aria-live="polite">
              <span className="auth-error-icon" aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-username">
                نام کاربری <span className="auth-required" aria-hidden="true">*</span>
              </label>
              <div className="auth-field">
                <span className="auth-field-icon"><UserIcon /></span>
                <input
                  id="login-username"
                  type="text"
                  placeholder="نام کاربری شما"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error-msg' : undefined}
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-password">
                رمز عبور <span className="auth-required" aria-hidden="true">*</span>
              </label>
              <div className="auth-field">
                <span className="auth-field-icon"><LockIcon /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="رمز عبور حساب"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error-msg' : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                  title={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  <span>در حال بررسی و ورود...</span>
                </>
              ) : (
                'ورود به حساب کاربری'
              )}
            </button>
          </form>

          <footer className="auth-card-footer">
            <p className="auth-switch">
              هنوز عضو سلامت‌یار نشده‌اید؟{' '}
              <Link to="/register" className="auth-switch-link">
                ثبت‌نام رایگان در 1 دقیقه
              </Link>
            </p>

            <div className="auth-trust-note">
              <span className="auth-trust-icon" aria-hidden="true">🔒</span>
              <span>دسترسی امن با حفاظت کامل از حریم خصوصی شما</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Login;
