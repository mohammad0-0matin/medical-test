import { Link, useNavigate } from 'react-router-dom';
import PrescriptionForm from '../components/PrescriptionForm';
import '../components/Prescriptions.css';

/**
 * Page for creating a new prescription.
 */
const PrescriptionNewPage = () => {
  const navigate = useNavigate();

  return (
    <div className="rx-container" dir="rtl">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/prescriptions" className="rx-btn rx-btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>
          ← بازگشت به لیست نسخه‌ها
        </Link>
      </div>

      <PrescriptionForm onSuccess={() => navigate('/prescriptions')} />
    </div>
  );
};

export default PrescriptionNewPage;
