package com.shapop.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Petites informations natives utiles à l'app web.
 *
 * pushAvailable : vrai seulement si l'app a été compilée avec un google-services.json
 * (le plugin Google Services crée alors la ressource « google_app_id »). Sans lui,
 * PushNotifications.register() ferait planter l'app (Firebase non initialisé) :
 * le code web ne demande donc pas la permission de notifications dans ce cas.
 */
@CapacitorPlugin(name = "ShaPopNative")
public class ShaPopNativePlugin extends Plugin {

    @PluginMethod
    public void pushAvailable(PluginCall call) {
        int id = getContext().getResources().getIdentifier("google_app_id", "string", getContext().getPackageName());
        JSObject result = new JSObject();
        result.put("available", id != 0);
        call.resolve(result);
    }
}
