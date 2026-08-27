import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { toast } from 'react-toastify';
import AuthBrand, { UserIcon, LockIcon, EyeIcon, EyeOffIcon, ChevronRightIcon } from '../components/AuthBrand';
import './Auth.css';

/**
 * Registration page — mirrors the login layout and creates an account
 * through POST `/register/`.
 *
 * Server-side DRF validation errors are mapped field-by-field (username /
 * password / generic detail) onto an error toast. Success shows a welcome
 * toast and defers navigation to `/login` by 2 seconds so the confirmation
 * stays visible.
 *
 * @returns {JSX.Element} Full-page registration layout.
 */
const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Creates the account, maps DRF field errors onto the toast (username /
   * password / detail precedence) and schedules the login redirect.
   */
  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        await API.post('register/', formData);

        toast.success('🎉 ثبت‌نام با موفقیت انجام شد! حالا می‌توانید وارد شوید.');

        setTimeout(() => {
          navigate('/login');
        }, 2000);

      } catch (err) {
        setLoading(false);

        const errData = err.response?.data;
        let errorMessage = '❌ خطا در ارتباط با سرور.';

        if (errData) {
            if (errData.username) errorMessage = `❌ نام کاربری: ${errData.username[0]}`;
            else if (errData.password) errorMessage = `❌ رمز عبور: ${errData.password[0]}`;
            else if (errData.detail) errorMessage = `❌ ${errData.detail}`;
        }

        toast.error(errorMessage);
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
            <h2>ثبت‌نام سریع</h2>
            <p className="auth-sub">در چند ثانیه حساب بسازید و مدیریت پرونده سلامت را شروع کنید.</p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label" htmlFor="register-username">نام کاربری</label>
            <div className="auth-field">
              <span className="auth-field-icon"><UserIcon /></span>
              <input
                id="register-username"
                type="text"
                name="username"
                placeholder="نام کاربری"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>

            <label className="auth-label" htmlFor="register-password">رمز عبور</label>
            <div className="auth-field">
              <span className="auth-field-icon"><LockIcon /></span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="رمز عبور"
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

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (<><span className="auth-spinner" />در حال ثبت‌نام...</>) : 'ایجاد حساب کاربری'}
            </button>
          </form>

          <p className="auth-switch">
            از قبل حساب دارید؟ <Link to="/login">وارد شوید</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;
