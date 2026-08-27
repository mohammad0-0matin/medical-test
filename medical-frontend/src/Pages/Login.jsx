import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import AuthBrand, { UserIcon, LockIcon, EyeIcon, EyeOffIcon, ChevronRightIcon } from '../components/AuthBrand';
import './Auth.css';

/**
 * Login page — split-screen layout with brand panel and credentials form.
 *
 * Submit flow: POST `/token/` → persist the JWT pair via {@link login} from
 * AuthContext → navigate to `/dashboard`. Any failure clears the spinner,
 * shows a generic Persian error inline and keeps the form mounted.
 *
 * @returns {JSX.Element} Full-page login layout.
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
   * Requests the JWT pair from `/token/`, stores it through the auth context
   * and redirects to the dashboard; failures surface as a generic error.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1) Request tokens from the server
      const response = await API.post('token/', {
        username: username.trim(),
        password: password.trim()
      });

      // 2) Store tokens in the auth context
      login(response.data.access, response.data.refresh);

      // 3) Navigate to the dashboard
      navigate('/dashboard');
    } catch {
      setError('نام کاربری یا رمز عبور اشتباه است.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBrand />

      <main className="auth-form-side">
        <div className="auth-card">
          <Link to="/" className="auth-back">
            <ChevronRightIcon />
            بازگشت به خانه
          </Link>

          <header className="auth-head">
            <h2>ورود به سیستم</h2>
            <p className="auth-sub">برای مشاهده داشبورد آزمایش‌های خود، وارد حساب کاربری شوید.</p>
          </header>

          {error && (
            <div className="auth-error" role="alert">⚠️ {error}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label" htmlFor="login-username">نام کاربری</label>
            <div className="auth-field">
              <span className="auth-field-icon"><UserIcon /></span>
              <input
                id="login-username"
                type="text"
                placeholder="نام کاربری"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <label className="auth-label" htmlFor="login-password">رمز عبور</label>
            <div className="auth-field">
              <span className="auth-field-icon"><LockIcon /></span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
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

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (<><span className="auth-spinner" />در حال ورود...</>) : 'ورود'}
            </button>
          </form>

          <p className="auth-switch">
            حساب کاربری ندارید؟ <Link to="/register">ثبت‌نام کنید</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
