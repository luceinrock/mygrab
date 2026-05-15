package com.broom2x.ph.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val full_name: String,
    val phone_number: String,
    val email: String? = null,
    val role: UserRole,
    val is_active: Boolean = true,
    val created_at: String
)

@Serializable
enum class UserRole {
    customer,
    driver,
    admin
}

@Serializable
data class CustomerProfile(
    val user_id: String,
    val default_pickup_address: String? = null,
    val default_dropoff_address: String? = null,
    val saved_locations: List<SavedLocation> = emptyList(),
    val rating_average: Double = 5.0,
    val total_rides: Int = 0,
    val gcash_number: String? = null
)

@Serializable
data class SavedLocation(
    val name: String,
    val lat: Double,
    val lng: Double
)

@Serializable
data class DriverProfile(
    val user_id: String,
    val license_number: String? = null,
    val vehicle_make: String? = null,
    val vehicle_model: String? = null,
    val vehicle_color: String? = null,
    val plate_number: String? = null,
    val verification_status: VerificationStatus = VerificationStatus.pending,
    val current_location_lat: Double? = null,
    val current_location_lng: Double? = null,
    val is_online: Boolean = false,
    val is_available: Boolean = false,
    val wallet_balance: Double = 0.0,
    val wallet_state: WalletState = WalletState.ACTIVE_GREEN,
    val rating_average: Double = 5.0,
    val total_rides: Int = 0
)

@Serializable
enum class VerificationStatus {
    pending,
    verified,
    rejected,
    suspended
}

@Serializable
enum class WalletState {
    ACTIVE_GREEN,
    ACTIVE_YELLOW,
    BLOCKED_RED
}

@Serializable
data class Ride(
    val id: String,
    val customer_id: String,
    val driver_id: String? = null,
    val status: RideStatus,
    val pickup_lat: Double,
    val pickup_lng: Double,
    val pickup_address: String,
    val dropoff_lat: Double,
    val dropoff_lng: Double,
    val dropoff_address: String,
    val route_polyline: String? = null,
    val distance_km: Double? = null,
    val duration_min: Int? = null,
    val fare_estimate: Double? = null,
    val final_fare: Double? = null,
    val payment_method: PaymentMethod = PaymentMethod.cash,
    val payment_status: PaymentStatus = PaymentStatus.pending,
    val gcash_reference_id: String? = null,
    val driver_rating_given: Int? = null,
    val customer_rating_given: Int? = null,
    val created_at: String,
    val started_at: String? = null,
    val completed_at: String? = null,
    val sos_triggered: Boolean = false
)

@Serializable
enum class RideStatus {
    requested,
    accepted,
    arrived,
    in_progress,
    completed,
    cancelled,
    disputed
}

@Serializable
enum class PaymentMethod {
    gcash,
    cash,
    paymaya
}

@Serializable
enum class PaymentStatus {
    pending,
    paid,
    refunded,
    failed
}

@Serializable
data class WalletTransaction(
    val id: String,
    val driver_id: String,
    val ride_id: String? = null,
    val type: TransactionType,
    val amount: Double,
    val balance_after: Double,
    val description: String,
    val reference_id: String? = null,
    val created_at: String
)

@Serializable
enum class TransactionType {
    topup,
    commission,
    refund,
    incentive,
    adjustment
}

@Serializable
data class ApiError(
    val message: String,
    val code: String? = null
)
