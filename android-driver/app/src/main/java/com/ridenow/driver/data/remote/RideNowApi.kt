package com.ridenow.driver.data.remote

import com.ridenow.driver.data.remote.models.*
import retrofit2.Response
import retrofit2.http.*

interface RideNowApi {

    @GET("api/v1/auth/me")
    suspend fun getMe(): Response<DriverProfileResponse>

    @GET("api/v1/drivers/profile")
    suspend fun getProfile(): Response<DriverProfileResponse>

    @GET("api/v1/rides/active")
    suspend fun getActiveRide(): Response<ActiveRideResponse>

    @GET("api/v1/rides/{id}")
    suspend fun getRide(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/accept")
    suspend fun acceptRide(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/arrived")
    suspend fun arrivedAtPickup(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/start")
    suspend fun startRide(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/complete")
    suspend fun completeRide(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/cancel")
    suspend fun cancelRide(@Path("id") rideId: String): Response<RideResponse>

    @POST("api/v1/rides/{id}/rate")
    suspend fun rateRide(
        @Path("id") rideId: String,
        @Body body: RateRideBody,
    ): Response<Unit>

    @POST("api/v1/drivers/toggle-online")
    suspend fun toggleOnline(): Response<ToggleOnlineResponse>

    @POST("api/v1/drivers/location/batch")
    suspend fun batchLocation(@Body body: LocationBatchBody): Response<Unit>

    @GET("api/v1/drivers/available-rides")
    suspend fun getAvailableRides(): Response<AvailableRidesResponse>

    @GET("api/v1/drivers/earnings")
    suspend fun getEarnings(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<EarningsResponse>

    @GET("api/v1/drivers/rides")
    suspend fun getRideHistory(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<Unit>
}
