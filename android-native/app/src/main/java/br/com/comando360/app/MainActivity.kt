package br.com.comando360.app

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.Charset
import java.util.UUID

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val adapter: BluetoothAdapter? get() = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private val spp = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val prefs by lazy { getSharedPreferences("printer", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestBtPermission()
        web = WebView(this)
        setContentView(web)
        configureWebView()
        web.loadUrl("https://app.comando360.com.br/")
    }

    private fun requestBtPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN), 360)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.databaseEnabled = true
        web.webViewClient = WebViewClient()
        web.webChromeClient = WebChromeClient()
        web.addJavascriptInterface(PrinterBridge(), "Comando360Printer")
    }

    @SuppressLint("MissingPermission")
    inner class PrinterBridge {
        @JavascriptInterface fun listPairedPrinters(): String {
            if (!hasBtPermission()) return JSONObject().put("ok", false).put("error", "Permissão Bluetooth não concedida").toString()
            val arr = JSONArray()
            adapter?.bondedDevices?.forEach { d -> arr.put(JSONObject().put("name", d.name ?: "Bluetooth").put("address", d.address)) }
            return JSONObject().put("ok", true).put("devices", arr).toString()
        }

        @JavascriptInterface fun connect(address: String): String {
            if (!hasBtPermission()) return fail("Permissão Bluetooth não concedida")
            return try {
                closeSocket()
                adapter?.cancelDiscovery()
                val device = adapter?.getRemoteDevice(address) ?: return fail("Bluetooth indisponível")
                socket = device.createRfcommSocketToServiceRecord(spp).also { it.connect() }
                prefs.edit().putString("address", address).putString("name", device.name ?: "Impressora").apply()
                ok(JSONObject().put("connected", true).put("name", device.name).put("address", address))
            } catch (e: Exception) { closeSocket(); fail(e.message ?: "Falha ao conectar") }
        }

        @JavascriptInterface fun connectSaved(): String {
            val address = prefs.getString("address", null) ?: return fail("Nenhuma impressora vinculada")
            return connect(address)
        }

        @JavascriptInterface fun getStatus(): String {
            return ok(JSONObject().put("connected", socket?.isConnected == true)
                .put("name", prefs.getString("name", ""))
                .put("address", prefs.getString("address", "")))
        }

        @JavascriptInterface fun printText(text: String): String {
            return try {
                ensureConnected()
                val out = socket?.outputStream ?: return fail("Impressora desconectada")
                out.write(byteArrayOf(0x1B, 0x40))
                out.write(text.toByteArray(Charset.forName("CP860")))
                out.write("\n\n\n".toByteArray())
                out.flush()
                ok(JSONObject().put("printed", true))
            } catch (e: Exception) { closeSocket(); fail(e.message ?: "Falha na impressão") }
        }

        @JavascriptInterface fun testPrint(): String = printText("        COMANDO 360\n--------------------------------\nIMPRESSORA BLUETOOTH OK\nSem RawBT\n--------------------------------\n")
        @JavascriptInterface fun disconnect(): String { closeSocket(); return ok(JSONObject().put("connected", false)) }
        @JavascriptInterface fun forgetPrinter(): String { closeSocket(); prefs.edit().clear().apply(); return ok(JSONObject().put("forgotten", true)) }
    }

    @SuppressLint("MissingPermission")
    private fun ensureConnected() {
        if (socket?.isConnected == true) return
        val address = prefs.getString("address", null) ?: throw IllegalStateException("Selecione uma impressora primeiro")
        adapter?.cancelDiscovery()
        val device: BluetoothDevice = adapter?.getRemoteDevice(address) ?: throw IllegalStateException("Bluetooth indisponível")
        socket = device.createRfcommSocketToServiceRecord(spp).also { it.connect() }
    }

    private fun hasBtPermission(): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    private fun closeSocket() { try { socket?.close() } catch (_: Exception) {}; socket = null }
    private fun ok(data: JSONObject) = JSONObject().put("ok", true).put("data", data).toString()
    private fun fail(message: String) = JSONObject().put("ok", false).put("error", message).toString()

    override fun onDestroy() { closeSocket(); super.onDestroy() }
    @Deprecated("Deprecated in Java") override fun onBackPressed() { if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed() }
}
