import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

// Manila-area locations
const LOCATIONS = [
  { name: 'Ayala Ave, Makati',         lat: 14.5547, lng: 121.0244 },
  { name: 'BGC High Street, Taguig',   lat: 14.5344, lng: 121.0448 },
  { name: 'Ortigas Center, Pasig',     lat: 14.5858, lng: 121.0614 },
  { name: 'SM North EDSA, QC',         lat: 14.6560, lng: 121.0320 },
  { name: 'Robinsons Galleria, Ortigas', lat: 14.5858, lng: 121.0565 },
  { name: 'Intramuros, Manila',        lat: 14.5890, lng: 120.9750 },
  { name: 'Mall of Asia, Pasay',       lat: 14.5350, lng: 120.9830 },
  { name: 'Eastwood City, QC',         lat: 14.6049, lng: 121.0798 },
  { name: 'Alabang Town Center',       lat: 14.4201, lng: 121.0358 },
  { name: 'UP Diliman, QC',            lat: 14.6548, lng: 121.0650 },
];

const VEHICLES = [
  { make: 'Toyota', model: 'Vios',   color: 'White',  type: 'lite' },
  { make: 'Honda',  model: 'City',   color: 'Silver', type: 'lite' },
  { make: 'Mitsubishi', model: 'Mirage', color: 'Red', type: 'lite' },
  { make: 'Toyota', model: 'Innova', color: 'Black',  type: 'plus' },
  { make: 'Ford',   model: 'Ranger', color: 'Gray',   type: 'plus' },
];

// ── Create auth user via SQL (triggers profile creation) ─────────────────────
async function createAuthUser(opts: {
  email: string; password: string; fullName: string; phone: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('exec_sql' as any) as any;
  // Use admin API; ensure phone is in metadata so the handle_new_user trigger is satisfied
  const { data: u, error: e } = await supabase.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: { full_name: opts.fullName, phone: opts.phone },
  });
  if (e) throw new Error(`createUser(${opts.email}): ${e.message}`);
  return u.user.id;
}

async function main() {
  console.log('Seeding customers…');

  const customers: string[] = [];
  const customerData = [
    { name: 'Maria Santos',   phone: '+639171234001', email: 'maria.santos@example.com' },
    { name: 'Jose Reyes',     phone: '+639171234002', email: 'jose.reyes@example.com' },
    { name: 'Ana Cruz',       phone: '+639171234003', email: 'ana.cruz@example.com' },
    { name: 'Pedro Bautista', phone: '+639171234004', email: 'pedro.bautista@example.com' },
    { name: 'Liza Garcia',    phone: '+639171234005', email: 'liza.garcia@example.com' },
  ];

  for (const c of customerData) {
    const uid = await createAuthUser({ email: c.email, password: 'Test1234!', fullName: c.name, phone: c.phone });
    // Trigger created profile as 'customer'; add customer_profile row
    await supabase.from('customer_profiles').upsert({ user_id: uid }, { onConflict: 'user_id' });
    customers.push(uid);
    console.log(`  ✓ Customer ${c.name} (${uid})`);
  }

  console.log('\nSeeding drivers…');

  const drivers: string[] = [];
  const driverData = [
    { name: 'Ramon Dela Cruz', phone: '+639281234001', email: 'ramon.delacruz@example.com', plate: 'ABC 1234', status: 'verified' },
    { name: 'Carlo Mendoza',   phone: '+639281234002', email: 'carlo.mendoza@example.com',  plate: 'DEF 5678', status: 'verified' },
    { name: 'Noel Villanueva', phone: '+639281234003', email: 'noel.villanueva@example.com', plate: 'GHI 9012', status: 'verified' },
    { name: 'Edwin Pascual',   phone: '+639281234004', email: 'edwin.pascual@example.com',  plate: 'JKL 3456', status: 'pending' },
    { name: 'Ronnie Flores',   phone: '+639281234005', email: 'ronnie.flores@example.com',  plate: 'MNO 7890', status: 'pending' },
  ];

  for (let i = 0; i < driverData.length; i++) {
    const d = driverData[i];
    const v = VEHICLES[i];
    const uid = await createAuthUser({ email: d.email, password: 'Test1234!', fullName: d.name, phone: d.phone });

    // Promote to driver
    await supabase.from('profiles').update({ role: 'driver' }).eq('id', uid);

    await supabase.from('driver_profiles').upsert({
      user_id: uid,
      vehicle_make: v.make,
      vehicle_model: v.model,
      vehicle_color: v.color,
      vehicle_type: v.type,
      plate_number: d.plate,
      verification_status: d.status,
      is_online: d.status === 'verified' && i < 3,
      is_available: d.status === 'verified' && i < 2,
      wallet_balance: parseFloat(rand(200, 2000).toFixed(2)),
      rating_average: parseFloat(rand(4.2, 5.0).toFixed(2)),
      total_rides: Math.floor(rand(10, 200)),
    }, { onConflict: 'user_id' });

    drivers.push(uid);
    console.log(`  ✓ Driver ${d.name} [${d.status}] (${uid})`);
  }

  const verifiedDrivers = drivers.slice(0, 3);

  console.log('\nSeeding rides…');

  const rides: object[] = [];

  // 20 completed rides spread over last 30 days
  for (let i = 0; i < 20; i++) {
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff.name === pickup.name) dropoff = pick(LOCATIONS);

    const distKm = parseFloat(rand(2, 18).toFixed(1));
    const durMin = Math.round(distKm * rand(3, 5));
    const fare = parseFloat(Math.max(89, 50 + distKm * 15 + durMin * 2 + 10).toFixed(2));
    const daysBack = Math.floor(rand(0, 30));
    const createdAt = daysAgo(daysBack);
    const startedAt = new Date(new Date(createdAt).getTime() + 2 * 60000).toISOString();
    const completedAt = new Date(new Date(startedAt).getTime() + durMin * 60000).toISOString();

    rides.push({
      customer_id: pick(customers),
      driver_id: pick(verifiedDrivers),
      status: 'completed',
      pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickup.name,
      dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_address: dropoff.name,
      distance_km: distKm,
      duration_min: durMin,
      fare_estimate: fare,
      final_fare: parseFloat((fare * rand(0.95, 1.05)).toFixed(2)),
      payment_method: pick(['cash', 'gcash', 'cash', 'cash']),
      payment_status: 'paid',
      driver_rating_given: Math.floor(rand(4, 6)),
      customer_rating_given: Math.floor(rand(4, 6)),
      created_at: createdAt,
      accepted_at: createdAt,
      started_at: startedAt,
      completed_at: completedAt,
    });
  }

  // 5 cancelled rides
  for (let i = 0; i < 5; i++) {
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff.name === pickup.name) dropoff = pick(LOCATIONS);
    const custId = pick(customers);
    const createdAt = daysAgo(Math.floor(rand(0, 15)));

    rides.push({
      customer_id: custId,
      driver_id: i < 3 ? pick(verifiedDrivers) : null,
      status: 'cancelled',
      pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickup.name,
      dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_address: dropoff.name,
      distance_km: parseFloat(rand(2, 10).toFixed(1)),
      fare_estimate: parseFloat(rand(89, 200).toFixed(2)),
      payment_method: 'cash',
      payment_status: 'pending',
      cancelled_by: custId,
      cancellation_reason: pick(['Changed my mind', 'Driver took too long', 'Found another ride', 'Wrong location']),
      created_at: createdAt,
    });
  }

  // 3 active rides (in_progress / accepted / arrived)
  const activeStatuses = ['in_progress', 'accepted', 'arrived'] as const;
  for (let i = 0; i < 3; i++) {
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff.name === pickup.name) dropoff = pick(LOCATIONS);
    const distKm = parseFloat(rand(3, 12).toFixed(1));
    const fare = parseFloat(Math.max(89, 50 + distKm * 15 + 10).toFixed(2));
    const createdAt = hoursAgo(rand(0.1, 1));

    rides.push({
      customer_id: pick(customers),
      driver_id: verifiedDrivers[i],
      status: activeStatuses[i],
      pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickup.name,
      dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_address: dropoff.name,
      distance_km: distKm,
      duration_min: Math.round(distKm * 4),
      fare_estimate: fare,
      payment_method: pick(['cash', 'gcash']),
      payment_status: 'pending',
      created_at: createdAt,
      accepted_at: createdAt,
      started_at: activeStatuses[i] === 'in_progress' ? hoursAgo(rand(0.05, 0.3)) : null,
    });
  }

  // 2 requested (no driver yet)
  for (let i = 0; i < 2; i++) {
    const pickup = pick(LOCATIONS);
    let dropoff = pick(LOCATIONS);
    while (dropoff.name === pickup.name) dropoff = pick(LOCATIONS);

    rides.push({
      customer_id: pick(customers),
      status: 'requested',
      pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickup.name,
      dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_address: dropoff.name,
      distance_km: parseFloat(rand(2, 8).toFixed(1)),
      fare_estimate: parseFloat(rand(89, 180).toFixed(2)),
      payment_method: 'cash',
      payment_status: 'pending',
      created_at: hoursAgo(rand(0.01, 0.1)),
    });
  }

  const { error: ridesError } = await supabase.from('rides').insert(rides);
  if (ridesError) throw new Error(`rides insert: ${ridesError.message}`);
  console.log(`  ✓ ${rides.length} rides inserted (20 completed, 5 cancelled, 3 active, 2 requested)`);

  console.log('\nDone! Summary:');
  console.log(`  Customers : ${customers.length}`);
  console.log(`  Drivers   : ${drivers.length} (3 verified, 2 pending)`);
  console.log(`  Rides     : ${rides.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
