package com.ridenow.driver

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.ridenow.driver.data.supabase.SupabaseModule
import com.ridenow.driver.ui.navigation.DriverNavGraph
import com.ridenow.driver.ui.navigation.Screen
import com.ridenow.driver.ui.theme.RideNowTheme
import dagger.hilt.android.AndroidEntryPoint
import io.github.jan.supabase.auth.auth

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val session = SupabaseModule.client.auth.currentSessionOrNull()
        val startDestination = if (session != null) Screen.Home.route else Screen.Auth.route

        setContent {
            RideNowTheme {
                DriverNavGraph(startDestination = startDestination)
            }
        }
    }
}
