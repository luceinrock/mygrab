package com.ridenow.rider.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onRideStarted: (rideId: String) -> Unit,
    onHistoryTapped: () -> Unit,
    onProfileTapped: () -> Unit,
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

                // Saved location chips
                if (uiState.savedLocations.isNotEmpty()) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(uiState.savedLocations) { loc ->
                            val idx = uiState.savedLocations.indexOf(loc)
                            InputChip(
                                selected = false,
                                onClick = { vm.selectFavorite(loc) },
                                label = { Text(loc.label, style = MaterialTheme.typography.labelSmall) },
                                trailingIcon = {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Remove",
                                        modifier = Modifier
                                            .size(14.dp)
                                            .clickable { vm.removeFavorite(idx) },
                                    )
                                },
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                }

                OutlinedTextField(
                    value = uiState.pickupAddress,
                    onValueChange = { vm.onPickupQueryChanged(it) },
                    label = { Text("Pickup") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    trailingIcon = {
                        if (uiState.pickupLat != null) {
                            val alreadySaved = uiState.savedLocations.any { it.address == uiState.pickupAddress }
                            IconButton(onClick = { if (!alreadySaved) vm.requestSave(forPickup = true) }) {
                                Icon(
                                    if (alreadySaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                    contentDescription = "Save pickup",
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    },
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = uiState.dropoffAddress,
                    onValueChange = { vm.onDropoffQueryChanged(it) },
                    label = { Text("Destination") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    trailingIcon = {
                        if (uiState.dropoffLat != null) {
                            val alreadySaved = uiState.savedLocations.any { it.address == uiState.dropoffAddress }
                            IconButton(onClick = { if (!alreadySaved) vm.requestSave(forPickup = false) }) {
                                Icon(
                                    if (alreadySaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                    contentDescription = "Save destination",
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    },
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

                // Ride type
                Text("Ride type", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        Triple("lite", "🚗 Lite", "Sedan / Hatchback"),
                        Triple("plus", "🚙 Plus", "SUV / Van"),
                        Triple("moto", "🏍 Moto", "Motorcycle"),
                    ).forEach { (key, label, _) ->
                        FilterChip(
                            selected = uiState.rideType == key,
                            onClick = { vm.setRideType(key) },
                            label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))

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
                    onClick = { if (canBook) vm.openConfirmSheet() else vm.fetchEstimate() },
                    enabled = canEstimate && !uiState.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp))
                    else Text(if (canBook) "Review & Book" else "Get Estimate")
                }
            }
        }

        // History + profile buttons
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 56.dp, start = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilledTonalIconButton(onClick = onHistoryTapped) {
                Icon(Icons.Default.History, contentDescription = "Ride History")
            }
            FilledTonalIconButton(onClick = onProfileTapped) {
                Icon(Icons.Default.Person, contentDescription = "Profile")
            }
        }

        // User + version badge
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 56.dp, end = 8.dp)
                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f), MaterialTheme.shapes.small)
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalAlignment = Alignment.End,
        ) {
            uiState.currentUserEmail?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            }
            Text("v${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        }

        uiState.error?.let {
            Snackbar(modifier = Modifier.align(Alignment.TopCenter).padding(top = 72.dp, start = 16.dp, end = 16.dp)) {
                Text(it)
            }
        }
    }

    // Fare breakdown confirmation sheet
    if (uiState.showConfirmSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val estimate = uiState.fareEstimate
        ModalBottomSheet(
            onDismissRequest = { vm.closeConfirmSheet() },
            sheetState = sheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 24.dp, end = 24.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("Confirm your ride", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

                HorizontalDivider()

                // Route
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    BreakdownRow("From", uiState.pickupAddress, bold = false)
                    BreakdownRow("To", uiState.dropoffAddress, bold = false)
                }

                HorizontalDivider()

                // Fare breakdown
                if (estimate != null) {
                    val rideTypeLabel = when (uiState.rideType) {
                        "plus" -> "🚙 Plus (SUV / Van)"
                        "moto" -> "🏍 Moto (Motorcycle)"
                        else   -> "🚗 Lite (Sedan / Hatchback)"
                    }
                    BreakdownRow("Ride type", rideTypeLabel, bold = false)
                    Spacer(Modifier.height(4.dp))
                    val bd = estimate.breakdown
                    BreakdownRow("Base fare", "₱%.2f".format(bd.baseFare))
                    BreakdownRow("Distance (${estimate.distanceKm} km)", "₱%.2f".format(bd.perKmCharge))
                    BreakdownRow("Time (~${estimate.durationMin} min)", "₱%.2f".format(bd.perMinCharge))
                    BreakdownRow("Booking fee", "₱%.2f".format(bd.bookingFee))
                    if (estimate.surgeMultiplier > 1.0) {
                        BreakdownRow(
                            "Surge pricing",
                            "×%.1f".format(estimate.surgeMultiplier),
                            valueColor = MaterialTheme.colorScheme.error,
                        )
                    }
                    HorizontalDivider()
                    val total = uiState.promoValidation?.takeIf { it.valid }?.discountedFare ?: estimate.fareEstimate
                    BreakdownRow("Total", "₱%.2f".format(total), bold = true)
                    BreakdownRow("Payment", uiState.paymentMethod.replaceFirstChar { it.uppercase() })
                }

                // Promo code
                HorizontalDivider()
                OutlinedTextField(
                    value = uiState.promoCode,
                    onValueChange = { vm.setPromoCode(it) },
                    label = { Text("Promo code (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.LocalOffer, null, Modifier.size(18.dp)) },
                    trailingIcon = {
                        when {
                            uiState.isValidatingPromo -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                            uiState.promoCode.isNotBlank() -> IconButton(onClick = { vm.clearPromo() }) {
                                Icon(Icons.Default.Close, "Clear promo", Modifier.size(18.dp))
                            }
                        }
                    },
                )
                uiState.promoValidation?.let { result ->
                    if (result.valid && result.savings != null) {
                        BreakdownRow(
                            "Promo discount",
                            "-₱%.2f".format(result.savings),
                            valueColor = Color(0xFF16A34A),
                        )
                    } else if (!result.valid) {
                        Text(
                            when (result.reason) {
                                "not_found" -> "Invalid promo code"
                                "expired" -> "This promo has expired"
                                "exhausted" -> "This promo is fully redeemed"
                                "already_used" -> "You've already used this promo"
                                "below_min_fare" -> "Min fare ₱${result.minFare?.toInt()} required"
                                "not_started" -> "This promo isn't active yet"
                                else -> "Invalid promo code"
                            },
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                }

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = { vm.requestRide() },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isLoading,
                ) {
                    if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary)
                    else Text("Confirm Booking")
                }
                OutlinedButton(
                    onClick = { vm.closeConfirmSheet() },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Go Back") }
            }
        }
    }

    // Save-label dialog
    if (uiState.showSaveDialog) {
        var labelText by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { vm.cancelSave() },
            title = { Text("Save location") },
            text = {
                OutlinedTextField(
                    value = labelText,
                    onValueChange = { labelText = it },
                    label = { Text("Label (e.g. Home, Work)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            confirmButton = {
                Button(
                    onClick = { if (labelText.isNotBlank()) vm.confirmSave(labelText) },
                    enabled = labelText.isNotBlank(),
                ) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { vm.cancelSave() }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun BreakdownRow(
    label: String,
    value: String,
    bold: Boolean = false,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            label,
            style = if (bold) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = if (bold) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = valueColor,
        )
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
