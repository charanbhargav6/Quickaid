import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
export function initFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      const serviceAccountPath = path.resolve(process.cwd(), '../backend/firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
      } else {
        console.error('Firebase Service Account file not found at:', serviceAccountPath);
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
