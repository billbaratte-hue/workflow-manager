import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { AffectationDynamiqueService } from '../server/services/affectationDynamique.service.js';
import { ChampsConditionnelsService, DEFAULT_CONDITIONAL_RULES } from '../server/services/champsConditionnels.service.js';
import { ContratRetourService, ReturnItem } from '../server/services/contratRetour.service.js';
import { RetentionService } from '../server/services/retention.service.js';

describe('Epic 3: Specialized Business Logic & Security Services', () => {
    let testDb: ISqliteDb;

    beforeEach(async () => {
        testDb = await getDatabase(':memory:');
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    describe('User Story 3.1: Affectation Dynamique (Dynamic Routing & Assignment)', () => {
        it('doit router vers une validation locale standard pour une intervention ponctuelle', async () => {
            const assignment = await AffectationDynamiqueService.resolveAssignment({
                siteId: 1,
                siteName: 'Paris Gare du Nord',
                isTeamRequest: false,
                durationHours: 24,
                equipmentType: 'Clé Mécatronique EN 15864'
            });

            expect(assignment).toBeDefined();
            expect(assignment.ruleApplied).toBe('RÈGLE_STANDARD_LOCALE');
            expect(assignment.stages.length).toBe(2);
            expect(assignment.stages[0].assignedRole).toBe('Validateur de Site');
            expect(assignment.stages[1].assignedRole).toBe('Gestionnaire Régie');
        });

        it('doit insérer une étape hiérarchique si demande collective ou durée > 72h', async () => {
            const assignment = await AffectationDynamiqueService.resolveAssignment({
                siteId: 2,
                siteName: 'Lyon Part-Dieu',
                isTeamRequest: true,
                durationHours: 96,
                equipmentType: 'Lot de badges RFID'
            });

            expect(assignment.ruleApplied).toBe('RÈGLE_EQUIPE_SITE');
            expect(assignment.stages.length).toBe(3);
            expect(assignment.stages[0].assignedRole).toBe('Responsable d\'équipe');
            expect(assignment.stages[1].assignedRole).toBe('Validateur de Site');
            expect(assignment.stages[2].assignedRole).toBe('Gestionnaire Régie');
        });
    });

    describe('User Story 3.2: Champs Conditionnels (Dynamic Form Rules Engine)', () => {
        it('doit exiger les coordonnées GPS pour les commandes de cylindres mécatroniques', () => {
            const resultInvalid = ChampsConditionnelsService.evaluate({
                equipment_type: 'Cylindre Mécatronique',
            }, DEFAULT_CONDITIONAL_RULES);

            expect(resultInvalid.isValid).toBe(false);
            expect(resultInvalid.errors['gps_latitude']).toBeDefined();
            expect(resultInvalid.errors['gps_longitude']).toBeDefined();

            const resultValid = ChampsConditionnelsService.evaluate({
                equipment_type: 'Cylindre Mécatronique',
                gps_latitude: '48.8809',
                gps_longitude: '2.3553'
            }, DEFAULT_CONDITIONAL_RULES);

            expect(resultValid.isValid).toBe(true);
            expect(Object.keys(resultValid.errors).length).toBe(0);
        });

        it('doit exiger le nom d\'équipe et la liste des membres pour une demande collective', () => {
            const resultMissing = ChampsConditionnelsService.evaluate({
                is_team_request: true,
            }, DEFAULT_CONDITIONAL_RULES);

            expect(resultMissing.isValid).toBe(false);
            expect(resultMissing.errors['team_name']).toBeDefined();
            expect(resultMissing.errors['team_members']).toBeDefined();

            const resultFilled = ChampsConditionnelsService.evaluate({
                is_team_request: true,
                team_name: 'Brigade Voie IDF Nord',
                team_members: [{ name: 'Pierre Durand', trigramme: 'PDU' }]
            }, DEFAULT_CONDITIONAL_RULES);

            expect(resultFilled.isValid).toBe(true);
        });

        it('doit exiger l\'habilitation haute sécurité en zone 25kV', () => {
            const res = ChampsConditionnelsService.evaluate({
                zone_criticite: 'Zone Dangereuse Électrifiée 25kV'
            }, DEFAULT_CONDITIONAL_RULES);

            expect(res.isValid).toBe(false);
            expect(res.errors['safety_accreditation_number']).toBeDefined();
        });
    });

    describe('User Story 3.3: Contrat Retour (Hardware Restitution State Machine)', () => {
        it('doit créer un contrat retour initialisé pour le matériel restitué', async () => {
            const items: ReturnItem[] = [
                { hardwareSerial: 'KEY-PORTAL-8841', hardwareType: 'CLE_MECATRONIQUE' }
            ];

            const contract = await ContratRetourService.createReturnContract(
                1001,
                'Jean Valjean',
                items,
                42
            );

            expect(contract.id).toMatch(/^RET_\d+_[A-Z0-9]+$/);
            expect(contract.state).toBe('INITIALISE');
            expect(contract.items.length).toBe(1);
            expect(contract.depositStatus).toBe('CONSERVEE');
        });

        it('doit solder le contrat sans pénalité si inspection conforme', async () => {
            const items: ReturnItem[] = [
                { hardwareSerial: 'KEY-PORTAL-8841', hardwareType: 'CLE_MECATRONIQUE', condition: 'BON_ETAT' }
            ];

            const initialContract = await ContratRetourService.createReturnContract(1001, 'Jean Valjean', items);
            const inspected = await ContratRetourService.inspectAndProcessReturn(
                initialContract,
                items,
                'Régisseur Principal'
            );

            expect(inspected.state).toBe('INSPECTION_CONFORME');
            expect(inspected.depositStatus).toBe('RESTITUEE');
            expect(inspected.totalPenalty).toBe(0);
        });

        it('doit appliquer des frais de pénalité en cas de dégradation ou de perte de clé', async () => {
            const degradedItems: ReturnItem[] = [
                { hardwareSerial: 'KEY-LOST-01', hardwareType: 'CLE_MECATRONIQUE', condition: 'MANQUANT', penaltyFee: 145 }
            ];

            const initial = await ContratRetourService.createReturnContract(1002, 'Cosette', degradedItems);
            const processed = await ContratRetourService.inspectAndProcessReturn(initial, degradedItems, 'Atelier Mécatronique');

            expect(processed.state).toBe('PERTE_VOL_DECLAREE');
            expect(processed.totalPenalty).toBe(145);
            expect(processed.depositStatus).toBe('ENGAGEE_PENALITE');
        });
    });

    describe('User Story 3.4: GDPR Data Retention & Anonymization Service', () => {
        it('doit anonymiser les dossiers expirés selon les règles RGPD', async () => {
            // Seed a normal request and an expired request
            const now = Date.now();
            const expiredDate = new Date(now - (200 * 24 * 60 * 60 * 1000)).toISOString(); // 200 days ago

            await testDb.run(`
                INSERT INTO requests (id, reference, status, created_at, beneficiaire_id, beneficiaire_name, beneficiaire_service, title, description, stages)
                VALUES (9901, 'DEM-EXP-001', 'Refusée', ?, 1042, 'Martin Expiré', 'Maintenance Électrique', 'Titre Ancien', 'Contenu Confidentiel', '[]')
            `, expiredDate);

            const report = await RetentionService.executeRetentionCycle({
                rejectedDossiersRetentionDays: 180,
                completedDossiersRetentionDays: 1095,
                anonymizeOnly: true
            }, testDb);

            expect(report.inspectedCount).toBeGreaterThanOrEqual(1);
            expect(report.anonymizedCount).toBeGreaterThanOrEqual(1);

            const updated = await testDb.get<any>('SELECT * FROM requests WHERE id = 9901');
            expect(updated.beneficiaire_name).toBe('UTILISATEUR_ANONYMISE_RGPD');
            expect(updated.beneficiaire_service).toBe('RGPD_PURGE');
        });
    });
});
