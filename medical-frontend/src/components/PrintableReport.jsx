import { forwardRef, Fragment } from 'react';
import './PrintableReport.css';

/** Jalali date formatter with Latin digits 0-9. */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return String(dateString);
  }
};

/**
 * Extracts and normalizes all display fields from a test result record.
 * Handles single-value lab items, multi-factor panels (e.g. CBC, Lipid),
 * and custom/free-form tests accurately.
 */
const resolveTestInfo = (test, profile) => {
  const name = test.test_name || test.name || test.test_type_name || 'آزمایش بالینی';
  const lab = test.lab_name || '—';

  // Resolve Patient Name
  let patientName = test.patient_name;
  if (!patientName && test.patient) {
    if (typeof test.patient === 'object') {
      patientName = [test.patient.first_name, test.patient.last_name].filter(Boolean).join(' ');
    }
  }
  if (!patientName && (test.patient_first_name || test.patient_last_name)) {
    patientName = [test.patient_first_name, test.patient_last_name].filter(Boolean).join(' ');
  }
  if (!patientName && (profile?.first_name || profile?.last_name)) {
    patientName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  }
  if (!patientName) {
    patientName = 'خودم';
  }

  // Resolve Result & Factors
  let resultDisplay = '—';
  if (Array.isArray(test.factors) && test.factors.length > 0) {
    resultDisplay = test.factors
      .map((f) => {
        const fName = f.factor_name || f.name || 'فاکتور';
        const fVal = f.value ?? f.result_value ?? '—';
        const fUnit = f.unit ? ` ${f.unit}` : '';
        return `${fName}: ${fVal}${fUnit}`;
      })
      .join(' | ');
  } else if (test.result_value != null || test.result != null || test.result_text) {
    const val = test.result_value ?? test.result ?? test.result_text;
    const unit = test.unit ? ` ${test.unit}` : '';
    resultDisplay = `${val}${unit}`;
  }

  // Reference Normal Range
  let rangeDisplay = '—';
  if (test.min_range != null && test.max_range != null) {
    rangeDisplay = `${test.min_range} - ${test.max_range}`;
  } else if (test.lab_min_range != null && test.lab_max_range != null) {
    rangeDisplay = `${test.lab_min_range} - ${test.lab_max_range}`;
  } else if (test.reference_range || test.normal_range) {
    rangeDisplay = test.reference_range || test.normal_range;
  }

  // Clinical Status
  const isAbnormal = test.is_normal === false || test.status === 'abnormal' || test.is_critical;
  const isExplicitNormal = test.is_normal === true || test.status === 'normal';
  let statusLabel = 'نرمال';
  let isAbnormalStatus = false;

  if (isAbnormal) {
    statusLabel = 'غیرنرمال';
    isAbnormalStatus = true;
  } else if (isExplicitNormal) {
    statusLabel = 'نرمال';
    isAbnormalStatus = false;
  } else if (test.result_value != null && (test.min_range != null || test.lab_min_range != null)) {
    const numVal = parseFloat(test.result_value);
    const min = parseFloat(test.min_range ?? test.lab_min_range);
    const max = parseFloat(test.max_range ?? test.lab_max_range);
    if (!Number.isNaN(numVal) && !Number.isNaN(min) && !Number.isNaN(max)) {
      if (numVal < min || numVal > max) {
        statusLabel = 'غیرنرمال';
        isAbnormalStatus = true;
      }
    }
  }

  // Approval Status
  let approvalText = 'تایید شده';
  if (test.status === 'pending') approvalText = 'در انتظار بررسی';
  else if (test.status === 'rejected') approvalText = 'رد شده';

  // Date
  const rawDate = test.test_date || test.created_at || test.recorded_at;
  const dateFormatted = rawDate ? formatDate(rawDate) : '—';

  return {
    name,
    lab,
    patientName,
    resultDisplay,
    rangeDisplay,
    statusLabel,
    isAbnormalStatus,
    approvalText,
    dateFormatted,
  };
};

/** Flattens clinical note into a single readable string. */
const buildNoteLine = (note) => {
  if (!note) return '';
  const parts = [];
  if (note.fastingHours) parts.push(`ناشتایی: ${note.fastingHours}`);
  if (note.medications) parts.push(`داروهای مصرفی: ${note.medications}`);
  if (note.notes) parts.push(`توصیه پزشک: ${note.notes}`);
  if (note.doctorName) parts.push(`پزشک: ${note.doctorName}`);
  return parts.join(' | ');
};

/** Print-ready inline styles ensuring consistent A4 layout across all print engines. */
const styles = {
  doc: {
    direction: 'rtl',
    fontFamily: "'Yekan Bakh', Tahoma, Arial, sans-serif",
    backgroundColor: '#ffffff',
    color: '#0f172a',
    padding: '24px 30px',
    width: '100%',
    maxWidth: '210mm',
    margin: '0 auto',
    boxSizing: 'border-box',
    lineHeight: 1.6,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2.5px solid #0f766e',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  brandBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#0f766e',
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  brandName: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f766e',
    margin: 0,
  },
  brandTagline: {
    fontSize: '11px',
    color: '#475569',
    margin: '2px 0 0',
  },
  reportMeta: {
    textAlign: 'left',
    fontSize: '11.5px',
    color: '#334155',
    lineHeight: 1.8,
  },
  title: {
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '16px 0 16px',
    letterSpacing: '0.2px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    backgroundColor: '#f8fafc',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: '10.5px',
    color: '#64748b',
    margin: 0,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11.5px',
    marginBottom: '18px',
  },
  th: {
    border: '1px solid #94a3b8',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    padding: '8px 6px',
    fontWeight: '700',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  td: {
    border: '1px solid #cbd5e1',
    padding: '8px 6px',
    textAlign: 'right',
    color: '#1e293b',
  },
  badgeNormal: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontWeight: '700',
    fontSize: '10.5px',
  },
  badgeWarn: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: '700',
    fontSize: '10.5px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  summaryChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  footerNote: {
    marginTop: '20px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '10px',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.7,
  },
  emptyRow: {
    textAlign: 'center',
    padding: '24px',
    color: '#64748b',
    fontSize: '12px',
  },
};

/**
 * Official A4 Printable Lab Results Report.
 * Consumed by TestsPage via useReactToPrint.
 */
const PrintableReport = forwardRef(({ tests = [], profile, clinicalNotesMap = {} }, ref) => {
  const patientFullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    profile?.user_name ||
    'کاربر گرامی';

  const nationalCode = profile?.national_code || '—';
  const bloodType = profile?.blood_type || profile?.blood_group || '—';
  const birthDate = profile?.birth_date ? formatDate(profile.birth_date) : '—';
  const todayFormatted = formatDate(new Date());

  const noteFor = (testId) => {
    const note = clinicalNotesMap[testId];
    return note ? buildNoteLine(note) : '';
  };

  const processedList = tests.map((t) => resolveTestInfo(t, profile));
  const abnormalCount = processedList.filter((item) => item.isAbnormalStatus).length;
  const normalCount = processedList.length - abnormalCount;

  return (
    <div ref={ref} className="print-report" style={styles.doc}>
      {/* 1. Header */}
      <header style={styles.headerRow}>
        <div style={styles.brandBox}>
          <span style={styles.logo}>🩺</span>
          <div>
            <h1 style={styles.brandName}>سلامت‌یار</h1>
            <p style={styles.brandTagline}>سامانه پرونده الکترونیک سلامت و آزمایش‌های پزشکی</p>
          </div>
        </div>
        <div style={styles.reportMeta}>
          <div>تاریخ صدور گزارش: <strong>{todayFormatted}</strong></div>
          <div>تعداد آزمایش‌ها: <strong>{tests.length} مورد</strong></div>
        </div>
      </header>

      {/* 2. Document Title */}
      <h2 style={styles.title}>کارنامه جامع نتایج آزمایش‌های پزشکی</h2>

      {/* 3. Patient Identity Information */}
      <section style={styles.infoGrid}>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>نام و نام خانوادگی بیمار:</span>
          <span style={styles.infoValue}>{patientFullName}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>کد ملی:</span>
          <span style={styles.infoValue}>{nationalCode}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>گروه خونی:</span>
          <span style={styles.infoValue}>{bloodType}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>تاریخ تولد:</span>
          <span style={styles.infoValue}>{birthDate}</span>
        </div>
      </section>

      {/* 4. Results Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: '36px', textAlign: 'center' }}>ردیف</th>
            <th style={styles.th}>بیمار</th>
            <th style={styles.th}>عنوان آزمایش</th>
            <th style={styles.th}>آزمایشگاه</th>
            <th style={styles.th}>نتیجه / مقادیر</th>
            <th style={styles.th}>بازه طبیعی</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>وضعیت</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>تاریخ آزمایش</th>
          </tr>
        </thead>
        <tbody>
          {processedList.length === 0 ? (
            <tr>
              <td colSpan="8" style={styles.emptyRow}>
                هیچ آزمایش ثبت‌شده‌ای برای درج در گزارش یافت نشد.
              </td>
            </tr>
          ) : (
            processedList.map((item, index) => {
              const originalTest = tests[index];
              const noteLine = originalTest ? noteFor(originalTest.id) : '';

              return (
                <Fragment key={originalTest?.id || index}>
                  <tr>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700' }}>
                      {index + 1}
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {item.patientName}
                    </td>
                    <td style={{ ...styles.td, fontWeight: '700' }}>
                      {item.name}
                    </td>
                    <td style={styles.td}>
                      {item.lab}
                    </td>
                    <td style={{ ...styles.td, fontWeight: '700', direction: 'ltr', textAlign: 'right' }}>
                      {item.resultDisplay}
                    </td>
                    <td style={{ ...styles.td, direction: 'ltr', textAlign: 'right', fontSize: '11px', color: '#475569' }}>
                      {item.rangeDisplay}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={item.isAbnormalStatus ? styles.badgeWarn : styles.badgeNormal}>
                        {item.statusLabel}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontSize: '11px' }}>
                      {item.dateFormatted}
                    </td>
                  </tr>
                  {noteLine && (
                    <tr>
                      <td colSpan="8" style={{ ...styles.td, backgroundColor: '#f8fafc', fontSize: '10.5px', color: '#475569' }}>
                        📝 <strong>یادداشت بالینی:</strong> {noteLine}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* 5. Summary Statistics Strip */}
      <div style={styles.summaryRow}>
        <span style={styles.summaryChip}>
          📊 مجموع آزمایش‌ها: <strong>{tests.length}</strong>
        </span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span style={{ ...styles.summaryChip, color: '#166534' }}>
          ✓ شاخص‌های طبیعی (نرمال): <strong>{normalCount}</strong>
        </span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span style={{ ...styles.summaryChip, color: '#92400e' }}>
          ⚠️ نیازمند توجه و بررسی: <strong>{abnormalCount}</strong>
        </span>
      </div>

      {/* 6. Medical Disclaimer Footer */}
      <footer style={styles.footerNote}>
        <div>
          این کارنامه بر اساس سوابق آزمایشگاهی ثبت‌شده در سامانه سلامت‌یار تولید شده است و جایگزین نظر و تشخیص تخصصی پزشک معالج نمی‌باشد.
        </div>
        <div>
          نسخه رسمی پرونده الکترونیک سلامت • شناسه اصالت سند دیجیتال: SY-{new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

export default PrintableReport;
