package com.ydbabatrack

import android.content.Intent
import android.telecom.TelecomManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RoleManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "RoleManagerModule"
    }

    @ReactMethod
    fun requestDefaultDialerRole() {
        val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
        intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, reactApplicationContext.packageName)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun setOnboarded(value: Boolean) {
        val sharedPref = reactApplicationContext.getSharedPreferences("AppState", android.content.Context.MODE_PRIVATE)
        with (sharedPref.edit()) {
            putBoolean("hasOnboarded", value)
            apply()
        }
    }

    @ReactMethod
    fun isOnboarded(promise: com.facebook.react.bridge.Promise) {
        val sharedPref = reactApplicationContext.getSharedPreferences("AppState", android.content.Context.MODE_PRIVATE)
        promise.resolve(sharedPref.getBoolean("hasOnboarded", false))
    }
}
