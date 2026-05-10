package com.broom2x.ph.data.network

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.gotrue.providers.builtin.Phone
import io.github.jan.supabase.gotrue.user.UserInfo
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.query.Columns
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupabaseClient @Inject constructor(
    supabaseUrl: String,
    supabaseKey: String
) {
    private val client = io.github.jan.supabase.createSupabaseClient(
        supabaseUrl = supabaseUrl,
        supabaseKey = supabaseKey
    ) {
        install(GoTrue)
        install(Postgrest)
    }

    val auth: GoTrue get() = client.plugin(GoTrue)
    val database: Postgrest get() = client.plugin(Postgrest)

    suspend fun signInWithPhone(phoneNumber: String, password: String): Result<UserInfo> {
        return try {
            val response = auth.signInWith(Phone) {
                phone = phoneNumber
                this.password = password
            }
            Result.success(response.user ?: throw Exception("User info not available"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUpWithPhone(phoneNumber: String, password: String, fullName: String): Result<UserInfo> {
        return try {
            val response = auth.signUpWith(Phone) {
                phone = phoneNumber
                this.password = password
                data = mapOf("full_name" to fullName)
            }
            Result.success(response.user ?: throw Exception("User info not available"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signOut() {
        auth.signOut()
    }

    fun getCurrentUser(): UserInfo? {
        return auth.currentUserOrNull()
    }

    fun isLoggedIn(): Boolean {
        return auth.currentUserOrNull() != null
    }
}
