import SwiftUI

@main
struct AssietteApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .fontDesign(.rounded)
        }
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        Group {
            if store.profile == nil {
                OnboardingView()
                    .transition(.opacity)
            } else {
                MainView()
                    .transition(.opacity.combined(with: .scale(scale: 1.04)))
            }
        }
        .animation(.smooth(duration: 0.5), value: store.profile == nil)
    }
}

enum AppTab: Hashable {
    case today, progress, profile, search
}

struct MainView: View {
    @State private var tab: AppTab = .today
    @State private var day = Day.today
    @State private var showScan = false

    var body: some View {
        TabView(selection: $tab) {
            Tab("Aujourd'hui", systemImage: "sun.horizon.fill", value: AppTab.today) {
                TodayView(day: $day, onScan: { showScan = true })
            }
            Tab("Progrès", systemImage: "chart.bar.fill", value: AppTab.progress) {
                ProgressScreen()
            }
            Tab("Ajouter", systemImage: "magnifyingglass", value: AppTab.search) {
                NavigationStack {
                    FoodSearchView(mode: .log(day: day, meal: nil))
                        .navigationTitle("Ajouter")
                }
            }
            Tab("Profil", systemImage: "person.crop.circle.fill", value: AppTab.profile) {
                ProfileScreen()
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .tabViewBottomAccessory {
            Button { showScan = true } label: {
                HStack(spacing: 10) {
                    Image(systemName: "camera.viewfinder")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Scanner mon assiette").font(.subheadline.weight(.semibold))
                        Text("L'IA remplit les macros pour toi").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "sparkles").foregroundStyle(Color.accentColor)
                }
                .padding(.horizontal, 16)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
        }
        .fullScreenCover(isPresented: $showScan) {
            ScanFlowView(day: day)
        }
    }
}
