# Promo Code API Documentation

## Overview
Promo code system allows users to apply discounts on their bookings. Admins can create, update, and manage promo codes.

---

## User APIs

### 1. Validate & Apply Promo Code

**Endpoint:** `POST /api/promo/validate`

**Auth Required:** Yes (Bearer Token)

**Description:** Validates promo code and returns discount calculation

**Request Body:**
```json
{
  "code": "SAVE20",
  "fare": 500
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | String | Yes | Promo code to apply |
| fare | Number | Yes | Original fare amount |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Promo code applied successfully",
  "promo": {
    "code": "SAVE20",
    "description": "20% off on all rides",
    "discountType": "percentage",
    "discountValue": 20
  },
  "originalFare": 500,
  "discountAmount": 100,
  "finalFare": 400
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| 400 | Code and fare are required |
| 404 | Invalid promo code |
| 400 | Promo code is not active yet |
| 400 | Promo code has expired |
| 400 | Promo code usage limit reached |
| 400 | Minimum fare of X required for this promo code |
| 400 | You have already used this promo code X time(s) |
| 400 | This promo is for new users only |
| 400 | This promo is for first ride only |
| 400 | This promo is for existing users only |

---

## Admin APIs

### 2. Create Promo Code

**Endpoint:** `POST /api/promo/`

**Auth Required:** Yes (Admin Token)

**Request Body:**
```json
{
  "code": "SAVE20",
  "description": "20% off on all rides",
  "discountType": "percentage",
  "discountValue": 20,
  "minOrderAmount": 100,
  "maxDiscountAmount": 200,
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31",
  "usageLimit": 1000,
  "perUserLimit": 2,
  "applicableFor": ["all"],
  "isActive": true
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | String | Yes | Unique promo code (auto uppercased) |
| discountType | String | Yes | "percentage" or "fixed" |
| discountValue | Number | Yes | Discount value (e.g., 20 for 20% or $20) |
| validUntil | Date | Yes | Expiry date |
| description | String | No | Promo description |
| minOrderAmount | Number | No | Minimum fare required (default: 0) |
| maxDiscountAmount | Number | No | Maximum discount cap (for percentage) |
| validFrom | Date | No | Start date (default: now) |
| usageLimit | Number | No | Total usage limit (null = unlimited) |
| perUserLimit | Number | No | Per user usage limit (default: 1) |
| applicableFor | Array | No | Target users (default: ["all"]) |
| isActive | Boolean | No | Active status (default: true) |

**applicableFor Options:**
- `"all"` - All users
- `"new_users"` - Users with 0 completed rides
- `"existing_users"` - Users with 1+ completed rides
- `"first_ride"` - First ride only

**Success Response (201):**
```json
{
  "success": true,
  "message": "Promo code created",
  "promo": {
    "_id": "...",
    "code": "SAVE20",
    "description": "20% off on all rides",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 100,
    "maxDiscountAmount": 200,
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validUntil": "2024-12-31T00:00:00.000Z",
    "usageLimit": 1000,
    "usedCount": 0,
    "perUserLimit": 2,
    "applicableFor": ["all"],
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 3. Get All Promo Codes

**Endpoint:** `GET /api/promo/`

**Auth Required:** Yes (Admin Token)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page |
| isActive | Boolean | - | Filter by active status |

**Example:**
```
GET /api/promo/?page=1&limit=10&isActive=true
```

**Success Response (200):**
```json
{
  "success": true,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "...",
      "code": "SAVE20",
      "description": "20% off on all rides",
      "discountType": "percentage",
      "discountValue": 20,
      "isActive": true,
      "validUntil": "2024-12-31T00:00:00.000Z",
      ...
    }
  ]
}
```

---

### 4. Update Promo Code

**Endpoint:** `PUT /api/promo/:id`

**Auth Required:** Yes (Admin Token)

**Request Body:** (any fields to update)
```json
{
  "discountValue": 25,
  "usageLimit": 2000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Promo updated",
  "promo": { ... }
}
```

---

### 5. Delete Promo Code

**Endpoint:** `DELETE /api/promo/:id`

**Auth Required:** Yes (Admin Token)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Promo deleted"
}
```

---

### 6. Toggle Active Status

**Endpoint:** `PATCH /api/promo/:id/toggle`

**Auth Required:** Yes (Admin Token)

**Description:** Toggle promo code active/inactive status

**Success Response (200):**
```json
{
  "success": true,
  "message": "Promo activated",
  "promo": {
    "_id": "...",
    "isActive": true,
    ...
  }
}
```

---

## Promo Code Model Schema

| Field | Type | Description |
|-------|------|-------------|
| code | String | Unique promo code (uppercase) |
| description | String | Promo description |
| discountType | String | "percentage" or "fixed" |
| discountValue | Number | Discount amount/percentage |
| minOrderAmount | Number | Minimum order amount |
| maxDiscountAmount | Number | Maximum discount (for percentage) |
| validFrom | Date | Start date |
| validUntil | Date | Expiry date |
| usageLimit | Number | Total usage limit |
| usedCount | Number | Times used |
| perUserLimit | Number | Per user limit |
| applicableFor | Array | Target audience |
| isActive | Boolean | Active status |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

---

## Validation Rules

1. **Code Validation:**
   - Must exist in database
   - Must be active (`isActive: true`)
   - Must be within valid date range
   - Must not exceed total usage limit
   - Must not exceed per-user usage limit

2. **Discount Calculation:**
   - **Percentage:** `discount = (fare * discountValue) / 100`
   - **Fixed:** `discount = discountValue`
   - Discount cannot exceed `maxDiscountAmount` (if set)
   - Discount cannot exceed original fare
   - Final fare cannot be negative

3. **User Eligibility:**
   - `all` - No restrictions
   - `new_users` - User must have 0 completed rides
   - `existing_users` - User must have 1+ completed rides
   - `first_ride` - User must have 0 completed rides

---

## Example Usage

### Apply 20% Discount Promo:
```bash
curl -X POST http://localhost:5000/api/promo/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE20", "fare": 500}'
```

### Create New Promo (Admin):
```bash
curl -X POST http://localhost:5000/api/promo/ \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEWUSER50",
    "description": "50% off for new users",
    "discountType": "percentage",
    "discountValue": 50,
    "minOrderAmount": 200,
    "maxDiscountAmount": 300,
    "validUntil": "2024-12-31",
    "usageLimit": 500,
    "perUserLimit": 1,
    "applicableFor": ["new_users"]
  }'
```

---

## Notes

- Promo codes are automatically uppercased
- `usedCount` increments when booking is completed with promo
- Per-user limit is tracked via `promoCode` field in RideBooking
- Admin routes require `protectAdmin` middleware
