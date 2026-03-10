package com.leadwave

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat

class CallReceiver : BroadcastReceiver() {

    companion object {
        private var lastState: String? = ""
    }

    override fun onReceive(context: Context, intent: Intent) {

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)

        // 1. When phone starts ringing, lookup caller ID via Headless JS
        if (TelephonyManager.EXTRA_STATE_RINGING == state && lastState != state) {
            val phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
            if (!phoneNumber.isNullOrEmpty()) {
                try {
                    val serviceIntent = Intent(context, IncomingCallLookupTaskService::class.java)
                    serviceIntent.putExtra("phoneNumber", phoneNumber)
                    context.startService(serviceIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        // 2. When call ends, we used to show generic overlay, but now we'll optionally hide it.
        // The Headless JS task handles fetching data and opening the overlay with real Lead Data.
        if (TelephonyManager.EXTRA_STATE_IDLE == state &&
            lastState != TelephonyManager.EXTRA_STATE_IDLE
        ) {
            // Close the Caller ID overlay when call terminates
            try {
               val serviceIntent = Intent(context, OverlayService::class.java)
               serviceIntent.action = "CLOSE_OVERLAY"
               context.startService(serviceIntent)
            } catch (e: Exception) {
               e.printStackTrace()
            }
        }

        lastState = state
    }
}