#!/usr/bin/env python3
"""
Comprehensive backend test for Reserva de Eventos app (v1.20.25)
Tests all major flows: Auth, Reservaciones, Socios, Metas, Calendar, Settings, Subscription
"""
import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

# Read backend URL from frontend/.env
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip() + '/api'
            break

print(f"Testing backend at: {BASE_URL}")
print("=" * 80)

# Test state
auth_token: Optional[str] = None
test_email = f"qa-test-{uuid.uuid4().hex[:8]}@test.com"
test_password = "Test1234!"
test_name = "QA Tester"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_pass(test_name: str, details: str = ""):
    msg = f"✅ {test_name}"
    if details:
        msg += f": {details}"
    print(msg)
    test_results["passed"].append(test_name)

def log_fail(test_name: str, details: str):
    msg = f"❌ {test_name}: {details}"
    print(msg)
    test_results["failed"].append(f"{test_name}: {details}")

def log_warn(test_name: str, details: str):
    msg = f"⚠️  {test_name}: {details}"
    print(msg)
    test_results["warnings"].append(f"{test_name}: {details}")

def make_request(method: str, endpoint: str, **kwargs):
    """Make HTTP request with auth token if available"""
    url = f"{BASE_URL}{endpoint}"
    headers = kwargs.pop('headers', {})
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    try:
        resp = requests.request(method, url, headers=headers, timeout=30, **kwargs)
        return resp
    except Exception as e:
        return None

# ============================================================================
# 1. AUTH TESTS
# ============================================================================
print("\n" + "=" * 80)
print("1. AUTHENTICATION TESTS")
print("=" * 80)

# Test 1.1: Register new account
print(f"\n[1.1] POST /auth/register with {test_email}")
resp = make_request('POST', '/auth/register', json={
    "email": test_email,
    "password": test_password,
    "name": test_name
})

if resp and resp.status_code == 200:
    data = resp.json()
    if 'session_token' in data and 'user' in data and 'subscription' in data:
        auth_token = data['session_token']
        user = data['user']
        sub = data['subscription']
        log_pass("Register", f"user_id={user.get('user_id')}, trial_active={sub.get('trial_active')}")
        
        # Verify trial is active (3 days)
        if sub.get('trial_active') and sub.get('trial_days_left') == 3:
            log_pass("Trial activation", "3-day trial started correctly")
        else:
            log_fail("Trial activation", f"Expected trial_active=True and trial_days_left=3, got {sub}")
    else:
        log_fail("Register response structure", f"Missing required fields: {data.keys()}")
else:
    log_fail("Register", f"Status {resp.status_code if resp else 'NO_RESPONSE'}: {resp.text if resp else 'Connection failed'}")
    print("\n⛔ Cannot continue without auth token. Exiting.")
    exit(1)

# Test 1.2: Duplicate email should fail
print(f"\n[1.2] POST /auth/register with duplicate email (should fail)")
resp = make_request('POST', '/auth/register', json={
    "email": test_email,
    "password": test_password,
    "name": "Duplicate User"
})

if resp and resp.status_code == 400:
    log_pass("Duplicate email validation", "Correctly rejected duplicate email")
elif resp and resp.status_code == 200:
    log_fail("Duplicate email validation", "Should reject duplicate email with 400, got 200")
else:
    log_warn("Duplicate email validation", f"Unexpected status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 1.3: GET /auth/me
print(f"\n[1.3] GET /auth/me")
resp = make_request('GET', '/auth/me')

if resp and resp.status_code == 200:
    data = resp.json()
    if 'user' in data and 'subscription' in data:
        user = data['user']
        if user.get('email') == test_email:
            log_pass("GET /auth/me", f"Correctly returned user {user.get('user_id')}")
        else:
            log_fail("GET /auth/me", f"Email mismatch: expected {test_email}, got {user.get('email')}")
    else:
        log_fail("GET /auth/me response", f"Missing required fields: {data.keys()}")
else:
    log_fail("GET /auth/me", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 1.4: Login with wrong password
print(f"\n[1.4] POST /auth/login with wrong password (should fail)")
resp = make_request('POST', '/auth/login', json={
    "email": test_email,
    "password": "WrongPassword123!"
})

if resp and resp.status_code == 401:
    log_pass("Wrong password validation", "Correctly rejected wrong password with 401")
elif resp and resp.status_code == 200:
    log_fail("Wrong password validation", "Should reject wrong password with 401, got 200")
else:
    log_warn("Wrong password validation", f"Unexpected status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 1.5: Login with correct credentials
print(f"\n[1.5] POST /auth/login with correct credentials")
resp = make_request('POST', '/auth/login', json={
    "email": test_email,
    "password": test_password
})

if resp and resp.status_code == 200:
    data = resp.json()
    if 'session_token' in data and 'user' in data:
        log_pass("Login", "Successfully logged in")
    else:
        log_fail("Login response", f"Missing required fields: {data.keys()}")
else:
    log_fail("Login", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 1.6: Subscription status
print(f"\n[1.6] GET /subscription/status")
resp = make_request('GET', '/subscription/status')

if resp and resp.status_code == 200:
    data = resp.json()
    required_fields = ['is_active', 'plan', 'trial_active', 'trial_seconds_left', 'trial_days_left']
    if all(field in data for field in required_fields):
        log_pass("Subscription status", f"is_active={data['is_active']}, trial_active={data['trial_active']}")
    else:
        log_fail("Subscription status response", f"Missing fields. Got: {data.keys()}")
else:
    log_fail("Subscription status", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# ============================================================================
# 2. RESERVACIONES (RESERVATIONS) TESTS
# ============================================================================
print("\n" + "=" * 80)
print("2. RESERVACIONES (RESERVATIONS) TESTS")
print("=" * 80)

reservation_id = None

# Test 2.1: Create reservation
print(f"\n[2.1] POST /reservations")
event_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
resp = make_request('POST', '/reservations', json={
    "client_name": "Juan Pérez",
    "client_phone": "+502 1234-5678",
    "client_email": "juan@example.com",
    "event_type": "Boda",
    "event_date": event_date,
    "event_time": "18:00",
    "venue": "Salón Los Arcos",
    "guests_count": 150,
    "total_amount": 5000.00,
    "advance_paid": 1500.00,
    "status": "Reservado",
    "notes": "Cliente prefiere decoración en azul",
    "package_type": "Premium"
})

if resp and resp.status_code == 201:
    data = resp.json()
    if 'reservation_id' in data:
        reservation_id = data['reservation_id']
        log_pass("Create reservation", f"reservation_id={reservation_id}")
        
        # Validate fields
        if data.get('client_name') == "Juan Pérez":
            log_pass("Reservation data integrity", "client_name correct")
        if data.get('total_amount') == 5000.00:
            log_pass("Reservation data integrity", "total_amount correct")
        if data.get('advance_paid') == 1500.00:
            log_pass("Reservation data integrity", "advance_paid correct")
        
        # Check balance calculation
        balance = data.get('balance')
        expected_balance = 5000.00 - 1500.00
        if balance == expected_balance:
            log_pass("Balance calculation", f"balance={balance} (correct)")
        else:
            log_fail("Balance calculation", f"Expected {expected_balance}, got {balance}")
    else:
        log_fail("Create reservation response", f"Missing reservation_id: {data}")
else:
    log_fail("Create reservation", f"Status {resp.status_code if resp else 'NO_RESPONSE'}: {resp.text if resp else 'Connection failed'}")

# Test 2.2: List reservations
print(f"\n[2.2] GET /reservations")
resp = make_request('GET', '/reservations')

if resp and resp.status_code == 200:
    data = resp.json()
    if isinstance(data, list):
        log_pass("List reservations", f"Found {len(data)} reservation(s)")
        if len(data) > 0 and reservation_id:
            found = any(r.get('reservation_id') == reservation_id for r in data)
            if found:
                log_pass("List reservations contains created", "New reservation found in list")
            else:
                log_fail("List reservations contains created", "New reservation NOT found in list")
    else:
        log_fail("List reservations response", f"Expected list, got {type(data)}")
else:
    log_fail("List reservations", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 2.3: Get reservation by ID
if reservation_id:
    print(f"\n[2.3] GET /reservations/{reservation_id}")
    resp = make_request('GET', f'/reservations/{reservation_id}')
    
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('reservation_id') == reservation_id:
            log_pass("Get reservation by ID", f"Correctly retrieved reservation")
        else:
            log_fail("Get reservation by ID", f"ID mismatch: expected {reservation_id}, got {data.get('reservation_id')}")
    else:
        log_fail("Get reservation by ID", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 2.4: Update reservation
if reservation_id:
    print(f"\n[2.4] PUT /reservations/{reservation_id}")
    resp = make_request('PUT', f'/reservations/{reservation_id}', json={
        "status": "Confirmado",
        "advance_paid": 2500.00,
        "notes": "Cliente pagó segundo adelanto"
    })
    
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('status') == "Confirmado":
            log_pass("Update reservation status", "Status updated to Confirmado")
        if data.get('advance_paid') == 2500.00:
            log_pass("Update reservation advance_paid", "advance_paid updated to 2500.00")
        
        # Check balance recalculation
        balance = data.get('balance')
        expected_balance = 5000.00 - 2500.00
        if balance == expected_balance:
            log_pass("Balance recalculation", f"balance={balance} (correct)")
        else:
            log_fail("Balance recalculation", f"Expected {expected_balance}, got {balance}")
    else:
        log_fail("Update reservation", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 2.5: Delete reservation (will test at end to keep data for other tests)
# Deferred to end

# ============================================================================
# 3. SOCIOS (PARTNERS) TESTS
# ============================================================================
print("\n" + "=" * 80)
print("3. SOCIOS (PARTNERS) TESTS")
print("=" * 80)

socio_id = None

# Test 3.1: Create socio
print(f"\n[3.1] POST /socios")
resp = make_request('POST', '/socios', json={
    "name": "Carlos Fotógrafo",
    "role": "Fotógrafo",
    "phone": "+502 9876-5432",
    "email": "carlos@example.com",
    "notes": "Especialista en bodas",
    "rate_per_event": 800.00
})

if resp and resp.status_code == 201:
    data = resp.json()
    if 'socio_id' in data:
        socio_id = data['socio_id']
        log_pass("Create socio", f"socio_id={socio_id}")
        
        # Validate fields
        if data.get('name') == "Carlos Fotógrafo":
            log_pass("Socio data integrity", "name correct")
        if data.get('rate_per_event') == 800.00:
            log_pass("Socio data integrity", "rate_per_event correct")
    else:
        log_fail("Create socio response", f"Missing socio_id: {data}")
else:
    log_fail("Create socio", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 3.2: List socios
print(f"\n[3.2] GET /socios")
resp = make_request('GET', '/socios')

if resp and resp.status_code == 200:
    data = resp.json()
    if isinstance(data, list):
        log_pass("List socios", f"Found {len(data)} socio(s)")
        if len(data) > 0 and socio_id:
            found = any(s.get('socio_id') == socio_id for s in data)
            if found:
                log_pass("List socios contains created", "New socio found in list")
            else:
                log_fail("List socios contains created", "New socio NOT found in list")
    else:
        log_fail("List socios response", f"Expected list, got {type(data)}")
else:
    log_fail("List socios", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 3.3: Get socio by ID
if socio_id:
    print(f"\n[3.3] GET /socios/{socio_id}")
    resp = make_request('GET', f'/socios/{socio_id}')
    
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('socio_id') == socio_id:
            log_pass("Get socio by ID", f"Correctly retrieved socio")
        else:
            log_fail("Get socio by ID", f"ID mismatch")
    else:
        log_fail("Get socio by ID", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 3.4: Update socio
if socio_id:
    print(f"\n[3.4] PUT /socios/{socio_id}")
    resp = make_request('PUT', f'/socios/{socio_id}', json={
        "rate_per_event": 900.00,
        "notes": "Especialista en bodas y XV años"
    })
    
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('rate_per_event') == 900.00:
            log_pass("Update socio rate", "rate_per_event updated to 900.00")
        if "XV años" in data.get('notes', ''):
            log_pass("Update socio notes", "notes updated correctly")
    else:
        log_fail("Update socio", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 3.5: Socio debts/deudas logic (if exists in financials)
# Will test in financials section

# ============================================================================
# 4. METAS (GOALS) TESTS
# ============================================================================
print("\n" + "=" * 80)
print("4. METAS (GOALS) TESTS")
print("=" * 80)

# Test 4.1: Get metas (should be empty initially)
print(f"\n[4.1] GET /metas")
resp = make_request('GET', '/metas')

if resp and resp.status_code == 200:
    data = resp.json()
    log_pass("Get metas", f"Response received: {data}")
else:
    log_fail("Get metas", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 4.2: Create/Update meta
print(f"\n[4.2] PUT /metas")
resp = make_request('PUT', '/metas', json={
    "monthly_goal": 15000.00,
    "yearly_goal": 180000.00
})

if resp and resp.status_code == 200:
    data = resp.json()
    if data.get('monthly_goal') == 15000.00:
        log_pass("Create/Update meta monthly", "monthly_goal set to 15000.00")
    if data.get('yearly_goal') == 180000.00:
        log_pass("Create/Update meta yearly", "yearly_goal set to 180000.00")
else:
    log_fail("Create/Update meta", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 4.3: Get metas progress
print(f"\n[4.3] GET /metas/progress")
resp = make_request('GET', '/metas/progress')

if resp and resp.status_code == 200:
    data = resp.json()
    required_fields = ['monthly_goal', 'monthly_progress', 'yearly_goal', 'yearly_progress']
    if all(field in data for field in required_fields):
        log_pass("Get metas progress", f"monthly_progress={data.get('monthly_progress')}, yearly_progress={data.get('yearly_progress')}")
        
        # Validate progress calculation
        monthly_pct = data.get('monthly_progress_percentage', 0)
        yearly_pct = data.get('yearly_progress_percentage', 0)
        if isinstance(monthly_pct, (int, float)) and isinstance(yearly_pct, (int, float)):
            log_pass("Progress percentage calculation", f"monthly={monthly_pct}%, yearly={yearly_pct}%")
        else:
            log_warn("Progress percentage calculation", f"Unexpected types: monthly={type(monthly_pct)}, yearly={type(yearly_pct)}")
    else:
        log_fail("Get metas progress response", f"Missing fields. Got: {data.keys()}")
else:
    log_fail("Get metas progress", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# ============================================================================
# 5. CALENDAR / MONTHLY EVENTS TESTS
# ============================================================================
print("\n" + "=" * 80)
print("5. CALENDAR / MONTHLY EVENTS TESTS")
print("=" * 80)

# Test 5.1: Get calendar events
print(f"\n[5.1] GET /calendar")
current_month = datetime.now().strftime("%Y-%m")
resp = make_request('GET', f'/calendar?month={current_month}')

if resp and resp.status_code == 200:
    data = resp.json()
    if isinstance(data, list):
        log_pass("Get calendar events", f"Found {len(data)} event(s) for {current_month}")
        
        # Validate event structure if any events exist
        if len(data) > 0:
            event = data[0]
            required_fields = ['reservation_id', 'event_date', 'event_type', 'client_name']
            if all(field in event for field in required_fields):
                log_pass("Calendar event structure", "All required fields present")
            else:
                log_fail("Calendar event structure", f"Missing fields. Got: {event.keys()}")
    else:
        log_fail("Get calendar events response", f"Expected list, got {type(data)}")
else:
    log_fail("Get calendar events", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# ============================================================================
# 6. SETTINGS / APP_SETTINGS TESTS
# ============================================================================
print("\n" + "=" * 80)
print("6. SETTINGS / APP_SETTINGS TESTS")
print("=" * 80)

# Test 6.1: Get settings
print(f"\n[6.1] GET /settings")
resp = make_request('GET', '/settings')

if resp and resp.status_code == 200:
    data = resp.json()
    log_pass("Get settings", f"Settings retrieved: {list(data.keys())[:5]}...")
    
    # Check for key settings fields
    if 'notification_settings' in data:
        log_pass("Settings structure", "notification_settings present")
    if 'appearance' in data:
        log_pass("Settings structure", "appearance present")
else:
    log_fail("Get settings", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 6.2: Update settings
print(f"\n[6.2] PUT /settings")
resp = make_request('PUT', '/settings', json={
    "company_name": "Cinema Productions Test",
    "notification_settings": {
        "reminders_enabled": True,
        "reminder_periods": [7, 3, 1],
        "reminder_time": "09:00"
    }
})

if resp and resp.status_code == 200:
    data = resp.json()
    if data.get('company_name') == "Cinema Productions Test":
        log_pass("Update settings company_name", "company_name updated")
    if data.get('notification_settings', {}).get('reminders_enabled') == True:
        log_pass("Update settings notifications", "notification_settings updated")
else:
    log_fail("Update settings", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 6.3: Appearance/themes endpoints (if exist)
print(f"\n[6.3] GET /appearance (if exists)")
resp = make_request('GET', '/appearance')
if resp and resp.status_code == 200:
    log_pass("Get appearance", "Appearance settings retrieved")
elif resp and resp.status_code == 404:
    log_warn("Get appearance", "Endpoint not found (may not exist)")
else:
    log_warn("Get appearance", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# ============================================================================
# 7. STATS / FINANCIALS TESTS
# ============================================================================
print("\n" + "=" * 80)
print("7. STATS / FINANCIALS TESTS")
print("=" * 80)

# Test 7.1: Get stats
print(f"\n[7.1] GET /stats")
resp = make_request('GET', '/stats')

if resp and resp.status_code == 200:
    data = resp.json()
    required_fields = ['total_reservations', 'total_revenue', 'total_pending']
    if all(field in data for field in required_fields):
        log_pass("Get stats", f"total_reservations={data.get('total_reservations')}, total_revenue={data.get('total_revenue')}")
        
        # Validate totals calculation
        total_rev = data.get('total_revenue', 0)
        total_pend = data.get('total_pending', 0)
        if isinstance(total_rev, (int, float)) and isinstance(total_pend, (int, float)):
            log_pass("Stats calculation", f"revenue={total_rev}, pending={total_pend}")
        else:
            log_fail("Stats calculation", f"Invalid types: revenue={type(total_rev)}, pending={type(total_pend)}")
    else:
        log_fail("Get stats response", f"Missing fields. Got: {data.keys()}")
else:
    log_fail("Get stats", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 7.2: Get financials
print(f"\n[7.2] GET /financials")
resp = make_request('GET', '/financials')

if resp and resp.status_code == 200:
    data = resp.json()
    log_pass("Get financials", f"Financials retrieved: {list(data.keys())}")
    
    # Check for key financial fields
    if 'total_income' in data:
        log_pass("Financials structure", f"total_income={data.get('total_income')}")
    if 'total_expenses' in data:
        log_pass("Financials structure", f"total_expenses={data.get('total_expenses')}")
    if 'partner_debts' in data or 'socios_debts' in data:
        log_pass("Financials structure", "partner debts/deudas present")
else:
    log_fail("Get financials", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# ============================================================================
# 8. CLEANUP - DELETE CREATED RESOURCES
# ============================================================================
print("\n" + "=" * 80)
print("8. CLEANUP - DELETE CREATED RESOURCES")
print("=" * 80)

# Test 8.1: Delete reservation
if reservation_id:
    print(f"\n[8.1] DELETE /reservations/{reservation_id}")
    resp = make_request('DELETE', f'/reservations/{reservation_id}')
    
    if resp and resp.status_code == 200:
        log_pass("Delete reservation", f"Reservation {reservation_id} deleted")
    else:
        log_warn("Delete reservation", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 8.2: Delete socio
if socio_id:
    print(f"\n[8.2] DELETE /socios/{socio_id}")
    resp = make_request('DELETE', f'/socios/{socio_id}')
    
    if resp and resp.status_code == 200:
        log_pass("Delete socio", f"Socio {socio_id} deleted")
    else:
        log_warn("Delete socio", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# Test 8.3: Delete metas
print(f"\n[8.3] DELETE /metas")
resp = make_request('DELETE', '/metas')

if resp and resp.status_code == 200:
    log_pass("Delete metas", "Metas deleted")
elif resp and resp.status_code == 404:
    log_warn("Delete metas", "Endpoint not found or no metas to delete")
else:
    log_warn("Delete metas", f"Status {resp.status_code if resp else 'NO_RESPONSE'}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

print(f"\n✅ PASSED: {len(test_results['passed'])} tests")
print(f"❌ FAILED: {len(test_results['failed'])} tests")
print(f"⚠️  WARNINGS: {len(test_results['warnings'])} tests")

if test_results['failed']:
    print("\n" + "=" * 80)
    print("FAILED TESTS DETAILS:")
    print("=" * 80)
    for failure in test_results['failed']:
        print(f"  ❌ {failure}")

if test_results['warnings']:
    print("\n" + "=" * 80)
    print("WARNINGS:")
    print("=" * 80)
    for warning in test_results['warnings']:
        print(f"  ⚠️  {warning}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)

# Exit with error code if any tests failed
exit(0 if len(test_results['failed']) == 0 else 1)
