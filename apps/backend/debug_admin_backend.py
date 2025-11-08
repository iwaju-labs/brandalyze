#!/usr/bin/env python3
"""
Debug script to test admin functionality - Backend version
"""
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brandalyze_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from payments.admin_views import is_admin_user

User = get_user_model()

def test_admin_functionality():
    print("=== ADMIN FUNCTIONALITY DEBUG ===\n")
    
    # 1. Check if custom User model is working
    print("1. Testing Custom User Model:")
    print(f"   User model: {User}")
    print(f"   User table: {User._meta.db_table}")
    
    # 2. List all users and their admin status
    print("\n2. All Users and Admin Status:")
    users = User.objects.all()
    if not users:
        print("   No users found in database!")
        return
    
    for user in users:
        print(f"   User: {user.email}")
        print(f"   - is_superuser: {user.is_superuser}")
        print(f"   - is_staff: {user.is_staff}")
        print(f"   - clerk_id: {getattr(user, 'clerk_id', 'N/A')}")
        print(f"   - clerk_metadata: {getattr(user, 'clerk_metadata', 'N/A')}")
        print(f"   - is_admin_user(): {is_admin_user(user)}")
        print()
    
    # 3. Check Django URLs
    print("3. Checking URL Configuration:")
    from django.urls import reverse
    try:
        admin_check_url = reverse('check_admin_status')
        print(f"   Admin check URL: {admin_check_url}")
    except Exception as e:
        print(f"   Error getting admin check URL: {e}")
    
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    test_admin_functionality()
