import { forwardRef } from 'react';
import './PrintableReport.css';

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('fa-IR').format(new Date(dateString));
};

const getMedicalStatus = (test) => {
  const value = parseFloat(test.result_value);
  const min = parseFloat(test.min_range ?? test.lab_min_range);
  const max = parseFloat(test.max_range ?? test.lab_max_range);
  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max)) {
    return 'نامشخص';
  }
  return value >= min && value <= max ? 'نرمال' : 'غیرنرمال';
};

const approvalLabel = (status) => {
  switch (status) {
    case 'approved':
      return 'تایید شده';
    case 'pending':
      return 'در انتظار تایید';
    case 'rejected':
      return 'رد شده';
    default:
      return 'نامشخص';
  }
};

const styles = {
  doc: {
    direction: 'rtl',
    fontFamily: 'Tahoma, Arial, sans-serif',
    backgroundColor: '#ffffff',
    color: '#111827',
    padding: '24px 28px',
    width: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '3px solid #0f172a',
    paddingBottom: '14px',
  },
  brandBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '18px',
  },
  brandName: { fontSize: '20px', fontWeight: 'bold', margin: 0 },
  brandTagline: { fontSize: '11px', color: '#4b5563', margin: '2px 0 0' },
  reportMeta: { textAlign: 'left', fontSize: '12px', color: '#374151', lineHeight: 1.9 },
  title: {
    textAlign: 'center',
    fontSize: '17px',
    fontWeight: 'bold',
    margin: '22px 0 18px',
    letterSpacing: '0.5px',
  },
  infoGrid: {
    display: 'flex',
    gap: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    backgroundColor: '#f8fafc',
  },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: '10.5px', color: '#64748b', margin: '0 0 4px' },
  infoValue: { fontSize: '13.5px', fontWeight: 'bold', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' },
  th: {
    border: '1px solid #94a3b8',
    backgroundColor: '#eef2f7',
    padding: '7px 6px',
    fontWeight: 'bold',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  td: { border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' },
  summaryRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '14px',
    fontSize: '11.5px',
    flexWrap: 'wrap',
  },
  summaryChip: {
    border: '1px solid #cbd5e1',
    borderRadius: '9999px',
    padding: '4px 12px',
    backgroundColor: '#f8fafc',
  },
  footerNote: {
    marginTop: '28px',
    paddingTop: '10px',
    borderTop: '1px solid #cbd5e1',
    fontSize: '10.5px',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyRow: { textAlign: 'center', padding: '18px', color: '#6b7280' },
};

const PrintableReport = forwardRef(({ tests = [], profile }, ref) => {
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || '—';

  const summary = tests.reduce(
    (acc, t) => {
      const s = getMedicalStatus(t);
      acc[s] += 1;
      return acc;
    },
    { نرمال: 0, غیرنرمال: 0, نامشخص: 0 }
  );

  return (
    <div className="print-report">
      <div ref={ref} style={styles.doc}>
        <header style={styles.headerRow}>
          <div style={styles.brandBox}>
            <span style={styles.logo}>❤</span>
            <div>
              <h1 style={styles.brandName}>سلامت‌یار</h1>
              <p style={styles.brandTagline}>سامانه مدیریت پرونده سلامت و آزمایش‌های پزشکی</p>
            </div>
          </div>
          <div style={styles.reportMeta}>
            تاریخ گزارش: <strong>{formatDate(new Date())}</strong>
            <br />
            شمارش رکوردها: <strong>{toFaDigits(tests.length)}</strong>
          </div>
        </header>

        <h2 style={styles.title}>گزارش نتایج آزمایش‌های پزشکی</h2>

        <section style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>نام و نام خانوادگی</p>
            <p style={styles.infoValue}>{fullName}</p>
          </div>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>کد ملی</p>
            <p style={styles.infoValue}>
              {profile?.national_code
                ? toFaDigits(String(profile.national_code).replace(/(\d{5})(\d{5})/, '$1 $2'))
                : '—'}
            </p>
          </div>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>تاریخ تولد</p>
            <p style={styles.infoValue}>{profile?.birth_date ? formatDate(profile.birth_date) : '—'}</p>
          </div>
        </section>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '32px' }}>#</th>
              <th style={styles.th}>نام بیمار</th>
              <th style={styles.th}>نوع آزمایش</th>
              <th style={styles.th}>نتیجه</th>
              <th style={styles.th}>وضعیت پزشکی</th>
              <th style={styles.th}>وضعیت تایید</th>
              <th style={styles.th}>تاریخ آزمایش</th>
              <th style={styles.th}>ثبت‌کننده</th>
            </tr>
          </thead>
          <tbody>
            {tests.length === 0 ? (
              <tr>
                <td colSpan="8" style={styles.emptyRow}>
                  هیچ نتیجه آزمایشی برای نمایش در گزارش موجود نیست.
                </td>
              </tr>
            ) : (
              tests.map((test, index) => (
                <tr key={test.id}>
                  <td style={styles.td}>{toFaDigits(index + 1)}</td>
                  <td style={styles.td}>
                    {test.patient_name ||
                      (test.patient?.first_name
                        ? `${test.patient.first_name} ${test.patient.last_name}`
                        : 'خودم')}
                  </td>
                  <td style={styles.td}>{test.test_type_name}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>
                    {test.result_value ?? test.result_text ?? '—'}
                  </td>
                  <td style={styles.td}>{getMedicalStatus(test)}</td>
                  <td style={styles.td}>{approvalLabel(test.status)}</td>
                  <td style={styles.td}>{formatDate(test.test_date)}</td>
                  <td style={styles.td}>{test.creator_name || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={styles.summaryRow}>
          <span style={styles.summaryChip}>کل: {toFaDigits(tests.length)}</span>
          <span style={styles.summaryChip}>نرمال: {toFaDigits(summary['نرمال'])}</span>
          <span style={styles.summaryChip}>غیرنرمال: {toFaDigits(summary['غیرنرمال'])}</span>
          <span style={styles.summaryChip}>نامشخص: {toFaDigits(summary['نامشخص'])}</span>
        </div>

        <footer style={styles.footerNote}>
          این گزارش توسط سامانه سلامت‌یار تولید شده است و جایگزین نظر پزشک نیست.
        </footer>
      </div>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

export default PrintableReport;
