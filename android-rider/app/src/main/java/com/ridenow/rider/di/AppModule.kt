package com.ridenow.rider.di

import com.ridenow.rider.data.remote.ApiClient
import com.ridenow.rider.data.remote.RideNowApi
import com.ridenow.rider.data.remote.TokenProvider
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideTokenProvider(): TokenProvider = TokenProvider()

    @Provides
    @Singleton
    fun provideApiClient(tokenProvider: TokenProvider): ApiClient = ApiClient(tokenProvider)

    @Provides
    @Singleton
    fun provideRideNowApi(apiClient: ApiClient): RideNowApi = apiClient.api
}
