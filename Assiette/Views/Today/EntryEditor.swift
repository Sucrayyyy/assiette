import SwiftUI

/// Modifier une entrée du journal : quantités, repas, suppression.
struct EntryEditor: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Entry
    @State private var confirmDelete = false

    init(entry: Entry) {
        _draft = State(initialValue: entry)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let photo = draft.photoFile {
                        PhotoThumbnail(file: photo, size: nil)
                            .frame(maxWidth: .infinity)
                            .frame(height: 190)
                            .clipShape(.rect(cornerRadius: 26))
                    }
                    TextField("Nom", text: $draft.title)
                        .font(.title2.weight(.bold))
                    MacroChips(macros: draft.macros)

                    ForEach($draft.items) { $item in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(item.name).font(.subheadline.weight(.semibold)).lineLimit(2)
                                Spacer()
                                Text("\(item.macros.kcal.whole) kcal").font(.subheadline.weight(.bold)).monospacedDigit()
                            }
                            GramsStepper(grams: $item.grams)
                        }
                        .glassCard(cornerRadius: 22, padding: 14)
                    }

                    Text("Repas").font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                    MealPicker(meal: $draft.meal)

                    Button(role: .destructive) { confirmDelete = true } label: {
                        Label("Supprimer du journal", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.glass)
                    .padding(.top, 8)
                }
                .padding(20)
            }
            .background(AppBackground())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler", systemImage: "xmark") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer", systemImage: "checkmark") {
                        store.update(draft)
                        dismiss()
                    }
                    .buttonStyle(.glassProminent)
                }
            }
            .confirmationDialog("Supprimer « \(draft.title) » ?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Supprimer", role: .destructive) {
                    store.delete(draft)
                    dismiss()
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
