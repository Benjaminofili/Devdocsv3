// src/app/api/_lib/auth.ts
import { NextRequest } from 'next/server';
import admin from 'firebase-admin';

// 1. Parse the entire JSON file from a SINGLE environment variable
const getFirebaseAdmin = () => {
  if (!admin.apps.length) {
    // This expects the raw JSON string from your .env file
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
};

const adminInstance = getFirebaseAdmin();

export async function verifyFirebaseToken(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    // Use the initialized admin instance
    const decodedToken = await adminInstance.auth().verifyIdToken(idToken);
    return decodedToken.uid; // Return the verified user ID
  } catch (error) {
    console.error('Firebase Auth Error:', error);
    throw new Error('Unauthorized: Invalid Firebase Token');
  }
}

export const getDb = () => adminInstance.firestore();
