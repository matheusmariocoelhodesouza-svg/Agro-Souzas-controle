package br.com.comando360.tracker

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock

object TrackerWatchdog {
    const val ACTION = "br.com.comando360.tracker.WATCHDOG"
    private const val REQUEST_CODE = 3603
    private const val INTERVAL_MS = 10 * 60_000L

    fun schedule(context: Context, delayMillis: Long = INTERVAL_MS) {
        if (SessionStore.load(context) == null) return
        val alarm = context.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(context, TrackerWatchdogReceiver::class.java).setAction(ACTION)
        val pending = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val triggerAt = SystemClock.elapsedRealtime() + delayMillis.coerceAtLeast(15_000L)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        } else {
            alarm.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        }
    }

    fun cancel(context: Context) {
        val alarm = context.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(context, TrackerWatchdogReceiver::class.java).setAction(ACTION)
        val pending = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        ) ?: return
        alarm.cancel(pending)
        pending.cancel()
    }
}

class TrackerWatchdogReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != TrackerWatchdog.ACTION) return
        if (SessionStore.load(context) == null) {
            TrackerWatchdog.cancel(context)
            return
        }

        TrackerWatchdog.schedule(context)
        DeviceOwnerHelper.applyCorporatePolicy(context)

        val foregroundGranted =
            context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val backgroundGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!foregroundGranted || !backgroundGranted) return

        runCatching {
            context.startForegroundService(
                Intent(context, LocationService::class.java).setAction(TrackerWatchdog.ACTION)
            )
        }
    }
}
