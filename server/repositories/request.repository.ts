import { ISqliteDb, getDatabase } from '../db/database.js';
import { RequestItem, ProcessStage } from '../db/store.js';

export class RequestRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRowToRequest(row: any): RequestItem | null {
        if (!row) return null;
        return {
            id: Number(row.id),
            reference: row.reference,
            title: row.title,
            description: row.description,
            status: row.status,
            current_stage_index: Number(row.current_stage_index) || 0,
            stages: typeof row.stages === 'string' ? JSON.parse(row.stages) : (row.stages || []),
            demandeur_id: row.demandeur_id ? Number(row.demandeur_id) : Number(row.beneficiaire_id),
            demandeur_name: row.demandeur_name || row.beneficiaire_name || '',
            demandeur_email: row.demandeur_email || '',
            beneficiaire_id: Number(row.beneficiaire_id),
            beneficiaire_name: row.beneficiaire_name || '',
            beneficiaire_service: row.beneficiaire_service || '',
            site_id: row.site_id ? Number(row.site_id) : undefined,
            site_name: row.site_name || '',
            equipment_type: row.equipment_type || '',
            intervention_duration: row.intervention_duration || '',
            is_team_request: Boolean(row.is_team_request),
            team_name: row.team_name || undefined,
            team_company: row.team_company || undefined,
            team_members: typeof row.team_members === 'string' ? JSON.parse(row.team_members) : (row.team_members || []),
            is_multi_site: Boolean(row.is_multi_site),
            scope_type: row.scope_type || 'single_site',
            selected_site_ids: typeof row.selected_site_ids === 'string' ? JSON.parse(row.selected_site_ids) : (row.selected_site_ids || []),
            selected_sites: typeof row.selected_sites === 'string' ? JSON.parse(row.selected_sites) : (row.selected_sites || []),
            selected_regions: typeof row.selected_regions === 'string' ? JSON.parse(row.selected_regions) : (row.selected_regions || []),
            created_at: row.created_at,
            process_id: row.process_id ? Number(row.process_id) : undefined,
            process_name: row.process_name || undefined,
            process_code: row.process_code || undefined,
            form_id: row.form_id || undefined,
            form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : (row.form_data || undefined),
            document: row.document || null,
            document_original_name: row.document_original_name || null,
            document_size: row.document_size ? Number(row.document_size) : null,
            document_mimetype: row.document_mimetype || null,
            complement_request: typeof row.complement_request === 'string' ? JSON.parse(row.complement_request) : (row.complement_request || null),
            ai_analysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : (row.ai_analysis || null)
        };
    }

    async generateNextReference(): Promise<string> {
        const db = await this.getDb();
        const year = new Date().getFullYear();
        const prefix = `DEM-${year}-`;

        const rows = await db.all<{ reference: string }>(
            'SELECT reference FROM requests WHERE reference LIKE ? ORDER BY id DESC',
            `${prefix}%`
        );

        let maxNum = 0;
        for (const r of rows) {
            const numPart = r.reference.replace(prefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }

        const nextNum = maxNum + 1;
        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    async getAll(tenantId?: string): Promise<RequestItem[]> {
        const db = await this.getDb();
        const query = tenantId && tenantId !== 'all'
            ? 'SELECT * FROM requests WHERE tenant_id = ? OR tenant_id IS NULL ORDER BY id DESC'
            : 'SELECT * FROM requests ORDER BY id DESC';
        const params = tenantId && tenantId !== 'all' ? [tenantId] : [];
        const rows = await db.all(query, ...params);
        return rows.map(r => this.mapRowToRequest(r)!);
    }

    async getById(id: number): Promise<RequestItem | null> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM requests WHERE id = ?', id);
        return this.mapRowToRequest(row);
    }

    async getByReference(reference: string): Promise<RequestItem | null> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM requests WHERE UPPER(reference) = UPPER(?)', reference.trim());
        return this.mapRowToRequest(row);
    }

    async getByBeneficiaire(beneficiaireId: number): Promise<RequestItem[]> {
        const db = await this.getDb();
        const rows = await db.all(
            'SELECT * FROM requests WHERE beneficiaire_id = ? ORDER BY id DESC',
            beneficiaireId
        );
        return rows.map(r => this.mapRowToRequest(r)!);
    }

    async create(data: {
        title: string;
        description: string;
        demandeur_id?: number;
        demandeur_name?: string;
        demandeur_email?: string;
        beneficiaire_id: number;
        beneficiaire_name?: string;
        beneficiaire_service?: string;
        site_id?: number;
        site_name?: string;
        equipment_type?: string;
        intervention_duration?: string;
        stages: ProcessStage[];
        status?: string;
        is_team_request?: boolean;
        team_name?: string;
        team_company?: string;
        team_members?: any[];
        is_multi_site?: boolean;
        scope_type?: 'single_site' | 'multi_sites' | 'multi_regions';
        selected_site_ids?: number[];
        selected_sites?: any[];
        selected_regions?: string[];
        document?: string | null;
        document_original_name?: string | null;
        document_size?: number | null;
        document_mimetype?: string | null;
        reference?: string;
        process_id?: number | null;
        process_name?: string | null;
        process_code?: string | null;
        form_id?: string | null;
        form_data?: any;
        tenant_id?: string;
    }): Promise<RequestItem> {
        const db = await this.getDb();
        const reference = data.reference || (await this.generateNextReference());
        const status = data.status || (data.stages.length > 0 ? `En attente validation ${data.stages[0].name}` : 'En attente validation');
        const createdAt = new Date().toISOString();
        const tenantId = data.tenant_id || 'default';

        const result = await db.run(
            `INSERT INTO requests (
                reference, title, description, status, current_stage_index,
                stages, beneficiaire_id, beneficiaire_name, beneficiaire_service,
                site_id, site_name, equipment_type, intervention_duration,
                is_team_request, team_name, team_company, team_members,
                is_multi_site, scope_type, selected_site_ids, selected_sites,
                selected_regions, created_at, process_id, process_name, process_code, form_id, form_data,
                document, document_original_name, document_size, document_mimetype, tenant_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            reference,
            data.title.trim(),
            data.description.trim(),
            status,
            0,
            JSON.stringify(data.stages || []),
            data.beneficiaire_id,
            data.beneficiaire_name || '',
            data.beneficiaire_service || '',
            data.site_id || null,
            data.site_name || '',
            data.equipment_type || '',
            data.intervention_duration || '',
            data.is_team_request ? 1 : 0,
            data.team_name || '',
            data.team_company || '',
            JSON.stringify(data.team_members || []),
            data.is_multi_site ? 1 : 0,
            data.scope_type || 'single_site',
            JSON.stringify(data.selected_site_ids || []),
            JSON.stringify(data.selected_sites || []),
            JSON.stringify(data.selected_regions || []),
            createdAt,
            data.process_id || null,
            data.process_name || null,
            data.process_code || null,
            data.form_id || null,
            data.form_data ? JSON.stringify(data.form_data) : null,
            data.document || null,
            data.document_original_name || null,
            data.document_size || null,
            data.document_mimetype || null,
            tenantId
        );

        return {
            id: result.lastID || 1,
            reference,
            title: data.title.trim(),
            description: data.description.trim(),
            status,
            current_stage_index: 0,
            stages: data.stages || [],
            demandeur_id: data.demandeur_id || data.beneficiaire_id,
            demandeur_name: data.demandeur_name || data.beneficiaire_name || '',
            demandeur_email: data.demandeur_email || '',
            beneficiaire_id: data.beneficiaire_id,
            beneficiaire_name: data.beneficiaire_name || '',
            beneficiaire_service: data.beneficiaire_service || '',
            site_id: data.site_id,
            site_name: data.site_name,
            equipment_type: data.equipment_type,
            intervention_duration: data.intervention_duration,
            is_team_request: Boolean(data.is_team_request),
            team_name: data.team_name,
            team_company: data.team_company,
            team_members: data.team_members,
            is_multi_site: Boolean(data.is_multi_site),
            scope_type: data.scope_type || 'single_site',
            selected_site_ids: data.selected_site_ids,
            selected_sites: data.selected_sites,
            selected_regions: data.selected_regions,
            created_at: createdAt,
            document: data.document || null,
            document_original_name: data.document_original_name || null,
            document_size: data.document_size || null,
            document_mimetype: data.document_mimetype || null
        };
    }

    async update(reference: string, updates: Partial<RequestItem>): Promise<RequestItem | null> {
        const current = await this.getByReference(reference);
        if (!current) return null;

        const db = await this.getDb();
        const merged: RequestItem = {
            ...current,
            ...updates
        };

        await db.run(
            `UPDATE requests
             SET title = ?, description = ?, status = ?, current_stage_index = ?,
                 stages = ?, site_id = ?, site_name = ?, equipment_type = ?,
                 intervention_duration = ?, complement_request = ?, ai_analysis = ?,
                 process_id = ?, process_name = ?, process_code = ?, form_id = ?, form_data = ?
             WHERE UPPER(reference) = UPPER(?)`,
            merged.title,
            merged.description,
            merged.status,
            merged.current_stage_index,
            JSON.stringify(merged.stages),
            merged.site_id || null,
            merged.site_name || '',
            merged.equipment_type || '',
            merged.intervention_duration || '',
            merged.complement_request ? JSON.stringify(merged.complement_request) : null,
            merged.ai_analysis ? JSON.stringify(merged.ai_analysis) : null,
            merged.process_id || null,
            merged.process_name || null,
            merged.process_code || null,
            merged.form_id || null,
            merged.form_data ? JSON.stringify(merged.form_data) : null,
            reference.trim()
        );

        return merged;
    }

    async delete(reference: string): Promise<boolean> {
        const db = await this.getDb();
        const result = await db.run('DELETE FROM requests WHERE UPPER(reference) = UPPER(?)', reference.trim());
        return (result.changes || 0) > 0;
    }
}

export const requestRepository = new RequestRepository();
