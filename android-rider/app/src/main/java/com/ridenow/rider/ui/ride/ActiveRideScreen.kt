package com.ridenow.rider.ui.ride

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import org.maplibre.android.MapLibre
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style

private val STATUS_LABELS = mapOf(
    "requested"   to "Finding your driver...",
    "accepted"    to "Driver is on the way",
    "arrived"     to "Driver has arrived!",
    "in_progress" to "Ride in progress",
    "completed"   to "You have arrived!",
    "cancelled"   to "Ride cancelled",
)

@Composable
fun ActiveRideScreen(
    rideId: String,
    onRideCompleted: () -> Unit,
    vm: RideViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(rideId) { vm.init(rideId) }

    LaunchedEffect(uiState.isCompleted) {
        if (uiState.isCompleted) onRideCompleted()
    }

    var showRatingDialog by remember { mutableStateOf(false) }
    var selectedRating by remember { mutableIntStateOf(0) }

    LaunchedEffect(uiState.ride?.status) {
        if (uiState.ride?.status == "completed") showRatingDialog = true
    }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val mapRef = remember { mutableStateOf<MapLibreMap?>(null) }
    val mapReady = remember { mutableStateOf(false) }
    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START   -> mapView.onStart()
                Lifecycle.Event.ON_RESUME  -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE   -> mapView.onPause()
                Lifecycle.Event.ON_STOP    -> mapView.onStop()
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        mapView.getMapAsync { map ->
            mapRef.value = map
            map.setStyle(Style.Builder().fromUri("https://tiles.openfreemap.org/styles/liberty")) {
                // Only signal ready after the style is fully loaded — markers can't be
                // added before this point or they silently fail to render.
                mapReady.value = true
            }
        }
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // Update markers whenever driver location, ride, or map-ready state changes
    LaunchedEffect(uiState.driverLat, uiState.driverLng, uiState.ride, mapReady.value) {
        if (!mapReady.value) return@LaunchedEffect
        val map = mapRef.value ?: return@LaunchedEffect
        map.clear()

        val ride = uiState.ride
        ride?.let {
            map.addMarker(MarkerOptions().position(LatLng(it.pickupLat, it.pickupLng)).title("Pickup"))
            map.addMarker(MarkerOptions().position(LatLng(it.dropoffLat, it.dropoffLng)).title("Dropoff"))
        }

        val dLat = uiState.driverLat
        val dLng = uiState.driverLng
        if (dLat != null && dLng != null) {
            map.addMarker(MarkerOptions().position(LatLng(dLat, dLng)).title("Driver"))
            map.cameraPosition = CameraPosition.Builder()
                .target(LatLng(dLat, dLng))
                .zoom(15.0)
                .build()
        } else if (ride != null) {
            map.cameraPosition = CameraPosition.Builder()
                .target(LatLng(ride.pickupLat, ride.pickupLng))
                .zoom(14.0)
                .build()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize())

        // Status label at top
        val statusText = uiState.ride?.let { STATUS_LABELS[it.status] ?: it.status }
            ?: "Loading ride..."
        Card(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 48.dp, start = 16.dp, end = 16.dp),
            elevation = CardDefaults.cardElevation(6.dp),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(statusText, style = MaterialTheme.typography.titleMedium)
                if (uiState.ride?.status == "requested") {
                    Spacer(Modifier.height(4.dp))
                    val mins = uiState.searchRemainingSeconds / 60
                    val secs = uiState.searchRemainingSeconds % 60
                    Text(
                        "%d:%02d".format(mins, secs),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (uiState.searchRemainingSeconds <= 30)
                            MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { vm.cancelRide() },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Cancel Search") }
                }
            }
        }

        // Bottom ride info card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(16.dp),
            elevation = CardDefaults.cardElevation(8.dp),
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                if (uiState.ride == null) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else {
                    val ride = uiState.ride!!
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        LabelValue("From", ride.pickupAddress)
                        LabelValue("To", ride.dropoffAddress)
                        ride.fareEstimate?.let { LabelValue("Estimated fare", "₱$it") }
                        LabelValue("Payment", ride.paymentMethod.uppercase())
                    }

                    if (ride.status in listOf("requested", "accepted", "arrived")) {
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { vm.cancelRide() },
                            enabled = !uiState.isLoading,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        ) { Text("Cancel Ride") }
                    }
                }

                uiState.error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }

    if (showRatingDialog) {
        AlertDialog(
            onDismissRequest = { vm.rateRide(selectedRating.coerceAtLeast(1), null) },
            title = { Text("Rate your driver") },
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
                    onClick = { vm.rateRide(selectedRating.coerceAtLeast(1), null) },
                    enabled = selectedRating > 0,
                ) { Text("Submit") }
            },
            dismissButton = {
                TextButton(onClick = { vm.rateRide(1, null) }) { Text("Skip") }
            },
        )
    }
}

@Composable
private fun LabelValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}
