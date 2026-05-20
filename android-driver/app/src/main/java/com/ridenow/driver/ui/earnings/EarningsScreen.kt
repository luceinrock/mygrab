package com.ridenow.driver.ui.earnings

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ridenow.driver.data.remote.models.WalletTransaction

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EarningsScreen(
    onBack: () -> Unit,
    vm: EarningsViewModel = hiltViewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Earnings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // 7-day chart
            if (uiState.chartBuckets.isNotEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Last 7 days",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(16.dp))
                            EarningsBarChart(buckets = uiState.chartBuckets)
                        }
                    }
                }
            }

            // Wallet summary card
            item {
                uiState.earnings?.let { e ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("Wallet Balance", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "₱${e.walletBalance}",
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = if (e.walletBalance >= 0) MaterialTheme.colorScheme.primary
                                            else MaterialTheme.colorScheme.error,
                                )
                            }
                            HorizontalDivider()
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                SummaryCell("Credits", "₱${e.summary.credits}", Color(0xFF2ECC71))
                                SummaryCell("Deductions", "₱${e.summary.debits}", MaterialTheme.colorScheme.error)
                                SummaryCell("Net", "₱${e.summary.net}",
                                    if (e.summary.net >= 0) Color(0xFF2ECC71) else MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }

            item {
                Text(
                    "Transactions",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (uiState.isLoading) {
                item { Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            }

            items(uiState.earnings?.transactions ?: emptyList()) { txn ->
                TransactionRow(txn)
            }

            uiState.error?.let { err ->
                item { Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

@Composable
private fun EarningsBarChart(buckets: List<DayBucket>) {
    val maxNet = buckets.maxOfOrNull { it.net.coerceAtLeast(0f) }.takeIf { it > 0f } ?: 1f
    val barGreen = Color(0xFF2ECC71)
    val barEmpty = MaterialTheme.colorScheme.surfaceVariant
    val textColor = MaterialTheme.colorScheme.onSurfaceVariant

    Column {
        // Value labels above bars
        Row(Modifier.fillMaxWidth()) {
            buckets.forEach { b ->
                Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    if (b.net > 0f) {
                        Text(
                            "₱${b.net.toInt()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = textColor,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(4.dp))

        // Bars
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp),
        ) {
            val count = buckets.size
            val slotW = size.width / count
            val barW = slotW * 0.5f

            buckets.forEachIndexed { i, b ->
                val fraction = (b.net.coerceAtLeast(0f) / maxNet).coerceIn(0f, 1f)
                val barH = (fraction * size.height).coerceAtLeast(3f)
                val cx = slotW * i + slotW / 2f
                drawRoundRect(
                    color = if (b.net > 0f) barGreen else barEmpty,
                    topLeft = Offset(cx - barW / 2f, size.height - barH),
                    size = Size(barW, barH),
                    cornerRadius = CornerRadius(4.dp.toPx()),
                )
            }
        }
        Spacer(Modifier.height(6.dp))

        // Day labels
        Row(Modifier.fillMaxWidth()) {
            buckets.forEach { b ->
                Text(
                    b.label,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelSmall,
                    color = textColor,
                )
            }
        }
    }
}

@Composable
private fun SummaryCell(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleSmall, color = color)
    }
}

@Composable
private fun TransactionRow(txn: WalletTransaction) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(txn.description, style = MaterialTheme.typography.bodyMedium)
            Text(txn.createdAt.take(10), style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            "${if (txn.amount >= 0) "+" else ""}₱${txn.amount}",
            style = MaterialTheme.typography.titleSmall,
            color = if (txn.amount >= 0) Color(0xFF2ECC71) else MaterialTheme.colorScheme.error,
        )
    }
    HorizontalDivider()
}
