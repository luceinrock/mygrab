package com.ridenow.rider.data.geocoding

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import javax.inject.Inject
import javax.inject.Singleton

data class GeocodingResult(
    val lat: Double,
    val lng: Double,
    val displayName: String,
)

@Singleton
class NominatimService @Inject constructor() {

    private val client = OkHttpClient()
    private val gson = Gson()

    suspend fun search(query: String): List<GeocodingResult> = withContext(Dispatchers.IO) {
        if (query.length < 3) return@withContext emptyList()
        try {
            val encoded = java.net.URLEncoder.encode(query, "UTF-8")
            val url = "https://nominatim.openstreetmap.org/search?q=$encoded&format=json&limit=5&countrycodes=ph"
            val request = Request.Builder().url(url).header("User-Agent", "RideNow/1.0").build()
            val body = client.newCall(request).execute().body?.string() ?: return@withContext emptyList()
            val type = object : TypeToken<List<NominatimResult>>() {}.type
            val results: List<NominatimResult> = gson.fromJson(body, type)
            results.map { GeocodingResult(it.lat.toDouble(), it.lon.toDouble(), it.displayName) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun reverse(lat: Double, lng: Double): String? = withContext(Dispatchers.IO) {
        try {
            val url = "https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lng&format=json"
            val request = Request.Builder().url(url).header("User-Agent", "RideNow/1.0").build()
            val body = client.newCall(request).execute().body?.string() ?: return@withContext null
            gson.fromJson(body, JsonObject::class.java)?.get("display_name")?.asString
        } catch (_: Exception) {
            null
        }
    }

    private data class NominatimResult(
        val lat: String,
        val lon: String,
        @SerializedName("display_name") val displayName: String,
    )
}
