import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_prescription_uuid_populate'),
    ]

    operations = [
        # Enforce unique, not null and index on uuid
        migrations.AlterField(
            model_name='prescription',
            name='uuid',
            field=models.UUIDField(
                default=uuid.uuid4,
                unique=True,
                editable=False,
                db_index=True,
                verbose_name='شناسه عمومی یکتا'
            ),
        ),
        # Add CheckConstraint so exactly one of registered_doctor or external_doctor_name is set
        migrations.AddConstraint(
            model_name='prescription',
            constraint=models.CheckConstraint(
                condition=(
                    (models.Q(registered_doctor__isnull=False) & (models.Q(external_doctor_name__isnull=True) | models.Q(external_doctor_name='')))
                    |
                    (models.Q(registered_doctor__isnull=True) & models.Q(external_doctor_name__isnull=False) & ~models.Q(external_doctor_name=''))
                ),
                name='prescription_exactly_one_doctor'
            ),
        ),
    ]
