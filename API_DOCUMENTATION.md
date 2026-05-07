# Ridelynk Backend — Complete API Documentation

**Base URL:** `https://backend.ridelynk.com`  
**Auth:** All protected routes require `Authorization: Bearer <token>` header  
**Content-Type:** `application/json` (unless file upload)

---

## Legend
- 🔓 Public — no token required
- 🔐 User token required (`protect`)
- 🚗 Rider token required (`protect` + `riderProtect`)
- 👑 Admin token required (`protectAdmin`)

---

# 1. AUTHENTICATION
**Base:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | 🔓 | Register new user |
| POST | `/register/driver` | 🔓 | Register new driver |
| POST | `/login` | 🔓 | Login |
| POST | `/forget_password` | 🔓 | Send OTP to email |
| POST | `/checkOTP` | 🔓 | Verify OTP |
| POST | `/reset_password` | 🔓 | Reset password |
| POST | `/edit_profile` | 🔐 | Update profile |
| POST | `/get_profile` | 🔐 | Get profile |

### POST `/api/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "customer",
  "phoneNumber": "+1234567890",
  "referralCode": "REF123ABC"
}
```
**Required:** `name`, `email`, `password`, `role`, `phoneNumber`  
**Optional:** `referralCode`

### POST `/api/auth/register/driver`
```json
{
  "name": "Ali Khan",
  "email": "ali@example.com",
  "password": "password123",
  "phoneNumber": "+1234567890"
}
```

### POST `/api/auth/login`
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response includes:** `token`, `_id`, `name`, `email`, `role`

### POST `/api/auth/forget_password`
```json
{ "email": "john@example.com" }
```

### POST `/api/auth/checkOTP`
```json
{
  "email": "john@example.com",
  "otp": 123456
}
```

### POST `/api/auth/reset_password`
```json
{
  "email": "john@example.com",
  "password": "newpassword123"
}
```

### POST `/api/auth/edit_profile` 🔐
```json
{
  "name": "John Updated",
  "phoneNumber": "+1234567890",
  "city": "New York",
  "country": "US"
}
```

---

# 2. USER
**Base:** `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | 🔐 | Get user profile |
| GET | `/current-active-booking` | 🔐 | Get active bookings |
| POST | `/fcm-token` | 🔐 | Update FCM push token |
| DELETE | `/account` | 🔐 | Request account deletion |
| POST | `/account/restore` | 🔐 | Cancel deletion & restore |
| POST | `/delete-account-public` | 🔓 | Delete account (no token) |

### POST `/api/users/fcm-token` 🔐
```json
{ "fcmToken": "firebase_token_here" }
```

### DELETE `/api/users/account` 🔐
No body required.

### POST `/api/users/account/restore` 🔐
No body required.

### POST `/api/users/delete-account-public` 🔓
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Required:** `email`, `password`

---

# 3. RIDER (DRIVER)
**Base:** `/api/rider`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/vehicle-details` | 🔐 | Add vehicle details |
| POST | `/add-complete-vehicle-details` | 🔐 | Add vehicle + docs |
| POST | `/upload-license` | 🔐 | Upload license (multipart) |
| POST | `/upload-insurance` | 🔐 | Upload insurance (multipart) |
| POST | `/upload-profile-photo` | 🔐 | Upload profile photo (multipart) |
| POST | `/accept-terms` | 🔐 | Accept terms & conditions |
| POST | `/submit-verification` | 🔐 | Submit for admin verification |
| GET | `/onboarding-status` | 🔐 | Get onboarding progress |
| PUT | `/profile` | 🔐 | Update rider profile |
| PUT | `/status` | 🚗 | Update online/offline status |
| GET | `/booking-history` | 🚗 | Get all booking history |
| DELETE | `/account` | 🚗 | Request account deletion |
| POST | `/account/restore` | 🚗 | Cancel deletion & restore |

### POST `/api/rider/vehicle-details` 🔐
```json
{
  "category": "cab",
  "vehicleType": "sedan",
  "make": "Toyota",
  "model": "Corolla",
  "year": "2022",
  "color": "White",
  "licensePlate": "ABC-123",
  "vehicleNumber": "VH-001"
}
```

### POST `/api/rider/upload-license` 🔐
**Content-Type:** `multipart/form-data`
| Field | Type | Required |
|-------|------|----------|
| frontImage | File | ✅ |
| backImage | File | ✅ |
| licenseNumber | String | ✅ |
| expiryDate | Date | ✅ |

### POST `/api/rider/upload-insurance` 🔐
**Content-Type:** `multipart/form-data`
| Field | Type | Required |
|-------|------|----------|
| insurance | File | ✅ |
| provider | String | ✅ |
| policyNumber | String | ✅ |
| expiryDate | Date | ✅ |

### POST `/api/rider/upload-profile-photo` 🔐
**Content-Type:** `multipart/form-data`
| Field | Type | Required |
|-------|------|----------|
| profilePhoto | File | ✅ |

### PUT `/api/rider/status` 🚗
```json
{ "status": "available" }
```
**Values:** `available`, `busy`, `offline`

### GET `/api/rider/booking-history` 🚗
**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| page | Number | Page number (default: 1) |
| limit | Number | Per page (default: 10) |
| status | String | Filter: completed, cancelled, pending |
| type | String | Filter: ride, parcel, pet |

---

# 4. RIDE BOOKING
**Base:** `/api/ride`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/estimate-fare` | 🔐 | Estimate fare before booking |
| POST | `/ridebook` | 🔐 | Create ride booking |
| GET | `/nearby` | 🔓 | Get nearby available rides |
| GET | `/all_rides` | 🔓 | Get all rides (admin/public) |
| GET | `/all_rides_status` | 🚗 | Get driver's assigned rides |
| GET | `/ride_history/:userId` | 🔓 | Get user ride history |
| GET | `/bookings/cancelled` | 🔓 | Get cancelled bookings |
| PUT | `/bookings/:bookingId/cancel` | 🔐 | User cancel booking |
| PUT | `/driver/bookings/:bookingId/cancel` | 🚗 | Driver cancel booking |
| PUT | `/admin/bookings/:bookingId/cancel` | 🔐 | Admin cancel booking |
| POST | `/accept/:bookingId` | 🚗 | Driver accept ride |
| PUT | `/:bookingId/on-the-way` | 🚗 | Driver on the way |
| PUT | `/:bookingId/reached-pickup` | 🚗 | Driver reached pickup |
| PUT | `/:bookingId/start` | 🚗 | Start ride |
| PUT | `/:bookingId/complete` | 🚗 | Complete ride |
| GET | `/:bookingId/status` | 🔐 | Get ride status |
| PUT | `/:bookingId/update-location` | 🚗 | Update driver location |
| GET | `/:bookingId/track` | 🔐 | Track driver location |
| GET | `/:bookingId/location-history` | 🔐 | Get location history |

### POST `/api/ride/estimate-fare` 🔐
```json
{
  "pickupLocation": { "latitude": 25.0045, "longitude": 67.0765 },
  "dropoffLocation": { "latitude": 25.0200, "longitude": 67.0900 },
  "rideType": "sedan",
  "waypoints": []
}
```

### POST `/api/ride/ridebook` 🔐
```json
{
  "pickupLocation": { "latitude": 25.0045, "longitude": 67.0765 },
  "dropoffLocation": { "latitude": 25.0200, "longitude": 67.0900 },
  "pickupLocationName": "Clifton Block 5",
  "dropoffLocationName": "Saddar",
  "rideType": "sedan",
  "paymentType": "cash",
  "fare": 250,
  "waypoints": []
}
```

### GET `/api/ride/nearby` 🔓
**Query params:**
| Param | Required | Description |
|-------|----------|-------------|
| latitude | ✅ | User latitude |
| longitude | ✅ | User longitude |
| radius | ❌ | Search radius in meters (default: 5000) |

### PUT `/api/ride/bookings/:bookingId/cancel` 🔐
```json
{
  "cancellationReason": "Changed my mind",
  "cancelledBy": "user"
}
```

---

# 5. ENHANCED RIDE BOOKING (Scheduled + Waypoints)
**Base:** `/api/rides/enhanced`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/book` | 🔐 | Book with scheduling/waypoints |
| PUT | `/:bookingId/waypoints` | 🔐 | Update waypoints |
| POST | `/:bookingId/waypoints/:waypointIndex/track` | 🔐 | Track waypoint event |
| POST | `/:bookingId/cancel` | 🔐 | Cancel scheduled ride |

### POST `/api/rides/enhanced/book` 🔐
```json
{
  "pickupLocation": { "latitude": 25.0045, "longitude": 67.0765 },
  "dropoffLocation": { "latitude": 25.0200, "longitude": 67.0900 },
  "pickupLocationName": "Clifton Block 5",
  "dropoffLocationName": "Saddar",
  "rideType": "sedan",
  "paymentType": "cash",
  "fare": 250,
  "scheduledTime": "2026-05-10T14:00:00.000Z",
  "waypoints": [
    {
      "location": { "latitude": 25.0100, "longitude": 67.0800 },
      "locationName": "DHA Phase 2",
      "order": 1
    }
  ]
}
```
**Notes:**
- `scheduledTime` optional — omit for immediate booking
- Max **5 waypoints**, each adds **$2** to fare
- Scheduled rides: max **30 days** in future
- Driver matching starts **15 min** before scheduled time
- Cancellation allowed up to **5 min** before scheduled time

---

# 6. PARCEL BOOKING
**Base:** `/api/parcel`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create` | 🔐 | Create parcel booking |
| GET | `/all` | 🔓 | Get all parcel bookings |
| GET | `/nearby` | 🚗 | Get nearby parcel deliveries |
| GET | `/driver/deliveries` | 🚗 | Driver's parcel deliveries |
| GET | `/bookings/cancelled` | 🔐 | Cancelled deliveries |
| GET | `/:id` | 🔐 | Get booking by ID |
| POST | `/accept/:bookingId` | 🚗 | Accept delivery |
| PUT | `/:bookingId/on-the-way` | 🚗 | On the way |
| PUT | `/:bookingId/reached-pickup` | 🚗 | Reached pickup |
| PUT | `/:bookingId/start` | 🚗 | Start delivery |
| PUT | `/:bookingId/complete` | 🚗 | Complete delivery |
| PUT | `/bookings/:bookingId/cancel` | 🔐 | User cancel |
| PUT | `/driver/bookings/:bookingId/cancel` | 🚗 | Driver cancel |
| PUT | `/:bookingId/update-location` | 🚗 | Update location |
| GET | `/:bookingId/track` | 🔐 | Track driver |
| GET | `/:bookingId/location-history` | 🔐 | Location history |
| GET | `/:bookingId/status` | 🔐 | Delivery status |

### POST `/api/parcel/create` 🔐
```json
{
  "pickupLocation": { "latitude": 25.0045, "longitude": 67.0765 },
  "dropoffLocation": { "latitude": 25.0200, "longitude": 67.0900 },
  "pickupLocationName": "Clifton",
  "dropoffLocationName": "Saddar",
  "parcelDetails": {
    "weight": 2.5,
    "description": "Documents",
    "fragile": false
  },
  "paymentType": "cash",
  "fare": 150
}
```

---

# 7. PET DELIVERY BOOKING
**Base:** `/api/pet`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/pet_delivery_booking` | 🔐 | Create pet delivery |
| GET | `/get_pet_delivery` | 🔓 | Get all pet deliveries |
| GET | `/nearby` | 🚗 | Nearby pet deliveries |
| GET | `/driver/deliveries` | 🚗 | Driver's pet deliveries |
| GET | `/bookings/cancelled` | 🔐 | Cancelled deliveries |
| GET | `/pet_delivery/:id` | 🔓 | Get by ID |
| POST | `/accept/:bookingId` | 🚗 | Accept delivery |
| PUT | `/:bookingId/on-the-way` | 🚗 | On the way |
| PUT | `/:bookingId/reached-pickup` | 🚗 | Reached pickup |
| PUT | `/:bookingId/start` | 🚗 | Start delivery |
| PUT | `/:bookingId/complete` | 🚗 | Complete delivery |
| PUT | `/bookings/:bookingId/cancel` | 🔐 | User cancel |
| PUT | `/driver/bookings/:bookingId/cancel` | 🚗 | Driver cancel |
| PUT | `/:bookingId/update-location` | 🚗 | Update location |
| GET | `/:bookingId/track` | 🔐 | Track driver |
| GET | `/:bookingId/status` | 🔐 | Delivery status |

### POST `/api/pet/pet_delivery_booking` 🔐
```json
{
  "pickupLocation": { "latitude": 25.0045, "longitude": 67.0765 },
  "dropoffLocation": { "latitude": 25.0200, "longitude": 67.0900 },
  "pickupLocationName": "Clifton",
  "dropoffLocationName": "Saddar",
  "pet_name": "Bruno",
  "pet_type": "Dog",
  "pet_weight": 10,
  "special_instructions": "Handle with care",
  "paymentType": "cash",
  "fare": 200
}
```

---

# 8. PAYMENT
**Base:** `/api/payment`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-intent` | 🔐 | Create Stripe payment intent |
| POST | `/confirm` | 🔐 | Confirm payment intent |
| POST | `/setup` | 🔐 | Setup payment method (save card) |
| POST | `/confirm-method` | 🔐 | Confirm payment method setup |
| GET | `/cards` | 🔐 | Get saved cards |
| PUT | `/cards/default` | 🔐 | Set default card |
| DELETE | `/cards/remove/:paymentMethodId` | 🔐 | Remove card |
| GET | `/status/:bookingId` | 🔐 | Get payment status |

### POST `/api/payment/create-intent` 🔐
```json
{
  "amount": 25000,
  "currency": "usd",
  "bookingId": "booking_id_here"
}
```
**Note:** `amount` in cents (25000 = $250.00)

### POST `/api/payment/setup` 🔐
No body required — returns `clientSecret` for Stripe SDK.

### PUT `/api/payment/cards/default` 🔐
```json
{ "paymentMethodId": "pm_xxxxxxxxxxxxx" }
```

---

# 9. STRIPE CONNECT (Driver Payouts)
**Base:** `/api/stripe-connect`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-account` | 🚗 | Create Stripe Express account |
| POST | `/create-link` | 🚗 | Get KYC onboarding link |
| POST | `/account-link` | 🚗 | Get KYC onboarding link (alias) |
| GET | `/status` | 🚗 | Get account status |
| GET | `/account-status` | 🚗 | Get account status (alias) |
| POST | `/refresh-link` | 🚗 | Refresh expired onboarding link |
| GET | `/dashboard-link` | 🚗 | Get Stripe Express dashboard link |
| POST | `/disconnect` | 🚗 | Disconnect account |
| POST | `/reset` | 🚗 | Reset stale account |
| GET | `/balance` | 🚗 | Get available balance |
| POST | `/payout/instant` | 🚗 | Request instant payout |
| POST | `/payout/standard` | 🚗 | Request standard payout |
| GET | `/return` | 🔓 | Onboarding success callback |
| GET | `/refresh` | 🔓 | Onboarding expired callback |
| POST | `/webhook` | 🔓 | Stripe webhook handler |

### POST `/api/stripe-connect/create-account` 🚗
No body required — uses rider's email automatically.

### POST `/api/stripe-connect/payout/instant` 🚗
```json
{ "amount": 6000 }
```
**Note:** Amount in cents. Minimum **$60.00** (6000 cents)  
**Fee:** MAX($0.50, 1% of amount)  
**Limit:** 3 instant payouts per day  
**Arrival:** ~30 minutes to debit card

### POST `/api/stripe-connect/payout/standard` 🚗
```json
{ "amount": 5000 }
```
**Note:** Amount in cents. No minimum, no fee.  
**Arrival:** 2-5 business days to bank account

### GET `/api/stripe-connect/balance` 🚗
**Response:**
```json
{
  "success": true,
  "balance": {
    "available": 15000,
    "pending": 5000,
    "availableFormatted": "$150.00",
    "pendingFormatted": "$50.00"
  }
}
```

---

# 10. INSTANT PAYOUT (Wallet-based)
**Base:** `/api/instant-payout`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/request` | 🚗 | Request instant payout from wallet |
| GET | `/fee` | 🚗 | Preview payout fee |
| GET | `/eligibility` | 🚗 | Check payout eligibility |
| GET | `/balance` | 🚗 | Get wallet balance |

### POST `/api/instant-payout/request` 🚗
```json
{
  "amount": 100,
  "bankAccount": {
    "accountNumber": "1234567890",
    "bankName": "HBL",
    "accountTitle": "Ali Khan"
  }
}
```

---

# 11. WITHDRAWAL
**Base:** `/api/withdrawal`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/user/wallet` | 🔐 | Get user wallet balance |
| POST | `/user/request` | 🔐 | User request withdrawal |
| GET | `/user/history` | 🔐 | User withdrawal history |
| GET | `/wallet` | 🚗 | Driver wallet balance |
| POST | `/request` | 🚗 | Driver request withdrawal |
| GET | `/history` | 🚗 | Driver withdrawal history |
| PUT | `/bank-account` | 🚗 | Update bank account details |
| GET | `/admin/all` | 👑 | All withdrawal requests |
| PUT | `/admin/approve/:withdrawalId` | 👑 | Approve withdrawal |
| PUT | `/admin/reject/:withdrawalId` | 👑 | Reject withdrawal |
| PUT | `/admin/mark-paid/:withdrawalId` | 👑 | Mark as paid |

### POST `/api/withdrawal/request` 🚗
```json
{
  "amount": 500,
  "bankAccount": {
    "accountTitle": "Ali Khan",
    "accountNumber": "1234567890",
    "bankName": "HBL",
    "branchCode": "0001"
  }
}
```

### PUT `/api/withdrawal/bank-account` 🚗
```json
{
  "accountTitle": "Ali Khan",
  "accountNumber": "1234567890",
  "bankName": "HBL",
  "branchCode": "0001",
  "routingNumber": "123456789"
}
```

---

# 12. CHAT
**Base:** `/api/chats`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/send` | 🔐 | Send ride chat message |
| GET | `/messages/:rideId` | 🔐 | Get ride messages |
| PUT | `/read/:rideId` | 🔐 | Mark messages as read |
| DELETE | `/message/:messageId` | 🔐 | Delete message |
| POST | `/pusher/auth` | 🔐 | Pusher channel auth |
| POST | `/delivery/send` | 🔐 | Send delivery chat message |
| GET | `/delivery/:bookingId` | 🔐 | Get delivery messages |
| PUT | `/delivery/read/:bookingId` | 🔐 | Mark delivery messages read |

### POST `/api/chats/send` 🔐
```json
{
  "rideId": "booking_id_here",
  "message": "I am 2 minutes away"
}
```

### POST `/api/chats/delivery/send` 🔐
```json
{
  "bookingId": "booking_id_here",
  "bookingType": "parcel",
  "message": "Package picked up"
}
```
**bookingType values:** `parcel`, `pet`

### GET `/api/chats/delivery/:bookingId` 🔐
**Query params:** `?bookingType=parcel` or `?bookingType=pet`

---

# 13. REVIEWS
**Base:** `/api/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/:bookingId/create` | 🔐 | Create review |
| GET | `/booking/:bookingId` | 🔐 | Get review for booking |
| GET | `/user/my-reviews` | 🔐 | Get my reviews |
| GET | `/can-review/:bookingId` | 🔐 | Check if can review |
| PUT | `/:reviewId/update` | 🔐 | Update review |
| DELETE | `/:reviewId/delete` | 🔐 | Delete review |
| GET | `/driver/:driverId/reviews` | 🔓 | Get driver reviews |
| POST | `/:reviewId/driver-reply` | 🚗 | Driver reply to review |
| GET | `/driver/stats` | 🚗 | Driver review stats |

### POST `/api/reviews/:bookingId/create` 🔐
```json
{
  "rating": 5,
  "review": "Great driver, very punctual!",
  "tags": ["punctual", "clean_car", "friendly"],
  "reviewForType": "driver"
}
```
**rating:** 1-5  
**reviewForType:** `driver` or `user`

---

# 14. NOTIFICATIONS
**Base:** `/api/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | 🔐 | Get my notifications |
| GET | `/unread-count` | 🔐 | Get unread count |
| GET | `/test` | 🔐 | Send test notification |
| POST | `/fcm-token` | 🔐 | Register FCM token |
| DELETE | `/fcm-token` | 🔐 | Remove FCM token |
| PUT | `/settings` | 🔐 | Update notification settings |
| PUT | `/:id/read` | 🔐 | Mark notification as read |
| PUT | `/read-all` | 🔐 | Mark all as read |
| DELETE | `/:id` | 🔐 | Delete notification |
| DELETE | `/` | 🔐 | Delete all notifications |

### POST `/api/notifications/fcm-token` 🔐
```json
{ "fcmToken": "firebase_token_here" }
```

### PUT `/api/notifications/settings` 🔐
```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "rideUpdates": true,
  "promotions": false
}
```

---

# 15. SUPPORT TICKETS
**Base:** `/api/support`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create` | 🔐 | Create support ticket |
| GET | `/my-tickets` | 🔐 | Get my tickets |
| GET | `/:ticketId` | 🔐 | Get ticket by ID |
| POST | `/:ticketId/reply` | 🔐 | Reply to ticket |
| PUT | `/:ticketId/close` | 🔐 | Close ticket |
| GET | `/admin/all` | 👑 | All tickets (admin) |
| PUT | `/admin/:ticketId/status` | 👑 | Update ticket status |

### POST `/api/support/create` 🔐
```json
{
  "subject": "Payment issue",
  "message": "I was charged twice for my ride",
  "category": "payment",
  "bookingId": "optional_booking_id"
}
```

### POST `/api/support/:ticketId/reply` 🔐
```json
{ "message": "Please check my transaction history" }
```

---

# 16. REFERRAL
**Base:** `/api/referral`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/my-referral` | 🔐 | Get my referral code & stats |
| GET | `/wallet` | 🔐 | Get referral wallet balance |
| POST | `/validate` | 🔓 | Validate referral code |
| GET | `/admin/stats` | 👑 | All referral stats |

### POST `/api/referral/validate` 🔓
```json
{ "referralCode": "REF123ABC" }
```

---

# 17. PROMO CODES
**Base:** `/api/promo`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/validate` | 🔐 | Validate & apply promo code |
| GET | `/` | 👑 | Get all promo codes |
| POST | `/` | 👑 | Create promo code |
| PUT | `/:id` | 👑 | Update promo code |
| DELETE | `/:id` | 👑 | Delete promo code |
| PATCH | `/:id/toggle` | 👑 | Toggle active/inactive |

### POST `/api/promo/validate` 🔐
```json
{
  "code": "SAVE20",
  "bookingAmount": 500
}
```

---

# 18. DOCUMENT VERIFICATION
**Base:** `/api/documents`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload` | 🚗 | Upload verification document |
| GET | `/` | 🚗 | Get driver documents |
| GET | `/admin/pending` | 👑 | Pending documents |
| POST | `/admin/verify` | 👑 | Approve/reject document |

### POST `/api/documents/upload` 🚗
**Content-Type:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| document | File | ✅ | PDF, JPG, PNG (max 10MB) |
| documentType | String | ✅ | `license`, `insurance`, `profilePhoto`, `vehicleRegistration` |

### POST `/api/documents/admin/verify` 👑
```json
{
  "documentId": "doc_id_here",
  "status": "approved",
  "rejectionReason": "Optional reason if rejected"
}
```

---

# 19. RIDE TYPES
**Base:** `/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ride-types` | 🔓 | Get all active ride types |
| GET | `/admin/ride-types` | 👑 | All ride types (admin) |
| GET | `/admin/ride-types/:id` | 👑 | Get ride type by ID |
| POST | `/admin/ride-types` | 👑 | Create ride type |
| PUT | `/admin/ride-types/:id` | 👑 | Update ride type |
| DELETE | `/admin/ride-types/:id` | 👑 | Delete ride type |
| PATCH | `/admin/ride-types/:id/toggle` | 👑 | Toggle active status |

### POST `/api/admin/ride-types` 👑
```json
{
  "name": "Sedan",
  "category": "cab",
  "baseFare": 50,
  "perKmRate": 20,
  "perMinuteRate": 2,
  "capacity": 4,
  "description": "Comfortable sedan for daily commute"
}
```

---

# 20. ADMIN
**Base:** `/api/admin`

## Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | 🔓 | Admin login |
| POST | `/register` | 🔓 | Register admin |
| POST | `/logout` | 👑 | Logout |
| POST | `/forgot-password` | 🔓 | Forgot password |
| POST | `/reset-password` | 🔓 | Reset password |
| POST | `/refresh-token` | 🔓 | Refresh JWT token |

### POST `/api/admin/login` 🔓
```json
{
  "email": "admin@ridelynk.com",
  "password": "adminpassword"
}
```

## Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/stats` | 👑 | Overview stats |
| GET | `/dashboard/chart-data` | 👑 | Chart data |
| GET | `/dashboard/ride-status` | 👑 | Ride status breakdown |

## User Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | 👑 | All users |
| GET | `/users/:id` | 👑 | User by ID |
| PUT | `/users/:id` | 👑 | Update user |
| DELETE | `/users/:id` | 👑 | Delete user |
| POST | `/users/:id/block` | 👑 | Block user |
| POST | `/users/:id/unblock` | 👑 | Unblock user |

## Driver Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/drivers` | 👑 | All drivers |
| GET | `/drivers/pending` | 👑 | Pending verification |
| GET | `/drivers/:id` | 👑 | Driver by ID |
| PUT | `/drivers/:id` | 👑 | Update driver |
| DELETE | `/drivers/:id` | 👑 | Delete driver |
| POST | `/drivers/:id/verify` | 👑 | Approve driver |
| POST | `/drivers/:id/reject` | 👑 | Reject driver |

### POST `/api/admin/drivers/:id/reject` 👑
```json
{ "rejectionReason": "Documents are expired" }
```

## Ride Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/rides` | 👑 | All rides |
| GET | `/rides/:id` | 👑 | Ride by ID |
| PUT | `/rides/:id/status` | 👑 | Update ride status |
| DELETE | `/rides/:id` | 👑 | Delete ride |

## Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/overview` | 👑 | Overview analytics |
| GET | `/analytics/revenue` | 👑 | Revenue analytics |
| GET | `/analytics/rides` | 👑 | Ride analytics |

## Settings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/settings` | 👑 | Get app settings |
| PUT | `/settings` | 👑 | Update app settings |

## Admin Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admins` | 👑 | All admins |
| POST | `/admins` | 👑 | Create admin |
| PUT | `/admins/:id` | 👑 | Update admin |
| DELETE | `/admins/:id` | 👑 | Delete admin |
| POST | `/admins/:id/toggle-status` | 👑 | Enable/disable admin |
| PUT | `/admins/:id/permissions` | 👑 | Update permissions |

---

# 21. ACCOUNT DELETION
**Base:** `/api/users` & `/api/rider`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| DELETE | `/api/users/account` | 🔐 | User request deletion |
| POST | `/api/users/account/restore` | 🔐 | User cancel deletion |
| POST | `/api/users/delete-account-public` | 🔓 | Public deletion (website) |
| DELETE | `/api/rider/account` | 🚗 | Rider request deletion |
| POST | `/api/rider/account/restore` | 🚗 | Rider cancel deletion |

**Flow:** Request → Deactivated immediately → Permanently deleted after **3 days**  
**Restore:** Cancel anytime within 3 days

### POST `/api/users/delete-account-public` 🔓
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

# COMMON RESPONSE FORMATS

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Field name is required"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Not authorized, token failed"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

# BOOKING STATUS FLOW

```
pending → accepted → onTheWay → arrived → inProgress → completed
                                                      ↘ cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Waiting for driver |
| `accepted` | Driver accepted |
| `onTheWay` | Driver heading to pickup |
| `arrived` | Driver at pickup location |
| `inProgress` | Ride in progress |
| `completed` | Ride completed |
| `cancelled` | Cancelled by user/driver/admin |

---

*Last updated: May 2026*
