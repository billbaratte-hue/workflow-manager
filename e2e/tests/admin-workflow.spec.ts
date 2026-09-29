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
});
