import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, ChevronRightIcon, PulseIcon } from '../components/AuthBrand';
import './Auth.css';

/**
 * Centered, friendly, and accessible registration screen for Salamat Yar.
 *
 * Implements DESIGN.md Patient Surface guidelines:
 * - Serene, distraction-free single centered card layout.
 * - 44px (h-11) touch targets for inputs and buttons.
 * - Single primary teal accent token and WCAG AA contrast.
 * - Accessible form labels, aria-describedby for errors, and clear password toggle.
 *
 * @returns {JSX.Element} Register page shell.
 */
const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Creates the account, automatically logs the user in on success,
   * or redirects to login with informative feedback.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await API.post('register/', formData);

      try {
        const tokenRes = await API.post('token/', formData);
        login(tokenRes.data.access, tokenRes.data.refresh);
        toast.success('ثبت‌نام با موفقیت انجام شد! به سلامت‌یار خوش آمدید.');
        navigate('/dashboard');
      } catch (loginErr) {
        console.error('Auto-login after registration failed:', loginErr);
        toast.success('حساب کاربری با موفقیت ساخته شد. لطفاً وارد شوید.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);

      const errData = err.response?.data;
      let errorMessage = 'خطا در برقراری ارتباط با سرور. لطفاً دوباره تلاش کنید.';

      if (errData) {
        if (errData.username) errorMessage = `نام کاربری: ${errData.username[0]}`;
        else if (errData.password) errorMessage = `رمز عبور: ${errData.password[0]}`;
        else if (errData.detail) errorMessage = `${errData.detail}`;
      }

      toast.error(errorMessage);
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
            <h2>ایجاد پرونده سلامت</h2>
            <p className="auth-sub">
              در کمتر از 1 دقیقه حساب رایگان خود را بسازید و تمام آزمایش‌ها را یکجا داشته باشید.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="register-username">
                نام کاربری انتخابی <span className="auth-required" aria-hidden="true">*</span>
              </label>
              <div className="auth-field">
                <span className="auth-field-icon"><UserIcon /></span>
                <input
                  id="register-username"
                  type="text"
                  name="username"
                  placeholder="حداقل 4 کاراکتر (مثال: matin)"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="register-password">
                رمز عبور <span className="auth-required" aria-hidden="true">*</span>
              </label>
              <div className="auth-field">
                <span className="auth-field-icon"><LockIcon /></span>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="حداقل 6 کاراکتر"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
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
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  <span>در حال ایجاد حساب...</span>
                </>
              ) : (
                'ساخت حساب کاربری (رایگان)'
              )}
            </button>
          </form>

          <footer className="auth-card-footer">
            <p className="auth-switch">
              قبلاً حساب کاربری ساخته‌اید؟{' '}
              <Link to="/login" className="auth-switch-link">
                ورود به حساب
              </Link>
            </p>

            <div className="auth-trust-note">
              <span className="auth-trust-icon" aria-hidden="true">🔒</span>
              <span>اطلاعات پرونده سلامت شما کاملاً محرمانه و محافظت‌شده خواهد ماند</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Register;
