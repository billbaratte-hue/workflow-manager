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

    await browser.close();
    console.log('Screenshots captured successfully!');
    process.exit(0);
}

capture().catch(err => {
    console.error('Error capturing screenshots:', err);
    process.exit(1);
});
