// Fare formula from spec: (Base + Distance×PerKm + Time×PerMin + BookingFee) × SurgeMultiplier
const BASE_FARE = 50;
const PER_KM = 15;
const PER_MIN = 2;
const BOOKING_FEE = 10;
const MIN_FARE = 89;
const AVG_SPEED_KPH = 25; // Conservative Manila traffic estimate

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

export function calculateFare(distanceKm: number, durationMin: number, surgeMultiplier = 1.0): number {
  const raw =
    (BASE_FARE + distanceKm * PER_KM + durationMin * PER_MIN + BOOKING_FEE) * surgeMultiplier;
  return Math.max(parseFloat(raw.toFixed(2)), MIN_FARE);
}
