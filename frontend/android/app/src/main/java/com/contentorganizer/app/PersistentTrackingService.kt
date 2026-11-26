package com.contentorganizer.app

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class PersistentTrackingService : Service() {

  private lateinit var fusedLocationClient: FusedLocationProviderClient
  private var locationCallback: LocationCallback? = null
  private var locationThread: HandlerThread? = null
  private var connectivityManager: ConnectivityManager? = null
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  private var scheduler: ScheduledExecutorService? = null
  private val networkExecutor = Executors.newSingleThreadExecutor()
  private val heartbeatInFlight = AtomicBoolean(false)
  private val flushInFlight = AtomicBoolean(false)

  @Volatile
  private var latestLocation: Location? = null
  @Volatile
  private var lastHeartbeatSentMs: Long = 0L

  override fun onCreate() {
    super.onCreate()
    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    createNotificationChannel()
    registerNetworkListener()
    startLocationUpdates()
    startHeartbeatLoop()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!TrackingPrefs.isEnabled(this)) {
      stopSelf()
      return START_NOT_STICKY
    }

    if (!hasLocationPermission()) {
      Log.w(TAG, "Missing location permission; stopping PersistentTrackingService")
      stopSelf()
      return START_NOT_STICKY
    }

    try {
      val notification = buildNotification()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (e: RuntimeException) {
      Log.w(TAG, "Could not start foreground service: ${e.message}")
      stopSelf()
      return START_NOT_STICKY
    }

    // Trigger an immediate heartbeat & flush on start if online
    networkExecutor.execute {
      sendHeartbeatIfOnline(force = true)
      flushOfflineQueue()
    }

    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    // App was swiped up from Recents: mark JS dead so native service handles everything
    TrackingPrefs.setJsAlive(this, 0L)
    if (TrackingPrefs.isEnabled(this) && hasLocationPermission()) {
      scheduleRestart(1000L)
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    try {
      locationCallback?.let { fusedLocationClient.removeLocationUpdates(it) }
    } catch (_: Exception) {}
    try {
      locationThread?.quitSafely()
    } catch (_: Exception) {}
    try {
      networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
    } catch (_: Exception) {}
    try {
      scheduler?.shutdownNow()
    } catch (_: Exception) {}
    try {
      networkExecutor.shutdownNow()
    } catch (_: Exception) {}
  }

  private fun scheduleRestart(delayMs: Long) {
    try {
      val restartIntent = Intent(applicationContext, PersistentTrackingService::class.java)
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      val pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        PendingIntent.getForegroundService(applicationContext, 2001, restartIntent, flags)
      } else {
        PendingIntent.getService(applicationContext, 2001, restartIntent, flags)
      }
      val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
      val triggerAt = SystemClock.elapsedRealtime() + delayMs
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
      } else {
        alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to schedule service restart: ${e.message}")
    }
  }

  private fun hasLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun startLocationUpdates() {
    if (!hasLocationPermission()) return

    try {
      fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
        if (loc != null && latestLocation == null) {
          latestLocation = loc
          TrackingPrefs.saveLastLocation(
            this,
            loc.latitude,
            loc.longitude,
            if (loc.hasAccuracy()) loc.accuracy else null,
            if (loc.hasSpeed()) loc.speed else null,
            if (loc.hasBearing()) loc.bearing else null,
            if (loc.hasAltitude()) loc.altitude else null
          )
        }
      }
    } catch (_: SecurityException) {}

    val thread = HandlerThread("PersistentLocationThread").apply { start() }
    locationThread = thread
    val looper: Looper = thread.looper

    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2000L)
      .setMinUpdateIntervalMillis(1000L)
      .setMinUpdateDistanceMeters(0f)
      .setMaxUpdateDelayMillis(0L)
      .build()

    val callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val loc = result.lastLocation ?: return
        latestLocation = loc
        TrackingPrefs.saveLastLocation(
          this@PersistentTrackingService,
          loc.latitude,
          loc.longitude,
          if (loc.hasAccuracy()) loc.accuracy else null,
          if (loc.hasSpeed()) loc.speed else null,
          if (loc.hasBearing()) loc.bearing else null,
          if (loc.hasAltitude()) loc.altitude else null
        )

        // When JS is closed/dead (app swiped away or after reboot), handle both liveHeartbeat and waypoint recording natively
        if (!TrackingPrefs.isJsAlive(this@PersistentTrackingService)) {
          val ageMs = System.currentTimeMillis() - loc.time
          networkExecutor.execute {
            sendHeartbeatIfOnline(force = false)
            if (ageMs <= 15_000L) {
              handleNativeWaypointRecording(loc)
            }
          }
        }
      }
    }
    locationCallback = callback

    try {
      fusedLocationClient.requestLocationUpdates(request, callback, looper)
    } catch (e: SecurityException) {
      Log.w(TAG, "requestLocationUpdates rejected: ${e.message}")
    }
  }

  private fun startHeartbeatLoop() {
    val exec = Executors.newSingleThreadScheduledExecutor()
    scheduler = exec
    exec.scheduleAtFixedRate({
      try {
        if (!TrackingPrefs.isEnabled(this)) {
          stopSelf()
          return@scheduleAtFixedRate
        }
        // Only send from native loop when JS is not actively pinging
        if (!TrackingPrefs.isJsAlive(this)) {
          sendHeartbeatIfOnline(force = false)
          flushOfflineQueue()
        }
      } catch (e: Exception) {
        Log.w(TAG, "Heartbeat loop error: ${e.message}")
      }
    }, 5, 5, TimeUnit.SECONDS)
  }

  private fun registerNetworkListener() {
    val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
    connectivityManager = cm
    val cb = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) {
        networkExecutor.execute {
          sendHeartbeatIfOnline(force = true)
          flushOfflineQueue()
        }
      }

      override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
        val hasInternet = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        val validated = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } else {
          true
        }
        if (hasInternet && validated) {
          networkExecutor.execute {
            sendHeartbeatIfOnline(force = false)
            flushOfflineQueue()
          }
        }
      }
    }
    networkCallback = cb
    try {
      cm.registerDefaultNetworkCallback(cb)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to register network callback: ${e.message}")
    }
  }

  private fun isNetworkAvailable(): Boolean {
    val cm = connectivityManager ?: (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
      ?: return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val network = cm.activeNetwork ?: return false
      val caps = cm.getNetworkCapabilities(network) ?: return false
      return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
    @Suppress("DEPRECATION")
    return cm.activeNetworkInfo?.isConnected == true
  }

  private fun isSystemLocationEnabled(): Boolean {
    val lm = getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return false
    return try {
      LocationManagerCompat.isLocationEnabled(lm)
    } catch (_: Exception) {
      false
    }
  }

  private fun sendHeartbeatIfOnline(force: Boolean) {
    if (!TrackingPrefs.isEnabled(this)) return
    if (!isNetworkAvailable()) return
    val now = System.currentTimeMillis()
    if (!force && now - lastHeartbeatSentMs < 4000L) return
    if (!heartbeatInFlight.compareAndSet(false, true)) return

    try {
      val token = TrackingPrefs.getToken(this) ?: return
      val apiUrl = TrackingPrefs.getApiUrl(this)

      val loc = latestLocation
      val saved = if (loc == null) TrackingPrefs.getLastLocation(this) else null
      val lat = loc?.latitude ?: saved?.latitude ?: return
      val lng = loc?.longitude ?: saved?.longitude ?: return
      val acc = loc?.let { if (it.hasAccuracy()) it.accuracy.toDouble() else null } ?: saved?.accuracy
      val speed = loc?.let { if (it.hasSpeed()) it.speed.toDouble() else null } ?: saved?.speed
      val heading = loc?.let { if (it.hasBearing()) it.bearing.toDouble() else null } ?: saved?.heading

      val json = JSONObject().apply {
        put("latitude", lat)
        put("longitude", lng)
        put("accuracy", acc ?: JSONObject.NULL)
        put("speed", speed ?: JSONObject.NULL)
        put("heading", heading ?: JSONObject.NULL)
        put("timestamp", TrackingPrefs.formatNairobiTimestamp(now))
        put("locationEnabled", isSystemLocationEnabled())
      }

      val ok = postTrpcMutation(apiUrl, token, "tracking.liveHeartbeat", json)
      if (ok) {
        lastHeartbeatSentMs = System.currentTimeMillis()
      }
    } finally {
      heartbeatInFlight.set(false)
    }
  }

  private fun handleNativeWaypointRecording(loc: Location) {
    val acc = if (loc.hasAccuracy()) loc.accuracy else null
    if (acc != null && acc > 30f) return
    if (!TrackingPrefs.shouldRecordWaypoint(this, loc.latitude, loc.longitude)) return

    val payload = JSONObject().apply {
      put("latitude", loc.latitude)
      put("longitude", loc.longitude)
      put("accuracy", if (loc.hasAccuracy()) loc.accuracy.toDouble() else JSONObject.NULL)
      put("speed", if (loc.hasSpeed()) loc.speed.toDouble() else JSONObject.NULL)
      put("heading", if (loc.hasBearing()) loc.bearing.toDouble() else JSONObject.NULL)
      put("altitude", if (loc.hasAltitude()) loc.altitude else JSONObject.NULL)
      put("timestamp", TrackingPrefs.formatNairobiTimestamp(loc.time))
    }

    val token = TrackingPrefs.getToken(this) ?: return
    val apiUrl = TrackingPrefs.getApiUrl(this)

    if (!isNetworkAvailable() || !postTrpcMutation(apiUrl, token, "tracking.ping", payload)) {
      TrackingPrefs.enqueueOfflinePing(this, payload)
    }
  }

  private fun flushOfflineQueue() {
    if (!isNetworkAvailable()) return
    if (!flushInFlight.compareAndSet(false, true)) return
    try {
      val token = TrackingPrefs.getToken(this) ?: return
      val apiUrl = TrackingPrefs.getApiUrl(this)
      val queue = TrackingPrefs.getOfflineQueue(this)
      if (queue.length() == 0) return

      val remaining = JSONArray()
      var failed = false
      for (i in 0 until queue.length()) {
        val item = queue.optJSONObject(i) ?: continue
        if (failed) {
          remaining.put(item)
          continue
        }
        val ok = postTrpcMutation(apiUrl, token, "tracking.ping", item)
        if (!ok) {
          failed = true
          remaining.put(item)
        }
      }
      TrackingPrefs.setOfflineQueue(this, remaining)
    } finally {
      flushInFlight.set(false)
    }
  }

  private fun postTrpcMutation(
    baseUrl: String,
    token: String,
    procedure: String,
    payload: JSONObject
  ): Boolean {
    var conn: HttpURLConnection? = null
    return try {
      val cleanBase = baseUrl.trimEnd('/')
      val url = URL("$cleanBase/api/trpc/$procedure?batch=1")
      conn = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 4000
        readTimeout = 5000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Authorization", "Bearer $token")
      }
      val body = JSONObject().apply {
        put("0", JSONObject().apply { put("json", payload) })
      }
      OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
        writer.write(body.toString())
        writer.flush()
      }
      val code = conn.responseCode
      code in 200..299
    } catch (_: Exception) {
      false
    } finally {
      conn?.disconnect()
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          "Location Streaming",
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Keeps live location streaming active in the background"
          setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
      }
    }
  }

  private fun buildNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(this, 0, it, pendingFlags)
    }

    val smallIcon = resources.getIdentifier("notification_icon", "drawable", packageName)
      .takeIf { it != 0 } ?: applicationInfo.icon

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Plan for tomorrow")
      .setContentText("Start your adventure by saving experience")
      .setSmallIcon(smallIcon)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .apply {
        if (contentIntent != null) setContentIntent(contentIntent)
      }
      .build()
  }

  companion object {
    private const val TAG = "PersistentTrackingSvc"
    private const val CHANNEL_ID = "persistent_tracking_channel"
    private const val NOTIFICATION_ID = 481799
  }
}
