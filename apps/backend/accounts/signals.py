from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@receiver(post_save, sender=User)
def notify_user_sign_up(sender, instance, created, **kwargs):
    """Send Telegram notification + email when a new user signs up"""
    if not created:
        return
    
    try:
        from utils.telegram_client import send_telegram_message_async, escape_html

        message = (
            f"🎉 <b>New User Signup</b>\n\n"
            f"📧 Email: <code>{escape_html(instance.email or 'N/A')}</code>\n"
            f"🆔 User ID: <code>{instance.pk}</code>\n"
            f"📅 Date: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}"
        )

        send_telegram_message_async(message)
        logger.info(f"Queued telegram notifcation for user: {instance.pk}")
        
        # Send welcome email
        from utils.email_service import send_welcome_email
        send_welcome_email(instance)
        logger.info(f"Sent welcome email to user: {instance.pk}")

    except Exception as e:
        logger.exception(f"Failed to send user signup notification: {e}")