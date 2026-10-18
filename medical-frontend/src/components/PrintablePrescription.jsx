import { formatJalaliDate } from '../utils/dateUtils';
import './PrintablePrescription.css';

/**
 * Printable Prescription Component (A4 Official Medical Slip)
 * Adheres strictly to Salamat-Yar DESIGN.md (Report/Print Surface):
 * - Clean tabular layout in grayscale
 * - Jalali dates with Latin digits
 * - Responsive print styles triggering window.print()
 */
const PrintablePrescription = ({ prescription }) => {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const doctorDisplayName = prescription.registered_doctor_name
    ? `دکتر ${prescription.registered_doctor_name}`
    : prescription.external_doctor_name || 'پزشک معالج';

  return (
    <>
      {/* On-screen Print Trigger Button */}
      <button
        type="button"
        className="rx-btn rx-btn-secondary"
        onClick={handlePrint}
        title="چاپ نسخه بر روی کاغذ یا ذخیره به صورت PDF"
      >
        🖨️ چاپ نسخه / ذخیره PDF
      </button>

      {/* Hidden container that becomes visible during @media print */}
      <div className="print-prescription-container" aria-hidden="true">
        <div className="print-rx-slip">
          {/* Header */}
          <div className="print-rx-header">
            <div>
              <h1 className="print-rx-title">برگه نسخه درمانی (سلامت‌یار)</h1>
              <span style={{ fontSize: '10pt', color: '#4b5563' }}>
                شناسه پیگیری نسخه: {prescription.uuid}
              </span>
            </div>
            <div style={{ textAlign: 'left', fontSize: '10pt' }}>
              <div><strong>تاریخ صدور:</strong> {formatJalaliDate(prescription.prescribed_date)}</div>
              <div><strong>منبع ثبت:</strong> {prescription.source === 'ai_extracted' ? 'هوش مصنوعی' : 'ثبت پزشک/سامانه'}</div>
            </div>
          </div>

          {/* Doctor & Patient Metadata Grid */}
          <div className="print-rx-meta-grid">
            {prescription.patient_name && (
              <div className="print-rx-meta-row">
                <strong>نام بیمار:</strong>
                <span>{prescription.patient_name}</span>
              </div>
            )}
            <div className="print-rx-meta-row">
              <strong>پزشک صادرکننده:</strong>
              <span>{doctorDisplayName}</span>
            </div>
            {prescription.external_doctor_license_number && (
              <div className="print-rx-meta-row">
                <strong>شماره نظام پزشکی:</strong>
                <span dir="ltr">{prescription.external_doctor_license_number}</span>
              </div>
            )}
            {prescription.external_doctor_specialty && (
              <div className="print-rx-meta-row">
                <strong>تخصص:</strong>
                <span>{prescription.external_doctor_specialty}</span>
              </div>
            )}
            {prescription.external_doctor_clinic && (
              <div className="print-rx-meta-row">
                <strong>مرکز درمانی / مطب:</strong>
                <span>{prescription.external_doctor_clinic}</span>
              </div>
            )}
            {prescription.diagnosis && (
              <div className="print-rx-meta-row" style={{ gridColumn: 'span 2' }}>
                <strong>علت مراجعه / تشخیص:</strong>
                <span>{prescription.diagnosis}</span>
              </div>
            )}
          </div>

          {/* Medication Items Table */}
          <h2 style={{ fontSize: '11pt', margin: '14px 0 6px', fontWeight: 'bold' }}>
            اقلام دارویی تجویزشده
          </h2>
          <table className="print-rx-table">
            <thead>
              <tr>
                <th style={{ width: '35px', textAlign: 'center' }}>ردیف</th>
                <th>نام دارو</th>
                <th style={{ width: '80px' }}>دوز / قدرت</th>
                <th style={{ width: '70px' }}>شکل دارو</th>
                <th>دستور و تناوب مصرف</th>
                <th style={{ width: '60px' }}>تعداد</th>
                <th style={{ width: '70px' }}>طول دوره</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items && prescription.items.length > 0 ? (
                prescription.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>
                      <strong>{item.drug_name}</strong>
                      {item.instructions && (
                        <div style={{ fontSize: '8.5pt', color: '#4b5563', marginTop: '3px' }}>
                          دستور: {item.instructions}
                        </div>
                      )}
                    </td>
                    <td dir="ltr">{item.strength_dose || '—'}</td>
                    <td>{item.form || '—'}</td>
                    <td>{item.frequency || '—'}</td>
                    <td dir="ltr">{item.quantity || '—'}</td>
                    <td>{item.duration || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center' }}>
                    هیچ دارویی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Notes if present */}
          {prescription.notes && (
            <div style={{ marginTop: '12px', fontSize: '9.5pt', border: '1px solid #e5e7eb', padding: '8px 12px' }}>
              <strong>توصیه‌ها و یادداشت‌های پزشک:</strong> {prescription.notes}
            </div>
          )}

          {/* Footer & Signature Stamp */}
          <div className="print-rx-footer">
            <div style={{ fontSize: '8.5pt', color: '#6b7280', maxWidth: '340px' }}>
              این برگه به منزله گزارش پرونده نسخه سلامت‌یار صادر گردیده است.
              تاریخ چاپ: {new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn').format(new Date())}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="print-rx-stamp-box">
                محل مهر و امضای پزشک / داروخانه
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintablePrescription;
