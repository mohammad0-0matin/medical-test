import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ارسال درخواست ثبت‌نام به بک‌اند
      await API.post('register/', formData);
      setLoading(false);
      alert('ثبت‌نام با موفقیت انجام شد! حالا می‌توانید وارد شوید.');
      navigate('/login'); // انتقال به صفحه ورود پس از ثبت‌نام
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        // نمایش خطاهای بک‌اند (مثلاً نام کاربری تکراری)
        const firstError = Object.values(err.response.data)[0];
        setError(Array.isArray(firstError) ? firstError[0] : 'خطا در ثبت‌نام');
      } else {
        setError('خطا در ارتباط با سرور.');
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>ثبت‌نام در سیستم</h2>
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            name="username"
            placeholder="نام کاربری"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
            required
          />
          <input
            type="text"
            name="first_name"
            placeholder="نام (اختیاری)"
            value={formData.first_name}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="text"
            name="last_name"
            placeholder="نام خانوادگی (اختیاری)"
            value={formData.last_name}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="password"
            name="password"
            placeholder="رمز عبور"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            required
          />
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'در حال ثبت‌نام...' : 'ایجاد حساب کاربری'}
          </button>
        </form>

        <p style={styles.footerText}>
          از قبل حساب دارید؟ <Link to="/login" style={styles.link}>وارد شوید</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', direction: 'rtl', fontFamily: 'Tahoma, Arial, sans-serif' },
  card: { backgroundColor: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' },
  title: { textAlign: 'center', marginBottom: '1.5rem', color: '#1f2937', fontSize: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: { padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem' },
  button: { padding: '0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' },
  error: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' },
  footerText: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#4b5563' },
  link: { color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }
};

export default Register;