package com.ridenow.rider.ui.ride

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.remote.RideNowApi
import com.ridenow.rider.data.remote.models.Ride
import com.ridenow.rider.data.remote.models.RateRideBody
import com.ridenow.rider.data.remote.models.CancelRideBody
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val SEARCH_TIMEOUT_MS = 2 * 60 * 1000L // 2 minutes

data class ActiveRideUiState(
    val ride: Ride? = null,
    val driverLat: Double? = null,
    val driverLng: Double? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isCompleted: Boolean = false,
    val searchRemainingSeconds: Int = (SEARCH_TIMEOUT_MS / 1000).toInt(),
)

@HiltViewModel
class RideViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(ActiveRideUiState())
    val uiState = _uiState.asStateFlow()

    private var rideId: String? = null
    private var pollingJob: Job? = null
    private var searchStartMs: Long = 0L

    fun init(rideId: String) {
        if (this.rideId == rideId) return
        this.rideId = rideId
        searchStartMs = System.currentTimeMillis()
        loadRide(rideId)
        startPolling(rideId)
    }

    private fun loadRide(rideId: String) {
        viewModelScope.launch {
            try {
                val resp = api.getRide(rideId)
                if (resp.isSuccessful) {
                    val ride = resp.body()?.ride
                    _uiState.value = _uiState.value.copy(ride = ride)
                    if (ride?.status in listOf("completed", "cancelled")) {
                        stopPolling()
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun startPolling(rideId: String) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(3_000)
                try {
                    val resp = api.getRide(rideId)
                    if (resp.isSuccessful) {
                        val ride = resp.body()?.ride
                        _uiState.value = _uiState.value.copy(ride = ride)
                        when (ride?.status) {
                            // Don't set isCompleted here — rateRide() does it after the user rates
                            "completed" -> { stopPolling() }
                            "cancelled" -> {
                                stopPolling()
                                val cancelledBy = ride.driverId // null = rider cancelled, non-null = driver cancelled
                                val msg = if (cancelledBy != null)
                                    "Your driver cancelled the ride. Returning to home screen..."
                                else
                                    "Ride cancelled. Returning to home screen..."
                                _uiState.value = _uiState.value.copy(error = msg)
                                delay(3_000)
                                _uiState.value = _uiState.value.copy(isCompleted = true)
                            }
                            "requested" -> {
                                val elapsed = System.currentTimeMillis() - searchStartMs
                                val remaining = ((SEARCH_TIMEOUT_MS - elapsed) / 1000).toInt().coerceAtLeast(0)
                                _uiState.value = _uiState.value.copy(searchRemainingSeconds = remaining)
                                if (elapsed > SEARCH_TIMEOUT_MS) cancelRide(reason = "No drivers available")
                            }
                            else -> Unit
                        }
                    }
                } catch (_: Exception) {}
            }
        }
    }

    private fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun cancelRide(reason: String? = null) {
        val id = rideId ?: return
        stopPolling()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                api.cancelRide(id, CancelRideBody(reason))
                _uiState.value = _uiState.value.copy(isLoading = false, isCompleted = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun rateRide(rating: Int, comment: String?) {
        val id = rideId ?: return
        viewModelScope.launch {
            try {
                api.rateRide(id, RateRideBody(rating, comment))
                _uiState.value = _uiState.value.copy(isCompleted = true)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(isCompleted = true)
            }
        }
    }

    override fun onCleared() {
        stopPolling()
        super.onCleared()
    }
}
