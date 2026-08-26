import { useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import {
  getHealthSummary,
  addItem,
  updateItem,
  deleteItem,
  CONDITION_STATUSES,
  ALLERGY_SEVERITIES,
  CARE_PLAN_STATUSES,
} from '../../utils/healthSummaryUtils';
import { getReminderStatus } from '../../utils/reminderUtils';
import AddHealthSummaryItemModal from './AddHealthSummaryItemModal';
import HealthSummaryPrintDossier from './HealthSummaryPrintDossier';
import './HealthSummaryView.css';

const toFa = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/* ---------- پیکربندی بخش‌ها و فیلدهای فرم ---------- */

const SECTION_DEFS = {
  conditions: {
    emoji: '🩺',
    title: 'بیماری‌ها و شرایط فعال',
    itemTitle: (item) => item.name,
    fields: [
      { name: 'name', label: 'نام بیماری / شرایط', required: true, type: 'text', suggestions: ['دیابت نوع ۲', 'فشار خون بالا', 'کم‌کاری تیروئید', 'چاقی', 'آنمی کم‌خونی'] },
      { name: 'status', label: 'وضعیت', type: 'select', defaultValue: 'active', options: Object.entries(CONDITION_STATUSES).map(([value, v]) => ({ value, label: v.label })) },
      { name: 'diagnosedDate', label: 'تاریخ تشخیص', type: 'date' },
      { name: 'notes', label: 'یادداشت', type: 'textarea', placeholder: 'توضیحات تکمیلی پزشک...' },
    ],
  },
  medications: {
    emoji: '💊',
    title: 'داروهای مصرفی جاری',
    itemTitle: (item) => `${item.name} ${item.dosage || ''}`.trim(),
    fields: [
      { name: 'name', label: 'نام دارو', required: true, type: 'text', suggestions: ['متفورمین ۵۰۰', 'لووتیروکسین ۵۰', 'آتورواستاتین ۲۰', 'آسپرین ۸۰'] },
      { name: 'dosage', label: 'دوز مصرف', type: 'text', placeholder: 'مثلاً ۵۰۰ میلی‌گرم' },
      { name: 'frequency', label: 'دفعات مصرف', type: 'text', placeholder: 'مثلاً ۲ بار در روز بعد از غذا' },
      { name: 'instructions', label: 'توضیحات مصرف', type: 'textarea' },
      { name: 'isActive', label: 'وضعیت مصرف', type: 'select', defaultValue: 'active', options: [{ value: 'active', label: 'فعال' }, { value: 'stopped', label: 'متوقف شده' }] },
    ],
  },
  allergies: {
    emoji: '⚠️',
    title: 'حساسیت‌ها و آلرژی‌ها',
    itemTitle: (item) => item.allergen,
    fields: [
      { name: 'allergen', label: 'ماده حساسیت‌زا', required: true, type: 'text', suggestions: ['پنی‌سیلین', 'NSAIDs (ایبوپروفن)', 'آسپرین', 'میگو', 'بادام‌زمینی', 'گرده گیاهان'] },
      { name: 'severity', label: 'شدت', type: 'select', defaultValue: 'moderate', options: Object.entries(ALLERGY_SEVERITIES).map(([value, v]) => ({ value, label: v.label })) },
      { name: 'reaction', label: 'واکنش آلرژیک', type: 'text', placeholder: 'مثلاً کهیر، تنگی نفس' },
      { name: 'notes', label: 'یادداشت', type: 'textarea' },
    ],
  },
  immunizations: {
    emoji: '💉',
    title: 'واکسیناسیون و ایمن‌سازی',
    itemTitle: (item) => item.vaccineName,
    fields: [
      { name: 'vaccineName', label: 'نام واکسن', required: true, type: 'text', suggestions: ['واکسن آنفلوانزا سالانه', 'دوز تقویتی کرونا', 'واکسن کزاز', 'هپاتیت B'] },
      { name: 'dateAdministered', label: 'تاریخ تزریق', type: 'date' },
      { name: 'boosterDueDate', label: 'موعد دوز یادآور', type: 'date' },
      { name: 'notes', label: 'یادداشت', type: 'textarea' },
    ],
  },
  carePlan: {
    emoji: '🎯',
    title: 'برنامه مراقبت و اهداف سلامت',
    itemTitle: (item) => item.title,
    fields: [
      { name: 'title', label: 'عنوان هدف', required: true, type: 'text', suggestions: ['کنترل قند ناشتا', 'کاهش وزن', 'پیاده‌روی روزانه', 'کنترل فشار خون'] },
      { name: 'targetMetric', label: 'سنجه هدف', type: 'text', placeholder: 'مثلاً قند ناشتا زیر ۱۱۰' },
      { name: 'targetDate', label: 'مهلت هدف', type: 'date' },
      { name: 'status', label: 'وضعیت', type: 'select', defaultValue: 'in_progress', options: Object.entries(CARE_PLAN_STATUSES).map(([value, v]) => ({ value, label: v.label })) },
    ],
  },
};

const SCREENING_SUGGESTIONS = [
  'فشار خون — هر ۶ ماه',
  'قند خون ناشتا — سالانه',
  'پروفایل چربی — سالانه',
  'معاینه چشم — سالانه',
];

/* ---------- Component ---------- */

const HealthSummaryView = ({ profile, reminders = [], summary, onChange }) => {
  const [editor, setEditor] = useState({ open: false, section: null, item: null });

  const dossierRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: dossierRef,
    documentTitle: 'خلاصه سوابق بالینی بیمار - سلامت‌یار',
  });

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter((r) => !r.isCompleted)
        .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
        .slice(0, 4),
    [reminders]
  );

  const handleSubmit = (data) => {
    const { section, item } = editor;
    if (item) {
      updateItem(section, item.id, data);
      toast.success('✏️ تغییرات با موفقیت ذخیره شد.');
    } else {
      addItem(section, data);
      toast.success('✅ مورد جدید افزوده شد.');
    }
    onChange(getHealthSummary());
    setEditor((prev) => ({ ...prev, open: false }));
  };

  const handleDelete = (section, item) => {
    if (!window.confirm(`حذف «${SECTION_DEFS[section].itemTitle(item)}»؟`)) return;
    deleteItem(section, item.id);
    onChange(getHealthSummary());
    toast.success('مورد حذف شد.');
  };

  const toggleMedicationActive = (med) => {
    updateItem('medications', med.id, { isActive: !med.isActive });
    onChange(getHealthSummary());
  };

  /* ---------- رندر آیتم هر بخش ---------- */

  const renderItem = (section, item) => {
    switch (section) {
      case 'conditions':
        return (
          <>
            <strong className="hs-item-name">{item.name}</strong>
            <span className={`hs-chip hs-tone-${CONDITION_STATUSES[item.status]?.tone || 'neutral'}`}>
              {CONDITION_STATUSES[item.status]?.label || item.status}
            </span>
            {item.diagnosedDate && <span className="hs-muted">تشخیص: {toFa(item.diagnosedDate)}</span>}
            {item.notes && <p className="hs-notes">{item.notes}</p>}
          </>
        );
      case 'medications':
        return (
          <>
            <strong className="hs-item-name">{item.name}</strong>
            {item.dosage && <span className="hs-chip">{item.dosage}</span>}
            {item.frequency && <span className="hs-muted">{item.frequency}</span>}
            <button
              type="button"
              role="switch"
              aria-checked={item.isActive !== false}
              className={`hs-switch ${item.isActive !== false ? 'hs-switch-on' : ''}`}
              onClick={() => toggleMedicationActive(item)}
              title={item.isActive !== false ? 'توقف مصرف' : 'فعال‌سازی مجدد'}
            >
              <span className="hs-switch-knob" />
              <span className="hs-switch-text">{item.isActive !== false ? 'فعال' : 'متوقف'}</span>
            </button>
            {item.instructions && <p className="hs-notes">{item.instructions}</p>}
          </>
        );
      case 'allergies': {
        const severityMeta = ALLERGY_SEVERITIES[item.severity] || ALLERGY_SEVERITIES.mild;
        return (
          <>
            <strong className="hs-item-name">{item.allergen}</strong>
            <span className={`hs-chip hs-sev-${item.severity}`}>{severityMeta.label}</span>
            {item.reaction && <span className="hs-muted">واکنش: {item.reaction}</span>}
            {item.notes && <p className="hs-notes">{item.notes}</p>}
          </>
        );
      }
      case 'immunizations': {
        let boosterTone = null;
        if (item.boosterDueDate) {
          const due = new Date(item.boosterDueDate);
          const diffDays = Math.ceil((due - new Date()) / 86400000);
          if (!Number.isNaN(diffDays)) {
            boosterTone = diffDays <= 30 ? (diffDays < 0 ? 'danger' : 'warn') : null;
          }
        }
        return (
          <>
            <strong className="hs-item-name">{item.vaccineName}</strong>
            {item.dateAdministered && <span className="hs-muted">تزریق: {toFa(item.dateAdministered)}</span>}
            {item.boosterDueDate && (
              <span className={`hs-booster ${boosterTone ? `hs-booster-${boosterTone}` : ''}`}>
                دوز یادآور: {toFa(item.boosterDueDate)}
                {boosterTone === 'warn' && ' — نزدیک است'}
                {boosterTone === 'danger' && ' — گذشته'}
              </span>
            )}
            {item.notes && <p className="hs-notes">{item.notes}</p>}
          </>
        );
      }
      case 'carePlan': {
        const achieved = item.status === 'achieved';
        return (
          <>
            <strong className="hs-item-name">{item.title}</strong>
            <span className={`hs-chip hs-tone-${CARE_PLAN_STATUSES[item.status]?.tone || 'neutral'}`}>
              {CARE_PLAN_STATUSES[item.status]?.label || item.status}
            </span>
            {item.targetMetric && <span className="hs-muted">هدف: {item.targetMetric}</span>}
            {item.targetDate && <span className="hs-muted">مهلت: {toFa(item.targetDate)}</span>}
            <div className={`hs-progress ${achieved ? 'hs-progress-done' : ''}`}>
              <div style={{ width: achieved ? '100%' : '45%' }} />
            </div>
          </>
        );
      }
      default:
        return null;
    }
  };

  const renderSectionCard = (sectionKey) => {
    const def = SECTION_DEFS[sectionKey];
    const items = summary[sectionKey] || [];
    return (
      <section className="hs-card" key={sectionKey}>
        <header className="hs-card-head">
          <h3><span aria-hidden="true">{def.emoji}</span> {def.title}</h3>
          <div className="hs-card-tools">
            <span className="hs-count">{toFa(items.length)}</span>
            <button
              type="button"
              className="hs-add-btn"
              onClick={() => setEditor({ open: true, section: sectionKey, item: null })}
              aria-label={`افزودن مورد جدید به ${def.title}`}
            >
              +
            </button>
          </div>
        </header>

        {items.length === 0 ? (
          <p className="hs-empty">موردی ثبت نشده است.</p>
        ) : (
          <ul className="hs-list">
            {items.map((item) => (
              <li key={item.id} className={`hs-item ${sectionKey === 'allergies' ? `hs-allergy hs-allergy-${item.severity}` : ''}`}>
                <div className="hs-item-body">{renderItem(sectionKey, item)}</div>
                <div className="hs-item-tools">
                  <button
                    type="button"
                    className="hs-tool-btn"
                    onClick={() => setEditor({ open: true, section: sectionKey, item })}
                    aria-label="ویرایش"
                    title="ویرایش"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="hs-tool-btn hs-tool-danger"
                    onClick={() => handleDelete(sectionKey, item)}
                    aria-label="حذف"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="hs-view">
      <header className="hs-view-head">
        <div>
          <h2 className="hs-view-title">🩺 خلاصه پرونده سلامت</h2>
          <p className="hs-view-sub">
            نمای جامع شرایط پزشکی، داروها، آلرژی‌ها، واکسن‌ها و اهداف سلامتی شما.
          </p>
        </div>
        <button type="button" className="hs-print-btn" onClick={() => handlePrint()}>
          🖨️ چاپ خلاصه بالینی
        </button>
      </header>

      <div className="hs-grid">
        {renderSectionCard('allergies')}
        {renderSectionCard('conditions')}
        {renderSectionCard('medications')}

        {/* ستون پیشگیرانه */}
        <section className="hs-card">
          <header className="hs-card-head">
            <h3><span aria-hidden="true">🛡️</span> مراقبت‌های پیشگیرانه و غربالگری</h3>
          </header>
          {upcomingReminders.length > 0 ? (
            <ul className="hs-list">
              {upcomingReminders.map((reminder) => {
                const status = getReminderStatus(reminder);
                return (
                  <li key={reminder.id} className="hs-item">
                    <div className="hs-item-body">
                      <strong className="hs-item-name">{reminder.title}</strong>
                      <span className={`hs-chip hs-tone-${status.tone}`}>{status.label}</span>
                      <span className="hs-muted">{toFa(reminder.targetDate)}</span>
                    </div>
                  </li>
                );
              })}
              <li className="hs-hint-line">مدیریت کامل از ویجت «یادآور و تقویم دوره‌ای» بالای صفحه.</li>
            </ul>
          ) : (
            <>
              <p className="hs-empty">برنامه یادآوری فعالی ثبت نشده است.</p>
              <ul className="hs-list hs-screenings">
                {SCREENING_SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion} className="hs-item">
                    <div className="hs-item-body"><span className="hs-muted">• {suggestion}</span></div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {renderSectionCard('immunizations')}
        {renderSectionCard('carePlan')}
      </div>

      {/* نسخه چاپی A4 */}
      <div className="phr-print-host">
        <div ref={dossierRef}>
          <HealthSummaryPrintDossier summary={summary} profile={profile} />
        </div>
      </div>

      <AddHealthSummaryItemModal
        isOpen={editor.open}
        onClose={() => setEditor((prev) => ({ ...prev, open: false }))}
        sectionTitle={editor.section ? SECTION_DEFS[editor.section].title : ''}
        emoji={editor.section ? SECTION_DEFS[editor.section].emoji : ''}
        fields={editor.section ? SECTION_DEFS[editor.section].fields : []}
        initialItem={editor.item}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default HealthSummaryView;
