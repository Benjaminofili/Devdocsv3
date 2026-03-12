/**
 * Global application store powered by Zustand.
 *
 * Replaces the previous React Context + Provider pattern with a single
 * `useApp` hook backed by a Zustand store.  Every consumer that was
 * using `useApp()` continues to work without any import changes.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserTier = 'anonymous' | 'free' | 'premium';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  tier: UserTier;
}

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  tier: UserTier;
  resetAt: string;
}

interface AppState {
  // State
  user: User | null;
  usage: UsageInfo;
  isLoggedIn: boolean;
  tier: UserTier;
  waitlistOpen: boolean;
  waitlistFeature: string;

  // Actions
  login: (tier?: 'free' | 'premium') => void;
  logout: () => void;
  setDemoTier: (tier: UserTier) => void;
  refreshUsage: () => void;
  openWaitlist: (feature: string) => void;
  closeWaitlist: () => void;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_USERS: Record<string, User> = {
  free: {
    id: '1',
    name: 'Alex Chen',
    username: 'alexchen',
    avatar: 'AC',
    tier: 'free',
  },
  premium: {
    id: '2',
    name: 'Sarah Dev',
    username: 'sarahdev',
    avatar: 'SD',
    tier: 'premium',
  },
};

const getMockUsage = (tier: UserTier): UsageInfo => {
  const resetAt = new Date(Date.now() + 6 * 3600000).toISOString();
  if (tier === 'anonymous') return { used: 3, limit: 5, remaining: 2, tier, resetAt };
  if (tier === 'free') return { used: 12, limit: 50, remaining: 38, tier, resetAt };
  return { used: 147, limit: Infinity, remaining: Infinity, tier, resetAt };
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useApp = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    usage: getMockUsage('anonymous'),
    isLoggedIn: false,
    tier: 'anonymous',
    waitlistOpen: false,
    waitlistFeature: '',

    // Actions
    login: (t: 'free' | 'premium' = 'free') => {
      const u: User = { ...MOCK_USERS[t], tier: t };
      set({ user: u, tier: t, isLoggedIn: true, usage: getMockUsage(t) });
    },

    logout: () => {
      set({
        user: null,
        tier: 'anonymous',
        isLoggedIn: false,
        usage: getMockUsage('anonymous'),
      });
    },

    setDemoTier: (t: UserTier) => {
      if (t === 'anonymous') {
        get().logout();
        return;
      }
      const u: User = { ...MOCK_USERS[t === 'premium' ? 'premium' : 'free'], tier: t };
      set({ user: u, tier: t, isLoggedIn: true, usage: getMockUsage(t) });
    },

    refreshUsage: () => {
      set({ usage: getMockUsage(get().tier) });
    },

    openWaitlist: (feature: string) => {
      set({ waitlistFeature: feature, waitlistOpen: true });
    },

    closeWaitlist: () => {
      set({ waitlistOpen: false });
    },
  }))
);

// Listen for custom "usage_updated" events (same behaviour as before)
if (typeof window !== 'undefined') {
  window.addEventListener('usage_updated', () => {
    useApp.getState().refreshUsage();
  });
}
