import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'admin@mygrab.com';
const PASSWORD = 'Admin1234!';
const FULL_NAME = 'Admin';
const PHONE = '+630000000000';

async function main() {
  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes('already been registered') || authErr.message.includes('already exists')) {
      console.log('Auth user already exists, looking up existing user...');
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find(u => u.email === EMAIL);
      if (!existing) { console.error('Could not find existing user'); process.exit(1); }

      await upsertProfile(existing.id);
      return;
    }
    console.error('Failed to create auth user:', authErr.message);
    process.exit(1);
  }

  await upsertProfile(authData.user.id);
}

async function upsertProfile(userId: string) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: FULL_NAME,
    email: EMAIL,
    phone_number: PHONE,
    role: 'admin',
    is_active: true,
  }, { onConflict: 'id' });

  if (error) {
    console.error('Failed to upsert profile:', error.message);
    process.exit(1);
  }

  console.log(`\nAdmin user created successfully:`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  User ID:  ${userId}`);
}

main();
