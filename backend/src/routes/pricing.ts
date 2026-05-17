import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { calculateFare, estimateDurationMin, haversineKm } from '../services/pricing';

const router = Router();

const estimateSchema = z.object({
  pickup_lat: z.coerce.number().min(-90).max(90),
  pickup_lng: z.coerce.number().min(-180).max(180),
  dropoff_lat: z.coerce.number().min(-90).max(90),
  dropoff_lng: z.coerce.number().min(-180).max(180),
  surge_multiplier: z.coerce.number().min(1).max(3).optional().default(1),
});

// GET /api/v1/pricing/estimate?pickup_lat=&pickup_lng=&dropoff_lat=&dropoff_lng=
router.get('/estimate', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const p = estimateSchema.parse(req.query);
    const distanceKm = haversineKm(p.pickup_lat, p.pickup_lng, p.dropoff_lat, p.dropoff_lng);
    const durationMin = estimateDurationMin(distanceKm);
    const fareEstimate = calculateFare(distanceKm, durationMin, p.surge_multiplier);

    res.json({
      distance_km: parseFloat(distanceKm.toFixed(2)),
      duration_min: durationMin,
      fare_estimate: fareEstimate,
      surge_multiplier: p.surge_multiplier,
      breakdown: {
        base_fare: 50,
        per_km_charge: parseFloat((distanceKm * 15).toFixed(2)),
        per_min_charge: parseFloat((durationMin * 2).toFixed(2)),
        booking_fee: 10,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/pricing/surge
router.get('/surge', authenticate, (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
});

export default router;
