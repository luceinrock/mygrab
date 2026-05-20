import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';
import { calculateFare, estimateDurationMin, haversineKm } from '../services/pricing';
import { findNearestDrivers } from '../services/matching';
import { getPlatformConfig, calcCommissionFee, getVehicleRates } from '../services/configService';
import { validatePromoCode } from './promos';

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
  promo_code: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().min(1).optional(),
});

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
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
      const config = await getPlatformConfig();
      const { baseFare, perKm } = getVehicleRates(body.ride_type, config);
      let fareEstimate = calculateFare(distanceKm, durationMin, baseFare, perKm, config.surge_multiplier);

      let discountApplied = 0;
      let appliedPromoCode: string | null = null;
      let promoRow: Record<string, unknown> | null = null;

      if (body.promo_code) {
        const promoResult = await validatePromoCode(body.promo_code, fareEstimate, req.user!.id);
        if (!promoResult.valid) {
          res.status(400).json({ error: 'invalid_promo', reason: promoResult.reason });
          return;
        }
        discountApplied = promoResult.savings;
        appliedPromoCode = promoResult.promo.code as string;
        promoRow = promoResult.promo;
        fareEstimate = promoResult.discountedFare;
      }

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
          promo_code: appliedPromoCode,
          discount_applied: discountApplied,
        })
        .select()
        .single();

      if (error) throw error;

      if (promoRow) {
        await supabaseAdmin
          .from('promo_codes')
          .update({ times_used: (promoRow.times_used as number) + 1 })
          .eq('id', promoRow.id as string);
      }

      // Nearby drivers receive this ride via Supabase Realtime (INSERT on 'rides' table)
      const nearbyDrivers = await findNearestDrivers(body.pickup_lat, body.pickup_lng);

      res.status(201).json({ ride, nearby_drivers_count: nearbyDrivers.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/rides/active — returns the single active ride for the authenticated user
router.get(
  '/active',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const activeStatuses = ['requested', 'accepted', 'arrived', 'in_progress'];

      const col = role === 'driver' ? 'driver_id' : 'customer_id';

      const { data: ride, error } = await supabaseAdmin
        .from('rides')
        .select('*')
        .eq(col, userId)
        .in('status', activeStatuses)
        .maybeSingle();

      if (error) throw error;

      res.json({ ride });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data: ride, error } = await supabaseAdmin
        .from('rides')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        throw error;
      }

      const uid = req.user!.id;
      const role = req.user!.role;
      if (role !== 'admin' && ride.customer_id !== uid && ride.driver_id !== uid) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      res.json({ ride });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/rides/:id/accept
router.post(
  '/:id/accept',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;

      const [{ data: driver, error: driverErr }, config] = await Promise.all([
        supabaseAdmin
          .from('driver_profiles')
          .select('is_online, is_available, wallet_state, wallet_balance, verification_status')
          .eq('user_id', driverId)
          .single(),
        getPlatformConfig(),
      ]);

      if (driverErr) throw driverErr;

      if (!driver.is_online || !driver.is_available) {
        res.status(409).json({ error: 'driver_not_available' });
        return;
      }
      if (driver.verification_status !== 'verified') {
        res.status(403).json({ error: 'not_verified' });
        return;
      }
      if (Number(driver.wallet_balance) < config.min_driver_balance) {
        res.status(403).json({ error: 'insufficient_balance', min_required: config.min_driver_balance });
        return;
      }

      // Atomic claim: only succeeds if ride is still unclaimed
      const { data: ride, error: acceptErr } = await supabaseAdmin
        .from('rides')
        .update({
          driver_id: driverId,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', req.params.id)
        .eq('status', 'requested')
        .is('driver_id', null)
        .select()
        .single();

      if (acceptErr) {
        if (acceptErr.code === 'PGRST116') {
          res.status(409).json({ error: 'ride_already_taken' });
          return;
        }
        throw acceptErr;
      }

      await supabaseAdmin
        .from('driver_profiles')
        .update({ is_available: false })
        .eq('user_id', driverId);

      res.json({ ride });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/rides/:id/arrived
router.post(
  '/:id/arrived',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data: ride, error } = await supabaseAdmin
        .from('rides')
        .update({ status: 'arrived' })
        .eq('id', req.params.id)
        .eq('driver_id', req.user!.id)
        .eq('status', 'accepted')
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(409).json({ error: 'invalid_transition' });
          return;
        }
        throw error;
      }

      res.json({ ride });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/rides/:id/start
router.post(
  '/:id/start',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data: ride, error } = await supabaseAdmin
        .from('rides')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('driver_id', req.user!.id)
        .eq('status', 'arrived')
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(409).json({ error: 'invalid_transition' });
          return;
        }
        throw error;
      }

      res.json({ ride });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/rides/:id/complete
router.post(
  '/:id/complete',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;

      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('rides')
        .select('*')
        .eq('id', req.params.id)
        .eq('driver_id', driverId)
        .eq('status', 'in_progress')
        .single();

      if (fetchErr) {
        if (fetchErr.code === 'PGRST116') {
          res.status(409).json({ error: 'invalid_transition' });
          return;
        }
        throw fetchErr;
      }

      const finalFare = existing.fare_estimate as number;
      const paymentStatus = existing.payment_method === 'cash' ? 'paid' : 'pending';

      const { data: ride, error: completeErr } = await supabaseAdmin
        .from('rides')
        .update({
          status: 'completed',
          final_fare: finalFare,
          completed_at: new Date().toISOString(),
          payment_status: paymentStatus,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (completeErr) throw completeErr;

      const config = await getPlatformConfig();
      const commission = calcCommissionFee(Number(existing.distance_km ?? 0), config);

      const { error: commissionErr } = await supabaseAdmin.rpc('process_driver_commission', {
        p_driver_id: driverId,
        p_ride_id: req.params.id,
        p_amount: commission,
      });

      if (commissionErr) throw commissionErr;

      await supabaseAdmin
        .from('driver_profiles')
        .update({ is_available: true })
        .eq('user_id', driverId);

      res.json({ ride });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/rides/:id/cancel
router.post(
  '/:id/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const { reason } = cancelSchema.parse(req.body);

      const { data: ride, error: fetchErr } = await supabaseAdmin
        .from('rides')
        .select('id, customer_id, driver_id, status')
        .eq('id', req.params.id)
        .single();

      if (fetchErr) {
        if (fetchErr.code === 'PGRST116') {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        throw fetchErr;
      }

      if (role !== 'admin' && ride.customer_id !== userId && ride.driver_id !== userId) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      const cancellableStatuses = ['requested', 'accepted', 'arrived'];
      if (!cancellableStatuses.includes(ride.status as string)) {
        res.status(409).json({ error: 'invalid_transition', current_status: ride.status });
        return;
      }

      const { data: cancelled, error: cancelErr } = await supabaseAdmin
        .from('rides')
        .update({
          status: 'cancelled',
          cancelled_by: userId,
          cancellation_reason: reason ?? null,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (cancelErr) throw cancelErr;

      // If ride had a driver, free them up
      if (ride.driver_id) {
        await supabaseAdmin
          .from('driver_profiles')
          .update({ is_available: true })
          .eq('user_id', ride.driver_id as string);
      }

      // Track cancellation strike when a customer cancels a ride that had already been accepted
      const cancelledByCustomer = userId === ride.customer_id;
      const hadDriver = !!ride.driver_id;
      if (cancelledByCustomer && hadDriver) {
        await supabaseAdmin.rpc('increment_cancellation_strikes', {
          p_customer_id: ride.customer_id as string,
        });
      }

      res.json({ ride: cancelled });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/rides/:id/location  — driver sends GPS ping every few seconds
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

router.patch(
  '/:id/location',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lat, lng } = locationSchema.parse(req.body);

      const { data, error } = await supabaseAdmin.rpc('append_ride_location', {
        p_ride_id:   req.params.id,
        p_driver_id: req.user!.id,
        p_lat:       lat,
        p_lng:       lng,
      });

      if (error) {
        if (error.message.includes('ride_not_found_or_not_active')) {
          res.status(409).json({ error: 'ride_not_found_or_not_active' });
          return;
        }
        throw error;
      }

      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/rides/:id/rate
router.post(
  '/:id/rate',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const { rating, comment } = rateSchema.parse(req.body);

      const { data: ride, error: fetchErr } = await supabaseAdmin
        .from('rides')
        .select('id, customer_id, driver_id, status, driver_rating_given, customer_rating_given')
        .eq('id', req.params.id)
        .single();

      if (fetchErr) {
        if (fetchErr.code === 'PGRST116') {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        throw fetchErr;
      }

      if (ride.status !== 'completed') {
        res.status(409).json({ error: 'ride_not_completed' });
        return;
      }

      if (role === 'customer') {
        if (ride.customer_id !== userId) {
          res.status(403).json({ error: 'forbidden' });
          return;
        }
        if (ride.driver_rating_given !== null) {
          res.status(409).json({ error: 'already_rated' });
          return;
        }

        await supabaseAdmin
          .from('rides')
          .update({ driver_rating_given: rating, customer_comment: comment ?? null })
          .eq('id', req.params.id);

        const { data: allRatings } = await supabaseAdmin
          .from('rides')
          .select('driver_rating_given')
          .eq('driver_id', ride.driver_id as string)
          .not('driver_rating_given', 'is', null);

        if (allRatings && allRatings.length > 0) {
          const avg =
            allRatings.reduce((sum, r) => sum + ((r.driver_rating_given as number) ?? 0), 0) /
            allRatings.length;
          await supabaseAdmin
            .from('driver_profiles')
            .update({ rating_average: parseFloat(avg.toFixed(2)) })
            .eq('user_id', ride.driver_id as string);
        }
      } else if (role === 'driver') {
        if (ride.driver_id !== userId) {
          res.status(403).json({ error: 'forbidden' });
          return;
        }
        if (ride.customer_rating_given !== null) {
          res.status(409).json({ error: 'already_rated' });
          return;
        }

        await supabaseAdmin
          .from('rides')
          .update({ customer_rating_given: rating, driver_comment: comment ?? null })
          .eq('id', req.params.id);

        const { data: allRatings } = await supabaseAdmin
          .from('rides')
          .select('customer_rating_given')
          .eq('customer_id', ride.customer_id as string)
          .not('customer_rating_given', 'is', null);

        if (allRatings && allRatings.length > 0) {
          const avg =
            allRatings.reduce((sum, r) => sum + ((r.customer_rating_given as number) ?? 0), 0) /
            allRatings.length;
          await supabaseAdmin
            .from('customer_profiles')
            .update({ rating_average: parseFloat(avg.toFixed(2)) })
            .eq('user_id', ride.customer_id as string);
        }
      } else {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
