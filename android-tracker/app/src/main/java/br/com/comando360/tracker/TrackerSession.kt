package br.com.comando360.tracker

import org.json.JSONObject

data class TrackerSession(
    var accessToken: String,
    var refreshToken: String,
    var expiresAtEpochSec: Long,
    val deviceId: String,
    val companyId: String,
    val teamId: String,
    val deviceName: String
) {
    fun toJson(): JSONObject = JSONObject()
        .put("access_token", accessToken)
        .put("refresh_token", refreshToken)
        .put("expires_at", expiresAtEpochSec)
        .put("device_id", deviceId)
        .put("company_id", companyId)
        .put("team_id", teamId)
        .put("device_name", deviceName)

    companion object {
        fun fromJson(j: JSONObject) = TrackerSession(
            accessToken = j.getString("access_token"),
            refreshToken = j.getString("refresh_token"),
            expiresAtEpochSec = j.optLong("expires_at", 0L),
            deviceId = j.getString("device_id"),
            companyId = j.getString("company_id"),
            teamId = j.optString("team_id", ""),
            deviceName = j.optString("device_name", "Celular da equipe")
        )
    }
}
