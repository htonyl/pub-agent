plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.multiplatform)
}

kotlin {
    androidTarget {
        compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
    }
    jvm {
        compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
    }
}

android {
    namespace = "io.pubagent.design"
    compileSdk = 35
    defaultConfig { minSdk = 24 }
}
