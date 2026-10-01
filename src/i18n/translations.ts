/**
 * @file src/i18n/translations.ts
 * Dictionnaires bilingues Français / Anglais pour la plateforme Workflow Manager.
 * Couvre l'authentification, la double authentification (2FA), la navigation, le catalogue,
 * la corbeille de validation, la régie matérielle et l'espace administrateur.
 */

export type Language = 'fr' | 'en';

export const translations = {
    fr: {
        common: {
            save: "Enregistrer",
            saving: "Enregistrement...",
            cancel: "Annuler",
            delete: "Supprimer",
            edit: "Modifier",
            create: "Créer",
            loading: "Chargement...",
            search: "Rechercher",
            actions: "Actions",
            status: "Statut",
            error: "Erreur",
            success: "Succès",
            confirm: "Confirmer",
            back: "Retour",
            next: "Suivant",
            close: "Fermer",
            yes: "Oui",
            no: "Non",
            all: "Tous",
            none: "Aucun",
            refresh: "Actualiser",
            export: "Exporter",
            import: "Importer",
            filter: "Filtrer"
        },
        nav: {
            portalName: "Portail Opérationnel",
            adminSpace: "Espace Administrateur",
            catalogue: "Catalogue",
            myRequests: "Mes Demandes",
            aiAssistant: "Assistant IA",
            demandeurSpace: "Espace Demandeur",
            workflows: "Machine à États & Workflows",
            corbeille: "Corbeille Validateur",
            regie: "Régie Matérielle",
            nationalConsole: "Console Nationale",
            decisionsHistory: "Historique des Décisions",
            dashboard: "Tableau de Bord",
            search: "Recherche",
            documentation: "Documentation",
            delegations: "Délégations",
            logout: "Déconnexion"
        },
        auth: {
            title: "Portail Mécatronique",
            subtitle: "Connexion SSO & Espace Habilités",
            email: "Adresse email professionnelle",
            password: "Mot de passe",
            forgotPassword: "Mot de passe oublié ?",
            showPassword: "Afficher le mot de passe",
            hidePassword: "Masquer le mot de passe",
            loginButton: "Se connecter",
            loggingIn: "Connexion en cours...",
            quickLogin: "Connexion rapide en 1 clic (Profils de démonstration) :",
            newAccount: "Nouvel agent ou prestataire tiers ?",
            createAccount: "Créer un compte",
            certificationNotice: "Plateforme certifiée ISO 27001 / NIS 2 — Accès strictement réservé aux agents et prestataires habilités.",
            twoFactorTitle: "Double Authentification (2FA / TOTP)",
            twoFactorSubtitle: "Vérification de Sécurité",
            twoFactorPrompt: "Code à 6 chiffres depuis votre application d'authentification",
            backupCodePrompt: "Code de secours à usage unique",
            verifyButton: "Valider la connexion",
            verifying: "Vérification...",
            useBackupCode: "Problème d'application ? Utiliser un code de secours",
            useAuthenticatorApp: "← Utiliser mon application (code à 6 chiffres)",
            cancel2FA: "Annuler et revenir à la connexion",
            forgotPasswordTitle: "Mot de passe oublié",
            forgotPasswordDesc: "Procédure sécurisée par email",
            forgotPasswordInstructions: "Indiquez votre adresse email professionnelle. Si un compte actif y est associé, nous vous transmettrons un lien sécurisé permettant de réinitialiser votre mot de passe.",
            sendResetLink: "Envoyer le lien",
            sending: "Envoi...",
            requestReceived: "Demande prise en compte",
            backToLogin: "Retour à la connexion",
            accountLocked: "Compte temporairement verrouillé.",
            invalidCredentials: "Identifiants incorrects. Mot de passe invalide."
        },
        catalogue: {
            heroTitle: "Catalogue des Interventions & Droits d'Accès",
            heroSubtitle: "Sélectionnez une procédure opérationnelle standardisée conforme aux protocoles de sûreté.",
            searchPlaceholder: "Rechercher une intervention, clé, cylindre...",
            allCategories: "Toutes les catégories",
            initiate: "Initier la demande",
            emergency: "Urgence opérationnelle",
            details: "Détails du processus",
            stagesCount: "{count} étapes de validation"
        },
        corbeille: {
            title: "Corbeille des Demandes à Valider",
            subtitle: "Traitez les demandes soumises selon les règles de gouvernance et les délais SLA impartis.",
            approveBatch: "Valider la sélection",
            rejectBatch: "Refuser la sélection",
            approve: "Approuver",
            reject: "Rejeter",
            requestComplement: "Demander un complément",
            noRequests: "Aucune demande en attente dans votre corbeille.",
            slaNotice: "Délai de traitement : 24h à 48h selon le processus",
            slaWarning: "Avertissement SLA (< 20% restant)",
            slaBreached: "SLA dépassé"
        },
        regie: {
            title: "Régie Matérielle & Magasin Sécurisé",
            subtitle: "Supervision des clés électroniques, badges RFID et contrats de restitution.",
            inventory: "Inventaire Matériel",
            returnContracts: "Contrats de Restitution",
            penalties: "Pénalités & Dépôts de Garantie",
            programKey: "Programmer la clé",
            revokeKey: "Télé-révoquer d'urgence"
        },
        languages: {
            fr: "Français",
            en: "English",
            selectLanguage: "Choisir la langue"
        }
    },
    en: {
        common: {
            save: "Save",
            saving: "Saving...",
            cancel: "Cancel",
            delete: "Delete",
            edit: "Edit",
            create: "Create",
            loading: "Loading...",
            search: "Search",
            actions: "Actions",
            status: "Status",
            error: "Error",
            success: "Success",
            confirm: "Confirm",
            back: "Back",
            next: "Next",
            close: "Close",
            yes: "Yes",
            no: "No",
            all: "All",
            none: "None",
            refresh: "Refresh",
            export: "Export",
            import: "Import",
            filter: "Filter"
        },
        nav: {
            portalName: "Operational Portal",
            adminSpace: "Admin Space",
            catalogue: "Catalogue",
            myRequests: "My Requests",
            aiAssistant: "AI Assistant",
            demandeurSpace: "Requestor Space",
            workflows: "State Machine & Workflows",
            corbeille: "Validator Inbox",
            regie: "Hardware Registry",
            nationalConsole: "National Console",
            decisionsHistory: "Decision History",
            dashboard: "Dashboard",
            search: "Search",
            documentation: "Documentation",
            delegations: "Delegations",
            logout: "Log out"
        },
        auth: {
            title: "Mechatronic Portal",
            subtitle: "SSO Login & Authorized Space",
            email: "Corporate email address",
            password: "Password",
            forgotPassword: "Forgot password?",
            showPassword: "Show password",
            hidePassword: "Hide password",
            loginButton: "Sign in",
            loggingIn: "Signing in...",
            quickLogin: "1-Click Quick Login (Demo Profiles):",
            newAccount: "New agent or external contractor?",
            createAccount: "Create an account",
            certificationNotice: "ISO 27001 / NIS 2 certified platform — Access strictly restricted to authorized personnel.",
            twoFactorTitle: "Two-Factor Authentication (2FA / TOTP)",
            twoFactorSubtitle: "Security Verification",
            twoFactorPrompt: "6-digit code from your authenticator app",
            backupCodePrompt: "Single-use emergency backup code",
            verifyButton: "Validate sign-in",
            verifying: "Verifying...",
            useBackupCode: "App issue? Use an emergency backup code",
            useAuthenticatorApp: "← Use authenticator app (6-digit code)",
            cancel2FA: "Cancel and back to sign in",
            forgotPasswordTitle: "Forgot Password",
            forgotPasswordDesc: "Secure email recovery procedure",
            forgotPasswordInstructions: "Enter your corporate email address. If an active account matches, a secure reset link will be sent to your inbox.",
            sendResetLink: "Send reset link",
            sending: "Sending...",
            requestReceived: "Request received",
            backToLogin: "Back to sign in",
            accountLocked: "Account temporarily locked.",
            invalidCredentials: "Incorrect credentials. Invalid password."
        },
        catalogue: {
            heroTitle: "Intervention & Access Rights Catalogue",
            heroSubtitle: "Select a standardized operational procedure compliant with security protocols.",
            searchPlaceholder: "Search for an intervention, key, cylinder...",
            allCategories: "All categories",
            initiate: "Initiate request",
            emergency: "Operational emergency",
            details: "Process details",
            stagesCount: "{count} validation stages"
        },
        corbeille: {
            title: "Validator Approval Inbox",
            subtitle: "Process submitted requests according to governance rules and SLA deadlines.",
            approveBatch: "Approve selected",
            rejectBatch: "Reject selected",
            approve: "Approve",
            reject: "Reject",
            requestComplement: "Request complement",
            noRequests: "No pending requests in your inbox.",
            slaNotice: "Processing window: 24h to 48h depending on process",
            slaWarning: "SLA Warning (< 20% remaining)",
            slaBreached: "SLA Breached"
        },
        regie: {
            title: "Hardware Registry & Secure Store",
            subtitle: "Supervision of electronic keys, RFID badges, and return contracts.",
            inventory: "Hardware Inventory",
            returnContracts: "Return Contracts",
            penalties: "Penalties & Security Deposits",
            programKey: "Program key",
            revokeKey: "Emergency revoke"
        },
        languages: {
            fr: "Français",
            en: "English",
            selectLanguage: "Select language"
        }
    }
} as const;

export type TranslationKey =
    | `common.${keyof typeof translations.fr.common}`
    | `nav.${keyof typeof translations.fr.nav}`
    | `auth.${keyof typeof translations.fr.auth}`
    | `catalogue.${keyof typeof translations.fr.catalogue}`
    | `corbeille.${keyof typeof translations.fr.corbeille}`
    | `regie.${keyof typeof translations.fr.regie}`
    | `languages.${keyof typeof translations.fr.languages}`;
