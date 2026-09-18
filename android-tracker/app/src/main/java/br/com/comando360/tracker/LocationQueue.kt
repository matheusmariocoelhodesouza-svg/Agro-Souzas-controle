package br.com.comando360.tracker

import android.content.Context
import android.location.Location
import org.json.JSONArray
import org.json.JSONObject

data class LocationPoint(
    val latitude: Double,
    val longitude: Double,
    val accuracyM: Double?,
    val speedKmh: Double?,
    val headingDeg: Double?,
    val recordedAt: String
) {
    fun toJson(): JSONObject = JSONObject()
        .put("latitude", latitude)
        .put("longitude", longitude)
        .put("accuracy_m", accuracyM ?: JSONObject.NULL)
        .put("speed_kmh", speedKmh ?: JSONObject.NULL)
        .put("heading_deg", headingDeg ?: JSONObject.NULL)
        .put("recorded_at", recordedAt)

    companion object {
        fun fromLocation(location: Location): LocationPoint = LocationPoint(
            latitude = location.latitude,
            longitude = location.longitude,
            accuracyM = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
            speedKmh = if (location.hasSpeed()) (location.speed * 3.6).coerceAtLeast(0.0) else null,
            headingDeg = if (location.hasBearing()) location.bearing.toDouble() else null,
            recordedAt = java.time.Instant.ofEpochMilli(
                if (location.time > 0) location.time else System.currentTimeMillis()
            ).toString()
        )

        fun fromJson(j: JSONObject) = LocationPoint(
            latitude = j.getDouble("latitude"),
            longitude = j.getDouble("longitude"),
            accuracyM = if (j.isNull("accuracy_m")) null else j.getDouble("accuracy_m"),
            speedKmh = if (j.isNull("speed_kmh")) null else j.getDouble("speed_kmh"),
            headingDeg = if (j.isNull("heading_deg")) null else j.getDouble("heading_deg"),
            recordedAt = j.getString("recorded_at")
        )
    }
}

object LocationQueue {
    private const val PREFS = "c360_tracker_queue"
    private const val KEY = "pending_locations"
    private const val MAX = 200

    @Synchronized
    fun enqueue(context: Context, point: LocationPoint) {
        val arr = read(context)
        arr.put(point.toJson())
        while (arr.length() > MAX) {
            val trimmed = JSONArray()
            for (i in 1 until arr.length()) trimmed.put(arr.getJSONObject(i))
            write(context, trimmed)
            return
        }
        write(context, arr)
    }

    @Synchronized
    fun snapshot(context: Context): List<LocationPoint> {
        val arr = read(context)
        return (0 until arr.length()).mapNotNull { i ->
            runCatching { LocationPoint.fromJson(arr.getJSONObject(i)) }.getOrNull()
        }
    }

    @Synchronized
    fun removeFirst(context: Context) {
        val arr = read(context)
        if (arr.length() == 0) return
        val next = JSONArray()
        for (i in 1 until arr.length()) next.put(arr.getJSONObject(i))
        write(context, next)
    }

    private fun read(context: Context): JSONArray {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]") ?: "[]"
        return runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
    }

    private fun write(context: Context, arr: JSONArray) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, arr.toString()).apply()
    }
}
