package com.ridenow.driver.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.models.DriverProfile
import com.ridenow.driver.data.remote.models.UpdateProfileBody
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val profile: DriverProfile? = null,
    val fullName: String = "",
    val vehicleMake: String = "",
    val vehicleModel: String = "",
    val vehicleColor: String = "",
    val plateNumber: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val api: RideNowApi,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState = _uiState.asStateFlow()

    init { loadProfile() }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val resp = api.getProfile()
                if (resp.isSuccessful) {
                    val p = resp.body()?.profile
                    if (p != null) {
                        _uiState.value = _uiState.value.copy(
                            profile = p,
                            fullName = p.fullName,
                            vehicleMake = p.vehicleMake ?: "",
                            vehicleModel = p.vehicleModel ?: "",
                            vehicleColor = p.vehicleColor ?: "",
                            plateNumber = p.plateNumber ?: "",
                            isLoading = false,
                        )
                    }
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Failed to load profile")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = "No connection")
            }
        }
    }

    fun onFullNameChange(v: String)     { _uiState.value = _uiState.value.copy(fullName = v, saveSuccess = false) }
    fun onVehicleMakeChange(v: String)  { _uiState.value = _uiState.value.copy(vehicleMake = v, saveSuccess = false) }
    fun onVehicleModelChange(v: String) { _uiState.value = _uiState.value.copy(vehicleModel = v, saveSuccess = false) }
    fun onVehicleColorChange(v: String) { _uiState.value = _uiState.value.copy(vehicleColor = v, saveSuccess = false) }
    fun onPlateNumberChange(v: String)  { _uiState.value = _uiState.value.copy(plateNumber = v, saveSuccess = false) }

    fun save() {
        val s = _uiState.value
        if (s.fullName.isBlank()) {
            _uiState.value = s.copy(error = "Name cannot be empty")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null, saveSuccess = false)
            try {
                val resp = api.updateProfile(
                    UpdateProfileBody(
                        fullName = s.fullName.trim(),
                        vehicleMake = s.vehicleMake.trim().ifBlank { null },
                        vehicleModel = s.vehicleModel.trim().ifBlank { null },
                        vehicleColor = s.vehicleColor.trim().ifBlank { null },
                        plateNumber = s.plateNumber.trim().ifBlank { null },
                    )
                )
                if (resp.isSuccessful) {
                    _uiState.value = _uiState.value.copy(isSaving = false, saveSuccess = true)
                } else {
                    _uiState.value = _uiState.value.copy(isSaving = false, error = "Save failed")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isSaving = false, error = "No connection")
            }
        }
    }

    fun clearSuccess() { _uiState.value = _uiState.value.copy(saveSuccess = false) }
    fun clearError()   { _uiState.value = _uiState.value.copy(error = null) }
}
