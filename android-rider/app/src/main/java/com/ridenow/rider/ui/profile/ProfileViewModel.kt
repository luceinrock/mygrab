package com.ridenow.rider.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.remote.RideNowApi
import com.ridenow.rider.data.remote.models.Profile
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val profile: Profile? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState = _uiState.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.value = ProfileUiState(isLoading = true)
            try {
                val resp = api.getProfile()
                if (resp.isSuccessful) {
                    _uiState.value = ProfileUiState(profile = resp.body()?.profile, isLoading = false)
                } else {
                    _uiState.value = ProfileUiState(isLoading = false, error = "Failed to load profile")
                }
            } catch (e: Exception) {
                _uiState.value = ProfileUiState(isLoading = false, error = "Network error")
            }
        }
    }
}
