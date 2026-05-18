import { supabaseAdmin } from '../config/supabase';

export interface PlatformConfig {
  min_driver_balance: number;
  commission_short_km: number;
  commission_medium_km: number;
  commission_fee_short: number;
  commission_fee_medium: number;
  commission_fee_long: number;
  min_topup_amount: number;
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const { data, error } = await supabaseAdmin
    .from('platform_config')
    .select(
      'min_driver_balance, commission_short_km, commission_medium_km, ' +
      'commission_fee_short, commission_fee_medium, commission_fee_long, min_topup_amount',
    )
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as PlatformConfig;
}

export function calcCommissionFee(distanceKm: number, config: PlatformConfig): number {
  if (distanceKm < config.commission_short_km) return Number(config.commission_fee_short);
  if (distanceKm < config.commission_medium_km) return Number(config.commission_fee_medium);
  return Number(config.commission_fee_long);
}
