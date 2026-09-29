import { workflowRepository } from '../repositories/workflow.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import {
    ParentRequest,
    RequestItem,
    ParentRequestStatus,
    RequestItemStatus,
    RequestType,
    HardwareOrigin
} from '../types/workflow.types.js';

export interface TransitionPayload {
    action: string;
    actor_id: number;
    actor_name: string;
    actor_role: string;
    comment?: string;
    external_order_ref?: string;
    gps_coordinates?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        installer_name?: string;
    };
    has_need_key?: boolean; // for PENDING_KEY_DECISION
    serial_number?: string;
}

export class WorkflowEngineService {
    constructor(
        private workflowRepo: typeof workflowRepository = workflowRepository,
        private settingsRepo: typeof settingsRepository = settingsRepository
    ) {}
    /**
     * Submit a draft dossier
     * S10: Compteur de commande evaluation
     */
    async submitDossier(parentId: string, actor: { id: number; name: string; role: string }): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');
        if (dossier.status !== 'DRAFT') throw new Error(`Impossible de soumettre un dossier en statut ${dossier.status}`);

        // Check quota (S10) dynamically configured in system_settings or overridden in workflow_rules
        const rules = dossier.workflow_rules || {};

        const routingRules = await this.settingsRepo.getSettingValue<{
            hardware_request_types?: string[];
            gps_required_types?: string[];
            user_account_types?: string[];
            auto_fulfill_types?: string[];
            incident_types?: string[];
        }>('workflow_routing_rules', {
            hardware_request_types: ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY'],
            gps_required_types: ['CYLINDER_ORDER', 'TERMINAL_ORDER'],
            user_account_types: ['USER_ACCOUNT'],
            auto_fulfill_types: ['HABILITATION', 'ORGANIZATION_CHANGE'],
            incident_types: ['INCIDENT']
        });

        const hardwareTypes = routingRules?.hardware_request_types || ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY'];
        const isHardwareOrder = rules.check_quota !== undefined ? Boolean(rules.check_quota) : hardwareTypes.includes(dossier.request_type);
        let quotaExceeded = false;

        if (isHardwareOrder) {
            const quota = await this.workflowRepo.getUserOrderQuota(dossier.requester_id);
            const limit = (rules.custom_quota_limit !== undefined && rules.custom_quota_limit > 0)
                ? rules.custom_quota_limit
                : quota.quota_limit;
            if (quota.order_count >= limit) {
                quotaExceeded = true;
            }
            // Increment quota count
            await this.workflowRepo.incrementUserOrderQuota(dossier.requester_id, dossier.requester_name);
        }

        let nextStatus: ParentRequestStatus = 'PENDING_VAL_PARALLEL';
        if (quotaExceeded) {
            nextStatus = 'ESCALATED_NATIONAL';
        } else if (rules.validation_mode === 'AUTO_FULFILL') {
            nextStatus = rules.requires_gdpr ? 'PENDING_GDPR' : 'ACTIVE_FULFILLED';
        } else if (rules.validation_mode === 'CROSS_VALIDATION') {
            nextStatus = 'PENDING_CROSS_VAL';
        } else {
            nextStatus = 'PENDING_VAL_PARALLEL';
        }

        // Update items to PENDING_VAL_PARALLEL
        if (dossier.items) {
            for (const item of dossier.items) {
                if (item.status === 'DRAFT') {
                    await this.workflowRepo.updateRequestItem(item.id, { status: 'PENDING_VAL_PARALLEL' });
                }
            }
        }

        const updated = await this.workflowRepo.updateParentRequest(dossier.id, {
            status: nextStatus,
            quota_exceeded: quotaExceeded
        });

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            dossier.id,
            quotaExceeded ? 'SUBMITTED_ESCALATED_S10' : 'SUBMITTED_QUOTA_OK',
            actor.id,
            actor.name,
            { previous_status: 'DRAFT', new_status: nextStatus, quota_exceeded: quotaExceeded }
        );

        return (await this.workflowRepo.getParentRequestById(parentId))!;
    }

    /**
     * Validation asynchrone unitaire d'un RequestItem par son validateur de site
     */
    async evaluateItem(
        itemId: string,
        decision: 'APPROVE' | 'REJECT',
        actor: { id: number; name: string; role: string },
        rejectionReason?: string
    ): Promise<{ item: RequestItem; parent: ParentRequest }> {
        const dbItem = await this.workflowRepo.updateRequestItem(itemId, {
            status: decision === 'APPROVE' ? 'ITEM_APPROVED' : 'ITEM_REJECTED',
            approved_at: decision === 'APPROVE' ? new Date().toISOString() : null,
            rejection_reason: decision === 'REJECT' ? rejectionReason || 'Refusé par le validateur' : null
        });

        if (!dbItem) throw new Error('Élément de demande introuvable');

        const parent = await this.workflowRepo.getParentRequestById(dbItem.parent_request_id);
        if (!parent) throw new Error('Dossier parent introuvable');

        // NIS 2 Principle: 4-eyes check (Self-approval strictly forbidden)
        if (decision === 'APPROVE' && (actor.id === parent.requester_id || (parent as any).beneficiaire_id === actor.id)) {
            await this.workflowRepo.updateRequestItem(itemId, { status: 'PENDING_VAL_PARALLEL', approved_at: null });
            throw new Error("Conformité NIS 2 (Contrôle 4-yeux) : Le demandeur ou bénéficiaire ne peut pas valider son propre élément de demande.");
        }

        await this.workflowRepo.addAuditLog(
            'REQUEST_ITEM',
            itemId,
            decision === 'APPROVE' ? 'ITEM_APPROVED_ASYNC' : 'ITEM_REJECTED_LOCAL',
            actor.id,
            actor.name,
            { label: dbItem.label, target_site: dbItem.target_site_name, rejection_reason: rejectionReason }
        );

        // Check overall items status on the Parent Request
        const allItems = parent.items || [];
        const approvedCount = allItems.filter(i => i.status === 'ITEM_APPROVED' || (i.id === itemId && decision === 'APPROVE')).length;
        const rejectedCount = allItems.filter(i => i.status === 'ITEM_REJECTED' || (i.id === itemId && decision === 'REJECT')).length;

        // Business Rule: Dès qu'au moins un élément est validé unitairement, le parent peut avancer vers PENDING_CROSS_VAL
        if (parent.status === 'PENDING_VAL_PARALLEL') {
            if (approvedCount > 0) {
                await this.workflowRepo.updateParentRequest(parent.id, {
                    status: 'PENDING_CROSS_VAL'
                });
                await this.workflowRepo.addAuditLog(
                    'PARENT_REQUEST',
                    parent.id,
                    'TRIGGER_CROSS_VAL',
                    actor.id,
                    actor.name,
                    { approved_items: approvedCount, total_items: allItems.length }
                );
            } else if (rejectedCount === allItems.length) {
                // All items rejected -> Stop Archive
                await this.workflowRepo.updateParentRequest(parent.id, {
                    status: 'ARCHIVED_REJECTED'
                });
            }
        }

        const refreshedParent = await this.workflowRepo.getParentRequestById(parent.id);
        return { item: (await this.workflowRepo.updateRequestItem(itemId, {}))!, parent: refreshedParent! };
    }

    /**
     * Double validation croisée (Manager + Validateur)
     */
    async crossValidate(
        parentId: string,
        actor: { id: number; name: string; role: string },
        decision: 'APPROVE' | 'REJECT',
        comment?: string
    ): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        // NIS 2 Principle: 4-eyes check (Self-approval strictly forbidden)
        if (decision === 'APPROVE' && (actor.id === dossier.requester_id || (dossier as any).beneficiaire_id === actor.id)) {
            throw new Error("Conformité NIS 2 (Contrôle 4-yeux) : Le demandeur ou bénéficiaire ne peut pas cross-valider son propre dossier.");
        }

        if (decision === 'REJECT') {
            const updated = await this.workflowRepo.updateParentRequest(parentId, {
                status: 'ARCHIVED_REJECTED'
            });
            await this.workflowRepo.addAuditLog(
                'PARENT_REQUEST',
                parentId,
                'CROSS_VALIDATION_REJECTED',
                actor.id,
                actor.name,
                { comment }
            );
            return updated!;
        }

        // Dynamic role privileges and routing rules from system_settings or dossier workflow_rules
        const rules = dossier.workflow_rules || {};

        const rolePrivileges = await this.settingsRepo.getSettingValue<{
            manager_approval_roles?: string[];
            validator_approval_roles?: string[];
            national_arbitration_roles?: string[];
        }>('workflow_role_privileges', {
            manager_approval_roles: ['Manager', 'Responsable d\'équipe', 'Chef de Projet', 'Administrateur'],
            validator_approval_roles: ['Validateur', 'Validateur de Site', 'Responsable Sécurité', 'Administrateur'],
            national_arbitration_roles: ['Référent National', 'Administrateur National', 'Administrateur']
        });

        const routingRules = await this.settingsRepo.getSettingValue<{
            hardware_request_types?: string[];
            user_account_types?: string[];
            auto_fulfill_types?: string[];
        }>('workflow_routing_rules', {
            hardware_request_types: ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY'],
            user_account_types: ['USER_ACCOUNT'],
            auto_fulfill_types: ['HABILITATION', 'ORGANIZATION_CHANGE']
        });

        const allowedManagerRoles = (rules.allowed_manager_roles && rules.allowed_manager_roles.length > 0)
            ? rules.allowed_manager_roles
            : (rolePrivileges?.manager_approval_roles || ['Manager', 'Administrateur']);
        const allowedValidatorRoles = (rules.allowed_validator_roles && rules.allowed_validator_roles.length > 0)
            ? rules.allowed_validator_roles
            : (rolePrivileges?.validator_approval_roles || ['Validateur', 'Administrateur']);

        let isManager = allowedManagerRoles.some(r => actor.role.toLowerCase().includes(r.toLowerCase())) ||
            actor.id === dossier.manager_id;
        let isValidator = allowedValidatorRoles.some(r => actor.role.toLowerCase().includes(r.toLowerCase())) ||
            actor.id === dossier.validator_id;

        const managerApproved = dossier.manager_approved || isManager;
        const validatorApproved = dossier.validator_approved || isValidator;

        let nextStatus: ParentRequestStatus = dossier.status;

        // When both approve:
        if (managerApproved && validatorApproved) {
            if (rules.requires_gdpr === true) {
                nextStatus = 'PENDING_GDPR';
            } else if (rules.requires_quote_po === true) {
                nextStatus = 'PENDING_QUOTE_PO';
            } else {
                const userAccountTypes = routingRules?.user_account_types || ['USER_ACCOUNT'];
                const hardwareTypes = routingRules?.hardware_request_types || ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY'];

                if (userAccountTypes.includes(dossier.request_type)) {
                    nextStatus = 'PENDING_GDPR';
                } else if (hardwareTypes.includes(dossier.request_type)) {
                    nextStatus = 'PENDING_QUOTE_PO';
                } else {
                    // Standard Habilitation or other auto-fulfill types
                    nextStatus = 'ACTIVE_FULFILLED';
                }
            }
        }

        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            manager_approved: managerApproved,
            validator_approved: validatorApproved,
            status: nextStatus
        });

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            'CROSS_VALIDATION_STEP',
            actor.id,
            actor.name,
            { manager_approved: managerApproved, validator_approved: validatorApproved, next_status: nextStatus, comment }
        );

        return updated!;
    }

    /**
     * Validation Nationale (pour dossiers S10 escaladés)
     */
    async nationalEscalationDecision(
        parentId: string,
        actor: { id: number; name: string; role: string },
        decision: 'APPROVE' | 'REJECT',
        comment?: string
    ): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');
        if (dossier.status !== 'ESCALATED_NATIONAL') throw new Error('Le dossier n\'est pas en attente d\'arbitrage national');

        const rules = dossier.workflow_rules || {};
        const rolePrivileges = await this.settingsRepo.getSettingValue<{
            national_arbitration_roles?: string[];
        }>('workflow_role_privileges', {
            national_arbitration_roles: ['Référent National', 'Administrateur National', 'Administrateur']
        });
        const allowedRoles = (rules.allowed_national_roles && rules.allowed_national_roles.length > 0)
            ? rules.allowed_national_roles
            : (rolePrivileges?.national_arbitration_roles || ['Référent National', 'Administrateur National', 'Administrateur']);
        const isAuthorized = allowedRoles.some(r => actor.role.toLowerCase().includes(r.toLowerCase())) ||
            actor.role.toLowerCase().includes('admin');
        if (!isAuthorized) {
            throw new Error(`Privilèges insuffisants : Seul un profil parmi (${allowedRoles.join(', ')}) peut procéder à l'Arbitrage National S10`);
        }

        const nextStatus: ParentRequestStatus = decision === 'APPROVE' ? 'PENDING_VAL_PARALLEL' : 'ARCHIVED_REJECTED';

        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            status: nextStatus
        });

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            decision === 'APPROVE' ? 'NATIONAL_ARBITRATION_APPROVED' : 'NATIONAL_ARBITRATION_REJECTED',
            actor.id,
            actor.name,
            { comment }
        );

        return updated!;
    }

    /**
     * Processus 2: Signature de la Charte RGPD
     */
    async acceptGDPR(
        parentId: string,
        actor: { id: number; name: string; role: string }
    ): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            gdpr_accepted: true,
            status: 'PENDING_KEY_DECISION'
        });

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            'GDPR_CHARTER_ACCEPTED',
            actor.id,
            actor.name,
            { message: 'Charte de transmission des données personnelles acceptée' }
        );

        return updated!;
    }

    /**
     * Processus 2: Enchaînement Clé conditionnel ("Avez-vous besoin d'une clé ?")
     */
    async decideKeyChaining(
        parentId: string,
        needsKey: boolean,
        actor: { id: number; name: string; role: string }
    ): Promise<{ currentDossier: ParentRequest; chainedKeyDossier?: ParentRequest }> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        // Mark account creation completed
        const updatedCurrent = await this.workflowRepo.updateParentRequest(parentId, {
            status: 'ARCHIVED_COMPLETED'
        });

        let chainedKeyDossier: ParentRequest | undefined;

        if (needsKey) {
            // Clone context to a new Key Order
            chainedKeyDossier = await this.workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: `Demande de clé liée - Compte ${dossier.requester_name}`,
                description: `Commande automatique de clé chaînée suite à l'activation du compte ${dossier.request_number}`,
                requester_id: dossier.requester_id,
                requester_name: dossier.requester_name,
                requester_email: dossier.requester_email,
                manager_id: dossier.manager_id,
                manager_name: dossier.manager_name,
                validator_id: dossier.validator_id,
                validator_name: dossier.validator_name,
                site_id: dossier.site_id,
                site_name: dossier.site_name,
                status: 'PENDING_QUOTE_PO',
                quote_amount: 85.00,
                quote_currency: 'EUR',
                metadata: {
                    source_account_dossier: dossier.request_number,
                    chained_request: true
                }
            }, [
                {
                    item_type: 'KEY',
                    label: `Clé mécatronique personnelle ${dossier.requester_name}`,
                    target_site_id: dossier.site_id,
                    target_site_name: dossier.site_name,
                    status: 'PENDING_VAL_PARALLEL',
                    hardware_origin: 'SUPPLIER_STOCK'
                }
            ]);

            await this.workflowRepo.addAuditLog(
                'PARENT_REQUEST',
                parentId,
                'KEY_CHAINED_CREATED',
                actor.id,
                actor.name,
                { chained_key_number: chainedKeyDossier.request_number }
            );
        } else {
            await this.workflowRepo.addAuditLog(
                'PARENT_REQUEST',
                parentId,
                'KEY_DECISION_DECLINED',
                actor.id,
                actor.name,
                { message: 'Pas de clé demandée, compte clôturé' }
            );
        }

        return { currentDossier: updatedCurrent!, chainedKeyDossier };
    }

    /**
     * S9: Liaison bon de commande / devis différentiel
     */
    async linkPurchaseOrder(
        parentId: string,
        externalOrderRef: string,
        actor: { id: number; name: string; role: string }
    ): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        // Transitions: ORDER_LINKED -> DISPATCHED_IN_TRANSIT
        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            external_order_ref: externalOrderRef,
            status: 'DISPATCHED_IN_TRANSIT'
        });

        // Update items to DISPATCHED_IN_TRANSIT
        if (dossier.items) {
            for (const item of dossier.items) {
                await this.workflowRepo.updateRequestItem(item.id, {
                    status: 'DISPATCHED_IN_TRANSIT'
                });
            }
        }

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            'PO_LINKED_DISPATCHED',
            actor.id,
            actor.name,
            { external_order_ref: externalOrderRef, new_status: 'DISPATCHED_IN_TRANSIT' }
        );

        return (await this.workflowRepo.getParentRequestById(parentId))!;
    }

    /**
     * Signature du PV de réception (Accusé de réception)
     */
    async signReceptionPV(
        parentId: string,
        actor: { id: number; name: string; role: string }
    ): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        // Dynamically check if request type requires GPS Commissioning from workflow_rules or workflow_routing_rules
        const rules = dossier.workflow_rules || {};
        let requiresGPS = false;
        if (rules.requires_gps !== undefined) {
            requiresGPS = Boolean(rules.requires_gps);
        } else {
            const routingRules = await this.settingsRepo.getSettingValue<{
                gps_required_types?: string[];
            }>('workflow_routing_rules', {
                gps_required_types: ['CYLINDER_ORDER', 'TERMINAL_ORDER']
            });

            const gpsTypes = routingRules?.gps_required_types || ['CYLINDER_ORDER', 'TERMINAL_ORDER'];
            requiresGPS = gpsTypes.includes(dossier.request_type);
        }
        const nextStatus: ParentRequestStatus = requiresGPS ? 'COMMISSIONING_GPS' : 'ACTIVE_FULFILLED';

        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            reception_pv_signed: true,
            status: nextStatus
        });

        if (dossier.items) {
            for (const item of dossier.items) {
                await this.workflowRepo.updateRequestItem(item.id, {
                    status: nextStatus === 'COMMISSIONING_GPS' ? 'COMMISSIONING_GPS' : 'ACTIVE_FULFILLED'
                });
            }
        }

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            'RECEPTION_PV_SIGNED',
            actor.id,
            actor.name,
            { requires_gps: requiresGPS, new_status: nextStatus }
        );

        return (await this.workflowRepo.getParentRequestById(parentId))!;
    }

    /**
     * S14: Émission d'une relance automatique et escalade incident si relances épuisées
     */
    async triggerReminder(
        parentId: string,
        actor: { id: number; name: string; role: string }
    ): Promise<{ reminder: any; dossier: ParentRequest }> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        const rules = dossier.workflow_rules || {};
        const relanceConfig = await this.settingsRepo.getSettingValue<{
            delai_semaines: number;
            max_bounces: number;
            auto_incident_on_timeout: boolean;
        }>('relance_s14_config', {
            delai_semaines: 2,
            max_bounces: 3,
            auto_incident_on_timeout: true
        });

        const reminder = await this.workflowRepo.incrementWorkflowReminder(parentId, 'PARENT_REQUEST');

        let updatedDossier = dossier;
        const maxBounces = rules.max_reminder_bounces ?? relanceConfig.max_bounces ?? reminder.max_reminders;
        const autoIncidentEnabled = rules.auto_incident_on_timeout ?? relanceConfig.auto_incident_on_timeout ?? true;
        const shouldAutoEscalate = autoIncidentEnabled !== false &&
            reminder.reminder_count >= maxBounces;

        if (shouldAutoEscalate && dossier.status === 'DISPATCHED_IN_TRANSIT' && !dossier.reception_pv_signed) {
            // S14: Escalade automatique en incident Perte/Vol auto
            updatedDossier = (await this.workflowRepo.updateParentRequest(parentId, {
                status: 'AUTO_ESCALATED_INCIDENT'
            }))!;

            await this.workflowRepo.addAuditLog(
                'PARENT_REQUEST',
                parentId,
                'AUTO_ESCALATED_INCIDENT_S14',
                actor.id,
                actor.name,
                {
                    reminder_count: reminder.reminder_count,
                    max_bounces: relanceConfig.max_bounces,
                    reason: `Défaut de signature PV de réception après ${reminder.reminder_count} relances (Règle S14 paramétrable)`
                }
            );
        } else {
            await this.workflowRepo.addAuditLog(
                'PARENT_REQUEST',
                parentId,
                'REMINDER_SENT_S14',
                actor.id,
                actor.name,
                { reminder_count: reminder.reminder_count, max_reminders: reminder.max_reminders }
            );
        }

        return { reminder, dossier: updatedDossier };
    }

    /**
     * Commissioning GPS: Pose et relevé GPS sur application smartphone
     */
    async validateGPSCommissioning(
        parentId: string,
        gpsCoordinates: { latitude: number; longitude: number; accuracy?: number; installer_name?: string },
        actor: { id: number; name: string; role: string }
    ): Promise<ParentRequest> {
        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        // Dynamic validation with gps_commissioning_rules from system_settings or embedded workflow_rules
        const rules = dossier.workflow_rules || {};
        const gpsRules = await this.settingsRepo.getSettingValue<{
            max_distance_meters?: number;
            max_accuracy_meters?: number;
            require_installer_signature?: boolean;
        }>('gps_commissioning_rules', {
            max_distance_meters: 250,
            max_accuracy_meters: 50,
            require_installer_signature: true
        });

        const maxAccuracy = rules.gps_max_accuracy_meters ?? gpsRules?.max_accuracy_meters ?? 50;

        if (gpsCoordinates.accuracy && gpsCoordinates.accuracy > maxAccuracy) {
            throw new Error(`Précision GPS insuffisante (${gpsCoordinates.accuracy}m > tolérance max autorisée ${maxAccuracy}m)`);
        }

        const now = new Date().toISOString();
        const fullGps = {
            ...gpsCoordinates,
            recorded_at: now,
            installer_name: gpsCoordinates.installer_name || actor.name
        };

        if (dossier.items) {
            for (const item of dossier.items) {
                await this.workflowRepo.updateRequestItem(item.id, {
                    status: 'ACTIVE_FULFILLED',
                    gps_coordinates: fullGps
                });
            }
        }

        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            status: 'ACTIVE_FULFILLED'
        });

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            'COMMISSIONING_GPS_VALIDATED',
            actor.id,
            actor.name,
            { gps: fullGps, applied_rules: gpsRules }
        );

        return (await this.workflowRepo.getParentRequestById(parentId))!;
    }

    /**
     * Casse, Perte, Vol & Mise en Liste Noire (Réservé Admin / profils habilités)
     */
    async reportIncidentAndBlacklist(
        parentId: string,
        compromisedSerial: string,
        reason: string,
        actor: { id: number; name: string; role: string }
    ): Promise<{ compromisedDossier: ParentRequest; replacementDossier: ParentRequest }> {
        // Dynamic role check from system_settings
        const rolePrivileges = await this.settingsRepo.getSettingValue<{
            national_arbitration_roles?: string[];
            security_alert_recipients?: string[];
        }>('workflow_role_privileges', {
            national_arbitration_roles: ['Référent National', 'Administrateur National', 'Administrateur'],
            security_alert_recipients: ['Référent National / Administrateur', 'Pôle Sécurité Mécatronique']
        });

        const allowedAdminRoles = rolePrivileges?.national_arbitration_roles || ['Administrateur', 'Référent National'];
        const isAuthorized = allowedAdminRoles.some(r => actor.role.toLowerCase().includes(r.toLowerCase())) ||
            actor.role.toLowerCase().includes('admin');

        if (!isAuthorized) {
            throw new Error('Habilitation Sécurité (Habilitation E123) : La révocation d\'accès est réservée exclusivement aux profils autorisés (Administrateur / Référent National)');
        }

        const dossier = await this.workflowRepo.getParentRequestById(parentId);
        if (!dossier) throw new Error('Dossier introuvable');

        // Dynamic replacement rules & tariffs from system_settings
        const blacklistRules = await this.settingsRepo.getSettingValue<{
            replacement_default_origin?: 'USER_STOCK' | 'SUPPLIER_STOCK' | 'NEW_ORDER';
            replacement_quote_fixed_amount?: number;
            use_s9_tariff_lookup?: boolean;
            auto_exclusion_rule?: boolean;
        }>('incident_blacklist_rules', {
            replacement_default_origin: 'SUPPLIER_STOCK',
            replacement_quote_fixed_amount: 85.00,
            use_s9_tariff_lookup: true,
            auto_exclusion_rule: true
        });

        const tariffConfig = await this.settingsRepo.getSettingValue<{
            supplier_stock_unit_price?: number;
        }>('tarification_devis_differentiel_s9', {
            supplier_stock_unit_price: 85.00
        });

        const rules = dossier.workflow_rules || {};
        const calculatedQuote = rules.custom_quote_amount !== undefined
            ? rules.custom_quote_amount
            : (blacklistRules?.use_s9_tariff_lookup && tariffConfig?.supplier_stock_unit_price !== undefined
                ? tariffConfig.supplier_stock_unit_price
                : (blacklistRules?.replacement_quote_fixed_amount ?? 85.00));

        // Update compromised dossier to BLACKLIST_RESTRICTED
        const updatedCompromised = await this.workflowRepo.updateParentRequest(parentId, {
            status: 'BLACKLIST_RESTRICTED',
            metadata: {
                ...dossier.metadata,
                blacklist_reason: reason,
                blacklisted_at: new Date().toISOString(),
                blacklisted_by: actor.name
            }
        });

        // Set items to BLACKLIST_RESTRICTED
        if (dossier.items) {
            for (const it of dossier.items) {
                await this.workflowRepo.updateRequestItem(it.id, {
                    status: 'BLACKLIST_RESTRICTED'
                });
            }
        }

        // Automatic Alert to Référent National & configured recipients
        const alertRecipients = rolePrivileges?.security_alert_recipients || ['Référent National / Administrateur'];
        await this.workflowRepo.addAuditLog(
            'SECURITY_ALERT',
            parentId,
            'NATIONAL_ALERT_BLACKLIST_E123',
            actor.id,
            actor.name,
            { compromised_serial: compromisedSerial, reason, broadcast_to: alertRecipients }
        );

        // Pre-fill replacement request with cloned rights & enforce mutual exclusion rule
        const newSerial = `KEY-REPLACE-${Math.floor(1000 + Math.random() * 9000)}`;
        const replacementOrigin = blacklistRules?.replacement_default_origin || 'SUPPLIER_STOCK';

        const replacementDossier = await this.workflowRepo.createParentRequest({
            request_type: 'INCIDENT',
            title: `Remplacement Sécurisé Clé # ${compromisedSerial}`,
            description: `Demande automatique de remplacement suite à révocation de sécurité (${reason}). Exclusion mutuelle active avec ${compromisedSerial}.`,
            requester_id: dossier.requester_id,
            requester_name: dossier.requester_name,
            requester_email: dossier.requester_email,
            manager_id: dossier.manager_id,
            manager_name: dossier.manager_name,
            validator_id: dossier.validator_id,
            validator_name: dossier.validator_name,
            site_id: dossier.site_id,
            site_name: dossier.site_name,
            status: 'PENDING_CROSS_VAL',
            quote_amount: calculatedQuote,
            metadata: {
                compromised_serial: compromisedSerial,
                replacement_serial: newSerial,
                mutual_exclusion_rule: blacklistRules?.auto_exclusion_rule ? 'ACTIVE' : 'INACTIVE',
                cloned_from_dossier: dossier.request_number
            }
        }, [
            {
                item_type: 'KEY',
                label: `Nouvelle clé de remplacement #${newSerial} (Droits clonés)`,
                hardware_serial_number: newSerial,
                status: 'PENDING_VAL_PARALLEL',
                hardware_origin: replacementOrigin
            }
        ]);

        const freshCompromised = await this.workflowRepo.getParentRequestById(parentId);
        return { compromisedDossier: freshCompromised || updatedCompromised!, replacementDossier };
    }

    /**
     * Archive final: COMPLETED or ABANDONED
     */
    async archiveDossier(
        parentId: string,
        type: 'COMPLETED' | 'ABANDONED',
        actor: { id: number; name: string; role: string }
    ): Promise<ParentRequest> {
        const nextStatus: ParentRequestStatus = type === 'COMPLETED' ? 'ARCHIVED_COMPLETED' : 'ARCHIVED_ABANDONED';
        const updated = await this.workflowRepo.updateParentRequest(parentId, {
            status: nextStatus
        });

        await this.workflowRepo.addAuditLog(
            'PARENT_REQUEST',
            parentId,
            `ARCHIVE_${type}`,
            actor.id,
            actor.name,
            { final_status: nextStatus }
        );

        return updated!;
    }
}

export const workflowEngineService = new WorkflowEngineService();
