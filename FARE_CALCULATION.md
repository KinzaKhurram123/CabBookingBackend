# Fare Calculation System

## Overview
The fare calculation system uses a dynamic pricing model based on distance, time, and peak hours.

## Pricing Formula

```
Step 1: Distance Cost = Miles × $1.20
Step 2: Time Cost = Minutes × $0.30
Step 3: Subtotal = Base Fare ($1.50) + Distance Cost + Time Cost
Step 4: Total Fare = Subtotal × Peak Hour Multiplier (if applicable)
```

## Pricing Constants

- **Base Fare**: $1.50
- **Per Mile Rate**: $1.20
- **Per Minute Rate**: $0.30
- **Peak Hour Multiplier**: 1.8x

## Peak Hours

Peak hour pricing applies during:
- **Morning Rush**: 7:00 AM - 9:00 AM
- **Evening Rush**: 5:00 PM - 7:00 PM

## Example Calculation

**Scenario**: 8 miles, 15 minutes, 5:30 PM (Peak Hour)

```
Distance Cost: 8 × $1.20 = $9.60
Time Cost: 15 × $0.30 = $4.50
Subtotal: $1.50 + $9.60 + $4.50 = $15.60
Peak Hour: 1.8x multiplier
Total Fare: $15.60 × 1.8 = $28.08
```

## API Endpoints

### 1. Estimate Fare

**Endpoint**: `POST /api/ridebooking/estimate-fare`

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "distance": 8,
  "time": 15,
  "bookingTime": "2024-01-15T17:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Fare estimated successfully",
  "data": {
    "baseFare": 1.5,
    "distanceCost": 9.6,
    "timeCost": 4.5,
    "subtotal": 15.6,
    "isPeakHour": true,
    "peakMultiplier": 1.8,
    "totalFare": 28.08,
    "breakdown": {
      "distance": "8 miles × $1.2 = $9.60",
      "time": "15 minutes × $0.3 = $4.50",
      "peakHour": "Peak hour multiplier: 1.8x"
    }
  }
}
```

### 2. Create Ride Booking (with automatic fare calculation)

**Endpoint**: `POST /api/ridebooking/ridebook`

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "category": "ride",
  "pickupLocation": {
    "type": "Point",
    "coordinates": [-74.006, 40.7128],
    "address": "123 Main St"
  },
  "dropoffLocation": {
    "type": "Point",
    "coordinates": [-73.935, 40.730],
    "address": "456 Park Ave"
  },
  "distance": 8,
  "time": 15,
  "bookingTime": "2024-01-15T17:30:00Z",
  "selectedVehicle": {
    "id": "vehicle123",
    "name": "Standard Sedan",
    "capacity": 4
  },
  "paymentMethod": "Card"
}
```

**Note**: If `fare` is not provided in the request, the system will automatically calculate it based on `distance`, `time`, and `bookingTime`.

**Response**:
```json
{
  "success": true,
  "message": "Ride booked successfully",
  "booking": {
    "_id": "booking123",
    "user": "user123",
    "fare": 28.08,
    "distance": 8,
    "time": 15,
    "status": "pending",
    "fareBreakdown": {
      "baseFare": 1.5,
      "distanceCost": 9.6,
      "timeCost": 4.5,
      "subtotal": 15.6,
      "isPeakHour": true,
      "peakMultiplier": 1.8,
      "totalFare": 28.08,
      "breakdown": {
        "distance": "8 miles × $1.2 = $9.60",
        "time": "15 minutes × $0.3 = $4.50",
        "peakHour": "Peak hour multiplier: 1.8x"
      }
    }
  }
}
```

## Usage in Code

```javascript
const { calculateRideFare, isPeakHour } = require('./utils/fareCalculator');

// Calculate fare
const fareDetails = calculateRideFare(8, 15, new Date('2024-01-15T17:30:00Z'));
console.log(fareDetails.totalFare); // 28.08

// Check if current time is peak hour
const isPeak = isPeakHour(new Date());
console.log(isPeak); // true or false
```

## Testing

Run the test file to verify fare calculations:

```bash
node test/testFareCalculation.js
```

## Future Enhancements

- Weight-based pricing for parcel deliveries
- Pet-type-based pricing for pet deliveries
- Dynamic surge pricing based on demand
- Distance-based peak hour zones
- Seasonal pricing adjustments
