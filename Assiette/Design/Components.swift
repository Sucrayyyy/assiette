import SwiftUI

/// Anneau de progression avec dégradé, animé à l'apparition.
struct ProgressRing: View {
    var progress: Double
    var colors: [Color]
    var lineWidth: CGFloat = 14
    /// Affiche le point de départ même à 0 % (comme les anneaux Activité).
    var showsEmptyCap = true

    @State private var appeared = false

    var body: some View {
        let p = min(max(progress, 0), 1)
        ZStack {
            Circle()
                .stroke(colors.last!.opacity(0.15), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: appeared ? max(p, 0.001) : 0.001)
                .stroke(
                    AngularGradient(colors: colors + [colors.first!], center: .center,
                                    startAngle: .degrees(0), endAngle: .degrees(360 * max(p, 0.05))),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .opacity(p > 0 || showsEmptyCap ? 1 : 0)
                .rotationEffect(.degrees(-90))
                .animation(.spring(response: 1.1, dampingFraction: 0.85), value: p)
                .animation(.spring(response: 1.1, dampingFraction: 0.85), value: appeared)
        }
        .onAppear { appeared = true }
    }
}

/// Les trois anneaux principaux : calories, protéines, fibres (façon anneaux Activité).
struct MacroRings: View {
    var totals: Macros
    var targets: Macros
    var size: CGFloat = 170
    var lineWidth: CGFloat = 16

    var body: some View {
        let gap = lineWidth + 5
        ZStack {
            ProgressRing(progress: totals.kcal / max(targets.kcal, 1), colors: Palette.kcalGradient, lineWidth: lineWidth)
            ProgressRing(progress: totals.protein / max(targets.protein, 1), colors: Palette.proteinGradient, lineWidth: lineWidth)
                .padding(gap)
            ProgressRing(progress: totals.fiber / max(targets.fiber, 1), colors: Palette.fiberGradient, lineWidth: lineWidth)
                .padding(gap * 2)
        }
        .frame(width: size, height: size)
    }
}

struct MacroLegendRow: View {
    var color: Color
    var label: String
    var value: Double
    var target: Double
    var unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(label).font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
            }
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value.whole)
                    .font(.title2.weight(.bold))
                    .contentTransition(.numericText(value: value))
                    .animation(.snappy, value: value)
                Text("/ \(target.whole) \(unit)")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct MiniMacroBar: View {
    var label: String
    var value: Double
    var target: Double
    var color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
                Spacer()
                Text("\(value.whole) / \(target.whole) g").font(.footnote.weight(.semibold))
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(color.opacity(0.15))
                    Capsule().fill(color.gradient)
                        .frame(width: geo.size.width * min(value / max(target, 1), 1))
                        .animation(.spring(response: 0.8), value: value)
                }
            }
            .frame(height: 7)
        }
    }
}

/// Petites pastilles de macros (kcal, protéines, fibres, glucides, lipides).
struct MacroChips: View {
    var macros: Macros
    var showAll = true

    var body: some View {
        HStack(spacing: 6) {
            chip("\(macros.kcal.whole) kcal", Palette.kcal)
            chip("P \(macros.protein.decimal()) g", Palette.protein)
            chip("Fib \(macros.fiber.decimal()) g", Palette.fiber)
            if showAll {
                chip("G \(macros.carbs.decimal()) g", Palette.carbs)
                chip("L \(macros.fat.decimal()) g", Palette.fat)
            }
        }
    }

    private func chip(_ text: String, _ color: Color) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.13), in: Capsule())
    }
}

/// Sélecteur de grammes −/+ en verre.
struct GramsStepper: View {
    @Binding var grams: Double
    var step: Double = 10

    var body: some View {
        GlassEffectContainer(spacing: 8) {
            HStack(spacing: 8) {
                Button { grams = max(0, grams - step) } label: {
                    Image(systemName: "minus").frame(width: 22, height: 22)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)

                TextField("g", value: $grams, format: .number.precision(.fractionLength(0)))
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.center)
                    .font(.body.weight(.bold).monospacedDigit())
                    .frame(width: 52)
                Text("g").font(.caption.weight(.semibold)).foregroundStyle(.secondary).padding(.leading, -8)

                Button { grams += step } label: {
                    Image(systemName: "plus").frame(width: 22, height: 22)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
            }
        }
        .sensoryFeedback(.selection, trigger: grams)
    }
}

/// Vignette d'une photo enregistrée.
struct PhotoThumbnail: View {
    var file: String
    /// `nil` : l'image remplit l'espace donné par le parent.
    var size: CGFloat? = 44

    var body: some View {
        Color.clear
            .frame(width: size, height: size)
            .overlay {
                if let image = UIImage(contentsOfFile: AppStore.photoURL(file).path(percentEncoded: false)) {
                    Image(uiImage: image).resizable().scaledToFill()
                } else {
                    Image(systemName: "photo").foregroundStyle(.secondary)
                }
            }
            .clipShape(.rect(cornerRadius: (size ?? 80) * 0.3))
    }
}

/// Puce de choix de repas.
struct MealPicker: View {
    @Binding var meal: Meal

    var body: some View {
        GlassEffectContainer(spacing: 8) {
            HStack(spacing: 8) {
                ForEach(Meal.allCases) { m in
                    Button {
                        withAnimation(.snappy) { meal = m }
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: m.symbol).font(.body)
                            Text(m.shortLabel).font(.caption2.weight(.semibold)).lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .foregroundStyle(meal == m ? Color.white : Color.primary)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(meal == m ? Glass.regular.tint(.accentColor).interactive() : .regular.interactive(),
                                 in: .rect(cornerRadius: 16))
                }
            }
        }
        .sensoryFeedback(.selection, trigger: meal)
    }
}
