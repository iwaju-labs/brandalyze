import logging
import requests
from django.conf import settings
import resend
from accounts.models import User


def send_welcome_email(user: User):
    resend.api_key = getattr(settings, "RESEND_API_KEY");
    
    params = {
        "from": "dom <dom@brandalyze.io>",
        "to": [user.email],
        "subject": "Welcome to Brandalyze ✨",
        "html": render_welcome_template(user)
    }

    email = resend.Emails.send(params)
    print(email)

def render_welcome_template(user: User) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; text-align: center;">
                                <img src="https://brandalyze.io/icon-128.png" alt="Brandalyze" style="height: 50px; margin-bottom: 20px;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #000000; text-align: left;">Welcome to Brandalyze ✨</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px; color: #333333; font-size: 16px; line-height: 1.6;">
                                <p style="margin: 0 0 16px 0;">Hi {user.email},</p>
                                
                                <p style="margin: 0 0 16px 0;">Thanks for signing up for Brandalyze! I'm excited to have you on board and can't wait for you to start diving into your brand insights.</p>
                                
                                <p style="margin: 0 0 16px 0;">Brandalyze is still early in development, so if you have any questions, feedback, or run into anything that doesn't feel quite right, you can reach out to me directly anytime.</p>
                                
                                <p style="margin: 0 0 24px 0;">I'm always happy to help. Just send me a message on X at <a href="https://x.com/_dngi" style="color: #1DA1F2; text-decoration: none; font-weight: 500;">@_dngi</a>.</p>
                                
                                <p style="margin: 0 0 4px 0;">Thanks again for joining, and welcome to the Brandalyze community!</p>
                            </td>
                        </tr>
                        
                        <!-- Signature -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <table cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e5e5; padding-top: 24px;">
                                    <tr>
                                        <td style="color: #333333; font-size: 16px; line-height: 1.5;">
                                            <p style="margin: 0 0 4px 0; font-weight: 500;">Best,</p>
                                            <p style="margin: 0 0 2px 0; font-weight: 600; font-size: 17px;">Dom</p>
                                            <p style="margin: 0; color: #666666; font-size: 14px;">Founder, Brandalyze</p>
                                            <p style="margin: 8px 0 0 0; color: #999999; font-size: 13px; font-style: italic;">Helping you listen to your brand's voice</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                        <tr>
                            <td style="padding: 20px; text-align: center; color: #999999; font-size: 12px; line-height: 1.5;">
                                <p style="margin: 0;">© 2025 Brandalyze. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

if __name__ == "__main__":
    from types import SimpleNamespace

    test_user = SimpleNamespace(email="delivered@resend.dev")

    result = send_welcome_email(test_user)
    print(f"Email sent: {result}")