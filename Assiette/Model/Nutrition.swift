import Foundation

enum Nutrition {
    /// Métabolisme de base, formule de Mifflin-St Jeor.
    static func bmr(sex: Sex, weightKg: Double, heightCm: Double, age: Int) -> Double {
        let base = 10 * weightKg + 6.25 * heightCm - 5 * Double(age)
        return sex == .homme ? base + 5 : base - 161
    }

    static func targets(for p: Profile) -> Macros {
        let tdee = bmr(sex: p.sex, weightKg: p.weightKg, heightCm: p.heightCm, age: p.age) * p.activity.factor

        var kcal = tdee
        switch p.goal {
        case .perte: kcal = max(tdee - 500, p.sex == .homme ? 1500 : 1200)
        case .prise: kcal = tdee + 300
        case .maintien: break
        }

        // Protéines en g/kg, plus hautes en sèche et en prise de muscle.
        let proteinPerKg: Double = switch p.goal {
        case .maintien: 1.6
        case .perte: 1.8
        case .prise: 2.0
        }
        let protein = p.weightKg * proteinPerKg
        // Lipides : 30 % des calories. Glucides : le reste.
        let fat = kcal * 0.30 / 9
        let carbs = max(0, (kcal - protein * 4 - fat * 9) / 4)
        // Fibres : 14 g pour 1000 kcal, au moins 30 g (repère ANSES).
        let fiber = max(30, kcal / 1000 * 14)

        return Macros(kcal: (kcal / 10).rounded() * 10, protein: protein.rounded(), carbs: carbs.rounded(),
                      fat: fat.rounded(), fiber: fiber.rounded())
    }

    /// Petite phrase de coaching affichée sur l'accueil.
    static func coachMessage(totals t: Macros, targets g: Macros, hasEntries: Bool, isToday: Bool) -> String {
        guard hasEntries else {
            if !isToday { return "Rien de noté ce jour-là." }
            return Calendar.current.component(.hour, from: .now) < 11
                ? "Nouvelle journée. Commence par scanner ton petit-déj 📸"
                : "Rien de noté pour l'instant. Un scan et c'est parti ✨"
        }
        let proteinLeft = g.protein - t.protein
        let fiberLeft = g.fiber - t.fiber
        if t.kcal > g.kcal * 1.05 {
            return "Objectif dépassé de \(Int(t.kcal - g.kcal)) kcal. Pas grave, demain est un autre jour 🌱"
        }
        if proteinLeft <= 0 && fiberLeft <= 0 { return "Protéines et fibres au top aujourd'hui 🎉" }
        if proteinLeft > 20 {
            return "Encore \(Int(proteinLeft)) g de protéines : un skyr ou un blanc de poulet et c'est plié 💪"
        }
        if fiberLeft > 8 {
            return "Il te manque \(Int(fiberLeft)) g de fibres : légumes, lentilles ou une pomme 🍎"
        }
        return "Tu es pile dans le rythme, continue comme ça ✨"
    }
}
