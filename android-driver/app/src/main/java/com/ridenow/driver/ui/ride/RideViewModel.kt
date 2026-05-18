package com.ridenow.driver.ui.ride

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.models.Ride
import com.ridenow.driver.data.remote.models.RateRideBody
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ActiveRideUiState(
    val ride: Ride? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isCompleted: Boolean = false,
)

@HiltViewModel
class RideViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(ActiveRideUiState())
    val uiState = _uiState.asStateFlow()

    private var rideId: String? = null

    fun init(rideId: String) {
        if (this.rideId == rideId) return
        this.rideId = rideId
        loadRide(rideId)
    }

    private fun loadRide(rideId: String) {
        viewModelScope.launch {
            try {
                val resp = api.getRide(rideId)
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(ride = resp.body()?.ride)
                }
            } catch (_: Exception) {}
        }
    }

    fun arrivedAtPickup() {
        val id = rideId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val resp = api.arrivedAtPickup(id)
                if (resp.isSuccessful) _uiState.value = _uiState.value.copy(ride = resp.body()?.ride, isLoading = false)
                else _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed")
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun startRide() {
        val id = rideId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val resp = api.startRide(id)
                if (resp.isSuccessful) _uiState.value = _uiState.value.copy(ride = resp.body()?.ride, isLoading = false)
                else _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed")
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun completeRide() {
        val id = rideId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val resp = api.completeRide(id)
                if (resp.isSuccessful) _uiState.value = _uiState.value.copy(
                    ride = resp.body()?.ride, isLoading = false, isCompleted = true)
                else _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed")
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun rateRider(rating: Int, comment: String?) {
        val id = rideId ?: return
        viewModelScope.launch {
            try {
                api.rateRide(id, RateRideBody(rating, comment))
            } finally {
                _uiState.value = _uiState.value.copy(isCompleted = true)
            }
        }
    }
}
