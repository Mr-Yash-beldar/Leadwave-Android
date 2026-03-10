package com.leadwave;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class OverlayModule extends ReactContextBaseJavaModule {

    OverlayModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "OverlayModule";
    }

    @ReactMethod
    public void showLeadOverlay(String phoneNumber, String leadName, boolean isLead) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, OverlayService.class);
            serviceIntent.putExtra("phoneNumber", phoneNumber);
            serviceIntent.putExtra("leadName", leadName);
            serviceIntent.putExtra("isLead", isLead);
            
            ContextCompat.startForegroundService(context, serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @ReactMethod
    public void hideOverlay() {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, OverlayService.class);
            serviceIntent.setAction("CLOSE_OVERLAY");
            context.startService(serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
