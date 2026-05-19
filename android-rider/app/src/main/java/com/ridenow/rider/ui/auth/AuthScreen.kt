package com.ridenow.rider.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun AuthScreen(
    onAuthenticated: () -> Unit,
    vm: AuthViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()

    var isSignUp by remember { mutableStateOf(false) }

    // Shared fields
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    // Sign-up only fields
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var signUpError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(state) {
        if (state is AuthState.Authenticated) onAuthenticated()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("MyGrab", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(4.dp))
        Text(
            "Book your ride",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(32.dp))

        // Sign In / Sign Up toggle
        Row(modifier = Modifier.fillMaxWidth()) {
            listOf("Sign In", "Sign Up").forEachIndexed { i, label ->
                val selected = (i == 0) != isSignUp
                OutlinedButton(
                    onClick = {
                        isSignUp = (i == 1)
                        vm.resetToIdle()
                        signUpError = null
                    },
                    modifier = Modifier.weight(1f),
                    colors = if (selected) ButtonDefaults.outlinedButtonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ) else ButtonDefaults.outlinedButtonColors(),
                ) { Text(label) }
                if (i == 0) Spacer(Modifier.width(8.dp))
            }
        }
        Spacer(Modifier.height(24.dp))

        if (!isSignUp) {
            // ── Sign In ──────────────────────────────────
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; vm.resetToIdle() },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; vm.resetToIdle() },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = { vm.signIn(email.trim(), password) },
                enabled = email.isNotBlank() && password.isNotBlank() && state !is AuthState.Loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state is AuthState.Loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Sign In")
            }
            if (state is AuthState.Error) {
                Spacer(Modifier.height(12.dp))
                Text(
                    (state as AuthState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        } else {
            // ── Sign Up ──────────────────────────────────
            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it; signUpError = null },
                label = { Text("Full Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; signUpError = null },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone (optional)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; signUpError = null },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it; signUpError = null },
                label = { Text("Confirm Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    signUpError = when {
                        fullName.isBlank() -> "Full name is required."
                        email.isBlank() -> "Email is required."
                        password.length < 6 -> "Password must be at least 6 characters."
                        password != confirmPassword -> "Passwords do not match."
                        else -> null
                    }
                    if (signUpError == null) {
                        vm.signUp(email.trim(), password, fullName.trim(), phone.trim())
                    }
                },
                enabled = state !is AuthState.Loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state is AuthState.Loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Create Account")
            }
            val errorMsg = signUpError ?: (state as? AuthState.Error)?.message
            if (errorMsg != null) {
                Spacer(Modifier.height(12.dp))
                Text(errorMsg, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
