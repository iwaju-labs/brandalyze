from django.apps import AppConfig


class AuditsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audits'

    def ready(self):
        # Pre-load ML models at startup to avoid cold start latency
        try:
            from audits.services.tweet_ml import TweetMLAnalyzer
            TweetMLAnalyzer.get_instance()
        except Exception:
            # Don't block startup if models aren't available
            pass
