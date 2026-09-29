import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Regie from '../pages/Regie';
import AdminBaseDeDonnees from '../pages/AdminBaseDeDonnees';
import * as api from '../lib/api';

// Mock API functions for Epic 3
vi.mock('../lib/api', async () => {
    const actual = await vi.importActual('../lib/api');
    return {
        ...actual,
        getReturnContracts: vi.fn(() => Promise.resolve({
            data: [
                {
                    id: 'RET-2026-TEST-001',
                    beneficiaireId: 1042,
                    beneficiaireName: 'Jean Dupont (Agent)',
                    state: 'RESTITUTION_PLANIFIEE',
                    items: [
                        { hardwareSerial: 'MEC-2026-F9000-002', hardwareType: 'CLE_MECATRONIQUE', condition: 'BON_ETAT', penaltyFee: 0 }
                    ],
                    depositStatus: 'CONSERVEE',
                    totalPenalty: 0,
                    createdAt: '2026-09-24T10:00:00Z',
                    updatedAt: '2026-09-24T10:00:00Z'
                },
                {
                    id: 'RET-2026-TEST-002',
                    beneficiaireId: 1043,
                    beneficiaireName: 'Cosette Fauchelevent',
                    state: 'INSPECTION_CONFORME',
                    items: [
                        { hardwareSerial: 'MEC-2026-F9000-008', hardwareType: 'CLE_MECATRONIQUE', condition: 'BON_ETAT', inspectionNotes: 'Impeccable' }
                    ],
                    depositStatus: 'RESTITUEE',
                    totalPenalty: 0,
                    createdAt: '2026-09-24T10:00:00Z',
                    updatedAt: '2026-09-24T10:00:00Z'
                }
            ]
        })),
        createReturnContract: vi.fn((data) => Promise.resolve({
            data: {
                id: 'RET-2026-NEW-999',
                ...data,
                state: 'INITIALISE',
                depositStatus: 'CONSERVEE',
                totalPenalty: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        })),
        transitionReturnContract: vi.fn((id, data) => Promise.resolve({
            data: {
                id,
                state: 'INSPECTION_CONFORME',
                items: data.inspectedItems,
                depositStatus: 'RESTITUEE',
                totalPenalty: 0,
                inspectedBy: data.inspectorName,
                updatedAt: new Date().toISOString()
            }
        })),
        updateReturnContractStatus: vi.fn((id, state) => Promise.resolve({
            data: { id, state, updatedAt: new Date().toISOString() }
        })),
        runGdprRetention: vi.fn(() => Promise.resolve({
            data: {
                message: 'Cycle RGPD exécuté avec succès.',
                report: {
                    timestamp: new Date().toISOString(),
                    inspectedCount: 42,
                    anonymizedCount: 5,
                    purgedCount: 1,
                    affectedReferences: ['DEM-2026-001', 'DEM-2026-009']
                }
            }
        })),
        getGdprRetentionStatus: vi.fn(() => Promise.resolve({
            data: {
                policy: {
                    rejectedDossiersRetentionDays: 180,
                    completedDossiersRetentionDays: 1095,
                    anonymizeOnly: true
                },
                status: 'ACTIVE',
                lastRun: new Date().toISOString()
            }
        }))
    };
});

describe('Epic 3: Specialized Business Logic & Security Services UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('User Story 3.3: Contrats de Restitution Matérielle & Machine à États (Regie.tsx)', () => {
        it('affiche l\'onglet dédié aux contrats de restitution et bascule de vue', async () => {
            render(<Regie />);

            const returnTab = screen.getByText(/Contrats de Restitution & Pénalités/i);
            expect(returnTab).toBeTruthy();

            fireEvent.click(returnTab);

            expect(await screen.findByText(/Cycle de Restitution & Gestion des Cautions/i)).toBeTruthy();
            expect(screen.getByText('RET-2026-TEST-001')).toBeTruthy();
            expect(screen.getByText('Cosette Fauchelevent')).toBeTruthy();
        });

        it('filtre les contrats par statut', async () => {
            render(<Regie />);
            const returnTab = screen.getByText(/Contrats de Restitution & Pénalités/i);
            fireEvent.click(returnTab);

            await screen.findByText('RET-2026-TEST-001');

            // Click filter 'Conformes'
            const conformFilter = screen.getByText('Conformes');
            fireEvent.click(conformFilter);

            expect(screen.getByText('RET-2026-TEST-002')).toBeTruthy();
            expect(screen.queryByText('RET-2026-TEST-001')).toBeNull();
        });

        it('ouvre la modale d\'inspection physique pour un contrat de restitution', async () => {
            render(<Regie />);
            const returnTab = screen.getByText(/Contrats de Restitution & Pénalités/i);
            fireEvent.click(returnTab);

            await screen.findByText('RET-2026-TEST-001');

            const inspectBtn = screen.getByTitle(/Vérifier l'intégrité physique du matériel/i);
            fireEvent.click(inspectBtn);

            expect(screen.getByText(/Inspection Physique & Clôture de Restitution/i)).toBeTruthy();
            expect(screen.getByText(/Total des Pénalités Applicables/i)).toBeTruthy();
        });
    });

    describe('User Story 3.4: Rétention RGPD et Anonymisation Automatique (AdminBaseDeDonnees.tsx)', () => {
        it('affiche l\'onglet de politique légale de rétention et ses seuils', async () => {
            render(
                <BrowserRouter>
                    <AdminBaseDeDonnees />
                </BrowserRouter>
            );

            const rgpdTab = screen.getByText(/Rétention des Données & Anonymisation RGPD/i);
            expect(rgpdTab).toBeTruthy();

            fireEvent.click(rgpdTab);

            expect(screen.getByText(/Politique Légale de Rétention des Données Personnelles/i)).toBeTruthy();
            expect(screen.getByText(/Dossiers Refusés \/ Annulés \(Jours\)/i)).toBeTruthy();
            expect(screen.getByText(/Dossiers Validés \/ Clôturés \(Jours\)/i)).toBeTruthy();
        });

        it('déclenche le cycle de rétention RGPD et affiche le rapport d\'exécution', async () => {
            render(
                <BrowserRouter>
                    <AdminBaseDeDonnees />
                </BrowserRouter>
            );

            const rgpdTab = screen.getByText(/Rétention des Données & Anonymisation RGPD/i);
            fireEvent.click(rgpdTab);

            const runBtn = screen.getByText(/Exécuter le Cycle de Régularisation RGPD/i);
            fireEvent.click(runBtn);

            await waitFor(() => {
                expect(screen.getByText(/Rapport d'Exécution du Cycle RGPD/i)).toBeTruthy();
                expect(screen.getByText('42')).toBeTruthy(); // Inspected
                expect(screen.getByText('5')).toBeTruthy();  // Anonymized
                expect(screen.getByText('DEM-2026-001')).toBeTruthy();
            });
        });
    });
});
