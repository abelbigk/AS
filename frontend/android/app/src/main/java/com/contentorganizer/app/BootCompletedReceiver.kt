package com.contentorganizer.app

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat

class BootCompletedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (
      action != Intent.ACTION_BOOT_COMPLETED &&
      action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      action != "android.intent.action.QUICKBOOT_POWERON" &&
      action != "com.htc.intent.action.QUICKBOOT_POWERON"
    ) {
      return
    }

    if (!TrackingPrefs.isEnabled(context)) {
      return
    }

    val hasPermission =
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED

    if (!hasPermission) {
      Log.w(TAG, "Skipping boot start: location permission not granted")
      return
    }

    // Mark JS as dead on boot so native service handles liveHeartbeat and waypoint recording immediately
    TrackingPrefs.setJsAlive(context, 0L)

    try {
      val serviceIntent = Intent(context, PersistentTrackingService::class.java)
      ContextCompat.startForegroundService(context, serviceIntent)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to start PersistentTrackingService on boot: ${e.message}")
    }
  }

  companion object {
    private const val TAG = "BootCompletedReceiver"
  }
}
