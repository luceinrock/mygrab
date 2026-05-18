import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';

const router = Router();
const guard = [authenticate, requireRole(['admin'])];

// GET /api/v1/admin/analytics/overview
router.get('/analytics/overview', ...guard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const { data: rides, error } = await supabaseAdmin
      .from('rides')
      .select('status, final_fare, fare_estimate, created_at');
    if (error) throw error;

    const todayStr = today.toISOString();
    const total = rides.length;
    const todayRides = rides.filter(r => r.created_at >= todayStr);
    const active = rides.filter(r => ['requested','accepted','arrived','in_progress'].includes(r.status)).length;
    const completed = rides.filter(r => r.status === 'completed');
    const cancelled = rides.filter(r => r.status === 'cancelled').length;
    const revenue = (n: typeof rides) => n.reduce((s, r) => s + (r.final_fare ?? r.fare_estimate ?? 0), 0);

    res.json({
      overview: {
        total_rides: total,
        rides_today: todayRides.length,
        active_rides: active,
        completed_rides: completed.length,
        cancelled_rides: cancelled,
        total_revenue: parseFloat(revenue(completed).toFixed(2)),
        revenue_today: parseFloat(revenue(todayRides.filter(r => r.status === 'completed')).toFixed(2)),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/drivers?status=pending|verified|suspended
router.get('/drivers', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = (req.query.status as string) ?? 'pending';
    const verificationMap: Record<string, string> = {
      pending: 'pending',
      verified: 'verified',
      suspended: 'suspended',
    };
    const vs = verificationMap[status] ?? 'pending';

    const { data, error } = await supabaseAdmin
      .from('driver_profiles')
      .select(`
        user_id,
        vehicle_make, vehicle_model, vehicle_color, plate_number,
        is_online, rating_average, total_rides, verification_status,
        profiles!inner(id, full_name, email, created_at)
      `)
      .eq('verification_status', vs)
      .order('created_at', { referencedTable: 'profiles', ascending: false });
    if (error) throw error;

    const drivers = (data ?? []).map((d: any) => ({
      id: d.user_id,
      full_name: d.profiles.full_name,
      email: d.profiles.email,
      created_at: d.profiles.created_at,
      vehicle_make: d.vehicle_make,
      vehicle_model: d.vehicle_model,
      plate_number: d.plate_number,
      is_online: d.is_online,
      rating_average: d.rating_average,
      total_rides: d.total_rides,
      verification_status: d.verification_status,
    }));

    res.json({ drivers });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/drivers/:id/approve
router.post('/drivers/:id/approve', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('driver_profiles')
      .update({ verification_status: 'verified' })
      .eq('user_id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/drivers/:id/reject
router.post('/drivers/:id/reject', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('driver_profiles')
      .update({ verification_status: 'rejected' })
      .eq('user_id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/drivers/:id/suspend
router.post('/drivers/:id/suspend', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('driver_profiles')
      .update({ verification_status: 'suspended', is_online: false })
      .eq('user_id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/pricing
router.get('/pricing', ...guard, (_req: Request, res: Response): void => {
  res.json({
    surge_multiplier: parseFloat(process.env.SURGE_MULTIPLIER ?? '1'),
    base_fare: 50,
    per_km: 15,
    per_min: 2,
    booking_fee: 10,
    min_fare: 89,
  });
});

// PUT /api/v1/admin/pricing/surge  — in-memory; persists until server restarts
let surgeMem = 1;
router.put('/pricing/surge', ...guard, (req: Request, res: Response): void => {
  const val = parseFloat(req.body?.surge_multiplier);
  if (isNaN(val) || val < 1 || val > 3) {
    res.status(400).json({ error: 'surge_multiplier must be 1–3' });
    return;
  }
  surgeMem = val;
  res.json({ surge_multiplier: surgeMem });
});

export default router;
