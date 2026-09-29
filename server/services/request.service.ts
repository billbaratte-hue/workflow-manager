import { RequestRepository, requestRepository } from '../repositories/request.repository.js';
import { AuditRepository, auditRepository } from '../repositories/audit.repository.js';
import { RequestItem, ProcessStage } from '../db/store.js';

export interface CreateRequestInput {
    title: string;
    description: string;
    site_id?: number;
    site_name?: string;
    equipment_type?: string;
    intervention_duration?: string;
    stages?: ProcessStage[];
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
}

export class RequestService {
    constructor(
        private reqRepo: RequestRepository = requestRepository,
        private auditRepo: AuditRepository = auditRepository
    ) {}

    private getDefaultStages(siteName?: string): ProcessStage[] {
        return [
            {
                id: 'stage_1',
                order: 1,
                name: 'Validation Manager N+1',
                validator_role: 'Manager',
                status: 'pending'
            },
            {
                id: 'stage_2',
                order: 2,
                name: siteName ? `Validation Sécurité (${siteName})` : 'Validation Responsable Site',
                validator_role: 'Validateur Site',
                status: 'pending'
            }
        ];
    }

    async createRequest(
        input: CreateRequestInput,
        currentUser: { id: number; name: string; role: string; attributes?: Record<string, any> }
    ): Promise<RequestItem> {
        if (!input.title || input.title.trim().length === 0) {
            throw new Error('Le titre de la demande est obligatoire');
        }
        if (!input.description || input.description.trim().length === 0) {
            throw new Error('La description détaillée est obligatoire');
        }

        const stages = (input.stages && input.stages.length > 0)
            ? input.stages
            : this.getDefaultStages(input.site_name);

        const initialStatus = `En attente validation ${stages[0]?.name || 'Manager'}`;

        const created = await this.reqRepo.create({
            title: input.title,
            description: input.description,
            beneficiaire_id: currentUser.id,
            beneficiaire_name: currentUser.name,
            beneficiaire_service: currentUser.attributes?.service || 'Direction Opérations',
            site_id: input.site_id,
            site_name: input.site_name,
            equipment_type: input.equipment_type,
            intervention_duration: input.intervention_duration,
            stages,
            status: initialStatus,
            is_team_request: input.is_team_request,
            team_name: input.team_name,
            team_company: input.team_company,
            team_members: input.team_members,
            is_multi_site: input.is_multi_site,
            scope_type: input.scope_type,
            selected_site_ids: input.selected_site_ids,
            selected_sites: input.selected_sites,
            selected_regions: input.selected_regions,
            document: input.document,
            document_original_name: input.document_original_name,
            document_size: input.document_size,
            document_mimetype: input.document_mimetype
        });

        await this.auditRepo.log({
            actor: currentUser.name,
            role: currentUser.role,
            action: 'CREATION_DEMANDE',
            target: created.reference,
            details: `Demande d'accès créée pour le site ${input.site_name || 'Non spécifié'} (Réf: ${created.reference})`
        });

        return created;
    }

    async approveStage(
        reference: string,
        validatorUser: { id: number; name: string; role: string },
        comment?: string
    ): Promise<RequestItem> {
        const req = await this.reqRepo.getByReference(reference);
        if (!req) {
            throw new Error(`Demande ${reference} introuvable`);
        }

        const stageIndex = req.current_stage_index;
        const currentStage = req.stages[stageIndex];
        if (!currentStage) {
            throw new Error('Étape de validation invalide ou déjà clôturée');
        }

        currentStage.status = 'approved';
        currentStage.validated_at = new Date().toISOString();
        currentStage.validator_id = validatorUser.id;
        currentStage.validator_name = validatorUser.name;
        if (comment) currentStage.comment = comment;

        let newStatus: string;
        let newStageIndex = stageIndex;

        if (stageIndex + 1 < req.stages.length) {
            newStageIndex = stageIndex + 1;
            const nextStage = req.stages[newStageIndex];
            newStatus = `En attente validation ${nextStage.name}`;
        } else {
            newStatus = 'Validée';
        }

        const updated = await this.reqRepo.update(reference, {
            stages: req.stages,
            current_stage_index: newStageIndex,
            status: newStatus
        });

        await this.auditRepo.log({
            actor: validatorUser.name,
            role: validatorUser.role,
            action: newStatus === 'Validée' ? 'APPROBATION_FINALE' : 'APPROBATION_ETAPE',
            target: reference,
            details: `Étape "${currentStage.name}" approuvée par ${validatorUser.name}. Statut actuel: ${newStatus}`
        });

        return updated!;
    }

    async rejectStage(
        reference: string,
        validatorUser: { id: number; name: string; role: string },
        reason: string
    ): Promise<RequestItem> {
        if (!reason || reason.trim().length === 0) {
            throw new Error('Le motif du refus est obligatoire');
        }

        const req = await this.reqRepo.getByReference(reference);
        if (!req) {
            throw new Error(`Demande ${reference} introuvable`);
        }

        const stageIndex = req.current_stage_index;
        const currentStage = req.stages[stageIndex];
        if (currentStage) {
            currentStage.status = 'rejected';
            currentStage.validated_at = new Date().toISOString();
            currentStage.validator_id = validatorUser.id;
            currentStage.validator_name = validatorUser.name;
            currentStage.comment = reason;
        }

        const updated = await this.reqRepo.update(reference, {
            stages: req.stages,
            status: 'Refusée'
        });

        await this.auditRepo.log({
            actor: validatorUser.name,
            role: validatorUser.role,
            action: 'REFUS_DEMANDE',
            target: reference,
            details: `Demande refusée par ${validatorUser.name} à l'étape "${currentStage?.name || 'Inconnue'}". Motif: ${reason}`
        });

        return updated!;
    }

    async requestComplement(
        reference: string,
        validatorUser: { id: number; name: string; role: string },
        message: string
    ): Promise<RequestItem> {
        if (!message || message.trim().length === 0) {
            throw new Error('Le message de demande de complément est obligatoire');
        }

        const req = await this.reqRepo.getByReference(reference);
        if (!req) {
            throw new Error(`Demande ${reference} introuvable`);
        }

        const currentStage = req.stages[req.current_stage_index];
        if (currentStage) {
            currentStage.status = 'complement_requested';
            currentStage.comment = message;
        }

        const updated = await this.reqRepo.update(reference, {
            stages: req.stages,
            status: 'Complément requis',
            complement_request: {
                requested_by: validatorUser.name,
                requested_at: new Date().toISOString(),
                message
            }
        });

        await this.auditRepo.log({
            actor: validatorUser.name,
            role: validatorUser.role,
            action: 'COMPLEMENT_DEMANDE',
            target: reference,
            details: `Demande d'informations complémentaires émise par ${validatorUser.name}: "${message}"`
        });

        return updated!;
    }

    async respondToComplement(
        reference: string,
        applicantUser: { id: number; name: string; role: string },
        responseText: string
    ): Promise<RequestItem> {
        if (!responseText || responseText.trim().length === 0) {
            throw new Error('La réponse au complément est obligatoire');
        }

        const req = await this.reqRepo.getByReference(reference);
        if (!req) {
            throw new Error(`Demande ${reference} introuvable`);
        }

        const currentStage = req.stages[req.current_stage_index];
        if (currentStage) {
            currentStage.status = 'pending';
        }

        const complementInfo = req.complement_request || {
            requested_by: 'Validateur',
            requested_at: new Date().toISOString(),
            message: 'Information manquante'
        };

        complementInfo.response = responseText;
        complementInfo.responded_at = new Date().toISOString();

        const newStatus = currentStage ? `En attente validation ${currentStage.name}` : 'En attente validation';

        const updated = await this.reqRepo.update(reference, {
            stages: req.stages,
            status: newStatus,
            complement_request: complementInfo
        });

        await this.auditRepo.log({
            actor: applicantUser.name,
            role: applicantUser.role,
            action: 'COMPLEMENT_FOURNI',
            target: reference,
            details: `Complément d'information soumis par le demandeur: "${responseText}"`
        });

        return updated!;
    }

    async getRequestsForUser(user: {
        id: number;
        role: string;
        roles?: string[];
        privileges: string[];
    }): Promise<RequestItem[]> {
        const hasViewAll = user.privileges.includes('view_all') || user.role === 'Administrateur';
        if (hasViewAll) {
            return this.reqRepo.getAll();
        }

        const isValidator = user.privileges.includes('validate_requests') ||
            user.role === 'Manager' ||
            user.role === 'Validateur Site' ||
            (user.roles && (user.roles.includes('Manager') || user.roles.includes('Validateur Site')));

        if (isValidator) {
            // Validators see all requests in the system or their scope
            return this.reqRepo.getAll();
        }

        // Standard user sees their own requests
        return this.reqRepo.getByBeneficiaire(user.id);
    }
}

export const requestService = new RequestService();
