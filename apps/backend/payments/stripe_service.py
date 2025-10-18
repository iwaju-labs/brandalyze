import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from analysis.models import UserSubscription
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:

    @staticmethod
    def create_customer(user):
        """Create Stripe customer for user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}".strip(),
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
                
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card", "paypal", "revolut_pay"],
                line_items=[{
                    'price': price_id,
                    'quantity': 1
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                allow_promotion_codes=True,
                billing_address_collection='required',
                metadata={'user_id':user.id}
            )

            return session
        except stripe.StripeError as e:
            print(f"Error creating Stripe checkout session {e}")
            return None
        
    @staticmethod
    def start_free_trial(user, days=7):
        """Start a free trial for a new user"""
        subscription, created = UserSubscription.objects.get_or_create(user=user)

        if created or not subscription.trial_start:
            subscription.tier = 'pro'
            subscription.daily_analysis_limit=50,
            subscription.trial_start = timezone.now()
            subscription.trial_end = timezone.now() + timedelta(days=days)
            subscription.is_trial_active = True
            subscription.save()
            return True
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

            # TODO: send cancellation email to user
            # EmailService.send_cancellation_email(subscription.user)

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
        """Cancel user's subscription (for immediate cancellation)"""
        try:
            subscription = UserSubscription.objects.filter(user=user).first()

            if not subscription or not subscription.stripe_subscription_id:
                return False, "No active subscription found"
            
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=False
            )

            # update subscription back to free
            subscription.tier = 'free'
            subscription.daily_analysis_limit = 3
            subscription.payment_status = 'canceled'
            subscription.stripe_subscription_id = None
            subscription.stripe_price_id = None
            subscription.is_trial_active = False
            subscription.save()

            return True, "Subscription cancelled successfully"
        
        except stripe.StripeError as e:
            return False, f"Stripe error: {str(e)}"
        except Exception as e:
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
            return None