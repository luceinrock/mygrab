package com.ridenow.rider.data.remote

import com.ridenow.rider.BuildConfig
import io.github.jan.supabase.auth.auth
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiClient @Inject constructor(private val tokenProvider: TokenProvider) {

    val api: RideNowApi by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.NONE
        }
        val authInterceptor = Interceptor { chain ->
            val token = tokenProvider.token
            val request = if (token != null) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else chain.request()
            chain.proceed(request)
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RideNowApi::class.java)
    }
}

@Singleton
class TokenProvider @Inject constructor() {
    val token: String?
        get() = com.ridenow.rider.data.supabase.SupabaseModule.client.auth.currentSessionOrNull()?.accessToken
}
