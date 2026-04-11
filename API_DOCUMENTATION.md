# Cab Booking Backend - Complete API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## 📋 Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [User APIs](#user-apis)
3. [Rider/Driver APIs](#riderdriver-apis)
4. [Ride Booking APIs](#ride-booking-apis)
5. [Payment APIs](#payment-apis)
6. [Review APIs](#review-apis)
7. [Chat APIs](#chat-apis)
8. [Parcel Booking APIs](#parcel-booking-apis)
9. [Pet Delivery Booking APIs](#pet-delivery-booking-apis)
10. [Admin APIs](#admin-apis)
11. [Ride Types APIs](#ride-types-apis)
12. [Webhook APIs](#webhook-apis)

---

## 🔐 Authentication APIs

### 1. Register User
**POST** `/auth/register`

**Required Fields:**
- `name` (string) - User's full name
- `email` (string) - Valid email address
- `password` (string) - User password
- `phoneNumber` (string) - Phone number with country code

**Optional Fields:**
- `role` (string) - User role (default: "user")

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phoneNumber": "+1234567890",
  "role": "user"
}
```

### 2. Register Driver
**POST** `/auth/register/driver`

**Required Fields:**
- `name` (string) - Driver's full name
- `email` (string) - Valid email address
- `password` (string) - Driver password
- `phoneNumber` (string) - Phone number with country code

**Optional Fields:**
- `city` (string) - Driver's city
- `country` (string) - Driver's country

**Body:**
```json
{
  "name": "Driver Name",
  "email": "driver@example.com",
  "password": "password123",
  "phoneNumber": "+1234567890",
  "city": "New York",
  "country": "USA"
}
```

### 3. Login User
**POST** `/auth/login`

**Required Fields:**
- `email` (string) - User's email address
- `password` (string) - User's password

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### 4. Forget Password
**POST** `/auth/forget_password`

**Required Fields:**
- `email` (string) - User's registered email address

**Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email",
  "otp": "123456"
}
```

### 5. Check OTP
**POST** `/auth/checkOTP`

**Required Fields:**
- `email` (string) - User's email address
- `code` (string) - 6-digit OTP code

**Body:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

### 6. Reset Password
**POST** `/auth/reset_password`

**Required Fields:**
- `email` (string) - User's email address
- `password` (string) - New password
- `confirmpassword` (string) - Confirm new password (must match password)

**Body:**
```json
{
  "email": "john@example.com",
  "password": "newpassword123",
  "confirmpassword": "newpassword123"
}
```

### 7. Get Profile
**POST** `/auth/get_profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** Uses authenticated user's ID from token. No body required.

### 8. Update Profile
**POST** `/auth/edit_profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields:**
- `name` (string) - Updated name
- `phoneNumber` (string) - Updated phone number
- `email` (string) - Updated email
- `password` (string) - New password (if changing password)

**Body:**
```json
{
  "name": "Updated Name",
  "phoneNumber": "+1234567890",
  "email": "newemail@example.com",
  "password": "newpassword123"
}
```

---

## 👤 User APIs

### 1. Get User Profile
**GET** `/users/profile`

**Headers:**
```
Authorization: Bearer <token>
```

---

## 🚗 Rider/Driver APIs

### 1. Add Vehicle Details
**POST** `/rider/vehicle-details`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields (at least one required):**
- `category` (string) - Vehicle category (e.g., "ride", "delivery")
- `vehicleType` (string) - Type of vehicle (e.g., "sedan", "suv")
- `make` (string) - Vehicle manufacturer
- `model` (string) - Vehicle model
- `year` (number) - Vehicle year
- `color` (string) - Vehicle color
- `licensePlate` (string) - License plate number
- `vehicleNumber` (string) - Alternative vehicle number

**Body:**
```json
{
  "category": "ride",
  "vehicleType": "sedan",
  "make": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "Black",
  "licensePlate": "ABC123"
}
```

### 2. Upload License
**POST** `/rider/upload-license`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Required Fields:**
- `frontImage` (file) - Front image of driver's license (max 5MB)
- `backImage` (file) - Back image of driver's license (max 5MB)
- `licenseNumber` (string) - Driver's license number
- `expiryDate` (date) - License expiry date (YYYY-MM-DD format)

**Body (Form Data):**
```
frontImage: <file>
backImage: <file>
licenseNumber: "DL123456"
expiryDate: "2025-12-31"
```

### 3. Upload Insurance
**POST** `/rider/upload-insurance`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Required Fields:**
- `insurance` (file) - Insurance document (PDF/Image, max 10MB)
- `provider` (string) - Insurance provider name
- `policyNumber` (string) - Insurance policy number
- `expiryDate` (date) - Insurance expiry date (YYYY-MM-DD or DD-MM-YYYY)

**Body (Form Data):**
```
insurance: <file>
provider: "State Farm"
policyNumber: "INS123456"
expiryDate: "2025-12-31"
```

### 4. Upload Profile Photo
**POST** `/rider/upload-profile-photo`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (Form Data):**
```
profilePhoto: <file>
```

### 5. Add Complete Vehicle Details
**POST** `/rider/add-complete-vehicle-details`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Required Fields:**
- `category` (string) - Vehicle category (e.g., "ride", "delivery")
- `make` (string) - Vehicle manufacturer
- `model` (string) - Vehicle model
- `year` (number) - Vehicle year
- `licensePlate` or `vehicleNumber` (string) - Vehicle license plate number

**Optional Fields:**
- `vehiclePhoto` (file) - Photo of the vehicle
- `registrationDocument` (file) - Vehicle registration document
- `subcategoryId` (string) - Subcategory ID
- `subcategoryName` (string) - Subcategory name (e.g., "Sedan", "SUV")
- `color` (string) - Vehicle color
- `registrationNumber` (string) - Registration number

**Body (Form Data):**
```
vehiclePhoto: <file>
registrationDocument: <file>
category: "ride"
subcategoryName: "Sedan"
make: "Toyota"
model: "Camry"
year: 2020
color: "Black"
licensePlate: "ABC123"
registrationNumber: "REG123456"
```

### 6. Accept Terms
**POST** `/rider/accept-terms`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `accepted` (boolean) - Must be true to accept terms

**Body:**
```json
{
  "accepted": true
}
```

### 7. Submit for Verification
**POST** `/rider/submit-verification`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** No request body required. This endpoint submits the driver's profile for admin verification.

**Prerequisites:**
- Vehicle details must be complete
- Driver's license uploaded
- Insurance document uploaded
- Profile photo uploaded
- Terms and conditions accepted

### 8. Get Onboarding Status
**GET** `/rider/onboarding-status`

**Headers:**
```
Authorization: Bearer <token>
```

### 9. Update Rider Profile
**PUT** `/rider/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields:**
- `name` (string) - Updated name
- `email` (string) - Updated email
- `phoneNumber` (string) - Updated phone number
- `address` (string) - Address
- `city` (string) - City
- `vehicleType` (string) - Vehicle type
- `vehicleNumber` (string) - Vehicle number
- `make` (string) - Vehicle make
- `model` (string) - Vehicle model
- `year` (number) - Vehicle year
- `color` (string) - Vehicle color
- `emergencyContact` (object) - Emergency contact details
  - `name` (string) - Contact name
  - `phone` (string) - Contact phone
  - `relation` (string) - Relationship

**Body:**
```json
{
  "name": "Updated Name",
  "phoneNumber": "+1234567890",
  "email": "newemail@example.com",
  "address": "123 New Street",
  "city": "New York",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+0987654321",
    "relation": "Spouse"
  }
}
```

### 10. Update Rider Status
**PUT** `/rider/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `status` (string) - Driver status ("available" or "offline")

**Body:**
```json
{
  "status": "available"
}
```

**Note:** Driver must be verified to set status to "available".

---

## 🚕 Ride Booking APIs

### 1. Create Ride Booking
**POST** `/rides/ridebook`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `category` (string) - Ride category (e.g., "ride", "delivery")
- `pickupLocation` (object) - Pickup location coordinates
  - `type` (string) - Must be "Point"
  - `coordinates` (array) - [longitude, latitude]
- `dropoffLocation` or `dropOffLocation` (object) - Dropoff location coordinates
  - `type` (string) - Must be "Point"
  - `coordinates` (array) - [longitude, latitude]
- `selectedVehicle` (object) - Selected vehicle details
  - `id` or `vehicleId` (string) - Vehicle type ID
  - `name` (string) - Vehicle name (e.g., "Economy", "Premium")
  - `features` (array) - Vehicle features
  - `capacity` (number) - Passenger capacity

**Optional Fields:**
- `pickupLocationName` (string) - Pickup address
- `dropoffLocationName` (string) - Dropoff address
- `fare` (number) - Calculated fare
- `price` (number) - Price
- `distance` (number) - Distance in km
- `time` (string) - Estimated time
- `duration` (string) - Duration in minutes
- `paymentMethod` (string) - "Card" or "Cash" (default: "Cash")
- `date` (string) - Booking date
- `notes` (string) - Additional notes

**Body:**
```json
{
  "category": "ride",
  "pickupLocation": {
    "type": "Point",
    "coordinates": [-74.0060, 40.7128]
  },
  "pickupLocationName": "123 Main St, New York",
  "dropoffLocation": {
    "type": "Point",
    "coordinates": [-73.9352, 40.7306]
  },
  "dropoffLocationName": "456 Oak Ave, Brooklyn",
  "selectedVehicle": {
    "id": "vehicle_type_id",
    "name": "Economy",
    "features": ["AC", "Music"],
    "capacity": 4,
    "price": "25.50"
  },
  "fare": 25.50,
  "distance": 8.5,
  "duration": "20",
  "paymentMethod": "Card",
  "notes": "Please call when you arrive"
}
```

### 2. Get Nearby Rides
**GET** `/rides/nearby`

**Query Parameters:**
```
?latitude=40.7128&longitude=-74.0060&radius=5000
```

### 3. Get All Rides
**GET** `/rides/all_rides`

### 4. Get User Ride History
**GET** `/rides/ride_history/:userId`

**Headers:**
```
Authorization: Bearer <token>
```

### 5. Get All Rides for Driver
**GET** `/rides/all_rides_status`

**Headers:**
```
Authorization: Bearer <token>
```

### 6. Cancel Ride Booking (User)
**PUT** `/rides/bookings/:bookingId/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields:**
- `cancellationReason` (string) - Reason for cancellation
- `cancelledBy` (string) - Who cancelled (default: "user")

**Body:**
```json
{
  "cancellationReason": "Change of plans",
  "cancelledBy": "user"
}
```

### 7. Cancel Ride Booking (Driver)
**PUT** `/rides/driver/bookings/:bookingId/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields:**
- `cancellationReason` (string) - Reason for cancellation

**Body:**
```json
{
  "cancellationReason": "Vehicle issue"
}
```

### 8. Cancel Ride Booking (Admin)
**PUT** `/rides/admin/bookings/:bookingId/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields:**
- `cancellationReason` (string) - Reason for cancellation

**Body:**
```json
{
  "cancellationReason": "Policy violation"
}
```

### 9. Get Cancelled Bookings
**GET** `/rides/bookings/cancelled`

### 10. Accept Ride
**POST** `/rides/accept/:bookingId`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** No request body required. The bookingId is passed as a URL parameter.

**URL Parameters:**
- `bookingId` (string) - The ID of the booking to accept

### 11. Rider On The Way
**PUT** `/rides/:bookingId/on-the-way`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `currentLocation` (object) - Driver's current location
  - `type` (string) - Must be "Point"
  - `coordinates` (array) - [longitude, latitude]

**Body:**
```json
{
  "currentLocation": {
    "type": "Point",
    "coordinates": [-74.0060, 40.7128]
  }
}
```

### 12. Reached Pickup
**PUT** `/rides/:bookingId/reached-pickup`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** No request body required. This endpoint marks that the driver has reached the pickup location.

### 13. Start Ride
**PUT** `/rides/:bookingId/start`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** No request body required. This endpoint marks the ride as started.

### 14. Complete Ride
**PUT** `/rides/:bookingId/complete`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** No request body required. This endpoint marks the ride as completed and makes the driver available again.

### 15. Get Ride Status
**GET** `/rides/:bookingId/status`

**Headers:**
```
Authorization: Bearer <token>
```

### 16. Update Driver Location
**PUT** `/rides/:bookingId/update-location`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `latitude` (number) - Current latitude
- `longitude` (number) - Current longitude

**Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

### 17. Get Driver Location
**GET** `/rides/:bookingId/track`

**Headers:**
```
Authorization: Bearer <token>
```

### 18. Get Location History
**GET** `/rides/:bookingId/location-history`

**Headers:**
```
Authorization: Bearer <token>
```

### 19. Fix Booking Status
**PUT** `/rides/fix-booking-status/:bookingId`

**Headers:**
```
Authorization: Bearer <token>
```

---

## 💳 Payment APIs

### 1. Setup Payment Method
**POST** `/rides/payment/setup`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** This endpoint creates a Stripe SetupIntent for adding a payment method. No body required.

**Response:**
```json
{
  "success": true,
  "clientSecret": "seti_xxxxx_secret_xxxxx",
  "customerId": "cus_xxxxx"
}
```

### 2. Get User Cards
**GET** `/rides/payment/cards`

**Headers:**
```
Authorization: Bearer <token>
```

### 3. Set Default Card
**PUT** `/rides/payment/default-card`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `paymentMethodId` (string) - Stripe payment method ID

**Body:**
```json
{
  "paymentMethodId": "pm_1234567890"
}
```

### 4. Remove Card
**DELETE** `/rides/payment/card/:paymentMethodId`

**Headers:**
```
Authorization: Bearer <token>
```

### 5. Get Payment Status
**GET** `/rides/payment/status/:bookingId`

**Headers:**
```
Authorization: Bearer <token>
```

---

## ⭐ Review APIs

### 1. Create Review
**POST** `/reviews/:bookingId/create`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `rating` (number) - Rating from 1 to 5

**Optional Fields:**
- `review` (string) - Review text/comment
- `tags` (array) - Review tags (e.g., ["Friendly", "On Time"])

**Body:**
```json
{
  "rating": 5,
  "review": "Great driver, smooth ride!",
  "tags": ["Friendly", "Professional", "Clean Car"]
}
```

### 2. Get Review by Booking
**GET** `/reviews/booking/:bookingId`

**Headers:**
```
Authorization: Bearer <token>
```

### 3. Get Driver Reviews
**GET** `/reviews/driver/:driverId/reviews`

### 4. Get User Reviews
**GET** `/reviews/user/my-reviews`

**Headers:**
```
Authorization: Bearer <token>
```

### 5. Can Review
**GET** `/reviews/can-review/:bookingId`

**Headers:**
```
Authorization: Bearer <token>
```

### 6. Update Review
**PUT** `/reviews/:reviewId/update`

**Headers:**
```
Authorization: Bearer <token>
```

**Optional Fields:**
- `rating` (number) - Updated rating (1-5)
- `review` (string) - Updated review text
- `tags` (array) - Updated tags

**Note:** Reviews can only be updated within 24 hours of submission.

**Body:**
```json
{
  "rating": 4,
  "review": "Updated review comment",
  "tags": ["Professional", "On Time"]
}
```

### 7. Delete Review
**DELETE** `/reviews/:reviewId/delete`

**Headers:**
```
Authorization: Bearer <token>
```

### 8. Driver Reply to Review
**POST** `/reviews/:reviewId/driver-reply`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `reply` (string) - Driver's reply text (cannot be empty)

**Body:**
```json
{
  "reply": "Thank you for your feedback!"
}
```

### 9. Get Review Stats
**GET** `/reviews/driver/stats`

**Headers:**
```
Authorization: Bearer <token>
```

---

## 💬 Chat APIs

### 1. Send Message
**POST** `/chat/send`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `rideId` (string) - Ride/Booking ID
- `receiverId` (string) - Receiver's user ID
- `content` (string) - Message content

**Body:**
```json
{
  "rideId": "ride_id_here",
  "receiverId": "receiver_id_here",
  "content": "Hello, I'm on my way!"
}
```

### 2. Get Messages
**GET** `/chat/messages/:rideId`

**Headers:**
```
Authorization: Bearer <token>
```

### 3. Mark Messages as Read
**PUT** `/chat/read/:rideId`

**Headers:**
```
Authorization: Bearer <token>
```

### 4. Delete Message
**DELETE** `/chat/message/:messageId`

**Headers:**
```
Authorization: Bearer <token>
```

### 5. Authenticate Pusher
**POST** `/chat/pusher/auth`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `socket_id` (string) - Pusher socket ID
- `channel_name` (string) - Pusher channel name (format: "private-ride-{rideId}")

**Body:**
```json
{
  "socket_id": "socket_id_here",
  "channel_name": "private-ride-ride_id_here"
}
```

### 6. Test Chat
**GET** `/chat/test`

### 7. Debug Ride Access
**GET** `/chat/debug/ride/:rideId`

**Headers:**
```
Authorization: Bearer <token>
```

### 8. Debug Messages
**GET** `/chat/debug/messages/:rideId`

**Headers:**
```
Authorization: Bearer <token>
```

---

## 📦 Parcel Booking APIs

### 1. Create Parcel Booking
**POST** `/parcel/create`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `receiverName` (string) - Receiver's full name
- `receiverPhoneNumber` (string) - Receiver's phone number
- `cargoType` (string) - Type of cargo (e.g., "Documents", "Electronics")
- `selectedVehicle` (string) - Vehicle type ("bike", "car", "van", "truck")
- `weight` (number) - Package weight in kg
- `height` (number) - Package height in cm
- `length` (number) - Package length in cm
- `numberOfPackages` (number) - Number of packages
- `pickupLocation` (object) - Pickup location
  - `lat` (number) - Latitude
  - `lng` (number) - Longitude
- `dropoffLocation` (object) - Dropoff location
  - `lat` (number) - Latitude
  - `lng` (number) - Longitude
- `pickupLocationName` (string) - Pickup address
- `dropoffLocationName` (string) - Dropoff address

**Optional Fields:**
- `fragileItem` (boolean) - Is item fragile
- `notes` (string) - Additional notes
- `parcel_type` (string) - Parcel type

**Body:**
```json
{
  "receiverName": "Jane Doe",
  "receiverPhoneNumber": "+1234567890",
  "cargoType": "Electronics",
  "selectedVehicle": "car",
  "weight": 5,
  "height": 20,
  "length": 30,
  "numberOfPackages": 2,
  "fragileItem": true,
  "pickupLocation": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "pickupLocationName": "123 Main St, New York",
  "dropoffLocation": {
    "lat": 40.7306,
    "lng": -73.9352
  },
  "dropoffLocationName": "456 Oak Ave, Brooklyn",
  "notes": "Handle with care",
  "parcel_type": "standard"
}
```

### 2. Get Parcel Booking by ID
**GET** `/parcel/:id`

**Headers:**
```
Authorization: Bearer <token>
```

### 3. Cancel Parcel Booking
**PUT** `/parcel/cancel/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** No request body required. The booking ID is passed as a URL parameter.

---

## 🐾 Pet Delivery Booking APIs

### 1. Create Pet Delivery Booking
**POST** `/pet/pet_delivery_booking`

**Headers:**
```
Authorization: Bearer <token>
```

**Required Fields:**
- `pet_name` (string) - Pet's name
- `pet_type` (string) - Type of pet (e.g., "dog", "cat")
- `owner_name` (string) - Owner's full name
- `owner_phone` (string) - Owner's phone number
- `pickupLocation` (object) - Pickup location coordinates
- `dropOffLocation` (object) - Dropoff location coordinates
- `pickupLocationName` (string) - Pickup address
- `dropoffLocationName` (string) - Dropoff address

**Optional Fields:**
- `userId` (string) - User ID (if different from authenticated user)

**Body:**
```json
{
  "pet_name": "Max",
  "pet_type": "dog",
  "owner_name": "John Doe",
  "owner_phone": "+1234567890",
  "pickupLocation": {
    "type": "Point",
    "coordinates": [-74.0060, 40.7128]
  },
  "pickupLocationName": "123 Main St, New York",
  "dropOffLocation": {
    "type": "Point",
    "coordinates": [-73.9352, 40.7306]
  },
  "dropoffLocationName": "456 Oak Ave, Brooklyn"
}
```

### 2. Get All Pet Delivery Bookings
**GET** `/pet/get_pet_delivery`

### 3. Get Pet Delivery Booking by ID
**GET** `/pet/pet_delivery/:id`

### 4. Cancel Pet Delivery Booking
**PUT** `/pet/pet-delivery/:id`

**Note:** No request body required. The booking ID is passed as a URL parameter.

---

## 👨‍💼 Admin APIs

### 1. Admin Login
**POST** `/admin/login`

**Required Fields:**
- `email` (string) - Admin email address
- `password` (string) - Admin password

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword123"
}
```

### 2. Get Admin Profile
**GET** `/admin/profile`

**Headers:**
```
Authorization: Bearer <admin_token>
```

### 3. Update Admin Profile
**PUT** `/admin/profile`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Optional Fields:**
- `name` (string) - Updated name
- `email` (string) - Updated email
- `phoneNumber` (string) - Updated phone number

**Body:**
```json
{
  "name": "Updated Admin Name",
  "email": "newemail@example.com",
  "phoneNumber": "+1234567890"
}
```

### 4. Change Password
**PUT** `/admin/change-password`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Required Fields:**
- `currentPassword` (string) - Current password
- `newPassword` (string) - New password

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

### 5. Get Dashboard Stats
**GET** `/admin/dashboard-stats`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Permissions Required:** `viewReports`

### 6. Create Admin (Super Admin Only)
**POST** `/admin/create`

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

**Required Fields:**
- `name` (string) - Admin's full name
- `email` (string) - Admin's email address
- `password` (string) - Admin's password

**Optional Fields:**
- `phoneNumber` (string) - Admin's phone number
- `role` (string) - Admin role (default: "admin")
- `permissions` (object) - Admin permissions
- `isFirstAdmin` (boolean) - Set to true for first admin creation (no auth required)

**Body:**
```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "password123",
  "phoneNumber": "+1234567890",
  "role": "admin",
  "permissions": {
    "manageRiders": true,
    "manageDrivers": true,
    "viewReports": true,
    "manageBookings": true,
    "manageUsers": true,
    "managePayments": true
  }
}
```

### 7. Get All Admins (Super Admin Only)
**GET** `/admin/all`

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

### 8. Update Admin Permissions (Super Admin Only)
**PUT** `/admin/permissions/:id`

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

**Required Fields:**
- `permissions` (object) - Updated permissions object

**Body:**
```json
{
  "permissions": {
    "manageRiders": true,
    "manageDrivers": false,
    "viewReports": true,
    "manageBookings": true,
    "manageUsers": false,
    "managePayments": true
  }
}
```

**Note:** Cannot modify super admin permissions.

### 9. Toggle Admin Status (Super Admin Only)
**PUT** `/admin/toggle-status/:id`

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

**Note:** No request body required. This endpoint toggles the admin's active status.

**Note:** Cannot deactivate super admin.

### 10. Delete Admin (Super Admin Only)
**DELETE** `/admin/:id`

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

### 11. Approve Rider
**PUT** `/admin/riders/approve/:riderId`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Permissions Required:** `manageRiders`

**Optional Fields:**
- `adminNotes` (string) - Admin notes about the approval

**Body:**
```json
{
  "adminNotes": "All documents verified successfully"
}
```

### 12. Reject Rider
**PUT** `/admin/riders/reject/:riderId`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Permissions Required:** `manageRiders`

**Required Fields:**
- `rejectionReason` (string) - Reason for rejection

**Optional Fields:**
- `rejectedDocument` (string) - Specific document rejected ("license", "insurance", "profilePhoto", "vehicleRegistration")

**Body:**
```json
{
  "rejectionReason": "Incomplete documents",
  "rejectedDocument": "license"
}
```

### 13. Get Pending Verifications
**GET** `/admin/riders/pending`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Permissions Required:** `manageRiders`

---

## 🚙 Ride Types APIs

### 1. Get Ride Types
**GET** `/ride-types`

**Response Example:**
```json
{
  "success": true,
  "rideTypes": [
    {
      "_id": "ride_type_id",
      "name": "Economy",
      "description": "Affordable rides",
      "baseFare": 5.00,
      "perKmRate": 1.50,
      "perMinuteRate": 0.25,
      "vehicleType": "sedan",
      "capacity": 4
    }
  ]
}
```

---

## 🔔 Webhook APIs

### 1. Stripe Webhook
**POST** `/webhook/stripe-webhook`

**Headers:**
```
stripe-signature: <signature>
Content-Type: application/json
```

**Body:** (Sent by Stripe)
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 2500,
      "status": "succeeded"
    }
  }
}
```

**Webhook Events Handled:**
- `payment_intent.amount_capturable_updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

## 🔑 Authentication Notes

### Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### User Roles
- `user` - Regular user/passenger
- `driver` - Driver/Rider
- `admin` - Admin user
- `superadmin` - Super admin with full permissions

### Admin Permissions
- `manageRiders` - Approve/reject riders
- `manageDrivers` - Manage driver accounts
- `viewReports` - View dashboard statistics
- `manageBookings` - Manage ride bookings

---

## 📝 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 🌐 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📍 Location Format

All location fields use GeoJSON format:
```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

**Example:**
```json
{
  "type": "Point",
  "coordinates": [-74.0060, 40.7128]
}
```

---

## 🔄 Ride Booking Status Flow

**Status Progression:**
1. `pending` - Ride created, waiting for driver acceptance
2. `accepted` - Driver accepted the ride
3. `onTheWay` - Driver is on the way to pickup location
4. `arrived` - Driver reached pickup location
5. `inProgress` - Ride started (passenger picked up)
6. `completed` - Ride completed successfully
7. `cancelled` - Ride cancelled (by user, driver, or admin)

**Status Transitions:**
- `pending` → `accepted` (via `/rides/accept/:bookingId`)
- `accepted` → `onTheWay` (via `/rides/:bookingId/on-the-way`)
- `onTheWay` → `arrived` (via `/rides/:bookingId/reached-pickup`)
- `arrived` → `inProgress` (via `/rides/:bookingId/start`)
- `inProgress` → `completed` (via `/rides/:bookingId/complete`)
- Any status → `cancelled` (via cancel endpoints)

**Cancellation Rules:**
- User can cancel: `pending`, `accepted`
- Driver can cancel: `accepted`, `ongoing`
- Admin can cancel: Any status

---

## 💰 Payment Status Flow

**Status Progression:**
1. `pending` - Payment not initiated
2. `authorized` - Payment authorized (hold placed on card)
3. `captured` - Payment captured (money transferred)
4. `failed` - Payment failed
5. `cancelled` - Payment cancelled (hold released)
6. `refunded` - Payment refunded

**Payment Methods:**
- `Card` - Credit/Debit card via Stripe
- `Cash` - Cash payment on delivery

**Payment Flow for Card:**
1. User books ride with card → Payment authorized (hold placed)
2. Ride completed → Payment captured automatically
3. Ride cancelled → Payment authorization cancelled (hold released)

**Important Notes:**
- Card payments require `defaultPaymentMethod` to be set
- Authorization holds funds but doesn't charge
- Capture happens automatically on ride completion
- Cancellation releases the hold immediately

## 🚗 Driver Onboarding Flow

**Step-by-Step Process:**

1. **Register as Driver**
   - POST `/auth/register/driver`
   - Provide: name, email, password, phoneNumber

2. **Add Vehicle Details**
   - POST `/rider/vehicle-details` or `/rider/add-complete-vehicle-details`
   - Provide: category, make, model, year, licensePlate

3. **Upload Driver's License**
   - POST `/rider/upload-license`
   - Upload: frontImage, backImage
   - Provide: licenseNumber, expiryDate

4. **Upload Insurance**
   - POST `/rider/upload-insurance`
   - Upload: insurance document
   - Provide: provider, policyNumber, expiryDate

5. **Upload Profile Photo**
   - POST `/rider/upload-profile-photo`
   - Upload: profilePhoto

6. **Accept Terms & Conditions**
   - POST `/rider/accept-terms`
   - Set: accepted = true

7. **Submit for Verification**
   - POST `/rider/submit-verification`
   - All previous steps must be completed

8. **Admin Approval**
   - Admin reviews and approves/rejects
   - PUT `/admin/riders/approve/:riderId` or `/admin/riders/reject/:riderId`

9. **Start Driving**
   - Once approved, driver can set status to "available"
   - PUT `/rider/status` with status = "available"

**Verification Statuses:**
- `pending` - Initial status
- `in_review` - Submitted for admin review
- `approved` - Approved by admin, can start driving
- `rejected` - Rejected by admin, needs resubmission

---

## 🔔 Real-time Updates (Pusher)

**Pusher Channels:**
- `ride-{bookingId}` - Real-time updates for specific ride
- `driver-status` - Driver availability updates

**Events:**
- `new-message` - New chat message received
- `ride-status-update` - Ride status changed
- `driver-location-update` - Driver location updated
- `driver-available` - Driver became available

**Authentication:**
- Use `/chat/pusher/auth` endpoint to authenticate Pusher channels
- Required for private channels

**Example Usage:**
```javascript
const pusher = new Pusher('YOUR_PUSHER_KEY', {
  cluster: 'YOUR_CLUSTER',
  authEndpoint: '/api/chat/pusher/auth'
});

const channel = pusher.subscribe('private-ride-123456');
channel.bind('driver-location-update', function(data) {
  console.log('Driver location:', data.latitude, data.longitude);
});
```

---

## 📊 API Rate Limits

- Authentication endpoints: 5 requests per minute
- Booking creation: 10 requests per minute
- Location updates: 60 requests per minute
- General endpoints: 100 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (never in localStorage for sensitive apps)
3. **Validate all inputs** on client side before sending
4. **Handle errors gracefully** and don't expose sensitive information
5. **Implement request timeouts** to prevent hanging requests
6. **Use environment variables** for API keys and secrets
7. **Rotate tokens regularly** for enhanced security
8. **Implement CORS properly** to restrict API access
9. **Sanitize user inputs** to prevent XSS attacks
10. **Use prepared statements** to prevent SQL injection

---

## 🐛 Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid data format |
| 401 | Unauthorized | Invalid or expired token, not logged in |
| 403 | Forbidden | Insufficient permissions, account not verified |
| 404 | Not Found | Resource doesn't exist, invalid ID |
| 409 | Conflict | Duplicate entry, resource already exists |
| 422 | Unprocessable Entity | Validation failed, invalid data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server issue, database error |
| 503 | Service Unavailable | Server maintenance, temporary downtime |

---

## 📱 Testing the APIs

**Recommended Tools:**
- Postman
- Insomnia
- Thunder Client (VS Code)
- cURL
- HTTPie

**Example cURL Request:**
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get Profile with Authorization
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create Ride Booking
curl -X POST http://localhost:5000/api/rides/ridebook \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "ride",
    "pickupLocation": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
    "dropoffLocation": {"type": "Point", "coordinates": [-73.9352, 40.7306]},
    "selectedVehicle": {"id": "123", "name": "Economy", "features": [], "capacity": 4}
  }'
```

**Postman Collection:**
Import the API endpoints into Postman for easier testing. Set up environment variables for:
- `base_url`: http://localhost:5000/api
- `token`: Your authentication token
- `admin_token`: Admin authentication token

---

## 🔧 Environment Variables

Required environment variables for the backend:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/cab_booking

# JWT
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Pusher
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
```

---

## 📚 Additional Resources

**Documentation:**
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Pusher Documentation](https://pusher.com/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

**Support:**
- GitHub Issues: [Report bugs or request features]
- Email: support@yourdomain.com
- Documentation: https://docs.yourdomain.com

---

## 🎯 Quick Start Guide

1. **Clone the repository**
2. **Install dependencies:** `npm install`
3. **Set up environment variables:** Copy `.env.example` to `.env`
4. **Start MongoDB:** `mongod`
5. **Run the server:** `npm start` or `npm run dev`
6. **Test the API:** Use Postman or cURL to test endpoints

---

## 📝 Changelog

### Version 1.0.0 (April 2026)
- Initial release
- User authentication and authorization
- Ride booking system
- Driver onboarding and verification
- Payment integration with Stripe
- Real-time chat and location tracking
- Admin dashboard and management
- Parcel and pet delivery booking
- Review and rating system

---

**Last Updated:** April 11, 2026  
**Version:** 1.0.0  
**Backend Framework:** Node.js + Express.js  
**Database:** MongoDB with Mongoose  
**Payment Gateway:** Stripe  
**Real-time Communication:** Pusher  
**File Storage:** Cloudinary  
**Authentication:** JWT (JSON Web Tokens)

---

**Total Endpoints:** 81+  
**Total Categories:** 12  
**Supported Platforms:** Web, iOS, Android  

---

*This documentation is maintained by the development team. For updates or corrections, please contact the team or submit a pull request.*
