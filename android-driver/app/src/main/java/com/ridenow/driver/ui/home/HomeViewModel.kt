package com.ridenow.driver.ui.home

import android.app.Application
import android.content.Intent
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.location.LocationForegroundService
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isOnline: Boolean = false,
    val profile: DriverProfile? = null,
    val incomingRide: Ride? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val acceptedRideId: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    application: Application,
    private val api: RideNowApi,
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState = _uiState.asStateFlow()

    private var pollingJob: Job? = null
    private val dismissedRideIds = mutableSetOf<String>()

    init { loadProfile() }

    private fun loadProfile() {
        viewModelScope.launch {
            try {
                val resp = api.getProfile()
                if (resp.isSuccessful) {
                    val p = resp.body()?.profile
                    _uiState.value = _uiState.value.copy(profile = p, isOnline = p?.isOnline ?: false)
                    if (p?.isOnline == true) {
                        startLocationService()
                        startPolling()
                    }
                }
            } catch (_: Exception) {}
        }
    }

    fun toggleOnline() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.toggleOnline()
                if (resp.isSuccessful) {
                    val nowOnline = resp.body()?.isOnline ?: false
                    _uiState.value = _uiState.value.copy(isOnline = nowOnline, isLoading = false)
                    if (nowOnline) {
                        startLocationService()
                        startPolling()
                    } else {
                        stopLocationService()
                        stopPolling()
                    }
                } else {
                    val msg = when (resp.code()) {
                        403 -> {
                            val body = resp.errorBody()?.string() ?: ""
                            when {
                                body.contains("insufficient_balance") -> "Insufficient credits. Please top up at an outlet before going online."
                                body.contains("not_verified") -> "Account not yet verified. Visit our office to complete registration."
                                else -> "Account not verified or wallet blocked."
                            }
                        }
                        else -> "Could not update status."
                    }
                    _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = "No connection.")
            }
        }
    }

    private fun startLocationService() {
        val intent = Intent(getApplication(), LocationForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getApplication<Application>().startForegroundService(intent)
        } else {
            getApplication<Application>().startService(intent)
        }
    }

    private fun stopLocationService() {
        getApplication<Application>().stopService(
            Intent(getApplication(), LocationForegroundService::class.java)
        )
    }

    private fun startPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            while (isActive) {
                if (_uiState.value.incomingRide == null) {
                    try {
                        val resp = api.getAvailableRides()
                        if (resp.isSuccessful) {
                            resp.body()?.rides
                                ?.firstOrNull { it.id !in dismissedRideIds }
                                ?.let { ride ->
                                    if (_uiState.value.incomingRide == null) {
                                        _uiState.value = _uiState.value.copy(incomingRide = ride)
                                    }
                                }
                        }
                    } catch (_: Exception) {}
                }
                delay(3_000)
            }
        }
    }

    private fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun acceptRide(rideId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.acceptRide(rideId)
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        acceptedRideId = resp.body()?.ride?.id,
                        incomingRide = null,
                    )
                } else {
                    val msg = if (resp.code() == 409) "Ride already taken" else "Failed to accept ride"
                    _uiState.value = _uiState.value.copy(isLoading = false, error = msg, incomingRide = null)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun dismissIncomingRide() {
        _uiState.value.incomingRide?.id?.let { dismissedRideIds.add(it) }
        _uiState.value = _uiState.value.copy(incomingRide = null)
    }

    fun clearAcceptedRide() {
        _uiState.value = _uiState.value.copy(acceptedRideId = null)
    }

    override fun onCleared() {
        stopLocationService()
        stopPolling()
        super.onCleared()
    }
}
