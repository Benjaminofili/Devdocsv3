import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';

// Bulletproof Firebase Initialization
if (!admin.apps.length) {
  try {
    // Check both VITE_ and standard prefixes just in case
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.VITE_FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.VITE_FIREBASE_PRIVATE_KEY;

    // Handle Vercel's newline escaping quirks
    if (privateKey) {
      // Replaces literal "\n" text with actual line breaks, and removes extra quotes
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    }

    if (!projectId || !clientEmail || !privateKey) {
      console.error('[FIREBASE INIT] Missing critical Firebase environment variables.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  } catch (initError) {
    console.error('[FIREBASE INIT ERROR]', initError);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS Configuration
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const firebaseToken = authHeader.split(' ')[1];

  try {
    // 1. Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const uid = decodedToken.uid;

    // 2. Fetch GitHub token from Firestore
    if (!db) {
      throw new Error('Database not initialized. Check Firebase environment variables.');
    }
    const userDoc = await db.collection('users').doc(uid).get();
    const githubToken = userDoc.data()?.githubToken;

    if (!githubToken) {
      return response.status(403).json({ 
        error: 'GitHub token not found. Please re-authenticate.' 
      });
    }

    // 3. Fetch repositories from GitHub
    const githubResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevDocs-V3-Proxy'
      }
    });

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json().catch(() => ({}));
      return response.status(githubResponse.status).json({
        error: 'GitHub API Error',
        details: errorData.message || githubResponse.statusText
      });
    }

    const repos = await githubResponse.json();
    return response.status(200).json(repos);

  } catch (error) {
    console.error('[API/GITHUB/REPOS] Error:', error);
    return response.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}


export default withSentry(handler);

