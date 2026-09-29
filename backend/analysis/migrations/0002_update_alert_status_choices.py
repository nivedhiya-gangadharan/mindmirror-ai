from django.db import migrations, models


def migrate_alert_status_forward(apps, schema_editor):
    Alert = apps.get_model('analysis', 'Alert')
    # Collapse 'new' and 'acknowledged' into 'active'
    Alert.objects.filter(status__in=['new', 'acknowledged']).update(status='active')


def migrate_alert_status_backward(apps, schema_editor):
    Alert = apps.get_model('analysis', 'Alert')
    # Backward: map 'active' back to 'new'
    Alert.objects.filter(status='active').update(status='new')


class Migration(migrations.Migration):

    dependencies = [
        ('analysis', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrate_alert_status_forward, migrate_alert_status_backward),
        migrations.AlterField(
            model_name='alert',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('resolved', 'Resolved')],
                default='active',
                max_length=20
            ),
        ),
    ]