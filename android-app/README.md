# RideNow PH Android App

## Setup Instructions

### 1. Prerequisites
- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 34

### 2. Configure API Keys

Create a file `local.properties` in the root of the android-app directory:

```properties
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# OneSignal Configuration
ONESIGNAL_APP_ID=your-onesignal-app-id

# Optional: Google Maps Key (if needed for fallback)
GOOGLE_MAPS_KEY=your-google-maps-key
```

### 3. Build & Run

```bash
# Sync Gradle
./gradlew sync

# Build Debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug
```

### 4. OneSignal Setup

1. Create account at https://onesignal.com
2. Add Android platform with package name: `com.broom2x.ph`
3. Copy the App ID to `local.properties`
4. Upload your Firebase FCM credentials if using FCM

### 5. Supabase Setup

Ensure you have run the database migration script from `/migration/001_initial_schema.sql` before using the app.

## Architecture

- **UI Layer**: Jetpack Compose with Material 3
- **Architecture Pattern**: MVVM with Repository pattern
- **Dependency Injection**: Hilt
- **Backend Communication**: Supabase Kotlin SDK
- **Maps**: OSMDroid (OpenStreetMap)
- **Notifications**: OneSignal

## Key Features Implemented

- Phone number authentication via Supabase
- OneSignal push notification integration
- Deep link handling for notifications
- Ride booking flow structure
- SOS emergency trigger
- Permission handling for location and notifications

## Next Steps

1. Implement Map Screen with OSMDroid
2. Add Location Tracking Service
3. Complete Ride Booking Flow
4. Implement Real-time Ride Updates
5. Add Payment Integration (GCash)
