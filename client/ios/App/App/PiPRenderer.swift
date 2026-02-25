import UIKit
import AVKit
import LiveKit

// MARK: - UncheckedSendable wrapper for CMSampleBuffer
private struct SendableBuffer: @unchecked Sendable {
    let buffer: CMSampleBuffer
}

// MARK: - SampleRenderingView
// UIView backed by AVSampleBufferDisplayLayer for rendering CMSampleBuffers

class SampleRenderingView: UIView {
    override class var layerClass: AnyClass {
        AVSampleBufferDisplayLayer.self
    }

    var sampleBufferDisplayLayer: AVSampleBufferDisplayLayer {
        layer as! AVSampleBufferDisplayLayer
    }

    func enqueue(_ sampleBuffer: CMSampleBuffer) {
        sampleBufferDisplayLayer.enqueue(sampleBuffer)
    }
}

// MARK: - PreviewViewController
// Renders LiveKit video frames into a SampleRenderingView. Used as the "source view" for PiP.

class PreviewViewController: UIViewController, VideoRenderer, @unchecked Sendable {
    let renderView = SampleRenderingView()

    @MainActor var isAdaptiveStreamEnabled: Bool { true }
    @MainActor var adaptiveStreamSize: CGSize { renderView.bounds.size }

    override func viewDidLoad() {
        super.viewDidLoad()
        renderView.frame = view.bounds
        renderView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(renderView)
    }

    nonisolated func set(size: CGSize) {}

    nonisolated func render(frame: LiveKit.VideoFrame) {
        guard let cmSampleBuffer = frame.toCMSampleBuffer() else { return }
        let sendable = SendableBuffer(buffer: cmSampleBuffer)
        DispatchQueue.main.async {
            self.renderView.enqueue(sendable.buffer)
        }
    }
}

// MARK: - VideoCallViewController
// Renders into the PiP floating window. Extends AVPictureInPictureVideoCallViewController.

class VideoCallViewController: AVPictureInPictureVideoCallViewController, VideoRenderer, @unchecked Sendable {
    let renderView = SampleRenderingView()

    @MainActor var isAdaptiveStreamEnabled: Bool { true }
    @MainActor var adaptiveStreamSize: CGSize { renderView.bounds.size }

    override func viewDidLoad() {
        super.viewDidLoad()
        renderView.frame = view.bounds
        renderView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(renderView)
    }

    nonisolated func set(size: CGSize) {}

    nonisolated func render(frame: LiveKit.VideoFrame) {
        guard let cmSampleBuffer = frame.toCMSampleBuffer() else { return }
        let sendable = SendableBuffer(buffer: cmSampleBuffer)
        DispatchQueue.main.async {
            self.renderView.enqueue(sendable.buffer)
        }
    }
}
