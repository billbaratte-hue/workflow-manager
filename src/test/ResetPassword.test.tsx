import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '../pages/ResetPassword';
import Login from '../pages/Login';
import * as api from '../lib/api';

describe('Password Recovery Frontend Components', () => {
    it('affiche une erreur quand les paramètres de token et email sont absents', () => {
        render(
            <MemoryRouter initialEntries={['/reset-password']}>
                <ResetPassword />
            </MemoryRouter>
        );

        expect(screen.getByText(/Lien invalide ou expiré/i)).not.toBeNull();
        expect(screen.getByText(/Le lien de réinitialisation est incomplet/i)).not.toBeNull();
    });

    it('affiche le formulaire de réinitialisation si le jeton est valide', async () => {
        vi.spyOn(api, 'verifyResetToken').mockResolvedValueOnce({
            data: { valid: true, email: 'agent@entreprise.fr' }
        } as any);

        render(
            <MemoryRouter initialEntries={['/reset-password?token=mock_token_123&email=agent@entreprise.fr']}>
                <ResetPassword />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Nouveau Mot de Passe')).not.toBeNull();
            expect(screen.getByText('agent@entreprise.fr')).not.toBeNull();
            expect(screen.getByRole('button', { name: /Confirmer le mot de passe/i })).not.toBeNull();
        });
    });

    it('affiche le bouton "Mot de passe oublié ?" sur la page de connexion et ouvre la modale', () => {
        const onLoginSuccess = vi.fn();
        render(
            <MemoryRouter>
                <Login onLoginSuccess={onLoginSuccess} />
            </MemoryRouter>
        );

        const forgotBtn = screen.getByRole('button', { name: /Mot de passe oublié \?/i });
        expect(forgotBtn).not.toBeNull();

        fireEvent.click(forgotBtn);

        // La modale doit s'ouvrir
        expect(screen.getByText('Procédure sécurisée par email')).not.toBeNull();
        expect(screen.getByRole('button', { name: /Envoyer le lien/i })).not.toBeNull();
    });
});
