import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { calculateFare, estimateDurationMin, haversineKm, PER_MIN, BOOKING_FEE } from '../services/pricing';
import { getPlatformConfig, getVehicleRates } from '../services/configService';

const router = Router();

const estimateSchema = z.object({
  pickup_lat:   z.coerce.number().min(-90).max(90),
  pickup_lng:   z.coerce.number().min(-180).max(180),
  dropoff_lat:  z.coerce.number().min(-90).max(90),
  dropoff_lng:  z.coerce.number().min(-180).max(180),
  vehicle_type: z.enum(['lite', 'plus', 'moto']).default('lite'),
});

// GET /api/v1/pricing/estimate
router.get('/estimate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const p = estimateSchema.parse(req.query);
    const config = await getPlatformConfig();
    const { baseFare, perKm } = getVehicleRates(p.vehicle_type, config);

    const distanceKm = haversineKm(p.pickup_lat, p.pickup_lng, p.dropoff_lat, p.dropoff_lng);
    const durationMin = estimateDurationMin(distanceKm);
    const fareEstimate = calculateFare(distanceKm, durationMin, baseFare, perKm, config.surge_multiplier);

    res.json({
      distance_km: parseFloat(distanceKm.toFixed(2)),
      duration_min: durationMin,
      fare_estimate: fareEstimate,
      surge_multiplier: config.surge_multiplier,
      vehicle_type: p.vehicle_type,
      breakdown: {
        base_fare: baseFare,
        per_km_charge: parseFloat((distanceKm * perKm).toFixed(2)),
        per_min_charge: parseFloat((durationMin * PER_MIN).toFixed(2)),
        booking_fee: BOOKING_FEE,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
