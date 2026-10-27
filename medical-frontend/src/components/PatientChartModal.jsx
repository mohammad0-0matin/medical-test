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

/** Modal header close-button glyph. */
const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** Empty-state icon when fewer than two data points exist. */
const TrendEmptyGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-5" />
    <path d="M15.5 8H19v3.5" />
  </svg>
);

/**
 * Trend chart (Recharts) of numeric results for one patient/test-type pair.
 *
 * Points are filtered from `allTests` to the same patient & test type with a
 * numeric value, mapped into chart series and sorted chronologically. The
 * first record's min/max range drives the shaded normal-range ReferenceArea;
 * fewer than two points renders an explanatory state instead.
 *
 * @param {{isOpen: boolean, onClose: Function, testData?: object|null,
 *          test?: object|null, allTests?: Array<object>}} props - Modal props.
 * @returns {JSX.Element|null} Chart modal, or null when closed.
 */
const PatientChartModal = ({ isOpen, onClose, testData, test, allTests = [] }) => {
  const currentTest = testData || test;

  // Filter and sort data points for the chart.
  const chartData = useMemo(() => {
    if (!isOpen || !currentTest) return [];

    const currentPatientId = typeof currentTest.patient === 'object' ? currentTest.patient?.id : currentTest.patient;
    const currentPatientName = currentTest.patient_name ||
      (currentTest.patient && typeof currentTest.patient === 'object'
        ? `${currentTest.patient.first_name || ''} ${currentTest.patient.last_name || ''}`.trim()
        : '');

    const currentTestType = typeof currentTest.test_type === 'object' ? currentTest.test_type?.id : currentTest.test_type;
    const currentTestTypeName = currentTest.test_type_name || currentTest.test_name || currentTest.name || '';

    let matched = (allTests || []).filter((t) => {
      const tPatientId = typeof t.patient === 'object' ? t.patient?.id : t.patient;
      const tPatientName = t.patient_name ||
        (t.patient && typeof t.patient === 'object'
          ? `${t.patient.first_name || ''} ${t.patient.last_name || ''}`.trim()
          : '');

      const samePatient =
        (currentPatientId && tPatientId && String(currentPatientId) === String(tPatientId)) ||
        (currentPatientName && tPatientName && currentPatientName === tPatientName) ||
        (!currentPatientId && !tPatientId);

      const tTestType = typeof t.test_type === 'object' ? t.test_type?.id : t.test_type;
      const tTestTypeName = t.test_type_name || t.test_name || t.name || '';

      const sameType =
        (currentTestType && tTestType && String(currentTestType) === String(tTestType)) ||
        (currentTestTypeName && tTestTypeName && currentTestTypeName === tTestTypeName);

      const hasNumeric = t.result_value !== null && t.result_value !== undefined && t.result_value !== '' && !isNaN(parseFloat(t.result_value));
      return samePatient && sameType && hasNumeric;
    });

    // Ensure the currentTest itself is included if it has a numeric result and wasn't already in matched
    if (currentTest.result_value !== null && currentTest.result_value !== undefined && currentTest.result_value !== '' && !isNaN(parseFloat(currentTest.result_value))) {
      const alreadyPresent = matched.some((m) => m.id === currentTest.id);
      if (!alreadyPresent) {
        matched = [...matched, currentTest];
      }
    }

    return matched
      .map((t) => {
        const rawDateStr = t.test_date || t.created_at;
        const d = rawDateStr ? new Date(rawDateStr) : null;
        const isValidDate = d && !isNaN(d.getTime());
        const dateString = isValidDate
          ? new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(d)
          : (rawDateStr || '—');

        return {
          dateString,
          rawDate: isValidDate ? d.getTime() : 0,
          value: parseFloat(t.result_value),
          min: t.lab_min_range !== null && t.lab_min_range !== undefined && t.lab_min_range !== '' ? parseFloat(t.lab_min_range) : null,
          max: t.lab_max_range !== null && t.lab_max_range !== undefined && t.lab_max_range !== '' ? parseFloat(t.lab_max_range) : null,
        };
      })
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [isOpen, currentTest, allTests]);

  // Extract the normal range for the background band.
  const safeMin = chartData.length > 0 ? chartData[0].min : (currentTest?.lab_min_range ? parseFloat(currentTest.lab_min_range) : null);
  const safeMax = chartData.length > 0 ? chartData[0].max : (currentTest?.lab_max_range ? parseFloat(currentTest.lab_max_range) : null);

  if (!isOpen || !currentTest) return null;

  const patientDisplayName =
    currentTest.patient_name ||
    (currentTest.patient && typeof currentTest.patient === 'object'
      ? `${currentTest.patient.first_name || ''} ${currentTest.patient.last_name || ''}`.trim()
      : (currentTest.patient ? `بیمار #${currentTest.patient}` : ''));

  const testTypeDisplayName =
    currentTest.test_type_name || currentTest.test_name || currentTest.name || 'آزمایش';

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
            {patientDisplayName && <>بیمار: <strong>{patientDisplayName}</strong> </>}
            <span className="pc-badge">{testTypeDisplayName}</span>
          </p>

          {chartData.length < 2 ? (
            <div className="pc-empty">
              <TrendEmptyGlyph />
              <p>برای رسم خط روند پیوسته، حداقل ۲ نتیجه عددی از این آزمایش لازم است.</p>
              {chartData.length === 1 ? (
                <p style={{ marginTop: '8px', color: 'var(--primary)' }}>
                  مقدار فعلی: <strong>{chartData[0].value}</strong> (ثبت شده در تاریخ {chartData[0].dateString})
                </p>
              ) : (
                <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
                  هنوز نتیجه عددی معتبری برای این آزمایش ثبت نشده است.
                </p>
              )}
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

                    {/* Draw the normal-range band when boundaries exist */}
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
                    بازه نرمال: {safeMin} تا {safeMax}
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
