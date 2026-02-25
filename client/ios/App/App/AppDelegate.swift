import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var pipPluginRegistered = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set dark background to prevent white flash during overscroll / rubber-banding
        if let window = self.window {
            window.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0) // #0a0a0a
        }

        // Configure AVAudioSession for PiP — allows audio to continue in background
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .moviePlayback)
            try session.setActive(true)
        } catch {
            print("[PiP] AVAudioSession configuration failed: \(error)")
        }

        // Enable PiP on the WKWebView and register LiveKitPiP plugin once the bridge is loaded
        DispatchQueue.main.async {
            if let vc = self.window?.rootViewController as? CAPBridgeViewController,
               let webView = vc.webView {
                webView.configuration.allowsPictureInPictureMediaPlayback = true
            }
            self.registerPiPPlugin()
        }

        return true
    }

    private func registerPiPPlugin() {
        guard !pipPluginRegistered else { return }
        if let vc = self.window?.rootViewController as? CAPBridgeViewController,
           let bridge = vc.bridge {
            bridge.registerPluginInstance(LiveKitPiPPlugin())
            pipPluginRegistered = true
            print("[PiPBridge] LiveKitPiP plugin registered from AppDelegate")
        } else {
            // Bridge not ready yet — retry shortly
            print("[PiPBridge] Bridge not ready, retrying in 0.5s...")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.registerPiPPlugin()
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Clear badge count when app becomes active
        application.applicationIconBadgeNumber = 0
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Push Notifications — forward token to Capacitor
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
