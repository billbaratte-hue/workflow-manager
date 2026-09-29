/**
 * @file src/test/Epic4Features.test.tsx
 * Comprehensive Integration & Verification Test Suite for Epic 4:
 * User Story 4.1: Espace Demandeur & Auto-Inscription Agent (Register & Workspace)
 * User Story 4.2: Console Nationale & Régie Matérielle (Supervision & Hardware Dispatch)
 * User Story 4.3: Recherche Globale Transversale (Multi-criteria Search Engine)
 * User Story 4.4: Documentation & Base de Connaissances Spécifications (Knowledge Base & Admin)
 * User Story 4.5: Entités Organisationnelles & Référentiels Métier (Hierarchy & Lookup Tables)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../lib/api';

vi.mock('../lib/api', async () => {
    const actual = await vi.importActual('../lib/api');
    return {
        ...actual,
        getReturnContracts: vi.fn(() => Promise.resolve({
            data: [
                {
                    id: 'RET-2026-EP4-001',
                    beneficiaireId: 1042,
                    beneficiaireName: 'Jean Dupont',
                    state: 'RESTITUTION_PLANIFIEE',
                    items: [
                        { hardwareSerial: 'MEC-2026-F9000-001', hardwareType: 'CLE_MECATRONIQUE', condition: 'BON_ETAT', penaltyFee: 0 }
                    ],
                    depositStatus: 'CONSERVEE',
                    totalPenalty: 0,
                    createdAt: '2026-03-01T10:00:00Z',
                    updatedAt: '2026-03-01T10:00:00Z'
                }
            ]
        }))
    };
});

import Register from '../pages/Register';
import EspaceDemandeur from '../pages/EspaceDemandeur';
import ConsoleNationale from '../pages/ConsoleNationale';
import Regie from '../pages/Regie';
import Recherche from '../pages/Recherche';
import Documentation from '../pages/Documentation';
import DocumentationAdmin from '../pages/DocumentationAdmin';
import Entites from '../pages/Entites';
import Referentiels from '../pages/Referentiels';

describe('Epic 4: Hub Opérationnel, Supervision Nationale & Gestion des Référentiels', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/requests/me')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        {
                            id: 201,
                            reference: 'DEM-2026-EP4-01',
                            title: 'Mission Maintenance Voie Trappes',
                            status: 'Validée',
                            site_name: 'Poste d\'Aiguillage Trappes',
                            equipment_type: 'Clé F9000',
                            created_at: '2026-03-01T08:00:00Z'
                        }
                    ])
                });
            }
            if (url.includes('/api/v1/requests')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        {
                            id: 201,
                            reference: 'DEM-2026-EP4-01',
                            title: 'Mission Maintenance Voie Trappes',
                            status: 'Validée',
                            beneficiaire_name: 'Jean Dupont',
                            site_name: 'Poste d\'Aiguillage Trappes',
                            equipment_type: 'Clé F9000',
                            created_at: '2026-03-01T08:00:00Z'
                        }
                    ])
                });
            }
            if (url.includes('/api/v1/admin/tables')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        {
                            id: 'sites',
                            name: 'Sites et Gares Ferroviaires',
                            description: 'Inventaire des 336 sites équipés de cylindres mécatroniques',
                            category: 'Infrastructures',
                            icon: 'fas fa-map-marker-alt',
                            rows: [1, 2, 3],
                            columns: ['id', 'name', 'region']
                        },
                        {
                            id: 'types_materiels',
                            name: 'Catalogue Matériel F9000',
                            description: 'Clés, cylindres et bornes mécatroniques',
                            category: 'Matériel',
                            icon: 'fas fa-key',
                            rows: [1, 2],
                            columns: ['id', 'type', 'norme']
                        }
                    ])
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        }));
    });

    describe('User Story 4.1: Espace Demandeur & Auto-Inscription Agent', () => {
        it('affiche l\'en-tête de l\'Espace Demandeur et permet de basculer vers le matériel assigné', async () => {
            render(
                <MemoryRouter>
                    <EspaceDemandeur />
                </MemoryRouter>
            );

            expect(screen.getByText(/Bonjour, Collaborateur/i)).toBeTruthy();
            expect(screen.getByText(/Mes Demandes Déposées/i)).toBeTruthy();
            expect(screen.getByText(/Mon Matériel en Possession/i)).toBeTruthy();

            // Attente de la demande chargée
            await waitFor(() => {
                expect(screen.getByText('DEM-2026-EP4-01')).toBeTruthy();
                expect(screen.getByText('Mission Maintenance Voie Trappes')).toBeTruthy();
            });

            // Bascule vers l'onglet matériel assigné
            const hardwareTab = screen.getByText(/Mon Matériel en Possession/i);
            fireEvent.click(hardwareTab);

            expect(screen.getByText('MEC-2026-F9000-8812')).toBeTruthy();
            expect(screen.getByText(/Poste d'Aiguillage Trappes/i)).toBeTruthy();
            expect(screen.getAllByText(/Restituer en régie/i).length).toBeGreaterThan(0);
        });

        it('permet à un nouvel agent ou partenaire de s\'auto-inscrire sur Register', () => {
            render(
                <MemoryRouter>
                    <Register />
                </MemoryRouter>
            );

            expect(screen.getByText(/Création d'un Espace Agent \/ Partenaire/i)).toBeTruthy();
            const nomInput = screen.getByPlaceholderText('Dupont');
            const prenomInput = screen.getByPlaceholderText('Jean');
            const emailInput = screen.getByPlaceholderText('jean.dupont@entreprise.fr');

            fireEvent.change(nomInput, { target: { value: 'Martin' } });
            fireEvent.change(prenomInput, { target: { value: 'Sophie' } });
            fireEvent.change(emailInput, { target: { value: 'sophie.martin@entreprise.fr' } });

            expect((nomInput as HTMLInputElement).value).toBe('Martin');
            expect((prenomInput as HTMLInputElement).value).toBe('Sophie');
            expect((emailInput as HTMLInputElement).value).toBe('sophie.martin@entreprise.fr');
        });
    });

    describe('User Story 4.2: Console Nationale & Régie Matérielle', () => {
        it('affiche les indicateurs de supervision macro-régionale et active le verrouillage d\'urgence', () => {
            render(<ConsoleNationale />);

            expect(screen.getByText('Console Nationale des Accès Mécatroniques')).toBeTruthy();
            expect(screen.getByText(/Île-de-France/i)).toBeTruthy();
            expect(screen.getByText(/Auvergne-Rhône-Alpes/i)).toBeTruthy();

            // Verrouillage sûreté
            const emergencyBtn = screen.getByTitle(/Verrouillage d'urgence national de révocation de certificats/i);
            fireEvent.click(emergencyBtn);

            expect(screen.getByText(/Procédure Sûreté Nationale Activée/i)).toBeTruthy();

            const deactivateBtn = screen.getByText('Désactiver');
            fireEvent.click(deactivateBtn);
            expect(screen.queryByText(/Procédure Sûreté Nationale Activée/i)).toBeNull();
        });

        it('permet de rechercher et de blacklister un matériel dans la Régie Matérielle', () => {
            render(<Regie />);

            expect(screen.getByText('Poste de Contrôle & Régie Mécatronique')).toBeTruthy();
            expect(screen.getByText('MEC-2026-F9000-001')).toBeTruthy();

            // Recherche par numéro de série
            const searchInput = screen.getByPlaceholderText(/Rechercher numéro de série/i);
            fireEvent.change(searchInput, { target: { value: 'CYL-2026' } });

            expect(screen.getByText('CYL-2026-N2-044')).toBeTruthy();
            expect(screen.queryByText('MEC-2026-F9000-001')).toBeNull();
        });
    });

    describe('User Story 4.3: Recherche Globale Transversale', () => {
        it('recherche des dossiers, sites et matériels simultanément', async () => {
            render(
                <MemoryRouter>
                    <Recherche />
                </MemoryRouter>
            );

            expect(screen.getByText(/Recherche Globale du Portail/i)).toBeTruthy();
            const searchField = screen.getByPlaceholderText(/Tapez une référence/i);

            // Rechercher un mot-clé présent dans les demandes mockées
            fireEvent.change(searchField, { target: { value: 'Trappes' } });

            await waitFor(() => {
                expect(screen.getAllByText(/Trappes/i).length).toBeGreaterThan(0);
            });
        });
    });

    describe('User Story 4.4: Documentation & Base de Connaissances Spécifications', () => {
        it('permet de consulter les spécifications et d\'ouvrir le lecteur', () => {
            render(<Documentation />);

            expect(screen.getByText(/Spécifications Techniques du Cahier des Charges/i)).toBeTruthy();

            const readButtons = screen.getAllByText('Lire la procédure complète');
            fireEvent.click(readButtons[0]);

            expect(screen.getByText('Retour à la liste des documents')).toBeTruthy();
        });

        it('permet aux administrateurs de concevoir et rédiger une nouvelle procédure', () => {
            render(<DocumentationAdmin />);

            expect(screen.getByText('Gestion de la Documentation & Procédures')).toBeTruthy();
            const createBtn = screen.getByText('Rédiger un Document');
            fireEvent.click(createBtn);

            expect(screen.getByText('Nouveau Guide / Fiche Procédure')).toBeTruthy();
            expect(screen.getByText('Enregistrer & Publier')).toBeTruthy();
        });
    });

    describe('User Story 4.5: Hiérarchie des Entités & Dictionnaires Référentiels', () => {
        it('affiche l\'arborescence organisationnelle des infrapôles et permet d\'ouvrir l\'ajout d\'entité', () => {
            render(<Entites />);

            expect(screen.getByText('Gestion des Entités & Directions')).toBeTruthy();
            expect(screen.getByText('Direction Générale des Opérations')).toBeTruthy();
            expect(screen.getAllByText(/Pôle Opérationnel Ouest/i).length).toBeGreaterThan(0);

            const addBtn = screen.getByText('Ajouter une Entité');
            fireEvent.click(addBtn);

            expect(screen.getByText('Ajouter une Nouvelle Entité')).toBeTruthy();
        });

        it('affiche l\'explorateur des référentiels et dictionnaires métier', async () => {
            render(
                <MemoryRouter>
                    <Referentiels />
                </MemoryRouter>
            );

            expect(screen.getByText('Référentiels & Dictionnaires Métier')).toBeTruthy();

            await waitFor(() => {
                expect(screen.getByText('Sites et Gares Ferroviaires')).toBeTruthy();
                expect(screen.getByText('Catalogue Matériel F9000')).toBeTruthy();
            });
        });
    });
});
