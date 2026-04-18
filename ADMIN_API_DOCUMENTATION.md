# Admin API Documentation

Base URL: `/api/admin`

---

## 🔐 Authentication APIs

### 1. Admin Login
**POST** `/api/admin/login`

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "_id": "...",
      "name": "Admin Name",
      "email": "admin@example.com",
      "role": "admin",
      "permissions": {},
      "isActive": true
    },
    "token": "jwt_token_here"
  }
}
```

---

### 2. Admin Register
**POST** `/api/admin/register`

**Body:**
```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "password123",
  "phoneNumber": "+1234567890",
  "role": "admin",
  "permissions": {}
}
```

---

### 3. Admin Logout
**POST** `/api/admin/logout`

**Headers:** `Authorization: Bearer <token>`

---

### 4. Forgot Password
**POST** `/api/admin/forgot-password`

**Body:**
```json
{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": {
    "otp": 123456
  }
}
```

---

### 5. Reset Password
**POST** `/api/admin/reset-password`

**Body:**
```json
{
  "email": "admin@example.com",
  "otp": 123456,
  "newPassword": "newpassword123"
}
```

---

### 6. Refresh Token
**POST** `/api/admin/refresh-token`

**Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

---

## 📊 Dashboard APIs

### 7. Get Dashboard Stats
**GET** `/api/admin/dashboard/stats`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "totalDrivers": 300,
    "totalBookings": 5000,
    "completedBookings": 4500,
    "pendingBookings": 200,
    "cancelledBookings": 300,
    "totalRevenue": 150000,
    "pendingVerifications": 15,
    "percentageChange": {
      "users": "+12%",
      "drivers": "+8%",
      "rides": "+15%",
      "revenue": "+20%"
    }
  }
}
```

---

### 8. Get Dashboard Chart Data
**GET** `/api/admin/dashboard/chart-data`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "Jan",
      "rides": 450,
      "revenue": 12000
    }
  ]
}
```

---

### 9. Get Ride Status Stats
**GET** `/api/admin/dashboard/ride-status`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "completed": 4500,
    "inProgress": 50,
    "cancelled": 300,
    "pending": 150,
    "labels": ["Completed", "In Progress", "Cancelled", "Pending"],
    "colors": ["#4CAF50", "#2196F3", "#F44336", "#FFC107"]
  }
}
```

---

## 👥 User Management APIs

### 10. Get All Users
**GET** `/api/admin/users?page=1&limit=10&search=john`

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 1500,
  "page": 1,
  "pages": 150
}
```

---

### 11. Get User By ID
**GET** `/api/admin/users/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 12. Update User
**PUT** `/api/admin/users/:id`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phoneNumber": "+1234567890",
  "city": "New York",
  "country": "USA",
  "isBlocked": false
}
```

---

### 13. Delete User
**DELETE** `/api/admin/users/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 14. Block User
**POST** `/api/admin/users/:id/block`

**Headers:** `Authorization: Bearer <token>`

---

### 15. Unblock User
**POST** `/api/admin/users/:id/unblock`

**Headers:** `Authorization: Bearer <token>`

---

## 🚗 Driver Management APIs

### 16. Get All Drivers
**GET** `/api/admin/drivers?page=1&limit=10&status=approved`

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by verification status

---

### 17. Get Pending Drivers
**GET** `/api/admin/drivers/pending`

**Headers:** `Authorization: Bearer <token>`

---

### 18. Get Driver By ID
**GET** `/api/admin/drivers/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 19. Update Driver
**PUT** `/api/admin/drivers/:id`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "active",
  "vehicleDetails": {}
}
```

---

### 20. Delete Driver
**DELETE** `/api/admin/drivers/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 21. Verify Driver
**POST** `/api/admin/drivers/:id/verify`

**Headers:** `Authorization: Bearer <token>`

---

### 22. Reject Driver
**POST** `/api/admin/drivers/:id/reject`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rejectionReason": "Invalid documents"
}
```

---

## 🎭 Role Management APIs

### 23. Get All Roles
**GET** `/api/admin/roles`

**Headers:** `Authorization: Bearer <token>`

---

### 24. Create Role
**POST** `/api/admin/roles`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Manager",
  "permissions": {
    "manageUsers": true,
    "viewReports": true
  }
}
```

---

### 25. Update Role
**PUT** `/api/admin/roles/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 26. Delete Role
**DELETE** `/api/admin/roles/:id`

**Headers:** `Authorization: Bearer <token>`

---

## 🔑 Permissions APIs

### 27. Get All Permissions
**GET** `/api/admin/permissions`

**Headers:** `Authorization: Bearer <token>`

---

### 28. Create Permission
**POST** `/api/admin/permissions`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "manage_payments",
  "description": "Can manage payment transactions"
}
```

---

### 29. Update Permission
**PUT** `/api/admin/permissions/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 30. Delete Permission
**DELETE** `/api/admin/permissions/:id`

**Headers:** `Authorization: Bearer <token>`

---

## 🚕 Cab Management APIs

### 31. Get All Cabs
**GET** `/api/admin/cabs`

**Headers:** `Authorization: Bearer <token>`

---

### 32. Add Cab
**POST** `/api/admin/cabs`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "driverId": "driver_id_here",
  "vehicleDetails": {
    "licensePlate": "ABC-1234",
    "model": "Toyota Camry",
    "year": 2022,
    "color": "Black"
  }
}
```

---

### 33. Update Cab
**PUT** `/api/admin/cabs/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 34. Delete Cab
**DELETE** `/api/admin/cabs/:id`

**Headers:** `Authorization: Bearer <token>`

---

## 💰 Referral & Earnings APIs

### 35. Get Referral Earnings
**GET** `/api/admin/referral/earnings`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "referralCount": 10,
      "walletBalance": 500,
      "totalEarnedFromReferrals": 1000,
      "referralCode": "JOHN123"
    }
  ]
}
```

---

### 36. Get Referral Earnings By User
**GET** `/api/admin/referral/earnings/:userId`

**Headers:** `Authorization: Bearer <token>`

---

### 37. Get All Referrals
**GET** `/api/admin/referrals`

**Headers:** `Authorization: Bearer <token>`

---

### 38. Get Referrals By User
**GET** `/api/admin/referrals/:userId`

**Headers:** `Authorization: Bearer <token>`

---

## 🎁 Promotions APIs

### 39. Get All Promotions
**GET** `/api/admin/promotions`

**Headers:** `Authorization: Bearer <token>`

---

### 40. Create Promotion
**POST** `/api/admin/promotions`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "code": "SUMMER2024",
  "discountType": "percentage",
  "discountValue": 20,
  "validUntil": "2024-08-31",
  "usageLimit": 1000
}
```

---

### 41. Update Promotion
**PUT** `/api/admin/promotions/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 42. Delete Promotion
**DELETE** `/api/admin/promotions/:id`

**Headers:** `Authorization: Bearer <token>`

---

## 🚖 Ride Management APIs

### 43. Get All Rides
**GET** `/api/admin/rides?page=1&limit=10&status=completed`

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by ride status

---

### 44. Get Ride By ID
**GET** `/api/admin/rides/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 45. Update Ride Status
**PUT** `/api/admin/rides/:id/status`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "completed"
}
```

---

### 46. Delete Ride
**DELETE** `/api/admin/rides/:id`

**Headers:** `Authorization: Bearer <token>`

---

## ✅ Driver Verifications APIs

### 47. Get Driver Verifications
**GET** `/api/admin/driver-verifications`

**Headers:** `Authorization: Bearer <token>`

---

### 48. Get Pending Verifications
**GET** `/api/admin/driver-verifications/pending`

**Headers:** `Authorization: Bearer <token>`

---

### 49. Get Verification By ID
**GET** `/api/admin/driver-verifications/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 50. Approve Verification
**POST** `/api/admin/driver-verifications/:id/approve`

**Headers:** `Authorization: Bearer <token>`

---

### 51. Reject Verification
**POST** `/api/admin/driver-verifications/:id/reject`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rejectionReason": "Documents are not clear",
  "rejectedDocument": "license"
}
```

---

## 📋 Recent Activity APIs

### 52. Get Recent Activities
**GET** `/api/admin/recent-activities`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "user",
      "message": "John Doe joined the platform",
      "time": "2024-01-15T10:30:00Z",
      "icon": "user-plus",
      "color": "green"
    }
  ]
}
```

---

## 📈 Analytics APIs

### 53. Get Analytics Overview
**GET** `/api/admin/analytics/overview`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 150000,
    "totalRides": 5000,
    "averageRating": 4.5,
    "monthlyRides": [...]
  }
}
```

---

### 54. Get Revenue Analytics
**GET** `/api/admin/analytics/revenue?period=monthly`

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `period` (optional): daily, monthly, yearly (default: monthly)

---

### 55. Get Ride Analytics
**GET** `/api/admin/analytics/rides`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "byStatus": [...],
    "byHour": [...]
  }
}
```

---

## ⚙️ Settings APIs

### 56. Get Settings
**GET** `/api/admin/settings`

**Headers:** `Authorization: Bearer <token>`

---

### 57. Update Settings
**PUT** `/api/admin/settings`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "appName": "RideLynk",
  "version": "1.0.0",
  "features": {}
}
```

---

## 👤 Admin Profile APIs

### 58. Get Admin Profile
**GET** `/api/admin/profile`

**Headers:** `Authorization: Bearer <token>`

---

### 59. Update Admin Profile
**PUT** `/api/admin/profile`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "phoneNumber": "+1234567890"
}
```

---

### 60. Change Password
**POST** `/api/admin/change-password`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

---

## 👨‍💼 Admin Management APIs (Super Admin Only)

### 61. Get All Admins
**GET** `/api/admin/admins`

**Headers:** `Authorization: Bearer <token>`

---

### 62. Get Admin By ID
**GET** `/api/admin/admins/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 63. Create Admin
**POST** `/api/admin/admins`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "password123",
  "role": "admin",
  "permissions": {}
}
```

---

### 64. Update Admin
**PUT** `/api/admin/admins/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 65. Delete Admin
**DELETE** `/api/admin/admins/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 66. Toggle Admin Status
**POST** `/api/admin/admins/:id/toggle-status`

**Headers:** `Authorization: Bearer <token>`

---

### 67. Update Admin Permissions
**PUT** `/api/admin/admins/:id/permissions`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "permissions": {
    "manageUsers": true,
    "manageDrivers": true,
    "viewReports": true
  }
}
```

---

## 🔒 Authentication Notes

- All protected routes require `Authorization: Bearer <token>` header
- Token is obtained from login/register endpoints
- Token expires in 30 days
- Use refresh token endpoint to get new token

## 📝 Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (only in development)"
}
```

## 🎯 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error
