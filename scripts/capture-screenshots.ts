import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function capture() {
    const artifactDir = 'C:\\Users\\gbara\\.gemini\\antigravity\\brain\\9dd6865c-f7d0-4409-a1bc-88b28ddfd907';
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // 1. Capture Login
    console.log('Capturing Login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_login.png') });

    // 2. Login as Administrateur
    console.log('Logging in as Administrateur...');
    await page.click('button:has-text("Administrateur")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 3. Capture Catalogue
    console.log('Capturing Catalogue...');
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_catalogue.png') });

    // 4. Capture Workflows
    console.log('Capturing Workflows page...');
    await page.goto('http://localhost:3000/workflows');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_workflows.png') });

    // 5. Capture Corbeille Validateur
    console.log('Capturing Corbeille...');
    await page.goto('http://localhost:3000/corbeille');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_corbeille.png') });

    // 6. Capture Espace Administrateur
    console.log('Capturing Admin...');
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_admin.png') });

    // 7. Capture Mot de passe oublié (Modal)
    console.log('Capturing Mot de passe oublié...');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Mot de passe oublié ?")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_forgot_password.png') });

    // 8. Capture Page Réinitialisation avec token
    console.log('Capturing Reset Password...');
    const { passwordResetRepository } = await import('../server/repositories/password-reset.repository.js');
    const { token } = await passwordResetRepository.createToken('admin@entreprise.fr', 60);
    await page.goto(`http://localhost:3000/reset-password?token=${token}&email=admin%40entreprise.fr`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="••••••••••••"]', 'Securite2026!');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_reset_password.png') });

    await browser.close();
    console.log('Screenshots captured successfully!');
    process.exit(0);
}

capture().catch(err => {
    console.error('Error capturing screenshots:', err);
    process.exit(1);
});
