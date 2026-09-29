import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AlertBanner from '../components/AlertBanner';

// Mock API call for operational alerts
vi.mock('../lib/api', () => ({
    getOperationalAlerts: vi.fn(() => Promise.resolve({ data: [] }))
}));

describe('AlertBanner Component', () => {
    it('renders without crashing when user is provided', () => {
        const mockUser = { id: 1, name: 'Daniel Dupont', role: 'Demandeur' };
        const { container } = render(
            <BrowserRouter>
                <AlertBanner user={mockUser} />
            </BrowserRouter>
        );

        expect(container).toBeTruthy();
    });

    it('returns empty container when no alerts are present', () => {
        const mockUser = { id: 2, name: 'Admin', role: 'Administrateur' };
        const { container } = render(
            <BrowserRouter>
                <AlertBanner user={mockUser} />
            </BrowserRouter>
        );

        expect(container.firstChild).toBeNull();
    });
});
