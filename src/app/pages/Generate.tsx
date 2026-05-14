import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Github, Search, ArrowRight, ArrowLeft, CheckCircle, Lock, Loader2,
  Copy, Download, RotateCcw, Trash2, Save, Eye, Code, Edit3,
  Container, Package, TestTube, Settings, Star, GitFork, Clock,
  ChevronDown, Info, Zap, AlertCircle, Check, RefreshCw, FileText, Home
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { Link } from 'react-router';
import { useApp } from '../context/AppContext';
import { Confetti } from '../components/Confetti';

// ─── Types ─────────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4 | 5;

interface StackData {
  primary: string;
  secondary: string[];
  language: string;
  packageManager: string;
  hasDocker: boolean;
  hasCI: boolean;
  hasTesting: boolean;
  hasEnvFile: boolean;
  frameworks: string[];
  repoName: string;
  description: string;
  stars: number;
  forks: number;
}

interface Section {
  id: string;
  label: string;
  description: string;
  tier: 'anonymous' | 'free' | 'premium';
  required?: boolean;
  recommended?: boolean;
}

interface GeneratedSection {
  id: string;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ALL_SECTIONS: Section[] = [
  { id: 'header', label: 'Header & Badges', description: 'Project title, description, and status badges', tier: 'anonymous', required: true },
  { id: 'installation', label: 'Installation', description: 'Step-by-step setup instructions', tier: 'anonymous', required: true },
  { id: 'environment', label: 'Environment Variables', description: 'Required .env configuration', tier: 'anonymous', recommended: true },
  { id: 'license', label: 'License', description: 'License type and copyright', tier: 'anonymous', recommended: true },
  { id: 'docker', label: 'Docker Setup', description: 'Container build and run commands', tier: 'anonymous' },
  { id: 'scripts', label: 'Available Scripts', description: 'npm/yarn commands and their purpose', tier: 'anonymous', recommended: true },
  { id: 'tech-stack', label: 'Tech Stack', description: 'Technologies, frameworks and versions', tier: 'free' },
  { id: 'features', label: 'Features', description: 'Key capabilities and highlights', tier: 'free', recommended: true },
  { id: 'api-docs', label: 'API Documentation', description: 'Endpoints, params, and responses', tier: 'free' },
  { id: 'deployment', label: 'Deployment Guide', description: 'How to deploy to production', tier: 'free' },
  { id: 'contributing', label: 'Contributing', description: 'Guidelines for contributors', tier: 'free' },
  { id: 'testing', label: 'Testing', description: 'How to run and write tests', tier: 'free' },
];


const MOCK_STACK: StackData = {
  primary: 'Next.js',
  secondary: ['React', 'TypeScript', 'Prisma', 'PostgreSQL'],
  language: 'TypeScript',
  packageManager: 'npm',
  hasDocker: true,
  hasCI: true,
  hasTesting: true,
  hasEnvFile: true,
  frameworks: ['Next.js 14', 'React 18', 'TypeScript 5', 'Prisma ORM', 'Tailwind CSS'],
  repoName: 'my-nextjs-app',
  description: 'A full-stack web application built with Next.js 14, TypeScript, and Prisma',
  stars: 42,
  forks: 8,
};

const README_CONTENT: Record<string, string> = {
  header: `# 🚀 my-nextjs-app

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/user/my-nextjs-app)](https://github.com/user/my-nextjs-app)

A modern, full-stack web application built with **Next.js 14**, **TypeScript**, and **Prisma**. Designed for scalability and developer experience.`,

  installation: `## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database

### Steps

1. Clone the repository:
\`\`\`bash
git clone https://github.com/user/my-nextjs-app.git
cd my-nextjs-app
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Run database migrations:
\`\`\`bash
npx prisma migrate dev
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\``,

  environment: `## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`DATABASE_URL\` | PostgreSQL connection string | **Required** |
| \`NEXTAUTH_SECRET\` | Authentication secret key | **Required** |
| \`NEXTAUTH_URL\` | Application URL | \`http://localhost:3000\` |
| \`GITHUB_ID\` | GitHub OAuth App ID | **Required** |
| \`GITHUB_SECRET\` | GitHub OAuth App Secret | **Required** |
| \`REDIS_URL\` | Redis connection for caching | Optional |`,

  license: `## ⚖️ License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

\`\`\`
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software...
\`\`\``,

  docker: `## 🐳 Docker Setup

Run the full application stack using Docker Compose:

\`\`\`bash
# Start all services (app + database)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
\`\`\`

The app will be available at \`http://localhost:3000\`.`,

  scripts: `## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server with hot reload |
| \`npm run build\` | Build optimized production bundle |
| \`npm run start\` | Start production server |
| \`npm run lint\` | Run ESLint code checks |
| \`npm run test\` | Run Jest test suite |
| \`npm run test:watch\` | Run tests in watch mode |
| \`npx prisma studio\` | Open Prisma database GUI |`,

  'tech-stack': `## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL + Prisma ORM |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Auth** | NextAuth.js v5 |
| **Deployment** | Vercel |
| **CI/CD** | GitHub Actions |`,

  features: `## ✨ Features

- 🔐 **Authentication** — GitHub & Google OAuth via NextAuth.js
- 🗄️ **Database** — Type-safe queries with Prisma ORM
- 📱 **Responsive** — Mobile-first design with Tailwind CSS
- ⚡ **Performance** — Server components, streaming, edge runtime
- 🧪 **Testing** — Jest + React Testing Library setup
- 🐳 **Docker** — One-command local development
- 🔄 **CI/CD** — Automated testing and deployment`,

  'api-docs': `## 📡 API Documentation

### Authentication
All protected endpoints require a valid session cookie.

### Endpoints

#### \`GET /api/users\`
Returns a list of users.

\`\`\`json
{
  "users": [
    { "id": "1", "name": "John Doe", "email": "john@example.com" }
  ],
  "total": 1
}
\`\`\`

#### \`POST /api/users\`
Create a new user.

**Request body:**
\`\`\`json
{ "name": "Jane Doe", "email": "jane@example.com" }
\`\`\``,

  deployment: `## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy — Vercel handles the rest automatically

### Self-hosted

\`\`\`bash
npm run build
npm run start
\`\`\`

Make sure to set \`NODE_ENV=production\` and configure a reverse proxy (nginx/Caddy).`,

  contributing: `## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit changes: \`git commit -m 'Add amazing feature'\`
4. Push to the branch: \`git push origin feature/amazing-feature\`
5. Open a Pull Request`,

  testing: `## 🧪 Testing

\`\`\`bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
\`\`\`

Tests are located in the \`__tests__\` directory. We use **Jest** and **React Testing Library**.

Coverage threshold: **80%** (enforced in CI).`,
};

// ─── Step Progress ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: WizardStep }) {
  const steps = ['Repo Input', 'Stack Detection', 'Sections', 'Generating', 'Preview'];
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const num = (i + 1) as WizardStep;
        const isComplete = step > num;
        const isActive = step === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                isComplete ? 'bg-emerald-500 text-white' :
                isActive ? 'bg-indigo-600 text-white' :
                'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`} style={{ fontWeight: 600 }}>
                {isComplete ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span className={`text-xs hidden sm:block ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} style={{ fontWeight: isActive ? 500 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-px mx-2 ${step > num ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Repo Input ─────────────────────────────────────────────────────
import { auth } from '../../lib/firebase/auth';

function Step1({ onNext }: { onNext: (data: any) => void }) {
  const { isLoggedIn, sessionId, user } = useApp();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const validate = (val: string) => /^https?:\/\/github\.com\/[^/]+\/[^/]+/.test(val);

  const fetchRepos = async () => {
    if (repos.length > 0 || loadingRepos) return;
    setLoadingRepos(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/github/repos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }

      const data = await res.json();
      setRepos(data);
    } catch (err) {
      console.error('Failed to fetch repos:', err);
      toast.error(err instanceof Error ? err.message : 'Could not load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleTogglePicker = () => {
    const next = !showPicker;
    setShowPicker(next);
    if (next) fetchRepos();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(url)) { setError('Please enter a valid GitHub repository URL'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          ...(user?.id ? { 'x-user-id': user.id } : {}),
        },
        body: JSON.stringify({ repoUrl: url }),
      });

      const data = await res.json();
      if (data.success) {
        onNext(data.data);
      } else {
        if (res.status === 429) {
          setError('Too many requests. Please try again in a few minutes.');
        } else {
          setError(data.error || 'Failed to analyze repository');
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickRepo = (repo: any) => {
    setUrl(repo.html_url);
    setShowPicker(false);
  };

  const formatUpdateDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Enter a GitHub repository</h2>
        <p className="text-zinc-400 mt-1">Paste a public repo URL to get started. We'll analyze it and generate a README.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            placeholder="https://github.com/username/repository"
            className={`w-full bg-zinc-800 border ${error ? 'border-red-500/60' : 'border-zinc-700'} rounded-xl pl-10 pr-4 py-3.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono`}
            disabled={loading}
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !url}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          style={{ fontWeight: 600 }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Analyzing repository...' : 'Analyze Repository'}
        </button>
      </form>

      {/* Repo picker for logged-in users */}
      {isLoggedIn && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={handleTogglePicker}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 transition-colors text-sm"
          >
            <span className="text-zinc-300" style={{ fontWeight: 500 }}>Or pick from your repositories</span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
          </button>
          {showPicker && (
            <div className="divide-y divide-zinc-800 max-h-64 overflow-y-auto">
              {loadingRepos ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500 bg-zinc-900/50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Fetching repositories...</span>
                </div>
              ) : repos.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">No repositories found.</div>
              ) : (
                repos.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => pickRepo(repo)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Github className="w-4 h-4 text-zinc-500" />
                      <div className="text-left">
                        <p className="text-zinc-200 text-sm font-mono">{repo.name}</p>
                        <p className="text-zinc-500 text-xs">{repo.language || 'Plain text'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600 text-xs">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatUpdateDate(repo.updated_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}


      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-zinc-400 text-sm">
            <p className="text-zinc-300 mb-1" style={{ fontWeight: 500 }}>Only public repositories supported</p>
            <p>Private repo support is coming soon. <button className="text-indigo-400 hover:text-indigo-300 transition-colors">Join the waitlist →</button></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Stack Detection ─────────────────────────────────────────────────
function Step2({ repoUrl, stack, onNext, onBack }: { repoUrl: string; stack: any; onNext: () => void; onBack: () => void }) {
  const flags = [
    { key: 'hasDocker', label: 'Docker', icon: '🐳', value: stack.hasDocker },
    { key: 'hasCI', label: 'CI/CD', icon: '⚙️', value: stack.hasCI },
    { key: 'hasTesting', label: 'Tests', icon: '🧪', value: stack.hasTesting },
    { key: 'hasEnvFile', label: 'Env File', icon: '🔑', value: stack.hasEnvFile },
  ];

  const langColors: Record<string, string> = {
    TypeScript: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    JavaScript: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Python: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Rust: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  const langColor = langColors[stack.language] || 'bg-zinc-700 text-zinc-300 border-zinc-600';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Stack Detection</h2>
        <p className="text-zinc-400 mt-1">Here's what we found in your repository.</p>
      </div>

      {/* Repo info */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
        <Github className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <span className="text-zinc-400 text-sm font-mono truncate">{repoUrl}</span>
        <div className="ml-auto flex items-center gap-3 text-zinc-600 text-xs flex-shrink-0">
          <span className="flex items-center gap-1"><Star className="w-3 h-3" />{stack.stars}</span>
          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{stack.forks}</span>
        </div>
      </div>

      {/* Primary framework */}
      <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-violet-950/20 border border-indigo-500/20 rounded-xl">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Primary Framework</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-2xl">⚡</div>
          <div>
            <p className="text-zinc-100 text-xl" style={{ fontWeight: 700 }}>{stack.primary}</p>
            <p className="text-zinc-400 text-sm">{stack.description}</p>
          </div>
        </div>
      </div>

      {/* Secondary */}
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Secondary Technologies</p>
        <div className="flex flex-wrap gap-2">
          {stack.frameworks.map(f => (
            <span key={f} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm">{f}</span>
          ))}
          <span className={`px-3 py-1.5 border rounded-lg text-sm ${langColor}`}>{stack.language}</span>
          <span className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm">{stack.packageManager}</span>
        </div>
      </div>

      {/* Feature flags */}
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Detected Features</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {flags.map(({ key, label, icon, value }) => (
            <div key={key} className={`flex items-center gap-2.5 p-3 rounded-xl border ${
              value ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-800/50 border-zinc-700 opacity-50'
            }`}>
              <span className="text-lg">{icon}</span>
              <div>
                <p className={`text-sm ${value ? 'text-emerald-400' : 'text-zinc-500'}`} style={{ fontWeight: 500 }}>{label}</p>
                <p className={`text-xs ${value ? 'text-emerald-600' : 'text-zinc-600'}`}>{value ? 'Detected' : 'Not found'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors" style={{ fontWeight: 500 }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onNext} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors" style={{ fontWeight: 600 }}>
          Continue to Sections <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Section Selector ────────────────────────────────────────────────
function Step3({ selectedSections, onToggle, onNext, onBack }: {
  selectedSections: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { tier, openWaitlist } = useApp();

  const canAccess = (section: Section) => {
    if (section.tier === 'anonymous') return true;
    if (section.tier === 'free') return tier === 'free' || tier === 'premium';
    return tier === 'premium';
  };

  const tierLabel = { anonymous: 'Anonymous', free: 'Free', premium: 'Premium' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Choose README Sections</h2>
        <p className="text-zinc-400 mt-1">Select what to include. Required sections are always on.</p>
      </div>

      <div className="space-y-2.5">
        {ALL_SECTIONS.map(section => {
          const accessible = canAccess(section);
          const selected = selectedSections.includes(section.id);
          const locked = !accessible;

          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                locked
                  ? 'border-zinc-800 bg-zinc-900/30 opacity-60'
                  : selected
                  ? 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              {/* Checkbox / Lock */}
              <div className="flex-shrink-0">
                {locked ? (
                  <button
                    onClick={() => openWaitlist('advanced-sections')}
                    className="w-5 h-5 rounded flex items-center justify-center bg-zinc-700 border border-zinc-600 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Lock className="w-3 h-3" />
                  </button>
                ) : section.required ? (
                  <div className="w-5 h-5 rounded bg-indigo-600 border border-indigo-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <button
                    onClick={() => onToggle(section.id)}
                    className={`w-5 h-5 rounded border transition-all ${
                      selected
                        ? 'bg-indigo-600 border-indigo-500'
                        : 'bg-zinc-800 border-zinc-600 hover:border-zinc-400'
                    } flex items-center justify-center`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm ${locked ? 'text-zinc-500' : 'text-zinc-200'}`} style={{ fontWeight: 500 }}>
                    {section.label}
                  </span>
                  {section.required && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs">Required</span>
                  )}
                  {section.recommended && !section.required && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">Recommended</span>
                  )}
                  {locked && (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      section.tier === 'free' ? 'bg-zinc-700 text-zinc-400' : 'bg-violet-500/20 text-violet-400'
                    }`}>{tierLabel[section.tier]}+</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${locked ? 'text-zinc-600' : 'text-zinc-500'}`}>{section.description}</p>
              </div>

              {locked && (
                <button
                  onClick={() => openWaitlist('advanced-sections')}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-xs"
                >
                  <Lock className="w-3 h-3" /> Unlock
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors" style={{ fontWeight: 500 }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedSections.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors"
          style={{ fontWeight: 600 }}
        >
          Generate {selectedSections.length} Section{selectedSections.length !== 1 ? 's' : ''} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Generation ──────────────────────────────────────────────────────
function Step4({ 
  selectedSections, 
  projectName, 
  repoUrl, 
  stack, 
  repoData, 
  bypassCache = false,
  onDone 
}: { 
  selectedSections: string[]; 
  projectName: string;
  repoUrl: string;
  stack: any;
  repoData: any;
  bypassCache?: boolean;
  onDone: (sections: GeneratedSection[]) => void 
}) {
  const { sessionId, user, refreshUsage } = useApp();
  const [sections, setSections] = useState<GeneratedSection[]>(
    selectedSections.map(id => ({ id, content: '', status: 'pending' }))
  );
  const [currentIdx, setCurrentIdx] = useState(-1);
  const doneRef = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const sectionLabel = (id: string) => ALL_SECTIONS.find(s => s.id === id)?.label ?? id;

  useEffect(() => {
    const run = async () => {
      const generatedResults: GeneratedSection[] = [];

      for (let i = 0; i < selectedSections.length; i++) {
        const id = selectedSections[i];
        setCurrentIdx(i);
        setSections(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'generating' } : s));

        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': sessionId,
              ...(user?.id ? { 'x-user-id': user.id } : {}),
            },
            body: JSON.stringify({
              sectionId: id,
              projectName,
              repoUrl,
              stack,
              repoData,
              isFirstSection: i === 0,
              bypassCache,
            }),
          });

          const data = await res.json();
          if (data.success) {
            const result: GeneratedSection = { 
              id, 
              content: data.data.content, 
              status: 'done' 
            };
            generatedResults.push(result);
            setSections(prev => prev.map((s, idx) => idx === i ? result : s));
          } else {
            if (res.status === 429) {
              throw new Error('Usage limit reached or rate limited. Please try again later.');
            }
            throw new Error(data.error || 'Generation failed');
          }
        } catch (err) {
          setSections(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error' } : s));
          toast.error(`Failed to generate ${sectionLabel(id)}`);
        }
      }
      
      doneRef.current = true;
      setShowConfetti(true);
      refreshUsage();
      onDone(generatedResults);
    };
    run();
  }, []);

  const done = sections.filter(s => s.status === 'done').length;
  const total = sections.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Generating your README</h2>
        <p className="text-zinc-400">AI is writing each section. This takes about {total * 2}–{total * 4} seconds.</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">{done} of {total} sections</span>
          <span className="text-zinc-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {sections.map((section, i) => {
          const label = sectionLabel(section.id);
          return (
            <div key={section.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
              section.status === 'done' ? 'border-emerald-500/20 bg-emerald-500/5' :
              section.status === 'generating' ? 'border-indigo-500/30 bg-indigo-500/5' :
              'border-zinc-800 bg-zinc-900/50'
            }`}>
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {section.status === 'done' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {section.status === 'generating' && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
                {section.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
              </div>
              <span className={`text-sm flex-1 ${
                section.status === 'done' ? 'text-emerald-300' :
                section.status === 'generating' ? 'text-indigo-300' :
                'text-zinc-600'
              }`} style={{ fontWeight: section.status !== 'pending' ? 500 : 400 }}>
                {label}
              </span>
              {section.status === 'generating' && (
                <span className="text-indigo-400 text-xs">Writing...</span>
              )}
              {section.status === 'done' && (
                <span className="text-emerald-600 text-xs">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {done === total && total > 0 && (
        <>
          {showConfetti && <Confetti />}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <p className="text-emerald-400" style={{ fontWeight: 600 }}>🎉 All sections generated!</p>
            <p className="text-zinc-400 text-sm mt-1">Opening preview...</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step 5: Preview & Edit ──────────────────────────────────────────────────
function Step5({ sections, repoUrl, stack, onBack, onRestart }: {
  sections: GeneratedSection[];
  repoUrl: string;
  stack: any;
  onBack: () => void;
  onRestart: () => void;
}) {
  const { isLoggedIn, user } = useApp();
  const [tab, setTab] = useState<'preview' | 'raw' | 'edit'>('preview');
  const [editContent, setEditContent] = useState(() => sections.map(s => s.content).join('\n\n---\n\n'));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fullContent = sections.map(s => s.content).join('\n\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    toast.success('Copied to clipboard!', { description: 'README.md content copied.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('README.md downloaded!');
  };

  const handleSave = async () => {
    if (!isLoggedIn || !user) return;
    setSaving(true);
    try {
      const { auth } = await import('../../lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const res = await fetch('/api/readmes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repoUrl,
          projectName: sections[0]?.projectName || 'README', // Fallback or extracted name
          content: fullContent,
          stack
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save README');
      }

      setSaved(true);
      toast.success('README saved to dashboard!');
    } catch (err) {
      console.error('[SAVE ERROR]', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save README');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'preview' as const, label: 'Preview', icon: Eye },
    { id: 'raw' as const, label: 'Raw', icon: Code },
    { id: 'edit' as const, label: 'Edit', icon: Edit3 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Your README is ready</h2>
          <p className="text-zinc-400 text-sm mt-0.5">{sections.length} sections generated • Preview, edit, or download below</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              copied ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          {isLoggedIn && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
                saved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
              } disabled:opacity-70`}
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> :
               saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</> :
               <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
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

      {/* Content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[500px]">
        <AnimatePresence mode="wait">
          {tab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-6 prose prose-invert prose-zinc max-w-none overflow-auto"
              style={{ maxHeight: '600px' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-zinc-100 text-2xl border-b border-zinc-700 pb-2 mb-4" style={{ fontWeight: 700 }}>{children}</h1>,
                  h2: ({ children }) => <h2 className="text-zinc-100 text-lg mt-6 mb-3" style={{ fontWeight: 600 }}>{children}</h2>,
                  h3: ({ children }) => <h3 className="text-zinc-200 text-base mt-4 mb-2" style={{ fontWeight: 600 }}>{children}</h3>,
                  p: ({ children }) => <p className="text-zinc-300 text-sm leading-relaxed mb-3">{children}</p>,
                  code: ({ children }: { children?: React.ReactNode }) =>
                    <code className="px-1.5 py-0.5 bg-zinc-800 text-emerald-400 rounded text-xs font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 overflow-x-auto mb-4 text-zinc-200 text-xs font-mono">{children}</pre>,
                  ul: ({ children }) => <ul className="list-none space-y-1 mb-3">{children}</ul>,
                  li: ({ children }) => <li className="text-zinc-300 text-sm flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span><span>{children}</span></li>,
                  table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
                  th: ({ children }) => <th className="text-left text-zinc-400 text-xs uppercase tracking-wider px-3 py-2 border-b border-zinc-700">{children}</th>,
                  td: ({ children }) => <td className="text-zinc-300 text-xs px-3 py-2 border-b border-zinc-800">{children}</td>,
                  a: ({ href, children }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 transition-colors">{children}</a>,
                  strong: ({ children }) => <strong className="text-zinc-100">{children}</strong>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 pl-4 text-zinc-400 italic mb-3">{children}</blockquote>,
                  img: ({ src, alt }) => <img src={src} alt={alt} className="rounded-lg max-w-full" />,
                }}
              >
                {fullContent}
              </ReactMarkdown>
            </motion.div>
          )}

          {tab === 'raw' && (
            <motion.div
              key="raw"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-zinc-500 text-sm font-mono">README.md</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="p-4 text-emerald-400/90 text-xs font-mono leading-relaxed overflow-auto" style={{ maxHeight: '560px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {fullContent}
              </pre>
            </motion.div>
          )}

          {tab === 'edit' && (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full h-[560px] bg-transparent p-4 text-zinc-300 text-sm font-mono leading-relaxed focus:outline-none resize-none"
                spellCheck={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link to="/" className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm border border-zinc-700">
          <Home className="w-4 h-4" /> Start Over
        </Link>
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm border border-zinc-700">
          <ArrowLeft className="w-4 h-4" /> Back to Sections
        </button>
        <button onClick={onRestart} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm border border-zinc-700">
          <RefreshCw className="w-4 h-4" /> Regenerate
        </button>
        {tab === 'edit' && (
          <button
            onClick={() => toast.success('Edit saved!')}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors text-sm"
            style={{ fontWeight: 500 }}
          >
            <Save className="w-4 h-4" /> Save Edit
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Generate Page ──────────────────────────────────────────────────────
export function Generate() {
  const [step, setStep] = useState<WizardStep>(1);
  const [repoUrl, setRepoUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
     if (analysisResult?.suggestedSections) {
        // API returns SectionConfig objects, extract just the IDs
        setSelectedSections(
          analysisResult.suggestedSections
            .filter((s: any) => s.isRecommended || s.isRequired)
            .map((s: any) => s.id)
        );
     }
  }, [analysisResult]);

  const toggleSection = (id: string) => {
    const section = ALL_SECTIONS.find(s => s.id === id);
    if (section?.required) return;
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleGenerationDone = (sections: GeneratedSection[]) => {
    setGeneratedSections(sections);
    setTimeout(() => setStep(5), 600);
  };

  const stepVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit:    { opacity: 0, x: -24, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <SEOHead
        title="Generate README"
        description="Generate a professional README for your GitHub repository. AI-powered stack detection and markdown generation in seconds."
        path="/generate"
      />
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <StepIndicator step={step} />
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <FileText className="w-3.5 h-3.5" />
              <span>README Generator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants as any} initial="initial" animate="animate" exit="exit">
              <Step1 onNext={data => { setRepoUrl(prev => repoUrl || prev); setAnalysisResult(data); setIsRegenerating(false); setStep(2); }} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants as any} initial="initial" animate="animate" exit="exit">
              <Step2 repoUrl={repoUrl} stack={analysisResult?.stack} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Step3
                selectedSections={selectedSections}
                onToggle={toggleSection}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="step4" variants={stepVariants as any} initial="initial" animate="animate" exit="exit">
              <Step4
                selectedSections={selectedSections}
                projectName={(() => { try { return new URL(repoUrl).pathname.split('/').filter(Boolean).pop() || 'Project'; } catch { return 'Project'; } })()}
                repoUrl={repoUrl}
                stack={analysisResult?.stack}
                repoData={analysisResult?.repoData}
                bypassCache={isRegenerating}
                onDone={handleGenerationDone}
              />
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="step5" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Step5
                sections={generatedSections}
                repoUrl={repoUrl}
                stack={analysisResult?.stack}
                onBack={() => setStep(3)}
                onRestart={() => { setIsRegenerating(true); setStep(4); setGeneratedSections([]); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}