# Infrastructure de Tests End-to-End (E2E) — Portail Mécatronique

Ce répertoire contient la suite de tests automatisés de bout en bout (E2E) basée sur **Playwright**, garantissant la conformité fonctionnelle, la sûreté des accès et l'accessibilité (RGAA / WCAG 2.1).

---

## 📁 Architecture des Tests

```text
e2e/
├── playwright.config.ts         # Configuration Playwright (Chromium, Firefox, WebKit)
├── README.md                    # Documentation d'exécution
└── tests/
    ├── auth.spec.ts             # Authentification, profils rapides et sécurité
    ├── demandeur-journey.spec.ts# Parcours complet de dépôt de demande et téléchargement PDF
    └── accessibility.spec.ts    # Conformité accessibilité et navigation clavier
```

---

## 🚀 Exécution des Tests

### 1. Prérequis
Assurez-vous que le serveur de développement ou de staging est actif (port 3000 par défaut).

```bash
# Installation des navigateurs Playwright (première exécution)
npx playwright install --with-deps
```

### 2. Lancement en ligne de commande

```bash
# Exécution de toute la suite en mode headless
npx playwright test

# Exécution avec interface visuelle (UI Mode)
npx playwright test --ui

# Exécution d'un fichier spécifique
npx playwright test e2e/tests/auth.spec.ts

# Génération et visualisation du rapport HTML
npx playwright show-report
```

---

## 🔒 Couverture des Tests de Sécurité & Conformité
- **Directive NIS 2 & Traçabilité :** Vérification de l'existence des journaux et des signatures de fichiers.
- **Workflow & Processus :** Contrôle des transitions d'étapes de workflow (soumission, validation, rejet motivé).
- **Audit de charge :** Exécution multi-navigateurs en parallèle.
