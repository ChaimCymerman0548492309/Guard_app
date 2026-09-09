package com.guardian.app.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import com.guardian.app.MainActivity
import com.guardian.app.R
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Minimal VPN service that captures connection metadata only — never packet payloads.
 *
 * Limitations (see ADR-002):
 * - Domains inferred from DNS queries (UDP/53); DoH/DoT bypasses this
 * - App attribution via getConnectionOwnerUid (Android 10+), best-effort only
 * - HTTPS payloads remain encrypted; only metadata is recorded
 */
class GuardianVpnService : VpnService() {

    companion object {
        private const val TAG = "GuardianVpn"
        private const val CHANNEL_ID = "guardian_vpn"
        private const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.guardian.app.vpn.START"
        const val ACTION_STOP = "com.guardian.app.vpn.STOP"

        @Volatile
        var status: VpnRuntimeStatus = VpnRuntimeStatus.STOPPED
            private set

        @Volatile
        var eventListener: ((NetworkEventPayload) -> Unit)? = null
    }

    enum class VpnRuntimeStatus {
        STOPPED, STARTING, ACTIVE, ERROR
    }

    data class NetworkEventPayload(
        val id: String,
        val packageName: String,
        val domain: String,
        val bytesSent: Long,
        val bytesReceived: Long,
        val direction: String,
        val protocol: String,
        val timestamp: Long
    )

    private var vpnInterface: ParcelFileDescriptor? = null
    private val running = AtomicBoolean(false)
    private var workerThread: Thread? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopVpn()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                startVpn()
                return START_STICKY
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    override fun onRevoke() {
        stopVpn()
        super.onRevoke()
    }

    private fun startVpn() {
        if (running.get()) return
        status = VpnRuntimeStatus.STARTING
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())

        try {
            val builder = Builder()
                .setSession("Guardian")
                .setMtu(1500)
                .addAddress("10.0.0.2", 32)
                .addRoute("0.0.0.0", 0)
                .setBlocking(true)

            vpnInterface = builder.establish()
            if (vpnInterface == null) {
                status = VpnRuntimeStatus.ERROR
                stopSelf()
                return
            }

            running.set(true)
            status = VpnRuntimeStatus.ACTIVE
            workerThread = Thread({ processPackets() }, "GuardianVpnWorker").also { it.start() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN", e)
            status = VpnRuntimeStatus.ERROR
            stopVpn()
        }
    }

    private fun stopVpn() {
        running.set(false)
        workerThread?.interrupt()
        workerThread = null
        try {
            vpnInterface?.close()
        } catch (_: Exception) {
        }
        vpnInterface = null
        status = VpnRuntimeStatus.STOPPED
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    /**
     * Reads IP packets from the TUN interface and extracts metadata.
     * Raw payloads are never stored — only domain (from DNS) and byte counts.
     */
    private fun processPackets() {
        val fd = vpnInterface?.fileDescriptor ?: return
        val input = FileInputStream(fd)
        val output = FileOutputStream(fd)
        val packet = ByteBuffer.allocate(32767)

        while (running.get() && !Thread.currentThread().isInterrupted) {
            try {
                packet.clear()
                val length = input.read(packet.array())
                if (length <= 0) continue

                val metadata = parsePacketMetadata(packet.array(), length)
                if (metadata != null) {
                    emitEvent(metadata)
                }

                // Forward packet so device connectivity is not broken
                output.write(packet.array(), 0, length)
            } catch (e: Exception) {
                if (running.get()) {
                    Log.w(TAG, "Packet processing error", e)
                }
                break
            }
        }
    }

    private data class PacketMetadata(
        val domain: String?,
        val destIp: String,
        val destPort: Int,
        val protocol: String,
        val packetSize: Int,
        val isOutbound: Boolean
    )

    private fun parsePacketMetadata(data: ByteArray, length: Int): PacketMetadata? {
        if (length < 20) return null
        val version = (data[0].toInt() shr 4) and 0xF
        if (version != 4) return null

        val protocolNum = data[9].toInt() and 0xFF
        val protocol = when (protocolNum) {
            6 -> "TCP"
            17 -> "UDP"
            else -> "OTHER"
        }

        val destIp = "${data[16].toInt() and 0xFF}.${data[17].toInt() and 0xFF}.${data[18].toInt() and 0xFF}.${data[19].toInt() and 0xFF}"
        var destPort = 0
        val headerLen = (data[0].toInt() and 0xF) * 4

        if (protocolNum == 17 && length >= headerLen + 4) {
            destPort = ((data[headerLen].toInt() and 0xFF) shl 8) or (data[headerLen + 1].toInt() and 0xFF)
        } else if (protocolNum == 6 && length >= headerLen + 4) {
            destPort = ((data[headerLen].toInt() and 0xFF) shl 8) or (data[headerLen + 1].toInt() and 0xFF)
        }

        var domain: String? = null
        if (protocolNum == 17 && destPort == 53 && length > headerLen + 12) {
            domain = parseDnsQuery(data, headerLen + 8, length)
        }

        return PacketMetadata(
            domain = domain,
            destIp = destIp,
            destPort = destPort,
            protocol = protocol,
            packetSize = length,
            isOutbound = true
        )
    }

    /** Extract QNAME from DNS query — metadata only, no answer payload stored. */
    private fun parseDnsQuery(data: ByteArray, offset: Int, length: Int): String? {
        try {
            val labels = mutableListOf<String>()
            var pos = offset
            while (pos < length) {
                val labelLen = data[pos].toInt() and 0xFF
                if (labelLen == 0) break
                if (labelLen > 63 || pos + labelLen >= length) return null
                labels.add(String(data, pos + 1, labelLen, Charsets.US_ASCII))
                pos += labelLen + 1
            }
            return if (labels.isEmpty()) null else labels.joinToString(".")
        } catch (_: Exception) {
            return null
        }
    }

    private fun emitEvent(metadata: PacketMetadata) {
        val domain = metadata.domain ?: metadata.destIp
        val packageName = resolvePackageName(metadata) ?: "unknown"

        val payload = NetworkEventPayload(
            id = UUID.randomUUID().toString(),
            packageName = packageName,
            domain = domain,
            bytesSent = if (metadata.isOutbound) metadata.packetSize.toLong() else 0L,
            bytesReceived = if (!metadata.isOutbound) metadata.packetSize.toLong() else 0L,
            direction = if (metadata.isOutbound) "OUTBOUND" else "INBOUND",
            protocol = metadata.protocol,
            timestamp = System.currentTimeMillis()
        )

        eventListener?.invoke(payload)
    }

    private fun resolvePackageName(metadata: PacketMetadata): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val remote = InetSocketAddress(metadata.destIp, metadata.destPort)
            val local = InetSocketAddress("0.0.0.0", 0)
            val protocol = when (metadata.protocol) {
                "TCP" -> ConnectivityManager.IPPROTO_TCP
                "UDP" -> ConnectivityManager.IPPROTO_UDP
                else -> return null
            }
            val uid = cm.getConnectionOwnerUid(protocol, local, remote)
            if (uid == android.os.Process.INVALID_UID) return null
            packageManager.getPackagesForUid(uid)?.firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Guardian Network Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when Guardian is monitoring network activity"
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
            .setContentTitle("Guardian is active")
            .setContentText("Monitoring network activity on this device")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }
}
