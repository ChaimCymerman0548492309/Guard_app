package com.guardian.app.vpn

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONObject
import com.facebook.react.modules.core.DeviceEventManagerModule

class GuardianVpnModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "GuardianVpn"
        const val EVENT_NETWORK = "GuardianVpnNetworkEvent"
    }

    private val activityEventListener = object : ActivityEventListener {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == VpnPermissionCallback.REQUEST_CODE) {
                VpnPermissionCallback.onActivityResult(resultCode, this@GuardianVpnModule)
            }
        }

        override fun onNewIntent(intent: Intent) {
            // no-op
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
        GuardianVpnService.eventListener = { payload ->
            val map = Arguments.createMap().apply {
                putString("id", payload.id)
                putString("packageName", payload.packageName)
                putString("domain", payload.domain)
                putDouble("bytesSent", payload.bytesSent.toDouble())
                putDouble("bytesReceived", payload.bytesReceived.toDouble())
                putString("direction", payload.direction)
                putString("protocol", payload.protocol)
                putDouble("timestamp", payload.timestamp.toDouble())
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_NETWORK, map)
        }
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isSupported(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        val map = Arguments.createMap()
        val runtimeStatus = GuardianVpnService.status
        val status = when (runtimeStatus) {
            GuardianVpnService.VpnRuntimeStatus.ACTIVE -> "ACTIVE"
            GuardianVpnService.VpnRuntimeStatus.STARTING -> "STARTING"
            GuardianVpnService.VpnRuntimeStatus.ERROR -> "ERROR"
            GuardianVpnService.VpnRuntimeStatus.STOPPED -> "STOPPED"
        }
        map.putString("status", status)
        map.putBoolean("isSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)
        GuardianVpnService.lastError?.let { map.putString("errorMessage", it) }
        val stats = Arguments.createMap().apply {
            putDouble("packetsProcessed", GuardianVpnService.getPacketsProcessed().toDouble())
            putDouble("eventsEmitted", GuardianVpnService.getEventsEmitted().toDouble())
            putInt("blockedDomains", GuardianVpnService.getBlockedDomainCount())
        }
        map.putMap("stats", stats)
        promise.resolve(map)
    }

    @ReactMethod
    fun start(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            promise.reject("UNSUPPORTED", "VPN requires Android 5.0+")
            return
        }

        val prepareIntent = VpnService.prepare(reactContext)
        if (prepareIntent != null) {
            val activity = reactContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Cannot request VPN permission without active activity")
                return
            }
            VpnPermissionCallback.pendingPromise = promise
            @Suppress("DEPRECATION")
            reactContext.startActivityForResult(prepareIntent, VpnPermissionCallback.REQUEST_CODE, null)
            return
        }

        startVpnService(promise)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        val intent = Intent(reactContext, GuardianVpnService::class.java).apply {
            action = GuardianVpnService.ACTION_STOP
        }
        reactContext.startService(intent)
        promise.resolve(null)
    }

    @ReactMethod
    fun peekPendingEvents(promise: Promise) {
        val queued = VpnEventQueue.peek(reactContext)
        val result = Arguments.createArray()
        for (index in 0 until queued.length()) {
            val row = queued.optJSONObject(index) ?: continue
            result.pushMap(row.toWritableMap())
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun ackPendingEvents(ids: ReadableArray, promise: Promise) {
        val acknowledged = mutableSetOf<String>()
        for (index in 0 until ids.size()) {
            ids.getString(index)?.let { acknowledged.add(it) }
        }
        VpnEventQueue.ack(reactContext, acknowledged)
        promise.resolve(null)
    }

    @ReactMethod
    fun blockDomain(domain: String, promise: Promise) {
        // Best-effort: drops DNS/TCP packets matching the domain in the VPN layer.
        // DoH/DoT and direct-IP connections may bypass this blocklist.
        val added = GuardianVpnService.blockDomain(reactContext.applicationContext, domain)
        promise.resolve(added)
    }

    internal fun startVpnService(promise: Promise) {
        requestBatteryExemption()
        try {
            val intent = Intent(reactContext, GuardianVpnService::class.java).apply {
                action = GuardianVpnService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message, e)
        }
    }

    private fun requestBatteryExemption() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        try {
            val power = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (power.isIgnoringBatteryOptimizations(reactContext.packageName)) return
            val activity = reactContext.currentActivity ?: return
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
            }
            activity.startActivity(intent)
        } catch (_: Exception) {
        }
    }

    override fun invalidate() {
        reactContext.removeActivityEventListener(activityEventListener)
        super.invalidate()
    }
}

private fun JSONObject.toWritableMap() = Arguments.createMap().apply {
    putString("id", optString("id"))
    putString("packageName", optString("packageName"))
    putString("domain", optString("domain"))
    putDouble("bytesSent", optLong("bytesSent").toDouble())
    putDouble("bytesReceived", optLong("bytesReceived").toDouble())
    putString("direction", optString("direction"))
    putString("protocol", optString("protocol"))
    putDouble("timestamp", optLong("timestamp").toDouble())
}

object VpnPermissionCallback {
    const val REQUEST_CODE = 9901
    var pendingPromise: Promise? = null

    fun onActivityResult(resultCode: Int, module: GuardianVpnModule) {
        val promise = pendingPromise ?: return
        pendingPromise = null
        if (resultCode == Activity.RESULT_OK) {
            module.startVpnService(promise)
        } else {
            promise.reject("PERMISSION_DENIED", "VPN permission was not granted")
        }
    }
}
