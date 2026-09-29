import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Security (NIS 2)', () => {
  test('should display login page with preset demonstration profiles', async ({ page }) => {
    await page.goto('/login');

    // Validate branding and headers
    await expect(page.locator('text=Portail Opérationnel')).toBeVisible();
    await expect(page.locator('text=Portail Mécatronique')).toBeVisible();
    await expect(page.locator('text=Connexion SSO & Espace Habilités')).toBeVisible();

    // Check preset buttons
    await expect(page.locator('text=Administrateur')).toBeVisible();
    await expect(page.locator('text=Demandeur')).toBeVisible();
    await expect(page.locator('text=Manager N+1')).toBeVisible();
    await expect(page.locator('text=Validateur Site')).toBeVisible();
  });

  test('should authenticate successfully with valid agent credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials
    await page.fill('input[type="email"]', 'admin@entreprise.fr');
    await page.fill('input[type="password"]', 'Securite2026!');
    await page.click('button[type="submit"]');

    // Expect redirection to dashboard or portal catalogue
    await expect(page).toHaveURL(/\/(|admin|catalogue)/);
    await expect(page.locator('text=Admin Système')).toBeVisible();
  });

  test('should show error notification upon invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@entreprise.fr');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.text-red-700')).toBeVisible();
  });
});
