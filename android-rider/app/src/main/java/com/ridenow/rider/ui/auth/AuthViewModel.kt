package com.ridenow.rider.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.supabase.SupabaseModule
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
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor() : ViewModel() {

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
                _state.value = AuthState.Authenticated
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
                    }
                }
                _state.value = AuthState.Authenticated
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Sign-up failed. Please try again.")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try { supabase.auth.signOut() } catch (_: Exception) {}
            _state.value = AuthState.Idle
        }
    }

    fun resetToIdle() { _state.value = AuthState.Idle }
}
