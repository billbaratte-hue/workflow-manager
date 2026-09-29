/**
 * @file src/test/AdminPasswordAccessSettings.test.tsx
 * Tests for the Password Access Settings and Data Retention Administration tab (NIS 2 / RGPD).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminSecuriteMotsDePasse from '../pages/AdminSecuriteMotsDePasse';

describe('AdminSecuriteMotsDePasse - Access Settings & Retention Tab', () => {
    beforeEach(() => {
        vi.restoreAllMocks();

        // Mock window.fetch for settings and retention API
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init?: any) => {
            if (url.includes('/api/v1/admin/settings/password_access_policy') && init?.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, key: 'password_access_policy' })
                });
            }

            if (url.includes('/api/v1/admin/settings/data_retention_policy') && init?.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, key: 'data_retention_policy' })
                });
            }

            if (url.includes('/api/v1/admin/settings')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [
                        {
                            key: 'password_access_policy',
                            parsed_value: {
                                password_min_length: 5,
                                password_max_length: 15,
                                uppercase_required: true,
                                lowercase_required: true,
                                special_char_required: true,
                                number_required: true,
                                login_attempts_limit: 5,
                                password_validity_days: 120,
                                password_recovery: true,
                                password_recovery_link_validity_days: 4,
                                enforce_password_history: 1
                            }
                        },
                        {
                            key: 'data_retention_policy',
                            parsed_value: {
                                rejected_dossiers_retention_days: 180,
                                completed_dossiers_retention_days: 1095,
                                audit_logs_retention_days: 365,
                                inactive_accounts_retention_days: 730,
                                anonymize_only: true,
                                auto_schedule_enabled: true
                            }
                        }
                    ]
                });
            }

            if (url.includes('/api/v1/admin/retention/status')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        policy: {
                            rejected_dossiers_retention_days: 180,
                            completed_dossiers_retention_days: 1095,
                            audit_logs_retention_days: 365,
                            inactive_accounts_retention_days: 730,
                            anonymize_only: true,
                            auto_schedule_enabled: true
                        },
                        lastReport: null
                    })
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({})
            });
        }));
    });

    it('renders the 11 password access settings criteria with correct labels and default values', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/securite-mots-de-passe']}>
                <AdminSecuriteMotsDePasse />
            </MemoryRouter>
        );

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByText(/Paramètres de Complexité & Sécurité des Comptes/i)).toBeTruthy();
        });

        // 1. Password minimum length (5)
        const minLen = screen.getByLabelText(/Password minimum length/i) as HTMLInputElement;
        expect(Number(minLen.value)).toBe(5);

        // 2. Password maximum length (15)
        const maxLen = screen.getByLabelText(/Password maximum length/i) as HTMLInputElement;
        expect(Number(maxLen.value)).toBe(15);

        // 3. Upper case char required (Yes)
        const upper = screen.getByLabelText(/Upper case char required/i) as HTMLSelectElement;
        expect(upper.value).toBe('Yes');

        // 4. Lower case char required (Yes)
        const lower = screen.getByLabelText(/Lower case char required/i) as HTMLSelectElement;
        expect(lower.value).toBe('Yes');

        // 5. Special char required (Yes)
        const special = screen.getByLabelText(/Special char required/i) as HTMLSelectElement;
        expect(special.value).toBe('Yes');

        // 6. Number required (Yes)
        const num = screen.getByLabelText(/Number required/i) as HTMLSelectElement;
        expect(num.value).toBe('Yes');

        // 7. Login attempts limit (5)
        const attempts = screen.getByLabelText(/Login attempts limit/i) as HTMLInputElement;
        expect(Number(attempts.value)).toBe(5);

        // 8. Password validity (days) (120)
        const validity = screen.getByLabelText(/Password validity \(days\)/i) as HTMLInputElement;
        expect(Number(validity.value)).toBe(120);

        // 9. Password recovery (Yes)
        const recovery = screen.getByLabelText(/^Password recovery$/i) as HTMLSelectElement;
        expect(recovery.value).toBe('Yes');

        // 10. Password recovery link validity (days) (4)
        const recLink = screen.getByLabelText(/Password recovery link validity \(days\)/i) as HTMLInputElement;
        expect(Number(recLink.value)).toBe(4);

        // 11. Enforce Password History (1)
        const history = screen.getByLabelText(/Enforce Password History/i) as HTMLInputElement;
        expect(Number(history.value)).toBe(1);
    });

    it('allows updating password access policy and submits to settings API', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/securite-mots-de-passe']}>
                <AdminSecuriteMotsDePasse />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Password minimum length/i)).toBeTruthy();
        });

        const minLenInput = screen.getByLabelText(/Password minimum length/i) as HTMLInputElement;
        fireEvent.change(minLenInput, { target: { value: '8' } });
        expect(Number(minLenInput.value)).toBe(8);

        const saveBtn = screen.getByTestId('save-password-settings');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/admin/settings/password_access_policy'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('"password_min_length":8')
                })
            );
        });
    });

    it('interactively validates password strength against the active policy', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/securite-mots-de-passe']}>
                <AdminSecuriteMotsDePasse />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Ex: Securite2026!/i)).toBeTruthy();
        });

        const testInput = screen.getByPlaceholderText(/Ex: Securite2026!/i);

        // Invalid password: too short and missing uppercase/special
        fireEvent.change(testInput, { target: { value: 'abc' } });
        expect(screen.getByText(/Mot de passe non conforme à la politique/i)).toBeTruthy();

        // Valid password: length 13, contains uppercase, lowercase, digit, special
        fireEvent.change(testInput, { target: { value: 'Securite2026!' } });
        expect(screen.getByText(/Mot de passe valide et conforme !/i)).toBeTruthy();
    });

    it('allows switching to the Data Retention tab and choosing retention presets', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/securite-mots-de-passe']}>
                <AdminSecuriteMotsDePasse />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('tab-retention')).toBeTruthy();
        });

        // Switch to Retention tab
        fireEvent.click(screen.getByTestId('tab-retention'));

        expect(screen.getByText(/Configuration des Délais de Rétention & Purge RGPD/i)).toBeTruthy();
        expect(screen.getByLabelText(/Rétention dossiers refusés \/ annulés/i)).toBeTruthy();
        expect(screen.getByLabelText(/Rétention dossiers clôturés \/ validés/i)).toBeTruthy();
        expect(screen.getByLabelText(/Conservation des journaux Syslog/i)).toBeTruthy();
        expect(screen.getByLabelText(/Comptes utilisateurs inactifs/i)).toBeTruthy();

        // Test clicking preset button "30j (1m)" for rejected dossiers
        const preset30j = screen.getByText('30j (1m)');
        fireEvent.click(preset30j);

        const rejectedInput = screen.getByTestId('retention-rejected-days') as HTMLInputElement;
        expect(Number(rejectedInput.value)).toBe(30);

        // Test clicking preset button "1825j (5 ans)" for completed dossiers
        const preset5ans = screen.getByText('1825j (5 ans)');
        fireEvent.click(preset5ans);

        const completedInput = screen.getByTestId('retention-completed-days') as HTMLInputElement;
        expect(Number(completedInput.value)).toBe(1825);

        // Submit retention form
        const saveRetentionBtn = screen.getByTestId('save-retention-settings');
        fireEvent.click(saveRetentionBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/admin/settings/data_retention_policy'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('"rejected_dossiers_retention_days":30')
                })
            );
        });
    });

    it('opens directly to retention tab when tab=retention query parameter is passed', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/securite-mots-de-passe?tab=retention']}>
                <AdminSecuriteMotsDePasse />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Configuration des Délais de Rétention & Purge RGPD/i)).toBeTruthy();
        });
    });
});
