import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import HealthCard from '../components/HealthCard';
import CompleteProfileModal from '../components/CompleteProfileModal';
import TemporaryAccessModal from '../components/TemporaryAccessModal';
import Skeleton from '../components/Skeleton';
import { toast } from 'react-toastify';
import './HealthCardPage.css';

/**
 * Dedicated Digital Health Card & Identity Workspace (route `/health-card`).
 *
 * Implements the user's request for a dedicated page for the Smart Health Card (کارت سلامت هوشیار):
 * - Prominent 3D metallic Smart Health Card with EMV chip, NFC, QR, and Holographic Seal
 * - Complete clinical identity details (National ID, Insurance, Blood Group, Role)
 * - Emergency medical profile (Conditions, Allergies, Emergency Contacts)
 * - Family member card switcher (inspect health cards of dependents/children)
 * - One-click Emergency Access issuer (PIN + QR code for attending doctors)
 *
 * @returns {JSX.Element} Dedicated Health Card page.
 */
const HealthCardPage = () => {
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('self');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTempAccessOpen, setIsTempAccessOpen] = useState(false);

  const refetchProfile = async () => {
    try {
      const res = await API.get('patients/me/');
      setProfile(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchCardData = async () => {
      try {
        const [profileRes, depsRes] = await Promise.all([
          API.get('patients/me/'),
          API.get('access/dependents/').catch(() => ({ data: [] })),
        ]);
        if (!ignore) {
          setProfile(profileRes.data);
          setDependents(depsRes.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 401) {
            if (logout) logout();
            navigate('/login');
            return;
          }
          toast.error('خطا در بارگذاری اطلاعات کارت سلامت.');
          setLoading(false);
        }
      }
    };

    fetchCardData();
    return () => {
      ignore = true;
    };
  }, [logout, navigate]);

  // Determine current active person on the card
  const activePersonData = () => {
    if (selectedPerson === 'self' || !selectedPerson) {
      return {
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        nationalCode: profile?.national_code || '',
        insuranceProvider: profile?.insurance_provider || 'none',
        medicalRole: profile?.medical_role || 'standard',
        medicalId: profile?.medical_system_code || profile?.staff_id || '',
        bloodType: profile?.blood_type || 'نامشخص',
        conditions: profile?.chronic_conditions || 'ثبت نشده',
        allergies: profile?.allergies || 'ثبت نشده',
        emergencyContact: profile?.emergency_contact || 'ثبت نشده',
        isSelf: true,
      };
    }

    const dep = dependents.find((d) => String(d.id) === String(selectedPerson) || String(d.target_national_code) === String(selectedPerson));
    if (!dep) return { firstName: '', lastName: '', nationalCode: '', isSelf: false };

    return {
      firstName: dep.target_user_name || 'عضو خانواده',
      lastName: '',
      nationalCode: dep.target_national_code || '',
      insuranceProvider: 'none',
      medicalRole: 'standard',
      medicalId: '',
      bloodType: 'نامشخص',
      conditions: 'تحت مراقبت',
      allergies: 'ثبت نشده',
      emergencyContact: profile?.phone_number || 'ثبت نشده',
      isSelf: false,
    };
  };

  const activeCard = activePersonData();

  return (
    <div className="hcp-page" dir="rtl">
      {/* 1. Header */}
      <header className="hcp-header">
        <div className="hcp-header-info">
          <div className="hcp-title-row">
            <span className="hcp-badge-icon" aria-hidden="true">🪪</span>
            <h1>کارت هوشمند سلامت (کارت سلامت هوشیار)</h1>
          </div>
          <p className="hcp-header-sub">
            شناسنامه دیجیتال سلامت، احراز اصالت بالینی و کارت دسترسی سریع در شرایط اورژانسی
          </p>
        </div>

        <div className="hcp-header-actions">
          <button
            type="button"
            className="hcp-btn hcp-btn-emergency"
            onClick={() => setIsTempAccessOpen(true)}
            title="صدور کد و رمز دسترسی اضطراری برای پزشک"
          >
            <span>⚡</span>
            <span>صدور دسترسی اضطراری پزشک</span>
          </button>

          <button
            type="button"
            className="hcp-btn hcp-btn-outline"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <span>✏️</span>
            <span>ویرایش مشخصات پرونده</span>
          </button>
        </div>
      </header>

      {/* 2. Family Switcher (if dependents exist) */}
      {dependents.length > 0 && (
        <nav className="hcp-family-bar" aria-label="انتخاب عضو خانواده برای مشاهده کارت">
          <span className="hcp-family-label">مشاهده کارت سلامت:</span>
          <button
            type="button"
            className={`hcp-family-chip ${selectedPerson === 'self' ? 'active' : ''}`}
            onClick={() => setSelectedPerson('self')}
          >
            👤 پرونده شخصی خودم ({profile?.first_name || user?.username || 'من'})
          </button>
          {dependents.map((dep) => (
            <button
              type="button"
              key={dep.id}
              className={`hcp-family-chip ${selectedPerson === String(dep.id) ? 'active' : ''}`}
              onClick={() => setSelectedPerson(String(dep.id))}
            >
              👥 {dep.target_user_name || dep.target_national_code}
            </button>
          ))}
        </nav>
      )}

      {/* 3. Main Workspace: 3D HealthCard + Identity Details */}
      <main className="hcp-workspace">
        {loading ? (
          <div className="hcp-loading-scene">
            <Skeleton variant="rounded" height={220} width="100%" style={{ maxWidth: '460px', margin: '0 auto 24px' }} />
            <Skeleton variant="rounded" height={160} width="100%" />
          </div>
        ) : (
          <div className="hcp-grid">
            {/* Column A: Prominent 3D Smart Health Card */}
            <section className="hcp-card-showcase">
              <div className="hcp-card-frame">
                <HealthCard
                  firstName={activeCard.firstName}
                  lastName={activeCard.lastName}
                  nationalCode={activeCard.nationalCode}
                  insuranceProvider={activeCard.insuranceProvider}
                  medicalRole={activeCard.medicalRole}
                  medicalId={activeCard.medicalId}
                  onOpenEmergencyPass={() => setIsTempAccessOpen(true)}
                />
              </div>

              <div className="hcp-card-hints">
                <span className="hcp-hint-item">
                  <span>💡</span> با تکان دادن ماوس روی کارت، زاویه نور و هولوگرام امنیتی سه‌بعدی را مشاهده کنید.
                </span>
                <span className="hcp-hint-item">
                  <span>🔒</span> برای حفظ حریم خصوصی، ارقام پایانی کد ملی به صورت پیش‌فرض پوشانده شده‌اند.
                </span>
              </div>
            </section>

            {/* Column B: Detailed Clinical Identity & Emergency Data */}
            <section className="hcp-details-panel">
              <div className="hcp-info-card">
                <header className="hcp-card-head">
                  <span className="hcp-icon">📋</span>
                  <h2>مشخصات هویتی و بالینی پرونده</h2>
                </header>

                <div className="hcp-data-grid">
                  <div className="hcp-data-item">
                    <span className="hcp-data-label">نام و نام خانوادگی</span>
                    <strong className="hcp-data-value">
                      {[activeCard.firstName, activeCard.lastName].filter(Boolean).join(' ') || 'کاربر سلامت‌یار'}
                    </strong>
                  </div>

                  <div className="hcp-data-item">
                    <span className="hcp-data-label">کد ملی</span>
                    <strong className="hcp-data-value" dir="ltr">
                      {activeCard.nationalCode || 'ثبت نشده'}
                    </strong>
                  </div>

                  <div className="hcp-data-item">
                    <span className="hcp-data-label">نقش در سامانه</span>
                    <strong className="hcp-data-value">
                      {activeCard.medicalRole === 'doctor'
                        ? '👨‍⚕️ پزشک معالج'
                        : activeCard.medicalRole === 'staff'
                        ? '🏥 کادر درمان'
                        : '👤 بیمار / کاربر استاندارد'}
                    </strong>
                  </div>

                  {activeCard.medicalId && (
                    <div className="hcp-data-item">
                      <span className="hcp-data-label">شماره نظام پزشکی</span>
                      <strong className="hcp-data-value" dir="ltr">
                        {activeCard.medicalId}
                      </strong>
                    </div>
                  )}

                  <div className="hcp-data-item">
                    <span className="hcp-data-label">بیمه پایه سلامت</span>
                    <strong className="hcp-data-value">
                      {activeCard.insuranceProvider !== 'none'
                        ? activeCard.insuranceProvider
                        : 'بدون بیمه یا ثبت نشده'}
                    </strong>
                  </div>

                  <div className="hcp-data-item">
                    <span className="hcp-data-label">گروه خونی</span>
                    <strong className="hcp-data-value text-primary">
                      {activeCard.bloodType}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Emergency Health & Care Panel */}
              <div className="hcp-info-card hcp-emergency-card">
                <header className="hcp-card-head">
                  <span className="hcp-icon">🚨</span>
                  <h2>اطلاعات اضطراری و حساس پزشکی</h2>
                </header>

                <div className="hcp-emergency-rows">
                  <div className="hcp-emergency-item">
                    <span className="hcp-emergency-title">بیماری‌های زمینه‌ای:</span>
                    <p className="hcp-emergency-desc">{activeCard.conditions}</p>
                  </div>

                  <div className="hcp-emergency-item">
                    <span className="hcp-emergency-title">حساسیت‌ها و آلرژی‌های دارویی:</span>
                    <p className="hcp-emergency-desc">{activeCard.allergies}</p>
                  </div>

                  <div className="hcp-emergency-item">
                    <span className="hcp-emergency-title">تماس در شرایط اضطراری:</span>
                    <p className="hcp-emergency-desc" dir="ltr">{activeCard.emergencyContact}</p>
                  </div>
                </div>

                <div className="hcp-emergency-footer">
                  <button
                    type="button"
                    className="hcp-btn hcp-btn-primary"
                    onClick={() => setIsTempAccessOpen(true)}
                  >
                    <span>⚡ صدور مجوز دسترسی پزشک (QR & PIN)</span>
                  </button>

                  <Link to="/access" className="hcp-link">
                    مدیریت دسترسی‌های دائم و پزشکان معالج ←
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Modals */}
      {isProfileModalOpen && (
        <CompleteProfileModal
          isOpen={isProfileModalOpen}
          initialData={profile}
          onClose={() => setIsProfileModalOpen(false)}
          onSuccess={() => {
            setIsProfileModalOpen(false);
            refetchProfile();
          }}
        />
      )}

      {isTempAccessOpen && (
        <TemporaryAccessModal
          isOpen={isTempAccessOpen}
          onClose={() => setIsTempAccessOpen(false)}
        />
      )}
    </div>
  );
};

export default HealthCardPage;
