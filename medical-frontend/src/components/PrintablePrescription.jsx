import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { formatJalaliDate } from '../utils/dateUtils';
import './PrintablePrescription.css';

/**
 * Printable Prescription Component (A4 Official Medical Slip)
 * Adheres strictly to Salamat-Yar DESIGN.md (Report/Print Surface):
 * - Clean tabular layout in grayscale
 * - Jalali dates with Latin digits
 * - Isolated iframe printing via react-to-print
 */
const PrintablePrescription = ({ prescription }) => {
  const printRef = useRef(null);

  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `نسخه_پزشک_${prescription?.uuid ? prescription.uuid.slice(0, 8) : 'سلامت‌یار'}`,
  });

  if (!prescription) return null;

  const handlePrint = () => {
    if (!printRef.current) return;
    try {
      triggerPrint();
    } catch {
      window.print();
    }
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

      {/* Hidden container that becomes visible during print */}
      <div className="print-prescription-host" aria-hidden="true">
        <div ref={printRef} className="print-rx-slip">
          {/* Header */}
          <div className="print-rx-header">
            <div>
              <h1 className="print-rx-title">برگه نسخه درمانی (سلامت‌یار)</h1>
              <span className="print-rx-uuid">
                شناسه پیگیری نسخه: {prescription.uuid}
              </span>
            </div>
            <div style={{ textAlign: 'left', fontSize: '10pt', fontWeight: 600, color: '#111827' }}>
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
            {prescription.clinic_name && (
              <div className="print-rx-meta-row">
                <strong>مرکز درمانی / مطب:</strong>
                <span>{prescription.clinic_name}</span>
              </div>
            )}
            {prescription.patient_national_code && (
              <div className="print-rx-meta-row">
                <strong>کد ملی بیمار:</strong>
                <span>{prescription.patient_national_code}</span>
              </div>
            )}
          </div>

          {/* Medications Table */}
          <table className="print-rx-table">
            <thead>
              <tr>
                <th style={{ width: '32px' }}>#</th>
                <th>نام دارو (Generic / Brand)</th>
                <th>شکل دارویی</th>
                <th>دوز</th>
                <th>دستور و فواصل مصرف</th>
                <th>تعداد</th>
                <th>طول دوره</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items && prescription.items.length > 0 ? (
                prescription.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong style={{ display: 'block', fontWeight: 700, fontSize: '11pt' }}>{item.drug_name}</strong>
                      {item.instructions && (
                        <span className="print-rx-instruction">
                          دستور: {item.instructions}
                        </span>
                      )}
                    </td>
                    <td>{item.dosage_form || '—'}</td>
                    <td>{item.dosage || '—'}</td>
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
            <div className="print-rx-notes">
              <strong>توصیه‌ها و یادداشت‌های پزشک:</strong> {prescription.notes}
            </div>
          )}

          {/* Footer & Signature Stamp */}
          <div className="print-rx-footer">
            <div className="print-rx-disclaimer">
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
