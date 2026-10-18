import core.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_userrole_specialty_alter_userrole_medical_id_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Rename existing fields
        migrations.RenameField(
            model_name='prescription',
            old_name='visit_date',
            new_name='prescribed_date',
        ),
        migrations.RenameField(
            model_name='prescriptionitem',
            old_name='medicine_name',
            new_name='drug_name',
        ),
        migrations.RenameField(
            model_name='prescriptionitem',
            old_name='dosage',
            new_name='strength_dose',
        ),
        migrations.AlterField(
            model_name='prescription',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='زمان ایجاد'),
        ),
        migrations.AlterField(
            model_name='prescription',
            name='prescribed_date',
            field=models.DateField(verbose_name='تاریخ تجویز'),
        ),
        migrations.AlterField(
            model_name='prescriptionitem',
            name='strength_dose',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='دوز/قدرت دارو'),
        ),

        # 2. Add nullable UUID field without default (Step 1 of 3)
        migrations.AddField(
            model_name='prescription',
            name='uuid',
            field=models.UUIDField(
                null=True,
                editable=False,
                verbose_name='شناسه عمومی یکتا'
            ),
        ),

        # 3. Add fields to Prescription
        migrations.AddField(
            model_name='prescription',
            name='external_doctor_clinic',
            field=models.CharField(blank=True, max_length=150, null=True, verbose_name='مطب / کلینیک پزشک'),
        ),
        migrations.AddField(
            model_name='prescription',
            name='external_doctor_license_number',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='شماره نظام پزشکی پزشک خارجی'),
        ),
        migrations.AddField(
            model_name='prescription',
            name='source',
            field=models.CharField(
                choices=[
                    ('manual', 'ثبت دستی'),
                    ('paper_upload', 'آپلود نسخه کاغذی'),
                    ('ai_extracted', 'استخراج با هوش مصنوعی')
                ],
                default='manual',
                max_length=20,
                verbose_name='منبع ثبت نسخه'
            ),
        ),
        migrations.AddField(
            model_name='prescription',
            name='scan_file',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=core.models.prescription_scan_upload_to,
                verbose_name='فایل اسکن نسخه'
            ),
        ),
        migrations.AddField(
            model_name='prescription',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_prescriptions',
                to=settings.AUTH_USER_MODEL,
                verbose_name='کاربر ثبت‌کننده'
            ),
        ),
        migrations.AddField(
            model_name='prescription',
            name='updated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='updated_prescriptions',
                to=settings.AUTH_USER_MODEL,
                verbose_name='کاربر ویرایش‌کننده'
            ),
        ),
        migrations.AddField(
            model_name='prescription',
            name='deleted_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='deleted_prescriptions',
                to=settings.AUTH_USER_MODEL,
                verbose_name='کاربر حذف‌کننده'
            ),
        ),
        migrations.AddField(
            model_name='prescription',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان حذف'),
        ),
        migrations.AddField(
            model_name='prescription',
            name='is_deleted',
            field=models.BooleanField(db_index=True, default=False, verbose_name='حذف نرم شده'),
        ),
        migrations.AddField(
            model_name='prescription',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='زمان آخرین ویرایش'),
        ),
        migrations.AlterModelOptions(
            name='prescription',
            options={
                'ordering': ['-prescribed_date', '-created_at'],
                'verbose_name': 'نسخه',
                'verbose_name_plural': 'نسخه‌ها'
            },
        ),

        # 4. Add fields to PrescriptionItem
        migrations.AddField(
            model_name='prescriptionitem',
            name='form',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='شکل دارویی (قرص، کپسول، شربت...)'),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='quantity',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='تعداد / مقدار'),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='instructions',
            field=models.TextField(blank=True, null=True, verbose_name='دستورات تکمیلی'),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='order',
            field=models.PositiveIntegerField(default=0, verbose_name='ترتیب نمایش'),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='is_deleted',
            field=models.BooleanField(db_index=True, default=False, verbose_name='حذف نرم شده'),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان حذف'),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='deleted_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='deleted_prescription_items',
                to=settings.AUTH_USER_MODEL,
                verbose_name='کاربر حذف‌کننده'
            ),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='prescriptionitem',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True, blank=True),
        ),
        migrations.AlterModelOptions(
            name='prescriptionitem',
            options={
                'ordering': ['order', 'id'],
                'verbose_name': 'قلم دارویی',
                'verbose_name_plural': 'اقلام دارویی'
            },
        ),
    ]
