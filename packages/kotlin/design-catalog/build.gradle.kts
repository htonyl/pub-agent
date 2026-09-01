plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

kotlin {
    androidTarget {
        compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
    }
    jvm {
        compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
    }
    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(project(":packages:kotlin:design-contract"))
        }
        jvmMain.dependencies { implementation(compose.desktop.currentOs) }
    }
}

android {
    namespace = "io.pubagent.catalog"
    compileSdk = 35
    defaultConfig { minSdk = 24 }
}

compose.desktop {
    application { mainClass = "io.pubagent.catalog.MainKt" }
}
