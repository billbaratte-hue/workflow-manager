import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { usersDatabase, rolesDatabase, requestsDB, auditLogs, portalTabsDatabase, referenceTablesDatabase, adminNavDatabase, adminNavSectionsDatabase, processTemplates, formTemplatesDatabase, statusesDatabase, statusCategoriesDatabase, statusMetadataStore, businessRulesStore, ruleDomainsDatabase, delegationMap, decisionHistory, notificationsDB, registerDbSync } from './store.js';
import { MariaDbWrapper } from './mariadb.js';

export interface ISqliteDb {
    exec(sql: string): Promise<void>;
    get<T = any>(sql: string, ...params: any[]): Promise<T | undefined>;
    all<T = any>(sql: string, ...params: any[]): Promise<T[]>;
    run(sql: string, ...params: any[]): Promise<{ changes: number; lastID: number }>;
    close(): Promise<void>;
}

export class SqliteWrapper implements ISqliteDb {
    private rawDb: any;

    constructor(location: string) {
        this.rawDb = new DatabaseSync(location);
    }

    async exec(sql: string): Promise<void> {
        this.rawDb.exec(sql);
    }

    async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
        const stmt = this.rawDb.prepare(sql);
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = stmt.get(...flatParams);
        return res as T | undefined;
    }

    async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
        const stmt = this.rawDb.prepare(sql);
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = stmt.all(...flatParams);
        return res as T[];
    }

    async run(sql: string, ...params: any[]): Promise<{ changes: number; lastID: number }> {
        const stmt = this.rawDb.prepare(sql);
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = stmt.run(...flatParams);
        return {
            changes: Number(res.changes),
            lastID: Number(res.lastInsertRowid)
        };
    }

    async close(): Promise<void> {
        this.rawDb.close();
    }
}

let dbInstance: ISqliteDb | null = null;

export async function getDatabase(dbPath?: string): Promise<ISqliteDb> {
    if (dbInstance && !dbPath) {
        return dbInstance;
    }

    const engine = (process.env.DB_ENGINE || process.env.DB_TYPE || 'sqlite').toLowerCase();

    if (!dbPath && (engine === 'mariadb' || engine === 'mysql')) {
        const mariaDb = new MariaDbWrapper();
        await mariaDb.initializeSchema();
        dbInstance = mariaDb;

        registerDbSync((sql, params) => {
            mariaDb.run(sql, ...params).catch(err => console.warn('MariaDB background sync warning:', err));
        });

        await seedInitialData(mariaDb);
        await syncMemoryStoresFromDb(mariaDb);
        return mariaDb;
    }

    const filename = dbPath || process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'portal.db');
    const isMemory = filename === ':memory:';

    if (!isMemory) {
        const dir = path.dirname(filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    const db = new SqliteWrapper(filename);

    if (!dbPath) {
        dbInstance = db;
    }

    await initializeSchema(db);

    registerDbSync((sql, params) => {
        db.run(sql, ...params).catch(err => console.warn('SQLite background sync warning:', err));
    });

    return db;
}

export async function closeDatabase(): Promise<void> {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
    }
}

async function initializeSchema(db: ISqliteDb): Promise<void> {
    // 0. Tenants table (Multi-Tenant & Marque Blanche - Epic 1)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            logo_url TEXT,
            primary_color TEXT DEFAULT '#1e3a8a',
            secondary_color TEXT DEFAULT '#0f172a',
            accent_color TEXT DEFAULT '#f59e0b',
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT
        );
    `);

    // 1. Roles table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            privileges TEXT NOT NULL,
            portal_tabs TEXT,
            table_permissions TEXT,
            reference_visibility_rules TEXT
        );
    `);

    // 2. Users table
    await db.exec(`
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
    `);

    // 3. Requests table
    await db.exec(`
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
            ai_analysis TEXT
        );
    `);

    // 4. Audit logs table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            actor TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT NOT NULL,
            details TEXT
        );
    `);

    // 5. Portal tabs table (Noms, descriptions, badges, ordre et icônes configurables)
    await db.exec(`
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
    `);

    // 6. Reference tables schema (Gestion dynamique des types de référentiels, colonnes & structures)
    await db.exec(`
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
    `);

    // 7. System features table (Options d'activation/désactivation modulaire des fonctionnalités)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS system_features (
            key TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            icon TEXT,
            updated_at TEXT
        );
    `);

    // 8. Admin Navigation items table (Volet de navigation administrateur configurable)
    await db.exec(`
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
    `);

    // 9. Admin Navigation Sections table (Sections du volet de navigation administrateur)
    await db.exec(`
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
    `);

    // 10. System settings table (100% Configurable Architecture & Zero Hardcoding)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            updated_by TEXT,
            updated_at TEXT NOT NULL
        );
    `);

    // 11. Process Templates table
    await db.exec(`
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
    `);

    // 12. Form Templates table
    await db.exec(`
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
    `);

    // 13. Custom Statuses table
    await db.exec(`
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
    `);

    // 14. Status Categories table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS status_categories (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            label TEXT NOT NULL,
            color TEXT,
            desc TEXT,
            display_order INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0
        );
    `);

    // 15. Status Metadata table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS status_metadata (
            id TEXT PRIMARY KEY,
            specification_title TEXT,
            specification_code TEXT,
            specification_description TEXT,
            badge_label TEXT
        );
    `);

    // 16. Business Rules table
    await db.exec(`
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
    `);

    // 17. Rule Domains table
    await db.exec(`
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
    `);

    // 18. Return Contracts table (Epic 3 - US 3.3)
    await db.exec(`
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
    `);

    // 19. Delegations table (Persistent delegations across server restarts)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS delegations (
            delegator_id INTEGER PRIMARY KEY,
            delegate_id INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );
    `);

    // 20. Decision history table (Persistent decision trail)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS decision_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT NOT NULL,
            title TEXT,
            decision TEXT NOT NULL,
            author TEXT NOT NULL,
            motif TEXT,
            date TEXT NOT NULL
        );
    `);

    // 21. Notifications table (Persistent in-app notifications)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            target_user_id INTEGER,
            target_role TEXT,
            target_email TEXT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            reference TEXT,
            urgent INTEGER DEFAULT 0,
            read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
    `);

    // 22. Password Resets table (Sécurité & Réinitialisation par email - NIS 2)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            tenant_id TEXT DEFAULT 'default'
        );
    `);
    try {
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);`);
    } catch {}

    // Add process, form, demandeur fields to requests table if missing
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN process_id INTEGER;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN process_name TEXT;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN process_code TEXT;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN form_id TEXT;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN form_data TEXT;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN demandeur_id INTEGER;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN demandeur_name TEXT;`);
    } catch {}
    try {
        await db.exec(`ALTER TABLE requests ADD COLUMN demandeur_email TEXT;`);
    } catch {}

    // Multi-tenant migration: add tenant_id to all tables (Epic 1)
    const tablesForTenant = [
        'users', 'roles', 'requests', 'audit_logs', 'reference_tables',
        'system_settings', 'process_templates', 'form_templates',
        'custom_statuses', 'status_categories', 'business_rules',
        'return_contracts', 'delegations', 'decision_history', 'notifications',
        'password_resets'
    ];
    for (const tName of tablesForTenant) {
        try {
            await db.exec(`ALTER TABLE ${tName} ADD COLUMN tenant_id TEXT DEFAULT 'default';`);
        } catch {}
    }

    // Seed data if empty
    await seedInitialData(db);

    // Sync memory stores from SQLite database (Single source of truth)
    await syncMemoryStoresFromDb(db);
}

export async function syncMemoryStoresFromDb(db: ISqliteDb): Promise<void> {
    try {
        // Sync delegations
        const dbDelegations = await db.all<{ delegator_id: number; delegate_id: number }>('SELECT delegator_id, delegate_id FROM delegations');
        if (dbDelegations && dbDelegations.length > 0) {
            for (const d of dbDelegations) {
                (delegationMap as any)[d.delegator_id] = d.delegate_id;
            }
        }

        // Sync decision history
        const dbHistory = await db.all<any>('SELECT * FROM decision_history ORDER BY id ASC');
        if (dbHistory && dbHistory.length > 0) {
            decisionHistory.length = 0;
            for (const h of dbHistory) {
                decisionHistory.push({
                    id: Number(h.id),
                    reference: h.reference,
                    title: h.title,
                    decision: h.decision,
                    author: h.author,
                    date: h.date,
                    motif: h.motif
                });
            }
        }

        // Sync notifications
        const dbNotifs = await db.all<any>('SELECT * FROM notifications ORDER BY created_at DESC');
        if (dbNotifs && dbNotifs.length > 0) {
            notificationsDB.length = 0;
            for (const n of dbNotifs) {
                notificationsDB.push({
                    id: n.id,
                    target_user_id: n.target_user_id ? Number(n.target_user_id) : undefined,
                    target_role: n.target_role || undefined,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    link: n.link,
                    reference: n.reference,
                    urgent: Boolean(n.urgent),
                    read: Boolean(n.read),
                    created_at: n.created_at
                });
            }
        }
    } catch (err) {
        console.warn('syncMemoryStoresFromDb warning:', err);
    }
}

async function seedInitialData(db: ISqliteDb): Promise<void> {
    const tenantsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM tenants');
    if (tenantsCount && Number(tenantsCount.count) === 0) {
        await db.run(
            `INSERT INTO tenants (id, name, code, logo_url, primary_color, secondary_color, accent_color, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            'default',
            'Portail Collaboratif Entreprise',
            'DEFAULT',
            '',
            '#1e3a8a',
            '#0f172a',
            '#f59e0b',
            'Instance multi-tenant marque blanche',
            new Date().toISOString(),
            new Date().toISOString()
        );
    }

    const rolesCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM roles');
    if (rolesCount && Number(rolesCount.count) === 0) {
        for (const role of rolesDatabase) {
            await db.run(
                `INSERT INTO roles (id, name, description, privileges, portal_tabs, table_permissions, reference_visibility_rules)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                role.id,
                role.name,
                role.description || '',
                JSON.stringify(role.privileges || []),
                JSON.stringify(role.portalTabs || {}),
                JSON.stringify(role.tablePermissions || {}),
                JSON.stringify(role.referenceVisibilityRules || [])
            );
        }
    }

    const usersCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if (usersCount && Number(usersCount.count) === 0) {
        // Default password hash for seeded users: 'Securite2026!'
        const defaultHash = await bcrypt.hash('Securite2026!', 10);

        for (const user of usersDatabase) {
            await db.run(
                `INSERT INTO users (id, email, password_hash, role, roles, name, status, attributes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                user.id,
                user.email.toLowerCase(),
                defaultHash,
                user.role,
                JSON.stringify(user.roles || [user.role]),
                user.name,
                user.status || 'Actif',
                JSON.stringify(user.attributes || {})
            );
        }
    }

    const requestsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM requests');
    if (requestsCount && Number(requestsCount.count) === 0) {
        for (const req of (requestsDB || [])) {
            await db.run(
                `INSERT INTO requests (
                    id, reference, title, description, status, current_stage_index,
                    stages, beneficiaire_id, beneficiaire_name, beneficiaire_service,
                    site_id, site_name, equipment_type, intervention_duration,
                    is_team_request, team_name, team_company, team_members,
                    is_multi_site, scope_type, selected_site_ids, selected_sites,
                    selected_regions, created_at, document, document_original_name,
                    document_size, document_mimetype, complement_request, ai_analysis
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                req.id,
                req.reference,
                req.title,
                req.description,
                req.status,
                req.current_stage_index || 0,
                JSON.stringify(req.stages || []),
                req.beneficiaire_id,
                req.beneficiaire_name || '',
                req.beneficiaire_service || '',
                req.site_id || null,
                req.site_name || '',
                req.equipment_type || '',
                req.intervention_duration || '',
                req.is_team_request ? 1 : 0,
                req.team_name || '',
                req.team_company || '',
                JSON.stringify(req.team_members || []),
                req.is_multi_site ? 1 : 0,
                req.scope_type || 'single_site',
                JSON.stringify(req.selected_site_ids || []),
                JSON.stringify(req.selected_sites || []),
                JSON.stringify(req.selected_regions || []),
                req.created_at || new Date().toISOString(),
                req.document || null,
                req.document_original_name || null,
                req.document_size || null,
                req.document_mimetype || null,
                req.complement_request ? JSON.stringify(req.complement_request) : null,
                req.ai_analysis ? JSON.stringify(req.ai_analysis) : null
            );
        }
    }

    const auditCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM audit_logs');
    if (auditCount && Number(auditCount.count) === 0) {
        for (const log of auditLogs) {
            await db.run(
                `INSERT INTO audit_logs (id, timestamp, actor, role, action, target, details)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                log.id,
                log.timestamp,
                log.actor,
                log.role,
                log.action,
                log.target,
                log.details
            );
        }
    }

    const tabsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM portal_tabs');
    if (tabsCount && Number(tabsCount.count) === 0) {
        for (const tab of portalTabsDatabase) {
            await db.run(
                `INSERT INTO portal_tabs (id, key, label, description, icon, path, badge, badge_color, is_active, display_order, required_privilege, is_system)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                tab.id,
                tab.key,
                tab.label,
                tab.description || '',
                tab.icon || 'fas fa-th-large',
                tab.path,
                tab.badge || '',
                tab.badge_color || '',
                tab.is_active ? 1 : 0,
                tab.display_order || 0,
                tab.required_privilege || null,
                tab.is_system ? 1 : 0
            );
        }
    } else {
        // Synchroniser tout nouvel onglet système
        for (const tab of portalTabsDatabase) {
            const existingTab = await db.get('SELECT id FROM portal_tabs WHERE key = ?', tab.key);
            if (!existingTab) {
                await db.run(
                    `INSERT INTO portal_tabs (id, key, label, description, icon, path, badge, badge_color, is_active, display_order, required_privilege, is_system)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    tab.id,
                    tab.key,
                    tab.label,
                    tab.description || '',
                    tab.icon || 'fas fa-th-large',
                    tab.path,
                    tab.badge || '',
                    tab.badge_color || '',
                    tab.is_active ? 1 : 0,
                    tab.display_order || 0,
                    tab.required_privilege || null,
                    tab.is_system ? 1 : 0
                );
            }
        }
    }

    // Ensure all tables in referenceTablesDatabase exist in SQLite database
    for (const tbl of referenceTablesDatabase) {
        const existing = await db.get<{ id: string, columns: string, metadata_fields: string }>('SELECT id, columns, metadata_fields FROM reference_tables WHERE LOWER(id) = LOWER(?)', tbl.id);
        if (!existing) {
            await db.run(
                `INSERT INTO reference_tables (
                    id, name, description, icon, category, is_system, allow_multiple,
                    grouping_column, show_in_forms, form_field_label, form_help_text,
                    is_required, columns, rows, metadata_fields, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                tbl.id,
                tbl.name,
                tbl.description || '',
                tbl.icon || 'fas fa-table',
                tbl.category || 'Organisation',
                tbl.is_system ? 1 : 0,
                tbl.allow_multiple ? 1 : 0,
                tbl.grouping_column || null,
                tbl.show_in_forms !== false ? 1 : 0,
                tbl.form_field_label || tbl.name,
                tbl.form_help_text || '',
                tbl.is_required ? 1 : 0,
                JSON.stringify(tbl.columns || []),
                JSON.stringify(tbl.rows || []),
                JSON.stringify(tbl.metadata_fields || []),
                JSON.stringify(tbl.metadata || {}),
                new Date().toISOString(),
                new Date().toISOString()
            );
        } else if (tbl.id === 'sites') {
            // Update sites columns if sub_category or security_level are missing from columns
            try {
                const parsedCols = JSON.parse(existing.columns || '[]');
                const hasSubCat = parsedCols.some((c: any) => c.key === 'sub_category');
                const hasSecLevel = parsedCols.some((c: any) => c.key === 'security_level');
                if (!hasSubCat || !hasSecLevel) {
                    const updatedCols = [...parsedCols];
                    if (!hasSubCat) {
                        updatedCols.splice(3, 0, {
                            key: "sub_category",
                            label: "Catégorie d'Établissement",
                            type: "select",
                            table_ref: "categories_etablissement",
                            display_field: "name",
                            required: false,
                            description: "Type d'établissement lié au référentiel des catégories"
                        });
                    }
                    if (!hasSecLevel) {
                        updatedCols.splice(4, 0, {
                            key: "security_level",
                            label: "Niveau de Sécurité",
                            type: "select",
                            table_ref: "niveaux_securite",
                            display_field: "name",
                            required: false,
                            description: "Niveau de sûreté ferroviaire lié au référentiel des niveaux de sécurité"
                        });
                    }
                    await db.run(
                        'UPDATE reference_tables SET columns = ?, updated_at = ? WHERE LOWER(id) = ?',
                        JSON.stringify(updatedCols),
                        new Date().toISOString(),
                        'sites'
                    );
                }
            } catch (err) {
                console.warn('Erreur mise à jour colonnes sites:', err);
            }
        }
    }

    const DEFAULT_SYSTEM_FEATURES = [
        {
            key: 'ai_demandes',
            name: "Assistance IA & Analyse Prédictive (Gemini)",
            description: "Active l'ensemble des modules d'intelligence artificielle : aide à la rédaction de demandes, analyse et aide à la décision pour les validateurs, recommandation automatique de périmètres et audit de conformité de sécurité des rôles.",
            category: 'Intelligence Artificielle & Automatisation',
            is_enabled: 1,
            icon: 'fas fa-robot'
        },
        {
            key: 'role_field_scope',
            name: 'Périmètre Granulaire de Champs dans les Rôles',
            description: "Permet de restreindre et d'assigner les périmètres territoriaux/organisationnels (National, Région, Secteur, Équipe) et le filtrage des champs visibles par table et référentiel dans la gestion des rôles.",
            category: 'Rôles & Habilitations',
            is_enabled: 1,
            icon: 'fas fa-eye-slash'
        },
        {
            key: 'role_simulation',
            name: "Simulation & Rendu d'Interface des Rôles",
            description: "Active le simulateur en temps réel de la barre de navigation et des fiches pour tester la visibilité des champs et auditer les permissions accordées à un rôle.",
            category: 'Rôles & Habilitations',
            is_enabled: 1,
            icon: 'fas fa-vial'
        },
        {
            key: 'referentiels_management',
            name: 'Gestion des Référentiels Métier & Tables',
            description: "Permet la consultation, création, modification, import/export CSV et la gestion des données au sein des tables de référence de la plateforme.",
            category: 'Référentiels & Données',
            is_enabled: 1,
            icon: 'fas fa-database'
        },
        {
            key: 'referentiel_types_structure',
            name: 'Définition des Types de Référentiels (Structure & DB)',
            description: "Active le concepteur de schémas de données : typage des colonnes (texte, entier, date, sélecteur, clé étrangère), contraintes d'intégrité et gestion des métadonnées.",
            category: 'Référentiels & Données',
            is_enabled: 1,
            icon: 'fas fa-layer-group'
        },
        {
            key: 'metadata_schema',
            name: 'Schéma des Métadonnées & Attributs Transverses',
            description: 'Permet de configurer des tags, catégories hiérarchiques et badges de criticité transverses sur les tables de référence et leurs enregistrements.',
            category: 'Référentiels & Données',
            is_enabled: 1,
            icon: 'fas fa-tags'
        },
        {
            key: 'export_csv_advanced',
            name: 'Export CSV & Rapports Structurés',
            description: 'Active les boutons d\'exportation CSV normalisés pour les référentiels de données et la liste des demandes.',
            category: 'Outils & Données',
            is_enabled: 1,
            icon: 'fas fa-file-csv'
        },
        {
            key: 'delegation_approval',
            name: 'Délégations de Pouvoir de Validation',
            description: 'Permet aux validateurs d\'assigner des suppléants temporaires pour traiter les demandes pendant leurs congés ou indisponibilités.',
            category: 'Workflow & Sécurité',
            is_enabled: 1,
            icon: 'fas fa-exchange-alt'
        },
        {
            key: 'syslog_audit_nis2',
            name: 'Traçabilité Syslog & Audit NIS 2',
            description: 'Active la journalisation et l\'interface d\'audit de sécurité des opérations sensibles conformément aux exigences NIS 2.',
            category: 'Sécurité & Conformité',
            is_enabled: 1,
            icon: 'fas fa-shield-alt'
        }
    ];

    for (const feat of DEFAULT_SYSTEM_FEATURES) {
        const existing = await db.get('SELECT key FROM system_features WHERE key = ?', feat.key);
        if (!existing) {
            await db.run(
                `INSERT INTO system_features (key, name, description, category, is_enabled, icon, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                feat.key,
                feat.name,
                feat.description,
                feat.category,
                feat.is_enabled,
                feat.icon,
                new Date().toISOString()
            );
        }
    }

    const adminNavCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM admin_nav_items');
    if (adminNavCount && Number(adminNavCount.count) === 0) {
        for (const item of adminNavDatabase) {
            await db.run(
                `INSERT INTO admin_nav_items (id, key, label, path, icon, section, badge, badge_color, is_visible, display_order, associated_feature_key, is_system)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                item.id,
                item.key,
                item.label,
                item.path,
                item.icon,
                item.section,
                item.badge || '',
                item.badge_color || '',
                item.is_visible ? 1 : 0,
                item.display_order,
                item.associated_feature_key || null,
                item.is_system ? 1 : 0
            );
        }
    } else {
        // Ensure new system items exist in admin_nav_items
        for (const item of adminNavDatabase) {
            const existing = await db.get('SELECT id FROM admin_nav_items WHERE key = ?', item.key);
            if (!existing) {
                await db.run(
                    `INSERT INTO admin_nav_items (id, key, label, path, icon, section, badge, badge_color, is_visible, display_order, associated_feature_key, is_system)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    item.id,
                    item.key,
                    item.label,
                    item.path,
                    item.icon,
                    item.section,
                    item.badge || '',
                    item.badge_color || '',
                    item.is_visible ? 1 : 0,
                    item.display_order,
                    item.associated_feature_key || null,
                    item.is_system ? 1 : 0
                );
            } else if (item.is_system && (item.key === 'formulaires' || item.key === 'workflows' || item.key === 'system_settings' || item.key === 'onglets_referentiels')) {
                await db.run(
                    `UPDATE admin_nav_items SET path = ?, label = ?, icon = ?, display_order = ?, badge = ?, badge_color = ? WHERE key = ?`,
                    item.path,
                    item.label,
                    item.icon,
                    item.display_order,
                    item.badge || '',
                    item.badge_color || '',
                    item.key
                );
            }
        }
    }

    const adminSectionsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM admin_nav_sections');
    if (adminSectionsCount && Number(adminSectionsCount.count) === 0) {
        for (const sec of adminNavSectionsDatabase) {
            await db.run(
                `INSERT INTO admin_nav_sections (id, key, title, icon, badge, badge_color, display_order, is_visible, is_system)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                sec.id,
                sec.key,
                sec.title,
                sec.icon,
                sec.badge || '',
                sec.badge_color || '',
                sec.display_order,
                sec.is_visible ? 1 : 0,
                sec.is_system ? 1 : 0
            );
        }
    }

    // 10. Seed Initial System Settings (Zero Hardcoding Architecture)
    const INITIAL_SYSTEM_SETTINGS = [
        {
            key: 'password_access_policy',
            value_json: JSON.stringify({
                password_min_length: 5,
                password_max_length: 15,
                uppercase_required: true,
                lowercase_required: true,
                special_char_required: true,
                number_required: true,
                login_attempts_limit: 5,
                password_validity_days: 120,
                password_recovery: true,
                password_recovery_link_validity_days: 4,
                enforce_password_history: 1
            }),
            category: 'security',
            description: 'Politique de sécurité des mots de passe, accès et verrouillage de compte (NIS 2)'
        },
        {
            key: 'data_retention_policy',
            value_json: JSON.stringify({
                rejected_dossiers_retention_days: 180,
                completed_dossiers_retention_days: 1095,
                audit_logs_retention_days: 365,
                inactive_accounts_retention_days: 730,
                anonymize_only: true,
                auto_schedule_enabled: true
            }),
            category: 'rgpd',
            description: 'Règles et durées de rétention des données personnelles et historiques (RGPD / NIS 2)'
        },
        {
            key: 'quota_hardware_default_limit',
            value_json: JSON.stringify({ max_orders: 5, period_months: 12 }),
            category: 'quotas',
            description: 'Seuil max de commandes par demandeur avant escalade nationale (S10)'
        },
        {
            key: 'relance_s14_config',
            value_json: JSON.stringify({ delai_semaines: 2, max_bounces: 3, auto_incident_on_timeout: true }),
            category: 'relances',
            description: 'Fréquence de relance et délai de forclusion automatique (S14)'
        },
        {
            key: 'validite_comptes_rules',
            value_json: JSON.stringify({ interne_max_mois: 36, externe_require_fin_contrat: true }),
            category: 'rgpd',
            description: 'Durée max de validité des comptes internes et règles externes'
        },
        {
            key: 'quote_timeout_months',
            value_json: JSON.stringify({ timeout_months: 3, allow_duplication: true }),
            category: 'tarification',
            description: 'Délai d expiration d un devis sans commande avant archivage'
        },
        {
            key: 'tarification_devis_differentiel_s9',
            value_json: JSON.stringify({
                user_stock_unit_price: 45.00,
                supplier_stock_unit_price: 85.00,
                new_order_unit_price: 145.00,
                currency: 'EUR'
            }),
            category: 'tarification',
            description: 'Barème unitaire du devis différentiel S9 par type de stock'
        },
        {
            key: 'workflow_routing_rules',
            value_json: JSON.stringify({
                hardware_request_types: ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY'],
                gps_required_types: ['CYLINDER_ORDER', 'TERMINAL_ORDER'],
                user_account_types: ['USER_ACCOUNT'],
                auto_fulfill_types: ['HABILITATION', 'ORGANIZATION_CHANGE'],
                incident_types: ['INCIDENT']
            }),
            category: 'workflow',
            description: 'Matrice de classification et règles de routage dynamique des types de demandes'
        },
        {
            key: 'workflow_role_privileges',
            value_json: JSON.stringify({
                manager_approval_roles: ['Manager', 'Responsable d\'équipe', 'Chef de Projet', 'Administrateur'],
                validator_approval_roles: ['Validateur', 'Validateur de Site', 'Responsable Sécurité', 'Administrateur'],
                national_arbitration_roles: ['Référent National', 'Administrateur National', 'Administrateur'],
                security_alert_recipients: ['Référent National Sécurité', 'Pôle Sécurité Mécatronique']
            }),
            category: 'workflow',
            description: 'Rôles autorisés pour la double validation croisée et l\'arbitrage national'
        },
        {
            key: 'gps_commissioning_rules',
            value_json: JSON.stringify({
                max_distance_meters: 250,
                max_accuracy_meters: 50,
                require_installer_signature: true
            }),
            category: 'workflow',
            description: 'Tolérances géométriques et conditions requises pour la validation GPS de pose (Cylindres / Bornes)'
        },
        {
            key: 'incident_blacklist_rules',
            value_json: JSON.stringify({
                replacement_default_origin: 'SUPPLIER_STOCK',
                replacement_quote_fixed_amount: 85.00,
                use_s9_tariff_lookup: true,
                auto_exclusion_rule: true
            }),
            category: 'workflow',
            description: 'Règles de génération automatique des demandes de remplacement en cas de révocation d\'accès'
        }
    ];

    for (const setting of INITIAL_SYSTEM_SETTINGS) {
        const existing = await db.get('SELECT key FROM system_settings WHERE key = ?', setting.key);
        if (!existing) {
            await db.run(
                `INSERT INTO system_settings (key, value_json, category, description, updated_at)
                 VALUES (?, ?, ?, ?, ?)`,
                setting.key,
                setting.value_json,
                setting.category,
                setting.description,
                new Date().toISOString()
            );
        }
    }

    // Seed Return Contracts (Epic 3 - US 3.3) if empty
    try {
        const contractsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM return_contracts');
        if (contractsCount && Number(contractsCount.count) === 0) {
            const now = new Date();
            const past1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
            const past2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

            const demoContracts = [
                {
                    id: 'RET-2026-001',
                    request_id: 1,
                    beneficiaire_id: 1,
                    beneficiaire_name: 'Jean Dupont (Agent)',
                    state: 'RESTITUTION_PLANIFIEE',
                    items: JSON.stringify([
                        { hardwareSerial: 'MEC-2026-F9000-002', hardwareType: 'CLE_MECATRONIQUE', condition: 'BON_ETAT', penaltyFee: 0 }
                    ]),
                    deposit_status: 'CONSERVEE',
                    total_penalty: 0,
                    receipt_date: null,
                    inspected_by: null,
                    created_at: past1,
                    updated_at: past1
                },
                {
                    id: 'RET-2026-002',
                    request_id: 2,
                    beneficiaire_id: 2,
                    beneficiaire_name: 'Cosette Fauchelevent',
                    state: 'INSPECTION_CONFORME',
                    items: JSON.stringify([
                        { hardwareSerial: 'MEC-2026-F9000-008', hardwareType: 'CLE_MECATRONIQUE', condition: 'BON_ETAT', inspectionNotes: 'Clé rendue propre sans dégradation mécanique.' }
                    ]),
                    deposit_status: 'RESTITUEE',
                    total_penalty: 0,
                    receipt_date: past1,
                    inspected_by: 'Atelier Mécatronique Paris-Nord',
                    created_at: past2,
                    updated_at: past1
                },
                {
                    id: 'RET-2026-003',
                    request_id: 3,
                    beneficiaire_id: 3,
                    beneficiaire_name: 'Marc Martin',
                    state: 'DEGRADATION_CONSTATEE',
                    items: JSON.stringify([
                        { hardwareSerial: 'MEC-2026-F9000-015', hardwareType: 'CLE_MECATRONIQUE', condition: 'DEGRADE', penaltyFee: 45, inspectionNotes: 'Broche de contact tordue - réparation requise.' }
                    ]),
                    deposit_status: 'ENGAGEE_PENALITE',
                    total_penalty: 45,
                    receipt_date: past2,
                    inspected_by: 'Régisseur Central',
                    created_at: past2,
                    updated_at: past2
                }
            ];

            for (const c of demoContracts) {
                await db.run(`
                    INSERT INTO return_contracts (id, request_id, beneficiaire_id, beneficiaire_name, state, items, deposit_status, total_penalty, receipt_date, inspected_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [c.id, c.request_id, c.beneficiaire_id, c.beneficiaire_name, c.state, c.items, c.deposit_status, c.total_penalty, c.receipt_date, c.inspected_by, c.created_at, c.updated_at]);
            }
        }
    } catch (e) {
        console.warn('Seeding return contracts warning:', e);
    }

    // Seed decision_history if empty
    try {
        const decisionsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM decision_history');
        if (decisionsCount && Number(decisionsCount.count) === 0) {
            for (const d of decisionHistory) {
                await db.run(
                    'INSERT INTO decision_history (id, reference, title, decision, author, motif, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    d.id, d.reference, d.title || null, d.decision, d.author, d.motif || null, d.date
                );
            }
        }
    } catch (e) {
        console.warn('Seeding decision_history warning:', e);
    }

    // Seed notifications if empty
    try {
        const notifsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM notifications');
        if (notifsCount && Number(notifsCount.count) === 0) {
            for (const n of notificationsDB) {
                await db.run(
                    'INSERT INTO notifications (id, target_user_id, target_role, target_email, type, title, message, link, reference, urgent, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    n.id, n.target_user_id || null, n.target_role || null, (n as any).target_email || null, n.type, n.title, n.message, n.link || null, n.reference || null, n.urgent ? 1 : 0, n.read ? 1 : 0, n.created_at
                );
            }
        }
    } catch (e) {
        console.warn('Seeding notifications warning:', e);
    }
}
