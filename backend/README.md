# RideNow Backend API

Express.js backend for RideNow Philippines ride-hailing platform.

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Validation**: Zod
- **Security**: Helmet, CORS

## Project Structure
```
backend/
├── src/
│   ├── config/          # Supabase client configuration
│   ├── controllers/     # Request handlers (if needed)
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types and Zod schemas
│   ├── utils/           # Helper functions
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8080
```

### 3. Run Database Migration
Before running the backend, ensure you've executed the SQL migration in `/migration/001_initial_schema.sql` in your Supabase SQL Editor.

### 4. Start Development Server
```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 5. Build for Production
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
All endpoints require a Bearer token from Supabase Auth in the `Authorization` header.

### Rides (`/api/rides`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/` | Create new ride request | Customer |
| GET | `/nearby` | Get nearby ride requests | Driver |
| POST | `/:id/accept` | Accept a ride | Driver |
| PUT | `/:id/status` | Update ride status | Driver/Customer |
| POST | `/:id/cancel` | Cancel a ride | Driver/Customer |
| POST | `/:id/sos` | Trigger SOS emergency | Driver/Customer |
| GET | `/:id` | Get ride details | Owner/Admin |
| GET | `/my/history` | Get customer ride history | Customer |

### Drivers (`/api/drivers`)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/location` | Update driver location | Driver |
| POST | `/online` | Set online/offline status | Driver |
| POST | `/available` | Set availability | Driver |
| GET | `/profile` | Get driver profile | Driver |
| POST | `/wallet/topup` | Process wallet topup | Driver |
| GET | `/wallet/history` | Get transaction history | Driver |
| GET | `/nearby` | Get nearby drivers | Admin |

## Example Requests

### Create a Ride (Customer)
```bash
curl -X POST http://localhost:3000/api/rides \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_lat": 14.5547,
    "pickup_lng": 121.0244,
    "pickup_address": "BGC, Taguig",
    "dropoff_lat": 14.5995,
    "dropoff_lng": 120.9842,
    "dropoff_address": "Makati Avenue",
    "payment_method": "cash"
  }'
```

### Update Driver Location
```bash
curl -X POST http://localhost:3000/api/drivers/location \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 14.5547,
    "lng": 121.0244
  }'
```

### Wallet Topup (Driver)
```bash
curl -X POST http://localhost:3000/api/drivers/wallet/topup \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "payment_method": "gcash",
    "gcash_reference_id": "GC123456789"
  }'
```

## Driver Wallet State Machine

The backend enforces the wallet state machine defined in the database:

- **ACTIVE_GREEN** (Balance ≥ ₱0): Can accept rides normally
- **ACTIVE_YELLOW** (-₱500 ≤ Balance < ₱0): Can accept rides but warned
- **BLOCKED_RED** (Balance < -₱500): Cannot go online, must top up

When a ride completes, commission (20%) is automatically deducted via the `process_driver_commission()` database function.

## Security Notes

1. All endpoints require authentication via Supabase JWT tokens
2. Role-based access control (RBAC) ensures users can only access their own data
3. Service role key is used server-side to bypass RLS for legitimate operations
4. Input validation with Zod prevents injection attacks
5. Helmet.js sets secure HTTP headers

## Testing

```bash
npm test
```

## Deployment to Render.com

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Build command: `npm run build`
4. Start command: `npm start`
5. Ensure Supabase migration is run first

## Next Steps

- [ ] Integrate OneSignal for push notifications
- [ ] Add GCash payment gateway webhook handler
- [ ] Implement geospatial queries with PostGIS for better performance
- [ ] Add rate limiting
- [ ] Set up monitoring and logging

---
Generated for RideNow Philippines MVP - Pilot Launch 2026
