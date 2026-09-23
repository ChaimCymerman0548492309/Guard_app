package com.guardian.app.vpn

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/** Runs one JS sync pass while the screen is off. The task itself skips an empty queue. */
class GuardianSyncTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        return HeadlessJsTaskConfig(
            "GuardianBackgroundSync",
            Arguments.createMap(),
            60_000,
            true,
        )
    }
}
