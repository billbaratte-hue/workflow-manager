import crypto from 'crypto';
import { getDatabase, ISqliteDb } from '../db/database.js';
import { settingsRepository } from './settings.repository.js';
import {
    ParentRequest,
    RequestItem,
    WorkflowReminder,
    UserOrderQuota,
    PortalAuditLog,
    ParentRequestStatus,
    RequestItemStatus,
    RequestType,
    HardwareOrigin
} from '../types/workflow.types.js';

export class WorkflowRepository {
    constructor(
        private customDb?: ISqliteDb,
        private customSettingsRepo?: typeof settingsRepository
    ) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        return await getDatabase();
    }

    private getSettingsRepo() {
        return this.customSettingsRepo || settingsRepository;
    }

    async initializeTables(): Promise<void> {
        const db = await this.getDb();

        await db.exec(`
            CREATE TABLE IF NOT EXISTS parent_requests (
                id TEXT PRIMARY KEY,
                request_number TEXT UNIQUE NOT NULL,
                request_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                requester_id INTEGER NOT NULL,
                requester_name TEXT NOT NULL,
                requester_email TEXT,
                manager_id INTEGER,
                manager_name TEXT,
                validator_id INTEGER,
                validator_name TEXT,
                site_id INTEGER,
                site_name TEXT,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                external_order_ref TEXT,
                quote_amount REAL DEFAULT 0,
                quote_currency TEXT DEFAULT 'EUR',
                quota_exceeded INTEGER DEFAULT 0,
                has_special_tag INTEGER DEFAULT 0,
                manager_approved INTEGER DEFAULT 0,
                validator_approved INTEGER DEFAULT 0,
                gdpr_accepted INTEGER DEFAULT 0,
                reception_pv_signed INTEGER DEFAULT 0,
                workflow_rules TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

        try {
            await db.exec(`ALTER TABLE parent_requests ADD COLUMN workflow_rules TEXT;`);
        } catch {
            // Column may already exist
        }

        await db.exec(`
            CREATE TABLE IF NOT EXISTS request_items (
                id TEXT PRIMARY KEY,
                parent_request_id TEXT NOT NULL,
                item_type TEXT NOT NULL,
                label TEXT NOT NULL,
                target_site_id INTEGER,
                target_site_name TEXT,
                designated_validator_id INTEGER,
                designated_validator_name TEXT,
                hardware_serial_number TEXT,
                hardware_origin TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING_VAL_PARALLEL',
                approved_at TEXT,
                rejection_reason TEXT,
                gps_coordinates TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(parent_request_id) REFERENCES parent_requests(id) ON DELETE CASCADE
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS workflow_reminders (
                id TEXT PRIMARY KEY,
                target_entity_type TEXT NOT NULL,
                target_entity_id TEXT NOT NULL,
                reminder_count INTEGER DEFAULT 0,
                max_reminders INTEGER DEFAULT 3,
                last_sent_at TEXT,
                next_scheduled_at TEXT,
                status TEXT DEFAULT 'ACTIVE'
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS user_order_quotas (
                user_id INTEGER PRIMARY KEY,
                user_name TEXT,
                order_count INTEGER DEFAULT 0,
                period_start_date TEXT NOT NULL,
                period_end_date TEXT,
                quota_limit INTEGER NOT NULL DEFAULT 5,
                last_escalation_at TEXT
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS portal_audit_logs (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                performed_by INTEGER NOT NULL,
                performed_by_name TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL
            );
        `);

        await this.seedInitialWorkflowData();
    }

    private mapParentRow(row: any, items: RequestItem[] = []): ParentRequest {
        return {
            id: row.id,
            request_number: row.request_number,
            request_type: row.request_type,
            title: row.title,
            description: row.description || '',
            requester_id: Number(row.requester_id),
            requester_name: row.requester_name,
            requester_email: row.requester_email || '',
            manager_id: row.manager_id ? Number(row.manager_id) : null,
            manager_name: row.manager_name || null,
            validator_id: row.validator_id ? Number(row.validator_id) : null,
            validator_name: row.validator_name || null,
            site_id: row.site_id ? Number(row.site_id) : null,
            site_name: row.site_name || null,
            status: row.status as ParentRequestStatus,
            external_order_ref: row.external_order_ref || null,
            quote_amount: Number(row.quote_amount || 0),
            quote_currency: row.quote_currency || 'EUR',
            quota_exceeded: Boolean(row.quota_exceeded),
            has_special_tag: Boolean(row.has_special_tag),
            manager_approved: Boolean(row.manager_approved),
            validator_approved: Boolean(row.validator_approved),
            gdpr_accepted: Boolean(row.gdpr_accepted),
            reception_pv_signed: Boolean(row.reception_pv_signed),
            workflow_rules: row.workflow_rules ? JSON.parse(row.workflow_rules) : (row.metadata ? (JSON.parse(row.metadata).workflow_rules || undefined) : undefined),
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            created_at: row.created_at,
            updated_at: row.updated_at,
            items
        };
    }

    private mapItemRow(row: any): RequestItem {
        return {
            id: row.id,
            parent_request_id: row.parent_request_id,
            item_type: row.item_type,
            label: row.label,
            target_site_id: row.target_site_id ? Number(row.target_site_id) : null,
            target_site_name: row.target_site_name || null,
            designated_validator_id: row.designated_validator_id ? Number(row.designated_validator_id) : null,
            designated_validator_name: row.designated_validator_name || null,
            hardware_serial_number: row.hardware_serial_number || null,
            hardware_origin: row.hardware_origin as HardwareOrigin | null,
            status: row.status as RequestItemStatus,
            approved_at: row.approved_at || null,
            rejection_reason: row.rejection_reason || null,
            gps_coordinates: row.gps_coordinates ? JSON.parse(row.gps_coordinates) : null,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            created_at: row.created_at
        };
    }

    async getAllParentRequests(): Promise<ParentRequest[]> {
        const db = await this.getDb();
        const rows = await db.all<any>('SELECT * FROM parent_requests ORDER BY created_at DESC');
        const itemsRows = await db.all<any>('SELECT * FROM request_items ORDER BY created_at ASC');

        const itemsByParent = new Map<string, RequestItem[]>();
        for (const itemRow of itemsRows) {
            const item = this.mapItemRow(itemRow);
            const list = itemsByParent.get(item.parent_request_id) || [];
            list.push(item);
            itemsByParent.set(item.parent_request_id, list);
        }

        return rows.map(r => this.mapParentRow(r, itemsByParent.get(r.id) || []));
    }

    async getParentRequestById(id: string): Promise<ParentRequest | null> {
        const db = await this.getDb();
        const row = await db.get<any>('SELECT * FROM parent_requests WHERE id = ? OR request_number = ?', id, id);
        if (!row) return null;

        const itemsRows = await db.all<any>('SELECT * FROM request_items WHERE parent_request_id = ? ORDER BY created_at ASC', row.id);
        const items = itemsRows.map(r => this.mapItemRow(r));
        return this.mapParentRow(row, items);
    }

    async createParentRequest(data: Partial<ParentRequest>, items: Partial<RequestItem>[] = []): Promise<ParentRequest> {
        const db = await this.getDb();
        const id = data.id || crypto.randomUUID();
        const requestNumber = data.request_number || `DOS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO parent_requests (
                id, request_number, request_type, title, description,
                requester_id, requester_name, requester_email,
                manager_id, manager_name, validator_id, validator_name,
                site_id, site_name, status, external_order_ref,
                quote_amount, quote_currency, quota_exceeded, has_special_tag,
                manager_approved, validator_approved, gdpr_accepted, reception_pv_signed,
                workflow_rules, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            id,
            requestNumber,
            data.request_type || 'HABILITATION',
            data.title || 'Dossier d\'accès mécatronique',
            data.description || '',
            data.requester_id || 1042,
            data.requester_name || 'Daniel Dupont',
            data.requester_email || 'daniel@entreprise.fr',
            data.manager_id || 201,
            data.manager_name || 'Marc Martin (Manager N+1)',
            data.validator_id || 305,
            data.validator_name || 'Valérie Validateur',
            data.site_id || 1,
            data.site_name || 'Paris Gare du Nord',
            data.status || 'DRAFT',
            data.external_order_ref || null,
            data.quote_amount || 0,
            data.quote_currency || 'EUR',
            data.quota_exceeded ? 1 : 0,
            data.has_special_tag ? 1 : 0,
            data.manager_approved ? 1 : 0,
            data.validator_approved ? 1 : 0,
            data.gdpr_accepted ? 1 : 0,
            data.reception_pv_signed ? 1 : 0,
            data.workflow_rules ? JSON.stringify(data.workflow_rules) : null,
            JSON.stringify(data.metadata || {}),
            now,
            now
        );

        const createdItems: RequestItem[] = [];
        for (const it of items) {
            const itemId = it.id || crypto.randomUUID();
            await db.run(`
                INSERT INTO request_items (
                    id, parent_request_id, item_type, label,
                    target_site_id, target_site_name,
                    designated_validator_id, designated_validator_name,
                    hardware_serial_number, hardware_origin,
                    status, approved_at, rejection_reason, gps_coordinates,
                    metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                itemId,
                id,
                it.item_type || 'ACCESS_RIGHT',
                it.label || 'Accès unitaire',
                it.target_site_id || null,
                it.target_site_name || null,
                it.designated_validator_id || null,
                it.designated_validator_name || null,
                it.hardware_serial_number || null,
                it.hardware_origin || null,
                it.status || 'PENDING_VAL_PARALLEL',
                it.approved_at || null,
                it.rejection_reason || null,
                it.gps_coordinates ? JSON.stringify(it.gps_coordinates) : null,
                JSON.stringify(it.metadata || {}),
                now
            );

            createdItems.push({
                id: itemId,
                parent_request_id: id,
                item_type: it.item_type || 'ACCESS_RIGHT',
                label: it.label || 'Accès unitaire',
                target_site_id: it.target_site_id || null,
                target_site_name: it.target_site_name || null,
                designated_validator_id: it.designated_validator_id || null,
                designated_validator_name: it.designated_validator_name || null,
                hardware_serial_number: it.hardware_serial_number || null,
                hardware_origin: it.hardware_origin || null,
                status: (it.status || 'PENDING_VAL_PARALLEL') as RequestItemStatus,
                approved_at: it.approved_at || null,
                rejection_reason: it.rejection_reason || null,
                gps_coordinates: it.gps_coordinates || null,
                metadata: it.metadata || {},
                created_at: now
            });
        }

        // Add audit log
        await this.addAuditLog(
            'PARENT_REQUEST',
            id,
            'DOSSIER_CREATED',
            data.requester_id || 1042,
            data.requester_name || 'Daniel Dupont',
            { request_number: requestNumber, request_type: data.request_type, items_count: items.length }
        );

        return (await this.getParentRequestById(id))!;
    }

    async updateParentRequest(id: string, updates: Partial<ParentRequest>): Promise<ParentRequest | null> {
        const db = await this.getDb();
        const current = await this.getParentRequestById(id);
        if (!current) return null;

        const merged: ParentRequest = {
            ...current,
            ...updates,
            updated_at: new Date().toISOString()
        };

        await db.run(`
            UPDATE parent_requests SET
                title = ?,
                description = ?,
                status = ?,
                external_order_ref = ?,
                quote_amount = ?,
                quote_currency = ?,
                quota_exceeded = ?,
                has_special_tag = ?,
                manager_approved = ?,
                validator_approved = ?,
                gdpr_accepted = ?,
                reception_pv_signed = ?,
                workflow_rules = ?,
                metadata = ?,
                updated_at = ?
            WHERE id = ?
        `,
            merged.title,
            merged.description || '',
            merged.status,
            merged.external_order_ref || null,
            merged.quote_amount || 0,
            merged.quote_currency || 'EUR',
            merged.quota_exceeded ? 1 : 0,
            merged.has_special_tag ? 1 : 0,
            merged.manager_approved ? 1 : 0,
            merged.validator_approved ? 1 : 0,
            merged.gdpr_accepted ? 1 : 0,
            merged.reception_pv_signed ? 1 : 0,
            merged.workflow_rules ? JSON.stringify(merged.workflow_rules) : null,
            JSON.stringify(merged.metadata || {}),
            merged.updated_at,
            id
        );

        return await this.getParentRequestById(id);
    }

    async updateRequestItem(itemId: string, updates: Partial<RequestItem>): Promise<RequestItem | null> {
        const db = await this.getDb();
        const row = await db.get<any>('SELECT * FROM request_items WHERE id = ?', itemId);
        if (!row) return null;

        const current = this.mapItemRow(row);
        const merged: RequestItem = {
            ...current,
            ...updates
        };

        await db.run(`
            UPDATE request_items SET
                status = ?,
                approved_at = ?,
                rejection_reason = ?,
                hardware_serial_number = ?,
                hardware_origin = ?,
                gps_coordinates = ?,
                metadata = ?
            WHERE id = ?
        `,
            merged.status,
            merged.approved_at || null,
            merged.rejection_reason || null,
            merged.hardware_serial_number || null,
            merged.hardware_origin || null,
            merged.gps_coordinates ? JSON.stringify(merged.gps_coordinates) : null,
            JSON.stringify(merged.metadata || {}),
            itemId
        );

        const updatedRow = await db.get<any>('SELECT * FROM request_items WHERE id = ?', itemId);
        return updatedRow ? this.mapItemRow(updatedRow) : null;
    }

    async getUserOrderQuota(userId: number): Promise<UserOrderQuota> {
        const db = await this.getDb();
        const quotaConfig = await this.getSettingsRepo().getSettingValue<{ max_orders: number; period_months: number }>(
            'quota_hardware_default_limit',
            { max_orders: 5, period_months: 12 }
        );
        const configuredLimit = Number(quotaConfig?.max_orders || 5);

        const row = await db.get<any>('SELECT * FROM user_order_quotas WHERE user_id = ?', userId);
        if (row) {
            return {
                user_id: Number(row.user_id),
                user_name: row.user_name || '',
                order_count: Number(row.order_count || 0),
                period_start_date: row.period_start_date,
                period_end_date: row.period_end_date || null,
                quota_limit: configuredLimit,
                last_escalation_at: row.last_escalation_at || null
            };
        }

        // Initialize quota
        const now = new Date().toISOString().split('T')[0];
        await db.run(`
            INSERT INTO user_order_quotas (user_id, user_name, order_count, period_start_date, quota_limit)
            VALUES (?, ?, ?, ?, ?)
        `, userId, 'Utilisateur', 0, now, configuredLimit);

        return {
            user_id: userId,
            order_count: 0,
            period_start_date: now,
            quota_limit: configuredLimit
        };
    }

    async incrementUserOrderQuota(userId: number, userName?: string): Promise<UserOrderQuota> {
        const current = await this.getUserOrderQuota(userId);
        const db = await this.getDb();
        const newCount = current.order_count + 1;
        const willEscalate = newCount > current.quota_limit;
        const lastEscalation = willEscalate ? new Date().toISOString() : current.last_escalation_at;

        await db.run(`
            UPDATE user_order_quotas SET
                order_count = ?,
                user_name = COALESCE(?, user_name),
                last_escalation_at = ?
            WHERE user_id = ?
        `, newCount, userName || current.user_name || null, lastEscalation, userId);

        return await this.getUserOrderQuota(userId);
    }

    async resetUserOrderQuota(userId: number): Promise<UserOrderQuota> {
        const db = await this.getDb();
        await db.run(`
            UPDATE user_order_quotas SET
                order_count = 0,
                last_escalation_at = NULL
            WHERE user_id = ?
        `, userId);
        return await this.getUserOrderQuota(userId);
    }

    async getWorkflowReminder(targetEntityId: string): Promise<WorkflowReminder | null> {
        const db = await this.getDb();
        const row = await db.get<any>('SELECT * FROM workflow_reminders WHERE target_entity_id = ?', targetEntityId);
        if (!row) return null;
        return {
            id: row.id,
            target_entity_type: row.target_entity_type,
            target_entity_id: row.target_entity_id,
            reminder_count: Number(row.reminder_count),
            max_reminders: Number(row.max_reminders || 3),
            last_sent_at: row.last_sent_at || null,
            next_scheduled_at: row.next_scheduled_at || null,
            status: row.status
        };
    }

    async incrementWorkflowReminder(targetEntityId: string, entityType: 'PARENT_REQUEST' | 'REQUEST_ITEM'): Promise<WorkflowReminder> {
        const db = await this.getDb();
        const reminderConfig = await this.getSettingsRepo().getSettingValue<{ delai_semaines: number; max_bounces: number; auto_incident_on_timeout: boolean }>(
            'relance_s14_config',
            { delai_semaines: 2, max_bounces: 3, auto_incident_on_timeout: true }
        );
        const configuredMax = Number(reminderConfig?.max_bounces || 3);

        const existing = await this.getWorkflowReminder(targetEntityId);
        const now = new Date().toISOString();

        if (existing) {
            const nextCount = existing.reminder_count + 1;
            const status = nextCount >= configuredMax ? 'EXPIRED' : 'ACTIVE';
            await db.run(`
                UPDATE workflow_reminders SET
                    reminder_count = ?,
                    max_reminders = ?,
                    last_sent_at = ?,
                    status = ?
                WHERE target_entity_id = ?
            `, nextCount, configuredMax, now, status, targetEntityId);
            return (await this.getWorkflowReminder(targetEntityId))!;
        } else {
            const id = crypto.randomUUID();
            await db.run(`
                INSERT INTO workflow_reminders (id, target_entity_type, target_entity_id, reminder_count, max_reminders, last_sent_at, status)
                VALUES (?, ?, ?, 1, ?, ?, 'ACTIVE')
            `, id, entityType, targetEntityId, configuredMax, now);
            return (await this.getWorkflowReminder(targetEntityId))!;
        }
    }

    async addAuditLog(
        entityType: string,
        entityId: string,
        action: string,
        performedBy: number,
        performedByName: string,
        details: any = {}
    ): Promise<void> {
        const db = await this.getDb();
        const id = crypto.randomUUID();
        await db.run(`
            INSERT INTO portal_audit_logs (id, entity_type, entity_id, action, performed_by, performed_by_name, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, id, entityType, entityId, action, performedBy, performedByName, JSON.stringify(details), new Date().toISOString());
    }

    async getAuditLogs(limit: number = 100): Promise<PortalAuditLog[]> {
        const db = await this.getDb();
        const rows = await db.all<any>('SELECT * FROM portal_audit_logs ORDER BY created_at DESC LIMIT ?', limit);
        return rows.map(r => ({
            id: r.id,
            entity_type: r.entity_type,
            entity_id: r.entity_id,
            action: r.action,
            performed_by: Number(r.performed_by),
            performed_by_name: r.performed_by_name,
            details: r.details ? JSON.parse(r.details) : {},
            created_at: r.created_at
        }));
    }

    async seedInitialWorkflowData(): Promise<void> {
        const db = await this.getDb();
        const count = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM parent_requests');
        if (count && Number(count.count) > 0) {
            return;
        }

        // Initialize Daniel Dupont's order quota
        await db.run(`
            INSERT OR REPLACE INTO user_order_quotas (user_id, user_name, order_count, period_start_date, quota_limit)
            VALUES (1042, 'Daniel Dupont', 2, '2026-01-01', 5)
        `);

        // SEED SCENARIO 1: Processus 1 - Multi-site Habilitation with Parallel Async Items
        const p1Id = 'p1-demo-multi-sites';
        await this.createParentRequest({
            id: p1Id,
            request_number: 'DOS-2026-001',
            request_type: 'HABILITATION',
            title: 'Habilitation mécatronique Multi-Sites Postes & Voies LGV',
            description: 'Accès technique simultané sur les secteurs Nord, Sud-Est et Châtillon pour maintenance d\'infrastructure',
            requester_id: 1042,
            requester_name: 'Daniel Dupont',
            requester_email: 'daniel@entreprise.fr',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord (Postes & Voies Banlieue/GL)',
            status: 'PENDING_CROSS_VAL',
            quote_amount: 0,
            manager_approved: true,
            validator_approved: false,
            metadata: { process_number: 1, norm: 'EN 15864 / NIS 2' }
        }, [
            {
                id: 'it-p1-1',
                parent_request_id: p1Id,
                item_type: 'ACCESS_RIGHT',
                label: 'Accès Poste d\'Aiguillage & Locaux Techniques',
                target_site_id: 1,
                target_site_name: 'Paris Gare du Nord',
                designated_validator_id: 305,
                designated_validator_name: 'Valérie Validateur (Sûreté Nord)',
                status: 'ITEM_APPROVED',
                approved_at: '2026-03-18T14:30:00Z'
            },
            {
                id: 'it-p1-2',
                parent_request_id: p1Id,
                item_type: 'ACCESS_RIGHT',
                label: 'Accès Voies & Cantonnement Électrique',
                target_site_id: 2,
                target_site_name: 'Technicentre Châtillon TGV',
                designated_validator_id: 306,
                designated_validator_name: 'Sylvain Sécurité (Sûreté Atlantique)',
                status: 'PENDING_VAL_PARALLEL'
            },
            {
                id: 'it-p1-3',
                parent_request_id: p1Id,
                item_type: 'ACCESS_RIGHT',
                label: 'Accès Salle Relais & Armoires Mécatroniques',
                target_site_id: 3,
                target_site_name: 'Gare de Lyon Part-Dieu & LGV Sud-Est',
                designated_validator_id: 307,
                designated_validator_name: 'Richard Rails (Sûreté ARA)',
                status: 'PENDING_VAL_PARALLEL'
            }
        ]);

        // SEED SCENARIO 2: Processus 2 - Création de compte + RGPD + Enchaînement Clé
        const p2Id = 'p2-demo-user-account';
        await this.createParentRequest({
            id: p2Id,
            request_number: 'DOS-2026-002',
            request_type: 'USER_ACCOUNT',
            title: 'Création de compte Agent Ferroviaire (Interne 3 ans)',
            description: 'Ouverture d\'accès SI mécatronique pour nouvel agent de maintenance',
            requester_id: 201,
            requester_name: 'Marc Martin (Manager N+1)',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'PENDING_KEY_DECISION',
            gdpr_accepted: true,
            manager_approved: true,
            validator_approved: true,
            metadata: {
                user_type: 'Interne',
                validity_period_years: 3,
                beneficiary_name: 'Julien Lefebvre',
                beneficiary_cp: 'CP-89240',
                beneficiary_email: 'julien.lefebvre@entreprise.fr'
            }
        }, [
            {
                id: 'it-p2-1',
                parent_request_id: p2Id,
                item_type: 'USER_CREATION',
                label: 'Compte Système & Badge Virtuel Julien Lefebvre',
                target_site_id: 1,
                target_site_name: 'Paris Gare du Nord',
                status: 'ACTIVE_FULFILLED'
            }
        ]);

        // SEED SCENARIO 3: Processus 3 - Commande de Clé avec Devis Différentiel S9 (Stock Demandeur)
        const p3Id = 'p3-demo-key-order-diff';
        await this.createParentRequest({
            id: p3Id,
            request_number: 'DOS-2026-003',
            request_type: 'KEY_ORDER',
            title: 'Commande Programmation Clé Électronique - Stock Demandeur (S9)',
            description: 'Réaffectation d\'une clé existante issue du stock interne avec contrôle d\'intégrité',
            requester_id: 1042,
            requester_name: 'Daniel Dupont',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'PENDING_QUOTE_PO',
            quote_amount: 45.00, // Devis différentiel: appareillage seul
            quote_currency: 'EUR',
            metadata: {
                hardware_origin: 'USER_STOCK',
                serial_number: 'KEY-PORTAL-9821-FR',
                integrity_check: 'OK_NON_ATTRIBUEE'
            }
        }, [
            {
                id: 'it-p3-1',
                parent_request_id: p3Id,
                item_type: 'KEY',
                label: 'Clé Mécatronique Intelligente (Appareillage seul)',
                hardware_origin: 'USER_STOCK',
                hardware_serial_number: 'KEY-PORTAL-9821-FR',
                status: 'PENDING_VAL_PARALLEL'
            }
        ]);

        // SEED SCENARIO 4: Processus 4 - Commande Cylindres avec Commissioning GPS
        const p4Id = 'p4-demo-cylinders-gps';
        await this.createParentRequest({
            id: p4Id,
            request_number: 'DOS-2026-004',
            request_type: 'CYLINDER_ORDER',
            title: 'Installation Cylindre Électronique Poste de Voie Nord',
            description: 'Remplacement de serrure mécanique par cylindre mécatronique normé EN 15864',
            requester_id: 1042,
            requester_name: 'Daniel Dupont',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'COMMISSIONING_GPS',
            external_order_ref: 'PO-PORTAL-2026-8834',
            reception_pv_signed: true,
            metadata: {
                hardware_origin: 'NEW_ORDER',
                lock_type: 'Cylindre Européen Électronique IP66'
            }
        }, [
            {
                id: 'it-p4-1',
                parent_request_id: p4Id,
                item_type: 'CYLINDER',
                label: 'Cylindre Mécatronique Porte Cabine Relais A2',
                hardware_serial_number: 'CYL-2026-0044-PARIS',
                status: 'COMMISSIONING_GPS',
                target_site_id: 1,
                target_site_name: 'Paris Gare du Nord'
            }
        ]);

        // SEED SCENARIO 5: Processus 5 - Commande Boîtier de rechargement (TAG Spécial)
        const p5Id = 'p5-demo-terminal-tag';
        await this.createParentRequest({
            id: p5Id,
            request_number: 'DOS-2026-005',
            request_type: 'TERMINAL_ORDER',
            title: 'Boîtier Mural de Rechargement & Télé-actualisation',
            description: 'Borne de mise à jour quotidienne des clés programmables pour astreinte',
            requester_id: 1042,
            requester_name: 'Daniel Dupont',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'ACTIVE_FULFILLED',
            has_special_tag: true,
            external_order_ref: 'PO-PORTAL-2026-9120',
            reception_pv_signed: true,
            metadata: {
                has_special_tag: true,
                terminal_model: 'Wall-Mount Terminal V4 Ethernet/4G'
            }
        }, [
            {
                id: 'it-p5-1',
                parent_request_id: p5Id,
                item_type: 'TERMINAL',
                label: 'Borne Mécatronique de Quai Bâtiment B',
                hardware_serial_number: 'TERM-PORTAL-5541',
                status: 'ACTIVE_FULFILLED',
                gps_coordinates: {
                    latitude: 48.8809,
                    longitude: 2.3553,
                    accuracy: 3.5,
                    recorded_at: '2026-03-12T10:15:00Z',
                    installer_name: 'Équipe Signalisation Nord'
                }
            }
        ]);

        // SEED SCENARIO 6: Processus 6 - Déploiement Massif Tripartite S29
        const p6Id = 'p6-demo-mass-deploy';
        await this.createParentRequest({
            id: p6Id,
            request_number: 'DOS-2026-006',
            request_type: 'MASS_DEPLOY',
            title: 'Déploiement Massif 2026 - Modernisation Ligne B Transilien',
            description: 'Import consolidé S29 : 45 clés, 120 cylindres, 15 cadenas et 30 comptes',
            requester_id: 1,
            requester_name: 'Admin Système',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'ESCALATED_NATIONAL',
            quota_exceeded: true,
            metadata: {
                excel_import_ref: 'IMPORT-REF-V2.xlsx',
                tripartite_circuit: ['Manager', 'Validateur', 'Référent National']
            }
        }, [
            {
                id: 'it-p6-1',
                parent_request_id: p6Id,
                item_type: 'KEY',
                label: 'Lot de 45 Clés Mécatroniques Programmeurs',
                status: 'PENDING_VAL_PARALLEL'
            },
            {
                id: 'it-p6-2',
                parent_request_id: p6Id,
                item_type: 'CYLINDER',
                label: 'Lot de 120 Cylindres Électroniques Haute Sécurité',
                status: 'PENDING_VAL_PARALLEL'
            }
        ]);

        // SEED SCENARIO 7: Processus 7 - Vol / Mise en Liste Noire & Remplacement
        const p7Id = 'p7-demo-incident-blacklist';
        await this.createParentRequest({
            id: p7Id,
            request_number: 'DOS-2026-007',
            request_type: 'INCIDENT',
            title: 'Déclaration Vol de Clé & Demande de Remplacement Immédiat',
            description: 'Clé égarée lors d\'une opération de voie de nuit. Liste noire activée avec alerte Nationale.',
            requester_id: 1042,
            requester_name: 'Daniel Dupont',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'BLACKLIST_RESTRICTED',
            metadata: {
                compromised_key_serial: 'KEY-PORTAL-LOST-119',
                replacement_key_serial: 'KEY-PORTAL-NEW-9082',
                mutual_exclusion_active: true,
                national_alert_broadcasted: true
            }
        }, [
            {
                id: 'it-p7-1',
                parent_request_id: p7Id,
                item_type: 'KEY',
                label: 'Clé Compromise #KEY-PORTAL-LOST-119',
                hardware_serial_number: 'KEY-PORTAL-LOST-119',
                status: 'BLACKLIST_RESTRICTED'
            },
            {
                id: 'it-p7-2',
                parent_request_id: p7Id,
                item_type: 'KEY',
                label: 'Clé de Remplacement #KEY-PORTAL-NEW-9082 (Droits clonés)',
                hardware_serial_number: 'KEY-PORTAL-NEW-9082',
                status: 'ACTIVE_FULFILLED'
            }
        ]);

        // SEED SCENARIO 8: Processus 8 - Modification de la structure organisationnelle (TAG Spécial)
        const p8Id = 'p8-demo-org-change';
        await this.createParentRequest({
            id: p8Id,
            request_number: 'DOS-2026-008',
            request_type: 'ORG_CHANGE',
            title: 'Restructuration Pôle Territorial Maintenance Voie Nord',
            description: 'Dépôt de l\'organigramme cible S29 impactant 28 collaborateurs et réattribution des périmètres de sécurité',
            requester_id: 1,
            requester_name: 'Admin Système',
            manager_id: 201,
            manager_name: 'Marc Martin (Manager N+1)',
            validator_id: 305,
            validator_name: 'Valérie Validateur',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            status: 'PENDING_CROSS_VAL',
            has_special_tag: true,
            metadata: {
                organigramme_ref: 'ORGANIGRAMME-CIBLE-S29-NORD.pdf',
                impacted_profiles_count: 28,
                special_tag_verified: true
            }
        }, [
            {
                id: 'it-p8-1',
                parent_request_id: p8Id,
                item_type: 'ACCESS_RIGHT',
                label: 'Réattribution globale des droits d\'accès secteur Nord',
                status: 'PENDING_VAL_PARALLEL'
            }
        ]);
    }
}

export const workflowRepository = new WorkflowRepository();
