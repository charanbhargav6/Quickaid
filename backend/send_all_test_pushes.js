const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env file.");
  process.exit(1);
}

// 1. Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Initialize Firebase
let firebaseApp;
try {
  const serviceAccount = require('./firebase-service-account.json');
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase initialized successfully.");
} catch (err) {
  console.error("Failed to load firebase-service-account.json or initialize Firebase Admin SDK:");
  console.error(err.message);
  process.exit(1);
}

async function sendAllTestPushes() {
  console.log("Querying Supabase database for active profiles with FCM tokens...");
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, fcm_token')
    .not('fcm_token', 'is', null);

  if (error) {
    console.error("Error querying Supabase:", error);
    process.exit(1);
  }

  // Filter out empty strings or whitespaces just in case
  const activeProfiles = profiles.filter(p => p.fcm_token && p.fcm_token.trim().length > 0);

  if (activeProfiles.length === 0) {
    console.log("\n[ERROR] No FCM tokens found in your database profiles.");
    console.log("Please make sure you have:");
    console.log("1. Run the database migration script 'backend/push_notifications_schema.sql' in Supabase SQL editor.");
    console.log("2. Opened the Flutter app on an emulator/device, and logged in or registered as a user.");
    console.log("3. The app should automatically sync the FCM token to Supabase.");
    console.log("\nIf you want to manually run a push to a specific token, you can still run:");
    console.log("node test_push.js <YOUR_DEVICE_TOKEN>\n");
    return;
  }

  console.log(`\n[OK] Found ${activeProfiles.length} active device token(s) in the database!\n`);

  for (const profile of activeProfiles) {
    console.log(`Sending notification to user: ${profile.full_name || 'Unnamed'} (ID: ${profile.id}, Role: ${profile.role})`);
    console.log(`Token: ${profile.fcm_token.substring(0, 20)}...`);

    const message = {
      notification: {
        title: 'QuickAid Test Alert! ⚡',
        body: `Hey ${profile.full_name || 'there'}, push notifications are working successfully on your device!`
      },
      data: {
        route: '/earnings',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token: profile.fcm_token
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`[OK] Success! Notification sent to ${profile.full_name || 'User'}. Message ID: ${response}\n`);
    } catch (pushError) {
      console.error(`[ERROR] Failed to send push to ${profile.full_name || 'User'}:`, pushError.message);
      console.log("");
    }
  }
}

sendAllTestPushes();
