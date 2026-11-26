package com.contentorganizer.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object TrackingPrefs {
  private const val PREFS_NAME = "tracking_config"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_TOKEN = "auth_token"
  private const val KEY_API_URL = "api_url"
  private const val KEY_JS_ALIVE_MS = "js_alive_ms"
  private const val KEY_LAST_LAT = "last_lat"
  private const val KEY_LAST_LNG = "last_lng"
  private const val KEY_LAST_ACC = "last_acc"
  private const val KEY_LAST_SPEED = "last_speed"
  private const val KEY_LAST_HEADING = "last_heading"
  private const val KEY_LAST_ALT = "last_alt"
  private const val KEY_LAST_REC_LAT = "last_rec_lat"
  private const val KEY_LAST_REC_LNG = "last_rec_lng"
  private const val KEY_STATIONARY_SINCE = "stationary_since"
  private const val KEY_HAS_REC_STATIONARY = "has_rec_stationary"
  private const val KEY_OFFLINE_QUEUE = "native_offline_queue"

  private fun prefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun setConfig(context: Context, enabled: Boolean, token: String?, apiUrl: String?) {
    prefs(context).edit().apply {
      putBoolean(KEY_ENABLED, enabled)
      if (token != null) putString(KEY_TOKEN, token) else remove(KEY_TOKEN)
      if (apiUrl != null) putString(KEY_API_URL, apiUrl)
      apply()
    }
  }

  fun isEnabled(context: Context): Boolean {
    val p = prefs(context)
    return p.getBoolean(KEY_ENABLED, false) && !p.getString(KEY_TOKEN, null).isNullOrBlank()
  }

  fun getToken(context: Context): String? = prefs(context).getString(KEY_TOKEN, null)

  fun getApiUrl(context: Context): String {
    return prefs(context).getString(KEY_API_URL, null) ?: "https://as-wryo.onrender.com"
  }

  fun setJsAlive(context: Context, timeMs: Long) {
    prefs(context).edit().putLong(KEY_JS_ALIVE_MS, timeMs).apply()
  }

  fun isJsAlive(context: Context): Boolean {
    val last = prefs(context).getLong(KEY_JS_ALIVE_MS, 0L)
    return System.currentTimeMillis() - last < 10_000L
  }

  fun saveLastLocation(
    context: Context,
    lat: Double,
    lng: Double,
    acc: Float?,
    speed: Float?,
    heading: Float?,
    alt: Double?
  ) {
    prefs(context).edit().apply {
      putString(KEY_LAST_LAT, lat.toString())
      putString(KEY_LAST_LNG, lng.toString())
      if (acc != null) putFloat(KEY_LAST_ACC, acc) else remove(KEY_LAST_ACC)
      if (speed != null) putFloat(KEY_LAST_SPEED, speed) else remove(KEY_LAST_SPEED)
      if (heading != null) putFloat(KEY_LAST_HEADING, heading) else remove(KEY_LAST_HEADING)
      if (alt != null) putString(KEY_LAST_ALT, alt.toString()) else remove(KEY_LAST_ALT)
      apply()
    }
  }

  data class SavedCoord(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double?,
    val speed: Double?,
    val heading: Double?,
    val altitude: Double?
  )

  fun getLastLocation(context: Context): SavedCoord? {
    val p = prefs(context)
    val latStr = p.getString(KEY_LAST_LAT, null) ?: return null
    val lngStr = p.getString(KEY_LAST_LNG, null) ?: return null
    val lat = latStr.toDoubleOrNull() ?: return null
    val lng = lngStr.toDoubleOrNull() ?: return null
    return SavedCoord(
      latitude = lat,
      longitude = lng,
      accuracy = if (p.contains(KEY_LAST_ACC)) p.getFloat(KEY_LAST_ACC, 0f).toDouble() else null,
      speed = if (p.contains(KEY_LAST_SPEED)) p.getFloat(KEY_LAST_SPEED, 0f).toDouble() else null,
      heading = if (p.contains(KEY_LAST_HEADING)) p.getFloat(KEY_LAST_HEADING, 0f).toDouble() else null,
      altitude = p.getString(KEY_LAST_ALT, null)?.toDoubleOrNull()
    )
  }

  fun shouldRecordWaypoint(context: Context, lat: Double, lng: Double): Boolean {
    val p = prefs(context)
    val now = System.currentTimeMillis()
    val lastRecLat = p.getString(KEY_LAST_REC_LAT, null)?.toDoubleOrNull()
    val lastRecLng = p.getString(KEY_LAST_REC_LNG, null)?.toDoubleOrNull()

    if (lastRecLat == null || lastRecLng == null) {
      p.edit()
        .putString(KEY_LAST_REC_LAT, lat.toString())
        .putString(KEY_LAST_REC_LNG, lng.toString())
        .putLong(KEY_STATIONARY_SINCE, now)
        .putBoolean(KEY_HAS_REC_STATIONARY, false)
        .apply()
      return true
    }

    val results = FloatArray(1)
    android.location.Location.distanceBetween(lastRecLat, lastRecLng, lat, lng, results)
    val dist = results[0].toDouble()

    if (dist >= 15.0) {
      p.edit()
        .putString(KEY_LAST_REC_LAT, lat.toString())
        .putString(KEY_LAST_REC_LNG, lng.toString())
        .putLong(KEY_STATIONARY_SINCE, now)
        .putBoolean(KEY_HAS_REC_STATIONARY, false)
        .apply()
      return true
    }

    val stationarySince = p.getLong(KEY_STATIONARY_SINCE, now)
    val hasRecStationary = p.getBoolean(KEY_HAS_REC_STATIONARY, false)
    if (now - stationarySince >= 60_000L && !hasRecStationary) {
      p.edit()
        .putString(KEY_LAST_REC_LAT, lat.toString())
        .putString(KEY_LAST_REC_LNG, lng.toString())
        .putBoolean(KEY_HAS_REC_STATIONARY, true)
        .apply()
      return true
    }
    return false
  }

  @Synchronized
  fun enqueueOfflinePing(context: Context, payload: JSONObject) {
    val p = prefs(context)
    val arr = try {
      JSONArray(p.getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]")
    } catch (_: Exception) {
      JSONArray()
    }
    arr.put(payload)
    // Cap at 1000 items to keep SharedPreferences fast
    val trimmed = if (arr.length() > 1000) {
      val next = JSONArray()
      for (i in (arr.length() - 1000) until arr.length()) {
        next.put(arr.get(i))
      }
      next
    } else {
      arr
    }
    p.edit().putString(KEY_OFFLINE_QUEUE, trimmed.toString()).apply()
  }

  @Synchronized
  fun getOfflineQueue(context: Context): JSONArray {
    val raw = prefs(context).getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }
  }

  @Synchronized
  fun setOfflineQueue(context: Context, arr: JSONArray) {
    prefs(context).edit().putString(KEY_OFFLINE_QUEUE, arr.toString()).apply()
  }

  fun formatNairobiTimestamp(epochMs: Long = System.currentTimeMillis()): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'+03:00'", Locale.US)
    sdf.timeZone = TimeZone.getTimeZone("GMT+3")
    return sdf.format(Date(epochMs))
  }
}
