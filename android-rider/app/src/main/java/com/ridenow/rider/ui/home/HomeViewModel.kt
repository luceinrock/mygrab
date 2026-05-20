package com.ridenow.rider.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.rider.data.geocoding.GeocodingResult
import com.ridenow.rider.data.geocoding.NominatimService
import com.ridenow.rider.data.remote.RideNowApi
import com.ridenow.rider.data.remote.models.*
import com.ridenow.rider.data.supabase.SupabaseModule
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class LocationField { PICKUP, DROPOFF }

data class HomeUiState(
    val pickupAddress: String = "",
    val dropoffAddress: String = "",
    val pickupLat: Double? = null,
    val pickupLng: Double? = null,
    val dropoffLat: Double? = null,
    val dropoffLng: Double? = null,
    val pickupSuggestions: List<GeocodingResult> = emptyList(),
    val dropoffSuggestions: List<GeocodingResult> = emptyList(),
    val activeMapField: LocationField = LocationField.DROPOFF,
    val paymentMethod: String = "cash",
    val fareEstimate: FareEstimate? = null,
    val showConfirmSheet: Boolean = false,
    val savedLocations: List<SavedLocation> = emptyList(),
    val showSaveDialog: Boolean = false,
    val savingForPickup: Boolean = true,
    val promoCode: String = "",
    val promoValidation: PromoValidationResponse? = null,
    val isValidatingPromo: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val requestedRideId: String? = null,
    val currentUserEmail: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val api: RideNowApi,
    private val nominatim: NominatimService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState = _uiState.asStateFlow()

    private var pickupSearchJob: Job? = null
    private var dropoffSearchJob: Job? = null
    private var promoJob: Job? = null

    init {
        _uiState.value = _uiState.value.copy(
            currentUserEmail = SupabaseModule.client.auth.currentSessionOrNull()?.user?.email
        )
        loadFavorites()
    }

    private fun loadFavorites() {
        viewModelScope.launch {
            try {
                val resp = api.getFavorites()
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(savedLocations = resp.body()?.favorites ?: emptyList())
                }
            } catch (_: Exception) {}
        }
    }

    fun selectFavorite(loc: SavedLocation) {
        val result = GeocodingResult(loc.lat, loc.lng, loc.address)
        when (_uiState.value.activeMapField) {
            LocationField.PICKUP -> selectPickup(result)
            LocationField.DROPOFF -> selectDropoff(result)
        }
    }

    fun requestSave(forPickup: Boolean) {
        _uiState.value = _uiState.value.copy(showSaveDialog = true, savingForPickup = forPickup)
    }

    fun confirmSave(label: String) {
        val s = _uiState.value
        val (address, lat, lng) = if (s.savingForPickup)
            Triple(s.pickupAddress, s.pickupLat ?: return, s.pickupLng ?: return)
        else
            Triple(s.dropoffAddress, s.dropoffLat ?: return, s.dropoffLng ?: return)
        _uiState.value = s.copy(showSaveDialog = false)
        viewModelScope.launch {
            try {
                val resp = api.saveFavorite(SaveFavoriteBody(label.trim(), address, lat, lng))
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(savedLocations = resp.body()?.favorites ?: _uiState.value.savedLocations)
                }
            } catch (_: Exception) {}
        }
    }

    fun cancelSave() {
        _uiState.value = _uiState.value.copy(showSaveDialog = false)
    }

    fun removeFavorite(index: Int) {
        viewModelScope.launch {
            try {
                val resp = api.deleteFavorite(index)
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(savedLocations = resp.body()?.favorites ?: _uiState.value.savedLocations)
                }
            } catch (_: Exception) {}
        }
    }

    fun onPickupQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(
            pickupAddress = query,
            pickupLat = null,
            pickupLng = null,
            fareEstimate = null,
        )
        pickupSearchJob?.cancel()
        if (query.length < 3) {
            _uiState.value = _uiState.value.copy(pickupSuggestions = emptyList())
            return
        }
        pickupSearchJob = viewModelScope.launch {
            delay(350)
            _uiState.value = _uiState.value.copy(pickupSuggestions = nominatim.search(query))
        }
    }

    fun onDropoffQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(
            dropoffAddress = query,
            dropoffLat = null,
            dropoffLng = null,
            fareEstimate = null,
        )
        dropoffSearchJob?.cancel()
        if (query.length < 3) {
            _uiState.value = _uiState.value.copy(dropoffSuggestions = emptyList())
            return
        }
        dropoffSearchJob = viewModelScope.launch {
            delay(350)
            _uiState.value = _uiState.value.copy(dropoffSuggestions = nominatim.search(query))
        }
    }

    fun selectPickup(result: GeocodingResult) {
        _uiState.value = _uiState.value.copy(
            pickupAddress = result.displayName,
            pickupLat = result.lat,
            pickupLng = result.lng,
            pickupSuggestions = emptyList(),
        )
    }

    fun selectDropoff(result: GeocodingResult) {
        _uiState.value = _uiState.value.copy(
            dropoffAddress = result.displayName,
            dropoffLat = result.lat,
            dropoffLng = result.lng,
            dropoffSuggestions = emptyList(),
            fareEstimate = null,
        )
    }

    fun setPaymentMethod(method: String) {
        _uiState.value = _uiState.value.copy(paymentMethod = method)
    }

    fun setActiveMapField(field: LocationField) {
        _uiState.value = _uiState.value.copy(activeMapField = field)
    }

    fun onMapTapped(lat: Double, lng: Double) {
        viewModelScope.launch {
            val address = nominatim.reverse(lat, lng) ?: "%.5f, %.5f".format(lat, lng)
            val result = GeocodingResult(lat, lng, address)
            when (_uiState.value.activeMapField) {
                LocationField.PICKUP -> selectPickup(result)
                LocationField.DROPOFF -> selectDropoff(result)
            }
        }
    }

    fun fetchEstimate() {
        val s = _uiState.value
        val pLat = s.pickupLat ?: return
        val pLng = s.pickupLng ?: return
        val dLat = s.dropoffLat ?: return
        val dLng = s.dropoffLng ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.getFareEstimate(pLat, pLng, dLat, dLng)
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(fareEstimate = resp.body(), isLoading = false)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Could not get estimate")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = "Network error")
            }
        }
    }

    fun openConfirmSheet() {
        _uiState.value = _uiState.value.copy(showConfirmSheet = true)
    }

    fun closeConfirmSheet() {
        promoJob?.cancel()
        _uiState.value = _uiState.value.copy(
            showConfirmSheet = false,
            promoCode = "",
            promoValidation = null,
            isValidatingPromo = false,
        )
    }

    fun setPromoCode(code: String) {
        promoJob?.cancel()
        _uiState.value = _uiState.value.copy(promoCode = code, promoValidation = null, isValidatingPromo = false)
        if (code.isBlank()) return
        promoJob = viewModelScope.launch {
            delay(500)
            val fare = _uiState.value.fareEstimate?.fareEstimate ?: return@launch
            _uiState.value = _uiState.value.copy(isValidatingPromo = true)
            try {
                val resp = api.validatePromo(code.trim(), fare)
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(promoValidation = resp.body(), isValidatingPromo = false)
                } else {
                    _uiState.value = _uiState.value.copy(isValidatingPromo = false)
                }
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(isValidatingPromo = false)
            }
        }
    }

    fun clearPromo() {
        promoJob?.cancel()
        _uiState.value = _uiState.value.copy(promoCode = "", promoValidation = null, isValidatingPromo = false)
    }

    fun requestRide() {
        val s = _uiState.value
        val pLat = s.pickupLat ?: return
        val pLng = s.pickupLng ?: return
        val dLat = s.dropoffLat ?: return
        val dLng = s.dropoffLng ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, showConfirmSheet = false)
            try {
                val validPromoCode = if (s.promoValidation?.valid == true) s.promoValidation.code else null
                val resp = api.requestRide(
                    RequestRideBody(
                        pickupLat = pLat,
                        pickupLng = pLng,
                        pickupAddress = s.pickupAddress,
                        dropoffLat = dLat,
                        dropoffLng = dLng,
                        dropoffAddress = s.dropoffAddress,
                        paymentMethod = s.paymentMethod,
                        promoCode = validPromoCode,
                    )
                )
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(isLoading = false, requestedRideId = resp.body()?.ride?.id)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed to book ride")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = "Network error")
            }
        }
    }

    fun clearRequestedRide() {
        _uiState.value = _uiState.value.copy(requestedRideId = null)
    }
}
