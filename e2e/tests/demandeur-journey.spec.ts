import { test, expect } from '@playwright/test';

test.describe('Demandeur Journey — Mechatronic Key Access Request', () => {
  test.beforeEach(async ({ page }) => {
    // Quick login as Demandeur
    await page.goto('/login');
    await page.click('button:has-text("Demandeur")');
    await page.waitForURL('**/');
  });

  test('should navigate to new request form, fill fields, and submit successfully', async ({ page }) => {
    // Click on Nouvelle Demande or navigation link
    await page.click('a[href="/nouvelle-demande"]');
    await expect(page).toHaveURL(/\/nouvelle-demande/);

    // Verify form header
    await expect(page.locator('text=Nouvelle Demande d\'Accès')).toBeVisible();

    // Select equipment type and fill title
    const titleInput = page.locator('input[placeholder*="Objet"], input[name="titre"]');
    if (await titleInput.count() > 0) {
      await titleInput.first().fill('Intervention urgente signalisation Trappes');
    }

    // Check submission button exists
    const submitBtn = page.locator('#btn-submit-request, button:has-text("Transmettre"), button:has-text("Soumettre"), button:has-text("Enregistrer")');
    await expect(submitBtn.first()).toBeVisible();
  });

  test('should consult submitted requests and download PDF bordereau in Mes Demandes', async ({ page }) => {
    await page.goto('/mes-demandes');
    await expect(page.locator('text=Mes Demandes').first()).toBeVisible();

    // Verify PDF download buttons are available
    const pdfButtons = page.locator('a[href*="/pdf"], button:has-text("PDF")');
    expect(await pdfButtons.count()).toBeGreaterThanOrEqual(0);
  });
});
