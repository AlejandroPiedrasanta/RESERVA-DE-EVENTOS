#!/usr/bin/env python3
"""
Test suite for standalone_app.py (Cinema Productions Desktop Server)
This tests the desktop application server that will be compiled into CinemaProductions.exe
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8912"

def test_root_endpoint():
    """Test GET /api/ - should return db_mode='embedded'"""
    print("\n" + "="*70)
    print("TEST 1: GET /api/ (root endpoint)")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify structure
        if "message" not in data:
            print("❌ FAILED: Missing 'message' field")
            return False
        
        if "db_mode" not in data:
            print("❌ FAILED: Missing 'db_mode' field")
            return False
        
        if data["db_mode"] != "embedded":
            print(f"❌ FAILED: Expected db_mode='embedded', got '{data['db_mode']}'")
            return False
        
        print("✅ PASSED: Root endpoint working correctly")
        print(f"   - message: {data['message']}")
        print(f"   - db_mode: {data['db_mode']} (correct)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_stats_endpoint():
    """Test GET /api/stats"""
    print("\n" + "="*70)
    print("TEST 2: GET /api/stats")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/stats", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify required fields
        required = ["total_reservations", "upcoming_events", "pending_payment", "real_income"]
        for field in required:
            if field not in data:
                print(f"❌ FAILED: Missing required field '{field}'")
                return False
        
        print("✅ PASSED: Stats endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_reservations_list():
    """Test GET /api/reservations (list)"""
    print("\n" + "="*70)
    print("TEST 3: GET /api/reservations (list)")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/reservations", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Response: {len(data)} reservations")
        
        if not isinstance(data, list):
            print(f"❌ FAILED: Expected list, got {type(data)}")
            return False
        
        print(f"✅ PASSED: Reservations list endpoint working (found {len(data)} reservations)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_create_reservation():
    """Test POST /api/reservations (create)"""
    print("\n" + "="*70)
    print("TEST 4: POST /api/reservations (create)")
    print("="*70)
    
    try:
        payload = {
            "client_name": "Test Client Desktop",
            "event_type": "Boda",
            "event_date": "2025-12-01",
            "total_amount": 1000
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        resp = requests.post(
            f"{BASE_URL}/api/reservations",
            json=payload,
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 201:
            print(f"❌ FAILED: Expected 201, got {resp.status_code}")
            print(f"Response: {resp.text}")
            return False, None
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify required fields
        if "id" not in data:
            print("❌ FAILED: Missing 'id' field in response")
            return False, None
        
        if data.get("client_name") != payload["client_name"]:
            print(f"❌ FAILED: client_name mismatch")
            return False, None
        
        if data.get("total_amount") != payload["total_amount"]:
            print(f"❌ FAILED: total_amount mismatch")
            return False, None
        
        reservation_id = data["id"]
        print(f"✅ PASSED: Reservation created successfully")
        print(f"   - ID: {reservation_id}")
        print(f"   - Client: {data['client_name']}")
        print(f"   - Amount: {data['total_amount']}")
        return True, reservation_id
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False, None


def test_verify_reservation_in_list(reservation_id):
    """Test GET /api/reservations - verify created reservation appears"""
    print("\n" + "="*70)
    print("TEST 5: GET /api/reservations (verify creation)")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/reservations", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Total reservations: {len(data)}")
        
        # Find our reservation
        found = False
        for res in data:
            if res.get("id") == reservation_id:
                found = True
                print(f"✅ Found created reservation:")
                print(f"   - ID: {res['id']}")
                print(f"   - Client: {res.get('client_name')}")
                print(f"   - Amount: {res.get('total_amount')}")
                break
        
        if not found:
            print(f"❌ FAILED: Created reservation (ID: {reservation_id}) not found in list")
            return False
        
        print("✅ PASSED: Created reservation appears in list")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_spa_index():
    """Test GET / - should return HTML with injected __API_BASE_URL__"""
    print("\n" + "="*70)
    print("TEST 6: GET / (SPA index.html)")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        html = resp.text
        print(f"Response length: {len(html)} bytes")
        print(f"Content-Type: {resp.headers.get('content-type')}")
        
        # Verify it's HTML
        if "text/html" not in resp.headers.get("content-type", ""):
            print(f"❌ FAILED: Expected HTML content-type")
            return False
        
        # Verify it contains the injected API base URL
        if "window.__API_BASE_URL__" not in html:
            print("❌ FAILED: Missing window.__API_BASE_URL__ injection in HTML")
            return False
        
        # Extract the injected URL
        import re
        match = re.search(r'window\.__API_BASE_URL__\s*=\s*["\']([^"\']+)["\']', html)
        if match:
            injected_url = match.group(1)
            print(f"✅ Found injected API base URL: {injected_url}")
        else:
            print("⚠️  Could not extract injected URL value")
        
        # Verify it's a proper HTML document
        if "<html" not in html.lower() or "</html>" not in html.lower():
            print("❌ FAILED: Response doesn't appear to be a complete HTML document")
            return False
        
        print("✅ PASSED: SPA index.html served correctly with injected __API_BASE_URL__")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_financials_endpoint():
    """Test GET /api/financials"""
    print("\n" + "="*70)
    print("TEST 7: GET /api/financials")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/financials", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify required fields
        required = [
            "total_event_amount",
            "total_advance",
            "total_partner_cost",
            "total_paid_to_partners",
            "total_pending_to_partners",
            "real_income"
        ]
        
        for field in required:
            if field not in data:
                print(f"❌ FAILED: Missing required field '{field}'")
                return False
        
        print("✅ PASSED: Financials endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_socios_endpoint():
    """Test GET /api/socios"""
    print("\n" + "="*70)
    print("TEST 8: GET /api/socios")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/socios", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Response: {len(data)} socios")
        
        if not isinstance(data, list):
            print(f"❌ FAILED: Expected list, got {type(data)}")
            return False
        
        print(f"✅ PASSED: Socios endpoint working (found {len(data)} socios)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_settings_endpoint():
    """Test GET /api/settings"""
    print("\n" + "="*70)
    print("TEST 9: GET /api/settings")
    print("="*70)
    
    try:
        resp = requests.get(f"{BASE_URL}/api/settings", timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        if not isinstance(data, dict):
            print(f"❌ FAILED: Expected dict, got {type(data)}")
            return False
        
        print("✅ PASSED: Settings endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def main():
    print("\n" + "="*70)
    print("CINEMA PRODUCTIONS DESKTOP SERVER TEST SUITE")
    print("Testing standalone_app.py on http://127.0.0.1:8912")
    print("="*70)
    
    # Wait a bit for server to be fully ready
    print("\nWaiting for server to be ready...")
    time.sleep(2)
    
    results = []
    
    # Test 1: Root endpoint
    results.append(("GET /api/", test_root_endpoint()))
    
    # Test 2: Stats
    results.append(("GET /api/stats", test_stats_endpoint()))
    
    # Test 3: List reservations
    results.append(("GET /api/reservations (list)", test_reservations_list()))
    
    # Test 4: Create reservation
    success, reservation_id = test_create_reservation()
    results.append(("POST /api/reservations (create)", success))
    
    # Test 5: Verify creation
    if success and reservation_id:
        results.append(("GET /api/reservations (verify)", test_verify_reservation_in_list(reservation_id)))
    else:
        results.append(("GET /api/reservations (verify)", False))
    
    # Test 6: SPA index
    results.append(("GET / (SPA index)", test_spa_index()))
    
    # Test 7: Financials
    results.append(("GET /api/financials", test_financials_endpoint()))
    
    # Test 8: Socios
    results.append(("GET /api/socios", test_socios_endpoint()))
    
    # Test 9: Settings
    results.append(("GET /api/settings", test_settings_endpoint()))
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*70)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*70)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit(main())
