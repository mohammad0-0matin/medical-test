"""
سرویس هوشمند استخراج و کانتکست‌سازی داده‌های بالینی کاربر برای مدل زبانی (LLM).
"""
from .models import Patient, TestResult, HealthSummary
from openai import OpenAI
from django.conf import settings
from .models import ChatMessage
import json
import base64
import re
import httpx

def build_clinical_context(user) -> str:
    """
    سوابق کامل بیمار شامل اطلاعات دموگرافیک، آخرین آزمایش‌ها، آلرژی‌ها،
    داروها و شرایط مزمن را استخراج کرده و به صورت متن ساختاریافته برمی‌گرداند.
    """
    patient = Patient.objects.filter(user=user).first()
    if not patient:
        return "اطلاعات بالینی ثبت‌شده‌ای برای این کاربر یافت نشد."

    # ۱. مشخصات عمومی بیمار
    profile_lines = [
        f"- نام و نام خانوادگی: {user.get_full_name() or user.username}",
        f"- کدملی: {patient.national_code or 'ثبت‌نشده'}",
        f"- گروه خونی: {patient.blood_group if hasattr(patient, 'blood_group') and patient.blood_group else 'ثبت‌نشده'}",
    ]

   # ۲. آخرین آزمایش‌های تأییدشده بیمار (حداکثر ۱۰ مورد اخیر)
    test_results = (
        TestResult.objects.filter(patient=patient, status='approved')
        .select_related('test_type')
        .order_by('-test_date')[:10]
    )

    tests_lines = []
    for test in test_results:
        test_name = test.test_type.name if test.test_type else "نامشخص"
        unit = getattr(test.test_type, 'unit', '') or ''
        date_str = str(test.test_date) if hasattr(test, 'test_date') and test.test_date else "نامشخص"
        
        # خواندن فیلد صحیح result_value یا فیلد متنی result_text
        val = getattr(test, 'result_value', None)
        if val is None or val == '':
            val = getattr(test, 'result_text', None)

        value_str = f"{val} {unit}".strip() if val is not None else "ثبت‌نشده"
        tests_lines.append(f"- {test_name}: {value_str} (تاریخ: {date_str})")

    if not tests_lines:
        tests_lines.append("- آزمایشی ثبت نشده است.")

    # ۳. خلاصه سلامت (آلرژی‌ها، بیماری‌ها، داروها و ...)
    summary = HealthSummary.objects.filter(patient=patient).first()
    summary_lines = []

    if summary:
        # فیلدهای JSON یا متنی موجود در HealthSummary
        allergies = getattr(summary, 'allergies', []) or []
        conditions = getattr(summary, 'conditions', []) or []
        medications = getattr(summary, 'medications', []) or []

        if isinstance(allergies, list) and allergies:
            summary_lines.append("حساسیت‌ها (Allergies):")
            for item in allergies:
                allergen = item.get('allergen') or item.get('name') if isinstance(item, dict) else str(item)
                severity = f" (شدت: {item.get('severity')})" if isinstance(item, dict) and item.get('severity') else ""
                summary_lines.append(f"  * {allergen}{severity}")
        else:
            summary_lines.append("حساسیت‌ها: موردی ثبت نشده.")

        if isinstance(conditions, list) and conditions:
            summary_lines.append("بیماری‌ها و سوابق بالینی:")
            for item in conditions:
                cond_name = item.get('name') if isinstance(item, dict) else str(item)
                status_str = f" - وضعیت: {item.get('status')}" if isinstance(item, dict) and item.get('status') else ""
                summary_lines.append(f"  * {cond_name}{status_str}")
        else:
            summary_lines.append("بیماری‌ها: موردی ثبت نشده.")

        if isinstance(medications, list) and medications:
            summary_lines.append("داروهای مصرفی:")
            for item in medications:
                med_name = item.get('name') if isinstance(item, dict) else str(item)
                dose = f" (دوز: {item.get('dosage')})" if isinstance(item, dict) and item.get('dosage') else ""
                freq = f" - تکرار: {item.get('frequency')}" if isinstance(item, dict) and item.get('frequency') else ""
                summary_lines.append(f"  * {med_name}{dose}{freq}")
        else:
            summary_lines.append("داروهای مصرفی: موردی ثبت نشده.")
    else:
        summary_lines.append("خلاصه پرونده سلامت: تکمیل نشده است.")

    # ادغام تمام بخش‌ها
    context = (
        "=== اطلاعات بالینی و سوابق بیمار ===\n"
        + "\n".join(profile_lines)
        + "\n\n=== آخرین نتایج آزمایشگاهی ===\n"
        + "\n".join(tests_lines)
        + "\n\n=== خلاصه پرونده سلامت ===\n"
        + "\n".join(summary_lines)
    )
    return context


def get_system_prompt(user) -> str:
    """
    تولید System Prompt استاندارد، مشاوره‌ای و امن برای هدایت رفتار هوش مصنوعی.
    """
    patient_context = build_clinical_context(user)

    prompt = f"""
شما یک دستیار هوشمند و تحلیل‌گر تخصصی پرونده سلامت در سامانه «سلامت‌یار» هستید.
وظیفه شما راهنمایی کاربر بر اساس سوابق بالینی موجود، توضیح ساده اصطلاحات آزمایشگاهی و ارائه پیشنهادهای سبک زندگی سالم است.

دستورالعمل‌های حیاتی:
۱. شما پزشک معالج نیستید و مجاز به تجویز دارو، تغییر دوز یا اعلام قطعی بیماری خطرناک نیستید.
۲. همیشه با لحنی محترمانه، دلسوزانه و به زبان فارسی روان صحبت کنید.
۳. در پاسخ‌هایی که وضعیت غیرعادی گزارش می‌شود، صریحاً کاربر را به مراجعه و مشورت با پزشک متخصص ارجاع دهید.
۴. پاسخ‌های خود را به صورت ساختاریافته (استفاده از بولت‌پوینت و تیترهای کوتاه با Markdown) فرمت‌بندی کنید تا خوانایی بالایی داشته باشد.

اطلاعات پرونده بیمار جهت استناد:
{patient_context}
"""
    return prompt.strip()


def generate_ai_reply(session, user_message_text: str) -> str:
    """
    پرامپت بالینی و تاریخچه نشست را جمع‌آوری کرده، پیام جدید را به مدل ارسال می‌کند
    و پاسخ متنی دستیار را بازمی‌گرداند.
    """
    client = OpenAI(
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_BASE_URL,
    )

    # ۱. کانتکست و قوانین دستیار سلامت
    system_prompt = get_system_prompt(session.user)

    messages_payload = [
        {"role": "system", "content": system_prompt}
    ]

    # ۲. اضافه کردن تاریخچه ۶ پیام اخیر نشست برای حفظ پیوستگی صحبت
    recent_messages = session.messages.order_by('-created_at')[:6]
    for msg in reversed(recent_messages):
        role = "assistant" if msg.role == ChatMessage.ROLE_ASSISTANT else "user"
        messages_payload.append({"role": role, "content": msg.content})

    # ۳. اضافه کردن پیام جاری کاربر
    messages_payload.append({"role": "user", "content": user_message_text})

    try:
        response = client.chat.completions.create(
            model=settings.AI_MODEL_NAME,
            messages=messages_payload,
            temperature=0.4,  # دمای پایین‌تر برای پاسخ‌های دقیق‌تر و پایدارتر بالینی
            max_tokens=1000000,
        )
        return response.choices[0].message.content.strip()

    except Exception as exc:
        # مدیریت خطای عدم دسترسی، قطعی اینترنت یا اتمام اعتبار
        return (
            "متأسفانه در حال حاضر امکان برقراری ارتباط با سرویس تحلیل هوشمند وجود ندارد. "
            f"لطفاً لحظاتی بعد مجدداً تلاش کنید. (جزئیات: {str(exc)})"
        )

import base64
import json
import re
from django.conf import settings
from openai import OpenAI


def extract_lab_data_from_image(image_file) -> dict:
    """
    تصویر برگه آزمایش را خوانده و با Gemini فلش فاکتورهای کلیدی را به JSON تمیز تبدیل می‌کند.
    """
    image_bytes = image_file.read()
    image_file.seek(0)
    base64_encoded = base64.b64encode(image_bytes).decode('utf-8')
    mime_type = getattr(image_file, 'content_type', 'image/jpeg') or 'image/jpeg'

    http_client = httpx.Client(
        timeout=httpx.Timeout(60.0, connect=15.0),
    )
    
    client = OpenAI(
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_BASE_URL,
    )

    system_prompt = (
        "You are a medical OCR engine. Read the lab report image and extract data into valid JSON.\n"
        "Rules:\n"
        "1. Output ONLY valid, parseable JSON.\n"
        "2. Do NOT use Python 'None', NaN, or comments. Use strictly 'null' for absent values.\n"
        "3. Numeric fields must be real numbers or null (not strings).\n"
        "JSON structure:\n"
        "{\n"
        '  "test_name": "Fasting Blood Sugar (FBS)",\n'
        '  "result_value": 92.4,\n'
        '  "result_text": null,\n'
        '  "unit": "mg/dL",\n'
        '  "min_range": 70.0,\n'
        '  "max_range": 100.0,\n'
        '  "test_date": "2026-09-12",\n'
        '  "lab_name": "Farabi Lab"\n'
        "}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Extract the primary biochemistry test from this image according to the JSON format."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_encoded}"
                    }
                }
            ]
        }
    ]

    try:
        response = client.chat.completions.create(
            model=settings.AI_MODEL_NAME,
            messages=messages,
            temperature=0.0,
            max_tokens=600,
        )
        content = response.choices[0].message.content.strip()

        # حذف تگ‌های کد Markdown
        content = re.sub(r'^```(?:json)?\s*', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\s*```$', '', content)

        # استخراج محدوده آکولاد JSON
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)

        # اصلاح خطاهای رایج مدل (مثل نوشتن None به جای null یا مقادیر خالی)
        content = re.sub(r':\s*None\b', ': null', content)
        content = re.sub(r':\s*,', ': null,', content)
        content = re.sub(r',\s*\}', '}', content)

        return json.loads(content)

    except Exception as exc:
        print(f"❌ خطای کامل استخراج تصویر: {repr(exc)}")
        if 'content' in locals():
            print(f"📄 خروجی خام مدل: {content}")
        return {"error": str(exc)}