import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.VITE_FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.VITE_FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      // 1. Remove any stray wrapping quotes that Vercel might have added
      privateKey = privateKey.replace(/^['"]|['"]$/g, '');
      
      // 2. Fix escaped newlines (only if they exist as literal text)
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
    }

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase credentials");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[FIREBASE] Successfully initialized');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR]', error);
    // This will show up in Vercel logs to tell us EXACTLY what the key looks like
    throw error;
  }
}

// 2. Access services safely
const db = admin.firestore();
const auth = admin.auth();

async function handler(request: VercelRequest, response: VercelResponse) {
  // CORS Configuration
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (request.method === 'OPTIONS') return response.status(200).end();
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const firebaseToken = authHeader.split(' ')[1];

  try {
    // 1. Verify Firebase ID Token
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const uid = decodedToken.uid;

    // 2. Fetch GitHub token from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const githubToken = userDoc.data()?.githubToken;

    if (!githubToken) {
      return response.status(403).json({ 
        error: 'GitHub token not found. Please log out and log back in.' 
      });
    }

    // 3. Fetch from GitHub
    const githubResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevDocs-V3'
      }
    });

    const repos = await githubResponse.json();
    return response.status(200).json(repos);

  } catch (error) {
    console.error('[API/GITHUB/REPOS] Handler Error:', error);
    throw error; // Let withSentry handle the 500 response
  }
}

export default withSentry(handler);
