/**
 * @file e2e/tests/generative-ai.spec.ts
 * End-to-End Tests for Generative AI Assistant & Copilot (Gemini 3.8 Flash).
 * Validates conversational chat, mechatronic norms EN 15864 / EN 16864,
 * risk assessment sandbox, justification drafter, and workflow generator.
 */

import { test, expect } from '@playwright/test';

test.describe.skip('Generative AI Assistant & Mechatronic Copilot (Gemini 3.8 Flash)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.click('button:has-text("Administrateur")');
        await expect(page.locator('text=Admin Système')).toBeVisible();
    });

    test('should display Assistant IA navigation tab and render assistant header with model status', async ({ page }) => {
        // Navigate to Assistant IA via navigation tab
        const assistantTab = page.locator('a[href="/assistant-ia"]');
        await expect(assistantTab).toBeVisible();
        await assistantTab.click();
        await expect(page).toHaveURL(/\/assistant-ia/);

        // Verify branding and model indicator
        await expect(page.locator('text=Assistant IA & Copilote Mécatronique')).toBeVisible();
        await expect(page.locator('text=Intelligence Artificielle Générative')).toBeVisible();
        await expect(page.locator('text=gemini-3.8-flash').or(page.locator('text=sovereign-heuristic-v1')).first()).toBeVisible();

        // Verify quick prompt cards
        await expect(page.locator('text=Norme EN 15864').first()).toBeVisible();
        await expect(page.locator('text=Perte / Vol E123').first()).toBeVisible();
        await expect(page.locator('text=Habilitations H0B0 / B1V').first()).toBeVisible();
        await expect(page.locator('text=Cybersécurité NIS 2').first()).toBeVisible();
    });

    test('should allow conversational chat and render mechatronic compliance response', async ({ page }) => {
        await page.goto('/assistant-ia');

        // Type a question in the chat input
        const chatInput = page.locator('#ai-chat-input');
        await chatInput.fill('Quelles sont les exigences de la norme EN 15864 ?');

        // Click send
        await page.click('#ai-chat-send');

        // Expect response from Gemini / Sovereign Engine
        await expect(page.locator('text=EN 15864').first()).toBeVisible({ timeout: 15000 });

        // Expect action buttons on the response
        await expect(page.locator('button:has-text("Copier")').first()).toBeVisible();
        await expect(page.locator('button:has-text("Insérer dans demande")').first()).toBeVisible();
    });

    test('should evaluate mechatronic request risks in the analyzer sandbox', async ({ page }) => {
        await page.goto('/assistant-ia');

        // Switch to tab "Analyseur de Risque & Conformité"
        await page.click('button:has-text("Analyseur de Risque")');
        await expect(page.locator('text=Paramètres de la Demande à Analyser')).toBeVisible();

        // Run analysis
        await page.click('#btn-run-analysis');

        // Verify analysis report
        await expect(page.locator('text=Rapport d\'Évaluation de Sécurité')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Points Clés de Sécurité')).toBeVisible();
        await expect(page.locator('text=Recommandation au Validateur')).toBeVisible();
    });

    test('should draft technical justification and navigate to Nouvelle Demande', async ({ page }) => {
        await page.goto('/assistant-ia');

        // Switch to tab "Rédacteur de Justification"
        await page.click('button:has-text("Rédacteur de Justification")');
        await expect(page.locator('text=Paramètres de Rédaction Assistée')).toBeVisible();

        // Click generate justification
        await page.click('#btn-run-draft');

        // Expect generated justification text
        await expect(page.locator('text=Texte Justificatif Recommandé')).toBeVisible({ timeout: 15000 });

        // Click "Créer la Demande"
        await page.click('button:has-text("Créer la Demande")');
        await expect(page).toHaveURL(/\/nouvelle-demande/);
    });

    test('should model custom mechatronic workflow from natural language specification', async ({ page }) => {
        await page.goto('/assistant-ia');

        // Switch to tab "Générateur de Workflows"
        await page.click('button:has-text("Générateur de Workflows")');
        await expect(page.locator('text=Générateur de Processus par IA')).toBeVisible();

        // Click model workflow
        await page.click('#btn-run-workflow');

        // Expect modeled stages
        await expect(page.locator('text=Étapes Séquentielles Modélisées')).toBeVisible({ timeout: 15000 });
    });

    test('should open and interact with the floating AI Copilot widget on any page', async ({ page }) => {
        await page.goto('/');

        // Click floating trigger button
        const widgetToggle = page.locator('#btn-toggle-ai-copilot');
        await expect(widgetToggle).toBeVisible();
        await widgetToggle.click();

        // Expect drawer to open
        const drawer = page.locator('#ai-copilot-drawer');
        await expect(drawer).toBeVisible();
        await expect(drawer.locator('text=Copilote IA Mécatronique')).toBeVisible();

        // Type quick query
        const drawerInput = drawer.locator('input[placeholder="Votre question..."]');
        await drawerInput.fill('Habilitation H0B0');
        await drawer.locator('button[aria-label="Envoyer le message"]').click();

        // Expect reply in drawer
        await expect(drawer.locator('text=H0B0').first()).toBeVisible({ timeout: 15000 });

        // Close drawer
        await drawer.locator('button[aria-label="Fermer le copilote IA"]').click();
        await expect(drawer).not.toBeVisible();
    });
});
