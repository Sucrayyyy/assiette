import AVFoundation
import SwiftUI

/// Caméra photo intégrée (AVFoundation), pour un viseur plein écran.
@MainActor
final class CameraModel: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
    enum State { case idle, running, denied, unavailable }

    let session = AVCaptureSession()
    @Published private(set) var state: State = .idle
    @Published var flashOn = false

    private let output = AVCapturePhotoOutput()
    private var configured = false
    private var continuation: CheckedContinuation<Data?, Never>?

    func start() async {
        var granted = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
        if AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined {
            granted = await AVCaptureDevice.requestAccess(for: .video)
        }
        guard granted else {
            state = .denied
            return
        }
        if !configured {
            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let input = try? AVCaptureDeviceInput(device: device) else {
                state = .unavailable
                return
            }
            session.beginConfiguration()
            session.sessionPreset = .photo
            if session.canAddInput(input) { session.addInput(input) }
            if session.canAddOutput(output) { session.addOutput(output) }
            session.commitConfiguration()
            configured = true
        }
        let session = session
        await Task.detached { session.startRunning() }.value
        state = .running
    }

    func stop() {
        let session = session
        Task.detached { session.stopRunning() }
    }

    func capture() async -> Data? {
        guard state == .running else { return nil }
        let settings = AVCapturePhotoSettings()
        if output.supportedFlashModes.contains(.on) { settings.flashMode = flashOn ? .on : .off }
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            output.capturePhoto(with: settings, delegate: self)
        }
    }

    nonisolated func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        let data = photo.fileDataRepresentation()
        Task { @MainActor in
            self.continuation?.resume(returning: data)
            self.continuation = nil
        }
    }
}

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ view: PreviewView, context: Context) {}
}
