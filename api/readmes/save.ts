import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';
import { SaveReadmeSchema } from '../_lib/validators/schemas.js';

// Bulletproof Firebase Initialization
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
    console.log('[FIREBASE] Successfully initialized in save.ts');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN SAVE]', error);
    throw error;
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
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

    // 2. Validate Request Body
    const parseResult = SaveReadmeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return response.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { repoUrl, projectName, content, stack } = parseResult.data;

    // 3. Save to Firestore
    const docRef = await db.collection('readmes').add({
      userId: uid,
      repoUrl,
      projectName,
      content,
      stack: stack || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[API/READMES/SAVE] README saved with ID: ${docRef.id} for user: ${uid}`);

    return response.status(200).json({
      success: true,
      id: docRef.id,
      message: 'README saved to dashboard successfully'
    });

  } catch (error) {
    console.error('[API/READMES/SAVE ERROR]', error);
    return response.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withSentry(handler);
