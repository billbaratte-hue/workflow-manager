import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminNavigation, DEFAULT_ADMIN_NAV_ITEMS } from '../components/AdminNavigation';

describe('User Story 5.1: AdminNavigation Component', () => {
    it('renders admin navigation with all items', () => {
        render(<AdminNavigation currentPath="/admin/base-de-donnees" />);
        expect(screen.getByText('Administration du Portail')).toBeTruthy();
        expect(screen.getByText('Base de Données & Sauvegardes')).toBeTruthy();
        expect(screen.getByText('Tables Référentielles')).toBeTruthy();
        expect(screen.getByText('Concepteur Formulaires')).toBeTruthy();
    });

    it('filters modules based on search input', () => {
        render(<AdminNavigation />);
        const searchInput = screen.getByLabelText('Rechercher un module');

        fireEvent.change(searchInput, { target: { value: 'Sauvegardes' } });

        expect(screen.getByText('Base de Données & Sauvegardes')).toBeTruthy();
        expect(screen.queryByText('Tables Référentielles')).toBeNull();
    });

    it('triggers onNavigate callback when an item is clicked', () => {
        const handleNavigate = vi.fn();
        render(<AdminNavigation onNavigate={handleNavigate} />);

        const formulairesBtn = screen.getByText('Concepteur Formulaires');
        fireEvent.click(formulairesBtn);

        expect(handleNavigate).toHaveBeenCalledWith('/admin/formulaires');
    });

    it('marks current active path with aria-current="page"', () => {
        render(<AdminNavigation currentPath="/admin/statuts" />);
        const statutsBtn = screen.getByRole('button', { name: /Machine à États & Statuts/i });
        expect(statutsBtn.getAttribute('aria-current')).toBe('page');
    });
});
