package com.guardian.app

import android.os.Build
import android.os.Bundle
import com.guardian.app.vpn.VpnPermissionCallback
import com.guardian.app.vpn.GuardianVpnModule
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode == VpnPermissionCallback.REQUEST_CODE) {
      val module = reactInstanceManager?.currentReactContext
          ?.getNativeModule(GuardianVpnModule::class.java)
      if (module != null) {
        VpnPermissionCallback.onActivityResult(resultCode, module)
      }
    }
  }
}
