import { useState } from 'react';
import { Link } from 'react-router';
import {
  FileText, Trash2, Eye, Plus, Github, Clock, Star, Layers,
  Search, Filter, BookOpen, Zap, AlertCircle, LayoutGrid, List,
  Download, Copy, Check, History
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEOHead } from '../components/SEOHead';

interface SavedReadme {
  id: string;
  title: string;
  repo_url: string | null;
  stack: string | null;
  content: string;
  created_at: string;
  sections: number;
}

const MOCK_READMES: SavedReadme[] = [
  {
    id: '1',
    title: 'my-nextjs-app',
    repo_url: 'https://github.com/alexchen/my-nextjs-app',
    stack: 'Next.js · TypeScript',
    content: '# my-nextjs-app\n\nA full-stack web application...',
    created_at: '2026-03-10T14:23:00Z',
    sections: 8,
  },
  {
    id: '2',
    title: 'api-server',
    repo_url: 'https://github.com/alexchen/api-server',
    stack: 'Node.js · Express',
    content: '# api-server\n\nA RESTful API built with Express...',
    created_at: '2026-03-07T09:12:00Z',
    sections: 6,
  },
  {
    id: '3',
    title: 'react-dashboard',
    repo_url: 'https://github.com/alexchen/react-dashboard',
    stack: 'React · Vite',
    content: '# react-dashboard\n\nAn analytics dashboard...',
    created_at: '2026-02-28T17:45:00Z',
    sections: 5,
  },
];

const MOCK_HISTORY = [
  { id: 'h1', repo: 'my-nextjs-app', sections: 8, date: '2026-03-10T14:23:00Z', status: 'success' },
  { id: 'h2', repo: 'api-server', sections: 6, date: '2026-03-07T09:12:00Z', status: 'success' },
  { id: 'h3', repo: 'react-dashboard', sections: 5, date: '2026-02-28T17:45:00Z', status: 'success' },
  { id: 'h4', repo: 'ml-pipeline', sections: 3, date: '2026-02-20T11:00:00Z', status: 'error' },
  { id: 'h5', repo: 'my-nextjs-app', sections: 4, date: '2026-02-15T08:30:00Z', status: 'success' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function Dashboard() {
  const { isLoggedIn, user, tier, usage } = useApp();
  const [readmes, setReadmes] = useState<SavedReadme[]>(MOCK_READMES);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [tab, setTab] = useState<'readmes' | 'history'>('readmes');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
          <BookOpen className="w-8 h-8 text-zinc-600" />
        </div>
        <h2 className="text-zinc-100 text-2xl mb-2" style={{ fontWeight: 700 }}>Sign in to access your dashboard</h2>
        <p className="text-zinc-400 max-w-md mb-6">Save generated READMEs, view your history, and manage your projects — all in one place.</p>
        <Link to="/" className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl transition-colors" style={{ fontWeight: 600 }}>
          <Github className="w-4 h-4" /> Sign in with GitHub
        </Link>
      </div>
    );
  }

  const filtered = readmes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.stack || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await new Promise(r => setTimeout(r, 600));
    setReadmes(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
  };

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const savedLimit = tier === 'premium' ? Infinity : 10;
  const savedCount = readmes.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <SEOHead
        title="Dashboard"
        description="Manage your saved READMEs, view generation history, and track usage on DevDocs V2."
        path="/dashboard"
        noIndex
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white" style={{ fontWeight: 700, fontSize: 18 }}>
            {user?.avatar}
          </div>
          <div>
            <h1 className="text-zinc-100 text-xl" style={{ fontWeight: 700 }}>{user?.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-zinc-500 text-sm">@{user?.username}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tier === 'premium' ? 'bg-violet-500/20 text-violet-400' :
                'bg-indigo-500/20 text-indigo-400'
              }`} style={{ fontWeight: 600 }}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </div>
          </div>
        </div>
        <Link
          to="/generate"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors text-sm"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" /> New README
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Saved READMEs', value: `${savedCount}/${savedLimit === Infinity ? '∞' : savedLimit}`, icon: FileText, color: 'text-indigo-400' },
          { label: 'Today\'s Usage', value: `${usage.used}/${usage.limit === Infinity ? '∞' : usage.limit}`, icon: Zap, color: 'text-emerald-400' },
          { label: 'Total Generated', value: MOCK_HISTORY.length.toString(), icon: History, color: 'text-violet-400' },
          { label: 'Stacks Used', value: '4', icon: Layers, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-zinc-500 text-xs">{label}</span>
            </div>
            <p className="text-zinc-100 text-xl" style={{ fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {[
          { id: 'readmes' as const, label: 'Saved READMEs', icon: FileText },
          { id: 'history' as const, label: 'History', icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* READMEs Tab */}
      {tab === 'readmes' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search READMEs..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Save limit warning */}
          {savedCount >= (savedLimit === Infinity ? Infinity : savedLimit * 0.8) && savedLimit !== Infinity && (
            <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 text-sm">
                You've used {savedCount}/{savedLimit} README slots. <button className="text-amber-400 underline hover:text-amber-300">Upgrade to Premium</button> for unlimited saves.
              </p>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-16 border border-zinc-800 rounded-2xl bg-zinc-900/30">
              <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400" style={{ fontWeight: 500 }}>
                {search ? 'No READMEs match your search' : 'No READMEs saved yet'}
              </p>
              {!search && (
                <Link to="/generate" className="mt-4 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                  <Plus className="w-4 h-4" /> Generate your first README
                </Link>
              )}
            </div>
          )}

          {/* README list / grid */}
          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filtered.map(readme => (
              <div
                key={readme.id}
                className={`bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors ${view === 'list' ? 'flex items-center gap-4 p-4' : 'flex flex-col p-5'}`}
              >
                <div className={`flex-1 min-w-0 ${view === 'grid' ? 'space-y-3' : ''}`}>
                  {/* Title + repo */}
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <p className="text-zinc-100 text-sm truncate" style={{ fontWeight: 600 }}>{readme.title}</p>
                    </div>
                    {readme.repo_url && (
                      <a href={readme.repo_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-zinc-400 transition-colors mt-1 truncate">
                        <Github className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{readme.repo_url.replace('https://github.com/', '')}</span>
                      </a>
                    )}
                  </div>

                  {/* Meta */}
                  <div className={`flex items-center gap-3 text-zinc-600 text-xs ${view === 'list' ? 'mt-1' : ''}`}>
                    {readme.stack && <span className="text-zinc-500">{readme.stack}</span>}
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{readme.sections} sections</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(readme.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-2 flex-shrink-0 ${view === 'grid' ? 'pt-3 border-t border-zinc-800' : ''}`}>
                  <button
                    onClick={() => handleCopy(readme.id, readme.content)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    {copiedId === readme.id ? <><Check className="w-3 h-3 text-emerald-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button
                    onClick={() => handleDelete(readme.id)}
                    disabled={deletingId === readme.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {deletingId === readme.id
                      ? <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {MOCK_HISTORY.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-200 text-sm font-mono">{item.repo}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    item.status === 'success' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>{item.status}</span>
                </div>
                <p className="text-zinc-600 text-xs mt-0.5">{item.sections} sections · {formatDate(item.date)}</p>
              </div>
              <span className="text-zinc-600 text-xs flex-shrink-0">{timeAgo(item.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}