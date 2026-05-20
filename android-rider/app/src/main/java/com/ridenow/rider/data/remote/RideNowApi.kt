package com.ridenow.rider.data.remote

import com.ridenow.rider.data.remote.models.*
import retrofit2.Response
import retrofit2.http.*

interface RideNowApi {

    @GET("api/v1/auth/me")
    suspend fun getMe(): Response<ProfileResponse>

    @GET("api/v1/pricing/estimate")
    suspend fun getFareEstimate(
        @Query("pickup_lat") pickupLat: Double,
        @Query("pickup_lng") pickupLng: Double,
        @Query("dropoff_lat") dropoffLat: Double,
        @Query("dropoff_lng") dropoffLng: Double,
        @Query("vehicle_type") vehicleType: String = "lite",
    ): Response<FareEstimate>

    @POST("api/v1/rides/request")
    suspend fun requestRide(@Body body: RequestRideBody): Response<RideResponse>

    @GET("api/v1/rides/active")
    suspend fun getActiveRide(): Response<ActiveRideResponse>

    @GET("api/v1/rides/{id}")
    suspend fun getRide(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/cancel")
    suspend fun cancelRide(
        @Path("id") rideId: String,
        @Body body: CancelRideBody,
    ): Response<RideResponse>

    @POST("api/v1/rides/{id}/rate")
    suspend fun rateRide(
        @Path("id") rideId: String,
        @Body body: RateRideBody,
    ): Response<Unit>

    @GET("api/v1/riders/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @GET("api/v1/riders/history")
    suspend fun getRideHistory(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<RideHistoryResponse>

    @GET("api/v1/riders/favorites")
    suspend fun getFavorites(): Response<FavoritesResponse>

    @POST("api/v1/riders/favorites")
    suspend fun saveFavorite(@Body body: SaveFavoriteBody): Response<FavoritesResponse>

    @DELETE("api/v1/riders/favorites/{index}")
    suspend fun deleteFavorite(@Path("index") index: Int): Response<FavoritesResponse>

    @GET("api/v1/promos/validate")
    suspend fun validatePromo(
        @Query("code") code: String,
        @Query("fare") fare: Double,
    ): Response<PromoValidationResponse>
}
