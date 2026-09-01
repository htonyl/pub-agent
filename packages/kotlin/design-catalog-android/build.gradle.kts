plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

android {
    namespace = "io.pubagent.catalog.android"
    compileSdk = 35
    defaultConfig {
        applicationId = "io.pubagent.catalog.android"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }
    buildFeatures { compose = true }
}

dependencies {
    implementation(project(":packages:kotlin:design-catalog"))
    implementation(libs.androidx.activity.compose)
}
