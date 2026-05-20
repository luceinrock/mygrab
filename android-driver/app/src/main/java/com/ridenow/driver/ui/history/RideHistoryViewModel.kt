package com.ridenow.driver.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.models.Ride
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RideHistoryUiState(
    val rides: List<Ride> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class RideHistoryViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(RideHistoryUiState())
    val uiState = _uiState.asStateFlow()

    init { load() }

    fun load(page: Int = 1) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.getRideHistory(page = page, limit = 20)
                if (resp.isSuccessful) {
                    val body = resp.body()!!
                    _uiState.value = RideHistoryUiState(
                        rides = body.rides,
                        total = body.total,
                        page = page,
                        isLoading = false,
                    )
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed to load rides")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }
}
