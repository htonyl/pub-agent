package io.pubagent.catalog

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "Pub Agent design catalog") {
        MaterialTheme { DesignCatalog() }
    }
}
