package com.leadwave;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

public class RecordingUploadTaskService extends HeadlessJsTaskService {

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            return new HeadlessJsTaskConfig(
                "RecordingUploadTask",
                Arguments.fromBundle(extras),
                60000, // Timeout for the task (60 seconds) or less
                true // Allowed in foreground (and background if configured rights)
            );
        }
        return null;
    }
}
