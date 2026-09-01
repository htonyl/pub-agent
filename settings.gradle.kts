pluginManagement {
    repositories {
        google()
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "pub-agent"

include(":packages:kotlin:counter-contract")
include(":packages:kotlin:design-contract")
include(":packages:kotlin:design-catalog")
include(":packages:kotlin:design-catalog-android")
