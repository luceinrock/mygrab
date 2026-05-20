package com.ridenow.rider.ui.receipt

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiptScreen(
    rideId: String,
    onGoHome: () -> Unit,
    vm: ReceiptViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()
    var showDisputeDialog by remember { mutableStateOf(false) }
    var disputeReason by remember { mutableStateOf("") }

    LaunchedEffect(rideId) { vm.init(rideId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trip Receipt") },
                actions = {
                    IconButton(onClick = onGoHome) {
                        Icon(Icons.Default.Home, contentDescription = "Home")
                    }
                },
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val ride = uiState.ride
        if (ride == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(uiState.error ?: "Ride not found",
                    color = MaterialTheme.colorScheme.error)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Trip Summary", style = MaterialTheme.typography.titleMedium)
                        HorizontalDivider()
                        ReceiptRow("From", ride.pickupAddress)
                        ReceiptRow("To", ride.dropoffAddress)
                        ride.distanceKm?.let { ReceiptRow("Distance", "${it} km") }
                        ride.durationMin?.let { ReceiptRow("Duration", "${it} min") }
                        ride.rideType?.let {
                            ReceiptRow("Type", it.replaceFirstChar { c -> c.uppercaseChar() })
                        }
                        ReceiptRow("Payment", ride.paymentMethod.uppercase())
                        ride.completedAt?.let {
                            ReceiptRow("Completed", it.take(10))
                        }
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Fare Breakdown", style = MaterialTheme.typography.titleMedium)
                        HorizontalDivider()
                        val baseFare = ride.fareEstimate ?: 0.0
                        ReceiptRow("Estimated fare", "₱$baseFare")
                        val discount = ride.discountApplied ?: 0.0
                        if (discount > 0) {
                            ride.promoCode?.let { code ->
                                ReceiptRow("Promo ($code)", "-₱$discount", valueColor = Color(0xFF15803D))
                            }
                        }
                        HorizontalDivider()
                        val finalFare = ride.finalFare ?: (baseFare - discount).coerceAtLeast(0.0)
                        ReceiptRow(
                            "Total",
                            "₱$finalFare",
                            labelStyle = MaterialTheme.typography.titleSmall,
                            valueStyle = MaterialTheme.typography.titleMedium,
                        )
                    }
                }
            }

            if (uiState.isDisputeSubmitted || ride.status == "disputed") {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text("Dispute submitted. Our team will review and contact you shortly.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF92400E))
                        }
                    }
                }
            } else {
                item {
                    OutlinedButton(
                        onClick = { showDisputeDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    ) { Text("Dispute this ride") }
                }
            }

            item {
                Button(
                    onClick = onGoHome,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Done") }
            }
        }
    }

    if (showDisputeDialog) {
        AlertDialog(
            onDismissRequest = { showDisputeDialog = false; disputeReason = "" },
            title = { Text("Dispute this ride") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Please describe the issue:", style = MaterialTheme.typography.bodyMedium)
                    OutlinedTextField(
                        value = disputeReason,
                        onValueChange = { disputeReason = it },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        placeholder = { Text("E.g. wrong fare charged, unsafe driving…") },
                    )
                    uiState.disputeError?.let {
                        Text(it, color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (disputeReason.isNotBlank()) {
                            vm.submitDispute(disputeReason.trim())
                            showDisputeDialog = false
                        }
                    },
                    enabled = disputeReason.isNotBlank() && !uiState.isDisputeSubmitting,
                ) { Text(if (uiState.isDisputeSubmitting) "Submitting…" else "Submit") }
            },
            dismissButton = {
                TextButton(onClick = { showDisputeDialog = false; disputeReason = "" }) {
                    Text("Cancel")
                }
            },
        )
    }
}

@Composable
private fun ReceiptRow(
    label: String,
    value: String,
    valueColor: Color = Color.Unspecified,
    labelStyle: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.bodySmall,
    valueStyle: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.bodyMedium,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = labelStyle, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = valueStyle, color = valueColor)
    }
}
