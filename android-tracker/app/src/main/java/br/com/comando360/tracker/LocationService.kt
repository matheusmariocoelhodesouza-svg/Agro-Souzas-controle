package br.com.comando360.tracker

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.util.concurrent.Executors

class LocationService : Service() {
    private lateinit var fused: FusedLocationProviderClient
    private val executor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private var tracking = false

    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.locations.forEach { location ->
                val point = LocationPoint.fromLocation(location)
                executor.execute { TrackerApi.enqueueAndFlush(applicationContext, point) }
            }
        }
    }

    private val heartbeat = object : Runnable {
        override fun run() {
            executor.execute { TrackerApi.heartbeat(applicationContext, true) }
            handler.postDelayed(this, 5 * 60_000L)
        }
    }

    override fun onCreate() {
        super.onCreate()
        fused = LocationServices.getFusedLocationProviderClient(this)
        createChannel()
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(3601, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(3601, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        DeviceOwnerHelper.applyCorporatePolicy(this)
        if (!hasLocationPermission()) {
            executor.execute { TrackerApi.heartbeat(applicationContext, false) }
            stopSelf()
            return START_NOT_STICKY
        }
        startTracking()
        handler.removeCallbacks(heartbeat)
        handler.post(heartbeat)
        executor.execute { TrackerApi.flush(applicationContext) }
        return START_STICKY
    }

    private fun startTracking() {
        if (tracking) return
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60_000L)
            .setMinUpdateIntervalMillis(30_000L)
            .setMinUpdateDistanceMeters(20f)
            .setWaitForAccurateLocation(false)
            .build()
        try {
            fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
            tracking = true
        } catch (_: SecurityException) {
            stopSelf()
        }
    }

    private fun hasLocationPermission(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "c360_tracking",
                "Rastreamento da equipe",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mantém a localização do celular corporativo disponível no Comando 360."
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val open = Intent(this, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            this, 0, open,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return Notification.Builder(this, "c360_tracking")
            .setSmallIcon(br.com.comando360.tracker.R.drawable.ic_location)
            .setContentTitle("Comando 360 • Rastreamento ativo")
            .setContentText("Localização do celular da equipe sendo atualizada.")
            .setContentIntent(pending)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    override fun onDestroy() {
        if (tracking) fused.removeLocationUpdates(callback)
        tracking = false
        handler.removeCallbacks(heartbeat)
        executor.execute { TrackerApi.heartbeat(applicationContext, false) }
        executor.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
