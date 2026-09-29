import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DocumentationAdmin from '../pages/DocumentationAdmin';

describe('User Story 4.4: DocumentationAdmin Component', () => {
    it('renders admin documentation management header and list', () => {
        render(<DocumentationAdmin />);
        expect(screen.getByText('Gestion de la Documentation & Procédures')).toBeTruthy();
        expect(screen.getByText(/Spécifications Techniques du Cahier des Charges/i)).toBeTruthy();
        expect(screen.getByText('Rédiger un Document')).toBeTruthy();
    });

    it('opens create new document form when button is clicked', () => {
        render(<DocumentationAdmin />);
        const newBtn = screen.getByText('Rédiger un Document');

        fireEvent.click(newBtn);

        expect(screen.getByText('Nouveau Guide / Fiche Procédure')).toBeTruthy();
        expect(screen.getByText('Enregistrer & Publier')).toBeTruthy();

        // Cancel
        fireEvent.click(screen.getByText('Annuler'));
        expect(screen.queryByText('Nouveau Guide / Fiche Procédure')).toBeNull();
    });
});
