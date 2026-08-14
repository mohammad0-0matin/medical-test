import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import AddTestModal from '../components/AddTestModal';
import EditTestModal from '../components/EditTestModal';
import AttachmentModal from '../components/AttachmentModal';
import PatientChartModal from '../components/PatientChartModal';
import { toast } from 'react-toastify'; // 👈 استفاده از Toast

const Dashboard = () => {
  const { logout } = useContext(AuthContext);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // مدیریت مودال‌ها
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  
  const [selectedTest, setSelectedTest] = useState(null);

  // استیت‌های جستجو و فیلتر
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 👈 استیت‌های صفحه‌بندی
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // تعداد رکوردهای هر صفحه (می‌توانید تغییر دهید)

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
  }, []);

  // 👈 وقتی کاربر جستجو یا فیلتر می‌کند، باید برگردیم به صفحه اول
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

  const getTestStatus = (val, min, max) => {
    if (val === null || min === null || max === null) return 'unknown';
    if (val >= min && val <= max) return 'normal';
    return 'abnormal';
  };

  const renderStatusBadge = (status) => {
    if (status === 'normal') return <span style={styles.badgeSuccess}>نرمال</span>;
    if (status === 'abnormal') return <span style={styles.badgeDanger}>غیرنرمال</span>;
    return <span style={styles.badgeNeutral}>نامشخص</span>;
  };

  // فیلتر کردن داده‌ها
  const filteredTests = tests.filter((test) => {
    const fullName = `${test.patient?.first_name || ''} ${test.patient?.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const status = getTestStatus(test.result_value, test.lab_min_range, test.lab_max_range);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // محاسبه آمار
  const stats = {
    total: tests.length,
    normal: tests.filter(t => getTestStatus(t.result_value, t.lab_min_range, t.lab_max_range) === 'normal').length,
    abnormal: tests.filter(t => getTestStatus(t.result_value, t.lab_min_range, t.lab_max_range) === 'abnormal').length,
    unknown: tests.filter(t => getTestStatus(t.result_value, t.lab_min_range, t.lab_max_range) === 'unknown').length,
  };

  // 👈 منطق صفحه‌بندی
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // گرفتن برش (slice) از داده‌های فیلترشده برای صفحه فعلی
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
          <button onClick={logout} style={styles.logoutButton}>
            خروج از حساب
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.errorMessage}>{error}</div>}

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

        <div style={styles.filterSection}>
          <input 
            type="text" 
            placeholder="🔍 جستجوی نام بیمار..." 
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
                    <th style={styles.th}>وضعیت</th>
                    <th style={styles.th}>تاریخ ثبت</th>
                    <th style={styles.th}>پیوست‌ها و نمودار</th>
                    <th style={styles.th}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTests.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={styles.emptyState}>
                        {tests.length === 0 ? 'هیچ آزمایشی یافت نشد.' : 'آزمایشی با این مشخصات پیدا نشد.'}
                      </td>
                    </tr>
                  ) : (
                    // 👈 به جای filteredTests، از currentTests برای رندر ردیف‌ها استفاده شده
                    currentTests.map((test, index) => {
                      const status = getTestStatus(test.result_value, test.lab_min_range, test.lab_max_range);
                      // محاسبه ردیف واقعی در کل داده‌ها
                      const actualIndex = indexOfFirstItem + index + 1;
                      
                      return (
                        <tr key={test.id} style={styles.tr}>
                          <td style={styles.td}>{actualIndex}</td>
                          <td style={styles.td}>{test.patient?.first_name} {test.patient?.last_name}</td>
                          <td style={styles.td}>{test.test_type_name}</td>
                          <td style={styles.td}><strong>{test.result_value ?? test.result_text}</strong></td>
                          <td style={styles.td}>{renderStatusBadge(status)}</td>
                          <td style={styles.td}>{formatDate(test.test_date)}</td>
                          
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

            {/* 👈 بخش کنترل صفحه‌بندی */}
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
  
  // 👈 استایل‌های بخش صفحه‌بندی
  paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e5e7eb', gap: '1rem', backgroundColor: '#f9fafb', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' },
  pageBtn: { padding: '0.4rem 1rem', backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', transition: 'background-color 0.2s' },
  pageInfo: { fontSize: '0.9rem', color: '#4b5563' }
};

export default Dashboard;