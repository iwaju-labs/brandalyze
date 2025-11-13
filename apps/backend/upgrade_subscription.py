#!/usr/bin/env python
"""Upgrade user subscription to Pro for testing"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "brandalyze_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from payments.models import UserSubscription
from django.utils import timezone

User = get_user_model()

# Get the first user (or specify email)
user = User.objects.first()

if not user:
    print("❌ No users found in database")
    exit(1)

print(f"📧 User: {user.email}")

# Check if subscription exists
subscription = UserSubscription.objects.filter(user=user).first()

if subscription:
    print(f"📦 Current subscription: {subscription.tier}")
    subscription.tier = "pro"
    subscription.is_active = True
    subscription.save()
    print(f"✅ Upgraded to Pro")
else:
    # Create new Pro subscription
    subscription = UserSubscription.objects.create(
        user=user,
        tier="pro",
        is_active=True,
        stripe_subscription_id="test_sub_" + str(timezone.now().timestamp()),
        current_period_start=timezone.now(),
        current_period_end=timezone.now() + timezone.timedelta(days=30),
    )
    print(f"✅ Created Pro subscription")

print(f"📊 Final status: {subscription.tier} (Active: {subscription.is_active})")
