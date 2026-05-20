import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const stub = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
};

const updateProfileSchema = z.object({
  full_name: z.string().min(1).optional(),
  profile_photo_url: z.string().url().optional(),
  default_pickup_address: z.string().optional(),
  default_dropoff_address: z.string().optional(),
  gcash_number: z.string().regex(/^09\d{9}$/).optional(),
  saved_locations: z
    .array(
      z.object({
        label: z.string(),
        address: z.string(),
        lat: z.number(),
        lng: z.number(),
      }),
    )
    .max(10)
    .optional(),
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['completed', 'cancelled', 'disputed'])
    .optional(),
});

// GET /api/v1/riders/profile
router.get(
  '/profile',
  authenticate,
  requireRole(['customer']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, profile_photo_url, role, created_at')
        .eq('id', userId)
        .single();

      if (profileErr) throw profileErr;

      const { data: customerProfile, error: customerErr } = await supabaseAdmin
        .from('customer_profiles')
        .select(
          'default_pickup_address, default_dropoff_address, gcash_number, ' +
            'saved_locations, rating_average, total_rides',
        )
        .eq('user_id', userId)
        .single();

      if (customerErr) throw customerErr;

      res.json({ profile: Object.assign({}, profile, customerProfile) });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/v1/riders/profile
router.put(
  '/profile',
  authenticate,
  requireRole(['customer']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const body = updateProfileSchema.parse(req.body);

      const { full_name, profile_photo_url, ...customerFields } = body;

      if (full_name !== undefined || profile_photo_url !== undefined) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            ...(full_name !== undefined && { full_name }),
            ...(profile_photo_url !== undefined && { profile_photo_url }),
          })
          .eq('id', userId);
        if (error) throw error;
      }

      if (Object.keys(customerFields).length > 0) {
        const { error } = await supabaseAdmin
          .from('customer_profiles')
          .update(customerFields)
          .eq('user_id', userId);
        if (error) throw error;
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/riders/history
router.get(
  '/history',
  authenticate,
  requireRole(['customer']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { page, limit, status } = historyQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('rides')
        .select(
          'id, status, pickup_address, dropoff_address, fare_estimate, final_fare, ' +
            'payment_method, payment_status, distance_km, duration_min, ' +
            'driver_rating_given, customer_rating_given, created_at, completed_at, ' +
            'driver_id, profiles!rides_driver_id_fkey(full_name, profile_photo_url)',
          { count: 'exact' },
        )
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      } else {
        // Default: only terminal statuses for a history view
        query = query.in('status', ['completed', 'cancelled', 'disputed']);
      }

      const { data: rides, count, error } = await query;
      if (error) throw error;

      res.json({ rides: rides ?? [], total: count ?? 0, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

const favoriteSchema = z.object({
  label: z.string().min(1).max(50),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

// GET /api/v1/riders/favorites
router.get('/favorites', authenticate, requireRole(['customer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('customer_profiles')
      .select('saved_locations')
      .eq('user_id', req.user!.id)
      .single();
    if (error) throw error;
    res.json({ favorites: data?.saved_locations ?? [] });
  } catch (err) { next(err); }
});

// POST /api/v1/riders/favorites
router.post('/favorites', authenticate, requireRole(['customer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const entry = favoriteSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('customer_profiles')
      .select('saved_locations')
      .eq('user_id', req.user!.id)
      .single();
    if (error) throw error;
    const current: typeof entry[] = data?.saved_locations ?? [];
    if (current.length >= 10) {
      res.status(400).json({ error: 'max_favorites', message: 'Maximum 10 saved locations' });
      return;
    }
    const updated = [...current, entry];
    const { error: updateErr } = await supabaseAdmin
      .from('customer_profiles')
      .update({ saved_locations: updated })
      .eq('user_id', req.user!.id);
    if (updateErr) throw updateErr;
    res.status(201).json({ favorites: updated });
  } catch (err) { next(err); }
});

// DELETE /api/v1/riders/favorites/:index
router.delete('/favorites/:index', authenticate, requireRole(['customer']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0) { res.status(400).json({ error: 'invalid_index' }); return; }
    const { data, error } = await supabaseAdmin
      .from('customer_profiles')
      .select('saved_locations')
      .eq('user_id', req.user!.id)
      .single();
    if (error) throw error;
    const current: unknown[] = data?.saved_locations ?? [];
    if (idx >= current.length) { res.status(404).json({ error: 'not_found' }); return; }
    const updated = current.filter((_, i) => i !== idx);
    const { error: updateErr } = await supabaseAdmin
      .from('customer_profiles')
      .update({ saved_locations: updated })
      .eq('user_id', req.user!.id);
    if (updateErr) throw updateErr;
    res.json({ favorites: updated });
  } catch (err) { next(err); }
});

export default router;
