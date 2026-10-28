import SwiftUI

/// Résultat du scan IA, ajustable : quantités, « c'est autre chose », correction en langage naturel.
struct ScanReviewView: View {
    let image: UIImage
    @Binding var result: ScanResult
    let analyzing: Bool
    var onReanalyze: (String) -> Void
    var onRetake: () -> Void
    var onSave: (Meal) -> Void
    var onClose: () -> Void

    @State private var meal: Meal = .forNow()
    @State private var correction = ""
    @State private var swapping: SwapTarget?
    @FocusState private var correctionFocused: Bool

    /// Ingrédient à remplacer par un aliment de la base (`nil` = ajout).
    private struct SwapTarget: Identifiable {
        let id = UUID()
        let index: Int?
    }

    var body: some View {
        let total = result.macros
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ZStack(alignment: .bottomLeading) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(height: 230)
                            .frame(maxWidth: .infinity)
                            .clipShape(.rect(cornerRadius: 30))
                        Button(action: onRetake) {
                            Label("Reprendre", systemImage: "camera.rotate")
                                .font(.footnote.weight(.semibold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                        }
                        .foregroundStyle(.white)
                        .glassEffect(.clear.interactive())
                        .padding(12)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        TextField("Nom du plat", text: $result.dish)
                            .font(.title2.weight(.bold))
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(total.kcal.whole)
                                .font(.system(size: 46, weight: .heavy, design: .rounded))
                                .foregroundStyle(LinearGradient(colors: Palette.kcalGradient, startPoint: .leading, endPoint: .trailing))
                                .contentTransition(.numericText(value: total.kcal))
                                .animation(.snappy, value: total.kcal)
                            Text("kcal").font(.title3.weight(.semibold)).foregroundStyle(.secondary)
                        }
                        MacroChips(macros: total)
                        if !result.notes.isEmpty {
                            Label(result.notes, systemImage: "info.circle")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .glassCard(cornerRadius: 28)

                    HStack {
                        Text("Ingrédients détectés").font(.headline)
                        Spacer()
                        Text("Touche pour ajuster").font(.caption).foregroundStyle(.secondary)
                    }
                    .padding(.top, 4)

                    ForEach($result.items) { $item in
                        let index = result.items.firstIndex { $0.id == item.id }
                        IngredientCard(item: $item,
                                       onSwap: { swapping = SwapTarget(index: index) },
                                       onRemove: { withAnimation { result.items.removeAll { $0.id == item.id } } })
                    }

                    Button { swapping = SwapTarget(index: nil) } label: {
                        Label("Ajouter un ingrédient", systemImage: "plus").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.glass)

                    correctionCard

                    Text("Repas").font(.footnote.weight(.semibold)).foregroundStyle(.secondary).padding(.top, 4)
                    MealPicker(meal: $meal)
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 24)
                .disabled(analyzing)
                .opacity(analyzing ? 0.55 : 1)
                .animation(.easeInOut, value: analyzing)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(AppBackground())
            .navigationTitle("Ton assiette")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer", systemImage: "xmark", action: onClose)
                }
                if analyzing {
                    ToolbarItem(placement: .principal) {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("L'IA réajuste…").font(.subheadline.weight(.semibold))
                        }
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button { onSave(meal) } label: {
                    Label("Ajouter au journal", systemImage: "checkmark")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent)
                .disabled(result.items.isEmpty || analyzing)
                .padding(.horizontal, 18)
                .padding(.bottom, 8)
            }
            .sheet(item: $swapping) { target in
                NavigationStack {
                    FoodSearchView(
                        mode: .pick(initialGrams: target.index.map { result.items[$0].grams }) { food, grams in
                            let item = ScanItem(name: food.name, brand: food.brand, grams: grams, per100: food.per100,
                                                source: food.source, confidence: .haute)
                            if let i = target.index, result.items.indices.contains(i) {
                                result.items[i] = item
                            } else {
                                result.items.append(item)
                            }
                        },
                        initialQuery: target.index.map { result.items[$0].name } ?? ""
                    )
                    .navigationTitle(target.index == nil ? "Ajouter un ingrédient" : "C'est plutôt…")
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
    }

    private var correctionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Corriger avec l'IA", systemImage: "sparkles")
                .font(.headline)
                .foregroundStyle(Color.accentColor)
            Text("Dis-lui ce qui ne va pas, elle réajuste tout le plat.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            TextField("Ex : le blanc c'est du riz complet, la sauce c'est de la crème légère, il y avait 2 œufs",
                      text: $correction, axis: .vertical)
                .lineLimit(2...5)
                .focused($correctionFocused)
                .padding(12)
                .background(.background.opacity(0.5), in: .rect(cornerRadius: 16))
            Button {
                correctionFocused = false
                onReanalyze(correction)
                correction = ""
            } label: {
                Label("Réanalyser", systemImage: "arrow.triangle.2.circlepath").frame(maxWidth: .infinity)
            }
            .buttonStyle(.glass)
            .disabled(correction.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .glassCard(cornerRadius: 26, tint: .accentColor)
    }
}

private struct IngredientCard: View {
    @Binding var item: ScanItem
    var onSwap: () -> Void
    var onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Circle()
                    .fill(confidenceColor)
                    .frame(width: 8, height: 8)
                    .accessibilityLabel("Confiance \(item.confidence.rawValue)")
                TextField("Ingrédient", text: $item.name)
                    .font(.subheadline.weight(.semibold))
                Menu {
                    Button("C'est autre chose…", systemImage: "arrow.left.arrow.right", action: onSwap)
                    Button("Supprimer", systemImage: "trash", role: .destructive, action: onRemove)
                } label: {
                    Image(systemName: "ellipsis").font(.subheadline.weight(.bold)).frame(width: 30, height: 30)
                }
                .glassEffect(.regular.interactive(), in: .circle)
            }
            HStack {
                GramsStepper(grams: $item.grams)
                Spacer()
                Text("\(item.macros.kcal.whole) kcal").font(.subheadline.weight(.bold)).monospacedDigit()
            }
            MacroChips(macros: item.macros, showAll: false)
            Button(action: onSwap) {
                Label("C'est autre chose", systemImage: "arrow.left.arrow.right")
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(Color.accentColor)
        }
        .glassCard(cornerRadius: 24, padding: 14)
    }

    private var confidenceColor: Color {
        switch item.confidence {
        case .haute: Palette.fiber
        case .moyenne: Palette.carbs
        case .faible: Palette.kcal
        }
    }
}
