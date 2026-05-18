package com.ridenow.rider.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF00AA44),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFBBF0D0),
    secondary = Color(0xFF1A73E8),
)

@Composable
fun RideNowTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}
