#!/usr/bin/env python3
"""
Backend Sanity Check Test - Auto-update Bug Fix Verification
Testing that critical endpoints still work after standalone_app.py changes
"""
import requests
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://aedfdbaf-aa49-4353-8ee4-7fb99d127919.preview.emergentagent.com"

def test_root_endpoint():
    """Test GET /api/ - root endpoint"""
    print("\n[TEST 1] GET /api/ (root endpoint)")
    try:
        r = requests.get(f"{BACKEND_URL}/api/", timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Response: {data}")
            print(f"  ✅ PASS - Root endpoint responding")
            return True
        else:
            print(f"  ❌ FAIL - Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL - Exception: {e}")
        return False

def test_reservations_endpoint():
    """Test GET /api/reservations"""
    print("\n[TEST 2] GET /api/reservations")
    try:
        r = requests.get(f"{BACKEND_URL}/api/reservations", timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Response: List with {len(data)} reservations")
            print(f"  ✅ PASS - Reservations endpoint working")
            return True
        else:
            print(f"  ❌ FAIL - Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL - Exception: {e}")
        return False

def test_socios_endpoint():
    """Test GET /api/socios"""
    print("\n[TEST 3] GET /api/socios")
    try:
        r = requests.get(f"{BACKEND_URL}/api/socios", timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Response: List with {len(data)} socios")
            print(f"  ✅ PASS - Socios endpoint working")
            return True
        else:
            print(f"  ❌ FAIL - Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL - Exception: {e}")
        return False

def test_stats_endpoint():
    """Test GET /api/stats"""
    print("\n[TEST 4] GET /api/stats")
    try:
        r = requests.get(f"{BACKEND_URL}/api/stats", timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Response: {data}")
            required_keys = ["total_reservations", "upcoming_events", "pending_payment", "real_income"]
            missing = [k for k in required_keys if k not in data]
            if missing:
                print(f"  ❌ FAIL - Missing keys: {missing}")
                return False
            print(f"  ✅ PASS - Stats endpoint working with all required fields")
            return True
        else:
            print(f"  ❌ FAIL - Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL - Exception: {e}")
        return False

def test_settings_endpoint():
    """Test GET /api/settings"""
    print("\n[TEST 5] GET /api/settings")
    try:
        r = requests.get(f"{BACKEND_URL}/api/settings", timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Response: Settings object with {len(data)} keys")
            print(f"  ✅ PASS - Settings endpoint working")
            return True
        else:
            print(f"  ❌ FAIL - Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL - Exception: {e}")
        return False

def main():
    print("=" * 70)
    print("BACKEND SANITY CHECK - Auto-update Bug Fix Verification")
    print("=" * 70)
    print(f"Backend URL: {BACKEND_URL}")
    
    results = []
    results.append(("Root endpoint", test_root_endpoint()))
    results.append(("Reservations endpoint", test_reservations_endpoint()))
    results.append(("Socios endpoint", test_socios_endpoint()))
    results.append(("Stats endpoint", test_stats_endpoint()))
    results.append(("Settings endpoint", test_settings_endpoint()))
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ ALL BACKEND SANITY CHECKS PASSED")
        print("No regressions detected in critical endpoints")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
