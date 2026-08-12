import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
export function initFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccount;
        try {
          // It could be base64 encoded or plain JSON
          const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded.includes('{') ? decoded : process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch(e) {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized from Environment Variable');
      } else {
        const serviceAccountPath = path.resolve(process.cwd(), '../backend/firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log('Firebase Admin initialized from local file');
        } else {
          console.error('Firebase Service Account not found in Env or Local File');
        }
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
    }
  }
}

export async function sendPushNotification(token, title, body, data = {}) {
  try {
    initFirebaseAdmin();
    
    if (!admin.apps.length) {
      console.error('Firebase Admin not initialized');
      return false;
    }

    if (!token) {
      return false;
    }

    const message = {
      notification: {
        title,
        body
      },
      data: data,
      token: token
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}
