plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.comando360.oficina"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.comando360.oficina"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
    }

    signingConfigs {
        create("c360Release") {
            val keystorePath = System.getenv("C360_KEYSTORE_PATH")
            if (!keystorePath.isNullOrBlank()) storeFile = file(keystorePath)
            storePassword = System.getenv("C360_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("C360_KEY_ALIAS") ?: "comando360"
            keyPassword = System.getenv("C360_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("c360Release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}