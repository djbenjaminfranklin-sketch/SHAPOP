import Foundation
import Capacitor
import AVKit
import LiveKit

@objc(LiveKitPiPPlugin)
class LiveKitPiPPlugin: CAPPlugin, CAPBridgedPlugin, AVPictureInPictureControllerDelegate {
    let identifier = "LiveKitPiPPlugin"
    let jsName = "LiveKitPiP"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startPiP", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private var room: Room?
    private var pipController: AVPictureInPictureController?

    private var previewVC: PreviewViewController?
    private var pipContentVC: VideoCallViewController?

    private var currentTrack: RemoteVideoTrack?
    private var roomHandler: RoomDelegateHandler?
    private var prepareGeneration: Int = 0

    // MARK: - Plugin Methods

    @objc func prepare(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let token = call.getString("token") else {
            call.reject("Missing url or token")
            return
        }

        // Synchronous cleanup to avoid race conditions
        cleanUpSync()

        prepareGeneration += 1
        let thisGeneration = prepareGeneration

        let handler = RoomDelegateHandler(plugin: self)
        self.roomHandler = handler

        let room = Room(delegate: handler)
        self.room = room

        Task {
            do {
                try await room.connect(url: url, token: token)
                print("[LiveKitPiP] Connected to room: \(room.name ?? "unknown")")

                // Check if a newer prepare() was called while we were connecting
                guard self.prepareGeneration == thisGeneration else {
                    print("[LiveKitPiP] Stale prepare, ignoring")
                    await room.disconnect()
                    return
                }

                // Subscribe to existing remote video tracks
                for participant in room.remoteParticipants.values {
                    for publication in participant.trackPublications.values {
                        if let track = publication.track as? RemoteVideoTrack {
                            await MainActor.run {
                                guard self.prepareGeneration == thisGeneration else { return }
                                self.attachTrack(track)
                            }
                            break
                        }
                    }
                }

                await MainActor.run {
                    call.resolve()
                }
            } catch {
                print("[LiveKitPiP] Connection failed: \(error)")
                await MainActor.run {
                    call.reject("Failed to connect: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func startPiP(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            print("[LiveKitPiP] startPiP — controller=\(self.pipController != nil), track=\(self.currentTrack != nil)")
            guard let pip = self.pipController else {
                print("[LiveKitPiP] FAILED: pipController is nil")
                call.reject("PiP not ready")
                return
            }
            print("[LiveKitPiP] possible=\(pip.isPictureInPicturePossible), active=\(pip.isPictureInPictureActive)")

            if pip.isPictureInPicturePossible {
                pip.startPictureInPicture()
                call.resolve()
            } else {
                // Retry after a short delay — isPictureInPicturePossible can take a moment
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    print("[LiveKitPiP] Retry: possible=\(pip.isPictureInPicturePossible)")
                    if pip.isPictureInPicturePossible {
                        pip.startPictureInPicture()
                        call.resolve()
                    } else {
                        print("[LiveKitPiP] FAILED after retry: PiP not possible")
                        call.reject("PiP not possible")
                    }
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        cleanUpSync()
        call.resolve()
    }

    // MARK: - Track Management

    func attachTrack(_ track: RemoteVideoTrack) {
        // Detach any previous track first
        detachTrack()

        self.currentTrack = track
        print("[LiveKitPiP] Attaching track")

        // Create preview VC — must be visible (not hidden) for PiP to work
        // We make it tiny and nearly transparent so it's invisible to the user
        let preview = PreviewViewController()
        preview.view.frame = CGRect(x: -1, y: -1, width: 2, height: 2)
        preview.view.alpha = 0.01
        self.previewVC = preview

        // Create PiP content VC
        let pipContent = VideoCallViewController()
        pipContent.preferredContentSize = CGSize(width: 320, height: 180)
        self.pipContentVC = pipContent

        // Add both as renderers on the track
        track.add(videoRenderer: preview)
        track.add(videoRenderer: pipContent)

        // Add preview view to the root view controller's view hierarchy
        if let rootVC = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first?.windows.first?.rootViewController {
            rootVC.view.addSubview(preview.view)
            print("[LiveKitPiP] Preview view added to hierarchy")
        } else {
            print("[LiveKitPiP] WARNING: Could not find root VC to add preview view")
        }

        // Set up AVPictureInPictureController
        let pipProvider = AVPictureInPictureController.ContentSource(
            activeVideoCallSourceView: preview.view,
            contentViewController: pipContent
        )

        let pip = AVPictureInPictureController(contentSource: pipProvider)
        pip.delegate = self
        pip.canStartPictureInPictureAutomaticallyFromInline = true
        self.pipController = pip

        print("[LiveKitPiP] PiP controller ready, possible=\(pip.isPictureInPicturePossible)")
    }

    func detachTrack() {
        if let track = self.currentTrack {
            if let preview = self.previewVC {
                track.remove(videoRenderer: preview)
            }
            if let pipContent = self.pipContentVC {
                track.remove(videoRenderer: pipContent)
            }
            self.currentTrack = nil
        }
    }

    // MARK: - AVPictureInPictureControllerDelegate

    func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        print("[LiveKitPiP] PiP started")
        notifyListeners("pipStarted", data: [:])
    }

    func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        print("[LiveKitPiP] PiP stopped")
        notifyListeners("pipStopped", data: [:])
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                     failedToStartPictureInPictureWithError error: Error) {
        print("[LiveKitPiP] PiP FAILED to start: \(error)")
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                     restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) {
        notifyListeners("pipStopped", data: [:])
        completionHandler(true)
    }

    // MARK: - Cleanup (synchronous — no race conditions)

    private func cleanUpSync() {
        if let pip = self.pipController, pip.isPictureInPictureActive {
            pip.stopPictureInPicture()
        }
        self.pipController = nil

        detachTrack()

        self.previewVC?.view.removeFromSuperview()
        self.previewVC = nil
        self.pipContentVC = nil

        if let room = self.room {
            Task {
                await room.disconnect()
            }
        }
        self.room = nil
        self.roomHandler = nil
    }
}

// MARK: - RoomDelegateHandler

final class RoomDelegateHandler: RoomDelegate, @unchecked Sendable {
    private weak var plugin: LiveKitPiPPlugin?

    init(plugin: LiveKitPiPPlugin) {
        self.plugin = plugin
    }

    nonisolated func room(_ room: Room, participant: RemoteParticipant, didSubscribeTrack publication: RemoteTrackPublication) {
        guard let track = publication.track as? RemoteVideoTrack else { return }
        print("[LiveKitPiP] didSubscribeTrack")
        DispatchQueue.main.async { [weak self] in
            self?.plugin?.attachTrack(track)
        }
    }

    nonisolated func room(_ room: Room, participant: RemoteParticipant, didUnsubscribeTrack publication: RemoteTrackPublication) {
        print("[LiveKitPiP] didUnsubscribeTrack")
        DispatchQueue.main.async { [weak self] in
            self?.plugin?.detachTrack()
        }
    }
}
