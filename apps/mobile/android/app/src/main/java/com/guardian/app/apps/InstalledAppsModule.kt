package com.guardian.app.apps

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Lists user-visible launcher apps via PackageManager intent queries.
 * Does not require QUERY_ALL_PACKAGES — only apps with a launcher icon are returned.
 */
class InstalledAppsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "InstalledApps"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun getLauncherApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

            val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.queryIntentActivities(
                    launcherIntent,
                    PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_DEFAULT_ONLY.toLong()),
                )
            } else {
                @Suppress("DEPRECATION")
                pm.queryIntentActivities(launcherIntent, PackageManager.MATCH_DEFAULT_ONLY)
            }

            val seen = mutableSetOf<String>()
            val apps = Arguments.createArray()

            for (resolveInfo in resolveInfos) {
                val packageName = resolveInfo.activityInfo.packageName
                if (!seen.add(packageName)) continue

                val appInfo = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        pm.getApplicationInfo(
                            packageName,
                            PackageManager.ApplicationInfoFlags.of(0),
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        pm.getApplicationInfo(packageName, 0)
                    }
                } catch (_: PackageManager.NameNotFoundException) {
                    continue
                }

                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                val label = resolveInfo.loadLabel(pm)?.toString() ?: packageName

                val map = Arguments.createMap().apply {
                    putString("packageName", packageName)
                    putString("displayName", label)
                    putBoolean("isSystem", isSystem)
                }
                apps.pushMap(map)
            }

            promise.resolve(apps)
        } catch (e: Exception) {
            promise.reject("INSTALLED_APPS_FAILED", e.message, e)
        }
    }
}
