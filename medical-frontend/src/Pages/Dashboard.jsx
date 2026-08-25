import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import AddTestModal from '../components/AddTestModal';
import EditTestModal from '../components/EditTestModal';
import AttachmentModal from '../components/AttachmentModal';
import PatientChartModal from '../components/PatientChartModal';
import { toast } from 'react-toastify';
import CompleteProfileModal from '../components/CompleteProfileModal';

const Dashboard = () => {
  const { logout } = useContext(AuthContext);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [childNationalCode, setChildNationalCode] = useState('');
  const [pendingTests, setPendingTests] = useState([]);
  
  // استیت لیست افراد تحت تکفل من
  const [myDependents, setMyDependents] = useState([]);

  // تابع دریافت لیست
  const fetchMyDependents = async () => {
    try {
      const response = await API.get('access/dependents/');
      setMyDependents(response.data);
    } catch (error) {
      console.error("خطا در دریافت لیست افراد تحت تکفل:", error);
    }
  };
  // 👈 استیت لیست دسترسی‌های تایید شده
  const [grantedAccesses, setGrantedAccesses] = useState([]);

  // 👈 دریافت لیست کسانی که به پرونده من دسترسی دارند
  const fetchGrantedAccesses = async () => {
    try {
      const response = await API.get('access/granted/');
      setGrantedAccesses(response.data);
    } catch (error) {
      console.error("خطا در دریافت لیست دسترسی‌ها:", error);
    }
  };

  // 👈 لغو دسترسی یک شخص
  const handleRevokeAccess = async (id) => {
    if (!window.confirm("آیا از لغو دسترسی این شخص مطمئن هستید؟ او دیگر نمی‌تواند آزمایش‌های شما را ببیند.")) return;
    try {
      const res = await API.delete(`access/${id}/revoke/`);
      toast.success(res.data?.message || 'دسترسی با موفقیت لغو شد.');
      fetchGrantedAccesses(); // آپدیت کردن لیست
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در لغو دسترسی.');
    }
  };

  // 👈 استیت جدید برای صندوق پیامِ درخواست‌های دسترسی
  const [accessRequests, setAccessRequests] = useState([]);

  // 👈 تابع جدید برای دریافت لیست درخواست‌ها از بک‌اند
  const fetchAccessRequests = async () => {
    try {
      const response = await API.get('access/inbox/');
      setAccessRequests(response.data);
    } catch (error) {
      console.error("خطا در دریافت درخواست‌های دسترسی:", error);
    }
  };

  // 👈 تابع جدید برای تایید یا رد درخواست دسترسی
  const handleRespondAccess = async (id, actionType) => {
    try {
      const res = await API.post(`access/${id}/respond/`, { action: actionType });
      toast.success(res.data?.message || 'عملیات با موفقیت انجام شد.');
      fetchAccessRequests(); // آپدیت کردن صندوق پیام
      fetchTests(); // آپدیت کردن جدول آزمایش‌ها (چون ممکن است آزمایش‌های جدیدی اضافه شده باشد)
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ثبت پاسخ.');
    }
  };

  // 👈 تغییر تابع قبلی: حالا به جای ثبت مستقیم، درخواست می‌فرستد
  const handleAddDependent = async (e) => {
    e.preventDefault();
    if (!childNationalCode) return;
    try {
      const res = await API.post('access/request/', { national_code: childNationalCode });
      toast.success(res.data?.message || 'درخواست با موفقیت ارسال شد.');
      setChildNationalCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ارسال درخواست');
    }
  };
  const fetchPendingTests = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/test-results/inbox/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingTests(data);
      }
    } catch (error) {
      console.error("خطا در دریافت صندوق پیام:", error);
    }
  };

  const handleReviewTest = async (testId, actionType) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/test-results/${testId}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: actionType })
      });

      if (response.ok) {
        toast.success(actionType === 'approve' ? '✅ آزمایش تایید و به پرونده اضافه شد.' : '❌ آزمایش رد و حذف شد.');
        fetchPendingTests(); 
        fetchTests(); 
      } else {
        toast.error('خطا در انجام عملیات.');
      }
    } catch (error) {
      console.error('خطا:', error);
      toast.error('خطای ارتباط با سرور.');
    }
  };

  // const handleAddDependent = async (e) => {
  //   e.preventDefault();
  //   if (!childNationalCode) return;
  //   try {
  //     const res = await API.post('patients/add-dependent/', { national_code: childNationalCode });
  //     toast.success(res.data?.message || 'فرزند با موفقیت اضافه شد.');
  //     setChildNationalCode('');
  //     fetchTests(); 
  //   } catch (err) {
  //     toast.error(err.response?.data?.error || 'خطا در افزودن فرد تحت تکفل');
  //   }
  // };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await API.get('test-results/');
      setTests(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('خطا در دریافت لیست آزمایش‌ها.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
    fetchPendingTests();
    fetchAccessRequests();
    fetchGrantedAccesses();
    fetchMyDependents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('آیا از حذف این نتیجه آزمایش اطمینان دارید؟');
    if (!isConfirmed) return;
    try {
      await API.delete(`test-results/${id}/`);
      toast.success('آزمایش با موفقیت حذف شد!');
      fetchTests();
    } catch (err) {
      toast.error('خطا در حذف آزمایش. لطفا دوباره تلاش کنید.');
    }
  };

  const handleEditClick = (test) => {
    setSelectedTest(test);
    setIsEditModalOpen(true);
  };

  const handleAttachmentClick = (test) => {
    setSelectedTest(test);
    setIsAttachmentModalOpen(true);
  };

  const handleChartClick = (test) => {
    setSelectedTest(test);
    setIsChartModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('fa-IR').format(new Date(dateString));
  };

  // 👈 آپدیت تابع بررسی وضعیت برای هماهنگی کامل با min_range و max_range
  const getTestStatus = (val, min, max) => {
    if (val === null || val === undefined || min === null || min === undefined || max === null || max === undefined) return 'unknown';
    const numVal = parseFloat(val);
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);
    
    if (isNaN(numVal) || isNaN(numMin) || isNaN(numMax)) return 'unknown';
    if (numVal >= numMin && numVal <= numMax) return 'normal';
    return 'abnormal';
  };

  const renderStatusBadge = (status) => {
    if (status === 'normal') return <span style={styles.badgeSuccess}>✅ نرمال</span>;
    if (status === 'abnormal') return <span style={styles.badgeDanger}>⚠️ غیرنرمال</span>;
    return <span style={styles.badgeNeutral}>⚪ نامشخص</span>;
  };

  const renderApprovalStatus = (status) => {
    switch(status) {
      case 'approved': 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 'bold' }}>✅ تایید شده</span>;
      case 'pending': 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#fef08a', color: '#854d0e', fontWeight: 'bold' }}>⏳ در انتظار</span>;
      case 'rejected': 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}>❌ رد شده</span>;
      default: 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#f3f4f6', color: '#4b5563' }}>نامشخص</span>;
    }
  };

  // فیلتر کردن داده‌ها با در نظر گرفتن فیلدهای دقیق مدل
  const filteredTests = tests.filter((test) => {
    const fullName = `${test.patient?.first_name || ''} ${test.patient?.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const status = getTestStatus(test.result_value, test.min_range ?? test.lab_min_range, test.max_range ?? test.lab_max_range);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tests.length,
    normal: tests.filter(t => getTestStatus(t.result_value, t.min_range ?? t.lab_min_range, t.max_range ?? t.lab_max_range) === 'normal').length,
    abnormal: tests.filter(t => getTestStatus(t.result_value, t.min_range ?? t.lab_min_range, t.max_range ?? t.lab_max_range) === 'abnormal').length,
    unknown: tests.filter(t => getTestStatus(t.result_value, t.min_range ?? t.lab_min_range, t.max_range ?? t.lab_max_range) === 'unknown').length,
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>داشبورد مدیریت آزمایش‌ها</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => setIsAddModalOpen(true)} style={styles.addBtn}>
            + ثبت آزمایش جدید
          </button>
          
          <button 
              onClick={() => setIsProfileModalOpen(true)}
              style={{
                  ...styles.addBtn,
                  backgroundColor: '#0369a1',
                  marginRight: '10px'
              }}
          >
              👤 تکمیل پرونده سلامت
          </button>

          <CompleteProfileModal 
              isOpen={isProfileModalOpen} 
              onClose={() => setIsProfileModalOpen(false)} 
              onProfileUpdated={() => {
                  fetchTests();
              }}
          />

          <button onClick={logout} style={styles.logoutButton}>
            خروج از حساب
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.errorMessage}>{error}</div>}
        
        {pendingTests.length > 0 && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde047', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ color: '#854d0e', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              📥 صندوق پیام: شما {pendingTests.length} آزمایش در انتظار تایید دارید!
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingTests.map(test => (
                <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #fef08a' }}>
                  <div style={{ fontSize: '1rem', color: '#374151', lineHeight: '1.6' }}>
                    آزمایش <strong>{test.test_type_name}</strong> با نتیجه <strong>{test.result_value ?? test.result_text}</strong> <br/>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      ثبت شده توسط <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{test.creator_name || 'نامشخص'}</span> در تاریخ {formatDate(test.test_date)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleReviewTest(test.id, 'approve')} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✅ تایید
                    </button>
                    <button onClick={() => handleReviewTest(test.id, 'reject')} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ❌ رد
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 🤝 بخش جدید: صندوق پیامِ درخواست‌های دسترسی */}
        {accessRequests.length > 0 && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ color: '#1e3a8a', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              🤝 صندوق درخواست‌ها: {accessRequests.length} نفر درخواست دسترسی به پرونده شما را دارند!
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {accessRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '1rem', color: '#374151', lineHeight: '1.6' }}>
                    <strong>{req.requester_name}</strong> درخواست دسترسی به نتایج آزمایش‌های شما را دارد. <br/>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleRespondAccess(req.id, 'approve')} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✅ تایید دسترسی
                    </button>
                    <button onClick={() => handleRespondAccess(req.id, 'reject')} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ❌ رد درخواست
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🛡️ بخش مدیریت دسترسی‌های داده شده (همیشه نمایش داده می‌شود) */}
        <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ color: '#374151', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>
            🛡️ افرادی که به پرونده شما دسترسی دارند:
          </h3>
          
          {grantedAccesses.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: '0.95rem', backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
              در حال حاضر هیچ شخص دیگری به نتایج آزمایش‌های شما دسترسی ندارد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {grantedAccesses.map(access => (
                <div key={access.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '1rem', color: '#4b5563' }}>
                    دسترسی فعال برای: <strong>{access.grantee_name}</strong>
                  </div>
                  <button onClick={() => handleRevokeAccess(access.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    لغو دسترسی
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* 📋 بخش جدید: افرادی که تحت مراقبت من هستند */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ color: '#166534', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>
            📋 افرادی که تحت مراقبت من هستند (دسترسی دارم):
          </h3>
          
          {myDependents.length === 0 ? (
            <div style={{ color: '#15803d', fontSize: '0.95rem', backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px dashed #86efac' }}>
              شما در حال حاضر به پرونده شخص دیگری دسترسی ندارید.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myDependents.map(person => (
                <div key={person.access_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '1rem', color: '#166534' }}>
                    نام بیمار: <strong>{person.patient_name}</strong> <br/>
                    <span style={{ fontSize: '0.85rem', color: '#15803d' }}>کد ملی: {person.national_code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={styles.statsContainer}>
          <div style={{ ...styles.statCard, borderBottomColor: '#3b82f6' }}>
            <span style={styles.statTitle}>کل آزمایش‌ها</span>
            <span style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.total}</span>
          </div>
          <div style={{ ...styles.statCard, borderBottomColor: '#10b981' }}>
            <span style={styles.statTitle}>نتایج نرمال</span>
            <span style={{ ...styles.statValue, color: '#10b981' }}>{stats.normal}</span>
          </div>
          <div style={{ ...styles.statCard, borderBottomColor: '#ef4444' }}>
            <span style={styles.statTitle}>نتایج غیرنرمال</span>
            <span style={{ ...styles.statValue, color: '#ef4444' }}>{stats.abnormal}</span>
          </div>
          <div style={{ ...styles.statCard, borderBottomColor: '#9ca3af' }}>
            <span style={styles.statTitle}>نامشخص</span>
            <span style={{ ...styles.statValue, color: '#6b7280' }}>{stats.unknown}</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#4b5563', fontSize: '15px' }}>افزودن عضو خانواده یا فرد تحت مراقبت</h3>
          <form onSubmit={handleAddDependent} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="کد ملی فرد تحت مراقبت را وارد کنید..."
              value={childNationalCode}
              onChange={(e) => setChildNationalCode(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={{ ...styles.addBtn, padding: '0.6rem 1.5rem' }}>
              افزودن به لیست
            </button>
          </form>
        </div>

        <div style={styles.filterSection}>
          <input 
            type="text" 
            placeholder="🔍 جستجوی نام بیمار در آزمایش ها  ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="normal">فقط نرمال</option>
            <option value="abnormal">فقط غیرنرمال</option>
            <option value="unknown">نامشخص</option>
          </select>
        </div>

        {loading ? (
          <div style={styles.loading}>در حال دریافت اطلاعات از سرور...</div>
        ) : (
          <div style={styles.tableWrapper}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ردیف</th>
                    <th style={styles.th}>نام بیمار</th>
                    <th style={styles.th}>نوع آزمایش</th>
                    <th style={styles.th}>نتیجه</th>
                    <th style={styles.th}>وضعیت پزشکی</th>
                    <th style={styles.th}>وضعیت تایید</th>
                    <th style={styles.th}>تاریخ ثبت</th>
                    <th style={styles.th}>ثبت‌کننده</th>
                    <th style={styles.th}>پیوست‌ها و نمودار</th>
                    <th style={styles.th}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTests.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={styles.emptyState}>
                        {tests.length === 0 ? 'هیچ آزمایشی یافت نشد.' : 'آزمایشی با این مشخصات پیدا نشد.'}
                      </td>
                    </tr>
                  ) : (
                    currentTests.map((test, index) => {
                      const status = getTestStatus(test.result_value, test.min_range ?? test.lab_min_range, test.max_range ?? test.lab_max_range);
                      const actualIndex = indexOfFirstItem + index + 1;
                      
                      return (
                        <tr key={test.id} style={styles.tr}>
                          <td style={styles.td}>{actualIndex}</td>
                          <td style={styles.td}>{test.patient_name || (test.patient?.first_name ? `${test.patient.first_name} ${test.patient.last_name}` : 'خودم')}</td>
                          <td style={styles.td}>{test.test_type_name}</td>
                          <td style={styles.td}><strong>{test.result_value ?? test.result_text}</strong></td>
                          <td style={styles.td}>{renderStatusBadge(status)}</td>
                          <td style={styles.td}>{renderApprovalStatus(test.status)}</td>
                          <td style={styles.td}>{formatDate(test.test_date)}</td>
                          <td style={styles.td}>
                              <span style={{ fontSize: '0.85rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                                  {test.creator_name}
                              </span>
                          </td>
                          <td style={styles.td}>
                            <button onClick={() => handleAttachmentClick(test)} style={styles.actionBtnAttachment}>
                              فایل‌ها ({test.attachments?.length || 0})
                            </button>
                            <button onClick={() => handleChartClick(test)} style={{...styles.actionBtnAttachment, backgroundColor: '#8b5cf6', marginRight: '5px'}}>
                              نمودار 📈
                            </button>
                          </td>
                          <td style={styles.tdActions}>
                            <button onClick={() => handleEditClick(test)} style={styles.actionBtnEdit}>ویرایش</button>
                            <button onClick={() => handleDelete(test.id)} style={styles.actionBtnDelete}>حذف</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={styles.paginationContainer}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1} 
                  style={{...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}
                >
                  قبلی
                </button>
                <span style={styles.pageInfo}>
                  صفحه <strong>{currentPage}</strong> از <strong>{totalPages}</strong>
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages} 
                  style={{...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}
                >
                  بعدی
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <AddTestModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onTestAdded={fetchTests} />
      <EditTestModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onTestUpdated={fetchTests} testData={selectedTest} />
      <AttachmentModal isOpen={isAttachmentModalOpen} onClose={() => setIsAttachmentModalOpen(false)} testData={selectedTest} onUploadSuccess={() => { fetchTests(); setIsAttachmentModalOpen(false); }} />
      <PatientChartModal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} testData={selectedTest} allTests={tests} />
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f9fafb', direction: 'rtl', fontFamily: 'Tahoma, Arial, sans-serif' },
  header: { backgroundColor: '#ffffff', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '1.25rem', color: '#1f2937' },
  headerButtons: { display: 'flex', gap: '0.75rem' },
  addBtn: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' },
  logoutButton: { padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
  main: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  statCard: { backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '4px solid #e5e7eb', cursor: 'default' },
  statTitle: { fontSize: '0.9rem', color: '#6b7280', fontWeight: 'bold', marginBottom: '0.5rem' },
  statValue: { fontSize: '2.5rem', fontWeight: '900', lineHeight: '1' },
  filterSection: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  searchInput: { flex: 2, padding: '0.6rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', outline: 'none' },
  filterSelect: { flex: 1, padding: '0.6rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', outline: 'none', cursor: 'pointer' },
  errorMessage: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' },
  loading: { textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '1.1rem' },
  tableWrapper: { backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'right' },
  th: { backgroundColor: '#f3f4f6', padding: '1rem', color: '#374151', fontWeight: '600', borderBottom: '2px solid #e5e7eb', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '1rem', color: '#4b5563', fontSize: '0.9rem' },
  tdActions: { padding: '1rem', display: 'flex', gap: '0.5rem' },
  emptyState: { textAlign: 'center', padding: '2rem', color: '#9ca3af' },
  badgeSuccess: { backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' },
  badgeDanger: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' },
  badgeNeutral: { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem' },
  actionBtnEdit: { padding: '0.35rem 0.75rem', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  actionBtnDelete: { padding: '0.35rem 0.75rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  actionBtnAttachment: { padding: '0.35rem 0.75rem', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e5e7eb', gap: '1rem', backgroundColor: '#f9fafb', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' },
  pageBtn: { padding: '0.4rem 1rem', backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' },
  pageInfo: { fontSize: '0.9rem', color: '#4b5563' }
};

export default Dashboard;