package com.leadwave;

import android.content.Intent;
import android.net.Uri;
import android.telecom.TelecomManager;
import android.os.Build;
import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableNativeMap;

import com.facebook.react.bridge.UiThreadUtil;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class PhoneModule extends ReactContextBaseJavaModule {
    private TelephonyManager telephonyManager;
    private MyPhoneStateListener phoneStateListener;
    private static boolean isCallActive = false;

    // Call tracking fields
    private static String lastRingingNumber = null;
    private static long callStartTime = 0;
    private static boolean wasRinging = false;  // true if call came in as ringing (incoming)
    private static boolean wasOffhook = false;  // true if call was active/offhook

    private static final String PREFS_NAME = "LeadwaveCallPrefs";
    private static final String PREF_PENDING_PHONE = "pending_phone";
    private static final String PREF_PENDING_DURATION = "pending_duration";
    private static final String PREF_PENDING_TYPE = "pending_type";
    private static final String PREF_HAS_PENDING = "has_pending";

    PhoneModule(ReactApplicationContext context) {
        super(context);
        CallService.reactContext = context;
        telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                phoneStateListener = new MyPhoneStateListener();
                try {
                    telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
                } catch (SecurityException e) {
                    // Permission not granted yet. Will be handled when permissions are requested.
                }
            }
        });
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (telephonyManager != null && phoneStateListener != null) {
                    telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
                }
            }
        });
    }

    @Override
    public String getName() {
        return "PhoneModule";
    }

    private class MyPhoneStateListener extends PhoneStateListener {
        @Override
        public void onCallStateChanged(int state, String phoneNumber) {
            super.onCallStateChanged(state, phoneNumber);
            WritableMap params = Arguments.createMap();
            
            switch (state) {
                case TelephonyManager.CALL_STATE_RINGING:
                    // Incoming call ringing — capture the number
                    if (phoneNumber != null && !phoneNumber.isEmpty()) {
                        lastRingingNumber = phoneNumber;
                    }
                    wasRinging = true;
                    wasOffhook = false;
                    params.putInt("state", 2); // STATE_RINGING
                    if (phoneNumber != null) params.putString("number", phoneNumber);
                    sendEvent("CallStateChanged", params);
                    break;

                case TelephonyManager.CALL_STATE_OFFHOOK:
                    // Call started or active
                    if (!isCallActive) {
                        isCallActive = true;
                        callStartTime = System.currentTimeMillis();
                        // Capture number for outgoing calls (phoneNumber may be empty here)
                        if (!wasRinging && phoneNumber != null && !phoneNumber.isEmpty()) {
                            lastRingingNumber = phoneNumber;
                        }
                        wasOffhook = true;
                        params.putInt("state", 4); // Simulate STATE_ACTIVE
                        sendEvent("CallStateChanged", params);
                        // Trigger recording if not already started by InCallService
                        CallService.startRecordingManual(lastRingingNumber);
                    }
                    break;

                case TelephonyManager.CALL_STATE_IDLE:
                    // Call ended
                    if (isCallActive || wasRinging) {
                        long durationMs = (callStartTime > 0) ? (System.currentTimeMillis() - callStartTime) : 0;
                        int durationSec = (int)(durationMs / 1000);

                        // Determine call type
                        String callType;
                        if (wasRinging && wasOffhook) {
                            callType = "incoming"; // answered incoming
                        } else if (wasRinging && !wasOffhook) {
                            callType = "missed";   // ringing but never answered
                        } else {
                            callType = "outgoing"; // offhook without ringing = outgoing
                        }

                        String endedPhone = lastRingingNumber != null ? lastRingingNumber : "";

                        if (isCallActive) {
                            isCallActive = false;
                            WritableMap stateParams = Arguments.createMap();
                            stateParams.putInt("state", 7); // Simulate STATE_DISCONNECTED
                            sendEvent("CallStateChanged", stateParams);
                            CallService.stopRecordingManual();
                        }

                        // Emit CallEnded event for the popup
                        if (!endedPhone.isEmpty()) {
                            WritableMap endParams = Arguments.createMap();
                            endParams.putString("phoneNumber", endedPhone);
                            endParams.putInt("duration", durationSec);
                            endParams.putString("callType", callType);
                            sendEvent("CallEnded", endParams);

                            // Persist to SharedPreferences for background recovery
                            try {
                                SharedPreferences prefs = getReactApplicationContext()
                                    .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                                prefs.edit()
                                    .putString(PREF_PENDING_PHONE, endedPhone)
                                    .putInt(PREF_PENDING_DURATION, durationSec)
                                    .putString(PREF_PENDING_TYPE, callType)
                                    .putBoolean(PREF_HAS_PENDING, true)
                                    .apply();
                            } catch (Exception e) {
                                android.util.Log.w("PhoneModule", "Failed to save pending call", e);
                            }
                        }

                        // Reset tracking
                        wasRinging = false;
                        wasOffhook = false;
                        lastRingingNumber = null;
                        callStartTime = 0;
                    }
                    break;
            }
        }
    }

    private void sendEvent(final String eventName, final WritableMap params) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (getReactApplicationContext().hasActiveCatalystInstance()) {
                    getReactApplicationContext()
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(eventName, params);
                }
            }
        });
    }

    @ReactMethod
    public void makeCall(String phoneNumber) {
        isCallActive = false; // Reset for new call
        Intent intent = new Intent(Intent.ACTION_CALL);
        intent.setData(Uri.parse("tel:" + phoneNumber));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);
    }

    @ReactMethod
    public void endCall() {
        // 1. Try to end via InCallService (works if Default Dialer)
        boolean sentToService = CallService.endCall();
        
        if (!sentToService) {
             // If we couldn't send to service, we are likely not the default dialer.
             // We can't programmatically end the call on modern Android without being default.
             UiThreadUtil.runOnUiThread(new Runnable() {
                 @Override
                 public void run() {
                     android.widget.Toast.makeText(getReactApplicationContext(), "Cannot end call: App is not Default Dialer", android.widget.Toast.LENGTH_SHORT).show();
                 }
             });
        }

        // 2. Force stop manual recording and UI state (works if Non-Default Dialer)
        // This ensures the app doesn't get stuck in "Connected" state if we can't kill the system call.
        if (isCallActive) {
            isCallActive = false;
            WritableMap params = Arguments.createMap();
            params.putInt("state", 7); // Simulate STATE_DISCONNECTED
            sendEvent("CallStateChanged", params);
            CallService.stopRecordingManual();
        }
    }

    @ReactMethod
    public void acceptCall() {
        CallService.answerCall();
    }

    @ReactMethod
    public void rejectCall() {
        CallService.rejectCall();
    }

    @ReactMethod
    public void setMute(boolean muted) {
        CallService.setMute(muted);
    }

    @ReactMethod
    public void setSpeaker(boolean on) {
        CallService.setSpeaker(on);
    }

    @ReactMethod
    public void setHold(boolean hold) {
        CallService.toggleHold(hold);
    }

    @ReactMethod
    public void checkDefaultDialer(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            TelecomManager telecomManager = (TelecomManager) getReactApplicationContext().getSystemService(Context.TELECOM_SERVICE);
            String packageName = getReactApplicationContext().getPackageName();
            if (telecomManager != null) {
                promise.resolve(packageName.equals(telecomManager.getDefaultDialerPackage()));
            } else {
                promise.resolve(false);
            }
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void openDialerSettings() {
        android.app.Activity activity = getCurrentActivity();
        if (activity != null) {
            try {
                Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getReactApplicationContext().getPackageName());
                activity.startActivity(intent);
            } catch (Exception e) {
                // Fallback to general default apps settings if direct prompt fails
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
            }
        }
    }
    @ReactMethod
    public void startCallListener() {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (phoneStateListener == null) {
                        phoneStateListener = new MyPhoneStateListener();
                    }
                    telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
                } catch (SecurityException e) {
                    // Still no permission
                }
            }
        });
    }
    @ReactMethod
    public void addListener(String eventName) {
        // Required for React Native built-in Event Emitter Calls
    }

    /**
     * Reads and clears any pending call stored in SharedPreferences.
     * Called by HistoryScreen when the app becomes active / is focused.
     * Returns { phoneNumber, duration, callType } or null.
     */
    @ReactMethod
    public void getPendingCall(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean hasPending = prefs.getBoolean(PREF_HAS_PENDING, false);
            if (!hasPending) {
                promise.resolve(null);
                return;
            }
            String phone = prefs.getString(PREF_PENDING_PHONE, "");
            int duration = prefs.getInt(PREF_PENDING_DURATION, 0);
            String callType = prefs.getString(PREF_PENDING_TYPE, "incoming");

            // Clear the pending record so it doesn't show again
            prefs.edit()
                .remove(PREF_PENDING_PHONE)
                .remove(PREF_PENDING_DURATION)
                .remove(PREF_PENDING_TYPE)
                .putBoolean(PREF_HAS_PENDING, false)
                .apply();

            WritableMap result = Arguments.createMap();
            result.putString("phoneNumber", phone);
            result.putInt("duration", duration);
            result.putString("callType", callType);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERR_PENDING_CALL", e);
        }
    }

    @ReactMethod
    public void getCurrentCall(Promise promise) {
        try {
            WritableMap params = Arguments.createMap();
            // detailed check via CallService which has the actual Call object
            if (CallService.instance != null && CallService.instance.currentCall != null) {
                 int state = CallService.instance.currentCall.getState();
                 params.putInt("state", state);
                 
                 String number = "";
                 if (CallService.instance.currentCall.getDetails() != null && 
                     CallService.instance.currentCall.getDetails().getHandle() != null) {
                      number = CallService.instance.currentCall.getDetails().getHandle().getSchemeSpecificPart();
                 }
                 params.putString("number", number);
                 promise.resolve(params);
                 return;
            }

            // Fallback to TelephonyManager listener state
            if (isCallActive) {
                params.putInt("state", 4); // ACTIVE
                // We don't have the number easily here if we didn't save it, 
                // but we can try to resolve it or just return unknown.
                params.putString("number", "Unknown"); 
                promise.resolve(params);
            } else {
                promise.resolve(null); // No active call
            }
        } catch (Exception e) {
            promise.reject("ERR_GET_CALL", e);
        }
    }
}
