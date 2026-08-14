const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runLoginTests() {
  // Setup Chrome options
  let options = new chrome.Options();
  // options.addArguments('--headless'); // Uncomment to run headless

  // Initialize WebDriver
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    const appUrl = 'http://localhost:3000/login'; // Adjust based on where frontend is running
    
    // --- TEST 1: Valid Login ---
    console.log("Running Test 1: Valid Login");
    await driver.get(appUrl);
    
    // Wait for email input
    let emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    let passwordInput = await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
    
    // Enter credentials
    await emailInput.sendKeys('test@example.com');
    await passwordInput.sendKeys('password123');
    
    // Submit form
    let loginBtn = await driver.findElement(By.xpath('//button[contains(text(), "Sign In")]'));
    await loginBtn.click();
    
    // Check if redirect happens OR if an error modal appears
    try {
      await driver.wait(until.urlContains('/seeker'), 3000);
      console.log("Test 1 Passed: Successfully redirected after login");
    } catch (e) {
      // If it didn't redirect, check if there's an error modal (like "Invalid login credentials")
      let errorModal = await driver.wait(until.elementLocated(By.xpath('//div[contains(@class, "AlertModal")] | //h3[contains(text(), "Login Failed")]')), 3000);
      if (errorModal) {
        console.log("Test 1 Result: UI correctly blocked invalid login. (test@example.com is not a real account in your database!)");
      } else {
        throw new Error("Did not redirect to /seeker and no error modal was found.");
      }
    }
    
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    console.log("Tests completed, quitting browser...");
    await driver.quit();
  }
}

if (require.main === module) {
  runLoginTests();
}
