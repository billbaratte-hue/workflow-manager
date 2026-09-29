import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Referentiels from '../pages/Referentiels';

describe('User Story 4.5: Referentiels Master Data Component', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: 'sites',
                        name: 'Sites et Gares Ferroviaires',
                        description: 'Inventaire des 336 sites équipés de cylindres mécatroniques',
                        category: 'Infrastructures',
                        rows: [1, 2, 3],
                        columns: ['id', 'name', 'region']
                    }
                ])
            })
        ));
    });

    it('renders referential lookup header and cards', async () => {
        render(
            <MemoryRouter>
                <Referentiels />
            </MemoryRouter>
        );

        expect(screen.getByText('Référentiels & Dictionnaires Métier')).toBeTruthy();
        expect(screen.getByPlaceholderText(/Rechercher un référentiel/i)).toBeTruthy();

        await waitFor(() => {
            expect(screen.getByText('Sites et Gares Ferroviaires')).toBeTruthy();
            expect(screen.getByText(/Inventaire des 336 sites équipés/i)).toBeTruthy();
        });
    });
});
