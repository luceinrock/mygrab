import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';
import { calculateFare, estimateDurationMin, haversineKm } from '../services/pricing';
import { findNearestDrivers } from '../services/matching';

const router = Router();

const stub = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
};

const requestRideSchema = z.object({
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  pickup_address: z.string().min(1),
  dropoff_lat: z.number().min(-90).max(90),
  dropoff_lng: z.number().min(-180).max(180),
  dropoff_address: z.string().min(1),
  payment_method: z.enum(['gcash', 'cash', 'paymaya']),
  ride_type: z.enum(['lite', 'plus', 'moto']).default('lite'),
});

// POST /api/v1/rides/request
router.post(
  '/request',
  authenticate,
  requireRole(['customer']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = requestRideSchema.parse(req.body);

      const distanceKm = haversineKm(
        body.pickup_lat,
        body.pickup_lng,
        body.dropoff_lat,
        body.dropoff_lng,
      );
      const durationMin = estimateDurationMin(distanceKm);
      const fareEstimate = calculateFare(distanceKm, durationMin);

      const { data: ride, error } = await supabaseAdmin
        .from('rides')
        .insert({
          customer_id: req.user!.id,
          pickup_lat: body.pickup_lat,
          pickup_lng: body.pickup_lng,
          pickup_address: body.pickup_address,
          dropoff_lat: body.dropoff_lat,
          dropoff_lng: body.dropoff_lng,
          dropoff_address: body.dropoff_address,
          payment_method: body.payment_method,
          fare_estimate: fareEstimate,
          distance_km: parseFloat(distanceKm.toFixed(2)),
          duration_min: durationMin,
          status: 'requested',
        })
        .select()
        .single();

      if (error) throw error;

      // Nearby drivers receive this ride via Supabase Realtime (INSERT on 'rides' table)
      const nearbyDrivers = await findNearestDrivers(body.pickup_lat, body.pickup_lng);

      res.status(201).json({ ride, nearby_drivers_count: nearbyDrivers.length });
    } catch (err) {
      next(err);
    }
  },
);

// Specific static paths must precede /:id
router.get('/active', authenticate, stub);

router.get('/:id', authenticate, stub);
router.post('/:id/accept', authenticate, requireRole(['driver']), stub);
router.post('/:id/start', authenticate, requireRole(['driver']), stub);
router.post('/:id/complete', authenticate, requireRole(['driver']), stub);
router.post('/:id/cancel', authenticate, stub);
router.post('/:id/rate', authenticate, stub);

export default router;
