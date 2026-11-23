package com.shapop.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins maison : à enregistrer AVANT super.onCreate()
        registerPlugin(ShaPopNativePlugin.class);
        super.onCreate(savedInstanceState);
        createDefaultNotificationChannel();
    }

    /**
     * Canal de notifications par défaut (Android 8+), nommé dans la langue du téléphone.
     * Le serveur envoie ses notifications FCM sur ce canal (android.notification.channel_id).
     */
    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            getString(R.string.default_notification_channel_id),
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.notification_channel_description));
        manager.createNotificationChannel(channel);
    }
}
