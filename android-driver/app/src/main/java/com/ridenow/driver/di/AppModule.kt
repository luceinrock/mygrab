package com.ridenow.driver.di

import com.ridenow.driver.data.remote.ApiClient
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.TokenProvider
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
