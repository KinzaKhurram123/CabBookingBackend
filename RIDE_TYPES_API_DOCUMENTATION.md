# Ride Types API Documentation

## Overview
Admin can manage ride types (vehicle categories) with pricing, features, and availability. Users can view active ride types grouped by category.

---

## User APIs

### 1. Get All Ride Types (Grouped)

**Endpoint:** `GET /api/ride-types`

**Auth Required:** No

**Description:** Returns all active ride types grouped by category (standard, economy, premium, special)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride types fetched successfully",
  "data": {
    "standard": {
      "category": "Lynk Standard",
      "description": "Standard rides for everyday commuting",
      "icon": "local-taxi",
      "color": "#2196F3",
      "rides": [
        {
          "id": "lynk_x",
          "name": "Lynk X",
          "description": "Budget-friendly everyday rides",
          "features": ["Budget-friendly", "Everyday rides"],
          "priceModel": "varies",
          "basePrice": 50,
          "pricePerKm": 12,
          "pricePerMin": 1.5,
          "capacity": 4,
          "timeEstimate": "Real time in Minutes, wait time",
          "luggageCapacity": 2,
          "icon": "car",
          "isActive": true
        }
      ]
    }
  }
}
```

---

## Admin APIs

### 2. Get All Ride Types (List)

**Endpoint:** `GET /api/admin/ride-types`

**Auth Required:** Yes (Admin Token)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page |
| category | String | - | Filter by category |
| isActive | Boolean | - | Filter by active status |

**Example:**
```
GET /api/admin/ride-types?page=1&limit=10&category=standard&isActive=true
```

**Success Response (200):**
```json
{
  "success": true,
  "total": 12,
  "page": 1,
  "pages": 2,
  "data": [
    {
      "_id": "...",
      "category": "standard",
      "categoryDisplayName": "Lynk Standard",
      "categoryDescription": "Standard rides for everyday commuting",
      "categoryIcon": "local-taxi",
      "categoryColor": "#2196F3",
      "rideId": "lynk_x",
      "name": "Lynk X",
      "description": "Budget-friendly everyday rides",
      "features": ["Budget-friendly", "Everyday rides"],
      "priceModel": "varies",
      "basePrice": 50,
      "pricePerKm": 12,
      "pricePerMin": 1.5,
      "capacity": 4,
      "luggageCapacity": 2,
      "timeEstimate": "Real time in Minutes, wait time",
      "icon": "car",
      "isActive": true,
      "order": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### 3. Get Single Ride Type

**Endpoint:** `GET /api/admin/ride-types/:id`

**Auth Required:** Yes (Admin Token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "category": "standard",
    "rideId": "lynk_x",
    "name": "Lynk X",
    ...
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Ride type not found"
}
```

---

### 4. Create Ride Type

**Endpoint:** `POST /api/admin/ride-types`

**Auth Required:** Yes (Admin Token)

**Request Body:**
```json
{
  "category": "standard",
  "categoryDisplayName": "Lynk Standard",
  "categoryDescription": "Standard rides for everyday commuting",
  "categoryIcon": "local-taxi",
  "categoryColor": "#2196F3",
  "rideId": "lynk_x",
  "name": "Lynk X",
  "description": "Budget-friendly everyday rides",
  "features": ["Budget-friendly", "Everyday rides", "Comfortable seating"],
  "priceModel": "varies",
  "basePrice": 50,
  "pricePerKm": 12,
  "pricePerMin": 1.5,
  "capacity": 4,
  "luggageCapacity": 2,
  "timeEstimate": "Real time in Minutes, wait time",
  "icon": "car",
  "isActive": true,
  "order": 1
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | String | Yes | Category: standard, economy, premium, special |
| categoryDisplayName | String | Yes | Display name for category |
| categoryDescription | String | No | Category description |
| categoryIcon | String | No | Icon for category |
| categoryColor | String | No | Color code for category |
| rideId | String | Yes | Unique ride identifier |
| name | String | Yes | Ride type name |
| description | String | No | Ride description |
| features | Array | No | List of features |
| priceModel | String | No | Pricing model (default: "varies") |
| basePrice | Number | Yes | Base fare |
| pricePerKm | Number | Yes | Price per kilometer |
| pricePerMin | Number | Yes | Price per minute |
| capacity | Number | Yes | Passenger capacity |
| luggageCapacity | Number | No | Luggage capacity (default: 2) |
| timeEstimate | String | No | Time estimate text |
| icon | String | No | Icon name (default: "car") |
| isActive | Boolean | No | Active status (default: true) |
| order | Number | No | Display order (default: 0) |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Ride type created successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| 400 | Required fields missing |
| 400 | Ride type with this ID already exists |

---

### 5. Update Ride Type

**Endpoint:** `PUT /api/admin/ride-types/:id`

**Auth Required:** Yes (Admin Token)

**Request Body:** (any fields to update)
```json
{
  "basePrice": 60,
  "pricePerKm": 15,
  "isActive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride type updated successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| 404 | Ride type not found |
| 400 | Ride type with this ID already exists (if rideId changed) |

---

### 6. Delete Ride Type

**Endpoint:** `DELETE /api/admin/ride-types/:id`

**Auth Required:** Yes (Admin Token)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride type deleted successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Ride type not found"
}
```

---

### 7. Toggle Active Status

**Endpoint:** `PATCH /api/admin/ride-types/:id/toggle`

**Auth Required:** Yes (Admin Token)

**Description:** Toggle ride type active/inactive status

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride type activated successfully",
  "data": {
    "_id": "...",
    "isActive": true,
    ...
  }
}
```

---

## Ride Type Model Schema

| Field | Type | Description |
|-------|------|-------------|
| category | String | Category (standard/economy/premium/special) |
| categoryDisplayName | String | Display name for category |
| categoryDescription | String | Category description |
| categoryIcon | String | Icon for category |
| categoryColor | String | Color code for category |
| rideId | String | Unique ride identifier |
| name | String | Ride type name |
| description | String | Ride description |
| features | Array | List of features |
| priceModel | String | Pricing model |
| basePrice | Number | Base fare |
| pricePerKm | Number | Price per kilometer |
| pricePerMin | Number | Price per minute |
| capacity | Number | Passenger capacity |
| luggageCapacity | Number | Luggage capacity |
| timeEstimate | String | Time estimate text |
| icon | String | Icon name |
| isActive | Boolean | Active status |
| order | Number | Display order |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

---

## Categories

| Category | Description |
|----------|-------------|
| standard | Standard rides for everyday commuting |
| economy | Economy rides with special features |
| premium | Premium luxury rides |
| special | Specialized rides (wheelchair accessible, etc.) |

---

## Example Usage

### Create New Ride Type (Admin):
```bash
curl -X POST http://localhost:5000/api/admin/ride-types \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "standard",
    "categoryDisplayName": "Lynk Standard",
    "rideId": "lynk_x",
    "name": "Lynk X",
    "description": "Budget-friendly everyday rides",
    "features": ["Budget-friendly", "Everyday rides"],
    "basePrice": 50,
    "pricePerKm": 12,
    "pricePerMin": 1.5,
    "capacity": 4
  }'
```

### Update Pricing (Admin):
```bash
curl -X PUT http://localhost:5000/api/admin/ride-types/RIDE_TYPE_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "basePrice": 60,
    "pricePerKm": 15
  }'
```

### Get Ride Types (User):
```bash
curl -X GET http://localhost:5000/api/ride-types
```

---

## Notes

- Only active ride types (`isActive: true`) are shown to users
- Admin can manage all ride types regardless of status
- `rideId` must be unique across all ride types
- Pricing is calculated as: `basePrice + (distance * pricePerKm) + (time * pricePerMin)`
- Categories help organize ride types in the user interface
- `order` field controls display sequence within each category
