import { useNavigate } from 'react-router-dom';
import TestForm from '../components/TestForm';

/**
 * TestNewPage — صفحه مستقل اختصاصی برای ثبت نتیجه آزمایش جدید با اسکن هوشمند و پیش‌نمایش زنده.
 * جایگزین مودال قدیمی و فراهم‌کننده فضای کافی برای چیدمان دو ستونه دسکتاپ و فرم غنی.
 */
const TestNewPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="test-new-page-container">
      <TestForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
};

export default TestNewPage;
