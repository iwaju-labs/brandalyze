#!/usr/bin/env python3
"""
Debug script to test admin functionality
"""
import os
import sys
import django
import requests

# Add the backend directory to the path
backend_path = os.path.join(os.path.dirname(__file__), 'apps', 'backend')
sys.path.insert(0, backend_path)

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
    print(f"   User model fields: {[f.name for f in User._meta.fields]}")
    
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
    
    # 3. Test admin endpoint locally
    print("3. Testing Admin Endpoint:")
    try:
        # This won't work without proper authentication, but we can check if the URL is configured
        response = requests.get('http://localhost:8000/api/payments/admin/check-status/')
        print(f"   Response status: {response.status_code}")
        print(f"   Response text: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error calling endpoint: {e}")
    
    # 4. Check Django URLs
    print("\n4. Checking URL Configuration:")
    from django.urls import reverse
    try:
        admin_check_url = reverse('check_admin_status')
        print(f"   Admin check URL: {admin_check_url}")
    except Exception as e:
        print(f"   Error getting admin check URL: {e}")
    
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    test_admin_functionality()
