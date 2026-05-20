package com.ridenow.driver.ui.history

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ridenow.driver.data.remote.models.Ride

private val STATUS_COLOR = mapOf(
    "completed"   to (Color(0xFF15803D) to Color(0xFFDCFCE7)),
    "cancelled"   to (Color(0xFFDC2626) to Color(0xFFFEE2E2)),
    "disputed"    to (Color(0xFFD97706) to Color(0xFFFEF3C7)),
    "in_progress" to (Color(0xFF2563EB) to Color(0xFFDBEAFE)),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RideHistoryScreen(
    onBack: () -> Unit,
    vm: RideHistoryViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()
    val totalPages = if (uiState.total == 0) 1 else (uiState.total + 19) / 20

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ride History") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (uiState.isLoading) {
                item {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            }

            uiState.error?.let { err ->
                item {
                    Text(err, color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall)
                }
            }

            items(uiState.rides) { ride ->
                RideHistoryRow(ride)
            }

            if (!uiState.isLoading && uiState.rides.isEmpty() && uiState.error == null) {
                item {
                    Text("No rides yet.", color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium)
                }
            }

            if (totalPages > 1) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        TextButton(
                            onClick = { vm.load(uiState.page - 1) },
                            enabled = uiState.page > 1,
                        ) { Text("Previous") }
                        Text(
                            "Page ${uiState.page} of $totalPages",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        TextButton(
                            onClick = { vm.load(uiState.page + 1) },
                            enabled = uiState.page < totalPages,
                        ) { Text("Next") }
                    }
                }
            }
        }
    }
}

@Composable
private fun RideHistoryRow(ride: Ride) {
    val (textColor, bgColor) = STATUS_COLOR[ride.status] ?: (Color(0xFF6B7280) to Color(0xFFF3F4F6))
    val fareDisplay = ride.finalFare ?: ride.fareEstimate ?: 0.0

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = bgColor,
                ) {
                    Text(
                        ride.status.replace("_", " ").replaceFirstChar { it.uppercaseChar() },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = textColor,
                    )
                }
                Text(
                    "₱$fareDisplay",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(ride.pickupAddress, style = MaterialTheme.typography.bodyMedium)
            Text(
                "→ ${ride.dropoffAddress}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ride.distanceKm?.let {
                    Text("${it} km", style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                ride.durationMin?.let {
                    Text("${it} min", style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                ride.rideType?.let {
                    Text(it.replaceFirstChar { c -> c.uppercaseChar() },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(
                ride.createdAt.take(10),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
