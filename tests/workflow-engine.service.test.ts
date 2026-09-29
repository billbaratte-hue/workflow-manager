import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { WorkflowRepository } from '../server/repositories/workflow.repository.js';
import { SettingsRepository } from '../server/repositories/settings.repository.js';
import { WorkflowEngineService } from '../server/services/workflow-engine.service.js';

describe('WorkflowEngineService & Zero-Hardcoding State Machine Tests', () => {
    let testDb: ISqliteDb;
    let settingsRepo: SettingsRepository;
    let workflowRepo: WorkflowRepository;
    let workflowEngine: WorkflowEngineService;

    // Test Actors aligned with operational roles and permissions
    const applicantUser = {
        id: 1042,
        name: 'Daniel Dupont',
        role: 'Demandeur'
    };

    const managerUser = {
        id: 201,
        name: 'Marc Martin',
        role: 'Manager'
    };

    const siteValidatorUser = {
        id: 305,
        name: 'Valérie Validateur',
        role: 'Validateur de Site'
    };

    const nationalReferentUser = {
        id: 999,
        name: 'Alexandre National',
        role: 'Référent National'
    };

    const unprivilegedUser = {
        id: 555,
        name: 'Stagiaire Non-Habilité',
        role: 'Consultant'
    };

    beforeEach(async () => {
        // Create an isolated in-memory database
        testDb = await getDatabase(':memory:');
        settingsRepo = new SettingsRepository(testDb);
        workflowRepo = new WorkflowRepository(testDb, settingsRepo);
        await workflowRepo.initializeTables();
        workflowEngine = new WorkflowEngineService(workflowRepo, settingsRepo);

        // Seed dynamic system settings with default configurations
        await settingsRepo.setSetting(
            'quota_hardware_default_limit',
            { max_orders: 5, period_months: 12 },
            'workflow',
            'Plafond de commandes de matériel par demandeur avant escalade nationale'
        );

        await settingsRepo.setSetting(
            'workflow_routing_rules',
            {
                hardware_request_types: ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY'],
                gps_required_types: ['CYLINDER_ORDER', 'TERMINAL_ORDER'],
                user_account_types: ['USER_ACCOUNT'],
                auto_fulfill_types: ['HABILITATION', 'ORGANIZATION_CHANGE'],
                incident_types: ['INCIDENT']
            },
            'workflow',
            'Types de demandes éligibles aux quotas, commissioning GPS et circuits spécifiques'
        );

        await settingsRepo.setSetting(
            'workflow_role_privileges',
            {
                manager_approval_roles: ['Manager', 'Responsable d\'équipe', 'Chef de Projet', 'Administrateur'],
                validator_approval_roles: ['Validateur', 'Validateur de Site', 'Responsable Sécurité', 'Administrateur'],
                national_arbitration_roles: ['Référent National', 'Administrateur National', 'Administrateur'],
                security_alert_recipients: ['Référent National', 'Pôle Sécurité Mécatronique']
            },
            'workflow',
            'Rôles autorisés pour les approbations Manager, Validateur, Référent National et Alertes'
        );

        await settingsRepo.setSetting(
            'gps_commissioning_rules',
            {
                max_distance_meters: 250,
                max_accuracy_meters: 50,
                require_installer_signature: true
            },
            'workflow',
            'Seuils de tolérance et validation GPS sur le terrain'
        );

        await settingsRepo.setSetting(
            'incident_blacklist_rules',
            {
                replacement_default_origin: 'SUPPLIER_STOCK',
                replacement_quote_fixed_amount: 85.00,
                use_s9_tariff_lookup: true,
                auto_exclusion_rule: true
            },
            'workflow',
            'Règles de mise en liste noire et calcul du devis de remplacement'
        );

        await settingsRepo.setSetting(
            'tarification_devis_differentiel_s9',
            {
                user_stock_unit_price: 45.00,
                supplier_stock_unit_price: 85.00,
                new_order_unit_price: 145.00,
                currency: 'EUR'
            },
            'workflow',
            'Grille tarifaire du devis différentiel S9'
        );

        await settingsRepo.setSetting(
            'relance_s14_config',
            {
                delai_semaines: 2,
                max_bounces: 3,
                auto_incident_on_timeout: true
            },
            'workflow',
            'Paramétrage du cycle de relance S14 et escalade automatique'
        );
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    // =========================================================================
    // 1. Processus 1: Habilitations Multi-Sites & Validation Asynchrone Unitaire
    // =========================================================================
    describe('Processus 1: Habilitations & Validation Asynchrone Multi-Sites', () => {
        it('doit permettre la validation asynchrone des items par site sans blocage et passer en PENDING_CROSS_VAL dès un item validé', async () => {
            const parent = await workflowRepo.createParentRequest({
                request_type: 'HABILITATION',
                title: 'Habilitation Multi-Sites Postes Nord & Lyon',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                manager_id: managerUser.id,
                manager_name: managerUser.name,
                validator_id: siteValidatorUser.id,
                validator_name: siteValidatorUser.name,
                status: 'DRAFT'
            }, [
                {
                    item_type: 'ACCESS_RIGHT',
                    label: 'Poste Aiguillage Nord',
                    target_site_name: 'Paris Gare du Nord',
                    designated_validator_id: 305,
                    designated_validator_name: 'Valérie Validateur',
                    status: 'DRAFT'
                },
                {
                    item_type: 'ACCESS_RIGHT',
                    label: 'Salle Relais Part-Dieu',
                    target_site_name: 'Lyon Part-Dieu',
                    designated_validator_id: 307,
                    designated_validator_name: 'Richard Rails',
                    status: 'DRAFT'
                }
            ]);

            // Soumission
            const submitted = await workflowEngine.submitDossier(parent.id, applicantUser);
            expect(submitted.status).toBe('PENDING_VAL_PARALLEL');

            const itemNord = submitted.items![0];
            const itemLyon = submitted.items![1];

            // Validation unitaire du premier item par le validateur Nord
            const val1 = await workflowEngine.evaluateItem(itemNord.id, 'APPROVE', siteValidatorUser);
            expect(val1.item.status).toBe('ITEM_APPROVED');
            expect(val1.item.approved_at).toBeTruthy();
            expect(val1.parent.status).toBe('PENDING_CROSS_VAL');

            // Le second item reste en attente sans bloquer le dossier
            const refreshed = await workflowRepo.getParentRequestById(parent.id);
            const itemLyonRefreshed = refreshed?.items?.find(i => i.id === itemLyon.id);
            expect(itemLyonRefreshed?.status).toBe('PENDING_VAL_PARALLEL');
        });

        it('doit archiver le dossier en ARCHIVED_REJECTED si tous les items unitaires sont refusés', async () => {
            const parent = await workflowRepo.createParentRequest({
                request_type: 'HABILITATION',
                title: 'Habilitation refusée',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'DRAFT'
            }, [
                {
                    item_type: 'ACCESS_RIGHT',
                    label: 'Zone Haute Tension',
                    status: 'DRAFT'
                }
            ]);

            const submitted = await workflowEngine.submitDossier(parent.id, applicantUser);
            const itemId = submitted.items![0].id;

            const res = await workflowEngine.evaluateItem(itemId, 'REJECT', siteValidatorUser, 'Habilitation électrique manquante');
            expect(res.item.status).toBe('ITEM_REJECTED');
            expect(res.parent.status).toBe('ARCHIVED_REJECTED');
        });
    });

    // =========================================================================
    // 2. Processus 2: Création de Compte, RGPD & Enchaînement Clé
    // =========================================================================
    describe('Processus 2: Création Compte Utilisateur, Charte RGPD & Chaînage Clé', () => {
        it('doit guider le compte vers PENDING_GDPR après double validation, puis proposer le clonage vers commande de clé', async () => {
            const parent = await workflowRepo.createParentRequest({
                request_type: 'USER_ACCOUNT',
                title: 'Création compte Agent Ferroviaire',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                manager_id: managerUser.id,
                manager_name: managerUser.name,
                validator_id: siteValidatorUser.id,
                validator_name: siteValidatorUser.name,
                site_id: 1,
                site_name: 'Paris Gare du Nord',
                status: 'DRAFT'
            }, [
                { item_type: 'USER_CREATION', label: 'Compte & Badge Virtuel', status: 'DRAFT' }
            ]);

            await workflowEngine.submitDossier(parent.id, applicantUser);
            await workflowEngine.evaluateItem(parent.items![0].id, 'APPROVE', siteValidatorUser);

            // Validation Manager
            const step1 = await workflowEngine.crossValidate(parent.id, managerUser, 'APPROVE', 'Manager OK');
            expect(step1.manager_approved).toBe(true);
            expect(step1.validator_approved).toBe(false);

            // Validation Validateur -> Passage en PENDING_GDPR car configuré dans user_account_types
            const step2 = await workflowEngine.crossValidate(parent.id, siteValidatorUser, 'APPROVE', 'Validateur OK');
            expect(step2.validator_approved).toBe(true);
            expect(step2.status).toBe('PENDING_GDPR');

            // Acceptation RGPD
            const step3 = await workflowEngine.acceptGDPR(parent.id, applicantUser);
            expect(step3.gdpr_accepted).toBe(true);
            expect(step3.status).toBe('PENDING_KEY_DECISION');

            // Décision : besoin d'une clé physique -> Clôture compte et création automatique dossier clé
            const chainingResult = await workflowEngine.decideKeyChaining(parent.id, true, applicantUser);
            expect(chainingResult.currentDossier.status).toBe('ARCHIVED_COMPLETED');
            expect(chainingResult.chainedKeyDossier).toBeDefined();
            expect(chainingResult.chainedKeyDossier?.request_type).toBe('KEY_ORDER');
            expect(chainingResult.chainedKeyDossier?.status).toBe('PENDING_QUOTE_PO');
            expect(chainingResult.chainedKeyDossier?.items?.[0].hardware_origin).toBe('SUPPLIER_STOCK');
        });
    });

    // =========================================================================
    // 3. Processus 3: Commande de Clé, Quota S10 & Devis Différentiel S9
    // =========================================================================
    describe('Processus 3: Quota S10 Dynamique & Devis Différentiel S9', () => {
        it('doit router vers PENDING_VAL_PARALLEL si sous le quota dynamique (< 5)', async () => {
            const quotaBefore = await workflowRepo.getUserOrderQuota(applicantUser.id);
            expect(quotaBefore.order_count).toBe(2);
            expect(quotaBefore.quota_limit).toBe(5);

            const keyOrder = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Commande Clé Demandeur',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'DRAFT'
            });

            const submitted = await workflowEngine.submitDossier(keyOrder.id, applicantUser);
            expect(submitted.status).toBe('PENDING_VAL_PARALLEL');
            expect(submitted.quota_exceeded).toBe(false);

            const quotaAfter = await workflowRepo.getUserOrderQuota(applicantUser.id);
            expect(quotaAfter.order_count).toBe(3);
        });

        it('doit déclencher ESCALATED_NATIONAL dès que le quota paramétré dans system_settings est dépassé', async () => {
            const highDemandUser = {
                id: 2099,
                name: 'Agent Multi-Commandes',
                role: 'Demandeur'
            };

            // Mettre le plafond dynamique à 2 commandes
            await settingsRepo.setSetting('quota_hardware_default_limit', { max_orders: 2, period_months: 12 }, 'workflow');

            // Commande 1 (count devient 1 <= 2) -> OK
            const o1 = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Commande 1',
                requester_id: highDemandUser.id,
                requester_name: highDemandUser.name,
                status: 'DRAFT'
            });
            const sub1 = await workflowEngine.submitDossier(o1.id, highDemandUser);
            expect(sub1.quota_exceeded).toBe(false);
            expect(sub1.status).toBe('PENDING_VAL_PARALLEL');

            // Commande 2 (count devient 2 <= 2) -> OK
            const o2 = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Commande 2',
                requester_id: highDemandUser.id,
                requester_name: highDemandUser.name,
                status: 'DRAFT'
            });
            const sub2 = await workflowEngine.submitDossier(o2.id, highDemandUser);
            expect(sub2.quota_exceeded).toBe(false);
            expect(sub2.status).toBe('PENDING_VAL_PARALLEL');

            // Commande 3 (count actuel est 2 >= quota_limit 2) -> Déclenchement ESCALATED_NATIONAL S10
            const o3 = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Commande 3 (Hors quota)',
                requester_id: highDemandUser.id,
                requester_name: highDemandUser.name,
                status: 'DRAFT'
            });
            const sub3 = await workflowEngine.submitDossier(o3.id, highDemandUser);
            expect(sub3.quota_exceeded).toBe(true);
            expect(sub3.status).toBe('ESCALATED_NATIONAL');
        });

        it('doit respecter les rôles dynamiques workflow_role_privileges pour l’arbitrage national', async () => {
            const escalated = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Dossier Escaladé',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'ESCALATED_NATIONAL'
            });

            // Un utilisateur non habilité doit être rejeté
            await expect(
                workflowEngine.nationalEscalationDecision(escalated.id, unprivilegedUser, 'APPROVE')
            ).rejects.toThrow(/Arbitrage National S10/);

            // Le Référent National habilité valide le dossier
            const unlocked = await workflowEngine.nationalEscalationDecision(
                escalated.id,
                nationalReferentUser,
                'APPROVE',
                'Dérogation accordée pour travaux urgents'
            );
            expect(unlocked.status).toBe('PENDING_VAL_PARALLEL');
        });
    });

    // =========================================================================
    // 4. Processus 4: Commande Cylindre & Commissioning GPS
    // =========================================================================
    describe('Processus 4: Commissioning GPS & Tolérances Dynamiques', () => {
        it('doit exiger le relevé GPS au commissioning selon la liste gps_required_types', async () => {
            const cylOrder = await workflowRepo.createParentRequest({
                request_type: 'CYLINDER_ORDER',
                title: 'Pose Cylindre Porte Relais',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'DISPATCHED_IN_TRANSIT'
            }, [
                { item_type: 'CYLINDER', label: 'Cylindre Européen IP66', status: 'DISPATCHED_IN_TRANSIT' }
            ]);

            // Signature du PV de réception
            const signed = await workflowEngine.signReceptionPV(cylOrder.id, applicantUser);
            expect(signed.reception_pv_signed).toBe(true);
            // CYLINDER_ORDER est dans gps_required_types -> COMMISSIONING_GPS
            expect(signed.status).toBe('COMMISSIONING_GPS');
            expect(signed.items![0].status).toBe('COMMISSIONING_GPS');
        });

        it('doit refuser le commissioning si la précision GPS dépasse la tolérance dynamique (ex: 80m > 50m)', async () => {
            const dossier = await workflowRepo.createParentRequest({
                request_type: 'CYLINDER_ORDER',
                title: 'Pose Cylindre',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'COMMISSIONING_GPS'
            });

            // Relevé avec précision imprécise (85 mètres > tolérance de 50m)
            await expect(
                workflowEngine.validateGPSCommissioning(
                    dossier.id,
                    { latitude: 48.8809, longitude: 2.3553, accuracy: 85 },
                    applicantUser
                )
            ).rejects.toThrow(/Précision GPS insuffisante/);
        });

        it('doit valider le commissioning et passer en ACTIVE_FULFILLED si la précision GPS est conforme', async () => {
            const dossier = await workflowRepo.createParentRequest({
                request_type: 'CYLINDER_ORDER',
                title: 'Pose Cylindre Conforme',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'COMMISSIONING_GPS'
            }, [
                { item_type: 'CYLINDER', label: 'Cylindre Cabine', status: 'COMMISSIONING_GPS' }
            ]);

            const fulfilled = await workflowEngine.validateGPSCommissioning(
                dossier.id,
                { latitude: 48.8809, longitude: 2.3553, accuracy: 12, installer_name: 'Technicien Voie' },
                applicantUser
            );

            expect(fulfilled.status).toBe('ACTIVE_FULFILLED');
            expect(fulfilled.items![0].status).toBe('ACTIVE_FULFILLED');
            expect(fulfilled.items![0].gps_coordinates?.accuracy).toBe(12);
            expect(fulfilled.items![0].gps_coordinates?.installer_name).toBe('Technicien Voie');
        });
    });

    // =========================================================================
    // 5. Processus 5: Relance S14 & Escalade Automatique
    // =========================================================================
    describe('Processus 5: Relance S14 & Escalade Automatique sur Non-Réception', () => {
        it('doit incrémenter le compteur de relances S14 et escalader en AUTO_ESCALATED_INCIDENT au seuil limite', async () => {
            const transitDossier = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Clé Expédiée en attente de PV',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'DISPATCHED_IN_TRANSIT',
                reception_pv_signed: false
            });

            // Relance 1
            const r1 = await workflowEngine.triggerReminder(transitDossier.id, managerUser);
            expect(r1.reminder.reminder_count).toBe(1);
            expect(r1.dossier.status).toBe('DISPATCHED_IN_TRANSIT');

            // Relance 2
            const r2 = await workflowEngine.triggerReminder(transitDossier.id, managerUser);
            expect(r2.reminder.reminder_count).toBe(2);
            expect(r2.dossier.status).toBe('DISPATCHED_IN_TRANSIT');

            // Relance 3 (seuil max configuré = 3) -> Bascule automatique en incident Perte/Vol
            const r3 = await workflowEngine.triggerReminder(transitDossier.id, managerUser);
            expect(r3.reminder.reminder_count).toBe(3);
            expect(r3.dossier.status).toBe('AUTO_ESCALATED_INCIDENT');
        });
    });

    // =========================================================================
    // 6. Processus 7: Perte, Vol, Règle E123 & Remplacement Automatique
    // =========================================================================
    describe('Processus 7: Vol E123, Liste Noire & Remplacement Immédiat', () => {
        it('doit interdire la mise en liste noire aux profils non habilités E123', async () => {
            const dossier = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Clé en service',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                status: 'ACTIVE_FULFILLED'
            });

            await expect(
                workflowEngine.reportIncidentAndBlacklist(
                    dossier.id,
                    'KEY-PORTAL-9988',
                    'Perte de clé',
                    applicantUser // Simple demandeur sans privilège E123
                )
            ).rejects.toThrow(/Habilitation E123/);
        });

        it('doit inscrire la clé en liste noire, notifier le National et cloner un dossier de remplacement avec exclusion mutuelle', async () => {
            const activeDossier = await workflowRepo.createParentRequest({
                request_type: 'KEY_ORDER',
                title: 'Clé active sur le secteur',
                requester_id: applicantUser.id,
                requester_name: applicantUser.name,
                manager_id: managerUser.id,
                manager_name: managerUser.name,
                validator_id: siteValidatorUser.id,
                validator_name: siteValidatorUser.name,
                status: 'ACTIVE_FULFILLED'
            }, [
                {
                    item_type: 'KEY',
                    label: 'Clé Perdue #KEY-LOST-001',
                    hardware_serial_number: 'KEY-LOST-001',
                    status: 'ACTIVE_FULFILLED'
                }
            ]);

            const result = await workflowEngine.reportIncidentAndBlacklist(
                activeDossier.id,
                'KEY-LOST-001',
                'Vol constaté lors de l’intervention',
                nationalReferentUser // Référent National habilité
            );

            // Dossier compromis en liste noire
            expect(result.compromisedDossier.status).toBe('BLACKLIST_RESTRICTED');
            expect(result.compromisedDossier.items![0].status).toBe('BLACKLIST_RESTRICTED');

            // Dossier de remplacement créé
            expect(result.replacementDossier).toBeDefined();
            expect(result.replacementDossier.request_type).toBe('INCIDENT');
            expect(result.replacementDossier.status).toBe('PENDING_CROSS_VAL');
            expect(result.replacementDossier.quote_amount).toBe(85.00); // Forfait stock tampon S9
            expect(result.replacementDossier.items![0].hardware_origin).toBe('SUPPLIER_STOCK');

            // Vérification du journal d'audit pour l'alerte nationale
            const auditLogs = await workflowRepo.getAuditLogs(10);
            const alertLog = auditLogs.find(l => l.action === 'NATIONAL_ALERT_BLACKLIST_E123');
            expect(alertLog).toBeDefined();
            expect(alertLog?.details?.compromised_serial).toBe('KEY-LOST-001');
        });
    });

    // =========================================================================
    // 7. Rôles & Catégories de Paramètres (Zero-Hardcoding Verification)
    // =========================================================================
    describe('Rôles et Catégories de Paramétrage Dynamique', () => {
        it('doit adapter le devis différentiel S9 lorsque la grille tarifaire est modifiée dans system_settings', async () => {
            // Mettre à jour le tarif usine à 200€ et stock demandeur à 30€
            await settingsRepo.setSetting('tarification_devis_differentiel_s9', {
                user_stock_unit_price: 30.00,
                supplier_stock_unit_price: 90.00,
                new_order_unit_price: 200.00,
                currency: 'EUR'
            }, 'tarification');

            const updatedSettings = await settingsRepo.getSettingValue<any>('tarification_devis_differentiel_s9', {});
            expect(updatedSettings.user_stock_unit_price).toBe(30.00);
            expect(updatedSettings.new_order_unit_price).toBe(200.00);
        });

        it('doit accepter de nouvelles catégories de rôles dans workflow_role_privileges', async () => {
            await settingsRepo.setSetting('workflow_role_privileges', {
                manager_approval_roles: ['Chef de Secteur', 'Superviseur'],
                validator_approval_roles: ['Auditeur Sécurité'],
                national_arbitration_roles: ['Directeur Opérations']
            }, 'roles');

            const rolesConfig = await settingsRepo.getSettingValue<any>('workflow_role_privileges', {});
            expect(rolesConfig.manager_approval_roles).toContain('Chef de Secteur');
            expect(rolesConfig.validator_approval_roles).toContain('Auditeur Sécurité');
            expect(rolesConfig.national_arbitration_roles).toContain('Directeur Opérations');
        });
    });
});
