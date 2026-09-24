import { useState, useRef } from 'react';
import API from '../api';
import { toast } from 'react-toastify';

const SmartScanButton = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsScanning(true);
    const toastId = toast.loading('🤖 هوش مصنوعی در حال خواندن برگه آزمایش و ثبت خودکار...');

    try {
      const res = await API.post('test-results/auto-extract/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const extractedName = res.data?.extracted_raw?.test_name || 'آزمایش';
      toast.update(toastId, {
        render: `✅ آزمایش «${extractedName}» با موفقیت استخراج و به همراه تصویر ثبت شد!`,
        type: 'success',
        isLoading: false,
        autoClose: 4000,
      });

      if (onScanComplete) {
        onScanComplete();
      }
    } catch (err) {
      toast.update(toastId, {
        render: err.response?.data?.error || 'خطا در پردازش و استخراج تصویر آزمایش',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <button
        type="button"
        disabled={isScanning}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          padding: '0.5rem 1rem',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: isScanning ? 'wait' : 'pointer',
          boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'transform 0.15s ease',
          opacity: isScanning ? 0.7 : 1,
        }}
        title="آپلود تصویر آزمایش جهت استخراج خودکار فاکتورها توسط هوش مصنوعی"
      >
        {isScanning ? (
          <>⏳ در حال آنالیز تصویر...</>
        ) : (
          <>📷 اسکن هوشمند با AI</>
        )}
      </button>
    </>
  );
};

export default SmartScanButton;