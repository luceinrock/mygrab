-- ============================================================================
-- MIGRATION 002: Vehicle Type + Geospatial Index Fix
-- - Adds vehicle_type to driver_profiles (needed for ride-type matching)
-- - Drops broken ll_to_earth index (requires earthdistance ext, not enabled)
-- - Replaces with PostGIS geography GIST index (ST_DWithin-compatible)
-- - Adds accepted_at to rides (tracks when driver claimed a ride)
-- ============================================================================

-- 1. VEHICLE TYPE
-- ----------------------------------------------------------------------------
create type vehicle_type as enum ('lite', 'plus', 'moto');

alter table driver_profiles
  add column vehicle_type vehicle_type default 'lite';

-- 2. FIX GEOSPATIAL INDEX
-- ----------------------------------------------------------------------------
-- migration 001 used ll_to_earth() which requires the earthdistance extension.
-- Only postgis is enabled. Drop the broken index and replace with a
-- PostGIS geography GIST index that supports ST_DWithin at scale.
drop index if exists idx_driver_location;

create index idx_driver_location_geo on driver_profiles
  using gist (
    cast(st_setsrid(st_makepoint(current_location_lng, current_location_lat), 4326) as geography)
  );

-- 3. RIDES: ADD ACCEPTED_AT
-- ----------------------------------------------------------------------------
alter table rides
  add column accepted_at timestamptz;

-- ============================================================================
-- Generated for RideNow Philippines MVP - 2026
-- ============================================================================
