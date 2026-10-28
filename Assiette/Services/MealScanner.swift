import Foundation
import UIKit

struct ScanItem: Identifiable, Hashable {
    enum Confidence: String { case haute, moyenne, faible }

    var id = UUID()
    var name: String
    var brand: String?
    var grams: Double
    var per100: Macros
    var source: FoodSource
    var confidence: Confidence

    var macros: Macros { per100.scaled(to: grams) }
    var entryItem: EntryItem { EntryItem(name: name, brand: brand, grams: grams, per100: per100, source: source) }
}

struct ScanResult {
    var dish: String
    var notes: String
    var items: [ScanItem]

    var macros: Macros { items.reduce(.zero) { $0 + $1.macros } }
}

/// Analyse d'une photo de repas avec Claude (API Anthropic, appel HTTP direct : pas de SDK Swift officiel).
enum MealScanner {
    struct ScanError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    private static let systemPrompt = """
    Tu es un nutritionniste qui estime le contenu d'un repas à partir d'une photo, pour une app de suivi des calories utilisée en France.
    - Décompose le plat en ingrédients distincts et visibles (ex. "Blanc de poulet grillé", "Riz basmati cuit", "Sauce crème"), y compris les matières grasses de cuisson et les sauces probables.
    - Estime le poids de chaque ingrédient tel que servi (cuit), en t'aidant de la taille de l'assiette, des couverts et des portions habituelles en France.
    - Donne les valeurs nutritionnelles pour 100 g de l'aliment tel que servi, cohérentes avec la table CIQUAL de l'ANSES. Pour un produit de marque reconnaissable, utilise ses valeurs.
    - Si l'utilisateur donne des précisions ou des corrections, elles priment sur ce que tu vois : applique-les et réajuste le reste en conséquence.
    - Noms en français, courts et précis.
    """

    private static let schema: [String: Any] = [
        "type": "object",
        "properties": [
            "dish": ["type": "string", "description": "Nom court du plat, en français"],
            "notes": ["type": "string", "description": "Une phrase maximum : hypothèse importante ou incertitude"],
            "items": [
                "type": "array",
                "items": [
                    "type": "object",
                    "properties": [
                        "name": ["type": "string"],
                        "grams": ["type": "number", "description": "Quantité estimée sur la photo, en grammes"],
                        "kcal_100g": ["type": "number"],
                        "protein_100g": ["type": "number"],
                        "carbs_100g": ["type": "number"],
                        "fat_100g": ["type": "number"],
                        "fiber_100g": ["type": "number"],
                        "confidence": ["type": "string", "enum": ["haute", "moyenne", "faible"]],
                    ],
                    "required": ["name", "grams", "kcal_100g", "protein_100g", "carbs_100g", "fat_100g", "fiber_100g", "confidence"],
                    "additionalProperties": false,
                ],
            ],
        ],
        "required": ["dish", "notes", "items"],
        "additionalProperties": false,
    ]

    private struct Payload: Decodable {
        struct Item: Decodable {
            let name: String
            let grams: Double
            let kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g: Double
            let confidence: String
        }
        let dish: String
        let notes: String
        let items: [Item]
    }

    /// - Parameters:
    ///   - previous: l'analyse déjà ajustée par l'utilisateur, pour une réanalyse.
    ///   - correction: ce que l'utilisateur veut corriger ("le blanc c'est du riz complet…").
    static func analyze(jpeg: Data, previous: ScanResult? = nil, correction: String? = nil) async throws -> ScanResult {
        guard let apiKey = Keychain.apiKey, !apiKey.isEmpty else {
            throw ScanError(message: "Ajoute ta clé API Anthropic dans Profil › Scan IA pour activer le scan.")
        }

        var text = "Analyse ce repas et estime chaque ingrédient."
        if let previous {
            let list = previous.items.map { "- \($0.name) : \(Int($0.grams)) g" }.joined(separator: "\n")
            text += "\n\nAnalyse actuelle (déjà ajustée par l'utilisateur, garde ses quantités sauf indication contraire) :\n\(list)"
        }
        if let correction, !correction.isEmpty {
            text += "\n\nCorrections de l'utilisateur : \(correction)\nRenvoie la liste complète mise à jour."
        }

        let body: [String: Any] = [
            "model": "claude-opus-5-5",
            "max_tokens": 16000,
            "system": systemPrompt,
            "output_config": [
                "effort": "medium",
                "format": ["type": "json_schema", "schema": schema],
            ],
            // Si une requête est refusée, l'API la relance automatiquement sur un autre modèle.
            "fallbacks": "default",
            "messages": [[
                "role": "user",
                "content": [
                    ["type": "image", "source": ["type": "base64", "media_type": "image/jpeg", "data": jpeg.base64EncodedString()]],
                    ["type": "text", "text": text],
                ],
            ]],
        ]

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!, timeoutInterval: 180)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2026-10-21", forHTTPHeaderField: "anthropic-version")
        request.setValue("server-side-fallback-2026-07-01", forHTTPHeaderField: "anthropic-beta")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw ScanError(message: "Pas de connexion internet. Réessaie dans un instant.")
        }

        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else {
            let apiMessage = (json["error"] as? [String: Any])?["message"] as? String
            let message: String = switch status {
            case 401: "Clé API invalide. Vérifie-la dans Profil › Scan IA."
            case 429: "Trop de demandes d'un coup. Réessaie dans quelques secondes."
            case 500...: "Le service IA est surchargé. Réessaie dans un instant."
            default: apiMessage ?? "L'analyse a échoué (erreur \(status))."
            }
            throw ScanError(message: message)
        }

        switch json["stop_reason"] as? String {
        case "refusal": throw ScanError(message: "L'IA n'a pas pu analyser cette image.")
        case "max_tokens": throw ScanError(message: "Réponse incomplète, réessaie.")
        default: break
        }

        let blocks = json["content"] as? [[String: Any]] ?? []
        guard let output = blocks.first(where: { $0["type"] as? String == "text" })?["text"] as? String,
              let payload = try? JSONDecoder().decode(Payload.self, from: Data(output.utf8)) else {
            throw ScanError(message: "Réponse de l'IA illisible, réessaie.")
        }

        return ScanResult(
            dish: payload.dish,
            notes: payload.notes,
            items: payload.items.map {
                ScanItem(name: $0.name, grams: max(0, $0.grams.rounded()),
                         per100: Macros(kcal: $0.kcal_100g, protein: $0.protein_100g, carbs: $0.carbs_100g,
                                        fat: $0.fat_100g, fiber: $0.fiber_100g),
                         source: .ai, confidence: ScanItem.Confidence(rawValue: $0.confidence) ?? .moyenne)
            }
        )
    }
}

enum ImageTools {
    /// Réduit la photo (côté max 1280 px) et la compresse en JPEG pour un envoi rapide.
    static func preparedJPEG(from data: Data, maxSide: CGFloat = 1280) -> (jpeg: Data, image: UIImage)? {
        guard let image = UIImage(data: data) else { return nil }
        let scale = min(1, maxSide / max(image.size.width, image.size.height))
        let size = CGSize(width: (image.size.width * scale).rounded(), height: (image.size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        guard let jpeg = resized.jpegData(compressionQuality: 0.75) else { return nil }
        return (jpeg, resized)
    }
}
