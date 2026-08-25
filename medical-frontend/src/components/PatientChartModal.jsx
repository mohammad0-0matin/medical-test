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
import './AddTestModal.css';
import './PatientChartModal.css';

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const TrendEmptyGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-5" />
    <path d="M15.5 8H19v3.5" />
  </svg>
);

const PatientChartModal = ({ isOpen, onClose, testData, allTests }) => {
  // فیلتر و مرتب‌سازی داده‌ها برای رسم نمودار
  const chartData = useMemo(() => {
    if (!isOpen || !testData) return [];

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
  }, [isOpen, testData, allTests]);

  // استخراج بازه نرمال (برای رسم کادر سبز رنگ در پس‌زمینه)
  const safeMin = chartData.length > 0 ? chartData[0].min : null;
  const safeMax = chartData.length > 0 ? chartData[0].max : null;

  if (!isOpen || !testData) return null;

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container pc-modal">
        <div className="modal-header">
          <h2>روند تغییرات آزمایش</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          <p className="pc-subtitle">
            بیمار: <strong>{testData.patient?.first_name} {testData.patient?.last_name}</strong>
            <span className="pc-badge">{testData.test_type_name}</span>
          </p>

          {chartData.length < 2 ? (
            <div className="pc-empty">
              <TrendEmptyGlyph />
              برای رسم نمودار، این بیمار باید حداقل ۲ نتیجه عددی ثبت شده از این آزمایش داشته باشد.
            </div>
          ) : (
            <>
              <div style={{width: '100%', height: '350px'}} className="chart-theme">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dateString" tick={{ fontSize: 12, fontFamily: 'Tahoma' }} />
                    <YAxis tick={{ fontSize: 12, fontFamily: 'Tahoma' }} />
                    <Tooltip
                      contentStyle={{
                        fontFamily: 'Tahoma',
                        borderRadius: '10px',
                        textAlign: 'right',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 12px 28px -14px rgba(2, 32, 71, 0.45)'
                      }}
                      labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                      itemStyle={{ color: 'var(--text-strong)', fontWeight: 700 }}
                      formatter={(value) => [`${value}`, 'نتیجه']}
                      labelFormatter={(label) => `تاریخ: ${label}`}
                    />

                    {/* اگر بازه نرمال وجود داشت، یک کادر سبز کمرنگ در پس‌زمینه می‌کشد */}
                    {safeMin !== null && safeMax !== null && (
                      <ReferenceArea y1={safeMin} y2={safeMax} fill="#10b981" fillOpacity={0.14} />
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

              <div className="pc-legend">
                <span className="pc-legend-chip"><span className="pc-line-swatch" />نتیجه آزمایش</span>
                {safeMin !== null && safeMax !== null ? (
                  <span className="pc-legend-chip">
                    <span className="pc-swatch" />
                    بازه نرمال: {toFaDigits(safeMin)} تا {toFaDigits(safeMax)}
                  </span>
                ) : (
                  <span className="pc-legend-chip">بازه نرمال ثبت نشده است</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientChartModal;
