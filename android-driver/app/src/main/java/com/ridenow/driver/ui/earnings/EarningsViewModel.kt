package com.ridenow.driver.ui.earnings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.models.EarningsResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EarningsUiState(
    val earnings: EarningsResponse? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class EarningsViewModel @Inject constructor(private val api: RideNowApi) : ViewModel() {

    private val _uiState = MutableStateFlow(EarningsUiState())
    val uiState = _uiState.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val resp = api.getEarnings()
                if (resp.isSuccessful) {
                    _uiState.value = EarningsUiState(earnings = resp.body())
                } else {
                    _uiState.value = EarningsUiState(error = "Failed to load earnings")
                }
            } catch (e: Exception) {
                _uiState.value = EarningsUiState(error = e.message)
            }
        }
    }
}
