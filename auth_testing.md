# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
mongosh --eval "
use('reserva_eventos');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.app_users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  trial_start_at: new Date().toISOString(),
  plan: null,
  plan_expires_at: null,
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"

## Step 2: Test Backend API
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"

## Step 3: Browser Testing
Set localStorage 'cp_session_token' or cookie 'session_token' to the value.

## Admin endpoints (protected by X-Admin-Password header = 286811)
- GET  /api/admin/users              → list users with subscription state
- POST /api/admin/users/{uid}/disable → block sign-in
- POST /api/admin/users/{uid}/enable  → unblock
- POST /api/admin/users/{uid}/revoke  → clear plan (set to null)
- DELETE /api/admin/users/{uid}       → remove user & sessions
