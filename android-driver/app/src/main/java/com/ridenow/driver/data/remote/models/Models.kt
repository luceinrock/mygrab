package com.ridenow.driver.data.remote.models

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
    @SerializedName("ride_type") val rideType: String?,
    @SerializedName("customer_rating_given") val customerRatingGiven: Int?,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("accepted_at") val acceptedAt: String?,
    @SerializedName("started_at") val startedAt: String?,
    @SerializedName("completed_at") val completedAt: String?,
)

data class RideResponse(val ride: Ride)
data class ActiveRideResponse(val ride: Ride?)

data class LocationBatchBody(
    val locations: List<LocationPoint>,
)

data class LocationPoint(
    val latitude: Double,
    val longitude: Double,
    val timestamp: String,
)

data class RateRideBody(
    val rating: Int,
    val comment: String? = null,
)

data class ToggleOnlineResponse(
    @SerializedName("is_online") val isOnline: Boolean,
    @SerializedName("is_available") val isAvailable: Boolean,
)

data class EarningsResponse(
    @SerializedName("wallet_balance") val walletBalance: Double,
    @SerializedName("wallet_state") val walletState: String,
    val summary: EarningsSummary,
    val transactions: List<WalletTransaction>,
    val total: Int,
    val page: Int,
    val limit: Int,
)

data class EarningsSummary(
    val credits: Double,
    val debits: Double,
    val net: Double,
)

data class WalletTransaction(
    val id: String,
    val type: String,
    val amount: Double,
    @SerializedName("balance_after") val balanceAfter: Double,
    val description: String,
    @SerializedName("created_at") val createdAt: String,
)

data class DriverProfile(
    val id: String,
    val email: String?,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("profile_photo_url") val profilePhotoUrl: String?,
    @SerializedName("vehicle_make") val vehicleMake: String?,
    @SerializedName("vehicle_model") val vehicleModel: String?,
    @SerializedName("vehicle_color") val vehicleColor: String?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("plate_number") val plateNumber: String?,
    @SerializedName("is_online") val isOnline: Boolean,
    @SerializedName("is_available") val isAvailable: Boolean,
    @SerializedName("wallet_balance") val walletBalance: Double,
    @SerializedName("wallet_state") val walletState: String,
    @SerializedName("verification_status") val verificationStatus: String,
    @SerializedName("rating_average") val ratingAverage: Double,
    @SerializedName("total_rides") val totalRides: Int,
)

data class UpdateProfileBody(
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("vehicle_make") val vehicleMake: String? = null,
    @SerializedName("vehicle_model") val vehicleModel: String? = null,
    @SerializedName("vehicle_color") val vehicleColor: String? = null,
    @SerializedName("plate_number") val plateNumber: String? = null,
)

data class DriverProfileResponse(val profile: DriverProfile)

data class AvailableRidesResponse(val rides: List<Ride>)

data class RideHistoryResponse(
    val rides: List<Ride>,
    val total: Int,
)
