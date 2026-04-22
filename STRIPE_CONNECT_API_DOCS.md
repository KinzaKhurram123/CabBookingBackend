# Stripe Connect API Documentation

Complete API documentation for Stripe Connect integration in the Cab Booking Backend.

---

## Table of Contents
1. [Driver APIs](#driver-apis)
2. [OAuth Callback APIs](#oauth-callback-apis)
3. [Admin APIs](#admin-apis)
4. [Wallet API (Updated)](#wallet-api-updated)
5. [Withdrawal API (Deprecated)](#withdrawal-api-deprecated)

---

## Driver APIs

### 1. Create Connect Account

**Endpoint:** `POST /api/stripe-connect/create-account`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Creates a Stripe Express Connect account for the driver.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Request Body:** None

**Success Response (201):**
```json
{
  "success": true,
  "message": "Connect account created successfully",
  "accountId": "acct_1234567890abcdef"
}
```

**Error Responses:**

Already exists (400):
```json
{
  "success": false,
  "message": "Connect account already exists",
  "accountId": "acct_1234567890abcdef"
}
```

Rider not found (404):
```json
{
  "success": false,
  "message": "Rider profile not found"
}
```

---

### 2. Generate Onboarding Link

**Endpoint:** `POST /api/stripe-connect/account-link`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Generates a Stripe hosted onboarding link for the driver to complete their account setup.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Onboarding link generated",
  "url": "https://connect.stripe.com/setup/s/acct_1234567890abcdef/xyz123"
}
```

**Usage:**
- Redirect driver to the `url` in browser
- Driver completes Stripe onboarding
- Stripe redirects back to your return URL

**Error Responses:**

No account found (400):
```json
{
  "success": false,
  "message": "No Connect account found. Please create one first."
}
```

---

### 3. Get Account Status

**Endpoint:** `GET /api/stripe-connect/account-status`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Retrieves the current status of the driver's Stripe Connect account.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Success Response (200):**

Account exists and enabled:
```json
{
  "success": true,
  "message": "Account status retrieved",
  "status": "enabled",
  "accountStatus": {
    "detailsSubmitted": true,
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "onboardingComplete": true,
    "requirementsCurrentlyDue": [],
    "requirementsEventuallyDue": []
  }
}
```

Account pending:
```json
{
  "success": true,
  "message": "Account status retrieved",
  "status": "pending",
  "accountStatus": {
    "detailsSubmitted": false,
    "chargesEnabled": false,
    "payoutsEnabled": false,
    "onboardingComplete": false,
    "requirementsCurrentlyDue": [
      "individual.first_name",
      "individual.last_name",
      "individual.dob.day",
      "individual.dob.month",
      "individual.dob.year"
    ],
    "requirementsEventuallyDue": []
  }
}
```

No account:
```json
{
  "success": true,
  "message": "No Connect account found",
  "status": "not_started",
  "accountStatus": null
}
```

---

### 4. Refresh Onboarding Link

**Endpoint:** `POST /api/stripe-connect/refresh-link`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Regenerates an onboarding link if the previous one expired.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Onboarding link refreshed",
  "url": "https://connect.stripe.com/setup/s/acct_1234567890abcdef/abc456"
}
```

---

### 5. Get Dashboard Link

**Endpoint:** `GET /api/stripe-connect/dashboard-link`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Generates a login link to the Stripe Express Dashboard where drivers can view earnings, payouts, and manage their account.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Dashboard link generated",
  "url": "https://connect.stripe.com/express/acct_1234567890abcdef/xyz789"
}
```

**Usage:**
- Redirect driver to this URL
- They can view:
  - Earnings breakdown
  - Payout schedule
  - Bank account details
  - Tax forms
  - Transaction history

---

### 6. Disconnect Account

**Endpoint:** `POST /api/stripe-connect/disconnect`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Disconnects the driver's Stripe Connect account (disables it).

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Connect account disconnected successfully"
}
```

---

## OAuth Callback APIs

### 7. OAuth Return Handler

**Endpoint:** `GET /api/stripe-connect/return`

**Authentication:** None (Public)

**Description:** Callback URL after driver completes Stripe onboarding successfully.

**Response:** HTML page with success message

```html
<!DOCTYPE html>
<html>
<head>
  <title>Onboarding Complete</title>
</head>
<body>
  <div class="success">✓ Onboarding Complete!</div>
  <div class="message">Your payment account has been set up successfully. You can now close this window and return to the app.</div>
</body>
</html>
```

---

### 8. OAuth Refresh Handler

**Endpoint:** `GET /api/stripe-connect/refresh`

**Authentication:** None (Public)

**Description:** Callback URL when driver exits onboarding without completing.

**Response:** HTML page with warning message

```html
<!DOCTYPE html>
<html>
<head>
  <title>Onboarding Incomplete</title>
</head>
<body>
  <div class="warning">⚠ Onboarding Incomplete</div>
  <div class="message">Please return to the app and complete your payment account setup.</div>
</body>
</html>
```

---

## Admin APIs

### 9. Get All Driver Connect Accounts

**Endpoint:** `GET /api/stripe-connect/admin/accounts`

**Authentication:** Required (Bearer Token + Admin Role)

**Description:** Lists all drivers with their Stripe Connect account status.

**Query Parameters:**
- `status` (optional): Filter by status - `not_started`, `pending`, `enabled`, `disabled`, `rejected`, `all`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)

**Request Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Example Request:**
```
GET /api/stripe-connect/admin/accounts?status=enabled&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 45,
  "page": 1,
  "totalPages": 3,
  "riders": [
    {
      "_id": "64abc123def456789",
      "user": {
        "_id": "64xyz789abc123456",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890"
      },
      "stripeConnectAccountId": "acct_1234567890abcdef",
      "connectAccountStatus": "enabled",
      "connectOnboardingComplete": true,
      "connectChargesEnabled": true,
      "connectPayoutsEnabled": true,
      "connectAccountCreatedAt": "2024-01-15T10:30:00.000Z",
      "totalEarning": 5420.50
    },
    {
      "_id": "64abc456def789012",
      "user": {
        "_id": "64xyz012abc456789",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phoneNumber": "+1234567891"
      },
      "stripeConnectAccountId": "acct_0987654321fedcba",
      "connectAccountStatus": "pending",
      "connectOnboardingComplete": false,
      "connectChargesEnabled": false,
      "connectPayoutsEnabled": false,
      "connectAccountCreatedAt": "2024-01-20T14:20:00.000Z",
      "totalEarning": 0
    }
  ]
}
```

---

### 10. Get Driver Connect Details

**Endpoint:** `GET /api/stripe-connect/admin/account/:riderId`

**Authentication:** Required (Bearer Token + Admin Role)

**Description:** Gets detailed Stripe Connect account information for a specific driver.

**Request Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Example Request:**
```
GET /api/stripe-connect/admin/account/64abc123def456789
```

**Success Response (200):**

Account exists:
```json
{
  "success": true,
  "rider": {
    "_id": "64abc123def456789",
    "user": {
      "_id": "64xyz789abc123456",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "stripeConnectAccountId": "acct_1234567890abcdef",
    "connectAccountStatus": "enabled",
    "connectOnboardingComplete": true,
    "connectChargesEnabled": true,
    "connectPayoutsEnabled": true,
    "connectAccountCreatedAt": "2024-01-15T10:30:00.000Z",
    "totalEarning": 5420.50
  },
  "stripeAccount": {
    "id": "acct_1234567890abcdef",
    "type": "express",
    "country": "US",
    "email": "john@example.com",
    "detailsSubmitted": true,
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "requirementsCurrentlyDue": [],
    "requirementsEventuallyDue": [],
    "requirementsPastDue": [],
    "payoutSchedule": {
      "delay_days": 2,
      "interval": "daily"
    }
  }
}
```

No account:
```json
{
  "success": true,
  "message": "No Connect account found",
  "rider": {
    "_id": "64abc123def456789",
    "user": {
      "_id": "64xyz789abc123456",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "connectAccountStatus": "not_started",
    "stripeAccount": null
  }
}
```

---

### 11. Generate Onboarding Link (Admin)

**Endpoint:** `POST /api/stripe-connect/admin/generate-link/:riderId`

**Authentication:** Required (Bearer Token + Admin Role)

**Description:** Admin can generate an onboarding link for a driver.

**Request Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Example Request:**
```
POST /api/stripe-connect/admin/generate-link/64abc123def456789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Onboarding link generated for driver",
  "url": "https://connect.stripe.com/setup/s/acct_1234567890abcdef/xyz123"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "No Connect account found for this driver"
}
```

---

### 12. Disconnect Driver Account (Admin)

**Endpoint:** `POST /api/stripe-connect/admin/disconnect/:riderId`

**Authentication:** Required (Bearer Token + Admin Role)

**Description:** Admin can disconnect a driver's Stripe Connect account.

**Request Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Example Request:**
```
POST /api/stripe-connect/admin/disconnect/64abc123def456789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Driver Connect account disconnected successfully"
}
```

---

## Wallet API (Updated)

### 13. Get Wallet Balance

**Endpoint:** `GET /api/withdrawal/wallet`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Gets driver's wallet balance and Stripe Connect status.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Success Response (200):**

With Stripe Connect enabled:
```json
{
  "success": true,
  "wallet": {
    "balance": 1250.75,
    "totalEarning": 5420.50,
    "totalWithdrawn": 4169.75,
    "pendingWithdrawal": 0,
    "totalRides": 68
  },
  "stripeConnect": {
    "enabled": true,
    "accountId": "acct_1234567890abcdef",
    "status": "enabled",
    "onboardingComplete": true,
    "payoutsEnabled": true
  },
  "paymentMethod": "stripe_connect",
  "message": "Earnings are automatically paid out via Stripe Connect"
}
```

Without Stripe Connect:
```json
{
  "success": true,
  "wallet": {
    "balance": 850.00,
    "totalEarning": 850.00,
    "totalWithdrawn": 0,
    "pendingWithdrawal": 0,
    "totalRides": 12
  },
  "stripeConnect": {
    "enabled": false,
    "accountId": null,
    "status": "not_started",
    "onboardingComplete": false,
    "payoutsEnabled": false
  },
  "paymentMethod": "manual",
  "message": "Please complete Stripe Connect onboarding to receive automatic payouts"
}
```

---

## Withdrawal API (Deprecated)

### 14. Request Withdrawal (Deprecated)

**Endpoint:** `POST /api/withdrawal/request`

**Authentication:** Required (Bearer Token + Rider Profile)

**Description:** Manual withdrawal requests are now deprecated. Drivers should use Stripe Connect for automatic payouts.

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Request Body:**
```json
{
  "amount": 500,
  "bankAccount": {
    "accountTitle": "John Doe",
    "accountNumber": "1234567890",
    "bankName": "Bank of America",
    "branchCode": "001"
  }
}
```

**Response (400) - Stripe Connect Enabled:**
```json
{
  "success": false,
  "message": "Manual withdrawals are no longer available. Your earnings are automatically paid out via Stripe Connect.",
  "stripeConnect": {
    "accountId": "acct_1234567890abcdef",
    "status": "enabled",
    "payoutsEnabled": true,
    "dashboardUrl": "/api/stripe-connect/dashboard-link"
  },
  "info": "Payments are automatically transferred to your bank account based on your payout schedule. Visit your Stripe Dashboard to view payout details and update your bank account."
}
```

**Response (400) - Stripe Connect Not Set Up:**
```json
{
  "success": false,
  "message": "Manual withdrawals have been replaced with automatic payouts via Stripe Connect.",
  "requiresConnectOnboarding": true,
  "info": "Please complete your Stripe Connect onboarding to receive automatic payouts. Contact support for assistance.",
  "onboardingUrl": "/api/stripe-connect/account-link"
}
```

---

## Complete Driver Flow

### Step 1: Driver Registration & Verification
```
1. POST /api/auth/register/driver
2. POST /api/rider/upload-license
3. POST /api/rider/upload-insurance
4. POST /api/rider/submit-verification
   → Stripe Connect account auto-created
```

### Step 2: Admin Approval
```
5. Admin approves: POST /api/admin/drivers/:id/verify
```

### Step 3: Stripe Connect Onboarding
```
6. Driver requests onboarding link:
   POST /api/stripe-connect/account-link
   
7. Driver completes onboarding in browser
   → Redirected to /api/stripe-connect/return
   
8. Driver checks status:
   GET /api/stripe-connect/account-status
```

### Step 4: Accept Rides & Get Paid
```
9. Driver accepts ride:
   POST /api/ride/accept/:bookingId
   → Validates Connect account is enabled
   
10. Driver completes ride:
    PUT /api/ride/:bookingId/complete
    → Payment captured
    → 80% automatically transferred to driver's Connect account
    
11. Stripe pays out to driver's bank account automatically
    (based on payout schedule - typically daily)
```

### Step 5: View Earnings
```
12. Check wallet:
    GET /api/withdrawal/wallet
    
13. View Stripe Dashboard:
    GET /api/stripe-connect/dashboard-link
    → See detailed earnings, payouts, tax forms
```

---

## Error Codes Reference

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Resource created successfully |
| 400 | Bad request / Validation error |
| 401 | Unauthorized / Invalid token |
| 403 | Forbidden / Insufficient permissions |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Webhook Events

The following Stripe webhook events are handled:

### account.updated
Triggered when a Connect account is updated (e.g., onboarding completed).

**Payload:**
```json
{
  "type": "account.updated",
  "data": {
    "object": {
      "id": "acct_1234567890abcdef",
      "charges_enabled": true,
      "payouts_enabled": true,
      "details_submitted": true
    }
  }
}
```

**Action:** Updates rider's Connect status in database.

---

### account.application.deauthorized
Triggered when a driver disconnects their Connect account.

**Action:** Disables Connect account in database.

---

### payout.paid
Triggered when Stripe successfully pays out to driver's bank account.

**Action:** Logged for tracking purposes.

---

### payout.failed
Triggered when a payout fails.

**Action:** Logged for admin review.

---

## Testing with Stripe Test Mode

### Test Card Numbers
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

### Test Connect Accounts
Use Stripe CLI to trigger test events:
```bash
stripe listen --forward-to localhost:5000/api/webhook/stripe-webhook
stripe trigger account.updated
stripe trigger payout.paid
```

### Test Onboarding
In test mode, you can skip real identity verification and use test data.

---

## Production Checklist

- [ ] Update `.env` with production Stripe keys
- [ ] Set production OAuth redirect URLs in Stripe Dashboard
- [ ] Configure production webhook endpoint
- [ ] Update `CONNECT_RETURN_URL` and `CONNECT_REFRESH_URL` to production URLs
- [ ] Test complete flow in production mode
- [ ] Set up monitoring for failed payouts
- [ ] Train support team on Connect troubleshooting

---

## Support & Troubleshooting

### Common Issues

**1. Driver can't accept rides after onboarding**
- Check: `GET /api/stripe-connect/account-status`
- Ensure `chargesEnabled: true`
- If false, driver needs to complete additional requirements

**2. Onboarding link expired**
- Use: `POST /api/stripe-connect/refresh-link`
- Links expire after 5 minutes

**3. Payout failed**
- Check Stripe Dashboard for failure reason
- Common causes: Invalid bank account, insufficient balance
- Driver can update bank details in Stripe Express Dashboard

**4. Driver wants to change bank account**
- Direct them to: `GET /api/stripe-connect/dashboard-link`
- They can update bank details directly in Stripe

---

## Contact

For technical support or questions about this integration, contact the development team.
