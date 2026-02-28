package com.leadwave;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.telephony.TelephonyManager;
import android.util.Log;

/**
 * BackgroundCallReceiver
 *
 * A BroadcastReceiver that listens to android.intent.action.PHONE_STATE.
 * It tracks call lifecycle and persists ended-call info (phone, duration, callType)
 * to SharedPreferences when the app is in the background or closed.
 *
 * When the app next comes to the foreground, HistoryScreen reads and clears this
 * pending record via PhoneModule.getPendingCall() and shows the CallEndPopup.
 *
 * This works even if the JS engine is not running, because BroadcastReceivers
 * are invoked by the Android OS regardless of app state.
 */
public class BackgroundCallReceiver extends BroadcastReceiver {

    private static final String TAG = "BackgroundCallReceiver";
    private static final String PREFS_NAME = "LeadwaveCallPrefs";
    private static final String PREF_PENDING_PHONE    = "pending_phone";
    private static final String PREF_PENDING_DURATION = "pending_duration";
    private static final String PREF_PENDING_TYPE     = "pending_type";
    private static final String PREF_HAS_PENDING      = "has_pending";

    // Per-receiver state (survives across broadcasts in the same process)
    private static String    lastNumber    = null;
    private static long      startTime     = 0;
    private static boolean   wasRinging    = false;
    private static boolean   wasOffhook    = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) {
            return;
        }

        String state      = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

        if (state == null) return;

        Log.d(TAG, "Phone state: " + state + ", number: " + phoneNumber);

        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
            if (phoneNumber != null && !phoneNumber.isEmpty()) {
                lastNumber = phoneNumber;
            }
            wasRinging = true;
            wasOffhook = false;

        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
            wasOffhook = true;
            startTime  = System.currentTimeMillis();
            // Outgoing call: number may be in intent or already captured
            if (!wasRinging && phoneNumber != null && !phoneNumber.isEmpty()) {
                lastNumber = phoneNumber;
            }

        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
            // Only write pending if we had some call activity
            if ((wasRinging || wasOffhook) && lastNumber != null && !lastNumber.isEmpty()) {
                int durationSec = 0;
                if (startTime > 0) {
                    durationSec = (int) ((System.currentTimeMillis() - startTime) / 1000);
                }

                String callType;
                if (wasRinging && wasOffhook) {
                    callType = "incoming";
                } else if (wasRinging) {
                    callType = "missed";
                } else {
                    callType = "outgoing";
                }

                // Write to SharedPreferences (safe to call without JS engine)
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit()
                     .putString(PREF_PENDING_PHONE, lastNumber)
                     .putInt(PREF_PENDING_DURATION, durationSec)
                     .putString(PREF_PENDING_TYPE, callType)
                     .putBoolean(PREF_HAS_PENDING, true)
                     .apply();

                Log.d(TAG, "Pending call saved: " + lastNumber + " (" + callType + ", " + durationSec + "s)");
            }

            // Reset
            lastNumber = null;
            startTime  = 0;
            wasRinging = false;
            wasOffhook = false;
        }
    }
}
