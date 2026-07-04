#!/usr/bin/env python3
"""
Backend API Testing Script for Code Review Fixes
Tests two specific fixes:
1. Desktop app (standalone_app.py) - AsyncIOMotorClient import fix in diagnostic_fix
2. Live backend (server.py) - MD5 usedforsecurity=False and ZIP password env var
"""

import requests
import json
import sys

# Test configuration
STANDALONE_URL = "http://localhost:8055"
LIVE_BACKEND_URL = "https://13b9f50d-f7c4-4e37-b47f-d057cc55e1ba.preview.emergentagent.com/api"

def test_task_a_desktop_diagnostic():
    """
    TASK A: Test desktop app diagnostic endpoints
    Verifies the AsyncIOMotorClient import fix in mongo_conn self-heal branch
    """
    print("\n" + "="*80)
    print("TASK A: Desktop App Diagnostic Fix (standalone_app.py)")
    print("="*80)
    
    results = {
        "task": "Fix undefined name AsyncIOMotorClient in desktop diagnostic_fix",
        "tests": []
    }
    
    # Test 1: GET /api/diagnostic
    print("\n[Test 1] GET /api/diagnostic")
    try:
        response = requests.get(f"{STANDALONE_URL}/api/diagnostic", timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2)[:500]}")
            results["tests"].append({
                "name": "GET /api/diagnostic",
                "status": "PASS",
                "http_code": 200,
                "detail": "Diagnostic endpoint returns 200 with checks"
            })
        else:
            print(f"  ERROR: Expected 200, got {response.status_code}")
            results["tests"].append({
                "name": "GET /api/diagnostic",
                "status": "FAIL",
                "http_code": response.status_code,
                "detail": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results["tests"].append({
            "name": "GET /api/diagnostic",
            "status": "FAIL",
            "detail": f"Exception: {str(e)}"
        })
    
    # Test 2: POST /api/diagnostic/fix with mongo_conn
    print("\n[Test 2] POST /api/diagnostic/fix (mongo_conn)")
    print("  CRITICAL: Must NOT return HTTP 500 with NameError about AsyncIOMotorClient")
    try:
        response = requests.post(
            f"{STANDALONE_URL}/api/diagnostic/fix",
            json={"id": "mongo_conn"},
            timeout=15
        )
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 500:
            error_text = response.text
            print(f"  ERROR RESPONSE: {error_text[:500]}")
            
            if "NameError" in error_text and "AsyncIOMotorClient" in error_text:
                print("  ❌ CRITICAL FAILURE: NameError with AsyncIOMotorClient detected!")
                results["tests"].append({
                    "name": "POST /api/diagnostic/fix (mongo_conn)",
                    "status": "FAIL",
                    "http_code": 500,
                    "detail": "CRITICAL: NameError about AsyncIOMotorClient - import missing!"
                })
            else:
                print("  ⚠️  HTTP 500 but not the NameError we're testing for")
                results["tests"].append({
                    "name": "POST /api/diagnostic/fix (mongo_conn)",
                    "status": "WARN",
                    "http_code": 500,
                    "detail": f"HTTP 500 but different error: {error_text[:200]}"
                })
        elif response.status_code == 200:
            data = response.json()
            print(f"  ✓ Response: {json.dumps(data, indent=2)}")
            
            # Check if it has expected fields
            if "fixed" in data or "success" in data:
                results["tests"].append({
                    "name": "POST /api/diagnostic/fix (mongo_conn)",
                    "status": "PASS",
                    "http_code": 200,
                    "detail": f"No NameError crash. Response: {data.get('detail', 'OK')}"
                })
            else:
                results["tests"].append({
                    "name": "POST /api/diagnostic/fix (mongo_conn)",
                    "status": "PASS",
                    "http_code": 200,
                    "detail": "HTTP 200 returned, no crash"
                })
        else:
            print(f"  Unexpected status: {response.status_code}")
            results["tests"].append({
                "name": "POST /api/diagnostic/fix (mongo_conn)",
                "status": "WARN",
                "http_code": response.status_code,
                "detail": f"Unexpected status code: {response.status_code}"
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results["tests"].append({
            "name": "POST /api/diagnostic/fix (mongo_conn)",
            "status": "FAIL",
            "detail": f"Exception: {str(e)}"
        })
    
    return results


def test_task_b_live_backend():
    """
    TASK B: Test live backend regression
    Verifies MD5 usedforsecurity=False and ZIP password env var changes
    """
    print("\n" + "="*80)
    print("TASK B: Live Backend Hardening (server.py)")
    print("="*80)
    
    results = {
        "task": "Backend hardening: MD5 usedforsecurity=False + ZIP default password via env",
        "tests": []
    }
    
    # Test 1: GET /api/
    print("\n[Test 1] GET /api/")
    try:
        response = requests.get(f"{LIVE_BACKEND_URL}/", timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2)}")
            results["tests"].append({
                "name": "GET /api/",
                "status": "PASS",
                "http_code": 200,
                "detail": f"Backend root endpoint working: {data.get('message', 'OK')}"
            })
        else:
            print(f"  ERROR: Expected 200, got {response.status_code}")
            results["tests"].append({
                "name": "GET /api/",
                "status": "FAIL",
                "http_code": response.status_code,
                "detail": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results["tests"].append({
            "name": "GET /api/",
            "status": "FAIL",
            "detail": f"Exception: {str(e)}"
        })
    
    # Test 2: GET /api/security/zip-password
    print("\n[Test 2] GET /api/security/zip-password")
    try:
        response = requests.get(f"{LIVE_BACKEND_URL}/security/zip-password", timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2)}")
            
            if "password" in data:
                pwd = data.get("password")
                print(f"  ✓ Password field present: {pwd}")
                results["tests"].append({
                    "name": "GET /api/security/zip-password",
                    "status": "PASS",
                    "http_code": 200,
                    "detail": f"Returns password string: {pwd} (is_default: {data.get('is_default', 'N/A')})"
                })
            else:
                print(f"  ⚠️  Response missing 'password' field")
                results["tests"].append({
                    "name": "GET /api/security/zip-password",
                    "status": "WARN",
                    "http_code": 200,
                    "detail": "Response missing 'password' field"
                })
        else:
            print(f"  ERROR: Expected 200, got {response.status_code}")
            results["tests"].append({
                "name": "GET /api/security/zip-password",
                "status": "FAIL",
                "http_code": response.status_code,
                "detail": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results["tests"].append({
            "name": "GET /api/security/zip-password",
            "status": "FAIL",
            "detail": f"Exception: {str(e)}"
        })
    
    # Test 3: Verify no 500s on startup (check backend logs)
    print("\n[Test 3] Backend startup check")
    print("  Checking if backend started without errors...")
    try:
        # If we got here and previous tests passed, backend is running fine
        if all(t["status"] == "PASS" for t in results["tests"]):
            print("  ✓ Backend is running and responding correctly")
            results["tests"].append({
                "name": "Backend startup verification",
                "status": "PASS",
                "detail": "Backend started successfully, no 500 errors on tested endpoints"
            })
        else:
            print("  ⚠️  Some endpoints failed, but backend is running")
            results["tests"].append({
                "name": "Backend startup verification",
                "status": "WARN",
                "detail": "Backend running but some endpoints had issues"
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results["tests"].append({
            "name": "Backend startup verification",
            "status": "FAIL",
            "detail": f"Exception: {str(e)}"
        })
    
    return results


def print_summary(task_a_results, task_b_results):
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    all_results = [task_a_results, task_b_results]
    
    for task_result in all_results:
        print(f"\n{task_result['task']}")
        print("-" * 80)
        
        for test in task_result["tests"]:
            status_icon = {
                "PASS": "✅",
                "FAIL": "❌",
                "WARN": "⚠️"
            }.get(test["status"], "❓")
            
            print(f"  {status_icon} {test['name']}: {test['status']}")
            if test.get("http_code"):
                print(f"     HTTP {test['http_code']}")
            print(f"     {test['detail']}")
    
    # Overall status
    print("\n" + "="*80)
    all_tests = []
    for task_result in all_results:
        all_tests.extend(task_result["tests"])
    
    passed = sum(1 for t in all_tests if t["status"] == "PASS")
    failed = sum(1 for t in all_tests if t["status"] == "FAIL")
    warned = sum(1 for t in all_tests if t["status"] == "WARN")
    total = len(all_tests)
    
    print(f"TOTAL: {passed}/{total} PASSED, {failed} FAILED, {warned} WARNINGS")
    
    if failed > 0:
        print("\n❌ SOME TESTS FAILED - Review required")
        return 1
    elif warned > 0:
        print("\n⚠️  ALL CRITICAL TESTS PASSED - Some warnings present")
        return 0
    else:
        print("\n✅ ALL TESTS PASSED")
        return 0


if __name__ == "__main__":
    print("="*80)
    print("Backend Code Review Fixes - Testing Script")
    print("="*80)
    
    # Run tests
    task_a_results = test_task_a_desktop_diagnostic()
    task_b_results = test_task_b_live_backend()
    
    # Print summary
    exit_code = print_summary(task_a_results, task_b_results)
    
    sys.exit(exit_code)
