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
 * Answers DNS that arrives on the tunnel and forwards the same query upstream.
 * TCP/443 and TCP/853 to a captured resolver are reset so encrypted DNS falls
 * back to plain DNS, which is the only lookup this monitor can name.
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
        val query = parseDnsQuery(packet)
        if (query != null) {
            executor.execute {
                try {
                    onQuery(query.domain, query.srcIp, query.srcPort)
                    val response = if (isBlocked(query.domain) || isDohBootstrap(query.domain)) {
                        nxDomain(query.payload)
                    } else {
                        forward(query.payload) ?: return@execute
                    }
                    writeTun(buildUdpReply(query, response))
                } catch (e: Exception) {
                    Log.w(TAG, "DNS proxy failed for ${query.domain}", e)
                }
            }
            return
        }

        val reset = tcpReset(packet) ?: return
        try {
            writeTun(reset)
        } catch (e: Exception) {
            Log.w(TAG, "TCP reset failed", e)
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

    private fun buildUdpReply(query: DnsPacket, payload: ByteArray): ByteArray {
        return if (query.version == 6) buildIpv6Udp(query, payload) else buildIpv4Udp(query, payload)
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

    private fun buildIpv6Udp(query: DnsPacket, payload: ByteArray): ByteArray {
        val src = InetAddress.getByName(query.dstIp).address
        val dst = InetAddress.getByName(query.srcIp).address
        val udpLen = 8 + payload.size
        val packet = ByteArray(40 + udpLen)
        packet[0] = 0x60
        writeShort(packet, 4, udpLen)
        packet[6] = 17
        packet[7] = 64
        src.copyInto(packet, 8)
        dst.copyInto(packet, 24)
        writeShort(packet, 40, 53)
        writeShort(packet, 42, query.srcPort)
        writeShort(packet, 44, udpLen)
        payload.copyInto(packet, 48)
        val csum = udpChecksum6(src, dst, packet, 40, udpLen)
        writeShort(packet, 46, csum)
        return packet
    }

    private fun tcpReset(packet: ByteArray): ByteArray? {
        if (packet.size < 20) return null
        return when ((packet[0].toInt() ushr 4) and 0xF) {
            4 -> tcpReset4(packet)
            6 -> tcpReset6(packet)
            else -> null
        }
    }

    private fun tcpReset4(packet: ByteArray): ByteArray? {
        val headerLen = (packet[0].toInt() and 0xF) * 4
        if ((packet[9].toInt() and 0xFF) != 6) return null
        if (headerLen < 20 || packet.size < headerLen + 20) return null
        val destPort = readShort(packet, headerLen + 2)
        if (destPort != 443 && destPort != 853) return null
        val flags = packet[headerLen + 13].toInt() and 0xFF
        if (flags and 0x04 != 0) return null
        val dataOff = ((packet[headerLen + 12].toInt() and 0xF0) ushr 4) * 4
        val payloadLen = (packet.size - headerLen - dataOff).coerceAtLeast(0)
        val seq = readU32(packet, headerLen + 4)
        val ack = readU32(packet, headerLen + 8)
        val rstSeq = if (flags and 0x10 != 0) ack else 0L
        var ackNum = (seq + payloadLen) and 0xFFFFFFFFL
        if (flags and 0x02 != 0 || flags and 0x01 != 0) ackNum = (ackNum + 1) and 0xFFFFFFFFL

        val out = ByteArray(40)
        out[0] = 0x45
        writeShort(out, 2, 40)
        writeShort(out, 4, ipId.getAndIncrement() and 0xFFFF)
        out[8] = 64
        out[9] = 6
        packet.copyInto(out, 12, 16, 20)
        packet.copyInto(out, 16, 12, 16)
        writeShort(out, 10, ipChecksum(out, 20))
        writeShort(out, 20, destPort)
        writeShort(out, 22, readShort(packet, headerLen))
        writeU32(out, 24, rstSeq)
        writeU32(out, 28, ackNum)
        out[32] = 0x50
        out[33] = 0x14
        val pseudo = ByteArray(32)
        packet.copyInto(pseudo, 0, 16, 20)
        packet.copyInto(pseudo, 4, 12, 16)
        pseudo[9] = 6
        writeShort(pseudo, 10, 20)
        out.copyInto(pseudo, 12, 20, 40)
        writeShort(out, 36, internetChecksum(pseudo))
        return out
    }

    private fun tcpReset6(packet: ByteArray): ByteArray? {
        val header = ipv6Transport(packet) ?: return null
        if (header.nextHeader != 6 || packet.size < header.offset + 20) return null
        val destPort = readShort(packet, header.offset + 2)
        if (destPort != 443 && destPort != 853) return null
        val flags = packet[header.offset + 13].toInt() and 0xFF
        if (flags and 0x04 != 0) return null
        val dataOff = ((packet[header.offset + 12].toInt() and 0xF0) ushr 4) * 4
        val payloadLen = (packet.size - header.offset - dataOff).coerceAtLeast(0)
        val seq = readU32(packet, header.offset + 4)
        val ack = readU32(packet, header.offset + 8)
        val rstSeq = if (flags and 0x10 != 0) ack else 0L
        var ackNum = (seq + payloadLen) and 0xFFFFFFFFL
        if (flags and 0x02 != 0 || flags and 0x01 != 0) ackNum = (ackNum + 1) and 0xFFFFFFFFL

        val out = ByteArray(60)
        out[0] = 0x60
        writeShort(out, 4, 20)
        out[6] = 6
        out[7] = 64
        packet.copyInto(out, 8, 24, 40)
        packet.copyInto(out, 24, 8, 24)
        writeShort(out, 40, destPort)
        writeShort(out, 42, readShort(packet, header.offset))
        writeU32(out, 44, rstSeq)
        writeU32(out, 48, ackNum)
        out[52] = 0x50
        out[53] = 0x14
        val src = out.copyOfRange(8, 24)
        val dst = out.copyOfRange(24, 40)
        writeShort(out, 56, tcpChecksum6(src, dst, out, 40, 20))
        return out
    }

    private data class DnsPacket(
        val version: Int,
        val srcIp: String,
        val dstIp: String,
        val srcPort: Int,
        val domain: String,
        val payload: ByteArray,
    )

    private data class TransportHeader(val nextHeader: Int, val offset: Int)

    companion object {
        private const val TAG = "GuardianVpn"
        private val UPSTREAM = arrayOf("1.1.1.1", "8.8.8.8")
        private val DOH_BOOTSTRAP = setOf(
            "dns.google",
            "dns.google.com",
            "chrome.cloudflare-dns.com",
            "mozilla.cloudflare-dns.com",
            "cloudflare-dns.com",
            "one.one.one.one",
            "dns.cloudflare.com",
            "dns.quad9.net",
            "dns9.quad9.net",
            "dns.adguard-dns.com",
            "dns.nextdns.io",
            "doh.opendns.com",
        )

        private fun isDohBootstrap(domain: String): Boolean = DOH_BOOTSTRAP.contains(domain)

        private fun parseDnsQuery(packet: ByteArray): DnsPacket? {
            val transport = udp53(packet) ?: return null
            val payload = packet.copyOfRange(transport.offset + 8, transport.end)
            val domain = parseQName(payload) ?: return null
            return DnsPacket(
                transport.version,
                transport.srcIp,
                transport.dstIp,
                transport.srcPort,
                domain,
                payload,
            )
        }

        private data class Udp53(
            val version: Int,
            val srcIp: String,
            val dstIp: String,
            val srcPort: Int,
            val offset: Int,
            val end: Int,
        )

        private fun udp53(packet: ByteArray): Udp53? {
            if (packet.size < 20) return null
            val version = (packet[0].toInt() ushr 4) and 0xF
            if (version == 4) {
                if ((packet[9].toInt() and 0xFF) != 17) return null
                val headerLen = (packet[0].toInt() and 0xF) * 4
                val declared = readShort(packet, 2)
                val end = if (declared in (headerLen + 8 + 12)..packet.size) declared else packet.size
                if (headerLen < 20 || end < headerLen + 8 + 12) return null
                if (readShort(packet, headerLen + 2) != 53) return null
                return Udp53(
                    4,
                    ipv4String(packet, 12),
                    ipv4String(packet, 16),
                    readShort(packet, headerLen),
                    headerLen,
                    end,
                )
            }
            if (version != 6) return null
            val header = ipv6Transport(packet) ?: return null
            if (header.nextHeader != 17 || packet.size < header.offset + 8 + 12) return null
            if (readShort(packet, header.offset + 2) != 53) return null
            return Udp53(
                6,
                ipString(packet, 8, 16),
                ipString(packet, 24, 16),
                readShort(packet, header.offset),
                header.offset,
                packet.size,
            )
        }

        private fun ipv6Transport(packet: ByteArray): TransportHeader? {
            if (packet.size < 40) return null
            var next = packet[6].toInt() and 0xFF
            var offset = 40
            var hops = 0
            while (next == 0 || next == 43 || next == 60) {
                if (hops++ > 4 || offset + 2 > packet.size) return null
                val hdrLen = ((packet[offset + 1].toInt() and 0xFF) * 8) + 8
                next = packet[offset].toInt() and 0xFF
                offset += hdrLen
            }
            if (offset > packet.size) return null
            return TransportHeader(next, offset)
        }

        private fun parseQName(payload: ByteArray): String? {
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

        private fun ipString(packet: ByteArray, offset: Int, length: Int): String {
            return InetAddress.getByAddress(packet.copyOfRange(offset, offset + length)).hostAddress ?: ""
        }

        private fun ipv4Bytes(ip: String): ByteArray {
            return ip.split('.').map { it.toInt().toByte() }.toByteArray()
        }

        private fun readShort(data: ByteArray, offset: Int): Int {
            return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
        }

        private fun readU32(data: ByteArray, offset: Int): Long {
            return ((data[offset].toLong() and 0xFF) shl 24) or
                ((data[offset + 1].toLong() and 0xFF) shl 16) or
                ((data[offset + 2].toLong() and 0xFF) shl 8) or
                (data[offset + 3].toLong() and 0xFF)
        }

        private fun writeShort(data: ByteArray, offset: Int, value: Int) {
            data[offset] = ((value ushr 8) and 0xFF).toByte()
            data[offset + 1] = (value and 0xFF).toByte()
        }

        private fun writeU32(data: ByteArray, offset: Int, value: Long) {
            data[offset] = ((value ushr 24) and 0xFF).toByte()
            data[offset + 1] = ((value ushr 16) and 0xFF).toByte()
            data[offset + 2] = ((value ushr 8) and 0xFF).toByte()
            data[offset + 3] = (value and 0xFF).toByte()
        }

        private fun ipChecksum(data: ByteArray, length: Int): Int {
            return internetChecksum(data.copyOf(length))
        }

        private fun internetChecksum(buffer: ByteArray): Int {
            var sum = 0
            var index = 0
            while (index + 1 < buffer.size) {
                sum += ((buffer[index].toInt() and 0xFF) shl 8) or (buffer[index + 1].toInt() and 0xFF)
                index += 2
            }
            if (index < buffer.size) sum += (buffer[index].toInt() and 0xFF) shl 8
            while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
            return sum.inv() and 0xFFFF
        }

        private fun udpChecksum6(src: ByteArray, dst: ByteArray, packet: ByteArray, offset: Int, udpLen: Int): Int {
            val pseudo = ByteArray(40 + udpLen)
            src.copyInto(pseudo, 0)
            dst.copyInto(pseudo, 16)
            writeU32(pseudo, 32, udpLen.toLong())
            pseudo[39] = 17
            packet.copyInto(pseudo, 40, offset, offset + udpLen)
            val sum = internetChecksum(pseudo)
            return if (sum == 0) 0xFFFF else sum
        }

        private fun tcpChecksum6(src: ByteArray, dst: ByteArray, packet: ByteArray, offset: Int, tcpLen: Int): Int {
            val pseudo = ByteArray(40 + tcpLen)
            src.copyInto(pseudo, 0)
            dst.copyInto(pseudo, 16)
            writeU32(pseudo, 32, tcpLen.toLong())
            pseudo[39] = 6
            packet.copyInto(pseudo, 40, offset, offset + tcpLen)
            return internetChecksum(pseudo)
        }
    }
}
