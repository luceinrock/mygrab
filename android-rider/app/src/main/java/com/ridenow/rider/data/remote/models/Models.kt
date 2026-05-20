package com.ridenow.rider.data.remote.models

import com.google.gson.annotations.SerializedName

data class Ride(
    val id: String,
    @SerializedName("customer_id") val customerId: String,
    @SerializedName("driver_id") val driverId: String?,
    val status: String,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("dropoff_address") val dropoffAddress: String,
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("dropoff_lat") val dropoffLat: Double,
    @SerializedName("dropoff_lng") val dropoffLng: Double,
    @SerializedName("fare_estimate") val fareEstimate: Double?,
    @SerializedName("final_fare") val finalFare: Double?,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("payment_status") val paymentStatus: String,
    @SerializedName("distance_km") val distanceKm: Double?,
    @SerializedName("duration_min") val durationMin: Int?,
    @SerializedName("ride_type") val rideType: String? = null,
    @SerializedName("promo_code") val promoCode: String? = null,
    @SerializedName("discount_applied") val discountApplied: Double? = null,
    @SerializedName("driver_rating_given") val driverRatingGiven: Int?,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("accepted_at") val acceptedAt: String?,
    @SerializedName("started_at") val startedAt: String?,
    @SerializedName("completed_at") val completedAt: String?,
)

data class DisputeBody(val reason: String)

data class RideResponse(val ride: Ride)
data class ActiveRideResponse(val ride: Ride?)

data class FareEstimate(
    @SerializedName("distance_km") val distanceKm: Double,
    @SerializedName("duration_min") val durationMin: Int,
    @SerializedName("fare_estimate") val fareEstimate: Double,
    @SerializedName("surge_multiplier") val surgeMultiplier: Double,
    val breakdown: FareBreakdown,
)

data class FareBreakdown(
    @SerializedName("base_fare") val baseFare: Double,
    @SerializedName("per_km_charge") val perKmCharge: Double,
    @SerializedName("per_min_charge") val perMinCharge: Double,
    @SerializedName("booking_fee") val bookingFee: Double,
)

data class RequestRideBody(
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("dropoff_lat") val dropoffLat: Double,
    @SerializedName("dropoff_lng") val dropoffLng: Double,
    @SerializedName("dropoff_address") val dropoffAddress: String,
    @SerializedName("payment_method") val paymentMethod: String = "cash",
    @SerializedName("ride_type") val rideType: String = "lite",
    @SerializedName("promo_code") val promoCode: String? = null,
)

data class PromoValidationResponse(
    val valid: Boolean,
    val reason: String? = null,
    val code: String? = null,
    val description: String? = null,
    @SerializedName("discount_type") val discountType: String? = null,
    @SerializedName("discount_value") val discountValue: Double? = null,
    @SerializedName("discounted_fare") val discountedFare: Double? = null,
    val savings: Double? = null,
    @SerializedName("min_fare") val minFare: Double? = null,
)

data class RateRideBody(
    val rating: Int,
    val comment: String? = null,
)

data class CancelRideBody(
    val reason: String? = null,
)

data class SavedLocation(
    val label: String,
    val address: String,
    val lat: Double,
    val lng: Double,
)

data class FavoritesResponse(val favorites: List<SavedLocation>)

data class SaveFavoriteBody(
    val label: String,
    val address: String,
    val lat: Double,
    val lng: Double,
)

data class RideHistoryResponse(
    val rides: List<Ride>,
    val total: Int,
    val page: Int,
    val limit: Int,
)

data class Profile(
    val id: String,
    val email: String?,
    @SerializedName("full_name") val fullName: String?,
    @SerializedName("profile_photo_url") val profilePhotoUrl: String?,
    val role: String,
    @SerializedName("default_pickup_address") val defaultPickupAddress: String?,
    @SerializedName("gcash_number") val gcashNumber: String?,
    @SerializedName("rating_average") val ratingAverage: Double,
    @SerializedName("total_rides") val totalRides: Int,
)

data class ProfileResponse(val profile: Profile)
