package com.leadwave;

import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class RoleManagerModule extends ReactContextBaseJavaModule {
    private static final int REQUEST_ID = 1;

    public RoleManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "RoleManagerModule";
    }

    @ReactMethod
    public void requestDefaultDialerRole() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            RoleManager roleManager = (RoleManager) getReactApplicationContext().getSystemService(Context.ROLE_SERVICE);
            Intent intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER);
            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivityForResult(intent, REQUEST_ID);
            }
        } else {
             // For older versions, we might use telecomManager.changeDefaultDialer() if needed, 
             // but Q+ is the main target for RoleManager.
             // Usually prompts automatically on older androids if we use ACTION_CHANGE_DEFAULT_DIALER
             Activity activity = getCurrentActivity();
             if (activity != null) {
                 Intent intent = new Intent(android.telecom.TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
                 intent.putExtra(android.telecom.TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, activity.getPackageName());
                 activity.startActivity(intent);
             }
        }
    }
}
