-- ==============================================================================
-- WORKFLOW MANAGER - MariaDB 10.x / 11.x Schema Initialization
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des Rôles & Privilèges RBAC
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) UNIQUE NOT NULL,
    description TEXT,
    privileges LONGTEXT NOT NULL,
    portal_tabs LONGTEXT,
    table_permissions LONGTEXT,
    reference_visibility_rules LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Utilisateurs & Habilitations
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    roles LONGTEXT NOT NULL,
    name VARCHAR(191) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Actif',
    attributes LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table Principale des Demandes & Interventions
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(191) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL,
    status VARCHAR(100) NOT NULL,
    current_stage_index INT NOT NULL DEFAULT 0,
    stages LONGTEXT NOT NULL,
    beneficiaire_id INT NOT NULL,
    beneficiaire_name VARCHAR(191),
    beneficiaire_service VARCHAR(191),
    site_id INT,
    site_name VARCHAR(191),
    equipment_type VARCHAR(191),
    intervention_duration VARCHAR(100),
    is_team_request TINYINT DEFAULT 0,
    team_name VARCHAR(191),
    team_company VARCHAR(191),
    team_members LONGTEXT,
    is_multi_site TINYINT DEFAULT 0,
    scope_type VARCHAR(50),
    selected_site_ids LONGTEXT,
    selected_sites LONGTEXT,
    selected_regions LONGTEXT,
    created_at VARCHAR(100) NOT NULL,
    document LONGTEXT,
    document_original_name VARCHAR(255),
    document_size BIGINT,
    document_mimetype VARCHAR(100),
    complement_request LONGTEXT,
    ai_analysis LONGTEXT,
    process_id INT,
    process_name VARCHAR(191),
    process_code VARCHAR(100),
    form_id VARCHAR(191),
    form_data LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Journal d'Audit Immuable NIS 2
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp VARCHAR(100) NOT NULL,
    actor VARCHAR(191) NOT NULL,
    role VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(191) NOT NULL,
    details LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Onglets du Portail Opérationnel
CREATE TABLE IF NOT EXISTS portal_tabs (
    id VARCHAR(191) PRIMARY KEY,
    `key` VARCHAR(191) UNIQUE NOT NULL,
    label VARCHAR(191) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    path VARCHAR(255) NOT NULL,
    badge VARCHAR(50),
    badge_color VARCHAR(100),
    is_active TINYINT NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    required_privilege VARCHAR(100),
    is_system TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tables et Référentiels Métier Dynamiques
CREATE TABLE IF NOT EXISTS reference_tables (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    category VARCHAR(100),
    is_system TINYINT NOT NULL DEFAULT 0,
    allow_multiple TINYINT DEFAULT 0,
    grouping_column VARCHAR(100),
    show_in_forms TINYINT DEFAULT 1,
    form_field_label VARCHAR(191),
    form_help_text TEXT,
    is_required TINYINT DEFAULT 0,
    `columns` LONGTEXT NOT NULL,
    `rows` LONGTEXT NOT NULL,
    metadata_fields LONGTEXT,
    metadata LONGTEXT,
    created_at VARCHAR(100) NOT NULL,
    updated_at VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Modules et Fonctionnalités du Système (Feature Toggles)
CREATE TABLE IF NOT EXISTS system_features (
    `key` VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_enabled TINYINT NOT NULL DEFAULT 1,
    icon VARCHAR(100),
    updated_at VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Éléments du Volet de Navigation Administrateur
CREATE TABLE IF NOT EXISTS admin_nav_items (
    id VARCHAR(191) PRIMARY KEY,
    `key` VARCHAR(191) UNIQUE NOT NULL,
    label VARCHAR(191) NOT NULL,
    path VARCHAR(255) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    section VARCHAR(100) NOT NULL,
    badge VARCHAR(50),
    badge_color VARCHAR(100),
    is_visible TINYINT NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    associated_feature_key VARCHAR(100),
    is_system TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Sections du Volet de Navigation Administrateur
CREATE TABLE IF NOT EXISTS admin_nav_sections (
    id VARCHAR(191) PRIMARY KEY,
    `key` VARCHAR(191) UNIQUE NOT NULL,
    title VARCHAR(191) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    badge VARCHAR(50),
    badge_color VARCHAR(100),
    display_order INT NOT NULL DEFAULT 0,
    is_visible TINYINT NOT NULL DEFAULT 1,
    is_system TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Paramètres Système Globaux
CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(191) PRIMARY KEY,
    value_json LONGTEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    updated_by VARCHAR(191),
    updated_at VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Modèles de Processus (Process Templates)
CREATE TABLE IF NOT EXISTS process_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    code VARCHAR(100),
    category_id INT,
    description TEXT,
    status VARCHAR(50),
    request_type VARCHAR(100),
    has_special_tag TINYINT DEFAULT 0,
    workflow_rules LONGTEXT,
    linked_tables LONGTEXT,
    stages LONGTEXT,
    fields LONGTEXT,
    notifications LONGTEXT,
    metadata LONGTEXT,
    created_at VARCHAR(100),
    updated_at VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Modèles de Formulaires Dynamiques
CREATE TABLE IF NOT EXISTS form_templates (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    code VARCHAR(100),
    category_id INT,
    description TEXT,
    status VARCHAR(50),
    fields LONGTEXT,
    linked_tables LONGTEXT,
    linked_process_id INT,
    created_at VARCHAR(100),
    updated_at VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Statuts Métiers Personnalisés
CREATE TABLE IF NOT EXISTS custom_statuses (
    id VARCHAR(191) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(191) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    badge_bg VARCHAR(100),
    badge_text VARCHAR(100),
    badge_border VARCHAR(100),
    icon_name VARCHAR(100),
    is_initial TINYINT DEFAULT 0,
    is_terminal TINYINT DEFAULT 0,
    sla_default_hours INT DEFAULT 0,
    allowed_transitions LONGTEXT,
    associated_processes LONGTEXT,
    specification_tag VARCHAR(100),
    is_system TINYINT DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at VARCHAR(100),
    updated_at VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Catégories de Statuts
CREATE TABLE IF NOT EXISTS status_categories (
    id VARCHAR(191) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(191) NOT NULL,
    color VARCHAR(100),
    `desc` TEXT,
    display_order INT DEFAULT 0,
    is_system TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Métadonnées de Spécification des Statuts
CREATE TABLE IF NOT EXISTS status_metadata (
    id VARCHAR(191) PRIMARY KEY,
    specification_title VARCHAR(191),
    specification_code VARCHAR(100),
    specification_description TEXT,
    badge_label VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Moteur de Règles Métier (Business Rules)
CREATE TABLE IF NOT EXISTS business_rules (
    id VARCHAR(191) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    trigger_event VARCHAR(100) NOT NULL,
    target_field VARCHAR(100),
    operator VARCHAR(50) NOT NULL,
    expected_value TEXT,
    action_type VARCHAR(100) NOT NULL,
    action_role VARCHAR(100),
    error_message TEXT,
    is_active TINYINT DEFAULT 1,
    priority INT DEFAULT 1,
    associated_processes LONGTEXT,
    created_at VARCHAR(100),
    updated_at VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Domaines de Règles Métier
CREATE TABLE IF NOT EXISTS rule_domains (
    id VARCHAR(191) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(191) NOT NULL,
    description TEXT,
    color VARCHAR(100),
    bgBadge VARCHAR(100),
    iconName VARCHAR(100),
    display_order INT DEFAULT 0,
    is_system TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Contrats de Restitution Matérielle & Pénalités
CREATE TABLE IF NOT EXISTS return_contracts (
    id VARCHAR(191) PRIMARY KEY,
    request_id INT,
    beneficiaire_id INT NOT NULL,
    beneficiaire_name VARCHAR(191) NOT NULL,
    state VARCHAR(100) NOT NULL,
    items LONGTEXT NOT NULL,
    deposit_status VARCHAR(100) NOT NULL,
    total_penalty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    receipt_date VARCHAR(100),
    inspected_by VARCHAR(191),
    created_at VARCHAR(100) NOT NULL,
    updated_at VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Index de Recherche Rapide
CREATE INDEX idx_requests_reference ON requests(reference);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_beneficiaire ON requests(beneficiaire_id);
CREATE INDEX idx_requests_site ON requests(site_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_return_contracts_beneficiaire ON return_contracts(beneficiaire_id);

SET FOREIGN_KEY_CHECKS = 1;
