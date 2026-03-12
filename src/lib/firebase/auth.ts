// src/lib/firebase/auth.ts
import { 
  signInWithPopup, 
  GithubAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './config';
import { getUserTier } from '../tiers/config';

const githubProvider = new GithubAuthProvider();

export { auth };

export const loginWithGitHub = async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
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
