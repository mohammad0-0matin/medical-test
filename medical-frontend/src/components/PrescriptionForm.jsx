import React, { useState } from 'react';

const PrescriptionForm = () => {
  // ۱. State برای اطلاعات کلی نسخه
  const [formData, setFormData] = useState({
    visit_date: '',
    diagnosis: '',
    notes: '',
    external_doctor_name: ''
  });

  // ۲. State برای لیست داینامیک اقلام دارویی
  const [items, setItems] = useState([
    { medicine_name: '', dosage: '', frequency: '', duration: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // هندل کردن تغییرات فیلدهای اصلی
  const handleMainChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // هندل کردن تغییرات فیلدهای دارویی
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index][name] = value;
    setItems(newItems);
  };

  // اضافه کردن یک ردیف داروی جدید
  const addMedicine = () => {
    setItems([...items, { medicine_name: '', dosage: '', frequency: '', duration: '' }]);
  };

  // حذف کردن یک ردیف دارو
  const removeMedicine = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // ارسال نهایی اطلاعات به سرور
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // ساختن JSON دقیقاً مطابق با چیزی که سریالایزر جنگو انتظار دارد
    const payload = {
      ...formData,
      items: items
    };

    try {
      // توکن احراز هویت را از لوکال استوریج یا کانتکست خودت بگیر
      const token = localStorage.getItem('access_token'); 

      const response = await fetch('/api/prescriptions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // اگر احراز هویت نیاز است
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'نسخه با موفقیت ثبت شد!' });
        // پاک کردن فرم بعد از ثبت موفق
        setFormData({ visit_date: '', diagnosis: '', notes: '', external_doctor_name: '' });
        setItems([{ medicine_name: '', dosage: '', frequency: '', duration: '' }]);
      } else {
        const errorData = await response.json();
        console.error('خطای سرور:', errorData);
        setMessage({ type: 'error', text: 'خطا در ثبت اطلاعات. لطفاً ورودی‌ها را بررسی کنید.' });
      }
    } catch (error) {
      console.error('خطای شبکه:', error);
      setMessage({ type: 'error', text: 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', direction: 'rtl' }}>
      <h2>ثبت نسخه جدید</h2>
      {message && (
        <div style={{ color: message.type === 'success' ? 'green' : 'red', marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* بخش اطلاعات کلی */}
        <fieldset style={{ marginBottom: '2rem', padding: '1rem' }}>
          <legend>اطلاعات پایه</legend>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label>نام پزشک (خارجی):</label>
              <input 
                type="text" 
                name="external_doctor_name" 
                value={formData.external_doctor_name} 
                onChange={handleMainChange} 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>تاریخ ویزیت:</label>
              <input 
                type="date" 
                name="visit_date" 
                value={formData.visit_date} 
                onChange={handleMainChange} 
                required 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>تشخیص بیماری:</label>
              <input 
                type="text" 
                name="diagnosis" 
                value={formData.diagnosis} 
                onChange={handleMainChange} 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>توضیحات تکمیلی:</label>
              <input 
                type="text" 
                name="notes" 
                value={formData.notes} 
                onChange={handleMainChange} 
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </fieldset>

        {/* بخش اقلام دارویی */}
        <fieldset style={{ marginBottom: '2rem', padding: '1rem' }}>
          <legend>اقلام دارویی</legend>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label>نام دارو:</label>
                <input 
                  type="text" 
                  name="medicine_name" 
                  value={item.medicine_name} 
                  onChange={(e) => handleItemChange(index, e)} 
                  required 
                />
              </div>
              <div>
                <label>دوز (مثلاً 500mg):</label>
                <input 
                  type="text" 
                  name="dosage" 
                  value={item.dosage} 
                  onChange={(e) => handleItemChange(index, e)} 
                />
              </div>
              <div>
                <label>تواتر (مثلاً هر ۸ ساعت):</label>
                <input 
                  type="text" 
                  name="frequency" 
                  value={item.frequency} 
                  onChange={(e) => handleItemChange(index, e)} 
                />
              </div>
              <div>
                <label>مدت مصرف (مثلاً یک هفته):</label>
                <input 
                  type="text" 
                  name="duration" 
                  value={item.duration} 
                  onChange={(e) => handleItemChange(index, e)} 
                />
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeMedicine(index)} style={{ color: 'red' }}>
                  حذف
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addMedicine} style={{ marginTop: '1rem' }}>
            + افزودن داروی جدید
          </button>
        </fieldset>

        {/* دکمه ارسال */}
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 2rem', fontSize: '1.1rem' }}>
          {loading ? 'در حال ثبت...' : 'ثبت نهایی نسخه'}
        </button>
      </form>
    </div>
  );
};

export default PrescriptionForm;