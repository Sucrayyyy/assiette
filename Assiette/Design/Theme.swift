import SwiftUI

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacity)
    }
}

enum Palette {
    static let kcal = Color(hex: 0xFF6A4D)
    static let kcalGradient = [Color(hex: 0xFFB347), Color(hex: 0xFF5E62)]
    static let protein = Color(hex: 0x4D7CFE)
    static let proteinGradient = [Color(hex: 0x7FA6FF), Color(hex: 0x3D5AFE)]
    static let fiber = Color(hex: 0x1FB57A)
    static let fiberGradient = [Color(hex: 0x7EE0A8), Color(hex: 0x12A06B)]
    static let carbs = Color(hex: 0xF2A93B)
    static let fat = Color(hex: 0xE5679A)
}

/// Fond doux en dégradé « mesh » : c'est lui qui donne vie au verre Liquid Glass posé dessus.
struct AppBackground: View {
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        MeshGradient(
            width: 3, height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.6, 0.45], [1, 0.5],
                [0, 1], [0.5, 1], [1, 1],
            ],
            colors: scheme == .dark ? darkColors : lightColors
        )
        .ignoresSafeArea()
    }

    private var lightColors: [Color] {
        [Color(hex: 0xE6F7EE), Color(hex: 0xF4F8F1), Color(hex: 0xFFF1E4),
         Color(hex: 0xEAF4FF), Color(hex: 0xF8FAF6), Color(hex: 0xFFE9E1),
         Color(hex: 0xF1F0FF), Color(hex: 0xEEF8F2), Color(hex: 0xFFF6E8)]
    }

    private var darkColors: [Color] {
        [Color(hex: 0x0E1F17), Color(hex: 0x111614), Color(hex: 0x24170F),
         Color(hex: 0x0F1824), Color(hex: 0x101312), Color(hex: 0x241211),
         Color(hex: 0x16142A), Color(hex: 0x0E1A14), Color(hex: 0x231B0D)]
    }
}

extension View {
    /// Carte en verre Liquid Glass.
    func glassCard(cornerRadius: CGFloat = 28, padding: CGFloat = 18, tint: Color? = nil) -> some View {
        self
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassEffect(tint.map { Glass.regular.tint($0.opacity(0.25)) } ?? .regular,
                         in: .rect(cornerRadius: cornerRadius))
    }
}

extension Double {
    /// Nombre arrondi formaté à la française (espaces fines pour les milliers).
    var whole: String { Int(rounded()).formatted(.number.locale(Locale(identifier: "fr_FR"))) }

    func decimal(_ digits: Int = 1) -> String {
        formatted(.number.precision(.fractionLength(0...digits)).locale(Locale(identifier: "fr_FR")))
    }
}
