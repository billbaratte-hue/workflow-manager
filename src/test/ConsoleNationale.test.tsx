import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConsoleNationale from '../pages/ConsoleNationale';

describe('User Story 4.2: ConsoleNationale Dashboard Component', () => {
    it('renders national console supervision header and regional metrics', () => {
        render(<ConsoleNationale />);
        expect(screen.getByText('Console Nationale des Accès Mécatroniques')).toBeTruthy();
        expect(screen.getByText(/Supervision Centrale/i)).toBeTruthy();
        expect(screen.getByText(/Île-de-France/i)).toBeTruthy();
        expect(screen.getByText(/Auvergne-Rhône-Alpes/i)).toBeTruthy();
    });

    it('toggles emergency lockdown mode when button clicked', () => {
        render(<ConsoleNationale />);
        const lockdownBtn = screen.getByTitle("Verrouillage d'urgence national de révocation de certificats");
        expect(lockdownBtn).toBeTruthy();
        expect(screen.getByText('Mesures Sûreté Urgence')).toBeTruthy();

        fireEvent.click(lockdownBtn);
        expect(screen.getByText('Procédure Sûreté Nationale Activée')).toBeTruthy();

        const deactivateBtn = screen.getByText('Désactiver');
        fireEvent.click(deactivateBtn);
        expect(screen.queryByText('Procédure Sûreté Nationale Activée')).toBeNull();
    });

    it('renders incident monitoring log entries', () => {
        render(<ConsoleNationale />);
        expect(screen.getByText(/Gare Saint-Lazare/i)).toBeTruthy();
        expect(screen.getByText('Perte Clé F9000')).toBeTruthy();
    });
});
