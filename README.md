# 🏥 SalamatYar | سامانه هوشمند سلامت‌یار

![Django](https://img.shields.io/badge/Backend-Django_REST-092E20?style=flat-square&logo=django)
![React](https://img.shields.io/badge/Frontend-React.js-61DAFB?style=flat-square&logo=react&logoColor=black)
![AI](https://img.shields.io/badge/AI-Gemini_Vision_&_LLM-8E75B2?style=flat-square&logo=google)

**SalamatYar** is an Intelligent Health Management System that automates the extraction of unstructured clinical data from laboratory sheets using Vision AI and provides context-aware medical consultations through a Large Language Model (LLM).

**سلامت‌یار** یک سامانه یکپارچه و هوشمند برای مدیریت پرونده الکترونیک سلامت است که با استفاده از مدل‌های بینایی ماشین، داده‌های برگه‌های آزمایشگاهی را استخراج و ساختاردهی می‌کند. این سامانه همچنین دارای یک دستیار هوشمند تعاملی است که با تحلیل سوابق بالینی بیمار، مشاوره‌های شخصی‌سازی‌شده ارائه می‌دهد.

---

## ✨ امکانات کلیدی (Key Features)

* 📄 **اسکن هوشمند آزمایش (AI Smart Scan):** استخراج خودکار مقادیر، واحدها و بازه‌های نرمال از تصویر برگه‌های آزمایش با استفاده از مدل‌های Vision.
* 🤖 **دستیار سلامت هوشمند (AI Health Assistant):** چت‌بات تعاملی با قابلیت درک سوابق پزشکی بیمار (Context-Aware) برای ارائه مشاوره‌های اولیه و تحلیل وضعیت سلامت.
* 🔐 **مدیریت دسترسی نقش‌محور (RBAC):** تفکیک پنل بیماران و پزشکان با مکانیزم ایزوله‌سازی داده‌ها و تاییدیه دسترسی به پرونده.
* 📊 **داشبورد تعاملی نتایج:** نمایش وضعیت نرمال یا غیرنرمال فاکتورهای خونی به صورت بصری و یکپارچه.

---

## 🏗 معماری سامانه (Architecture)

* **لایه کاربر (Frontend):** توسعه‌یافته با `React.js` به صورت Single Page Application (SPA).
* **هسته پردازشی (Backend):** توسعه‌یافته با `Django` و `Django REST Framework (DRF)`.
* **پایگاه داده (Database):** `SQLite` (قابل ارتقا به PostgreSQL در محیط پروداکشن).
* **هوش مصنوعی (AI Integration):** استفاده از API مدل‌های زبانی و بینایی گوگل (Gemini).

---

## 🚀 راهنمای راه‌اندازی (Installation & Setup)

برای اجرای پروژه روی سیستم لوکال، مراحل زیر را به ترتیب دنبال کنید:

### ۱. راه‌اندازی بک‌اند (Django)
```bash
# رفتن به پوشه بک‌اند
cd backend

# ساخت محیط مجازی و فعال‌سازی آن
python -m venv venv
source venv/bin/activate  # در ویندوز: venv\Scripts\activate

# نصب نیازمندی‌ها
pip install -r requirements.txt

# اعمال مایگریشن‌های دیتابیس
python manage.py migrate

# اجرای سرور
python manage.py runserver
```

### ۲. تنظیم متغیرهای محیطی (Environment Variables)
در پوشه بک‌اند، یک فایل `.env` بسازید و کلیدهای API هوش مصنوعی خود را در آن قرار دهید:
```env
AI_API_KEY=your_gemini_api_key_here
AI_BASE_URL=your_api_base_url
```

### ۳. راه‌اندازی فرانت‌اند (React)
```bash
# باز کردن یک ترمینال جدید و رفتن به پوشه فرانت‌اند
cd frontend

# نصب پکیج‌های نود
npm install

# اجرای برنامه
npm start
```

---

## 🎓 درباره پروژه (About)


* **توسعه‌دهنده:** [mohammad0_0matin](https://github.com/mohammad0-0matin)[cite: 3]
* **تاریخ انتشار:** شهریور ۱۴۰۵[cite: 3]

> **توجه:** این سامانه نقش پشتیبان و دستیار را دارد و به هیچ وجه جایگزین تشخیص نهایی و دستورات پزشک معالج نیست.
