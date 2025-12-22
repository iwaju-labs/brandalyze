from django.db import migrations


def seed_missions(apps, schema_editor):
    Mission = apps.get_model('onboarding', 'Mission')
    
    missions = [
        # Free tier
        {
            'id': 'free_first_sample',
            'title': 'Add your first brand sample',
            'description': 'Paste text content that represents your brand voice into the analysis form.',
            'tier': 'free',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 1,
            'is_manual': False,
        },
        {
            'id': 'free_three_samples',
            'title': 'Add 3 brand samples',
            'description': 'Build a stronger brand profile by adding multiple samples.',
            'tier': 'free',
            'mission_type': 'progress',
            'target_count': 3,
            'order': 2,
            'is_manual': False,
        },
        {
            'id': 'free_first_analysis',
            'title': 'Run your first brand alignment analysis',
            'description': 'Compare new content against your brand samples to check alignment.',
            'tier': 'free',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 3,
            'is_manual': False,
        },
        # Pro tier
        {
            'id': 'pro_first_audit',
            'title': 'Run your first post audit',
            'description': 'Audit a social media post for brand voice alignment.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 1,
            'is_manual': False,
        },
        {
            'id': 'pro_view_history',
            'title': 'View your audit history',
            'description': 'Review past audits to track your brand consistency over time.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 2,
            'is_manual': False,
        },
        {
            'id': 'pro_install_extension',
            'title': 'Install the Chrome extension',
            'description': 'Get real-time brand voice feedback directly in Twitter and LinkedIn.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 3,
            'is_manual': False,
        },
        {
            'id': 'pro_auth_extension',
            'title': 'Authenticate the extension',
            'description': 'Connect your extension to your Brandalyze account.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 4,
            'is_manual': False,
        },
        {
            'id': 'pro_config_emotions',
            'title': 'Configure emotional indicators',
            'description': 'Set your preferred emotional indicators in extension settings.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 5,
            'is_manual': True,
        },
        {
            'id': 'pro_add_handles',
            'title': 'Add your social handle(s)',
            'description': 'Add your Twitter or LinkedIn handles in extension settings.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 6,
            'is_manual': True,
        },
        {
            'id': 'pro_first_profile',
            'title': 'Run your first profile analysis',
            'description': 'Analyze your social media profile to extract your voice patterns.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 7,
            'is_manual': False,
        },
        {
            'id': 'pro_profile_audit',
            'title': 'Run a post audit using profile analysis',
            'description': 'Use your analyzed profile as the brand voice for a post audit.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 8,
            'is_manual': False,
        },
    ]
    
    for mission_data in missions:
        Mission.objects.update_or_create(
            id=mission_data['id'],
            defaults=mission_data
        )


def reverse_seed(apps, schema_editor):
    Mission = apps.get_model('onboarding', 'Mission')
    Mission.objects.all().delete()


class Migration(migrations.Migration):
    
    dependencies = [
        ('onboarding', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(seed_missions, reverse_seed),
    ]
