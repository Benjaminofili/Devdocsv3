import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface AppContextType {
  user: User | null;
  usage: UsageInfo;
  isLoggedIn: boolean;
  tier: UserTier;
  login: (tier?: 'free' | 'premium') => void;
  logout: () => void;
  setDemoTier: (tier: UserTier) => void;
  refreshUsage: () => void;
  waitlistOpen: boolean;
  waitlistFeature: string;
  openWaitlist: (feature: string) => void;
  closeWaitlist: () => void;
}

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

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tier, setTier] = useState<UserTier>('anonymous');
  const [usage, setUsage] = useState<UsageInfo>(getMockUsage('anonymous'));
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistFeature, setWaitlistFeature] = useState('');

  const login = (t: 'free' | 'premium' = 'free') => {
    const u = { ...MOCK_USERS[t], tier: t };
    setUser(u);
    setTier(t);
    setUsage(getMockUsage(t));
  };

  const logout = () => {
    setUser(null);
    setTier('anonymous');
    setUsage(getMockUsage('anonymous'));
  };

  const setDemoTier = (t: UserTier) => {
    if (t === 'anonymous') { logout(); return; }
    const u = { ...MOCK_USERS[t === 'premium' ? 'premium' : 'free'], tier: t };
    setUser(u);
    setTier(t);
    setUsage(getMockUsage(t));
  };

  const refreshUsage = () => setUsage(getMockUsage(tier));

  const openWaitlist = (feature: string) => {
    setWaitlistFeature(feature);
    setWaitlistOpen(true);
  };

  const closeWaitlist = () => setWaitlistOpen(false);

  useEffect(() => {
    const handler = () => refreshUsage();
    window.addEventListener('usage_updated', handler);
    return () => window.removeEventListener('usage_updated', handler);
  }, [tier]);

  return (
    <AppContext.Provider value={{
      user, usage, isLoggedIn: !!user, tier,
      login, logout, setDemoTier, refreshUsage,
      waitlistOpen, waitlistFeature, openWaitlist, closeWaitlist,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
