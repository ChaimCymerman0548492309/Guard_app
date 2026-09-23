package com.guardian.app.vpn

import android.net.VpnService
import android.util.Log
import java.io.OutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.ArrayDeque
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Forwards captured IP packets to the real network through protected sockets.
 * Writing them back into the TUN interface loops traffic and Android revokes the VPN.
 */
class PacketRelay(
    private val vpn: VpnService,
    private val output: OutputStream,
) {
    private val tcpExecutor = Executors.newSingleThreadExecutor()
    private val udpExecutor = Executors.newCachedThreadPool()
    private val tcpSessions = ConcurrentHashMap<String, TcpSession>()
    private val ipId = AtomicInteger(1)

    fun forward(packet: ByteArray) {
        val copy = packet.copyOf()
        tcpExecutor.execute {
            try {
                dispatch(copy)
            } catch (e: Exception) {
                Log.w(TAG, "Dropping packet", e)
            }
        }
    }

    fun close() {
        tcpSessions.values.forEach { it.close() }
        tcpSessions.clear()
        tcpExecutor.shutdownNow()
        udpExecutor.shutdownNow()
    }

    private fun dispatch(packet: ByteArray) {
        if (packet.size < 20) return
        val version = (packet[0].toInt() ushr 4) and 0xF
        if (version != 4) return

        val headerLen = (packet[0].toInt() and 0xF) * 4
        if (headerLen < 20 || packet.size < headerLen) return
        val protocol = packet[9].toInt() and 0xFF
        val srcIp = ipv4String(packet, 12)
        val dstIp = ipv4String(packet, 16)

        when (protocol) {
            6 -> handleTcp(packet, headerLen, srcIp, dstIp)
            17 -> handleUdp(packet, headerLen, srcIp, dstIp)
        }
    }

    private fun handleUdp(packet: ByteArray, ipHeaderLen: Int, srcIp: String, dstIp: String) {
        if (packet.size < ipHeaderLen + 8) return
        val srcPort = readShort(packet, ipHeaderLen)
        val dstPort = readShort(packet, ipHeaderLen + 2)
        val payload = packet.copyOfRange(ipHeaderLen + 8, packet.size)
        udpExecutor.execute {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket()
                if (!vpn.protect(socket)) return@execute
                socket.soTimeout = 4_000
                val dest = InetAddress.getByAddress(ipv4Bytes(dstIp))
                socket.send(DatagramPacket(payload, payload.size, dest, dstPort))
                val buffer = ByteArray(1500)
                val response = DatagramPacket(buffer, buffer.size)
                socket.receive(response)
                val reply = buildIpv4Udp(
                    srcIp = ipv4Bytes(dstIp),
                    dstIp = ipv4Bytes(srcIp),
                    srcPort = dstPort,
                    dstPort = srcPort,
                    payload = response.data.copyOf(response.length),
                )
                writeTun(reply)
            } catch (_: Exception) {
            } finally {
                socket?.close()
            }
        }
    }

    private fun handleTcp(packet: ByteArray, ipHeaderLen: Int, srcIp: String, dstIp: String) {
        if (packet.size < ipHeaderLen + 20) return
        val srcPort = readShort(packet, ipHeaderLen)
        val dstPort = readShort(packet, ipHeaderLen + 2)
        val seq = readInt(packet, ipHeaderLen + 4)
        val dataOffset = ((packet[ipHeaderLen + 12].toInt() ushr 4) and 0xF) * 4
        val flags = packet[ipHeaderLen + 13].toInt() and 0xFF
        val payloadStart = ipHeaderLen + dataOffset
        if (payloadStart > packet.size) return
        val payload = packet.copyOfRange(payloadStart, packet.size)
        val key = "$srcIp:$srcPort->$dstIp:$dstPort"
        val syn = flags and TCP_SYN != 0
        val ack = flags and TCP_ACK != 0
        val fin = flags and TCP_FIN != 0
        val rst = flags and TCP_RST != 0

        if (syn && !ack) {
            if (tcpSessions.containsKey(key)) return
            val session = TcpSession(srcIp, srcPort, dstIp, dstPort, seq)
            tcpSessions[key] = session
            Thread {
                try {
                    session.connect(vpn)
                } catch (e: Exception) {
                    Log.w(TAG, "TCP connect failed $dstIp:$dstPort", e)
                    tcpSessions.remove(key)
                    session.sendRst()
                    session.close()
                }
            }.apply { isDaemon = true }.start()
            return
        }

        val session = tcpSessions[key] ?: return
        if (rst) {
            tcpSessions.remove(key)
            session.close()
            return
        }
        if (payload.isNotEmpty()) {
            session.acceptFromClient(seq, payload)
        } else if (ack) {
            session.noteAck(seq, fin)
        }
        if (fin) {
            session.finishFromClient()
            tcpSessions.remove(key)
        }
    }

    private fun writeTun(packet: ByteArray) {
        synchronized(output) {
            output.write(packet)
            output.flush()
        }
    }

    private fun buildIpv4Udp(
        srcIp: ByteArray,
        dstIp: ByteArray,
        srcPort: Int,
        dstPort: Int,
        payload: ByteArray,
    ): ByteArray {
        val udpLen = 8 + payload.size
        val total = 20 + udpLen
        val packet = ByteArray(total)
        packet[0] = 0x45
        writeShort(packet, 2, total)
        writeShort(packet, 4, ipId.getAndIncrement() and 0xFFFF)
        packet[8] = 64
        packet[9] = 17
        srcIp.copyInto(packet, 12)
        dstIp.copyInto(packet, 16)
        writeShort(packet, 10, ipChecksum(packet, 0, 20))
        writeShort(packet, 20, srcPort)
        writeShort(packet, 22, dstPort)
        writeShort(packet, 24, udpLen)
        payload.copyInto(packet, 28)
        return packet
    }

    private inner class TcpSession(
        private val srcIp: String,
        private val srcPort: Int,
        private val dstIp: String,
        private val dstPort: Int,
        clientIsn: Long,
    ) {
        private val pending = ArrayDeque<ByteArray>()
        private val lock = Any()
        private var socket: Socket? = null
        private var ready = false
        private var closed = false
        private var ourSeq = (System.nanoTime() and 0xffffffffL)
        private var clientNext = (clientIsn + 1) and 0xffffffffL

        fun connect(vpnService: VpnService) {
            val created = Socket()
            if (!vpnService.protect(created)) {
                created.close()
                throw IllegalStateException("Could not protect TCP socket")
            }
            created.tcpNoDelay = true
            created.connect(InetSocketAddress(InetAddress.getByAddress(ipv4Bytes(dstIp)), dstPort), 10_000)
            synchronized(lock) {
                if (closed) {
                    created.close()
                    return
                }
                socket = created
                ready = true
                sendTcp(TCP_SYN or TCP_ACK, ByteArray(0), advanceSeq = true)
                for (chunk in pending) {
                    created.getOutputStream().write(chunk)
                }
                pending.clear()
            }
            val input = created.getInputStream()
            val buffer = ByteArray(1400)
            while (!closed) {
                val read = input.read(buffer)
                if (read < 0) break
                if (read == 0) continue
                sendToClient(buffer.copyOf(read))
            }
            if (!closed) {
                sendTcp(TCP_FIN or TCP_ACK, ByteArray(0), advanceSeq = true)
            }
        }

        fun acceptFromClient(seq: Long, payload: ByteArray) {
            synchronized(lock) {
                clientNext = (seq + payload.size) and 0xffffffffL
                val current = socket
                if (ready && current != null) {
                    current.getOutputStream().write(payload)
                    sendTcp(TCP_ACK, ByteArray(0), advanceSeq = false)
                } else {
                    pending.add(payload)
                }
            }
        }

        fun noteAck(seq: Long, fin: Boolean) {
            synchronized(lock) {
                var next = seq
                if (fin) next += 1
                if (next > clientNext) clientNext = next and 0xffffffffL
            }
        }

        fun finishFromClient() {
            synchronized(lock) {
                clientNext = (clientNext + 1) and 0xffffffffL
                try {
                    socket?.shutdownOutput()
                } catch (_: Exception) {
                }
                sendTcp(TCP_FIN or TCP_ACK, ByteArray(0), advanceSeq = true)
            }
        }

        fun sendRst() {
            sendTcp(TCP_RST or TCP_ACK, ByteArray(0), advanceSeq = false)
        }

        fun close() {
            synchronized(lock) {
                closed = true
                try {
                    socket?.close()
                } catch (_: Exception) {
                }
            }
        }

        private fun sendToClient(payload: ByteArray) {
            synchronized(lock) {
                sendTcp(TCP_PSH or TCP_ACK, payload, advanceSeq = true)
            }
        }

        private fun sendTcp(flags: Int, payload: ByteArray, advanceSeq: Boolean) {
            val packet = buildTcpPacket(flags, payload)
            writeTun(packet)
            if (advanceSeq) {
                val extra = if (flags and (TCP_SYN or TCP_FIN) != 0) 1 else 0
                ourSeq = (ourSeq + payload.size + extra) and 0xffffffffL
            }
        }

        private fun buildTcpPacket(flags: Int, payload: ByteArray): ByteArray {
            val tcpLen = 20 + payload.size
            val total = 20 + tcpLen
            val packet = ByteArray(total)
            packet[0] = 0x45
            writeShort(packet, 2, total)
            writeShort(packet, 4, ipId.getAndIncrement() and 0xFFFF)
            packet[6] = 0x40
            packet[8] = 64
            packet[9] = 6
            val src = ipv4Bytes(dstIp)
            val dst = ipv4Bytes(srcIp)
            src.copyInto(packet, 12)
            dst.copyInto(packet, 16)
            writeShort(packet, 10, ipChecksum(packet, 0, 20))
            writeShort(packet, 20, dstPort)
            writeShort(packet, 22, srcPort)
            writeInt(packet, 24, ourSeq)
            writeInt(packet, 28, clientNext)
            packet[32] = 0x50
            packet[33] = flags.toByte()
            writeShort(packet, 34, 65535)
            payload.copyInto(packet, 40)
            writeShort(packet, 36, tcpChecksum(src, dst, packet.copyOfRange(20, total)))
            return packet
        }
    }

    companion object {
        private const val TAG = "GuardianVpn"
        private const val TCP_FIN = 0x01
        private const val TCP_SYN = 0x02
        private const val TCP_RST = 0x04
        private const val TCP_PSH = 0x08
        private const val TCP_ACK = 0x10

        private fun ipv4String(packet: ByteArray, offset: Int): String {
            return "${packet[offset].toInt() and 0xFF}.${packet[offset + 1].toInt() and 0xFF}.${packet[offset + 2].toInt() and 0xFF}.${packet[offset + 3].toInt() and 0xFF}"
        }

        private fun ipv4Bytes(ip: String): ByteArray {
            return ip.split('.').map { it.toInt().toByte() }.toByteArray()
        }

        private fun readShort(data: ByteArray, offset: Int): Int {
            return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
        }

        private fun readInt(data: ByteArray, offset: Int): Long {
            return ((data[offset].toLong() and 0xFF) shl 24) or
                ((data[offset + 1].toLong() and 0xFF) shl 16) or
                ((data[offset + 2].toLong() and 0xFF) shl 8) or
                (data[offset + 3].toLong() and 0xFF)
        }

        private fun writeShort(data: ByteArray, offset: Int, value: Int) {
            data[offset] = ((value ushr 8) and 0xFF).toByte()
            data[offset + 1] = (value and 0xFF).toByte()
        }

        private fun writeInt(data: ByteArray, offset: Int, value: Long) {
            data[offset] = ((value ushr 24) and 0xFF).toByte()
            data[offset + 1] = ((value ushr 16) and 0xFF).toByte()
            data[offset + 2] = ((value ushr 8) and 0xFF).toByte()
            data[offset + 3] = (value and 0xFF).toByte()
        }

        private fun ipChecksum(data: ByteArray, offset: Int, length: Int): Int {
            var sum = 0
            var i = 0
            while (i + 1 < length) {
                sum += ((data[offset + i].toInt() and 0xFF) shl 8) or (data[offset + i + 1].toInt() and 0xFF)
                i += 2
            }
            while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
            return sum.inv() and 0xFFFF
        }

        private fun tcpChecksum(src: ByteArray, dst: ByteArray, tcp: ByteArray): Int {
            var sum = 0
            sum += ((src[0].toInt() and 0xFF) shl 8) or (src[1].toInt() and 0xFF)
            sum += ((src[2].toInt() and 0xFF) shl 8) or (src[3].toInt() and 0xFF)
            sum += ((dst[0].toInt() and 0xFF) shl 8) or (dst[1].toInt() and 0xFF)
            sum += ((dst[2].toInt() and 0xFF) shl 8) or (dst[3].toInt() and 0xFF)
            sum += 6
            sum += tcp.size
            var i = 0
            while (i + 1 < tcp.size) {
                sum += ((tcp[i].toInt() and 0xFF) shl 8) or (tcp[i + 1].toInt() and 0xFF)
                i += 2
            }
            if (i < tcp.size) sum += (tcp[i].toInt() and 0xFF) shl 8
            while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
            return sum.inv() and 0xFFFF
        }
    }
}
