package br.com.comando360.tracker

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var code: EditText
    private lateinit var activate: Button
    private lateinit var permissions: Button
    private lateinit var background: Button
    private lateinit var battery: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DeviceOwnerHelper.applyCorporatePolicy(this)
        setContentView(buildUi())
        refreshUi()
    }

    private fun buildUi(): ScrollView {
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()
        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(30))
            gravity = Gravity.CENTER_HORIZONTAL
        }
        scroll.addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        root.addView(TextView(this).apply {
            text = "COMANDO 360"
            textSize = 26f
            setTextColor(Color.rgb(20, 48, 82))
            gravity = Gravity.CENTER
        })
        root.addView(TextView(this).apply {
            text = "Rastreamento 24h do celular da equipe"
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, dp(4), 0, dp(20))
        })

        status = TextView(this).apply {
            textSize = 14f
            setPadding(dp(14), dp(14), dp(14), dp(14))
            setBackgroundColor(Color.rgb(243, 247, 251))
        }
        root.addView(status, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        code = EditText(this).apply {
            hint = "Código de Rastreamento 24h"
            textSize = 18f
            isSingleLine = true
            gravity = Gravity.CENTER
            setAllCaps(true)
        }
        root.addView(code, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(58)).apply { topMargin = dp(18) })

        activate = Button(this).apply {
            text = "VINCULAR RASTREADOR 24H"
            setOnClickListener { activateTracker() }
        }
        root.addView(activate, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)).apply { topMargin = dp(8) })

        permissions = Button(this).apply {
            text = "PERMITIR LOCALIZAÇÃO"
            setOnClickListener { requestForegroundLocation() }
        }
        root.addView(permissions, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)).apply { topMargin = dp(18) })

        background = Button(this).apply {
            text = "PERMITIR LOCALIZAÇÃO O TEMPO TODO"
            setOnClickListener { requestBackgroundLocation() }
        }
        root.addView(background, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)).apply { topMargin = dp(7) })

        battery = Button(this).apply {
            text = "REMOVER RESTRIÇÃO DE BATERIA"
            setOnClickListener { requestBatteryExemption() }
        }
        root.addView(battery, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)).apply { topMargin = dp(7) })

        root.addView(Button(this).apply {
            text = "ABRIR COMANDO 360"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://app.comando360.com.br")))
            }
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(50)).apply { topMargin = dp(18) })

        root.addView(TextView(this).apply {
            text = "Depois de configurado, este aplicativo não precisa ficar aberto. O Android manterá uma notificação de rastreamento enquanto o serviço estiver ativo."
            textSize = 12f
            setTextColor(Color.DKGRAY)
            setPadding(0, dp(18), 0, 0)
        })
        return scroll
    }

    private fun activateTracker() {
        val value = code.text.toString().trim().uppercase()
        if (!Regex("^[A-Z0-9]{10}$").matches(value)) {
            toast("Digite o código de 10 caracteres gerado no administrador.")
            return
        }
        activate.isEnabled = false
        status.text = "Vinculando este Android ao celular da equipe..."
        executor.execute {
            runCatching {
                TrackerApi.activate(this, value, "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            }.onSuccess {
                runOnUiThread {
                    code.setText("")
                    toast("Rastreador vinculado com sucesso.")
                    requestForegroundLocation()
                    refreshUi()
                }
            }.onFailure { e ->
                runOnUiThread {
                    status.text = "Falha: ${e.message ?: "não foi possível vincular"}"
                    activate.isEnabled = true
                }
            }
        }
    }

    private fun requestForegroundLocation() {
        if (hasForegroundLocation()) {
            requestNotificationPermissionIfNeeded()
            startTrackerIfReady()
            refreshUi()
            return
        }
        requestPermissions(
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            1001
        )
    }

    private fun requestBackgroundLocation() {
        if (!hasForegroundLocation()) {
            requestForegroundLocation()
            return
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || DeviceOwnerHelper.hasBackgroundLocation(this)) {
            startTrackerIfReady()
            refreshUi()
            return
        }
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 1002)
            return
        }
        toast("Em Localização, selecione 'Permitir o tempo todo' e volte para o Comando 360.")
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1003)
        }
    }

    private fun requestBatteryExemption() {
        val pm = getSystemService(PowerManager::class.java)
        if (pm?.isIgnoringBatteryOptimizations(packageName) == true) {
            toast("A bateria já está sem restrição para o rastreador.")
            return
        }
        runCatching {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        }.onFailure {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    private fun startTrackerIfReady() {
        if (SessionStore.load(this) == null || !hasForegroundLocation()) return
        runCatching { startForegroundService(Intent(this, LocationService::class.java)) }
    }

    private fun hasForegroundLocation(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun batteryUnrestricted(): Boolean =
        getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(packageName) == true

    private fun refreshUi() {
        val session = SessionStore.load(this)
        val foreground = hasForegroundLocation()
        val backgroundOk = DeviceOwnerHelper.hasBackgroundLocation(this)
        val managed = DeviceOwnerHelper.isDeviceOwner(this)
        val batteryOk = batteryUnrestricted()
        activate.isEnabled = true
        status.text = buildString {
            append(if (session != null) "✅ Vinculado: ${session.deviceName}" else "⚪ Ainda não vinculado ao Comando 360")
            append("\n")
            append(if (foreground) "✅ GPS permitido" else "⚠️ GPS precisa de permissão")
            append("\n")
            append(if (backgroundOk) "✅ Localização permitida o tempo todo" else "⚠️ Falta 'Permitir o tempo todo'")
            append("\n")
            append(if (batteryOk) "✅ Bateria sem restrição" else "⚠️ Bateria ainda pode limitar o rastreador")
            append("\n")
            append(if (managed) "✅ Android corporativo gerenciado" else "ℹ️ Android ainda não está em modo corporativo gerenciado")
        }
        permissions.isEnabled = !foreground
        background.isEnabled = !backgroundOk
        battery.isEnabled = !batteryOk
        if (session != null && foreground) startTrackerIfReady()
    }

    override fun onResume() {
        super.onResume()
        DeviceOwnerHelper.applyCorporatePolicy(this)
        refreshUi()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001 && hasForegroundLocation()) {
            requestNotificationPermissionIfNeeded()
            startTrackerIfReady()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !DeviceOwnerHelper.hasBackgroundLocation(this)) {
                toast("Agora libere 'Localização o tempo todo' para continuar após reiniciar e com tudo fechado.")
            }
        }
        refreshUi()
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    override fun onDestroy() {
        executor.shutdown()
        super.onDestroy()
    }
}
