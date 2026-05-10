# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts

# Keep Supabase classes
-keep class io.github.jan_tenntert.supabase.** { *; }

# Keep Ktor classes
-keep class io.ktor.** { *; }

# Keep OSMDroid classes
-keep class org.osmdroid.** { *; }

# Keep OneSignal classes
-keep class com.onesignal.** { *; }

# Keep Hilt generated classes
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }

# Keep data classes for serialization
-keepclassmembers class com.broom2x.ph.data.model.** { *; }

# Standard Android optimizations
-dontwarn android.support.**
-dontwarn androidx.**
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
