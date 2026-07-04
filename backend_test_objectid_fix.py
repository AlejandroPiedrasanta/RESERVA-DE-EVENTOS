#!/usr/bin/env python3
"""
Backend API Testing for ObjectId Serialization Fix
Tests database, backup, and themes endpoints after fixing ObjectId → string conversion
"""

import requests
import time
import json
from typing import Dict, Any

# Backend URL from frontend/.env
BASE_URL = "https://reserva-eventos-4.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    if passed:
        test_results["passed"] += 1
        print(f"{status}: {name}")
    else:
        test_results["failed"] += 1
        print(f"{status}: {name}")
        if details:
            print(f"  Details: {details}")


# ============================================================================
# BLOCK 1: Database Settings & Stats
# ============================================================================

def test_block1_database_settings():
    """Block 1: Test database settings endpoints"""
    print("\n" + "="*70)
    print("BLOCK 1: Database Settings & Stats")
    print("="*70)
    
    # Test 1.1: GET /api/settings/database
    print("\n=== Test 1.1: GET /api/settings/database ===")
    try:
        response = requests.get(f"{BASE_URL}/settings/database", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/settings/database - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:200]}")
        else:
            log_test("GET /api/settings/database - Status 200", True)
            
            data = response.json()
            
            # Check required keys
            required_keys = ["collections", "objects", "total_size", "current_url"]
            missing_keys = [k for k in required_keys if k not in data]
            
            if missing_keys:
                log_test("GET /api/settings/database - All required keys present", False, 
                        f"Missing: {missing_keys}")
            else:
                log_test("GET /api/settings/database - All required keys present", True)
            
            # Check no error in response
            if "error" not in data and "connection_error" not in data:
                log_test("GET /api/settings/database - No errors", True)
            else:
                log_test("GET /api/settings/database - No errors", False, 
                        f"Error: {data.get('error') or data.get('connection_error')}")
            
            print(f"\nDB Stats:")
            print(f"  Collections: {data.get('collections')}")
            print(f"  Objects: {data.get('objects')}")
            print(f"  Total Size: {data.get('total_size')}")
            
    except Exception as e:
        log_test("GET /api/settings/database - Request successful", False, str(e))
    
    # Test 1.2: POST /api/settings/database/test
    print("\n=== Test 1.2: POST /api/settings/database/test ===")
    try:
        payload = {"url": "mongodb://localhost:27017"}
        response = requests.post(f"{BASE_URL}/settings/database/test", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("POST /api/settings/database/test - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:200]}")
        else:
            log_test("POST /api/settings/database/test - Status 200", True)
            
            data = response.json()
            
            if data.get("success") == True:
                log_test("POST /api/settings/database/test - success:true", True)
            else:
                log_test("POST /api/settings/database/test - success:true", False, 
                        f"Got: {data}")
            
    except Exception as e:
        log_test("POST /api/settings/database/test - Request successful", False, str(e))
    
    # Test 1.3: POST /api/settings/database/optimize
    print("\n=== Test 1.3: POST /api/settings/database/optimize ===")
    try:
        response = requests.post(f"{BASE_URL}/settings/database/optimize", timeout=15)
        
        if response.status_code != 200:
            log_test("POST /api/settings/database/optimize - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:200]}")
        else:
            log_test("POST /api/settings/database/optimize - Status 200", True)
            
            data = response.json()
            
            if data.get("success") == True:
                log_test("POST /api/settings/database/optimize - success:true", True)
            else:
                log_test("POST /api/settings/database/optimize - success:true", False, 
                        f"Got: {data}")
            
    except Exception as e:
        log_test("POST /api/settings/database/optimize - Request successful", False, str(e))


# ============================================================================
# BLOCK 2: Backup Endpoints (Critical - was failing with ObjectId error)
# ============================================================================

def test_block2_backup_endpoints():
    """Block 2: Test backup endpoints (these were failing with ObjectId serialization)"""
    print("\n" + "="*70)
    print("BLOCK 2: Backup Endpoints (ObjectId Fix Critical)")
    print("="*70)
    
    # Test 2.1: POST /api/backup/create
    print("\n=== Test 2.1: POST /api/backup/create ===")
    backup_filename = None
    try:
        response = requests.post(f"{BASE_URL}/backup/create", timeout=30)
        
        if response.status_code != 200:
            log_test("POST /api/backup/create - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:500]}")
        else:
            log_test("POST /api/backup/create - Status 200", True)
            
            data = response.json()
            
            if data.get("success") == True:
                log_test("POST /api/backup/create - success:true", True)
            else:
                log_test("POST /api/backup/create - success:true", False, 
                        f"Got: {data}")
            
            if "filename" in data:
                log_test("POST /api/backup/create - Returns filename", True)
                backup_filename = data["filename"]
                print(f"  Backup filename: {backup_filename}")
            else:
                log_test("POST /api/backup/create - Returns filename", False, 
                        "No filename in response")
            
            if "docs" in data:
                log_test("POST /api/backup/create - Returns docs count", True, 
                        f"Docs: {data['docs']}")
            else:
                log_test("POST /api/backup/create - Returns docs count", False)
            
    except Exception as e:
        log_test("POST /api/backup/create - Request successful", False, str(e))
    
    # Test 2.2: GET /api/backup/download
    print("\n=== Test 2.2: GET /api/backup/download ===")
    try:
        response = requests.get(f"{BASE_URL}/backup/download", timeout=30)
        
        if response.status_code != 200:
            log_test("GET /api/backup/download - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:500]}")
        else:
            log_test("GET /api/backup/download - Status 200", True)
            
            # Check content-type
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                log_test("GET /api/backup/download - Content-Type is application/json", True)
            else:
                log_test("GET /api/backup/download - Content-Type is application/json", False, 
                        f"Got: {content_type}")
            
            # Try to parse JSON (this would fail if ObjectId serialization is broken)
            try:
                data = response.json()
                log_test("GET /api/backup/download - Valid JSON response", True)
                
                # Check structure
                if "_meta" in data:
                    log_test("GET /api/backup/download - Contains _meta", True)
                else:
                    log_test("GET /api/backup/download - Contains _meta", False)
                
                # Check collections
                if "reservations" in data or "socios" in data or "app_settings" in data:
                    log_test("GET /api/backup/download - Contains collections", True)
                else:
                    log_test("GET /api/backup/download - Contains collections", False)
                
            except json.JSONDecodeError as je:
                log_test("GET /api/backup/download - Valid JSON response", False, 
                        f"JSON decode error: {str(je)}")
            
    except Exception as e:
        log_test("GET /api/backup/download - Request successful", False, str(e))
    
    # Test 2.3: GET /api/backup/history
    print("\n=== Test 2.3: GET /api/backup/history ===")
    try:
        response = requests.get(f"{BASE_URL}/backup/history", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/backup/history - Status 200", False, 
                    f"Got {response.status_code}")
        else:
            log_test("GET /api/backup/history - Status 200", True)
            
            data = response.json()
            
            if isinstance(data, list):
                log_test("GET /api/backup/history - Returns list", True, 
                        f"Found {len(data)} backups")
                
                # Check if our created backup is in the list
                if backup_filename and any(b.get("filename") == backup_filename for b in data):
                    log_test("GET /api/backup/history - Contains newly created backup", True)
                elif backup_filename:
                    log_test("GET /api/backup/history - Contains newly created backup", False, 
                            f"Backup {backup_filename} not found in history")
            else:
                log_test("GET /api/backup/history - Returns list", False, 
                        f"Got: {type(data)}")
            
    except Exception as e:
        log_test("GET /api/backup/history - Request successful", False, str(e))


# ============================================================================
# BLOCK 3: Themes Endpoints (default_theme_id must be string, not ObjectId)
# ============================================================================

def test_block3_themes_endpoints():
    """Block 3: Test themes endpoints (default_theme_id must be string)"""
    print("\n" + "="*70)
    print("BLOCK 3: Themes Endpoints (default_theme_id as string)")
    print("="*70)
    
    # Test 3.1: GET /api/themes
    print("\n=== Test 3.1: GET /api/themes ===")
    default_theme_id = None
    minimalista_theme = None
    try:
        response = requests.get(f"{BASE_URL}/themes", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/themes - Status 200", False, 
                    f"Got {response.status_code}")
        else:
            log_test("GET /api/themes - Status 200", True)
            
            data = response.json()
            
            if isinstance(data, list):
                log_test("GET /api/themes - Returns list", True, f"Found {len(data)} themes")
                
                # Find Minimalista theme with is_default:true
                for theme in data:
                    if theme.get("is_default") == True:
                        default_theme_id = theme.get("id")
                        if "minimalista" in theme.get("name", "").lower():
                            minimalista_theme = theme
                            log_test("GET /api/themes - Minimalista has is_default:true", True)
                            print(f"  Default theme: {theme.get('name')} (id: {default_theme_id})")
                        break
                
                if not default_theme_id:
                    log_test("GET /api/themes - Has default theme", False, 
                            "No theme with is_default:true found")
                else:
                    log_test("GET /api/themes - Has default theme", True)
                    
                    # Check that id is a string (not ObjectId)
                    if isinstance(default_theme_id, str):
                        log_test("GET /api/themes - default_theme_id is string", True)
                    else:
                        log_test("GET /api/themes - default_theme_id is string", False, 
                                f"Got type: {type(default_theme_id)}")
            else:
                log_test("GET /api/themes - Returns list", False, f"Got: {type(data)}")
            
    except Exception as e:
        log_test("GET /api/themes - Request successful", False, str(e))
    
    # Test 3.2: POST /api/themes/{id}/set-default (if we have a theme)
    if default_theme_id:
        print(f"\n=== Test 3.2: POST /api/themes/{default_theme_id}/set-default ===")
        try:
            response = requests.post(f"{BASE_URL}/themes/{default_theme_id}/set-default", timeout=10)
            
            if response.status_code != 200:
                log_test("POST /api/themes/{id}/set-default - Status 200", False, 
                        f"Got {response.status_code}")
            else:
                log_test("POST /api/themes/{id}/set-default - Status 200", True)
                
                data = response.json()
                
                if data.get("success") == True:
                    log_test("POST /api/themes/{id}/set-default - success:true", True)
                else:
                    log_test("POST /api/themes/{id}/set-default - success:true", False, 
                            f"Got: {data}")
                
        except Exception as e:
            log_test("POST /api/themes/{id}/set-default - Request successful", False, str(e))
    
    # Test 3.3: POST /api/themes/sync
    print("\n=== Test 3.3: POST /api/themes/sync ===")
    try:
        response = requests.post(f"{BASE_URL}/themes/sync", timeout=15)
        
        if response.status_code != 200:
            log_test("POST /api/themes/sync - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:200]}")
        else:
            log_test("POST /api/themes/sync - Status 200", True)
            
            data = response.json()
            
            # Check for success or expected keys
            if "mongodb" in data or "local" in data or "github" in data:
                log_test("POST /api/themes/sync - Returns sync status", True)
            else:
                log_test("POST /api/themes/sync - Returns sync status", False, 
                        f"Got: {data}")
            
    except Exception as e:
        log_test("POST /api/themes/sync - Request successful", False, str(e))
    
    # Test 3.4: Verify app_settings has default_theme_id as string
    print("\n=== Test 3.4: Verify app_settings.default_theme_id is string ===")
    try:
        response = requests.get(f"{BASE_URL}/settings", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if "default_theme_id" in data:
                theme_id = data["default_theme_id"]
                if isinstance(theme_id, str):
                    log_test("app_settings.default_theme_id - Is string", True, 
                            f"Value: {theme_id}")
                else:
                    log_test("app_settings.default_theme_id - Is string", False, 
                            f"Got type: {type(theme_id)}, value: {theme_id}")
            else:
                log_test("app_settings.default_theme_id - Exists", False, 
                        "Field not found in app_settings")
        else:
            log_test("GET /api/settings - Status 200", False, f"Got {response.status_code}")
            
    except Exception as e:
        log_test("Verify app_settings.default_theme_id - Request successful", False, str(e))


# ============================================================================
# BLOCK 4: Regression Tests
# ============================================================================

def test_block4_regression():
    """Block 4: Test other endpoints for regression"""
    print("\n" + "="*70)
    print("BLOCK 4: Regression Tests")
    print("="*70)
    
    endpoints = [
        ("/", "GET /api/", lambda d: d.get("message") == "Event Reservation API"),
        ("/stats", "GET /api/stats", lambda d: all(k in d for k in ["total_reservations", "upcoming_events"])),
        ("/reservations", "GET /api/reservations", lambda d: isinstance(d, list)),
        ("/socios", "GET /api/socios", lambda d: isinstance(d, list)),
    ]
    
    for endpoint, name, validator in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if validator(data):
                    log_test(f"{name} - Working", True)
                else:
                    log_test(f"{name} - Working", False, "Response structure invalid")
            else:
                log_test(f"{name} - Working", False, f"Status {response.status_code}")
                
        except Exception as e:
            log_test(f"{name} - Working", False, str(e))


# ============================================================================
# Summary
# ============================================================================

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    total = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {test_results['passed']} ✅")
    print(f"Failed: {test_results['failed']} ❌")
    print(f"Pass Rate: {pass_rate:.1f}%")
    
    if test_results["failed"] > 0:
        print("\n❌ FAILED TESTS:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}")
                if test["details"]:
                    print(f"    {test['details']}")
    else:
        print("\n🎉 ALL TESTS PASSED!")
    
    print("\n" + "="*70)
    
    return test_results


if __name__ == "__main__":
    print("="*70)
    print("CINEMA PRODUCTIONS - OBJECTID SERIALIZATION FIX TESTING")
    print("Database, Backup, and Themes Endpoints")
    print("="*70)
    print(f"\nBackend URL: {BASE_URL}")
    print(f"Test Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run all test blocks
    test_block1_database_settings()
    test_block2_backup_endpoints()
    test_block3_themes_endpoints()
    test_block4_regression()
    
    # Print summary
    results = print_summary()
    
    # Exit with appropriate code
    exit(0 if results["failed"] == 0 else 1)
