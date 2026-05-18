import { supabaseAdmin } from '../config/supabase';
import { haversineKm } from './pricing';

const SEARCH_RADIUS_KM = 10000;
const MAX_RESULTS = 5;

interface NearbyDriver {
  user_id: string;
  current_location_lat: number;
  current_location_lng: number;
  rating_average: number;
  distance_km: number;
}

export async function findNearestDrivers(
  pickupLat: number,
  pickupLng: number,
  // TODO: add ride_type filter once vehicle_type is added to driver_profiles (migration 002)
): Promise<NearbyDriver[]> {
  // Bounding box pre-filter before precise haversine sort (1 degree ≈ 111 km)
  const delta = SEARCH_RADIUS_KM / 111;

  const { data, error } = await supabaseAdmin
    .from('driver_profiles')
    .select('user_id, current_location_lat, current_location_lng, rating_average')
    .eq('is_online', true)
    .eq('is_available', true)
    .eq('verification_status', 'verified')
    .neq('wallet_state', 'BLOCKED_RED')
    .gte('current_location_lat', pickupLat - delta)
    .lte('current_location_lat', pickupLat + delta)
    .gte('current_location_lng', pickupLng - delta)
    .lte('current_location_lng', pickupLng + delta)
    .limit(20);

  if (error || !data) return [];

  // TODO: move to Supabase RPC with PostGIS ST_DWithin once load warrants it
  return data
    .map((d) => ({
      ...d,
      distance_km: haversineKm(pickupLat, pickupLng, d.current_location_lat, d.current_location_lng),
    }))
    .filter((d) => d.distance_km <= SEARCH_RADIUS_KM)
    .sort((a, b) => a.distance_km - b.distance_km || b.rating_average - a.rating_average)
    .slice(0, MAX_RESULTS);
}
