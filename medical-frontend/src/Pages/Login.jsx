import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 👈 ۱. درخواست به سرور
      const response = await API.post('token/', { 
        username: username.trim(), 
        password: password.trim() 
      });
      
      // 👈 ۲. ارسال توکن‌ها به کانتکست برای ذخیره‌سازی
      login(response.data.access, response.data.refresh);
      
      // 👈 ۳. انتقال به داشبورد
      navigate('/dashboard');
    } catch (err) {
      setError('نام کاربری یا رمز عبور اشتباه است.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>ورود به سیستم</h2>
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        <p style={styles.footerText}>
          حساب کاربری ندارید؟ <Link to="/register" style={styles.link}>ثبت‌نام کنید</Link>
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

export default Login;