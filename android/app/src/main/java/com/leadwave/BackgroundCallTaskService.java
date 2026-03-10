package com.leadwave;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

public class BackgroundCallTaskService extends HeadlessJsTaskService {

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            return new HeadlessJsTaskConfig(
                "BackgroundCallTask",
                Arguments.fromBundle(extras),
                60000, // Timeout for the task (60 seconds)
                true // Allowed in foreground (and background)
            );
        }
        return null;
    }
}
