# EventFlux - Scalable Event Booking Backend

A comprehensive, production-ready backend system for event ticket booking with advanced concurrency handling, analytics, and admin features.

##  Features

### Core Functionality
- **User Management**: Registration, authentication, profile management
- **Event Management**: Create, update, delete events with rich metadata
- **Ticket Booking**: Concurrent booking system with inventory protection
- **Booking Management**: View, cancel bookings with business rules
- **Waitlist System**: Join waitlists when events are full
- **Analytics Dashboard**: Comprehensive booking and event analytics

### Technical Features
- **Concurrency Control**: Row-level locking prevents overselling
- **Rate Limiting**: Different limits for different endpoints
- **Input Validation**: Comprehensive request validation with Joi
- **Error Handling**: Structured error responses with proper HTTP codes
- **Security**: JWT authentication, password hashing, SQL injection protection
- **Scheduled Jobs**: Automated cleanup and analytics updates
- **Database Optimization**: Proper indexing and query optimization

##  Architecture

### Database Design
```
Users ──┐
        ├─── Events ──┐
        └─── Bookings ├─── Waitlist
             │        └─── Seats (optional)
             └─── Booking Analytics
```

### Key Design Decisions

1. **Concurrency Handling**: Uses PostgreSQL row-level locking with `FOR UPDATE` to prevent race conditions during booking
2. **Database Triggers**: Automatic ticket count updates when bookings are created/cancelled
3. **Waitlist System**: Automatic notifications when tickets become available
4. **Rate Limiting**: Tiered rate limiting based on endpoint sensitivity
5. **Modular Architecture**: Clean separation of routes, models, and middleware

##  API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Events
- `GET /api/events` - List events (with filtering and pagination)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (admin only)
- `PUT /api/events/:id` - Update event (admin/creator only)
- `DELETE /api/events/:id` - Delete event (admin/creator only)
- `GET /api/events/:id/stats` - Event statistics (admin only)

### Bookings
- `GET /api/bookings` - User's bookings
- `GET /api/bookings/:id` - Single booking details
- `GET /api/bookings/reference/:reference` - Booking by reference
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Waitlist
- `GET /api/waitlist` - User's waitlist entries
- `POST /api/waitlist/join` - Join waitlist
- `DELETE /api/waitlist/:event_id` - Leave waitlist
- `GET /api/waitlist/notifications` - Get notifications

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - All users
- `GET /api/admin/events` - All events
- `GET /api/admin/health` - System health check

##  Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (recommend Neon DB)
- npm or yarn

### Environment Setup

1. Create `.env` file:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_TICKETS_PER_USER=10
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Or start production server
npm start
```

##  Database Migrations

The system includes a comprehensive migration system:

```bash
# Run migrations (creates tables, indexes, triggers, sample data)
npm run migrate
```

### Key Database Features

1. **Row Level Security**: All tables have RLS enabled
2. **Automated Triggers**: Ticket counts update automatically
3. **Optimized Indexes**: For performance on common queries
4. **Sample Data**: Realistic test data for development
5. **Analytics Tables**: Pre-aggregated data for fast reporting

##  Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Tiered limits based on endpoint sensitivity
- **Input Validation**: Comprehensive validation with Joi schemas
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable cross-origin policies
- **Helmet.js**: Security headers
- **Error Sanitization**: Prevent information leakage

##  Performance Optimizations

- **Database Indexing**: Strategic indexes on commonly queried columns
- **Connection Pooling**: Efficient database connection management
- **Compression**: Response compression with gzip
- **Query Optimization**: Efficient joins and aggregations
- **Pagination**: Built-in pagination for large datasets
- **Caching Headers**: Appropriate cache control headers

##  Analytics & Monitoring

### Built-in Analytics
- Total bookings and revenue
- Event popularity rankings
- Cancellation rates
- Daily booking trends
- Capacity utilization
- User engagement metrics

### Health Monitoring
- Database connectivity checks
- Memory and CPU usage
- Response time monitoring
- Error rate tracking

##  Testing

### Manual Testing
The API includes comprehensive error handling and validation that can be tested with tools like:
- Postman
- curl
- Thunder Client (VS Code)

### Sample Test Flows

1. **User Registration & Login**
2. **Event Creation** (admin)
3. **Concurrent Booking** (test race conditions)
4. **Waitlist Functionality**
5. **Analytics Retrieval**

##  Deployment

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL=your-production-db-url
JWT_SECRET=your-production-jwt-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Deployment Platforms
- **Render**: Simple deployment with built-in PostgreSQL
- **Railway**: Git-based deployment with database
- **Heroku**: Classic platform with add-ons
- **DigitalOcean**: App platform with managed databases

### Production Considerations
1. **Environment Variables**: Secure secret management
2. **Database**: Use managed PostgreSQL service
3. **Monitoring**: Set up application monitoring
4. **Backup**: Regular database backups
5. **SSL**: HTTPS termination at load balancer
6. **Logging**: Structured logging for debugging

##  Development

### Project Structure
```
├── config/
│   └── database.js          # Database connection and utilities
├── migrations/
│   ├── migrate.js           # Migration runner
│   └── schema.sql           # Database schema
├── models/
│   ├── User.js             # User model
│   ├── Event.js            # Event model
│   ├── Booking.js          # Booking model
│   └── Waitlist.js         # Waitlist model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── events.js           # Event management
│   ├── bookings.js         # Booking operations
│   ├── waitlist.js         # Waitlist operations
│   └── admin.js            # Admin operations
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── validation.js       # Input validation
│   ├── rateLimiter.js      # Rate limiting
│   └── errorHandler.js     # Error handling
├── jobs/
│   └── scheduler.js        # Scheduled tasks
└── server.js               # Main application file
```

### Code Style
- ES6+ modern JavaScript
- Async/await for asynchronous operations
- Comprehensive error handling
- Clean, readable code with comments
- Modular architecture

##  Scalability Considerations

### Current Implementation
- **Database**: PostgreSQL with proper indexing
- **Connection Pooling**: Up to 20 concurrent connections
- **Rate Limiting**: Request throttling
- **Efficient Queries**: Optimized database queries

### Future Scaling Options
1. **Database Sharding**: Partition by event date or geography
2. **Read Replicas**: Separate read/write operations
3. **Caching Layer**: Redis for frequently accessed data
4. **Load Balancing**: Multiple server instances
5. **Message Queues**: Async processing for heavy operations

##  Business Logic

### Booking Rules
- Maximum 10 tickets per booking
- Cancellation allowed until 24 hours before event
- No duplicate bookings for same user/event
- Automatic waitlist notification when tickets available

### Event Rules
- Events can't be deleted if they have confirmed bookings
- Capacity can't be reduced below booked tickets
- Events automatically marked as completed after event date

### Waitlist Rules
- Users automatically notified when tickets available
- Priority based on join time (FIFO)
- Notifications expire if not acted upon

##  Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is accessible
   - Check firewall settings

2. **JWT Token Errors**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper Authorization header format

3. **Rate Limiting Issues**
   - Check rate limit configuration
   - Monitor request patterns
   - Adjust limits for production

4. **Booking Race Conditions**
   - System uses row-level locking
   - Check transaction isolation
   - Monitor concurrent booking patterns


**EventFlux Backend - Built for scale, designed for performance! 🎉**
