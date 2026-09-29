import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Documentation from '../pages/Documentation';

describe('User Story 4.4: Documentation Knowledge Base Component', () => {
    it('renders documentation library and articles', () => {
        render(<Documentation />);
        expect(screen.getByText('Documentation & Procédures Mécatroniques')).toBeTruthy();
        expect(screen.getByText(/Spécifications Techniques du Cahier des Charges/i)).toBeTruthy();
        expect(screen.getByText(/Procédure Générale de Demande de Clé Mécatronique F9000/i)).toBeTruthy();
    });

    it('filters articles by search input', () => {
        render(<Documentation />);
        const searchInput = screen.getByPlaceholderText(/Rechercher une procédure/i);

        fireEvent.change(searchInput, { target: { value: 'Spécifications' } });

        expect(screen.getByText(/Spécifications Techniques du Cahier des Charges/i)).toBeTruthy();
        expect(screen.queryByText(/Procédure Générale de Demande de Clé/i)).toBeNull();
    });

    it('opens and closes article reader view on click', () => {
        render(<Documentation />);
        const readBtns = screen.getAllByText('Lire la procédure complète');

        fireEvent.click(readBtns[0]);
        expect(screen.getByText('Retour à la liste des documents')).toBeTruthy();

        fireEvent.click(screen.getByText('Retour à la liste des documents'));
        expect(screen.queryByText('Retour à la liste des documents')).toBeNull();
    });
});
