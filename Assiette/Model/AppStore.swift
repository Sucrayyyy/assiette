import Foundation
import Observation

/// État de l'app, sauvegardé dans un fichier JSON sur le téléphone.
@Observable
final class AppStore {
    private(set) var profile: Profile?
    private(set) var entries: [Entry] = []
    private(set) var weights: [WeightEntry] = []
    private(set) var recents: [Food] = []

    private struct Snapshot: Codable {
        var profile: Profile?
        var entries: [Entry]
        var weights: [WeightEntry]
        var recents: [Food]
    }

    private static let fileURL = URL.applicationSupportDirectory.appending(path: "assiette.json")
    static let photosDirectory = URL.documentsDirectory.appending(path: "photos", directoryHint: .isDirectory)

    init() {
        guard let data = try? Data(contentsOf: Self.fileURL),
              let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data) else { return }
        profile = snapshot.profile
        entries = snapshot.entries
        weights = snapshot.weights
        recents = snapshot.recents
    }

    private func save() {
        let snapshot = Snapshot(profile: profile, entries: entries, weights: weights, recents: recents)
        do {
            try FileManager.default.createDirectory(at: URL.applicationSupportDirectory, withIntermediateDirectories: true)
            try JSONEncoder().encode(snapshot).write(to: Self.fileURL, options: .atomic)
        } catch {
            print("Sauvegarde impossible : \(error)")
        }
    }

    // MARK: Profil

    func setProfile(_ p: Profile) {
        profile = p
        save()
    }

    func reset() {
        for entry in entries { deletePhoto(entry.photoFile) }
        profile = nil
        entries = []
        weights = []
        recents = []
        save()
    }

    // MARK: Journal

    func entries(on day: String) -> [Entry] {
        entries.filter { $0.day == day }.sorted { $0.createdAt < $1.createdAt }
    }

    func totals(on day: String) -> Macros {
        entries(on: day).reduce(.zero) { $0 + $1.macros }
    }

    func add(_ entry: Entry) {
        entries.append(entry)
        save()
    }

    func addFood(_ food: Food, grams: Double, meal: Meal, day: String) {
        add(Entry(day: day, meal: meal, title: food.displayName, items: [EntryItem(food: food, grams: grams)]))
        pushRecent(food)
    }

    func update(_ entry: Entry) {
        guard let i = entries.firstIndex(where: { $0.id == entry.id }) else { return }
        entries[i] = entry
        save()
    }

    func delete(_ entry: Entry) {
        deletePhoto(entry.photoFile)
        entries.removeAll { $0.id == entry.id }
        save()
    }

    /// Jours consécutifs avec au moins une entrée (aujourd'hui compte s'il est déjà rempli).
    var streak: Int {
        let days = Set(entries.map(\.day))
        var day = days.contains(Day.today) ? Day.today : Day.shift(Day.today, by: -1)
        var count = 0
        while days.contains(day) {
            count += 1
            day = Day.shift(day, by: -1)
        }
        return count
    }

    // MARK: Aliments récents

    func pushRecent(_ food: Food) {
        recents.removeAll { $0.id == food.id }
        recents.insert(food, at: 0)
        recents = Array(recents.prefix(30))
        save()
    }

    // MARK: Poids

    func logWeight(_ kg: Double, day: String = Day.today) {
        weights.removeAll { $0.day == day }
        weights.append(WeightEntry(day: day, kg: kg))
        weights.sort { $0.day < $1.day }
        if var p = profile, day == Day.today {
            // Les objectifs automatiques suivent le poids.
            p.weightKg = kg
            profile = p
        }
        save()
    }

    // MARK: Photos

    func savePhoto(_ jpeg: Data) -> String? {
        let name = "\(UUID().uuidString).jpg"
        do {
            try FileManager.default.createDirectory(at: Self.photosDirectory, withIntermediateDirectories: true)
            try jpeg.write(to: Self.photosDirectory.appending(path: name), options: .atomic)
            return name
        } catch {
            return nil
        }
    }

    static func photoURL(_ file: String) -> URL { photosDirectory.appending(path: file) }

    private func deletePhoto(_ file: String?) {
        guard let file else { return }
        try? FileManager.default.removeItem(at: Self.photoURL(file))
    }
}
