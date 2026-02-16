package com.leadwave;

import android.content.Intent;
import android.os.Bundle;
import android.telecom.Call;
import android.telecom.InCallService;
import android.util.Log;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class CallService extends InCallService {
    public static CallService instance;
    public Call currentCall;

    public static ReactApplicationContext reactContext;

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        Log.d("CallService", "onCallAdded: " + call.toString());
        this.currentCall = call;
        instance = this;
        call.registerCallback(callCallback);
        
        // Notify React Native
        sendEvent("CallAdded", getCallParams(call));
        
        // Ensure UI is shown - DISABLED per user request ("remove that record call initiated on system caller")
        /*
        Intent intent = new Intent(Intent.ACTION_MAIN, null);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setClass(this, MainActivity.class);
        startActivity(intent);
        */
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        currentCall = null;
        stopRecording();
        
        WritableMap params = Arguments.createMap();
        if (lastRecordingPath != null) {
            params.putString("recordingPath", lastRecordingPath);

            // Start Headless JS Task for upload
            Intent service = new Intent(this, RecordingUploadTaskService.class);
            Bundle bundle = new Bundle();
            bundle.putString("path", lastRecordingPath);
            if (call.getDetails() != null && call.getDetails().getHandle() != null) {
                 bundle.putString("phoneNumber", call.getDetails().getHandle().getSchemeSpecificPart());
            }
            service.putExtras(bundle);
            this.startService(service);
        }
        sendEvent("CallRemoved", params);
        call.unregisterCallback(callCallback);
    }

    private android.media.MediaRecorder recorder;
    private boolean isRecording = false;
    private String lastRecordingPath = null; // Added this line

    private final Call.Callback callCallback = new Call.Callback() {
        @Override
        public void onStateChanged(Call call, int state) {
            Log.d("CallService", "onStateChanged: " + state);
            WritableMap params = getCallParams(call);
            sendEvent("CallStateChanged", params);
            
            if (state == Call.STATE_ACTIVE) {
                startRecording(call);
            } else if (state == Call.STATE_DISCONNECTED) {
                stopRecording();
            }
        }
    };

    private void startRecording(Call call) {
        if (isRecording) return;
        
        String number = "unknown";
        if (call.getDetails() != null && call.getDetails().getHandle() != null) {
             number = call.getDetails().getHandle().getSchemeSpecificPart();
        }
        
        // File path: Internal storage or scoped storage
        java.io.File dir = new java.io.File(getExternalFilesDir(null), "recordings");
        if (!dir.exists()) dir.mkdirs();
        
        String fileName = "Call_" + number + "_" + System.currentTimeMillis() + ".mp4";
        java.io.File file = new java.io.File(dir, fileName);
        String finalPath = file.getAbsolutePath();

        if (initRecorder(android.media.MediaRecorder.AudioSource.VOICE_COMMUNICATION, finalPath)) {
            isRecording = true;
            notifyRecordingStart(true, finalPath, null);
            return;
        }

        Log.w("CallService", "VOICE_COMMUNICATION failed, trying MIC");
        
        if (initRecorder(android.media.MediaRecorder.AudioSource.MIC, finalPath)) {
            isRecording = true;
            notifyRecordingStart(true, finalPath, null);
        } else {
             Log.e("CallService", "All recording sources failed");
             notifyRecordingStart(false, null, "Failed to start recording with both VOICE_COMMUNICATION and MIC");
        }
    }

    private boolean initRecorder(int audioSource, String path) {
        try {
            recorder = new android.media.MediaRecorder();
            recorder.setAudioSource(audioSource);
            recorder.setOutputFormat(android.media.MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(android.media.MediaRecorder.AudioEncoder.AAC);
            recorder.setOutputFile(path);
            recorder.prepare();
            recorder.start();
            return true;
        } catch (Exception e) {
            Log.e("CallService", "Failed to init recorder with source: " + audioSource, e);
            if (recorder != null) {
                recorder.reset();
                recorder.release();
                recorder = null;
            }
            return false;
        }
    }

    private void notifyRecordingStart(boolean success, String path, String error) {
        WritableMap params = Arguments.createMap();
        params.putBoolean("isRecording", success);
        if (success) {
            params.putString("path", path);
        } else {
             params.putString("error", error);
        }
        sendEvent("RecordingState", params);
    }

    private void stopRecording() {
        if (!isRecording || recorder == null) return;
        try {
            recorder.stop();
        } catch (Exception e) {
            Log.e("CallService", "Error stopping recorder", e);
        } finally {
            try {
                recorder.reset();
                recorder.release();
            } catch (Exception e) {
                Log.e("CallService", "Error releasing recorder", e);
            }
            recorder = null;
            isRecording = false;
        }
    }

    private WritableMap getCallParams(Call call) {
        WritableMap params = Arguments.createMap();
        params.putInt("state", call.getState());
        
        if (call.getDetails() != null && call.getDetails().getHandle() != null) {
             params.putString("number", call.getDetails().getHandle().getSchemeSpecificPart());
        }
        return params;
    }

    // Manual recording support for non-default-dialer calls
    public static void startRecordingManual(String phoneNumber) {
        if (instance == null) {
            // We need a context, but CallService might not be instantiated if not default dialer.
            // This is a limitation. However, we can use reactContext to get files dir.
            Log.d("CallService", "Manual recording started via reactContext");
            startRecordingWithContext(phoneNumber);
        } else {
             instance.startRecording(null);
        }
    }

    public static void stopRecordingManual() {
        if (instance != null) {
            instance.stopRecording();
        } else {
            stopRecordingContext();
        }
    }

    private static android.media.MediaRecorder manualRecorder;
    private static String manualPath;

    private static void startRecordingWithContext(String number) {
        if (reactContext == null) return;
        try {
            java.io.File dir = new java.io.File(reactContext.getExternalFilesDir(null), "recordings");
            if (!dir.exists()) dir.mkdirs();
            String fileName = "Call_" + (number != null ? number : "unknown") + "_" + System.currentTimeMillis() + ".mp4";
            java.io.File file = new java.io.File(dir, fileName);
            manualPath = file.getAbsolutePath();

            manualRecorder = new android.media.MediaRecorder();
            manualRecorder.setAudioSource(android.media.MediaRecorder.AudioSource.MIC); // Use MIC for wider compatibility
            manualRecorder.setOutputFormat(android.media.MediaRecorder.OutputFormat.MPEG_4);
            manualRecorder.setAudioEncoder(android.media.MediaRecorder.AudioEncoder.AAC);
            manualRecorder.setOutputFile(manualPath);
            manualRecorder.prepare();
            manualRecorder.start();

            WritableMap params = Arguments.createMap();
            params.putBoolean("isRecording", true);
            params.putString("path", manualPath);
            emitStaticEvent("RecordingState", params);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void stopRecordingContext() {
        if (manualRecorder != null) {
            try {
                manualRecorder.stop();
            } catch (Exception e) {
                Log.e("CallService", "Error stopping manual recorder", e);
            } finally {
                try {
                    manualRecorder.reset();
                    manualRecorder.release();
                } catch (Exception e) {
                   Log.e("CallService", "Error resetting manual recorder", e);
                }
                manualRecorder = null;
                
                WritableMap params = Arguments.createMap();
                params.putString("recordingPath", manualPath);
                emitStaticEvent("CallRemoved", params);
            }
        }
    }

    private static void emitStaticEvent(final String eventName, final WritableMap params) {
        if (reactContext != null) {
            UiThreadUtil.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (reactContext.hasActiveCatalystInstance()) {
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
                    }
                }
            });
        }
    }

    private void sendEvent(final String eventName, final WritableMap params) {
        if (reactContext != null) {
            UiThreadUtil.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (reactContext.hasActiveCatalystInstance()) {
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
                    }
                }
            });
        }
    }

    // Static methods for PhoneModule to call
    public static void answerCall() {
        if (instance != null && instance.currentCall != null) {
            instance.currentCall.answer(0);
        }
    }

    public static void rejectCall() {
        if (instance != null && instance.currentCall != null) {
            if (instance.currentCall.getState() == Call.STATE_RINGING) {
                instance.currentCall.reject(false, null);
            } else {
                instance.currentCall.disconnect();
            }
        }
    }
    
    public static boolean endCall() {
         if (instance != null && instance.currentCall != null) {
            instance.currentCall.disconnect();
            return true;
        }
        return false;
    }

    public static void setMute(boolean muted) {
        if (instance != null && instance.getCallAudioState() != null) {
            instance.setMuted(muted);
        }
    }

    public static void setSpeaker(boolean on) {
        if (instance != null) {
            int route = on ? android.telecom.CallAudioState.ROUTE_SPEAKER : android.telecom.CallAudioState.ROUTE_EARPIECE;
            instance.setAudioRoute(route);
        }
    }

    public static void toggleHold(boolean hold) {
        if (instance != null && instance.currentCall != null) {
            if (hold) {
                instance.currentCall.hold();
            } else {
                instance.currentCall.unhold();
            }
        }
    }
}


