/**
 * @file src/test/RegistrationWorkflow.test.tsx
 * Comprehensive unit and workflow integration tests for Register.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';

describe('Workflow d\'Auto-Inscription & Habilitation Mécatronique (Register.tsx)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, options: any) => {
            if (url.includes('/api/v1/auth/register')) {
                const body = JSON.parse(options.body);
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        message: 'Compte créé avec succès.',
                        user: {
                            id: 999,
                            name: body.name,
                            email: body.email,
                            role: body.role,
                            attributes: body.attributes
                        },
                        token: 'mock-jwt-token-register'
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }));
    });

    it('affiche le formulaire sous forme de workflow multi-étapes avec progression', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        // En-tête et étapes du workflow
        expect(screen.getByText(/Création d'un Espace Agent \/ Partenaire/i)).toBeTruthy();
        expect(screen.getByText(/Étape 1 sur 4 : Identité & Contact/i)).toBeTruthy();
        expect(screen.getByText(/Progression : 25%/i)).toBeTruthy();
    });

    it('bloque le passage à l\'étape 2 si l\'identité n\'est pas renseignée', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        const continuerBtn = screen.getByText(/Continuer/i);
        fireEvent.click(continuerBtn);

        expect(screen.getByText(/Veuillez renseigner votre nom, prénom et adresse email professionnelle/i)).toBeTruthy();
    });

    it('permet de naviguer à travers les 4 étapes du workflow et de soumettre le dossier', async () => {
        const onRegisterSuccessMock = vi.fn();

        render(
            <MemoryRouter>
                <Register onRegisterSuccess={onRegisterSuccessMock} />
            </MemoryRouter>
        );

        // --- ÉTAPE 1 : Identité & Contact ---
        const prenomInput = screen.getByPlaceholderText('Jean');
        const nomInput = screen.getByPlaceholderText('Dupont');
        const emailInput = screen.getByPlaceholderText('jean.dupont@entreprise.fr');

        fireEvent.change(prenomInput, { target: { value: 'Thomas' } });
        fireEvent.change(nomInput, { target: { value: 'Bernard' } });
        fireEvent.change(emailInput, { target: { value: 'thomas.bernard@entreprise.fr' } });

        // Passage à l'Étape 2
        fireEvent.click(screen.getByText(/Continuer/i));

        // --- ÉTAPE 2 : Organisation & Affectation ---
        expect(screen.getByText(/Étape 2 sur 4 : Organisation & Territoire/i)).toBeTruthy();
        expect(screen.getByText(/Progression : 50%/i)).toBeTruthy();

        // Passage à l'Étape 3
        fireEvent.click(screen.getByText(/Continuer/i));

        // --- ÉTAPE 3 : Profil & Habilitations Mécatroniques ---
        expect(screen.getByText(/Étape 3 sur 4 : Habilitations Mécatroniques/i)).toBeTruthy();
        expect(screen.getByText(/Progression : 75%/i)).toBeTruthy();
        expect(screen.getByText(/Clé Mécatronique F9000/i)).toBeTruthy();

        // Passage à l'Étape 4
        fireEvent.click(screen.getByText(/Continuer/i));

        // --- ÉTAPE 4 : Sécurité SSI & Validation NIS 2 ---
        expect(screen.getByText(/Étape 4 sur 4 : Sécurité SSI & Validation NIS 2/i)).toBeTruthy();
        expect(screen.getByText(/Progression : 100%/i)).toBeTruthy();

        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'Securite2026!' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'Securite2026!' } });

        // Cocher la charte NIS 2
        const charteCheckbox = screen.getByTestId('accept-charte');
        fireEvent.click(charteCheckbox);

        // Soumission finale du workflow
        const submitBtn = screen.getByText(/Valider mon Inscription/i);
        fireEvent.submit(submitBtn.closest('form')!);

        // Attente de l'écran de succès avec le timeline
        await waitFor(() => {
            expect(screen.getByText(/Workflow d'Inscription Validé !/i)).toBeTruthy();
            expect(screen.getByText(/Dossier #WKF-REG-/i)).toBeTruthy();
            expect(screen.getByText(/Étapes du Workflow d'Activation Mécatronique/i)).toBeTruthy();
        });

        // Clic sur accès direct au portail
        const directAccessBtn = screen.getByText(/Accéder au Portail Opérationnel/i);
        fireEvent.click(directAccessBtn);

        expect(onRegisterSuccessMock).toHaveBeenCalledTimes(1);
    });
});
