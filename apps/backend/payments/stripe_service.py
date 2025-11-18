import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from analysis.models import UserSubscription
from datetime import datetime, timedelta
from django.utils import timezone
import traceback
from utils.email_service import send_subscription_created_email, send_subscription_cancelled_email, send_subscription_updated_email

User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    
    @staticmethod
    def create_customer(user):
        """Create Stripe customer for user"""
        try:
            # Handle case where first_name/last_name might be empty
            name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
            if not name:
                name = user.username or user.email or "Customer"
            
            customer = stripe.Customer.create(
                email=user.email,
                name=name,
                metadata={'user_id': user.id}
            )

            subscription, _ = UserSubscription.objects.get_or_create(user=user)
            subscription.stripe_customer_id = customer.id
            subscription.save()

            return customer
        except stripe.StripeError as e:
            print(f"Stripe error creating customer: {e}")
            return None
    
    @staticmethod
    def update_customer_email(customer_id, email):
        """Update Stripe customer's email"""
        try:
            stripe.Customer.modify(
                customer_id,
                email=email
            )
            print(f"[DEBUG] Updated Stripe customer {customer_id} email to: {email}")
            return True
        except stripe.StripeError as e:
            print(f"Stripe error updating customer email: {e}")
            return False
        
    @staticmethod
    def create_checkout_session(user, price_id, success_url, cancel_url):
        """Create Stripe checkout session"""
        try:
            subscription = UserSubscription.objects.get_or_create(user=user)[0]

            if not subscription.stripe_customer_id:
                customer = StripeService.create_customer(user)
                if not customer:
                    return None
                customer_id = customer.id
            else:
                customer_id = subscription.stripe_customer_id
                
                # Update customer email if it has changed
                try:
                    current_customer = stripe.Customer.retrieve(customer_id)
                    if current_customer.email != user.email:
                        print(f"[DEBUG] Customer email mismatch: {current_customer.email} vs {user.email}")
                        StripeService.update_customer_email(customer_id, user.email)
                except stripe.StripeError as e:
                    print(f"[DEBUG] Could not retrieve/update customer: {e}")
                
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card", "paypal"],
                line_items=[{
                    'price': price_id,
                    'quantity': 1
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                allow_promotion_codes=True,
                billing_address_collection='required',
                metadata={'user_id': user.id}
            )
            return session
        except stripe.StripeError as e:
            print(f"Error creating Stripe checkout session {e}")
            return None
        
    @staticmethod
    def start_free_trial(user, days=7):
        """Start a free trial through Stripe checkout (requires payment method)"""
        print(f"[DEBUG] start_free_trial called for user: {user}")
        
        # Check environment variables first
        if not settings.STRIPE_PRO_PRICE_ID:
            print(f"[ERROR] STRIPE_PRO_PRICE_ID not set in environment: {settings.STRIPE_PRO_PRICE_ID}")
            return False
            
        if not settings.STRIPE_SECRET_KEY:
            print("[ERROR] STRIPE_SECRET_KEY not set in environment")
            return False
            
        if not settings.FRONTEND_URL:
            print(f"[ERROR] FRONTEND_URL not set in environment: {settings.FRONTEND_URL}")
            return False
            
        print(f"[DEBUG] Environment check passed - STRIPE_PRO_PRICE_ID: {settings.STRIPE_PRO_PRICE_ID}")
        print(f"[DEBUG] FRONTEND_URL: {settings.FRONTEND_URL}")
        
        try:
            subscription, created = UserSubscription.objects.get_or_create(user=user)
            print(f"[DEBUG] subscription created: {created}, existing trial_start: {subscription.trial_start}")

            # Check if user already had a trial
            if subscription.trial_start and not created:
                print("[DEBUG] Trial not started - user already has trial")
                return False

            # Create Stripe customer if needed
            if not subscription.stripe_customer_id:
                print("[DEBUG] Creating Stripe customer for trial")
                customer = StripeService.create_customer(user)
                if not customer:
                    print("[DEBUG] Failed to create Stripe customer")
                    return False
                subscription.stripe_customer_id = customer.id
                subscription.save()

            print(f"[DEBUG] Creating checkout session for trial with {days} day trial")
            print(f"[DEBUG] Using customer_id: {subscription.stripe_customer_id}")
            
            # Create checkout session with trial (requires payment method)
            session = stripe.checkout.Session.create(
                customer=subscription.stripe_customer_id,
                payment_method_types=["card"],
                line_items=[{
                    'price': settings.STRIPE_PRO_PRICE_ID,
                    'quantity': 1
                }],
                mode="subscription",
                subscription_data={
                    'trial_period_days': days,
                    'metadata': {'user_id': user.id}
                },
                success_url=f"{settings.FRONTEND_URL}/trial/success",
                cancel_url=f"{settings.FRONTEND_URL}/pricing",
                allow_promotion_codes=True,
            )
            
            print(f"[DEBUG] Trial checkout session created: {session.id}")
            print(f"[DEBUG] trial session: {session}")
            return session  # Return session instead of True
            
        except stripe.StripeError as e:
            print(f"[ERROR] Stripe error in start_free_trial: {e}")
            print(f"[ERROR] Stripe error type: {type(e).__name__}")
            print(f"[ERROR] Stripe error code: {getattr(e, 'code', 'N/A')}")
            return False
        except Exception as e:
            print(f"[ERROR] Error in start_free_trial: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    def handle_subscription_created(stripe_subscription: stripe.Subscription):
        """Handle successful subscription creation"""
        try:
            user_id = stripe_subscription.metadata.get('user_id')
            if not user_id:
                customer_id = stripe_subscription.customer
                subscription = UserSubscription.objects.filter(
                    stripe_customer_id=customer_id
                ).first()

                if subscription:
                    user = subscription.user
                else:
                    return False
            else:
                user = User.objects.get(id=user.id)
            
            subscription, _ = UserSubscription.objects.get_or_create(user=user)

            # Determine tier by price
            price_id = stripe_subscription.items.data[0].price.id
            if price_id == settings.STRIPE_PRO_PRICE_ID:
                subscription.tier = 'pro'
                subscription.daily_analysis_limit = 50
            elif price_id == settings.STRIPE_ENTERPRISE_PRICE_ID:
                subscription.tier  = 'enterprise'
                subscription.daily_analysis_limit = None

            ## Update subscription
            subscription.stripe_subscription_id = stripe_subscription.id
            subscription.stripe_price_id = price_id
            subscription.payment_status = stripe_subscription.status
            subscription.next_billing_date = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )

            # end trial if one is active
            subscription.is_trial_active = False
            subscription.save()

            price = format_stripe_price(stripe_subscription)
            billing_period = get_billing_period(stripe_subscription)
            # Send Telegram notification for new subscription
            try:
                from utils.telegram_client import send_telegram_message_async, escape_html
                message = (
                    f"💳 <b>New Subscription</b>\n\n"
                    f"👤 User: <code>{escape_html(user.email)}</code>\n"
                    f"📦 Tier: <code>{subscription.tier}</code>\n"
                    f"💵 Price: <code>{price}</code>\n"
                    f"📅 Billing Period: <code>{billing_period}</code>\n"
                    f"🆔 Subscription: <code>{stripe_subscription.id}</code>\n"
                    f"📅 Date: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}"
                )
                send_telegram_message_async(message)
            except Exception as e:
                print(f"Failed to send subscription notification: {e}")

            # send Email to user about new subscription
            send_subscription_created_email(user, subscription.tier, price, billing_period, subscription.subscription_start)
            return True
        except Exception as e:
            print(f"Error handling subscription created: {e}")
            return False
    
    @staticmethod
    def handle_subscription_updated(stripe_subscription):
        """Handle subscription updates (plan changes, renewals, etc.)"""
        try:
            subscription = UserSubscription.objects.filter(
                stripe_subscription_id=stripe_subscription.id
            ).first()

            if not subscription:
                print(f"No subscription found for stripe_subscription_id: {stripe_subscription.id}")
                return False
            
            user = subscription.user
            subscription.payment_status = stripe_subscription.status

            subscription.next_billing_date = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )

            price_id = stripe_subscription.items.data[0].price.id
            old_tier = subscription.tier

            if price_id == settings.STRIPE_PRO_PRICE_ID:
                subscription.tier = 'pro'
                subscription.daily_analysis_limit = 50
            elif price_id == settings.STRIPE_ENTERPRISE_PRICE_ID:
                subscription.tier = 'enterprise'
                subscription.daily_analysis_limit = None

            subscription.stripe_price_id = price_id

            if stripe_subscription.status == 'active':
                subscription.is_trial_active = False

            subscription.save()

            price = format_stripe_price(stripe_subscription)
            billing_period = get_billing_period(stripe_subscription)
            
            # send telegram notification for updated subscription
            try:
                from utils.telegram_client import send_telegram_message_async, escape_html
                message = (
                    f"💳 <b>Updated Subscription</b>\n\n"
                    f"👤 User: <code>{escape_html(user.email)}\n"
                    f"📦 Tier: <code>{subscription.tier}</code>\n"
                    f"💵 Price: <code>{price}</code>\n"
                    f"📅 Billing Period: <code>{billing_period}</code>\n"
                    f"🆔 Subscription: <code>{stripe_subscription.id}</code>\n"
                    f"📅 Date: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}"
                )
                send_telegram_message_async(message)
            except Exception as e:
                print(f"Failed to send subscription update notification: {e}")

            # send email to user about new subscription
            send_subscription_updated_email(user, subscription.tier, price, billing_period, timezone.now().strftime('%Y-%m-%d %H:%M UTC'))

            if old_tier != subscription.tier:
                print(f"User {subscription.user.id} upgraded from {old_tier} to {subscription.tier}")

            return True
        
        except Exception as e:
            print(f"Error handling subscription updated: {e}")
            return False
        
    @staticmethod
    def handle_subscription_canceled(stripe_subscription):
        """Handle subscription cancellation"""
        try:
            subscription = UserSubscription.objects.filter(
                stripe_subscription_id=stripe_subscription.id
            ).first()

            if not subscription:
                print(f"No subscription found for stripe_subscription_id: {stripe_subscription.id}")
                return False
            
            old_tier = subscription.tier

            subscription.tier = 'free'
            subscription.daily_analysis_limit = 3
            subscription.brand_sample_limit = 5
            subscription.payment_status = 'canceled'

            subscription.stripe_subscription_id = None
            subscription.stripe_price_id = None
            subscription.next_billing_date = None

            subscription.is_trial_active = False
            subscription.save()

            print(f"User {subscription.user.id} downgraded from {old_tier} to free (subscription canceled)")

            # Send Telegram notification for subscription cancellation
            try:
                from utils.telegram_client import send_telegram_message_async, escape_html
                message = (
                    f"❌ <b>Subscription Cancelled</b>\n\n"
                    f"👤 User: <code>{escape_html(subscription.user.email)}</code>\n"
                    f"📦 Was: <code>{old_tier}</code> → <code>free</code>\n"
                    f"🆔 Subscription: <code>{stripe_subscription.id}</code>\n"
                    f"📅 Date: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}"
                )
                send_telegram_message_async(message)
            except Exception as e:
                print(f"Failed to send cancellation notification: {e}")

            # send cancellation email to user
            send_subscription_cancelled_email(user, subscription.tier, timezone.now().strftime('%Y-%m-%d %H:%M UTC'))

            return True

        except Exception as e:
            print(f"Error handling subscription canceled: {e}")
            return False
    
    @staticmethod
    def handle_payment_failed(stripe_invoice):
        """Handle failed payment attempts"""
        try:
            stripe_subscription_id = stripe_invoice.subscription

            subscription = UserSubscription.objects.filter(
                stripe_subscription_id=stripe_subscription_id
            ).first()

            if not subscription:
                print(f"No subscription found for failed payment: {stripe_subscription_id}")
                return False
            
            subscription.payment_status = 'past_due'
            subscription.save()

            attempt_count = stripe_invoice.attempt_count

            print(f"Payment failed for user {subscription.user.id}, attempt {attempt_count}")

            if attempt_count == 1:
                # First failure - gentle reminder
                print(f"Sending first payment failure notice to user {subscription.user.id}")
                # TODO: Send gentle reminder email
                # EmailService.send_payment_reminder(subscription.user, attempt_count)
            
            elif attempt_count == 2:
                # Second failure - more urgent
                print(f"Sending urgent payment notice to user {subscription.user.id}")
                # TODO: Send urgent payment email
                # EmailService.send_urgent_payment_notice(subscription.user)
            
            elif attempt_count >= 3:
                # Final attempt - warn about service suspension
                print(f"Sending final payment notice to user {subscription.user.id}")
                # TODO: Send final warning email
                # EmailService.send_final_payment_warning(subscription.user)                
                
                # If subscription is already canceled by Stripe, downgrade user
                try:
                    stripe_subscription = stripe.Subscription.retrieve(stripe_subscription_id)
                    if stripe_subscription.status in ['canceled', 'unpaid']:
                        # Downgrade to free
                        subscription.tier = 'free'
                        subscription.daily_analysis_limit = 3
                        subscription.payment_status = 'canceled'
                        subscription.stripe_subscription_id = None
                        subscription.stripe_price_id = None
                        subscription.save()
                    
                        print(f"User {subscription.user.id} auto-downgraded due to payment failures")
                    
                except stripe.error.StripeError as e:
                    print(f"Error checking subscription status: {e}")
        
            return True
        
        except Exception as e:
            print(f"Error handling payment failed: {e}")
            return False
    
    @staticmethod
    def handle_trial_will_end(stripe_subscription):
        """Handle trial ending soon (sent 3 days before trial ends)"""
        try:
            subscription = UserSubscription.objects.filter(
                stripe_subscription_id=stripe_subscription.id
            ).first()

            if not subscription:
                print(f"No subscription found for trial ending: {stripe_subscription.id}")
                return False
            
            print(f"Trial will end soon for user {subscription.user.id}")
            
            # Send reminder about the trial ending
            # Calculate days left in trial
            from datetime import datetime
            days_left = (datetime.fromtimestamp(stripe_subscription.trial_end) - datetime.now()).days
            from utils.email_service import send_trial_ending_email
            send_trial_ending_email(subscription.user, days_left, subscription.tier)
            return True
        
        except Exception as e:
            print(f"Error handling trial will end: {e}")
            return False
    
    @staticmethod
    def get_customer_portal_url(user, return_url):
        """Create customer portal session for subscription management"""
        try:
            subscription = UserSubscription.objects.filter(user=user).first()            
            if not subscription or not subscription.stripe_customer_id:
                return None
            
            session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=return_url,
            )

            return session.url
        except stripe.StripeError as e:            
            print(f"Error creating customer portal: {e}")
            return None
        
    @staticmethod
    def cancel_subscription(user):
        """Cancel user's subscription (cancel at period end)"""
        print(f"[DEBUG] cancel_subscription called for user: {user}")
        try:
            subscription = UserSubscription.objects.filter(user=user).first()
            print(f"[DEBUG] Found subscription: {subscription}")
            
            if subscription:
                print(f"[DEBUG] Subscription details: tier={subscription.tier}, stripe_subscription_id={subscription.stripe_subscription_id}, payment_status={subscription.payment_status}")
            
            if not subscription:
                print(f"[DEBUG] No subscription found for user {user}")
                return False, "No subscription found"            # Handle trial-only subscriptions (no Stripe subscription)
            if not subscription.stripe_subscription_id:
                print("[DEBUG] No Stripe subscription ID found")
                print(f"[DEBUG] is_trial_active: {subscription.is_trial_active}")
                print(f"[DEBUG] trial_start: {subscription.trial_start}")
                print(f"[DEBUG] trial_end: {subscription.trial_end}")
                print(f"[DEBUG] is_on_trial property: {subscription.is_on_trial}")
                
                # This case should be rare now since trials go through Stripe
                # But handle legacy trials that don't have Stripe subscription
                if subscription.is_on_trial:
                    print("[DEBUG] User is on legacy trial, cancelling trial and downgrading to free")
                    # Cancel trial and downgrade to free
                    subscription.tier = 'free'
                    subscription.daily_analysis_limit = 3
                    subscription.brand_sample_limit = 5
                    subscription.payment_status = 'canceled'
                    subscription.is_trial_active = False
                    subscription.trial_start = None
                    subscription.trial_end = None
                    subscription.save()
                    return True, "Trial cancelled successfully. You've been downgraded to the free plan."
                else:
                    print("[DEBUG] User has no active subscription to cancel")
                    return False, "No active subscription found to cancel"
            
            print(f"[DEBUG] Attempting to cancel Stripe subscription: {subscription.stripe_subscription_id}")
            
            # Cancel at period end to let user keep access until billing period ends
            stripe_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            
            print(f"[DEBUG] Stripe subscription modified successfully")

            # Update subscription status to indicate cancellation is scheduled
            # but keep current tier and limits until the period ends
            subscription.payment_status = 'cancel_at_period_end'
            subscription.save()
            
            print(f"[DEBUG] Local subscription updated")

            # Get the cancellation date
            cancel_date = datetime.fromtimestamp(stripe_subscription.current_period_end)
            
            return True, f"Subscription will be cancelled on {cancel_date.strftime('%B %d, %Y')}. You'll keep access until then."
        
        except stripe.StripeError as e:
            print(f"[DEBUG] Stripe error: {str(e)}")
            return False, f"Stripe error: {str(e)}"
        except Exception as e:
            print(f"[DEBUG] General error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False, f"Error: {str(e)}"
        
    @staticmethod
    def reactivate_subscription(user, price_id):
        """Helper function to reactivate canceled subscription"""
        try:
            subscription = UserSubscription.objects.filter(user=user).first()

            if not subscription or not subscription.stripe_customer_id:
                return None
            
            stripe_subscription = stripe.Subscription.create(
                customer=subscription.stripe_customer_id,
                items=[{'price': price_id}],
                metadata={'user_id': user.id}
            )

            if price_id == settings.STRIPE_PRO_PRICE_ID:
                subscription.tier = 'pro'
                subscription.daily_analysis_limit = 50
            elif price_id == settings.STRIPE_ENTERPRISE_PRICE_ID:
                subscription.tier = 'enterprise'
                subscription.daily_analysis_limit = None

            subscription.stripe_subscription_id = stripe_subscription.id
            subscription.stripe_price_id = price_id
            subscription.payment_status = stripe_subscription.status
            subscription.next_billing_date = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )
            subscription.save()

            return stripe_subscription
        
        except stripe.StripeError as e:
            print(f"Error reactivating subscription: {e}")
            return None    @staticmethod
    def sync_subscription_from_stripe(stripe_customer_id):
        """Sync subscription data from Stripe for a given customer"""
        try:
            # Get all subscriptions for this customer from Stripe
            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                status='all',
                limit=10
            )
            
            if not subscriptions.data:
                print(f"No Stripe subscriptions found for customer {stripe_customer_id}")
                return False
            
            # Get the local subscription record
            local_subscription = UserSubscription.objects.filter(
                stripe_customer_id=stripe_customer_id
            ).first()
            
            if not local_subscription:
                print(f"No local subscription found for Stripe customer {stripe_customer_id}")
                return False
            
            # Find the most relevant subscription
            active_subscription = StripeService._find_active_subscription(subscriptions.data)
            
            if not active_subscription:
                print(f"No suitable Stripe subscription found for customer {stripe_customer_id}")
                return False
            
            # Update the local subscription
            StripeService._update_local_subscription(local_subscription, active_subscription)
            
            print(f"Successfully synced subscription for customer {stripe_customer_id}")
            print(f"New status: tier={local_subscription.tier}, status={local_subscription.payment_status}")
            
            return True
            
        except stripe.StripeError as e:
            print(f"Stripe error in sync_subscription_from_stripe: {e}")
            return False
        except Exception as e:
            print(f"Error in sync_subscription_from_stripe: {e}")
            import traceback
            traceback.print_exc()
            return False

    @staticmethod
    def _find_active_subscription(subscriptions):
        """Find the most relevant subscription from a list"""
        active_subscription = None
        for sub in subscriptions:
            if sub.status in ['active', 'trialing', 'past_due']:
                active_subscription = sub
                break
            elif sub.status == 'canceled' and not active_subscription:
                # If no active subscription, use the most recent canceled one
                active_subscription = sub
        return active_subscription

    @staticmethod
    def _update_local_subscription(local_subscription, stripe_subscription):
        """Update local subscription based on Stripe data"""
        local_subscription.stripe_subscription_id = stripe_subscription.id
        local_subscription.payment_status = stripe_subscription.status
        
        # Update subscription dates
        if stripe_subscription.current_period_end:
            local_subscription.next_billing_date = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )
        
        # Update tier and limits based on price
        StripeService._update_tier_from_stripe(local_subscription, stripe_subscription)
        
        # Update active status
        StripeService._update_active_status(local_subscription, stripe_subscription)
        
        local_subscription.save()

    @staticmethod
    def _update_tier_from_stripe(local_subscription, stripe_subscription):
        """Update subscription tier based on Stripe price"""
        if stripe_subscription.items.data:
            price_id = stripe_subscription.items.data[0].price.id
            local_subscription.stripe_price_id = price_id
            
            if price_id == settings.STRIPE_PRO_PRICE_ID:
                local_subscription.tier = 'pro'
                local_subscription.daily_analysis_limit = 50
                local_subscription.brand_sample_limit = None
            elif hasattr(settings, 'STRIPE_ENTERPRISE_PRICE_ID') and price_id == settings.STRIPE_ENTERPRISE_PRICE_ID:
                local_subscription.tier = 'enterprise'
                local_subscription.daily_analysis_limit = None
                local_subscription.brand_sample_limit = None
            else:
                print(f"Unknown price ID: {price_id}, defaulting to free")
                local_subscription.tier = 'free'
                local_subscription.daily_analysis_limit = 3
                local_subscription.brand_sample_limit = 5

    @staticmethod
    def _update_active_status(local_subscription, stripe_subscription):
        """Update subscription active status based on Stripe status"""
        if stripe_subscription.status in ['active', 'trialing']:
            local_subscription.is_active = True
            local_subscription.is_trial_active = (stripe_subscription.status == 'trialing')
        else:
            local_subscription.is_active = False
            local_subscription.is_trial_active = False
            
            # If canceled, downgrade to free
            if stripe_subscription.status == 'canceled':
                local_subscription.tier = 'free'
                local_subscription.daily_analysis_limit = 3
                local_subscription.brand_sample_limit = 5
                local_subscription.stripe_subscription_id = None
                local_subscription.stripe_price_id = None
                local_subscription.next_billing_date = None


def format_stripe_price(stripe_subscription):
    """
    Extract and format price from Stripe subscription object.
    Returns formatted price string like "USD $10.00" or "N/A" if not available.
    """
    try:
        price_obj = stripe_subscription.items.data[0].price
        price_amount = price_obj.unit_amount / 100  # Convert cents to dollars
        currency = price_obj.currency.upper()
        return f"{currency} ${price_amount:.2f}"
    except (AttributeError, IndexError, TypeError):
        return "N/A"


def get_billing_period(stripe_subscription):
    """
    Extract billing period from Stripe subscription object.
    Returns "month", "year", or "N/A" if not available.
    """
    try:
        return stripe_subscription.items.data[0].price.recurring.interval
    except (AttributeError, IndexError, TypeError):
        return "N/A"