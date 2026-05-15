import { z } from 'zod';

// Schema for creating a ride request
export const createRideSchema = z.object({
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  pickup_address: z.string().min(5),
  dropoff_lat: z.number().min(-90).max(90),
  dropoff_lng: z.number().min(-180).max(180),
  dropoff_address: z.string().min(5),
  payment_method: z.enum(['gcash', 'cash', 'paymaya']).optional().default('cash'),
  fare_estimate: z.number().positive().optional()
});

// Schema for accepting a ride (driver)
export const acceptRideSchema = z.object({
  ride_id: z.string().uuid()
});

// Schema for updating ride status
export const updateRideStatusSchema = z.object({
  status: z.enum(['accepted', 'arrived', 'in_progress', 'completed', 'cancelled']),
  driver_rating_given: z.number().min(1).max(5).optional(),
  customer_rating_given: z.number().min(1).max(5).optional(),
  driver_comment: z.string().optional(),
  customer_comment: z.string().optional(),
  route_polyline: z.string().optional(),
  distance_km: z.number().positive().optional(),
  duration_min: z.number().positive().optional()
});

// Schema for SOS emergency
export const sosSchema = z.object({
  ride_id: z.string().uuid(),
  emergency_type: z.string().optional(),
  description: z.string().optional()
});

// Schema for driver location update (batched)
export const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

// Schema for wallet topup
export const topupSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.enum(['gcash', 'paymaya']),
  gcash_reference_id: z.string().optional()
});

export type CreateRideInput = z.infer<typeof createRideSchema>;
export type UpdateRideStatusInput = z.infer<typeof updateRideStatusSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type TopupInput = z.infer<typeof topupSchema>;
