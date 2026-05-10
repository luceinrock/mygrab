package com.broom2x.ph.data.repository

import com.broom2x.ph.data.model.Ride
import com.broom2x.ph.data.model.RideStatus
import com.broom2x.ph.data.network.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RideRepository @Inject constructor(
    private val supabaseClient: SupabaseClient
) {

    suspend fun createRide(
        customerId: String,
        pickupLat: Double,
        pickupLng: Double,
        pickupAddress: String,
        dropoffLat: Double,
        dropoffLng: Double,
        dropoffAddress: String,
        fareEstimate: Double,
        paymentMethod: String = "cash"
    ): Result<Ride> {
        return try {
            val response = supabaseClient.database
                .from("rides")
                .insert(
                    mapOf(
                        "customer_id" to customerId,
                        "pickup_lat" to pickupLat,
                        "pickup_lng" to pickupLng,
                        "pickup_address" to pickupAddress,
                        "dropoff_lat" to dropoffLat,
                        "dropoff_lng" to dropoffLng,
                        "dropoff_address" to dropoffAddress,
                        "fare_estimate" to fareEstimate,
                        "payment_method" to paymentMethod,
                        "status" to "requested"
                    )
                ) {
                    select()
                }
            
            val ride = response.decodeSingle<Ride>()
            Result.success(ride)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRideById(rideId: String): Result<Ride> {
        return try {
            val response = supabaseClient.database
                .from("rides")
                .select {
                    filter {
                        eq("id", rideId)
                    }
                }
            
            val ride = response.decodeSingle<Ride>()
            Result.success(ride)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelRide(rideId: String, userId: String, reason: String): Result<Unit> {
        return try {
            supabaseClient.database
                .from("rides")
                .update(
                    mapOf(
                        "status" to "cancelled",
                        "cancelled_by" to userId,
                        "cancellation_reason" to reason
                    )
                ) {
                    filter {
                        eq("id", rideId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun triggerSOS(rideId: String): Result<Unit> {
        return try {
            supabaseClient.database
                .from("rides")
                .update(
                    mapOf("sos_triggered" to true)
                ) {
                    filter {
                        eq("id", rideId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitRating(
        rideId: String,
        customerRating: Int? = null,
        driverRating: Int? = null,
        comment: String? = null
    ): Result<Unit> {
        return try {
            val updateData = mutableMapOf<String, Any>()
            
            customerRating?.let { updateData["customer_rating_given"] = it }
            driverRating?.let { updateData["driver_rating_given"] = it }
            comment?.let { updateData["customer_comment"] = it }
            
            supabaseClient.database
                .from("rides")
                .update(updateData) {
                    filter {
                        eq("id", rideId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
