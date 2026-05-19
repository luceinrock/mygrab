package com.ridenow.driver.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.supabase.SupabaseModule
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Authenticated : AuthState()
    object PendingVerification : AuthState()
    object RejectedVerification : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: RideNowApi,
) : ViewModel() {

    private val supabase = SupabaseModule.client

    private val _state = MutableStateFlow<AuthState>(AuthState.Idle)
    val state = _state.asStateFlow()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                routeByVerificationStatus()
            } catch (e: Exception) {
                _state.value = AuthState.Error("Invalid email or password.")
            }
        }
    }

    fun signUp(email: String, password: String, fullName: String, phone: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.signUpWith(Email) {
                    this.email = email
                    this.password = password
                    data = buildJsonObject {
                        put("full_name", fullName)
                        put("phone", phone)
                        put("role", "driver")
                    }
                }
                _state.value = AuthState.PendingVerification
            } catch (e: Exception) {
                val msg = when {
                    e.message?.contains("already registered") == true ||
                    e.message?.contains("already been registered") == true ->
                        "An account with this email already exists."
                    e.message?.contains("invalid email") == true ->
                        "Please enter a valid email address."
                    else -> "Sign-up failed. Please check your connection and try again."
                }
                _state.value = AuthState.Error(msg)
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try { supabase.auth.signOut() } catch (_: Exception) {}
            _state.value = AuthState.Idle
        }
    }

    private suspend fun routeByVerificationStatus() {
        try {
            val resp = api.getProfile()
            val status = resp.body()?.profile?.verificationStatus
            _state.value = when (status) {
                "pending" -> AuthState.PendingVerification
                "rejected" -> AuthState.RejectedVerification
                else -> AuthState.Authenticated
            }
        } catch (_: Exception) {
            _state.value = AuthState.Authenticated
        }
    }

    fun resetToIdle() { _state.value = AuthState.Idle }
}
