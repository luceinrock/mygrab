package com.broom2x.ph

import android.app.Application
import android.util.Log
import com.onesignal.OneSignal
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class RideNowApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Initialize OneSignal
        // Note: Replace with your actual OneSignal App ID from local.properties or BuildConfig
        val oneSignalAppId = BuildConfig.ONESIGNAL_APP_ID
        
        if (oneSignalAppId.isNotEmpty()) {
            OneSignal.initWithContext(this)
            OneSignal.setAppId(oneSignalAppId)
            
            // Enable verbose logging for development
            OneSignal.setLogLevel(OneSignal.LOG_LEVEL.VERBOSE, OneSignal.LOG_LEVEL.NONE)
            
            Log.d("RideNow", "OneSignal initialized with App ID: $oneSignalAppId")
        } else {
            Log.w("RideNow", "OneSignal App ID not found. Notifications will not work.")
        }
    }
}
