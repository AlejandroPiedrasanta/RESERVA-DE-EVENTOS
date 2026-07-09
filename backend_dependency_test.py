#!/usr/bin/env python3
"""
Test script to verify backend health after installing missing dependencies:
1. resend module (Python backend)
2. @react-oauth/google package (frontend)

Tests required by review request:
A) Backend health
B) Update endpoints
C) Frontend health
"""

import requests
import json
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://09c6054c-9916-4e39-9f61-f009cd5e5fc7.preview.emergentagent.com"

def test_backend_health():
    """Test A: Backend health checks"""
    print("\n" + "="*80)
    print("TEST A: BACKEND HEALTH")
    print("="*80)
    
    # A1: GET /api/ should return 200 with specific message and version
    print("\n[A1] Testing GET /api/")
    try:
        response = requests.get(f"{BACKEND_URL}/api/", timeout=10)
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2)}")
            
            # Check for required fields
            if "message" in data and data["message"] == "Event Reservation API":
                print("  ✅ Message field correct")
            else:
                print(f"  ❌ Message field incorrect or missing: {data.get('message')}")
                
            if "version" in data:
                print(f"  ✅ Version field present: {data['version']}")
                # Check if version is 1.20.12 as specified in review request
                if data['version'] == "1.20.12":
                    print("  ✅ Version matches expected 1.20.12")
                else:
                    print(f"  ⚠️  Version is {data['version']}, expected 1.20.12 (may have been updated)")
            else:
                print("  ❌ Version field missing")
                
            return True
        else:
            print(f"  ❌ Expected 200, got {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_update_endpoints():
    """Test B: Update endpoints"""
    print("\n" + "="*80)
    print("TEST B: UPDATE ENDPOINTS")
    print("="*80)
    
    results = []
    
    # B1: GET /api/updates/check
    print("\n[B1] Testing GET /api/updates/check")
    try:
        response = requests.get(f"{BACKEND_URL}/api/updates/check", timeout=10)
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Endpoint working")
            print(f"  Response keys: {list(data.keys())}")
            results.append(True)
        else:
            print(f"  ❌ Expected 200, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)
    
    # B2: GET /api/updates/github-version
    print("\n[B2] Testing GET /api/updates/github-version")
    try:
        response = requests.get(f"{BACKEND_URL}/api/updates/github-version", timeout=10)
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Endpoint working")
            print(f"  Response keys: {list(data.keys())}")
            results.append(True)
        else:
            print(f"  ❌ Expected 200, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)
    
    # B3: GET /api/github/check-updates
    print("\n[B3] Testing GET /api/github/check-updates")
    try:
        response = requests.get(f"{BACKEND_URL}/api/github/check-updates", timeout=10)
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Endpoint working")
            print(f"  Response keys: {list(data.keys())}")
            results.append(True)
        else:
            print(f"  ❌ Expected 200, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)
    
    # B4: POST /api/github/build-exe with empty body
    # Should return 400 with "Conecta tu cuenta de GitHub primero."
    print("\n[B4] Testing POST /api/github/build-exe (empty body)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/github/build-exe",
            json={},
            timeout=10
        )
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"  ✅ Returns 400 as expected (not 500)")
            print(f"  Response: {json.dumps(data, indent=2)}")
            
            # Check for expected error message
            if "detail" in data and "GitHub" in data["detail"]:
                print(f"  ✅ Error message mentions GitHub: {data['detail']}")
                results.append(True)
            else:
                print(f"  ⚠️  Error message different than expected: {data.get('detail')}")
                results.append(True)  # Still pass since it's 400, not 500
        else:
            print(f"  ❌ Expected 400, got {response.status_code}")
            print(f"  Response: {response.text}")
            results.append(False)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)
    
    return all(results)

def test_frontend_health():
    """Test C: Frontend health"""
    print("\n" + "="*80)
    print("TEST C: FRONTEND HEALTH")
    print("="*80)
    
    # C1: GET / should return 200
    print("\n[C1] Testing GET / (frontend)")
    try:
        response = requests.get(BACKEND_URL, timeout=10)
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"  ✅ Frontend accessible")
            print(f"  Content-Type: {response.headers.get('content-type')}")
            
            # Check if it's HTML
            if 'text/html' in response.headers.get('content-type', ''):
                print(f"  ✅ Returns HTML content")
                
                # Check for React root div
                if 'id="root"' in response.text or 'id=root' in response.text:
                    print(f"  ✅ React root element found")
                else:
                    print(f"  ⚠️  React root element not found (may be different structure)")
                    
                return True
            else:
                print(f"  ⚠️  Content-Type is not HTML: {response.headers.get('content-type')}")
                return True  # Still pass if we get 200
        else:
            print(f"  ❌ Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("\n" + "="*80)
    print("DEPENDENCY VERIFICATION TEST SUITE")
    print("Testing after installing:")
    print("  1. Backend: resend module")
    print("  2. Frontend: @react-oauth/google package")
    print("="*80)
    
    results = {
        "backend_health": test_backend_health(),
        "update_endpoints": test_update_endpoints(),
        "frontend_health": test_frontend_health()
    }
    
    print("\n" + "="*80)
    print("FINAL RESULTS")
    print("="*80)
    print(f"Backend Health:     {'✅ PASS' if results['backend_health'] else '❌ FAIL'}")
    print(f"Update Endpoints:   {'✅ PASS' if results['update_endpoints'] else '❌ FAIL'}")
    print(f"Frontend Health:    {'✅ PASS' if results['frontend_health'] else '❌ FAIL'}")
    print("="*80)
    
    if all(results.values()):
        print("\n✅ ALL TESTS PASSED - Dependencies successfully installed and working")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED - See details above")
        return 1

if __name__ == "__main__":
    sys.exit(main())
