import UIKit
import Capacitor

class PiPBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        print("[PiPBridge] capacitorDidLoad called")
        let plugin = LiveKitPiPPlugin()
        print("[PiPBridge] Registering LiveKitPiPPlugin...")
        bridge?.registerPluginInstance(plugin)
        print("[PiPBridge] Plugin registered, bridge=\(bridge != nil)")
    }
}
