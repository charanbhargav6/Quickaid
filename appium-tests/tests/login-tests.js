const { remote } = require('webdriverio');

async function runLoginTests() {
  const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Android Emulator', // Or physical device name
    'appium:app': '../app/build/app/outputs/flutter-apk/app-debug.apk', // Path to your built APK
    'appium:noReset': true,
  };

  const wdOpts = {
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'info',
    capabilities,
  };

  let driver;

  try {
    console.log("Connecting to Appium server...");
    driver = await remote(wdOpts);
    
    console.log("Running Test 1: Mobile App Login");

    // Note: In a real Flutter Appium test, you would use flutter-specific locators.
    // Example using accessibility id (Semantics in Flutter):
    const emailField = await driver.$('~email_input'); // Assumes Semantics(identifier: 'email_input')
    await emailField.waitForDisplayed({ timeout: 10000 });
    await emailField.setValue('test@example.com');
    
    const passwordField = await driver.$('~password_input');
    await passwordField.setValue('password123');

    const loginBtn = await driver.$('~login_button');
    await loginBtn.click();

    // Check for an error modal (like we did in the web test) or success dashboard
    try {
      const errorModal = await driver.$('~error_modal_title');
      await errorModal.waitForDisplayed({ timeout: 5000 });
      console.log("Test 1 Result: App correctly blocked invalid login. (test@example.com is not a real account in your database!)");
    } catch (e) {
      // If no error modal, check if we reached the dashboard
      const dashboard = await driver.$('~seeker_dashboard');
      await dashboard.waitForDisplayed({ timeout: 5000 });
      console.log("Test 1 Passed: Successfully logged into the app");
    }
    
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    if (driver) {
      console.log("Tests completed, closing Appium session...");
      await driver.deleteSession();
    }
  }
}

if (require.main === module) {
  runLoginTests();
}
