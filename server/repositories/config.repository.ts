import { ISqliteDb, getDatabase } from '../db/database.js';
import {
    processTemplates,
    ProcessTemplate,
    formTemplatesDatabase,
    FormTemplate,
    statusesDatabase,
    CustomStatusConfig,
    statusCategoriesDatabase,
    StatusCategoryConfig,
    statusMetadataStore,
    StatusMetadataConfig,
    businessRulesStore,
    BusinessRule,
    ruleDomainsDatabase,
    RuleDomainConfig
} from '../db/store.js';

export class ConfigRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    // -------------------------------------------------------------
    // SYNC ON STARTUP: LOAD FROM SQLITE INTO IN-MEMORY STORE
    // -------------------------------------------------------------
    async syncAllFromDb(): Promise<void> {
        const db = await this.getDb();

        try {
            // 1. Process Templates
            const processRows = await db.all('SELECT * FROM process_templates ORDER BY id ASC');
            if (processRows && processRows.length > 0) {
                processTemplates.length = 0;
                for (const row of processRows) {
                    processTemplates.push({
                        id: Number(row.id),
                        name: row.name,
                        code: row.code || undefined,
                        category_id: Number(row.category_id) || 1,
                        description: row.description || '',
                        status: row.status || 'Publié',
                        request_type: row.request_type || undefined,
                        has_special_tag: Boolean(row.has_special_tag),
                        workflow_rules: row.workflow_rules ? JSON.parse(row.workflow_rules) : undefined,
                        linked_tables: row.linked_tables ? JSON.parse(row.linked_tables) : [],
                        stages: row.stages ? JSON.parse(row.stages) : [],
                        fields: row.fields ? JSON.parse(row.fields) : [],
                        notifications: row.notifications ? JSON.parse(row.notifications) : [],
                        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
                    });
                }
            } else {
                for (const p of processTemplates) {
                    await this.saveProcess(p);
                }
            }

            // 2. Form Templates
            const formRows = await db.all('SELECT * FROM form_templates ORDER BY id ASC');
            if (formRows && formRows.length > 0) {
                formTemplatesDatabase.length = 0;
                for (const row of formRows) {
                    formTemplatesDatabase.push({
                        id: row.id,
                        name: row.name,
                        code: row.code,
                        category_id: Number(row.category_id) || 1,
                        description: row.description || '',
                        status: row.status || 'Actif',
                        fields: row.fields ? JSON.parse(row.fields) : [],
                        linked_tables: row.linked_tables ? JSON.parse(row.linked_tables) : [],
                        linked_process_id: row.linked_process_id ? Number(row.linked_process_id) : undefined,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });
                }
            } else {
                for (const f of formTemplatesDatabase) {
                    await this.saveForm(f);
                }
            }

            // 3. Statuses
            const statusRows = await db.all('SELECT * FROM custom_statuses ORDER BY display_order ASC, id ASC');
            if (statusRows && statusRows.length > 0) {
                statusesDatabase.length = 0;
                for (const row of statusRows) {
                    statusesDatabase.push({
                        id: row.id,
                        code: row.code,
                        label: row.label,
                        description: row.description || '',
                        category: row.category,
                        badge_bg: row.badge_bg || 'bg-gray-100',
                        badge_text: row.badge_text || 'text-gray-700',
                        badge_border: row.badge_border || 'border-gray-200',
                        icon_name: row.icon_name || 'Tag',
                        is_initial: Boolean(row.is_initial),
                        is_terminal: Boolean(row.is_terminal),
                        sla_default_hours: Number(row.sla_default_hours) || 0,
                        allowed_transitions: row.allowed_transitions ? JSON.parse(row.allowed_transitions) : [],
                        associated_processes: row.associated_processes ? JSON.parse(row.associated_processes) : ['ALL'],
                        specification_tag: row.specification_tag || undefined,
                        is_system: Boolean(row.is_system),
                        display_order: Number(row.display_order) || 1,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });
                }
            } else {
                for (const s of statusesDatabase) {
                    await this.saveStatus(s);
                }
            }

            // 4. Status Categories
            const catRows = await db.all('SELECT * FROM status_categories ORDER BY display_order ASC');
            if (catRows && catRows.length > 0) {
                statusCategoriesDatabase.length = 0;
                for (const row of catRows) {
                    statusCategoriesDatabase.push({
                        id: row.id,
                        code: row.code,
                        label: row.label,
                        color: row.color,
                        desc: row.desc,
                        display_order: Number(row.display_order) || 1,
                        is_system: Boolean(row.is_system)
                    });
                }
            } else {
                for (const c of statusCategoriesDatabase) {
                    await this.saveStatusCategory(c);
                }
            }

            // 5. Status Metadata
            const metaRow = await db.get('SELECT * FROM status_metadata WHERE id = ?', 'current');
            if (metaRow) {
                statusMetadataStore.specification_title = metaRow.specification_title || '';
                statusMetadataStore.specification_code = metaRow.specification_code || '';
                statusMetadataStore.specification_description = metaRow.specification_description || '';
                statusMetadataStore.badge_label = metaRow.badge_label || '';
            } else {
                await this.saveStatusMetadata(statusMetadataStore);
            }

            // 6. Business Rules
            const ruleRows = await db.all('SELECT * FROM business_rules ORDER BY priority ASC, id ASC');
            if (ruleRows && ruleRows.length > 0) {
                businessRulesStore.length = 0;
                for (const row of ruleRows) {
                    businessRulesStore.push({
                        id: row.id,
                        code: row.code,
                        title: row.title,
                        description: row.description || '',
                        category: row.category || 'GENERAL',
                        trigger_event: row.trigger_event,
                        target_field: row.target_field || undefined,
                        operator: row.operator,
                        expected_value: row.expected_value || undefined,
                        action_type: row.action_type,
                        action_role: row.action_role || undefined,
                        error_message: row.error_message || '',
                        is_active: Boolean(row.is_active),
                        priority: Number(row.priority) || 1,
                        associated_processes: row.associated_processes ? JSON.parse(row.associated_processes) : ['ALL'],
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });
                }
            } else {
                for (const r of businessRulesStore) {
                    await this.saveBusinessRule(r);
                }
            }

            // 7. Rule Domains
            const domainRows = await db.all('SELECT * FROM rule_domains ORDER BY display_order ASC');
            if (domainRows && domainRows.length > 0) {
                ruleDomainsDatabase.length = 0;
                for (const row of domainRows) {
                    ruleDomainsDatabase.push({
                        id: row.id,
                        code: row.code,
                        label: row.label,
                        description: row.description || '',
                        color: row.color,
                        bgBadge: row.bgBadge,
                        iconName: row.iconName,
                        display_order: Number(row.display_order) || 1,
                        is_system: Boolean(row.is_system)
                    });
                }
            } else {
                for (const d of ruleDomainsDatabase) {
                    await this.saveRuleDomain(d);
                }
            }
        } catch (err) {
            console.error('Erreur synchronisation SQLite config store:', err);
        }
    }

    // -------------------------------------------------------------
    // PROCESS TEMPLATES PERSISTENCE
    // -------------------------------------------------------------
    async saveProcess(p: ProcessTemplate): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO process_templates (
                id, name, code, category_id, description, status, request_type,
                has_special_tag, workflow_rules, linked_tables, stages, fields,
                notifications, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                code = excluded.code,
                category_id = excluded.category_id,
                description = excluded.description,
                status = excluded.status,
                request_type = excluded.request_type,
                has_special_tag = excluded.has_special_tag,
                workflow_rules = excluded.workflow_rules,
                linked_tables = excluded.linked_tables,
                stages = excluded.stages,
                fields = excluded.fields,
                notifications = excluded.notifications,
                metadata = excluded.metadata,
                updated_at = excluded.updated_at`,
            p.id,
            p.name,
            p.code || null,
            p.category_id || 1,
            p.description || '',
            p.status || 'Publié',
            p.request_type || null,
            p.has_special_tag ? 1 : 0,
            p.workflow_rules ? JSON.stringify(p.workflow_rules) : null,
            JSON.stringify(p.linked_tables || []),
            JSON.stringify(p.stages || []),
            JSON.stringify(p.fields || []),
            JSON.stringify(p.notifications || []),
            p.metadata ? JSON.stringify(p.metadata) : null,
            new Date().toISOString(),
            new Date().toISOString()
        );
    }

    async deleteProcess(id: number): Promise<void> {
        const db = await this.getDb();
        await db.run('DELETE FROM process_templates WHERE id = ?', id);
    }

    // -------------------------------------------------------------
    // FORM TEMPLATES PERSISTENCE
    // -------------------------------------------------------------
    async saveForm(f: FormTemplate): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO form_templates (
                id, name, code, category_id, description, status, fields,
                linked_tables, linked_process_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                code = excluded.code,
                category_id = excluded.category_id,
                description = excluded.description,
                status = excluded.status,
                fields = excluded.fields,
                linked_tables = excluded.linked_tables,
                linked_process_id = excluded.linked_process_id,
                updated_at = excluded.updated_at`,
            f.id,
            f.name,
            f.code,
            f.category_id || 1,
            f.description || '',
            f.status || 'Actif',
            JSON.stringify(f.fields || []),
            JSON.stringify(f.linked_tables || []),
            f.linked_process_id || null,
            f.created_at || new Date().toISOString(),
            f.updated_at || new Date().toISOString()
        );
    }

    async deleteForm(id: string): Promise<void> {
        const db = await this.getDb();
        await db.run('DELETE FROM form_templates WHERE id = ?', id);
    }

    // -------------------------------------------------------------
    // CUSTOM STATUSES PERSISTENCE
    // -------------------------------------------------------------
    async saveStatus(s: CustomStatusConfig): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO custom_statuses (
                id, code, label, description, category, badge_bg, badge_text,
                badge_border, icon_name, is_initial, is_terminal, sla_default_hours,
                allowed_transitions, associated_processes, specification_tag,
                is_system, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                label = excluded.label,
                description = excluded.description,
                category = excluded.category,
                badge_bg = excluded.badge_bg,
                badge_text = excluded.badge_text,
                badge_border = excluded.badge_border,
                icon_name = excluded.icon_name,
                is_initial = excluded.is_initial,
                is_terminal = excluded.is_terminal,
                sla_default_hours = excluded.sla_default_hours,
                allowed_transitions = excluded.allowed_transitions,
                associated_processes = excluded.associated_processes,
                specification_tag = excluded.specification_tag,
                is_system = excluded.is_system,
                display_order = excluded.display_order,
                updated_at = excluded.updated_at`,
            s.id,
            s.code,
            s.label,
            s.description || '',
            s.category,
            s.badge_bg,
            s.badge_text,
            s.badge_border,
            s.icon_name,
            s.is_initial ? 1 : 0,
            s.is_terminal ? 1 : 0,
            s.sla_default_hours || 0,
            JSON.stringify(s.allowed_transitions || []),
            JSON.stringify(s.associated_processes || ['ALL']),
            s.specification_tag || null,
            s.is_system ? 1 : 0,
            s.display_order || 1,
            s.created_at || new Date().toISOString(),
            s.updated_at || new Date().toISOString()
        );
    }

    async deleteStatus(id: string): Promise<void> {
        const db = await this.getDb();
        await db.run('DELETE FROM custom_statuses WHERE id = ?', id);
    }

    // -------------------------------------------------------------
    // STATUS CATEGORIES PERSISTENCE
    // -------------------------------------------------------------
    async saveStatusCategory(c: StatusCategoryConfig): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO status_categories (id, code, label, color, desc, display_order, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                label = excluded.label,
                color = excluded.color,
                desc = excluded.desc,
                display_order = excluded.display_order,
                is_system = excluded.is_system`,
            c.id, c.code, c.label, c.color, c.desc, c.display_order || 1, c.is_system ? 1 : 0
        );
    }

    async deleteStatusCategory(id: string): Promise<void> {
        const db = await this.getDb();
        await db.run('DELETE FROM status_categories WHERE id = ?', id);
    }

    // -------------------------------------------------------------
    // STATUS METADATA PERSISTENCE
    // -------------------------------------------------------------
    async saveStatusMetadata(m: StatusMetadataConfig): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO status_metadata (id, specification_title, specification_code, specification_description, badge_label)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                specification_title = excluded.specification_title,
                specification_code = excluded.specification_code,
                specification_description = excluded.specification_description,
                badge_label = excluded.badge_label`,
            'current',
            m.specification_title || '',
            m.specification_code || '',
            m.specification_description || '',
            m.badge_label || ''
        );
    }

    // -------------------------------------------------------------
    // BUSINESS RULES PERSISTENCE
    // -------------------------------------------------------------
    async saveBusinessRule(r: BusinessRule): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO business_rules (
                id, code, title, description, category, trigger_event,
                target_field, operator, expected_value, action_type, action_role,
                error_message, is_active, priority, associated_processes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                title = excluded.title,
                description = excluded.description,
                category = excluded.category,
                trigger_event = excluded.trigger_event,
                target_field = excluded.target_field,
                operator = excluded.operator,
                expected_value = excluded.expected_value,
                action_type = excluded.action_type,
                action_role = excluded.action_role,
                error_message = excluded.error_message,
                is_active = excluded.is_active,
                priority = excluded.priority,
                associated_processes = excluded.associated_processes,
                updated_at = excluded.updated_at`,
            r.id,
            r.code,
            r.title,
            r.description || '',
            r.category || 'GENERAL',
            r.trigger_event,
            r.target_field || null,
            r.operator,
            r.expected_value || null,
            r.action_type,
            r.action_role || null,
            r.error_message || '',
            r.is_active ? 1 : 0,
            r.priority || 1,
            JSON.stringify(r.associated_processes || ['ALL']),
            r.created_at || new Date().toISOString(),
            r.updated_at || new Date().toISOString()
        );
    }

    async deleteBusinessRule(id: string): Promise<void> {
        const db = await this.getDb();
        await db.run('DELETE FROM business_rules WHERE id = ?', id);
    }

    // -------------------------------------------------------------
    // RULE DOMAINS PERSISTENCE
    // -------------------------------------------------------------
    async saveRuleDomain(d: RuleDomainConfig): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO rule_domains (id, code, label, description, color, bgBadge, iconName, display_order, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                label = excluded.label,
                description = excluded.description,
                color = excluded.color,
                bgBadge = excluded.bgBadge,
                iconName = excluded.iconName,
                display_order = excluded.display_order,
                is_system = excluded.is_system`,
            d.id, d.code, d.label, d.description || '', d.color, d.bgBadge, d.iconName, d.display_order || 1, d.is_system ? 1 : 0
        );
    }

    async deleteRuleDomain(id: string): Promise<void> {
        const db = await this.getDb();
        await db.run('DELETE FROM rule_domains WHERE id = ?', id);
    }
}

export const configRepository = new ConfigRepository();
