import { useState } from 'react';
import './AddHealthSummaryItemModal.css';

/** Modal header close-button glyph. */
const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/**
 * Generic add/edit modal shared by every Health Summary section.
 * Form layout is fully data-driven through a `fields` descriptor array:
 * `{ name, label, type: 'text'|'date'|'select'|'textarea', options?,
 *    required?, placeholder?, suggestions?, defaultValue?, min? }`.
 *
 * @param {{isOpen: boolean, onClose: Function, sectionTitle: string,
 *          emoji: string, fields: Array<object>, initialItem: object|null,
 *          onSubmit: Function}} props - Modal configuration and callbacks.
 * @param {boolean} props.isOpen - Whether the modal is currently visible.
 * @param {Function} props.onClose - Requests closing the modal.
 * @param {string} props.sectionTitle - Title shown in the modal header.
 * @param {string} props.emoji - Emoji prefix rendered before the title.
 * @param {Array<object>} props.fields - Field descriptors driving the form.
 * @param {object|null} props.initialItem - Existing item when editing; null when adding.
 * @param {Function} props.onSubmit - Called with the collected form values after validation.
 * @returns {JSX.Element|null} Modal element, or null when closed.
 */
const AddHealthSummaryItemModal = ({
  isOpen,
  onClose,
  sectionTitle,
  emoji,
  fields,
  initialItem,
  onSubmit,
}) => {
  const [formData, setFormData] = useState(() => initialItem || {});
  const [formError, setFormError] = useState(null);

  // Reset the form whenever the target (section/item) changes.
  const [syncedKey, setSyncedKey] = useState('');
  const openKey = isOpen ? `${sectionTitle}-${initialItem?.id || 'new'}` : 'closed';

  if (openKey !== syncedKey) {
    setSyncedKey(openKey);
    if (isOpen) {
      const defaults = {};
      fields.forEach((field) => {
        defaults[field.name] =
          initialItem?.[field.name] ??
          field.defaultValue ??
          (field.type === 'select' ? field.options?.[0]?.value ?? '' : '');
      });
      setFormData(defaults);
      setFormError(null);
    }
  }

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    for (const field of fields) {
      if (field.required && !String(formData[field.name] || '').trim()) {
        setFormError(`پر کردن فیلد «${field.label}» الزامی است.`);
        return;
      }
    }

    setFormError(null);
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container hsm-modal">
        <div className="modal-header">
          <h2>
            {emoji} {initialItem ? 'ویرایش' : 'افزودن'} — {sectionTitle}
          </h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {fields.map((field) => (
              <div className={`form-group ${field.type === 'textarea' ? '' : ''}`} key={field.name}>
                <label className="form-label" htmlFor={`hsm-${field.name}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>

                {field.type === 'select' ? (
                  <select
                    id={`hsm-${field.name}`}
                    name={field.name}
                    value={formData[field.name] ?? ''}
                    onChange={handleChange}
                    className="form-input"
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={`hsm-${field.name}`}
                    name={field.name}
                    value={formData[field.name] ?? ''}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className="form-input form-textarea"
                  ></textarea>
                ) : (
                  <>
                    <input
                      id={`hsm-${field.name}`}
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] ?? ''}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className="form-input"
                      min={field.min}
                      list={field.suggestions ? `hsm-suggest-${field.name}` : undefined}
                      autoComplete="off"
                    />
                    {field.suggestions && (
                      <datalist id={`hsm-suggest-${field.name}`}>
                        {field.suggestions.map((suggestion) => (
                          <option key={suggestion} value={suggestion} />
                        ))}
                      </datalist>
                    )}
                  </>
                )}
              </div>
            ))}

            {formError && (
              <div className="modal-alert" role="alert">⚠️ {formError}</div>
            )}

            <div className="modal-footer">
              <button type="submit" className="btn-submit">
                {initialItem ? 'ذخیره تغییرات' : 'افزودن مورد'}
              </button>
              <button type="button" onClick={onClose} className="btn-cancel">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddHealthSummaryItemModal;
