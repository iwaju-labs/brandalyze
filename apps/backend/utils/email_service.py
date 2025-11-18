import logging
import requests
from django.conf import settings
import resend
from accounts.models import User

BRANDALYZE_EMAIL = "dom <dom@brandalyze.io>"


def send_welcome_email(user: User):
    resend.api_key = getattr(settings, "RESEND_API_KEY");
    
    params = {
        "from": BRANDALYZE_EMAIL,
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

def send_subscription_created_email(user: User, tier: str, price: str, billing_period: str, start_date: str):
    resend.api_key = getattr(settings, "RESEND_API_KEY")
    
    params = {
        "from": BRANDALYZE_EMAIL,
        "to": [user.email],
        "subject": "Your Brandalyze Subscription is Active 🎉",
        "html": render_subscription_created_template(user, tier, price, billing_period, start_date)
    }
    
    try:
        email = resend.Emails.send(params)
        print(email)
        return True
    except Exception as e:
        print(f"Failed to send subscription created email: {e}")
        return False


def send_subscription_updated_email(user: User, tier: str, price: str, billing_period: str, change_date: str):
    resend.api_key = getattr(settings, "RESEND_API_KEY")
    
    params = {
        "from": BRANDALYZE_EMAIL,
        "to": [user.email],
        "subject": "Your Brandalyze Subscription Has Been Updated",
        "html": render_subscription_updated_template(user, tier, price, billing_period, change_date)
    }
    
    try:
        email = resend.Emails.send(params)
        print(email)
        return True
    except Exception as e:
        print(f"Failed to send subscription updated email: {e}")
        return False


def send_subscription_cancelled_email(user: User, tier: str, end_date: str):
    resend.api_key = getattr(settings, "RESEND_API_KEY")
    
    params = {
        "from": BRANDALYZE_EMAIL,
        "to": [user.email],
        "subject": "Your Brandalyze Subscription Has Been Cancelled",
        "html": render_subscription_cancelled_template(user, tier, end_date)
    }
    
    try:
        email = resend.Emails.send(params)
        print(email)
        return True
    except Exception as e:
        print(f"Failed to send subscription cancelled email: {e}")
        return False


def send_trial_ending_email(user: User, days_left: int, tier: str):
    resend.api_key = getattr(settings, "RESEND_API_KEY")
    
    params = {
        "from": BRANDALYZE_EMAIL,
        "to": [user.email],
        "subject": f"Your Brandalyze Trial Ends in {days_left} Days",
        "html": render_trial_ending_template(user, days_left, tier)
    }
    
    try:
        email = resend.Emails.send(params)
        print(email)
        return True
    except Exception as e:
        print(f"Failed to send trial ending email: {e}")
        return False


def render_subscription_created_template(user: User, tier: str, price: str, billing_period: str, start_date: str) -> str:
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
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; text-align: center;">
                                <img src="https://brandalyze.io/icon-128.png" alt="Brandalyze" style="height: 50px; margin-bottom: 20px;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #000000; text-align: left;">Your Subscription is Active 🎉</h1>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 0 40px 30px 40px; color: #333333; font-size: 16px; line-height: 1.6;">
                                <p style="margin: 0 0 24px 0;">Hi {user.email},</p>
                                
                                <p style="margin: 0 0 24px 0;">Thanks for subscribing to Brandalyze! Your subscription is now active and you have full access to all premium features.</p>
                                
                                <div style="background-color: #f9f9f9; border-left: 4px solid #000000; padding: 20px; margin: 0 0 24px 0; border-radius: 4px;">
                                    <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Subscription Details</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> {tier}</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Price:</strong> {price}</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Billing:</strong> {billing_period}</p>
                                    <p style="margin: 0;"><strong>Start Date:</strong> {start_date}</p>
                                </div>
                                
                                <p style="margin: 0 0 16px 0;">You can manage your subscription anytime from your account settings.</p>
                                
                                <p style="margin: 0 0 24px 0;">If you have any questions, feel free to reach out on X at <a href="https://x.com/_dngi" style="color: #1DA1F2; text-decoration: none; font-weight: 500;">@_dngi</a>.</p>
                            </td>
                        </tr>
                        
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


def render_subscription_updated_template(user: User, tier: str, price: str, billing_period: str, change_date: str) -> str:
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
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; text-align: center;">
                                <img src="https://brandalyze.io/icon-128.png" alt="Brandalyze" style="height: 50px; margin-bottom: 20px;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #000000; text-align: left;">Your Subscription Has Been Updated</h1>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 0 40px 30px 40px; color: #333333; font-size: 16px; line-height: 1.6;">
                                <p style="margin: 0 0 24px 0;">Hi {user.email},</p>
                                
                                <p style="margin: 0 0 24px 0;">Your Brandalyze subscription has been updated. Here are your new subscription details:</p>
                                
                                <div style="background-color: #f9f9f9; border-left: 4px solid #000000; padding: 20px; margin: 0 0 24px 0; border-radius: 4px;">
                                    <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Updated Subscription</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> {tier}</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Price:</strong> {price}</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Billing:</strong> {billing_period}</p>
                                    <p style="margin: 0;"><strong>Effective Date:</strong> {change_date}</p>
                                </div>
                                
                                <p style="margin: 0 0 16px 0;">Your new plan is now active and you have access to all included features.</p>
                                
                                <p style="margin: 0 0 24px 0;">If you have any questions about these changes, reach out on X at <a href="https://x.com/_dngi" style="color: #1DA1F2; text-decoration: none; font-weight: 500;">@_dngi</a>.</p>
                            </td>
                        </tr>
                        
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


def render_subscription_cancelled_template(user: User, tier: str, end_date: str) -> str:
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
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; text-align: center;">
                                <img src="https://brandalyze.io/icon-128.png" alt="Brandalyze" style="height: 50px; margin-bottom: 20px;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #000000; text-align: left;">Your Subscription Has Been Cancelled</h1>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 0 40px 30px 40px; color: #333333; font-size: 16px; line-height: 1.6;">
                                <p style="margin: 0 0 24px 0;">Hi {user.email},</p>
                                
                                <p style="margin: 0 0 24px 0;">We're sorry to see you go. Your Brandalyze subscription has been cancelled.</p>
                                
                                <div style="background-color: #f9f9f9; border-left: 4px solid #666666; padding: 20px; margin: 0 0 24px 0; border-radius: 4px;">
                                    <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Cancellation Details</p>
                                    <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> {tier}</p>
                                    <p style="margin: 0;"><strong>Access Until:</strong> {end_date}</p>
                                </div>
                                
                                <p style="margin: 0 0 16px 0;">You'll continue to have access to your premium features until {end_date}. After that, your account will revert to the free plan.</p>
                                
                                <p style="margin: 0 0 16px 0;">You can reactivate your subscription anytime from your account settings. We'd love to have you back!</p>
                                
                                <p style="margin: 0 0 24px 0;">If you have feedback about why you cancelled or any questions, I'd love to hear from you on X at <a href="https://x.com/_dngi" style="color: #1DA1F2; text-decoration: none; font-weight: 500;">@_dngi</a>.</p>
                            </td>
                        </tr>
                        
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


def render_trial_ending_template(user: User, days_left: int, tier: str) -> str:
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
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; text-align: center;">
                                <img src="https://brandalyze.io/icon-128.png" alt="Brandalyze" style="height: 50px; margin-bottom: 20px;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #000000; text-align: left;">Your Trial Ends in {days_left} Day{"s" if days_left != 1 else ""} ⏰</h1>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 0 40px 30px 40px; color: #333333; font-size: 16px; line-height: 1.6;">
                                <p style="margin: 0 0 24px 0;">Hi {user.email},</p>
                                
                                <p style="margin: 0 0 24px 0;">This is a friendly reminder that your {tier} trial on Brandalyze will end in <strong>{days_left} day{"s" if days_left != 1 else ""}</strong>.</p>
                                
                                <div style="background-color: #fff4e6; border-left: 4px solid #ff9800; padding: 20px; margin: 0 0 24px 0; border-radius: 4px;">
                                    <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #e65100; text-transform: uppercase; letter-spacing: 0.5px;">What Happens Next?</p>
                                    <p style="margin: 0;">After your trial ends, you'll be automatically switched to the free plan unless you upgrade. Don't worry—you won't lose any of your data!</p>
                                </div>
                                
                                <p style="margin: 0 0 24px 0;">To continue enjoying premium features like unlimited brand analyses and advanced insights, you can upgrade anytime from your account settings.</p>
                                
                                <div style="text-align: center; margin: 0 0 24px 0;">
                                    <a href="https://brandalyze.io/pricing" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Pricing Plans</a>
                                </div>
                                
                                <p style="margin: 0 0 16px 0;">If you have any questions about your subscription or need help choosing a plan, feel free to reach out on X at <a href="https://x.com/_dngi" style="color: #1DA1F2; text-decoration: none; font-weight: 500;">@_dngi</a>.</p>
                                
                                <p style="margin: 0 0 4px 0;">Thanks for being part of the Brandalyze community!</p>
                            </td>
                        </tr>
                        
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

    result = send_subscription_created_email(test_user, 'pro', '9.49', 'the next month', 'today')
    print(f"Email sent: {result}")