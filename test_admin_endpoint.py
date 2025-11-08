#!/usr/bin/env python3
"""
Test the admin check endpoint directly
"""
import requests
import json

# Test the endpoint without authentication first
print("=== TESTING ADMIN CHECK ENDPOINT ===\n")

# 1. Test without auth (should fail)
print("1. Testing without authentication:")
try:
    response = requests.get('http://localhost:8000/api/payments/admin/check-status/')
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text}")
except Exception as e:
    print(f"   Error: {e}")

# 2. Test the other admin endpoints
print("\n2. Testing other admin endpoints:")
endpoints = [
    '/api/payments/admin/users/',
    '/api/payments/admin/stats/',
]

for endpoint in endpoints:
    try:
        response = requests.get(f'http://localhost:8000{endpoint}')
        print(f"   {endpoint}: {response.status_code}")
    except Exception as e:
        print(f"   {endpoint}: Error - {e}")

print("\n=== TEST COMPLETE ===")
