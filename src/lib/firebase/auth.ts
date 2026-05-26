// src/lib/firebase/auth.ts
import { 
  signInWithPopup, 
  GithubAuthProvider, 
  signOut, 
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './config';
import { getUserTier } from '../tiers/config';
import { secureFetch } from '@/lib/secureFetch'; // Import our secure wrapper

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('repo');

export { auth };

export const loginWithGitHub = async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    
    // Capture GitHub Access Token
    const credential = GithubAuthProvider.credentialFromResult(result);
    const githubToken = credential?.accessToken;

    if (githubToken) {
      try {
        // Securely send to our backend instead of writing to Firestore directly
        await secureFetch('/api/auth/save-github-token', {
          method: 'POST',
          body: JSON.stringify({ githubToken })
        });
      } catch (error) {
        console.error("Failed to securely save GitHub token:", error);
      }
    }

    return result.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  avatar: string;
  tier: 'anonymous' | 'free' | 'premium';
}

export const mapFirebaseUser = async (user: FirebaseUser): Promise<AuthUser> => {
  const tier = await getUserTier(user.uid);
  return {
    id: user.uid,
    name: user.displayName || 'Developer',
    email: user.email,
    avatar: user.photoURL || '',
    tier,
  };
};
