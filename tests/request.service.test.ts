import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { RequestRepository } from '../server/repositories/request.repository.js';
import { AuditRepository } from '../server/repositories/audit.repository.js';
import { RequestService } from '../server/services/request.service.js';

describe('RequestService & Gestion des Demandes SQLite', () => {
    let testDb: ISqliteDb;
    let reqRepo: RequestRepository;
    let auditRepo: AuditRepository;
    let reqService: RequestService;

    const mockApplicant = {
        id: 1042,
        name: 'Daniel Dupont',
        role: 'Demandeur',
        attributes: { service: 'Maintenance Voie', region: 'Île-de-France' }
    };

    const mockManager = {
        id: 201,
        name: 'Marc Martin (Manager N+1)',
        role: 'Manager'
    };

    const mockSiteValidator = {
        id: 305,
        name: 'Valérie Validateur',
        role: 'Validateur Site'
    };

    beforeEach(async () => {
        // Isolated in-memory SQLite database
        testDb = await getDatabase(':memory:');
        reqRepo = new RequestRepository(testDb);
        auditRepo = new AuditRepository(testDb);
        reqService = new RequestService(reqRepo, auditRepo);
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    it('doit créer une nouvelle demande avec référence automatique DEM-YYYY-XXX', async () => {
        const currentYear = new Date().getFullYear();
        const request = await reqService.createRequest({
            title: 'Remplacement aiguillage Voie 3',
            description: 'Intervention d’urgence suite à signalement de jeu mécanique',
            site_id: 1,
            site_name: 'Paris Gare du Nord',
            equipment_type: 'Mécatronique / Aiguillage',
            intervention_duration: '4 heures'
        }, mockApplicant);

        expect(request).toBeDefined();
        expect(request.reference).toMatch(new RegExp(`^DEM-${currentYear}-\\d{3}$`));
        expect(request.beneficiaire_id).toBe(1042);
        expect(request.beneficiaire_name).toBe('Daniel Dupont');
        expect(request.stages).toHaveLength(2);
        expect(request.current_stage_index).toBe(0);
        expect(request.status).toContain('En attente validation');

        // Verify audit log creation
        const logs = await auditRepo.getAll(5);
        const createLog = logs.find(l => l.action === 'CREATION_DEMANDE' && l.target === request.reference);
        expect(createLog).toBeDefined();
        expect(createLog?.actor).toBe('Daniel Dupont');
    });

    it('doit rejeter la création si le titre ou la description est manquant', async () => {
        await expect(
            reqService.createRequest({
                title: '',
                description: 'Description valide'
            }, mockApplicant)
        ).rejects.toThrow('Le titre de la demande est obligatoire');

        await expect(
            reqService.createRequest({
                title: 'Titre valide',
                description: '   '
            }, mockApplicant)
        ).rejects.toThrow('La description détaillée est obligatoire');
    });

    it('doit avancer le workflow à l’étape suivante lors de l’approbation de l’étape 1', async () => {
        const req = await reqService.createRequest({
            title: 'Maintenance caténaire Gare de Lyon',
            description: 'Vérification de la tension mécanique',
            site_name: 'Paris Gare de Lyon'
        }, mockApplicant);

        const updated = await reqService.approveStage(
            req.reference,
            mockManager,
            'Accord Manager N+1 accordé pour travaux'
        );

        expect(updated.current_stage_index).toBe(1);
        expect(updated.stages[0].status).toBe('approved');
        expect(updated.stages[0].validator_name).toBe(mockManager.name);
        expect(updated.stages[0].comment).toBe('Accord Manager N+1 accordé pour travaux');
        expect(updated.status).toContain('Validation Sécurité');

        const logs = await auditRepo.getAll(5);
        const approveLog = logs.find(l => l.action === 'APPROBATION_ETAPE' && l.target === req.reference);
        expect(approveLog).toBeDefined();
    });

    it('doit passer la demande au statut Validée lors de la dernière approbation', async () => {
        const req = await reqService.createRequest({
            title: 'Contrôle télécoms tunnel',
            description: 'Inspection fibre optique et capteurs mécatroniques'
        }, mockApplicant);

        // Stage 1 approval
        await reqService.approveStage(req.reference, mockManager, 'Validation N+1 OK');

        // Stage 2 approval (final)
        const finalApproved = await reqService.approveStage(
            req.reference,
            mockSiteValidator,
            'Site sécurisé, consignation confirmée'
        );

        expect(finalApproved.status).toBe('Validée');
        expect(finalApproved.stages[1].status).toBe('approved');

        const logs = await auditRepo.getAll(5);
        const finalLog = logs.find(l => l.action === 'APPROBATION_FINALE' && l.target === req.reference);
        expect(finalLog).toBeDefined();
    });

    it('doit marquer la demande Refusée lors d’un rejet avec motif obligatoire', async () => {
        const req = await reqService.createRequest({
            title: 'Travaux non planifiés',
            description: 'Intervention urgente sans plan de prévention'
        }, mockApplicant);

        await expect(
            reqService.rejectStage(req.reference, mockManager, '')
        ).rejects.toThrow('Le motif du refus est obligatoire');

        const rejected = await reqService.rejectStage(
            req.reference,
            mockManager,
            'Absence de plan de prévention conforme EN 15864'
        );

        expect(rejected.status).toBe('Refusée');
        expect(rejected.stages[0].status).toBe('rejected');
        expect(rejected.stages[0].comment).toBe('Absence de plan de prévention conforme EN 15864');

        const logs = await auditRepo.getAll(5);
        const rejectLog = logs.find(l => l.action === 'REFUS_DEMANDE');
        expect(rejectLog).toBeDefined();
    });

    it('doit gérer le cycle de demande de complément et la réponse du demandeur', async () => {
        const req = await reqService.createRequest({
            title: 'Accès poste d’aiguillage',
            description: 'Remplacement de module électronique'
        }, mockApplicant);

        // 1. Validator requests complement
        const complementReq = await reqService.requestComplement(
            req.reference,
            mockSiteValidator,
            'Merci de joindre l’habilitation électrique à jour'
        );

        expect(complementReq.status).toBe('Complément requis');
        expect(complementReq.complement_request?.message).toBe('Merci de joindre l’habilitation électrique à jour');
        expect(complementReq.complement_request?.requested_by).toBe(mockSiteValidator.name);

        // 2. Applicant submits complement response
        const answered = await reqService.respondToComplement(
            req.reference,
            mockApplicant,
            'Habilitation B2V / BR transmise et vérifiée'
        );

        expect(answered.status).toContain('En attente validation');
        expect(answered.complement_request?.response).toBe('Habilitation B2V / BR transmise et vérifiée');
        expect(answered.stages[0].status).toBe('pending');

        const logs = await auditRepo.getAll(5);
        const answerLog = logs.find(l => l.action === 'COMPLEMENT_FOURNI');
        expect(answerLog).toBeDefined();
    });

    it('doit filtrer les demandes selon le rôle de l’utilisateur', async () => {
        // Applicant sees only their own requests
        const applicantRequests = await reqService.getRequestsForUser({
            id: 1042,
            role: 'Demandeur',
            privileges: ['view_own_requests']
        });
        applicantRequests.forEach(r => {
            expect(r.beneficiaire_id).toBe(1042);
        });

        // Administrator sees all requests
        const adminRequests = await reqService.getRequestsForUser({
            id: 1,
            role: 'Administrateur',
            privileges: ['view_all', 'manage_users']
        });
        expect(adminRequests.length).toBeGreaterThanOrEqual(applicantRequests.length);
    });
});
