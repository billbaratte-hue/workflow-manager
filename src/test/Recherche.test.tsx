import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Recherche from '../pages/Recherche';

describe('Recherche Page Component', () => {
    it('renders global search bar with suggestions when query is empty', () => {
        render(
            <MemoryRouter>
                <Recherche />
            </MemoryRouter>
        );

        expect(screen.getByText(/Recherche Globale du Portail/i)).not.toBeNull();
        expect(screen.getByText(/Suggestions de recherche/i)).not.toBeNull();
        expect(screen.getByPlaceholderText(/Tapez une référence/i)).not.toBeNull();
    });

    it('updates query when user types into the search field', () => {
        render(
            <MemoryRouter>
                <Recherche />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText(/Tapez une référence/i) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Trappes' } });
        expect(input.value).toBe('Trappes');
    });
});
