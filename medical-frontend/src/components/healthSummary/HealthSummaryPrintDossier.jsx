/**
 * One-page printable snapshot of the patient's clinical history, designed
 * for hospitalization paperwork or doctor visits.
 *
 * Rendered off-screen inside HealthSummaryView and printed via react-to-print;
 * empty sections are omitted entirely so the sheet stays compact.
 *
 * @param {{innerRef: import('react').Ref<Object>,
 *          summary: object, profile: object|null}} props - Print-target props.
 * @param {import('react').Ref<Object>} props.innerRef - Attached to the printable wrapper div.
 * @param {object} props.summary - Full health-summary state (five sections).
 * @param {object|null} props.profile - Patient profile used in the identity header.
 * @returns {JSX.Element} Static printable document markup.
 */
const HealthSummaryPrintDossier = ({ innerRef, summary, profile }) => {
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || '—';

  const generatedAt = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div ref={innerRef} className="phr-print">
      <header className="phr-head">
        <div>
          <h1>🩺 خلاصه سوابق بالینی بیمار</h1>
          <p className="phr-tagline">سلامت‌یار — سامانه مدیریت پرونده سلامت</p>
        </div>
        <p className="phr-meta">تاریخ صدور: <strong>{generatedAt}</strong></p>
      </header>

      <section className="phr-patient">
        <span><b>بیمار:</b> {fullName}</span>
        <span><b>کد ملی:</b> {profile?.national_code || '—'}</span>
        {profile?.blood_group && <span><b>گروه خونی:</b> {profile.blood_group}</span>}
      </section>

      {summary.allergies.length > 0 && (
        <section className="phr-block phr-alert">
          <h2>⚠️ آلرژی‌ها</h2>
          <ul>
            {summary.allergies.map((a) => (
              <li key={a.id}>
                <strong>{a.allergen}</strong>
                {a.severity ? ` (${a.severity})` : ''}
                {a.reaction ? ` — ${a.reaction}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.conditions.length > 0 && (
        <section className="phr-block">
          <h2>🩺 بیماری‌ها و شرایط</h2>
          <ul>
            {summary.conditions.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                {c.status ? ` (${c.status})` : ''}
                {c.diagnosedDate ? ` — تشخیص: ${c.diagnosedDate}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.medications.length > 0 && (
        <section className="phr-block">
          <h2>💊 داروهای مصرفی</h2>
          <ul>
            {summary.medications.map((m) => (
              <li key={m.id}>
                <strong>{m.name}</strong>
                {m.dosage ? ` — ${m.dosage}` : ''}
                {m.frequency ? ` (${m.frequency})` : ''}
                {m.isActive === false ? ' — متوقف شده' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.immunizations.length > 0 && (
        <section className="phr-block">
          <h2>💉 واکسیناسیون</h2>
          <ul>
            {summary.immunizations.map((v) => (
              <li key={v.id}>
                <strong>{v.vaccineName}</strong>
                {v.dateAdministered ? ` — ${v.dateAdministered}` : ''}
                {v.boosterDueDate ? ` (یادآور: ${v.boosterDueDate})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.carePlan.length > 0 && (
        <section className="phr-block">
          <h2>🎯 اهداف و برنامه مراقبت</h2>
          <ul>
            {summary.carePlan.map((g) => (
              <li key={g.id}>
                <strong>{g.title}</strong>
                {g.targetMetric ? ` — ${g.targetMetric}` : ''}
                {g.status === 'achieved' ? ' ✅' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="phr-foot">
        این خلاصه توسط سامانه سلامت‌یار تولید شده و صرفاً جنبه کمکی دارد.
      </footer>
    </div>
  );
};

export default HealthSummaryPrintDossier;
