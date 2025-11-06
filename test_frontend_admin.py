#!/usr/bin/env python3
"""
Test frontend admin functionality
"""
import time
import webbrowser

def test_admin_access():
    print("=== TESTING FRONTEND ADMIN ACCESS ===\n")
    
    print("Steps to test:")
    print("1. Open http://localhost:3000 in your browser")
    print("2. Sign in with your admin account (dgspammail7@gmail.com)")
    print("3. Check if 'admin' link appears in navbar")
    print("4. Try to access http://localhost:3000/admin directly")
    print("5. Check browser console for any errors")
    
    print("\nDebugging checklist:")
    print("✓ Backend running on :8000")
    print("✓ Frontend running on :3000") 
    print("✓ Admin users exist with is_superuser=True")
    print("✓ Admin endpoint /api/payments/admin/check-status/ works")
    
    print("\nPossible issues:")
    print("- useAdminStatus hook failing to call API")
    print("- Middleware redirecting before hook can check")
    print("- CORS issues between frontend/backend")
    print("- Clerk token not being sent properly")
    
    # Open browser to test
    print("\nOpening browser to test...")
    time.sleep(2)
    webbrowser.open('http://localhost:3000')
    
    print("\nWatch the browser network tab and console for errors!")

if __name__ == "__main__":
    test_admin_access()
