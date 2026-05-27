import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Github, Search, ArrowRight, ArrowLeft, CheckCircle, Lock, Loader2,
  Copy, Download, RotateCcw, Save, Eye, Code, Edit3,
  Star, GitFork, Clock, ChevronDown, Info, AlertCircle,
  Check, RefreshCw, FileText, Home, Sparkles,
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { Link } from 'react-router';
import { useApp } from '../context/AppContext';
import { Confetti } from '../components/Confetti';
import { auth } from '../../lib/firebase/auth';
import { secureFetch } from '../../lib/secureFetch';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface Section {
  id: string;
  label: string;
  description: string;
  tier: 'anonymous' | 'free' | 'premium';
  required?: boolean;
  recommended?: boolean;
}

/**
 * V3: generation result is a single cohesive string, not an array.
 * The backend wrote it all in one LLM pass.
 */
interface GenerationResult {
  content: string;
  provider: string;
  sectionsWritten: string[];
}

// The shape we carry from /api/analyze through to /api/generate
interface AnalysisResult {
  projectName?: string;
  stack: Record<string, unknown>;
  repoProfile: Record<string, unknown>;
  repoData?: {
    packageJson?: Record<string, unknown>;
    existingReadme?: string;
    envExample?: string;
    structure?: string[];
  };
  suggestedSections?: Array<{ id: string; isRecommended?: boolean; isRequired?: boolean }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ALL_SECTIONS: Section[] = [
  { id: 'header',       label: 'Header & Badges',        description: 'Project title, description, and status badges',    tier: 'anonymous', required: true },
  { id: 'installation', label: 'Installation',            description: 'Step-by-step setup instructions',                 tier: 'anonymous', required: true },
  { id: 'environment',  label: 'Environment Variables',   description: 'Required .env configuration',                     tier: 'anonymous', recommended: true },
  { id: 'license',      label: 'License',                 description: 'License type and copyright',                      tier: 'anonymous', recommended: true },
  { id: 'docker',       label: 'Docker Setup',            description: 'Container build and run commands',                tier: 'anonymous' },
  { id: 'scripts',      label: 'Available Scripts',       description: 'npm/yarn commands and their purpose',             tier: 'anonymous', recommended: true },
  { id: 'tech-stack',   label: 'Tech Stack',              description: 'Technologies, frameworks and versions',           tier: 'free' },
  { id: 'features',     label: 'Features',                description: 'Key capabilities and highlights',                 tier: 'free', recommended: true },
  { id: 'api-docs',     label: 'API Documentation',       description: 'Endpoints, params, and responses',               tier: 'free' },
  { id: 'deployment',   label: 'Deployment Guide',        description: 'How to deploy to production',                     tier: 'free' },
  { id: 'contributing', label: 'Contributing',            description: 'Guidelines for contributors',                     tier: 'free' },
  { id: 'testing',      label: 'Testing',                 description: 'How to run and write tests',                      tier: 'free' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractProjectName(repoUrl: string, fallback?: string): string {
  try {
    return new URL(repoUrl).pathname.split('/').filter(Boolean).pop() || fallback || 'Project';
  } catch {
    return fallback || 'Project';
  }
}

async function getFirebaseToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StepIndicator
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: WizardStep }) {
  const steps = ['Repo Input', 'Stack Detection', 'Sections', 'Generating', 'Preview'];
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const num = (i + 1) as WizardStep;
        const isComplete = step > num;
        const isActive   = step === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                isComplete ? 'bg-emerald-500 text-white' :
                isActive   ? 'bg-indigo-600 text-white'  :
                'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`} style={{ fontWeight: 600 }}>
                {isComplete ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span className={`text-xs hidden sm:block ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}
                style={{ fontWeight: isActive ? 500 : 400 }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Repo Input
// (unchanged from V2 except internal token helper is now shared)
// ─────────────────────────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: (repoUrl: string, data: AnalysisResult) => void }) {
  const { isLoggedIn } = useApp();
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [repos, setRepos]       = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const validate = (v: string) => /^https?:\/\/github\.com\/[^/]+\/[^/]+/.test(v);

  const fetchRepos = async () => {
    if (repos.length > 0 || loadingRepos) return;
    setLoadingRepos(true);
    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/github/repos', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch repositories');
      setRepos(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(url)) { setError('Please enter a valid GitHub repository URL'); return; }
    setError('');
    setLoading(true);
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ repoUrl: url }),
      });
      const data = await res.json();
      if (data.success) {
        onNext(url, data.data as AnalysisResult);
      } else {
        setError(res.status === 429 ? 'Too many requests. Please try again later.' : (data.error || 'Failed to analyze repository'));
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatUpdateDate = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30)  return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Enter a GitHub repository</h2>
        <p className="text-zinc-400 mt-1">Paste a public repo URL. We'll analyze it and generate a README in one shot.</p>
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

      {isLoggedIn && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => { setShowPicker(v => !v); if (!showPicker) fetchRepos(); }}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 transition-colors text-sm"
          >
            <span className="text-zinc-300" style={{ fontWeight: 500 }}>Or pick from your repositories</span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
          </button>
          {showPicker && (
            <div className="divide-y divide-zinc-800 max-h-64 overflow-y-auto">
              {loadingRepos ? (
                <div className="py-8 flex flex-col items-center gap-2 text-zinc-500 bg-zinc-900/50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Fetching repositories...</span>
                </div>
              ) : repos.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">No repositories found.</div>
              ) : repos.map(repo => (
                <button
                  key={repo.id}
                  onClick={() => { setUrl(repo.html_url); setShowPicker(false); }}
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
              ))}
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

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Stack Detection (unchanged visually)
// ─────────────────────────────────────────────────────────────────────────────

function Step2({ repoUrl, stack, onNext, onBack }: { repoUrl: string; stack: any; onNext: () => void; onBack: () => void }) {
  const flags = [
    { key: 'hasDocker',  label: 'Docker', icon: '🐳', value: stack?.hasDocker },
    { key: 'hasCI',      label: 'CI/CD',  icon: '⚙️', value: stack?.hasCI },
    { key: 'hasTesting', label: 'Tests',  icon: '🧪', value: stack?.hasTesting },
    { key: 'hasEnvFile', label: 'Env File',icon: '🔑', value: stack?.hasEnvFile },
  ];

  const langColors: Record<string, string> = {
    TypeScript:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
    JavaScript:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Python:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Rust:        'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  const langColor = langColors[stack?.language] || 'bg-zinc-700 text-zinc-300 border-zinc-600';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Stack Detection</h2>
        <p className="text-zinc-400 mt-1">Here's what we found in your repository.</p>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
        <Github className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <span className="text-zinc-400 text-sm font-mono truncate">{repoUrl}</span>
        <div className="ml-auto flex items-center gap-3 text-zinc-600 text-xs flex-shrink-0">
          <span className="flex items-center gap-1"><Star className="w-3 h-3" />{stack?.stars ?? 0}</span>
          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{stack?.forks ?? 0}</span>
        </div>
      </div>

      <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-violet-950/20 border border-indigo-500/20 rounded-xl">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Primary Framework</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-2xl">⚡</div>
          <div>
            <p className="text-zinc-100 text-xl" style={{ fontWeight: 700 }}>{stack?.primary}</p>
            <p className="text-zinc-400 text-sm">{stack?.description}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Secondary Technologies</p>
        <div className="flex flex-wrap gap-2">
          {stack?.frameworks?.map((f: string) => (
            <span key={f} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm">{f}</span>
          ))}
          <span className={`px-3 py-1.5 border rounded-lg text-sm ${langColor}`}>{stack?.language}</span>
          <span className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm">{stack?.packageManager}</span>
        </div>
      </div>

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

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Section Selector (unchanged visually)
// ─────────────────────────────────────────────────────────────────────────────

function Step3({ selectedSections, onToggle, onNext, onBack }: {
  selectedSections: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { tier, openWaitlist } = useApp();

  const canAccess = (section: Section) => {
    if (section.tier === 'anonymous') return true;
    if (section.tier === 'free')      return tier === 'free' || tier === 'premium';
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
          const selected   = selectedSections.includes(section.id);
          const locked     = !accessible;

          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                locked    ? 'border-zinc-800 bg-zinc-900/30 opacity-60' :
                selected  ? 'border-indigo-500/40 bg-indigo-500/5' :
                'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
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
                      selected ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-zinc-600 hover:border-zinc-400'
                    } flex items-center justify-center`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </button>
                )}
              </div>

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

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Generation  ✦ V3: single API call ✦
// ─────────────────────────────────────────────────────────────────────────────

type SectionVisualState = 'pending' | 'writing' | 'done' | 'error';

function Step4({
  selectedSections,
  projectName,
  repoUrl,
  stack,
  analysisResult,
  bypassCache,
  onDone,
}: {
  selectedSections: string[];
  projectName: string;
  repoUrl: string;
  stack: any;
  analysisResult: AnalysisResult;
  bypassCache: boolean;
  onDone: (result: GenerationResult) => void;
}) {
  const { sessionId, refreshUsage } = useApp();

  // Visual-only per-section states — driven by timers, not real calls
  const [sectionStates, setSectionStates] = useState<Record<string, SectionVisualState>>(
    () => Object.fromEntries(selectedSections.map(id => [id, 'pending'])),
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const hasRun = useRef(false);

  const sectionLabel = (id: string) => ALL_SECTIONS.find(s => s.id === id)?.label ?? id;

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      // ── 1. Animate sections to "writing" with a stagger ─────────────────
      for (let i = 0; i < selectedSections.length; i++) {
        await new Promise(r => setTimeout(r, 180));
        setSectionStates(prev => ({ ...prev, [selectedSections[i]]: 'writing' }));
      }

      // ── 2. Single API call ───────────────────────────────────────────────
      try {
        const token = await getFirebaseToken();

        // Pull the top-5 context files from the stack (analyzer may populate these)
        const contextFiles = (stack?.contextFiles ?? []).slice(0, 5).map((f: any) => ({
          name: f.name,
          content: typeof f.content === 'string' ? f.content.slice(0, 8_000) : '',
        }));

        const payload = {
          projectName,
          repoUrl: repoUrl || undefined,
          selectedSectionIds: selectedSections,
          stack: {
            primary:        stack?.primary        ?? 'unknown',
            secondary:      stack?.secondary      ?? [],
            language:       stack?.language       ?? 'unknown',
            packageManager: stack?.packageManager ?? 'npm',
            hasDocker:      stack?.hasDocker      ?? false,
            hasCI:          stack?.hasCI          ?? false,
            hasTesting:     stack?.hasTesting     ?? false,
            hasEnvFile:     stack?.hasEnvFile     ?? false,
            frameworks:     stack?.frameworks     ?? [],
            dependencies:   stack?.dependencies   ?? {},
            domainHints:    stack?.domainHints    ?? [],
          },
          repoProfile:  analysisResult.repoProfile  ?? {},
          packageJson:  analysisResult.repoData?.packageJson,
          envExample:   analysisResult.repoData?.envExample,
          contextFiles,
          fallbackStrategy: 'skip' as const,
          bypassCache,
        };

        const res = await secureFetch('/api/generate', {
          method: 'POST',
          headers: {
            'x-session-id': sessionId ?? '',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(
            res.status === 429
              ? 'Usage limit reached. Please try again later.'
              : (data.error || 'Generation failed'),
          );
        }

        // ── 3. Stagger the "done" reveals ──────────────────────────────────
        for (let i = 0; i < selectedSections.length; i++) {
          await new Promise(r => setTimeout(r, 120));
          setSectionStates(prev => ({ ...prev, [selectedSections[i]]: 'done' }));
        }

        setShowConfetti(true);
        refreshUsage();
        setTimeout(() => onDone(data.data as GenerationResult), 700);

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        setErrorMsg(msg);
        setSectionStates(prev =>
          Object.fromEntries(Object.keys(prev).map(k => [k, 'error'])),
        );
        toast.error(msg);
      }
    };

    run();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const doneCount  = Object.values(sectionStates).filter(s => s === 'done').length;
  const total      = selectedSections.length;
  const progress   = total > 0 ? (doneCount / total) * 100 : 0;
  const isComplete = doneCount === total;
  const isError    = !!errorMsg;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>
            {isError ? 'Generation failed' : isComplete ? 'README ready!' : 'Generating your README'}
          </h2>
        </div>
        <p className="text-zinc-400">
          {isError
            ? errorMsg
            : isComplete
            ? 'All sections written in a single pass.'
            : `Writing all ${total} sections in one cohesive pass — no context lost between sections.`}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">{doneCount} of {total} sections</span>
          <span className="text-zinc-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isError ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Per-section list */}
      <div className="space-y-2">
        {selectedSections.map(id => {
          const state = sectionStates[id] ?? 'pending';
          return (
            <motion.div
              key={id}
              layout
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                state === 'done'    ? 'border-emerald-500/20 bg-emerald-500/5'  :
                state === 'writing' ? 'border-indigo-500/30 bg-indigo-500/5'   :
                state === 'error'   ? 'border-red-500/20 bg-red-500/5'         :
                'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {state === 'done'    && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {state === 'writing' && <Loader2     className="w-5 h-5 text-indigo-400 animate-spin" />}
                {state === 'error'   && <AlertCircle className="w-5 h-5 text-red-400" />}
                {state === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
              </div>
              <span className={`text-sm flex-1 ${
                state === 'done'    ? 'text-emerald-300' :
                state === 'writing' ? 'text-indigo-300'  :
                state === 'error'   ? 'text-red-400'     :
                'text-zinc-600'
              }`} style={{ fontWeight: state !== 'pending' ? 500 : 400 }}>
                {sectionLabel(id)}
              </span>
              <span className={`text-xs ${
                state === 'done'    ? 'text-emerald-600' :
                state === 'writing' ? 'text-indigo-400'  :
                state === 'error'   ? 'text-red-500'     : ''
              }`}>
                {state === 'done'    && 'Done'}
                {state === 'writing' && 'Writing…'}
                {state === 'error'   && 'Failed'}
              </span>
            </motion.div>
          );
        })}
      </div>

      {isComplete && (
        <>
          {showConfetti && <Confetti />}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <p className="text-emerald-400" style={{ fontWeight: 600 }}>🎉 All sections generated!</p>
            <p className="text-zinc-400 text-sm mt-1">Opening preview…</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Preview & Edit  (accepts a single content string)
// ─────────────────────────────────────────────────────────────────────────────

function Step5({
  result,
  repoUrl,
  stack,
  onBack,
  onRestart,
}: {
  result: GenerationResult;
  repoUrl: string;
  stack: any;
  onBack: () => void;
  onRestart: () => void;
}) {
  const { isLoggedIn } = useApp();
  const [tab, setTab]             = useState<'preview' | 'raw' | 'edit'>('preview');
  const [editContent, setEditContent] = useState(result.content);
  const [copied, setCopied]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);

  // When user edits, the "live" content is editContent; otherwise use the original
  const displayContent = tab === 'edit' ? editContent : result.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([displayContent], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('README.md downloaded!');
  };

  const handleSave = async () => {
    if (!isLoggedIn) return;
    setSaving(true);
    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Authentication token not found');

      const res = await fetch('/api/readmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          repoUrl:     repoUrl || '',
          projectName: extractProjectName(repoUrl, 'Untitled Project'),
          sectionId:   'full',
          content:     displayContent,
          stack:       stack ? JSON.stringify(stack) : null,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save README');
      setSaved(true);
      toast.success('README saved to dashboard!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save README');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'preview' as const, label: 'Preview', icon: Eye },
    { id: 'raw'     as const, label: 'Raw',     icon: Code },
    { id: 'edit'    as const, label: 'Edit',    icon: Edit3 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Your README is ready</h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            {result.sectionsWritten.length} sections • written by {result.provider} • preview, edit, or download below
          </p>
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border disabled:opacity-70 ${
                saved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
              }`}
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> :
               saved  ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</> :
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
                  p:  ({ children }) => <p className="text-zinc-300 text-sm leading-relaxed mb-3">{children}</p>,
                  code: ({ children }) => <code className="px-1.5 py-0.5 bg-zinc-800 text-emerald-400 rounded text-xs font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 overflow-x-auto mb-4 text-zinc-200 text-xs font-mono">{children}</pre>,
                  ul:  ({ children }) => <ul className="list-none space-y-1 mb-3">{children}</ul>,
                  li:  ({ children }) => <li className="text-zinc-300 text-sm flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span><span>{children}</span></li>,
                  table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
                  th:  ({ children }) => <th className="text-left text-zinc-400 text-xs uppercase tracking-wider px-3 py-2 border-b border-zinc-700">{children}</th>,
                  td:  ({ children }) => <td className="text-zinc-300 text-xs px-3 py-2 border-b border-zinc-800">{children}</td>,
                  a:   ({ href, children }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 transition-colors">{children}</a>,
                  strong: ({ children }) => <strong className="text-zinc-100">{children}</strong>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 pl-4 text-zinc-400 italic mb-3">{children}</blockquote>,
                  img: ({ src, alt }) => <img src={src} alt={alt} className="rounded-lg max-w-full" />,
                }}
              >
                {result.content}
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
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-zinc-500 text-sm font-mono">README.md</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="p-4 text-emerald-400/90 text-xs font-mono leading-relaxed overflow-auto"
                style={{ maxHeight: '560px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {result.content}
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
            onClick={() => { toast.success('Edit saved!'); }}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main — Generate page
// ─────────────────────────────────────────────────────────────────────────────

const stepVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -24, transition: { duration: 0.2, ease: 'easeIn' } },
};

export function Generate() {
  const [step,             setStep]             = useState<WizardStep>(1);
  const [repoUrl,          setRepoUrl]           = useState('');
  const [analysisResult,   setAnalysisResult]    = useState<AnalysisResult | null>(null);
  const [selectedSections, setSelectedSections]  = useState<string[]>([]);
  const [generationResult, setGenerationResult]  = useState<GenerationResult | null>(null);
  const [isRegenerating,   setIsRegenerating]    = useState(false);

  // Derive projectName once from the URL so it's consistent across all steps
  const projectName = extractProjectName(repoUrl, analysisResult?.projectName);

  // Pre-select sections suggested by the analyzer
  useEffect(() => {
    if (!analysisResult?.suggestedSections) return;
    setSelectedSections(
      analysisResult.suggestedSections
        .filter(s => s.isRecommended || s.isRequired)
        .map(s => s.id),
    );
  }, [analysisResult]);

  const toggleSection = useCallback((id: string) => {
    const section = ALL_SECTIONS.find(s => s.id === id);
    if (section?.required) return;
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  }, []);

  const handleAnalysisDone = (url: string, data: AnalysisResult) => {
    setRepoUrl(url);
    setAnalysisResult(data);
    setIsRegenerating(false);
    setStep(2);
  };

  const handleGenerationDone = (result: GenerationResult) => {
    setGenerationResult(result);
    setTimeout(() => setStep(5), 600);
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setGenerationResult(null);
    setStep(4);
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
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Step1 onNext={handleAnalysisDone} />
            </motion.div>
          )}
          {step === 2 && analysisResult && (
            <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Step2
                repoUrl={repoUrl}
                stack={analysisResult.stack}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
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
          {step === 4 && analysisResult && (
            <motion.div key="step4" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Step4
                selectedSections={selectedSections}
                projectName={projectName}
                repoUrl={repoUrl}
                stack={analysisResult.stack}
                analysisResult={analysisResult}
                bypassCache={isRegenerating}
                onDone={handleGenerationDone}
              />
            </motion.div>
          )}
          {step === 5 && generationResult && (
            <motion.div key="step5" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Step5
                result={generationResult}
                repoUrl={repoUrl}
                stack={analysisResult?.stack}
                onBack={() => setStep(3)}
                onRestart={handleRegenerate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}