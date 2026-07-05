#!/usr/bin/env python3
"""
Backend Test - Security State Verification After Password Reset
Tests the app-lock/security state after a forgotten password was removed from DB.
"""

import requests
import json
import sys

# Read backend URL from frontend .env
BASE_URL = "https://event-booking-77.preview.emergentagent.com/api"

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_response(response):
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    try:
        print(f"Response Body: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response Text: {response.text}")

def test_security_status():
    """
    Test 1: GET /api/security/status
    Expected: password_enabled=false, failed_attempts=0, locked_until=""
    """
    print_test_header("GET /api/security/status - Verify no password is set")
    
    url = f"{BASE_URL}/security/status"
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check critical fields
            password_enabled = data.get('password_enabled')
            failed_attempts = data.get('failed_attempts')
            locked_until = data.get('locked_until')
            
            print(f"\n✓ Status Code: 200 ✅")
            
            if password_enabled == False:
                print(f"✓ password_enabled: {password_enabled} ✅ (CORRECT - no password set)")
            else:
                print(f"✗ password_enabled: {password_enabled} ❌ (EXPECTED: false)")
                return False
            
            if failed_attempts == 0:
                print(f"✓ failed_attempts: {failed_attempts} ✅ (CORRECT - no failed attempts)")
            else:
                print(f"⚠ failed_attempts: {failed_attempts} (EXPECTED: 0)")
            
            if locked_until == "":
                print(f"✓ locked_until: '{locked_until}' ✅ (CORRECT - not locked)")
            else:
                print(f"⚠ locked_until: '{locked_until}' (EXPECTED: empty string)")
            
            return password_enabled == False
        else:
            print(f"\n✗ FAILED: Expected 200, got {response.status_code} ❌")
            return False
            
    except Exception as e:
        print(f"\n✗ EXCEPTION: {str(e)} ❌")
        return False

def test_verify_with_password():
    """
    Test 2: POST /api/security/verify with {"password":"anything"}
    Expected: 200 {"valid": true} because no password is configured
    """
    print_test_header("POST /api/security/verify with password - Should return valid:true")
    
    url = f"{BASE_URL}/security/verify"
    payload = {"password": "anything"}
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            valid = data.get('valid')
            
            print(f"\n✓ Status Code: 200 ✅")
            
            if valid == True:
                print(f"✓ valid: {valid} ✅ (CORRECT - no password configured, should unlock)")
                return True
            else:
                print(f"✗ valid: {valid} ❌ (EXPECTED: true)")
                return False
        else:
            print(f"\n✗ FAILED: Expected 200, got {response.status_code} ❌")
            return False
            
    except Exception as e:
        print(f"\n✗ EXCEPTION: {str(e)} ❌")
        return False

def test_verify_empty():
    """
    Test 3: POST /api/security/verify with {} (empty body)
    Expected: 200 {"valid": true}
    """
    print_test_header("POST /api/security/verify with empty body - Should return valid:true")
    
    url = f"{BASE_URL}/security/verify"
    payload = {}
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            valid = data.get('valid')
            
            print(f"\n✓ Status Code: 200 ✅")
            
            if valid == True:
                print(f"✓ valid: {valid} ✅ (CORRECT - no password configured, should unlock)")
                return True
            else:
                print(f"✗ valid: {valid} ❌ (EXPECTED: true)")
                return False
        else:
            print(f"\n✗ FAILED: Expected 200, got {response.status_code} ❌")
            return False
            
    except Exception as e:
        print(f"\n✗ EXCEPTION: {str(e)} ❌")
        return False

def main():
    print("="*80)
    print("BACKEND SECURITY STATE VERIFICATION - POST PASSWORD RESET")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Context: User was locked out by LockScreen, forgot password.")
    print(f"         Password hash was removed from DB, lockout cleared.")
    print(f"         Verifying app is now unlocked and no password required.")
    print("="*80)
    
    results = {}
    
    # Test 1: Security Status
    results['test_1_status'] = test_security_status()
    
    # Test 2: Verify with password
    results['test_2_verify_password'] = test_verify_with_password()
    
    # Test 3: Verify empty
    results['test_3_verify_empty'] = test_verify_empty()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("="*80)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED - APP IS UNLOCKED, NO PASSWORD REQUIRED")
        print("✅ password_enabled = false")
        print("✅ /security/verify returns valid:true (LockScreen will unlock)")
        print("✅ App is accessible without password")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED - REVIEW RESULTS ABOVE")
        return 1

if __name__ == "__main__":
    sys.exit(main())
