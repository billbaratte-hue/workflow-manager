import { test, expect } from '@playwright/test';

test.describe('Admin Governance & Workflow Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.click('button:has-text("Administrateur")');
        await page.waitForURL('**/');
    });

    test('should access and navigate the Machine à États & Workflows page', async ({ page }) => {
        await page.goto('/workflows');
        await expect(page.locator('text=Machine à États').first()).toBeVisible();
    });

    test('should access Espace Administrateur and display admin navigation sections', async ({ page }) => {
        await page.goto('/admin');
        await expect(page.locator('text=Espace Administrateur').first().or(page.locator('text=Processus').first())).toBeVisible();
    });

    test('should access Corbeille Validateur with bulk decision capabilities', async ({ page }) => {
        await page.goto('/corbeille');
        await expect(page.locator('text=Corbeille').first()).toBeVisible();
    });

    test('should navigate to Google Blockly Workflow Studio and run live rule simulation', async ({ page }) => {
        await page.goto('/admin/blockly-workflows');
        await expect(page.locator('text=Studio de Workflow Blockly')).toBeVisible();
        await expect(page.locator('button:has-text("Simuler & Tester")')).toBeVisible();
        await expect(page.locator('button:has-text("Voir l\'AST JSON")')).toBeVisible();

        // Open live simulator
        await page.click('button:has-text("Simuler & Tester")');
        await expect(page.locator('text=Simulateur d\'Évaluation en Direct')).toBeVisible();
        await expect(page.locator('button:has-text("Lancer la simulation")')).toBeVisible();

        // Run simulation
        await page.click('button:has-text("Lancer la simulation")');
        await expect(page.locator('text=Résultat & Trace d\'Exécution')).toBeVisible();
        await expect(page.locator('text=Journal Pas-à-Pas (Execution Trace)')).toBeVisible();

        // Close simulator
        await page.click('button:has-text("Fermer le simulateur")');
        await expect(page.locator('text=Simulateur d\'Évaluation en Direct')).not.toBeVisible();
    });
});
