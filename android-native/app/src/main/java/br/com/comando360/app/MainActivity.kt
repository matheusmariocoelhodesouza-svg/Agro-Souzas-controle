package br.com.comando360.app

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.Charset
import java.util.UUID

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    private val adapter: BluetoothAdapter? get() = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private val spp = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val prefs by lazy { getSharedPreferences("printer", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestBtPermission()
        root = FrameLayout(this)
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(-1, -1))
        addPrinterButton()
        setContentView(root)
        configureWebView()
        web.loadUrl("https://app.comando360.com.br/")
    }

    private fun addPrinterButton() {
        val b = Button(this).apply {
            text = "🖨 Impressora"
            textSize = 13f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(0, 105, 190))
            setOnClickListener { showPrinterSetup() }
        }
        val lp = FrameLayout.LayoutParams(dp(132), dp(48), Gravity.END or Gravity.BOTTOM).apply { setMargins(dp(12), dp(12), dp(14), dp(18)) }
        root.addView(b, lp)
    }

    @SuppressLint("MissingPermission")
    private fun showPrinterSetup() {
        if (!hasBtPermission()) { requestBtPermission(); Toast.makeText(this, "Permita Dispositivos próximos e toque novamente", Toast.LENGTH_LONG).show(); return }
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(8), dp(20), 0) }
        val status = TextView(this).apply {
            textSize = 15f
            val saved = prefs.getString("name", null)
            text = if (socket?.isConnected == true) "Conectada: ${saved ?: "impressora"}" else if (saved != null) "Vinculada: $saved" else "Nenhuma impressora vinculada"
            setPadding(0, dp(8), 0, dp(12))
        }
        box.addView(status)
        val devices = adapter?.bondedDevices?.toList()?.sortedBy { it.name ?: "" } ?: emptyList()
        if (devices.isEmpty()) box.addView(TextView(this).apply { text = "Nenhum dispositivo Bluetooth pareado. Pareie a RPP02N nas Configurações do Android e volte aqui." })
        else devices.forEach { d ->
            val btn = Button(this).apply {
                text = "${d.name ?: "Bluetooth"}\n${d.address}"; isAllCaps = false
                setOnClickListener {
                    status.text = "Conectando a ${d.name ?: "impressora"}..."
                    Thread {
                        val result = PrinterBridge().connect(d.address)
                        runOnUiThread { status.text = if (JSONObject(result).optBoolean("ok")) "Conectada: ${d.name ?: "impressora"}" else "Falha: ${JSONObject(result).optString("error")}" }
                    }.start()
                }
            }
            box.addView(btn, LinearLayout.LayoutParams(-1, -2))
        }
        val test = Button(this).apply {
            text = "TESTE DE IMPRESSÃO"
            setOnClickListener {
                status.text = "Enviando teste..."
                Thread {
                    val result = PrinterBridge().testPrint()
                    runOnUiThread { status.text = if (JSONObject(result).optBoolean("ok")) "Teste enviado ✓" else "Falha: ${JSONObject(result).optString("error")}" }
                }.start()
            }
        }
        box.addView(test, LinearLayout.LayoutParams(-1, -2))
        val forget = Button(this).apply { text = "ESQUECER IMPRESSORA"; setOnClickListener { PrinterBridge().forgetPrinter(); status.text = "Impressora removida" } }
        box.addView(forget, LinearLayout.LayoutParams(-1, -2))
        androidx.appcompat.app.AlertDialog.Builder(this).setTitle("Impressora Bluetooth").setView(box).setNegativeButton("Fechar", null).show()
    }

    private fun requestBtPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED)
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN), 360)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.databaseEnabled = true
        web.webChromeClient = WebChromeClient()
        web.addJavascriptInterface(PrinterBridge(), "Comando360Printer")
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectDirectPrint()
                Thread { try { PrinterBridge().connectSaved() } catch (_: Exception) {} }.start()
            }
        }
    }

    private fun injectDirectPrint() {
        val js = """
            (function(){
              if(window.__c360DirectPrintInstalled)return;
              window.__c360DirectPrintInstalled=true;
              window.Comando360DirectPrint=function(text){
                try{return JSON.parse(window.Comando360Printer.printText(String(text||'')));}
                catch(e){return {ok:false,error:String(e)}}
              };
              document.addEventListener('click',function(ev){
                var el=ev.target && ev.target.closest ? ev.target.closest('button,a,[role=button]') : null;
                if(!el)return;
                var label=(el.innerText||el.textContent||'').trim().toLowerCase();
                if(!(label==='imprimir'||label.indexOf('imprimir ')===0||label.indexOf(' impressão')>=0))return;
                var area=el.closest('[data-print-area],.print-area,.receipt,.comprovante,.relatorio,.report,.modal,.card,section,article');
                if(!area)return;
                var text=(area.innerText||area.textContent||'').trim();
                if(text.length<20)return;
                ev.preventDefault(); ev.stopPropagation();
                setTimeout(function(){
                  var r=window.Comando360DirectPrint(text);
                  if(!r.ok)alert('Não foi possível imprimir: '+(r.error||'erro desconhecido'));
                },0);
              },true);
            })();
        """.trimIndent()
        web.evaluateJavascript(js, null)
    }

    @SuppressLint("MissingPermission")
    inner class PrinterBridge {
        @JavascriptInterface fun listPairedPrinters(): String {
            if (!hasBtPermission()) return JSONObject().put("ok", false).put("error", "Permissão Bluetooth não concedida").toString()
            val arr = JSONArray(); adapter?.bondedDevices?.forEach { d -> arr.put(JSONObject().put("name", d.name ?: "Bluetooth").put("address", d.address)) }
            return JSONObject().put("ok", true).put("devices", arr).toString()
        }
        @JavascriptInterface fun connect(address: String): String {
            if (!hasBtPermission()) return fail("Permissão Bluetooth não concedida")
            return try {
                closeSocket(); adapter?.cancelDiscovery()
                val device = adapter?.getRemoteDevice(address) ?: return fail("Bluetooth indisponível")
                socket = device.createRfcommSocketToServiceRecord(spp).also { it.connect() }
                prefs.edit().putString("address", address).putString("name", device.name ?: "Impressora").apply()
                ok(JSONObject().put("connected", true).put("name", device.name).put("address", address))
            } catch (e: Exception) { closeSocket(); fail(e.message ?: "Falha ao conectar") }
        }
        @JavascriptInterface fun connectSaved(): String { val a = prefs.getString("address", null) ?: return fail("Nenhuma impressora vinculada"); return connect(a) }
        @JavascriptInterface fun getStatus(): String = ok(JSONObject().put("connected", socket?.isConnected == true).put("name", prefs.getString("name", "")).put("address", prefs.getString("address", "")))
        @JavascriptInterface fun printText(text: String): String {
            return try {
                ensureConnected(); val out = socket?.outputStream ?: return fail("Impressora desconectada")
                out.write(byteArrayOf(0x1B, 0x40)); out.write(text.toByteArray(Charset.forName("CP860"))); out.write("\n\n\n".toByteArray()); out.flush()
                ok(JSONObject().put("printed", true))
            } catch (e: Exception) { closeSocket(); fail(e.message ?: "Falha na impressão") }
        }
        @JavascriptInterface fun testPrint(): String = printText("                COMANDO 360\n------------------------------------------------\nIMPRESSORA BLUETOOTH OK\nRPP02N - impressao direta sem RawBT\n------------------------------------------------\n")
        @JavascriptInterface fun disconnect(): String { closeSocket(); return ok(JSONObject().put("connected", false)) }
        @JavascriptInterface fun forgetPrinter(): String { closeSocket(); prefs.edit().clear().apply(); return ok(JSONObject().put("forgotten", true)) }
    }

    @SuppressLint("MissingPermission")
    private fun ensureConnected() {
        if (socket?.isConnected == true) return
        val address = prefs.getString("address", null) ?: throw IllegalStateException("Selecione uma impressora primeiro")
        adapter?.cancelDiscovery(); val d: BluetoothDevice = adapter?.getRemoteDevice(address) ?: throw IllegalStateException("Bluetooth indisponível")
        socket = d.createRfcommSocketToServiceRecord(spp).also { it.connect() }
    }
    private fun hasBtPermission() = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    private fun closeSocket() { try { socket?.close() } catch (_: Exception) {}; socket = null }
    private fun ok(data: JSONObject) = JSONObject().put("ok", true).put("data", data).toString()
    private fun fail(message: String) = JSONObject().put("ok", false).put("error", message).toString()
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
    override fun onDestroy() { closeSocket(); super.onDestroy() }
    @Deprecated("Deprecated in Java") override fun onBackPressed() { if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed() }
}
