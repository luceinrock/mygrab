package com.ridenow.rider.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.remote.TokenProvider
import com.ridenow.rider.data.supabase.SupabaseModule
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Authenticated : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val tokenProvider: TokenProvider,
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
                tokenProvider.token = supabase.auth.currentSessionOrNull()?.accessToken
                _state.value = AuthState.Authenticated
            } catch (e: Exception) {
                _state.value = AuthState.Error("Invalid email or password.")
            }
        }
    }

    fun signUp(email: String, password: String, fullName: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.signUpWith(Email) {
                    this.email = email
                    this.password = password
                    this.data = kotlinx.serialization.json.buildJsonObject {
                        put("full_name", kotlinx.serialization.json.JsonPrimitive(fullName))
                    }
                }
                tokenProvider.token = supabase.auth.currentSessionOrNull()?.accessToken
                _state.value = AuthState.Authenticated
            } catch (e: Exception) {
                _state.value = AuthState.Error("Sign up failed. ${e.message}")
            }
        }
    }

    fun resetToIdle() {
        _state.value = AuthState.Idle
    }
}
