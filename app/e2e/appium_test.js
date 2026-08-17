const wdio = require('webdriverio');

// Appium & WebdriverIO Configuration for Flutter
const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:app': '../build/app/outputs/flutter-apk/app-debug.apk', // Path to your built APK
    'appium:appPackage': 'com.example.quickaid', // Replace with your actual app package
    'appium:appActivity': 'MainActivity',
    'appium:noReset': false,
  }
};

async function runTest() {
  console.log('Starting Appium Mobile Test...');
  let client;
  
  try {
    client = await wdio.remote(opts);
    console.log('✅ Connected to Appium server and launched QuickAid App.');

    // 1. Wait for the app to load and find the login button
    console.log('Waiting for the splash screen to finish...');
    await client.pause(3000); // Wait for splash

    // 2. Locate Email and Password fields
    // Note: In a real Flutter app without semantic labels, we use UIAutomator locators or accessibility IDs.
    // Ensure you have added `Semantics` widgets or `key` attributes in your Flutter code.
    const emailField = await client.$('android=new UiSelector().textContains("Email")');
    await emailField.waitForExist({ timeout: 5000 });
    await emailField.setValue('test_appium@example.com');
    console.log('✅ Entered test email.');

    const passwordField = await client.$('android=new UiSelector().textContains("Password")');
    await passwordField.setValue('password123');
    console.log('✅ Entered test password.');

    // 3. Click the Login Button
    const loginBtn = await client.$('android=new UiSelector().textContains("Sign In")');
    await loginBtn.click();
    console.log('✅ Clicked Sign In button.');

    // 4. Verify login failed modal/snackbar pops up
    const errorMsg = await client.$('android=new UiSelector().textContains("Failed")');
    await errorMsg.waitForExist({ timeout: 5000 });
    console.log('✅ Appium E2E Test Passed: Form submitted and error handled correctly on Mobile.');

  } catch (error) {
    console.error('❌ Appium Test Failed with error:');
    console.error(error.message);
  } finally {
    if (client) {
      console.log('Closing Appium session...');
      await client.deleteSession();
    }
  }
}

runTest();
