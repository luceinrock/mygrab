# RideNow Philippines - Database Migration Guide

## Overview
This directory contains the SQL migration scripts for the RideNow Philippines MVP platform.

## Tech Stack
- **Database**: Supabase (PostgreSQL)
- **Extensions**: PostGIS (for geospatial queries), UUID-OSSP
- **Backend**: Express.js (TypeScript/JavaScript)
- **Mobile**: Kotlin (Android-first, KMP for iOS later)
- **Admin**: React

## Files
- `001_initial_schema.sql` - Complete initial database setup including:
  - All core tables (profiles, customer_profiles, driver_profiles, rides, wallet_transactions, disputes, admin_logs)
  - Enum types for roles, statuses, payment methods, and wallet states
  - Row Level Security (RLS) policies
  - Database functions and triggers
  - Driver Wallet State Machine logic
  - SOS emergency alert triggers
  - Performance indexes

## Features Implemented

### 1. Three-Sided Marketplace Support
- **Customer (Rider)**: Booking, tracking, payment, ratings
- **Driver**: Ride acceptance, location tracking, wallet management
- **Admin**: Verification, dispute resolution, oversight

### 2. Driver Wallet State Machine
Three states to manage driver financial health:
- `ACTIVE_GREEN`: Balance ≥ 0 (Full access)
- `ACTIVE_YELLOW`: Balance < 0 but within credit limit (Can drive, warning state)
- `BLOCKED_RED`: Balance exceeds negative threshold (Forced offline, must top-up)

### 3. Safety & Compliance
- Route polyline storage for accident backtracking
- SOS trigger flags with immediate alerts
- Complete transaction audit trail
- LTFRB-compliant data retention

### 4. Philippine Market Optimizations
- GCash integration ready (phone-number based)
- Cash payment support with post-paid commission logic
- Configurable credit limits for drivers

## How to Run

### Prerequisites
1. Create a Supabase project at https://supabase.com
2. Enable PostGIS extension in your Supabase dashboard (or let the script do it)

### Execution Steps

1. **Navigate to Supabase SQL Editor**
   - Go to your Supabase Project Dashboard
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run the Migration**
   - Copy the entire content of `001_initial_schema.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter / Cmd+Enter)

3. **Verify Installation**
   ```sql
   -- Check tables were created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   
   -- Check enum types
   SELECT typname FROM pg_type WHERE typtype = 'e';
   
   -- Check functions
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
   ```

4. **Create First Admin User**
   - Go to Authentication → Users in Supabase Dashboard
   - Add a new user (this will be your super admin)
   - Note the User UUID
   - Run this SQL to promote them:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id = 'YOUR-ADMIN-UUID-HERE';
   ```

## Post-Migration Configuration

### 1. Storage Setup (for documents & photos)
Create these buckets in Supabase Storage:
- `driver-documents` - For license, OR/CR photos
- `profile-photos` - For user avatars
- `ride-evidence` - For dispute photos

Set bucket policies:
- `driver-documents`: Private (only admin and owner can access)
- `profile-photos`: Public read, owner write
- `ride-evidence`: Private (admin and involved parties only)

### 2. Environment Variables (for Express.js Backend)
```env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_api_key
GCASH_MERCHANT_ID=your_gcash_merchant_id
```

### 3. Testing the Wallet State Machine
```sql
-- Test commission processing function
SELECT process_driver_commission(
  'driver-uuid-here',
  'ride-uuid-here',
  50.00 -- commission amount
);

-- Check driver state after
SELECT user_id, wallet_balance, wallet_state, is_online 
FROM driver_profiles 
WHERE user_id = 'driver-uuid-here';
```

## Rollback Instructions
⚠️ **WARNING**: This migration creates production-critical tables. Do not run rollback in production without backup.

To rollback (development only):
```sql
-- Drop all tables (cascade will handle dependencies)
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
DROP TABLE IF EXISTS driver_profiles CASCADE;
DROP TABLE IF EXISTS customer_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS ride_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS wallet_txn_type CASCADE;
DROP TYPE IF EXISTS wallet_state CASCADE;

-- Drop extensions (if no other dependencies)
-- DROP EXTENSION IF EXISTS postgis;
-- DROP EXTENSION IF EXISTS "uuid-ossp";
```

## Next Steps After Migration

1. **Backend Development**
   - Set up Express.js project on Render.com
   - Implement authentication flows using Supabase Auth
   - Create API endpoints for ride booking, driver matching
   - Integrate OneSignal for push notifications

2. **Mobile Development (Kotlin)**
   - Set up Android project with Supabase SDK
   - Implement map integration (OSM/Mapbox)
   - Build rider booking flow
   - Build driver acceptance and tracking flow

3. **Admin Dashboard (React)**
   - Set up React project
   - Build driver verification interface
   - Create ride monitoring dashboard
   - Implement dispute resolution tools

4. **Testing**
   - Test wallet state transitions
   - Verify RLS policies work correctly
   - Test SOS trigger functionality
   - Validate geospatial queries for driver matching

## Support & Documentation
- Supabase Docs: https://supabase.com/docs
- PostGIS Manual: https://postgis.net/documentation/
- Express.js Guide: https://expressjs.com/

---
*Generated for RideNow Philippines MVP - Pilot Launch 2024*
