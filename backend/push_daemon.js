require('dotenv').config({ path: '../frontend/.env.local' });
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Load Firebase Service Account
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account.json');
} catch (e) {
  console.error("❌ Failed to load firebase-service-account.json. Please make sure it exists in the backend directory.");
  process.exit(1);
}

// Initialize Firebase Admin
let isFirebaseConfigured = false;

if (serviceAccount.project_id === "your-firebase-project-id" || !serviceAccount.private_key || serviceAccount.private_key.includes("YOUR_PRIVATE_KEY_HERE")) {
  console.log("⚠️ WARNING: firebase-service-account.json is a placeholder!");
  console.log("⚠️ Push notifications will NOT be sent to phones until you replace it with a real service account key.");
  console.log("⚠️ To get your real key: Go to Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key.");
} else if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseConfigured = true;
    console.log("✅ Firebase Admin SDK Initialized Successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin:", err.message);
  }
}

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing in environment variables.");
  process.exit(1);
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be set in .env or environment variables

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Push Notification Daemon Started');
console.log(`📡 Listening for new notifications on ${supabaseUrl}...`);

// Handle incoming notification
async function handleNewNotification(payload) {
  const newNotif = payload.new;
  console.log(`\n🔔 New Notification Detected (ID: ${newNotif.id})`);
  console.log(`   User: ${newNotif.user_id}`);
  console.log(`   Title: ${newNotif.title}`);

  try {
    // Fetch user's FCM token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', newNotif.user_id)
      .single();

    if (error) {
      console.error(`   ❌ Error fetching profile for user ${newNotif.user_id}:`, error.message);
      return;
    }

    if (!profile || !profile.fcm_token) {
      console.log(`   ⚠️ No FCM token found for user ${newNotif.user_id}. Skipping push.`);
      return;
    }

    // Prepare Firebase message
    const message = {
      notification: {
        title: newNotif.title,
        body: newNotif.body || 'You have a new notification.'
      },
      data: {
        // Pass any extra data needed for routing
        route: newNotif.data?.route || '/',
        taskId: newNotif.data?.taskId || '',
      },
      token: profile.fcm_token
    };

    // Send via Firebase
    if (isFirebaseConfigured) {
      const response = await admin.messaging().send(message);
      console.log(`   ✅ Successfully sent FCM message:`, response);
    } else {
      console.log(`   ⚠️ Skipped FCM push because Firebase Admin is not configured.`);
    }

  } catch (err) {
    console.error(`   ❌ Failed to send FCM message:`, err);
  }
}

// Set up Supabase Realtime Subscription
const channel = supabase.channel('realtime:public:notifications')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    handleNewNotification
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to database changes.');
    } else {
      console.log(`⚠️ Subscription status changed: ${status}`);
    }
  });

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down daemon...');
  supabase.removeChannel(channel);
  process.exit(0);
});
