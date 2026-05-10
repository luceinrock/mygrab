import { getSupabaseAdminClient } from '../config/supabase';
import { LocationUpdateInput, TopupInput } from '../types/schemas';

export class DriverService {
  private supabase = getSupabaseAdminClient();

  /**
   * Update driver location (batched updates)
   */
  async updateLocation(driverId: string, data: LocationUpdateInput) {
    const { error } = await this.supabase
      .from('driver_profiles')
      .update({
        current_location_lat: data.lat,
        current_location_lng: data.lng,
        last_location_update: new Date().toISOString()
      })
      .eq('user_id', driverId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Set driver online/offline status
   */
  async setOnlineStatus(driverId: string, isOnline: boolean) {
    // Check wallet state before allowing online
    if (isOnline) {
      const { data: driver } = await this.supabase
        .from('driver_profiles')
        .select('wallet_state, wallet_balance')
        .eq('user_id', driverId)
        .single();

      if (driver?.wallet_state === 'BLOCKED_RED') {
        throw new Error('Cannot go online: Wallet balance below minimum threshold. Please top up.');
      }
    }

    const { error } = await this.supabase
      .from('driver_profiles')
      .update({
        is_online: isOnline,
        is_available: isOnline // When going online, also mark as available
      })
      .eq('user_id', driverId);

    if (error) throw error;
    return { success: true, isOnline };
  }

  /**
   * Set driver availability (receiving rides or not)
   */
  async setAvailability(driverId: string, isAvailable: boolean) {
    const { error } = await this.supabase
      .from('driver_profiles')
      .update({ is_available: isAvailable })
      .eq('user_id', driverId);

    if (error) throw error;
    return { success: true, isAvailable };
  }

  /**
   * Get driver profile with wallet info
   */
  async getDriverProfile(driverId: string) {
    const { data, error } = await this.supabase
      .from('driver_profiles')
      .select(`
        *,
        profiles(full_name, phone_number, email, profile_photo_url)
      `)
      .eq('user_id', driverId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Process wallet topup
   */
  async processTopup(driverId: string, data: TopupInput) {
    const { data: driver } = await this.supabase
      .from('driver_profiles')
      .select('wallet_balance')
      .eq('user_id', driverId)
      .single();

    if (!driver) throw new Error('Driver not found');

    const newBalance = (driver.wallet_balance || 0) + data.amount;

    // Update wallet balance
    const { error: updateError } = await this.supabase
      .from('driver_profiles')
      .update({ 
        wallet_balance: newBalance,
        // Recalculate state based on new balance
        wallet_state: newBalance >= 0 ? 'ACTIVE_GREEN' : newBalance >= -500 ? 'ACTIVE_YELLOW' : 'BLOCKED_RED'
      })
      .eq('user_id', driverId);

    if (updateError) throw updateError;

    // Record transaction
    const { error: txnError } = await this.supabase
      .from('wallet_transactions')
      .insert({
        driver_id: driverId,
        type: 'topup',
        amount: data.amount,
        balance_after: newBalance,
        description: `Wallet topup via ${data.payment_method}`,
        reference_id: data.gcash_reference_id
      });

    if (txnError) throw txnError;

    return {
      success: true,
      new_balance: newBalance,
      message: `Successfully topped up ₱${data.amount}`
    };
  }

  /**
   * Get driver's transaction history
   */
  async getTransactionHistory(driverId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('wallet_transactions')
      .select(`
        *,
        rides!inner(final_fare, status)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Get nearby drivers (for admin/dispatch)
   */
  async getNearbyDrivers(lat: number, lng: number, radiusKm: number = 5) {
    const { data: drivers, error } = await this.supabase
      .from('driver_profiles')
      .select(`
        *,
        profiles(full_name, phone_number, profile_photo_url)
      `)
      .eq('is_online', true)
      .eq('is_available', true)
      .not('current_location_lat', 'is', null);

    if (error) throw error;

    // Filter by distance
    const nearbyDrivers = drivers?.filter(driver => {
      if (!driver.current_location_lat || !driver.current_location_lng) return false;
      const distance = this.calculateDistance(
        lat,
        lng,
        driver.current_location_lat,
        driver.current_location_lng
      );
      return distance <= radiusKm;
    });

    return nearbyDrivers || [];
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
