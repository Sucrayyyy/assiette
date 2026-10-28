import SwiftUI

struct TodayView: View {
    @Environment(AppStore.self) private var store
    @Binding var day: String
    var onScan: () -> Void

    @State private var editing: Entry?
    @State private var addingTo: Meal?

    var body: some View {
        let profile = store.profile
        let targets = profile?.targets ?? .zero
        let entries = store.entries(on: day)
        let totals = store.totals(on: day)

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header(name: profile?.firstName ?? "")
                    WeekStrip(selected: $day)
                    heroCard(totals: totals, targets: targets)
                    coachCard(totals: totals, targets: targets, hasEntries: !entries.isEmpty)
                    if entries.isEmpty && day == Day.today { scanCTA }
                    ForEach(Meal.allCases) { meal in
                        MealCard(meal: meal, entries: entries.filter { $0.meal == meal },
                                 onAdd: { addingTo = meal }, onOpen: { editing = $0 })
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 40)
            }
            .scrollIndicators(.hidden)
            .background(AppBackground())
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { StreakBadge(streak: store.streak) }
            }
            .sheet(item: $editing) { entry in
                EntryEditor(entry: entry)
            }
            .sheet(item: $addingTo) { meal in
                NavigationStack {
                    FoodSearchView(mode: .log(day: day, meal: meal))
                        .navigationTitle(meal.label)
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
    }

    private func header(name: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(greeting) \(name)")
                .font(.largeTitle.weight(.bold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(Day.label(day))
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
        }
        .padding(.top, 4)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour"
    }

    private func heroCard(totals: Macros, targets: Macros) -> some View {
        let remaining = targets.kcal - totals.kcal
        return VStack(spacing: 18) {
            HStack(spacing: 18) {
                ZStack {
                    MacroRings(totals: totals, targets: targets, size: 160, lineWidth: 15)
                    VStack(spacing: 0) {
                        Text(abs(remaining).whole)
                            .font(.title2.weight(.heavy))
                            .contentTransition(.numericText(value: remaining))
                        Text(remaining >= 0 ? "restantes" : "en trop")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                VStack(alignment: .leading, spacing: 12) {
                    MacroLegendRow(color: Palette.kcal, label: "Calories", value: totals.kcal, target: targets.kcal, unit: "kcal")
                    MacroLegendRow(color: Palette.protein, label: "Protéines", value: totals.protein, target: targets.protein, unit: "g")
                    MacroLegendRow(color: Palette.fiber, label: "Fibres", value: totals.fiber, target: targets.fiber, unit: "g")
                }
                Spacer(minLength: 0)
            }
            HStack(spacing: 16) {
                MiniMacroBar(label: "Glucides", value: totals.carbs, target: targets.carbs, color: Palette.carbs)
                MiniMacroBar(label: "Lipides", value: totals.fat, target: targets.fat, color: Palette.fat)
            }
        }
        .glassCard(cornerRadius: 32, padding: 20)
    }

    private func coachCard(totals: Macros, targets: Macros, hasEntries: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "leaf.fill")
                .font(.headline)
                .foregroundStyle(Color.accentColor)
                .frame(width: 32, height: 32)
                .glassEffect(.regular.tint(Color.accentColor.opacity(0.2)), in: .circle)
            Text(Nutrition.coachMessage(totals: totals, targets: targets, hasEntries: hasEntries, isToday: day == Day.today))
                .font(.subheadline.weight(.medium))
                .fixedSize(horizontal: false, vertical: true)
        }
        .glassCard(cornerRadius: 22, padding: 14)
    }

    private var scanCTA: some View {
        Button(action: onScan) {
            HStack(spacing: 14) {
                Image(systemName: "camera.viewfinder")
                    .font(.title2.weight(.semibold))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Scanner mon assiette").font(.headline)
                    Text("Une photo, et l'IA remplit tout").font(.subheadline).opacity(0.85)
                }
                Spacer()
                Image(systemName: "arrow.right").font(.headline)
            }
            .foregroundStyle(.white)
            .padding(18)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .glassEffect(.regular.tint(Color.accentColor).interactive(), in: .rect(cornerRadius: 24))
    }
}

private struct StreakBadge: View {
    var streak: Int

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "flame.fill")
                .foregroundStyle(streak > 0 ? Palette.kcal : .secondary)
                .symbolEffect(.bounce, value: streak)
            Text("\(streak)").font(.subheadline.weight(.bold)).monospacedDigit()
        }
        .padding(.horizontal, 4)
        .accessibilityLabel("Série de \(streak) jours")
    }
}

/// Les 7 derniers jours, chacun avec un mini anneau de calories.
private struct WeekStrip: View {
    @Environment(AppStore.self) private var store
    @Binding var selected: String

    var body: some View {
        let target = store.profile?.targets.kcal ?? 1
        GlassEffectContainer(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(Day.lastDays(7), id: \.self) { day in
                    let isSelected = day == selected
                    Button {
                        withAnimation(.snappy) { selected = day }
                    } label: {
                        VStack(spacing: 6) {
                            Text(Day.date(day).formatted(.dateTime.weekday(.narrow).locale(Locale(identifier: "fr_FR"))).uppercased())
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(isSelected ? .white : .secondary)
                            ZStack {
                                ProgressRing(progress: store.totals(on: day).kcal / target,
                                             colors: isSelected ? [.white, .white] : Palette.kcalGradient, lineWidth: 4,
                                             showsEmptyCap: false)
                                Text(Day.date(day).formatted(.dateTime.day()))
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(isSelected ? .white : .primary)
                            }
                            .frame(width: 32, height: 32)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(isSelected ? Glass.regular.tint(.accentColor).interactive() : .regular.interactive(),
                                 in: .rect(cornerRadius: 18))
                }
            }
        }
        .sensoryFeedback(.selection, trigger: selected)
    }
}

private struct MealCard: View {
    var meal: Meal
    var entries: [Entry]
    var onAdd: () -> Void
    var onOpen: (Entry) -> Void

    var body: some View {
        let kcal = entries.reduce(0) { $0 + $1.macros.kcal }
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: meal.symbol)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.accentColor)
                    .frame(width: 30, height: 30)
                    .background(Color.accentColor.opacity(0.12), in: .circle)
                Text(meal.label).font(.headline)
                Spacer()
                if !entries.isEmpty {
                    Text("\(kcal.whole) kcal").font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                }
                Button(action: onAdd) {
                    Image(systemName: "plus").font(.subheadline.weight(.bold)).frame(width: 18, height: 18)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .accessibilityLabel("Ajouter au \(meal.label.lowercased())")
            }
            ForEach(entries) { entry in
                Button { onOpen(entry) } label: { EntryRow(entry: entry) }
                    .buttonStyle(.plain)
            }
        }
        .glassCard(cornerRadius: 26, padding: 16)
    }
}

private struct EntryRow: View {
    var entry: Entry

    var body: some View {
        let m = entry.macros
        HStack(spacing: 12) {
            if let photo = entry.photoFile {
                PhotoThumbnail(file: photo, size: 44)
            } else {
                Image(systemName: entry.items.first?.source == .openFoodFacts ? "barcode" : "fork.knife")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .background(.quaternary.opacity(0.5), in: .rect(cornerRadius: 13))
            }
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    if entry.isAIScan { Image(systemName: "sparkles").font(.caption).foregroundStyle(Color.accentColor) }
                    Text(entry.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                }
                Text("\(entry.grams.whole) g · P \(m.protein.whole) g · Fib \(m.fiber.decimal()) g")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(m.kcal.whole).font(.subheadline.weight(.bold)).monospacedDigit()
        }
        .contentShape(.rect)
    }
}
