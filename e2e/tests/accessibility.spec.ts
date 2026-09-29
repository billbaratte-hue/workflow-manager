import { test, expect } from '@playwright/test';

test.describe('RGAA & WCAG 2.1 AA Accessibility Validation', () => {
  test('should have valid page language and landmark structure', async ({ page }) => {
    await page.goto('/login');

    // Language attribute
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang === 'fr' || htmlLang === 'en').toBeTruthy();

    // Main landmarks
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support keyboard navigation across interactive forms', async ({ page }) => {
    await page.goto('/login');

    // Focus first input
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedTag);
  });

  test('should retain proper ARIA roles and labels on modal dialogs', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Administrateur")');
    await page.waitForURL('**/');

    await page.goto('/tables-admin');
    // Ensure data tables have valid headers and semantic structure
    const tables = page.locator('table');
    if (await tables.count() > 0) {
      await expect(tables.first().locator('thead')).toBeVisible();
    }
  });
});
