const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Go to login page
  console.log('Navigating to login...');
  await page.goto('http://localhost:3002/login');

  // 2. Login as admin
  console.log('Logging in...');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation();
  console.log('Current URL:', page.url());

  // 3. Go to admin dashboard explicitly
  console.log('Navigating to /admin/dashboard...');
  const response = await page.goto('http://localhost:3002/admin/dashboard');
  
  console.log('Status code:', response.status());

  // Wait a bit and check for errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  await page.waitForTimeout(2000);
  
  await browser.close();
})();
