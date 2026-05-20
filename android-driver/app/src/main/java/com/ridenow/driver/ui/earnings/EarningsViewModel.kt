package com.ridenow.driver.ui.earnings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ridenow.driver.data.remote.RideNowApi
import com.ridenow.driver.data.remote.models.EarningsResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

data class DayBucket(val label: String, val net: Float)

data class EarningsUiState(
    val earnings: EarningsResponse? = null,
    val chartBuckets: List<DayBucket> = emptyList(),
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
                val isoFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val startCal = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -6)
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0)
                }
                val from7d = isoFmt.format(startCal.time)

                // Load wallet summary + 7-day transactions in parallel
                val summaryDeferred = async { api.getEarnings() }
                val chartDeferred = async { api.getEarnings(from = from7d, limit = 200) }

                val summaryResp = summaryDeferred.await()
                val chartResp = chartDeferred.await()

                val earnings = if (summaryResp.isSuccessful) summaryResp.body() else null
                val chartTxns = if (chartResp.isSuccessful) chartResp.body()?.transactions ?: emptyList() else emptyList()

                val dayFmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val labelFmt = SimpleDateFormat("EEE", Locale.getDefault())

                val buckets = (0..6).map { offset ->
                    val cal = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -6 + offset) }
                    val dateKey = dayFmt.format(cal.time)
                    val label = labelFmt.format(cal.time).take(3)
                    val net = chartTxns
                        .filter { it.createdAt.take(10) == dateKey }
                        .sumOf { it.amount }
                        .toFloat()
                    DayBucket(label, net)
                }

                _uiState.value = EarningsUiState(
                    earnings = earnings,
                    chartBuckets = buckets,
                    isLoading = false,
                )
            } catch (e: Exception) {
                _uiState.value = EarningsUiState(error = e.message, isLoading = false)
            }
        }
    }
}
