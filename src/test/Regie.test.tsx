import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../lib/api', () => ({
    getReturnContracts: vi.fn(() => Promise.resolve({ data: [] })),
    createReturnContract: vi.fn(() => Promise.resolve({ data: {} })),
    transitionReturnContract: vi.fn(() => Promise.resolve({ data: {} })),
    updateReturnContractStatus: vi.fn(() => Promise.resolve({ data: {} })),
}));

import Regie from '../pages/Regie';

describe('User Story 4.2: Regie & Control Room Component', () => {
    it('renders control room header and stock items', () => {
        render(<Regie />);
        expect(screen.getByText('Poste de Contrôle & Régie Mécatronique')).toBeTruthy();
        expect(screen.getByText(/Gestion des stocks de clés F9000/i)).toBeTruthy();
        expect(screen.getByText('MEC-2026-F9000-001')).toBeTruthy();
        expect(screen.getByText('CYL-2026-N2-044')).toBeTruthy();
    });

    it('filters hardware inventory by search term', () => {
        render(<Regie />);
        const searchInput = screen.getByPlaceholderText(/Rechercher numéro de série/i);

        fireEvent.change(searchInput, { target: { value: 'MOBI-12' } });

        expect(screen.getByText('BRN-2026-MOBI-12')).toBeTruthy();
        expect(screen.queryByText('MEC-2026-F9000-001')).toBeNull();
    });

    it('handles blacklisting / revocation of a lost key', () => {
        render(<Regie />);
        const blacklistBtns = screen.getAllByTitle(/Blacklister \/ Déclarer Perdu/i);

        fireEvent.click(blacklistBtns[0]);
        expect(screen.getByText(/a été immédiatement révoquée et inscrite sur la liste de révocation/i)).toBeTruthy();
    });
});
