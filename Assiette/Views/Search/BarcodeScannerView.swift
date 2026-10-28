import SwiftUI
import VisionKit

/// Scan de code-barres avec la caméra (VisionKit).
struct BarcodeScannerView: View {
    var onScan: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
                DataScanner(onScan: onScan).ignoresSafeArea()
            } else {
                Color.black.ignoresSafeArea()
                ContentUnavailableView("Scanner indisponible",
                                       systemImage: "barcode.viewfinder",
                                       description: Text("Le scan de code-barres a besoin de l'appareil photo d'un iPhone (il ne marche pas dans le simulateur)."))
                    .foregroundStyle(.white)
            }

            VStack {
                HStack {
                    Text("Vise le code-barres")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .glassEffect()
                    Spacer()
                    Button("Fermer", systemImage: "xmark") { dismiss() }
                        .labelStyle(.iconOnly)
                        .font(.title3.weight(.semibold))
                        .frame(width: 44, height: 44)
                        .glassEffect(.regular.interactive(), in: .circle)
                }
                .padding()
                Spacer()
            }
        }
    }
}

private struct DataScanner: UIViewControllerRepresentable {
    var onScan: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13, .ean8, .upce])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        vc.delegate = context.coordinator
        try? vc.startScanning()
        return vc
    }

    func updateUIViewController(_ vc: DataScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onScan: onScan) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onScan: (String) -> Void
        private var done = false

        init(onScan: @escaping (String) -> Void) { self.onScan = onScan }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !done else { return }
            for item in addedItems {
                if case let .barcode(barcode) = item, let code = barcode.payloadStringValue {
                    done = true
                    dataScanner.stopScanning()
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    onScan(code)
                    return
                }
            }
        }
    }
}
