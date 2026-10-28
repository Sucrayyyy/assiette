import SwiftUI

/// Choix de la quantité (et du repas) avant d'ajouter un aliment.
struct PortionSheet: View {
    let food: Food
    let mode: FoodSearchView.Mode
    var onConfirm: (Double, Meal) -> Void

    @State private var grams: Double = 100
    @State private var meal: Meal = .forNow()

    var body: some View {
        let macros = food.per100.scaled(to: grams)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(food.name).font(.title2.weight(.bold)).lineLimit(3)
                        if let brand = food.brand {
                            Text(brand).font(.subheadline).foregroundStyle(.secondary)
                        }
                    }

                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(macros.kcal.whole)
                            .font(.system(size: 52, weight: .heavy, design: .rounded))
                            .contentTransition(.numericText(value: macros.kcal))
                            .animation(.snappy, value: macros.kcal)
                        Text("kcal").font(.title3.weight(.semibold)).foregroundStyle(.secondary)
                    }
                    MacroChips(macros: macros)

                    HStack {
                        GramsStepper(grams: $grams)
                        Spacer()
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        GlassEffectContainer(spacing: 8) {
                            HStack(spacing: 8) {
                                ForEach(presets, id: \.label) { preset in
                                    Button(preset.label) { withAnimation(.snappy) { grams = preset.grams } }
                                        .buttonStyle(.glass)
                                        .tint(grams == preset.grams ? .accentColor : nil)
                                }
                            }
                        }
                    }

                    if case let .log(_, presetMeal) = mode, presetMeal == nil {
                        Text("Repas").font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                        MealPicker(meal: $meal)
                    }
                }
                .padding(22)
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    onConfirm(grams, meal)
                } label: {
                    Text(confirmLabel).font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent)
                .disabled(grams <= 0)
                .padding(.horizontal, 22)
                .padding(.bottom, 8)
            }
        }
        .presentationDetents([.fraction(0.8), .large])
        .presentationDragIndicator(.visible)
        .onAppear {
            switch mode {
            case let .log(_, presetMeal):
                grams = food.servingG ?? 100
                meal = presetMeal ?? .forNow()
            case let .pick(initialGrams, _):
                grams = initialGrams ?? food.servingG ?? 100
            }
        }
    }

    private var confirmLabel: String {
        if case .pick = mode { return "Utiliser cet aliment" }
        return "Ajouter au journal"
    }

    private var presets: [(label: String, grams: Double)] {
        var list: [(String, Double)] = []
        if let serving = food.servingG {
            list.append(("\(food.servingLabel ?? "1 portion") · \(serving.whole) g", serving))
        }
        list += [("50 g", 50), ("100 g", 100), ("150 g", 150), ("200 g", 200), ("250 g", 250)]
        return list.map { (label: $0.0, grams: $0.1) }
    }
}
