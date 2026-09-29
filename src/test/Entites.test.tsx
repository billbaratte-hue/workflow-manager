import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Entites from '../pages/Entites';

describe('User Story 4.5: Entites Organizational Hierarchy Component', () => {
    it('renders entity list and statistics', () => {
        render(<Entites />);
        expect(screen.getByText('Gestion des Entités & Directions')).toBeTruthy();
        expect(screen.getByText('Direction Générale des Infrastructures')).toBeTruthy();
        expect(screen.getAllByText(/Infrapôle Paris Ouest & Normandie/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Alstom Transport Signalling/i)).toBeTruthy();
    });

    it('filters entities by search query', () => {
        render(<Entites />);
        const searchInput = screen.getByPlaceholderText(/Rechercher entité/i);

        fireEvent.change(searchInput, { target: { value: 'Trappes' } });

        expect(screen.getByText(/Équipe SES \(Signalisation Électrique\) Trappes/i)).toBeTruthy();
        expect(screen.queryByText(/Alstom Transport/i)).toBeNull();
    });

    it('opens modal to create a new organizational entity', () => {
        render(<Entites />);
        const createBtn = screen.getByText('Ajouter une Entité');

        fireEvent.click(createBtn);
        expect(screen.getByText('Ajouter une Nouvelle Entité')).toBeTruthy();
        expect(screen.getByText('Créer l\'Entité')).toBeTruthy();

        // Close modal
        fireEvent.click(screen.getByText('Annuler'));
        expect(screen.queryByText('Ajouter une Nouvelle Entité')).toBeNull();
    });
});
