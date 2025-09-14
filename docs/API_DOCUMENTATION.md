# Evently API Documentation

## Base URL

```
Production: https://domain-name/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer your_jwt_token_here
```

## Response Format

All API responses follow this format:

```json
{
  "message": "Description of the operation",
  "data": {...},  // or "events", "bookings", etc.
  "error": "Error description (on errors only)"
}
```

## Error Responses

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {...} // Additional error details if available
}
```

---

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### Login User

```http
POST /api/auth/login
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### Get Profile

```http
GET /api/auth/profile
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "created_at": "2025-01-11T..."
  }
}
```

---

## Events Endpoints

### List Events

```http
GET /api/events?page=1&limit=10&category=technology&search=conference
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `category` (string): Filter by category
- `search` (string): Search in name and description
- `date_from` (date): Events after this date
- `date_to` (date): Events before this date
- `available_only` (boolean): Only events with available tickets
- `sort_by` (string): Sort by `event_date`, `price`, `capacity`, `name`
- `sort_order` (string): `asc` or `desc`

**Response (200):**

```json
{
  "message": "Events retrieved successfully",
  "events": [
    {
      "id": 1,
      "name": "Tech Conference 2025",
      "description": "Annual technology conference...",
      "venue": "Convention Center",
      "address": "123 Tech Street...",
      "event_date": "2025-02-15T09:00:00Z",
      "capacity": 500,
      "available_tickets": 450,
      "booked_tickets": 50,
      "price": "99.99",
      "category": "technology",
      "image_url": "https://...",
      "status": "active",
      "created_by_name": "Admin User"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Get Single Event

```http
GET /api/events/:id
```

**Response (200):**

```json
{
  "message": "Event retrieved successfully",
  "event": {
    "id": 1,
    "name": "Tech Conference 2025"
    // ... all event fields
  }
}
```

### Create Event (Admin Only)

```http
POST /api/events
Authorization: Bearer {admin_token}
```

**Body:**

```json
{
  "name": "New Event",
  "description": "Event description",
  "venue": "Event Venue",
  "address": "123 Event Street",
  "event_date": "2025-03-15T10:00:00Z",
  "capacity": 100,
  "price": 50.0,
  "category": "business",
  "image_url": "https://example.com/image.jpg",
  "status": "active"
}
```

### Update Event (Admin/Creator Only)

```http
PUT /api/events/:id
Authorization: Bearer {token}
```

### Delete Event (Admin/Creator Only)

```http
DELETE /api/events/:id
Authorization: Bearer {token}
```

---

## Booking Endpoints

### Get User Bookings

```http
GET /api/bookings?status=confirmed&upcoming_only=true
Authorization: Bearer {token}
```

**Query Parameters:**

- `status` (string): Filter by status (`confirmed`, `cancelled`)
- `upcoming_only` (boolean): Only future events

**Response (200):**

```json
{
  "message": "Bookings retrieved successfully",
  "bookings": [
    {
      "id": 1,
      "user_id": 1,
      "event_id": 1,
      "event_name": "Tech Conference 2025",
      "venue": "Convention Center",
      "event_date": "2025-02-15T09:00:00Z",
      "quantity": 2,
      "total_amount": "199.98",
      "status": "confirmed",
      "booking_reference": "EVT-1705123456789-ABC123",
      "booked_at": "2025-01-11T10:00:00Z"
    }
  ]
}
```

### Get Booking by Reference

```http
GET /api/bookings/reference/:reference
```

**Response (200):**

```json
{
  "message": "Booking retrieved successfully",
  "booking": {
    "id": 1,
    "booking_reference": "EVT-1705123456789-ABC123",
    "event_name": "Tech Conference 2025",
    "venue": "Convention Center",
    "event_date": "2025-02-15T09:00:00Z",
    "quantity": 2,
    "total_amount": "199.98",
    "status": "confirmed",
    "booked_at": "2025-01-11T10:00:00Z"
  }
}
```

### Create Booking

```http
POST /api/bookings
Authorization: Bearer {token}
```

**Body:**

```json
{
  "event_id": 1,
  "quantity": 2
}
```

**Response (201):**

```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": 1,
    "user_id": 1,
    "event_id": 1,
    "quantity": 2,
    "total_amount": "199.98",
    "status": "confirmed",
    "booking_reference": "EVT-1705123456789-ABC123",
    "booked_at": "2025-01-11T10:00:00Z",
    "event_name": "Tech Conference 2025",
    "venue": "Convention Center",
    "event_date": "2025-02-15T09:00:00Z"
  }
}
```

### Cancel Booking

```http
PUT /api/bookings/:id/cancel
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "message": "Booking cancelled successfully",
  "booking": {
    "id": 1,
    "status": "cancelled",
    "cancelled_at": "2025-01-11T15:00:00Z"
  }
}
```

---

## Waitlist Endpoints

### Get User Waitlist

```http
GET /api/waitlist
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "message": "Waitlist entries retrieved successfully",
  "waitlist": [
    {
      "id": 1,
      "user_id": 1,
      "event_id": 1,
      "event_name": "Sold Out Event",
      "venue": "Popular Venue",
      "event_date": "2025-02-20T19:00:00Z",
      "quantity": 2,
      "status": "waiting",
      "joined_at": "2025-01-11T12:00:00Z"
    }
  ]
}
```

### Join Waitlist

```http
POST /api/waitlist/join
Authorization: Bearer {token}
```

**Body:**

```json
{
  "event_id": 1,
  "quantity": 2
}
```

### Leave Waitlist

```http
DELETE /api/waitlist/:event_id
Authorization: Bearer {token}
```

### Get Waitlist Notifications

```http
GET /api/waitlist/notifications
Authorization: Bearer {token}
```

---

## Admin Endpoints

### Dashboard Statistics

```http
GET /api/admin/dashboard
Authorization: Bearer {admin_token}
```

**Response (200):**

```json
{
  "message": "Dashboard statistics retrieved successfully",
  "stats": {
    "users": {
      "total": 150,
      "admins": 2,
      "regular": 148
    },
    "events": {
      "total": 25,
      "active": 20
    },
    "bookings": {
      "total_bookings": 500,
      "confirmed_bookings": 450,
      "cancelled_bookings": 50,
      "total_revenue": "25000.00",
      "avg_booking_value": "55.56",
      "total_tickets_sold": 800
    },
    "popular_events": [...]
  }
}
```

### Get All Users (Admin)

```http
GET /api/admin/users
Authorization: Bearer {admin_token}
```

### Get User Details (Admin)

```http
GET /api/admin/users/:id
Authorization: Bearer {admin_token}
```

### System Health Check (Admin)

```http
GET /api/admin/health
Authorization: Bearer {admin_token}
```

---

## Error Codes

| Code                           | Description                             |
| ------------------------------ | --------------------------------------- |
| `MISSING_TOKEN`                | Authorization token is required         |
| `INVALID_TOKEN`                | Token is invalid or malformed           |
| `TOKEN_EXPIRED`                | Token has expired                       |
| `INSUFFICIENT_PERMISSIONS`     | User doesn't have required permissions  |
| `USER_ALREADY_EXISTS`          | Email is already registered             |
| `INVALID_CREDENTIALS`          | Login credentials are incorrect         |
| `EVENT_NOT_FOUND`              | Event doesn't exist                     |
| `BOOKING_NOT_FOUND`            | Booking doesn't exist                   |
| `INSUFFICIENT_AVAILABILITY`    | Not enough tickets available            |
| `DUPLICATE_BOOKING`            | User already has booking for this event |
| `CANCELLATION_DEADLINE_PASSED` | Cannot cancel within 24 hours           |
| `RATE_LIMIT_EXCEEDED`          | Too many requests                       |
| `VALIDATION_ERROR`             | Request validation failed               |

---

## Rate Limits

| Endpoint Type  | Limit        | Window     |
| -------------- | ------------ | ---------- |
| General API    | 100 requests | 15 minutes |
| Authentication | 10 requests  | 15 minutes |
| Booking        | 5 requests   | 1 minute   |
| Admin          | 30 requests  | 1 minute   |

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable
