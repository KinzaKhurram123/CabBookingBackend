# Withdrawal Endpoints Documentation

## User (Customer) Withdrawal Endpoints

### 1. Get User Wallet
**Endpoint:** `GET /api/withdrawal/user/wallet`
**Auth:** Required (Bearer token)
**Description:** Get user's wallet balance, total earned from referrals, and pending withdrawals

**Response:**
```json
{
  "success": true,
  "wallet": {
    "balance": 5000,
    "totalEarned": 10000,
    "pendingWithdrawal": 500
  },
  "withdrawalLimits": {
    "minimum": 100,
    "maximumPerRequest": 10000,
    "maximumPerDay": 50000
  }
}
```

---

### 2. Request User Withdrawal
**Endpoint:** `POST /api/withdrawal/user/request`
**Auth:** Required (Bearer token)
**Description:** Submit a withdrawal request for user earnings

**Request Body:**
```json
{
  "amount": 1000,
  "bankAccount": {
    "accountTitle": "John Doe",
    "accountNumber": "1234567890",
    "bankName": "Bank of Pakistan",
    "branchCode": "123",
    "iban": "PK36ABNA0000001212129999"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "withdrawal": {
    "id": "507f1f77bcf86cd799439011",
    "amount": 1000,
    "status": "pending",
    "bankAccount": { ... },
    "createdAt": "2026-04-26T10:00:00Z"
  }
}
```

**Validation Rules:**
- Minimum withdrawal: $100
- Maximum per request: $10,000
- Maximum per day: $50,000
- Must have sufficient wallet balance
- Cannot have multiple pending withdrawals
- Bank account details are required

---

### 3. Get User Withdrawal History
**Endpoint:** `GET /api/withdrawal/user/history?page=1&limit=20&status=pending`
**Auth:** Required (Bearer token)
**Description:** Get user's withdrawal history with pagination and filtering

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending, approved, rejected, paid)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "totalPages": 3,
  "withdrawals": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "amount": 1000,
      "status": "pending",
      "bankAccount": { ... },
      "createdAt": "2026-04-26T10:00:00Z"
    }
  ],
  "summary": {
    "pending": 1000,
    "approved": 2000,
    "paid": 5000,
    "rejected": 0
  }
}
```

---

## Driver/Rider Withdrawal Endpoints

### 1. Get Rider Wallet
**Endpoint:** `GET /api/withdrawal/wallet`
**Auth:** Required (Bearer token + Rider profile)
**Description:** Get rider's wallet balance, earnings, and Stripe Connect status

**Response:**
```json
{
  "success": true,
  "wallet": {
    "balance": 15000,
    "totalEarning": 50000,
    "totalWithdrawn": 35000,
    "pendingWithdrawal": 2000,
    "totalRides": 250
  },
  "stripeConnect": {
    "enabled": true,
    "accountId": "acct_1234567890",
    "status": "active",
    "onboardingComplete": true,
    "payoutsEnabled": true,
    "chargesEnabled": true
  },
  "withdrawalLimits": { ... },
  "paymentMethod": "stripe_connect"
}
```

---

### 2. Request Rider Withdrawal
**Endpoint:** `POST /api/withdrawal/request`
**Auth:** Required (Bearer token + Rider profile)
**Description:** Submit a withdrawal request for rider earnings

**Request Body:**
```json
{
  "amount": 5000,
  "bankAccount": {
    "accountTitle": "Ahmed Khan",
    "accountNumber": "9876543210",
    "bankName": "HBL",
    "branchCode": "456"
  }
}
```

---

### 3. Get Rider Withdrawal History
**Endpoint:** `GET /api/withdrawal/history?page=1&limit=20`
**Auth:** Required (Bearer token + Rider profile)
**Description:** Get rider's withdrawal history

---

### 4. Update Bank Account
**Endpoint:** `PUT /api/withdrawal/bank-account`
**Auth:** Required (Bearer token + Rider profile)
**Description:** Update or add bank account details

**Request Body:**
```json
{
  "accountTitle": "Ahmed Khan",
  "accountNumber": "9876543210",
  "bankName": "HBL",
  "branchCode": "456",
  "iban": "PK36ABNA0000001212129999"
}
```

---

## Admin Withdrawal Endpoints

### 1. Get All Withdrawals
**Endpoint:** `GET /api/withdrawal/admin/all?page=1&limit=20&status=pending&search=name&startDate=2026-01-01&endDate=2026-12-31`
**Auth:** Required (Bearer token + Admin role)
**Description:** Get all withdrawals with filtering and search

---

### 2. Approve Withdrawal
**Endpoint:** `PUT /api/withdrawal/admin/approve/:withdrawalId`
**Auth:** Required (Bearer token + Admin role)
**Description:** Approve a pending withdrawal

**Request Body:**
```json
{
  "note": "Approved - funds transferred"
}
```

---

### 3. Reject Withdrawal
**Endpoint:** `PUT /api/withdrawal/admin/reject/:withdrawalId`
**Auth:** Required (Bearer token + Admin role)
**Description:** Reject a pending withdrawal

**Request Body:**
```json
{
  "rejectionReason": "Insufficient funds in account"
}
```

---

### 4. Mark as Paid
**Endpoint:** `PUT /api/withdrawal/admin/mark-paid/:withdrawalId`
**Auth:** Required (Bearer token + Admin role)
**Description:** Mark an approved withdrawal as paid

**Request Body:**
```json
{
  "note": "Payment processed",
  "transactionId": "TXN123456789"
}
```

---

## Error Responses

### Rider Profile Not Found (User trying to use rider endpoints)
```json
{
  "success": false,
  "message": "Rider profile not found. Please complete your registration.",
  "requiresRegistration": true
}
```

### Insufficient Balance
```json
{
  "success": false,
  "message": "Insufficient wallet balance. Available: 500",
  "availableBalance": 500
}
```

### Daily Limit Exceeded
```json
{
  "success": false,
  "message": "Daily withdrawal limit exceeded. Remaining today: 10000",
  "dailyLimit": 50000,
  "remainingToday": 10000,
  "requestedAmount": 50000
}
```

### Pending Withdrawal Exists
```json
{
  "success": false,
  "message": "You already have a pending withdrawal request. Please wait for it to be processed.",
  "pendingWithdrawalId": "507f1f77bcf86cd799439011"
}
```

---

## Withdrawal Status Flow

1. **pending** - Withdrawal request submitted, awaiting admin approval
2. **approved** - Admin approved the withdrawal
3. **paid** - Payment has been processed and transferred
4. **rejected** - Admin rejected the withdrawal with a reason

---

## Key Features

✅ Separate endpoints for users and riders
✅ Daily and per-request withdrawal limits
✅ Bank account management
✅ Stripe Connect integration for riders
✅ Admin approval workflow
✅ Transaction history with pagination
✅ Withdrawal status tracking
✅ Proper error handling and validation
