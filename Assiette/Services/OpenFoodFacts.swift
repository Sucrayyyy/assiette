import Foundation

/// Open Food Facts : base ouverte et collaborative, très complète pour les produits vendus en France.
enum OpenFoodFacts {
    private static let userAgent = "Assiette/1.0 (app iOS de suivi nutritionnel)"
    private static let fields = "code,product_name,product_name_fr,generic_name_fr,brands,nutriments,serving_quantity,serving_size,image_front_small_url"

    struct ServiceError: LocalizedError {
        var errorDescription: String? { "Open Food Facts ne répond pas. Vérifie ta connexion." }
    }

    static func search(_ query: String) async throws -> [Food] {
        var components = URLComponents(string: "https://search.openfoodfacts.org/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: "\(query) countries_tags:\"en:france\""),
            URLQueryItem(name: "page_size", value: "30"),
            URLQueryItem(name: "langs", value: "fr"),
            URLQueryItem(name: "sort_by", value: "-unique_scans_n"),
            URLQueryItem(name: "fields", value: fields),
        ]
        let json = try await fetch(components.url!)
        let hits = json["hits"] as? [[String: Any]] ?? []
        return hits.compactMap { food(from: $0, code: $0["code"] as? String) }
    }

    static func product(barcode: String) async throws -> Food? {
        let url = URL(string: "https://world.openfoodfacts.org/api/v2/product/\(barcode).json?fields=\(fields)")!
        let json = try await fetch(url)
        guard let product = json["product"] as? [String: Any] else { return nil }
        return food(from: product, code: barcode)
    }

    private static func fetch(_ url: URL) async throws -> [String: Any] {
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 || http.statusCode == 404 else {
            throw ServiceError()
        }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
    }

    private static func number(_ value: Any?) -> Double {
        switch value {
        case let n as NSNumber: n.doubleValue
        case let s as String: Double(s.replacingOccurrences(of: ",", with: ".")) ?? 0
        default: 0
        }
    }

    private static func food(from p: [String: Any], code: String?) -> Food? {
        let name = [p["product_name_fr"], p["product_name"], p["generic_name_fr"]]
            .compactMap { ($0 as? String)?.trimmingCharacters(in: .whitespaces) }
            .first { !$0.isEmpty }
        guard let name, let n = p["nutriments"] as? [String: Any] else { return nil }

        var kcal = number(n["energy-kcal_100g"])
        if kcal == 0 { kcal = number(n["energy_100g"]) / 4.184 }
        let macros = Macros(kcal: kcal, protein: number(n["proteins_100g"]), carbs: number(n["carbohydrates_100g"]),
                            fat: number(n["fat_100g"]), fiber: number(n["fiber_100g"]))
        guard macros.kcal > 0 || macros.protein > 0 || macros.carbs > 0 else { return nil }

        let brands: String? = switch p["brands"] {
        case let s as String: s
        case let a as [String]: a.first
        default: nil
        }
        let brand = brands?.split(separator: ",").first.map { $0.trimmingCharacters(in: .whitespaces) }
        let serving = number(p["serving_quantity"])

        return Food(
            id: "off-\(code ?? name)",
            name: name,
            brand: brand?.isEmpty == false ? brand : nil,
            per100: macros,
            servingG: serving > 0 ? serving : nil,
            servingLabel: serving > 0 ? (p["serving_size"] as? String ?? "1 portion") : nil,
            source: .openFoodFacts,
            imageURL: (p["image_front_small_url"] as? String).flatMap(URL.init(string:))
        )
    }
}
