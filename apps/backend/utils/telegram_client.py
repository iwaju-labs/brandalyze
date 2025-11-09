import logging
import requests
import html
from django.conf import settings
from threading import Thread

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org"

def _get_credentials():
    """get bot token and chat id from settitngs"""
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    chat_id = getattr(settings, "TELEGRAM_CHAT_ID", "")
    return token, chat_id

def escape_html(text):
    """safely escape HTML in messages"""
    return html.escape(str(text))

def send_telegram_message(text: str, parse_mode: str = "HTML") -> bool:
    """
    send message synchronously to Telegram
    return True/False on success/failure
    """
    token, chat_id = _get_credentials()

    if not token or not chat_id:
        logger.warning("Telegram not configured (missing bot_token and/or chat_id)")
        return False
    
    # truncate long messages
    if len(text) > 4000:
        text = text[:3997] + "..."

    url = f"{TELEGRAM_API_URL}/bot{token}/sendMessage"
    payload = {
        "chat_id": str(chat_id),
        "text": text,
        "parse_mode": parse_mode
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()

        data = response.json()
        if not data.get("ok"):
            logger.error("Telegram API error: %s", data.get("description", "Unknown error"))
            return False
        
        logger.info("Telegram message sent successfully")
        return True
    
    except Exception as e:
        logger.exception("Failed to send Telegram message: %s", str(e))
        return False
    
def send_telegram_message_async(text: str):
    """Send message in background thread (non-blocking)."""
    Thread(target=send_telegram_message, args=(text,), daemon=True).start()