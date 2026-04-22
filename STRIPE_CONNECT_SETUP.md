# Stripe Connect Setup Guide

Quick setup guide to get Stripe Connect working in your cab booking backend.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Update Environment Variables

Open `.env` and update these values:

```env
# Existing Stripe keys (already configured)
STRIPE_SECRET_KEY=sk_test_51RjPdjRwYBV7klBlC44rWCXrFBmlmdOvrQhB4VTXCKnZYrjnZafjYSu9eRJQpIPNcP63pPkb1beSyHBAmZU36i8d00ZDoPPveu
STRIPE_PUBLISHABLE_KEY=pk_test_51RjPdjRwYBV7klBlvjEBIXIPmNc4OBdvDtNVbjsZGzry1Ijq8E7waraDg3CXFpVXpJS1kJtuaPcRg7jvbnU76IPw0005YhkwjH

# NEW - Get these from Stripe Dashboard
STRIPE_CONNECT_CLIENT_ID=ca_YOUR_CLIENT_ID_HERE
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_YOUR_CONNECT_WEBHOOK_SECRET_HERE

# NEW - OAuth redirect URLs
CONNECT_RETURN_URL=http://localhost:5000/api/stripe-connect/return
CONNECT_REFRESH_URL=http://localhost:5000/api/stripe-connect/refresh
```

---

### Step 2: Get Stripe Connect Client ID

1. Go to https://dashboard.stripe.com/test/connect/accounts/overview
2. Click **"Get started"** if Connect isn't enabled
3. Go to **Connect → Settings**
4. Copy your **Client ID** (starts with `ca_`)
5. Update `.env`: `STRIPE_CONNECT_CLIENT_ID=ca_xxxxx`

---

### Step 3: Configure OAuth Redirect URLs

1. In Stripe Dashboard, go to **Connect → Settings → Integration**
2. Under **Redirects**, click **"Add redirect URI"**
3. Add these URLs:
   ```
   http://localhost:5000/api/stripe-connect/return
   http://localhost:5000/api/stripe-connect/refresh
   ```
4. Click **Save**

---

### Step 4: Set Up Webhook for Connect Events

**For Local Testing (using Stripe CLI):**

```bash
# Install Stripe CLI if not already installed
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe
# Linux: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/webhook/stripe-webhook

# Copy the webhook signing secret (starts with whsec_)
# Update .env: STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxx
```

**For Production:**

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter endpoint URL: `https://yourdomain.com/api/webhook/stripe-webhook`
4. Select these events:
   - `account.updated`
   - `account.application.deauthorized`
   - `payout.paid`
   - `payout.failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click **Add endpoint**
6. Copy the **Signing secret**
7. Update `.env`: `STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxx`

---

### Step 5: Start the Server

```bash
# Install dependencies (if not already done)
npm install

# Start the server
npm start
# or
node server.js
```

Server should start on `http://localhost:5000`

---

## ✅ Verify Installation

### Test 1: Check Server is Running

```bash
curl http://localhost:5000/test
```

Expected response:
```json
{
  "message": "Backend is alive!"
}
```

---

### Test 2: Test Driver Registration Flow

**1. Register as Driver:**
```bash
curl -X POST http://localhost:5000/api/auth/register/driver \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Driver",
    "email": "testdriver@example.com",
    "password": "password123",
    "phoneNumber": "+1234567890"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testdriver@example.com",
    "password": "password123"
  }'
```

Save the `token` from response.

**3. Check Connect Status:**
```bash
curl -X GET http://localhost:5000/api/stripe-connect/account-status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
{
  "success": true,
  "message": "No Connect account found",
  "status": "not_started",
  "accountStatus": null
}
```

---

### Test 3: Create Connect Account

```bash
curl -X POST http://localhost:5000/api/stripe-connect/create-account \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
{
  "success": true,
  "message": "Connect account created successfully",
  "accountId": "acct_xxxxx"
}
```

---

### Test 4: Generate Onboarding Link

```bash
curl -X POST http://localhost:5000/api/stripe-connect/account-link \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
{
  "success": true,
  "message": "Onboarding link generated",
  "url": "https://connect.stripe.com/setup/s/acct_xxxxx/yyyyy"
}
```

Open the `url` in browser to complete onboarding.

---

## 🧪 Testing Complete Flow

### Scenario: Driver Accepts and Completes a Ride

**Prerequisites:**
- Driver has completed Stripe Connect onboarding
- Customer has added a payment card
- Ride booking exists

**1. Driver Accepts Ride:**
```bash
curl -X POST http://localhost:5000/api/ride/accept/BOOKING_ID \
  -H "Authorization: Bearer DRIVER_TOKEN"
```

**What happens:**
- System validates driver has Connect account enabled
- PaymentIntent updated with:
  - `application_fee_amount`: 20% platform fee
  - `transfer_data.destination`: Driver's Connect account ID
- 80% of fare will be transferred to driver when payment is captured

**2. Driver Completes Ride:**
```bash
curl -X PUT http://localhost:5000/api/ride/BOOKING_ID/complete \
  -H "Authorization: Bearer DRIVER_TOKEN"
```

**What happens:**
- Payment is captured from customer
- 80% automatically transferred to driver's Connect account
- 20% stays in your platform account
- Driver's `totalEarning` updated in database
- Stripe handles payout to driver's bank account

**3. Check Wallet:**
```bash
curl -X GET http://localhost:5000/api/withdrawal/wallet \
  -H "Authorization: Bearer DRIVER_TOKEN"
```

Response shows earnings and Connect status.

---

## 🔍 Monitoring & Debugging

### Check Stripe Dashboard

**Connect Accounts:**
https://dashboard.stripe.com/test/connect/accounts/overview

**Transfers:**
https://dashboard.stripe.com/test/connect/transfers

**Payouts:**
https://dashboard.stripe.com/test/payouts

**Webhooks:**
https://dashboard.stripe.com/test/webhooks

---

### Check Server Logs

Look for these log messages:

**Connect account created:**
```
Stripe Connect account created for rider 64abc123: acct_xxxxx
```

**Account status updated (webhook):**
```
✅ Connect account updated for rider 64abc123: status=enabled
```

**Payment captured with transfer:**
```
Payment captured for ride 64def456 - 80% automatically transferred to driver via Stripe Connect
```

**Driver earnings updated:**
```
Driver 64abc123 earnings updated: +24.00 (paid via Stripe Connect)
```

---

### Common Issues & Solutions

**Issue 1: "Connect account not set up"**
```json
{
  "success": false,
  "message": "Driver payment account not set up. Please complete Stripe Connect onboarding.",
  "requiresConnectOnboarding": true
}
```

**Solution:**
- Driver needs to complete onboarding
- Generate link: `POST /api/stripe-connect/account-link`
- Complete onboarding in browser

---

**Issue 2: "Driver payment account not enabled"**
```json
{
  "success": false,
  "message": "Driver payment account not enabled. Please complete onboarding.",
  "requiresConnectOnboarding": true
}
```

**Solution:**
- Check account status: `GET /api/stripe-connect/account-status`
- If `requirementsCurrentlyDue` is not empty, driver needs to provide more info
- Refresh onboarding link: `POST /api/stripe-connect/refresh-link`

---

**Issue 3: Webhook not receiving events**

**Solution:**
- Verify webhook endpoint is accessible
- Check webhook signing secret is correct in `.env`
- For local testing, ensure Stripe CLI is running:
  ```bash
  stripe listen --forward-to localhost:5000/api/webhook/stripe-webhook
  ```
- Check webhook logs in Stripe Dashboard

---

**Issue 4: Onboarding link expired**

**Solution:**
- Links expire after 5 minutes
- Generate new link: `POST /api/stripe-connect/refresh-link`

---

## 📊 Admin Dashboard Testing

### View All Driver Connect Accounts

```bash
curl -X GET "http://localhost:5000/api/stripe-connect/admin/accounts?status=all&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### View Specific Driver Details

```bash
curl -X GET http://localhost:5000/api/stripe-connect/admin/account/RIDER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Generate Onboarding Link for Driver (Admin)

```bash
curl -X POST http://localhost:5000/api/stripe-connect/admin/generate-link/RIDER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🔐 Security Checklist

- [x] Stripe secret keys stored in `.env` (not in code)
- [x] Webhook signature verification enabled
- [x] OAuth redirect URLs whitelisted in Stripe Dashboard
- [x] Authentication required for all driver/admin endpoints
- [x] Connect account ownership validated before operations
- [ ] Rate limiting configured (recommended for production)
- [ ] HTTPS enabled (required for production)

---

## 🚀 Production Deployment

### Before Going Live:

1. **Switch to Live Mode:**
   - Get live Stripe keys from https://dashboard.stripe.com/apikeys
   - Update `.env` with live keys (remove `_test_` keys)

2. **Update OAuth URLs:**
   - In Stripe Dashboard (live mode), add production URLs:
     ```
     https://yourdomain.com/api/stripe-connect/return
     https://yourdomain.com/api/stripe-connect/refresh
     ```

3. **Configure Production Webhook:**
   - Add endpoint: `https://yourdomain.com/api/webhook/stripe-webhook`
   - Select all required events
   - Update `.env` with production webhook secret

4. **Update Environment Variables:**
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxx
   CONNECT_RETURN_URL=https://yourdomain.com/api/stripe-connect/return
   CONNECT_REFRESH_URL=https://yourdomain.com/api/stripe-connect/refresh
   ```

5. **Test in Production:**
   - Register test driver
   - Complete onboarding with real bank account (or Stripe test account)
   - Process test ride
   - Verify transfer appears in Stripe Dashboard

6. **Monitor:**
   - Set up alerts for failed payouts
   - Monitor webhook delivery
   - Track Connect account creation rate

---

## 📚 Additional Resources

- **API Documentation:** `STRIPE_CONNECT_API_DOCS.md`
- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Stripe Express Accounts:** https://stripe.com/docs/connect/express-accounts
- **Webhook Events:** https://stripe.com/docs/api/events/types
- **Testing:** https://stripe.com/docs/connect/testing

---

## 🆘 Need Help?

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com/support
- Docs: https://stripe.com/docs
- Community: https://github.com/stripe

**Common Commands:**

```bash
# Check server status
curl http://localhost:5000/test

# View Stripe CLI logs
stripe logs tail

# Trigger test webhook
stripe trigger account.updated

# Test payment
stripe trigger payment_intent.succeeded
```

---

## ✨ What's Next?

After setup is complete:

1. **Test the complete flow** with a real driver account
2. **Train your team** on the new payout system
3. **Notify existing drivers** about the change
4. **Monitor the first few payouts** closely
5. **Set up alerts** for failed payouts or Connect issues

---

**Setup complete! 🎉**

Drivers can now receive automatic payouts via Stripe Connect.
