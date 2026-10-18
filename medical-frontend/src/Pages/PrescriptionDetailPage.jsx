import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPrescriptionByUuid } from '../api/prescriptionApi';
import PrescriptionForm from '../components/PrescriptionForm';
import PrintablePrescription from '../components/PrintablePrescription';
import '../components/Prescriptions.css';

/**
 * Detail and Edit page for a single prescription.
 * Uses the prescription public UUID from the route parameter.
 */
const PrescriptionDetailPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPrescriptionByUuid(uuid);
        if (isMounted) setPrescription(data);
      } catch {
        if (isMounted) setError('نسخه مورد نظر یافت نشد یا شما دسترسی به آن ندارید.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [uuid]);

  if (loading) {
    return (
      <div className="rx-container" dir="rtl">
        <div className="rx-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="rx-skeleton" style={{ height: '32px', width: '40%', margin: '0 auto 16px' }} />
          <div className="rx-skeleton" style={{ height: '180px', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="rx-container" dir="rtl">
        <div className="rx-state-box" role="alert">
          <div className="rx-state-icon">⚠️</div>
          <h3 className="rx-state-title">عدم یافتن نسخه</h3>
          <p className="rx-state-desc">{error || 'اطلاعات نسخه در دسترس نیست.'}</p>
          <Link to="/prescriptions" className="rx-btn rx-btn-secondary">
            بازگشت به لیست نسخه‌ها
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rx-container" dir="rtl">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/prescriptions" className="rx-btn rx-btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>
          ← بازگشت به لیست نسخه‌ها
        </Link>
        <PrintablePrescription prescription={prescription} />
      </div>

      <PrescriptionForm
        initialData={prescription}
        isEdit={true}
        onSuccess={() => navigate('/prescriptions')}
      />
    </div>
  );
};

export default PrescriptionDetailPage;
