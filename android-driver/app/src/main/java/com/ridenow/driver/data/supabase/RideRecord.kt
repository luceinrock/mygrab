package com.ridenow.driver.data.supabase

import com.ridenow.driver.data.remote.models.Ride
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RideRecord(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("driver_id") val driverId: String? = null,
    val status: String,
    @SerialName("pickup_lat") val pickupLat: Double,
    @SerialName("pickup_lng") val pickupLng: Double,
    @SerialName("pickup_address") val pickupAddress: String,
    @SerialName("dropoff_lat") val dropoffLat: Double,
    @SerialName("dropoff_lng") val dropoffLng: Double,
    @SerialName("dropoff_address") val dropoffAddress: String,
    @SerialName("fare_estimate") val fareEstimate: Double? = null,
    @SerialName("payment_method") val paymentMethod: String,
    @SerialName("payment_status") val paymentStatus: String = "pending",
    @SerialName("distance_km") val distanceKm: Double? = null,
    @SerialName("duration_min") val durationMin: Int? = null,
    @SerialName("created_at") val createdAt: String,
)

fun RideRecord.toRide() = Ride(
    id = id,
    customerId = customerId,
    driverId = driverId,
    status = status,
    pickupAddress = pickupAddress,
    dropoffAddress = dropoffAddress,
    pickupLat = pickupLat,
    pickupLng = pickupLng,
    dropoffLat = dropoffLat,
    dropoffLng = dropoffLng,
    fareEstimate = fareEstimate,
    finalFare = null,
    paymentMethod = paymentMethod,
    paymentStatus = paymentStatus,
    distanceKm = distanceKm,
    durationMin = durationMin,
    rideType = null,
    customerRatingGiven = null,
    createdAt = createdAt,
    acceptedAt = null,
    startedAt = null,
    completedAt = null,
)
