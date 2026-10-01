# Workflow Manager — Portail Opérationnel & Habilitations Mécatroniques

Plateforme d'entreprise de gouvernance, de supervision et d'orchestration des demandes d'intervention, accès physiques et habilitations mécatroniques, conforme aux exigences de traçabilité **NIS 2** et aux normes européennes **EN 15864 / EN 16864**.

---

## 🚀 Fonctionnalités Clés

- **Catalogue Opérationnel des 8 Processus Métier** : Émission de clés électroniques et badges RFID, prolongation, restitution, déclaration de perte/vol, commande de cylindres mécatroniques avec relevé GPS, projets d'infrastructure.
- **Moteur de Machine à États & Studio Graphique** : Gestion des cycles de vie des demandes, sous-dossiers Parent-Enfant, affectation dynamique multi-niveaux et respect des SLA (24h/48h).
- **Architecture Multi-Moteur (SQLite & MariaDB)** :
  - **SQLite** embarqué pour un développement local ultra-rapide et l'exécution instantanée des tests unitaires.
  - **MariaDB 11.4 LTS** via pool de connexions `mysql2` pour les environnements de staging et production haute concurrence.
  - Outil de migration automatisée : `npx tsx scripts/migrate-sqlite-to-mariadb.ts`.
- **Temps Réel & Notifications (SSE)** : Flux Server-Sent Events (SSE) poussant instantanément les alertes et décisions de validation aux utilisateurs connectés.
- **Sécurité NIS 2 & Piste d'Audit Immuable** :
  - Journalisation cryptographique syslog des événements sensibles.
  - Génération de bordereaux PDF scellés par empreinte SHA-256.
  - Protection anti-brute-force sur l'authentification (rate limiting strict) et politique de complexité des mots de passe.
  - Récupération sécurisée de mot de passe par email via jetons cryptographiques horodatés (validité 4 jours).
  - Contrôle d'accès granulaire RBAC avec détection temps réel des doublons (Administrateur, Validateur de Site, Responsable d'Équipe, Régie Matérielle, Collaborateur).
- **Surveillance Automatisée des SLA & Watchdog Daemon** : Daemon d'arrière-plan analysant périodiquement les dossiers en cours, émettant des pré-alertes à 80% du délai et déclenchant l'auto-escalade à 100% avec notification SSE urgente, notification email et piste d'audit.
- **Connecteur Webhook Sortant SIEM / SOC (NIS 2)** : Dispatch sécurisé des événements critiques vers des collecteurs externes (SIEM, Slack, Microsoft Teams) avec signature cryptographique HMAC-SHA256 (`X-Signature-SHA256`).
- **Studio de Packages Processus Portables** : Exportation et importation en un clic de packages complets autonomes (Machine à états, Formulaire dynamique associé, Règles métier et somme de contrôle d'intégrité SHA-256).
- **Régie Matérielle & Console Nationale** : Poste de contrôle des stocks de clés/cylindres, programmation, relances automatiques de restitution, télé-révocation d'urgence et supervision nationale temps réel.
- **Documentation Intégrale** : Guide complet opérationnel disponible au format Word `.docx` (`Workflow_Manager_Guide_Complet.docx`) et Markdown.

---

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Motion.
- **Backend API** : Node.js 22, Express, JWT, bcryptjs, Nodemailer (SMTP), jsPDF.
- **Bases de Données** : SQLite (`node:sqlite`) & MariaDB 11 (`mysql2`).
- **Tests & Assurance Qualité** :
  - **Vitest** : 150 tests unitaires et d'intégration (couverture des services, sécurité NIS 2, référentiels, RBAC, réinitialisation de mot de passe, daemon d'automatisation SLA, SIEM, packages processus).
  - **Playwright** : 13 tests end-to-end (parcours demandeur, accessibilité RGAA, administration, authentification et récupération).
- **Conteneurisation** : Dockerfile multi-stage (Node 22 Alpine) et Docker Compose.
- **CI/CD** : Pipeline GitHub Actions automatisé sur chaque commit/PR.

---

## 📦 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) v20+ ou v22+
- npm v10+

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancement en Développement (Moteur SQLite par défaut)
```bash
npm run dev
```
L'application est immédiatement accessible sur `http://localhost:3000`.

---

## 🐳 Déploiement avec Docker & MariaDB 11

Pour lancer l'application en conteneur avec l'instance MariaDB 11.4 LTS préconfigurée :

```bash
docker compose up --build -d
```

Cette commande démarre :
1. Le conteneur **MariaDB 11.4** sur le port `3306` avec volume persistant et initialisation du schéma via `scripts/init-mariadb.sql`.
2. Le conteneur **Workflow Manager App** sur le port `3000` connecté au pool MariaDB après validation du `healthcheck`.

---

## 🔄 Migration SQLite ➔ MariaDB

Pour transférer l'intégralité des données locales (`portal.db`) vers votre instance MariaDB :

```bash
npx tsx scripts/migrate-sqlite-to-mariadb.ts
```

Le script vérifie et initialise le schéma sur MariaDB puis migre les 22 tables relationnelles en préservant l'intégrité référentielle.

---

## ⚙️ Variables d'Environnement

Configurez votre fichier `.env` selon vos besoins :

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=votre_cle_secrete_jwt_nis2

# Moteur de base de données : 'sqlite' ou 'mariadb'
DB_ENGINE=sqlite

# Configuration MariaDB (si DB_ENGINE=mariadb) :
DB_HOST=localhost
DB_PORT=3306
DB_NAME=workflow_db
DB_USER=workflow_user
DB_PASSWORD=workflow_password

# Configuration SMTP (optionnelle - mode simulation actif par défaut) :
SMTP_HOST=smtp.entreprise.fr
SMTP_PORT=587
SMTP_USER=notifications@entreprise.fr
SMTP_PASSWORD=mot_de_passe_smtp
SMTP_FROM="Workflow Manager <notifications@entreprise.fr>"
```

---

## 🧪 Validation & Tests

```bash
# Vérification du typage statique
npm run lint

# Exécution des 129 tests unitaires et d'intégration (Vitest)
npm test

# Exécution des tests End-to-End (Playwright Chromium)
npm run test:e2e

# Compilation du bundle de production
npm run build
```

---

## 👥 Profils de Démonstration Pré-configurés

Pour faciliter l'évaluation, des profils prédéfinis sont disponibles sur la page de connexion :

| Profil | Rôle | Périmètre & Droits |
| :--- | :--- | :--- |
| **Admin Système** | Administrateur | Droits complets : Studio de workflow, RBAC, tables, paramètres système, audit NIS 2. |
| **Responsable de Site** | Validateur de Site | Validation hiérarchique et technique des accès, arbitrage dans la Corbeille. |
| **Gestionnaire Régie** | Régie Matérielle | Programmation des clés électroniques, gestion des stocks et télé-révocation. |
| **Demandeur / Agent** | Collaborateur | Consultation du catalogue, soumission de demandes et suivi dans "Mes Demandes". |
