import pino from 'pino';
import { supabaseAdmin } from '../config/supabase';

const logger = pino();

export async function cancelStaleRides(): Promise<void> {
  const cutoff = new Date(Date.now() - 2.5 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('rides')
    .update({
      status: 'cancelled',
      cancellation_reason: 'no_driver_available',
    })
    .eq('status', 'requested')
    .is('driver_id', null)
    .lt('created_at', cutoff)
    .select('id');

  if (error) {
    logger.error({ err: error }, 'cancelStaleRides: DB error');
    return;
  }

  if (data && data.length > 0) {
    logger.info({ count: data.length }, 'cancelStaleRides: cancelled stale rides');
  }
}
