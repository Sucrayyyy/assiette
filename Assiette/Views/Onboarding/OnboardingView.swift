import SwiftUI

/// Premier lancement : une question par écran, puis la révélation des objectifs.
struct OnboardingView: View {
    @Environment(AppStore.self) private var store

    @State private var step = 0
    @State private var firstName = ""
    @State private var sex: Sex = .homme
    @State private var age = 25
    @State private var height = 175
    @State private var weight = 70.0
    @State private var activity: Activity = .modere
    @State private var goal: Goal = .maintien
    @FocusState private var nameFocused: Bool

    private let stepCount = 7

    private var profile: Profile {
        Profile(firstName: firstName.trimmingCharacters(in: .whitespaces), sex: sex, age: age,
                heightCm: Double(height), weightKg: weight, activity: activity, goal: goal)
    }

    var body: some View {
        VStack(spacing: 0) {
            if step > 0 {
                HStack(spacing: 12) {
                    Button { withAnimation(.smooth) { step -= 1 } } label: {
                        Image(systemName: "chevron.left").font(.headline).frame(width: 40, height: 40)
                    }
                    .glassEffect(.regular.interactive(), in: .circle)
                    .accessibilityLabel("Retour")
                    ProgressView(value: Double(step), total: Double(stepCount - 1))
                        .tint(.accentColor)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
            }

            ZStack {
                content
                    .id(step)
                    .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                            removal: .move(edge: .leading).combined(with: .opacity)))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Button(action: next) {
                Text(buttonLabel).font(.headline).frame(maxWidth: .infinity).padding(.vertical, 8)
            }
            .buttonStyle(.glassProminent)
            .disabled(step == 1 && firstName.trimmingCharacters(in: .whitespaces).isEmpty)
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
        .background(AppBackground())
        .sensoryFeedback(.selection, trigger: step)
    }

    private var buttonLabel: String {
        switch step {
        case 0: "Commencer"
        case stepCount - 1: "C'est parti"
        default: "Continuer"
        }
    }

    private func next() {
        if step == stepCount - 1 {
            store.setProfile(profile)
            store.logWeight(weight)
            return
        }
        nameFocused = false
        withAnimation(.smooth) { step += 1 }
        if step == 1 { nameFocused = true }
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case 0: welcome
        case 1:
            question("Comment tu t'appelles ?", subtitle: "Pour te dire bonjour comme il faut.") {
                TextField("Ton prénom", text: $firstName)
                    .font(.title.weight(.bold))
                    .multilineTextAlignment(.center)
                    .textContentType(.givenName)
                    .focused($nameFocused)
                    .submitLabel(.next)
                    .onSubmit(next)
                    .padding(.vertical, 18)
                    .glassEffect(.regular, in: .rect(cornerRadius: 24))
            }
        case 2:
            question("Enchanté \(firstName) !", subtitle: "Ton sexe et ton âge servent à calculer ton métabolisme.") {
                VStack(spacing: 16) {
                    Picker("Sexe", selection: $sex) {
                        ForEach(Sex.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Picker("Âge", selection: $age) {
                        ForEach(14...100, id: \.self) { Text("\($0) ans").tag($0) }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 160)
                    .glassEffect(.regular, in: .rect(cornerRadius: 24))
                }
            }
        case 3:
            question("Ta taille et ton poids", subtitle: "Tu pourras les mettre à jour quand tu veux.") {
                HStack(spacing: 12) {
                    Picker("Taille", selection: $height) {
                        ForEach(130...220, id: \.self) { Text("\($0) cm").tag($0) }
                    }
                    .pickerStyle(.wheel)
                    Picker("Poids", selection: $weight) {
                        ForEach(Array(stride(from: 35.0, through: 200.0, by: 0.5)), id: \.self) {
                            Text("\($0.decimal()) kg").tag($0)
                        }
                    }
                    .pickerStyle(.wheel)
                }
                .frame(height: 180)
                .glassEffect(.regular, in: .rect(cornerRadius: 24))
            }
        case 4:
            question("Ton niveau d'activité", subtitle: "Sois honnête, c'est entre nous.") {
                choices(Activity.allCases, selection: $activity, title: \.label, detail: \.detail, symbol: \.symbol)
            }
        case 5:
            question("Ton objectif", subtitle: "On adapte tes calories et tes protéines.") {
                choices(Goal.allCases, selection: $goal, title: \.label, detail: \.detail, symbol: \.symbol)
            }
        default:
            result
        }
    }

    private var welcome: some View {
        VStack(spacing: 26) {
            Spacer()
            ZStack {
                MacroRings(totals: Macros(kcal: 1700, protein: 90, fiber: 22),
                           targets: Macros(kcal: 2200, protein: 110, fiber: 30), size: 170, lineWidth: 16)
                Image(systemName: "fork.knife").font(.system(size: 34, weight: .bold)).foregroundStyle(Color.accentColor)
            }
            VStack(spacing: 10) {
                Text("Assiette").font(.system(size: 44, weight: .heavy, design: .rounded))
                Text("Prends ton plat en photo,\nl'IA s'occupe des calories.")
                    .font(.title3.weight(.medium))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            VStack(alignment: .leading, spacing: 14) {
                feature("camera.viewfinder", "Scan IA de tes plats, ajustable en un geste")
                feature("barcode.viewfinder", "Tous les produits vendus en France")
                feature("target", "Calories, protéines et fibres sur mesure")
            }
            .glassCard(cornerRadius: 26)
            .padding(.horizontal, 24)
            Spacer()
        }
    }

    private func feature(_ symbol: String, _ text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol).font(.headline).foregroundStyle(Color.accentColor).frame(width: 28)
            Text(text).font(.subheadline.weight(.medium))
        }
    }

    private var result: some View {
        let t = profile.targets
        return VStack(spacing: 24) {
            Spacer()
            Text("Tes objectifs, \(profile.firstName)")
                .font(.title.weight(.bold))
                .multilineTextAlignment(.center)
            MacroRings(totals: t, targets: t, size: 190, lineWidth: 18)
            VStack(spacing: 14) {
                resultRow("Calories", "\(t.kcal.whole) kcal", Palette.kcal)
                resultRow("Protéines", "\(t.protein.whole) g", Palette.protein)
                resultRow("Fibres", "\(t.fiber.whole) g", Palette.fiber)
                Divider()
                resultRow("Glucides", "\(t.carbs.whole) g", Palette.carbs)
                resultRow("Lipides", "\(t.fat.whole) g", Palette.fat)
            }
            .glassCard(cornerRadius: 26)
            .padding(.horizontal, 24)
            Text("Calculés avec la formule de Mifflin-St Jeor. Modifiables dans ton profil.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
        }
    }

    private func resultRow(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 10, height: 10)
            Text(label).font(.body.weight(.medium))
            Spacer()
            Text(value).font(.body.weight(.bold))
        }
    }

    private func question<Content: View>(_ title: String, subtitle: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.largeTitle.weight(.bold))
                Text(subtitle).font(.body).foregroundStyle(.secondary)
            }
            content()
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
    }

    private func choices<T: Hashable & Identifiable>(_ all: [T], selection: Binding<T>, title: KeyPath<T, String>,
                                                     detail: KeyPath<T, String>, symbol: KeyPath<T, String>) -> some View {
        GlassEffectContainer(spacing: 10) {
            VStack(spacing: 10) {
                ForEach(all) { option in
                    let selected = selection.wrappedValue == option
                    Button { withAnimation(.snappy) { selection.wrappedValue = option } } label: {
                        HStack(spacing: 14) {
                            Image(systemName: option[keyPath: symbol])
                                .font(.headline)
                                .frame(width: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(option[keyPath: title]).font(.headline)
                                Text(option[keyPath: detail]).font(.subheadline).opacity(0.8)
                            }
                            Spacer()
                            if selected { Image(systemName: "checkmark.circle.fill").font(.title3) }
                        }
                        .foregroundStyle(selected ? Color.white : Color.primary)
                        .padding(16)
                        .frame(maxWidth: .infinity)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(selected ? Glass.regular.tint(.accentColor).interactive() : .regular.interactive(),
                                 in: .rect(cornerRadius: 20))
                }
            }
        }
        .sensoryFeedback(.selection, trigger: selection.wrappedValue)
    }
}
