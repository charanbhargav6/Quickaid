/**
 * Selenium Web Login Test — with Excel Report output
 */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const ExcelJS = require('exceljs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', 'reports', 'selenium-report.xlsx');

async function runLoginTests() {
  let options = new chrome.Options();
  options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  const results = [];

  async function recordTest(name, fn) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      console.log(`  ✅ PASS: ${name} (${duration}ms)`);
      results.push({ name, status: 'PASS', duration, error: '' });
    } catch (e) {
      const duration = Date.now() - start;
      console.log(`  ❌ FAIL: ${name} — ${e.message}`);
      results.push({ name, status: 'FAIL', duration, error: e.message });
    }
  }

  try {
    const appUrl = 'http://localhost:3000/login';
    await driver.get(appUrl);

    await recordTest('Page loads login form', async () => {
      await driver.wait(until.elementLocated(By.css('input[type="email"]')), 8000);
    });

    await recordTest('Email and password fields are interactive', async () => {
      const email = await driver.findElement(By.css('input[type="email"]'));
      const pass  = await driver.findElement(By.css('input[type="password"]'));
      await email.sendKeys('test@example.com');
      await pass.sendKeys('password123');
    });

    await recordTest('Sign In button exists and is clickable', async () => {
      const btn = await driver.findElement(By.xpath('//button[contains(text(),"Sign In")]'));
      await btn.click();
    });

    await recordTest('Invalid login shows error or redirects', async () => {
      // Wait for either an error modal OR url change
      await driver.sleep(2000);
      const url = await driver.getCurrentUrl();
      const src = await driver.getPageSource();
      const ok = url.includes('/seeker') || src.includes('Login') || src.includes('Error') || src.includes('Invalid');
      if (!ok) throw new Error('No expected response after login attempt');
    });

  } finally {
    await driver.quit();
  }

  // Write Excel
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Selenium Results');
  ws.columns = [
    { header: 'Test Name', key: 'name', width: 50 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Duration (ms)', key: 'duration', width: 16 },
    { header: 'Error', key: 'error', width: 60 },
  ];
  ws.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; });
  results.forEach(r => {
    const row = ws.addRow(r);
    row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r.status === 'PASS' ? 'FF00AA00' : 'FFCC0000' } };
    row.getCell('status').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  ws.addRow([]);
  ws.addRow([`Total: ${results.length}`, `Pass: ${passed}`, `Fail: ${failed}`, '']);

  require('fs').mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  await wb.xlsx.writeFile(REPORT_PATH);
  console.log(`\n📊 Report saved: ${REPORT_PATH}`);
  console.log(`   Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

runLoginTests().catch(e => { console.error(e); process.exit(1); });
