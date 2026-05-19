package com.ridenow.driver.ui.home

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ridenow.driver.BuildConfig
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.android.gms.location.LocationServices
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.location.modes.CameraMode
import org.maplibre.android.location.modes.RenderMode
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

private const val DEFAULT_LAT = 10.3103
private const val DEFAULT_LNG = 123.9494

private val LOCATION_PERMISSIONS = arrayOf(
    Manifest.permission.ACCESS_FINE_LOCATION,
    Manifest.permission.ACCESS_COARSE_LOCATION,
)

@Composable
fun HomeScreen(
    onRideAccepted: (rideId: String) -> Unit,
    onEarningsTapped: () -> Unit,
    vm: HomeViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var mapRef by remember { mutableStateOf<MapLibreMap?>(null) }
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    LaunchedEffect(uiState.acceptedRideId) {
        uiState.acceptedRideId?.let { rideId ->
            onRideAccepted(rideId)
            vm.clearAcceptedRide()
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
                   || permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) vm.toggleOnline()
    }

    fun onToggleRequested() {
        if (uiState.isOnline) {
            vm.toggleOnline()
            return
        }
        val hasPermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasPermission) vm.toggleOnline()
        else permissionLauncher.launch(LOCATION_PERMISSIONS)
    }

    fun centerOnMyLocation() {
        val hasPermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) return
        try {
            fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                loc?.let {
                    mapRef?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(LatLng(it.latitude, it.longitude), 16.0)
                    )
                }
            }
        } catch (_: SecurityException) {}
    }

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }

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
            mapRef = map
            map.setStyle("https://tiles.openfreemap.org/styles/liberty") { style ->
                map.cameraPosition = CameraPosition.Builder()
                    .target(LatLng(DEFAULT_LAT, DEFAULT_LNG))
                    .zoom(14.0)
                    .build()
                try {
                    val locationOptions = LocationComponentActivationOptions
                        .builder(context, style)
                        .useDefaultLocationEngine(true)
                        .build()
                    map.locationComponent.activateLocationComponent(locationOptions)
                    map.locationComponent.isLocationComponentEnabled = true
                    map.locationComponent.renderMode = RenderMode.COMPASS
                    map.locationComponent.cameraMode = CameraMode.NONE
                } catch (_: Exception) {}
            }
        }
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { mapView },
            modifier = Modifier.fillMaxSize(),
        )

        // Top bar: version + wallet + earnings
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            uiState.profile?.let { p ->
                Card(elevation = CardDefaults.cardElevation(4.dp)) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = null,
                            modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("₱${p.walletBalance}", style = MaterialTheme.typography.titleSmall)
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                uiState.profile?.let { p ->
                    Column(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f), MaterialTheme.shapes.small)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        horizontalAlignment = Alignment.End,
                    ) {
                        Text(p.fullName, style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary)
                        p.email?.let {
                            Text(it, style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Text("v${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    }
                }
                IconButton(onClick = onEarningsTapped) {
                    Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Earnings")
                }
            }
        }

        // Bottom: online toggle + incoming ride card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(16.dp),
        ) {
            uiState.incomingRide?.let { ride ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    elevation = CardDefaults.cardElevation(8.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("New Ride Request", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(8.dp))
                        Text(ride.pickupAddress, style = MaterialTheme.typography.bodyMedium)
                        Text("→ ${ride.dropoffAddress}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                        ride.fareEstimate?.let {
                            Text("₱$it · ${ride.distanceKm} km",
                                style = MaterialTheme.typography.titleSmall)
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { vm.dismissIncomingRide() },
                                modifier = Modifier.weight(1f),
                            ) { Text("Decline") }
                            Button(
                                onClick = { vm.acceptRide(ride.id) },
                                modifier = Modifier.weight(1f),
                                enabled = !uiState.isLoading,
                            ) {
                                if (uiState.isLoading) CircularProgressIndicator(Modifier.size(18.dp))
                                else Text("Accept")
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            // "Find me" button aligned to the right, above the toggle card
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                SmallFloatingActionButton(
                    onClick = { centerOnMyLocation() },
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = "Center on my location")
                }
            }
            Spacer(Modifier.height(8.dp))

            // Online toggle
            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(4.dp),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            if (uiState.isOnline) "You are online" else "You are offline",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            if (uiState.isOnline) "Waiting for rides..." else "Go online to accept rides",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = uiState.isOnline,
                        onCheckedChange = { onToggleRequested() },
                        enabled = !uiState.isLoading,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF2ECC71),
                            checkedTrackColor = Color(0xFF2ECC71).copy(alpha = 0.5f),
                        ),
                    )
                }
            }
        }

        uiState.error?.let { error ->
            Snackbar(modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 72.dp, start = 16.dp, end = 16.dp)) {
                Text(error)
            }
        }
    }
}
