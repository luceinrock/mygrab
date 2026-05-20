import { supabaseAdmin } from '../config/supabase';

export interface PlatformConfig {
  min_driver_balance: number;
  commission_short_km: number;
  commission_medium_km: number;
  commission_fee_short: number;
  commission_fee_medium: number;
  commission_fee_long: number;
  min_topup_amount: number;
  surge_multiplier: number;
  base_fare_lite: number;
  base_fare_plus: number;
  base_fare_moto: number;
  per_km_lite: number;
  per_km_plus: number;
  per_km_moto: number;
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const { data, error } = await supabaseAdmin
    .from('platform_config')
    .select(
      'min_driver_balance, commission_short_km, commission_medium_km, ' +
      'commission_fee_short, commission_fee_medium, commission_fee_long, min_topup_amount, ' +
      'surge_multiplier, base_fare_lite, base_fare_plus, base_fare_moto, ' +
      'per_km_lite, per_km_plus, per_km_moto',
    )
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as unknown as PlatformConfig;
}

export function calcCommissionFee(distanceKm: number, config: PlatformConfig): number {
  if (distanceKm < config.commission_short_km) return Number(config.commission_fee_short);
  if (distanceKm < config.commission_medium_km) return Number(config.commission_fee_medium);
  return Number(config.commission_fee_long);
}

export function getVehicleRates(
  vehicleType: 'lite' | 'plus' | 'moto',
  config: PlatformConfig,
): { baseFare: number; perKm: number } {
  return {
    baseFare: Number(config[`base_fare_${vehicleType}`]),
    perKm: Number(config[`per_km_${vehicleType}`]),
  };
}
