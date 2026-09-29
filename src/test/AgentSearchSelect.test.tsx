import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AgentSearchSelect, DEFAULT_MOCK_AGENTS } from '../components/AgentSearchSelect';

describe('User Story 5.1: AgentSearchSelect Component', () => {
    it('renders input with placeholder and label', () => {
        render(
            <AgentSearchSelect 
                onSelectAgent={vi.fn()} 
                label="Responsable de Site"
            />
        );

        expect(screen.getByText('Responsable de Site')).toBeTruthy();
        expect(screen.getByPlaceholderText(/Rechercher par nom, CP/i)).toBeTruthy();
    });

    it('filters agent list by name or CP', () => {
        render(<AgentSearchSelect onSelectAgent={vi.fn()} />);
        const input = screen.getByPlaceholderText(/Rechercher par nom, CP/i);

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'Bernard' } });

        expect(screen.getByText('Valérie Bernard')).toBeTruthy();
        expect(screen.queryByText('Jean Dupont')).toBeNull();
    });

    it('triggers onSelectAgent when an option is clicked', () => {
        const handleSelect = vi.fn();
        render(<AgentSearchSelect onSelectAgent={handleSelect} />);

        const input = screen.getByPlaceholderText(/Rechercher par nom, CP/i);
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'Martin' } });

        const option = screen.getByText('Marc Martin');
        fireEvent.click(option);

        expect(handleSelect).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Marc Martin', cp: 'CP99281' })
        );
    });

    it('displays selected agent badge and handles clearing selection', () => {
        const handleSelect = vi.fn();
        render(
            <AgentSearchSelect 
                selectedAgentId={101} 
                onSelectAgent={handleSelect} 
            />
        );

        expect(screen.getByText('Jean Dupont')).toBeTruthy();
        expect(screen.getByText('CP84920')).toBeTruthy();

        const clearBtn = screen.getByLabelText('Effacer la sélection');
        fireEvent.click(clearBtn);

        expect(handleSelect).toHaveBeenCalledWith(null);
    });
});
