import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';
import { getPlatformConfig } from '../services/configService';
import { PER_MIN, BOOKING_FEE, MIN_FARE } from '../services/pricing';

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

// GET /api/v1/admin/analytics/timeseries?days=7
router.get('/analytics/timeseries', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = Math.min(30, Math.max(7, parseInt(req.query.days as string) || 7));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0, 0, 0, 0);

    const { data: rides, error } = await supabaseAdmin
      .from('rides')
      .select('status, final_fare, created_at')
      .gte('created_at', cutoff.toISOString());
    if (error) throw error;

    // Build a bucket for every day in the range (fills zeros for empty days)
    type Bucket = { date: string; rides: number; completed: number; revenue: number };
    const dateMap: Record<string, Bucket> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(cutoff);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { date: key, rides: 0, completed: 0, revenue: 0 };
    }

    for (const ride of rides ?? []) {
      const key = (ride.created_at as string).slice(0, 10);
      if (!dateMap[key]) continue;
      dateMap[key].rides++;
      if (ride.status === 'completed') {
        dateMap[key].completed++;
        dateMap[key].revenue += Number(ride.final_fare ?? 0);
      }
    }

    const series = Object.values(dateMap).map(b => ({
      ...b,
      revenue: parseFloat(b.revenue.toFixed(2)),
    }));

    res.json({ series });
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
        wallet_balance, wallet_state,
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
      wallet_balance: d.wallet_balance,
      wallet_state: d.wallet_state,
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

// GET /api/v1/admin/drivers/online
router.get('/drivers/online', ...guard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('driver_profiles')
      .select(`
        user_id,
        is_online,
        current_location_lat,
        current_location_lng,
        last_location_update,
        vehicle_make, vehicle_model, vehicle_color, plate_number, vehicle_type,
        profiles!inner(full_name, phone_number)
      `)
      .eq('is_online', true)
      .eq('verification_status', 'verified');
    if (error) throw error;

    const drivers = (data ?? []).map((d: any) => ({
      id: d.user_id,
      full_name: d.profiles.full_name,
      phone: d.profiles.phone_number,
      vehicle_make: d.vehicle_make,
      vehicle_model: d.vehicle_model,
      vehicle_color: d.vehicle_color,
      vehicle_type: d.vehicle_type,
      plate_number: d.plate_number,
      lat: d.current_location_lat,
      lng: d.current_location_lng,
      last_location_update: d.last_location_update,
    }));

    res.json({ drivers, count: drivers.length });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/pricing
router.get('/pricing', ...guard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await getPlatformConfig();
    res.json({
      surge_multiplier: config.surge_multiplier,
      base_fare_lite:   config.base_fare_lite,
      base_fare_plus:   config.base_fare_plus,
      base_fare_moto:   config.base_fare_moto,
      per_km_lite:      config.per_km_lite,
      per_km_plus:      config.per_km_plus,
      per_km_moto:      config.per_km_moto,
      per_min:          PER_MIN,
      booking_fee:      BOOKING_FEE,
      min_fare:         MIN_FARE,
    });
  } catch (err) { next(err); }
});

// PUT /api/v1/admin/pricing/surge — persisted to DB
router.put('/pricing/surge', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const val = parseFloat(req.body?.surge_multiplier);
  if (isNaN(val) || val < 1 || val > 3) {
    res.status(400).json({ error: 'surge_multiplier must be 1–3' });
    return;
  }
  try {
    const { error } = await supabaseAdmin
      .from('platform_config')
      .update({ surge_multiplier: val })
      .eq('id', 1);
    if (error) throw error;
    res.json({ surge_multiplier: val });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/drivers/:id/topup
router.post('/drivers/:id/topup', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const amount = parseFloat(req.body?.amount);
    const note: string = req.body?.note ?? 'Admin top-up';
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' });
      return;
    }

    const { data: driver, error: fetchErr } = await supabaseAdmin
      .from('driver_profiles')
      .select('wallet_balance')
      .eq('user_id', req.params.id)
      .single();
    if (fetchErr) { res.status(404).json({ error: 'driver_not_found' }); return; }

    const newBalance = parseFloat((Number(driver.wallet_balance) + amount).toFixed(2));
    const newState = newBalance >= 0 ? 'ACTIVE_GREEN' : newBalance >= -500 ? 'ACTIVE_YELLOW' : 'BLOCKED_RED';

    const { error: updateErr } = await supabaseAdmin
      .from('driver_profiles')
      .update({ wallet_balance: newBalance, wallet_state: newState })
      .eq('user_id', req.params.id);
    if (updateErr) throw updateErr;

    const { error: txnErr } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        driver_id: req.params.id,
        type: 'topup',
        amount,
        balance_after: newBalance,
        description: note,
        reference_id: `admin-${req.user!.id}-${Date.now()}`,
      });
    if (txnErr) throw txnErr;

    // Log the admin action
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: req.user!.id,
      action_type: 'driver_topup',
      target_entity_id: req.params.id,
      details: { amount, note, new_balance: newBalance },
    });

    res.json({ success: true, new_balance: newBalance, wallet_state: newState });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/config
router.get('/config', ...guard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_config')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    res.json({ config: data });
  } catch (err) { next(err); }
});

// PUT /api/v1/admin/config
const configSchema = {
  min_driver_balance:   (v: unknown) => typeof v === 'number' && v >= 0,
  commission_short_km:  (v: unknown) => typeof v === 'number' && v > 0,
  commission_medium_km: (v: unknown) => typeof v === 'number' && v > 0,
  commission_fee_short:  (v: unknown) => typeof v === 'number' && v >= 0,
  commission_fee_medium: (v: unknown) => typeof v === 'number' && v >= 0,
  commission_fee_long:   (v: unknown) => typeof v === 'number' && v >= 0,
  min_topup_amount:     (v: unknown) => typeof v === 'number' && v > 0,
  base_fare_lite:       (v: unknown) => typeof v === 'number' && v > 0,
  base_fare_plus:       (v: unknown) => typeof v === 'number' && v > 0,
  base_fare_moto:       (v: unknown) => typeof v === 'number' && v > 0,
  per_km_lite:          (v: unknown) => typeof v === 'number' && v > 0,
  per_km_plus:          (v: unknown) => typeof v === 'number' && v > 0,
  per_km_moto:          (v: unknown) => typeof v === 'number' && v > 0,
  proximity_radius_km:  (v: unknown) => typeof v === 'number' && v > 0 && v <= 50,
} as const;

router.put('/config', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allowed = Object.keys(configSchema) as (keyof typeof configSchema)[];
    const update: Record<string, number> = {};
    for (const key of allowed) {
      if (key in req.body) {
        if (!configSchema[key](req.body[key])) {
          res.status(400).json({ error: `invalid_value for ${key}` });
          return;
        }
        update[key] = req.body[key];
      }
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'no_valid_fields' });
      return;
    }
    update.updated_at = Date.now(); // will be cast by pg, just a marker
    const { data, error } = await supabaseAdmin
      .from('platform_config')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    res.json({ config: data });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/riders  — manually register a rider
router.post('/riders', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { full_name, email, phone } = req.body as { full_name: string; email: string; phone?: string };
    if (!full_name?.trim() || !email?.trim()) {
      res.status(400).json({ error: 'full_name and email are required' });
      return;
    }

    // Generate a temporary password the admin can hand to the rider
    const tempPassword = 'Grab@' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), phone: phone?.trim() ?? '' },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: req.user!.id,
      action_type: 'register_rider',
      target_entity_id: data.user.id,
      details: { full_name, email, registered_by: 'admin' },
    });

    res.status(201).json({
      rider: { id: data.user.id, email, full_name },
      temp_password: tempPassword,
    });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/drivers  — manually register a driver
router.post('/drivers', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      full_name, email, phone,
      vehicle_type, vehicle_make, vehicle_model, vehicle_color, plate_number, year_manufactured,
    } = req.body as {
      full_name: string; email: string; phone?: string;
      vehicle_type?: string; vehicle_make?: string; vehicle_model?: string;
      vehicle_color?: string; plate_number?: string; year_manufactured?: number;
    };

    if (!full_name?.trim() || !email?.trim()) {
      res.status(400).json({ error: 'full_name and email are required' });
      return;
    }

    const tempPassword = 'Grab@' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), phone: phone?.trim() ?? '', role: 'driver' },
    });

    if (createErr) {
      res.status(400).json({ error: createErr.message });
      return;
    }

    const userId = data.user.id;

    // Trigger sets profiles.role = 'customer' by default — correct it to 'driver'
    await supabaseAdmin.from('profiles').update({ role: 'driver' }).eq('id', userId);

    // Set vehicle details and mark as verified (driver registered in person at office)
    const vehicleUpdate: Record<string, unknown> = { verification_status: 'verified' };
    if (vehicle_type) vehicleUpdate.vehicle_type = vehicle_type;
    if (vehicle_make) vehicleUpdate.vehicle_make = vehicle_make;
    if (vehicle_model) vehicleUpdate.vehicle_model = vehicle_model;
    if (vehicle_color) vehicleUpdate.vehicle_color = vehicle_color;
    if (plate_number) vehicleUpdate.plate_number = plate_number;
    if (year_manufactured) vehicleUpdate.year_manufactured = year_manufactured;

    await supabaseAdmin.from('driver_profiles').update(vehicleUpdate).eq('user_id', userId);

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: req.user!.id,
      action_type: 'register_driver',
      target_entity_id: userId,
      details: { full_name, email, plate_number, registered_by: 'admin' },
    });

    res.status(201).json({
      driver: { id: userId, email, full_name },
      temp_password: tempPassword,
    });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/riders  — list riders with search, sort, and strike filter
router.get('/riders', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const rawSearch  = (req.query.search as string | undefined)?.trim();
    const search = rawSearch ? rawSearch.replace(/[,.()'%]/g, '') : undefined;
    const sortBy  = (req.query.sort_by  as string) || 'strikes';
    const sortAsc = (req.query.sort_dir as string) === 'asc';
    const minStrikes = Math.max(0, parseInt(req.query.min_strikes as string) || 0);

    // If searching, first resolve matching user IDs from profiles (search on direct cols)
    let filterIds: string[] | null = null;
    if (search) {
      const { data: matched } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      filterIds = (matched ?? []).map((p: any) => p.id);
      if (filterIds.length === 0) {
        res.json({ riders: [], total: 0, page, limit });
        return;
      }
    }

    let q = supabaseAdmin
      .from('customer_profiles')
      .select(
        'user_id, rating_average, total_rides, cancellation_strikes, last_cancellation_at, ' +
        'profiles!inner(full_name, email, created_at)',
        { count: 'exact' }
      );

    if (filterIds) q = q.in('user_id', filterIds);
    if (minStrikes > 0) q = q.gte('cancellation_strikes', minStrikes);

    switch (sortBy) {
      case 'rides':
        q = q.order('total_rides', { ascending: sortAsc });
        break;
      case 'rating':
        q = q.order('rating_average', { ascending: sortAsc });
        break;
      case 'joined':
        q = q.order('created_at', { referencedTable: 'profiles', ascending: sortAsc });
        break;
      default:
        q = q.order('cancellation_strikes', { ascending: sortAsc });
    }

    q = q.range(offset, offset + limit - 1);
    const { data, count, error } = await q;
    if (error) throw error;

    const riders = (data ?? []).map((r: any) => ({
      id: r.user_id,
      full_name: r.profiles.full_name,
      email: r.profiles.email,
      created_at: r.profiles.created_at,
      rating_average: r.rating_average,
      total_rides: r.total_rides,
      cancellation_strikes: r.cancellation_strikes,
      last_cancellation_at: r.last_cancellation_at,
    }));

    res.json({ riders, total: count ?? 0, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/riders/:id/rides
router.get('/riders/:id/rides', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('rides')
      .select(
        'id, status, pickup_address, dropoff_address, fare_estimate, final_fare, ' +
        'payment_method, distance_km, duration_min, created_at, completed_at, ' +
        'driver_profiles!driver_id(profiles!user_id(full_name))',
        { count: 'exact' }
      )
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const rides = (data ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      pickup_address: r.pickup_address,
      dropoff_address: r.dropoff_address,
      fare_estimate: r.fare_estimate,
      final_fare: r.final_fare,
      payment_method: r.payment_method,
      distance_km: r.distance_km,
      duration_min: r.duration_min,
      created_at: r.created_at,
      completed_at: r.completed_at,
      driver_name: r.driver_profiles?.profiles?.full_name ?? null,
    }));

    res.json({ rides, total: count ?? 0, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/rides — searchable ride history
router.get('/rides', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;
    const status  = req.query.status  as string | undefined;
    const search  = req.query.search  as string | undefined;
    const from    = req.query.from    as string | undefined;
    const to      = req.query.to      as string | undefined;

    let q = supabaseAdmin
      .from('rides')
      .select(
        'id, status, pickup_address, dropoff_address, fare_estimate, final_fare, ' +
        'payment_method, distance_km, duration_min, ride_type, cancellation_reason, ' +
        'created_at, completed_at, customer_id, driver_id, ' +
        'rider:profiles!rides_customer_id_fkey(full_name), ' +
        'driver:profiles!rides_driver_id_fkey(full_name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') q = q.eq('status', status);
    if (from) q = q.gte('created_at', from);
    if (to)   q = q.lte('created_at', to + 'T23:59:59Z');
    if (search) {
      q = q.or(`pickup_address.ilike.%${search}%,dropoff_address.ilike.%${search}%`);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    const rides = (data ?? []).map((r: any) => ({
      id:                  r.id,
      status:              r.status,
      pickup_address:      r.pickup_address,
      dropoff_address:     r.dropoff_address,
      fare_estimate:       r.fare_estimate,
      final_fare:          r.final_fare,
      payment_method:      r.payment_method,
      distance_km:         r.distance_km,
      duration_min:        r.duration_min,
      ride_type:           r.ride_type,
      cancellation_reason: r.cancellation_reason,
      created_at:          r.created_at,
      completed_at:        r.completed_at,
      rider_name:          r.rider?.full_name ?? null,
      driver_name:         r.driver?.full_name ?? null,
    }));

    res.json({ rides, total: count ?? 0, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/promos/analytics — rides & savings grouped by promo code
router.get('/promos/analytics', ...guard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('rides')
      .select('promo_code, discount_applied')
      .not('promo_code', 'is', null)
      .neq('status', 'cancelled');
    if (error) throw error;

    const map: Record<string, { rides: number; total_savings: number }> = {};
    for (const row of data ?? []) {
      const code = row.promo_code as string;
      if (!map[code]) map[code] = { rides: 0, total_savings: 0 };
      map[code].rides++;
      map[code].total_savings += Number(row.discount_applied ?? 0);
    }

    const analytics = Object.entries(map)
      .map(([code, stats]) => ({
        code,
        rides: stats.rides,
        total_savings: parseFloat(stats.total_savings.toFixed(2)),
      }))
      .sort((a, b) => b.rides - a.rides);

    res.json({ analytics });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/rides/:id/resolve-dispute
router.post('/rides/:id/resolve-dispute', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data: ride, error: fetchErr } = await supabaseAdmin
      .from('rides').select('id, status').eq('id', req.params.id).single();
    if (fetchErr) { res.status(404).json({ error: 'not_found' }); return; }
    if (ride.status !== 'disputed') { res.status(409).json({ error: 'ride_not_disputed' }); return; }

    const { data, error } = await supabaseAdmin
      .from('rides')
      .update({ status: 'completed', cancellation_reason: null })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: req.user!.id,
      action_type: 'resolve_dispute',
      target_entity_id: req.params.id,
      details: { note: req.body?.note ?? '' },
    });

    res.json({ ride: data });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/promos
router.get('/promos', ...guard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ promos: data ?? [] });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/promos
router.post('/promos', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, description, discount_type, discount_value, min_fare, max_uses, uses_per_rider, valid_from, valid_until } = req.body;
    if (!code || !discount_type || discount_value === undefined) {
      res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
      return;
    }
    if (!['percent', 'fixed'].includes(discount_type)) {
      res.status(400).json({ error: 'discount_type must be percent or fixed' });
      return;
    }
    if (discount_type === 'percent' && (Number(discount_value) <= 0 || Number(discount_value) > 100)) {
      res.status(400).json({ error: 'percent discount must be 1–100' });
      return;
    }
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .insert({
        code: String(code).toUpperCase().trim(),
        description: description ?? null,
        discount_type,
        discount_value: Number(discount_value),
        min_fare: Number(min_fare ?? 0),
        max_uses: max_uses != null ? Number(max_uses) : null,
        uses_per_rider: Number(uses_per_rider ?? 1),
        valid_from: valid_from ?? null,
        valid_until: valid_until ?? null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') { res.status(409).json({ error: 'code_already_exists' }); return; }
      throw error;
    }
    res.status(201).json({ promo: data });
  } catch (err) { next(err); }
});

// PATCH /api/v1/admin/promos/:id/toggle
router.patch('/promos/:id/toggle', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('promo_codes').select('is_active').eq('id', req.params.id).single();
    if (fetchErr) { res.status(404).json({ error: 'not_found' }); return; }
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .update({ is_active: !current.is_active })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ promo: data });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/riders/:id/reset-strikes
router.post('/riders/:id/reset-strikes', ...guard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('customer_profiles')
      .update({ cancellation_strikes: 0 })
      .eq('user_id', req.params.id);
    if (error) throw error;
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: req.user!.id,
      action_type: 'reset_rider_strikes',
      target_entity_id: req.params.id,
      details: { note: req.body?.note ?? '' },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
