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
    console.log('[FIREBASE] Successfully initialized in delete.ts');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN DELETE]', error);
    throw error;
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'DELETE') {
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

    // 2. Get docId from query or body
    const docId = (request.body?.docId || request.query?.docId) as string | undefined;
    if (!docId) {
      return response.status(400).json({ error: 'Bad Request: Missing docId' });
    }

    // 3. Fetch from Firestore to ensure it belongs to the authenticated user
    const docRef = db.collection('readmes').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return response.status(404).json({ error: 'Not Found: Document does not exist' });
    }

    const docData = docSnap.data();
    if (docData?.userId !== uid) {
      return response.status(403).json({ error: 'Forbidden: You do not own this document' });
    }

    // 4. Delete the document
    await docRef.delete();

    console.log(`[API/READMES/DELETE] README with ID: ${docId} deleted for user: ${uid}`);

    return response.status(200).json({
      success: true,
      message: 'README deleted successfully'
    });

  } catch (error) {
    console.error('[API/READMES/DELETE ERROR]', error);
    return response.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withSentry(handler);
