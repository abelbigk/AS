package com.contentorganizer.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TrackingServiceModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TrackingServiceModule"

  @ReactMethod
  fun startService(token: String, apiUrl: String, role: String) {
    val enabled = role != "admin" && token.isNotBlank()
    TrackingPrefs.setConfig(reactContext, enabled, token, apiUrl)
    TrackingPrefs.setJsAlive(reactContext, System.currentTimeMillis())

    val serviceIntent = Intent(reactContext, PersistentTrackingService::class.java)
    if (!enabled) {
      try {
        reactContext.stopService(serviceIntent)
      } catch (_: Exception) {}
      return
    }

    try {
      ContextCompat.startForegroundService(reactContext, serviceIntent)
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun stopService() {
    TrackingPrefs.setConfig(reactContext, false, null, null)
    try {
      reactContext.stopService(Intent(reactContext, PersistentTrackingService::class.java))
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun pingJsAlive() {
    TrackingPrefs.setJsAlive(reactContext, System.currentTimeMillis())
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      promise.resolve(true)
      return
    }
    try {
      val pm = reactContext.getSystemService(PowerManager::class.java)
      promise.resolve(pm?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestIgnoreBatteryOptimizations() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
    try {
      val pm = reactContext.getSystemService(PowerManager::class.java)
      if (pm?.isIgnoringBatteryOptimizations(reactContext.packageName) == true) return
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${reactContext.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
    } catch (_: Exception) {}
  }
}
