from django.db import migrations


def populate_all_prescription_uuids(apps, schema_editor):
    """Safe data migration: populate distinct UUIDs for all existing prescription rows."""
    import uuid
    Prescription = apps.get_model('core', 'Prescription')
    for p in Prescription.objects.all():
        p.uuid = uuid.uuid4()
        p.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_prescription_uuid_nullable'),
    ]

    operations = [
        migrations.RunPython(
            populate_all_prescription_uuids,
            reverse_code=migrations.RunPython.noop
        ),
    ]
