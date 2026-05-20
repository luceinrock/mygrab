package com.ridenow.driver.ui.ride

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun ActiveRideScreen(
    rideId: String,
    onRideCompleted: () -> Unit,
    vm: RideViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(rideId) { vm.init(rideId) }

    fun openMaps(lat: Double, lng: Double) {
        val nav = Uri.parse("google.navigation:q=$lat,$lng&mode=d")
        val intent = Intent(Intent.ACTION_VIEW, nav).apply {
            setPackage("com.google.android.apps.maps")
        }
        if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
        } else {
            // Fallback: open in browser / any map app
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=$lat,$lng")))
        }
    }

    LaunchedEffect(uiState.isCompleted) {
        if (uiState.isCompleted) onRideCompleted()
    }

    var showRatingDialog by remember { mutableStateOf(false) }
    var selectedRating by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        uiState.ride?.let { ride ->
            Text("Active Ride", style = MaterialTheme.typography.headlineSmall)

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatusBadge(ride.status)
                    Divider()
                    LabelValue("Pickup", ride.pickupAddress)
                    LabelValue("Dropoff", ride.dropoffAddress)
                    ride.fareEstimate?.let { LabelValue("Fare", "₱$it") }
                    LabelValue("Payment", ride.paymentMethod.uppercase())
                }
            }

            Spacer(Modifier.height(8.dp))

            when (ride.status) {
                "accepted" -> {
                    OutlinedButton(
                        onClick = { openMaps(ride.pickupLat, ride.pickupLng) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Navigate to Pickup") }
                    Button(
                        onClick = { vm.arrivedAtPickup() },
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp))
                        else Text("I've Arrived at Pickup")
                    }
                }

                "arrived" -> {
                    OutlinedButton(
                        onClick = { openMaps(ride.pickupLat, ride.pickupLng) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Navigate to Pickup") }
                    Button(
                        onClick = { vm.startRide() },
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp))
                        else Text("Start Ride")
                    }
                }

                "in_progress" -> {
                    OutlinedButton(
                        onClick = { openMaps(ride.dropoffLat, ride.dropoffLng) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Navigate to Dropoff") }
                    Button(
                        onClick = { vm.completeRide() },
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp))
                        else Text("Complete Ride")
                    }
                }

                "completed" -> {
                    LaunchedEffect(Unit) { showRatingDialog = true }
                }
            }
        } ?: CircularProgressIndicator()

        uiState.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }

    if (showRatingDialog) {
        AlertDialog(
            onDismissRequest = { vm.rateRider(selectedRating.coerceAtLeast(1), null) },
            title = { Text("Rate your rider") },
            text = {
                Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                    (1..5).forEach { star ->
                        IconButton(onClick = { selectedRating = star }) {
                            Icon(
                                if (star <= selectedRating) Icons.Filled.Star else Icons.Outlined.StarOutline,
                                contentDescription = "$star stars",
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { vm.rateRider(selectedRating.coerceAtLeast(1), null) },
                    enabled = selectedRating > 0,
                ) { Text("Submit") }
            },
            dismissButton = {
                TextButton(onClick = { vm.rateRider(1, null) }) { Text("Skip") }
            },
        )
    }
}

@Composable
private fun StatusBadge(status: String) {
    val label = when (status) {
        "accepted" -> "Driver heading to pickup"
        "arrived" -> "Driver at pickup"
        "in_progress" -> "In Progress"
        "completed" -> "Completed"
        else -> status
    }
    Text(label, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
}

@Composable
private fun LabelValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}
