const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest() {
  // Set up headless Chrome
  let options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  console.log('Starting Selenium Web Test...');
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // 1. Navigate to the login page
    console.log('Navigating to http://localhost:3000/login...');
    await driver.get('http://localhost:3000/login');

    // 2. Verify Page Title or Header
    await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Welcome Back')]")), 5000);
    console.log('✅ Login page loaded successfully.');

    // 3. Find input fields and enter dummy credentials
    console.log('Entering test credentials...');
    let emailInput = await driver.findElement(By.xpath("//input[@type='email']"));
    await emailInput.sendKeys('test_selenium@example.com');

    let passwordInput = await driver.findElement(By.xpath("//input[@type='password']"));
    await passwordInput.sendKeys('password123');

    // 4. Click Sign In
    console.log('Clicking Sign In button...');
    let submitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));
    await submitBtn.click();

    // 5. Wait for the AlertModal to appear showing "Login Failed" or "Invalid login credentials"
    console.log('Waiting for authentication response...');
    
    // We expect the alert modal to pop up with an error since this user doesn't exist
    let modalTitle = await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Login Failed')]")), 10000);
    let titleText = await modalTitle.getText();
    
    if (titleText.includes('Login Failed')) {
      console.log('✅ Selenium E2E Test Passed: Form submitted and error handled correctly.');
    } else {
      console.error('❌ Test Failed: Unexpected modal title:', titleText);
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('❌ Selenium Test Failed with error:');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    // Quit the driver
    console.log('Closing browser...');
    await driver.quit();
  }
}

runTest();
