import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import EspaceDemandeur from '../pages/EspaceDemandeur';

describe('User Story 4.1: EspaceDemandeur Component', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: 101,
                        reference: 'DEM-2026-001',
                        title: 'Intervention Clé F9000 Montparnasse',
                        status: 'Validée',
                        site_name: 'Gare Montparnasse',
                        equipment_type: 'Clé F9000',
                        created_at: '2026-02-15T10:00:00Z'
                    }
                ])
            })
        ));
    });

    it('renders agent workspace header and default requests tab', async () => {
        render(
            <MemoryRouter>
                <EspaceDemandeur />
            </MemoryRouter>
        );

        expect(screen.getByText(/Bonjour, (Agent|Collaborateur)/i)).toBeTruthy();
        expect(screen.getByText(/Mes Demandes Déposées/i)).toBeTruthy();
        expect(screen.getByText(/Mon Matériel en Possession/i)).toBeTruthy();

        await waitFor(() => {
            expect(screen.getByText('DEM-2026-001')).toBeTruthy();
            expect(screen.getByText('Intervention Clé F9000 Montparnasse')).toBeTruthy();
            expect(screen.getByText('Bordereau PDF')).toBeTruthy();
        });
    });

    it('switches to assigned hardware tab when clicked', async () => {
        render(
            <MemoryRouter>
                <EspaceDemandeur />
            </MemoryRouter>
        );

        const hardwareTabBtn = screen.getByText(/Mon Matériel en Possession/i);
        fireEvent.click(hardwareTabBtn);

        expect(screen.getByText('MEC-2026-F9000-8812')).toBeTruthy();
        expect(screen.getByText(/Poste d'Aiguillage Trappes/i)).toBeTruthy();
    });
});
