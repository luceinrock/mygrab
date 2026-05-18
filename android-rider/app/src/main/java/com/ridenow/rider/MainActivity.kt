package com.ridenow.rider

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.ridenow.rider.data.remote.TokenProvider
import com.ridenow.rider.data.supabase.SupabaseModule
import com.ridenow.rider.ui.navigation.RiderNavGraph
import com.ridenow.rider.ui.navigation.Screen
import com.ridenow.rider.ui.theme.RideNowTheme
import dagger.hilt.android.AndroidEntryPoint
import io.github.jan.supabase.auth.auth
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var tokenProvider: TokenProvider

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val session = SupabaseModule.client.auth.currentSessionOrNull()
        if (session != null) {
            tokenProvider.token = session.accessToken
        }
        val startDestination = if (session != null) Screen.Home.route else Screen.Auth.route

        setContent {
            RideNowTheme {
                RiderNavGraph(startDestination = startDestination)
            }
        }
    }

}
