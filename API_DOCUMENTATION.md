# RideLynk API Documentation

Base URL: https://backend.ridelynk.com

> Protected routes require Header: Authorization: Bearer TOKEN

---

## 1. AUTH APIs  /api/auth

### POST /api/auth/register
Register a new customer user.

Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "12345678",
  "phoneNumber": "03001234567",
  "role": "customer"
}

Response 201:
{
  "_id": "userId",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer",
  "token": "JWT_TOKEN"
}

---

### POST /api/auth/register/driver
Register a new driver account.

Body:
{
  "name": "James Driver",
  "email": "james@example.com",
  "password": "12345678",
  "phoneNumber": "03001234567",
  "city": "Karachi",
  "country": "Pakistan"
}

Response 201:
{
  "success": true,
  "message": "Driver account created successfully.",
  "data": {
    "user": { "_id", "name", "email", "role": "driver" },
    "token": "JWT_TOKEN",
    "onboardingRequired": true
  }
}

---

### POST /api/auth/login
Login for both customer and driver.

Body:
{
  "email": "john@example.com",
  "password": "12345678"
}

Response 200:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id", "name", "email", "role", "phoneNumber", "profileImage" },
    "token": "JWT_TOKEN"
  }
}

---

### POST /api/auth/forget_password
Send OTP to email for password reset.

Body:
{
  "email": "john@example.com"
}

Response 200:
{
  "message": "OTP sent to your email",
  "otp": 123456
}

---

### POST /api/auth/checkOTP
Verify OTP code.

Body:
{
  "email": "john@example.com",
  "code": "123456"
}

Response 200:
{
  "message": "OTP verified successfully"
}

---

### POST /api/auth/reset_password
Reset password after OTP verification.

Body:
{
  "email": "john@example.com",
  "password": "newpassword123",
  "confirmpassword": "newpassword123"
}

Response 200:
{
  "message": "Reset Password Successfully"
}

---

### POST /api/auth/edit_profile  [Protected]
Update user profile.

Body:
{
  "name": "New Name",
  "phoneNumber": "03001234567",
  "email": "newemail@example.com"
}

Response 200:
{
  "_id": "userId",
  "name": "New Name",
  "email": "newemail@example.com",
  "token": "NEW_JWT_TOKEN"
}

---

### POST /api/auth/get_profile  [Protected]
Get current user profile.

Body: none

Response 200:
{
  "_id": "userId",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer",
  "phoneNumber": "03001234567",
  "profileImage": "url",
  "walletBalance": 0,
  "referralCode": "REFABC123"
}


---

## 2. USER APIs  /api/users

### GET /api/users/profile  [Protected]
Get logged in user full profile.

Headers: Authorization: Bearer TOKEN

Response 200:
{
  "_id": "userId",
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "03001234567",
  "role": "customer",
  "profileImage": "url",
  "walletBalance": 0,
  "referralCode": "REFABC123",
  "referralCount": 0,
  "createdAt": "2024-01-15T10:00:00.000Z"
}

---

## 3. RIDER ONBOARDING APIs  /api/rider

All routes require: Authorization: Bearer TOKEN (driver account)

### POST /api/rider/vehicle-details
Add vehicle details.

Body:
{
  "category": "cab",
  "vehicleType": "sedan",
  "make": "Toyota",
  "model": "Camry",
  "year": "2022",
  "color": "Black",
  "licensePlate": "ABC-123",
  "vehicleNumber": "VH123456"
}

Response 200:
{
  "success": true,
  "message": "Vehicle details added successfully",
  "data": { ...vehicleDetails }
}

---

### POST /api/rider/upload-license
Upload driving license images.

Form-Data (multipart):
- frontImage: file
- backImage: file
- licenseNumber: "DL123456"
- expiryDate: "2026-12-31"

Response 200:
{
  "success": true,
  "message": "License uploaded successfully",
  "data": { "license": { "status": "pending", "frontImage": "url", "backImage": "url" } }
}

---

### POST /api/rider/upload-insurance
Upload insurance document.

Form-Data (multipart):
- insurance: file
- provider: "ABC Insurance"
- policyNumber: "INS123456"
- expiryDate: "2025-12-31"

Response 200:
{
  "success": true,
  "message": "Insurance uploaded successfully"
}

---

### POST /api/rider/upload-profile-photo
Upload driver profile photo.

Form-Data (multipart):
- profilePhoto: file

Response 200:
{
  "success": true,
  "message": "Profile photo uploaded successfully",
  "data": { "profilePhoto": { "url": "cloudinary_url", "status": "pending" } }
}

---

### POST /api/rider/add-complete-vehicle-details
Add vehicle with photos.

Form-Data (multipart):
- vehiclePhoto: file
- registrationDocument: file
- category: "cab"
- vehicleType: "sedan"
- make: "Toyota"
- model: "Camry"
- year: "2022"
- color: "Black"
- licensePlate: "ABC-123"

Response 200:
{
  "success": true,
  "message": "Vehicle details added successfully"
}

---

### POST /api/rider/accept-terms
Accept terms and conditions.

Body:
{
  "accepted": true
}

Response 200:
{
  "success": true,
  "message": "Terms accepted successfully"
}

---

### POST /api/rider/submit-verification
Submit all documents for admin verification.

Body: none

Response 200:
{
  "success": true,
  "message": "Verification submitted. Admin will review your documents.",
  "verificationStatus": "in_review"
}

---

### GET /api/rider/onboarding-status  [Protected]
Get current onboarding completion status.

Response 200:
{
  "success": true,
  "data": {
    "vehicleDetails": true,
    "license": true,
    "insurance": false,
    "profilePhoto": true,
    "termsAccepted": false,
    "verificationStatus": "pending",
    "isVerified": false
  }
}

---

### PUT /api/rider/profile  [Protected]
Update rider profile.

Body:
{
  "phoneNumber": "03001234567",
  "address": "123 Main St",
  "city": "Karachi",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "03009876543",
    "relation": "Wife"
  }
}

Response 200:
{
  "success": true,
  "message": "Profile updated successfully"
}

---

### PUT /api/rider/status  [Protected + RiderProtect]
Update rider availability status.

Body:
{
  "status": "available"
}
Status options: available | busy | offline

Response 200:
{
  "success": true,
  "message": "Status updated",
  "status": "available"
}

---

### GET /api/rider/booking-history  [Protected + RiderProtect]
Get all bookings for the logged in driver.

Response 200:
{
  "success": true,
  "data": [ ...bookings ]
}


---

## 4. RIDE BOOKING APIs  /api/ride

### POST /api/ride/ridebook  [Protected]
Create a new cab ride booking.

Body:
{
  "category": "cab",
  "pickupLocation": {
    "type": "Point",
    "coordinates": [67.0011, 24.8607]
  },
  "dropoffLocation": { "lat": 24.9765, "lng": 67.0892 },
  "pickupLocationName": "Saddar, Karachi",
  "dropoffLocationName": "North Karachi, Karachi",
  "fare": "50",
  "price": "50",
  "distance": "5.2",
  "duration": "18",
  "time": "18 mins",
  "date": "2024-01-15",
  "paymentMethod": "Cash",
  "selectedVehicle": {
    "id": "vehicle_1",
    "name": "Economy",
    "features": "AC, 4 Seats",
    "capacity": 4,
    "price": "50"
  }
}

Response 201:
{
  "success": true,
  "message": "Ride booked successfully",
  "booking": {
    "_id": "bookingId",
    "status": "pending",
    "fare": "50",
    "distance": "5.2",
    "pickupLocationName": "Saddar, Karachi",
    "dropoffLocationName": "North Karachi, Karachi",
    "paymentType": "Cash",
    "selectedVehicle": { ... }
  },
  "nearbyRiders": [ ... ]
}

---

### GET /api/ride/nearby
Get nearby pending rides (for drivers).

Query Params:
- latitude: 24.8607
- longitude: 67.0011
- radius: 5  (km, default 5)

Response 200:
{
  "success": true,
  "count": 3,
  "rides": [
    {
      "_id": "bookingId",
      "status": "pending",
      "pickupLocationName": "...",
      "dropoffLocationName": "...",
      "fare": "50",
      "distance": "2.50 km"
    }
  ]
}

---

### GET /api/ride/all_rides
Get all rides (admin).

Query Params:
- status: pending | accepted | completed | cancelled
- category: cab | bike
- startDate: 2024-01-01
- endDate: 2024-12-31
- page: 1
- limit: 100

Response 200:
{
  "success": true,
  "count": 10,
  "total": 100,
  "rides": [ ...rides ]
}

---

### GET /api/ride/ride_history/:userId
Get complete ride history for a user (cab + parcel + pet).

Params: userId

Query Params:
- type: cab | parcel | pet
- status: pending | completed | cancelled
- page: 1
- limit: 20

Response 200:
{
  "success": true,
  "summary": {
    "total": 5,
    "cab": 2,
    "parcel": 2,
    "pet": 1,
    "completed": 3,
    "cancelled": 1,
    "pending": 0,
    "active": 1
  },
  "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 },
  "data": [
    {
      "id": "bookingId",
      "type": "cab",
      "status": "completed",
      "fare": "50",
      "distance": "5.20 km",
      "duration": "18 mins",
      "pickup": { "name": "Saddar", "coordinates": { "lat": 24.86, "lng": 67.00 } },
      "dropoff": { "name": "North Karachi", "coordinates": { "lat": 24.97, "lng": 67.08 } },
      "user": { "id", "name", "email", "phone", "profileImage" },
      "driver": {
        "id", "name", "phone", "profileImage",
        "rating": 4.8,
        "totalRides": 120,
        "vehicle": { "make": "Toyota", "model": "Camry", "color": "Black", "licensePlate": "ABC-123" }
      },
      "payment": { "method": "Cash", "type": "Cash", "status": "pending" },
      "timestamps": { "booked", "accepted", "onTheWay", "arrived", "started", "completed" },
      "statusHistory": [ ... ],
      "cancellationDetails": null
    }
  ]
}

---

### POST /api/ride/accept/:bookingId  [Protected + RiderProtect]
Driver accepts a ride.

Params: bookingId

Body: none

Response 200:
{
  "success": true,
  "message": "Ride accepted successfully",
  "data": {
    "booking": { "_id", "status": "accepted", "driver": "riderId" },
    "rider": { "id", "status": "busy", "currentRide": "bookingId" }
  }
}

Pusher Event fired on channel ride-{bookingId}:
Event: ride-status-update
{
  "bookingId": "...",
  "status": "accepted",
  "booking": { full booking data },
  "driver": { full driver + vehicle data },
  "user": { full user data }
}

---

### PUT /api/ride/:bookingId/on-the-way  [Protected + RiderProtect]
Driver marks as on the way to pickup.

Body:
{
  "currentLocation": { "lat": 24.86, "lng": 67.00 }
}

Response 200:
{
  "success": true,
  "message": "Rider is on the way to pickup",
  "booking": { "id", "status": "onTheWay", "onTheWayAt": "timestamp" }
}

Pusher: ride-{bookingId} => ride-status-update { status: "onTheWay", ...full data }

---

### PUT /api/ride/:bookingId/reached-pickup  [Protected + RiderProtect]
Driver marks as arrived at pickup.

Body: none

Response 200:
{
  "success": true,
  "message": "Rider reached pickup location",
  "booking": { "id", "status": "arrived", "arrivedAt": "timestamp" }
}

Pusher: ride-{bookingId} => ride-status-update { status: "arrived", ...full data }

---

### PUT /api/ride/:bookingId/start  [Protected + RiderProtect]
Driver starts the ride.

Body: none

Response 200:
{
  "success": true,
  "message": "Ride started successfully",
  "booking": { "id", "status": "inProgress", "startedAt": "timestamp" }
}

Pusher: ride-{bookingId} => ride-status-update { status: "inProgress", ...full data }

---

### PUT /api/ride/:bookingId/complete  [Protected + RiderProtect]
Driver completes the ride.

Body: none

Response 200:
{
  "success": true,
  "message": "Ride completed successfully",
  "booking": { "id", "status": "completed", "completedAt": "timestamp" },
  "driverStatus": "available"
}

Pusher: ride-{bookingId} => ride-status-update { status: "completed", ...full data }

---

### PUT /api/ride/bookings/:bookingId/cancel  [Protected]
User cancels a ride.

Body:
{
  "cancellationReason": "Changed my mind",
  "cancelledBy": "user"
}

Response 200:
{
  "success": true,
  "message": "Ride cancelled successfully",
  "booking": { ...booking, "cancellationDetails": { "cancelledAt", "cancelledBy", "reason" } }
}

Pusher: ride-{bookingId} => ride-status-update { status: "cancelled", ...full data }

---

### PUT /api/ride/driver/bookings/:bookingId/cancel  [Protected]
Driver cancels a ride.

Body:
{
  "cancellationReason": "Emergency"
}

Response 200:
{
  "success": true,
  "message": "Ride cancelled successfully by driver"
}

---

### GET /api/ride/:bookingId/status  [Protected + RiderProtect]
Get current ride status with driver location.

Response 200:
{
  "success": true,
  "booking": {
    "_id", "status", "driver", "user",
    "riderLocation": { "lat", "lng" },
    "statusFlow": {
      "current": "onTheWay",
      "progress": 40,
      "timestamps": { "accepted", "onTheWay", "reachedPickup", "started", "completed" }
    }
  }
}

---

### PUT /api/ride/:bookingId/update-location  [Protected + RiderProtect]
Driver updates live location during ride.

Body:
{
  "latitude": 24.8607,
  "longitude": 67.0011
}

Response 200:
{
  "success": true,
  "message": "Location updated successfully",
  "data": { "latitude": 24.8607, "longitude": 67.0011, "timestamp": "..." }
}

Pusher: ride-{bookingId} => driver-location-update
{
  "driverId": "...",
  "latitude": 24.8607,
  "longitude": 67.0011,
  "status": "inProgress",
  "timestamp": "..."
}

---

### GET /api/ride/:bookingId/track  [Protected]
Get driver current location for tracking.

Response 200:
{
  "success": true,
  "data": {
    "driver": { "name", "phoneNumber", "profileImage", "vehicleDetails" },
    "currentLocation": { "latitude": 24.86, "longitude": 67.00 },
    "eta": "5 minutes",
    "rideStatus": "onTheWay",
    "lastUpdated": "timestamp"
  }
}

---

### GET /api/ride/:bookingId/location-history  [Protected]
Get full location history of a ride.

Response 200:
{
  "success": true,
  "data": {
    "locationHistory": [ { "location": { "coordinates": [lng, lat] }, "timestamp": "..." } ],
    "totalUpdates": 45
  }
}


---

## 5. PARCEL DELIVERY APIs  /api/parcel

### POST /api/parcel/create  [Protected]
Create a new parcel delivery booking.

Body:
{
  "receiverName": "Ali Khan",
  "receiverPhoneNumber": "03001234567",
  "cargoType": "electronics",
  "selectedVehicle": "bike",
  "weight": 2,
  "height": 10,
  "length": 20,
  "numberOfPackages": 1,
  "fragileItem": true,
  "pickupLocation": { "lat": 24.8607, "lng": 67.0011 },
  "dropoffLocation": { "lat": 24.9765, "lng": 67.0892 },
  "pickupLocationName": "Saddar, Karachi",
  "dropoffLocationName": "North Karachi, Karachi",
  "notes": "Handle with care",
  "parcel_type": "electronics",
  "paymentMethod": "Cash"
}

Response 201:
{
  "success": true,
  "message": "Parcel delivery booking created successfully",
  "booking": {
    "_id": "bookingId",
    "status": "pending",
    "totalFare": 25.5,
    "distance": "5.2",
    "estimateTime": "18 minutes"
  },
  "nearbyRiders": [ ... ]
}

Pusher fired on channel parcel-bookings:
Event: new-parcel-booking { bookingId, type: "parcel", fare, distance, ... }

---

### GET /api/parcel/all
Get all parcel bookings (admin).

Query Params: status, startDate, endDate, page, limit

Response 200:
{
  "success": true,
  "count": 10,
  "total": 50,
  "bookings": [ ...bookings ]
}

---

### GET /api/parcel/nearby  [RiderProtect]
Get nearby pending parcel deliveries for driver.

Query Params: latitude, longitude, radius (default 20km)

Response 200:
{
  "success": true,
  "count": 3,
  "deliveries": [ { ...delivery, "distance": "2.50 km" } ]
}

---

### GET /api/parcel/:id  [Protected]
Get parcel booking by ID.

Response 200:
{
  "_id": "bookingId",
  "status": "pending",
  "receiverName": "Ali Khan",
  "totalFare": 25.5,
  ...full booking
}

---

### POST /api/parcel/accept/:bookingId  [Protected + RiderProtect]
Driver accepts parcel delivery.

Body: none

Response 200:
{
  "success": true,
  "message": "Parcel delivery accepted successfully",
  "data": { "booking": { ...full }, "rider": { "id", "status": "busy" } }
}

Pusher: parcel-delivery-{bookingId} => delivery-accepted { status: "accepted", driver: {...} }

---

### PUT /api/parcel/:bookingId/on-the-way  [Protected + RiderProtect]
Driver on the way to pickup.

Body: none

Response 200:
{
  "success": true,
  "message": "Driver is on the way to pickup",
  "booking": { "id", "status": "onTheWay", "onTheWayAt": "timestamp" }
}

Pusher: parcel-delivery-{bookingId} => delivery-status-update { status: "onTheWay" }

---

### PUT /api/parcel/:bookingId/reached-pickup  [Protected + RiderProtect]
Driver arrived at pickup.

Response 200:
{
  "success": true,
  "message": "Driver reached pickup location",
  "booking": { "id", "status": "arrived", "arrivedAt": "timestamp" }
}

Pusher: parcel-delivery-{bookingId} => delivery-status-update { status: "arrived" }

---

### PUT /api/parcel/:bookingId/start  [Protected + RiderProtect]
Start parcel delivery.

Response 200:
{
  "success": true,
  "message": "Parcel delivery started successfully",
  "booking": { "id", "status": "inProgress", "startedAt": "timestamp" }
}

Pusher: parcel-delivery-{bookingId} => delivery-status-update { status: "inProgress" }

---

### PUT /api/parcel/:bookingId/complete  [Protected + RiderProtect]
Complete parcel delivery.

Response 200:
{
  "success": true,
  "message": "Parcel delivery completed successfully",
  "booking": { "id", "status": "completed", "completedAt": "timestamp" },
  "driverStatus": "available"
}

Pusher: parcel-delivery-{bookingId} => delivery-status-update { status: "completed" }

---

### PUT /api/parcel/bookings/:bookingId/cancel  [Protected]
User cancels parcel delivery.

Body:
{
  "cancellationReason": "No longer needed"
}

Response 200:
{
  "success": true,
  "message": "Parcel delivery cancelled successfully"
}

---

### GET /api/parcel/:bookingId/status  [Protected]
Get parcel delivery status.

Response 200:
{
  "success": true,
  "booking": {
    "_id", "status",
    "driverLocation": { "lat", "lng" },
    "statusFlow": { "current": "onTheWay", "progress": 40, "timestamps": {...} }
  }
}

---

### PUT /api/parcel/:bookingId/update-location  [Protected + RiderProtect]
Update driver location during delivery.

Body:
{
  "latitude": 24.8607,
  "longitude": 67.0011
}

Pusher: parcel-delivery-{bookingId} => driver-location-update { latitude, longitude, timestamp }

---

### GET /api/parcel/:bookingId/track  [Protected]
Track driver location.

Response 200:
{
  "success": true,
  "data": {
    "driver": { "name", "phoneNumber", "vehicleDetails" },
    "currentLocation": { "latitude", "longitude" },
    "eta": "5 minutes",
    "deliveryStatus": "onTheWay"
  }
}

---

### GET /api/parcel/driver/deliveries  [Protected + RiderProtect]
Get all deliveries for logged in driver.

Response 200:
{
  "success": true,
  "count": 5,
  "deliveries": [ ...deliveries ]
}


---

## 6. PET DELIVERY APIs  /api/pet

### POST /api/pet/pet_delivery_booking  [Protected]
Create a new pet delivery booking.

Body:
{
  "pet_name": "Buddy",
  "pet_type": "Dog",
  "breed": "Labrador",
  "age": "2 years",
  "weight_kg": "15",
  "number_of_pets": "1",
  "carrier_required": true,
  "is_vaccinated": true,
  "medical_conditions": "None",
  "special_instructions": "Handle gently",
  "length_cm": "60",
  "width_cm": "40",
  "height_cm": "50",
  "owner_name": "John Doe",
  "owner_phone": "03001234567",
  "pickupLocation": { "type": "Point", "coordinates": [67.0011, 24.8607] },
  "dropoffLocation": { "lat": 24.9765, "lng": 67.0892 },
  "pickupLocationName": "Saddar, Karachi",
  "dropoffLocationName": "North Karachi, Karachi",
  "distance": "5.2",
  "duration": "18",
  "paymentMethod": "Cash"
}

Response 201:
{
  "success": true,
  "message": "Pet delivery booking created successfully",
  "booking": {
    "_id": "bookingId",
    "status": "pending",
    "fare": "35.5",
    "pet_name": "Buddy",
    "pet_type": "Dog"
  },
  "nearbyRiders": [ ... ]
}

Pusher fired on channel pet-bookings:
Event: new-pet-booking { bookingId, type: "pet", petName, petType, fare, ... }

---

### GET /api/pet/get_pet_delivery
Get all pet delivery bookings (admin).

Response 200:
{
  "message": "Pet delivery bookings fetched successfully",
  "data": [ ...bookings ]
}

---

### GET /api/pet/nearby  [RiderProtect]
Get nearby pending pet deliveries for driver.

Query Params: latitude, longitude, radius (default 20km)

Response 200:
{
  "success": true,
  "count": 2,
  "deliveries": [ { ...delivery, "distance": "3.20 km" } ]
}

---

### GET /api/pet/pet_delivery/:id
Get pet delivery booking by ID.

Response 200:
{
  "message": "Booking fetched successfully",
  "data": { ...full booking }
}

---

### POST /api/pet/accept/:bookingId  [Protected + RiderProtect]
Driver accepts pet delivery.

Body: none

Response 200:
{
  "success": true,
  "message": "Pet delivery accepted successfully",
  "data": { "booking": { ...full }, "rider": { "id", "status": "busy" } }
}

Pusher: pet-delivery-{bookingId} => delivery-accepted { status: "accepted", driver: {...} }

---

### PUT /api/pet/:bookingId/on-the-way  [Protected + RiderProtect]
Driver on the way to pickup.

Response 200:
{
  "success": true,
  "message": "Driver is on the way to pickup",
  "booking": { "id", "status": "onTheWay", "onTheWayAt": "timestamp" }
}

Pusher: pet-delivery-{bookingId} => delivery-status-update { status: "onTheWay" }

---

### PUT /api/pet/:bookingId/reached-pickup  [Protected + RiderProtect]
Driver arrived at pickup.

Response 200:
{
  "success": true,
  "message": "Driver reached pickup location",
  "booking": { "id", "status": "arrived" }
}

Pusher: pet-delivery-{bookingId} => delivery-status-update { status: "arrived" }

---

### PUT /api/pet/:bookingId/start  [Protected + RiderProtect]
Start pet delivery.

Response 200:
{
  "success": true,
  "message": "Pet delivery started successfully",
  "booking": { "id", "status": "inProgress", "startedAt": "timestamp" }
}

Pusher: pet-delivery-{bookingId} => delivery-status-update { status: "inProgress" }

---

### PUT /api/pet/:bookingId/complete  [Protected + RiderProtect]
Complete pet delivery.

Response 200:
{
  "success": true,
  "message": "Pet delivery completed successfully",
  "booking": { "id", "status": "completed", "completedAt": "timestamp" },
  "driverStatus": "available"
}

Pusher: pet-delivery-{bookingId} => delivery-status-update { status: "completed" }

---

### PUT /api/pet/bookings/:bookingId/cancel  [Protected]
User cancels pet delivery.

Body:
{
  "cancellationReason": "No longer needed"
}

Response 200:
{
  "success": true,
  "message": "Pet delivery cancelled successfully"
}

---

### GET /api/pet/:bookingId/status  [Protected]
Get pet delivery status.

Response 200:
{
  "success": true,
  "booking": {
    "_id", "status",
    "driverLocation": { "lat", "lng" },
    "statusFlow": { "current": "onTheWay", "progress": 40 }
  }
}

---

### PUT /api/pet/:bookingId/update-location  [Protected + RiderProtect]
Update driver location during pet delivery.

Body:
{
  "latitude": 24.8607,
  "longitude": 67.0011
}

Pusher: pet-delivery-{bookingId} => driver-location-update { latitude, longitude, timestamp }

---

### GET /api/pet/:bookingId/track  [Protected]
Track driver location for pet delivery.

Response 200:
{
  "success": true,
  "data": {
    "driver": { "name", "phoneNumber", "vehicleDetails" },
    "currentLocation": { "latitude", "longitude" },
    "eta": "5 minutes",
    "deliveryStatus": "onTheWay"
  }
}

---

### GET /api/pet/driver/deliveries  [Protected + RiderProtect]
Get all pet deliveries for logged in driver.

Response 200:
{
  "success": true,
  "count": 3,
  "deliveries": [ ...deliveries ]
}


---

## 7. CHAT APIs  /api/chats

### POST /api/chats/send  [Protected]
Send a message in a ride chat.

Body:
{
  "rideId": "bookingId",
  "message": "I am 2 minutes away",
  "messageType": "text"
}

Response 200:
{
  "success": true,
  "message": { "_id", "rideId", "sender", "message", "createdAt" }
}

---

### GET /api/chats/messages/:rideId  [Protected]
Get all messages for a ride.

Response 200:
{
  "success": true,
  "messages": [
    { "_id", "sender": { "name", "profileImage" }, "message", "createdAt", "isRead" }
  ]
}

---

### PUT /api/chats/read/:rideId  [Protected]
Mark all messages as read.

Response 200:
{
  "success": true,
  "message": "Messages marked as read"
}

---

### DELETE /api/chats/message/:messageId  [Protected]
Delete a message.

Response 200:
{
  "success": true,
  "message": "Message deleted"
}

---

### POST /api/chats/delivery/send  [Protected]
Send message for parcel or pet delivery.

Body:
{
  "bookingId": "deliveryBookingId",
  "bookingType": "parcel",
  "message": "I have picked up the parcel"
}

Response 200:
{
  "success": true,
  "message": { "_id", "bookingId", "sender", "message", "createdAt" }
}

---

### GET /api/chats/delivery/:bookingId  [Protected]
Get messages for parcel or pet delivery.

Query Params: bookingType=parcel or bookingType=pet

Response 200:
{
  "success": true,
  "messages": [ ...messages ]
}

---

### PUT /api/chats/delivery/read/:bookingId  [Protected]
Mark delivery messages as read.

Query Params: bookingType=parcel or bookingType=pet

Response 200:
{
  "success": true,
  "message": "Messages marked as read"
}

---

## 8. REVIEW APIs  /api/reviews

### POST /api/reviews/:bookingId/create  [Protected]
Create a review for a completed ride.

Body:
{
  "rating": 5,
  "comment": "Excellent driver, very professional",
  "bookingType": "cab"
}

Response 201:
{
  "success": true,
  "message": "Review created successfully",
  "review": { "_id", "rating": 5, "comment", "user", "driver", "createdAt" }
}

---

### GET /api/reviews/booking/:bookingId  [Protected]
Get review for a specific booking.

Response 200:
{
  "success": true,
  "review": { "_id", "rating", "comment", "user", "driver", "driverReply" }
}

---

### GET /api/reviews/driver/:driverId/reviews
Get all reviews for a driver (public).

Query Params: page, limit

Response 200:
{
  "success": true,
  "count": 10,
  "averageRating": 4.8,
  "reviews": [ ...reviews ]
}

---

### GET /api/reviews/user/my-reviews  [Protected]
Get all reviews by logged in user.

Response 200:
{
  "success": true,
  "reviews": [ ...reviews ]
}

---

### PUT /api/reviews/:reviewId/update  [Protected]
Update a review.

Body:
{
  "rating": 4,
  "comment": "Updated comment"
}

Response 200:
{
  "success": true,
  "message": "Review updated successfully"
}

---

### DELETE /api/reviews/:reviewId/delete  [Protected]
Delete a review.

Response 200:
{
  "success": true,
  "message": "Review deleted successfully"
}

---

### POST /api/reviews/:reviewId/driver-reply  [Protected + RiderProtect]
Driver replies to a review.

Body:
{
  "reply": "Thank you for your kind words!"
}

Response 200:
{
  "success": true,
  "message": "Reply added successfully"
}

---

### GET /api/reviews/can-review/:bookingId  [Protected]
Check if user can review a booking.

Response 200:
{
  "success": true,
  "canReview": true,
  "reason": null
}


---

## 9. REFERRAL APIs  /api/referral

### GET /api/referral/my-referral  [Protected]
Get my referral code and stats.

Response 200:
{
  "success": true,
  "data": {
    "referralCode": "REFABC123",
    "referralCount": 5,
    "totalEarned": 250,
    "referredUsers": [ { "name", "email", "joinedAt" } ]
  }
}

---

### GET /api/referral/wallet  [Protected]
Get wallet balance from referrals.

Response 200:
{
  "success": true,
  "data": {
    "walletBalance": 250,
    "totalEarned": 500,
    "transactions": [ ...transactions ]
  }
}

---

### POST /api/referral/validate
Validate a referral code before signup.

Body:
{
  "referralCode": "REFABC123"
}

Response 200:
{
  "success": true,
  "valid": true,
  "referredBy": { "name": "John Doe" }
}

---

## 10. SUPPORT APIs  /api/support

### POST /api/support/create  [Protected]
Create a support ticket.

Body:
{
  "subject": "Payment issue",
  "message": "My payment was deducted but ride was cancelled",
  "category": "payment",
  "bookingId": "bookingId"
}

Response 201:
{
  "success": true,
  "message": "Support ticket created",
  "ticket": {
    "_id": "ticketId",
    "subject": "Payment issue",
    "status": "open",
    "ticketNumber": "TKT-001"
  }
}

---

### GET /api/support/my-tickets  [Protected]
Get all my support tickets.

Response 200:
{
  "success": true,
  "tickets": [
    { "_id", "subject", "status": "open", "createdAt", "lastReply" }
  ]
}

---

### GET /api/support/:ticketId  [Protected]
Get a specific ticket with all replies.

Response 200:
{
  "success": true,
  "ticket": {
    "_id", "subject", "message", "status",
    "replies": [ { "sender", "message", "createdAt" } ]
  }
}

---

### POST /api/support/:ticketId/reply  [Protected]
Reply to a support ticket.

Body:
{
  "message": "I have attached the screenshot"
}

Response 200:
{
  "success": true,
  "message": "Reply sent successfully"
}

---

### PUT /api/support/:ticketId/close  [Protected]
Close a support ticket.

Response 200:
{
  "success": true,
  "message": "Ticket closed successfully"
}

---

### GET /api/support/admin/all  [Protected + Admin]
Get all support tickets (admin).

Query Params: status=open|closed|pending, page, limit

Response 200:
{
  "success": true,
  "count": 20,
  "tickets": [ ...tickets ]
}

---

### PUT /api/support/admin/:ticketId/status  [Protected + Admin]
Update ticket status (admin).

Body:
{
  "status": "resolved",
  "adminReply": "Issue has been resolved"
}

Response 200:
{
  "success": true,
  "message": "Ticket status updated"
}

---

## 11. WITHDRAWAL APIs  /api/withdrawal

### GET /api/withdrawal/wallet  [Protected + RiderProtect]
Get driver wallet details.

Response 200:
{
  "success": true,
  "data": {
    "walletBalance": 500,
    "totalEarning": 2500,
    "totalWithdrawn": 2000,
    "pendingEarnings": 0,
    "bankAccount": { "accountTitle", "accountNumber", "bankName", "isVerified" }
  }
}

---

### POST /api/withdrawal/request  [Protected + RiderProtect]
Request a withdrawal.

Body:
{
  "amount": 500,
  "bankAccountId": "bankId"
}

Response 201:
{
  "success": true,
  "message": "Withdrawal request submitted",
  "withdrawal": { "_id", "amount": 500, "status": "pending", "createdAt" }
}

---

### GET /api/withdrawal/history  [Protected + RiderProtect]
Get withdrawal history.

Response 200:
{
  "success": true,
  "withdrawals": [
    { "_id", "amount", "status": "paid", "requestedAt", "paidAt" }
  ]
}

---

### PUT /api/withdrawal/bank-account  [Protected + RiderProtect]
Update bank account details.

Body:
{
  "accountTitle": "James Driver",
  "accountNumber": "1234567890",
  "bankName": "HBL",
  "branchCode": "BR123"
}

Response 200:
{
  "success": true,
  "message": "Bank account updated successfully"
}

---

### GET /api/withdrawal/admin/all  [Protected + Admin]
Get all withdrawal requests (admin).

Query Params: status=pending|approved|rejected|paid, page, limit

Response 200:
{
  "success": true,
  "withdrawals": [ ...withdrawals ]
}

---

### PUT /api/withdrawal/admin/approve/:withdrawalId  [Protected + Admin]
Approve a withdrawal request.

Response 200:
{
  "success": true,
  "message": "Withdrawal approved"
}

---

### PUT /api/withdrawal/admin/reject/:withdrawalId  [Protected + Admin]
Reject a withdrawal request.

Body:
{
  "reason": "Insufficient documents"
}

Response 200:
{
  "success": true,
  "message": "Withdrawal rejected"
}

---

### PUT /api/withdrawal/admin/mark-paid/:withdrawalId  [Protected + Admin]
Mark withdrawal as paid.

Response 200:
{
  "success": true,
  "message": "Withdrawal marked as paid"
}


---

## 12. ADMIN APIs  /api/admin

All admin routes require: Authorization: Bearer ADMIN_TOKEN

### POST /api/admin/login
Admin login.

Body:
{
  "email": "admin@ridelynk.com",
  "password": "adminpassword"
}

Response 200:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": { "_id", "name", "email", "role", "permissions" },
    "token": "ADMIN_JWT_TOKEN"
  }
}

---

### GET /api/admin/dashboard/stats  [Admin]
Get dashboard statistics.

Response 200:
{
  "success": true,
  "data": {
    "users": { "total": 500, "riders": 50, "drivers": 30 },
    "bookings": { "total": 1000, "completed": 800, "pending": 50, "cancelled": 150 },
    "revenue": 45000,
    "pendingVerifications": 5,
    "recentBookings": [ ...10 recent bookings ],
    "recentUsers": [ ...10 recent users ]
  }
}

---

### GET /api/admin/dashboard/chart-data  [Admin]
Get chart data for dashboard graphs.

Query Params: period=7d|30d|90d|1y

Response 200:
{
  "success": true,
  "data": {
    "labels": ["Mon", "Tue", "Wed", ...],
    "rides": [10, 15, 8, ...],
    "revenue": [500, 750, 400, ...],
    "users": [5, 8, 3, ...]
  }
}

---

### GET /api/admin/dashboard/ride-status  [Admin]
Get ride status breakdown.

Response 200:
{
  "success": true,
  "data": {
    "pending": 10,
    "accepted": 5,
    "inProgress": 8,
    "completed": 800,
    "cancelled": 150
  }
}

---

### GET /api/admin/users  [Admin]
Get all users with pagination.

Query Params: page, limit, search, role=customer|driver

Response 200:
{
  "success": true,
  "count": 20,
  "total": 500,
  "users": [
    { "_id", "name", "email", "phoneNumber", "role", "createdAt", "walletBalance" }
  ]
}

---

### GET /api/admin/users/:id  [Admin]
Get user by ID.

Response 200:
{
  "success": true,
  "user": { ...full user data }
}

---

### PUT /api/admin/users/:id  [Admin]
Update user details.

Body:
{
  "name": "Updated Name",
  "phoneNumber": "03001234567",
  "isBlocked": false
}

Response 200:
{
  "success": true,
  "message": "User updated successfully",
  "user": { ...updated user }
}

---

### DELETE /api/admin/users/:id  [Admin]
Delete a user.

Response 200:
{
  "success": true,
  "message": "User deleted successfully"
}

---

### GET /api/admin/drivers  [Admin]
Get all drivers.

Query Params: page, limit, status=active|inactive, verificationStatus=approved|pending|rejected

Response 200:
{
  "success": true,
  "count": 10,
  "total": 30,
  "drivers": [
    {
      "_id", "user": { "name", "email", "phoneNumber" },
      "isVerified", "verificationStatus", "status",
      "rating", "totalRides", "vehicleDetails"
    }
  ]
}

---

### GET /api/admin/drivers/pending  [Admin]
Get all pending driver verification requests.

Response 200:
{
  "success": true,
  "count": 5,
  "drivers": [ ...pending drivers with documents ]
}

---

### GET /api/admin/drivers/:id  [Admin]
Get driver by ID with full details.

Response 200:
{
  "success": true,
  "driver": {
    "_id", "user": { "name", "email" },
    "vehicleDetails", "documents", "rating",
    "totalRides", "totalEarning", "walletBalance"
  }
}

---

### POST /api/admin/drivers/:id/verify  [Admin]
Approve a driver.

Body:
{
  "adminNotes": "All documents verified"
}

Response 200:
{
  "success": true,
  "message": "Driver approved successfully. They can now start driving."
}

---

### POST /api/admin/drivers/:id/reject  [Admin]
Reject a driver.

Body:
{
  "rejectionReason": "License expired",
  "rejectedDocument": "license"
}

Response 200:
{
  "success": true,
  "message": "Driver rejected. They need to resubmit documents."
}

---

### GET /api/admin/rides  [Admin]
Get all rides (cab + parcel + pet).

Query Params: status, type=cab|parcel|pet, page, limit, startDate, endDate

Response 200:
{
  "success": true,
  "count": 20,
  "total": 1000,
  "rides": [ ...rides with user and driver populated ]
}

---

### GET /api/admin/rides/:id  [Admin]
Get ride by ID.

Response 200:
{
  "success": true,
  "ride": { ...full ride with user, driver, statusHistory }
}

---

### PUT /api/admin/rides/:id/status  [Admin]
Update ride status.

Body:
{
  "status": "cancelled",
  "reason": "Admin cancelled due to complaint"
}

Response 200:
{
  "success": true,
  "message": "Ride status updated"
}

---

### DELETE /api/admin/rides/:id  [Admin]
Delete a ride.

Response 200:
{
  "success": true,
  "message": "Ride deleted successfully"
}

---

### GET /api/admin/driver-verifications  [Admin]
Get all driver verification requests.

Response 200:
{
  "success": true,
  "verifications": [ ...drivers with documents ]
}

---

### GET /api/admin/driver-verifications/pending  [Admin]
Get pending verifications only.

Response 200:
{
  "success": true,
  "count": 5,
  "data": [ ...pending drivers ]
}

---

### POST /api/admin/driver-verifications/:id/approve  [Admin]
Approve driver verification.

Body:
{
  "adminNotes": "Documents verified"
}

Response 200:
{
  "success": true,
  "message": "Driver approved successfully"
}

---

### POST /api/admin/driver-verifications/:id/reject  [Admin]
Reject driver verification.

Body:
{
  "rejectionReason": "Blurry documents",
  "rejectedDocument": "license"
}

Response 200:
{
  "success": true,
  "message": "Driver rejected"
}

---

### GET /api/admin/analytics/overview  [Admin]
Get analytics overview.

Response 200:
{
  "success": true,
  "data": {
    "totalRevenue": 45000,
    "totalRides": 1000,
    "totalUsers": 500,
    "totalDrivers": 30,
    "avgRating": 4.7,
    "completionRate": "80%"
  }
}

---

### GET /api/admin/analytics/revenue  [Admin]
Get revenue analytics.

Query Params: period=7d|30d|90d|1y

Response 200:
{
  "success": true,
  "data": {
    "totalRevenue": 45000,
    "byPeriod": [ { "date": "2024-01-15", "revenue": 1500 } ],
    "byType": { "cab": 30000, "parcel": 10000, "pet": 5000 }
  }
}

---

### GET /api/admin/analytics/rides  [Admin]
Get ride analytics.

Response 200:
{
  "success": true,
  "data": {
    "totalRides": 1000,
    "byStatus": { "completed": 800, "cancelled": 150, "pending": 50 },
    "byType": { "cab": 600, "parcel": 300, "pet": 100 },
    "byDay": [ { "date": "2024-01-15", "count": 45 } ]
  }
}

---

### GET /api/admin/recent-activities  [Admin]
Get recent platform activities.

Response 200:
{
  "success": true,
  "activities": [
    { "type": "new_booking", "message": "New cab booking created", "timestamp": "..." },
    { "type": "driver_verified", "message": "Driver James approved", "timestamp": "..." }
  ]
}

---

### GET /api/admin/settings  [Admin]
Get platform settings.

Response 200:
{
  "success": true,
  "settings": {
    "driverCommission": 80,
    "platformFee": 20,
    "referralBonus": 50,
    "minWithdrawal": 100,
    "maxWithdrawal": 10000
  }
}

---

### PUT /api/admin/settings  [Admin]
Update platform settings.

Body:
{
  "driverCommission": 80,
  "platformFee": 20,
  "referralBonus": 50,
  "minWithdrawal": 100
}

Response 200:
{
  "success": true,
  "message": "Settings updated successfully"
}

---

### GET /api/admin/referral/earnings  [Admin]
Get all referral earnings.

Response 200:
{
  "success": true,
  "data": {
    "totalReferralEarnings": 5000,
    "transactions": [ ...referral transactions ]
  }
}

---

### GET /api/admin/referral/earnings/:userId  [Admin]
Get referral earnings for a specific user.

Response 200:
{
  "success": true,
  "data": {
    "user": { "name", "email" },
    "referralCode": "REFABC123",
    "totalEarned": 250,
    "transactions": [ ...transactions ]
  }
}

---

### GET /api/admin/promotions  [Admin]
Get all promotions.

Response 200:
{
  "success": true,
  "promotions": [
    { "_id", "code": "SAVE20", "discount": 20, "type": "percentage", "isActive": true }
  ]
}

---

### POST /api/admin/promotions  [Admin]
Create a promotion.

Body:
{
  "code": "SAVE20",
  "discount": 20,
  "type": "percentage",
  "minOrderValue": 100,
  "maxDiscount": 50,
  "expiryDate": "2024-12-31",
  "usageLimit": 100
}

Response 201:
{
  "success": true,
  "message": "Promotion created successfully",
  "promotion": { "_id", "code": "SAVE20", "discount": 20 }
}

---

### PUT /api/admin/promotions/:id  [Admin]
Update a promotion.

Body:
{
  "isActive": false,
  "expiryDate": "2025-01-31"
}

Response 200:
{
  "success": true,
  "message": "Promotion updated successfully"
}

---

### DELETE /api/admin/promotions/:id  [Admin]
Delete a promotion.

Response 200:
{
  "success": true,
  "message": "Promotion deleted successfully"
}

---

## 13. RIDE TYPES API  /api

### GET /api/ride-types
Get all available ride/vehicle types.

Response 200:
{
  "success": true,
  "rideTypes": [
    {
      "_id": "typeId",
      "name": "Economy",
      "category": "cab",
      "basePrice": 50,
      "pricePerKm": 10,
      "capacity": 4,
      "features": "AC, 4 Seats",
      "icon": "url"
    }
  ]
}

---

## 14. PUSHER REAL-TIME CHANNELS

### Channel: ride-{bookingId}
Subscribe when user opens a ride booking.

Events:
- ride-status-update: Fires on every status change
  {
    "bookingId", "type": "cab", "status": "accepted|onTheWay|arrived|inProgress|completed|cancelled",
    "booking": { id, status, fare, distance, duration, pickup, dropoff, timestamps, statusHistory },
    "user": { id, name, email, phone, profileImage },
    "driver": { id, name, phone, profileImage, rating, totalRides, currentLocation, vehicle },
    "timestamp": "..."
  }

- driver-location-update: Fires every time driver updates location
  {
    "driverId": "...",
    "latitude": 24.8607,
    "longitude": 67.0011,
    "status": "inProgress",
    "timestamp": "..."
  }

---

### Channel: parcel-delivery-{bookingId}
Subscribe when user opens a parcel delivery.

Events:
- delivery-accepted: When driver accepts
  { "bookingId", "status": "accepted", "driver": { id, name } }

- delivery-status-update: On every status change
  { "bookingId", "status": "onTheWay|arrived|inProgress|completed|cancelled", "timestamp" }

- driver-location-update: Driver live location
  { "driverId", "latitude", "longitude", "timestamp" }

---

### Channel: pet-delivery-{bookingId}
Subscribe when user opens a pet delivery.

Events:
- delivery-accepted: When driver accepts
- delivery-status-update: On every status change
- driver-location-update: Driver live location

---

### Channel: ride-bookings
Global channel for new cab ride notifications to drivers.
Event: new-ride-booking { bookingId, type, fare, distance, pickupLocationName, ... }

### Channel: parcel-bookings
Global channel for new parcel notifications to drivers.
Event: new-parcel-booking { bookingId, type, fare, distance, ... }

### Channel: pet-bookings
Global channel for new pet delivery notifications to drivers.
Event: new-pet-booking { bookingId, type, petName, petType, fare, ... }

### Channel: rider-{riderId}
Personal channel for each driver.
Events: new-ride-booking, new-parcel-booking, new-pet-booking

---

## 15. STATUS FLOW

### Cab Ride Status Flow:
pending -> accepted -> onTheWay -> arrived -> inProgress -> completed
                                                         -> cancelled (any stage)

### Parcel / Pet Delivery Status Flow:
pending -> accepted -> onTheWay -> arrived -> inProgress -> completed
                                                         -> cancelled (any stage)

### Status Progress %:
- pending: 0%
- accepted: 20%
- onTheWay: 40%
- arrived: 60%
- inProgress: 80%
- completed: 100%
- cancelled: 0%

---

## 16. ERROR RESPONSES

All APIs return errors in this format:

Response 400 (Bad Request):
{
  "success": false,
  "message": "Specific error message"
}

Response 401 (Unauthorized):
{
  "success": false,
  "message": "Not authorized, token failed"
}

Response 403 (Forbidden):
{
  "success": false,
  "message": "Access denied"
}

Response 404 (Not Found):
{
  "success": false,
  "message": "Resource not found"
}

Response 500 (Server Error):
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}

