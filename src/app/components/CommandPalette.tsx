import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Home, FileText, LayoutDashboard, Settings, Zap, Github,
  LogOut, User, Shield, Command, ArrowRight, Moon, Sun, Hash
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  section: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isLoggedIn, tier, login, logout, setDemoTier } = useApp();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  // Build items
  const items: PaletteItem[] = [
    // Navigation
    { id: 'home', label: 'Go to Home', description: 'Landing page', icon: <Home className="w-4 h-4" />, section: 'Navigation', shortcut: 'G H', action: () => { navigate('/'); close(); } },
    { id: 'generate', label: 'Go to Generate', description: 'Create a new README', icon: <Zap className="w-4 h-4" />, section: 'Navigation', shortcut: 'G G', action: () => { navigate('/generate'); close(); } },
    ...(isLoggedIn ? [
      { id: 'dashboard', label: 'Go to Dashboard', description: 'View saved READMEs', icon: <LayoutDashboard className="w-4 h-4" />, section: 'Navigation', shortcut: 'G D', action: () => { navigate('/dashboard'); close(); } },
    ] : []),
    ...(tier === 'premium' ? [
      { id: 'admin', label: 'Go to Admin', description: 'Platform analytics', icon: <Settings className="w-4 h-4" />, section: 'Navigation', shortcut: 'G A', action: () => { navigate('/admin'); close(); } },
    ] : []),
    // Actions
    { id: 'new-readme', label: 'New README', description: 'Start generating a README', icon: <FileText className="w-4 h-4" />, section: 'Actions', action: () => { navigate('/generate'); close(); } },
    ...(!isLoggedIn ? [
      { id: 'sign-in', label: 'Sign in with GitHub', description: 'Get 50 generations/day', icon: <Github className="w-4 h-4" />, section: 'Actions', action: () => { login('free'); close(); } },
    ] : [
      { id: 'sign-out', label: 'Sign Out', icon: <LogOut className="w-4 h-4" />, section: 'Actions', action: () => { logout(); close(); } },
    ]),
    // Demo tiers
    { id: 'tier-anon', label: 'Switch to Anonymous', icon: <User className="w-4 h-4" />, section: 'Demo Tier', action: () => { setDemoTier('anonymous'); close(); } },
    { id: 'tier-free', label: 'Switch to Free', icon: <Github className="w-4 h-4" />, section: 'Demo Tier', action: () => { setDemoTier('free'); close(); } },
    { id: 'tier-premium', label: 'Switch to Premium', icon: <Shield className="w-4 h-4" />, section: 'Demo Tier', action: () => { setDemoTier('premium'); close(); } },
  ];

  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        (i.description || '').toLowerCase().includes(query.toLowerCase()) ||
        i.section.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  // Group by section
  const sections: { name: string; items: PaletteItem[] }[] = [];
  filtered.forEach(item => {
    let section = sections.find(s => s.name === item.section);
    if (!section) {
      section = { name: item.section, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  });

  // Keyboard listener to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault();
        filtered[activeIdx].action();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, activeIdx, filtered]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  let flatIdx = -1;

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            {/* Palette */}
            <motion.div
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
                <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent py-3.5 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none"
                />
                <kbd
                  onClick={close}
                  className="cursor-pointer px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px] font-mono hover:text-zinc-300 transition-colors"
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-zinc-500 text-sm">No results found</p>
                    <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  sections.map(section => (
                    <div key={section.name}>
                      <p className="px-2 py-1.5 text-zinc-500 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                        {section.name}
                      </p>
                      {section.items.map(item => {
                        flatIdx++;
                        const idx = flatIdx;
                        const isActive = idx === activeIdx;
                        return (
                          <button
                            key={item.id}
                            data-idx={idx}
                            onClick={item.action}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                              isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50'
                            }`}
                          >
                            <span className={isActive ? 'text-indigo-400' : 'text-zinc-500'}>
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate" style={{ fontWeight: 500 }}>
                                {item.label}
                              </p>
                              {item.description && (
                                <p className="text-zinc-600 text-xs truncate">{item.description}</p>
                              )}
                            </div>
                            {item.shortcut && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {item.shortcut.split(' ').map((k, i) => (
                                  <kbd key={i} className="px-1.5 py-0.5 rounded bg-zinc-700/60 border border-zinc-600/50 text-zinc-500 text-[10px] font-mono">
                                    {k}
                                  </kbd>
                                ))}
                              </div>
                            )}
                            {isActive && !item.shortcut && (
                              <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-zinc-800 text-zinc-600 text-[10px]">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono">↵</kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono">esc</kbd> close
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}