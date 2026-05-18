package com.ridenow.driver.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ridenow.driver.ui.auth.AuthScreen
import com.ridenow.driver.ui.earnings.EarningsScreen
import com.ridenow.driver.ui.home.HomeScreen
import com.ridenow.driver.ui.ride.ActiveRideScreen

sealed class Screen(val route: String) {
    object Auth : Screen("auth")
    object Home : Screen("home")
    object ActiveRide : Screen("active_ride/{rideId}") {
        fun createRoute(rideId: String) = "active_ride/$rideId"
    }
    object Earnings : Screen("earnings")
}

@Composable
fun DriverNavGraph(startDestination: String = Screen.Home.route) {
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
                onRideAccepted = { rideId ->
                    navController.navigate(Screen.ActiveRide.createRoute(rideId))
                },
                onEarningsTapped = {
                    navController.navigate(Screen.Earnings.route)
                }
            )
        }

        composable(
            route = Screen.ActiveRide.route,
            arguments = listOf(navArgument("rideId") { type = NavType.StringType }),
        ) { backStack ->
            val rideId = backStack.arguments?.getString("rideId") ?: return@composable
            ActiveRideScreen(
                rideId = rideId,
                onRideCompleted = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Earnings.route) {
            EarningsScreen(onBack = { navController.popBackStack() })
        }
    }
}
