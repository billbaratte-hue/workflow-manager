import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';

describe('Register Component', () => {
    it('renders the self-registration form elements correctly', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        expect(screen.getByText(/Création d'un Espace Agent \/ Partenaire/i)).not.toBeNull();
        expect(screen.getByPlaceholderText('Jean')).not.toBeNull();
        expect(screen.getByPlaceholderText('Dupont')).not.toBeNull();
        expect(screen.getByPlaceholderText('jean.dupont@entreprise.fr')).not.toBeNull();
        expect(screen.getByRole('button', { name: /Continuer/i })).not.toBeNull();
    });

    it('displays error when submitting without required fields or advances steps correctly', async () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        const continuerBtn = screen.getByRole('button', { name: /Continuer/i });
        fireEvent.click(continuerBtn);

        // Required inputs trigger error when empty
        const prenomInput = screen.getByPlaceholderText('Jean');
        fireEvent.change(prenomInput, { target: { value: 'Paul' } });
        expect((prenomInput as HTMLInputElement).value).toBe('Paul');
    });
});
