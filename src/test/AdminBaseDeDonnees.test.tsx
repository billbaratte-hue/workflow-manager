import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminBaseDeDonnees from '../pages/AdminBaseDeDonnees';

// Mock fetch
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            {
                filename: 'backup_portal_2026-09-24.json',
                filePath: '/app/applet/backups/backup_portal_2026-09-24.json',
                size: 20480,
                createdAt: new Date().toISOString()
            }
        ])
    } as Response)
);

describe('AdminBaseDeDonnees Component (Epic 1)', () => {
    it('renders database management title and action buttons', async () => {
        render(
            <BrowserRouter>
                <AdminBaseDeDonnees />
            </BrowserRouter>
        );

        expect(screen.getByText(/Gestion & Sauvegardes Base de Données/i)).toBeTruthy();
        expect(screen.getAllByText(/Nouvelle Sauvegarde Immédiate/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Réinitialiser Processus Standards/i)).toBeTruthy();
    });

    it('renders the database technology engine card', async () => {
        render(
            <BrowserRouter>
                <AdminBaseDeDonnees />
            </BrowserRouter>
        );

        expect(screen.getByText(/SQLite WAL \/ PostgreSQL/i)).toBeTruthy();
        expect(screen.getByText(/Moteur de Données/i)).toBeTruthy();
    });
});
