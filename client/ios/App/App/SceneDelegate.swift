import UIKit
import Capacitor

// Cycle de vie par scènes : obligatoire pour une app compilée avec Xcode 27 qui tourne sur iOS 27
// (sinon UIKit la tue à l'ouverture : _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// La fenêtre est créée par la scène à partir de Main.storyboard (UISceneStoryboardFile dans Info.plist).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        window?.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0) // #0a0a0a
        // L'AppDelegate (PiP, bridge Capacitor) lit toujours sa propriété window
        (UIApplication.shared.delegate as? AppDelegate)?.window = window

        // Ouverture à froid par un lien (retour de connexion Google / Apple, liens universels)
        if let urlContext = connectionOptions.urlContexts.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: urlContext.url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for ctx in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: ctx.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Effacer la pastille et les notifications affichées quand l'app revient au premier plan
        UIApplication.shared.applicationIconBadgeNumber = 0
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }
}
