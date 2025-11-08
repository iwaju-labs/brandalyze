#!/usr/bin/env python
"""
Production admin user creation script for Render deployment.
Run this script after deployment to create admin users.
"""

import os
import django
import requests
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brandalyze_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_production_admin():
    """Create admin user with both Django superuser and Clerk admin metadata"""
    User = get_user_model()
    
    # Get admin email from input
    admin_email = input("Enter admin email address: ").strip().lower()
    
    if not admin_email:
        print("ERROR: Email is required")
        return False
    
    try:
        # Create or update Django user
        user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                'username': admin_email,
                'is_superuser': True,
                'is_staff': True
            }
        )
        
        if not created:
            # Update existing user to be admin
            user.is_superuser = True
            user.is_staff = True
            user.save()
            
        print(f"✅ Django admin user {'created' if created else 'updated'}: {admin_email}")
        
        # Update Clerk metadata if secret key is available
        clerk_secret = os.environ.get('CLERK_SECRET_KEY')
        if not clerk_secret:
            print("⚠️  CLERK_SECRET_KEY not found - skipping Clerk metadata update")
            print("   User will need Clerk admin role set manually in dashboard")
            return True
            
        # Find user in Clerk
        headers = {
            'Authorization': f'Bearer {clerk_secret}',
            'Content-Type': 'application/json'
        }
        
        print("🔍 Looking up user in Clerk...")
        users_response = requests.get(
            f'https://api.clerk.dev/v1/users?email_address={admin_email}',
            headers=headers,
            timeout=10
        )
        
        if users_response.status_code == 200:
            users_data = users_response.json()
            if users_data and len(users_data) > 0:
                clerk_user_id = users_data[0]['id']
                
                # Update Clerk metadata
                print("📝 Updating Clerk metadata...")
                metadata_payload = {
                    'public_metadata': {
                        'role': 'admin'
                    }
                }
                
                update_response = requests.patch(
                    f'https://api.clerk.dev/v1/users/{clerk_user_id}',
                    headers=headers,
                    json=metadata_payload,
                    timeout=10
                )
                
                if update_response.status_code == 200:
                    print(f"✅ Clerk admin metadata set for: {admin_email}")
                    return True
                else:
                    print(f"❌ Failed to update Clerk metadata: {update_response.status_code}")
                    print(f"   Response: {update_response.text}")
                    return False
            else:
                print(f"⚠️  User {admin_email} not found in Clerk")
                print("   Make sure user has signed up first, then run this script")
                return False
        else:
            print(f"❌ Failed to fetch Clerk user: {users_response.status_code}")
            print(f"   Response: {users_response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Network error communicating with Clerk: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        return False

def list_current_admins():
    """List current admin users"""
    User = get_user_model()
    admins = User.objects.filter(is_superuser=True)
    
    print("\n📋 Current Django admin users:")
    if admins.exists():
        for admin in admins:
            print(f"   • {admin.email} ({'staff' if admin.is_staff else 'no staff'})")
    else:
        print("   No admin users found")

def main():
    """Main function with menu options"""
    print("🔧 Brandalyze Admin User Management")
    print("=" * 40)
    
    while True:
        print("\nOptions:")
        print("1. Create/Update Admin User")
        print("2. List Current Admins") 
        print("3. Exit")
        
        choice = input("\nSelect option (1-3): ").strip()
        
        if choice == '1':
            print("\n🚀 Creating Admin User")
            print("-" * 25)
            success = create_production_admin()
            if success:
                print("\n✅ Admin user setup completed successfully!")
            else:
                print("\n❌ Admin user setup failed - check error messages above")
                
        elif choice == '2':
            list_current_admins()
            
        elif choice == '3':
            print("\n👋 Goodbye!")
            break
            
        else:
            print("\n❌ Invalid option - please choose 1, 2, or 3")

if __name__ == "__main__":
    main()