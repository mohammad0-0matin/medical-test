import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { toast } from 'react-toastify';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>ثبت‌نام سریع</h2>
        
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
  form: { display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  input: { padding: '0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' },
  button: { padding: '0.85rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' },
  footerText: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: '#4b5563' },
  link: { color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }
};

export default Register;