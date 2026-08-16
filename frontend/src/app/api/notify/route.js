import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
function initFirebaseAdmin() {
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

export async function POST(req) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initFirebaseAdmin();
    
    if (!admin.apps.length) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const { token, title, body, data } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    const message = {
      notification: {
        title,
        body
      },
      data: data || {},
      token: token
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
