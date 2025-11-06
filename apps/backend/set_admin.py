#!/usr/bin/env python
"""
Script to set admin privileges for a user via Clerk API.
Usage: python set_admin.py <user_email>
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def set_admin_role(user_email):
    """Set admin role for a user via Clerk API"""
    clerk_secret = os.getenv('CLERK_SECRET_KEY')
    if not clerk_secret:
        print("Error: CLERK_SECRET_KEY not found in environment variables")
        return False
    
    headers = {
        'Authorization': f'Bearer {clerk_secret}',
        'Content-Type': 'application/json'
    }
    
    # First, find the user by email
    try:
        response = requests.get(
            f'https://api.clerk.dev/v1/users?email_address={user_email}',
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"Error finding user: {response.status_code} - {response.text}")
            return False
        
        users = response.json()
        if not users or len(users) == 0:
            print(f"User with email {user_email} not found")
            return False
        
        user = users[0]
        user_id = user['id']
        
        print(f"Found user: {user_id}")
        
        # Update user metadata to set admin role
        metadata_update = {
            'public_metadata': {
                'role': 'admin',
                'admin_since': '2024-01-01'
            },
            'private_metadata': {
                'admin_level': 'super'
            }
        }
        
        response = requests.patch(
            f'https://api.clerk.dev/v1/users/{user_id}',
            headers=headers,
            json=metadata_update,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"Successfully set admin role for {user_email}")
            return True
        else:
            print(f"Error setting admin role: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python set_admin.py <user_email>")
        sys.exit(1)
    
    user_email = sys.argv[1]
    if set_admin_role(user_email):
        print("Admin role set successfully!")
    else:
        print("Failed to set admin role")
        sys.exit(1)
