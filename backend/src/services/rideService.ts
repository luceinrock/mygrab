import { supabaseAdmin } from '../config/supabase';
import { CreateRideInput, UpdateRideStatusInput, LocationUpdateInput } from '../types/schemas';

export class RideService {
  private supabase = supabaseAdmin;

  /**
   * Create a new ride request
   */
  async createRide(customerId: string, data: CreateRideInput) {
    const { data: ride, error } = await this.supabase
      .from('rides')
      .insert({
        customer_id: customerId,
        pickup_lat: data.pickup_lat,
        pickup_lng: data.pickup_lng,
        pickup_address: data.pickup_address,
        dropoff_lat: data.dropoff_lat,
        dropoff_lng: data.dropoff_lng,
        dropoff_address: data.dropoff_address,
        payment_method: data.payment_method,
        fare_estimate: data.fare_estimate,
        status: 'requested'
      })
      .select()
      .single();

    if (error) throw error;
    return ride;
  }

  /**
   * Get available rides near driver (for driver app)
   * Uses simple distance calculation - can be optimized with PostGIS later
   */
  async getNearbyRides(driverLat: number, driverLng: number, radiusKm: number = 5) {
    // Get all requested rides
    const { data: rides, error } = await this.supabase
      .from('rides')
      .select(`
        *,
        profiles!customer_id(full_name, phone_number)
      `)
      .eq('status', 'requested');

    if (error) throw error;

    // Filter by distance (simple Haversine formula in JS - can move to DB later)
    const nearbyRides = rides?.filter((ride: Record<string, any>) => {
      const distance = this.calculateDistance(
        driverLat,
        driverLng,
        ride.pickup_lat,
        ride.pickup_lng
      );
      return distance <= radiusKm;
    });

    return nearbyRides || [];
  }

  /**
   * Accept a ride (driver action)
   */
  async acceptRide(driverId: string, rideId: string) {
    // Check if ride is still available
    const { data: ride, error: fetchError } = await this.supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .single();

    if (fetchError) throw fetchError;
    if (ride.status !== 'requested') {
      throw new Error('Ride no longer available');
    }

    // Update ride with driver
    const { data: updatedRide, error } = await this.supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'accepted'
      })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    // Update driver availability
    await this.supabase
      .from('driver_profiles')
      .update({ is_available: false })
      .eq('user_id', driverId);

    return updatedRide;
  }

  /**
   * Update ride status (arrived, in_progress, completed, etc.)
   */
  async updateRideStatus(rideId: string, updates: UpdateRideStatusInput, userId: string) {
    const updateData: any = {
      status: updates.status
    };

    if (updates.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      if (updates.route_polyline) updateData.route_polyline = updates.route_polyline;
      if (updates.distance_km) updateData.distance_km = updates.distance_km;
      if (updates.duration_min) updateData.duration_min = updates.duration_min;
      if (updates.driver_rating_given) updateData.driver_rating_given = updates.driver_rating_given;
      if (updates.customer_rating_given) updateData.customer_rating_given = updates.customer_rating_given;
      if (updates.driver_comment) updateData.driver_comment = updates.driver_comment;
      if (updates.customer_comment) updateData.customer_comment = updates.customer_comment;
    }

    if (updates.status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    }

    const { data: ride, error } = await this.supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    // If ride completed, process commission
    if (updates.status === 'completed') {
      await this.processRideCompletion(rideId, ride.driver_id, ride.final_fare || ride.fare_estimate);
    }

    return ride;
  }

  /**
   * Process ride completion - deduct commission from driver wallet
   */
  private async processRideCompletion(rideId: string, driverId: string, fare: number) {
    const commissionRate = 0.20; // 20% commission - make configurable later
    const commission = fare * commissionRate;

    // Call the database function we created in migration
    const { data, error } = await this.supabase.rpc('process_driver_commission', {
      p_driver_id: driverId,
      p_ride_id: rideId,
      p_amount: commission
    });

    if (error) {
      console.error('Failed to process commission:', error);
      throw error;
    }

    return data;
  }

  /**
   * Cancel a ride
   */
  async cancelRide(rideId: string, cancelledBy: string, reason: string) {
    const { data, error } = await this.supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancellation_reason: reason
      })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    // If driver had accepted, make them available again
    if (data.driver_id) {
      await this.supabase
        .from('driver_profiles')
        .update({ is_available: true })
        .eq('user_id', data.driver_id);
    }

    return data;
  }

  /**
   * Trigger SOS emergency
   */
  async triggerSOS(rideId: string, userId: string, emergencyType?: string, description?: string) {
    const { data, error } = await this.supabase
      .from('rides')
      .update({ sos_triggered: true })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    // In production, send OneSignal notification to admin/emergency contacts here
    console.log(`SOS TRIGGERED for ride ${rideId} by user ${userId}`);

    return data;
  }

  /**
   * Get ride by ID
   */
  async getRideById(rideId: string) {
    const { data, error } = await this.supabase
      .from('rides')
      .select(`
        *,
        profiles!customer_id(full_name, phone_number),
        driver_profiles!driver_id(vehicle_make, vehicle_model, plate_number, rating_average)
      `)
      .eq('id', rideId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get customer's ride history
   */
  async getCustomerRides(customerId: string, limit: number = 20) {
    const { data, error } = await this.supabase
      .from('rides')
      .select(`
        *,
        driver_profiles!driver_id(vehicle_make, plate_number)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
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
