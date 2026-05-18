package com.ridenow.rider.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.*
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
import com.ridenow.rider.BuildConfig
import com.ridenow.rider.data.geocoding.GeocodingResult
import org.maplibre.android.MapLibre
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

private const val DEFAULT_LAT = 10.3103
private const val DEFAULT_LNG = 123.9494

@Composable
fun HomeScreen(
    onRideStarted: (rideId: String) -> Unit,
    onHistoryTapped: () -> Unit,
    vm: HomeViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState.requestedRideId) {
        uiState.requestedRideId?.let { rideId ->
            onRideStarted(rideId)
            vm.clearRequestedRide()
        }
    }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val mapRef = remember { mutableStateOf<MapLibreMap?>(null) }
    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }

    // Map lifecycle
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        mapView.getMapAsync { map ->
            mapRef.value = map
            map.setStyle("https://tiles.openfreemap.org/styles/liberty")
            map.cameraPosition = CameraPosition.Builder()
                .target(LatLng(DEFAULT_LAT, DEFAULT_LNG))
                .zoom(13.0)
                .build()
            map.addOnMapClickListener { point ->
                vm.onMapTapped(point.latitude, point.longitude)
                true
            }
        }
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // Update markers when coordinates change
    LaunchedEffect(uiState.pickupLat, uiState.pickupLng, uiState.dropoffLat, uiState.dropoffLng) {
        val map = mapRef.value ?: return@LaunchedEffect
        map.clear()
        uiState.pickupLat?.let { lat ->
            uiState.pickupLng?.let { lng ->
                map.addMarker(MarkerOptions().position(LatLng(lat, lng)).title("Pickup"))
            }
        }
        uiState.dropoffLat?.let { lat ->
            uiState.dropoffLng?.let { lng ->
                map.addMarker(MarkerOptions().position(LatLng(lat, lng)).title("Dropoff"))
            }
        }
        // Pan camera to show both markers if both set
        if (uiState.dropoffLat != null && uiState.dropoffLng != null) {
            map.cameraPosition = CameraPosition.Builder()
                .target(LatLng(uiState.dropoffLat!!, uiState.dropoffLng!!))
                .zoom(14.0)
                .build()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize())

        // Map field toggle (top)
        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(
                selected = uiState.activeMapField == LocationField.PICKUP,
                onClick = { vm.setActiveMapField(LocationField.PICKUP) },
                label = { Text("Tap map: Pickup") },
                leadingIcon = { Icon(Icons.Default.MyLocation, null, Modifier.size(16.dp)) },
            )
            FilterChip(
                selected = uiState.activeMapField == LocationField.DROPOFF,
                onClick = { vm.setActiveMapField(LocationField.DROPOFF) },
                label = { Text("Dropoff") },
            )
        }

        // Suggestions overlay (shown above the bottom card)
        val activeSuggestions = if (uiState.pickupSuggestions.isNotEmpty()) uiState.pickupSuggestions
                                 else uiState.dropoffSuggestions
        if (activeSuggestions.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 240.dp),
                elevation = CardDefaults.cardElevation(8.dp),
            ) {
                LazyColumn(modifier = Modifier.heightIn(max = 200.dp)) {
                    items(activeSuggestions) { result ->
                        SuggestionItem(result) {
                            if (uiState.pickupSuggestions.isNotEmpty()) vm.selectPickup(result)
                            else vm.selectDropoff(result)
                        }
                        HorizontalDivider()
                    }
                }
            }
        }

        // Bottom booking card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(16.dp),
            elevation = CardDefaults.cardElevation(8.dp),
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Where to?", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(12.dp))

                OutlinedTextField(
                    value = uiState.pickupAddress,
                    onValueChange = { vm.onPickupQueryChanged(it) },
                    label = { Text("Pickup") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = uiState.dropoffAddress,
                    onValueChange = { vm.onDropoffQueryChanged(it) },
                    label = { Text("Destination") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Spacer(Modifier.height(12.dp))

                uiState.fareEstimate?.let { estimate ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Estimated fare", style = MaterialTheme.typography.bodyMedium)
                        Text("₱${estimate.fareEstimate}", style = MaterialTheme.typography.titleMedium)
                    }
                    Text(
                        "${estimate.distanceKm} km · ~${estimate.durationMin} min",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(12.dp))
                }

                // Payment method
                Text("Payment", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("cash" to "Cash", "gcash" to "GCash", "card" to "Card").forEach { (key, label) ->
                        FilterChip(
                            selected = uiState.paymentMethod == key,
                            onClick = { vm.setPaymentMethod(key) },
                            label = { Text(label) },
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))

                val canEstimate = uiState.pickupLat != null && uiState.dropoffLat != null
                val canBook = canEstimate && uiState.fareEstimate != null

                Button(
                    onClick = { if (canBook) vm.requestRide() else vm.fetchEstimate() },
                    enabled = canEstimate && !uiState.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp))
                    else Text(if (canBook) "Book Ride" else "Get Estimate")
                }
            }
        }

        // History button
        FilledTonalIconButton(
            onClick = onHistoryTapped,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 56.dp, start = 8.dp),
        ) {
            Icon(Icons.Default.History, contentDescription = "Ride History")
        }

        // Version badge
        Text(
            text = "v${BuildConfig.VERSION_NAME}",
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 56.dp, end = 8.dp)
                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.7f), MaterialTheme.shapes.small)
                .padding(horizontal = 6.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )

        uiState.error?.let {
            Snackbar(modifier = Modifier.align(Alignment.TopCenter).padding(top = 72.dp, start = 16.dp, end = 16.dp)) {
                Text(it)
            }
        }
    }
}

@Composable
private fun SuggestionItem(result: GeocodingResult, onClick: () -> Unit) {
    Text(
        text = result.displayName,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(12.dp),
        style = MaterialTheme.typography.bodySmall,
        maxLines = 2,
    )
}
