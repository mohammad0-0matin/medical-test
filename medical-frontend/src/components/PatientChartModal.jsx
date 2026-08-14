import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';

const PatientChartModal = ({ isOpen, onClose, testData, allTests }) => {
  if (!isOpen || !testData) return null;

  // فیلتر و مرتب‌سازی داده‌ها برای رسم نمودار
  const chartData = useMemo(() => {
    return allTests
      // ۱. فقط آزمایش‌های همین بیمار و همین نوع آزمایش را جدا کن
      .filter(
        (t) =>
          t.patient?.id === testData.patient?.id &&
          t.test_type === testData.test_type &&
          t.result_value !== null // فقط نتایج عددی قابل رسم هستند
      )
      // ۲. داده‌ها را برای نمودار فرمت کن
      .map((t) => ({
        dateString: new Intl.DateTimeFormat('fa-IR').format(new Date(t.test_date)),
        rawDate: new Date(t.test_date).getTime(),
        value: parseFloat(t.result_value),
        min: t.lab_min_range ? parseFloat(t.lab_min_range) : null,
        max: t.lab_max_range ? parseFloat(t.lab_max_range) : null,
      }))
      // ۳. مرتب‌سازی بر اساس تاریخ (از قدیم به جدید)
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [testData, allTests]);

  // استخراج بازه نرمال (برای رسم کادر سبز رنگ در پس‌زمینه)
  const safeMin = chartData.length > 0 ? chartData[0].min : null;
  const safeMax = chartData.length > 0 ? chartData[0].max : null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>روند تغییرات آزمایش</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          <p style={styles.subtitle}>
            بیمار: <strong>{testData.patient?.first_name} {testData.patient?.last_name}</strong> | 
            نوع آزمایش: <strong>{testData.test_type_name}</strong>
          </p>

          {chartData.length < 2 ? (
            <div style={styles.emptyState}>
              برای رسم نمودار، این بیمار باید حداقل ۲ نتیجه عددی ثبت شده از این آزمایش داشته باشد.
            </div>
          ) : (
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateString" tick={{ fontSize: 12, fontFamily: 'Tahoma' }} />
                  <YAxis tick={{ fontSize: 12, fontFamily: 'Tahoma' }} />
                  <Tooltip 
                    contentStyle={{ fontFamily: 'Tahoma', borderRadius: '8px', textAlign: 'right' }} 
                    formatter={(value) => [`${value}`, 'نتیجه']}
                    labelFormatter={(label) => `تاریخ: ${label}`}
                  />
                  
                  {/* اگر بازه نرمال وجود داشت، یک کادر سبز کمرنگ در پس‌زمینه می‌کشد */}
                  {safeMin !== null && safeMax !== null && (
                    <ReferenceArea y1={safeMin} y2={safeMax} fill="#d1fae5" fillOpacity={0.5} />
                  )}

                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, direction: 'rtl', fontFamily: 'Tahoma, Arial, sans-serif' },
  modal: { backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '700px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { margin: 0, fontSize: '1.2rem', color: '#1f2937' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' },
  content: { marginTop: '1rem' },
  subtitle: { fontSize: '1rem', color: '#4b5563', marginBottom: '1.5rem', textAlign: 'center' },
  chartContainer: { width: '100%', height: '350px', marginTop: '1rem' },
  emptyState: { textAlign: 'center', padding: '3rem', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '8px' },
};

export default PatientChartModal;