package com.guardian.app.vpn

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** DNS events captured while the UI is suspended. Uploaded later in one batch. */
object VpnEventQueue {
    private const val FILE_NAME = "dns-event-queue.json"
    private const val MAX_EVENTS = 300

    fun enqueue(
        context: Context,
        id: String,
        packageName: String,
        domain: String,
        bytesSent: Long,
        bytesReceived: Long,
        direction: String,
        protocol: String,
        timestamp: Long,
    ) {
        synchronized(this) {
            val items = read(context)
            val row = JSONObject()
                .put("id", id)
                .put("packageName", packageName)
                .put("domain", domain)
                .put("bytesSent", bytesSent)
                .put("bytesReceived", bytesReceived)
                .put("direction", direction)
                .put("protocol", protocol)
                .put("timestamp", timestamp)
            items.put(row)
            while (items.length() > MAX_EVENTS) {
                items.remove(0)
            }
            write(context, items)
        }
    }

    fun peek(context: Context): JSONArray {
        synchronized(this) {
            return read(context)
        }
    }

    fun pendingCount(context: Context): Int {
        synchronized(this) {
            return read(context).length()
        }
    }

    fun ack(context: Context, ids: Set<String>) {
        if (ids.isEmpty()) return
        synchronized(this) {
            val current = read(context)
            val kept = JSONArray()
            for (index in 0 until current.length()) {
                val row = current.optJSONObject(index) ?: continue
                if (!ids.contains(row.optString("id"))) {
                    kept.put(row)
                }
            }
            write(context, kept)
        }
    }

    private fun read(context: Context): JSONArray {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return JSONArray()
        return try {
            JSONArray(file.readText())
        } catch (_: Exception) {
            JSONArray()
        }
    }

    private fun write(context: Context, items: JSONArray) {
        File(context.filesDir, FILE_NAME).writeText(items.toString())
    }
}
