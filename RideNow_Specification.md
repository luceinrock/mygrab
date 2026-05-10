# RideNow - Ride Hailing App Specification Document

## Executive Summary

**RideNow** is a ride-hailing platform designed for the Philippine market, connecting riders with drivers through a mobile application. This pilot project focuses on Android-first deployment with plans to expand to iOS via Kotlin Multiplatform (KMP). The system leverages modern, cost-effective technologies including Supabase for backend services, Express.js for API logic, and Mapbox for mapping services.

### Key Objectives
- Launch MVP in the Philippines targeting major urban areas (Metro Manila, Cebu, Davao)
- Provide safe, affordable, and reliable transportation
- Support local payment methods (GCash, PayMaya, Cash)
- Build a scalable architecture with pluggable components for future upgrades
- Achieve 10,000 active users and 5,000 registered drivers within 6 months post-launch

---

## System Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Mobile Frontend** | Kotlin (Android), KMP (future iOS) | Rider & Driver apps |
| **Admin Frontend** | React | Dashboard for operations, support, analytics |
| **Backend API** | Express.js (TypeScript) | Business logic, API endpoints |
| **Database** | Supabase (PostgreSQL) | Data storage, relations |
| **Authentication** | Supabase Auth | User management, JWT tokens |
| **Real-time Events** | Supabase Realtime | Live tracking, ride updates, notifications |
| **Push Notifications** | OneSignal | Ride alerts, promotions, reminders |
| **Maps & Geolocation** | Mapbox (Free Tier) | Maps, routing, geocoding, distance matrix |
| **File Storage** | Render.com Storage | Driver documents, vehicle photos, profile images |
| **Hosting** | Render.com | Backend API, Admin frontend, Mobile app backend services |
| **CI/CD** | GitHub Actions | Automated testing, building, deployment |
| **Payment Gateway** | GCash, PayMaya, Cash | Local payment processing |

### Architecture Diagram

```
┌─────────────────┐      ┌─────────────────┐
│   Rider App     │      │   Driver App    │
│   (Kotlin)      │      │   (Kotlin)      │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │         HTTPS          │
         └───────────┬────────────┘
                     │
         ┌───────────▼────────────┐
         │   Express.js API       │
         │   (Render.com)         │
         └───────────┬────────────┘
                     │
         ┌───────────▼────────────┐
         │   Supabase             │
         │   - PostgreSQL DB      │
         │   - Auth               │
         │   - Realtime           │
         │   - Storage            │
         └───────────┬────────────┘
                     │
         ┌───────────▼────────────┐
         │   Third-party Services │
         │   - Mapbox (Maps)      │
         │   - OneSignal (Push)   │
         │   - GCash/PayMaya      │
         └────────────────────────┘
                     
┌─────────────────┐
│  Admin Dashboard│
│   (React)       │
└────────┬────────┘
         │
         └──────────► Express.js API
```

### Key Design Principles

1. **Pluggable Components**: All external services (maps, payments, notifications) are abstracted behind interfaces for easy replacement
2. **Location Batching**: Driver location updates batched every 5-10 seconds to reduce API calls (acceptable for pilot)
3. **Real-time via Supabase**: Leverage Supabase Realtime subscriptions for live ride status, driver location, and chat
4. **Cost Optimization**: Use free tiers initially (Mapbox free tier: 50k loads/month, Supabase free tier: 500MB DB, 2GB bandwidth)
5. **Philippine-First**: Localized for Filipino users (language, payment methods, compliance)

---

## Core Features

### 1. Rider Application (Kotlin - Android)

#### User Registration & Authentication
- Sign up via phone number (OTP verification through Supabase Auth)
- Email registration option
- Profile management (name, photo, preferred payment method)
- Saved addresses (home, work, favorites)

#### Booking Flow
1. **Enter Destination**: Type or select from saved places, search via Mapbox geocoding
2. **View Fare Estimate**: Real-time pricing based on distance, time, demand
3. **Select Ride Type**: 
   - RideNow Lite (4-seater, economy)
   - RideNow Plus (5-seater, premium)
   - RideNow Moto (motorcycle taxi)
4. **Choose Payment Method**: GCash, PayMaya, Cash
5. **Confirm Booking**: Match with nearest available driver
6. **Track Driver**: Real-time location on Mapbox map
7. **Ride in Progress**: ETA updates, driver contact option
8. **Complete Ride**: Rate driver, add tip, receive receipt

#### In-App Features
- Live driver tracking (Supabase Realtime)
- In-app chat/call with driver (masked phone numbers)
- Ride history with receipts
- Split fare with friends
- Schedule rides in advance
- Emergency button (shares ride details with emergency contacts)
- Promo codes and referrals

#### Notifications (OneSignal)
- Driver assigned
- Driver arrived
- Ride started/completed
- Promotional offers
- Payment confirmations

### 2. Driver Application (Kotlin - Android)

#### Registration & Onboarding
- Sign up with phone number
- Submit documents (license, vehicle registration, insurance) via photo upload
- Background check initiation
- Vehicle inspection scheduling
- Training module completion

#### Driver Dashboard
- **Online/Offline Toggle**: Go online to accept rides
- **Earnings Overview**: Daily/weekly/monthly earnings, incentives
- **Ride Requests**: Incoming requests with pickup/dropoff info, estimated fare
- **Navigation**: Turn-by-turn directions via Mapbox
- **Accept/Decline**: 15-second window to accept rides
- **Trip Management**: Start trip, complete trip, report issues

#### Earnings & Payouts
- Real-time earnings tracker
- Weekly payouts to bank account or GCash
- Bonus programs (peak hours, completion streaks)
- Expense tracking (fuel, maintenance)

#### Features
- Heatmap of high-demand areas
- Ride acceptance rate tracking
- Customer ratings and feedback
- Document expiration reminders
- In-app support chat

### 3. Admin Dashboard (React)

#### User Management
- View/search riders and drivers
- Verify driver documents
- Suspend/ban users for violations
- Manual driver approval workflow

#### Ride Monitoring
- Live map view of all active rides
- Search ride history by ID, user, date
- Dispute resolution interface
- Refund processing

#### Analytics & Reporting
- Daily/weekly/monthly metrics (rides, revenue, active users)
- Driver performance reports
- Geographic heatmaps of demand
- Financial reports (commission, payouts)

#### Operations
- Manage promo codes and campaigns
- Set pricing parameters (base fare, per km, per minute)
- Configure surge pricing zones
- Send broadcast notifications via OneSignal

#### Support
- Ticketing system for user issues
- Chat support integration
- FAQ management

### 4. Backend Services (Express.js)

#### Core APIs
- **User Service**: Authentication, profile management
- **Ride Service**: Booking, matching, status updates
- **Payment Service**: Integration with GCash/PayMaya, transaction logging
- **Notification Service**: OneSignal integration, template management
- **Location Service**: Handle driver location batches, calculate distances
- **Pricing Service**: Fare calculation, surge pricing logic
- **Document Service**: Upload/verify driver documents

#### Matching Algorithm
```typescript
// Simplified matching logic
async function findNearestDriver(pickupLocation, rideType) {
  // Query Supabase for online drivers within 5km radius
  // Filter by rideType compatibility
  // Sort by distance and acceptance rate
  // Return top 5 candidates
}
```

#### Pricing Model
- **Base Fare**: ₱50
- **Per Kilometer**: ₱15/km
- **Per Minute**: ₱2/min
- **Surge Multiplier**: 1.2x - 3.0x based on demand/supply ratio
- **Booking Fee**: ₱10
- **Minimum Fare**: ₱89

Formula: `Fare = (Base + (Distance × PerKm) + (Time × PerMin) + BookingFee) × SurgeMultiplier`

---

## Database Schema (Supabase PostgreSQL)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) CHECK (user_type IN ('rider', 'driver', 'admin')),
  profile_photo_url TEXT,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Drivers Table
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY REFERENCES users(id),
  license_number VARCHAR(50) UNIQUE,
  vehicle_model VARCHAR(100),
  vehicle_plate VARCHAR(20) UNIQUE,
  vehicle_color VARCHAR(50),
  vehicle_year INTEGER,
  document_status VARCHAR(20) DEFAULT 'pending',
  is_online BOOLEAN DEFAULT FALSE,
  current_location GEOGRAPHY(POINT, 4326),
  acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
  completed_rides INTEGER DEFAULT 0,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Rides Table
```sql
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id UUID REFERENCES users(id),
  driver_id UUID REFERENCES drivers(id),
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,8),
  dropoff_lng DECIMAL(11,8),
  ride_type VARCHAR(20) CHECK (ride_type IN ('lite', 'plus', 'moto')),
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
  estimated_fare DECIMAL(10,2),
  final_fare DECIMAL(10,2),
  distance_km DECIMAL(10,2),
  duration_min INTEGER,
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
  driver_rating INTEGER,
  rider_rating INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### DriverLocations Table (for batching)
```sql
CREATE TABLE driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast location queries
CREATE INDEX idx_driver_locations_driver_time ON driver_locations(driver_id, recorded_at DESC);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES rides(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  payment_provider VARCHAR(50), -- 'gcash', 'paymaya', 'cash'
  provider_transaction_id VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), -- 'ride_update', 'promotion', 'system'
  is_read BOOLEAN DEFAULT FALSE,
  deep_link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints (Express.js)

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login with phone/email
- `POST /api/v1/auth/otp/verify` - Verify OTP
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user profile

### Riders
- `GET /api/v1/riders/profile` - Get rider profile
- `PUT /api/v1/riders/profile` - Update rider profile
- `GET /api/v1/riders/history` - Get ride history
- `GET /api/v1/riders/favorites` - Get saved addresses
- `POST /api/v1/riders/favorites` - Add saved address

### Drivers
- `GET /api/v1/drivers/profile` - Get driver profile
- `PUT /api/v1/drivers/profile` - Update driver profile
- `POST /api/v1/drivers/documents` - Upload documents
- `GET /api/v1/drivers/documents` - Get document status
- `POST /api/v1/drivers/toggle-online` - Go online/offline
- `POST /api/v1/drivers/location/batch` - Batch update locations
- `GET /api/v1/drivers/earnings` - Get earnings summary
- `GET /api/v1/drivers/rides` - Get driver ride history

### Rides
- `POST /api/v1/rides/request` - Create ride request
- `GET /api/v1/rides/:id` - Get ride details
- `POST /api/v1/rides/:id/accept` - Driver accepts ride
- `POST /api/v1/rides/:id/start` - Start trip
- `POST /api/v1/rides/:id/complete` - Complete trip
- `POST /api/v1/rides/:id/cancel` - Cancel ride
- `POST /api/v1/rides/:id/rate` - Submit rating
- `GET /api/v1/rides/active` - Get active ride (for rider/driver)

### Pricing
- `GET /api/v1/pricing/estimate` - Get fare estimate
- `GET /api/v1/pricing/surge` - Get current surge multiplier for area

### Payments
- `POST /api/v1/payments/initiate` - Initiate payment (GCash/PayMaya)
- `POST /api/v1/payments/callback` - Payment gateway callback
- `GET /api/v1/payments/:id` - Get payment status
- `POST /api/v1/payments/:id/refund` - Process refund

### Admin
- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/drivers/pending` - Get pending driver verifications
- `POST /api/v1/admin/drivers/:id/approve` - Approve driver
- `POST /api/v1/admin/drivers/:id/reject` - Reject driver
- `GET /api/v1/admin/rides` - List all rides with filters
- `POST /api/v1/admin/promos` - Create promo code
- `GET /api/v1/admin/analytics/overview` - Get dashboard metrics

---

## Real-time Implementation (Supabase Realtime)

### Channels and Subscriptions

#### Rider App Subscriptions
```typescript
// Subscribe to ride status updates
supabase
  .channel(`ride:${rideId}`)
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
    (payload) => {
      // Update UI with new ride status
      updateRideStatus(payload.new.status);
    }
  )
  .subscribe();

// Subscribe to driver location
supabase
  .channel(`driver_location:${driverId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${driverId}` },
    (payload) => {
      // Update driver marker on map
      updateDriverLocation(payload.new.latitude, payload.new.longitude);
    }
  )
  .subscribe();
```

#### Driver App Subscriptions
```typescript
// Subscribe to new ride requests in area
supabase
  .channel('ride_requests:nearby')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
    (payload) => {
      // Check if ride is within acceptable distance
      if (isWithinRange(payload.new)) {
        showRideRequest(payload.new);
      }
    }
  )
  .subscribe();
```

#### Location Batching Strategy
```typescript
// Driver app: batch locations every 5 seconds
setInterval(async () => {
  if (locationBuffer.length > 0) {
    await api.post('/drivers/location/batch', {
      locations: locationBuffer
    });
    locationBuffer = [];
  }
}, 5000);

// Collect locations during interval
navigator.geolocation.watchPosition((position) => {
  locationBuffer.push({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: new Date().toISOString()
  });
});
```

---

## Payment Integration (Philippines Focus)

### Supported Payment Methods

1. **GCash** (Primary)
   - Mobile wallet integration via GCash API
   - QR code payment option
   - Real-time transaction verification
   
2. **PayMaya** (Secondary)
   - Alternative mobile wallet
   - Card linking capability
   
3. **Cash** (Fallback)
   - Pay driver directly
   - Driver marks payment as received

### GCash Integration Flow
```typescript
// Initiate GCash payment
async function initiateGCashPayment(amount, phoneNumber) {
  const response = await fetch('https://api.gcash.com/payment', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GCASH_API_KEY}` },
    body: JSON.stringify({
      amount,
      phone: phoneNumber,
      reference_id: generateReferenceId()
    })
  });
  
  // Redirect user to GCash app for approval
  return response.data.approval_url;
}

// Handle callback
app.post('/payments/gcash/callback', (req, res) => {
  const { status, reference_id, transaction_id } = req.body;
  
  if (status === 'success') {
    // Update payment record in Supabase
    await supabase
      .from('payments')
      .update({ 
        status: 'success',
        provider_transaction_id: transaction_id,
        processed_at: new Date()
      })
      .eq('reference_id', reference_id);
  }
  
  res.sendStatus(200);
});
```

---

## Map Integration (Mapbox Free Tier)

### Mapbox Features Used
- **Maps SDK**: Display interactive maps
- **Directions API**: Calculate routes and ETAs
- **Geocoding API**: Convert addresses to coordinates
- **Matrix API**: Calculate distances between multiple points
- **Navigation SDK**: Turn-by-turn navigation (driver app)

### Free Tier Limits
- 50,000 map loads/month
- 100,000 directions API calls/month
- 50,000 geocoding requests/month
- 200,000 matrix API elements/month

### Implementation Example
```typescript
// Initialize Mapbox map
const map = new mapboxgl.Map({
  container: 'mapContainer',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [121.0244, 14.5995], // Manila coordinates
  zoom: 12
});

// Get route from Mapbox Directions
async function getRoute(start, end) {
  const query = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&access_token=${MAPBOX_TOKEN}`,
    { method: 'GET' }
  );
  const json = await query.json();
  return json.routes[0];
}

// Geocode address
async function geocodeAddress(address) {
  const query = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`,
    { method: 'GET' }
  );
  const json = await query.json();
  return json.features[0];
}
```

---

## Security & Compliance

### Data Protection
- All data encrypted in transit (HTTPS/TLS 1.3)
- Supabase handles encryption at rest
- Phone numbers masked in ride details
- GDPR-like compliance for Philippine Data Privacy Act of 2012

### Authentication & Authorization
- JWT tokens via Supabase Auth
- Row Level Security (RLS) policies in PostgreSQL
- Role-based access control (rider, driver, admin)

### Safety Features
- Emergency button shares ride details with emergency contacts
- Driver background checks (NBI clearance verification)
- Ride sharing feature (send trip details to trusted contacts)
- In-app emergency hotline integration

### Philippine Compliance
- LTFRB (Land Transportation Franchising and Regulatory Board) accreditation
- DOTC (Department of Transportation) requirements
- BIR (Bureau of Internal Revenue) tax compliance
- NPC (National Privacy Commission) data privacy registration

---

## Scalability & Performance

### Current Pilot Capacity
- 10,000 concurrent users
- 1,000 active drivers
- 5,000 rides/day
- 50,000 API requests/hour

### Pluggable Architecture for Future Scaling

```typescript
// Abstract service interfaces
interface MapService {
  getRoute(start: Coordinates, end: Coordinates): Promise<Route>;
  geocode(address: string): Promise<Coordinates>;
  calculateDistanceMatrix(points: Coordinates[]): Promise<DistanceMatrix>;
}

interface PaymentService {
  initiatePayment(amount: number, method: string): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentStatus>;
  processRefund(paymentId: string): Promise<RefundResult>;
}

interface NotificationService {
  sendPush(userId: string, title: string, message: string): Promise<void>;
  sendSMS(phone: string, message: string): Promise<void>;
}

// Factory for swapping implementations
class ServiceFactory {
  static getMapService(): MapService {
    // Currently Mapbox, can switch to Google Maps later
    return new MapboxService();
  }
  
  static getPaymentService(provider: string): PaymentService {
    switch(provider) {
      case 'gcash': return new GCashService();
      case 'paymaya': return new PayMayaService();
      default: throw new Error('Unknown provider');
    }
  }
}
```

### Future Upgrade Path
1. **Phase 1 (Pilot)**: Current stack with batching and free tiers
2. **Phase 2 (Growth)**: Add Redis for caching, upgrade Mapbox plan
3. **Phase 3 (Scale)**: Introduce Kafka for event streaming, multi-region deployment
4. **Phase 4 (Enterprise)**: Microservices architecture, dedicated infrastructure

---

## Development Roadmap

### Phase 1: MVP Development (Months 1-3)
**Week 1-4: Foundation**
- Set up Supabase project and database schema
- Initialize Express.js backend with basic auth
- Create Kotlin Android project structure
- Implement user registration and login

**Week 5-8: Core Features**
- Build ride booking flow (rider app)
- Implement driver app with online/offline toggle
- Integrate Mapbox for maps and routing
- Develop basic matching algorithm
- Set up Supabase Realtime for live updates

**Week 9-12: Payments & Polish**
- Integrate GCash payment
- Implement ride completion and rating
- Build admin dashboard (React)
- Add OneSignal push notifications
- Testing and bug fixes

**Deliverables**: 
- Functional rider app (Android)
- Functional driver app (Android)
- Basic admin dashboard
- Backend API deployed on Render.com

### Phase 2: Pilot Launch (Months 4-5)
- Soft launch in Metro Manila (Quezon City, Makati, Taguig)
- Onboard 500 drivers
- Marketing campaign for rider acquisition
- Monitor performance and gather feedback
- Iterate based on user feedback

### Phase 3: Expansion (Months 6-9)
- Expand to Cebu and Davao
- Add PayMaya integration
- Implement scheduled rides
- Add ride-sharing (pool) option
- Improve matching algorithm
- Launch referral program

### Phase 4: iOS & Advanced Features (Months 10-12)
- Launch iOS app using Kotlin Multiplatform
- Add in-app chat
- Implement loyalty program
- Advanced analytics dashboard
- Corporate accounts feature

---

## Success Metrics (KPIs)

### User Metrics
- Monthly Active Users (MAU): Target 10,000 by month 6
- Driver Activation Rate: >70% of registered drivers complete first ride
- Rider Retention Rate: >40% month-over-month
- Average Rating: >4.5 stars for both riders and drivers

### Operational Metrics
- Average Wait Time: <5 minutes for ride assignment
- Ride Completion Rate: >90%
- Driver Acceptance Rate: >60%
- Payment Success Rate: >95%

### Financial Metrics
- Average Revenue Per Ride: ₱150-₱250
- Commission Rate: 20% per ride
- Customer Acquisition Cost (CAC): <₱300
- Lifetime Value (LTV): >₱3,000

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Low Driver Supply** | High | Medium | Incentive programs, guaranteed earnings during peak hours |
| **Payment Gateway Failures** | High | Low | Multiple payment options (GCash, PayMaya, Cash), automatic retry logic |
| **Mapbox API Limits Exceeded** | Medium | Medium | Implement location batching, cache frequent routes, monitor usage |
| **Regulatory Changes** | High | Medium | Maintain LTFRB compliance, legal counsel on retainer |
| **Safety Incidents** | High | Low | Background checks, emergency button, ride tracking, insurance coverage |
| **Scalability Issues** | Medium | Low | Pluggable architecture, monitoring, auto-scaling on Render.com |
| **Competition** | High | High | Focus on underserved areas, better driver incentives, superior customer service |

---

## Budget Estimates (First Year)

### Development Costs
- **Development Team** (6 months): ₱6,000,000
  - 2 Android Developers (Kotlin)
  - 1 Backend Developer (Express.js)
  - 1 Frontend Developer (React)
  - 1 UI/UX Designer
  - 1 Project Manager

### Infrastructure Costs (Monthly)
- **Render.com**: $50-100/month (Pro plan for backend)
- **Supabase**: $0-25/month (Free tier → Pro tier as needed)
- **Mapbox**: $0-200/month (Free tier → paid as usage grows)
- **OneSignal**: $0-50/month (Free tier sufficient for pilot)
- **Domain & SSL**: $20/year
- **Total Monthly**: ~$300-400/month (₱17,000-22,000)

### Third-party Services
- **GCash/PayMaya Integration**: ₱50,000-100,000 (one-time setup)
- **Background Check Services**: ₱500/driver check
- **SMS/OTP**: ₱0.50-1.00 per message

### Marketing & Operations
- **Driver Incentives**: ₱500,000 (first 3 months)
- **Rider Promotions**: ₱300,000 (discounts, promo codes)
- **Legal & Compliance**: ₱200,000
- **Insurance**: ₱100,000/year

### Total First Year Budget: ₱8,000,000 - ₱10,000,000

---

## Technical Requirements

### Mobile App (Kotlin)
- Minimum Android version: API 24 (Android 7.0)
- Target Android version: API 34 (Android 14)
- Supported screen sizes: Phones and tablets
- Offline mode: Basic functionality without internet
- App size target: <50MB

### Backend (Express.js)
- Node.js version: 18.x or higher
- TypeScript version: 5.x
- API documentation: OpenAPI/Swagger
- Logging: Winston or Pino
- Error tracking: Sentry integration

### Admin Dashboard (React)
- React version: 18.x
- State management: Redux Toolkit or Zustand
- UI Framework: Material-UI or Ant Design
- Responsive design: Desktop and tablet support

### DevOps
- Version Control: Git (GitHub)
- CI/CD: GitHub Actions
- Environment variables: Render.com secrets management
- Monitoring: Built-in Render.com monitoring + custom health checks
- Backup strategy: Supabase automatic daily backups

---

## Conclusion

This specification outlines a cost-effective, scalable ride-hailing platform tailored for the Philippine market. By leveraging Supabase's integrated features (Auth, Database, Realtime, Storage), we minimize infrastructure complexity while maintaining flexibility for future growth. The pluggable architecture ensures that components like Mapbox, GCash, and OneSignal can be upgraded or replaced as the business scales.

The pilot approach allows us to validate the market with minimal investment before committing to expensive infrastructure. With a focus on Android-first development, local payment methods, and regulatory compliance, RideNow is positioned to capture significant market share in the Philippine ride-hailing industry.

Next steps:
1. Finalize technical architecture decisions
2. Set up development environments
3. Begin MVP development (Phase 1)
4. Establish partnerships with GCash and regulatory bodies
5. Recruit initial driver cohort

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Prepared For**: RideNow Pilot Project  
**Status**: Ready for Review and Discussion
