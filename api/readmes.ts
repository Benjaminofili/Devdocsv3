import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from './_lib/withSentry.js';
import { SaveReadmeSchema } from './_lib/validators/schemas.js';

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
    console.log('[FIREBASE] Successfully initialized in readmes.ts');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN READMES]', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;
const auth = admin.apps.length ? admin.auth() : null;

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!db || !auth) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    // 1. Authenticate the User
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const uid = decodedToken.uid;

    if (req.method === 'GET') {
      // Fetch from Firestore
      const snapshot = await db.collection('readmes')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();

      if (snapshot.empty) {
        return res.status(200).json({ readmes: [] });
      }

      const readmes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString()
        };
      });

      return res.status(200).json({ success: true, readmes });
    } 
    
    else if (req.method === 'POST') {
      // Validate request body using Zod schema
      const parsedData = SaveReadmeSchema.parse(req.body);
      const { repoUrl, projectName, sectionId, content, stack } = parsedData;

      // Save to Firestore using validated data
      const docRef = await db.collection('readmes').add({
        userId: uid,
        repoUrl,
        projectName,
        sectionId,
        content,
        stack: stack || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[API/READMES/SAVE] README saved with ID: ${docRef.id} for user: ${uid}`);

      return res.status(200).json({
        success: true,
        id: docRef.id,
        message: 'README saved to dashboard successfully'
      });
    } 
    
    else if (req.method === 'DELETE') {
      // Get docId from query or body
      const docId = (req.body?.docId || req.query?.docId) as string | undefined;
      if (!docId) {
        return res.status(400).json({ error: 'Bad Request: Missing docId' });
      }

      // Fetch from Firestore to ensure it belongs to the authenticated user
      const docRef = db.collection('readmes').doc(docId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Not Found: Document does not exist' });
      }

      const docData = docSnap.data();
      if (docData?.userId !== uid) {
        return res.status(403).json({ error: 'Forbidden: You do not own this document' });
      }

      // Delete the document
      await docRef.delete();

      console.log(`[API/READMES/DELETE] README with ID: ${docId} deleted for user: ${uid}`);

      return res.status(200).json({ success: true, message: 'README deleted successfully' });
    } 
    
    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Readmes API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default withSentry(handler);
