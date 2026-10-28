import SwiftUI

/// Recherche d'aliments : base intégrée + Open Food Facts (marques en France) + code-barres.
struct FoodSearchView: View {
    enum Mode {
        /// Ajoute directement au journal.
        case log(day: String, meal: Meal?)
        /// Renvoie l'aliment choisi (remplacement d'un ingrédient du scan IA).
        case pick(initialGrams: Double?, onPick: (Food, Double) -> Void)
    }

    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let mode: Mode
    var initialQuery = ""

    @State private var query = ""
    @State private var results: [Food] = []
    @State private var loading = false
    @State private var errorText: String?
    @State private var selected: Food?
    @State private var scanning = false
    @State private var notFound: String?
    @State private var addedCount = 0

    var body: some View {
        List {
            if query.trimmingCharacters(in: .whitespaces).count < 2 {
                if !store.recents.isEmpty {
                    Section("Récents") {
                        ForEach(store.recents.prefix(12)) { row($0) }
                    }
                }
                Section("Idées") {
                    ForEach(FoodDatabase.suggestions) { row($0) }
                }
            } else {
                if let errorText {
                    Label(errorText, systemImage: "wifi.exclamationmark")
                        .foregroundStyle(.secondary)
                        .listRowBackground(Color.clear)
                }
                ForEach(results) { row($0) }
                if loading {
                    HStack { Spacer(); ProgressView(); Spacer() }
                        .listRowBackground(Color.clear)
                } else if results.isEmpty && errorText == nil {
                    ContentUnavailableView.search(text: query)
                        .listRowBackground(Color.clear)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(AppBackground())
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Aliment, marque, plat…")
        .autocorrectionDisabled()
        .task(id: query) { await runSearch() }
        .onAppear { if query.isEmpty { query = initialQuery } }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Scanner un code-barres", systemImage: "barcode.viewfinder") { scanning = true }
            }
            if case .pick = mode {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer", systemImage: "xmark") { dismiss() }
                }
            }
        }
        .sheet(item: $selected) { food in
            PortionSheet(food: food, mode: mode) { grams, meal in
                confirm(food: food, grams: grams, meal: meal)
            }
        }
        .fullScreenCover(isPresented: $scanning) {
            BarcodeScannerView { code in
                scanning = false
                Task { await lookup(barcode: code) }
            }
        }
        .alert("Produit introuvable", isPresented: .constant(notFound != nil), presenting: notFound) { _ in
            Button("OK") { notFound = nil }
        } message: { code in
            Text("Le code \(code) n'est pas dans Open Food Facts. Cherche le produit par son nom.")
        }
        .sensoryFeedback(.success, trigger: addedCount)
    }

    private func row(_ food: Food) -> some View {
        Button { selected = food } label: { FoodRow(food: food) }
            .buttonStyle(.plain)
            .listRowBackground(Rectangle().fill(.clear).glassEffect(.regular, in: .rect(cornerRadius: 0)))
    }

    private func runSearch() async {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard q.count >= 2 else {
            results = []
            return
        }
        let local = FoodDatabase.search(q)
        results = local
        errorText = nil
        loading = true
        // Petite pause pour ne pas lancer une requête à chaque lettre.
        try? await Task.sleep(for: .milliseconds(350))
        guard !Task.isCancelled else { return }
        do {
            let remote = try await OpenFoodFacts.search(q)
            guard !Task.isCancelled else { return }
            results = local + remote
        } catch {
            if !Task.isCancelled { errorText = "Recherche en ligne indisponible, résultats de base uniquement." }
        }
        if !Task.isCancelled { loading = false }
    }

    private func lookup(barcode: String) async {
        loading = true
        defer { loading = false }
        if let food = try? await OpenFoodFacts.product(barcode: barcode) {
            // Laisse le scanner se fermer avant d'ouvrir la fiche.
            try? await Task.sleep(for: .milliseconds(350))
            selected = food
        } else {
            notFound = barcode
        }
    }

    private func confirm(food: Food, grams: Double, meal: Meal) {
        selected = nil
        switch mode {
        case let .log(day, _):
            store.addFood(food, grams: grams, meal: meal, day: day)
            addedCount += 1
            if case let .log(_, presetMeal) = mode, presetMeal != nil { dismiss() }
        case let .pick(_, onPick):
            store.pushRecent(food)
            onPick(food, grams)
            dismiss()
        }
    }
}

struct FoodRow: View {
    var food: Food

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: food.imageURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: food.source == .openFoodFacts ? "shippingbox.fill" : "leaf.fill")
                    .font(.subheadline)
                    .foregroundStyle(food.source == .openFoodFacts ? Color.secondary : Color.accentColor)
            }
            .frame(width: 42, height: 42)
            .background(.quaternary.opacity(0.4))
            .clipShape(.rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 2) {
                Text(food.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 4)
            Image(systemName: "plus.circle.fill")
                .font(.title3)
                .foregroundStyle(Color.accentColor)
        }
        .foregroundStyle(.primary)
        .contentShape(.rect)
    }

    private var subtitle: String {
        let origin = food.brand ?? (food.source == .generic ? "Aliment de base" : "")
        let macros = "\(food.per100.kcal.whole) kcal · P \(food.per100.protein.decimal()) g · Fib \(food.per100.fiber.decimal()) g"
        return origin.isEmpty ? "\(macros) /100 g" : "\(origin) · \(macros)"
    }
}
