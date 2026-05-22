import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
    }
    const serviceAccount = JSON.parse(serviceAccountVar);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[FIREBASE] Successfully initialized in history.ts');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN HISTORY]', error);
    throw error;
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate the User
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return response.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      return response.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const uid = decodedToken.uid;

    // 2. Fetch History from Firestore
    const snapshot = await db.collection('generation_history')
      .where('userId', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      return response.status(200).json({ history: [] });
    }

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString()
      };
    });

    return response.status(200).json({
      success: true,
      history
    });

  } catch (error) {
    console.error('[API/USER/HISTORY ERROR]', error);
    return response.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withSentry(handler);
