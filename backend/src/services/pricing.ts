export const PER_MIN = 2;
export const BOOKING_FEE = 10;
export const MIN_FARE = 89;
const AVG_SPEED_KPH = 25;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDurationMin(distanceKm: number): number {
  return Math.ceil((distanceKm / AVG_SPEED_KPH) * 60);
}

// baseFare and perKm are vehicle-type specific; defaults match legacy lite rates
export function calculateFare(
  distanceKm: number,
  durationMin: number,
  baseFare = 50,
  perKm = 15,
  surgeMultiplier = 1.0,
): number {
  const raw = (baseFare + distanceKm * perKm + durationMin * PER_MIN + BOOKING_FEE) * surgeMultiplier;
  return Math.max(parseFloat(raw.toFixed(2)), MIN_FARE);
}
