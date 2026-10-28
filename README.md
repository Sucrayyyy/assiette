# Assiette 🥗

App iPhone native (SwiftUI, iOS 26+) pour compter ses calories, avec le design **Liquid Glass**.

- **Accueil** : « Bonjour Théo », anneaux calories / protéines / fibres, glucides et lipides, semaine en un coup d'œil, série de jours 🔥 et petit message de coaching.
- **Besoins sur mesure** : formule de Mifflin-St Jeor (sexe, âge, taille, poids, activité, objectif), objectifs modifiables à la main.
- **Aliments** : aliments de base intégrés + **Open Food Facts** (toutes les marques vendues en France) + **scan de code-barres**.
- **Scan IA 📸** : tu prends ton plat en photo, Claude (IA d'Anthropic) détecte chaque ingrédient, estime les grammes et les macros. Ensuite tu ajustes :
  - les quantités avec − / + ;
  - « C'est autre chose » pour remplacer un ingrédient par un aliment de la base ;
  - « Corriger avec l'IA » : « le blanc c'est du riz complet, la sauce c'est de la crème », et elle réajuste tout le plat.
- **Progrès** : graphiques de la semaine (calories, protéines, fibres) et courbe de poids.

Aucune dépendance externe : pas de CocoaPods, pas de Swift Package. Juste Xcode.

## Installer sur ton iPhone

1. Clone le projet et ouvre `Assiette.xcodeproj` dans Xcode.
2. **Xcode › Réglages › Comptes** : ajoute ton identifiant Apple (gratuit).
3. Clique sur le projet **Assiette** › cible **Assiette** › **Signing & Capabilities** › choisis ton **Team**.
   Si Xcode refuse l'identifiant `fr.assiette.app`, remplace-le par un identifiant à toi (ex. `fr.tonprenom.assiette`).
4. Branche ton iPhone, active le **Mode développeur** (Réglages › Confidentialité et sécurité), choisis-le en haut d'Xcode et appuie sur ▶︎.
5. Sur l'iPhone, la première fois : Réglages › Général › VPN et gestion de l'appareil › fais confiance à ton compte développeur.

Avec un compte Apple gratuit, l'app doit être réinstallée depuis Xcode tous les 7 jours (limite d'Apple). Avec un compte développeur payant, elle reste installée un an et peut passer par TestFlight.

## Activer le scan IA

Crée une clé API sur [console.anthropic.com](https://console.anthropic.com), puis colle-la dans l'app : **Profil › Scan IA**.
Elle est stockée chiffrée dans le trousseau de l'iPhone et n'est jamais dans le code.

Modèle utilisé : `claude-opus-5-5`, avec repli automatique côté serveur (`fallbacks: "default"`) si une requête est refusée.

## Structure

```
Assiette/
├── App/            Point d'entrée, onglets
├── Model/          Données, calcul des besoins, stockage, trousseau
├── Services/       Base d'aliments, Open Food Facts, scan IA
├── Design/         Couleurs, fond, cartes Liquid Glass, anneaux
└── Views/          Accueil, Recherche, Scan, Progrès, Profil, Onboarding
```

Données nutritionnelles : [Open Food Facts](https://world.openfoodfacts.org) (licence ODbL) et valeurs moyennes de type CIQUAL (ANSES).
