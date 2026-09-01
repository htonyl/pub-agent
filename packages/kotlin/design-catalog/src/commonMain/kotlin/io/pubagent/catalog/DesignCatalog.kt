package io.pubagent.catalog

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import io.pubagent.design.DesignTokens

@Composable
fun DesignCatalog() {
    val primary = remember { Color(DesignTokens.light_action_primary.removePrefix("#").toLong(16) or 0xFF000000) }
    val surface = remember { Color(DesignTokens.light_surface_base.removePrefix("#").toLong(16) or 0xFF000000) }
    Column(
        modifier = Modifier.fillMaxSize().background(surface).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Pub Agent design catalog", style = MaterialTheme.typography.headlineMedium)
        Text("Canonical Button and TextField states", style = MaterialTheme.typography.bodyLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = {}, modifier = Modifier.heightIn(min = 44.dp), colors = ButtonDefaults.buttonColors(containerColor = primary), shape = RoundedCornerShape(10.dp)) { Text("Primary") }
            Button(onClick = {}, enabled = false, modifier = Modifier.heightIn(min = 44.dp)) { Text("Disabled") }
        }
        OutlinedTextField(value = "", onValueChange = {}, modifier = Modifier.fillMaxWidth(), label = { Text("Label") }, supportingText = { Text("Visible label and supporting text") })
        OutlinedTextField(value = "", onValueChange = {}, isError = true, modifier = Modifier.fillMaxWidth(), label = { Text("Error state") }, supportingText = { Text("Correct this value") })
    }
}
