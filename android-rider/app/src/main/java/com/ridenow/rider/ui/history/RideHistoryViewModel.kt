package com.ridenow.rider.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.remote.RideNowApi
import com.ridenow.rider.data.remote.models.Ride
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RideHistoryUiState(
    val rides: List<Ride> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class RideHistoryViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(RideHistoryUiState())
    val uiState = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.getRideHistory()
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(
                        rides = resp.body()?.rides ?: emptyList(),
                        isLoading = false,
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = if (resp.code() == 401) "Login required to view history" else "Failed to load history",
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = "Network error")
            }
        }
    }
}
