package com.guardian.app.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.os.PowerManager
import android.system.OsConstants
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
 * DNS-only VPN. App traffic stays on the normal network, so Android does not
 * revoke the session for a broken tunnel. Only DNS questions are recorded.
 *
 * Plain DNS to this VPN and to public resolvers is recorded. Encrypted DNS to
 * those resolvers is reset so the app falls back to a lookup we can name.
 * Strict Private DNS still bypasses the tunnel until it is turned off.
 */
class GuardianVpnService : VpnService() {

    companion object {
        private const val TAG = "GuardianVpn"
        private const val CHANNEL_ID = "guardian_vpn"
        private const val NOTIFICATION_ID = 1001
        private const val UPLOAD_INTERVAL_MS = 60 * 1000L
        const val ACTION_START = "com.guardian.app.vpn.START"
        const val ACTION_STOP = "com.guardian.app.vpn.STOP"

        @Volatile
        var status: VpnRuntimeStatus = VpnRuntimeStatus.STOPPED
            private set

        @Volatile
        var lastError: String? = null
            private set

        @Volatile
        var eventListener: ((NetworkEventPayload) -> Unit)? = null

        private const val PREFS_NAME = "guardian_vpn"
        private const val BLOCKED_DOMAINS_KEY = "blocked_domains"

        private val blockedDomains = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()
        private val packetsProcessed = java.util.concurrent.atomic.AtomicLong(0)
        private val eventsEmitted = java.util.concurrent.atomic.AtomicLong(0)

        fun loadBlockedDomains(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val stored = prefs.getStringSet(BLOCKED_DOMAINS_KEY, emptySet()) ?: emptySet()
            blockedDomains.clear()
            blockedDomains.addAll(stored.map { it.trim().lowercase() }.filter { it.isNotEmpty() })
            Log.i(TAG, "Loaded ${blockedDomains.size} blocked domain(s) from storage")
        }

        private fun persistBlockedDomains(context: Context) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(BLOCKED_DOMAINS_KEY, blockedDomains.toSet())
                .apply()
        }

        fun blockDomain(context: Context, domain: String): Boolean {
            val normalized = domain.trim().lowercase()
            if (normalized.isEmpty()) return false
            val added = blockedDomains.add(normalized)
            if (added) {
                persistBlockedDomains(context)
                Log.i(TAG, "Domain added to blocklist (best-effort): $normalized")
            }
            return added
        }

        fun isDomainBlocked(domain: String): Boolean {
            val normalized = domain.trim().lowercase()
            return blockedDomains.any { blocked ->
                normalized == blocked || normalized.endsWith(".$blocked")
            }
        }

        fun getBlockedDomainCount(): Int = blockedDomains.size

        fun getPacketsProcessed(): Long = packetsProcessed.get()

        fun getEventsEmitted(): Long = eventsEmitted.get()

        fun recordPacketProcessed() {
            packetsProcessed.incrementAndGet()
        }

        fun recordEventEmitted() {
            eventsEmitted.incrementAndGet()
        }

        fun resetSessionStats() {
            packetsProcessed.set(0)
            eventsEmitted.set(0)
        }
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
    private var dnsProxy: DnsProxy? = null
    private val running = AtomicBoolean(false)
    private var workerThread: Thread? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val uploadHandler = Handler(Looper.getMainLooper())
    private val recentQueries = java.util.concurrent.ConcurrentHashMap<String, Long>()
    private val uploadRunnable = object : Runnable {
        override fun run() {
            if (!running.get()) return
            acquireWakeLock()
            // The JS task returns before any HTTP call when nothing is waiting to upload.
            try {
                startService(Intent(this@GuardianVpnService, GuardianSyncTaskService::class.java))
            } catch (e: Exception) {
                Log.w(TAG, "Background sync start failed", e)
            }
            uploadHandler.postDelayed(this, UPLOAD_INTERVAL_MS)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                lastError = null
                status = VpnRuntimeStatus.STOPPED
                teardownTunnel()
                stopSelf()
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
        teardownTunnel()
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (status == VpnRuntimeStatus.ACTIVE) {
            try {
                val restart = Intent(this, GuardianVpnService::class.java).apply {
                    action = ACTION_START
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(restart)
                } else {
                    startService(restart)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not restart VPN after task removal", e)
            }
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onRevoke() {
        Log.w(TAG, "System revoked the VPN")
        lastError = "VPN permission was revoked by the system"
        status = VpnRuntimeStatus.ERROR
        teardownTunnel()
        stopSelf()
        super.onRevoke()
    }

    private fun startVpn() {
        if (running.get()) return
        lastError = null
        loadBlockedDomains(this)
        resetSessionStats()
        status = VpnRuntimeStatus.STARTING
        createNotificationChannel()
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        try {
            val builder = Builder()
                .setSession("Guardian")
                .setMtu(1500)
                .addAddress("10.8.0.1", 32)
                .addDnsServer("10.8.0.1")
                .allowFamily(OsConstants.AF_INET6)
                .setBlocking(true)
            addCapturedResolverRoutes(builder)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                builder.setMetered(false)
            }
            try {
                builder.addDisallowedApplication(packageName)
            } catch (_: PackageManager.NameNotFoundException) {
            }

            vpnInterface = builder.establish()
            if (vpnInterface == null) {
                lastError = "Failed to establish VPN interface"
                status = VpnRuntimeStatus.ERROR
                teardownTunnel()
                stopSelf()
                return
            }

            running.set(true)
            status = VpnRuntimeStatus.ACTIVE
            acquireWakeLock()
            uploadHandler.removeCallbacks(uploadRunnable)
            uploadHandler.postDelayed(uploadRunnable, UPLOAD_INTERVAL_MS)
            workerThread = Thread({ processPackets() }, "GuardianVpnWorker").also { it.start() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN", e)
            lastError = e.message ?: "Failed to start VPN"
            status = VpnRuntimeStatus.ERROR
            teardownTunnel()
            stopSelf()
        }
    }

    /**
     * Keeps ordinary traffic on the physical network. Only the VPN DNS address
     * and well-known public resolvers enter the tunnel, so a failed connection
     * check does not revoke the session.
     */
    private fun addCapturedResolverRoutes(builder: Builder) {
        listOf(
            "10.8.0.1",
            "1.1.1.1",
            "1.0.0.1",
            "8.8.8.8",
            "8.8.4.4",
            "9.9.9.9",
            "149.112.112.112",
            "208.67.222.222",
            "208.67.220.220",
        ).forEach { builder.addRoute(it, 32) }
        try {
            builder.addAddress("fd00:8::1", 128)
            builder.addDnsServer("fd00:8::1")
            listOf(
                "fd00:8::1",
                "2001:4860:4860::8888",
                "2001:4860:4860::8844",
                "2606:4700:4700::1111",
                "2606:4700:4700::1001",
                "2620:fe::fe",
                "2620:fe::9",
            ).forEach { builder.addRoute(it, 128) }
        } catch (e: Exception) {
            Log.w(TAG, "IPv6 DNS capture skipped", e)
        }
    }

    private fun teardownTunnel() {
        running.set(false)
        uploadHandler.removeCallbacks(uploadRunnable)
        releaseWakeLock()
        workerThread?.interrupt()
        workerThread = null
        dnsProxy?.close()
        dnsProxy = null
        try {
            vpnInterface?.close()
        } catch (_: Exception) {
        }
        vpnInterface = null
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (_: Exception) {
        }
    }

    /**
     * Reads DNS questions from the TUN interface. Payloads are not stored.
     * A bad packet is skipped so the monitor keeps running.
     */
    private fun processPackets() {
        val fd = vpnInterface?.fileDescriptor ?: return
        val input = FileInputStream(fd)
        val output = FileOutputStream(fd)
        val proxy = DnsProxy(
            vpn = this,
            output = output,
            isBlocked = { domain -> isDomainBlocked(domain) },
            onQuery = { domain, srcIp, srcPort -> recordDnsQuery(domain, srcIp, srcPort) },
        )
        dnsProxy = proxy
        val packet = ByteBuffer.allocate(32767)

        while (running.get() && !Thread.currentThread().isInterrupted) {
            try {
                packet.clear()
                val length = input.read(packet.array())
                if (length <= 0) continue
                recordPacketProcessed()
                proxy.handle(packet.array().copyOf(length))
            } catch (e: Exception) {
                if (!running.get() || Thread.currentThread().isInterrupted) break
                Log.w(TAG, "Packet processing error", e)
            }
        }
    }

    private fun recordDnsQuery(domain: String, srcIp: String, srcPort: Int) {
        val now = System.currentTimeMillis()
        val key = "$srcIp:$domain"
        val previous = recentQueries.put(key, now)
        if (previous != null && now - previous < 20_000) return
        if (recentQueries.size > 400) {
            recentQueries.entries.removeIf { now - it.value > 60_000 }
        }
        emitEvent(
            PacketMetadata(
                domain = domain,
                sourceIp = srcIp,
                destIp = "10.8.0.1",
                sourcePort = srcPort,
                destPort = 53,
                protocol = "UDP",
                packetSize = domain.length,
                isOutbound = true,
                blocked = isDomainBlocked(domain),
            ),
        )
    }

    private data class PacketMetadata(
        val domain: String?,
        val sourceIp: String,
        val destIp: String,
        val sourcePort: Int,
        val destPort: Int,
        val protocol: String,
        val packetSize: Int,
        val isOutbound: Boolean,
        val blocked: Boolean
    )

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

        recordEventEmitted()
        VpnEventQueue.enqueue(
            this,
            payload.id,
            payload.packageName,
            payload.domain,
            payload.bytesSent,
            payload.bytesReceived,
            payload.direction,
            payload.protocol,
            payload.timestamp,
        )
        eventListener?.invoke(payload)
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val power = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "guardian:vpn").apply {
            setReferenceCounted(false)
            acquire(6 * 60 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {
        }
        wakeLock = null
    }

    private fun resolvePackageName(metadata: PacketMetadata): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val protocol = when (metadata.protocol) {
                "TCP" -> OsConstants.IPPROTO_TCP
                "UDP" -> OsConstants.IPPROTO_UDP
                else -> return null
            }

            val local = InetSocketAddress(metadata.sourceIp, metadata.sourcePort)
            val remote = InetSocketAddress(metadata.destIp, metadata.destPort)
            var uid = cm.getConnectionOwnerUid(protocol, local, remote)

            if (uid == android.os.Process.INVALID_UID && metadata.sourcePort > 0) {
                uid = cm.getConnectionOwnerUid(
                    protocol,
                    InetSocketAddress(metadata.sourceIp, metadata.sourcePort),
                    InetSocketAddress(metadata.destIp, metadata.destPort)
                )
            }

            if (uid == android.os.Process.INVALID_UID) return null

            val packages = packageManager.getPackagesForUid(uid)
            if (packages.isNullOrEmpty()) return null

            // Prefer non-system app when multiple packages share a UID
            packages.firstOrNull { pkg ->
                try {
                    val info = packageManager.getApplicationInfo(pkg, 0)
                    (info.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0
                } catch (_: PackageManager.NameNotFoundException) {
                    false
                }
            } ?: packages.firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.vpn_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.vpn_channel_description)
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
            .setContentTitle(getString(R.string.vpn_notification_title))
            .setContentText(getString(R.string.vpn_notification_text))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }
}
