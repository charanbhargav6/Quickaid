require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const serviceAccount = require('./firebase-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const BUCKET_NAME = 'app_updates';
const APK_PATH = path.join(__dirname, '../app/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk');
const APP_DIR = path.join(__dirname, '../app');

async function deployUpdate() {
  const updateMessage = process.argv[2] || "A new version of QuickAid is available!";
  console.log(`Starting OTA deployment with message: "${updateMessage}"`);

  // 1. Build the APK
  console.log('\n--- 1. Building APK (arm64-v8a) ---');
  try {
    execSync('flutter build apk --split-per-abi', { cwd: APP_DIR, stdio: 'inherit' });
  } catch (error) {
    console.error("Failed to build APK", error);
    process.exit(1);
  }

  // 2. Ensure bucket exists
  console.log(`\n--- 2. Checking Supabase Bucket '${BUCKET_NAME}' ---`);
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw bucketError;
  if (!buckets.find(b => b.name === BUCKET_NAME)) {
    console.log(`Creating bucket ${BUCKET_NAME}...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    if (createError) throw createError;
  }

  // 3. Upload APK
  console.log('\n--- 3. Uploading APK to Supabase Storage ---');
  if (!fs.existsSync(APK_PATH)) {
    console.error("APK file not found at " + APK_PATH);
    process.exit(1);
  }
  const apkBuffer = fs.readFileSync(APK_PATH);
  // append timestamp to force cache bust
  const fileName = `app-release-${Date.now()}.apk`;
  const { data, error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, apkBuffer, {
    contentType: 'application/vnd.android.package-archive',
    upsert: true
  });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  const downloadUrl = publicUrlData.publicUrl;
  console.log(`APK uploaded successfully! Download URL: ${downloadUrl}`);

  // 4. Get FCM Tokens
  console.log('\n--- 4. Fetching FCM Tokens ---');
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('fcm_token').not('fcm_token', 'is', null);
  if (profileError) throw profileError;
  
  const tokens = profiles.map(p => p.fcm_token).filter(Boolean);
  if (tokens.length === 0) {
    console.log("No users with FCM tokens found. Deployment complete.");
    process.exit(0);
  }
  console.log(`Found ${tokens.length} tokens.`);

  // 5. Send Push Notification
  console.log('\n--- 5. Sending Push Notification ---');
  const message = {
    notification: {
      title: 'Update Available!',
      body: updateMessage,
    },
    data: {
      type: 'app_update',
      download_url: downloadUrl
    },
    tokens: tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`${response.successCount} messages sent successfully, ${response.failureCount} failed.`);
  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`Error sending to token ${tokens[idx]}: ${resp.error}`);
      }
    });
  }

  console.log('\n✅ Deployment Complete!');
}

deployUpdate().catch(console.error);
