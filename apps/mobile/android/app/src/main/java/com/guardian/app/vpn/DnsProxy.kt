package com.guardian.app.vpn

import android.net.VpnService
import android.util.Log
import java.io.OutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Answers DNS on the VPN address and forwards the same query upstream.
 * Ordinary traffic is not routed into the tunnel, so Android keeps the VPN up.
 */
class DnsProxy(
    private val vpn: VpnService,
    private val output: OutputStream,
    private val isBlocked: (String) -> Boolean,
    private val onQuery: (domain: String, srcIp: String, srcPort: Int) -> Unit,
) {
    private val executor = Executors.newFixedThreadPool(4)
    private val ipId = AtomicInteger(1)

    fun handle(packet: ByteArray) {
        val query = parseDnsPacket(packet) ?: return
        executor.execute {
            try {
                onQuery(query.domain, query.srcIp, query.srcPort)
                val response = if (isBlocked(query.domain)) {
                    nxDomain(query.payload)
                } else {
                    forward(query.payload) ?: return@execute
                }
                writeTun(buildIpv4Udp(query, response))
            } catch (e: Exception) {
                Log.w(TAG, "DNS proxy failed for ${query.domain}", e)
            }
        }
    }

    fun close() {
        executor.shutdownNow()
    }

    private fun forward(payload: ByteArray): ByteArray? {
        for (server in UPSTREAM) {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket()
                vpn.protect(socket)
                socket.soTimeout = 2_500
                val address = InetAddress.getByName(server)
                socket.send(DatagramPacket(payload, payload.size, address, 53))
                val buffer = ByteArray(4096)
                val reply = DatagramPacket(buffer, buffer.size)
                socket.receive(reply)
                if (reply.length in 12..1400) {
                    return reply.data.copyOf(reply.length)
                }
            } catch (_: Exception) {
            } finally {
                socket?.close()
            }
        }
        return null
    }

    private fun writeTun(packet: ByteArray) {
        synchronized(output) {
            output.write(packet)
            output.flush()
        }
    }

    private fun buildIpv4Udp(query: DnsPacket, payload: ByteArray): ByteArray {
        val udpLen = 8 + payload.size
        val total = 20 + udpLen
        val packet = ByteArray(total)
        packet[0] = 0x45
        writeShort(packet, 2, total)
        writeShort(packet, 4, ipId.getAndIncrement() and 0xFFFF)
        packet[8] = 64
        packet[9] = 17
        ipv4Bytes(query.dstIp).copyInto(packet, 12)
        ipv4Bytes(query.srcIp).copyInto(packet, 16)
        writeShort(packet, 10, ipChecksum(packet, 20))
        writeShort(packet, 20, 53)
        writeShort(packet, 22, query.srcPort)
        writeShort(packet, 24, udpLen)
        payload.copyInto(packet, 28)
        return packet
    }

    private data class DnsPacket(
        val srcIp: String,
        val dstIp: String,
        val srcPort: Int,
        val domain: String,
        val payload: ByteArray,
    )

    companion object {
        private const val TAG = "GuardianVpn"
        private val UPSTREAM = arrayOf("1.1.1.1", "8.8.8.8")

        fun parseDnsPacket(packet: ByteArray): DnsPacket? {
            if (packet.size < 20) return null
            val version = (packet[0].toInt() ushr 4) and 0xF
            if (version != 4) return null
            if ((packet[9].toInt() and 0xFF) != 17) return null
            val headerLen = (packet[0].toInt() and 0xF) * 4
            if (headerLen < 20 || packet.size < headerLen + 8 + 12) return null
            val destPort = readShort(packet, headerLen + 2)
            if (destPort != 53) return null
            val srcIp = ipv4String(packet, 12)
            val dstIp = ipv4String(packet, 16)
            val srcPort = readShort(packet, headerLen)
            val payload = packet.copyOfRange(headerLen + 8, packet.size)
            val domain = parseQName(payload) ?: return null
            return DnsPacket(srcIp, dstIp, srcPort, domain, payload)
        }

        fun parseQName(payload: ByteArray): String? {
            if (payload.size < 12) return null
            val labels = mutableListOf<String>()
            var pos = 12
            while (pos < payload.size) {
                val labelLen = payload[pos].toInt() and 0xFF
                if (labelLen == 0) break
                if (labelLen > 63 || pos + labelLen >= payload.size) return null
                labels.add(String(payload, pos + 1, labelLen, Charsets.US_ASCII))
                pos += labelLen + 1
            }
            if (labels.isEmpty()) return null
            return labels.joinToString(".").lowercase()
        }

        private fun nxDomain(query: ByteArray): ByteArray {
            val response = query.copyOf()
            response[2] = (response[2].toInt() or 0x80).toByte()
            response[3] = ((response[3].toInt() and 0xF0) or 0x03).toByte()
            return response
        }

        private fun ipv4String(packet: ByteArray, offset: Int): String {
            return "${packet[offset].toInt() and 0xFF}.${packet[offset + 1].toInt() and 0xFF}." +
                "${packet[offset + 2].toInt() and 0xFF}.${packet[offset + 3].toInt() and 0xFF}"
        }

        private fun ipv4Bytes(ip: String): ByteArray {
            return ip.split('.').map { it.toInt().toByte() }.toByteArray()
        }

        private fun readShort(data: ByteArray, offset: Int): Int {
            return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
        }

        private fun writeShort(data: ByteArray, offset: Int, value: Int) {
            data[offset] = ((value ushr 8) and 0xFF).toByte()
            data[offset + 1] = (value and 0xFF).toByte()
        }

        private fun ipChecksum(data: ByteArray, length: Int): Int {
            var sum = 0
            var i = 0
            while (i + 1 < length) {
                sum += ((data[i].toInt() and 0xFF) shl 8) or (data[i + 1].toInt() and 0xFF)
                i += 2
            }
            while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
            return sum.inv() and 0xFFFF
        }
    }
}
