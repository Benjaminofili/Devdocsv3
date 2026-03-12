import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  BookOpen, Github, LayoutDashboard, LogOut, ChevronDown, Zap, Shield, User,
  Menu, X, Home, FileText, Settings, Search
} from 'lucide-react';
import { useApp, UserTier } from '../context/AppContext';
import { UsageMeter } from './UsageMeter';
import { DevDocsIcon } from './DevDocsIcon';

export function Header() {
  const { isLoggedIn, user, tier, login, logout, setDemoTier } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const TIER_OPTIONS: { tier: UserTier; label: string; icon: React.ReactNode; color: string }[] = [
    { tier: 'anonymous', label: 'Anonymous', icon: <User className="w-3.5 h-3.5" />, color: 'text-zinc-400' },
    { tier: 'free', label: 'Free User', icon: <Github className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
    { tier: 'premium', label: 'Premium', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-violet-400' },
  ];

  const NAV_LINKS = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/generate', label: 'Generate', icon: FileText },
    ...(isLoggedIn ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(tier === 'premium' ? [{ path: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={closeMobile}>
          <DevDocsIcon size={28} />
          <span className="text-zinc-100 text-sm hidden sm:block" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            DevDocs<span className="text-indigo-400">.</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive(path)
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* ⌘K search hint — desktop only */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-700/60 border border-zinc-600/50 text-zinc-400 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Usage meter – desktop only */}
          <div className="hidden sm:flex">
            <UsageMeter />
          </div>

          {/* Demo tier switcher */}
          <div className="relative">
            <button
              onClick={() => setDemoOpen(o => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors text-xs"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:block">Demo Tier</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {demoOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDemoOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/50 z-20 overflow-hidden">
                  <div className="p-2 border-b border-zinc-800">
                    <p className="text-zinc-500 text-xs px-2 py-1">Switch demo tier</p>
                  </div>
                  <div className="p-1">
                    {TIER_OPTIONS.map(({ tier: t, label, icon, color }) => (
                      <button
                        key={t}
                        onClick={() => { setDemoTier(t); setDemoOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-zinc-800 ${
                          tier === t ? 'bg-zinc-800' : ''
                        }`}
                      >
                        <span className={color}>{icon}</span>
                        <span className={tier === t ? 'text-zinc-100' : 'text-zinc-400'}>{label}</span>
                        {tier === t && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Auth – desktop */}
          <div className="hidden sm:block">
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
                    {user?.avatar}
                  </div>
                  <span className="text-zinc-300 text-sm hidden sm:block">{user?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/50 z-20 overflow-hidden">
                      <div className="p-3 border-b border-zinc-800">
                        <p className="text-zinc-200 text-sm" style={{ fontWeight: 500 }}>{user?.name}</p>
                        <p className="text-zinc-500 text-xs">@{user?.username}</p>
                      </div>
                      <div className="p-1">
                        <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                        <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => login('free')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-sm transition-colors"
                style={{ fontWeight: 500 }}
              >
                <Github className="w-4 h-4" />
                <span>Sign in</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30 top-14" onClick={closeMobile} />
          <div className="md:hidden absolute left-0 right-0 z-40 bg-zinc-950 border-b border-zinc-800 shadow-xl shadow-black/40">
            {/* Usage meter */}
            <div className="px-4 py-3 border-b border-zinc-800/60">
              <UsageMeter />
            </div>

            {/* Nav links */}
            <nav className="p-2 space-y-0.5">
              {NAV_LINKS.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={closeMobile}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive(path)
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              ))}
            </nav>

            {/* Auth */}
            <div className="p-2 border-t border-zinc-800/60 mt-1">
              {isLoggedIn ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
                      {user?.avatar}
                    </div>
                    <div>
                      <p className="text-zinc-200 text-sm" style={{ fontWeight: 500 }}>{user?.name}</p>
                      <p className="text-zinc-500 text-xs">@{user?.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { logout(); closeMobile(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { login('free'); closeMobile(); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-sm transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Github className="w-4 h-4" />
                  Sign in with GitHub
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}