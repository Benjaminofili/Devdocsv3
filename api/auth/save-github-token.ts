// api/auth/save-github-token.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { encrypt } from '../_lib/crypto.js';

// Initialize Admin (reusing your existing pattern)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) { console.error('Firebase init error', e); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1. Verify the User
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const idToken = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2. Get & Encrypt Token
    const { githubToken } = req.body;
    if (!githubToken) return res.status(400).json({ error: 'Missing githubToken' });

    const encryptedToken = encrypt(githubToken);

    // 3. Save to Firestore
    await admin.firestore().collection('users').doc(uid).set({
      githubTokenEncrypted: encryptedToken,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Save token error:', error);
    return res.status(500).json({ error: error.message });
  }
}
