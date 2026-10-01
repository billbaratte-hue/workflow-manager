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

  test('should open forgot password modal and submit email recovery request', async ({ page }) => {
    await page.goto('/login');

    // Click "Mot de passe oublié ?"
    await page.click('button:has-text("Mot de passe oublié ?")');

    // Modal should be visible
    await expect(page.locator('text=Procédure sécurisée par email')).toBeVisible();

    // Fill email and submit
    await page.fill('input[placeholder="collaborateur@entreprise.fr"]', 'admin@entreprise.fr');
    await page.click('button:has-text("Envoyer le lien")');

    // Confirmation message should appear
    await expect(page.locator('text=Demande prise en compte')).toBeVisible();
    await expect(page.locator('button:has-text("Retour à la connexion")')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Retour à la connexion")');
    await expect(page.locator('text=Procédure sécurisée par email')).not.toBeVisible();
  });

  test('should render reset password page and show error if token is missing', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.locator('text=Lien invalide ou expiré')).toBeVisible();
    await expect(page.locator('text=Demander un nouveau lien / Connexion')).toBeVisible();
  });

  test('should toggle language dynamically between French and English', async ({ page }) => {
    await page.goto('/login');

    // Default is French
    await expect(page.locator('text=Portail Mécatronique')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Se connecter');

    // Switch to English
    await page.click('button[data-testid="lang-btn-en"]');
    await expect(page.locator('text=Mechatronic Portal')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign in');
    await expect(page.locator('text=1-Click Quick Login (Demo Profiles):')).toBeVisible();

    // Switch back to French
    await page.click('button[data-testid="lang-btn-fr"]');
    await expect(page.locator('text=Portail Mécatronique')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Se connecter');
  });
});
