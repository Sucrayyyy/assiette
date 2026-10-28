import Charts
import SwiftUI

struct ProgressScreen: View {
    @Environment(AppStore.self) private var store
    @State private var showWeight = false

    private struct DayStat: Identifiable {
        let day: String
        let macros: Macros
        var id: String { day }
        var label: String {
            Day.date(day).formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: "fr_FR"))).capitalized
        }
    }

    var body: some View {
        let targets = store.profile?.targets ?? .zero
        let stats = Day.lastDays(7).map { DayStat(day: $0, macros: store.totals(on: $0)) }
        let logged = stats.filter { $0.macros.kcal > 0 }
        let avg = logged.isEmpty ? Macros.zero : logged.reduce(.zero) { $0 + $1.macros }.scaled(to: 100 / Double(logged.count))

        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        statTile(value: "\(store.streak)", label: store.streak > 1 ? "jours d'affilée" : "jour d'affilée",
                                 symbol: "flame.fill", color: Palette.kcal)
                        statTile(value: "\(logged.count)/7", label: "jours notés", symbol: "checkmark.seal.fill", color: Palette.fiber)
                    }

                    chartCard(title: "Calories", subtitle: "Moyenne \(avg.kcal.whole) kcal · objectif \(targets.kcal.whole)",
                              stats: stats, value: \.kcal, goal: targets.kcal, colors: Palette.kcalGradient)
                    chartCard(title: "Protéines", subtitle: "Moyenne \(avg.protein.whole) g · objectif \(targets.protein.whole) g",
                              stats: stats, value: \.protein, goal: targets.protein, colors: Palette.proteinGradient)
                    chartCard(title: "Fibres", subtitle: "Moyenne \(avg.fiber.whole) g · objectif \(targets.fiber.whole) g",
                              stats: stats, value: \.fiber, goal: targets.fiber, colors: Palette.fiberGradient)
                    weightCard
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 40)
            }
            .scrollIndicators(.hidden)
            .background(AppBackground())
            .navigationTitle("Progrès")
            .sheet(isPresented: $showWeight) { WeightSheet() }
        }
    }

    private func statTile(value: String, label: String, symbol: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).font(.title3).foregroundStyle(color)
            Text(value).font(.title.weight(.heavy))
            Text(label).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
        }
        .glassCard(cornerRadius: 24, padding: 16)
    }

    private func chartCard(title: String, subtitle: String, stats: [DayStat], value: KeyPath<Macros, Double>,
                           goal: Double, colors: [Color]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline)
                Text(subtitle).font(.footnote).foregroundStyle(.secondary)
            }
            Chart {
                ForEach(stats) { stat in
                    BarMark(x: .value("Jour", stat.label), y: .value(title, stat.macros[keyPath: value]), width: .ratio(0.55))
                        .foregroundStyle(LinearGradient(colors: colors.reversed(), startPoint: .bottom, endPoint: .top))
                        .clipShape(.rect(cornerRadius: 6))
                }
                RuleMark(y: .value("Objectif", goal))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                    .foregroundStyle(.secondary)
            }
            .chartYAxis { AxisMarks(position: .leading) }
            .frame(height: 150)
        }
        .glassCard(cornerRadius: 28)
    }

    private var weightCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Poids").font(.headline)
                    if let last = store.weights.last ?? store.profile.map({ WeightEntry(day: Day.today, kg: $0.weightKg) }) {
                        Text("\(last.kg.decimal()) kg").font(.title2.weight(.heavy))
                    }
                }
                Spacer()
                Button("Noter", systemImage: "plus") { showWeight = true }
                    .buttonStyle(.glass)
            }
            if store.weights.count >= 2 {
                Chart(store.weights.suffix(30)) { entry in
                    LineMark(x: .value("Jour", Day.date(entry.day)), y: .value("Poids", entry.kg))
                        .interpolationMethod(.catmullRom)
                        .foregroundStyle(Color.accentColor)
                    PointMark(x: .value("Jour", Day.date(entry.day)), y: .value("Poids", entry.kg))
                        .foregroundStyle(Color.accentColor)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 140)
            } else {
                Text("Note ton poids régulièrement pour voir ta courbe. Tes objectifs s'ajustent automatiquement.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .glassCard(cornerRadius: 28)
    }
}

private struct WeightSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var kg: Double = 70

    var body: some View {
        NavigationStack {
            VStack(spacing: 8) {
                Picker("Poids", selection: $kg) {
                    ForEach(Array(stride(from: 35.0, through: 200.0, by: 0.1)), id: \.self) { value in
                        Text("\(value.decimal()) kg").tag((value * 10).rounded() / 10)
                    }
                }
                .pickerStyle(.wheel)
            }
            .padding()
            .navigationTitle("Mon poids aujourd'hui")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler", systemImage: "xmark") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer", systemImage: "checkmark") {
                        store.logWeight(kg)
                        dismiss()
                    }
                    .buttonStyle(.glassProminent)
                }
            }
        }
        .presentationDetents([.height(320)])
        .onAppear {
            let current = store.weights.last?.kg ?? store.profile?.weightKg ?? 70
            kg = (current * 10).rounded() / 10
        }
    }
}
