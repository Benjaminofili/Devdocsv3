// src/app/api/auth/save-github-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken, getDb } from '../../_lib/auth';
import { encrypt } from '../../../../lib/v2-intelligence/crypto';

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Verify Firebase ID token from Authorization header
    const uid = await verifyFirebaseToken(req);

    // 2️⃣ Parse request body for the plain GitHub token
    const { githubToken } = await req.json();
    if (!githubToken) {
      return NextResponse.json({ error: 'Missing githubToken' }, { status: 400 });
    }

    // 3️⃣ Encrypt the token with AES‑256‑GCM
    const encryptedToken = encrypt(githubToken);

    // 4️⃣ Persist encrypted token in Firestore under the user document
    const db = getDb();
    await db.collection('users').doc(uid).set(
      {
        githubTokenEncrypted: encryptedToken,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save GitHub Token Error:', error);
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
