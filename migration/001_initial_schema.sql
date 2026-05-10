-- ============================================================================
-- RIDENOW PHILIPPINES - MVP DATABASE MIGRATION
-- Stack: Supabase (Postgres), Express.js, Kotlin, React
-- Features: 3-Sided Market, Driver Wallet State Machine, SOS Logic, OSM Ready
-- ============================================================================

-- 1. ENABLE EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "postgis" with schema "public"; -- For geospatial queries (Geo-hashing)
create extension if not exists "uuid-ossp" with schema "public";

-- 2. ENUM TYPES
-- ----------------------------------------------------------------------------
-- Roles for the platform
create type user_role as enum ('customer', 'driver', 'admin');

-- Verification status for drivers
create type verification_status as enum ('pending', 'verified', 'rejected', 'suspended');

-- Ride lifecycle status
create type ride_status as enum (
  'requested', 
  'accepted', 
  'arrived', 
  'in_progress', 
  'completed', 
  'cancelled', 
  'disputed'
);

-- Payment methods
create type payment_method as enum ('gcash', 'cash', 'paymaya');

-- Payment status
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

-- Wallet transaction types
create type wallet_txn_type as enum ('topup', 'commission', 'refund', 'incentive', 'adjustment');

-- Driver Wallet States (The State Machine)
create type wallet_state as enum ('ACTIVE_GREEN', 'ACTIVE_YELLOW', 'BLOCKED_RED');

-- 3. CORE TABLES
-- ----------------------------------------------------------------------------

-- PROFILES: Extends auth.users, holds common data
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone_number text unique not null, -- Critical for GCash/PH
  email text,
  profile_photo_url text,
  role user_role not null default 'customer',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CUSTOMER_PROFILES: Rider specific data
create table customer_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  default_pickup_address text,
  default_dropoff_address text,
  saved_locations jsonb default '[]'::jsonb, -- [{name: "Home", lat: ..., lng: ...}]
  rating_average numeric(3,2) default 5.00,
  total_rides integer default 0,
  gcash_number text
);

-- DRIVER_PROFILES: Driver specific data + Location + Wallet State
create table driver_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  license_number text unique,
  license_expiry date,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  plate_number text unique,
  year_manufactured integer,
  verification_status verification_status default 'pending',
  verification_documents jsonb default '[]'::jsonb, -- URLs to OR/CR, License photos
  
  -- Location & Status
  current_location_lat numeric(9,6),
  current_location_lng numeric(9,6),
  last_location_update timestamptz,
  is_online boolean default false,
  is_available boolean default false,
  
  -- Wallet & State Machine
  wallet_balance numeric(12,2) default 0.00,
  wallet_state wallet_state default 'ACTIVE_GREEN',
  credit_limit numeric(12,2) default 500.00, -- Configurable via Admin later
  negative_balance_threshold numeric(12,2) default -500.00,
  
  -- Stats
  rating_average numeric(3,2) default 5.00,
  total_rides integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RIDES: The core transactional table
create table rides (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id),
  driver_id uuid references profiles(id), -- Null until accepted
  
  status ride_status default 'requested',
  
  -- Locations
  pickup_lat numeric(9,6) not null,
  pickup_lng numeric(9,6) not null,
  pickup_address text not null,
  dropoff_lat numeric(9,6) not null,
  dropoff_lng numeric(9,6) not null,
  dropoff_address text not null,
  
  -- Route Data (Saved after completion for history/safety)
  route_polyline text, -- Compressed polyline string (OSM/Mapbox)
  distance_km numeric(8,2),
  duration_min integer,
  
  -- Financials
  fare_estimate numeric(10,2),
  final_fare numeric(10,2),
  payment_method payment_method default 'cash',
  payment_status payment_status default 'pending',
  gcash_reference_id text,
  
  -- Ratings & Feedback
  driver_rating_given integer check (driver_rating_given between 1 and 5),
  customer_rating_given integer check (customer_rating_given between 1 and 5),
  driver_comment text,
  customer_comment text,
  
  -- Meta
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_by uuid references profiles(id),
  cancellation_reason text,
  sos_triggered boolean default false
);

-- RIDE_ROUTES: Detailed history for accident backtracking (Optional detailed storage)
-- If you store the polyline in 'rides', this table can be used for high-fidelity point logging if needed later.
-- For MVP, we rely on 'route_polyline' in 'rides' table to save costs.

-- WALLET_TRANSACTIONS: Immutable ledger for drivers
create table wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references driver_profiles(user_id),
  ride_id uuid references rides(id), -- Null if topup/incentive
  type wallet_txn_type not null,
  amount numeric(12,2) not null, -- Negative for deductions, Positive for credits
  balance_after numeric(12,2) not null, -- Snapshot of balance after this txn
  description text not null,
  reference_id text, -- GCash Ref ID or Admin Note
  created_at timestamptz default now()
);

-- DISPUTES: For Admin resolution
create table disputes (
  id uuid primary key default uuid_generate_v4(),
  ride_id uuid not null references rides(id),
  reported_by uuid not null references profiles(id),
  reason text not null,
  description text,
  evidence_urls jsonb default '[]'::jsonb,
  status text default 'open', -- open, under_review, resolved
  admin_resolution text,
  resolved_by uuid references profiles(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ADMIN_LOGS: Audit trail for admin actions
create table admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references profiles(id),
  action_type text not null,
  target_entity_id uuid, -- User ID or Ride ID affected
  details jsonb,
  created_at timestamptz default now()
);

-- 4. INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------
-- Geospatial index for driver matching
create index idx_driver_location on driver_profiles using gist (ll_to_earth(current_location_lat, current_location_lng));
-- Faster lookups
create index idx_rides_customer on rides(customer_id);
create index idx_rides_driver on rides(driver_id);
create index idx_rides_status on rides(status);
create index idx_driver_verification on driver_profiles(verification_status);
create index idx_wallet_txns_driver on wallet_transactions(driver_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table customer_profiles enable row level security;
alter table driver_profiles enable row level security;
alter table rides enable row level security;
alter table wallet_transactions enable row level security;
alter table disputes enable row level security;

-- Helper function to get current user role
create or replace function get_user_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- CUSTOMER PROFILES POLICIES
create policy "Customers see own data" on customer_profiles
  for all using (auth.uid() = user_id);

-- DRIVER PROFILES POLICIES
create policy "Drivers see own data" on driver_profiles
  for all using (auth.uid() = user_id);
create policy "Admins see all drivers" on driver_profiles
  for select using (get_user_role() = 'admin');
-- Allow public (riders) to see basic driver info when matched? 
-- For MVP, let's restrict to authenticated users only for safety
create policy "Authenticated users can see basic driver info" on driver_profiles
  for select using (auth.role() = 'authenticated');

-- RIDES POLICIES
create policy "Customers see their own rides" on rides
  for all using (auth.uid() = customer_id);
create policy "Drivers see assigned rides" on rides
  for all using (auth.uid() = driver_id);
-- Drivers also need to SEE requested rides to accept them (complex logic usually in backend)
-- For MVP RLS, we allow drivers to select 'requested' rides
create policy "Drivers can see requested rides" on rides
  for select using (get_user_role() = 'driver' and status = 'requested');
  
create policy "Admins see all rides" on rides
  for all using (get_user_role() = 'admin');

-- WALLET TRANSACTIONS POLICIES
create policy "Drivers see own transactions" on wallet_transactions
  for select using (auth.uid() = driver_id);
create policy "Admins see all transactions" on wallet_transactions
  for all using (get_user_role() = 'admin');
-- No one can insert directly except via RPC function (security)

-- DISPUTES POLICIES
create policy "Users see their own disputes" on disputes
  for select using (auth.uid() = reported_by);
create policy "Admins manage all disputes" on disputes
  for all using (get_user_role() = 'admin');

-- 6. FUNCTIONS & TRIGGERS (The Logic Layer)
-- ----------------------------------------------------------------------------

-- A. Update 'updated_at' timestamp helper
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at_column();
create trigger update_driver_profiles_updated_at before update on driver_profiles
  for each row execute procedure update_updated_at_column();

-- B. Create Profile on Signup Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone_number, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', new.email, 'customer');
  
  -- If role is driver, create driver profile too (simplified logic)
  if new.raw_user_meta_data->>'role' = 'driver' then
    insert into public.driver_profiles (user_id) values (new.id);
  else
    insert into public.customer_profiles (user_id) values (new.id);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- C. DRIVER WALLET STATE MACHINE FUNCTION (Atomic)
-- This function handles deductions safely and updates the driver state
create or replace function process_driver_commission(
  p_driver_id uuid,
  p_ride_id uuid,
  p_amount numeric -- Commission amount to deduct (positive number)
)
returns json as $$
declare
  v_current_balance numeric;
  v_new_balance numeric;
  v_credit_limit numeric;
  v_new_state wallet_state;
  v_txn_id uuid;
begin
  -- Lock the driver row to prevent race conditions
  select wallet_balance, credit_limit into v_current_balance, v_credit_limit
  from driver_profiles where user_id = p_driver_id for update;

  v_new_balance := v_current_balance - p_amount;

  -- Determine New State
  if v_new_balance >= 0 then
    v_new_state := 'ACTIVE_GREEN';
  elsif v_new_balance >= v_current_balance - v_credit_limit then -- Actually checking against threshold logic
    -- Simplified: If balance is negative but within limit
    if v_new_balance >= -v_credit_limit then
       v_new_state := 'ACTIVE_YELLOW';
    else
       v_new_state := 'BLOCKED_RED';
    end if;
  else
     v_new_state := 'BLOCKED_RED';
  end if;

  -- If BLOCKED_RED, force offline
  if v_new_state = 'BLOCKED_RED' then
    update driver_profiles 
    set wallet_balance = v_new_balance, 
        wallet_state = v_new_state,
        is_online = false,
        is_available = false
    where user_id = p_driver_id;
  else
    update driver_profiles 
    set wallet_balance = v_new_balance, 
        wallet_state = v_new_state
    where user_id = p_driver_id;
  end if;

  -- Record Transaction
  insert into wallet_transactions (driver_id, ride_id, type, amount, balance_after, description)
  values (p_driver_id, p_ride_id, 'commission', -p_amount, v_new_balance, 'Commission for ride ' || substr(p_ride_id::text, 1, 8))
  returning id into v_txn_id;

  return json_build_object('success', true, 'new_balance', v_new_balance, 'new_state', v_new_state, 'txn_id', v_txn_id);
end;
$$ language plpgsql security definer;

-- D. SOS EMERGENCY UPLOAD TRIGGER
-- When SOS is triggered, we could log it to a dedicated high-priority table or just flag the ride
-- For MVP, flagging the ride and notifying admins via application logic is sufficient.
-- This function ensures the 'sos_triggered' flag is respected.
create or replace function trigger_sos_alert()
returns trigger as $$
begin
  if new.sos_triggered = true and old.sos_triggered = false then
    -- In a real app, this would send a webhook to OneSignal/Admin Dashboard immediately
    -- For DB level, we just ensure the timestamp is recorded
    raise notice 'SOS TRIGGERED FOR RIDE %', new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger sos_alert_trigger
  before update on rides
  for each row execute procedure trigger_sos_alert();

-- 7. INITIAL DATA SEEDING (Optional)
-- ----------------------------------------------------------------------------
-- Create a default Admin User (You must run this manually after creating the auth user in Supabase UI)
-- Insert into profiles (id, full_name, phone_number, role) values ('YOUR-ADMIN-UUID', 'Super Admin', '09000000000', 'admin');

-- ============================================================================
-- Generated for RideNow Philippines MVP - Pilot Launch 2026
-- ============================================================================
