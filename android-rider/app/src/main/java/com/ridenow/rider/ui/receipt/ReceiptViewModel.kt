package com.ridenow.rider.ui.receipt

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.remote.RideNowApi
import com.ridenow.rider.data.remote.models.DisputeBody
import com.ridenow.rider.data.remote.models.Ride
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReceiptUiState(
    val ride: Ride? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val isDisputeSubmitting: Boolean = false,
    val isDisputeSubmitted: Boolean = false,
    val disputeError: String? = null,
)

@HiltViewModel
class ReceiptViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(ReceiptUiState())
    val uiState = _uiState.asStateFlow()

    private var rideId: String? = null

    fun init(rideId: String) {
        if (this.rideId == rideId) return
        this.rideId = rideId
        load(rideId)
    }

    private fun load(rideId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.getRide(rideId)
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(isLoading = false, ride = resp.body()?.ride)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed to load receipt")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun submitDispute(reason: String) {
        val id = rideId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDisputeSubmitting = true, disputeError = null)
            try {
                val resp = api.disputeRide(id, DisputeBody(reason))
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(
                        isDisputeSubmitting = false,
                        isDisputeSubmitted = true,
                        ride = resp.body()?.ride ?: _uiState.value.ride,
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isDisputeSubmitting = false,
                        disputeError = "Failed to submit dispute. Please try again.",
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isDisputeSubmitting = false,
                    disputeError = e.message,
                )
            }
        }
    }
}
