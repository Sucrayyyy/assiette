import Foundation

struct Macros: Codable, Hashable {
    var kcal: Double = 0
    var protein: Double = 0
    var carbs: Double = 0
    var fat: Double = 0
    var fiber: Double = 0

    static let zero = Macros()

    static func + (a: Macros, b: Macros) -> Macros {
        Macros(kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs,
               fat: a.fat + b.fat, fiber: a.fiber + b.fiber)
    }

    /// Valeurs pour `grams` grammes, à partir de valeurs pour 100 g.
    func scaled(to grams: Double) -> Macros {
        let f = grams / 100
        return Macros(kcal: kcal * f, protein: protein * f, carbs: carbs * f, fat: fat * f, fiber: fiber * f)
    }
}

enum Sex: String, Codable, CaseIterable, Identifiable {
    case homme, femme
    var id: Self { self }
    var label: String { self == .homme ? "Homme" : "Femme" }
}

enum Activity: String, Codable, CaseIterable, Identifiable {
    case sedentaire, leger, modere, actif, tresActif
    var id: Self { self }

    var label: String {
        switch self {
        case .sedentaire: "Sédentaire"
        case .leger: "Légèrement actif"
        case .modere: "Modérément actif"
        case .actif: "Très actif"
        case .tresActif: "Extrêmement actif"
        }
    }

    var detail: String {
        switch self {
        case .sedentaire: "Bureau, peu ou pas de sport"
        case .leger: "Sport 1 à 3 fois par semaine"
        case .modere: "Sport 3 à 5 fois par semaine"
        case .actif: "Sport 6 à 7 fois par semaine"
        case .tresActif: "Métier physique et sport intense"
        }
    }

    var symbol: String {
        switch self {
        case .sedentaire: "sofa.fill"
        case .leger: "figure.walk"
        case .modere: "figure.run"
        case .actif: "figure.strengthtraining.traditional"
        case .tresActif: "flame.fill"
        }
    }

    var factor: Double {
        switch self {
        case .sedentaire: 1.2
        case .leger: 1.375
        case .modere: 1.55
        case .actif: 1.725
        case .tresActif: 1.9
        }
    }
}

enum Goal: String, Codable, CaseIterable, Identifiable {
    case perte, maintien, prise
    var id: Self { self }

    var label: String {
        switch self {
        case .perte: "Perdre du poids"
        case .maintien: "Garder mon poids"
        case .prise: "Prendre du muscle"
        }
    }

    var detail: String {
        switch self {
        case .perte: "Environ -0,5 kg par semaine"
        case .maintien: "Manger à l'équilibre"
        case .prise: "Environ +0,25 kg par semaine"
        }
    }

    var symbol: String {
        switch self {
        case .perte: "arrow.down.right"
        case .maintien: "equal"
        case .prise: "arrow.up.right"
        }
    }
}

struct Profile: Codable, Equatable {
    var firstName: String
    var sex: Sex
    var age: Int
    var heightCm: Double
    var weightKg: Double
    var activity: Activity
    var goal: Goal
    /// Objectifs saisis à la main ; `nil` = calculés automatiquement.
    var customTargets: Macros?

    var targets: Macros { customTargets ?? Nutrition.targets(for: self) }
}

enum Meal: String, Codable, CaseIterable, Identifiable {
    case petitDej, dejeuner, collation, diner
    var id: Self { self }

    var label: String {
        switch self {
        case .petitDej: "Petit-déjeuner"
        case .dejeuner: "Déjeuner"
        case .collation: "Collation"
        case .diner: "Dîner"
        }
    }

    var shortLabel: String {
        switch self {
        case .petitDej: "Petit-déj"
        case .dejeuner: "Déjeuner"
        case .collation: "Collation"
        case .diner: "Dîner"
        }
    }

    var symbol: String {
        switch self {
        case .petitDej: "cup.and.saucer.fill"
        case .dejeuner: "fork.knife"
        case .collation: "carrot.fill"
        case .diner: "moon.stars.fill"
        }
    }

    /// Repas proposé par défaut selon l'heure.
    static func forNow(_ date: Date = .now) -> Meal {
        switch Calendar.current.component(.hour, from: date) {
        case ..<11: .petitDej
        case ..<15: .dejeuner
        case ..<18: .collation
        default: .diner
        }
    }
}

enum FoodSource: String, Codable {
    case generic, openFoodFacts, ai, custom
}

struct Food: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var brand: String?
    var per100: Macros
    var servingG: Double?
    var servingLabel: String?
    var source: FoodSource
    var imageURL: URL?

    var displayName: String { brand.map { "\(name) · \($0)" } ?? name }
}

struct EntryItem: Codable, Hashable, Identifiable {
    var id = UUID()
    var name: String
    var brand: String?
    var grams: Double
    var per100: Macros
    var source: FoodSource

    var macros: Macros { per100.scaled(to: grams) }

    init(name: String, brand: String? = nil, grams: Double, per100: Macros, source: FoodSource) {
        self.name = name
        self.brand = brand
        self.grams = grams
        self.per100 = per100
        self.source = source
    }

    init(food: Food, grams: Double) {
        self.init(name: food.name, brand: food.brand, grams: grams, per100: food.per100, source: food.source)
    }
}

struct Entry: Codable, Hashable, Identifiable {
    var id = UUID()
    var day: String
    var meal: Meal
    var title: String
    var items: [EntryItem]
    var photoFile: String?
    var createdAt = Date()

    var macros: Macros { items.reduce(.zero) { $0 + $1.macros } }
    var grams: Double { items.reduce(0) { $0 + $1.grams } }
    var isAIScan: Bool { items.contains { $0.source == .ai } || photoFile != nil }
}

struct WeightEntry: Codable, Hashable, Identifiable {
    var id = UUID()
    var day: String
    var kg: Double
}

/// Jours stockés sous forme "AAAA-MM-JJ" (indépendant du fuseau).
enum Day {
    static var today: String { key(.now) }

    static func key(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func date(_ key: String) -> Date {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return .now }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])) ?? .now
    }

    static func shift(_ key: String, by days: Int) -> String {
        Self.key(Calendar.current.date(byAdding: .day, value: days, to: date(key)) ?? .now)
    }

    static func lastDays(_ count: Int, endingAt end: String = today) -> [String] {
        (0..<count).reversed().map { shift(end, by: -$0) }
    }

    static func label(_ key: String) -> String {
        if key == today { return "Aujourd'hui" }
        if key == shift(today, by: -1) { return "Hier" }
        return date(key).formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "fr_FR"))).capitalized
    }
}
