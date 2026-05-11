import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Service-role client — bypasses RLS, server-side only. Never expose to clients.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
