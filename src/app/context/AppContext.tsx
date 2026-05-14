// src/app/context/AppContext.tsx
import { create } from 'zustand';
import { auth, loginWithGitHub, logout as firebaseLogout, mapFirebaseUser } from '../../lib/firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { getCurrentUsage } from '../../lib/tiers/usage';

export type UserTier = 'anonymous' | 'free' | 'premium';

export interface User {
  id: string;
  name: string;
  email: string | null;
  avatar: string;
  tier: UserTier;
}

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  tier: UserTier;
  resetAt: string | null;
}

interface AppState {
  user: User | null;
  usage: UsageInfo;
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  tier: UserTier;
  sessionId: string;
  waitlistOpen: boolean;
  waitlistFeature: string;

  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  openWaitlist: (feature: string) => void;
  closeWaitlist: () => void;
  setSessionId: (id: string) => void;
}

const DEFAULT_USAGE = (tier: UserTier = 'anonymous'): UsageInfo => ({
  used: 0,
  limit: tier === 'anonymous' ? 5 : tier === 'free' ? 50 : Infinity,
  remaining: tier === 'anonymous' ? 5 : tier === 'free' ? 50 : Infinity,
  tier,
  resetAt: new Date().toISOString(),
});

export const useApp = create<AppState>((set, get) => ({
  user: null,
  usage: DEFAULT_USAGE('anonymous'),
  isLoggedIn: false,
  isLoggingIn: false,
  tier: 'anonymous',
  sessionId: localStorage.getItem('devdocs_session_id') || (() => {
    const id = crypto.randomUUID();
    localStorage.setItem('devdocs_session_id', id);
    return id;
  })(),
  waitlistOpen: false,
  waitlistFeature: '',

  login: async () => {
    set({ isLoggingIn: true });
    try {
      await loginWithGitHub();
    } finally {
      set({ isLoggingIn: false });
    }
  },


  logout: async () => {
    await firebaseLogout();
  },

  refreshUsage: async () => {
    const { user, sessionId, tier } = get();
    try {
      const usage = await getCurrentUsage(user?.id || null, sessionId, tier);
      set({ usage });
    } catch (error) {
      console.warn('Failed to refresh usage:', error);
    }
  },

  openWaitlist: (feature: string) => set({ waitlistFeature: feature, waitlistOpen: true }),
  closeWaitlist: () => set({ waitlistOpen: false }),
  setSessionId: (id: string) => {
    localStorage.setItem('devdocs_session_id', id);
    set({ sessionId: id });
  },
}));

// Initialize Auth Listener
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const mappedUser = await mapFirebaseUser(firebaseUser);
    useApp.setState({ 
      user: mappedUser, 
      isLoggedIn: true, 
      tier: mappedUser.tier 
    });
    // Trigger usage fetch
    useApp.getState().refreshUsage();
  } else {
    useApp.setState({ 
      user: null, 
      isLoggedIn: false, 
      tier: 'anonymous',
      usage: DEFAULT_USAGE('anonymous')
    });
    useApp.getState().refreshUsage();
  }
});
