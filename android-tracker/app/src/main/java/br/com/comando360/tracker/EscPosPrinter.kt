package br.com.comando360.tracker

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.io.OutputStream
import java.nio.charset.Charset
import java.util.UUID

/**
 * Small, dependency-free ESC/POS transport for the 80 mm field printer.
 * Goldensky GS-POS-80D/MP80M advertises ESC/POS and Bluetooth Classic.
 *
 * Security: we only connect to devices already paired in Android settings.
 * No discovery is performed and no MAC address leaves the device.
 */
class EscPosPrinter(private val context: Context) {
    companion object {
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val PREFS = "c360_escpos"
        private const val KEY_MAC = "printer_mac"
    }

    private val adapter: BluetoothAdapter?
        get() = context.getSystemService(BluetoothManager::class.java)?.adapter

    fun hasConnectPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED

    fun pairedPrinters(): List<BluetoothDevice> {
        if (!hasConnectPermission()) return emptyList()
        return adapter?.bondedDevices
            ?.filter { device ->
                val n = runCatching { device.name.orEmpty() }.getOrDefault("")
                n.contains("POS", true) || n.contains("80", true) ||
                    n.contains("printer", true) || n.contains("golden", true)
            }
            ?.sortedBy { runCatching { it.name.orEmpty() }.getOrDefault("") }
            ?: emptyList()
    }

    fun bind(device: BluetoothDevice) {
        if (!hasConnectPermission()) throw SecurityException("Permissão Bluetooth não concedida.")
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_MAC, device.address).apply()
    }

    fun boundDevice(): BluetoothDevice? {
        if (!hasConnectPermission()) return null
        val mac = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_MAC, null) ?: return null
        return runCatching { adapter?.getRemoteDevice(mac) }.getOrNull()
    }

    fun unbind() {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_MAC).apply()
    }

    fun printText(text: String) {
        val device = boundDevice() ?: throw IllegalStateException("Nenhuma impressora vinculada.")
        if (adapter?.isEnabled != true) throw IllegalStateException("Bluetooth está desligado.")
        val socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        try {
            socket.connect()
            val out: OutputStream = socket.outputStream
            // ESC @ initialize; code page 850; left align.
            out.write(byteArrayOf(0x1B, 0x40, 0x1B, 0x74, 0x02, 0x1B, 0x61, 0x00))
            val normalized = text.replace("\r\n", "\n").replace("\r", "\n")
            out.write(normalized.toByteArray(Charset.forName("CP850")))
            // Feed enough paper for manual tear. Portable model may not have a cutter.
            out.write(byteArrayOf(0x0A, 0x0A, 0x0A, 0x0A))
            out.flush()
        } finally {
            runCatching { socket.close() }
        }
    }
}
