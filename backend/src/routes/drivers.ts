import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const updateProfileSchema = z.object({
  full_name: z.string().min(1).optional(),
  profile_photo_url: z.string().url().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_color: z.string().optional(),
  plate_number: z.string().optional(),
  year_manufactured: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
});

const locationBatchSchema = z.object({
  locations: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        timestamp: z.string().datetime().optional(),
      }),
    )
    .min(1),
});

const documentSchema = z.object({
  documents: z
    .array(
      z.object({
        type: z.enum(['license_front', 'license_back', 'or_cr', 'vehicle_photo', 'selfie']),
        url: z.string().url(),
      }),
    )
    .min(1),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const earningsQuerySchema = paginationSchema.extend({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const ridesQuerySchema = paginationSchema.extend({
  status: z
    .enum(['accepted', 'in_progress', 'completed', 'cancelled', 'disputed'])
    .optional(),
});

// GET /api/v1/drivers/profile
router.get(
  '/profile',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, profile_photo_url, role, created_at')
        .eq('id', driverId)
        .single();

      if (profileErr) throw profileErr;

      const { data: driverProfile, error: driverErr } = await supabaseAdmin
        .from('driver_profiles')
        .select(
          'vehicle_make, vehicle_model, vehicle_color, plate_number, year_manufactured, vehicle_type, ' +
            'is_online, is_available, wallet_balance, wallet_state, ' +
            'verification_status, rating_average, total_rides, ' +
            'current_location_lat, current_location_lng, last_location_update',
        )
        .eq('user_id', driverId)
        .single();

      if (driverErr) throw driverErr;

      res.json({ profile: Object.assign({}, profile, driverProfile) });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/v1/drivers/profile
router.put(
  '/profile',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;
      const body = updateProfileSchema.parse(req.body);

      const { full_name, profile_photo_url, ...driverFields } = body;

      if (full_name !== undefined || profile_photo_url !== undefined) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            ...(full_name !== undefined && { full_name }),
            ...(profile_photo_url !== undefined && { profile_photo_url }),
          })
          .eq('id', driverId);
        if (error) throw error;
      }

      if (Object.keys(driverFields).length > 0) {
        const { error } = await supabaseAdmin
          .from('driver_profiles')
          .update(driverFields)
          .eq('user_id', driverId);
        if (error) throw error;
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/drivers/documents
router.post(
  '/documents',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;
      const { documents } = documentSchema.parse(req.body);

      const { data: current, error: fetchErr } = await supabaseAdmin
        .from('driver_profiles')
        .select('verification_documents')
        .eq('user_id', driverId)
        .single();

      if (fetchErr) throw fetchErr;

      const existing = Array.isArray(current.verification_documents)
        ? (current.verification_documents as unknown[])
        : [];
      const merged = [...existing, ...documents];

      const { error: updateErr } = await supabaseAdmin
        .from('driver_profiles')
        .update({ verification_documents: merged })
        .eq('user_id', driverId);

      if (updateErr) throw updateErr;

      res.status(201).json({ success: true, total_documents: merged.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/drivers/documents
router.get(
  '/documents',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data, error } = await supabaseAdmin
        .from('driver_profiles')
        .select('verification_documents, verification_status')
        .eq('user_id', req.user!.id)
        .single();

      if (error) throw error;

      res.json({
        documents: data.verification_documents ?? [],
        verification_status: data.verification_status,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/drivers/toggle-online
router.post(
  '/toggle-online',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;

      const { data: driver, error: fetchErr } = await supabaseAdmin
        .from('driver_profiles')
        .select('is_online, wallet_state, verification_status')
        .eq('user_id', driverId)
        .single();

      if (fetchErr) throw fetchErr;

      const goingOnline = !driver.is_online;

      if (goingOnline) {
        if (driver.verification_status !== 'verified') {
          res.status(403).json({ error: 'not_verified' });
          return;
        }
        if (driver.wallet_state === 'BLOCKED_RED') {
          res.status(403).json({ error: 'wallet_blocked' });
          return;
        }
      }

      const update = goingOnline
        ? { is_online: true, is_available: true }
        : { is_online: false, is_available: false };

      const { error: updateErr } = await supabaseAdmin
        .from('driver_profiles')
        .update(update)
        .eq('user_id', driverId);

      if (updateErr) throw updateErr;

      res.json({ is_online: goingOnline, is_available: goingOnline });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/drivers/location/batch
router.post(
  '/location/batch',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;
      const { locations } = locationBatchSchema.parse(req.body);

      // Use the most recent location from the batch
      const sorted = [...locations].sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      const latest = sorted[0];

      // Only update location if driver is online — never touch is_available
      const { error } = await supabaseAdmin
        .from('driver_profiles')
        .update({
          current_location_lat: latest.latitude,
          current_location_lng: latest.longitude,
          last_location_update: latest.timestamp ?? new Date().toISOString(),
        })
        .eq('user_id', driverId)
        .eq('is_online', true);

      if (error) throw error;

      res.json({ success: true, processed: locations.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/drivers/earnings
router.get(
  '/earnings',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;
      const { page, limit, from, to } = earningsQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;

      // Current wallet state
      const { data: walletRow, error: walletErr } = await supabaseAdmin
        .from('driver_profiles')
        .select('wallet_balance, wallet_state')
        .eq('user_id', driverId)
        .single();

      if (walletErr) throw walletErr;

      // Paginated transactions
      let txnQuery = supabaseAdmin
        .from('wallet_transactions')
        .select('*', { count: 'exact' })
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (from) txnQuery = txnQuery.gte('created_at', from);
      if (to) txnQuery = txnQuery.lte('created_at', to);

      const { data: transactions, count, error: txnErr } = await txnQuery;
      if (txnErr) throw txnErr;

      // Period totals (all rows in range, not just the page)
      let summaryQuery = supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('driver_id', driverId);

      if (from) summaryQuery = summaryQuery.gte('created_at', from);
      if (to) summaryQuery = summaryQuery.lte('created_at', to);

      const { data: allAmounts, error: summaryErr } = await summaryQuery;
      if (summaryErr) throw summaryErr;

      const credits = (allAmounts ?? [])
        .filter((r) => (r.amount as number) > 0)
        .reduce((sum, r) => sum + (r.amount as number), 0);
      const debits = (allAmounts ?? [])
        .filter((r) => (r.amount as number) < 0)
        .reduce((sum, r) => sum + Math.abs(r.amount as number), 0);

      res.json({
        wallet_balance: walletRow.wallet_balance,
        wallet_state: walletRow.wallet_state,
        summary: {
          credits: parseFloat(credits.toFixed(2)),
          debits: parseFloat(debits.toFixed(2)),
          net: parseFloat((credits - debits).toFixed(2)),
        },
        transactions: transactions ?? [],
        total: count ?? 0,
        page,
        limit,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/drivers/rides
router.get(
  '/rides',
  authenticate,
  requireRole(['driver']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user!.id;
      const { page, limit, status } = ridesQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('rides')
        .select(
          'id, status, pickup_address, dropoff_address, fare_estimate, final_fare, ' +
            'payment_method, payment_status, distance_km, duration_min, ' +
            'driver_rating_given, customer_rating_given, created_at, completed_at',
          { count: 'exact' },
        )
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);

      const { data: rides, count, error } = await query;
      if (error) throw error;

      res.json({ rides: rides ?? [], total: count ?? 0, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
