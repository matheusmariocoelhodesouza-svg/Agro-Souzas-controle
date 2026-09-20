package br.com.comando360.tracker

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object TrackerApi {
    const val VERSION = "1.0.3"
    private const val BASE_URL = "https://aycbrqziusxtxhsdfqjk.supabase.co"
    private const val API_KEY = "sb_publishable_OGJX3NBA__JxoyjB3IZNvQ_0nNwh_Xc"
    private val JSON = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()

    fun activate(context: Context, code: String, deviceName: String): TrackerSession {
        val body = JSONObject()
            .put("code", code.trim().uppercase())
            .put("device_name", deviceName)
            .put("native_version", VERSION)
        val request = Request.Builder()
            .url("$BASE_URL/functions/v1/comando360-native-tracker-activate")
            .header("apikey", API_KEY)
            .post(body.toString().toRequestBody(JSON))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            val parsed = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
            if (!response.isSuccessful) throw IllegalStateException(parsed.optString("error", "Falha ao ativar rastreador"))
            val s = parsed.getJSONObject("session")
            val d = parsed.getJSONObject("device")
            val session = TrackerSession(
                accessToken = s.getString("access_token"),
                refreshToken = s.getString("refresh_token"),
                expiresAtEpochSec = s.optLong("expires_at", 0L),
                deviceId = d.getString("id"),
                companyId = d.getString("company_id"),
                teamId = d.optString("team_id", ""),
                deviceName = d.optString("device_name", deviceName)
            )
            LocationQueue.clear(context)
            SessionStore.save(context, session)
            return session
        }
    }

    private fun revokeLocal(context: Context) {
        SessionStore.clear(context)
        LocationQueue.clear(context)
    }

    private fun isRevokedStatus(code: Int): Boolean = code == 401 || code == 403

    @Synchronized
    private fun validSession(context: Context): TrackerSession? {
        val s = SessionStore.load(context) ?: return null
        val now = System.currentTimeMillis() / 1000L
        if (s.expiresAtEpochSec == 0L || s.expiresAtEpochSec > now + 120L) return s

        val body = JSONObject().put("refresh_token", s.refreshToken)
        val request = Request.Builder()
            .url("$BASE_URL/auth/v1/token?grant_type=refresh_token")
            .header("apikey", API_KEY)
            .post(body.toString().toRequestBody(JSON))
            .build()
        return runCatching {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    if (response.code == 400 || isRevokedStatus(response.code)) revokeLocal(context)
                    return@use null
                }
                val j = JSONObject(response.body?.string().orEmpty())
                s.accessToken = j.getString("access_token")
                s.refreshToken = j.optString("refresh_token", s.refreshToken)
                s.expiresAtEpochSec = j.optLong("expires_at", now + j.optLong("expires_in", 3600L))
                SessionStore.save(context, s)
                s
            }
        }.getOrNull()
    }

    fun enqueueAndFlush(context: Context, point: LocationPoint) {
        if (SessionStore.load(context) == null) return
        LocationQueue.enqueue(context, point)
        flush(context)
    }

    fun flush(context: Context) {
        var session = validSession(context) ?: return
        while (true) {
            val point = LocationQueue.snapshot(context).firstOrNull() ?: break
            if (!sendPoint(context, session, point)) {
                if (SessionStore.load(context) == null) break
                session = validSession(context) ?: break
                if (!sendPoint(context, session, point)) break
            }
            LocationQueue.removeFirst(context)
        }
    }

    private fun sendPoint(context: Context, session: TrackerSession, point: LocationPoint): Boolean {
        val battery = battery(context)
        val payload = JSONObject()
            .put("company_id", session.companyId)
            .put("team_id", session.teamId.ifBlank { JSONObject.NULL })
            .put("device_access_id", session.deviceId)
            .put("latitude", point.latitude)
            .put("longitude", point.longitude)
            .put("accuracy_m", point.accuracyM ?: JSONObject.NULL)
            .put("speed_kmh", point.speedKmh ?: JSONObject.NULL)
            .put("heading_deg", point.headingDeg ?: JSONObject.NULL)
            .put("battery_percent", battery.first ?: JSONObject.NULL)
            .put("charging", battery.second ?: JSONObject.NULL)
            .put("recorded_at", point.recordedAt)

        val current = JSONObject(payload.toString()).put("updated_at", java.time.Instant.now().toString())
        val currentStatus = postRest(
            "$BASE_URL/rest/v1/v2_device_location_current?on_conflict=device_access_id",
            current,
            session.accessToken,
            "resolution=merge-duplicates,return=minimal"
        )
        if (isRevokedStatus(currentStatus)) {
            revokeLocal(context)
            return false
        }
        if (currentStatus !in 200..299) return false

        val historyStatus = postRest(
            "$BASE_URL/rest/v1/v2_device_location_history",
            payload,
            session.accessToken,
            "return=minimal"
        )
        if (isRevokedStatus(historyStatus)) {
            revokeLocal(context)
            return false
        }
        return historyStatus in 200..299
    }

    fun heartbeat(context: Context, serviceRunning: Boolean) {
        val session = validSession(context) ?: return
        val body = JSONObject()
            .put("p_native_version", VERSION)
            .put("p_background_permission", DeviceOwnerHelper.hasBackgroundLocation(context))
            .put("p_service_running", serviceRunning)
            .put("p_device_owner", DeviceOwnerHelper.isDeviceOwner(context))
        val status = postRest(
            "$BASE_URL/rest/v1/rpc/v2_native_tracker_heartbeat",
            body,
            session.accessToken,
            "return=minimal"
        )
        if (isRevokedStatus(status)) revokeLocal(context)
    }

    private fun postRest(url: String, body: JSONObject, token: String, prefer: String): Int {
        val request = Request.Builder()
            .url(url)
            .header("apikey", API_KEY)
            .header("Authorization", "Bearer $token")
            .header("Prefer", prefer)
            .post(body.toString().toRequestBody(JSON))
            .build()
        return runCatching {
            client.newCall(request).execute().use { it.code }
        }.getOrDefault(0)
    }

    private fun battery(context: Context): Pair<Int?, Boolean?> {
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return null to null
        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        val percent = if (level >= 0 && scale > 0) ((level * 100f) / scale).toInt().coerceIn(0, 100) else null
        val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val charging = if (status >= 0) status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL else null
        return percent to charging
    }
}
