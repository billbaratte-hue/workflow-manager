-- ==============================================================================
-- PORTAIL MÉCATRONIQUE
-- Schéma Relationnel Initial Standardisé (SQLite / MariaDB / PostgreSQL compatible)
-- ==============================================================================

-- 1. Table des Rôles & Privilèges RBAC
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    privileges TEXT NOT NULL,
    portal_tabs TEXT,
    table_permissions TEXT,
    reference_visibility_rules TEXT
);

-- 2. Table des Utilisateurs & Habilitations
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    roles TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Actif',
    attributes TEXT
);

-- 3. Table Principale des Demandes & Interventions Mécatroniques
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    current_stage_index INTEGER NOT NULL DEFAULT 0,
    stages TEXT NOT NULL,
    beneficiaire_id INTEGER NOT NULL,
    beneficiaire_name TEXT,
    beneficiaire_service TEXT,
    site_id INTEGER,
    site_name TEXT,
    equipment_type TEXT,
    intervention_duration TEXT,
    is_team_request INTEGER DEFAULT 0,
    team_name TEXT,
    team_company TEXT,
    team_members TEXT,
    is_multi_site INTEGER DEFAULT 0,
    scope_type TEXT,
    selected_site_ids TEXT,
    selected_sites TEXT,
    selected_regions TEXT,
    created_at TEXT NOT NULL,
    document TEXT,
    document_original_name TEXT,
    document_size INTEGER,
    document_mimetype TEXT,
    complement_request TEXT,
    ai_analysis TEXT,
    process_id INTEGER,
    process_name TEXT,
    process_code TEXT,
    form_id TEXT,
    form_data TEXT
);

-- 4. Journal d'Audit Immuable NIS 2
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT
);

-- 5. Onglets du Portail Opérationnel
CREATE TABLE IF NOT EXISTS portal_tabs (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    path TEXT NOT NULL,
    badge TEXT,
    badge_color TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    required_privilege TEXT,
    is_system INTEGER NOT NULL DEFAULT 0
);

-- 6. Tables et Référentiels Métier Dynamiques
CREATE TABLE IF NOT EXISTS reference_tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    allow_multiple INTEGER DEFAULT 0,
    grouping_column TEXT,
    show_in_forms INTEGER DEFAULT 1,
    form_field_label TEXT,
    form_help_text TEXT,
    is_required INTEGER DEFAULT 0,
    columns TEXT NOT NULL,
    rows TEXT NOT NULL,
    metadata_fields TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 7. Modules et Fonctionnalités du Système (Feature Toggles)
CREATE TABLE IF NOT EXISTS system_features (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    icon TEXT,
    updated_at TEXT
);

-- 8. Éléments du Volet de Navigation Administrateur
CREATE TABLE IF NOT EXISTS admin_nav_items (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    path TEXT NOT NULL,
    icon TEXT NOT NULL,
    section TEXT NOT NULL,
    badge TEXT,
    badge_color TEXT,
    is_visible INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    associated_feature_key TEXT,
    is_system INTEGER NOT NULL DEFAULT 0
);

-- 9. Sections du Volet de Navigation Administrateur
CREATE TABLE IF NOT EXISTS admin_nav_sections (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    badge TEXT,
    badge_color TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    is_system INTEGER NOT NULL DEFAULT 0
);

-- 10. Paramètres Système Globaux
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL
);

-- 11. Modèles de Processus (Process Templates)
CREATE TABLE IF NOT EXISTS process_templates (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    category_id INTEGER,
    description TEXT,
    status TEXT,
    request_type TEXT,
    has_special_tag INTEGER DEFAULT 0,
    workflow_rules TEXT,
    linked_tables TEXT,
    stages TEXT,
    fields TEXT,
    notifications TEXT,
    metadata TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 12. Modèles de Formulaires Dynamiques
CREATE TABLE IF NOT EXISTS form_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    category_id INTEGER,
    description TEXT,
    status TEXT,
    fields TEXT,
    linked_tables TEXT,
    linked_process_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);

-- 13. Statuts Métiers Personnalisés
CREATE TABLE IF NOT EXISTS custom_statuses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT,
    badge_bg TEXT,
    badge_text TEXT,
    badge_border TEXT,
    icon_name TEXT,
    is_initial INTEGER DEFAULT 0,
    is_terminal INTEGER DEFAULT 0,
    sla_default_hours INTEGER DEFAULT 0,
    allowed_transitions TEXT,
    associated_processes TEXT,
    specification_tag TEXT,
    is_system INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

-- 14. Catégories de Statuts
CREATE TABLE IF NOT EXISTS status_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT,
    desc TEXT,
    display_order INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0
);

-- 15. Métadonnées de Spécification des Statuts
CREATE TABLE IF NOT EXISTS status_metadata (
    id TEXT PRIMARY KEY,
    specification_title TEXT,
    specification_code TEXT,
    specification_description TEXT,
    badge_label TEXT
);

-- 16. Moteur de Règles Métier (Business Rules)
CREATE TABLE IF NOT EXISTS business_rules (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    trigger_event TEXT NOT NULL,
    target_field TEXT,
    operator TEXT NOT NULL,
    expected_value TEXT,
    action_type TEXT NOT NULL,
    action_role TEXT,
    error_message TEXT,
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 1,
    associated_processes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 17. Domaines de Règles Métier
CREATE TABLE IF NOT EXISTS rule_domains (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    color TEXT,
    bgBadge TEXT,
    iconName TEXT,
    display_order INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0
);

-- 18. Contrats de Restitution Matérielle & Pénalités (Epic 3 - US 3.3)
CREATE TABLE IF NOT EXISTS return_contracts (
    id TEXT PRIMARY KEY,
    request_id INTEGER,
    beneficiaire_id INTEGER NOT NULL,
    beneficiaire_name TEXT NOT NULL,
    state TEXT NOT NULL,
    items TEXT NOT NULL,
    deposit_status TEXT NOT NULL,
    total_penalty REAL NOT NULL DEFAULT 0,
    receipt_date TEXT,
    inspected_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 19. Index de Performance & Recherche Rapide
CREATE INDEX IF NOT EXISTS idx_requests_reference ON requests(reference);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_beneficiaire ON requests(beneficiaire_id);
CREATE INDEX IF NOT EXISTS idx_requests_site ON requests(site_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_return_contracts_beneficiaire ON return_contracts(beneficiaire_id);
