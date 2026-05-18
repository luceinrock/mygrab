package com.ridenow.driver.data.location

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.ridenow.driver.data.remote.ApiClient
import com.ridenow.driver.data.remote.models.LocationBatchBody
import com.ridenow.driver.data.remote.models.LocationPoint
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import java.time.Instant
import javax.inject.Inject

@AndroidEntryPoint
class LocationForegroundService : Service() {

    @Inject lateinit var apiClient: ApiClient

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedClient: FusedLocationProviderClient
    private val pendingBatch = mutableListOf<LocationPoint>()

    private val locationRequest = LocationRequest.Builder(
        Priority.PRIORITY_HIGH_ACCURACY, 5_000L
    ).setMinUpdateIntervalMillis(3_000L).build()

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { loc ->
                pendingBatch.add(LocationPoint(loc.latitude, loc.longitude, Instant.now().toString()))
                if (pendingBatch.size >= 5) flushBatch()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        startLocationUpdates()
        schedulePeriodicFlush()
    }

    private fun startLocationUpdates() {
        try {
            fusedClient.requestLocationUpdates(locationRequest, locationCallback, mainLooper)
        } catch (_: SecurityException) {}
    }

    private fun schedulePeriodicFlush() {
        scope.launch {
            while (isActive) {
                delay(15_000L)
                flushBatch()
            }
        }
    }

    private fun flushBatch() {
        if (pendingBatch.isEmpty()) return
        val batch = pendingBatch.toList()
        pendingBatch.clear()
        scope.launch {
            try {
                apiClient.api.batchLocation(LocationBatchBody(batch))
            } catch (_: Exception) {}
        }
    }

    override fun onDestroy() {
        fusedClient.removeLocationUpdates(locationCallback)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val channel = NotificationChannel(CHANNEL_ID, "Location Tracking", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("RideNow Driver")
        .setContentText("Sharing your location")
        .setSmallIcon(android.R.drawable.ic_menu_mylocation)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build()

    companion object {
        private const val CHANNEL_ID = "ridenow_location"
        private const val NOTIFICATION_ID = 1001
    }
}
