import SwiftUI

struct ProfileScreen: View {
    @Environment(AppStore.self) private var store
    @State private var draft: Profile?
    @State private var apiKey = ""
    @State private var hasKey = Keychain.apiKey != nil
    @State private var confirmReset = false
    @State private var keySaved = 0

    var body: some View {
        NavigationStack {
            Form {
                if let binding = Binding($draft) {
                    profileSections(binding)
                }

                Section {
                    if hasKey {
                        Label("Clé API enregistrée sur ce téléphone", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(Palette.fiber)
                    }
                    SecureField(hasKey ? "Remplacer la clé (sk-ant-…)" : "Colle ta clé (sk-ant-…)", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button(hasKey && apiKey.isEmpty ? "Supprimer la clé" : "Enregistrer la clé") {
                        Keychain.apiKey = apiKey
                        hasKey = Keychain.apiKey != nil
                        apiKey = ""
                        keySaved += 1
                    }
                    .disabled(!hasKey && apiKey.isEmpty)
                } header: {
                    Text("Scan IA")
                } footer: {
                    Text("Le scan photo utilise Claude, l'IA d'Anthropic. Crée une clé sur console.anthropic.com : elle reste chiffrée dans le trousseau de ton iPhone.")
                }

                Section {
                    Button("Réinitialiser l'app", role: .destructive) { confirmReset = true }
                } footer: {
                    Text("Base d'aliments : Open Food Facts (licence ODbL) et valeurs moyennes de type CIQUAL.")
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppBackground())
            .navigationTitle("Profil")
            .onAppear { draft = store.profile }
            .onChange(of: draft) { _, new in
                if let new, new != store.profile { store.setProfile(new) }
            }
            .onChange(of: store.profile) { _, new in
                if new != draft { draft = new }
            }
            .confirmationDialog("Tout effacer ?", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Effacer mon profil et mon journal", role: .destructive) { store.reset() }
            }
            .sensoryFeedback(.success, trigger: keySaved)
        }
    }

    @ViewBuilder
    private func profileSections(_ p: Binding<Profile>) -> some View {
        Section("Moi") {
            TextField("Prénom", text: p.firstName)
            Picker("Sexe", selection: p.sex) {
                ForEach(Sex.allCases) { Text($0.label).tag($0) }
            }
            Stepper("Âge : \(p.wrappedValue.age) ans", value: p.age, in: 14...100)
            Stepper("Taille : \(p.wrappedValue.heightCm.whole) cm", value: p.heightCm, in: 120...230)
            Stepper("Poids : \(p.wrappedValue.weightKg.decimal()) kg", value: p.weightKg, in: 35...250, step: 0.5)
        }

        Section("Mode de vie") {
            Picker("Activité", selection: p.activity) {
                ForEach(Activity.allCases) { Text($0.label).tag($0) }
            }
            Picker("Objectif", selection: p.goal) {
                ForEach(Goal.allCases) { Text($0.label).tag($0) }
            }
        }

        Section {
            let targets = p.wrappedValue.targets
            Toggle("Objectifs personnalisés", isOn: Binding(
                get: { p.wrappedValue.customTargets != nil },
                set: { p.wrappedValue.customTargets = $0 ? Nutrition.targets(for: p.wrappedValue) : nil }
            ))
            if p.wrappedValue.customTargets != nil {
                targetField("Calories", unit: "kcal", value: p.customTargets, keyPath: \.kcal)
                targetField("Protéines", unit: "g", value: p.customTargets, keyPath: \.protein)
                targetField("Fibres", unit: "g", value: p.customTargets, keyPath: \.fiber)
                targetField("Glucides", unit: "g", value: p.customTargets, keyPath: \.carbs)
                targetField("Lipides", unit: "g", value: p.customTargets, keyPath: \.fat)
            } else {
                LabeledContent("Calories", value: "\(targets.kcal.whole) kcal")
                LabeledContent("Protéines", value: "\(targets.protein.whole) g")
                LabeledContent("Fibres", value: "\(targets.fiber.whole) g")
                LabeledContent("Glucides", value: "\(targets.carbs.whole) g")
                LabeledContent("Lipides", value: "\(targets.fat.whole) g")
            }
        } header: {
            Text("Mes objectifs par jour")
        } footer: {
            Text("Calculés avec la formule de Mifflin-St Jeor selon ton profil et ton activité.")
        }
    }

    private func targetField(_ label: String, unit: String, value: Binding<Macros?>, keyPath: WritableKeyPath<Macros, Double>) -> some View {
        LabeledContent(label) {
            HStack(spacing: 4) {
                TextField(label, value: Binding(
                    get: { value.wrappedValue?[keyPath: keyPath] ?? 0 },
                    set: { value.wrappedValue?[keyPath: keyPath] = $0 }
                ), format: .number.precision(.fractionLength(0)))
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                Text(unit).foregroundStyle(.secondary)
            }
        }
    }
}
