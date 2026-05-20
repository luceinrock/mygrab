package com.ridenow.rider.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ridenow.rider.ui.auth.AuthScreen
import com.ridenow.rider.ui.history.RideHistoryScreen
import com.ridenow.rider.ui.home.HomeScreen
import com.ridenow.rider.ui.profile.ProfileScreen
import com.ridenow.rider.ui.receipt.ReceiptScreen
import com.ridenow.rider.ui.ride.ActiveRideScreen

sealed class Screen(val route: String) {
    object Auth : Screen("auth")
    object Home : Screen("home")
    object History : Screen("history")
    object Profile : Screen("profile")
    object ActiveRide : Screen("active_ride/{rideId}") {
        fun createRoute(rideId: String) = "active_ride/$rideId"
    }
    object Receipt : Screen("receipt/{rideId}") {
        fun createRoute(rideId: String) = "receipt/$rideId"
    }
}

@Composable
fun RiderNavGraph(startDestination: String = Screen.Home.route) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Screen.Auth.route) {
            AuthScreen(
                onAuthenticated = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onRideStarted = { rideId ->
                    navController.navigate(Screen.ActiveRide.createRoute(rideId))
                },
                onHistoryTapped = { navController.navigate(Screen.History.route) },
                onProfileTapped = { navController.navigate(Screen.Profile.route) },
            )
        }

        composable(Screen.History.route) {
            RideHistoryScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Profile.route) {
            ProfileScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.ActiveRide.route,
            arguments = listOf(navArgument("rideId") { type = NavType.StringType }),
        ) { backStack ->
            val rideId = backStack.arguments?.getString("rideId") ?: return@composable
            ActiveRideScreen(
                rideId = rideId,
                onRideCompleted = { completedRideId ->
                    navController.navigate(Screen.Receipt.createRoute(completedRideId)) {
                        popUpTo(Screen.Home.route)
                    }
                },
                onRideCancelled = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
            )
        }

        composable(
            route = Screen.Receipt.route,
            arguments = listOf(navArgument("rideId") { type = NavType.StringType }),
        ) { backStack ->
            val rideId = backStack.arguments?.getString("rideId") ?: return@composable
            ReceiptScreen(
                rideId = rideId,
                onGoHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
            )
        }
    }
}
