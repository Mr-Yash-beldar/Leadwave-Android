package com.leadwave;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;

import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {

    private WindowManager windowManager;
    private View overlayView;

    private String leadName;
    private String phoneNumberStr;
    private boolean isLead;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if ("CLOSE_OVERLAY".equals(action)) {
                stopSelf();
                return START_NOT_STICKY;
            }
            leadName = intent.getStringExtra("leadName");
            phoneNumberStr = intent.getStringExtra("phoneNumber");
            isLead = intent.getBooleanExtra("isLead", false);
        }
        startForeground(1, createNotification());
        showOverlay();
        return START_NOT_STICKY;
    }

    private Notification createNotification() {
        String channelId = "overlay_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Leadwave Caller ID",
                    NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class)
                    .createNotificationChannel(channel);
        }
        return new NotificationCompat.Builder(this, channelId)
                .setContentTitle("Leadwave Caller ID")
                .setContentText("Identifying incoming call...")
                .setSmallIcon(R.mipmap.ic_launcher)
                .build();
    }

    private void showOverlay() {
        if (overlayView != null) {
            // Already showing, just update text
            updateOverlayText();
            return;
        }

        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);

        overlayView = LayoutInflater.from(this)
                .inflate(R.layout.overlay_layout, null);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP;
        windowManager.addView(overlayView, params);

        overlayView.findViewById(R.id.btnClose)
                .setOnClickListener(v -> stopSelf());

        updateOverlayText();
    }

    private void updateOverlayText() {
        if (overlayView != null) {
            android.widget.TextView txtTitle = overlayView.findViewById(R.id.txtTitle);
            android.widget.TextView txtNumber = overlayView.findViewById(R.id.txtNumber);

            if (txtNumber != null && phoneNumberStr != null) {
                txtNumber.setText(phoneNumberStr);
                txtNumber.setVisibility(View.VISIBLE);
            }

            if (txtTitle != null) {
                if (isLead && leadName != null) {
                    txtTitle.setText("Lead: " + leadName);
                    txtTitle.setTextColor(android.graphics.Color.parseColor("#4CAF50")); // Green
                } else {
                    txtTitle.setText("Unknown Caller");
                    txtTitle.setTextColor(android.graphics.Color.parseColor("#F44336")); // Red
                }
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) {
            windowManager.removeView(overlayView);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}