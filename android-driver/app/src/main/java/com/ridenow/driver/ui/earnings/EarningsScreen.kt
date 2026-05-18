package com.ridenow.driver.ui.earnings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
                            Divider()
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

            item { Text("Transactions", style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant) }

            if (uiState.isLoading) {
                item { Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            }

            items(uiState.earnings?.transactions ?: emptyList()) { txn ->
                TransactionRow(txn)
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
