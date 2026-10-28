import PhotosUI
import SwiftUI

/// Le scan IA : photo du plat → analyse → ajustements → ajout au journal.
struct ScanFlowView: View {
    let day: String

    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @StateObject private var camera = CameraModel()

    @State private var photo: (jpeg: Data, image: UIImage)?
    @State private var result: ScanResult?
    @State private var analyzing = false
    @State private var errorText: String?
    @State private var pickerItem: PhotosPickerItem?
    @State private var shutterCount = 0

    var body: some View {
        ZStack {
            if let result, let photo {
                ScanReviewView(
                    image: photo.image,
                    result: Binding(get: { result }, set: { self.result = $0 }),
                    analyzing: analyzing,
                    onReanalyze: { correction in Task { await analyze(correction: correction) } },
                    onRetake: retake,
                    onSave: { meal in save(result: result, jpeg: photo.jpeg, meal: meal) },
                    onClose: { dismiss() }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if let photo {
                AnalyzingView(image: photo.image)
                    .transition(.opacity)
            } else {
                cameraView
                    .transition(.opacity)
            }
        }
        .animation(.smooth(duration: 0.45), value: result == nil)
        .animation(.smooth(duration: 0.35), value: photo == nil)
        .task { await camera.start() }
        .onDisappear { camera.stop() }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self) { await use(data) }
                pickerItem = nil
            }
        }
        .alert("Scan impossible", isPresented: .constant(errorText != nil), presenting: errorText) { _ in
            Button("OK") {
                errorText = nil
                if result == nil { retake() }
            }
        } message: { Text($0) }
        .sensoryFeedback(.impact(weight: .medium), trigger: shutterCount)
        .sensoryFeedback(.success, trigger: result?.items.count ?? -1) { old, new in old == -1 && new >= 0 }
    }

    // MARK: Viseur

    private var cameraView: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch camera.state {
            case .running:
                CameraPreview(session: camera.session).ignoresSafeArea()
            case .idle:
                ProgressView().tint(.white)
            case .denied, .unavailable:
                ContentUnavailableView {
                    Label(camera.state == .denied ? "Appareil photo bloqué" : "Pas d'appareil photo",
                          systemImage: "camera.fill")
                } description: {
                    Text(camera.state == .denied
                         ? "Autorise l'appareil photo dans Réglages › Assiette, ou choisis une photo existante."
                         : "Choisis une photo de ton plat dans ta galerie.")
                }
                .foregroundStyle(.white)
            }

            // Repère de cadrage
            RoundedRectangle(cornerRadius: 36)
                .strokeBorder(.white.opacity(0.55), style: StrokeStyle(lineWidth: 2, dash: [10, 8]))
                .padding(.horizontal, 28)
                .aspectRatio(1, contentMode: .fit)
                .allowsHitTesting(false)

            VStack {
                HStack {
                    Text("Cadre ton assiette")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .glassEffect(.clear)
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").font(.headline).frame(width: 44, height: 44)
                    }
                    .foregroundStyle(.white)
                    .glassEffect(.clear.interactive(), in: .circle)
                    .accessibilityLabel("Fermer")
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)

                Spacer()

                GlassEffectContainer(spacing: 30) {
                    HStack(spacing: 30) {
                        PhotosPicker(selection: $pickerItem, matching: .images) {
                            Image(systemName: "photo.on.rectangle").font(.title3).frame(width: 56, height: 56)
                        }
                        .foregroundStyle(.white)
                        .glassEffect(.clear.interactive(), in: .circle)
                        .accessibilityLabel("Choisir une photo")

                        Button {
                            Task {
                                shutterCount += 1
                                if let data = await camera.capture() { await use(data) }
                            }
                        } label: {
                            Circle().fill(.white).frame(width: 66, height: 66)
                                .padding(6)
                        }
                        .buttonStyle(.plain)
                        .glassEffect(.clear.interactive(), in: .circle)
                        .disabled(camera.state != .running)
                        .opacity(camera.state == .running ? 1 : 0.4)
                        .accessibilityLabel("Prendre la photo")

                        Button { camera.flashOn.toggle() } label: {
                            Image(systemName: camera.flashOn ? "bolt.fill" : "bolt.slash.fill")
                                .font(.title3).frame(width: 56, height: 56)
                        }
                        .foregroundStyle(camera.flashOn ? .yellow : .white)
                        .glassEffect(.clear.interactive(), in: .circle)
                        .accessibilityLabel("Flash")
                    }
                }
                .padding(.bottom, 24)
            }
        }
    }

    // MARK: Actions

    private func use(_ data: Data) async {
        guard let prepared = ImageTools.preparedJPEG(from: data) else {
            errorText = "Impossible de lire cette photo."
            return
        }
        photo = prepared
        camera.stop()
        await analyze(correction: nil)
    }

    private func analyze(correction: String?) async {
        guard let photo else { return }
        analyzing = true
        defer { analyzing = false }
        do {
            result = try await MealScanner.analyze(jpeg: photo.jpeg, previous: correction == nil ? nil : result,
                                                   correction: correction)
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func retake() {
        result = nil
        photo = nil
        Task { await camera.start() }
    }

    private func save(result: ScanResult, jpeg: Data, meal: Meal) {
        let file = store.savePhoto(jpeg)
        store.add(Entry(day: day, meal: meal, title: result.dish, items: result.items.map(\.entryItem), photoFile: file))
        dismiss()
    }
}

/// Écran d'attente : la photo avec un balayage lumineux et des étapes qui défilent.
private struct AnalyzingView: View {
    let image: UIImage
    @State private var sweep = false
    @State private var step = 0
    private let steps = ["Je repère les aliments…", "J'estime les portions…", "Je calcule les macros…", "Presque fini…"]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
                .overlay(Color.black.opacity(0.25).ignoresSafeArea())

            GeometryReader { geo in
                LinearGradient(colors: [.clear, Color.accentColor.opacity(0.55), .white.opacity(0.7), Color.accentColor.opacity(0.55), .clear],
                               startPoint: .top, endPoint: .bottom)
                    .frame(height: 140)
                    .blur(radius: 8)
                    .offset(y: sweep ? geo.size.height : -140)
                    .animation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true), value: sweep)
            }
            .ignoresSafeArea()
            .allowsHitTesting(false)

            VStack {
                Spacer()
                HStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .symbolEffect(.pulse, options: .repeating)
                    Text(steps[step])
                        .contentTransition(.opacity)
                        .animation(.easeInOut, value: step)
                }
                .font(.headline)
                .foregroundStyle(.white)
                .padding(.horizontal, 22)
                .padding(.vertical, 16)
                .glassEffect(.clear)
                .padding(.bottom, 50)
            }
        }
        .onAppear { sweep = true }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2.2))
                step = min(step + 1, steps.count - 1)
            }
        }
    }
}
